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
  const tundeId = '11111111-1111-4111-a111-111111111111';
  // Delete open visits for today first if any
  await supabase.from('visits').delete().eq('user_id', tundeId);
  // Delete attendance day for today
  const { data, error } = await supabase
    .from('attendance_days')
    .delete()
    .eq('user_id', tundeId)
    .eq('work_date', '2026-10-29');

  if (error) {
    console.error('Error deleting attendance:', error);
  } else {
    console.log('Successfully reset attendance for Tunde for 2026-10-29');
  }
}

main();

