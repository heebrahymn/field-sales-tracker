-- =============================================================================
-- Migration 00015: Fix RLS Security Definer Functions, PostGIS Casts & Ingestion
-- Carbon Field Sales Tracker (Nigeria, Zambia, Malawi)
-- =============================================================================

SET search_path = public, extensions, auth;

-- 1. Eliminate RLS infinite recursion by making auth helper functions SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.auth_uid()
RETURNS UUID LANGUAGE sql STABLE PARALLEL SAFE
SECURITY DEFINER
SET search_path = public, auth AS $$
    SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS public.app_role LANGUAGE sql STABLE PARALLEL SAFE
SECURITY DEFINER
SET search_path = public, auth AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.auth_market()
RETURNS VARCHAR(2) LANGUAGE sql STABLE PARALLEL SAFE
SECURITY DEFINER
SET search_path = public, auth AS $$
    SELECT market_code FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_hq()
RETURNS BOOLEAN LANGUAGE sql STABLE PARALLEL SAFE
SECURITY DEFINER
SET search_path = public, auth AS $$
    SELECT coalesce((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'hq_admin', false);
$$;

-- Optimize profiles RLS policy to short-circuit on self-lookup
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated USING (
        id = auth.uid()
        OR public.is_hq() 
        OR (public.auth_role() = 'country_sales_head' AND market_code = public.auth_market())
    );

-- 2. Fix PostGIS ST_MakePoint float8 cast in check_geofence_status
CREATE OR REPLACE FUNCTION public.check_geofence_status(
    p_branch_pin_id UUID,
    p_user_lat NUMERIC,
    p_user_lng NUMERIC,
    p_gps_accuracy_m NUMERIC,
    p_geofence_radius_m NUMERIC DEFAULT 200.0
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_pin RECORD;
    v_distance NUMERIC;
BEGIN
    SELECT * INTO v_pin FROM public.branch_location_pins WHERE id = p_branch_pin_id;
    IF NOT FOUND OR v_pin.geom IS NULL THEN
        RETURN 'no_fix';
    END IF;

    -- ST_MakePoint requires float8 (double precision) arguments
    v_distance := ST_Distance(
        ST_SetSRID(ST_MakePoint(p_user_lng::float8, p_user_lat::float8), 4326)::geography,
        v_pin.geom::geography
    );

    IF v_distance + p_gps_accuracy_m <= p_geofence_radius_m THEN
        RETURN 'inside_confident';
    ELSIF v_distance - p_gps_accuracy_m > p_geofence_radius_m THEN
        RETURN 'outside_confident';
    ELSE
        RETURN 'uncertain';
    END IF;
END;
$$;

-- 3. Correct request_device_replacement column mappings
CREATE OR REPLACE FUNCTION public.request_device_replacement(
    p_current_device_id UUID,
    p_failure_type TEXT,
    p_failure_description TEXT,
    p_incident_timestamp TIMESTAMPTZ,
    p_incident_location TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_market VARCHAR(2);
    v_request_id UUID := extensions.uuid_generate_v4();
    v_assigned_device UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    SELECT market_code INTO v_user_market FROM public.profiles WHERE id = v_user_id;

    -- Verify current device assignment
    SELECT device_id INTO v_assigned_device
    FROM public.device_assignments
    WHERE salesperson_id = v_user_id AND is_current = true
    LIMIT 1;

    IF v_assigned_device IS NULL THEN
        v_assigned_device := p_current_device_id;
    END IF;

    INSERT INTO public.device_replacement_requests (
        id, salesperson_id, market_code, company_device_id,
        issue_category, issue_description,
        status, submitted_at, updated_at
    ) VALUES (
        v_request_id, v_user_id, coalesce(v_user_market, 'NG'), v_assigned_device,
        p_failure_type::public.device_issue_category, p_failure_description,
        'pending_review', now(), now()
    );

    INSERT INTO public.device_replacement_history (
        request_id, actor_id, action, previous_status, new_status, notes
    ) VALUES (
        v_request_id, v_user_id, 'Submit Request', NULL, 'pending_review',
        'Salesperson reported company device issue: ' || p_failure_description
    );

    RETURN v_request_id;
END;
$$;

-- 4. Correct ingest_activity_events device_id resolution
CREATE OR REPLACE FUNCTION public.ingest_activity_events(events jsonb[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_event jsonb;
    v_event_id UUID;
    v_event_type TEXT;
    v_seq BIGINT;
    v_idempotency_key TEXT;
    v_client_ts TIMESTAMPTZ;
    v_payload jsonb;
    v_device_id UUID;
    v_user_id UUID;
    v_market_code VARCHAR(2);
    v_device_active BOOLEAN;
    v_results jsonb[] := '{}';
    v_rule RECORD;
    v_distance NUMERIC(8, 2);
    v_pin RECORD;
    v_loc_class public.location_classification;
    v_verif_status public.visit_verification_status;
    v_visit_id UUID;
    v_work_date DATE;
    v_attendance_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request to ingest_activity_events';
    END IF;

    SELECT market_code INTO v_market_code FROM public.profiles WHERE id = v_user_id;

    FOREACH v_event IN ARRAY events LOOP
        v_event_id := (v_event->>'id')::UUID;
        v_event_type := v_event->>'event_type';
        v_seq := (v_event->>'sequence_number')::BIGINT;
        v_idempotency_key := v_event->>'idempotency_key';
        v_client_ts := (v_event->>'client_timestamp')::TIMESTAMPTZ;
        v_payload := v_event->'payload';
        
        -- Resolve device_id from event root or payload
        v_device_id := coalesce(
            (v_event->>'device_id')::UUID,
            (v_payload->>'device_id')::UUID,
            (SELECT device_id FROM public.device_assignments WHERE salesperson_id = v_user_id AND is_current = true LIMIT 1)
        );

        -- 1. Idempotency Check: if event already exists, acknowledge as duplicate
        IF EXISTS (SELECT 1 FROM public.activity_events WHERE id = v_event_id OR idempotency_key = v_idempotency_key) THEN
            v_results := array_append(v_results, jsonb_build_object(
                'event_id', v_event_id,
                'status', 'accepted_duplicate',
                'message', 'Event already processed'
            ));
            CONTINUE;
        END IF;

        -- 2. Verify device custody
        SELECT true INTO v_device_active FROM public.device_assignments 
        WHERE device_id = v_device_id AND salesperson_id = v_user_id AND is_current = true;
        
        IF v_device_active IS NULL OR NOT v_device_active THEN
            INSERT INTO public.activity_events (
                id, user_id, device_id, market_code, event_type, sequence_number, client_timestamp, payload, processing_status, processing_notes, idempotency_key
            ) VALUES (
                v_event_id, v_user_id, v_device_id, v_market_code, v_event_type, v_seq, v_client_ts, v_payload, 'needs_review', 'Device not currently assigned to user', v_idempotency_key
            );

            v_results := array_append(v_results, jsonb_build_object(
                'event_id', v_event_id,
                'status', 'needs_review',
                'reason', 'Unassigned device'
            ));
            CONTINUE;
        END IF;

        -- 3. Fetch active market rule
        SELECT * INTO v_rule FROM public.market_rules 
        WHERE market_code = v_market_code AND is_active = true AND effective_to IS NULL
        LIMIT 1;

        -- 4. Process event types
        IF v_event_type = 'start_day' THEN
            v_work_date := coalesce((v_payload->>'work_date')::DATE, v_client_ts::DATE);
            
            INSERT INTO public.attendance_days (
                user_id, device_id, market_code, work_date, started_at,
                start_latitude, start_longitude, start_accuracy_m, start_selfie_url,
                captured_offline, server_received_at
            ) VALUES (
                v_user_id, v_device_id, v_market_code, v_work_date, v_client_ts,
                (v_payload->>'latitude')::NUMERIC, (v_payload->>'longitude')::NUMERIC,
                (v_payload->>'accuracy_m')::NUMERIC, v_payload->>'selfie_url',
                coalesce((v_event->>'captured_offline')::BOOLEAN, false), now()
            )
            ON CONFLICT (user_id, work_date) DO UPDATE
            SET started_at = EXCLUDED.started_at
            RETURNING id INTO v_attendance_id;

        ELSIF v_event_type = 'end_day' THEN
            v_work_date := coalesce((v_payload->>'work_date')::DATE, v_client_ts::DATE);
            
            UPDATE public.attendance_days
            SET ended_at = v_client_ts,
                end_latitude = (v_payload->>'latitude')::NUMERIC,
                end_longitude = (v_payload->>'longitude')::NUMERIC,
                end_accuracy_m = (v_payload->>'accuracy_m')::NUMERIC,
                status = 'ended'
            WHERE user_id = v_user_id AND work_date = v_work_date;

        ELSIF v_event_type = 'check_in' THEN
            SELECT * INTO v_pin FROM public.branch_location_pins
            WHERE branch_id = (v_payload->>'branch_id')::UUID AND is_active = true
            ORDER BY version_number DESC LIMIT 1;

            IF v_pin.id IS NOT NULL THEN
                v_distance := ST_Distance(
                    ST_SetSRID(ST_MakePoint((v_payload->>'longitude')::float8, (v_payload->>'latitude')::float8), 4326)::geography,
                    v_pin.geom::geography
                );

                IF v_distance + (v_payload->>'accuracy_m')::NUMERIC <= v_rule.geofence_radius_m THEN
                    v_loc_class := 'inside_confident';
                    v_verif_status := 'capturing';
                ELSIF v_distance - (v_payload->>'accuracy_m')::NUMERIC > v_rule.geofence_radius_m THEN
                    v_loc_class := 'outside';
                    v_verif_status := 'location_unverified';
                ELSE
                    v_loc_class := 'uncertain';
                    v_verif_status := 'pending_review';
                END IF;
            ELSE
                v_distance := NULL;
                v_loc_class := 'no_fix';
                v_verif_status := 'location_unverified';
            END IF;

            SELECT id INTO v_attendance_id FROM public.attendance_days
            WHERE user_id = v_user_id AND work_date = v_client_ts::DATE;

            INSERT INTO public.visits (
                attendance_day_id, user_id, device_id, branch_id, kind,
                check_in_at, check_in_latitude, check_in_longitude, check_in_accuracy_m,
                distance_to_pin_m, location_classification, verification_status,
                captured_offline, server_received_at
            ) VALUES (
                v_attendance_id, v_user_id, v_device_id, (v_payload->>'branch_id')::UUID, 'normal_verified',
                v_client_ts, (v_payload->>'latitude')::NUMERIC, (v_payload->>'longitude')::NUMERIC, (v_payload->>'accuracy_m')::NUMERIC,
                v_distance, v_loc_class, v_verif_status,
                coalesce((v_event->>'captured_offline')::BOOLEAN, false), now()
            ) RETURNING id INTO v_visit_id;
        END IF;

        -- 5. Record processed event
        INSERT INTO public.activity_events (
            id, user_id, device_id, market_code, event_type, sequence_number, client_timestamp, payload, processing_status, idempotency_key
        ) VALUES (
            v_event_id, v_user_id, v_device_id, v_market_code, v_event_type, v_seq, v_client_ts, v_payload, 'processed', v_idempotency_key
        );

        v_results := array_append(v_results, jsonb_build_object(
            'event_id', v_event_id,
            'status', 'processed'
        ));
    END LOOP;

    RETURN to_jsonb(v_results);
END;
$$;
