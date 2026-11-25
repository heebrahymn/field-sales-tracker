-- =============================================================================
-- Migration 00017: Cast replacement history status to replacement_request_status
-- Carbon Field Sales Tracker (Nigeria, Zambia, Malawi)
-- =============================================================================

SET search_path = public, extensions, auth;

CREATE OR REPLACE FUNCTION public.review_device_replacement(
    p_replacement_id UUID,
    p_action TEXT,
    p_admin_notes TEXT,
    p_replacement_device_id UUID DEFAULT NULL,
    p_waybill_number TEXT DEFAULT NULL,
    p_courier_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_req RECORD;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    IF NOT public.is_hq() THEN
        RAISE EXCEPTION 'Zero Bottleneck Violation: Only HQ Administrators can review or approve device replacements';
    END IF;

    SELECT * INTO v_req FROM public.device_replacement_requests WHERE id = p_replacement_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Replacement request % not found', p_replacement_id;
    END IF;

    IF p_action = 'approve' THEN
        UPDATE public.device_replacement_requests
        SET status = 'approved', approval_reason = p_admin_notes, updated_at = now()
        WHERE id = p_replacement_id;

        INSERT INTO public.device_replacement_history (request_id, actor_id, action, previous_status, new_status, notes)
        VALUES (p_replacement_id, v_actor_id, 'Approve Request', v_req.status, 'approved'::public.replacement_request_status, p_admin_notes);

    ELSIF p_action = 'dispatch' THEN
        IF p_replacement_device_id IS NOT NULL THEN
            UPDATE public.device_replacement_requests
            SET replacement_device_id = p_replacement_device_id,
                status = 'dispatched',
                courier_tracking_ref = p_waybill_number,
                dispatch_notes = coalesce(p_admin_notes, '') || ' (' || coalesce(p_courier_name, '') || ')',
                updated_at = now()
            WHERE id = p_replacement_id;

            UPDATE public.devices
            SET inventory_status = 'assigned', updated_at = now()
            WHERE id = p_replacement_device_id;
        ELSE
            UPDATE public.device_replacement_requests
            SET status = 'dispatched',
                courier_tracking_ref = p_waybill_number,
                dispatch_notes = p_admin_notes,
                updated_at = now()
            WHERE id = p_replacement_id;
        END IF;

        INSERT INTO public.device_replacement_history (request_id, actor_id, action, previous_status, new_status, notes)
        VALUES (p_replacement_id, v_actor_id, 'Dispatch Replacement', v_req.status, 'dispatched'::public.replacement_request_status, p_admin_notes);

    ELSIF p_action = 'confirm_activation' THEN
        -- 1. Deactivate old device assignment
        UPDATE public.device_assignments
        SET is_current = false, returned_at = now()
        WHERE device_id = v_req.company_device_id AND salesperson_id = v_req.salesperson_id AND is_current = true;

        -- 2. Mark old device under_maintenance with revoked authorization
        UPDATE public.devices
        SET inventory_status = 'under_maintenance', security_authorization = 'revoked', updated_at = now()
        WHERE id = v_req.company_device_id;

        -- 3. If replacement device is allocated, activate custody
        IF v_req.replacement_device_id IS NOT NULL THEN
            INSERT INTO public.device_assignments (device_id, salesperson_id, assigned_at, assigned_by, handover_reason, is_current)
            VALUES (v_req.replacement_device_id, v_req.salesperson_id, now(), v_actor_id, 'Activated replacement device following hardware defect', true);

            UPDATE public.devices
            SET inventory_status = 'active', security_authorization = 'authorized', updated_at = now()
            WHERE id = v_req.replacement_device_id;
        END IF;

        UPDATE public.device_replacement_requests
        SET status = 'completed', activation_confirmed_at = now(), updated_at = now()
        WHERE id = p_replacement_id;

        INSERT INTO public.device_replacement_history (request_id, actor_id, action, previous_status, new_status, notes)
        VALUES (p_replacement_id, v_actor_id, 'Confirm Activation in MDM', v_req.status, 'completed'::public.replacement_request_status, p_admin_notes);

    ELSIF p_action = 'reject' THEN
        UPDATE public.device_replacement_requests
        SET status = 'rejected', rejection_reason = p_admin_notes, updated_at = now()
        WHERE id = p_replacement_id;

        INSERT INTO public.device_replacement_history (request_id, actor_id, action, previous_status, new_status, notes)
        VALUES (p_replacement_id, v_actor_id, 'Reject Request', v_req.status, 'rejected'::public.replacement_request_status, p_admin_notes);
    ELSE
        RAISE EXCEPTION 'Unknown action %', p_action;
    END IF;
END;
$$;
