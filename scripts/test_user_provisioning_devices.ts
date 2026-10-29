import { createClient } from '@supabase/supabase-js';

const url = 'https://[SUPABASE_PROJECT_ID].supabase.co';
const key = '[SUPABASE_SERVICE_ROLE_KEY_REDACTED]';
const sb = createClient(url, key);

async function testDropdown() {
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
      created_at,
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
    `)
    .order('asset_tag', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Reproduce adminService.getHqDevices mapping
  const records = (data || []).map((row: any) => {
    const assignments = row.device_assignments || [];
    const isDepot = row.inventory_status === 'available' || row.inventory_status === 'returned';
    const activeAssignment = !isDepot
      ? assignments.find((a: any) => a.is_current === true && !a.returned_at)
      : null;

    return {
      id: row.id,
      assetTag: row.asset_tag,
      serialNumber: row.serial_number,
      make: row.make,
      model: row.model,
      marketCode: row.market_code,
      inventoryStatus: row.inventory_status,
      assignedTo: activeAssignment?.profiles
        ? {
            salespersonId: activeAssignment.profiles.id,
            fullName: activeAssignment.profiles.full_name,
            email: activeAssignment.profiles.email,
            assignedAt: activeAssignment.assigned_at,
          }
        : null,
      createdAt: row.created_at,
    };
  });

  // Reproduce HqUserManagement isDeviceUnassignedForMarket
  const isDeviceUnassignedForMarket = (device: any, targetMarket: string) => {
    if (!device || device.marketCode !== targetMarket) return false;
    const statusNormalized = (device.inventoryStatus || '').toLowerCase();
    const isDepotStatus = statusNormalized === 'available' || statusNormalized === 'returned';
    const hasNoActiveAssignee = !device.assignedTo;
    return isDepotStatus && hasNoActiveAssignee;
  };

  for (const m of ['NG', 'ZM', 'MW']) {
    const filtered = records.filter((d) => isDeviceUnassignedForMarket(d, m));
    console.log(`\n=== Market ${m} Available/Depot Devices (${filtered.length}) ===`);
    for (const d of filtered) {
      console.log(`  ${d.assetTag} — ${d.make} ${d.model} [${d.inventoryStatus}]`);
    }
  }
}

testDropdown();

