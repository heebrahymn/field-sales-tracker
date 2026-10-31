import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://[SUPABASE_PROJECT_ID].supabase.co';
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const sb = createClient(url, anonKey);

async function testRegister() {
  console.log('1. Signing in as HQ Admin...');
  const { data: authData, error: authErr } = await sb.auth.signInWithPassword({
    email: 'hq.admin@carboncarcare.com',
    password: process.env.DEV_USER_PASSWORD || '',
  });

  if (authErr || !authData.user) {
    console.error('Sign in failed:', authErr);
    return;
  }

  console.log('   Authenticated user ID:', authData.user.id);

  const testAssetTag = `TEST-DEV-${Date.now().toString().slice(-4)}`;
  const testSerial = `SN-TEST-${Date.now().toString().slice(-4)}`;

  console.log(`2. Attempting to insert device: ${testAssetTag} / ${testSerial}`);
  const { data: insertData, error: insertErr } = await sb
    .from('devices')
    .insert({
      asset_id: testAssetTag,
      asset_tag: testAssetTag,
      serial_number: testSerial,
      make: 'Samsung',
      model: 'Galaxy A15 Enterprise',
      market_code: 'NG',
      inventory_status: 'available',
      security_authorization: 'authorized',
      knox_enrolled: true,
      registered_by: authData.user.id,
      supplier: 'Samsung West Africa Direct',
      os_version: 'Android 14 / One UI 6.0',
      purchase_date: new Date().toISOString().slice(0, 10),
      notes: 'Automated test device insertion',
    })
    .select('id, asset_tag, serial_number, inventory_status')
    .single();

  if (insertErr) {
    console.error('   Insert failed:', insertErr);
    return;
  }

  console.log('   ✓ Device inserted successfully in Supabase:', insertData);

  console.log('3. Cleaning up test device...');
  await sb.from('devices').delete().eq('id', insertData.id);
  console.log('   ✓ Cleaned up test device.');
}

testRegister();

