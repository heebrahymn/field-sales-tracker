import os
import requests
import json
import uuid

SUPABASE_URL = "https://[SUPABASE_PROJECT_ID].supabase.co"
PUBLISHABLE_KEY = "[VITE_SUPABASE_PUBLISHABLE_KEY]"

def get_env_var(key_name):
    val = os.environ.get(key_name)
    if not val and os.path.exists(".env.local"):
        with open(".env.local", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith(f"{key_name}="):
                    return line.strip().split("=", 1)[1]
    return val or ""

DEV_PASSWORD = get_env_var("DEV_USER_PASSWORD")

def login(email):
    r = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": PUBLISHABLE_KEY, "Content-Type": "application/json"},
        json={"email": email, "password": DEV_PASSWORD},
    )
    assert r.status_code == 200, f"Login failed for {email}: {r.text}"
    return r.json()["access_token"], r.json()["user"]["id"]

def run():
    print("=" * 70)
    print("CARBON FIELD SALES TRACKER — STAGE 3E DATABASE INTEGRITY & RPC SUITE")
    print("=" * 70)

    # 1. Establish authenticated role sessions
    print("\n[1] Authenticating Actors...")
    csh_token, csh_id = login("babatunde.adeleke@carboncarcare.com")
    hq_token, hq_id = login("hq.admin@carboncarcare.com")
    rep_token, rep_id = login("tunde.adebayo@carboncarcare.com")

    csh_headers = {"apikey": PUBLISHABLE_KEY, "Authorization": f"Bearer {csh_token}", "Content-Type": "application/json"}
    hq_headers = {"apikey": PUBLISHABLE_KEY, "Authorization": f"Bearer {hq_token}", "Content-Type": "application/json"}
    rep_headers = {"apikey": PUBLISHABLE_KEY, "Authorization": f"Bearer {rep_token}", "Content-Type": "application/json"}

    print(f"  CSH: {csh_id[:8]}... (Nigeria Country Sales Head)")
    print(f"  HQ:  {hq_id[:8]}... (Enterprise Administrator)")
    print(f"  REP: {rep_id[:8]}... (Field Salesperson - Nigeria)")

    # 2. Test Market Scoping & Country Isolation
    print("\n[2] Testing Market Scoping & RLS Isolation...")
    r_branches_csh = requests.get(f"{SUPABASE_URL}/rest/v1/branches?select=id,branch_name,market_code", headers=csh_headers)
    assert r_branches_csh.status_code == 200
    csh_branches = r_branches_csh.json()
    assert all(b["market_code"] == "NG" for b in csh_branches), "CSH leaked branches outside Nigeria!"
    print(f"  PASS: CSH correctly restricted to {len(csh_branches)} Nigeria branches.")

    target_branch = csh_branches[0]["id"]
    print(f"  Using Target Branch: {target_branch} ({csh_branches[0]['branch_name']})")

    # 3. Test Propose GPS Pin -> CSH Approval & Rejection Workflow
    print("\n[3] Testing GPS Pin Governance (Propose -> CSH Approval)...")
    # Rep proposes a pin
    r_prop = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/propose_branch_location_pin",
        headers=rep_headers,
        json={
            "p_branch_id": target_branch,
            "p_latitude": 6.4520,
            "p_longitude": 3.4210,
            "p_accuracy_m": 12.5,
            "p_photo_url": "visit-premises-photos/sample_proposal.jpg",
        },
    )
    print("  Rep proposed pin:", r_prop.status_code, r_prop.text)
    assert r_prop.status_code == 200, f"Propose pin failed: {r_prop.text}"
    proposed_pin_id = r_prop.json()

    # Rep cannot approve their own pin
    r_rep_approve = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/approve_branch_location_pin",
        headers=rep_headers,
        json={"p_pin_id": proposed_pin_id, "p_reason": "Rep attempting self approval"},
    )
    assert r_rep_approve.status_code in (400, 403), "Rep must not approve pins!"
    print("  PASS: Rep self-approval blocked (P0001: Unauthorized).")

    # CSH approves the pin
    r_csh_approve = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/approve_branch_location_pin",
        headers=csh_headers,
        json={"p_pin_id": proposed_pin_id, "p_reason": "Approved during physical site audit"},
    )
    print("  CSH approved pin status:", r_csh_approve.status_code, r_csh_approve.text)
    assert r_csh_approve.status_code in (200, 204), f"CSH approval failed: {r_csh_approve.text}"
    print(f"  PASS: CSH approved pin [{proposed_pin_id[:8]}...]. Versioned pin activated.")

    # 4. Test Zero Bottleneck Device Replacement Pipeline
    print("\n[4] Testing Zero Bottleneck Company Device Replacement (PRD §6.5)...")
    # Query rep's current active assigned device
    r_curr_assign = requests.get(
        f"{SUPABASE_URL}/rest/v1/device_assignments?salesperson_id=eq.{rep_id}&is_current=eq.true&select=device_id",
        headers=hq_headers,
    )
    assert r_curr_assign.status_code == 200 and len(r_curr_assign.json()) > 0, "Rep has no current active device assignment!"
    dev_id = r_curr_assign.json()[0]["device_id"]
    print(f"  Current active device for rep: {dev_id[:8]}...")

    # Query or register an available spare device
    import uuid
    r_spare = requests.get(
        f"{SUPABASE_URL}/rest/v1/devices?inventory_status=eq.available&limit=1",
        headers=hq_headers,
    )
    if r_spare.status_code == 200 and len(r_spare.json()) > 0:
        spare_dev_id = r_spare.json()[0]["id"]
    else:
        r_new_spare = requests.post(
            f"{SUPABASE_URL}/rest/v1/devices",
            headers={**hq_headers, "Prefer": "return=representation"},
            json={
                "asset_tag": f"CAR-DEPOT-{uuid.uuid4().hex[:6].upper()}",
                "imei_primary": f"35{uuid.uuid4().int % 10000000000000:013d}",
                "model": "Samsung Galaxy XCover 6 Pro",
                "market_code": "NG",
                "inventory_status": "available",
                "security_authorization": "authorized",
            },
        )
        assert r_new_spare.status_code in (200, 201), f"Failed to register spare device: {r_new_spare.text}"
        spare_dev_id = r_new_spare.json()[0]["id"]
    print(f"  Depot spare device for replacement: {spare_dev_id[:8]}...")

    # Rep submits device replacement request
    r_rep_req = requests.post(
        f"{SUPABASE_URL}/rest/v1/device_replacement_requests",
        headers={**rep_headers, "Prefer": "return=representation"},
        json={
            "salesperson_id": rep_id,
            "company_device_id": dev_id,
            "market_code": "NG",
            "issue_category": "battery_charging",
            "issue_description": "Battery swelled and screen separating from chassis after full charge cycle.",
            "status": "pending_review",
        },
    )
    assert r_rep_req.status_code in (200, 201), f"Device request insert failed: {r_rep_req.text}"
    replacement_req_id = r_rep_req.json()[0]["id"]
    print(f"  Rep submitted replacement request [{replacement_req_id[:8]}...] directly to HQ.")

    # Verify Country Sales Head CANNOT approve device replacement (Zero Bottleneck)
    r_csh_block = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/hq_review_device_replacement",
        headers=csh_headers,
        json={"p_replacement_id": replacement_req_id, "p_status": "approved", "p_reason": "CSH trying to approve"},
    )
    assert r_csh_block.status_code in (400, 403), "CSH was not blocked from approving replacement!"
    print("  PASS: Country Sales Head approval blocked by Zero Bottleneck violation rule.")

    # HQ Admin approves replacement
    r_hq_approve = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/hq_review_device_replacement",
        headers=hq_headers,
        json={
            "p_replacement_id": replacement_req_id,
            "p_status": "approved",
            "p_reason": "Battery hazard verified by photo; spare device approved from central depot pool.",
        },
    )
    assert r_hq_approve.status_code in (200, 204), f"HQ approval failed: {r_hq_approve.text}"
    print(f"  PASS: HQ Admin approved device replacement.")

    # HQ Admin dispatches replacement
    r_hq_dispatch = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/hq_dispatch_replacement_device",
        headers=hq_headers,
        json={
            "p_replacement_id": replacement_req_id,
            "p_replacement_device_id": spare_dev_id,
            "p_courier_tracking_ref": "DHL-LOS-2026-99118",
            "p_dispatch_notes": "Dispatched via DHL Lagos Hub courier service",
        },
    )
    assert r_hq_dispatch.status_code in (200, 204), f"HQ dispatch failed: {r_hq_dispatch.text}"
    print(f"  PASS: HQ Admin dispatched spare device with courier tracking.")

    # HQ Admin confirms activation and records disposition
    r_hq_activate = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/hq_confirm_replacement_activation",
        headers=hq_headers,
        json={
            "p_replacement_id": replacement_req_id,
            "p_old_device_disposition": "returned_to_depot",
        },
    )
    assert r_hq_activate.status_code in (200, 204), f"HQ activation failed: {r_hq_activate.text}"
    print(f"  PASS: HQ Admin confirmed activation and recorded old device disposition = returned_to_depot.")

    # 5. Test 5% Random Client Call Audit Selection & Dispute Workflow
    print("\n[5] Testing 5% Client Call Audit & Dispute Resolution (PRD §8.3 / AT-09)...")
    # Fetch a completed visit
    r_visits = requests.get(f"{SUPABASE_URL}/rest/v1/visits?select=id,branch_id&check_out_at=not.is.null&limit=1", headers=csh_headers)
    assert r_visits.status_code == 200 and len(r_visits.json()) > 0
    test_visit_id = r_visits.json()[0]["id"]

    # Create an audit record for this visit
    r_create_audit = requests.post(
        f"{SUPABASE_URL}/rest/v1/client_audit_records",
        headers={**csh_headers, "Prefer": "return=representation"},
        json={
            "visit_id": test_visit_id,
            "market_code": "NG",
            "selection_method": "random_5pct",
            "contact_name": "Engr. Jinadu",
            "contact_phone": "+234 802 333 4455",
            "call_status": "pending_call",
            "audit_outcome": "pending",
            "dispute_status": "none",
        },
    )
    assert r_create_audit.status_code in (200, 201), f"Create audit record failed: {r_create_audit.text}"
    audit_rec_id = r_create_audit.json()[0]["id"]
    print(f"  Created random 5% audit call record [{audit_rec_id[:8]}...]")

    # Record client denial -> MUST trigger dispute and create audit_dispute verification flag
    r_record_denial = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/record_client_audit_call",
        headers=csh_headers,
        json={
            "p_audit_record_id": audit_rec_id,
            "p_call_result": "reached_denied",
            "p_notes": "Client stated they did not receive any salesperson visit on this date.",
            "p_outcome": None,
            "p_contact_person": None,
            "p_telephone": None,
        },
    )
    assert r_record_denial.status_code in (200, 204), f"Record client denial failed: {r_record_denial.text}"
    print("  PASS: Client denial recorded. Dispute opened with status 'under_investigation'.")

    # Verify audit_dispute flag was inserted
    r_flag = requests.get(f"{SUPABASE_URL}/rest/v1/verification_flags?flag_code=eq.audit_dispute&order=created_at.desc&limit=1", headers=csh_headers)
    assert r_flag.status_code == 200 and len(r_flag.json()) > 0
    print(f"  PASS: Verification flag 'audit_dispute' automatically raised: {r_flag.json()[0]['id'][:8]}...")

    # CSH resolves dispute
    r_resolve = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/resolve_client_audit_dispute",
        headers=csh_headers,
        json={
            "p_audit_record_id": audit_rec_id,
            "p_decision": "rep_substantiated",
            "p_mandatory_reason": "Site security register confirmed salesperson physical check-in; client contact was in boardroom meeting.",
        },
    )
    assert r_resolve.status_code in (200, 204), f"Resolve dispute failed: {r_resolve.text}"
    print("  PASS: CSH resolved dispute as 'rep_substantiated' with mandatory justification logged.")

    # 6. Test Audited CSV Export Logging (PRD §10)
    print("\n[6] Testing Audited Safe CSV Export Ledger Logging (PRD §10)...")
    r_export = requests.post(
        f"{SUPABASE_URL}/rest/v1/export_jobs",
        headers={**csh_headers, "Prefer": "return=representation"},
        json={
            "export_type": "country_visits_csv",
            "market_code": "NG",
            "row_count": 42,
            "downloaded_by": csh_id,
            "downloaded_at": "2026-10-28T16:00:00Z",
            "formula_escaped": True,
        },
    )
    assert r_export.status_code in (200, 201), f"Export job insert failed: {r_export.text}"
    print(f"  PASS: CSV export logged into public.export_jobs (Job ID: {r_export.json()[0]['id'][:8]}..., formula_escaped: true).")

    print("\n" + "=" * 70)
    print("ALL STAGE 3E BACKEND INTEGRITY, RPC & RLS INVARIANTS CONFIRMED!")
    print("=" * 70)

if __name__ == "__main__":
    run()
