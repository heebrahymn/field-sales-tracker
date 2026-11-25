-- =============================================================================
-- Migration 22: Fix flag_status in resolve_client_audit_dispute & Absence Upsert
-- =============================================================================

-- 1. Fix Absence Request Upsert (no updated_at column)
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
    )
    ON CONFLICT (user_id, absence_date) DO UPDATE SET
        category = EXCLUDED.category,
        justification = EXCLUDED.justification,
        counts_as_attendance = true,
        counts_as_visit_target = false,
        approved_at = now()
    RETURNING id INTO v_id;

    INSERT INTO public.approval_audit (
        entity_type, entity_id, actor_id, action, previous_state, new_state, mandatory_reason
    ) VALUES (
        'authorized_absence', v_id, v_user_id, 'request_non_visit_day', 'pending', 'requested', p_justification
    );

    RETURN v_id;
END;
$$;

-- 2. Fix resolve_client_audit_dispute to use valid flag_status ('cleared')
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

    -- Update the verification flag using canonical flag_status enum ('cleared' / 'confirmed_violation')
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

-- 3. Restore and ensure Tunde's current device assignment is active
DELETE FROM public.device_assignments
WHERE salesperson_id = '11111111-1111-4111-a111-111111111111'
   OR device_id = 'd1111111-1111-4111-b111-111111111111';

INSERT INTO public.device_assignments (device_id, salesperson_id, assigned_by, handover_reason, is_current)
VALUES ('d1111111-1111-4111-b111-111111111111', '11111111-1111-4111-a111-111111111111', '33333333-3333-4333-a333-333333333333', 'Active primary company phone', true);
