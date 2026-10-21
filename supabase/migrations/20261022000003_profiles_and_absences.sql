-- =============================================================================
-- Migration 00003: Profiles and Approved Absences / Work Schedules
-- Carbon Field Sales Tracker (Nigeria, Zambia, Malawi)
-- =============================================================================

-- User profiles extending auth.users 1:1
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    market_code VARCHAR(2) REFERENCES public.markets(code) ON DELETE RESTRICT,
    full_name VARCHAR(128) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(32) NOT NULL,
    role public.app_role NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_sign_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_profile_market_role CHECK (
        (role = 'salesperson' AND market_code IS NOT NULL) OR
        (role = 'country_sales_head' AND market_code IS NOT NULL) OR
        (role = 'hq_admin')
    )
);

-- Approved Leave & Authorized Non-Visit Workdays (PRD §6.2)
CREATE TABLE public.approved_absences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    absence_date DATE NOT NULL,
    category public.absence_category NOT NULL,
    counts_as_attendance BOOLEAN NOT NULL DEFAULT true,
    counts_as_visit_target BOOLEAN NOT NULL DEFAULT false, -- Non-visit days NEVER count toward physical visit targets!
    justification TEXT NOT NULL,
    approved_by UUID NOT NULL REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_absence_date UNIQUE (user_id, absence_date)
);

-- Link market_rules.created_by to profiles
ALTER TABLE public.market_rules
    ADD CONSTRAINT fk_market_rules_created_by
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
