-- =============================================================================
-- Migration 00013: Deterministic Fictional Development Seed Data
-- Carbon Field Sales Tracker (Nigeria, Zambia, Malawi)
-- =============================================================================

-- Deterministic UUIDs for development test users
-- 1. Salesperson (Nigeria): Tunde Adebayo
-- 2. Country Sales Head (Nigeria): Babatunde Adeleke
-- 3. HQ Admin: HQ Administrator
-- 4. Salesperson (Zambia): Peter Mwale
-- 5. Country Sales Head (Zambia): Chileshe Mwape

SET search_path = public, extensions, auth;

DO $$
DECLARE
    v_user_sp_ng UUID := '11111111-1111-4111-a111-111111111111';
    v_user_csh_ng UUID := '22222222-2222-4222-a222-222222222222';
    v_user_hq UUID := '33333333-3333-4333-a333-333333333333';
    v_user_sp_zm UUID := '44444444-4444-4444-a444-444444444444';
    v_user_csh_zm UUID := '55555555-5555-4555-a555-555555555555';
    v_dev_ng_01 UUID := 'd1111111-1111-4111-b111-111111111111';
    v_dev_ng_spare UUID := 'd2222222-2222-4222-b222-222222222222';
    v_dev_zm_01 UUID := 'd3333333-3333-4333-b333-333333333333';
    v_org_apex UUID := 'e1111111-1111-4111-c111-111111111111';
    v_org_dangote UUID := 'e2222222-2222-4222-c222-222222222222';
    v_br_apapa UUID := 'f1111111-1111-4111-d111-111111111111';
    v_br_ikeja UUID := 'f2222222-2222-4222-d222-222222222222';
    v_pin_apapa UUID := 'a1111111-1111-4111-e111-111111111111';
    v_pin_ikeja UUID := 'a2222222-2222-4222-e222-222222222222';
BEGIN
    -- 1. Create development user placeholder records in auth.users if not present
    -- NOTE (Security Audit Remediation): Fixed demo credentials have been sanitized and replaced
    -- with randomized, unguessable cryptographic hashes. In all environments, valid credentials
    -- must be provisioned and activated via the official Supabase Auth Admin API (`npm run provision:users`).
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES
    (v_user_sp_ng, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tunde.adebayo@carboncarcare.com', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Tunde Adebayo"}', now(), now()),
    (v_user_csh_ng, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'babatunde.adeleke@carboncarcare.com', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Babatunde Adeleke"}', now(), now()),
    (v_user_hq, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'hq.admin@carboncarcare.com', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"HQ Administrator"}', now(), now()),
    (v_user_sp_zm, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'peter.mwale@carboncarcare.com', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Peter Mwale"}', now(), now()),
    (v_user_csh_zm, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chileshe.mwape@carboncarcare.com', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Chileshe Mwape"}', now(), now())
    ON CONFLICT (id) DO NOTHING;

    -- 2. Populate public.profiles
    INSERT INTO public.profiles (id, market_code, full_name, email, phone_number, role)
    VALUES
    (v_user_sp_ng, 'NG', 'Tunde Adebayo', 'tunde.adebayo@carboncarcare.com', '+234 803 111 0001', 'salesperson'),
    (v_user_csh_ng, 'NG', 'Babatunde Adeleke', 'babatunde.adeleke@carboncarcare.com', '+234 802 222 0002', 'country_sales_head'),
    (v_user_hq, NULL, 'HQ Administrator', 'hq.admin@carboncarcare.com', '+234 809 333 0003', 'hq_admin'),
    (v_user_sp_zm, 'ZM', 'Peter Mwale', 'peter.mwale@carboncarcare.com', '+260 977 444 0004', 'salesperson'),
    (v_user_csh_zm, 'ZM', 'Chileshe Mwape', 'chileshe.mwape@carboncarcare.com', '+260 966 555 0005', 'country_sales_head')
    ON CONFLICT (id) DO NOTHING;

    -- 3. Populate 100% company handset fleet
    INSERT INTO public.devices (id, asset_id, asset_tag, make, model, serial_number, imei, market_code, inventory_status, security_authorization, battery_health, knox_enrolled, registered_by)
    VALUES
    (v_dev_ng_01, 'CC-DEV-LOS-001', 'CC-DEV-LOS-001', 'Samsung', 'Galaxy A15 Enterprise', 'SN-SAM-A15-001-NG', '864209051234561', 'NG', 'active', 'authorized', 92, true, v_user_hq),
    (v_dev_ng_spare, 'CC-DEV-LOS-SPARE-01', 'CC-DEV-LOS-SPARE-01', 'Samsung', 'Galaxy A15 Enterprise', 'SN-SAM-A15-099-NG', '864209051234599', 'NG', 'available', 'pending_activation', 100, true, v_user_hq),
    (v_dev_zm_01, 'CC-DEV-LUS-001', 'CC-DEV-LUS-001', 'Samsung', 'Galaxy A15 Enterprise', 'SN-SAM-A15-001-ZM', '358941098765431', 'ZM', 'active', 'authorized', 88, true, v_user_hq)
    ON CONFLICT (id) DO NOTHING;

    -- 4. Handset Custody Assignments
    INSERT INTO public.device_assignments (device_id, salesperson_id, assigned_by, handover_reason, is_current)
    VALUES
    (v_dev_ng_01, v_user_sp_ng, v_user_hq, 'Initial company handset issue for Lagos territory', true),
    (v_dev_zm_01, v_user_sp_zm, v_user_hq, 'Initial company handset issue for Lusaka territory', true)
    ON CONFLICT DO NOTHING;

    -- 5. B2B Client Organisations
    INSERT INTO public.organisations (id, name, market_code, tier)
    VALUES
    (v_org_apex, 'Apex Heavy Logistics Ltd', 'NG', 'key_account'),
    (v_org_dangote, 'Dangote Transport & Logistics', 'NG', 'enterprise')
    ON CONFLICT (id) DO NOTHING;

    -- 6. Branches (Demonstrating PRD §4.2 Shared Switchboard Phone!)
    INSERT INTO public.branches (id, organisation_id, branch_name, market_code, category, street_address, city, switchboard_phone, estimated_fleet_size, operating_status, created_by)
    VALUES
    (v_br_apapa, v_org_dangote, 'Apapa Terminal Depot', 'NG', 'fleet_operator', 'Wharf Road, Apapa Port Complex', 'Lagos', '+234 1 270 5000', 85, 'active', v_user_sp_ng),
    (v_br_ikeja, v_org_dangote, 'Ikeja Logistics Hub', 'NG', 'logistics', 'Plot 12 Commercial Avenue, Ikeja', 'Lagos', '+234 1 270 5000', 40, 'active', v_user_sp_ng)
    ON CONFLICT (id) DO NOTHING;

    -- 7. Versioned Branch Pins (Apapa: 6.4474° N, 3.3582° E; Ikeja: 6.5925° N, 3.3441° E)
    INSERT INTO public.branch_location_pins (id, branch_id, version_number, latitude, longitude, reported_accuracy_m, premises_photo_url, status, proposed_by, reviewed_by, is_active)
    VALUES
    (v_pin_apapa, v_br_apapa, 1, 6.4474000, 3.3582000, 18.5, '/demo/demo-premises-dangote-apapa.jpg', 'approved', v_user_sp_ng, v_user_csh_ng, true),
    (v_pin_ikeja, v_br_ikeja, 1, 6.5925000, 3.3441000, 22.0, '/demo/demo-premises-dangote-ikeja.jpg', 'approved', v_user_sp_ng, v_user_csh_ng, true)
    ON CONFLICT (id) DO NOTHING;

    -- 8. Client Contacts
    INSERT INTO public.client_contacts (branch_id, organisation_id, full_name, designation, phone_number, email, is_primary)
    VALUES
    (v_br_apapa, v_org_dangote, 'Alhaji Musa Garba', 'Head of Fleet Operations', '+234 803 777 8888', 'musa.garba@dangote-transport.demo', true),
    (v_br_ikeja, v_org_dangote, 'Mrs. Folake Akindele', 'Workshop Maintenance Director', '+234 802 666 5555', 'folake.akindele@dangote-transport.demo', true)
    ON CONFLICT (id) DO NOTHING;
END;
$$;
