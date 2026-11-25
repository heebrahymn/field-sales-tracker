-- =============================================================================
-- Migration 21: Fix Client Audit Enums, Table Columns, and Dispute Workflow
-- =============================================================================

CREATE OR REPLACE FUNCTION public.record_client_audit_call(
    p_audit_record_id UUID,
    p_call_result TEXT, -- 'reached_confirmed', 'reached_denied', 'no_answer', 'busy', 'disconnected'
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

    -- Insert attempt log with correct column names (auditor_id, call_notes)
    INSERT INTO public.client_audit_attempts (
        audit_record_id, attempt_number, dialed_at, call_result, call_notes, auditor_id
    ) VALUES (
        p_audit_record_id, v_next_attempt, now(), v_call_status, p_notes, v_actor_id
    );

    -- Update audit record status according to outcome
    IF p_call_result = 'reached_confirmed' THEN
        UPDATE public.client_audit_records
        SET call_status = 'connected', meeting_confirmed = true,
            audit_outcome = 'confirmed_valid', dispute_status = 'none',
            resolved_by = v_actor_id, resolved_at = now()
        WHERE id = p_audit_record_id;

    ELSIF p_call_result = 'reached_denied' THEN
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

-- 2. Resolve Client Audit Dispute with Canonical Enums
CREATE OR REPLACE FUNCTION public.resolve_client_audit_dispute(
    p_audit_record_id UUID,
    p_decision TEXT, -- 'rep_substantiated', 'confirmed_violation'
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

    -- Also close or update the audit dispute flag on the visit if cleared
    IF p_decision = 'rep_substantiated' THEN
        UPDATE public.verification_flags
        SET status = 'cleared_acceptable',
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
