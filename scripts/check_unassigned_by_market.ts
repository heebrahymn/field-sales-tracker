import { createClient } from '@supabase/supabase-js';

const url = 'https://[SUPABASE_PROJECT_ID].supabase.co';
const key = '[SUPABASE_SERVICE_ROLE_KEY_REDACTED]';
const sb = createClient(url, key);

async function check() {
  const { data: devices, error } = await sb
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
          id,
          full_name,
          email
        )
      )
    `)
    .order('market_code', { ascending: true })
    .order('asset_tag', { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  console.log(`\n=== UNASSIGNED / DEPOT DEVICES BY MARKET ===`);
  const markets = ['NG', 'ZM', 'MW'];
  for (const m of markets) {
    console.log(`\n--- Market: ${m} ---`);
    const marketDevs = devices.filter((d) => d.market_code === m);
    for (const d of marketDevs) {
      const activeAssign = (d.device_assignments as any[])?.find((a) => a.is_current && !a.returned_at);
      const isUnassigned = !activeAssign && (d.inventory_status === 'available' || d.inventory_status === 'returned');
      const assignedName = activeAssign ? activeAssign.profiles?.full_name : 'UNASSIGNED';
      console.log(
        `${isUnassigned ? '[AVAILABLE/DEPOT]' : '[ASSIGNED/INACTIVE]'} ${d.asset_tag.padEnd(25)} | DB status: ${d.inventory_status.padEnd(12)} | Custodian: ${assignedName}`
      );
    }
  }
}

check();

