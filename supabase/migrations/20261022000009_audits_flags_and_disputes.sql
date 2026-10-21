-- =============================================================================
-- Migration 00009: Verification Flags, Approval Audit, Client Audits & Governance
-- Carbon Field Sales Tracker (PRD §8.3 5% Audit Sampling & CWE-1236 Sanitization)
-- =============================================================================

-- Automated Heuristics & Anomaly Flags (PRD §6.3 & §6.4)
CREATE TABLE public.verification_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID REFERENCES public.visits(id) ON DELETE CASCADE,
    attendance_day_id UUID REFERENCES public.attendance_days(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    flag_code public.flag_code NOT NULL,
    severity public.flag_severity NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    status public.flag_status NOT NULL DEFAULT 'open',
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    reviewer_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Immutable Append-Only Managerial & Administrative Decision Ledger
CREATE TABLE public.approval_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(64) NOT NULL, -- 'branch_pin', 'exception', 'client_audit', 'device_replacement'
    entity_id UUID NOT NULL,
    actor_id UUID NOT NULL REFERENCES public.profiles(id),
    action VARCHAR(64) NOT NULL,      -- 'approve', 'reject', 'escalate', 'resolve_dispute'
    previous_state VARCHAR(64),
    new_state VARCHAR(64) NOT NULL,
    mandatory_reason TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Client Audit Phone Call Queue (PRD §8.3 / AT-10)
CREATE TABLE public.client_audit_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    selection_method public.audit_selection_method NOT NULL,
    contact_name VARCHAR(128) NOT NULL,
    contact_phone VARCHAR(32) NOT NULL,
    meeting_confirmed BOOLEAN,
    call_status public.audit_call_status NOT NULL DEFAULT 'pending_call',
    audit_outcome public.audit_outcome NOT NULL DEFAULT 'pending',
    dispute_status public.dispute_resolution_status NOT NULL DEFAULT 'none',
    dispute_notes TEXT,
    resolved_by UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Multiple Audit Call Attempts Ledger
CREATE TABLE public.client_audit_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_record_id UUID NOT NULL REFERENCES public.client_audit_records(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL,
    dialed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    call_result public.audit_call_status NOT NULL,
    auditor_id UUID NOT NULL REFERENCES public.profiles(id),
    call_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- B2B Client Master CSV Ingestion Batches
CREATE TABLE public.import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    filename VARCHAR(255) NOT NULL,
    total_rows INT NOT NULL,
    valid_rows INT NOT NULL,
    error_rows INT NOT NULL,
    location_pending_rows INT NOT NULL,
    imported_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Operational Data Export Jobs (CWE-1236 Sanitization Audit)
CREATE TABLE public.export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    export_type VARCHAR(64) NOT NULL,
    market_code VARCHAR(2), -- NULL for regional HQ extracts
    row_count INT NOT NULL,
    formula_escaped BOOLEAN NOT NULL DEFAULT true,
    downloaded_by UUID NOT NULL REFERENCES public.profiles(id),
    downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- System Administration Audit Log
CREATE TABLE public.system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_id UUID REFERENCES public.profiles(id),
    actor_role VARCHAR(32) NOT NULL,
    market_code VARCHAR(2),
    action VARCHAR(64) NOT NULL,
    target_entity VARCHAR(64) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    diff_summary TEXT,
    security_severity VARCHAR(32) NOT NULL DEFAULT 'info'
);
