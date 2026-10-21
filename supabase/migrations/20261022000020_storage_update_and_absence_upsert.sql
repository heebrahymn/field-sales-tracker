-- =============================================================================
-- Migration 20: Storage UPDATE Policies and Absence Upsert Idempotency
-- =============================================================================

-- 1. Storage UPDATE Policies for Authenticated Path-Based Upserts
DROP POLICY IF EXISTS "attendance_selfies_update" ON storage.objects;
CREATE POLICY "attendance_selfies_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'attendance-selfies'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'attendance-selfies'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "premises_photos_update" ON storage.objects;
CREATE POLICY "premises_photos_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'visit-premises-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'visit-premises-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "business_cards_update" ON storage.objects;
CREATE POLICY "business_cards_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'business-cards'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'business-cards'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "exception_evidence_update" ON storage.objects;
CREATE POLICY "exception_evidence_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'exception-evidence'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'exception-evidence'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "device_issue_update" ON storage.objects;
CREATE POLICY "device_issue_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'device-issue-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'device-issue-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 2. Idempotent Non-Visit Workday Request
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
        updated_at = now()
    RETURNING id INTO v_id;

    INSERT INTO public.approval_audit (
        entity_type, entity_id, actor_id, action, previous_state, new_state, mandatory_reason
    ) VALUES (
        'authorized_absence', v_id, v_user_id, 'request_non_visit_day', 'pending', 'requested', p_justification
    );

    RETURN v_id;
END;
$$;
