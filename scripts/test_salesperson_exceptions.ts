import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const parts = line.trim().split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const password = env.DEV_USER_PASSWORD || env.SEED_TEST_USER_PASSWORD || '[DEV_USER_PASSWORD_REDACTED]';

const supabase = createClient(url, key);

async function test() {
  console.log('Testing exception queries as Tunde Adebayo (Salesperson)...');
  const { data: auth, error: aErr } = await supabase.auth.signInWithPassword({
    email: 'tunde.adebayo@carboncarcare.com',
    password: password
  });

  if (aErr) {
    console.error('Auth error:', aErr.message);
    return;
  }
  console.log('Logged in as:', auth.user.email, auth.user.id);

  // Test what salesperson can see in exceptions
  const { data: excs, error: eErr } = await supabase
    .from('exceptions')
    .select(`
      id,
      user_id,
      branch_id,
      resulting_visit_id,
      exception_type,
      reason,
      claimed_visit_time,
      status,
      reviewed_by:decided_by,
      reviewed_at:decided_at,
      decision_reason,
      created_at,
      profiles:user_id (full_name, email, market_code),
      branches:branch_id (
        branch_name,
        market_code,
        organisations:organisation_id (name)
      )
    `);

  console.log('Exceptions returned for Tunde:', excs?.length, 'error:', eErr?.message);
  if (excs && excs.length > 0) {
    console.log('Sample exception:', excs[0].id, excs[0].status, excs[0].branches?.branch_name);
  }

  // Test inserting a real exception as Tunde
  const { data: branch } = await supabase.from('branches').select('id, branch_name').eq('market_code', 'NG').limit(1).single();
  console.log('Found branch:', branch?.id, branch?.branch_name);

  const { data: newExc, error: insErr } = await supabase
    .from('exceptions')
    .insert({
      user_id: auth.user.id,
      branch_id: branch!.id,
      exception_type: 'gps_failure',
      claimed_visit_time: new Date().toISOString(),
      reason: 'Underground basement loading bay prevented GPS fix (>140m accuracy)',
      status: 'pending_review'
    })
    .select()
    .single();

  console.log('Insert exception result:', newExc?.id, 'error:', insErr?.message);
}

test().catch(console.error);

