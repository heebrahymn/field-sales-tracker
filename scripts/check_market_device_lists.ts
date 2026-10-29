import { createClient } from '@supabase/supabase-js';

const url = 'https://[SUPABASE_PROJECT_ID].supabase.co';
const key = '[SUPABASE_SERVICE_ROLE_KEY_REDACTED]';
const sb = createClient(url, key);

async function checkMarkets() {
  const { data: devices } = await sb
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
        is_current,
        returned_at,
        profiles:salesperson_id (
          full_name,
          email
        )
      )
    `);

  for (const m of ['NG', 'ZM', 'MW']) {
    console.log(`\n=================== ${m} ===================`);
    const mDevs = devices?.filter((d) => d.market_code === m) || [];
    console.log(`Total devices in ${m}: ${mDevs.length}`);
    for (const d of mDevs) {
      const active = (d.device_assignments as any[])?.find((a) => a.is_current && !a.returned_at);
      console.log(`  Asset: ${d.asset_tag.padEnd(24)} | Status: ${d.inventory_status.padEnd(12)} | Assigned: ${active ? active.profiles?.full_name : 'No'}`);
    }
  }
}

checkMarkets();

