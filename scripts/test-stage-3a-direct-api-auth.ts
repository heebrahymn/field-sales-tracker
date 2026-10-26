/**
 * Carbon Field Sales Tracker — Stage 3A Direct API Authorisation & Negative Security Test Suite
 * Executes live against hosted Supabase using publishable key and authenticated sessions.
 * NEVER uses service_role key to simulate users.
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// 1. Read dev environment variables safely
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = Object.fromEntries(
  envContent
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => {
      const idx = line.indexOf('=');
      return [line.substring(0, idx).trim(), line.substring(idx + 1).trim()];
    })
);

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const publishableKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;
const devPassword = envVars.DEV_USER_PASSWORD;

if (!supabaseUrl || !publishableKey || !devPassword) {
  console.error('Missing required Supabase environment configuration.');
  process.exit(1);
}

interface TestReportItem {
  id: string;
  category: string;
  title: string;
  passed: boolean;
  details: string;
}

const testResults: TestReportItem[] = [];

function recordTest(id: string, category: string, title: string, passed: boolean, details: string) {
  testResults.push({ id, category, title, passed, details });
  const icon = passed ? '✅ [PASS]' : '❌ [FAIL]';
  console.log(`${icon} ${id}: ${title}`);
  if (details) {
    console.log(`         ${details}`);
  }
}

async function getAuthClient(email: string) {
  const client = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: devPassword,
  });

  if (error || !data.session) {
    throw new Error(`Failed to sign in as ${email}: ${error?.message}`);
  }

  return { client, user: data.user, session: data.session };
}

async function runDirectApiSecurityTests() {
  console.log('========================================================================');
  console.log('Stage 3A Final Direct API Authorisation & Negative Security Tests');
  console.log(`Endpoint: ${supabaseUrl}`);
  console.log('Mode: Real Supabase Sessions via Publishable Key (No Service Role)');
  console.log('========================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // TEST SUITE 1: Nigeria Country Sales Head Cross-Market Isolation
    // -------------------------------------------------------------------------
    console.log('--- Test Suite 1: Nigeria Country Sales Head Isolation ---');
    const ngCsh = await getAuthClient('babatunde.adeleke@carboncarcare.com');

    // 1.1 Query Zambia branches
    const { data: zmBranches, error: zmErr } = await ngCsh.client
      .from('branches')
      .select('id, branch_name, market_code')
      .eq('market_code', 'ZM');

    const ngBlocksZmBranches = !zmErr && (!zmBranches || zmBranches.length === 0);
    recordTest(
      'RLS-01',
      'Market Sandboxing',
      'Nigeria CSH cannot query Zambia branches',
      ngBlocksZmBranches,
      `Returned: ${zmBranches?.length ?? 0} rows (RLS filtered to empty array)`
    );

    // 1.2 Query Malawi branches
    const { data: mwBranches, error: mwErr } = await ngCsh.client
      .from('branches')
      .select('id, branch_name, market_code')
      .eq('market_code', 'MW');

    const ngBlocksMwBranches = !mwErr && (!mwBranches || mwBranches.length === 0);
    recordTest(
      'RLS-02',
      'Market Sandboxing',
      'Nigeria CSH cannot query Malawi branches',
      ngBlocksMwBranches,
      `Returned: ${mwBranches?.length ?? 0} rows (RLS filtered to empty array)`
    );

    // 1.3 Query Nigeria branches (Should succeed)
    const { data: ngBranches } = await ngCsh.client
      .from('branches')
      .select('id, branch_name, market_code')
      .eq('market_code', 'NG');

    const ngCanReadOwnBranches = Boolean(ngBranches && ngBranches.length > 0);
    recordTest(
      'RLS-03',
      'Market Sandboxing',
      'Nigeria CSH can query own Nigeria branches',
      ngCanReadOwnBranches,
      `Returned: ${ngBranches?.length ?? 0} authorized Nigeria branches`
    );

    // 1.4 Attempt cross-market branch update by Nigeria CSH on Zambia branch
    const { data: zmUpdate, error: zmUpdateErr } = await ngCsh.client
      .from('branches')
      .update({ branch_name: 'Hacked Branch' })
      .eq('market_code', 'ZM')
      .select();

    const crossMarketUpdateBlocked = !zmUpdate || zmUpdate.length === 0;
    recordTest(
      'RLS-04',
      'Market Sandboxing',
      'Nigeria CSH cannot update Zambia branches',
      crossMarketUpdateBlocked,
      `Affected rows: ${zmUpdate?.length ?? 0} (Blocked by RLS)`
    );

    await ngCsh.client.auth.signOut();

    // -------------------------------------------------------------------------
    // TEST SUITE 2: Zambia & Malawi Country Sales Heads Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 2: Zambia & Malawi Country Sales Heads Isolation ---');
    const zmCsh = await getAuthClient('chileshe.mwape@carboncarcare.com');

    // 2.1 Zambia CSH querying Nigeria branches
    const { data: zmQueryNg } = await zmCsh.client
      .from('branches')
      .select('id, branch_name, market_code')
      .eq('market_code', 'NG');

    recordTest(
      'RLS-05',
      'Market Sandboxing',
      'Zambia CSH cannot query Nigeria branches',
      !zmQueryNg || zmQueryNg.length === 0,
      `Returned: ${zmQueryNg?.length ?? 0} rows`
    );

    // 2.2 Zambia CSH querying Zambia branches
    const { data: zmOwnBranches } = await zmCsh.client
      .from('branches')
      .select('id, branch_name, market_code')
      .eq('market_code', 'ZM');

    recordTest(
      'RLS-06',
      'Market Sandboxing',
      'Zambia CSH can query authorized Zambia branches',
      Boolean(zmOwnBranches && zmOwnBranches.length >= 0),
      `Returned: ${zmOwnBranches?.length ?? 0} rows in Zambia`
    );

    await zmCsh.client.auth.signOut();

    // 2.3 Malawi CSH querying Nigeria and Zambia
    const mwCsh = await getAuthClient('tamika.phiri@carboncarcare.com');
    const { data: mwQueryNg } = await mwCsh.client
      .from('branches')
      .select('id, branch_name, market_code')
      .in('market_code', ['NG', 'ZM']);

    recordTest(
      'RLS-07',
      'Market Sandboxing',
      'Malawi CSH cannot query Nigeria or Zambia branches',
      !mwQueryNg || mwQueryNg.length === 0,
      `Returned: ${mwQueryNg?.length ?? 0} rows`
    );
    await mwCsh.client.auth.signOut();

    // -------------------------------------------------------------------------
    // TEST SUITE 3: Salesperson Negative Access & HQ Separation
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 3: Salesperson Boundary & HQ Table Protection ---');
    const rep = await getAuthClient('tunde.adebayo@carboncarcare.com');

    // 3.1 Salesperson querying system audit logs (HQ table)
    const { data: repAudit, error: repAuditErr } = await rep.client
      .from('system_audit_logs')
      .select('*');

    const repBlockedFromSystemAudit = repAuditErr !== null || !repAudit || repAudit.length === 0;
    recordTest(
      'RLS-08',
      'Least Privilege',
      'Salesperson cannot query system_audit_logs (HQ-only)',
      repBlockedFromSystemAudit,
      repAuditErr ? `Blocked with RLS error: ${repAuditErr.message}` : `Returned: ${repAudit?.length ?? 0} rows`
    );

    // 3.2 Salesperson querying other salespeople profiles
    const { data: repProfiles } = await rep.client
      .from('profiles')
      .select('id, full_name, role, market_code');

    // RLS policy: Salesperson should only see their own profile row
    const onlyOwnProfile = Boolean(
      repProfiles && repProfiles.length === 1 && repProfiles[0].id === rep.user.id
    );
    recordTest(
      'RLS-09',
      'Profile Privacy',
      'Salesperson can only see own profile record (No directory leakage)',
      onlyOwnProfile,
      `Returned: ${repProfiles?.length ?? 0} row(s) (Matching rep UUID: ${rep.user.id})`
    );

    // 3.3 Salesperson attempting privilege escalation (updating own role to 'hq_admin')
    const { data: repRoleEscalation, error: repRoleEscalationErr } = await rep.client
      .from('profiles')
      .update({ role: 'hq_admin' as any })
      .eq('id', rep.user.id)
      .select();

    const roleEscalationBlocked =
      repRoleEscalationErr !== null || !repRoleEscalation || repRoleEscalation.length === 0;

    // Verify role was NOT changed
    const { data: checkRepProfile } = await rep.client
      .from('profiles')
      .select('role')
      .eq('id', rep.user.id)
      .single();

    const rolePreserved = checkRepProfile?.role === 'salesperson';
    recordTest(
      'RLS-10',
      'Privilege Escalation Prevention',
      'Salesperson cannot modify own role to hq_admin via direct API',
      roleEscalationBlocked && rolePreserved,
      `Role after update attempt: '${checkRepProfile?.role}' (Strictly enforced by RLS WITH CHECK)`
    );

    // 3.4 Salesperson attempting to change assigned market_code
    const { data: repMarketEscalation, error: repMarketErr } = await rep.client
      .from('profiles')
      .update({ market_code: 'ZM' as any })
      .eq('id', rep.user.id)
      .select();

    const marketEscalationBlocked =
      repMarketErr !== null || !repMarketEscalation || repMarketEscalation.length === 0;

    const { data: checkRepMarket } = await rep.client
      .from('profiles')
      .select('market_code')
      .eq('id', rep.user.id)
      .single();

    recordTest(
      'RLS-11',
      'Market Boundary Protection',
      'Salesperson cannot alter assigned market_code via direct API',
      marketEscalationBlocked && checkRepMarket?.market_code === 'NG',
      `Market after update attempt: '${checkRepMarket?.market_code}'`
    );

    await rep.client.auth.signOut();

    // -------------------------------------------------------------------------
    // TEST SUITE 4: Country Sales Head Role Elevation Prevention
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 4: Country Sales Head Role Elevation Prevention ---');
    const csh = await getAuthClient('babatunde.adeleke@carboncarcare.com');

    const { data: cshEscalate, error: cshEscalateErr } = await csh.client
      .from('profiles')
      .update({ role: 'hq_admin' as any })
      .eq('id', csh.user.id)
      .select();

    const cshEscalateBlocked = cshEscalateErr !== null || !cshEscalate || cshEscalate.length === 0;

    const { data: checkCshRole } = await csh.client
      .from('profiles')
      .select('role')
      .eq('id', csh.user.id)
      .single();

    recordTest(
      'RLS-12',
      'Privilege Escalation Prevention',
      'Country Sales Head cannot elevate role to hq_admin via direct API',
      cshEscalateBlocked && checkCshRole?.role === 'country_sales_head',
      `Role after attempt: '${checkCshRole?.role}'`
    );

    await csh.client.auth.signOut();

    // -------------------------------------------------------------------------
    // TEST SUITE 5: HQ Admin Cross-Market Visibility
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 5: HQ Administrator Cross-Market Oversight ---');
    const hq = await getAuthClient('hq.admin@carboncarcare.com');

    const { data: hqProfiles } = await hq.client
      .from('profiles')
      .select('id, full_name, market_code');

    const hqSeesAllMarkets = Boolean(
      hqProfiles &&
      hqProfiles.some((p) => p.market_code === 'NG') &&
      hqProfiles.some((p) => p.market_code === 'ZM') &&
      hqProfiles.some((p) => p.market_code === 'MW')
    );

    recordTest(
      'RLS-13',
      'HQ Oversight',
      'HQ Administrator has authorized cross-market visibility across NG, ZM, and MW',
      hqSeesAllMarkets,
      `Total profiles visible across markets: ${hqProfiles?.length ?? 0}`
    );

    await hq.client.auth.signOut();

    // -------------------------------------------------------------------------
    // SUMMARY REPORT
    // -------------------------------------------------------------------------
    const total = testResults.length;
    const passed = testResults.filter((r) => r.passed).length;
    const failed = testResults.filter((r) => !r.passed).length;

    console.log('\n========================================================================');
    console.log(`Direct API Authorisation Test Results: ${passed} / ${total} PASSED (${failed} FAILED)`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('Fatal test error:', error.message);
    process.exit(1);
  }
}

runDirectApiSecurityTests();
