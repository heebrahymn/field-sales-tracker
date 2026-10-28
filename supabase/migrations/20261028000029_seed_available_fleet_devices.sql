-- =============================================================================
-- Migration 00029: Seed Canonical Available Company Fleet Devices
-- Carbon Field Sales Tracker (Nigeria, Zambia, Malawi)
-- =============================================================================

DO $$
DECLARE
    v_user_hq UUID;
BEGIN
    SELECT id INTO v_user_hq FROM public.profiles WHERE role = 'hq_admin' LIMIT 1;
    IF v_user_hq IS NULL THEN
        v_user_hq := '33333333-3333-4333-a333-333333333333';
    END IF;

    -- 1. Ensure CC-DEV-LOS-SPARE-01 is available if unassigned
    UPDATE public.devices
    SET inventory_status = 'available'
    WHERE asset_id = 'CC-DEV-LOS-SPARE-01'
      AND NOT EXISTS (
          SELECT 1 FROM public.device_assignments 
          WHERE device_id = devices.id AND is_current = true
      );

    -- 2. Canonical Available Handsets across Nigeria, Zambia, and Malawi
    INSERT INTO public.devices (
        asset_id, asset_tag, make, model, serial_number, imei, market_code,
        inventory_status, security_authorization, battery_health, knox_enrolled, registered_by
    ) VALUES
    ('CAR-NG-001', 'CAR-NG-001', 'Samsung', 'Galaxy A15', 'SN-SAM-A15-101-NG', '864209051234101', 'NG', 'available', 'authorized', 100, true, v_user_hq),
    ('CAR-NG-002', 'CAR-NG-002', 'Samsung', 'Galaxy A15', 'SN-SAM-A15-102-NG', '864209051234102', 'NG', 'available', 'authorized', 98, true, v_user_hq),
    ('CAR-ZM-001', 'CAR-ZM-001', 'Samsung', 'Galaxy A15', 'SN-SAM-A15-101-ZM', '358941098765101', 'ZM', 'available', 'authorized', 100, true, v_user_hq),
    ('CAR-ZM-002', 'CAR-ZM-002', 'Samsung', 'Galaxy A15', 'SN-SAM-A15-102-ZM', '358941098765102', 'ZM', 'available', 'authorized', 95, true, v_user_hq),
    ('CAR-MW-001', 'CAR-MW-001', 'Samsung', 'Galaxy A15', 'SN-SAM-A15-101-MW', '358941098765201', 'MW', 'available', 'authorized', 100, true, v_user_hq),
    ('CAR-MW-002', 'CAR-MW-002', 'Samsung', 'Galaxy A15', 'SN-SAM-A15-102-MW', '358941098765202', 'MW', 'available', 'authorized', 97, true, v_user_hq)
    ON CONFLICT (asset_id) DO UPDATE
    SET inventory_status = 'available'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.device_assignments 
        WHERE device_id = devices.id AND is_current = true
    );

END $$;
