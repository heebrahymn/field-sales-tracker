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
const password = env.DEV_USER_PASSWORD || env.SEED_TEST_USER_PASSWORD || process.env.DEV_USER_PASSWORD || '';

const supabase = createClient(url, key);

async function test() {
  await supabase.auth.signInWithPassword({
    email: 'tunde.adebayo@carboncarcare.com',
    password: password
  });

  const { data: branches, error } = await supabase
    .from('branches')
    .select(`
      id,
      branch_name,
      operating_status,
      category,
      city,
      street_address,
      switchboard_phone,
      estimated_fleet_size,
      market_code,
      organisation_id,
      organisations (
        id,
        name,
        market_code
      ),
      client_contacts (
        id,
        full_name,
        designation,
        phone_number,
        email,
        is_primary
      ),
      branch_location_pins (
        id,
        latitude,
        longitude,
        reported_accuracy_m,
        status,
        is_active,
        version_number
      )
    `)
    .eq('market_code', 'NG');

  console.log('Branches returned for Tunde:', branches?.length, 'error:', error?.message);
  if (branches) {
    branches.forEach((b: any) => {
      const approvedPin = b.branch_location_pins?.find((p: any) => p.is_active && p.status === 'approved');
      console.log(`Branch: "${b.branch_name}" (${b.id}) - operating_status: ${b.operating_status} - approvedPin: ${Boolean(approvedPin)}`);
    });
  }
}

test().catch(console.error);

