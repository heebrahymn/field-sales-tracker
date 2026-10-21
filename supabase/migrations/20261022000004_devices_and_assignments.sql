-- =============================================================================
-- Migration 00004: Company Devices and Custody Assignments
-- Carbon Field Sales Tracker (Nigeria, Zambia, Malawi)
-- =============================================================================

-- 100% Company-Provided Handset Inventory
CREATE TABLE public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id VARCHAR(64) NOT NULL UNIQUE,       -- e.g. 'CC-DEV-LOS-001'
    asset_tag VARCHAR(64) NOT NULL,
    make VARCHAR(64) NOT NULL,                  -- e.g. 'Samsung'
    model VARCHAR(64) NOT NULL,                 -- e.g. 'Galaxy A15 Enterprise'
    serial_number VARCHAR(128) NOT NULL UNIQUE,
    imei VARCHAR(15),                           -- 15-digit TAC/SNR/CD
    os_version VARCHAR(64),
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    inventory_status public.device_inventory_status NOT NULL DEFAULT 'available',
    security_authorization public.security_authorization_status NOT NULL DEFAULT 'pending_activation',
    battery_health INT CHECK (battery_health BETWEEN 0 AND 100),
    last_sync_at TIMESTAMPTZ,
    knox_enrolled BOOLEAN NOT NULL DEFAULT true,
    supplier VARCHAR(128),
    purchase_date DATE,
    warranty_expiry_date DATE,
    notes TEXT,
    registered_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Handset Custody History and Assignment Ledger
CREATE TABLE public.device_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE RESTRICT,
    salesperson_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    returned_at TIMESTAMPTZ,
    assigned_by UUID NOT NULL REFERENCES public.profiles(id),
    handover_reason TEXT,
    is_current BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce strictly one active device per salesperson
CREATE UNIQUE INDEX uq_single_active_device_per_rep 
ON public.device_assignments (salesperson_id) 
WHERE is_current = true;

-- Enforce strictly one active salesperson per device
CREATE UNIQUE INDEX uq_single_active_rep_per_device 
ON public.device_assignments (device_id) 
WHERE is_current = true;
