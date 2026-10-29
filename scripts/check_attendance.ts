import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

function loadEnv() {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const env: Record<string, string> = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [k, ...v] = trimmed.split('=');
      env[k.trim()] = v.join('=').trim();
    }
  });
  return env;
}

const env = loadEnv();
const supabase = createClient(env['VITE_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function main() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, market_code')
    .eq('role', 'salesperson');

  console.log('SALESPERSON PROFILES:');
  profiles?.forEach(p => {
    console.log(`  ${p.email} (${p.full_name}) - ${p.market_code} [${p.id}]`);
  });

  const { data: attendance } = await supabase
    .from('attendance_days')
    .select('id, user_id, work_date, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('\nRECENT ATTENDANCE:');
  attendance?.forEach(a => {
    console.log(`  ${a.work_date} | ${a.status} | user: ${a.user_id}`);
  });
}

main();
