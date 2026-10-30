import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

function loadEnv() {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const env: Record<string, string> = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
      }
    }
  });
  return env;
}

const env = loadEnv();
const supabase = createClient(env['VITE_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function main() {
  const { data: reqs, error: reqErr } = await supabase
    .from('device_replacement_requests')
    .select('*')
    .eq('id', 'ca5d7e5b-106e-41e7-81c4-92c0ed049d52');

  console.log('SPECIFIC REQ ca5d7e5b:', reqs, reqErr);

  const { data: targetDevice } = await supabase
    .from('devices')
    .select('*')
    .ilike('asset_tag', '%121585%');

  console.log('DEVICE CAR-TST-121585:', targetDevice);

  const { data: devs } = await supabase
    .from('devices')
    .select('id, asset_tag, inventory_status, market_code')
    .limit(10);
  console.log('DEVICES:', JSON.stringify(devs, null, 2));

  const { data: assigns } = await supabase
    .from('device_assignments')
    .select('id, device_id, salesperson_id, is_current, assigned_at, returned_at, handover_reason, devices(asset_tag)')
    .eq('is_current', true);
  console.log('ACTIVE ASSIGNMENTS:', JSON.stringify(assigns, null, 2));
}

main().catch(console.error);
