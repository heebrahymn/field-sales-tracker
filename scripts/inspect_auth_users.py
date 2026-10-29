from supabase import create_client

url = 'https://[SUPABASE_PROJECT_ID].supabase.co'
key = '[SUPABASE_SERVICE_ROLE_KEY_REDACTED]'
sb = create_client(url, key)

print("PROFILES:")
res = sb.from_('profiles').select('id, full_name, email, role, market_code').execute()
for p in res.data:
    print(f"  {p['email']:<35} | {p['role']:<18} | {p['market_code']}")

print("\nATTENDANCE DAYS TODAY:")
res2 = sb.from_('attendance_days').select('id, user_id, work_date, status, created_at').order('created_at', desc=True).limit(10).execute()
for a in res2.data:
    print(f"  User: {a['user_id']} | Date: {a['work_date']} | Status: {a['status']} | Created: {a['created_at']}")

