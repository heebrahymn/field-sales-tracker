import os
import requests

url = 'https://[SUPABASE_PROJECT_ID].supabase.co'
key = ''
if os.path.exists('.env.local'):
    with open('.env.local', 'r') as f:
        for line in f:
            if line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
                key = line.strip().split('=', 1)[1]

headers = {'apikey': key, 'Authorization': f'Bearer {key}'}

tables = [
    'profiles', 'devices', 'device_assignments', 'organisations', 'branches', 
    'client_contacts', 'branch_location_pins', 'attendance_days', 'visits', 
    'meeting_logs', 'exceptions', 'verification_flags', 'client_audit_records', 
    'device_replacement_requests', 'import_batches', 'market_rules', 'approval_audit'
]

print('Checking Supabase dev project counts:')
for t in tables:
    try:
        r = requests.get(f'{url}/rest/v1/{t}?select=id', headers={**headers, 'Range': '0-0', 'Prefer': 'count=exact'}, timeout=10)
        content_range = r.headers.get('Content-Range', '0-0/0')
        count = content_range.split('/')[-1] if '/' in content_range else 'error'
        print(f'  {t:30}: {count} (HTTP {r.status_code})')
    except Exception as e:
        print(f'  {t:30}: ERROR {e}')

