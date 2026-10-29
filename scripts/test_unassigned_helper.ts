import { createClient } from '@supabase/supabase-js';

const url = 'https://[SUPABASE_PROJECT_ID].supabase.co';
const key = '[SUPABASE_SERVICE_ROLE_KEY_REDACTED]';
const sb = createClient(url, key);

async function testUnassignedHelper() {
  const { data: rawDevices } = await sb
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

  const mapped = (rawDevices || []).map((row: any) => {
    const assignments = row.device_assignments || [];
    const active = assignments.find((a: any) => a.is_current === true && !a.returned_at);
    return {
      id: row.id,
      assetTag: row.asset_tag,
      serialNumber: row.serial_number,
      make: row.make,
      model: row.model,
      marketCode: row.market_code,
      inventoryStatus: row.inventory_status,
      assignedTo: active?.profiles ? { salespersonId: active.salesperson_id, fullName: active.profiles.full_name } : null,
      assignedSalespersonId: active?.salesperson_id || undefined,
    };
  });

  const isDeviceUnassignedForMarket = (d: any, marketCode: string): boolean => {
    if (d.marketCode !== marketCode) return false;
    const hasCustodian = Boolean(d.assignedTo?.salespersonId) || Boolean(d.assignedSalespersonId);
    if (hasCustodian) return false;
    const status = (d.inventoryStatus || '').toLowerCase();
    return status === 'available' || status === 'returned';
  };

  for (const m of ['NG', 'ZM', 'MW']) {
    const unassigned = mapped.filter((d) => isDeviceUnassignedForMarket(d, m));
    console.log(`\nMarket ${m}: Found ${unassigned.length} unassigned devices:`);
    for (const d of unassigned) {
      console.log(`  - ${d.assetTag} (${d.make} ${d.model}) [status: ${d.inventoryStatus}]`);
    }
  }
}

testUnassignedHelper();

