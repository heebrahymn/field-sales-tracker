-- =============================================================================
-- Migration 00031: Allow Salespeople to Register New Client Organisations in Own Market
-- Carbon Field Sales Tracker
-- =============================================================================
-- Fixes "new row violates row-level security policy for table \"organisations\""
-- when a salesperson registers a brand-new B2B client organisation in their
-- assigned national market (subject to Country Sales Head branch/pin approval).

SET search_path = public, extensions;

DROP POLICY IF EXISTS "organisations_insert_salesperson" ON public.organisations;
CREATE POLICY "organisations_insert_salesperson" ON public.organisations
    FOR INSERT TO authenticated WITH CHECK (
        public.auth_role() = 'salesperson'
        AND market_code = public.auth_market()
    );
