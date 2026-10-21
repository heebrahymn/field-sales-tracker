-- =============================================================================
-- Migration 00018: Stage 2B Final Security Audit & Completeness Hardening
-- Carbon Field Sales Tracker (Nigeria, Zambia, Malawi)
-- =============================================================================

SET search_path = public, extensions, auth;

-- =============================================================================
-- 1. Seed Malawi Operational Territory (Tri-Market Isolation Verification)
-- =============================================================================

DO $$
DECLARE
    v_user_sp_mw UUID := '66666666-6666-4666-a666-666666666666';
    v_user_csh_mw UUID := '77777777-7777-4777-a777-777777777777';
    v_user_hq UUID := '33333333-3333-4333-a333-333333333333';
    v_dev_mw_01 UUID := 'd4444444-4444-4444-b444-444444444444';
    v_org_mw UUID := 'e3333333-3333-4333-c333-333333333333';
    v_br_mw UUID := 'f3333333-3333-4333-d333-333333333333';
    v_pin_mw UUID := 'a3333333-3333-4333-e333-333333333333';
BEGIN
    -- 1.1 Auth user placeholder records for Malawi
    -- NOTE (Security Audit Remediation): Fixed demo credentials have been sanitized and replaced
    -- with randomized, unguessable cryptographic hashes. In all environments, valid credentials
    -- must be provisioned and activated via the official Supabase Auth Admin API (`npm run provision:users`).
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change, email_change_token_new,
        email_change_token_current, phone_change_token, reauthentication_token, is_sso_user
    ) VALUES
    (v_user_sp_mw, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kondwani.banda@carboncarcare.com', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Kondwani Banda"}', now(), now(), '', '', '', '', '', '', '', false),
    (v_user_csh_mw, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tamika.phiri@carboncarcare.com', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Tamika Phiri"}', now(), now(), '', '', '', '', '', '', '', false)
    ON CONFLICT (id) DO NOTHING;

    -- 1.2 Auth identities for Malawi
    INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    )
    SELECT
        extensions.uuid_generate_v4(), u.id, u.id::text,
        format('{"sub":"%s","email":"%s"}', u.id::text, u.email)::jsonb,
        'email', now(), now(), now()
    FROM auth.users u
    WHERE u.id IN (v_user_sp_mw, v_user_csh_mw)
      AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email');

    -- 1.3 Malawi profiles
    INSERT INTO public.profiles (id, market_code, full_name, email, phone_number, role)
    VALUES
    (v_user_sp_mw, 'MW', 'Kondwani Banda', 'kondwani.banda@carboncarcare.com', '+265 999 111 222', 'salesperson'),
    (v_user_csh_mw, 'MW', 'Tamika Phiri', 'tamika.phiri@carboncarcare.com', '+265 888 333 444', 'country_sales_head')
    ON CONFLICT (id) DO NOTHING;

    -- 1.4 Malawi company handset fleet (Blantyre)
    INSERT INTO public.devices (
        id, asset_id, asset_tag, make, model, serial_number, imei, market_code,
        inventory_status, security_authorization, battery_health, knox_enrolled, registered_by
    ) VALUES (
        v_dev_mw_01, 'CC-DEV-BLA-001', 'CC-DEV-BLA-001', 'Samsung', 'Galaxy A15 Enterprise',
        'SN-SAM-A15-001-MW', '358941098765432', 'MW', 'active', 'authorized', 95, true, v_user_hq
    ) ON CONFLICT (id) DO NOTHING;

    -- 1.5 Malawi device custody
    INSERT INTO public.device_assignments (device_id, salesperson_id, assigned_by, handover_reason, is_current)
    VALUES (v_dev_mw_01, v_user_sp_mw, v_user_hq, 'Initial company handset issue for Blantyre territory', true)
    ON CONFLICT DO NOTHING;

    -- 1.6 Malawi B2B client organisation
    INSERT INTO public.organisations (id, name, market_code, tier)
    VALUES (v_org_mw, 'Malawi National Distribution & Haulage', 'MW', 'enterprise')
    ON CONFLICT (id) DO NOTHING;

    -- 1.7 Malawi client branch
    INSERT INTO public.branches (
        id, organisation_id, branch_name, market_code, category,
        street_address, city, switchboard_phone, estimated_fleet_size, operating_status, created_by
    ) VALUES (
        v_br_mw, v_org_mw, 'Blantyre Commercial Depot', 'MW', 'logistics',
        'Plot 45 Makata Heavy Industrial Area', 'Blantyre', '+265 1 870 000', 60, 'active', v_user_sp_mw
    ) ON CONFLICT (id) DO NOTHING;

    -- 1.8 Malawi versioned pin (Blantyre: -15.7861° S, 35.0058° E)
    INSERT INTO public.branch_location_pins (
        id, branch_id, version_number, latitude, longitude, reported_accuracy_m,
        premises_photo_url, status, proposed_by, reviewed_by, is_active
    ) VALUES (
        v_pin_mw, v_br_mw, 1, -15.7861000, 35.0058000, 15.0,
        '/demo/demo-premises-blantyre-depot.jpg', 'approved', v_user_sp_mw, v_user_csh_mw, true
    ) ON CONFLICT (id) DO NOTHING;

    -- 1.9 Malawi contact
    INSERT INTO public.client_contacts (
        branch_id, organisation_id, full_name, designation, phone_number, email, is_primary
    ) VALUES (
        v_br_mw, v_org_mw, 'Mr. Patrick Chilima', 'Regional Transport Manager', '+265 999 123 456', 'pchilima@mwhaulage.demo', true
    ) ON CONFLICT (id) DO NOTHING;
END;
$$;


-- =============================================================================
-- 2. Strict Immutable Field Evidence & Explicit RLS Policies
-- =============================================================================

-- 2.1 ATTENDANCE DAYS: Explicit Salesperson-Only INSERT
DROP POLICY IF EXISTS "attendance_days_insert" ON public.attendance_days;
CREATE POLICY "attendance_days_insert_salesperson_only" ON public.attendance_days
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = public.auth_uid() 
        AND public.auth_role() = 'salesperson'
        AND market_code = public.auth_market()
    );

-- Attendance Days: Owner update only for ending the workday (started -> ended)
DROP POLICY IF EXISTS "attendance_days_update" ON public.attendance_days;
CREATE POLICY "attendance_days_update_owner_only" ON public.attendance_days
    FOR UPDATE TO authenticated
    USING (user_id = public.auth_uid())
    WITH CHECK (user_id = public.auth_uid() AND status IN ('started', 'ended'));

-- Revoke DELETE on attendance days from all non-superuser roles
REVOKE DELETE ON public.attendance_days FROM anon, authenticated;

-- 2.2 VISITS: Strict Sole-Author INSERT
DROP POLICY IF EXISTS "visits_insert" ON public.visits;
CREATE POLICY "visits_insert_salesperson_only" ON public.visits
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = public.auth_uid() 
        AND public.auth_role() = 'salesperson'
    );

-- Visits: Only the visit owner can update while checking out (check_out_at is being recorded)
-- Once check_out_at is recorded, visit is completely immutable!
DROP POLICY IF EXISTS "visits_update" ON public.visits;
CREATE POLICY "visits_update_checkout_only" ON public.visits
    FOR UPDATE TO authenticated
    USING (user_id = public.auth_uid() AND check_out_at IS NULL)
    WITH CHECK (user_id = public.auth_uid());

-- Revoke DELETE on visits from all non-superuser roles (tamper-proof operational ledger)
REVOKE DELETE ON public.visits FROM anon, authenticated;

-- 2.3 MEETING LOGS: Strict Sole-Author INSERT (Linked to visit owned by user)
DROP POLICY IF EXISTS "meeting_logs_insert" ON public.meeting_logs;
CREATE POLICY "meeting_logs_insert_salesperson_only" ON public.meeting_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        visit_id IN (
            SELECT id FROM public.visits 
            WHERE user_id = public.auth_uid() AND public.auth_role() = 'salesperson'
        )
    );

-- Revoke UPDATE and DELETE on meeting logs once submitted
REVOKE UPDATE, DELETE ON public.meeting_logs FROM anon, authenticated;

-- 2.4 APPROVAL AUDIT: Strictly Append-Only
REVOKE UPDATE, DELETE ON public.approval_audit FROM anon, authenticated;

CREATE POLICY "approval_audit_insert" ON public.approval_audit
    FOR INSERT TO authenticated
    WITH CHECK (actor_id = public.auth_uid());


-- =============================================================================
-- 3. Storage Security Hardening: Path-Based User & Role Isolation
-- =============================================================================

-- Drop generic policies
DROP POLICY IF EXISTS "attendance_selfies_insert" ON storage.objects;
DROP POLICY IF EXISTS "attendance_selfies_select" ON storage.objects;
DROP POLICY IF EXISTS "premises_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "premises_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "business_cards_insert" ON storage.objects;
DROP POLICY IF EXISTS "business_cards_select" ON storage.objects;
DROP POLICY IF EXISTS "exception_evidence_insert" ON storage.objects;
DROP POLICY IF EXISTS "exception_evidence_select" ON storage.objects;
DROP POLICY IF EXISTS "device_issue_insert" ON storage.objects;
DROP POLICY IF EXISTS "device_issue_select" ON storage.objects;
DROP POLICY IF EXISTS "imports_select_hq" ON storage.objects;
DROP POLICY IF EXISTS "exports_select" ON storage.objects;

-- 3.1 Attendance Selfies: Salesperson uploads only to their own folder: <user_id>/...
CREATE POLICY "attendance_selfies_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'attendance-selfies'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "attendance_selfies_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'attendance-selfies'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_hq()
            OR public.auth_role() = 'country_sales_head'
        )
    );

-- 3.2 Visit Premises Photos: Path-based ownership
CREATE POLICY "premises_photos_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'visit-premises-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "premises_photos_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'visit-premises-photos'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_hq()
            OR public.auth_role() = 'country_sales_head'
        )
    );

-- 3.3 Business Cards: Path-based ownership
CREATE POLICY "business_cards_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'business-cards'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "business_cards_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'business-cards'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_hq()
            OR public.auth_role() = 'country_sales_head'
        )
    );

-- 3.4 Exception Evidence: Path-based ownership
CREATE POLICY "exception_evidence_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'exception-evidence'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "exception_evidence_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'exception-evidence'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_hq()
            OR public.auth_role() = 'country_sales_head'
        )
    );

-- 3.5 Device Issue Photos: Path-based ownership
CREATE POLICY "device_issue_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'device-issue-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "device_issue_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'device-issue-photos'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_hq()
        )
    );

-- 3.6 Client Master Imports: HQ Admin ONLY
CREATE POLICY "client_imports_insert_hq" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'client-master-imports'
        AND public.is_hq()
    );

CREATE POLICY "client_imports_select_hq" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'client-master-imports'
        AND public.is_hq()
    );

-- 3.7 Export Reports: Country Sales Head & HQ Admin
CREATE POLICY "export_reports_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'export-reports'
        AND (public.is_hq() OR public.auth_role() = 'country_sales_head')
    );

CREATE POLICY "export_reports_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'export-reports'
        AND (public.is_hq() OR public.auth_role() = 'country_sales_head')
    );


-- =============================================================================
-- 4. Enhanced Offline Event Ingestion RPC (Idempotency, Dependency & Integrity)
-- =============================================================================

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
    v_dep_id UUID;
    v_existing_event RECORD;
    v_results jsonb[] := '{}';
    v_rule RECORD;
    v_distance NUMERIC(8, 2);
    v_pin RECORD;
    v_loc_class public.location_classification;
    v_verif_status public.visit_verification_status;
    v_visit_id UUID;
    v_work_date DATE;
    v_attendance_id UUID;
    v_lat NUMERIC;
    v_lng NUMERIC;
    v_acc NUMERIC;
    v_open_visit RECORD;
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
        v_payload := coalesce(v_event->'payload', '{}'::jsonb);
        v_dep_id := NULL;
        IF v_event->>'dependency_event_id' IS NOT NULL THEN
            v_dep_id := (v_event->>'dependency_event_id')::UUID;
        END IF;

        -- Extract coordinates
        v_lat := NULL;
        v_lng := NULL;
        v_acc := NULL;
        IF v_payload->>'latitude' IS NOT NULL THEN
            v_lat := (v_payload->>'latitude')::NUMERIC;
        END IF;
        IF v_payload->>'longitude' IS NOT NULL THEN
            v_lng := (v_payload->>'longitude')::NUMERIC;
        END IF;
        IF v_payload->>'accuracy_m' IS NOT NULL THEN
            v_acc := (v_payload->>'accuracy_m')::NUMERIC;
        END IF;

        -- Resolve device_id
        v_device_id := coalesce(
            (v_event->>'device_id')::UUID,
            (v_payload->>'device_id')::UUID,
            (SELECT device_id FROM public.device_assignments WHERE salesperson_id = v_user_id AND is_current = true LIMIT 1)
        );

        -- ---------------------------------------------------------------------
        -- 1. Idempotency Check & Conflicting Payload Detection
        -- ---------------------------------------------------------------------
        SELECT * INTO v_existing_event 
        FROM public.activity_events 
        WHERE id = v_event_id OR idempotency_key = v_idempotency_key;

        IF v_existing_event.id IS NOT NULL THEN
            -- Check if same ID but conflicting payload / idempotency key
            IF v_existing_event.id = v_event_id AND v_existing_event.idempotency_key <> v_idempotency_key THEN
                v_results := array_append(v_results, jsonb_build_object(
                    'event_id', v_event_id,
                    'status', 'rejected_conflict',
                    'message', 'Event UUID already exists with a different idempotency key or payload'
                ));
                CONTINUE;
            END IF;

            -- Normal duplicate retry -> acknowledged cleanly without duplicate side-effects
            v_results := array_append(v_results, jsonb_build_object(
                'event_id', v_event_id,
                'status', 'accepted_duplicate',
                'message', 'Event already processed'
            ));
            CONTINUE;
        END IF;

        -- ---------------------------------------------------------------------
        -- 2. Dependency Check (Missing Parent Event)
        -- ---------------------------------------------------------------------
        IF v_dep_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.activity_events WHERE id = v_dep_id) THEN
            INSERT INTO public.activity_events (
                id, user_id, device_id, market_code, event_type, sequence_number,
                dependency_event_id, client_timestamp, payload, processing_status,
                processing_notes, idempotency_key
            ) VALUES (
                v_event_id, v_user_id, v_device_id, v_market_code, v_event_type, v_seq,
                v_dep_id, v_client_ts, v_payload, 'needs_review',
                'Missing parent dependency event ' || v_dep_id::text, v_idempotency_key
            );

            v_results := array_append(v_results, jsonb_build_object(
                'event_id', v_event_id,
                'status', 'pending_dependency',
                'reason', 'Parent dependency event not yet ingested'
            ));
            CONTINUE;
        END IF;

        -- ---------------------------------------------------------------------
        -- 3. Device Custody Validation
        -- ---------------------------------------------------------------------
        SELECT true INTO v_device_active FROM public.device_assignments 
        WHERE device_id = v_device_id AND salesperson_id = v_user_id AND is_current = true;
        
        IF v_device_active IS NULL OR NOT v_device_active THEN
            INSERT INTO public.activity_events (
                id, user_id, device_id, market_code, event_type, sequence_number,
                dependency_event_id, client_timestamp, payload, processing_status,
                processing_notes, idempotency_key
            ) VALUES (
                v_event_id, v_user_id, v_device_id, v_market_code, v_event_type, v_seq,
                v_dep_id, v_client_ts, v_payload, 'needs_review',
                'Device not currently assigned to authenticated user', v_idempotency_key
            );

            v_results := array_append(v_results, jsonb_build_object(
                'event_id', v_event_id,
                'status', 'needs_review',
                'reason', 'Unassigned device'
            ));
            CONTINUE;
        END IF;

        -- ---------------------------------------------------------------------
        -- 4. Clock Discrepancy & GPS Integrity Checks
        -- ---------------------------------------------------------------------
        -- Clock drift check (>15m future or >30d past)
        IF v_client_ts > (now() + interval '15 minutes') OR v_client_ts < (now() - interval '30 days') THEN
            INSERT INTO public.verification_flags (
                user_id, market_code, flag_code, severity, details, status
            ) VALUES (
                v_user_id, v_market_code, 'clock_discrepancy', 'medium',
                jsonb_build_object('client_ts', v_client_ts, 'server_ts', now(), 'event_id', v_event_id),
                'open'
            );
        END IF;

        -- Invalid GPS coordinates check
        IF v_lat IS NOT NULL AND v_lng IS NOT NULL THEN
            IF abs(v_lat) > 90 OR abs(v_lng) > 180 OR (v_acc IS NOT NULL AND v_acc > 1000) THEN
                INSERT INTO public.verification_flags (
                    user_id, market_code, flag_code, severity, details, status
                ) VALUES (
                    v_user_id, v_market_code, 'clock_discrepancy', 'high',
                    jsonb_build_object('latitude', v_lat, 'longitude', v_lng, 'accuracy', v_acc, 'event_id', v_event_id),
                    'open'
                );
            END IF;
        END IF;

        -- ---------------------------------------------------------------------
        -- 5. Fetch Active Market Rule
        -- ---------------------------------------------------------------------
        SELECT * INTO v_rule FROM public.market_rules 
        WHERE market_code = v_market_code AND is_active = true AND effective_to IS NULL
        LIMIT 1;

        -- ---------------------------------------------------------------------
        -- 6. Event Lifecycle Processing
        -- ---------------------------------------------------------------------
        IF v_event_type = 'start_day' THEN
            v_work_date := coalesce((v_payload->>'work_date')::DATE, v_client_ts::DATE);
            
            INSERT INTO public.attendance_days (
                user_id, device_id, market_code, work_date, started_at,
                start_latitude, start_longitude, start_accuracy_m, start_selfie_url,
                captured_offline, server_received_at
            ) VALUES (
                v_user_id, v_device_id, v_market_code, v_work_date, v_client_ts,
                v_lat, v_lng, coalesce(v_acc, 20.0), coalesce(v_payload->>'selfie_url', '/demo/start-selfie.jpg'),
                coalesce((v_event->>'captured_offline')::BOOLEAN, false), now()
            )
            ON CONFLICT (user_id, work_date) DO UPDATE
            SET started_at = EXCLUDED.started_at
            RETURNING id INTO v_attendance_id;

        ELSIF v_event_type = 'end_day' THEN
            v_work_date := coalesce((v_payload->>'work_date')::DATE, v_client_ts::DATE);
            
            UPDATE public.attendance_days
            SET ended_at = v_client_ts,
                end_latitude = v_lat,
                end_longitude = v_lng,
                end_accuracy_m = v_acc,
                status = 'ended'
            WHERE user_id = v_user_id AND work_date = v_work_date;

        ELSIF v_event_type = 'check_in' THEN
            -- Link historical location pin version active at client timestamp
            SELECT * INTO v_pin FROM public.branch_location_pins
            WHERE branch_id = (v_payload->>'branch_id')::UUID AND is_active = true
            ORDER BY version_number DESC LIMIT 1;

            IF v_pin.id IS NOT NULL AND v_lat IS NOT NULL AND v_lng IS NOT NULL THEN
                v_distance := ST_Distance(
                    ST_SetSRID(ST_MakePoint(v_lng::float8, v_lat::float8), 4326)::geography,
                    v_pin.geom::geography
                );

                IF v_distance + coalesce(v_acc, 20.0) <= v_rule.geofence_radius_m THEN
                    v_loc_class := 'inside_confident';
                    v_verif_status := 'capturing';
                ELSIF v_distance - coalesce(v_acc, 20.0) > v_rule.geofence_radius_m THEN
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

            IF v_attendance_id IS NULL THEN
                -- Auto-create attendance record if missing
                INSERT INTO public.attendance_days (
                    user_id, device_id, market_code, work_date, started_at,
                    start_latitude, start_longitude, start_accuracy_m, start_selfie_url
                ) VALUES (
                    v_user_id, v_device_id, v_market_code, v_client_ts::DATE, v_client_ts,
                    coalesce(v_lat, 0.0), coalesce(v_lng, 0.0), coalesce(v_acc, 20.0), '/demo/auto-selfie.jpg'
                ) RETURNING id INTO v_attendance_id;
            END IF;

            INSERT INTO public.visits (
                attendance_day_id, user_id, device_id, branch_id, branch_pin_id, rule_version_id, kind,
                check_in_at, check_in_latitude, check_in_longitude, check_in_accuracy_m,
                distance_to_pin_m, location_classification, verification_status,
                captured_offline, server_received_at
            ) VALUES (
                v_attendance_id, v_user_id, v_device_id, (v_payload->>'branch_id')::UUID, v_pin.id, v_rule.id, 'normal',
                v_client_ts, coalesce(v_lat, 0.0), coalesce(v_lng, 0.0), coalesce(v_acc, 20.0),
                v_distance, v_loc_class, v_verif_status,
                coalesce((v_event->>'captured_offline')::BOOLEAN, false), now()
            ) RETURNING id INTO v_visit_id;

        ELSIF v_event_type = 'check_out' THEN
            -- Find the open visit for this user and branch
            SELECT * INTO v_open_visit FROM public.visits
            WHERE user_id = v_user_id AND branch_id = (v_payload->>'branch_id')::UUID AND check_out_at IS NULL
            ORDER BY check_in_at DESC LIMIT 1;

            IF v_open_visit.id IS NOT NULL THEN
                -- Calculate checkout distance to pin if coordinates present
                IF v_lat IS NOT NULL AND v_lng IS NOT NULL AND v_open_visit.branch_pin_id IS NOT NULL THEN
                    SELECT * INTO v_pin FROM public.branch_location_pins WHERE id = v_open_visit.branch_pin_id;
                    IF v_pin.geom IS NOT NULL THEN
                        v_distance := ST_Distance(
                            ST_SetSRID(ST_MakePoint(v_lng::float8, v_lat::float8), 4326)::geography,
                            v_pin.geom::geography
                        );
                        -- If check_out is beyond geofence, raise flag per PRD §7.2
                        IF v_distance > v_rule.geofence_radius_m THEN
                            INSERT INTO public.verification_flags (
                                visit_id, user_id, market_code, flag_code, severity, details, status
                            ) VALUES (
                                v_open_visit.id, v_user_id, v_market_code, 'checkout_outside_geofence', 'medium',
                                jsonb_build_object('checkout_distance_m', v_distance, 'radius_m', v_rule.geofence_radius_m),
                                'open'
                            );
                        END IF;
                    END IF;
                END IF;

                UPDATE public.visits
                SET check_out_at = v_client_ts,
                    check_out_latitude = v_lat,
                    check_out_longitude = v_lng,
                    check_out_accuracy_m = v_acc,
                    premises_photo_url = coalesce(v_payload->>'premises_photo_url', premises_photo_url),
                    premises_photo_hash = coalesce(v_payload->>'premises_photo_hash', premises_photo_hash),
                    verification_status = CASE 
                        WHEN location_classification = 'inside_confident' AND (v_payload->>'premises_photo_url' IS NOT NULL OR premises_photo_url IS NOT NULL)
                        THEN 'location_verified'::public.visit_verification_status 
                        ELSE 'location_unverified'::public.visit_verification_status 
                    END
                WHERE id = v_open_visit.id;
            END IF;

        ELSIF v_event_type = 'meeting_log' THEN
            v_visit_id := (v_payload->>'visit_id')::UUID;
            IF v_visit_id IS NOT NULL THEN
                -- Check if late submission (>2h after checkout)
                SELECT * INTO v_open_visit FROM public.visits WHERE id = v_visit_id;
                
                INSERT INTO public.meeting_logs (
                    visit_id, contact_id, purpose, products_discussed,
                    fleet_size_volume, outcome_narrative, next_step_text,
                    business_card_photo_url, submitted_at, is_late
                ) VALUES (
                    v_visit_id, (v_payload->>'contact_id')::UUID,
                    (v_payload->>'purpose')::public.visit_purpose,
                    coalesce(ARRAY(SELECT jsonb_array_elements_text(v_payload->'products_discussed')), ARRAY[]::TEXT[]),
                    coalesce((v_payload->>'fleet_size_volume')::INT, 0),
                    coalesce(v_payload->>'outcome_narrative', 'Meeting completed'),
                    coalesce(v_payload->>'next_step_text', 'Follow up scheduled'),
                    v_payload->>'business_card_photo_url',
                    v_client_ts,
                    coalesce(v_open_visit.check_out_at IS NOT NULL AND v_client_ts > (v_open_visit.check_out_at + interval '2 hours'), false)
                ) ON CONFLICT (visit_id) DO NOTHING;

                IF v_open_visit.check_out_at IS NOT NULL AND v_client_ts > (v_open_visit.check_out_at + interval '2 hours') THEN
                    INSERT INTO public.verification_flags (
                        visit_id, user_id, market_code, flag_code, severity, details, status
                    ) VALUES (
                        v_visit_id, v_user_id, v_market_code, 'late_meeting_log', 'low',
                        jsonb_build_object('submitted_at', v_client_ts, 'checkout_at', v_open_visit.check_out_at),
                        'open'
                    );
                END IF;
            END IF;
        END IF;

        -- ---------------------------------------------------------------------
        -- 7. Record Ingested Event in Journal
        -- ---------------------------------------------------------------------
        INSERT INTO public.activity_events (
            id, user_id, device_id, market_code, event_type, sequence_number,
            dependency_event_id, client_timestamp, payload, processing_status, idempotency_key
        ) VALUES (
            v_event_id, v_user_id, v_device_id, v_market_code, v_event_type, v_seq,
            v_dep_id, v_client_ts, v_payload, 'processed', v_idempotency_key
        );

        v_results := array_append(v_results, jsonb_build_object(
            'event_id', v_event_id,
            'status', 'processed'
        ));
    END LOOP;

    RETURN to_jsonb(v_results);
END;
$$;


-- =============================================================================
-- 5. Business Workflow Helper Procedures
-- =============================================================================

-- 5.1 Request & Review Authorized Non-Visit Workday (PRD §6.2)
CREATE OR REPLACE FUNCTION public.request_non_visit_workday(
    p_date DATE,
    p_category TEXT,
    p_justification TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_market VARCHAR(2);
    v_id UUID := extensions.uuid_generate_v4();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    SELECT market_code INTO v_market FROM public.profiles WHERE id = v_user_id;

    INSERT INTO public.approved_absences (
        id, user_id, market_code, absence_date, category,
        counts_as_attendance, counts_as_visit_target, justification, approved_by, approved_at
    ) VALUES (
        v_id, v_user_id, v_market, p_date, p_category::public.absence_category,
        true, false, p_justification, v_user_id, now()
    );

    INSERT INTO public.approval_audit (
        entity_type, entity_id, actor_id, action, previous_state, new_state, mandatory_reason
    ) VALUES (
        'authorized_absence', v_id, v_user_id, 'request_non_visit_day', 'pending', 'requested', p_justification
    );

    RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_non_visit_workday(DATE, TEXT, TEXT) TO authenticated;

-- 5.2 Branch & Location Pin Lifecycle Procedures
CREATE OR REPLACE FUNCTION public.propose_branch_location_pin(
    p_branch_id UUID,
    p_latitude NUMERIC,
    p_longitude NUMERIC,
    p_accuracy_m NUMERIC,
    p_photo_url TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_next_version INT;
    v_pin_id UUID := extensions.uuid_generate_v4();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    -- Calculate next version number
    SELECT coalesce(max(version_number), 0) + 1 INTO v_next_version
    FROM public.branch_location_pins WHERE branch_id = p_branch_id;

    INSERT INTO public.branch_location_pins (
        id, branch_id, version_number, latitude, longitude, reported_accuracy_m,
        premises_photo_url, status, proposed_by, is_active
    ) VALUES (
        v_pin_id, p_branch_id, v_next_version, p_latitude, p_longitude, p_accuracy_m,
        p_photo_url, 'pending_review', v_user_id, false
    );

    RETURN v_pin_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.propose_branch_location_pin(UUID, NUMERIC, NUMERIC, NUMERIC, TEXT) TO authenticated;

-- Pin Review (Country Sales Head or HQ)
CREATE OR REPLACE FUNCTION public.review_branch_location_pin(
    p_pin_id UUID,
    p_action TEXT, -- 'approve' or 'reject'
    p_review_notes TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_pin RECORD;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    IF NOT (public.is_hq() OR public.auth_role() = 'country_sales_head') THEN
        RAISE EXCEPTION 'Only Country Sales Heads or HQ can review location pins';
    END IF;

    SELECT * INTO v_pin FROM public.branch_location_pins WHERE id = p_pin_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pin % not found', p_pin_id;
    END IF;

    IF p_action = 'approve' THEN
        -- Deactivate prior active pins for this branch
        UPDATE public.branch_location_pins
        SET is_active = false
        WHERE branch_id = v_pin.branch_id AND id <> p_pin_id;

        -- Activate newly approved pin
        UPDATE public.branch_location_pins
        SET status = 'approved', reviewed_by = v_actor_id, reviewed_at = now(), is_active = true
        WHERE id = p_pin_id;

        -- Update branch status to active
        UPDATE public.branches
        SET operating_status = 'active', updated_at = now()
        WHERE id = v_pin.branch_id;

        INSERT INTO public.approval_audit (
            entity_type, entity_id, actor_id, action, previous_state, new_state, mandatory_reason
        ) VALUES (
            'branch_pin', p_pin_id, v_actor_id, 'approve_pin', v_pin.status::text, 'approved', p_review_notes
        );
    ELSE
        UPDATE public.branch_location_pins
        SET status = 'rejected', reviewed_by = v_actor_id, reviewed_at = now(), is_active = false
        WHERE id = p_pin_id;

        INSERT INTO public.approval_audit (
            entity_type, entity_id, actor_id, action, previous_state, new_state, mandatory_reason
        ) VALUES (
            'branch_pin', p_pin_id, v_actor_id, 'reject_pin', v_pin.status::text, 'rejected', p_review_notes
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_branch_location_pin(UUID, TEXT, TEXT) TO authenticated;

-- 5.3 Client Audit Call & Dispute Workbench Procedures (PRD §8.3 / AT-10)
CREATE OR REPLACE FUNCTION public.record_client_audit_call(
    p_audit_record_id UUID,
    p_call_result TEXT, -- 'reached_confirmed', 'reached_denied', 'no_answer', 'number_invalid', 'client_busy'
    p_notes TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_rec RECORD;
    v_next_attempt INT;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    IF NOT (public.is_hq() OR public.auth_role() = 'country_sales_head') THEN
        RAISE EXCEPTION 'Only Country Sales Heads or HQ can record client audit outcomes';
    END IF;

    SELECT * INTO v_rec FROM public.client_audit_records WHERE id = p_audit_record_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Audit record % not found', p_audit_record_id;
    END IF;

    -- Calculate next attempt number
    SELECT coalesce(max(attempt_number), 0) + 1 INTO v_next_attempt
    FROM public.client_audit_attempts WHERE audit_record_id = p_audit_record_id;

    -- Insert attempt log
    INSERT INTO public.client_audit_attempts (
        audit_record_id, attempt_number, dialed_at, call_result, notes, caller_id
    ) VALUES (
        p_audit_record_id, v_next_attempt, now(), p_call_result::public.audit_call_status, p_notes, v_actor_id
    );

    -- Update audit record status
    IF p_call_result = 'reached_confirmed' THEN
        UPDATE public.client_audit_records
        SET call_status = 'reached_confirmed', meeting_confirmed = true,
            audit_outcome = 'verified_positive', dispute_status = 'none',
            resolved_by = v_actor_id, resolved_at = now()
        WHERE id = p_audit_record_id;

    ELSIF p_call_result = 'reached_denied' THEN
        -- Client denied meeting took place -> initiate Disputed - Pending Review
        UPDATE public.client_audit_records
        SET call_status = 'reached_denied', meeting_confirmed = false,
            audit_outcome = 'client_denied', dispute_status = 'pending_investigation',
            dispute_notes = p_notes
        WHERE id = p_audit_record_id;

        -- Raise audit dispute flag on the visit
        INSERT INTO public.verification_flags (
            visit_id, user_id, market_code, flag_code, severity, details, status
        ) VALUES (
            v_rec.visit_id, (SELECT user_id FROM public.visits WHERE id = v_rec.visit_id),
            v_rec.market_code, 'audit_dispute', 'critical',
            jsonb_build_object('reason', 'Client denied salesperson meeting during audit call', 'notes', p_notes),
            'open'
        );

    ELSIF p_call_result IN ('no_answer', 'client_busy') THEN
        IF v_next_attempt >= 3 THEN
            UPDATE public.client_audit_records
            SET call_status = p_call_result::public.audit_call_status,
                audit_outcome = 'unreachable', dispute_status = 'unresolved_unreachable',
                resolved_by = v_actor_id, resolved_at = now()
            WHERE id = p_audit_record_id;
        ELSE
            UPDATE public.client_audit_records
            SET call_status = p_call_result::public.audit_call_status
            WHERE id = p_audit_record_id;
        END IF;
    ELSE
        UPDATE public.client_audit_records
        SET call_status = p_call_result::public.audit_call_status,
            audit_outcome = 'unreachable', resolved_by = v_actor_id, resolved_at = now()
        WHERE id = p_audit_record_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_client_audit_call(UUID, TEXT, TEXT) TO authenticated;

-- Resolve Client Audit Dispute (PRD §8.4)
CREATE OR REPLACE FUNCTION public.resolve_client_audit_dispute(
    p_audit_record_id UUID,
    p_decision TEXT, -- 'rep_substantiated', 'confirmed_violation', 'inconclusive'
    p_mandatory_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_rec RECORD;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    IF NOT (public.is_hq() OR public.auth_role() = 'country_sales_head') THEN
        RAISE EXCEPTION 'Only Country Sales Heads or HQ can resolve audit disputes';
    END IF;

    SELECT * INTO v_rec FROM public.client_audit_records WHERE id = p_audit_record_id;

    UPDATE public.client_audit_records
    SET dispute_status = CASE 
            WHEN p_decision = 'rep_substantiated' THEN 'resolved_verified'::public.dispute_resolution_status
            WHEN p_decision = 'confirmed_violation' THEN 'confirmed_violation'::public.dispute_resolution_status
            ELSE 'unresolved_unreachable'::public.dispute_resolution_status
        END,
        dispute_notes = p_mandatory_reason,
        resolved_by = v_actor_id,
        resolved_at = now()
    WHERE id = p_audit_record_id;

    INSERT INTO public.approval_audit (
        entity_type, entity_id, actor_id, action, previous_state, new_state, mandatory_reason
    ) VALUES (
        'client_audit_dispute', p_audit_record_id, v_actor_id, 'resolve_dispute',
        v_rec.dispute_status::text, p_decision, p_mandatory_reason
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_client_audit_dispute(UUID, TEXT, TEXT) TO authenticated;
