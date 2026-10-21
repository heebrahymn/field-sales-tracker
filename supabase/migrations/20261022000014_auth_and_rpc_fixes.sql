-- =============================================================================
-- Migration 00014: Auth Identities, Public Market Access & Spatial RPC Helpers
-- Carbon Field Sales Tracker (Nigeria, Zambia, Malawi)
-- =============================================================================

SET search_path = public, extensions, auth;

-- 1. Fix auth.users string columns to empty string '' (GoTrue requirement)
UPDATE auth.users
SET 
    confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change = coalesce(email_change, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone_change_token = coalesce(phone_change_token, ''),
    reauthentication_token = coalesce(reauthentication_token, ''),
    is_sso_user = false
WHERE email LIKE '%@carboncarcare.com';

-- 2. Populate auth.identities so GoTrue password login succeeds
INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT
    extensions.uuid_generate_v4(),
    u.id,
    u.id::text,
    format('{"sub":"%s","email":"%s"}', u.id::text, u.email)::jsonb,
    'email',
    now(),
    now(),
    now()
FROM auth.users u
WHERE u.email LIKE '%@carboncarcare.com'
  AND NOT EXISTS (
      SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
  );

-- 3. Allow anonymous and authenticated users to read markets and active rules for client config
CREATE POLICY "markets_read_public" ON public.markets
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "markets_read_all" ON public.markets;

-- 4. PostGIS Geofence Spatial Calculation RPC Function
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

    -- Calculate ellipsoidal distance in meters using PostGIS geography
    v_distance := extensions.ST_Distance(
        extensions.ST_SetSRID(extensions.ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography,
        v_pin.geom::geography
    );

    -- Strict PRD §4.1 Confidence Model
    IF v_distance + p_gps_accuracy_m <= p_geofence_radius_m THEN
        RETURN 'inside_confident';
    ELSIF v_distance - p_gps_accuracy_m > p_geofence_radius_m THEN
        RETURN 'outside_confident';
    ELSE
        RETURN 'uncertain';
    END IF;
END;
$$;

-- Grant execution to authenticated and anon
GRANT EXECUTE ON FUNCTION public.check_geofence_status(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO authenticated, anon;

-- 5. Unified Direct Salesperson -> HQ Admin Device Replacement RPCs
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
        failure_type, failure_description, incident_timestamp, incident_location,
        status, created_at, updated_at
    ) VALUES (
        v_request_id, v_user_id, coalesce(v_user_market, 'NG'), v_assigned_device,
        p_failure_type::public.device_failure_type, p_failure_description, p_incident_timestamp, p_incident_location,
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

GRANT EXECUTE ON FUNCTION public.request_device_replacement(UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT) TO authenticated;

-- Unified Review Device Replacement RPC (Strict HQ-Only)
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
        VALUES (p_replacement_id, v_actor_id, 'Approve Request', v_req.status::text, 'approved', p_admin_notes);

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
        VALUES (p_replacement_id, v_actor_id, 'Dispatch Replacement', v_req.status::text, 'dispatched', p_admin_notes);

    ELSIF p_action = 'confirm_activation' THEN
        -- 1. Deactivate old device assignment
        UPDATE public.device_assignments
        SET is_current = false, returned_at = now()
        WHERE device_id = v_req.company_device_id AND salesperson_id = v_req.salesperson_id AND is_current = true;

        -- 2. Mark old device damaged
        UPDATE public.devices
        SET inventory_status = 'damaged', security_authorization = 'revoked', updated_at = now()
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
        VALUES (p_replacement_id, v_actor_id, 'Confirm Activation in MDM', v_req.status::text, 'completed', p_admin_notes);

    ELSIF p_action = 'reject' THEN
        UPDATE public.device_replacement_requests
        SET status = 'rejected', rejection_reason = p_admin_notes, updated_at = now()
        WHERE id = p_replacement_id;

        INSERT INTO public.device_replacement_history (request_id, actor_id, action, previous_status, new_status, notes)
        VALUES (p_replacement_id, v_actor_id, 'Reject Request', v_req.status::text, 'rejected', p_admin_notes);
    ELSE
        RAISE EXCEPTION 'Unknown action %', p_action;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_device_replacement(UUID, TEXT, TEXT, UUID, TEXT, TEXT) TO authenticated;
