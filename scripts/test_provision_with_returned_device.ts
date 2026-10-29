import { createClient } from '@supabase/supabase-js';

const url = 'https://[SUPABASE_PROJECT_ID].supabase.co';
const key = '[SUPABASE_SERVICE_ROLE_KEY_REDACTED]';
const sb = createClient(url, key);

async function testEdgeFunctionProvisionWithDevice() {
  console.log('Testing Edge Function user provisioning with unassigned returned device...');

  // Pick one returned depot device in NG, e.g., CC-DEV-LOS-SPARE-CF6F
  const { data: dev } = await sb
    .from('devices')
    .select('id, asset_tag, inventory_status')
    .eq('asset_tag', 'CC-DEV-LOS-SPARE-CF6F')
    .single();

  if (!dev) {
    console.error('Device not found');
    return;
  }
  console.log('Target device:', dev);

  // We can test that the device is recognized as assignable
  console.log('Device status is:', dev.inventory_status);
}

testEdgeFunctionProvisionWithDevice();

