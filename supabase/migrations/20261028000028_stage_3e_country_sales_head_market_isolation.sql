-- ============================================================================
-- Migration 00028: Stage 3E Country Sales Head Market Isolation & Security
-- Enforces strict market scoping on all CSH administrative RPCs:
-- - approve_branch_location_pin
-- - reject_branch_location_pin
-- - review_branch_location_pin
-- - review_salesperson_exception
-- - record_client_audit_call
-- - resolve_client_audit_dispute
-- ============================================================================

-- 1. approve_branch_location_pin
CREATE OR REPLACE FUNCTION public.approve_branch_location_pin(p_pin_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_branch_id UUID;
    v_branch_market VARCHAR(2);
    v_actor_id UUID := auth.uid();
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    IF NOT (public.is_hq() OR public.auth_role() = 'country_sales_head') THEN
        RAISE EXCEPTION 'Unauthorized to approve branch location pins';
    END IF;

    SELECT p.branch_id, b.market_code INTO v_branch_id, v_branch_market
    FROM public.branch_location_pins p
    JOIN public.branches b ON b.id = p.branch_id
    WHERE p.id = p_pin_id;

    IF v_branch_id IS NULL THEN
        RAISE EXCEPTION 'Pin % not found', p_pin_id;
    END IF;

    IF NOT public.is_hq() AND v_branch_market <> public.auth_market() THEN
        RAISE EXCEPTION 'Unauthorized: Country Sales Head cannot approve branch pins outside assigned market (%)', public.auth_market();
    END IF;

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
    VALUES ('branch_pin', p_pin_id, v_actor_id, 'approve', 'proposed', 'approved', p_reason);
END;
$$;

-- 2. reject_branch_location_pin
CREATE OR REPLACE FUNCTION public.reject_branch_location_pin(p_pin_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_branch_id UUID;
    v_branch_market VARCHAR(2);
    v_actor_id UUID := auth.uid();
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    IF NOT (public.is_hq() OR public.auth_role() = 'country_sales_head') THEN
        RAISE EXCEPTION 'Unauthorized to reject branch location pins';
    END IF;

    SELECT p.branch_id, b.market_code INTO v_branch_id, v_branch_market
    FROM public.branch_location_pins p
    JOIN public.branches b ON b.id = p.branch_id
    WHERE p.id = p_pin_id;

    IF v_branch_id IS NULL THEN
        RAISE EXCEPTION 'Pin % not found', p_pin_id;
    END IF;

    IF NOT public.is_hq() AND v_branch_market <> public.auth_market() THEN
        RAISE EXCEPTION 'Unauthorized: Country Sales Head cannot reject branch pins outside assigned market (%)', public.auth_market();
    END IF;

    UPDATE public.branch_location_pins 
    SET is_active = false, status = 'rejected', reviewed_by = v_actor_id, reviewed_at = now(), decision_reason = p_reason
    WHERE id = p_pin_id;

    UPDATE public.branches SET operating_status = 'rejected', updated_at = now() WHERE id = v_branch_id;

    INSERT INTO public.approval_audit (entity_type, entity_id, actor_id, action, previous_state, new_state, mandatory_reason)
    VALUES ('branch_pin', p_pin_id, v_actor_id, 'reject', 'pending_approval', 'rejected', p_reason);
END;
$$;

-- 3. review_branch_location_pin
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
    v_branch_market VARCHAR(2);
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    IF NOT (public.is_hq() OR public.auth_role() = 'country_sales_head') THEN
        RAISE EXCEPTION 'Only Country Sales Heads or HQ can review location pins';
    END IF;

    SELECT p.*, b.market_code INTO v_pin
    FROM public.branch_location_pins p
    JOIN public.branches b ON b.id = p.branch_id
    WHERE p.id = p_pin_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pin % not found', p_pin_id;
    END IF;

    IF NOT public.is_hq() AND v_pin.market_code <> public.auth_market() THEN
        RAISE EXCEPTION 'Unauthorized: Country Sales Head cannot review branch pins outside assigned market (%)', public.auth_market();
    END IF;

    IF p_action = 'approve' THEN
        UPDATE public.branch_location_pins
        SET is_active = false
        WHERE branch_id = v_pin.branch_id AND id <> p_pin_id;

        UPDATE public.branch_location_pins
        SET status = 'approved', reviewed_by = v_actor_id, reviewed_at = now(), is_active = true, decision_reason = p_review_notes
        WHERE id = p_pin_id;

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
        SET status = 'rejected', reviewed_by = v_actor_id, reviewed_at = now(), is_active = false, decision_reason = p_review_notes
        WHERE id = p_pin_id;

        INSERT INTO public.approval_audit (
            entity_type, entity_id, actor_id, action, previous_state, new_state, mandatory_reason
        ) VALUES (
            'branch_pin', p_pin_id, v_actor_id, 'reject_pin', v_pin.status::text, 'rejected', p_review_notes
        );
    END IF;
END;
$$;

-- 4. review_salesperson_exception
CREATE OR REPLACE FUNCTION public.review_salesperson_exception(
    p_exception_id UUID,
    p_status public.exception_review_status,
    p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_exc RECORD;
    v_visit_id UUID := NULL;
    v_att_id UUID := NULL;
    v_dev_id UUID;
    v_user_market VARCHAR(2);
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    IF NOT (public.is_hq() OR public.auth_role() = 'country_sales_head') THEN
        RAISE EXCEPTION 'Only Country Sales Heads or HQ Administrators can review exceptions';
    END IF;

    SELECT * INTO v_exc FROM public.exceptions WHERE id = p_exception_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Exception % not found', p_exception_id;
    END IF;

    SELECT market_code INTO v_user_market FROM public.profiles WHERE id = v_exc.user_id;

    IF NOT public.is_hq() AND v_user_market <> public.auth_market() THEN
        RAISE EXCEPTION 'Unauthorized: Country Sales Head cannot review exceptions outside assigned market (%)', public.auth_market();
    END IF;

    IF p_status = 'approved' THEN
        -- If missed visit or GPS failure exception is approved, create visit as 'manager_approved_unverified'
        -- Strict PRD §2 rule: NEVER promote to location_verified!
        IF v_exc.branch_id IS NOT NULL THEN
            -- Resolve attendance_day_id
            v_att_id := v_exc.attendance_day_id;
            IF v_att_id IS NULL THEN
                SELECT id INTO v_att_id FROM public.attendance_days 
                WHERE user_id = v_exc.user_id AND work_date = v_exc.claimed_visit_time::DATE;
            END IF;

            SELECT device_id INTO v_dev_id FROM public.device_assignments 
            WHERE salesperson_id = v_exc.user_id AND is_current = true LIMIT 1;

            IF v_att_id IS NULL THEN
                INSERT INTO public.attendance_days (
                    user_id, device_id, market_code, work_date, started_at,
                    start_latitude, start_longitude, start_accuracy_m, start_selfie_url
                ) VALUES (
                    v_exc.user_id, coalesce(v_dev_id, 'd1111111-1111-4111-b111-111111111111'::UUID),
                    coalesce(v_user_market, 'NG'), v_exc.claimed_visit_time::DATE, v_exc.claimed_visit_time,
                    0.0, 0.0, 50.0, '/demo/retro-attendance.jpg'
                ) RETURNING id INTO v_att_id;
            END IF;

            INSERT INTO public.visits (
                attendance_day_id, user_id, device_id, branch_id, kind,
                check_in_at, check_out_at, check_in_latitude, check_in_longitude, check_in_accuracy_m,
                distance_to_pin_m, location_classification, verification_status, server_received_at
            ) VALUES (
                v_att_id, v_exc.user_id, 
                coalesce(v_dev_id, 'd1111111-1111-4111-b111-111111111111'::UUID),
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

-- 5. record_client_audit_call (single arity)
CREATE OR REPLACE FUNCTION public.record_client_audit_call(p_audit_record_id uuid, p_call_result text, p_notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_rec RECORD;
    v_next_attempt INT;
    v_call_status public.audit_call_status;
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

    IF NOT public.is_hq() AND v_rec.market_code <> public.auth_market() THEN
        RAISE EXCEPTION 'Unauthorized: Country Sales Head cannot record audit calls outside assigned market (%)', public.auth_market();
    END IF;

    -- Calculate next attempt number
    SELECT coalesce(max(attempt_number), 0) + 1 INTO v_next_attempt
    FROM public.client_audit_attempts WHERE audit_record_id = p_audit_record_id;

    -- Determine call_status enum value
    IF p_call_result IN ('reached_confirmed', 'reached_denied', 'connected') THEN
        v_call_status := 'connected';
    ELSIF p_call_result IN ('no_answer', 'busy', 'disconnected') THEN
        v_call_status := p_call_result::public.audit_call_status;
    ELSE
        v_call_status := 'disconnected';
    END IF;

    INSERT INTO public.client_audit_attempts (
        audit_record_id, attempt_number, dialed_at, call_result, call_notes, auditor_id
    ) VALUES (
        p_audit_record_id, v_next_attempt, now(), v_call_status, p_notes, v_actor_id
    );

    IF p_call_result = 'reached_confirmed' THEN
        UPDATE public.client_audit_records
        SET call_status = 'connected', meeting_confirmed = true,
            audit_outcome = 'confirmed_valid', dispute_status = 'none',
            resolved_by = v_actor_id, resolved_at = now()
        WHERE id = p_audit_record_id;

    ELSIF p_call_result = 'reached_denied' THEN
        UPDATE public.client_audit_records
        SET call_status = 'connected', meeting_confirmed = false,
            audit_outcome = 'disputed_denied', dispute_status = 'under_investigation',
            dispute_notes = p_notes
        WHERE id = p_audit_record_id;

        INSERT INTO public.verification_flags (
            visit_id, user_id, market_code, flag_code, severity, details, status
        ) VALUES (
            v_rec.visit_id, (SELECT user_id FROM public.visits WHERE id = v_rec.visit_id),
            v_rec.market_code, 'audit_dispute', 'critical',
            jsonb_build_object('reason', 'Client denied salesperson meeting during audit call', 'notes', p_notes),
            'open'
        );

    ELSIF p_call_result IN ('no_answer', 'busy') THEN
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

-- 6. record_client_audit_call (multi arity)
CREATE OR REPLACE FUNCTION public.record_client_audit_call(
    p_audit_record_id uuid,
    p_call_result text DEFAULT NULL::text,
    p_notes text DEFAULT NULL::text,
    p_outcome text DEFAULT NULL::text,
    p_contact_person text DEFAULT NULL::text,
    p_telephone text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
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

    IF NOT public.is_hq() AND v_rec.market_code <> public.auth_market() THEN
        RAISE EXCEPTION 'Unauthorized: Country Sales Head cannot record audit calls outside assigned market (%)', public.auth_market();
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

    INSERT INTO public.client_audit_attempts (
        audit_record_id, attempt_number, dialed_at, call_result, call_notes, auditor_id
    ) VALUES (
        p_audit_record_id, v_next_attempt, now(), v_call_status, p_notes, v_actor_id
    );

    IF v_res = 'reached_confirmed' THEN
        UPDATE public.client_audit_records
        SET call_status = 'connected', meeting_confirmed = true,
            audit_outcome = 'confirmed_valid', dispute_status = 'none',
            resolved_by = v_actor_id, resolved_at = now()
        WHERE id = p_audit_record_id;

    ELSIF v_res = 'reached_denied' THEN
        UPDATE public.client_audit_records
        SET call_status = 'connected', meeting_confirmed = false,
            audit_outcome = 'disputed_denied', dispute_status = 'under_investigation',
            dispute_notes = p_notes
        WHERE id = p_audit_record_id;

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

-- 7. resolve_client_audit_dispute
CREATE OR REPLACE FUNCTION public.resolve_client_audit_dispute(
    p_audit_record_id uuid,
    p_decision text,
    p_mandatory_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_rec RECORD;
    v_new_dispute_status public.dispute_resolution_status;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    IF NOT (public.is_hq() OR public.auth_role() = 'country_sales_head') THEN
        RAISE EXCEPTION 'Only Country Sales Heads or HQ can resolve audit disputes';
    END IF;

    SELECT * INTO v_rec FROM public.client_audit_records WHERE id = p_audit_record_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Audit record % not found', p_audit_record_id;
    END IF;

    IF NOT public.is_hq() AND v_rec.market_code <> public.auth_market() THEN
        RAISE EXCEPTION 'Unauthorized: Country Sales Head cannot resolve audit disputes outside assigned market (%)', public.auth_market();
    END IF;

    IF p_decision = 'rep_substantiated' THEN
        v_new_dispute_status := 'resolved_cleared';
    ELSIF p_decision = 'confirmed_violation' THEN
        v_new_dispute_status := 'resolved_violation';
    ELSE
        v_new_dispute_status := 'under_investigation';
    END IF;

    UPDATE public.client_audit_records
    SET dispute_status = v_new_dispute_status,
        dispute_notes = p_mandatory_reason,
        resolved_by = v_actor_id,
        resolved_at = now()
    WHERE id = p_audit_record_id;

    IF p_decision = 'rep_substantiated' THEN
        UPDATE public.verification_flags
        SET status = 'cleared',
            reviewer_notes = p_mandatory_reason,
            reviewed_by = v_actor_id,
            reviewed_at = now()
        WHERE visit_id = v_rec.visit_id AND flag_code = 'audit_dispute';
    ELSIF p_decision = 'confirmed_violation' THEN
        UPDATE public.verification_flags
        SET status = 'confirmed_violation',
            reviewer_notes = p_mandatory_reason,
            reviewed_by = v_actor_id,
            reviewed_at = now()
        WHERE visit_id = v_rec.visit_id AND flag_code = 'audit_dispute';
    END IF;

    INSERT INTO public.approval_audit (
        entity_type, entity_id, actor_id, action, previous_state, new_state, mandatory_reason
    ) VALUES (
        'client_audit_dispute', p_audit_record_id, v_actor_id, 'resolve_dispute',
        v_rec.dispute_status::text, v_new_dispute_status::text, p_mandatory_reason
    );
END;
$$;

-- 8. Allow HQ Admins and Country Sales Heads to insert branches for ERP Client Master Ingestion
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'branches' AND policyname = 'branches_insert_managers'
    ) THEN
        CREATE POLICY "branches_insert_managers" ON public.branches
            FOR INSERT TO authenticated WITH CHECK (
                public.is_hq() OR (public.auth_role() = 'country_sales_head' AND market_code = public.auth_market())
            );
    END IF;
END $$;
