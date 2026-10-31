import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://[SUPABASE_PROJECT_ID].supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const sb = createClient(url, key);

async function check() {
  const { data: devices, error } = await sb
    .from('devices')
    .select('id, asset_tag, market_code, inventory_status, device_assignments(id, salesperson_id, is_current, returned_at)');

  if (error) {
    console.error('Error fetching devices:', error);
    return;
  }

  const depotDevices = devices.filter(
    (d) => d.inventory_status === 'available' || d.inventory_status === 'returned'
  );
  console.log('Depot devices count:', depotDevices.length);

  const problematic = depotDevices.filter(
    (d) => d.device_assignments && d.device_assignments.some((a: any) => a.is_current === true)
  );

  console.log('Depot devices with is_current === true:', problematic.length);
  for (const p of problematic) {
    console.log(p.asset_tag, p.market_code, p.inventory_status, p.device_assignments);
  }
}

check();
