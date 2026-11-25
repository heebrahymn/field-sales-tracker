-- =============================================================================
-- Migration 00010: Row-Level Security (RLS) Policies & Helper Functions
-- Carbon Field Sales Tracker (Nigeria, Zambia, Malawi)
-- =============================================================================

-- 1. Security Helper Functions (STABLE, fixed search_path = public)
CREATE OR REPLACE FUNCTION public.auth_uid()
RETURNS UUID LANGUAGE sql STABLE PARALLEL SAFE
SET search_path = public AS $$
    SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS public.app_role LANGUAGE sql STABLE PARALLEL SAFE
SET search_path = public AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.auth_market()
RETURNS VARCHAR(2) LANGUAGE sql STABLE PARALLEL SAFE
SET search_path = public AS $$
    SELECT market_code FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_hq()
RETURNS BOOLEAN LANGUAGE sql STABLE PARALLEL SAFE
SET search_path = public AS $$
    SELECT coalesce(public.auth_role() = 'hq_admin', false);
$$;

-- 2. Enable RLS on every table
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_replacement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_replacement_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_location_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_audit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_audit_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. Policy Definitions
-- =============================================================================

-- MARKETS
CREATE POLICY "markets_read_all" ON public.markets
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "markets_write_hq" ON public.markets
    FOR ALL TO authenticated USING (public.is_hq());

-- MARKET RULES
CREATE POLICY "market_rules_read_policy" ON public.market_rules
    FOR SELECT TO authenticated USING (
        public.is_hq() OR market_code = public.auth_market()
    );

CREATE POLICY "market_rules_write_hq" ON public.market_rules
    FOR ALL TO authenticated USING (public.is_hq());

-- PROFILES
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated USING (
        public.is_hq() 
        OR id = public.auth_uid() 
        OR (public.auth_role() = 'country_sales_head' AND market_code = public.auth_market())
    );

CREATE POLICY "profiles_write_hq" ON public.profiles
    FOR ALL TO authenticated USING (public.is_hq());

CREATE POLICY "profiles_update_self" ON public.profiles
    FOR UPDATE TO authenticated 
    USING (id = public.auth_uid()) 
    WITH CHECK (id = public.auth_uid() AND role = public.auth_role() AND market_code = public.auth_market());

-- APPROVED ABSENCES
CREATE POLICY "approved_absences_select" ON public.approved_absences
    FOR SELECT TO authenticated USING (
        public.is_hq()
        OR user_id = public.auth_uid()
        OR (public.auth_role() = 'country_sales_head' AND market_code = public.auth_market())
    );

CREATE POLICY "approved_absences_write_managers" ON public.approved_absences
    FOR ALL TO authenticated USING (
        public.is_hq()
        OR (public.auth_role() = 'country_sales_head' AND market_code = public.auth_market())
    );

-- DEVICES (100% Company Fleet)
CREATE POLICY "devices_select_policy" ON public.devices
    FOR SELECT TO authenticated USING (
        public.is_hq()
        OR (public.auth_role() = 'country_sales_head' AND market_code = public.auth_market())
        OR id IN (SELECT device_id FROM public.device_assignments WHERE salesperson_id = public.auth_uid() AND is_current = true)
    );

CREATE POLICY "devices_write_hq_only" ON public.devices
    FOR ALL TO authenticated USING (public.is_hq());

-- DEVICE ASSIGNMENTS
CREATE POLICY "device_assignments_select" ON public.device_assignments
    FOR SELECT TO authenticated USING (
        public.is_hq()
        OR salesperson_id = public.auth_uid()
        OR (public.auth_role() = 'country_sales_head' AND salesperson_id IN (
            SELECT id FROM public.profiles WHERE market_code = public.auth_market()
        ))
    );

CREATE POLICY "device_assignments_write_hq_only" ON public.device_assignments
    FOR ALL TO authenticated USING (public.is_hq());

-- DEVICE REPLACEMENT REQUESTS (Approved Direct Salesperson -> HQ Flow)
CREATE POLICY "device_replacement_select" ON public.device_replacement_requests
    FOR SELECT TO authenticated USING (
        public.is_hq()
        OR salesperson_id = public.auth_uid()
        OR (public.auth_role() = 'country_sales_head' AND market_code = public.auth_market())
    );

CREATE POLICY "device_replacement_insert_rep" ON public.device_replacement_requests
    FOR INSERT TO authenticated WITH CHECK (
        public.auth_role() = 'salesperson' AND salesperson_id = public.auth_uid()
    );

CREATE POLICY "device_replacement_update_hq_only" ON public.device_replacement_requests
    FOR UPDATE TO authenticated USING (public.is_hq());

CREATE POLICY "device_replacement_history_select" ON public.device_replacement_history
    FOR SELECT TO authenticated USING (
        public.is_hq()
        OR request_id IN (SELECT id FROM public.device_replacement_requests WHERE salesperson_id = public.auth_uid())
        OR (public.auth_role() = 'country_sales_head' AND request_id IN (
            SELECT id FROM public.device_replacement_requests WHERE market_code = public.auth_market()
        ))
    );

-- ORGANISATIONS & BRANCHES (PRD §4.2)
CREATE POLICY "organisations_select" ON public.organisations
    FOR SELECT TO authenticated USING (
        public.is_hq() OR market_code = public.auth_market()
    );

CREATE POLICY "organisations_write_managers" ON public.organisations
    FOR ALL TO authenticated USING (
        public.is_hq() OR (public.auth_role() = 'country_sales_head' AND market_code = public.auth_market())
    );

CREATE POLICY "branches_select" ON public.branches
    FOR SELECT TO authenticated USING (
        public.is_hq() 
        OR market_code = public.auth_market()
    );

CREATE POLICY "branches_insert_salesperson" ON public.branches
    FOR INSERT TO authenticated WITH CHECK (
        public.auth_role() = 'salesperson' 
        AND market_code = public.auth_market()
        AND operating_status IN ('location_pending', 'pending_approval')
    );

CREATE POLICY "branches_write_managers" ON public.branches
    FOR UPDATE TO authenticated USING (
        public.is_hq() OR (public.auth_role() = 'country_sales_head' AND market_code = public.auth_market())
    );

-- BRANCH LOCATION PINS
CREATE POLICY "branch_pins_select" ON public.branch_location_pins
    FOR SELECT TO authenticated USING (
        public.is_hq()
        OR branch_id IN (SELECT id FROM public.branches WHERE market_code = public.auth_market())
    );

CREATE POLICY "branch_pins_insert_rep" ON public.branch_location_pins
    FOR INSERT TO authenticated WITH CHECK (
        public.auth_role() = 'salesperson' AND proposed_by = public.auth_uid()
    );

CREATE POLICY "branch_pins_review_managers" ON public.branch_location_pins
    FOR UPDATE TO authenticated USING (
        public.is_hq() OR (public.auth_role() = 'country_sales_head' AND branch_id IN (
            SELECT id FROM public.branches WHERE market_code = public.auth_market()
        ))
    );

-- CLIENT CONTACTS
CREATE POLICY "client_contacts_select" ON public.client_contacts
    FOR SELECT TO authenticated USING (
        public.is_hq() OR branch_id IN (SELECT id FROM public.branches WHERE market_code = public.auth_market())
    );

CREATE POLICY "client_contacts_insert" ON public.client_contacts
    FOR INSERT TO authenticated WITH CHECK (
        public.is_hq() OR branch_id IN (SELECT id FROM public.branches WHERE market_code = public.auth_market())
    );

-- ATTENDANCE DAYS
CREATE POLICY "attendance_days_select" ON public.attendance_days
    FOR SELECT TO authenticated USING (
        public.is_hq()
        OR user_id = public.auth_uid()
        OR (public.auth_role() = 'country_sales_head' AND market_code = public.auth_market())
    );

-- VISITS (PRD §2 & §7 Sole-Author Rule: STRICTLY NO MANAGER INSERT OR DIRECT UPDATE)
CREATE POLICY "visits_select" ON public.visits
    FOR SELECT TO authenticated USING (
        public.is_hq()
        OR user_id = public.auth_uid()
        OR (public.auth_role() = 'country_sales_head' AND branch_id IN (
            SELECT id FROM public.branches WHERE market_code = public.auth_market()
        ))
    );

-- Direct INSERT on visits is revoked from public API; handled exclusively by SECURITY DEFINER ingest RPC!
-- Direct UPDATE on visits is revoked from public API!

-- MEETING LOGS
CREATE POLICY "meeting_logs_select" ON public.meeting_logs
    FOR SELECT TO authenticated USING (
        public.is_hq()
        OR visit_id IN (SELECT id FROM public.visits WHERE user_id = public.auth_uid())
        OR (public.auth_role() = 'country_sales_head' AND visit_id IN (
            SELECT v.id FROM public.visits v 
            JOIN public.branches b ON v.branch_id = b.id 
            WHERE b.market_code = public.auth_market()
        ))
    );

-- ACTIVITY EVENTS (Offline Ingestion Journal)
CREATE POLICY "activity_events_select" ON public.activity_events
    FOR SELECT TO authenticated USING (
        public.is_hq()
        OR user_id = public.auth_uid()
        OR (public.auth_role() = 'country_sales_head' AND market_code = public.auth_market())
    );

-- EXCEPTIONS (PRD §2 & §7 Sole-Author Rule: Rep submits, Manager decides, NO manager insert!)
CREATE POLICY "exceptions_select" ON public.exceptions
    FOR SELECT TO authenticated USING (
        public.is_hq()
        OR user_id = public.auth_uid()
        OR (public.auth_role() = 'country_sales_head' AND branch_id IN (
            SELECT id FROM public.branches WHERE market_code = public.auth_market()
        ))
    );

CREATE POLICY "exceptions_insert_salesperson_only" ON public.exceptions
    FOR INSERT TO authenticated WITH CHECK (
        public.auth_role() = 'salesperson' AND user_id = public.auth_uid()
    );

-- VERIFICATION FLAGS
CREATE POLICY "verification_flags_select" ON public.verification_flags
    FOR SELECT TO authenticated USING (
        public.is_hq()
        OR user_id = public.auth_uid()
        OR (public.auth_role() = 'country_sales_head' AND market_code = public.auth_market())
    );

CREATE POLICY "verification_flags_review_managers" ON public.verification_flags
    FOR UPDATE TO authenticated USING (
        public.is_hq() OR (public.auth_role() = 'country_sales_head' AND market_code = public.auth_market())
    );

-- APPROVAL AUDIT (Append-Only)
CREATE POLICY "approval_audit_select" ON public.approval_audit
    FOR SELECT TO authenticated USING (
        public.is_hq() OR actor_id = public.auth_uid() OR public.auth_role() = 'country_sales_head'
    );

-- CLIENT AUDIT RECORDS & ATTEMPTS (PRD §8.3 / AT-10)
CREATE POLICY "client_audit_records_select" ON public.client_audit_records
    FOR SELECT TO authenticated USING (
        public.is_hq()
        OR (public.auth_role() = 'country_sales_head' AND market_code = public.auth_market())
        OR visit_id IN (SELECT id FROM public.visits WHERE user_id = public.auth_uid())
    );

CREATE POLICY "client_audit_records_manage_csh" ON public.client_audit_records
    FOR ALL TO authenticated USING (
        public.is_hq() OR (public.auth_role() = 'country_sales_head' AND market_code = public.auth_market())
    );

CREATE POLICY "client_audit_attempts_select" ON public.client_audit_attempts
    FOR SELECT TO authenticated USING (
        public.is_hq() OR public.auth_role() = 'country_sales_head'
    );

CREATE POLICY "client_audit_attempts_insert_csh" ON public.client_audit_attempts
    FOR INSERT TO authenticated WITH CHECK (
        public.is_hq() OR public.auth_role() = 'country_sales_head'
    );

-- IMPORT & EXPORT JOBS
CREATE POLICY "import_batches_hq_only" ON public.import_batches
    FOR ALL TO authenticated USING (public.is_hq());

CREATE POLICY "export_jobs_manage" ON public.export_jobs
    FOR ALL TO authenticated USING (
        public.is_hq() OR (public.auth_role() = 'country_sales_head' AND (market_code = public.auth_market() OR market_code IS NULL))
    );

-- SYSTEM AUDIT LOGS (HQ Read-Only)
CREATE POLICY "system_audit_logs_hq_only" ON public.system_audit_logs
    FOR SELECT TO authenticated USING (public.is_hq());
