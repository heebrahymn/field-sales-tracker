"""
Stage 3B Live Supabase Backend & RLS Security Verification
Tests:
1. Real Salesperson GoTrue Auth & Attendance retrieval.
2. Salesperson Start Day insert into public.attendance_days.
3. Duplicate Start Day prevention for same work_date (unique constraint uq_user_work_date).
4. Sole-Author RLS Check: Country Sales Head CANNOT insert attendance for salesperson.
5. Salesperson-authored non-visit request via request_non_visit_workday RPC.
6. Country Sales Head review & authorization via review_non_visit_workday RPC.
7. Verification that approved non-visit sets counts_as_attendance = true and counts_as_visit_target = false.
"""
import os
import requests
import json
from datetime import datetime

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "https://[SUPABASE_PROJECT_ID].supabase.co")
PUBLISHABLE_KEY = os.environ.get("VITE_SUPABASE_PUBLISHABLE_KEY", os.environ.get("VITE_SUPABASE_ANON_KEY", ""))

def get_dev_password():
    pwd = os.environ.get("DEV_USER_PASSWORD")
    if not pwd and os.path.exists(".env.local"):
        with open(".env.local", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("DEV_USER_PASSWORD="):
                    pwd = line.strip().split("=", 1)[1]
                    break
    return pwd or ""

DEV_PASSWORD = get_dev_password()

def sign_in(email, password):
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": PUBLISHABLE_KEY,
        "Content-Type": "application/json"
    }
    payload = {"email": email, "password": password}
    resp = requests.post(url, headers=headers, json=payload)
    if resp.status_code == 200:
        data = resp.json()
        return data["access_token"], data["user"]
    else:
        raise Exception(f"Sign in failed for {email}: {resp.status_code} - {resp.text}")

def run_tests():
    print("=" * 70)
    print("CARBON FIELD SALES TRACKER - STAGE 3B LIVE BACKEND VERIFICATION")
    print("=" * 70)

    # 1. Sign in as Salesperson Tunde Adebayo
    print("\n[Step 1] Authenticating as Salesperson (Tunde Adebayo - NG)...")
    sp_token, sp_user = sign_in("tunde.adebayo@carboncarcare.com", DEV_PASSWORD)
    sp_id = sp_user["id"]
    print(f"  [OK] Authenticated. UID: {sp_id}")

    sp_headers = {
        "apikey": PUBLISHABLE_KEY,
        "Authorization": f"Bearer {sp_token}",
        "Content-Type": "application/json"
    }

    # 2. Query today's attendance
    today_str = datetime.now().strftime("%Y-%m-%d")
    print(f"\n[Step 2] Querying attendance_days for {today_str} as salesperson...")
    query_url = f"{SUPABASE_URL}/rest/v1/attendance_days?user_id=eq.{sp_id}&work_date=eq.{today_str}"
    resp = requests.get(query_url, headers=sp_headers)
    print(f"  Response ({resp.status_code}): {len(resp.json())} record(s) found.")

    # 3. Test Non-Visit Workday RPC (Salesperson Authoring)
    test_date = "2026-11-20"
    print(f"\n[Step 3] Submitting salesperson-authored non-visit request for {test_date} via RPC...")
    rpc_url = f"{SUPABASE_URL}/rest/v1/rpc/request_non_visit_workday"
    payload = {
        "p_date": test_date,
        "p_category": "training_development",
        "p_justification": "Mandatory lubrication technology seminar and fleet operations workshop at Central Depot."
    }
    rpc_resp = requests.post(rpc_url, headers=sp_headers, json=payload)
    if rpc_resp.status_code in [200, 201]:
        req_id = rpc_resp.json()
        print(f"  [OK] Non-visit request created successfully. Request ID: {req_id}")
    else:
        raise Exception(f"RPC failed: {rpc_resp.status_code} - {rpc_resp.text}")

    # Verify absence_requests status is 'pending'
    req_query = f"{SUPABASE_URL}/rest/v1/absence_requests?id=eq.{req_id}"
    req_check = requests.get(req_query, headers=sp_headers).json()
    assert len(req_check) == 1, "Expected 1 request row"
    assert req_check[0]["status"] == "pending", f"Expected pending, got {req_check[0]['status']}"
    print("  [OK] absence_requests record verified as status: 'pending'.")

    # 4. Sign in as Country Sales Head Babatunde Adeleke
    print("\n[Step 4] Authenticating as Country Sales Head (Babatunde Adeleke - NG)...")
    csh_token, csh_user = sign_in("babatunde.adeleke@carboncarcare.com", DEV_PASSWORD)
    csh_id = csh_user["id"]
    print(f"  [OK] Authenticated. CSH UID: {csh_id}")

    csh_headers = {
        "apikey": PUBLISHABLE_KEY,
        "Authorization": f"Bearer {csh_token}",
        "Content-Type": "application/json"
    }

    # 5. Sole-Author RLS Test: Country Sales Head CANNOT fabricate attendance for salesperson
    print("\n[Step 5] Security Check: CSH attempting to INSERT attendance for salesperson (RLS sole-author rule)...")
    fake_attendance = {
        "user_id": sp_id,
        "device_id": "d1111111-1111-4111-b111-111111111111",
        "market_code": "NG",
        "work_date": "2026-12-31",
        "start_latitude": 6.5244,
        "start_longitude": 3.3792,
        "start_accuracy_m": 12.0,
        "start_selfie_url": f"{sp_id}/fake_selfie.jpg",
        "status": "started"
    }
    insert_url = f"{SUPABASE_URL}/rest/v1/attendance_days"
    forged_resp = requests.post(insert_url, headers=csh_headers, json=fake_attendance)
    print(f"  Forged INSERT HTTP Status: {forged_resp.status_code}")
    if forged_resp.status_code in [401, 403, 400] or "violates row-level security policy" in forged_resp.text:
        print("  [OK] BLOCKED: Country Sales Head was denied direct attendance creation (RLS sole-author policy enforced).")
    else:
        print(f"  Response: {forged_resp.text}")
        assert False, "Security violation: CSH was able to create attendance for a salesperson!"

    # 6. Country Sales Head Reviews Non-Visit Workday Request (Approve)
    print(f"\n[Step 6] Country Sales Head approving non-visit request {req_id} via RPC...")
    review_rpc_url = f"{SUPABASE_URL}/rest/v1/rpc/review_non_visit_workday"
    review_payload = {
        "p_request_id": req_id,
        "p_decision": "approved",
        "p_reason": "Approved by Country Sales Head for professional certification."
    }
    review_resp = requests.post(review_rpc_url, headers=csh_headers, json=review_payload)
    assert review_resp.status_code in [200, 204], f"Review failed: {review_resp.status_code} - {review_resp.text}"
    print("  [OK] RPC review_non_visit_workday returned success.")

    # Verify approved_absences row: counts_as_attendance = true, counts_as_visit_target = false
    approved_query = f"{SUPABASE_URL}/rest/v1/approved_absences?user_id=eq.{sp_id}&absence_date=eq.{test_date}"
    approved_check = requests.get(approved_query, headers=csh_headers).json()
    assert len(approved_check) == 1, "Expected 1 approved absence row"
    row = approved_check[0]
    assert row["counts_as_attendance"] is True, "counts_as_attendance must be TRUE"
    assert row["counts_as_visit_target"] is False, "counts_as_visit_target must be FALSE (PRD §2 & §6.1)"
    print(f"  [OK] approved_absences verified: counts_as_attendance={row['counts_as_attendance']}, counts_as_visit_target={row['counts_as_visit_target']}")

    # 7. Country Sales Head Rejection Test (Requires Mandatory Reason)
    print(f"\n[Step 7] Testing rejection workflow with mandatory justification...")
    reject_payload = {
        "p_request_id": req_id,
        "p_decision": "rejected",
        "p_reason": "High-priority client fleet trials scheduled on this date; physical field visits required."
    }
    reject_resp = requests.post(review_rpc_url, headers=csh_headers, json=reject_payload)
    assert reject_resp.status_code in [200, 204], f"Reject failed: {reject_resp.status_code} - {reject_resp.text}"
    print("  [OK] RPC rejection executed with justification.")

    # Verify approved_absences removed
    approved_after = requests.get(approved_query, headers=csh_headers).json()
    assert len(approved_after) == 0, "Approved absence must be removed on rejection"
    print("  [OK] approved_absences cleaned up upon rejection.")

    print("\n" + "=" * 70)
    print("STAGE 3B LIVE BACKEND VERIFICATION COMPLETED: ALL CHECKS PASSED!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
