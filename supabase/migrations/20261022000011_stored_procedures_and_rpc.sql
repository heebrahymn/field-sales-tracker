-- =============================================================================
-- Migration 00011: Stored Procedures & Atomic Event Ingestion RPCs
-- Carbon Field Sales Tracker (PostGIS Geofence & Idempotent Ingestion)
-- =============================================================================

-- =============================================================================
-- 1. Atomic Offline Event Ingestion RPC (PRD §9)
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

    -- Fetch user profile details
    SELECT market_code INTO v_market_code FROM public.profiles WHERE id = v_user_id;

    FOREACH v_event IN ARRAY events LOOP
        v_event_id := (v_event->>'id')::UUID;
        v_event_type := v_event->>'event_type';
        v_seq := (v_event->>'sequence_number')::BIGINT;
        v_idempotency_key := v_event->>'idempotency_key';
        v_client_ts := (v_event->>'client_timestamp')::TIMESTAMPTZ;
        v_payload := v_event->'payload';
        v_device_id := (v_payload->>'device_id')::UUID;

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
            -- Record as needs_review with flag
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
            -- Fetch active branch pin
            SELECT * INTO v_pin FROM public.branch_location_pins
            WHERE branch_id = (v_payload->>'branch_id')::UUID AND is_active = true
            ORDER BY version_number DESC LIMIT 1;

            IF v_pin.id IS NOT NULL THEN
                -- Calculate PostGIS spatial distance
                v_distance := ST_Distance(
                    ST_SetSRID(ST_MakePoint((v_payload->>'longitude')::NUMERIC, (v_payload->>'latitude')::NUMERIC), 4326)::geography,
                    v_pin.geom::geography
                );

                -- Evaluate confidence model
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

            -- Get attendance day
            SELECT id INTO v_attendance_id FROM public.attendance_days
            WHERE user_id = v_user_id AND work_date = v_client_ts::DATE;

            -- Insert visit record
            INSERT INTO public.visits (
                attendance_day_id, user_id, device_id, branch_id, branch_pin_id, rule_version_id,
                kind, check_in_at, check_in_latitude, check_in_longitude, check_in_accuracy_m,
                distance_to_pin_m, location_classification, premises_photo_url, verification_status,
                captured_offline, server_received_at
            ) VALUES (
                v_attendance_id, v_user_id, v_device_id, (v_payload->>'branch_id')::UUID, v_pin.id, v_rule.id,
                'normal', v_client_ts, (v_payload->>'latitude')::NUMERIC, (v_payload->>'longitude')::NUMERIC,
                (v_payload->>'accuracy_m')::NUMERIC, v_distance, v_loc_class, v_payload->>'premises_photo_url',
                v_verif_status, coalesce((v_event->>'captured_offline')::BOOLEAN, false), now()
            )
            RETURNING id INTO v_visit_id;

        ELSIF v_event_type = 'check_out' THEN
            v_visit_id := (v_payload->>'visit_id')::UUID;

            UPDATE public.visits
            SET check_out_at = v_client_ts,
                check_out_latitude = (v_payload->>'latitude')::NUMERIC,
                check_out_longitude = (v_payload->>'longitude')::NUMERIC,
                check_out_accuracy_m = (v_payload->>'accuracy_m')::NUMERIC,
                verification_status = CASE 
                    WHEN location_classification = 'inside_confident' AND premises_photo_url IS NOT NULL 
                    THEN 'location_verified'::public.visit_verification_status
                    ELSE 'location_unverified'::public.visit_verification_status
                END
            WHERE id = v_visit_id;

            -- Tripwire Flag: Check out outside geofence
            IF (v_payload->>'is_outside_geofence')::BOOLEAN = true THEN
                INSERT INTO public.verification_flags (
                    visit_id, user_id, market_code, flag_code, severity, details
                ) VALUES (
                    v_visit_id, v_user_id, v_market_code, 'checkout_outside_geofence', 'medium',
                    jsonb_build_object('checkout_time', v_client_ts, 'notes', 'Checkout completed outside branch geofence boundary')
                );
            END IF;

        ELSIF v_event_type = 'submit_meeting_log' THEN
            v_visit_id := (v_payload->>'visit_id')::UUID;

            INSERT INTO public.meeting_logs (
                visit_id, contact_id, purpose, products_discussed, fleet_size_volume,
                outcome_narrative, next_step_text, business_card_photo_url, submitted_at, is_late
            ) VALUES (
                v_visit_id, (v_payload->>'contact_id')::UUID, (v_payload->>'purpose')::public.visit_purpose,
                ARRAY(SELECT jsonb_array_elements_text(v_payload->'products_discussed')),
                coalesce((v_payload->>'fleet_size_volume')::INT, 0),
                coalesce(v_payload->>'outcome_narrative', ''),
                coalesce(v_payload->>'next_step_text', ''),
                v_payload->>'business_card_photo_url', v_client_ts,
                coalesce((v_payload->>'is_late')::BOOLEAN, false)
            );
        END IF;

        -- Record event in activity_events journal
        INSERT INTO public.activity_events (
            id, user_id, device_id, market_code, event_type, sequence_number,
            client_timestamp, server_received_at, payload, processing_status, idempotency_key
        ) VALUES (
            v_event_id, v_user_id, v_device_id, v_market_code, v_event_type, v_seq,
            v_client_ts, now(), v_payload, 'accepted', v_idempotency_key
        );

        v_results := array_append(v_results, jsonb_build_object(
            'event_id', v_event_id,
            'status', 'accepted',
            'visit_id', v_visit_id
        ));
    END LOOP;

    RETURN to_jsonb(v_results);
END;
$$;

-- =============================================================================
-- 2. Branch Location Pin Review RPCs
-- =============================================================================
CREATE OR REPLACE FUNCTION public.approve_branch_location_pin(p_pin_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_branch_id UUID;
    v_actor_id UUID := auth.uid();
BEGIN
    IF NOT (public.is_hq() OR public.auth_role() = 'country_sales_head') THEN
        RAISE EXCEPTION 'Unauthorized to approve branch location pins';
    END IF;

    SELECT branch_id INTO v_branch_id FROM public.branch_location_pins WHERE id = p_pin_id;

    -- Deactivate any prior active pins for this branch
    UPDATE public.branch_location_pins SET is_active = false, status = 'superseded' 
    WHERE branch_id = v_branch_id AND is_active = true;

    -- Activate approved pin
    UPDATE public.branch_location_pins 
    SET is_active = true, status = 'approved', reviewed_by = v_actor_id, reviewed_at = now(), decision_reason = p_reason
    WHERE id = p_pin_id;

    -- Set branch operating status to active
    UPDATE public.branches SET operating_status = 'active', updated_at = now() WHERE id = v_branch_id;

    -- Append to approval audit ledger
    INSERT INTO public.approval_audit (entity_type, entity_id, actor_id, action, previous_state, new_state, mandatory_reason)
    VALUES ('branch_pin', p_pin_id, v_actor_id, 'approve', 'pending_approval', 'approved', p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_branch_location_pin(p_pin_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_branch_id UUID;
    v_actor_id UUID := auth.uid();
BEGIN
    IF NOT (public.is_hq() OR public.auth_role() = 'country_sales_head') THEN
        RAISE EXCEPTION 'Unauthorized to reject branch location pins';
    END IF;

    SELECT branch_id INTO v_branch_id FROM public.branch_location_pins WHERE id = p_pin_id;

    UPDATE public.branch_location_pins 
    SET is_active = false, status = 'rejected', reviewed_by = v_actor_id, reviewed_at = now(), decision_reason = p_reason
    WHERE id = p_pin_id;

    UPDATE public.branches SET operating_status = 'rejected', updated_at = now() WHERE id = v_branch_id;

    INSERT INTO public.approval_audit (entity_type, entity_id, actor_id, action, previous_state, new_state, mandatory_reason)
    VALUES ('branch_pin', p_pin_id, v_actor_id, 'reject', 'pending_approval', 'rejected', p_reason);
END;
$$;

-- =============================================================================
-- 3. Salesperson Exception Adjudication RPC (PRD §7.4)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.review_salesperson_exception(
    p_exception_id UUID,
    p_status public.exception_review_status,
    p_reason TEXT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_exc RECORD;
    v_visit_id UUID;
BEGIN
    IF NOT (public.is_hq() OR public.auth_role() = 'country_sales_head') THEN
        RAISE EXCEPTION 'Unauthorized to review salesperson exceptions';
    END IF;

    SELECT * INTO v_exc FROM public.exceptions WHERE id = p_exception_id;

    IF p_status = 'approved' THEN
        -- If missed visit or GPS failure exception is approved, create or update visit as 'manager_approved_unverified'
        -- Strict PRD rule: NEVER promote to location_verified!
        IF v_exc.branch_id IS NOT NULL THEN
            INSERT INTO public.visits (
                attendance_day_id, user_id, device_id, branch_id, kind,
                check_in_at, check_out_at, check_in_latitude, check_in_longitude, check_in_accuracy_m,
                distance_to_pin_m, location_classification, verification_status, server_received_at
            ) VALUES (
                v_exc.attendance_day_id, v_exc.user_id, 
                coalesce((SELECT device_id FROM public.device_assignments WHERE salesperson_id = v_exc.user_id AND is_current = true LIMIT 1), '00000000-0000-0000-0000-000000000000'::UUID),
                v_exc.branch_id, 'exception_visit', v_exc.claimed_visit_time, v_exc.claimed_visit_time + interval '30 minutes',
                0.0, 0.0, 999.0, 0.0, 'uncertain', 'manager_approved_unverified', now()
            ) RETURNING id INTO v_visit_id;
        END IF;
    END IF;

    UPDATE public.exceptions
    SET status = p_status, decided_by = v_actor_id, decided_at = now(), decision_reason = p_reason, resulting_visit_id = v_visit_id
    WHERE id = p_exception_id;

    INSERT INTO public.approval_audit (entity_type, entity_id, actor_id, action, previous_state, new_state, mandatory_reason)
    VALUES ('exception', p_exception_id, v_actor_id, p_status::text, v_exc.status::text, p_status::text, p_reason);
END;
$$;

-- =============================================================================
-- 4. HQ Admin Device Replacement Management RPCs (Approved Decision)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.hq_approve_device_replacement(p_request_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_actor_id UUID := auth.uid();
BEGIN
    IF NOT public.is_hq() THEN
        RAISE EXCEPTION 'Only HQ Administrators can approve company device replacements';
    END IF;

    UPDATE public.device_replacement_requests
    SET status = 'approved', approval_reason = p_reason, updated_at = now()
    WHERE id = p_request_id;

    INSERT INTO public.device_replacement_history (request_id, actor_id, action, previous_status, new_status, notes)
    VALUES (p_request_id, v_actor_id, 'Approve Request', 'pending_review', 'approved', p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_allocate_spare_device(p_request_id UUID, p_spare_device_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_actor_id UUID := auth.uid();
BEGIN
    IF NOT public.is_hq() THEN
        RAISE EXCEPTION 'Only HQ Administrators can allocate spare devices';
    END IF;

    -- Update replacement request
    UPDATE public.device_replacement_requests
    SET replacement_device_id = p_spare_device_id, status = 'awaiting_spare', updated_at = now()
    WHERE id = p_request_id;

    -- Update spare device status in inventory
    UPDATE public.devices
    SET inventory_status = 'assigned', updated_at = now()
    WHERE id = p_spare_device_id;

    INSERT INTO public.device_replacement_history (request_id, actor_id, action, previous_status, new_status, notes)
    VALUES (p_request_id, v_actor_id, 'Allocate Spare Device', 'approved', 'awaiting_spare', 'Spare handset allocated from regional depot inventory');
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_record_device_dispatch(p_request_id UUID, p_dispatch_notes TEXT, p_tracking_ref TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_actor_id UUID := auth.uid();
BEGIN
    IF NOT public.is_hq() THEN
        RAISE EXCEPTION 'Only HQ Administrators can record device dispatch';
    END IF;

    UPDATE public.device_replacement_requests
    SET status = 'dispatched', dispatch_notes = p_dispatch_notes, courier_tracking_ref = p_tracking_ref, updated_at = now()
    WHERE id = p_request_id;

    INSERT INTO public.device_replacement_history (request_id, actor_id, action, previous_status, new_status, notes)
    VALUES (p_request_id, v_actor_id, 'Record Dispatch', 'awaiting_spare', 'dispatched', p_dispatch_notes || ' (Tracking: ' || p_tracking_ref || ')');
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_confirm_device_activation(p_request_id UUID, p_old_disposition public.old_device_disposition)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_req RECORD;
BEGIN
    IF NOT public.is_hq() THEN
        RAISE EXCEPTION 'Only HQ Administrators can confirm device replacement activation';
    END IF;

    SELECT * INTO v_req FROM public.device_replacement_requests WHERE id = p_request_id;

    -- 1. Deactivate old device custody assignment
    UPDATE public.device_assignments
    SET is_current = false, returned_at = now()
    WHERE device_id = v_req.company_device_id AND salesperson_id = v_req.salesperson_id AND is_current = true;

    -- 2. Update old device status
    UPDATE public.devices
    SET inventory_status = CASE WHEN p_old_disposition = 'returned_to_depot' THEN 'returned'::public.device_inventory_status ELSE 'revoked'::public.device_inventory_status END,
        security_authorization = 'revoked', updated_at = now()
    WHERE id = v_req.company_device_id;

    -- 3. Create new custody assignment for replacement device
    INSERT INTO public.device_assignments (device_id, salesperson_id, assigned_at, assigned_by, handover_reason, is_current)
    VALUES (v_req.replacement_device_id, v_req.salesperson_id, now(), v_actor_id, 'Activated replacement device following hardware defect', true);

    -- 4. Update new device status to active
    UPDATE public.devices
    SET inventory_status = 'active', security_authorization = 'authorized', updated_at = now()
    WHERE id = v_req.replacement_device_id;

    -- 5. Complete request
    UPDATE public.device_replacement_requests
    SET status = 'completed', activation_confirmed_at = now(), old_device_disposition = p_old_disposition, updated_at = now()
    WHERE id = p_request_id;

    INSERT INTO public.device_replacement_history (request_id, actor_id, action, previous_status, new_status, notes)
    VALUES (p_request_id, v_actor_id, 'Confirm Activation in MDM', 'dispatched', 'completed', 'Knox MDM activation confirmed. Old handset disposition: ' || p_old_disposition::text);
END;
$$;
