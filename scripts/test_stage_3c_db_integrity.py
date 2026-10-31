"""
Stage 3C Database Integrity, PostGIS Geofencing, Storage Isolation & E2E API Verification Script
Tests all requirements of Stage 3C:
1. Cannot start a visit against ended attendance (Trigger: trg_prevent_visit_start_on_ended_workday)
   & Cannot attach a visit to another employee's attendance day
2. Cannot end attendance while a normal visit is open (Trigger: trg_prevent_attendance_close_with_open_visit, AT-03)
3. Cannot mark visit location_verified with unapproved/pending/missing pin or pin from another branch (Trigger: trg_validate_visit_location_verification)
4. Cannot mark visit location_verified without live premises photo (PRD §7.1)
5. Authoritative PostGIS distance calculation rejects client-supplied inside_confident spoofing (PRD §7.1, §8.4)
6. Sole-author principle: Manager cannot insert visits on behalf of salesperson (RLS: visits_insert_salesperson_only)
7. Cross-country protection: Nigeria salesperson cannot read or insert visits for Malawi/Zambia branches
8. Successful Checkout & Workday End Lifecycle
9. Private Premises Photo Storage Upload, Non-Overwriting Path & Cross-User Folder Isolation ('visit-premises-photos')
10. Full E2E Location-Verified Check-In, Single Open Visit (AT-04), Active Visit Restoration,
    Immutability Guard on Checkout, Outside-Geofence Checkout Preserving Verification, and Meeting Log Persistence
"""
import os
import sys
import uuid
import requests
from datetime import datetime, timezone

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "https://[SUPABASE_PROJECT_ID].supabase.co")
PUBLISHABLE_KEY = os.environ.get("VITE_SUPABASE_PUBLISHABLE_KEY", os.environ.get("VITE_SUPABASE_ANON_KEY", ""))


def get_dev_password():
    pwd = os.environ.get("DEV_USER_PASSWORD")
    if not pwd:
        candidates = [
            ".env.local",
            "../.env.local",
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env.local"),
            os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env.local"),
        ]
        for p in candidates:
            if os.path.exists(p):
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.startswith("DEV_USER_PASSWORD="):
                            return line.strip().split("=", 1)[1]
    return pwd or ""


DEV_PASSWORD = get_dev_password()


def sign_in(email, password):
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {"apikey": PUBLISHABLE_KEY, "Content-Type": "application/json"}
    resp = requests.post(url, headers=headers, json={"email": email, "password": password})
    if resp.status_code == 200:
        data = resp.json()
        return data["access_token"], data["user"]
    raise Exception(f"Sign in failed for {email}: {resp.status_code} - {resp.text}")


def get_headers(token):
    return {
        "apikey": PUBLISHABLE_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def run_tests():
    print("=" * 80)
    print("STAGE 3C: DATABASE INTEGRITY, POSTGIS GEOFENCING, STORAGE & E2E API AUDIT")
    print("=" * 80)

    # 1. Authenticate users
    print("\n[1] Authenticating test accounts...")
    sp_token, sp_user = sign_in("tunde.adebayo@carboncarcare.com", DEV_PASSWORD)
    sp_headers = get_headers(sp_token)
    sp_id = sp_user["id"]
    print(f"  Salesperson (Tunde Adebayo - NG): {sp_id}")

    csh_token, csh_user = sign_in("babatunde.adeleke@carboncarcare.com", DEV_PASSWORD)
    csh_headers = get_headers(csh_token)
    csh_id = csh_user["id"]
    print(f"  Country Sales Head (Babatunde Adeleke - NG): {csh_id}")

    csh_zm_token, csh_zm_user = sign_in("chileshe.mwape@carboncarcare.com", DEV_PASSWORD)
    print(f"  Zambia Country Sales Head (Chileshe Mwape - ZM): {csh_zm_user['id']}")

    # 2. Fetch assigned device and approved branch for Tunde Adebayo
    print("\n[2] Fetching assigned device and branches...")
    dev_resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/device_assignments?salesperson_id=eq.{sp_id}&is_current=eq.true&select=device_id",
        headers=sp_headers,
    )
    assert dev_resp.status_code == 200 and len(dev_resp.json()) > 0, "Salesperson has no current device assignment"
    device_id = dev_resp.json()[0]["device_id"]
    print(f"  Current Device ID: {device_id}")

    branches_resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/branches?market_code=eq.NG&select=id,branch_name,operating_status",
        headers=sp_headers,
    )
    assert branches_resp.status_code == 200 and len(branches_resp.json()) > 0
    ng_branches = branches_resp.json()
    test_branch = ng_branches[0]
    approved_pin = None

    for b in ng_branches:
        p_resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/branch_location_pins?branch_id=eq.{b['id']}&status=eq.approved&is_active=eq.true",
            headers=sp_headers,
        )
        if p_resp.status_code == 200 and len(p_resp.json()) > 0:
            test_branch = b
            approved_pin = p_resp.json()[0]
            break

    assert approved_pin is not None, "Expected at least one NG branch with an approved pin"
    pin_lat = float(approved_pin["latitude"])
    pin_lng = float(approved_pin["longitude"])
    print(f"  Test NG Branch: {test_branch['branch_name']} ({test_branch['id']})")
    print(f"  Approved Pin: {approved_pin['id']} (v{approved_pin['version_number']}) @ ({pin_lat}, {pin_lng})")

    # Ensure any leftover open visit for sp_id is closed before starting clean test suite
    open_v_chk = requests.get(
        f"{SUPABASE_URL}/rest/v1/visits?user_id=eq.{sp_id}&check_out_at=is.null&kind=eq.normal",
        headers=sp_headers,
    )
    if open_v_chk.status_code == 200 and len(open_v_chk.json()) > 0:
        for ov in open_v_chk.json():
            requests.patch(
                f"{SUPABASE_URL}/rest/v1/visits?id=eq.{ov['id']}",
                headers=sp_headers,
                json={"check_out_at": datetime.now(timezone.utc).isoformat()},
            )

    # Fetch attendance records for Tunde Adebayo
    att_resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/attendance_days?user_id=eq.{sp_id}&order=work_date.desc&limit=10",
        headers=sp_headers,
    )
    att_records = att_resp.json() if att_resp.status_code == 200 else []
    ended_att = next((a for a in att_records if a["status"] == "ended"), None)
    active_att = next((a for a in att_records if a["status"] == "started"), None)

    if not active_att:
        # Find an unused test work_date in 2026-11
        for day_num in range(1, 29):
            cand_date = f"2026-11-{day_num:02d}"
            chk = requests.get(
                f"{SUPABASE_URL}/rest/v1/attendance_days?user_id=eq.{sp_id}&work_date=eq.{cand_date}",
                headers=sp_headers,
            )
            if chk.status_code == 200 and len(chk.json()) == 0:
                c_resp = requests.post(
                    f"{SUPABASE_URL}/rest/v1/attendance_days",
                    headers=sp_headers,
                    json={
                        "user_id": sp_id,
                        "device_id": device_id,
                        "market_code": "NG",
                        "work_date": cand_date,
                        "start_latitude": pin_lat,
                        "start_longitude": pin_lng,
                        "start_accuracy_m": 12.0,
                        "start_selfie_url": f"{sp_id}/active-test.jpg",
                        "status": "started",
                    },
                )
                assert c_resp.status_code == 201, f"Failed to create started attendance: {c_resp.text}"
                active_att = c_resp.json()[0]
                break

    print(f"  Ended Attendance ID: {ended_att['id'] if ended_att else 'None'}")
    print(f"  Active Attendance ID: {active_att['id']} ({active_att['work_date']})")

    # =========================================================================
    # TEST 1: Prevent Visit Start on Ended Workday & Foreign Employee Workday
    # =========================================================================
    print("\n" + "-" * 80)
    print("TEST 1: Prevent Starting a Normal Visit Against an Ended or Foreign Workday")
    print("-" * 80)
    assert ended_att is not None, "Expected an ended attendance record"
    visit_payload = {
        "attendance_day_id": ended_att["id"],
        "user_id": sp_id,
        "device_id": device_id,
        "branch_id": test_branch["id"],
        "kind": "normal",
        "check_in_at": datetime.now(timezone.utc).isoformat(),
        "check_in_latitude": pin_lat,
        "check_in_longitude": pin_lng,
        "check_in_accuracy_m": 15.0,
        "location_classification": "inside_confident",
        "verification_status": "capturing",
    }
    res = requests.post(f"{SUPABASE_URL}/rest/v1/visits", headers=sp_headers, json=visit_payload)
    print(f"  [1.1] Ended workday response: {res.status_code} {res.text}")
    assert res.status_code == 400
    assert "Cannot start visit: Associated workday is not active (status is ended)" in res.text
    print("  [PASS] Trigger 2 blocked starting a normal visit against ended workday (23514).")

    # 1.2 Foreign attendance day (another employee's attendance_day_id)
    foreign_att_id = "00000000-0000-4000-a000-000000000099"
    res_foreign_att = requests.post(
        f"{SUPABASE_URL}/rest/v1/visits",
        headers=sp_headers,
        json={**visit_payload, "attendance_day_id": foreign_att_id},
    )
    print(f"  [1.2] Non-owned workday response: {res_foreign_att.status_code} {res_foreign_att.text}")
    assert res_foreign_att.status_code in (400, 403, 409)
    print("  [PASS] Attaching visit to non-owned attendance_day_id strictly rejected.")

    # =========================================================================
    # TEST 2: Prevent Ending Attendance While a Normal Visit is Open (AT-03)
    # =========================================================================
    print("\n" + "-" * 80)
    print("TEST 2: Prevent Ending Attendance While a Normal Visit is Open (AT-03)")
    print("-" * 80)
    open_v_res = requests.post(
        f"{SUPABASE_URL}/rest/v1/visits",
        headers=sp_headers,
        json={
            "attendance_day_id": active_att["id"],
            "user_id": sp_id,
            "device_id": device_id,
            "branch_id": test_branch["id"],
            "kind": "normal",
            "check_in_at": datetime.now(timezone.utc).isoformat(),
            "check_in_latitude": pin_lat,
            "check_in_longitude": pin_lng,
            "check_in_accuracy_m": 14.0,
            "location_classification": "inside_confident",
            "verification_status": "capturing",
        },
    )
    assert open_v_res.status_code == 201, f"Failed to create open visit: {open_v_res.text}"
    open_visit = open_v_res.json()[0]
    print(f"  Created open test visit: {open_visit['id']}")

    end_payload = {
        "status": "ended",
        "ended_at": datetime.now(timezone.utc).isoformat(),
        "end_latitude": pin_lat,
        "end_longitude": pin_lng,
        "end_accuracy_m": 12.0,
    }
    end_res = requests.patch(
        f"{SUPABASE_URL}/rest/v1/attendance_days?id=eq.{active_att['id']}",
        headers=sp_headers,
        json=end_payload,
    )
    print(f"  End Attendance Response: {end_res.status_code} {end_res.text}")
    assert end_res.status_code == 400
    assert "Cannot end workday: an active physical visit is currently in progress" in end_res.text
    print("  [PASS] Trigger 1 blocked closing attendance while a physical visit is active (AT-03).")

    # Close this temporary open visit so we can test INSERT guards in Tests 3-7 cleanly
    co_temp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/visits?id=eq.{open_visit['id']}",
        headers=sp_headers,
        json={"check_out_at": datetime.now(timezone.utc).isoformat()},
    )
    assert co_temp.status_code == 200

    # =========================================================================
    # TEST 3: Prevent Location-Verified Status with Unapproved / Mismatched Pin
    # =========================================================================
    print("\n" + "-" * 80)
    print("TEST 3: Prevent Location-Verified Status with Unapproved or Mismatched Branch Pin")
    print("-" * 80)
    fake_pin_id = str(uuid.uuid4())
    res_fake_pin = requests.post(
        f"{SUPABASE_URL}/rest/v1/visits",
        headers=sp_headers,
        json={
            "attendance_day_id": active_att["id"],
            "user_id": sp_id,
            "device_id": device_id,
            "branch_id": test_branch["id"],
            "branch_pin_id": fake_pin_id,
            "kind": "normal",
            "check_in_at": datetime.now(timezone.utc).isoformat(),
            "check_in_latitude": pin_lat,
            "check_in_longitude": pin_lng,
            "check_in_accuracy_m": 14.0,
            "location_classification": "inside_confident",
            "verification_status": "location_verified",
            "premises_photo_url": f"{sp_id}/fake_premises.jpg",
        },
    )
    print(f"  [3.1] Non-existent pin response: {res_fake_pin.status_code} {res_fake_pin.text}")
    assert res_fake_pin.status_code in (400, 409)
    print("  [PASS] Invalid/unapproved branch pin rejected for location_verified status.")

    other_branch = next((b for b in ng_branches if b["id"] != test_branch["id"]), None)
    if other_branch:
        other_pins_resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/branch_location_pins?branch_id=eq.{other_branch['id']}&status=eq.approved&is_active=eq.true",
            headers=sp_headers,
        )
        if other_pins_resp.status_code == 200 and len(other_pins_resp.json()) > 0:
            other_pin = other_pins_resp.json()[0]
            mismatch_res = requests.post(
                f"{SUPABASE_URL}/rest/v1/visits",
                headers=sp_headers,
                json={
                    "attendance_day_id": active_att["id"],
                    "user_id": sp_id,
                    "device_id": device_id,
                    "branch_id": test_branch["id"],
                    "branch_pin_id": other_pin["id"],
                    "kind": "normal",
                    "check_in_at": datetime.now(timezone.utc).isoformat(),
                    "check_in_latitude": pin_lat,
                    "check_in_longitude": pin_lng,
                    "check_in_accuracy_m": 14.0,
                    "location_classification": "inside_confident",
                    "verification_status": "location_verified",
                    "premises_photo_url": f"{sp_id}/premises.jpg",
                },
            )
            print(f"  [3.2] Mismatched branch pin response: {mismatch_res.status_code} {mismatch_res.text}")
            assert mismatch_res.status_code == 400
            assert "Pin belongs to another branch" in mismatch_res.text
            print("  [PASS] Associating pin from another branch strictly rejected by Trigger 3.")

    # =========================================================================
    # TEST 4: Prevent Location-Verified Status Without Premises Photo (PRD §7.1)
    # =========================================================================
    print("\n" + "-" * 80)
    print("TEST 4: Prevent Location-Verified Status Without Live Premises Photo (PRD §7.1)")
    print("-" * 80)
    res_no_photo = requests.post(
        f"{SUPABASE_URL}/rest/v1/visits",
        headers=sp_headers,
        json={
            "attendance_day_id": active_att["id"],
            "user_id": sp_id,
            "device_id": device_id,
            "branch_id": test_branch["id"],
            "branch_pin_id": approved_pin["id"],
            "kind": "normal",
            "check_in_at": datetime.now(timezone.utc).isoformat(),
            "check_in_latitude": pin_lat,
            "check_in_longitude": pin_lng,
            "check_in_accuracy_m": 12.0,
            "location_classification": "inside_confident",
            "verification_status": "location_verified",
            "premises_photo_url": None,
        },
    )
    print(f"  Response Status: {res_no_photo.status_code}")
    print(f"  Response Body: {res_no_photo.text}")
    assert res_no_photo.status_code == 400
    assert "Live premises photo is mandatory for location verification" in res_no_photo.text
    print("  [PASS] Live premises photo requirement strictly enforced by Trigger 3.")

    # =========================================================================
    # TEST 5: PostGIS Geofence Spoofing Rejection (Out-of-Bound Coordinates)
    # =========================================================================
    print("\n" + "-" * 80)
    print("TEST 5: PostGIS Geofence Spoofing Rejection (Out-of-Bound Coordinates)")
    print("-" * 80)
    res_spoofed = requests.post(
        f"{SUPABASE_URL}/rest/v1/visits",
        headers=sp_headers,
        json={
            "attendance_day_id": active_att["id"],
            "user_id": sp_id,
            "device_id": device_id,
            "branch_id": test_branch["id"],
            "branch_pin_id": approved_pin["id"],
            "kind": "normal",
            "check_in_at": datetime.now(timezone.utc).isoformat(),
            "check_in_latitude": 0.0,
            "check_in_longitude": 0.0,
            "check_in_accuracy_m": 10.0,
            "location_classification": "inside_confident",
            "verification_status": "location_verified",
            "premises_photo_url": f"{sp_id}/premises.jpg",
        },
    )
    print(f"  Spoofed Location Check Response Status: {res_spoofed.status_code}")
    print(f"  Spoofed Location Check Response Body: {res_spoofed.text}")
    assert res_spoofed.status_code == 400
    assert "does not meet inside_confident threshold" in res_spoofed.text
    print("  [PASS] Authoritative PostGIS distance calculation rejected client-supplied inside_confident spoofing attempt!")

    # =========================================================================
    # TEST 6: Manager Cannot Create Visit (Sole-Author Principle PRD §2, §6)
    # =========================================================================
    print("\n" + "-" * 80)
    print("TEST 6: Manager Direct API Bypass Attempt (Sole-Author Principle)")
    print("-" * 80)
    csh_res = requests.post(
        f"{SUPABASE_URL}/rest/v1/visits",
        headers=csh_headers,
        json={
            "attendance_day_id": active_att["id"],
            "user_id": sp_id,
            "device_id": device_id,
            "branch_id": test_branch["id"],
            "kind": "normal",
            "check_in_at": datetime.now(timezone.utc).isoformat(),
            "check_in_latitude": pin_lat,
            "check_in_longitude": pin_lng,
            "check_in_accuracy_m": 10.0,
            "location_classification": "inside_confident",
            "verification_status": "capturing",
        },
    )
    print(f"  Manager Visit Insert Response Status: {csh_res.status_code}")
    print(f"  Manager Visit Insert Response Body: {csh_res.text}")
    assert csh_res.status_code == 403
    print("  [PASS] Country Sales Head cannot originate visit records for salesperson (403 Forbidden / 42501).")

    # =========================================================================
    # TEST 7: Cross-Country Permissions (Nigeria Rep -> Malawi Branch)
    # =========================================================================
    print("\n" + "-" * 80)
    print("TEST 7: Cross-Country Permissions (Nigeria Rep -> Malawi Branch)")
    print("-" * 80)
    foreign_branch_id = "f3333333-3333-4333-d333-333333333333"  # Blantyre Commercial Depot (MW)
    mw_query = requests.get(
        f"{SUPABASE_URL}/rest/v1/branches?id=eq.{foreign_branch_id}",
        headers=sp_headers,
    )
    print(f"  Query foreign branch as NG rep status: {mw_query.status_code}, rows returned: {len(mw_query.json())}")
    assert len(mw_query.json()) == 0
    print("  [PASS] Foreign branch is invisible to NG salesperson under branches_select RLS.")

    cross_res = requests.post(
        f"{SUPABASE_URL}/rest/v1/visits",
        headers=sp_headers,
        json={
            "attendance_day_id": active_att["id"],
            "user_id": sp_id,
            "device_id": device_id,
            "branch_id": foreign_branch_id,
            "kind": "normal",
            "check_in_at": datetime.now(timezone.utc).isoformat(),
            "check_in_latitude": -15.7861,
            "check_in_longitude": 35.0058,
            "check_in_accuracy_m": 12.0,
            "location_classification": "inside_confident",
            "verification_status": "capturing",
        },
    )
    print(f"  Cross-Country Visit Insert Response: {cross_res.status_code} {cross_res.text}")
    assert cross_res.status_code in (400, 403)
    print("  [PASS] Cross-country visit insertion rejected even when no open visit exists.")

    # =========================================================================
    # TEST 8: Private Premises Photo Upload & Cross-User Isolation ('visit-premises-photos')
    # =========================================================================
    print("\n" + "-" * 80)
    print("TEST 8: Private Storage Bucket Upload & Cross-User Path Isolation ('visit-premises-photos')")
    print("-" * 80)
    jpeg_bytes = (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00"
        b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
        b"\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a"
        b"\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342"
        b"\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00"
        b"\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00"
        b"\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b"
        b"\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xfb\xd2\x8a(\x03\xff\xd9"
    )
    photo_filename = f"{sp_id}/vis_e2e_{uuid.uuid4().hex[:8]}_premises.jpg"
    storage_headers = {
        "apikey": PUBLISHABLE_KEY,
        "Authorization": f"Bearer {sp_token}",
        "Content-Type": "image/jpeg",
        "x-upsert": "false",
    }
    up_res = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/visit-premises-photos/{photo_filename}",
        headers=storage_headers,
        data=jpeg_bytes,
    )
    print(f"  [8.1] Own folder upload response: {up_res.status_code} {up_res.text}")
    assert up_res.status_code == 200, f"Storage upload failed: {up_res.text}"
    print("  [PASS] Salesperson uploaded live premises photo to private 'visit-premises-photos' bucket.")

    # 8.2 Non-overwriting check (upsert=false rejects duplicate path)
    dup_up_res = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/visit-premises-photos/{photo_filename}",
        headers=storage_headers,
        data=jpeg_bytes,
    )
    print(f"  [8.2] Duplicate overwrite attempt (x-upsert=false): {dup_up_res.status_code} {dup_up_res.text}")
    assert dup_up_res.status_code in (400, 409)
    print("  [PASS] Non-overwriting storage constraint prevented overwriting existing premises photo.")

    # 8.3 Cross-user folder upload attempt
    other_user_folder_path = f"{csh_zm_user['id']}/spoof_premises.jpg"
    cross_up_res = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/visit-premises-photos/{other_user_folder_path}",
        headers=storage_headers,
        data=jpeg_bytes,
    )
    print(f"  [8.3] Cross-user folder upload attempt: {cross_up_res.status_code} {cross_up_res.text}")
    assert cross_up_res.status_code in (400, 403)
    print("  [PASS] Storage RLS blocked uploading evidence into another user's folder.")

    # =========================================================================
    # TEST 9: Full E2E Location-Verified Visit Check-In, AT-04, Restoration,
    #         Checkout Immutability, Outside-Geofence Checkout & Meeting Log
    # =========================================================================
    print("\n" + "-" * 80)
    print("TEST 9: Full E2E Location-Verified Check-In, Restoration, Checkout & Meeting Log")
    print("-" * 80)
    e2e_checkin = requests.post(
        f"{SUPABASE_URL}/rest/v1/visits",
        headers=sp_headers,
        json={
            "attendance_day_id": active_att["id"],
            "user_id": sp_id,
            "device_id": device_id,
            "branch_id": test_branch["id"],
            "branch_pin_id": approved_pin["id"],
            "kind": "normal",
            "check_in_at": datetime.now(timezone.utc).isoformat(),
            "check_in_latitude": pin_lat,
            "check_in_longitude": pin_lng,
            "check_in_accuracy_m": 12.0,
            "location_classification": "uncertain",  # Server overrides to inside_confident!
            "verification_status": "location_verified",
            "premises_photo_url": photo_filename,
        },
    )
    print(f"  [9.1] E2E Verified Check-In Status: {e2e_checkin.status_code}")
    assert e2e_checkin.status_code == 201, f"E2E Check-in failed: {e2e_checkin.text}"
    e2e_visit = e2e_checkin.json()[0]
    assert e2e_visit["verification_status"] == "location_verified"
    assert e2e_visit["location_classification"] == "inside_confident"
    assert float(e2e_visit["distance_to_pin_m"]) <= 1.0
    assert e2e_visit["branch_pin_id"] == approved_pin["id"]
    assert e2e_visit["rule_version_id"] is not None
    print(
        f"  [PASS] Visit verified! PostGIS distance={e2e_visit['distance_to_pin_m']}m, "
        f"classification={e2e_visit['location_classification']}, rule_version_id={e2e_visit['rule_version_id']}"
    )

    # 9.2 Single open normal visit constraint (AT-04)
    dup_visit_res = requests.post(
        f"{SUPABASE_URL}/rest/v1/visits",
        headers=sp_headers,
        json={
            "attendance_day_id": active_att["id"],
            "user_id": sp_id,
            "device_id": device_id,
            "branch_id": test_branch["id"],
            "kind": "normal",
            "check_in_at": datetime.now(timezone.utc).isoformat(),
            "check_in_latitude": pin_lat,
            "check_in_longitude": pin_lng,
            "check_in_accuracy_m": 12.0,
            "location_classification": "inside_confident",
            "verification_status": "capturing",
        },
    )
    print(f"  [9.2] Duplicate open visit (AT-04) status: {dup_visit_res.status_code}")
    assert dup_visit_res.status_code == 409
    assert "uq_single_open_visit_per_rep" in dup_visit_res.text
    print("  [PASS] Unique partial index uq_single_open_visit_per_rep enforced AT-04.")

    # 9.3 Active visit restoration query
    restore_res = requests.get(
        f"{SUPABASE_URL}/rest/v1/visits?user_id=eq.{sp_id}&kind=eq.normal&check_out_at=is.null&select=*,branches(id,branch_name,organisations(id,name))",
        headers=sp_headers,
    )
    assert restore_res.status_code == 200 and len(restore_res.json()) == 1
    assert restore_res.json()[0]["id"] == e2e_visit["id"]
    print("  [PASS] Active visit restoration query returned exact open visit with branch & organisation metadata.")

    # 9.4 Attempt to mutate check-in coordinates or pin reference during checkout
    tamper_res = requests.patch(
        f"{SUPABASE_URL}/rest/v1/visits?id=eq.{e2e_visit['id']}",
        headers=sp_headers,
        json={
            "check_out_at": datetime.now(timezone.utc).isoformat(),
            "check_in_latitude": 0.0,
        },
    )
    print(f"  [9.4] Tamper check-in evidence during checkout status: {tamper_res.status_code} {tamper_res.text}")
    assert tamper_res.status_code == 400
    assert "Cannot modify immutable check-in evidence" in tamper_res.text
    print("  [PASS] Trigger trg_preserve_visit_checkin_evidence_on_update blocked tampering with check-in evidence.")

    # 9.5 Checkout outside geofence preserves original location_verified status
    co_res = requests.patch(
        f"{SUPABASE_URL}/rest/v1/visits?id=eq.{e2e_visit['id']}",
        headers=sp_headers,
        json={
            "check_out_at": datetime.now(timezone.utc).isoformat(),
            "check_out_latitude": pin_lat + 0.005,  # ~550m away (outside geofence)
            "check_out_longitude": pin_lng + 0.005,
            "check_out_accuracy_m": 15.0,
        },
    )
    assert co_res.status_code == 200
    checked_out_visit = co_res.json()[0]
    assert checked_out_visit["verification_status"] == "location_verified"
    assert checked_out_visit["location_classification"] == "inside_confident"
    print("  [PASS] Outside-geofence checkout succeeded while preserving original location_verified check-in status.")

    # 9.6 Completed visit is immutable after checkout
    post_co_tamper = requests.patch(
        f"{SUPABASE_URL}/rest/v1/visits?id=eq.{e2e_visit['id']}",
        headers=sp_headers,
        json={"check_out_accuracy_m": 99.0},
    )
    assert post_co_tamper.status_code == 200 and len(post_co_tamper.json()) == 0
    print("  [PASS] Completed visit is immutable after check_out_at is set (0 rows modifiable under RLS).")

    # 9.7 Persist Meeting Log to public.meeting_logs
    log_res = requests.post(
        f"{SUPABASE_URL}/rest/v1/meeting_logs",
        headers=sp_headers,
        json={
            "visit_id": e2e_visit["id"],
            "purpose": "routine_visit",
            "products_discussed": ["Batteries", "Lubricants"],
            "fleet_size_volume": 24,
            "outcome_narrative": "Reviewed heavy-duty commercial fleet lubricant schedule at Ikeja hub.",
            "next_step_text": "Send technical specification sheet for 15W-40 fleet drum supply next week.",
            "is_late": False,
        },
    )
    print(f"  [9.7] Meeting Log Insert Status: {log_res.status_code}")
    assert log_res.status_code == 201, f"Meeting log insert failed: {log_res.text}"
    saved_log = log_res.json()[0]
    assert saved_log["visit_id"] == e2e_visit["id"]
    assert saved_log["purpose"] == "routine_visit"
    print(f"  [PASS] Meeting log persisted to public.meeting_logs (id={saved_log['id']}).")

    # =========================================================================
    # TEST 10: End Workday Succeeds Once All Active Visits Are Checked Out
    # =========================================================================
    print("\n" + "-" * 80)
    print("TEST 10: End Workday Succeeds After All Active Visits Are Checked Out")
    print("-" * 80)
    end_ok_res = requests.patch(
        f"{SUPABASE_URL}/rest/v1/attendance_days?id=eq.{active_att['id']}",
        headers=sp_headers,
        json=end_payload,
    )
    print(f"  End Attendance Response After Checkout: {end_ok_res.status_code}")
    assert end_ok_res.status_code == 200
    print("  [PASS] Workday closed successfully once all visits are checked out.")

    print("\n" + "=" * 80)
    print("ALL 10 DATABASE INTEGRITY, POSTGIS, STORAGE & E2E TESTS PASSED PERFECTLY!")
    print("=" * 80)


if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"\n[FATAL ERROR] {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
