from supabase import create_client
import os

url = 'https://[SUPABASE_PROJECT_ID].supabase.co'
key = '[SUPABASE_SERVICE_ROLE_KEY_REDACTED]'
sb = create_client(url, key)

res = sb.from_('devices').select('id, asset_tag, serial_number, make, model, market_code, inventory_status, device_assignments(*)').execute()
print(f"Total devices in DB: {len(res.data)}")
for d in res.data:
    assignments = d.get('device_assignments', [])
    active = [a for a in assignments if a.get('is_current')]
    unreturned = [a for a in assignments if a.get('returned_at') is None]
    print(f"Tag: {d['asset_tag']:<20} | Market: {d['market_code']} | Status: {d['inventory_status']:<15} | All Assigns: {len(assignments)} | Active(is_current): {len(active)} | Unreturned: {len(unreturned)}")

