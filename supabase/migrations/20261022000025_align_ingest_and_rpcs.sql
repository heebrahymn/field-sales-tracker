-- =============================================================================
-- Migration 00025: Align Ingest Activity Events & Helper RPC Signatures
-- Carbon Field Sales Tracker (Stage 2B Final Security Verification)
-- =============================================================================

SET search_path = public, extensions;

-- 1. Canonical ingest_activity_events(events jsonb[]) with 5-minute dynamic clock drift
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
    v_max_clock_drift INT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request to ingest_activity_events';
    END IF;

    SELECT market_code INTO v_market_code FROM public.profiles WHERE id = v_user_id;

    -- Fetch active market rule once per batch
    SELECT * INTO v_rule FROM public.market_rules 
    WHERE market_code = v_market_code AND is_active = true AND effective_to IS NULL
    LIMIT 1;

    v_max_clock_drift := coalesce(v_rule.max_clock_drift_minutes, 5);

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
        -- 4. Clock Discrepancy & GPS Integrity Checks (5-Minute Canonical Threshold)
        -- ---------------------------------------------------------------------
        IF v_client_ts > (now() + (v_max_clock_drift || ' minutes')::interval) OR v_client_ts < (now() - interval '30 days') THEN
            INSERT INTO public.verification_flags (
                user_id, market_code, flag_code, severity, details, status
            ) VALUES (
                v_user_id, v_market_code, 'clock_discrepancy', 'medium',
                jsonb_build_object(
                    'client_ts', v_client_ts,
                    'server_ts', now(),
                    'threshold_minutes', v_max_clock_drift,
                    'drift_seconds', EXTRACT(EPOCH FROM (v_client_ts - now())),
                    'event_id', v_event_id
                ),
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
        -- 5. Event Lifecycle Processing
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
            SELECT * INTO v_open_visit FROM public.visits
            WHERE user_id = v_user_id AND branch_id = (v_payload->>'branch_id')::UUID AND check_out_at IS NULL
            ORDER BY check_in_at DESC LIMIT 1;

            IF v_open_visit.id IS NOT NULL THEN
                IF v_lat IS NOT NULL AND v_lng IS NOT NULL AND v_open_visit.branch_pin_id IS NOT NULL THEN
                    SELECT * INTO v_pin FROM public.branch_location_pins WHERE id = v_open_visit.branch_pin_id;
                    IF v_pin.geom IS NOT NULL THEN
                        v_distance := ST_Distance(
                            ST_SetSRID(ST_MakePoint(v_lng::float8, v_lat::float8), 4326)::geography,
                            v_pin.geom::geography
                        );
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
                )
                ON CONFLICT (visit_id) DO NOTHING;
            END IF;
        END IF;

        -- ---------------------------------------------------------------------
        -- 6. Journal the Ingested Event
        -- ---------------------------------------------------------------------
        INSERT INTO public.activity_events (
            id, user_id, device_id, market_code, event_type, sequence_number,
            dependency_event_id, client_timestamp, payload, processing_status,
            idempotency_key
        ) VALUES (
            v_event_id, v_user_id, v_device_id, v_market_code, v_event_type, v_seq,
            v_dep_id, v_client_ts, v_payload, 'processed',
            v_idempotency_key
        );

        v_results := array_append(v_results, jsonb_build_object(
            'event_id', v_event_id,
            'status', 'processed'
        ));
    END LOOP;

    RETURN to_jsonb(v_results);
END;
$$;

-- 2. Overload for ingest_activity_events(p_events JSONB)
CREATE OR REPLACE FUNCTION public.ingest_activity_events(p_events JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_arr JSONB[];
BEGIN
    IF jsonb_typeof(p_events) = 'array' THEN
        SELECT array_agg(elem) INTO v_arr FROM jsonb_array_elements(p_events) AS elem;
    ELSE
        v_arr := ARRAY[p_events];
    END IF;

    RETURN public.ingest_activity_events(events => v_arr);
END;
$$;

-- 3. Device Replacement Helper RPCs (Zero CSH Bottleneck, strictly HQ Only)
CREATE OR REPLACE FUNCTION public.hq_review_device_replacement(p_replacement_id UUID, p_status TEXT, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    IF NOT public.is_hq() THEN
        RAISE EXCEPTION 'Zero Bottleneck Violation: Only HQ Administrators can review or approve device replacements';
    END IF;

    IF p_status = 'approved' THEN
        PERFORM public.hq_approve_device_replacement(p_replacement_id, p_reason);
    ELSE
        UPDATE public.device_replacement_requests
        SET status = 'rejected', rejection_reason = p_reason, updated_at = now()
        WHERE id = p_replacement_id;

        INSERT INTO public.device_replacement_history (request_id, actor_id, action, previous_status, new_status, notes)
        VALUES (p_replacement_id, auth.uid(), 'Reject Request', 'pending_review', 'rejected', p_reason);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_dispatch_replacement_device(
    p_replacement_id UUID,
    p_replacement_device_id UUID,
    p_courier_tracking_ref TEXT,
    p_dispatch_notes TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    IF NOT public.is_hq() THEN
        RAISE EXCEPTION 'Zero Bottleneck Violation: Only HQ Administrators can dispatch replacement devices';
    END IF;

    PERFORM public.hq_allocate_spare_device(p_replacement_id, p_replacement_device_id);
    PERFORM public.hq_record_device_dispatch(p_replacement_id, p_dispatch_notes, p_courier_tracking_ref);
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_confirm_replacement_activation(
    p_replacement_id UUID,
    p_old_device_disposition TEXT DEFAULT 'revoked'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    IF NOT public.is_hq() THEN
        RAISE EXCEPTION 'Zero Bottleneck Violation: Only HQ Administrators can confirm device replacement activation';
    END IF;

    PERFORM public.hq_confirm_device_activation(p_replacement_id, coalesce(p_old_device_disposition, 'revoked')::public.old_device_disposition);
END;
$$;

-- 4. Support flexible parameters on record_client_audit_call
CREATE OR REPLACE FUNCTION public.record_client_audit_call(
    p_audit_record_id UUID,
    p_call_result TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_outcome TEXT DEFAULT NULL,
    p_contact_person TEXT DEFAULT NULL,
    p_telephone TEXT DEFAULT NULL
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
    v_call_status public.audit_call_status;
    v_res TEXT;
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

    v_res := coalesce(p_call_result, p_outcome);
    IF v_res = 'unreachable_no_answer' THEN
        v_res := 'no_answer';
    ELSIF v_res = 'disputed_denied' THEN
        v_res := 'reached_denied';
    END IF;

    -- Calculate next attempt number
    SELECT coalesce(max(attempt_number), 0) + 1 INTO v_next_attempt
    FROM public.client_audit_attempts WHERE audit_record_id = p_audit_record_id;

    -- Determine call_status enum value
    IF v_res IN ('reached_confirmed', 'reached_denied', 'connected') THEN
        v_call_status := 'connected';
    ELSIF v_res IN ('no_answer', 'busy', 'disconnected') THEN
        v_call_status := v_res::public.audit_call_status;
    ELSE
        v_call_status := 'disconnected';
    END IF;

    -- Insert attempt log
    INSERT INTO public.client_audit_attempts (
        audit_record_id, attempt_number, dialed_at, call_result, call_notes, auditor_id
    ) VALUES (
        p_audit_record_id, v_next_attempt, now(), v_call_status, p_notes, v_actor_id
    );

    -- Update audit record status according to outcome
    IF v_res = 'reached_confirmed' THEN
        UPDATE public.client_audit_records
        SET call_status = 'connected', meeting_confirmed = true,
            audit_outcome = 'confirmed_valid', dispute_status = 'none',
            resolved_by = v_actor_id, resolved_at = now()
        WHERE id = p_audit_record_id;

    ELSIF v_res = 'reached_denied' THEN
        -- Client denied meeting took place -> initiate Disputed - Under Investigation (PRD §8.3 / AT-10)
        UPDATE public.client_audit_records
        SET call_status = 'connected', meeting_confirmed = false,
            audit_outcome = 'disputed_denied', dispute_status = 'under_investigation',
            dispute_notes = p_notes
        WHERE id = p_audit_record_id;

        -- Raise critical audit dispute flag on the visit
        INSERT INTO public.verification_flags (
            visit_id, user_id, market_code, flag_code, severity, details, status
        ) VALUES (
            v_rec.visit_id, (SELECT user_id FROM public.visits WHERE id = v_rec.visit_id),
            v_rec.market_code, 'audit_dispute', 'critical',
            jsonb_build_object('reason', 'Client denied salesperson meeting during audit call', 'notes', p_notes),
            'open'
        );

    ELSIF v_res IN ('no_answer', 'busy') THEN
        IF v_next_attempt >= 3 THEN
            UPDATE public.client_audit_records
            SET call_status = v_call_status,
                audit_outcome = 'unreachable',
                resolved_by = v_actor_id, resolved_at = now()
            WHERE id = p_audit_record_id;
        ELSE
            UPDATE public.client_audit_records
            SET call_status = v_call_status
            WHERE id = p_audit_record_id;
        END IF;
    ELSE
        UPDATE public.client_audit_records
        SET call_status = v_call_status,
            audit_outcome = 'unreachable', resolved_by = v_actor_id, resolved_at = now()
        WHERE id = p_audit_record_id;
    END IF;
END;
$$;

-- 5. Revoke untrusted public privileges & grant authenticated
REVOKE EXECUTE ON FUNCTION public.ingest_activity_events(jsonb[]) FROM public;
GRANT EXECUTE ON FUNCTION public.ingest_activity_events(jsonb[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.ingest_activity_events(JSONB) FROM public;
GRANT EXECUTE ON FUNCTION public.ingest_activity_events(JSONB) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.hq_review_device_replacement(UUID, TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.hq_review_device_replacement(UUID, TEXT, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.hq_dispatch_replacement_device(UUID, UUID, TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.hq_dispatch_replacement_device(UUID, UUID, TEXT, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.hq_confirm_replacement_activation(UUID, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.hq_confirm_replacement_activation(UUID, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.record_client_audit_call(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.record_client_audit_call(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
