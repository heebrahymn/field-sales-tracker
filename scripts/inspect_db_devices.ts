import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://[SUPABASE_PROJECT_ID].supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const sb = createClient(url, key);

async function inspect() {
  const { data, error } = await sb
    .from('devices')
    .select(`
      id,
      asset_tag,
      serial_number,
      make,
      model,
      market_code,
      inventory_status,
      device_assignments (
        id,
        salesperson_id,
        assigned_at,
        returned_at,
        is_current,
        profiles:salesperson_id (
          id,
          full_name,
          email
        )
      )
    `);

  if (error) {
    console.error('Error fetching devices:', error);
    return;
  }

  console.log(`Total devices in DB: ${data?.length}`);
  for (const d of data || []) {
    const assigns = (d.device_assignments as any[]) || [];
    const active = assigns.filter((a) => a.is_current);
    const unreturned = assigns.filter((a) => a.returned_at === null);
    console.log(
      `Tag: ${d.asset_tag.padEnd(24)} | Market: ${d.market_code} | Status: ${d.inventory_status.padEnd(12)} | All Assigns: ${assigns.length} | Active(is_current): ${active.length} | Unreturned: ${unreturned.length}`
    );
  }
}

inspect();

