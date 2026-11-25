-- =============================================================================
-- Migration 00019: Audit Dispute Flag Enum, Exception Retro Visit & Storage Helper
-- Carbon Field Sales Tracker (Nigeria, Zambia, Malawi)
-- =============================================================================

SET search_path = public, extensions, auth;

-- 1. Add audit_dispute to flag_code enum if not already present
ALTER TYPE public.flag_code ADD VALUE IF NOT EXISTS 'audit_dispute';

-- 2. Storage Bucket Privacy Inspection RPC (accessible to authenticated users)
CREATE OR REPLACE FUNCTION public.check_bucket_privacy()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = storage, public
AS $$
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'name', name,
            'public', public,
            'file_size_limit', file_size_limit
        )
    )
    FROM storage.buckets;
$$;

GRANT EXECUTE ON FUNCTION public.check_bucket_privacy() TO authenticated;

-- 3. Update review_salesperson_exception to guarantee visit creation with manager_approved_unverified
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

            SELECT market_code INTO v_user_market FROM public.profiles WHERE id = v_exc.user_id;
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
