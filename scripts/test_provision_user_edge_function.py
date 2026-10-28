import os
import requests
import json

SUPABASE_URL = "https://[SUPABASE_PROJECT_ID].supabase.co"
PUBLISHABLE_KEY = "[VITE_SUPABASE_PUBLISHABLE_KEY]"
EDGE_FUNCTION_URL = f"{SUPABASE_URL}/functions/v1/admin-provision-user"

def get_env_var(key_name):
    val = os.environ.get(key_name)
    if not val and os.path.exists(".env.local"):
        with open(".env.local", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith(f"{key_name}="):
                    return line.strip().split("=", 1)[1]
    return val or ""

DEV_PASSWORD = get_env_var("DEV_USER_PASSWORD") or "[DEV_USER_PASSWORD_REDACTED]"

def login(email):
    r = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": PUBLISHABLE_KEY, "Content-Type": "application/json"},
        json={"email": email, "password": DEV_PASSWORD},
    )
    assert r.status_code == 200, f"Login failed for {email}: {r.text}"
    return r.json()["access_token"], r.json()["user"]["id"]

def run():
    print("=" * 80)
    print("TESTING SECURE HQ ADMIN PROVISIONING EDGE FUNCTION")
    print(f"Target: {EDGE_FUNCTION_URL}")
    print("=" * 80)

    # 1. Unauthenticated invocation
    print("\n[1] Testing unauthenticated call...")
    r_unauth = requests.post(
        EDGE_FUNCTION_URL,
        headers={"apikey": PUBLISHABLE_KEY, "Content-Type": "application/json"},
        json={"email": "hacker@carboncarcare.com"}
    )
    print(f"  Status: {r_unauth.status_code}")
    assert r_unauth.status_code == 401, f"Expected 401, got {r_unauth.status_code}: {r_unauth.text}"
    print("  PASS: Unauthenticated call rejected with 401.")

    # 2. Salesperson invocation
    print("\n[2] Testing Salesperson caller (Tunde Adebayo)...")
    rep_token, rep_id = login("tunde.adebayo@carboncarcare.com")
    r_rep = requests.post(
        EDGE_FUNCTION_URL,
        headers={
            "apikey": PUBLISHABLE_KEY,
            "Authorization": f"Bearer {rep_token}",
            "Content-Type": "application/json"
        },
        json={
            "first_name": "Unauthorized",
            "last_name": "User",
            "email": "unauth@carboncarcare.com",
            "role": "salesperson",
            "market_code": "NG"
        }
    )
    print(f"  Status: {r_rep.status_code}, Response: {r_rep.text}")
    assert r_rep.status_code == 403, f"Expected 403, got {r_rep.status_code}: {r_rep.text}"
    print("  PASS: Salesperson caller rejected with 403 Forbidden.")

    # 3. Country Sales Head invocation
    print("\n[3] Testing Country Sales Head caller (Babatunde Adeleke)...")
    csh_token, csh_id = login("babatunde.adeleke@carboncarcare.com")
    r_csh = requests.post(
        EDGE_FUNCTION_URL,
        headers={
            "apikey": PUBLISHABLE_KEY,
            "Authorization": f"Bearer {csh_token}",
            "Content-Type": "application/json"
        },
        json={
            "first_name": "Unauthorized",
            "last_name": "User",
            "email": "unauth2@carboncarcare.com",
            "role": "salesperson",
            "market_code": "NG"
        }
    )
    print(f"  Status: {r_csh.status_code}, Response: {r_csh.text}")
    assert r_csh.status_code == 403, f"Expected 403, got {r_csh.status_code}: {r_csh.text}"
    print("  PASS: Country Sales Head caller rejected with 403 Forbidden.")

    # 4. HQ Admin creates a Nigeria Salesperson
    print("\n[4] Testing HQ Admin provisioning a new Nigeria Salesperson...")
    hq_token, hq_id = login("hq.admin@carboncarcare.com")
    test_rep_email = "femi.alabi.test@carboncarcare.com"

    # Cleanup if previously created in testing
    r_check = requests.get(
        f"{SUPABASE_URL}/rest/v1/profiles?email=eq.{test_rep_email}",
        headers={"apikey": PUBLISHABLE_KEY, "Authorization": f"Bearer {hq_token}"}
    )
    if r_check.status_code == 200 and len(r_check.json()) > 0:
        existing_id = r_check.json()[0]["id"]
        print(f"  Cleaning up existing test user {existing_id}...")
        requests.delete(f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{existing_id}", headers={"apikey": PUBLISHABLE_KEY, "Authorization": f"Bearer {hq_token}"})

    r_prov = requests.post(
        EDGE_FUNCTION_URL,
        headers={
            "apikey": PUBLISHABLE_KEY,
            "Authorization": f"Bearer {hq_token}",
            "Content-Type": "application/json"
        },
        json={
            "first_name": "Femi",
            "last_name": "Alabi",
            "email": test_rep_email,
            "phone_number": "+2348055566778",
            "role": "salesperson",
            "market_code": "NG",
            "password": "[DEV_USER_PASSWORD_REDACTED]"
        }
    )
    print(f"  Status: {r_prov.status_code}")
    print(f"  Response: {r_prov.text}")
    assert r_prov.status_code == 201, f"Expected 201, got {r_prov.status_code}: {r_prov.text}"
    prov_data = r_prov.json()
    new_user_id = prov_data["user"]["id"]
    print(f"  PASS: User provisioned successfully with UUID: {new_user_id}")

    # 5. Verify database profile persistence
    print("\n[5] Verifying profile record in public.profiles...")
    r_prof = requests.get(
        f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{new_user_id}",
        headers={"apikey": PUBLISHABLE_KEY, "Authorization": f"Bearer {hq_token}"}
    )
    assert r_prof.status_code == 200 and len(r_prof.json()) == 1, "Profile not found!"
    profile = r_prof.json()[0]
    print(f"  Found profile: {profile['full_name']} | Role: {profile['role']} | Market: {profile['market_code']} | Active: {profile['is_active']}")
    assert profile["full_name"] == "Femi Alabi"
    assert profile["role"] == "salesperson"
    assert profile["market_code"] == "NG"
    assert profile["is_active"] is True
    print("  PASS: Profile persistence verified with identical UUID, role, and market.")

    # 6. Verify newly created employee can authenticate!
    print("\n[6] Testing authentication with the newly provisioned employee credentials...")
    r_login = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": PUBLISHABLE_KEY, "Content-Type": "application/json"},
        json={"email": test_rep_email, "password": "[DEV_USER_PASSWORD_REDACTED]"},
    )
    print(f"  Login status: {r_login.status_code}")
    assert r_login.status_code == 200, f"New employee failed to authenticate: {r_login.text}"
    new_token = r_login.json()["access_token"]
    print(f"  PASS: Newly created employee logged in successfully! Token received.")

    # 7. Verify new employee's RLS boundaries
    print("\n[7] Testing new employee session RLS boundaries...")
    # Rep queries own profile
    r_own = requests.get(
        f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{new_user_id}",
        headers={"apikey": PUBLISHABLE_KEY, "Authorization": f"Bearer {new_token}"}
    )
    assert r_own.status_code == 200 and len(r_own.json()) == 1, "Rep cannot read own profile!"
    print("  PASS: New employee authenticated session works with RLS.")

    # 8. Test duplicate email rejection
    print("\n[8] Testing duplicate email rejection...")
    r_dup = requests.post(
        EDGE_FUNCTION_URL,
        headers={
            "apikey": PUBLISHABLE_KEY,
            "Authorization": f"Bearer {hq_token}",
            "Content-Type": "application/json"
        },
        json={
            "first_name": "Duplicate",
            "last_name": "User",
            "email": test_rep_email,
            "role": "salesperson",
            "market_code": "NG"
        }
    )
    print(f"  Duplicate Status: {r_dup.status_code}, Response: {r_dup.text}")
    assert r_dup.status_code in (400, 409), f"Expected 400 or 409, got {r_dup.status_code}"
    print("  PASS: Duplicate email correctly rejected.")

    # 9. Test invalid market assignment for global HQ Admin
    print("\n[9] Testing invalid market assignment...")
    r_inv = requests.post(
        EDGE_FUNCTION_URL,
        headers={
            "apikey": PUBLISHABLE_KEY,
            "Authorization": f"Bearer {hq_token}",
            "Content-Type": "application/json"
        },
        json={
            "first_name": "Bad",
            "last_name": "Market",
            "email": "bad.market@carboncarcare.com",
            "role": "salesperson",
            "market_code": "INVALID_COUNTRY"
        }
    )
    print(f"  Invalid Market Status: {r_inv.status_code}")
    assert r_inv.status_code == 400, f"Expected 400, got {r_inv.status_code}"
    print("  PASS: Invalid market rejected.")

    print("\n" + "=" * 80)
    print("ALL EDGE FUNCTION PROVISIONING TESTS PASSED 100%!")
    print("=" * 80)

if __name__ == "__main__":
    run()

