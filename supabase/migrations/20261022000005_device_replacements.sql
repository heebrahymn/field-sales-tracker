-- =============================================================================
-- Migration 00005: Direct Salesperson -> HQ Admin Device Replacement Pipeline
-- Carbon Field Sales Tracker (Approved Decision: Zero CSH Approval Bottleneck)
-- =============================================================================

-- Salesperson-reported hardware issues queue reviewed exclusively by HQ Admin
CREATE TABLE public.device_replacement_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salesperson_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    company_device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE RESTRICT,
    issue_category public.device_issue_category NOT NULL,
    issue_description TEXT NOT NULL,
    supporting_evidence_url TEXT,
    status public.replacement_request_status NOT NULL DEFAULT 'pending_review',
    replacement_device_id UUID REFERENCES public.devices(id), -- Allocated spare handset from HQ depot
    approval_reason TEXT,
    rejection_reason TEXT,
    dispatch_notes TEXT,
    courier_tracking_ref VARCHAR(128),
    activation_confirmed_at TIMESTAMPTZ,
    old_device_disposition public.old_device_disposition,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Immutable append-only audit trail for hardware replacement status lifecycle
CREATE TABLE public.device_replacement_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.device_replacement_requests(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id),
    action VARCHAR(64) NOT NULL,
    previous_status public.replacement_request_status,
    new_status public.replacement_request_status NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
