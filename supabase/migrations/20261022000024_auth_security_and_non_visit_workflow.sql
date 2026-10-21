-- =============================================================================
-- Migration 24: Auth Credential Hardening, Non-Visit Approval Workflow,
-- 5-Minute Clock Discrepancy Threshold, and Storage Isolation
-- Carbon Field Sales Tracker (Nigeria, Zambia, Malawi)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Schema Privilege Hardening (Prevent Untrusted Object Creation)
-- -----------------------------------------------------------------------------
REVOKE ALL ON SCHEMA public FROM public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

REVOKE ALL ON SCHEMA extensions FROM public;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Prevent Unauthorized Role / Market Escalation on Profiles
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_profile_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role OR NEW.market_code IS DISTINCT FROM OLD.market_code THEN
        IF NOT public.is_hq() THEN
            RAISE EXCEPTION 'Unauthorized: Role and market assignments cannot be modified by non-HQ users';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_profile_escalation();

-- -----------------------------------------------------------------------------
-- 3. Non-Visit Workday Approval Architecture (PRD §6.2 & §7.6)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'absence_request_status') THEN
        CREATE TYPE public.absence_request_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.absence_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    absence_date DATE NOT NULL,
    category public.absence_category NOT NULL,
    justification TEXT NOT NULL,
    status public.absence_request_status NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_absence_req_date UNIQUE (user_id, absence_date)
);

ALTER TABLE public.absence_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "absence_requests_select" ON public.absence_requests;
CREATE POLICY "absence_requests_select" ON public.absence_requests
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR public.is_hq()
        OR (public.auth_role() = 'country_sales_head' AND market_code = public.auth_market())
    );

DROP POLICY IF EXISTS "absence_requests_insert_salesperson" ON public.absence_requests;
CREATE POLICY "absence_requests_insert_salesperson" ON public.absence_requests
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND public.auth_role() = 'salesperson'
    );

DROP POLICY IF EXISTS "absence_requests_update_reviewers" ON public.absence_requests;
CREATE POLICY "absence_requests_update_reviewers" ON public.absence_requests
    FOR UPDATE TO authenticated
    USING (
        public.is_hq()
        OR (public.auth_role() = 'country_sales_head' AND market_code = public.auth_market())
    );

REVOKE DELETE ON public.absence_requests FROM authenticated;

-- Salesperson Request RPC: Initiates request in 'pending' status
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
    v_role VARCHAR(32);
    v_market VARCHAR(2);
    v_id UUID := extensions.uuid_generate_v4();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    SELECT role, market_code INTO v_role, v_market FROM public.profiles WHERE id = v_user_id;

    IF v_role <> 'salesperson' THEN
        RAISE EXCEPTION 'Unauthorized: Only salespeople can submit non-visit workday requests';
    END IF;

    IF p_justification IS NULL OR trim(p_justification) = '' THEN
        RAISE EXCEPTION 'A justification is required for non-visit workday requests';
    END IF;

    -- Insert or update as PENDING. NEVER self-approves into approved_absences.
    INSERT INTO public.absence_requests (
        id, user_id, market_code, absence_date, category, justification, status, created_at
    ) VALUES (
        v_id, v_user_id, v_market, p_date, p_category::public.absence_category, p_justification, 'pending', now()
    )
    ON CONFLICT (user_id, absence_date) DO UPDATE SET
        category = EXCLUDED.category,
        justification = EXCLUDED.justification,
        status = 'pending',
        reviewed_by = NULL,
        reviewed_at = NULL,
        rejection_reason = NULL
    RETURNING id INTO v_id;

    INSERT INTO public.approval_audit (
        entity_type, entity_id, actor_id, action, previous_state, new_state, mandatory_reason
    ) VALUES (
        'absence_request', v_id, v_user_id, 'request_non_visit_workday', 'none', 'pending', p_justification
    );

    RETURN v_id;
END;
$$;

-- Country Sales Head / HQ Admin Review RPC: Approves or Rejects Request
CREATE OR REPLACE FUNCTION public.review_non_visit_workday(
    p_request_id UUID,
    p_decision TEXT, -- 'approved' or 'rejected'
    p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role VARCHAR(32);
    v_actor_market VARCHAR(2);
    v_req RECORD;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    SELECT role, market_code INTO v_actor_role, v_actor_market FROM public.profiles WHERE id = v_actor_id;

    SELECT * INTO v_req FROM public.absence_requests WHERE id = p_request_id;
    IF v_req.id IS NULL THEN
        RAISE EXCEPTION 'Non-visit workday request not found';
    END IF;

    -- Verify Reviewer Authority (Only assigned Country Sales Head or HQ Admin)
    IF v_actor_role = 'hq_admin' THEN
        -- HQ Admin has global review authority
    ELSIF v_actor_role = 'country_sales_head' AND v_actor_market = v_req.market_code THEN
        -- Country Sales Head in matching territory
    ELSE
        RAISE EXCEPTION 'Unauthorized: Only the assigned Country Sales Head or HQ Admin can review non-visit workday requests';
    END IF;

    IF p_decision = 'approved' THEN
        -- 1. Update request status
        UPDATE public.absence_requests SET
            status = 'approved',
            reviewed_by = v_actor_id,
            reviewed_at = now(),
            rejection_reason = NULL
        WHERE id = p_request_id;

        -- 2. Populate approved_absences (Counts toward attendance, NEVER physical visits)
        INSERT INTO public.approved_absences (
            id, user_id, market_code, absence_date, category,
            counts_as_attendance, counts_as_visit_target, justification, approved_by, approved_at
        ) VALUES (
            extensions.uuid_generate_v4(), v_req.user_id, v_req.market_code, v_req.absence_date,
            v_req.category, true, false, v_req.justification, v_actor_id, now()
        )
        ON CONFLICT (user_id, absence_date) DO UPDATE SET
            category = EXCLUDED.category,
            counts_as_attendance = true,
            counts_as_visit_target = false,
            justification = EXCLUDED.justification,
            approved_by = v_actor_id,
            approved_at = now();

        -- 3. Immutable audit trail
        INSERT INTO public.approval_audit (
            entity_type, entity_id, actor_id, action, previous_state, new_state, mandatory_reason
        ) VALUES (
            'absence_request', p_request_id, v_actor_id, 'approve_non_visit_workday', 'pending', 'approved', coalesce(p_reason, 'Approved by Country Sales Head')
        );

    ELSIF p_decision = 'rejected' THEN
        IF p_reason IS NULL OR trim(p_reason) = '' THEN
            RAISE EXCEPTION 'A mandatory reason is required when rejecting a non-visit workday request';
        END IF;

        -- 1. Update request status
        UPDATE public.absence_requests SET
            status = 'rejected',
            reviewed_by = v_actor_id,
            reviewed_at = now(),
            rejection_reason = p_reason
        WHERE id = p_request_id;

        -- 2. Remove from approved_absences if previously present
        DELETE FROM public.approved_absences 
        WHERE user_id = v_req.user_id AND absence_date = v_req.absence_date;

        -- 3. Immutable audit trail
        INSERT INTO public.approval_audit (
            entity_type, entity_id, actor_id, action, previous_state, new_state, mandatory_reason
        ) VALUES (
            'absence_request', p_request_id, v_actor_id, 'reject_non_visit_workday', 'pending', 'rejected', p_reason
        );
    ELSE
        RAISE EXCEPTION 'Invalid decision: must be approved or rejected';
    END IF;
END;
$$;

-- Manager Direct Approved Leave Recording RPC (e.g. Annual, Sick, Compassionate Leave)
CREATE OR REPLACE FUNCTION public.record_approved_leave(
    p_user_id UUID,
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
    v_actor_id UUID := auth.uid();
    v_actor_role VARCHAR(32);
    v_actor_market VARCHAR(2);
    v_target_market VARCHAR(2);
    v_id UUID := extensions.uuid_generate_v4();
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    SELECT role, market_code INTO v_actor_role, v_actor_market FROM public.profiles WHERE id = v_actor_id;
    SELECT market_code INTO v_target_market FROM public.profiles WHERE id = p_user_id;

    IF v_target_market IS NULL THEN
        RAISE EXCEPTION 'Target user not found';
    END IF;

    -- Verify Reviewer Authority
    IF v_actor_role = 'hq_admin' THEN
        -- HQ Admin allowed
    ELSIF v_actor_role = 'country_sales_head' AND v_actor_market = v_target_market THEN
        -- Country Sales Head in matching territory
    ELSE
        RAISE EXCEPTION 'Unauthorized: Only Country Sales Head or HQ Admin can record approved leave';
    END IF;

    INSERT INTO public.approved_absences (
        id, user_id, market_code, absence_date, category,
        counts_as_attendance, counts_as_visit_target, justification, approved_by, approved_at
    ) VALUES (
        v_id, p_user_id, v_target_market, p_date, p_category::public.absence_category,
        true, false, p_justification, v_actor_id, now()
    )
    ON CONFLICT (user_id, absence_date) DO UPDATE SET
        category = EXCLUDED.category,
        counts_as_attendance = true,
        counts_as_visit_target = false,
        justification = EXCLUDED.justification,
        approved_by = v_actor_id,
        approved_at = now()
    RETURNING id INTO v_id;

    INSERT INTO public.approval_audit (
        entity_type, entity_id, actor_id, action, previous_state, new_state, mandatory_reason
    ) VALUES (
        'authorized_absence', v_id, v_actor_id, 'record_approved_leave', 'none', 'approved', p_justification
    );

    RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_non_visit_workday(DATE, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_non_visit_workday(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_approved_leave(UUID, DATE, TEXT, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. Five-Minute Clock Discrepancy Threshold & Historical Rule Versioning
-- -----------------------------------------------------------------------------
ALTER TABLE public.market_rules
    ADD COLUMN IF NOT EXISTS max_clock_drift_minutes INT NOT NULL DEFAULT 5;

-- Preserve historical v1.2.04 rules by closing their effective window
UPDATE public.market_rules
SET effective_to = now(), is_active = false
WHERE is_active = true AND effective_to IS NULL;

-- Insert active v1.2.05 canonical rule set with 5-minute clock drift
INSERT INTO public.market_rules (
    market_code, version_tag, geofence_radius_m, max_visit_gps_accuracy_m,
    max_pin_gps_accuracy_m, min_visit_duration_seconds, max_idle_gap_minutes,
    max_clock_drift_minutes, effective_from, effective_to, is_active
) VALUES
('NG', 'v1.2.05-canonical', 200.00, 100.00, 50.00, 300, 150, 5, now(), NULL, true),
('ZM', 'v1.2.05-canonical', 250.00, 100.00, 50.00, 300, 150, 5, now(), NULL, true),
('MW', 'v1.2.05-canonical', 300.00, 100.00, 50.00, 300, 150, 5, now(), NULL, true);

-- Update Event Ingestion to check against active rule's max_clock_drift_minutes
CREATE OR REPLACE FUNCTION public.ingest_activity_events(p_events JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_market_code VARCHAR(2);
    v_event JSONB;
    v_event_id UUID;
    v_event_type TEXT;
    v_seq BIGINT;
    v_dep_id UUID;
    v_client_ts TIMESTAMPTZ;
    v_payload JSONB;
    v_idempotency_key VARCHAR(128);
    v_device_id UUID;
    v_existing_event RECORD;
    v_device_active BOOLEAN;
    v_lat DOUBLE PRECISION;
    v_lng DOUBLE PRECISION;
    v_acc NUMERIC;
    v_rule RECORD;
    v_results JSONB[] := ARRAY[]::JSONB[];
    v_dist_m NUMERIC;
    v_visit_id UUID;
    v_branch_id UUID;
    v_open_visit RECORD;
    v_max_clock_drift INT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    SELECT market_code INTO v_market_code FROM public.profiles WHERE id = v_user_id;

    FOR v_event IN SELECT * FROM jsonb_array_elements(p_events)
    LOOP
        v_event_id := (v_event->>'id')::UUID;
        v_event_type := v_event->>'event_type';
        v_seq := (v_event->>'sequence_number')::BIGINT;
        v_dep_id := (v_event->>'dependency_event_id')::UUID;
        v_client_ts := (v_event->>'client_timestamp')::TIMESTAMPTZ;
        v_payload := v_event->'payload';
        v_idempotency_key := v_event->>'idempotency_key';

        v_lat := (v_payload->>'latitude')::DOUBLE PRECISION;
        v_lng := (v_payload->>'longitude')::DOUBLE PRECISION;
        v_acc := (v_payload->>'accuracy_m')::NUMERIC;

        v_device_id := coalesce(
            (v_event->>'device_id')::UUID,
            (v_payload->>'device_id')::UUID,
            (SELECT device_id FROM public.device_assignments WHERE salesperson_id = v_user_id AND is_current = true LIMIT 1)
        );

        -- 1. Idempotency Check & Conflicting Payload Detection
        SELECT * INTO v_existing_event 
        FROM public.activity_events 
        WHERE id = v_event_id OR idempotency_key = v_idempotency_key;

        IF v_existing_event.id IS NOT NULL THEN
            IF v_existing_event.id = v_event_id AND v_existing_event.idempotency_key <> v_idempotency_key THEN
                v_results := array_append(v_results, jsonb_build_object(
                    'event_id', v_event_id,
                    'status', 'rejected_conflict',
                    'message', 'Event UUID already exists with a different idempotency key or payload'
                ));
                CONTINUE;
            END IF;

            v_results := array_append(v_results, jsonb_build_object(
                'event_id', v_event_id,
                'status', 'accepted_duplicate',
                'message', 'Event already processed'
            ));
            CONTINUE;
        END IF;

        -- 2. Dependency Check (Missing Parent Event)
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

        -- 3. Device Custody Validation
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

        -- 4. Fetch Active Market Rule
        SELECT * INTO v_rule FROM public.market_rules 
        WHERE market_code = v_market_code AND is_active = true AND effective_to IS NULL
        LIMIT 1;

        v_max_clock_drift := coalesce(v_rule.max_clock_drift_minutes, 5);

        -- 5. Clock Discrepancy & GPS Integrity Checks
        -- Clock drift check (>5m future or >30d past) - raises operational review flag
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

        -- 6. Event Lifecycle Processing
        IF v_event_type = 'start_day' THEN
            INSERT INTO public.attendance_days (
                user_id, market_code, workday_date, start_day_time, start_lat, start_lng,
                start_accuracy_m, start_selfie_storage_path, device_id, status
            ) VALUES (
                v_user_id, v_market_code, (v_client_ts AT TIME ZONE 'UTC')::DATE, v_client_ts,
                v_lat, v_lng, v_acc, v_payload->>'selfie_storage_path', v_device_id, 'active'
            )
            ON CONFLICT (user_id, workday_date) DO NOTHING;

        ELSIF v_event_type = 'end_day' THEN
            UPDATE public.attendance_days SET
                end_day_time = v_client_ts,
                end_lat = v_lat,
                end_lng = v_lng,
                end_accuracy_m = v_acc,
                status = 'completed'
            WHERE user_id = v_user_id AND workday_date = (v_client_ts AT TIME ZONE 'UTC')::DATE;

        ELSIF v_event_type = 'check_in' THEN
            v_visit_id := coalesce((v_payload->>'visit_id')::UUID, v_event_id);
            v_branch_id := (v_payload->>'branch_id')::UUID;

            SELECT * INTO v_open_visit FROM public.visits WHERE salesperson_id = v_user_id AND status = 'in_progress';
            IF v_open_visit.id IS NOT NULL THEN
                INSERT INTO public.verification_flags (
                    visit_id, user_id, market_code, flag_code, severity, details, status
                ) VALUES (
                    v_open_visit.id, v_user_id, v_market_code, 'concurrent_visits', 'medium',
                    jsonb_build_object('open_visit_id', v_open_visit.id, 'attempted_visit_id', v_visit_id),
                    'open'
                );
            END IF;

            v_dist_m := (v_payload->>'distance_to_pin_m')::NUMERIC;
            IF v_dist_m IS NULL AND v_lat IS NOT NULL AND v_lng IS NOT NULL AND v_branch_id IS NOT NULL THEN
                SELECT public.calculate_distance_m(v_lat, v_lng, p.latitude, p.longitude) INTO v_dist_m
                FROM public.branch_location_pins p
                WHERE p.branch_id = v_branch_id AND p.is_active = true
                ORDER BY p.version_number DESC LIMIT 1;
            END IF;

            INSERT INTO public.visits (
                id, salesperson_id, branch_id, market_code, check_in_time,
                check_in_lat, check_in_lng, check_in_accuracy_m, check_in_distance_m,
                check_in_photo_storage_path, verification_status, status
            ) VALUES (
                v_visit_id, v_user_id, v_branch_id, v_market_code, v_client_ts,
                v_lat, v_lng, v_acc, v_dist_m,
                v_payload->>'premises_photo_storage_path',
                CASE 
                    WHEN (v_dist_m IS NOT NULL AND v_dist_m <= v_rule.geofence_radius_m) 
                         AND (v_acc IS NOT NULL AND v_acc <= v_rule.max_visit_gps_accuracy_m)
                         AND (v_payload->>'premises_photo_storage_path' IS NOT NULL)
                    THEN 'location_verified'::public.visit_verification_status
                    ELSE 'location_unverified'::public.visit_verification_status
                END,
                'in_progress'
            )
            ON CONFLICT (id) DO NOTHING;

        ELSIF v_event_type = 'check_out' THEN
            v_visit_id := (v_payload->>'visit_id')::UUID;
            v_dist_m := (v_payload->>'distance_to_pin_m')::NUMERIC;

            UPDATE public.visits SET
                check_out_time = v_client_ts,
                check_out_lat = v_lat,
                check_out_lng = v_lng,
                check_out_accuracy_m = v_acc,
                check_out_distance_m = v_dist_m,
                status = 'completed'
            WHERE id = v_visit_id AND salesperson_id = v_user_id;

            IF v_dist_m IS NOT NULL AND v_dist_m > v_rule.geofence_radius_m THEN
                INSERT INTO public.verification_flags (
                    visit_id, user_id, market_code, flag_code, severity, details, status
                ) VALUES (
                    v_visit_id, v_user_id, v_market_code, 'checkout_beyond_geofence', 'medium',
                    jsonb_build_object('checkout_dist_m', v_dist_m, 'geofence_radius_m', v_rule.geofence_radius_m),
                    'open'
                );
            END IF;

        ELSIF v_event_type = 'meeting_log' THEN
            v_visit_id := (v_payload->>'visit_id')::UUID;

            INSERT INTO public.meeting_logs (
                visit_id, contact_person_met, contact_role, purpose,
                products_discussed, outcome_summary, next_steps, notes,
                business_card_storage_path
            ) VALUES (
                v_visit_id,
                v_payload->>'contact_person_met',
                v_payload->>'contact_role',
                coalesce((v_payload->>'purpose')::public.meeting_purpose, 'routine_courtesy'),
                array[]::text[],
                v_payload->>'outcome_summary',
                v_payload->>'next_steps',
                v_payload->>'notes',
                v_payload->>'business_card_storage_path'
            )
            ON CONFLICT (visit_id) DO NOTHING;
        END IF;

        -- 7. Record Ingested Event in Journal
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

-- -----------------------------------------------------------------------------
-- 5. Storage Isolation: Cross-Market & Cross-User Download Protection
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.storage_owner_market(p_path TEXT)
RETURNS VARCHAR(2)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_owner_str TEXT;
    v_owner_id UUID;
    v_market VARCHAR(2);
BEGIN
    v_owner_str := (storage.foldername(p_path))[1];
    IF v_owner_str IS NULL THEN
        RETURN NULL;
    END IF;
    BEGIN
        v_owner_id := v_owner_str::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;
    SELECT market_code INTO v_market FROM public.profiles WHERE id = v_owner_id;
    RETURN v_market;
END;
$$;

GRANT EXECUTE ON FUNCTION public.storage_owner_market(TEXT) TO authenticated;

-- Attendance Selfies SELECT: Rep own files, CSH strictly within own market, HQ global
DROP POLICY IF EXISTS "attendance_selfies_select" ON storage.objects;
CREATE POLICY "attendance_selfies_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'attendance-selfies'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_hq()
            OR (
                public.auth_role() = 'country_sales_head' 
                AND public.storage_owner_market(name) = public.auth_market()
            )
        )
    );

-- Premises Photos SELECT: Rep own files, CSH strictly within own market, HQ global
DROP POLICY IF EXISTS "premises_photos_select" ON storage.objects;
CREATE POLICY "premises_photos_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'visit-premises-photos'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_hq()
            OR (
                public.auth_role() = 'country_sales_head' 
                AND public.storage_owner_market(name) = public.auth_market()
            )
        )
    );

-- Business Cards SELECT: Rep own files, CSH strictly within own market, HQ global
DROP POLICY IF EXISTS "business_cards_select" ON storage.objects;
CREATE POLICY "business_cards_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'business-cards'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_hq()
            OR (
                public.auth_role() = 'country_sales_head' 
                AND public.storage_owner_market(name) = public.auth_market()
            )
        )
    );

-- Exception Evidence SELECT: Rep own files, CSH strictly within own market, HQ global
DROP POLICY IF EXISTS "exception_evidence_select" ON storage.objects;
CREATE POLICY "exception_evidence_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'exception-evidence'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_hq()
            OR (
                public.auth_role() = 'country_sales_head' 
                AND public.storage_owner_market(name) = public.auth_market()
            )
        )
    );

-- Device Issue Photos SELECT: Rep own files, CSH strictly within own market, HQ global
DROP POLICY IF EXISTS "device_issue_select" ON storage.objects;
CREATE POLICY "device_issue_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'device-issue-photos'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_hq()
            OR (
                public.auth_role() = 'country_sales_head' 
                AND public.storage_owner_market(name) = public.auth_market()
            )
        )
    );
