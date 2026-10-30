import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const parts = line.trim().split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: branches, error: bErr } = await supabase
    .from('branches')
    .select(`
      id, branch_name, market_code, operating_status,
      organisations (id, name),
      branch_location_pins (id, latitude, longitude, status, is_active, reported_accuracy_m, premises_photo_url)
    `);
  console.log('Branches count:', branches?.length, 'Error:', bErr?.message);
  if (branches) {
    branches.forEach(b => {
      console.log(`Branch: ${b.branch_name} | status: ${b.operating_status} | pins: ${b.branch_location_pins?.length} | pin_statuses: ${b.branch_location_pins?.map((p: any) => p.status + '(active=' + p.is_active + ', photo=' + p.premises_photo_url + ')').join(', ')}`);
    });
  }

  const { data: pins, error: pErr } = await supabase
    .from('branch_location_pins')
    .select('id, branch_id, status, is_active, premises_photo_url, proposed_at');
  console.log('Total pins:', pins?.length, 'Error:', pErr?.message);
}

check().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
