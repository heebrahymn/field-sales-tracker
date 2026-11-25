-- =============================================================================
-- Migration 00006: B2B Organizations, Branches, Versioned Pins & Contacts
-- Carbon Field Sales Tracker (PRD §4.2 Shared Switchboard Phone Compliance)
-- =============================================================================

-- Parent B2B Commercial Client Accounts
CREATE TABLE public.organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    tier VARCHAR(32) DEFAULT 'standard',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Physical Operating Facilities / Branches
-- NOTE: PRD §4.2 explicitly allows sibling branches to share a switchboard telephone number!
CREATE TABLE public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
    branch_name VARCHAR(128) NOT NULL,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    category public.branch_category NOT NULL,
    street_address TEXT NOT NULL,
    city VARCHAR(64) NOT NULL,
    switchboard_phone VARCHAR(32) NOT NULL, -- Legitimate shared switchboard support
    estimated_fleet_size INT DEFAULT 0,
    operating_status public.branch_operating_status NOT NULL DEFAULT 'location_pending',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Versioned Branch GPS Pins and Premises Verification Photos (PRD §4.3 & §8.3)
CREATE TABLE public.branch_location_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    geom geometry(Point, 4326) GENERATED ALWAYS AS (
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    ) STORED,
    reported_accuracy_m NUMERIC(6, 2) NOT NULL,
    premises_photo_url TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending_approval', -- 'pending_approval', 'approved', 'rejected', 'superseded'
    proposed_by UUID NOT NULL REFERENCES public.profiles(id),
    proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    decision_reason TEXT,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_branch_pin_version UNIQUE (branch_id, version_number)
);

CREATE INDEX idx_branch_pins_geom ON public.branch_location_pins USING GIST (geom);

-- Key Client Personnel at Facilities
CREATE TABLE public.client_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    full_name VARCHAR(128) NOT NULL,
    designation VARCHAR(64) NOT NULL,
    phone_number VARCHAR(32) NOT NULL,
    email VARCHAR(255),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
