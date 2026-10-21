-- =============================================================================
-- Migration 00008: Offline Activity Events Ingestion Journal & Salesperson Exceptions
-- Carbon Field Sales Tracker (PRD §2 & §7 Sole-Author Boundary)
-- =============================================================================

-- Immutable Event Ingestion Ledger (UUID Idempotency & Sequence Monotonicity)
CREATE TABLE public.activity_events (
    id UUID PRIMARY KEY, -- Client-generated UUID (Idempotency key)
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE RESTRICT,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    event_type VARCHAR(64) NOT NULL, -- 'start_day', 'check_in', 'check_out', etc.
    sequence_number BIGINT NOT NULL,
    dependency_event_id UUID,
    client_timestamp TIMESTAMPTZ NOT NULL,
    server_received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    payload JSONB NOT NULL,
    processing_status public.event_processing_status NOT NULL DEFAULT 'accepted',
    processing_notes TEXT,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_device_event_sequence UNIQUE (device_id, sequence_number)
);

-- Salesperson-Authored Field Visit and Operational Failure Exceptions
-- Enforces PRD §2: Salespeople are the sole creators of exceptions; managers NEVER create them.
CREATE TABLE public.exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    attendance_day_id UUID REFERENCES public.attendance_days(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT,
    exception_type public.exception_type NOT NULL,
    claimed_visit_time TIMESTAMPTZ NOT NULL,
    actual_submission_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason TEXT NOT NULL,
    supporting_evidence_url TEXT,
    status public.exception_review_status NOT NULL DEFAULT 'pending_review',
    decided_by UUID REFERENCES public.profiles(id),
    decided_at TIMESTAMPTZ,
    decision_reason TEXT,
    resulting_visit_id UUID REFERENCES public.visits(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
