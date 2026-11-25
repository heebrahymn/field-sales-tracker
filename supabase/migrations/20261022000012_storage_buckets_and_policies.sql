-- =============================================================================
-- Migration 00012: Private Storage Buckets & Path-Based RLS Policies
-- Carbon Field Sales Tracker (Evidence Integrity & Short-Lived Signed URLs)
-- =============================================================================

-- Create private storage buckets if they do not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('attendance-selfies', 'attendance-selfies', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('visit-premises-photos', 'visit-premises-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('business-cards', 'business-cards', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('exception-evidence', 'exception-evidence', false, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('device-issue-photos', 'device-issue-photos', false, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('client-master-imports', 'client-master-imports', false, 52428800, ARRAY['text/csv', 'application/vnd.ms-excel']),
    ('export-reports', 'export-reports', false, 52428800, ARRAY['text/csv'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: Attendance Selfies (Upload own, View own/market)
CREATE POLICY "attendance_selfies_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'attendance-selfies');

CREATE POLICY "attendance_selfies_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'attendance-selfies');

-- Storage RLS: Visit Premises Photos (Upload own, View own/market)
CREATE POLICY "premises_photos_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'visit-premises-photos');

CREATE POLICY "premises_photos_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'visit-premises-photos');

-- Storage RLS: Business Cards
CREATE POLICY "business_cards_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'business-cards');

CREATE POLICY "business_cards_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'business-cards');

-- Storage RLS: Exception Evidence
CREATE POLICY "exception_evidence_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'exception-evidence');

CREATE POLICY "exception_evidence_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'exception-evidence');

-- Storage RLS: Device Issue Photos
CREATE POLICY "device_issue_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'device-issue-photos');

CREATE POLICY "device_issue_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'device-issue-photos');

-- Storage RLS: Imports & Exports (HQ Admin & authorized roles)
CREATE POLICY "imports_select_hq" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'client-master-imports' AND public.is_hq());

CREATE POLICY "exports_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'export-reports');
