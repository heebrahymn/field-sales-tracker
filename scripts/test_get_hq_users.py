import os
import requests

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "https://[SUPABASE_PROJECT_ID].supabase.co")
PUBLISHABLE_KEY = os.environ.get("VITE_SUPABASE_PUBLISHABLE_KEY", os.environ.get("VITE_SUPABASE_ANON_KEY", ""))

def get_env_var(key_name):
    val = os.environ.get(key_name)
    if not val and os.path.exists(".env.local"):
        with open(".env.local", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith(f"{key_name}="):
                    return line.strip().split("=", 1)[1]
    return val or ""

DEV_PASSWORD = get_env_var("DEV_USER_PASSWORD")

r = requests.post(
    f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
    headers={"apikey": PUBLISHABLE_KEY, "Content-Type": "application/json"},
    json={"email": "hq.admin@carboncarcare.com", "password": DEV_PASSWORD},
)
assert r.status_code == 200, f"Login failed: {r.text}"
token = r.json()["access_token"]
print("HQ Admin logged in successfully!")

# Test with disambiguated relationship: device_assignments!device_assignments_salesperson_id_fkey
query_url = f"{SUPABASE_URL}/rest/v1/profiles?select=id,full_name,email,phone_number,role,market_code,is_active,created_at,device_assignments!device_assignments_salesperson_id_fkey(id,device_id,assigned_at,returned_at,is_current,devices:device_id(id,asset_tag,make,model,inventory_status))&order=full_name.asc"
r2 = requests.get(
    query_url,
    headers={
        "apikey": PUBLISHABLE_KEY,
        "Authorization": f"Bearer {token}",
    }
)
print("Status:", r2.status_code)
if r2.status_code == 200:
    users = r2.json()
    print(f"SUCCESS! Retrieved {len(users)} profiles via getHqUsers query:")
    for u in users:
        devs = u.get("device_assignments!device_assignments_salesperson_id_fkey") or []
        dev_tag = devs[0]["devices"]["asset_tag"] if devs and devs[0].get("devices") else "No Device"
        print(f"  {u.get('email')} | {u.get('role')} | {u.get('market_code')} | active={u.get('is_active')} | dev={dev_tag}")
else:
    print("Error:", r2.text)
