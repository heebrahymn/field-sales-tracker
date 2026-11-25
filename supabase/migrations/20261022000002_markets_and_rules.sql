-- =============================================================================
-- Migration 00002: Markets and Versioned Operational Rule Sets
-- Carbon Field Sales Tracker (Nigeria, Zambia, Malawi)
-- =============================================================================

-- Canonical National Operational Territories
CREATE TABLE public.markets (
    code VARCHAR(2) PRIMARY KEY, -- 'NG', 'ZM', 'MW'
    name VARCHAR(64) NOT NULL,
    iana_timezone VARCHAR(64) NOT NULL, -- 'Africa/Lagos', 'Africa/Lusaka', 'Africa/Blantyre'
    currency_code VARCHAR(3) NOT NULL,  -- 'NGN', 'ZMW', 'MWK' (Reference only)
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Initial insertion of authorized operational markets
INSERT INTO public.markets (code, name, iana_timezone, currency_code) VALUES
('NG', 'Nigeria (Lagos Hub)', 'Africa/Lagos', 'NGN'),
('ZM', 'Zambia (Lusaka Hub)', 'Africa/Lusaka', 'ZMW'),
('MW', 'Malawi (Blantyre Hub)', 'Africa/Blantyre', 'MWK')
ON CONFLICT (code) DO NOTHING;

-- Versioned Operational Rules and Spatial Thresholds (PRD §6 & §11)
CREATE TABLE public.market_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    version_tag VARCHAR(32) NOT NULL, -- e.g. 'v1.2.04'
    geofence_radius_m NUMERIC(6, 2) NOT NULL DEFAULT 200.00,
    max_visit_gps_accuracy_m NUMERIC(6, 2) NOT NULL DEFAULT 100.00,
    max_pin_gps_accuracy_m NUMERIC(6, 2) NOT NULL DEFAULT 50.00,
    min_visit_duration_seconds INT NOT NULL DEFAULT 300, -- 5 mins
    max_idle_gap_minutes INT NOT NULL DEFAULT 150, -- 2.5 hours
    working_hours_start TIME NOT NULL DEFAULT '08:00:00',
    working_hours_end TIME NOT NULL DEFAULT '17:00:00',
    shift_grace_minutes INT NOT NULL DEFAULT 30,
    daily_visit_target INT NOT NULL DEFAULT 6,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to TIMESTAMPTZ, -- NULL indicates current active version
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID, -- Can be linked to profiles later
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_market_active_rule UNIQUE NULLS NOT DISTINCT (market_code, effective_to)
);

-- Seed initial canonical rule sets (v1.2.04 baseline)
INSERT INTO public.market_rules (market_code, version_tag, geofence_radius_m, max_visit_gps_accuracy_m, max_pin_gps_accuracy_m, min_visit_duration_seconds, max_idle_gap_minutes) VALUES
('NG', 'v1.2.04-canonical', 200.00, 100.00, 50.00, 300, 150),
('ZM', 'v1.2.04-canonical', 250.00, 100.00, 50.00, 300, 150),
('MW', 'v1.2.04-canonical', 300.00, 100.00, 50.00, 300, 150)
ON CONFLICT DO NOTHING;
