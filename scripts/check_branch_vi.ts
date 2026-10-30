import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const parts = line.trim().split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: pins } = await supabase.from('branch_location_pins').select('*').eq('branch_id', '60e85ff5-a921-4de4-94fc-4382da2f8e2f');
  console.log('Pins for branch vi:', pins);

  // Check RPC propose_branch_location_pin definition in Postgres
  const { data: rpcDef, error: rpcErr } = await supabase.rpc('propose_branch_location_pin', {
    p_branch_id: '60e85ff5-a921-4de4-94fc-4382da2f8e2f',
    p_latitude: 6.45,
    p_longitude: 3.42,
    p_accuracy_m: 15,
    p_photo_url: 'visit-premises-photos/test.jpg'
  });
  console.log('RPC test call result:', rpcDef, 'error:', rpcErr);
}

test().catch(console.error);

