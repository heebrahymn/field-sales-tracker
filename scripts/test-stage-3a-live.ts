/**
 * Stage 3A Live Supabase Authentication & Role Verification Script
 * Validates against hosted Supabase dev project: https://[SUPABASE_PROJECT_ID].supabase.co
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Read development environment variables safely
const envContent = fs.readFileSync('.env.local', 'utf-8');
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
const supabasePublishableKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;
const devPassword = envVars.DEV_USER_PASSWORD;

console.log('================================================================');
console.log('Carbon Field Sales Tracker — Stage 3A Live Authentication Test');
console.log(`Connecting to: ${supabaseUrl}`);
console.log('================================================================\n');

interface TestAccountCheck {
  roleTitle: string;
  email: string;
  expectedRole: string;
  expectedMarket: string | null;
  expectDevice: boolean;
}

const ACCOUNTS: TestAccountCheck[] = [
  {
    roleTitle: 'Nigeria Salesperson',
    email: 'tunde.adebayo@carboncarcare.com',
    expectedRole: 'salesperson',
    expectedMarket: 'NG',
    expectDevice: true,
  },
  {
    roleTitle: 'Nigeria Country Sales Head',
    email: 'babatunde.adeleke@carboncarcare.com',
    expectedRole: 'country_sales_head',
    expectedMarket: 'NG',
    expectDevice: false,
  },
  {
    roleTitle: 'Zambia Salesperson',
    email: 'peter.mwale@carboncarcare.com',
    expectedRole: 'salesperson',
    expectedMarket: 'ZM',
    expectDevice: true,
  },
  {
    roleTitle: 'Zambia Country Sales Head',
    email: 'chileshe.mwape@carboncarcare.com',
    expectedRole: 'country_sales_head',
    expectedMarket: 'ZM',
    expectDevice: false,
  },
  {
    roleTitle: 'Malawi Salesperson',
    email: 'kondwani.banda@carboncarcare.com',
    expectedRole: 'salesperson',
    expectedMarket: 'MW',
    expectDevice: true,
  },
  {
    roleTitle: 'Malawi Country Sales Head',
    email: 'tamika.phiri@carboncarcare.com',
    expectedRole: 'country_sales_head',
    expectedMarket: 'MW',
    expectDevice: false,
  },
  {
    roleTitle: 'HQ Administrator',
    email: 'hq.admin@carboncarcare.com',
    expectedRole: 'hq_admin',
    expectedMarket: null,
    expectDevice: false,
  },
];

async function runLiveAuthTests() {
  let passedCount = 0;
  let failedCount = 0;

  for (const acc of ACCOUNTS) {
    const client = createClient(supabaseUrl, supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    try {
      // 1. Authenticate with real Supabase Auth GoTrue endpoint
      const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email: acc.email,
        password: devPassword,
      });

      if (authError || !authData.user || !authData.session) {
        console.error(`❌ [FAIL] ${acc.roleTitle} (${acc.email}): Authentication error`, authError?.message);
        failedCount++;
        continue;
      }

      // 2. Fetch profile from public.profiles using authenticated client
      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('id, full_name, email, role, market_code, is_active')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        console.error(`❌ [FAIL] ${acc.roleTitle}: Failed to query public.profiles`, profileError?.message);
        failedCount++;
        continue;
      }

      // 3. Verify role and market integrity
      if (profile.role !== acc.expectedRole) {
        console.error(`❌ [FAIL] ${acc.roleTitle}: Role mismatch. Expected ${acc.expectedRole}, got ${profile.role}`);
        failedCount++;
        continue;
      }

      if (profile.market_code !== acc.expectedMarket) {
        console.error(`❌ [FAIL] ${acc.roleTitle}: Market mismatch. Expected ${acc.expectedMarket}, got ${profile.market_code}`);
        failedCount++;
        continue;
      }

      // 4. If salesperson, verify Knox device assignment query
      let deviceTag = 'N/A';
      if (acc.expectDevice) {
        const { data: devAssignment } = await client
          .from('device_assignments')
          .select(`
            id,
            is_current,
            devices (
              id,
              asset_id,
              asset_tag,
              make,
              model,
              inventory_status,
              security_authorization
            )
          `)
          .eq('salesperson_id', authData.user.id)
          .eq('is_current', true)
          .maybeSingle();

        const dev = (devAssignment as any)?.devices;
        if (!dev) {
          console.error(`❌ [FAIL] ${acc.roleTitle}: Expected active company device assignment, none found.`);
          failedCount++;
          continue;
        }
        deviceTag = `${dev.asset_tag} (${dev.make} ${dev.model})`;
      }

      console.log(`✅ [PASS] ${acc.roleTitle} (${acc.email})`);
      console.log(`         User UUID: ${authData.user.id}`);
      console.log(`         Role: ${profile.role} | Market: ${profile.market_code || 'ALL'}`);
      if (acc.expectDevice) {
        console.log(`         Assigned Device: ${deviceTag}`);
      }

      // 5. Test sign out
      await client.auth.signOut();
      passedCount++;
    } catch (err: any) {
      console.error(`❌ [FAIL] Unexpected error for ${acc.roleTitle}:`, err.message);
      failedCount++;
    }
  }

  // 6. Test invalid password rejection
  console.log('\n--- Testing Invalid Password Rejection ---');
  const testClient = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false },
  });
  const { error: invalidError } = await testClient.auth.signInWithPassword({
    email: 'tunde.adebayo@carboncarcare.com',
    password: 'WrongPassword!123',
  });

  if (invalidError && invalidError.message.toLowerCase().includes('invalid')) {
    console.log('✅ [PASS] Invalid password successfully rejected by Supabase Auth (400)');
    passedCount++;
  } else {
    console.error('❌ [FAIL] Invalid password was not rejected properly:', invalidError);
    failedCount++;
  }

  console.log('\n================================================================');
  console.log(`Stage 3A Live Supabase Tests Complete: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runLiveAuthTests();
