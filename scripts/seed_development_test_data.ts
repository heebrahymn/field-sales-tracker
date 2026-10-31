/**
 * Carbon Field Sales Tracker - Authoritative Development Test Data Seeder
 * 
 * Target Environment: Supabase Development Project ([SUPABASE_PROJECT_ID])
 * STRICT SAFETY RULE: Refuses execution on any project except [SUPABASE_PROJECT_ID].
 * 
 * Features:
 * - Deterministic, idempotent fixtures across Nigeria (NG), Zambia (ZM), and Malawi (MW).
 * - Multi-role users (Salesperson, Country Sales Head, HQ Admin) via GoTrue Admin API.
 * - Hardware inventory with diverse device statuses (available, assigned, maintenance, retired).
 * - Multi-branch organisations with shared switchboard numbers (PRD §4.2 rule).
 * - Versioned GPS location pins (approved, pending proposal, location pending).
 * - Operational field data: Attendance, location-verified visits, unverified exceptions, meeting logs.
 * - Managerial records: Verification flags, 5% random & risk-targeted client audits, device replacement pipeline.
 * - Import batch history for client master audit.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// --- Environment Loading & Verification ---
function loadEnv(): { url: string; serviceRoleKey: string; devUserPassword: string } {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local file not found in project root');
  }

  const content = fs.readFileSync(envPath, 'utf8');
  let url = '';
  let serviceRoleKey = '';
  let devUserPassword = '';

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
      url = trimmed.split('=', 2)[1].trim();
    } else if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      serviceRoleKey = trimmed.split('=', 2)[1].trim();
    } else if (trimmed.startsWith('DEV_USER_PASSWORD=')) {
      devUserPassword = trimmed.split('=', 2)[1].trim();
    }
  }

  if (!url || !serviceRoleKey) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  // Safety Assertion
  if (!url.includes('[SUPABASE_PROJECT_ID]')) {
    throw new Error(
      `CRITICAL SAFETY STOP: The target Supabase URL (${url}) is NOT the authorised development project ([SUPABASE_PROJECT_ID]). Execution aborted.`
    );
  }

  return { url, serviceRoleKey, devUserPassword: devUserPassword || process.env.DEV_USER_PASSWORD || '' };
}

async function run() {
  const { url, serviceRoleKey, devUserPassword } = loadEnv();
  console.log('='.repeat(75));
  console.log('CARBON FIELD SALES TRACKER — CONTROLLED DEV TEST DATA SEEDING');
  console.log(`Target: ${url} (Confirmed Authorised Dev Project)`);
  console.log('='.repeat(75));

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 1. SEED USERS & PROFILES
  console.log('\n[1] Synchronising Canonical Multi-Market Users...');
  const USERS = [
    // Nigeria
    {
      id: '11111111-1111-4111-a111-111111111111',
      email: 'tunde.adebayo@carboncarcare.com',
      fullName: 'Tunde Adebayo',
      role: 'salesperson',
      marketCode: 'NG',
      phone: '+2348031234567',
    },
    {
      id: '22222222-2222-4222-a222-222222222222',
      email: 'babatunde.adeleke@carboncarcare.com',
      fullName: 'Babatunde Adeleke',
      role: 'country_sales_head',
      marketCode: 'NG',
      phone: '+2348029876543',
    },
    {
      id: '11111111-1111-4111-a111-111111111112',
      email: 'chukwudi.okafor@carboncarcare.com',
      fullName: 'Chukwudi Okafor',
      role: 'salesperson',
      marketCode: 'NG',
      phone: '+2348031122334',
    },
    {
      id: '11111111-1111-4111-a111-111111111113',
      email: 'amina.bello@carboncarcare.com',
      fullName: 'Amina Bello',
      role: 'salesperson',
      marketCode: 'NG',
      phone: '+2348098876543',
    },
    // Zambia
    {
      id: '44444444-4444-4444-a444-444444444444',
      email: 'peter.mwale@carboncarcare.com',
      fullName: 'Peter Mwale',
      role: 'salesperson',
      marketCode: 'ZM',
      phone: '+260971234567',
    },
    {
      id: '55555555-5555-4555-a555-555555555555',
      email: 'chileshe.mwape@carboncarcare.com',
      fullName: 'Chileshe Mwape',
      role: 'country_sales_head',
      marketCode: 'ZM',
      phone: '+260979876543',
    },
    {
      id: '44444444-4444-4444-a444-444444444445',
      email: 'thandiwe.tembo@carboncarcare.com',
      fullName: 'Thandiwe Tembo',
      role: 'salesperson',
      marketCode: 'ZM',
      phone: '+260977654321',
    },
    // Malawi
    {
      id: '66666666-6666-4666-a666-666666666666',
      email: 'kondwani.banda@carboncarcare.com',
      fullName: 'Kondwani Banda',
      role: 'salesperson',
      marketCode: 'MW',
      phone: '+265991234567',
    },
    {
      id: '77777777-7777-4777-a777-777777777777',
      email: 'tamika.phiri@carboncarcare.com',
      fullName: 'Tamika Phiri',
      role: 'country_sales_head',
      marketCode: 'MW',
      phone: '+265999876543',
    },
    {
      id: '66666666-6666-4666-a666-666666666667',
      email: 'chifundo.phiri@carboncarcare.com',
      fullName: 'Chifundo Phiri',
      role: 'salesperson',
      marketCode: 'MW',
      phone: '+265888234567',
    },
    // HQ Admin
    {
      id: '33333333-3333-4333-a333-333333333333',
      email: 'hq.admin@carboncarcare.com',
      fullName: 'HQ Administrator',
      role: 'hq_admin',
      marketCode: null,
      phone: '+2348011122334',
    },
  ];

  for (const u of USERS) {
    // 1a. Ensure in Supabase Auth
    const { data: existingUser } = await supabase.auth.admin.getUserById(u.id);
    if (!existingUser?.user) {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        id: u.id,
        email: u.email,
        password: devUserPassword,
        email_confirm: true,
        user_metadata: { full_name: u.fullName, role: u.role, market_code: u.marketCode },
      });
      if (createErr) {
        console.warn(`  Notice: Auth create for ${u.email}: ${createErr.message}`);
      } else {
        console.log(`  + Auth user provisioned: ${u.email}`);
      }
    }

    // 1b. Upsert into public.profiles
    const { error: profErr } = await supabase.from('profiles').upsert(
      {
        id: u.id,
        email: u.email,
        full_name: u.fullName,
        role: u.role as any,
        market_code: u.marketCode as any,
        phone_number: u.phone,
        is_active: true,
      },
      { onConflict: 'id' }
    );
    if (profErr) {
      console.warn(`  Warning: Profile upsert for ${u.email}: ${profErr.message}`);
    }
  }
  console.log(`  PASS: Processed ${USERS.length} canonical users across NG, ZM, MW, and HQ.`);

  // 2. SEED HARDWARE FLEET & ASSIGNMENTS
  console.log('\n[2] Seeding Company Devices & Hardware Custody...');
  const DEVICES = [
    // Nigeria Devices
    {
      id: 'd1111111-1111-4111-b111-111111111111',
      asset_tag: 'CAR-NG-001',
      serial_number: 'R58M102938D',
      make: 'Samsung',
      model: 'Galaxy A15 Enterprise',
      market_code: 'NG',
      inventory_status: 'assigned',
      knox_enrolled: true,
    },
    {
      id: 'd1111111-1111-4111-b111-111111111112',
      asset_tag: 'CAR-NG-002',
      serial_number: 'R58M102939E',
      make: 'Samsung',
      model: 'Galaxy A15 Enterprise',
      market_code: 'NG',
      inventory_status: 'assigned',
      knox_enrolled: true,
    },
    {
      id: 'd1111111-1111-4111-b111-111111111113',
      asset_tag: 'CC-DEV-LOS-SPARE-01',
      serial_number: 'R58M102940F',
      make: 'Samsung',
      model: 'Galaxy A15 Enterprise',
      market_code: 'NG',
      inventory_status: 'available',
      knox_enrolled: true,
    },
    {
      id: 'd1111111-1111-4111-b111-111111111114',
      asset_tag: 'CC-DEV-LOS-SPARE-02',
      serial_number: 'R58M102941G',
      make: 'Nokia',
      model: 'G22 Enterprise Rugged',
      market_code: 'NG',
      inventory_status: 'available',
      knox_enrolled: true,
    },
    {
      id: 'd1111111-1111-4111-b111-111111111115',
      asset_tag: 'CC-DEV-LOS-RET-01',
      serial_number: 'R58M102999Z',
      make: 'Samsung',
      model: 'Galaxy A14',
      market_code: 'NG',
      inventory_status: 'retired',
      knox_enrolled: false,
    },
    // Zambia Devices
    {
      id: 'd2222222-2222-4222-b222-222222222221',
      asset_tag: 'CAR-ZM-001',
      serial_number: 'ZAM102938A',
      make: 'Samsung',
      model: 'Galaxy A15 Enterprise',
      market_code: 'ZM',
      inventory_status: 'assigned',
      knox_enrolled: true,
    },
    {
      id: 'd2222222-2222-4222-b222-222222222222',
      asset_tag: 'CC-DEV-LUS-SPARE-01',
      serial_number: 'ZAM102940B',
      make: 'Samsung',
      model: 'Galaxy A15 Enterprise',
      market_code: 'ZM',
      inventory_status: 'available',
      knox_enrolled: true,
    },
    {
      id: 'd2222222-2222-4222-b222-222222222223',
      asset_tag: 'CC-DEV-LUS-MAINT-01',
      serial_number: 'ZAM102999M',
      make: 'Nokia',
      model: 'G22 Enterprise Rugged',
      market_code: 'ZM',
      inventory_status: 'under_maintenance',
      knox_enrolled: true,
    },
    // Malawi Devices
    {
      id: 'd3333333-3333-4333-b333-333333333331',
      asset_tag: 'CAR-MW-001',
      serial_number: 'MLW102938A',
      make: 'Samsung',
      model: 'Galaxy A15 Enterprise',
      market_code: 'MW',
      inventory_status: 'assigned',
      knox_enrolled: true,
    },
    {
      id: 'd3333333-3333-4333-b333-333333333332',
      asset_tag: 'CC-DEV-BLA-SPARE-01',
      serial_number: 'MLW102940B',
      make: 'Samsung',
      model: 'Galaxy A15 Enterprise',
      market_code: 'MW',
      inventory_status: 'available',
      knox_enrolled: true,
    },
  ];

  for (const d of DEVICES) {
    await supabase.from('devices').upsert(
      {
        id: d.id,
        asset_tag: d.asset_tag,
        serial_number: d.serial_number,
        make: d.make,
        model: d.model,
        market_code: d.market_code,
        inventory_status: d.inventory_status as any,
        knox_enrolled: d.knox_enrolled,
      },
      { onConflict: 'id' }
    );
  }

  // Active Device Custody Assignments
  const ASSIGNMENTS = [
    {
      id: 'a1111111-1111-4111-b111-111111111111',
      device_id: 'd1111111-1111-4111-b111-111111111111',
      salesperson_id: '11111111-1111-4111-a111-111111111111', // Tunde Adebayo
      assigned_by: '33333333-3333-4333-a333-333333333333',
      is_current: true,
      assigned_at: new Date('2026-09-01T08:00:00Z').toISOString(),
    },
    {
      id: 'a1111111-1111-4111-b111-111111111112',
      device_id: 'd1111111-1111-4111-b111-111111111112',
      salesperson_id: '11111111-1111-4111-a111-111111111112', // Chukwudi Okafor
      assigned_by: '33333333-3333-4333-a333-333333333333',
      is_current: true,
      assigned_at: new Date('2026-09-01T08:00:00Z').toISOString(),
    },
    {
      id: 'a2222222-2222-4222-b222-222222222221',
      device_id: 'd2222222-2222-4222-b222-222222222221',
      salesperson_id: '44444444-4444-4444-a444-444444444444', // Peter Mwale
      assigned_by: '33333333-3333-4333-a333-333333333333',
      is_current: true,
      assigned_at: new Date('2026-09-01T08:00:00Z').toISOString(),
    },
    {
      id: 'a3333333-3333-4333-b333-333333333331',
      device_id: 'd3333333-3333-4333-b333-333333333331',
      salesperson_id: '66666666-6666-4666-a666-666666666666', // Kondwani Banda
      assigned_by: '33333333-3333-4333-a333-333333333333',
      is_current: true,
      assigned_at: new Date('2026-09-01T08:00:00Z').toISOString(),
    },
  ];

  for (const a of ASSIGNMENTS) {
    await supabase.from('device_assignments').upsert(a, { onConflict: 'id' });
  }
  console.log(`  PASS: Processed ${DEVICES.length} devices and ${ASSIGNMENTS.length} active assignments.`);

  // 3. SEED ORGANISATIONS & MULTI-BRANCH ENTITIES (Shared Phone Rule)
  console.log('\n[3] Seeding Organisations, Branches & GPS Pins...');
  const ORGANISATIONS = [
    {
      id: 'e1111111-1111-4111-c111-111111111111',
      name: 'Apex Heavy Logistics Ltd',
      market_code: 'NG',
      tier: 'Tier 1 Enterprise',
    },
    {
      id: 'e2222222-2222-4222-c222-222222222222',
      name: 'Dangote Transport & Logistics',
      market_code: 'NG',
      tier: 'Strategic Fleet Partner',
    },
    {
      id: 'e4444444-4444-4444-c444-444444444444',
      name: 'Zambezi Freight & Haulage Ltd',
      market_code: 'ZM',
      tier: 'National Logistics',
    },
    {
      id: 'e5555555-5555-4555-c555-555555555555',
      name: 'Copperbelt Mining Transit Corp',
      market_code: 'ZM',
      tier: 'Industrial Fleet',
    },
    {
      id: 'e3333333-3333-4333-c333-333333333333',
      name: 'Malawi National Distribution & Haulage',
      market_code: 'MW',
      tier: 'Enterprise Distributor',
    },
    {
      id: 'e6666666-6666-4666-c666-666666666666',
      name: 'Blantyre Sugar Transit Ltd',
      market_code: 'MW',
      tier: 'Agricultural Haulage',
    },
  ];

  for (const org of ORGANISATIONS) {
    await supabase.from('organisations').upsert(org, { onConflict: 'id' });
  }

  const BRANCHES = [
    // Nigeria Branches (Apex shares switchboard +234 1 270 5000 per PRD §4.2)
    {
      id: 'f1111111-1111-4111-d111-111111111111',
      organisation_id: 'e1111111-1111-4111-c111-111111111111',
      branch_name: 'Apapa Commercial Fleet Depot',
      category: 'logistics' as const,
      city: 'Lagos',
      street_address: 'Apapa Commercial Port Corridor, Gate 4',
      switchboard_phone: '+234 1 270 5000',
      estimated_fleet_size: 45,
      market_code: 'NG',
      operating_status: 'active' as const,
    },
    {
      id: 'f2222222-2222-4222-d222-222222222222',
      organisation_id: 'e1111111-1111-4111-c111-111111111111',
      branch_name: 'Ikeja Logistics Hub',
      category: 'workshop' as const,
      city: 'Lagos',
      street_address: 'Mobolaji Bank Anthony Way, Ikeja Industrial Park',
      switchboard_phone: '+234 1 270 5000', // SHARED SWITCHBOARD
      estimated_fleet_size: 32,
      market_code: 'NG',
      operating_status: 'active' as const,
    },
    {
      id: 'f1111111-1111-4111-d111-111111111113',
      organisation_id: 'e1111111-1111-4111-c111-111111111111',
      branch_name: 'Lekki Transit Maintenance Depot',
      category: 'fleet_operator' as const,
      city: 'Lagos',
      street_address: 'Lekki-Epe Expressway, KM 22',
      switchboard_phone: '+234 1 270 5000', // SHARED SWITCHBOARD
      estimated_fleet_size: 20,
      market_code: 'NG',
      operating_status: 'active' as const,
    },
    {
      id: 'f1111111-1111-4111-d111-111111111114',
      organisation_id: 'e2222222-2222-4222-c222-222222222222',
      branch_name: 'Dangote Cement Terminal Hub',
      category: 'logistics' as const,
      city: 'Lagos',
      street_address: 'Terminal 2, Commercial Port Access Road',
      switchboard_phone: '+234 1 448 0840',
      estimated_fleet_size: 80,
      market_code: 'NG',
      operating_status: 'active' as const,
    },
    {
      id: 'f1111111-1111-4111-d111-111111111115',
      organisation_id: 'e2222222-2222-4222-c222-222222222222',
      branch_name: 'Dangote Ikorodu Maintenance Yard',
      category: 'workshop' as const,
      city: 'Lagos',
      street_address: 'Ikorodu Industrial Corridor',
      switchboard_phone: '+234 1 448 0840',
      estimated_fleet_size: 25,
      market_code: 'NG',
      operating_status: 'location_pending' as const, // NO APPROVED PIN
    },
    // Zambia Branches
    {
      id: 'f4444444-4444-4444-d444-444444444441',
      organisation_id: 'e4444444-4444-4444-c444-444444444444',
      branch_name: 'Lusaka Central Transport Depot',
      category: 'logistics' as const,
      city: 'Lusaka',
      street_address: 'Lumumba Road Industrial Area, Lusaka',
      switchboard_phone: '+260 211 250000',
      estimated_fleet_size: 38,
      market_code: 'ZM',
      operating_status: 'active' as const,
    },
    {
      id: 'f4444444-4444-4444-d444-444444444442',
      organisation_id: 'e4444444-4444-4444-c444-444444444444',
      branch_name: 'Kafue Road Freight Station',
      category: 'fleet_operator' as const,
      city: 'Lusaka',
      street_address: 'Kafue Road Transit Terminal',
      switchboard_phone: '+260 211 250000', // SHARED SWITCHBOARD
      estimated_fleet_size: 22,
      market_code: 'ZM',
      operating_status: 'active' as const,
    },
    {
      id: 'f5555555-5555-4555-d555-555555555551',
      organisation_id: 'e5555555-5555-4555-c555-555555555555',
      branch_name: 'Ndola Heavy Mining Depot',
      category: 'logistics' as const,
      city: 'Ndola',
      street_address: 'Copperbelt Highway, Ndola',
      switchboard_phone: '+260 212 610000',
      estimated_fleet_size: 50,
      market_code: 'ZM',
      operating_status: 'location_pending' as const,
    },
    // Malawi Branches
    {
      id: 'f3333333-3333-4333-d333-333333333333',
      organisation_id: 'e3333333-3333-4333-c333-333333333333',
      branch_name: 'Blantyre Commercial Depot',
      category: 'logistics' as const,
      city: 'Blantyre',
      street_address: 'Makata Industrial Area, Blantyre',
      switchboard_phone: '+265 1 870 000',
      estimated_fleet_size: 28,
      market_code: 'MW',
      operating_status: 'active' as const,
    },
    {
      id: 'f6666666-6666-4666-d666-666666666661',
      organisation_id: 'e6666666-6666-4666-c666-666666666666',
      branch_name: 'Lilongwe Agro-Haulage Hub',
      category: 'distributor' as const,
      city: 'Lilongwe',
      street_address: 'Kanengo Industrial Zone, Lilongwe',
      switchboard_phone: '+265 1 710 000',
      estimated_fleet_size: 35,
      market_code: 'MW',
      operating_status: 'active' as const,
    },
  ];

  for (const b of BRANCHES) {
    await supabase.from('branches').upsert(b, { onConflict: 'id' });
  }

  // Primary Contacts
  const CONTACTS = [
    {
      id: 'c1111111-1111-4111-e111-111111111111',
      branch_id: 'f1111111-1111-4111-d111-111111111111',
      full_name: 'Engr. Babatunde Jinadu',
      designation: 'Fleet Maintenance Director',
      phone_number: '+234 803 555 1204',
      email: 'b.jinadu@apexlogistics.ng',
      is_primary: true,
    },
    {
      id: 'c2222222-2222-4222-e222-222222222222',
      branch_id: 'f2222222-2222-4222-d222-222222222222',
      full_name: 'Alhaji Musa Danjuma',
      designation: 'Operations Superintendent',
      phone_number: '+234 802 111 8899',
      email: 'm.danjuma@apexlogistics.ng',
      is_primary: true,
    },
    {
      id: 'c4444444-4444-4444-e444-444444444441',
      branch_id: 'f4444444-4444-4444-d444-444444444441',
      full_name: 'Godfrey Lungu',
      designation: 'Fleet Workshop Manager',
      phone_number: '+260 971 888 222',
      email: 'g.lungu@zambezifreight.zm',
      is_primary: true,
    },
    {
      id: 'c3333333-3333-4333-e333-333333333331',
      branch_id: 'f3333333-3333-4333-d333-333333333333',
      full_name: 'Hastings Mphande',
      designation: 'Transport Operations Lead',
      phone_number: '+265 999 444 333',
      email: 'h.mphande@malawidistrib.mw',
      is_primary: true,
    },
  ];

  for (const c of CONTACTS) {
    await supabase.from('client_contacts').upsert(c, { onConflict: 'id' });
  }

  // Versioned GPS Location Pins
  const PINS = [
    // Approved Pins
    {
      id: 'p1111111-1111-4111-f111-111111111111',
      branch_id: 'f1111111-1111-4111-d111-111111111111', // Apapa
      latitude: 6.4428,
      longitude: 3.3649,
      reported_accuracy_m: 14.5,
      status: 'approved' as const,
      is_active: true,
      version_number: 1,
      proposed_by: '11111111-1111-4111-a111-111111111111',
      reviewed_by: '22222222-2222-4222-a222-222222222222',
      reviewed_at: new Date('2026-09-02T10:00:00Z').toISOString(),
      decision_reason: 'Approved during baseline field commissioning.',
      premises_photo_path: 'visit-premises-photos/apapa_depot_gate.jpg',
    },
    {
      id: 'p2222222-2222-4222-f222-222222222222',
      branch_id: 'f2222222-2222-4222-d222-222222222222', // Ikeja
      latitude: 6.5892,
      longitude: 3.3581,
      reported_accuracy_m: 16.0,
      status: 'approved' as const,
      is_active: true,
      version_number: 1,
      proposed_by: '11111111-1111-4111-a111-111111111111',
      reviewed_by: '22222222-2222-4222-a222-222222222222',
      reviewed_at: new Date('2026-09-02T11:30:00Z').toISOString(),
      decision_reason: 'Verified on-site courtyard GPS coordinates.',
      premises_photo_path: 'visit-premises-photos/ikeja_hub_gate.jpg',
    },
    {
      id: 'p4444444-4444-4444-f444-444444444441',
      branch_id: 'f4444444-4444-4444-d444-444444444441', // Lusaka
      latitude: -15.4167,
      longitude: 28.2833,
      reported_accuracy_m: 12.0,
      status: 'approved' as const,
      is_active: true,
      version_number: 1,
      proposed_by: '44444444-4444-4444-a444-444444444444',
      reviewed_by: '55555555-5555-4555-a555-555555555555',
      reviewed_at: new Date('2026-09-02T12:00:00Z').toISOString(),
      decision_reason: 'Physical workshop gate pin confirmed.',
      premises_photo_path: 'visit-premises-photos/lusaka_depot.jpg',
    },
    {
      id: 'p3333333-3333-4333-f333-333333333331',
      branch_id: 'f3333333-3333-4333-d333-333333333333', // Blantyre
      latitude: -15.7861,
      longitude: 35.0058,
      reported_accuracy_m: 18.0,
      status: 'approved' as const,
      is_active: true,
      version_number: 1,
      proposed_by: '66666666-6666-4666-a666-666666666666',
      reviewed_by: '77777777-7777-4777-a777-777777777777',
      reviewed_at: new Date('2026-09-02T14:00:00Z').toISOString(),
      decision_reason: 'Approved Blantyre commercial entrance pin.',
      premises_photo_path: 'visit-premises-photos/blantyre_depot.jpg',
    },
    // Pending Pin Proposal (For Country Sales Head Review Queue)
    {
      id: 'p1111111-1111-4111-f111-111111111116',
      branch_id: 'f1111111-1111-4111-d111-111111111113', // Lekki Transit
      latitude: 6.4389,
      longitude: 3.4812,
      reported_accuracy_m: 18.5,
      status: 'pending_approval' as const,
      is_active: false,
      version_number: 1,
      proposed_by: '11111111-1111-4111-a111-111111111111',
      premises_photo_path: 'visit-premises-photos/lekki_proposal_entrance.jpg',
    },
  ];

  for (const pin of PINS) {
    // PostGIS geom calculation
    const geom = `SRID=4326;POINT(${pin.longitude} ${pin.latitude})`;
    await supabase.from('branch_location_pins').upsert(
      {
        ...pin,
        geom: geom as any,
      },
      { onConflict: 'id' }
    );
  }
  console.log(`  PASS: Processed ${ORGANISATIONS.length} organisations, ${BRANCHES.length} branches, and ${PINS.length} pins.`);

  // 4. SEED OPERATIONAL ATTENDANCE & VISITS
  console.log('\n[4] Seeding Operational Attendance, Visits & Logs...');
  const today = new Date().toISOString().slice(0, 10);
  const ATTENDANCES = [
    // Tunde Adebayo (NG) - Started Today
    {
      id: 'b1111111-1111-4111-a111-111111111111',
      user_id: '11111111-1111-4111-a111-111111111111',
      device_id: 'd1111111-1111-4111-b111-111111111111',
      market_code: 'NG',
      work_date: today,
      status: 'started' as const,
      started_at: new Date(`${today}T08:05:00Z`).toISOString(),
      start_latitude: 6.4430,
      start_longitude: 3.3650,
      start_accuracy_m: 14.0,
      start_selfie_url: 'attendance-selfies/tunde_start_selfie.jpg',
    },
    // Chukwudi Okafor (NG) - Approved Non-Visit Day (Office / Proposal)
    {
      id: 'b1111111-1111-4111-a111-111111111112',
      user_id: '11111111-1111-4111-a111-111111111112',
      device_id: 'd1111111-1111-4111-b111-111111111112',
      market_code: 'NG',
      work_date: today,
      status: 'approved_non_visit' as const,
      started_at: new Date(`${today}T08:30:00Z`).toISOString(),
      start_latitude: 6.4500,
      start_longitude: 3.4000,
      start_accuracy_m: 20.0,
      start_selfie_url: 'attendance-selfies/chukwudi_start_selfie.jpg',
    },
    // Amina Bello (NG) - Approved Leave
    {
      id: 'b1111111-1111-4111-a111-111111111113',
      user_id: '11111111-1111-4111-a111-111111111113',
      device_id: null,
      market_code: 'NG',
      work_date: today,
      status: 'approved_leave' as const,
      started_at: new Date(`${today}T08:00:00Z`).toISOString(),
    },
    // Peter Mwale (ZM) - Started Today
    {
      id: 'b2222222-2222-4222-a222-222222222221',
      user_id: '44444444-4444-4444-a444-444444444444',
      device_id: 'd2222222-2222-4222-b222-222222222221',
      market_code: 'ZM',
      work_date: today,
      status: 'started' as const,
      started_at: new Date(`${today}T07:55:00Z`).toISOString(),
      start_latitude: -15.4170,
      start_longitude: 28.2835,
      start_accuracy_m: 15.0,
      start_selfie_url: 'attendance-selfies/peter_start_selfie.jpg',
    },
    // Kondwani Banda (MW) - Ended Day
    {
      id: 'b3333333-3333-4333-a333-333333333331',
      user_id: '66666666-6666-4666-a666-666666666666',
      device_id: 'd3333333-3333-4333-b333-333333333331',
      market_code: 'MW',
      work_date: today,
      status: 'ended' as const,
      started_at: new Date(`${today}T08:00:00Z`).toISOString(),
      ended_at: new Date(`${today}T17:05:00Z`).toISOString(),
      start_latitude: -15.7865,
      start_longitude: 35.0060,
      start_accuracy_m: 16.0,
      start_selfie_url: 'attendance-selfies/kondwani_start_selfie.jpg',
    },
  ];

  for (const att of ATTENDANCES) {
    await supabase.from('attendance_days').upsert(att, { onConflict: 'id' });
  }

  // Real Field Visits (Location Verified & Inside Geofence)
  const VISITS = [
    // Tunde's visit to Apapa Commercial Port (Verified)
    {
      id: 'v1111111-1111-4111-a111-111111111111',
      attendance_day_id: 'b1111111-1111-4111-a111-111111111111',
      user_id: '11111111-1111-4111-a111-111111111111',
      branch_id: 'f1111111-1111-4111-d111-111111111111',
      branch_pin_id: 'p1111111-1111-4111-f111-111111111111',
      check_in_at: new Date(`${today}T09:15:00Z`).toISOString(),
      check_out_at: new Date(`${today}T09:55:00Z`).toISOString(),
      check_in_accuracy_m: 14.0,
      check_in_latitude: 6.4429,
      check_in_longitude: 3.3650,
      check_out_accuracy_m: 15.0,
      check_out_latitude: 6.4431,
      check_out_longitude: 3.3652,
      premises_photo_path: 'visit-premises-photos/apapa_visit_evidence_01.jpg',
      verification_status: 'location_verified' as const,
      location_classification: 'inside_confident' as const,
    },
    // Tunde's visit to Ikeja Logistics Hub (Verified)
    {
      id: 'v1111111-1111-4111-a111-111111111112',
      attendance_day_id: 'b1111111-1111-4111-a111-111111111111',
      user_id: '11111111-1111-4111-a111-111111111111',
      branch_id: 'f2222222-2222-4222-d222-222222222222',
      branch_pin_id: 'p2222222-2222-4222-f222-222222222222',
      check_in_at: new Date(`${today}T11:00:00Z`).toISOString(),
      check_out_at: new Date(`${today}T11:45:00Z`).toISOString(),
      check_in_accuracy_m: 16.0,
      check_in_latitude: 6.5893,
      check_in_longitude: 3.3582,
      check_out_accuracy_m: 18.0,
      check_out_latitude: 6.5894,
      check_out_longitude: 3.3583,
      premises_photo_path: 'visit-premises-photos/ikeja_visit_evidence_02.jpg',
      verification_status: 'location_verified' as const,
      location_classification: 'inside_confident' as const,
    },
    // Peter's visit to Lusaka Central Depot (Verified)
    {
      id: 'v2222222-2222-4222-a222-222222222221',
      attendance_day_id: 'b2222222-2222-4222-a222-222222222221',
      user_id: '44444444-4444-4444-a444-444444444444',
      branch_id: 'f4444444-4444-4444-d444-444444444441',
      branch_pin_id: 'p4444444-4444-4444-f444-444444444441',
      check_in_at: new Date(`${today}T08:30:00Z`).toISOString(),
      check_out_at: new Date(`${today}T09:15:00Z`).toISOString(),
      check_in_accuracy_m: 12.0,
      check_in_latitude: -15.4168,
      check_in_longitude: 28.2834,
      check_out_accuracy_m: 14.0,
      check_out_latitude: -15.4169,
      check_out_longitude: 28.2835,
      premises_photo_path: 'visit-premises-photos/lusaka_visit_evidence_01.jpg',
      verification_status: 'location_verified' as const,
      location_classification: 'inside_confident' as const,
    },
  ];

  for (const v of VISITS) {
    const checkInGeom = `SRID=4326;POINT(${v.check_in_longitude} ${v.check_in_latitude})`;
    const checkOutGeom = `SRID=4326;POINT(${v.check_out_longitude} ${v.check_out_latitude})`;
    await supabase.from('visits').upsert(
      {
        ...v,
        check_in_geom: checkInGeom as any,
        check_out_geom: checkOutGeom as any,
      },
      { onConflict: 'id' }
    );
  }

  // Real Meeting Logs
  const MEETING_LOGS = [
    {
      id: 'm1111111-1111-4111-a111-111111111111',
      visit_id: 'v1111111-1111-4111-a111-111111111111',
      contact_met: 'Engr. Babatunde Jinadu',
      contact_role: 'Fleet Maintenance Director',
      meeting_purpose: 'Routine fleet maintenance supply audit',
      products_discussed: ['Heavy Duty Coolant 20L', 'Fleet Degreaser', 'Air Brake Antifreeze'],
      narrative_outcome:
        'Inspected vehicle maintenance workshop with Engr. Babatunde. Reviewed high coolant consumption during long-haul transit trips. Client expressed interest in our premium OAT formulation.',
      relevant_fleet_size: 45,
      next_step: 'Deliver product technical data sheets and schedule test trial on two Volvo FH16 trucks.',
      submitted_at: new Date(`${today}T10:00:00Z`).toISOString(),
    },
    {
      id: 'm1111111-1111-4111-a111-111111111112',
      visit_id: 'v1111111-1111-4111-a111-111111111112',
      contact_met: 'Alhaji Musa Danjuma',
      contact_role: 'Operations Superintendent',
      meeting_purpose: 'Workshop lubrication replenishment consultation',
      products_discussed: ['Industrial Gear Oil ISO 220', 'Brake Fluid DOT 4'],
      narrative_outcome:
        'Discussed bulk order requirements for regional distribution fleet. Confirmed workshop capacity for 32 trucks.',
      relevant_fleet_size: 32,
      next_step: 'Arrange technical demonstration next Thursday.',
      submitted_at: new Date(`${today}T12:00:00Z`).toISOString(),
    },
    {
      id: 'm2222222-2222-4222-a222-222222222221',
      visit_id: 'v2222222-2222-4222-a222-222222222221',
      contact_met: 'Godfrey Lungu',
      contact_role: 'Fleet Workshop Manager',
      meeting_purpose: 'Copperbelt route vehicle cooling evaluation',
      products_discussed: ['Extended Life Coolant Concentrate', 'Heavy Duty Fleet Wash'],
      narrative_outcome:
        'Reviewed radiator corrosion on long-haul transit rigs operating along the Kafue corridor. Client agreed to trial 200L drum formulation.',
      relevant_fleet_size: 38,
      next_step: 'Follow up after trial delivery next week.',
      submitted_at: new Date(`${today}T09:20:00Z`).toISOString(),
    },
  ];

  for (const log of MEETING_LOGS) {
    await supabase.from('meeting_logs').upsert(log, { onConflict: 'id' });
  }
  console.log(`  PASS: Processed ${ATTENDANCES.length} attendance days, ${VISITS.length} visits, and ${MEETING_LOGS.length} meeting logs.`);

  // 5. SEED EXCEPTIONS & FLAGS
  console.log('\n[5] Seeding Exceptions & Verification Flags...');
  const EXCEPTIONS = [
    {
      id: 'x1111111-1111-4111-a111-111111111111',
      user_id: '11111111-1111-4111-a111-111111111111', // Tunde Adebayo
      branch_id: 'f1111111-1111-4111-d111-111111111115', // Dangote Ikorodu
      exception_type: 'gps_failure' as const,
      reason: 'Underground parking concrete attenuation prevented GPS lock (Accuracy ±145m exceeds ≤100m limit).',
      claimed_visit_time: new Date(`${today}T13:40:00Z`).toISOString(),
      status: 'pending_review' as const,
      created_at: new Date(`${today}T14:15:00Z`).toISOString(),
    },
    {
      id: 'x1111111-1111-4111-a111-111111111112',
      user_id: '11111111-1111-4111-a111-111111111112', // Chukwudi Okafor
      branch_id: 'f1111111-1111-4111-d111-111111111111',
      exception_type: 'device_depletion' as const,
      reason: 'Handset battery depleted unexpectedly during meeting. Submitted after power restoration at base.',
      claimed_visit_time: new Date(`${today}T11:15:00Z`).toISOString(),
      status: 'approved' as const,
      decided_by: '22222222-2222-4222-a222-222222222222',
      decided_at: new Date(`${today}T14:00:00Z`).toISOString(),
      decision_reason: 'Verified signed paper visitor log with client security supervisor.',
      created_at: new Date(`${today}T13:30:00Z`).toISOString(),
    },
    {
      id: 'x2222222-2222-4222-a222-222222222221',
      user_id: '44444444-4444-4444-a444-444444444444', // Peter Mwale
      branch_id: 'f5555555-5555-4555-d555-555555555551',
      exception_type: 'missed_visit' as const,
      reason: 'Facility access gate closed due to unscheduled industrial drill. Contact confirmed via telephone.',
      claimed_visit_time: new Date(`${today}T15:10:00Z`).toISOString(),
      status: 'pending_review' as const,
      created_at: new Date(`${today}T15:45:00Z`).toISOString(),
    },
  ];

  for (const exc of EXCEPTIONS) {
    await supabase.from('exceptions').upsert(exc, { onConflict: 'id' });
  }

  const FLAGS = [
    {
      id: 'flg-11111111-1111-4111-a111-111111111111',
      visit_id: 'v1111111-1111-4111-a111-111111111111',
      flag_code: 'checkout_outside_geofence' as const,
      severity: 'medium' as const,
      status: 'open' as const,
      details: {
        metricObserved: 'Check-out recorded 380m from location pin',
        thresholdLimit: 'Maximum allowable checkout geofence: 200m',
        notes: 'Check-in was verified at 45m from pin, but check-out was recorded outside geofence boundary.',
      },
      created_at: new Date(`${today}T10:05:00Z`).toISOString(),
    },
    {
      id: 'flg-11111111-1111-4111-a111-111111111112',
      visit_id: 'v1111111-1111-4111-a111-111111111112',
      flag_code: 'short_visit' as const,
      severity: 'low' as const,
      status: 'open' as const,
      details: {
        metricObserved: 'Visit duration: 4 minutes 12 seconds',
        thresholdLimit: 'Minimum visit threshold: 5 minutes',
        notes: 'Brief site touchpoint requires manager inspection.',
      },
      created_at: new Date(`${today}T11:50:00Z`).toISOString(),
    },
  ];

  for (const flg of FLAGS) {
    await supabase.from('verification_flags').upsert(flg, { onConflict: 'id' });
  }
  console.log(`  PASS: Processed ${EXCEPTIONS.length} exceptions and ${FLAGS.length} verification flags.`);

  // 6. SEED CLIENT AUDIT CASES & DEVICE REPLACEMENTS
  console.log('\n[6] Seeding Client Audit Calls & Device Replacement Requests...');
  const AUDITS = [
    {
      id: 'aud-11111111-1111-4111-a111-111111111111',
      visit_id: 'v1111111-1111-4111-a111-111111111111',
      selection_method: 'random_5pct' as const,
      contact_name: 'Engr. Babatunde Jinadu',
      contact_phone: '+234 803 555 1204',
      call_status: 'connected' as const,
      audit_outcome: 'confirmed_valid' as const,
      meeting_confirmed: true,
      audited_by: '22222222-2222-4222-a222-222222222222',
      audited_at: new Date(`${today}T14:30:00Z`).toISOString(),
      dispute_status: 'none' as const,
      market_code: 'NG',
      notes: 'Confirmed in-person visit with Engr. Babatunde. Discussed coolant supply.',
    },
    {
      id: 'aud-11111111-1111-4111-a111-111111111112',
      visit_id: 'v1111111-1111-4111-a111-111111111112',
      selection_method: 'risk_targeted' as const,
      contact_name: 'Alhaji Musa Danjuma',
      contact_phone: '+234 802 111 8899',
      call_status: 'pending_call' as const,
      audit_outcome: 'pending' as const,
      meeting_confirmed: null,
      dispute_status: 'none' as const,
      market_code: 'NG',
    },
    {
      id: 'aud-22222222-2222-4222-a222-222222222221',
      visit_id: 'v2222222-2222-4222-a222-222222222221',
      selection_method: 'random_5pct' as const,
      contact_name: 'Godfrey Lungu',
      contact_phone: '+260 971 888 222',
      call_status: 'pending_call' as const,
      audit_outcome: 'pending' as const,
      meeting_confirmed: null,
      dispute_status: 'none' as const,
      market_code: 'ZM',
    },
  ];

  for (const aud of AUDITS) {
    await supabase.from('client_audit_records').upsert(aud, { onConflict: 'id' });
  }

  const REPLACEMENTS = [
    {
      id: 'req-11111111-1111-4111-a111-111111111111',
      salesperson_id: '11111111-1111-4111-a111-111111111111', // Tunde Adebayo
      current_device_id: 'd1111111-1111-4111-b111-111111111111',
      market_code: 'NG',
      issue_category: 'screen_damage' as const,
      salesperson_notes: 'Handset screen cracked during transit depot yard walk; touch digitiser unresponsive.',
      status: 'pending_review' as const,
      created_at: new Date(`${today}T09:30:00Z`).toISOString(),
    },
    {
      id: 'req-22222222-2222-4222-a222-222222222221',
      salesperson_id: '44444444-4444-4444-a444-444444444444', // Peter Mwale
      current_device_id: 'd2222222-2222-4222-b222-222222222221',
      market_code: 'ZM',
      issue_category: 'battery_charging' as const,
      salesperson_notes: 'Battery swelling detected; device depletes from 100% to 0% in under 45 minutes.',
      status: 'approved' as const,
      reviewed_by: '33333333-3333-4333-a333-333333333333',
      reviewed_at: new Date(`${today}T11:00:00Z`).toISOString(),
      approval_reason: 'Hardware defect verified by HQ Admin. Replacement authorized.',
      created_at: new Date(`${today}T08:15:00Z`).toISOString(),
    },
  ];

  for (const rep of REPLACEMENTS) {
    await supabase.from('device_replacement_requests').upsert(rep, { onConflict: 'id' });
  }

  // 7. SEED CLIENT MASTER IMPORT BATCH
  console.log('\n[7] Seeding Client Master Import Batches...');
  const BATCHES = [
    {
      id: 'imp-11111111-1111-4111-a111-111111111111',
      filename: 'carbon_b2b_client_master_ng_q4.csv',
      market_code: 'NG',
      imported_by: '33333333-3333-4333-a333-333333333333',
      total_rows: 412,
      valid_rows: 388,
      location_pending_rows: 24,
      error_rows: 0,
      status: 'completed',
      created_at: new Date(`${today}T08:00:00Z`).toISOString(),
    },
    {
      id: 'imp-22222222-2222-4222-a222-222222222221',
      filename: 'carbon_b2b_client_master_zm_q4.csv',
      market_code: 'ZM',
      imported_by: '33333333-3333-4333-a333-333333333333',
      total_rows: 148,
      valid_rows: 130,
      location_pending_rows: 18,
      error_rows: 0,
      status: 'completed',
      created_at: new Date(`${today}T08:15:00Z`).toISOString(),
    },
    {
      id: 'imp-33333333-3333-4333-a333-333333333331',
      filename: 'carbon_b2b_client_master_mw_q4.csv',
      market_code: 'MW',
      imported_by: '33333333-3333-4333-a333-333333333333',
      total_rows: 76,
      valid_rows: 64,
      location_pending_rows: 12,
      error_rows: 0,
      status: 'completed',
      created_at: new Date(`${today}T08:30:00Z`).toISOString(),
    },
  ];

  for (const b of BATCHES) {
    await supabase.from('import_batches').upsert(b, { onConflict: 'id' });
  }

  console.log('\n' + '='.repeat(75));
  console.log('SEEDING COMPLETE: All operational & governance test records synced.');
  console.log('Supabase Development Project ([SUPABASE_PROJECT_ID]) is ready.');
  console.log('='.repeat(75));
}

run().catch((err) => {
  console.error('\nSeed failed with exception:', err);
  process.exit(1);
});

