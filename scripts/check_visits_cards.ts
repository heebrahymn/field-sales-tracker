import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const parts = line.trim().split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
});

const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(url, anonKey);

async function check() {
  await supabase.auth.signInWithPassword({
    email: 'babatunde.adeleke@carboncarcare.com',
    password: '[DEV_USER_PASSWORD_REDACTED]',
  });

  const { data: visits, error } = await supabase
    .from('visits')
    .select(`
      id,
      check_in_at,
      branches (branch_name, market_code),
      meeting_logs (id, business_card_photo_url, purpose, outcome_narrative)
    `)
    .eq('branches.market_code', 'NG')
    .order('check_in_at', { ascending: false })
    .limit(10);

  console.log('NG Visits:');
  visits?.forEach(v => {
    const ml = Array.isArray(v.meeting_logs) ? v.meeting_logs[0] : v.meeting_logs;
    console.log(`Visit ${v.id.slice(0, 8)}: branch=${v.branches?.branch_name}, card=${ml?.business_card_photo_url}`);
  });
}

check();
