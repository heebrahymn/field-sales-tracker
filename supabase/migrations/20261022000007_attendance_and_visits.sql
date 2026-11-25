-- =============================================================================
-- Migration 00007: Attendance, Physical Field Visits & Meeting Documentation Logs
-- Carbon Field Sales Tracker (PRD §6.1, §7.1, §7.3 & AT-04 Hard Block)
-- =============================================================================

-- Daily Salesperson Workdays and Check-In Attendance
CREATE TABLE public.attendance_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE RESTRICT,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    work_date DATE NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    start_latitude NUMERIC(10, 7) NOT NULL,
    start_longitude NUMERIC(10, 7) NOT NULL,
    start_geom geometry(Point, 4326) GENERATED ALWAYS AS (
        ST_SetSRID(ST_MakePoint(start_longitude, start_latitude), 4326)
    ) STORED,
    start_accuracy_m NUMERIC(6, 2) NOT NULL,
    start_selfie_url TEXT NOT NULL,
    end_latitude NUMERIC(10, 7),
    end_longitude NUMERIC(10, 7),
    end_geom geometry(Point, 4326) GENERATED ALWAYS AS (
        CASE WHEN end_latitude IS NOT NULL AND end_longitude IS NOT NULL 
             THEN ST_SetSRID(ST_MakePoint(end_longitude, end_latitude), 4326) 
             ELSE NULL END
    ) STORED,
    end_accuracy_m NUMERIC(6, 2),
    status public.attendance_status NOT NULL DEFAULT 'started',
    captured_offline BOOLEAN NOT NULL DEFAULT false,
    server_received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_work_date UNIQUE (user_id, work_date)
);

CREATE INDEX idx_attendance_start_geom ON public.attendance_days USING GIST (start_geom);

-- Physical Client Visit Sessions
CREATE TABLE public.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_day_id UUID NOT NULL REFERENCES public.attendance_days(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    branch_pin_id UUID REFERENCES public.branch_location_pins(id) ON DELETE RESTRICT,
    rule_version_id UUID REFERENCES public.market_rules(id) ON DELETE RESTRICT,
    kind public.visit_kind NOT NULL DEFAULT 'normal',
    check_in_at TIMESTAMPTZ NOT NULL,
    check_out_at TIMESTAMPTZ,
    check_in_latitude NUMERIC(10, 7) NOT NULL,
    check_in_longitude NUMERIC(10, 7) NOT NULL,
    check_in_geom geometry(Point, 4326) GENERATED ALWAYS AS (
        ST_SetSRID(ST_MakePoint(check_in_longitude, check_in_latitude), 4326)
    ) STORED,
    check_in_accuracy_m NUMERIC(6, 2) NOT NULL,
    check_out_latitude NUMERIC(10, 7),
    check_out_longitude NUMERIC(10, 7),
    check_out_geom geometry(Point, 4326) GENERATED ALWAYS AS (
        CASE WHEN check_out_latitude IS NOT NULL AND check_out_longitude IS NOT NULL 
             THEN ST_SetSRID(ST_MakePoint(check_out_longitude, check_out_latitude), 4326) 
             ELSE NULL END
    ) STORED,
    check_out_accuracy_m NUMERIC(6, 2),
    distance_to_pin_m NUMERIC(8, 2),
    location_classification public.location_classification NOT NULL,
    premises_photo_url TEXT,
    premises_photo_hash VARCHAR(64), -- SHA-256 / dHash for duplicate photo detection
    verification_status public.visit_verification_status NOT NULL DEFAULT 'capturing',
    captured_offline BOOLEAN NOT NULL DEFAULT false,
    server_received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AT-04 Hard Block: Single open normal visit per salesperson
CREATE UNIQUE INDEX uq_single_open_visit_per_rep 
ON public.visits (user_id) 
WHERE check_out_at IS NULL AND kind = 'normal';

CREATE INDEX idx_visits_check_in_geom ON public.visits USING GIST (check_in_geom);

-- Qualitative Meeting Documentation Logs (Strict PRD Non-Commercial Boundaries)
CREATE TABLE public.meeting_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL UNIQUE REFERENCES public.visits(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.client_contacts(id),
    purpose public.visit_purpose NOT NULL,
    products_discussed TEXT[] NOT NULL DEFAULT '{}',
    fleet_size_volume INT DEFAULT 0,
    outcome_narrative TEXT NOT NULL,
    next_step_text TEXT NOT NULL, -- Free text only! Zero quotation, task or pipeline entities.
    business_card_photo_url TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_late BOOLEAN NOT NULL DEFAULT false, -- Flagged if submitted > 2h after checkout
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
