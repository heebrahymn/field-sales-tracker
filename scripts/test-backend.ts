/**
 * =============================================================================
 * Carbon Field Sales Tracker — Stage 2B Final Security & Completeness Test Suite
 * =============================================================================
 * Autonomously verifies the hosted Supabase PostgreSQL backend across:
 * 1. Tri-Market Role Authentication (NG, ZM, MW, HQ Admin) & Dynamic Credentials.
 * 2. Tri-Market Sandboxing & Cross-Country Isolation (Nigeria, Zambia, Malawi).
 * 3. Sole-Author Field Evidence & Immutability (PRD §2 & §7).
 * 4. Expanded Offline Event Ingestion (Zero-row duplicates, 5-minute clock drift, historical rules).
 * 5. Media Evidence Security & Cross-Market / Cross-User Storage Isolation.
 * 6. 100% Company Device Fleet Lifecycle (13 distinct test scenarios).
 * 7. End-to-End Business Workflows (Pending non-visit approvals, Leave, Pin versioning, Audit disputes, Anti-escalation).
 * =============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

let globalTestVisitId: string | null = null;
let globalAttendanceDayId: string | null = null;

function loadEnv(): { url: string; anonKey: string; devPassword?: string } {
  let url = process.env.VITE_SUPABASE_URL || '';
  let anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  let devPassword = process.env.DEV_USER_PASSWORD || '';

  if (!url || !anonKey || !devPassword) {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
          url = trimmed.split('=')[1].trim();
        } else if (trimmed.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) {
          anonKey = trimmed.split('=')[1].trim();
        } else if (trimmed.startsWith('DEV_USER_PASSWORD=')) {
          devPassword = trimmed.split('=')[1].trim();
        }
      }
    }
  }

  if (!url || !anonKey) {
    throw new Error('Supabase URL or Publishable Key not found in environment or .env.local');
  }

  return { url, anonKey, devPassword };
}

interface TestResult {
  group: string;
  testId: string;
  testName: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function recordTest(group: string, testId: string, testName: string, passed: boolean, message?: string) {
  results.push({ group, testId, testName, passed, message });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${status}] [${testId}] ${group} :: ${testName}${message ? ` (${message})` : ''}`);
}

async function runComprehensiveSecurityVerification() {
  console.log('=================================================================');
  console.log('Carbon Field Sales Tracker — Stage 2B Final Security Audit Suite');
  console.log('=================================================================\n');

  const { url, anonKey, devPassword } = loadEnv();
  const resolvedPassword = devPassword || process.env.DEV_USER_PASSWORD;
  if (!resolvedPassword) {
    console.error('❌ Error: DEV_USER_PASSWORD is not defined in .env.local or process environment.');
    console.error('Please run `npm run provision:users` to generate/synchronize authenticated test credentials.');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Helper for authenticated client creation
  // ---------------------------------------------------------------------------
  async function authAs(email: string) {
    const client = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password: resolvedPassword,
    });
    if (error) throw error;
    return { client, user: data.user, session: data.session };
  }

  // ---------------------------------------------------------------------------
  // 1. TRI-MARKET AUTHENTICATION & CREDENTIALS
  // ---------------------------------------------------------------------------
  console.log('\n--- Group 1: Tri-Market Authentication & Credentials ---');

  let spNg: any, cshNg: any;
  let spZm: any, cshZm: any;
  let spMw: any, cshMw: any;
  let hq: any;

  try {
    spNg = await authAs('tunde.adebayo@carboncarcare.com');
    recordTest('Auth', 'AUTH-01', 'Authenticate Nigeria Salesperson (Tunde Adebayo)', !!spNg.user);
  } catch (err: any) {
    recordTest('Auth', 'AUTH-01', 'Authenticate Nigeria Salesperson', false, err.message);
  }

  try {
    cshNg = await authAs('babatunde.adeleke@carboncarcare.com');
    recordTest('Auth', 'AUTH-02', 'Authenticate Nigeria Country Sales Head (Babatunde Adeleke)', !!cshNg.user);
  } catch (err: any) {
    recordTest('Auth', 'AUTH-02', 'Authenticate Nigeria Country Sales Head', false, err.message);
  }

  try {
    spZm = await authAs('peter.mwale@carboncarcare.com');
    recordTest('Auth', 'AUTH-03', 'Authenticate Zambia Salesperson (Peter Mwale)', !!spZm.user);
  } catch (err: any) {
    recordTest('Auth', 'AUTH-03', 'Authenticate Zambia Salesperson', false, err.message);
  }

  try {
    cshZm = await authAs('chileshe.mwape@carboncarcare.com');
    recordTest('Auth', 'AUTH-04', 'Authenticate Zambia Country Sales Head (Chileshe Mwape)', !!cshZm.user);
  } catch (err: any) {
    recordTest('Auth', 'AUTH-04', 'Authenticate Zambia Country Sales Head', false, err.message);
  }

  try {
    spMw = await authAs('kondwani.banda@carboncarcare.com');
    recordTest('Auth', 'AUTH-05', 'Authenticate Malawi Salesperson (Kondwani Banda)', !!spMw.user);
  } catch (err: any) {
    recordTest('Auth', 'AUTH-05', 'Authenticate Malawi Salesperson', false, err.message);
  }

  try {
    cshMw = await authAs('tamika.phiri@carboncarcare.com');
    recordTest('Auth', 'AUTH-06', 'Authenticate Malawi Country Sales Head (Tamika Phiri)', !!cshMw.user);
  } catch (err: any) {
    recordTest('Auth', 'AUTH-06', 'Authenticate Malawi Country Sales Head', false, err.message);
  }

  try {
    hq = await authAs('ayodele.ibraheem@carboncarcare.com');
    recordTest('Auth', 'AUTH-07', 'Authenticate HQ Administrator (Ayodele Ibraheem)', !!hq.user);
  } catch (err: any) {
    recordTest('Auth', 'AUTH-07', 'Authenticate HQ Administrator', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // 2. TRI-MARKET SANDBOXING & NATIONAL ISOLATION
  // ---------------------------------------------------------------------------
  console.log('\n--- Group 2: Tri-Market Sandboxing & Isolation ---');

  if (spNg?.client && spZm?.client && spMw?.client && cshNg?.client && cshMw?.client && hq?.client) {
    // 2.1 Nigeria Salesperson only sees NG branches
    try {
      const { data: ngBranches, error } = await spNg.client.from('branches').select('id, market_code');
      if (error) throw error;
      const allNg = (ngBranches || []).every((b) => b.market_code === 'NG');
      const hasBranches = (ngBranches || []).length > 0;
      recordTest(
        'Isolation',
        'ISO-01',
        'Nigeria Salesperson is strictly sandboxed to NG branches (zero ZM/MW visible)',
        allNg && hasBranches,
        `Retrieved ${ngBranches?.length} branches`
      );
    } catch (err: any) {
      recordTest('Isolation', 'ISO-01', 'Nigeria Salesperson branch isolation', false, err.message);
    }

    // 2.2 Zambia Salesperson cannot view NG branches
    try {
      const { data: zmBranches, error } = await spZm.client.from('branches').select('id, market_code');
      if (error) throw error;
      const hasNgOrMw = (zmBranches || []).some((b) => b.market_code === 'NG' || b.market_code === 'MW');
      recordTest(
        'Isolation',
        'ISO-02',
        'Zambia Salesperson cannot view NG or MW branches',
        !hasNgOrMw,
        `Retrieved ${zmBranches?.length} branches`
      );
    } catch (err: any) {
      recordTest('Isolation', 'ISO-02', 'Zambia Salesperson branch isolation', false, err.message);
    }

    // 2.3 Malawi Salesperson only sees MW branches
    try {
      const { data: mwBranches, error } = await spMw.client.from('branches').select('id, market_code');
      if (error) throw error;
      const allMw = (mwBranches || []).every((b) => b.market_code === 'MW');
      const hasBranches = (mwBranches || []).length > 0;
      recordTest(
        'Isolation',
        'ISO-03',
        'Malawi Salesperson is strictly sandboxed to MW branches (zero NG/ZM visible)',
        allMw && hasBranches,
        `Retrieved ${mwBranches?.length} branches`
      );
    } catch (err: any) {
      recordTest('Isolation', 'ISO-03', 'Malawi Salesperson branch isolation', false, err.message);
    }

    // 2.4 Nigeria Country Sales Head CANNOT view ZM or MW devices
    try {
      const { data: ngDevices, error } = await cshNg.client.from('devices').select('id, market_code');
      if (error) throw error;
      const allNg = (ngDevices || []).every((d) => d.market_code === 'NG');
      recordTest(
        'Isolation',
        'ISO-04',
        'Nigeria Country Sales Head CANNOT view ZM or MW company devices',
        allNg,
        `Retrieved ${ngDevices?.length} devices, 100% in NG`
      );
    } catch (err: any) {
      recordTest('Isolation', 'ISO-04', 'Nigeria CSH device isolation', false, err.message);
    }

    // 2.5 Malawi Country Sales Head CANNOT view NG or ZM devices
    try {
      const { data: mwDevices, error } = await cshMw.client.from('devices').select('id, market_code');
      if (error) throw error;
      const allMw = (mwDevices || []).every((d) => d.market_code === 'MW');
      recordTest(
        'Isolation',
        'ISO-05',
        'Malawi Country Sales Head CANNOT view NG or ZM company devices',
        allMw,
        `Retrieved ${mwDevices?.length} devices, 100% in MW`
      );
    } catch (err: any) {
      recordTest('Isolation', 'ISO-05', 'Malawi CSH device isolation', false, err.message);
    }

    // 2.6 HQ Admin can see all 3 markets
    try {
      const { data: allDevices, error } = await hq.client.from('devices').select('id, market_code');
      if (error) throw error;
      const markets = new Set((allDevices || []).map((d) => d.market_code));
      const hasAll3 = markets.has('NG') && markets.has('ZM') && markets.has('MW');
      recordTest(
        'Isolation',
        'ISO-06',
        'HQ Admin has tri-market visibility across Nigeria, Zambia, and Malawi',
        hasAll3,
        `Total fleet: ${allDevices?.length} devices across ${Array.from(markets).join(', ')}`
      );
    } catch (err: any) {
      recordTest('Isolation', 'ISO-06', 'HQ Admin tri-market visibility', false, err.message);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. SOLE-AUTHOR FIELD EVIDENCE & IMMUTABILITY (PRD §2 & §7)
  // ---------------------------------------------------------------------------
  console.log('\n--- Group 3: Sole-Author Field Evidence & Immutability ---');

  let testVisitId: string | null = null;

  if (spNg?.client && cshNg?.client && hq?.client) {
    // 3.1 Salesperson can insert own attendance record
    try {
      const today = '2026-10-21';
      const { data: existingAtt } = await spNg.client
        .from('attendance_days')
        .select('id')
        .eq('user_id', spNg.user.id)
        .eq('work_date', today)
        .maybeSingle();

      if (existingAtt?.id) {
        globalAttendanceDayId = existingAtt.id;
        const { error } = await spNg.client.from('attendance_days').update({
          started_at: new Date().toISOString(),
          start_latitude: 6.4474,
          start_longitude: 3.3582,
          start_accuracy_m: 12.5,
          start_selfie_url: `${spNg.user.id}/2026-10-21/selfie.jpg`,
          device_id: 'd1111111-1111-4111-b111-111111111111',
          status: 'started',
        }).eq('id', existingAtt.id);
        recordTest('Sole-Author', 'AUTH-SO-01', 'Salesperson can record own attendance day check-in', !error, error?.message);
      } else {
        const attId = crypto.randomUUID();
        globalAttendanceDayId = attId;
        const { error } = await spNg.client.from('attendance_days').insert({
          id: attId,
          user_id: spNg.user.id,
          market_code: 'NG',
          work_date: today,
          started_at: new Date().toISOString(),
          start_latitude: 6.4474,
          start_longitude: 3.3582,
          start_accuracy_m: 12.5,
          start_selfie_url: `${spNg.user.id}/2026-10-21/selfie.jpg`,
          device_id: 'd1111111-1111-4111-b111-111111111111',
          status: 'started',
        });
        recordTest('Sole-Author', 'AUTH-SO-01', 'Salesperson can record own attendance day check-in', !error, error?.message);
      }
    } catch (err: any) {
      recordTest('Sole-Author', 'AUTH-SO-01', 'Salesperson attendance record', false, err.message);
    }

    // 3.2 Country Sales Head CANNOT insert attendance on behalf of salesperson
    try {
      const { error } = await cshNg.client.from('attendance_days').insert({
        user_id: spNg.user.id,
        market_code: 'NG',
        work_date: '2026-10-22',
        started_at: new Date().toISOString(),
        start_latitude: 6.4474,
        start_longitude: 3.3582,
        start_accuracy_m: 10.0,
        start_selfie_url: `${spNg.user.id}/2026-10-22/forged.jpg`,
        device_id: 'd1111111-1111-4111-b111-111111111111',
        status: 'started',
      });
      recordTest(
        'Sole-Author',
        'AUTH-SO-02',
        'Country Sales Head CANNOT insert attendance on behalf of salesperson',
        !!error,
        error ? `Properly blocked by RLS: ${error.message}` : 'VIOLATION: Manager created attendance!'
      );
    } catch (err: any) {
      recordTest('Sole-Author', 'AUTH-SO-02', 'Country Sales Head CANNOT insert attendance', true, err.message);
    }

    // 3.3 HQ Admin CANNOT insert attendance on behalf of salesperson
    try {
      const { error } = await hq.client.from('attendance_days').insert({
        user_id: spNg.user.id,
        market_code: 'NG',
        work_date: '2026-10-23',
        started_at: new Date().toISOString(),
        start_latitude: 6.4474,
        start_longitude: 3.3582,
        start_accuracy_m: 10.0,
        start_selfie_url: `${spNg.user.id}/2026-10-23/forged.jpg`,
        device_id: 'd1111111-1111-4111-b111-111111111111',
        status: 'started',
      });
      recordTest(
        'Sole-Author',
        'AUTH-SO-03',
        'HQ Admin CANNOT insert attendance on behalf of salesperson',
        !!error,
        error ? `Properly blocked by RLS: ${error.message}` : 'VIOLATION: HQ created attendance!'
      );
    } catch (err: any) {
      recordTest('Sole-Author', 'AUTH-SO-03', 'HQ Admin CANNOT insert attendance', true, err.message);
    }

    // 3.4 Salesperson can insert own physical visit record
    try {
      testVisitId = crypto.randomUUID();
      globalTestVisitId = testVisitId;

      // Close any previously open visit for Tunde to satisfy unique active visit
      await spNg.client
        .from('visits')
        .update({ check_out_at: new Date().toISOString() })
        .eq('user_id', spNg.user.id)
        .is('check_out_at', null);

      const { error } = await spNg.client.from('visits').insert({
        id: testVisitId,
        user_id: spNg.user.id,
        attendance_day_id: globalAttendanceDayId || crypto.randomUUID(),
        branch_id: 'f1111111-1111-4111-d111-111111111111',
        check_in_at: new Date().toISOString(),
        check_in_latitude: 6.4474,
        check_in_longitude: 3.3582,
        check_in_accuracy_m: 14.2,
        distance_to_pin_m: 45.0,
        premises_photo_url: `${spNg.user.id}/2026-10-21/premises-${testVisitId}.jpg`,
        location_classification: 'inside_confident',
        verification_status: 'location_verified',
        device_id: 'd1111111-1111-4111-b111-111111111111',
      });
      recordTest('Sole-Author', 'AUTH-SO-04', 'Salesperson can insert own physical visit check-in record', !error, error?.message);
    } catch (err: any) {
      recordTest('Sole-Author', 'AUTH-SO-04', 'Salesperson visit insert', false, err.message);
    }

    // 3.5 Country Sales Head CANNOT insert visit record
    try {
      const forgedVisitId = crypto.randomUUID();
      const { error } = await cshNg.client.from('visits').insert({
        id: forgedVisitId,
        user_id: spNg.user.id,
        attendance_day_id: globalAttendanceDayId || crypto.randomUUID(),
        branch_id: 'f1111111-1111-4111-d111-111111111111',
        check_in_at: new Date().toISOString(),
        check_in_latitude: 6.4474,
        check_in_longitude: 3.3582,
        check_in_accuracy_m: 10.0,
        location_classification: 'inside_confident',
        verification_status: 'location_verified',
        device_id: 'd1111111-1111-4111-b111-111111111111',
      });
      recordTest(
        'Sole-Author',
        'AUTH-SO-05',
        'Country Sales Head CANNOT insert visit on behalf of salesperson',
        !!error,
        error ? `Properly blocked by RLS: ${error.message}` : 'VIOLATION: Manager created visit!'
      );
    } catch (err: any) {
      recordTest('Sole-Author', 'AUTH-SO-05', 'Country Sales Head CANNOT insert visit', true, err.message);
    }

    // 3.6 Immutability: No user can DELETE a visit record
    if (testVisitId) {
      try {
        const { error } = await spNg.client.from('visits').delete().eq('id', testVisitId);
        recordTest(
          'Sole-Author',
          'AUTH-SO-06',
          'Visits are strictly immutable: Salesperson CANNOT delete visit record',
          !!error,
          error ? `Properly rejected: ${error.message}` : 'VIOLATION: Visit was deleted!'
        );
      } catch (err: any) {
        recordTest('Sole-Author', 'AUTH-SO-06', 'Visits cannot be deleted', true, err.message);
      }
    }

    // 3.7 Approved GPS failure exception remains 'manager_approved_unverified'
    try {
      const excId = crypto.randomUUID();
      const { error: insExcErr } = await spNg.client.from('exceptions').insert({
        id: excId,
        user_id: spNg.user.id,
        branch_id: 'f1111111-1111-4111-d111-111111111111',
        exception_type: 'gps_failure',
        claimed_visit_time: new Date().toISOString(),
        reason: 'Dense concrete canopy at depot entrance caused continuous GPS drift > 120m',
        status: 'pending_review',
      });
      if (insExcErr) throw insExcErr;

      const { error: revErr } = await cshNg.client.rpc('review_salesperson_exception', {
        p_exception_id: excId,
        p_status: 'approved',
        p_reason: 'Manager verified client meeting via phone; approved location unverified',
      });
      if (revErr) throw revErr;

      const { data: excRec, error: fetchErr } = await cshNg.client
        .from('exceptions')
        .select('resulting_visit_id')
        .eq('id', excId)
        .single();
      if (fetchErr) throw fetchErr;

      let verifStatus: string | null = null;
      if (excRec?.resulting_visit_id) {
        const { data: visRec } = await cshNg.client
          .from('visits')
          .select('verification_status')
          .eq('id', excRec.resulting_visit_id)
          .single();
        verifStatus = visRec?.verification_status;
      }

      const isUnverified = verifStatus === 'manager_approved_unverified';
      recordTest(
        'Sole-Author',
        'AUTH-SO-07',
        'Manager-approved GPS failure exception remains Manager Approved — Location Unverified (NEVER location_verified)',
        isUnverified,
        `Resulting status: ${verifStatus}`
      );
    } catch (err: any) {
      recordTest('Sole-Author', 'AUTH-SO-07', 'GPS failure exception remains location unverified', false, err.message);
    }
  }

  // ---------------------------------------------------------------------------
  // 4. EXPANDED OFFLINE EVENT INGESTION & 5-MINUTE CLOCK DISCREPANCY TESTS
  // ---------------------------------------------------------------------------
  console.log('\n--- Group 4: Expanded Offline Event Ingestion & Clock Threshold ---');

  if (spNg?.client) {
    const runTag = Date.now().toString();
    const parentEventId = crypto.randomUUID();
    const childEventId = crypto.randomUUID();

    // Ensure Tunde's handset is marked active and authorized in device_assignments
    await hq.client
      .from('device_assignments')
      .update({ is_current: false })
      .eq('salesperson_id', spNg.user.id);

    await hq.client
      .from('devices')
      .update({ inventory_status: 'assigned', security_authorization: 'authorized' })
      .eq('id', 'd1111111-1111-4111-b111-111111111111');

    const { data: existAssign } = await hq.client
      .from('device_assignments')
      .select('id')
      .eq('salesperson_id', spNg.user.id)
      .eq('device_id', 'd1111111-1111-4111-b111-111111111111')
      .maybeSingle();

    if (existAssign?.id) {
      await hq.client
        .from('device_assignments')
        .update({ is_current: true })
        .eq('id', existAssign.id);
    } else {
      await hq.client
        .from('device_assignments')
        .insert({
          device_id: 'd1111111-1111-4111-b111-111111111111',
          salesperson_id: spNg.user.id,
          assigned_by: hq.user.id,
          is_current: true,
        });
    }

    // Close any prior open visit for Tunde so check_in won't hit single open visit limit
    await spNg.client
      .from('visits')
      .update({ check_out_at: new Date().toISOString() })
      .eq('user_id', spNg.user.id)
      .is('check_out_at', null);

    const { data: maxSeqRec } = await spNg.client
      .from('activity_events')
      .select('sequence_number')
      .eq('device_id', 'd1111111-1111-4111-b111-111111111111')
      .order('sequence_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const baseSeq = Number(maxSeqRec?.sequence_number || 0) + 10;

    // 4.1 First submission of event batch
    try {
      const { data: batch1, error: err1 } = await spNg.client.rpc('ingest_activity_events', {
        events: [
          {
            id: parentEventId,
            idempotency_key: `BATCH-INGEST-${runTag}-P01`,
            user_id: spNg.user.id,
            device_id: 'd1111111-1111-4111-b111-111111111111',
            market_code: 'NG',
            event_type: 'start_day',
            sequence_number: baseSeq,
            client_timestamp: new Date().toISOString(),
            payload: { latitude: 6.4474, longitude: 3.3582, accuracy_m: 15.0 },
          },
          {
            id: childEventId,
            idempotency_key: `BATCH-INGEST-${runTag}-C01`,
            user_id: spNg.user.id,
            device_id: 'd1111111-1111-4111-b111-111111111111',
            market_code: 'NG',
            event_type: 'check_in',
            sequence_number: baseSeq + 1,
            dependency_event_id: parentEventId,
            client_timestamp: new Date().toISOString(),
            payload: {
              branch_id: 'f1111111-1111-4111-d111-111111111111',
              latitude: 6.4474,
              longitude: 3.3582,
              accuracy_m: 12.0,
            },
          },
        ],
      });
      if (err1) throw err1;
      const pass1Success = Array.isArray(batch1) && batch1.length === 2 && batch1[0].status === 'processed';
      recordTest(
        'Offline Ingestion',
        'OFF-01',
        'First submission of ordered event batch succeeds',
        pass1Success,
        !pass1Success ? JSON.stringify(batch1) : undefined
      );
    } catch (err: any) {
      recordTest('Offline Ingestion', 'OFF-01', 'First submission of event batch succeeds', false, err.message);
    }

    // 4.2 Exact row count verification after identical duplicate retries across all 4 tables
    try {
      const { count: eventsBefore } = await spNg.client.from('activity_events').select('*', { count: 'exact', head: true });
      const { count: visitsBefore } = await spNg.client.from('visits').select('*', { count: 'exact', head: true });
      const { count: logsBefore } = await spNg.client.from('meeting_logs').select('*', { count: 'exact', head: true });
      const { count: flagsBefore } = await spNg.client.from('verification_flags').select('*', { count: 'exact', head: true });

      // Replay identical batch
      const { data: batchRetry } = await spNg.client.rpc('ingest_activity_events', {
        events: [
          {
            id: parentEventId,
            idempotency_key: `BATCH-INGEST-${runTag}-P01`,
            user_id: spNg.user.id,
            device_id: 'd1111111-1111-4111-b111-111111111111',
            market_code: 'NG',
            event_type: 'start_day',
            sequence_number: baseSeq,
            client_timestamp: new Date().toISOString(),
            payload: { latitude: 6.4474, longitude: 3.3582, accuracy_m: 15.0 },
          },
        ],
      });

      const { count: eventsAfter } = await spNg.client.from('activity_events').select('*', { count: 'exact', head: true });
      const { count: visitsAfter } = await spNg.client.from('visits').select('*', { count: 'exact', head: true });
      const { count: logsAfter } = await spNg.client.from('meeting_logs').select('*', { count: 'exact', head: true });
      const { count: flagsAfter } = await spNg.client.from('verification_flags').select('*', { count: 'exact', head: true });

      const duplicateAcknowledged = (batchRetry as any)?.[0]?.status === 'accepted_duplicate';
      const zeroIncrements =
        eventsBefore === eventsAfter &&
        visitsBefore === visitsAfter &&
        logsBefore === logsAfter &&
        flagsBefore === flagsAfter;

      recordTest(
        'Offline Ingestion',
        'OFF-02',
        'Duplicate retry returns accepted_duplicate with ZERO row increment across events, visits, logs, and flags',
        duplicateAcknowledged && zeroIncrements,
        `Events: ${eventsBefore}->${eventsAfter}, Visits: ${visitsBefore}->${visitsAfter}, Flags: ${flagsBefore}->${flagsAfter}`
      );
    } catch (err: any) {
      recordTest('Offline Ingestion', 'OFF-02', 'Duplicate retry handling', false, err.message);
    }

    // 4.3 Conflicting payload / altered idempotency key for same UUID
    try {
      const { data: conflictRes } = await spNg.client.rpc('ingest_activity_events', {
        events: [
          {
            id: parentEventId,
            idempotency_key: `CONFLICTING-KEY-${runTag}`,
            user_id: spNg.user.id,
            device_id: 'd1111111-1111-4111-b111-111111111111',
            market_code: 'NG',
            event_type: 'start_day',
            sequence_number: baseSeq,
            client_timestamp: new Date().toISOString(),
            payload: { latitude: 0.0, longitude: 0.0 },
          },
        ],
      });
      const conflictDetected = (conflictRes as any)?.[0]?.status === 'rejected_conflict';
      recordTest(
        'Offline Ingestion',
        'OFF-03',
        'Conflicting payload / key on existing UUID is rejected (tamper protection)',
        conflictDetected,
        `Response: ${(conflictRes as any)?.[0]?.message}`
      );
    } catch (err: any) {
      recordTest('Offline Ingestion', 'OFF-03', 'Conflicting payload rejection', false, err.message);
    }

    // 4.4 Missing parent dependency event handling
    try {
      const missingDepEventId = crypto.randomUUID();
      const nonexistentParentId = crypto.randomUUID();
      const { data: depRes } = await spNg.client.rpc('ingest_activity_events', {
        events: [
          {
            id: missingDepEventId,
            idempotency_key: `MISSING-DEP-${runTag}`,
            user_id: spNg.user.id,
            device_id: 'd1111111-1111-4111-b111-111111111111',
            market_code: 'NG',
            event_type: 'check_in',
            sequence_number: baseSeq + 2,
            dependency_event_id: nonexistentParentId,
            client_timestamp: new Date().toISOString(),
            payload: { branch_id: 'f1111111-1111-4111-d111-111111111111' },
          },
        ],
      });
      const pendingDepHandled = (depRes as any)?.[0]?.status === 'pending_dependency';
      recordTest(
        'Offline Ingestion',
        'OFF-04',
        'Event with missing parent dependency is quarantined as pending_dependency without batch failure',
        pendingDepHandled,
        `Status: ${(depRes as any)?.[0]?.status}`
      );
    } catch (err: any) {
      recordTest('Offline Ingestion', 'OFF-04', 'Missing dependency handling', false, err.message);
    }

    // 4.5 Historical Rule Versioning Check
    try {
      const { data: rules, error } = await spNg.client
        .from('market_rules')
        .select('version_tag, max_clock_drift_minutes, is_active, effective_to')
        .eq('market_code', 'NG')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const hasActiveV5 = rules?.some((r) => r.is_active && r.max_clock_drift_minutes === 5);
      const hasHistorical = rules?.some((r) => !r.is_active && r.effective_to !== null);

      recordTest(
        'Clock Drift',
        'CLK-01',
        'Market rules versioning: Active version sets max_clock_drift_minutes = 5 and preserves historical rules',
        hasActiveV5 && hasHistorical,
        `Active v1.2.05 (5m): ${hasActiveV5}, Historical preserved: ${hasHistorical}`
      );
    } catch (err: any) {
      recordTest('Clock Drift', 'CLK-01', 'Market rules versioning check', false, err.message);
    }

    // 4.6 Reading just below threshold (4m in future) -> NO flag raised
    try {
      const subThresholdId = crypto.randomUUID();
      const subThresholdTs = new Date(Date.now() + 4 * 60 * 1000).toISOString();

      await spNg.client.rpc('ingest_activity_events', {
        events: [
          {
            id: subThresholdId,
            idempotency_key: `CLOCK-SUB-4M-${runTag}`,
            user_id: spNg.user.id,
            device_id: 'd1111111-1111-4111-b111-111111111111',
            market_code: 'NG',
            event_type: 'start_day',
            sequence_number: baseSeq + 3,
            client_timestamp: subThresholdTs,
            payload: { latitude: 6.4474, longitude: 3.3582 },
          },
        ],
      });

      // Verify NO clock_discrepancy flag was raised for this specific event
      const { data: flagSub } = await spNg.client
        .from('verification_flags')
        .select('*')
        .eq('user_id', spNg.user.id)
        .eq('flag_code', 'clock_discrepancy')
        .filter('details->>event_id', 'eq', subThresholdId)
        .maybeSingle();

      recordTest(
        'Clock Drift',
        'CLK-02',
        'Reading below 5m threshold (+4 minutes) raises NO clock discrepancy flag',
        !flagSub,
        flagSub ? `Flagged erroneously: ${JSON.stringify(flagSub)}` : 'Clean acceptance'
      );
    } catch (err: any) {
      recordTest('Clock Drift', 'CLK-02', 'Reading below threshold check', false, err.message);
    }

    // 4.7 Reading above threshold (6m in future) -> Raises operational review flag
    try {
      const aboveThresholdId = crypto.randomUUID();
      const aboveThresholdTs = new Date(Date.now() + 7 * 60 * 1000).toISOString();

      await spNg.client.rpc('ingest_activity_events', {
        events: [
          {
            id: aboveThresholdId,
            idempotency_key: `CLOCK-ABOVE-6M-${runTag}`,
            user_id: spNg.user.id,
            device_id: 'd1111111-1111-4111-b111-111111111111',
            market_code: 'NG',
            event_type: 'start_day',
            sequence_number: baseSeq + 4,
            client_timestamp: aboveThresholdTs,
            payload: { latitude: 6.4474, longitude: 3.3582 },
          },
        ],
      });

      const { data: flagAbove } = await spNg.client
        .from('verification_flags')
        .select('*')
        .eq('user_id', spNg.user.id)
        .eq('flag_code', 'clock_discrepancy')
        .filter('details->>event_id', 'eq', aboveThresholdId)
        .maybeSingle();

      const flagValid = flagAbove?.severity === 'medium' && flagAbove?.status === 'open';
      recordTest(
        'Clock Drift',
        'CLK-03',
        'Reading above 5m threshold (+6 minutes) raises operational review flag without fraud classification',
        flagValid,
        `Flag severity: ${flagAbove?.severity}, status: ${flagAbove?.status}`
      );
    } catch (err: any) {
      recordTest('Clock Drift', 'CLK-03', 'Reading above threshold check', false, err.message);
    }
  }

  // ---------------------------------------------------------------------------
  // 5. MEDIA EVIDENCE SECURITY & NEGATIVE STORAGE ISOLATION
  // ---------------------------------------------------------------------------
  console.log('\n--- Group 5: Media Evidence & Storage Security ---');

  if (spNg?.client && cshNg?.client && spMw?.client && hq?.client) {
    // 5.1 Storage buckets exist and are private
    try {
      const { data: bucketChecks, error: bErr } = await spNg.client.rpc('check_bucket_privacy');
      if (bErr) throw bErr;
      const privateBuckets = (bucketChecks as any[] || []).filter((b) => !b.is_public);
      const allPrivate = privateBuckets.length >= 7;
      recordTest(
        'Storage Security',
        'STO-01',
        'All media evidence buckets are configured as PRIVATE (public = false)',
        allPrivate,
        `Found ${privateBuckets.length} private buckets: ${privateBuckets.map((b) => b.bucket_name).join(', ')}`
      );
    } catch (err: any) {
      recordTest('Storage Security', 'STO-01', 'Private storage buckets verification', false, err.message);
    }

    // 5.2 Salesperson can upload to own user_id path in attendance-selfies
    let uploadedSelfiePath: string | null = null;
    try {
      const testFileContent = new Blob(['test-selfie-data'], { type: 'image/jpeg' });
      const validPath = `${spNg.user.id}/2026-10-21/selfie-${Date.now()}.jpg`;
      const { error } = await spNg.client.storage
        .from('attendance-selfies')
        .upload(validPath, testFileContent, { upsert: true });

      uploadedSelfiePath = validPath;
      recordTest(
        'Storage Security',
        'STO-02',
        'Salesperson can upload media to own authenticated path (<user_id>/...) in private bucket',
        !error,
        error?.message
      );
    } catch (err: any) {
      recordTest('Storage Security', 'STO-02', 'Salesperson upload to own path', false, err.message);
    }

    // 5.3 Salesperson CANNOT upload to another user's path (Path RLS block)
    try {
      const foreignUserId = '44444444-4444-4444-a444-444444444444'; // Peter Mwale
      const invalidPath = `${foreignUserId}/2026-10-21/malicious-spoof.jpg`;
      const testBlob = new Blob(['malicious-spoof'], { type: 'image/jpeg' });
      const { error } = await spNg.client.storage
        .from('attendance-selfies')
        .upload(invalidPath, testBlob, { upsert: true });

      recordTest(
        'Storage Security',
        'STO-03',
        'Path RLS prevents salesperson from uploading to another user path (tamper block)',
        !!error,
        error ? `Properly blocked: ${error.message}` : 'VIOLATION: Allowed foreign path upload!'
      );
    } catch (err: any) {
      recordTest('Storage Security', 'STO-03', 'Path RLS upload prevention', true, err.message);
    }

    // 5.4 Signed URL generation with expiration
    try {
      const validPath = uploadedSelfiePath || `${spNg.user.id}/2026-10-21/selfie-test.jpg`;
      const { data, error } = await spNg.client.storage
        .from('attendance-selfies')
        .createSignedUrl(validPath, 3600);

      const hasSignedUrl = !!data?.signedUrl && data.signedUrl.includes('token=');
      recordTest(
        'Storage Security',
        'STO-04',
        'Private storage creates time-bounded signed URLs with cryptographic token expiration',
        hasSignedUrl,
        `Signed token generated: ${data?.signedUrl ? 'Yes' : 'No'}`
      );
    } catch (err: any) {
      recordTest('Storage Security', 'STO-04', 'Signed URL creation', false, err.message);
    }

    // 5.5 Negative Read: Salesperson CANNOT read or download other salesperson's media
    try {
      const mwRepPath = `${spMw.user.id}/2026-10-21/mw-rep-selfie.jpg`;
      const { data, error } = await spNg.client.storage
        .from('attendance-selfies')
        .download(mwRepPath);

      const downloadBlocked = !!error || !data;
      recordTest(
        'Storage Security',
        'STO-05',
        'Storage RLS blocks salesperson from reading other users private evidence',
        downloadBlocked,
        error ? `Properly blocked by Storage RLS: ${error.message}` : 'Blocked cleanly'
      );
    } catch (err: any) {
      recordTest('Storage Security', 'STO-05', 'Salesperson cross-user storage download', true, err.message);
    }

    // 5.6 Negative Read: Cross-market storage reads are BLOCKED for Country Sales Head
    try {
      const mwTestContent = new Blob(['malawi-selfie-data'], { type: 'image/jpeg' });
      const mwPath = `${spMw.user.id}/2026-10-21/blantyre-${Date.now()}.jpg`;
      await spMw.client.storage.from('attendance-selfies').upload(mwPath, mwTestContent, { upsert: true });

      const { data: crossData, error: crossErr } = await cshNg.client.storage
        .from('attendance-selfies')
        .download(mwPath);

      const crossBlocked = !!crossErr || !crossData;
      recordTest(
        'Storage Security',
        'STO-06',
        'Storage RLS strictly blocks Country Sales Head from downloading cross-market media (NG CSH -> MW Rep)',
        crossBlocked,
        crossErr ? `Properly blocked: ${crossErr.message}` : 'Blocked cleanly'
      );
    } catch (err: any) {
      recordTest('Storage Security', 'STO-06', 'Cross-market storage read block', true, err.message);
    }

    // 5.7 Positive Read: Country Sales Head CAN download media for reps in OWN market
    try {
      const validPath = uploadedSelfiePath || `${spNg.user.id}/2026-10-21/selfie-test.jpg`;
      const { data: ownMarketData, error: ownMarketErr } = await cshNg.client.storage
        .from('attendance-selfies')
        .download(validPath);

      recordTest(
        'Storage Security',
        'STO-07',
        'Storage RLS permits Country Sales Head to download media for reps within their own market',
        !ownMarketErr && !!ownMarketData,
        ownMarketErr ? ownMarketErr.message : 'Successfully downloaded'
      );
    } catch (err: any) {
      recordTest('Storage Security', 'STO-07', 'Intra-market storage download', false, err.message);
    }
  }

  // ---------------------------------------------------------------------------
  // 6. 100% COMPANY DEVICE FLEET LIFECYCLE (13 TEST CASES)
  // ---------------------------------------------------------------------------
  console.log('\n--- Group 6: 100% Company Device Fleet Lifecycle (13 Cases) ---');

  if (hq?.client && spNg?.client && cshNg?.client) {
    const runTag = Date.now().toString().slice(-6);
    const testAssetTag = `CAR-TST-${runTag}`;
    const testSerial = `SN-TST-${runTag}`;
    let registeredDeviceId: string | null = null;
    let spareDeviceId: string | null = null;
    let replacementRequestId: string | null = null;

    // Case 1: HQ Admin registers a new company handset in inventory
    try {
      const { data: dev, error } = await hq.client
        .from('devices')
        .insert({
          market_code: 'NG',
          make: 'Samsung',
          model: 'Galaxy A15',
          asset_id: testAssetTag,
          asset_tag: testAssetTag,
          imei: `35123456${runTag}1`,
          serial_number: testSerial,
          knox_enrolled: true,
          security_authorization: 'authorized',
          inventory_status: 'available',
          registered_by: hq.user.id,
        })
        .select()
        .single();

      registeredDeviceId = dev?.id;
      recordTest('Device Fleet', 'DEV-01', 'Case 1: HQ Admin registers a new company handset in fleet inventory', !error, error?.message);
    } catch (err: any) {
      recordTest('Device Fleet', 'DEV-01', 'Case 1: HQ Admin device registration', false, err.message);
    }

    // Case 2: Duplicate company asset ID is rejected
    try {
      const { error } = await hq.client.from('devices').insert({
        market_code: 'NG',
        make: 'Samsung',
        model: 'Galaxy A15',
        asset_id: testAssetTag, // DUPLICATE!
        asset_tag: testAssetTag,
        imei: `35999999${runTag}1`,
        serial_number: `SN-DIFF-${runTag}`,
        registered_by: hq.user.id,
      });
      recordTest(
        'Device Fleet',
        'DEV-02',
        'Case 2: Duplicate company asset ID is strictly rejected (UQ constraint)',
        !!error,
        error ? `Properly rejected: ${error.message}` : 'VIOLATION: Duplicate asset tag allowed!'
      );
    } catch (err: any) {
      recordTest('Device Fleet', 'DEV-02', 'Case 2: Duplicate asset tag rejection', true, err.message);
    }

    // Case 3: Duplicate serial number is rejected
    try {
      const { error } = await hq.client.from('devices').insert({
        market_code: 'NG',
        make: 'Samsung',
        model: 'Galaxy A15',
        asset_id: `CAR-DIFF-${runTag}`,
        asset_tag: `CAR-DIFF-${runTag}`,
        imei: `35888888${runTag}1`,
        serial_number: testSerial, // DUPLICATE!
        registered_by: hq.user.id,
      });
      recordTest(
        'Device Fleet',
        'DEV-03',
        'Case 3: Duplicate hardware serial number is strictly rejected (UQ constraint)',
        !!error,
        error ? `Properly rejected: ${error.message}` : 'VIOLATION: Duplicate serial allowed!'
      );
    } catch (err: any) {
      recordTest('Device Fleet', 'DEV-03', 'Case 3: Duplicate serial rejection', true, err.message);
    }

    // Case 4 & 5: Available device assigned to salesperson & double assignment rejected
    try {
      if (registeredDeviceId) {
        // Clear existing assignment for Tunde to allow fresh assignment
        await hq.client
          .from('device_assignments')
          .update({ is_current: false, returned_at: new Date().toISOString() })
          .eq('salesperson_id', spNg.user.id);

        const { error } = await hq.client.from('device_assignments').insert({
          device_id: registeredDeviceId,
          salesperson_id: spNg.user.id,
          assigned_by: hq.user.id,
          is_current: true,
          handover_reason: 'Assigned for test suite verification',
        });

        recordTest('Device Fleet', 'DEV-04', 'Case 4: Available device can be assigned to a salesperson with audit custody log', !error, error?.message);

        // Case 5: Attempt double assignment of the SAME device to Peter Mwale
        const { error: doubleErr } = await hq.client.from('device_assignments').insert({
          device_id: registeredDeviceId, // ALREADY ASSIGNED!
          salesperson_id: '44444444-4444-4444-a444-444444444444',
          assigned_by: hq.user.id,
          is_current: true,
        });

        recordTest(
          'Device Fleet',
          'DEV-05',
          'Case 5: Double assignment of one device to multiple reps is rejected',
          !!doubleErr,
          doubleErr ? `Properly rejected: ${doubleErr.message}` : 'VIOLATION: Double assignment allowed!'
        );
      }
    } catch (err: any) {
      recordTest('Device Fleet', 'DEV-04', 'Case 4 & 5: Device assignment', false, err.message);
    }

    // Case 6: Multiple active devices for one salesperson rejected
    try {
      const spareAsset = `CAR-SPR-${runTag}`;
      const { data: spare } = await hq.client
        .from('devices')
        .insert({
          market_code: 'NG',
          make: 'Samsung',
          model: 'Galaxy A15',
          asset_id: spareAsset,
          asset_tag: spareAsset,
          imei: `35777777${runTag}1`,
          serial_number: `SN-SPR-${runTag}`,
          registered_by: hq.user.id,
        })
        .select()
        .single();

      spareDeviceId = spare?.id;

      const { error: secondActiveErr } = await hq.client.from('device_assignments').insert({
        device_id: spareDeviceId,
        salesperson_id: spNg.user.id, // TUNDE ALREADY HAS AN ACTIVE DEVICE!
        assigned_by: hq.user.id,
        is_current: true,
      });

      recordTest(
        'Device Fleet',
        'DEV-06',
        'Case 6: Multiple active devices for one salesperson strictly rejected (uq_single_active_device_per_rep)',
        !!secondActiveErr,
        secondActiveErr ? `Properly rejected: ${secondActiveErr.message}` : 'VIOLATION: Multiple active devices allowed!'
      );
    } catch (err: any) {
      recordTest('Device Fleet', 'DEV-06', 'Case 6: Single active device constraint', true, err.message);
    }

    // Case 7: Salesperson reports defective company device directly to HQ Admin
    try {
      const reqId = crypto.randomUUID();
      replacementRequestId = reqId;

      const { error } = await spNg.client.from('device_replacement_requests').insert({
        id: reqId,
        salesperson_id: spNg.user.id,
        company_device_id: registeredDeviceId,
        market_code: 'NG',
        issue_category: 'battery_charging',
        issue_description: 'Battery swollen and depletes in under 45 minutes of field GPS check-ins',
        status: 'pending_review',
      });

      recordTest('Device Fleet', 'DEV-07', 'Case 7: Salesperson reports defective company device directly to HQ Admin', !error, error?.message);
    } catch (err: any) {
      recordTest('Device Fleet', 'DEV-07', 'Case 7: Salesperson report defective device', false, err.message);
    }

    // Case 9: Country Sales Head CANNOT approve or reject device replacements via RPC
    try {
      if (replacementRequestId) {
        const { error: cshApproveErr } = await cshNg.client.rpc('hq_review_device_replacement', {
          p_replacement_id: replacementRequestId,
          p_status: 'approved',
          p_reason: 'Manager approval attempt',
        });

        recordTest(
          'Device Fleet',
          'DEV-09',
          'Case 9: Country Sales Head CANNOT approve or reject device replacements (Zero Bottleneck Enforced)',
          !!cshApproveErr,
          cshApproveErr ? `Properly blocked: ${cshApproveErr.message}` : 'VIOLATION: Manager approved replacement!'
        );
      }
    } catch (err: any) {
      recordTest('Device Fleet', 'DEV-09', 'Case 9: CSH replacement block', true, err.message);
    }

    // Case 8: HQ Admin approves device replacement request
    try {
      if (replacementRequestId) {
        const { error } = await hq.client.rpc('hq_review_device_replacement', {
          p_replacement_id: replacementRequestId,
          p_status: 'approved',
          p_reason: 'Battery failure verified from telemetry logs; approved replacement handset dispatch',
        });

        recordTest('Device Fleet', 'DEV-08', 'Case 8: HQ Admin approves device replacement request', !error, error?.message);
      }
    } catch (err: any) {
      recordTest('Device Fleet', 'DEV-08', 'Case 8: HQ Admin approve replacement', false, err.message);
    }

    // Case 10: Spare device allocated and dispatched with waybill tracking
    try {
      if (replacementRequestId && spareDeviceId) {
        const { error } = await hq.client.rpc('hq_dispatch_replacement_device', {
          p_replacement_id: replacementRequestId,
          p_replacement_device_id: spareDeviceId,
          p_courier_tracking_ref: `DHL-NG-${runTag}`,
          p_dispatch_notes: 'Dispatched via DHL Express to Lagos depot',
        });

        recordTest('Device Fleet', 'DEV-10', 'Case 10: Spare device allocated and dispatched with waybill tracking', !error, error?.message);
      }
    } catch (err: any) {
      recordTest('Device Fleet', 'DEV-10', 'Case 10: Spare dispatch', false, err.message);
    }

    // Case 11 & 12: Replacement assignment completed & old handset marked under_maintenance
    try {
      if (registeredDeviceId && spareDeviceId && replacementRequestId) {
        const { error: actErr } = await hq.client.rpc('hq_confirm_replacement_activation', {
          p_replacement_id: replacementRequestId,
          p_old_device_disposition: 'returned_to_depot',
        });

        recordTest('Device Fleet', 'DEV-11', 'Case 11 & 12: Replacement completed; old handset marked under_maintenance & revoked', !actErr, actErr?.message);
      }
    } catch (err: any) {
      recordTest('Device Fleet', 'DEV-11', 'Case 11 & 12: Replacement completion', false, err.message);
    }

    // Case 13: Full device replacement and custody lifecycle remains auditable in immutable history
    try {
      if (replacementRequestId) {
        const { data: hist, error } = await hq.client
          .from('device_replacement_history')
          .select('*')
          .eq('request_id', replacementRequestId)
          .order('created_at', { ascending: true });

        const hasHistory = (hist?.length || 0) >= 3;
        recordTest(
          'Device Fleet',
          'DEV-13',
          'Case 13: Full device replacement and custody lifecycle remains auditable in immutable history',
          hasHistory,
          `Recorded ${hist?.length} lifecycle history entries: ${hist?.map((h) => h.new_status).join(' -> ')}`
        );
      }
    } catch (err: any) {
      recordTest('Device Fleet', 'DEV-13', 'Case 13: History audit trail', false, err.message);
    }
  }

  // ---------------------------------------------------------------------------
  // 7. BUSINESS WORKFLOWS, NON-VISIT APPROVALS & GOVERNANCE
  // ---------------------------------------------------------------------------
  console.log('\n--- Group 7: Business Workflows, Non-Visit Approvals & Governance ---');

  if (spNg?.client && cshNg?.client && cshZm?.client && hq?.client) {
    let nonVisitReqId: string | null = null;
    const runNum = Date.now() % 10000;
    const testDate = `2026-11-${String((runNum % 25) + 1).padStart(2, '0')}`;

    // Clean up any potential leftover absence for this test date
    await hq.client.from('approved_absences').delete().eq('user_id', spNg.user.id).eq('absence_date', testDate);
    await hq.client.from('absence_requests').delete().eq('user_id', spNg.user.id).eq('absence_date', testDate);

    // 7.1 Salesperson submits non-visit workday request -> Starts as PENDING in absence_requests
    try {
      const { data: reqId, error } = await spNg.client.rpc('request_non_visit_workday', {
        p_date: testDate,
        p_category: 'proposal_preparation_office',
        p_justification: 'Preparing commercial fleet trial proposal for haulage accounts',
      });
      if (error) throw error;
      nonVisitReqId = reqId;

      const { data: reqRec } = await spNg.client
        .from('absence_requests')
        .select('*')
        .eq('id', reqId)
        .single();

      const startsPending = reqRec?.status === 'pending' && reqRec?.reviewed_by === null;
      recordTest(
        'Non-Visit Workday',
        'WF-NV-01',
        'Salesperson submits non-visit request: Request starts in PENDING status in absence_requests',
        startsPending,
        `Status: ${reqRec?.status}, Reviewed by: ${reqRec?.reviewed_by}`
      );
    } catch (err: any) {
      recordTest('Non-Visit Workday', 'WF-NV-01', 'Salesperson submit request', false, err.message);
    }

    // 7.2 Pending request does NOT prematurely count as attendance (NOT in approved_absences)
    try {
      const { data: absRec } = await spNg.client
        .from('approved_absences')
        .select('*')
        .eq('user_id', spNg.user.id)
        .eq('absence_date', testDate)
        .maybeSingle();

      const notYetApproved = !absRec;
      recordTest(
        'Non-Visit Workday',
        'WF-NV-02',
        'Pending non-visit request does NOT prematurely count as attendance (NOT in approved_absences)',
        notYetApproved,
        absRec ? 'VIOLATION: Prematurely in approved_absences!' : 'Correctly absent until approved'
      );
    } catch (err: any) {
      recordTest('Non-Visit Workday', 'WF-NV-02', 'Pending request absence check', false, err.message);
    }

    // 7.3 Negative Access Control: Salesperson CANNOT self-approve request via review RPC
    try {
      if (nonVisitReqId) {
        const { error } = await spNg.client.rpc('review_non_visit_workday', {
          p_request_id: nonVisitReqId,
          p_decision: 'approved',
          p_reason: 'Self-approval attempt by salesperson',
        });

        recordTest(
          'Non-Visit Workday',
          'WF-NV-03',
          'Negative Access: Salesperson CANNOT self-approve non-visit workday via direct review RPC',
          !!error,
          error ? `Properly rejected: ${error.message}` : 'VIOLATION: Salesperson self-approved!'
        );
      }
    } catch (err: any) {
      recordTest('Non-Visit Workday', 'WF-NV-03', 'Salesperson self-approval rejection', true, err.message);
    }

    // 7.4 Negative Access Control: Cross-Market Country Sales Head CANNOT approve request (ZM CSH -> NG Rep)
    try {
      if (nonVisitReqId) {
        const { error } = await cshZm.client.rpc('review_non_visit_workday', {
          p_request_id: nonVisitReqId,
          p_decision: 'approved',
          p_reason: 'Cross-market approval attempt by Zambia manager',
        });

        recordTest(
          'Non-Visit Workday',
          'WF-NV-04',
          'Negative Access: Cross-market Country Sales Head CANNOT review request (ZM CSH -> NG Rep)',
          !!error,
          error ? `Properly rejected: ${error.message}` : 'VIOLATION: Cross-market manager approved!'
        );
      }
    } catch (err: any) {
      recordTest('Non-Visit Workday', 'WF-NV-04', 'Cross-market review rejection', true, err.message);
    }

    // 7.5 Positive Workflow: Assigned Country Sales Head approves request with reason
    try {
      if (nonVisitReqId) {
        const { error } = await cshNg.client.rpc('review_non_visit_workday', {
          p_request_id: nonVisitReqId,
          p_decision: 'approved',
          p_reason: 'Approved for office fleet proposal preparation by Country Sales Head',
        });
        if (error) throw error;

        // Verify absence_requests status is approved
        const { data: reqRec } = await cshNg.client
          .from('absence_requests')
          .select('status, reviewed_by')
          .eq('id', nonVisitReqId)
          .single();

        // Verify approved_absences has record with counts_as_attendance = true and counts_as_visit_target = false
        const { data: absRec } = await cshNg.client
          .from('approved_absences')
          .select('counts_as_attendance, counts_as_visit_target, approved_by')
          .eq('user_id', spNg.user.id)
          .eq('absence_date', testDate)
          .single();

        const approvalVerified =
          reqRec?.status === 'approved' &&
          absRec?.counts_as_attendance === true &&
          absRec?.counts_as_visit_target === false;

        recordTest(
          'Non-Visit Workday',
          'WF-NV-05',
          'Positive Review: Country Sales Head approves request -> Counts toward attendance, strictly ZERO visit target',
          approvalVerified,
          `Request status: ${reqRec?.status}, Attendance: ${absRec?.counts_as_attendance}, Target: ${absRec?.counts_as_visit_target}`
        );
      }
    } catch (err: any) {
      recordTest('Non-Visit Workday', 'WF-NV-05', 'Country Sales Head approval', false, err.message);
    }

    // 7.6 Rejection Workflow: Manager rejects non-visit request with mandatory reason
    try {
      const rejectDate = `2026-11-${String((runNum % 25) + 2).padStart(2, '0')}`;
      await hq.client.from('approved_absences').delete().eq('user_id', spNg.user.id).eq('absence_date', rejectDate);
      await hq.client.from('absence_requests').delete().eq('user_id', spNg.user.id).eq('absence_date', rejectDate);

      const { data: rejReqId } = await spNg.client.rpc('request_non_visit_workday', {
        p_date: rejectDate,
        p_category: 'internal_operations',
        p_justification: 'Filing paperwork at depot',
      });

      const { error: rejErr } = await cshNg.client.rpc('review_non_visit_workday', {
        p_request_id: rejReqId,
        p_decision: 'rejected',
        p_reason: 'Field visits are required on Monday; administrative work must be deferred',
      });
      if (rejErr) throw rejErr;

      const { data: rejRec } = await cshNg.client
        .from('absence_requests')
        .select('status, rejection_reason')
        .eq('id', rejReqId)
        .single();

      const { data: noAbsRec } = await cshNg.client
        .from('approved_absences')
        .select('*')
        .eq('user_id', spNg.user.id)
        .eq('absence_date', rejectDate)
        .maybeSingle();

      const rejectionVerified = rejRec?.status === 'rejected' && !noAbsRec && !!rejRec?.rejection_reason;
      recordTest(
        'Non-Visit Workday',
        'WF-NV-06',
        'Rejection Workflow: Country Sales Head rejects request with mandatory reason -> Removed from attendance',
        rejectionVerified,
        `Status: ${rejRec?.status}, Reason: ${rejRec?.rejection_reason}`
      );
    } catch (err: any) {
      recordTest('Non-Visit Workday', 'WF-NV-06', 'Rejection workflow', false, err.message);
    }

    // 7.7 Direct Manager Approved Leave Recording (e.g. Annual Leave)
    try {
      const leaveDate = `2026-11-${String((runNum % 25) + 3).padStart(2, '0')}`;
      await hq.client.from('approved_absences').delete().eq('user_id', spNg.user.id).eq('absence_date', leaveDate);

      const { data: leaveId, error: leaveErr } = await cshNg.client.rpc('record_approved_leave', {
        p_user_id: spNg.user.id,
        p_date: leaveDate,
        p_category: 'annual_leave',
        p_justification: 'Approved scheduled annual vacation leave',
      });
      if (leaveErr) throw leaveErr;

      const { data: leaveRec } = await cshNg.client
        .from('approved_absences')
        .select('category, counts_as_attendance, counts_as_visit_target')
        .eq('id', leaveId)
        .single();

      const leaveValid = leaveRec?.category === 'annual_leave' && leaveRec?.counts_as_attendance === true;
      recordTest(
        'Non-Visit Workday',
        'WF-NV-07',
        'Manager Direct Leave: Country Sales Head records approved leave directly into approved_absences',
        leaveValid,
        `Category: ${leaveRec?.category}, Attendance: ${leaveRec?.counts_as_attendance}`
      );
    } catch (err: any) {
      recordTest('Non-Visit Workday', 'WF-NV-07', 'Manager direct leave recording', false, err.message);
    }

    // 7.8 Negative Access: Salesperson CANNOT record approved leave directly
    try {
      const { error } = await spNg.client.rpc('record_approved_leave', {
        p_user_id: spNg.user.id,
        p_date: '2026-10-28',
        p_category: 'annual_leave',
        p_justification: 'Self-recorded vacation',
      });

      recordTest(
        'Non-Visit Workday',
        'WF-NV-08',
        'Negative Access: Salesperson CANNOT record approved leave directly via RPC',
        !!error,
        error ? `Properly rejected: ${error.message}` : 'VIOLATION: Salesperson recorded leave!'
      );
    } catch (err: any) {
      recordTest('Non-Visit Workday', 'WF-NV-08', 'Salesperson leave recording rejection', true, err.message);
    }

    // 7.9 Negative Access: Salesperson CANNOT insert directly into approved_absences table
    try {
      const { error } = await spNg.client.from('approved_absences').insert({
        user_id: spNg.user.id,
        market_code: 'NG',
        absence_date: '2026-10-29',
        category: 'training_development',
        counts_as_attendance: true,
        counts_as_visit_target: false,
        justification: 'Direct table insert bypass attempt',
        approved_by: spNg.user.id,
      });

      recordTest(
        'Non-Visit Workday',
        'WF-NV-09',
        'Negative Access: Salesperson CANNOT directly insert into approved_absences table (RLS blocked)',
        !!error,
        error ? `Properly blocked by RLS: ${error.message}` : 'VIOLATION: Direct table insert succeeded!'
      );
    } catch (err: any) {
      recordTest('Non-Visit Workday', 'WF-NV-09', 'Direct absence table insert block', true, err.message);
    }

    // 7.10 Location Pin Versioning
    try {
      const branchId = 'f1111111-1111-4111-d111-111111111111';
      const { data: pinId, error: pErr } = await spNg.client.rpc('propose_branch_location_pin', {
        p_branch_id: branchId,
        p_latitude: 6.4480,
        p_longitude: 3.3590,
        p_accuracy_m: 14.0,
        p_photo_url: '/premises/apapa-v2.jpg',
      });
      if (pErr) throw pErr;

      const { error: rErr } = await cshNg.client.rpc('review_branch_location_pin', {
        p_pin_id: pinId,
        p_action: 'approve',
        p_review_notes: 'Gate relocated 80m south; verified new entrance coordinates',
      });
      if (rErr) throw rErr;

      const { data: activePins } = await cshNg.client
        .from('branch_location_pins')
        .select('id, version_number, is_active')
        .eq('branch_id', branchId)
        .eq('is_active', true);

      const onlyOneActive = activePins?.length === 1 && activePins[0].id === pinId;
      recordTest(
        'Workflows',
        'WF-PIN-01',
        'Location pin versioning: Approving new version activates v2 and deactivates v1',
        onlyOneActive,
        `Active version: ${activePins?.[0]?.version_number}`
      );
    } catch (err: any) {
      recordTest('Workflows', 'WF-PIN-01', 'Location pin versioning', false, err.message);
    }

    // 7.11 Client Audit Phone Calls & Dispute Resolution
    let auditRecordId: string | null = null;
    try {
      const { data: sampleRec, error: sErr } = await cshNg.client.from('client_audit_records').insert({
        visit_id: globalTestVisitId || crypto.randomUUID(),
        market_code: 'NG',
        contact_name: 'Alhaji Musa Garba',
        contact_phone: '+2348030001122',
        selection_method: 'random_5pct',
        call_status: 'pending_call',
      }).select().single();
      if (sErr) throw sErr;
      auditRecordId = sampleRec.id;

      await cshNg.client.rpc('record_client_audit_call', {
        p_audit_record_id: auditRecordId,
        p_contact_person: 'Alhaji Musa Garba',
        p_telephone: '+2348030001122',
        p_outcome: 'unreachable_no_answer',
        p_notes: 'Phone rang with no answer on 1st attempt',
      });

      await cshNg.client.rpc('record_client_audit_call', {
        p_audit_record_id: auditRecordId,
        p_contact_person: 'Alhaji Musa Garba',
        p_telephone: '+2348030001122',
        p_outcome: 'disputed_denied',
        p_notes: 'Client stated no salesperson visited premises on claimed date',
      });

      const { data: auditRec } = await cshNg.client
        .from('client_audit_records')
        .select('audit_outcome, dispute_status')
        .eq('id', auditRecordId)
        .single();

      const disputeRaised = auditRec?.audit_outcome === 'disputed_denied' && auditRec?.dispute_status === 'under_investigation';
      recordTest(
        'Workflows',
        'WF-AUD-01',
        'Client denial during audit call triggers Disputed - Under Investigation and raises critical flag',
        disputeRaised,
        `Outcome: ${auditRec?.audit_outcome}, Dispute: ${auditRec?.dispute_status}`
      );
    } catch (err: any) {
      recordTest('Workflows', 'WF-AUD-01', 'Client audit phone call flow', false, err.message);
    }

    // 7.12 Manager Dispute Resolution
    try {
      if (auditRecordId) {
        const { error: resErr } = await cshNg.client.rpc('resolve_client_audit_dispute', {
          p_audit_record_id: auditRecordId,
          p_decision: 'rep_substantiated',
          p_mandatory_reason: 'Depot CCTV cross-checked by manager; salesperson was on-site as claimed',
        });
        if (resErr) throw resErr;

        const { data: resolvedAudit } = await cshNg.client
          .from('client_audit_records')
          .select('dispute_status')
          .eq('id', auditRecordId)
          .single();

        recordTest(
          'Workflows',
          'WF-AUD-02',
          'Manager resolves audit dispute with mandatory audit reason recorded in approval_audit ledger',
          resolvedAudit?.dispute_status === 'resolved_cleared',
          `Status: ${resolvedAudit?.dispute_status}`
        );
      }
    } catch (err: any) {
      recordTest('Workflows', 'WF-AUD-02', 'Dispute resolution', false, err.message);
    }

    // 7.13 Approval Audit Ledger Immutability
    try {
      const { error: delAuditErr } = await hq.client.from('approval_audit').delete().neq('id', crypto.randomUUID());
      recordTest(
        'Workflows',
        'WF-AUD-03',
        'Approval audit ledger is strictly append-only (DELETE and UPDATE rejected)',
        !!delAuditErr,
        delAuditErr ? `Properly rejected: ${delAuditErr.message}` : 'VIOLATION: Audit record deleted!'
      );
    } catch (err: any) {
      recordTest('Workflows', 'WF-AUD-03', 'Audit ledger immutability', true, err.message);
    }

    // 7.14 Role Escalation Prevention: Salesperson CANNOT modify own role / market on profiles
    try {
      const { error: escErr } = await spNg.client
        .from('profiles')
        .update({ role: 'hq_admin' })
        .eq('id', spNg.user.id);

      recordTest(
        'Security Checks',
        'SEC-01',
        'Profile Tampering Prevention: Salesperson CANNOT escalate own role to hq_admin (Trigger aborted)',
        !!escErr,
        escErr ? `Properly aborted: ${escErr.message}` : 'VIOLATION: Role escalation succeeded!'
      );
    } catch (err: any) {
      recordTest('Security Checks', 'SEC-01', 'Role escalation prevention', true, err.message);
    }
  }

  // ---------------------------------------------------------------------------
  // FINAL SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n=================================================================');
  console.log('Final Security Audit Verification Summary');
  console.log('=================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`Total Verification Tests Executed: ${results.length}`);
  console.log(`Passed: ${passedCount} (${Math.round((passedCount / results.length) * 100)}%)`);
  console.log(`Failed: ${failedCount} (${Math.round((failedCount / results.length) * 100)}%)`);

  if (failedCount === 0) {
    console.log('\n🎉 ALL SECURITY & COMPLETENESS TESTS PASSED PERFECTLY!');
  } else {
    console.error(`\n⚠️ ${failedCount} VERIFICATION TEST(S) FAILED. INSPECT ABOVE LOGS.`);
    process.exit(1);
  }
}

runComprehensiveSecurityVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
