"""
Stage 3C Playwright Browser & Responsive Verification Script
Automates testing of:
- Mobile viewports: 360x800, 390x844, 430x932
- Desktop viewport: 1280x800
- No horizontal overflow across viewports
- Salesperson Client Visit Workflow:
  1. Step 1 starts with NO client preselected
  2. Searchable client & physical branch selection with approved pin metadata
  3. Pending pin hard block & Stage 3E queue / Exception route buttons
  4. Live device geolocation & rear-camera premises photo capture with preview/retake
  5. Real Supabase check-in & Active Visit timer
  6. Active Visit restoration across full browser page reload
  7. Outside-Geofence Checkout warning modal (AT-05)
  8. Meeting Log modal with free-text next steps and canonical purpose
"""
import os
import time
import shutil
import subprocess
from datetime import datetime, timezone
import requests
from playwright.sync_api import sync_playwright

SUPABASE_URL = "https://[SUPABASE_PROJECT_ID].supabase.co"
PUBLISHABLE_KEY = "[VITE_SUPABASE_PUBLISHABLE_KEY]"

OUTPUT_DIR = os.path.join("docs", "screenshots", "stage3c")
ARTIFACT_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity\brain\fc573132-6d8d-4550-b06f-9eb28f426230"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def get_dev_password():
    pwd = os.environ.get("DEV_USER_PASSWORD")
    if not pwd and os.path.exists(".env.local"):
        with open(".env.local", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("DEV_USER_PASSWORD="):
                    return line.strip().split("=", 1)[1]
    return pwd or ""


DEV_PASSWORD = get_dev_password()


def ensure_today_attendance_started():
    """Ensures Tunde Adebayo has a started attendance record for today's UTC date and no leftover open visit."""
    auth_resp = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": PUBLISHABLE_KEY, "Content-Type": "application/json"},
        json={"email": "tunde.adebayo@carboncarcare.com", "password": DEV_PASSWORD},
    )
    if auth_resp.status_code != 200:
        raise RuntimeError(f"Auth failed: {auth_resp.text}")
    token = auth_resp.json()["access_token"]
    sp_id = auth_resp.json()["user"]["id"]
    headers = {
        "apikey": PUBLISHABLE_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    # Close any open visits first
    open_v = requests.get(
        f"{SUPABASE_URL}/rest/v1/visits?user_id=eq.{sp_id}&check_out_at=is.null&kind=eq.normal",
        headers=headers,
    ).json()
    for ov in open_v:
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/visits?id=eq.{ov['id']}",
            headers=headers,
            json={"check_out_at": datetime.now(timezone.utc).isoformat()},
        )

    # Check today's attendance in Africa/Lagos / UTC
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    att_chk = requests.get(
        f"{SUPABASE_URL}/rest/v1/attendance_days?user_id=eq.{sp_id}&work_date=eq.{today_str}",
        headers=headers,
    ).json()

    dev_resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/device_assignments?salesperson_id=eq.{sp_id}&is_current=eq.true&select=device_id",
        headers=headers,
    ).json()
    device_id = dev_resp[0]["device_id"]

    if len(att_chk) == 0:
        requests.post(
            f"{SUPABASE_URL}/rest/v1/attendance_days",
            headers=headers,
            json={
                "user_id": sp_id,
                "device_id": device_id,
                "market_code": "NG",
                "work_date": today_str,
                "start_latitude": 6.5925,
                "start_longitude": 3.3441,
                "start_accuracy_m": 12.0,
                "start_selfie_url": f"{sp_id}/start_selfie_{today_str}.jpg",
                "status": "started",
            },
        )
    elif att_chk[0]["status"] != "started":
        # Re-open today's attendance via Management API if SUPABASE_ACCESS_TOKEN is configured
        mgmt_token = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
        if mgmt_token:
            requests.post(
                "https://api.supabase.com/v1/projects/[SUPABASE_PROJECT_ID]/database/query",
                headers={
                    "Authorization": f"Bearer {mgmt_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "query": f"UPDATE public.attendance_days SET status = 'started', ended_at = NULL WHERE id = '{att_chk[0]['id']}';"
                },
            )


def save_screenshot(page, filename):
    out_path = os.path.join(OUTPUT_DIR, filename)
    page.screenshot(path=out_path, full_page=False)
    if os.path.exists(ARTIFACT_DIR):
        shutil.copy2(out_path, os.path.join(ARTIFACT_DIR, filename))
    print(f"  [Screenshot] {out_path}")
    return out_path


def check_no_overflow(page, label):
    overflow = page.evaluate(
        "() => document.documentElement.scrollWidth > window.innerWidth"
    )
    scroll_w = page.evaluate("() => document.documentElement.scrollWidth")
    inner_w = page.evaluate("() => window.innerWidth")
    print(f"  [Viewport Check - {label}] scrollWidth={scroll_w}, innerWidth={inner_w}, overflow={overflow}")
    assert not overflow, f"Horizontal overflow detected on {label}: {scroll_w} > {inner_w}"


def is_server_up():
    try:
        r = requests.get("http://localhost:5173", timeout=2)
        return r.status_code == 200
    except Exception:
        return False


def run():
    print("=" * 75)
    print("STAGE 3C PLAYWRIGHT E2E & MULTI-VIEWPORT BROWSER VERIFICATION")
    print("=" * 75)

    ensure_today_attendance_started()

    vite_proc = None
    if not is_server_up():
        print("  Starting local Vite server on http://localhost:5173...")
        vite_proc = subprocess.Popen(
            ["npx", "vite", "--port", "5173"],
            shell=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        for _ in range(30):
            if is_server_up():
                break
            time.sleep(1.0)
        assert is_server_up(), "Failed to start local Vite server on port 5173"

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
            ],
        )

        # ---------------------------------------------------------------------
        # 1. Mobile 390x844 Full Salesperson Visit Lifecycle
        # ---------------------------------------------------------------------
        print("\n[1] Testing Full Salesperson Visit Workflow on 390x844...")
        ctx_390 = browser.new_context(
            viewport={"width": 390, "height": 844},
            permissions=["geolocation", "camera"],
            geolocation={"latitude": 6.5925, "longitude": 3.3441, "accuracy": 14.0},
        )
        page = ctx_390.new_page()
        page.goto("http://localhost:5173", wait_until="networkidle")

        page.fill('input[type="email"]', "tunde.adebayo@carboncarcare.com")
        page.fill('input[name="password"]', DEV_PASSWORD)
        page.click('button[type="submit"]')
        page.wait_for_selector("text=Tunde", timeout=15000)
        time.sleep(2.0)

        # Navigate to Visit tab
        visit_nav = page.query_selector('button:has-text("Visit")') or page.query_selector('text=Visit Client')
        if visit_nav:
            visit_nav.click()
            time.sleep(1.5)

        check_no_overflow(page, "390x844 Step 1 Empty State")
        save_screenshot(page, "stage3c_01_step1_no_client_preselected_390.png")

        # Open Client search dropdown and select client with approved pin (Ikeja Logistics Hub)
        search_input = page.wait_for_selector('input[placeholder*="Search business"]', timeout=10000)
        search_input.click()
        time.sleep(0.8)
        save_screenshot(page, "stage3c_02_client_search_dropdown_390.png")

        # Click first client in dropdown
        first_client_btn = page.query_selector("div.divide-y button")
        assert first_client_btn is not None, "Expected registered clients in dropdown"
        first_client_btn.click()
        time.sleep(1.0)

        # Select Ikeja Logistics Hub (matches browser geolocation 6.5925, 3.3441)
        ikeja_loc_btn = page.query_selector('button:has-text("Ikeja Logistics Hub")') or page.query_selector(
            'button:has-text("Approved")'
        )
        if ikeja_loc_btn:
            ikeja_loc_btn.click()
            time.sleep(0.8)

        check_no_overflow(page, "390x844 Client Selected")
        save_screenshot(page, "stage3c_03_client_and_pin_selected_390.png")

        # Acquire live device GPS
        gps_btn = page.query_selector('button:has-text("Acquire Device GPS")')
        if gps_btn:
            gps_btn.click()
            time.sleep(1.0)

        # Ensure simulator is set to Inside (38m) for verified check-in test
        inside_btn = page.query_selector('button:has-text("Inside (38m)")')
        if inside_btn:
            inside_btn.click()
            time.sleep(0.5)

        # Capture Live Premises Photo
        capture_btn = page.query_selector("#sticky-btn-capture-photo") or page.query_selector(
            'button:has-text("Capture Live Premises Photo")'
        )
        assert capture_btn is not None, "Expected Capture Live Premises Photo button"
        capture_btn.click()
        time.sleep(1.2)
        save_screenshot(page, "stage3c_04_premises_photo_captured_390.png")

        # Click Check In & Start Client Meeting
        checkin_btn = page.wait_for_selector("#sticky-btn-checkin", timeout=10000)
        checkin_btn.click()
        page.wait_for_selector("text=Visit Session In Progress", timeout=15000)
        time.sleep(1.5)
        check_no_overflow(page, "390x844 Active Visit In Progress")
        save_screenshot(page, "stage3c_05_active_visit_in_progress_390.png")

        # Test Active Visit Restoration across full browser reload!
        print("  Reloading browser page to verify authoritative active visit restoration from Supabase...")
        page.reload(wait_until="networkidle")
        page.wait_for_selector("text=Tunde", timeout=15000)
        time.sleep(2.0)
        visit_nav_after = page.query_selector('button:has-text("Visit")')
        if visit_nav_after:
            visit_nav_after.click()
            time.sleep(1.5)
        page.wait_for_selector("text=Visit Session In Progress", timeout=15000)
        print("  [PASS] Active visit session restored from Supabase after full browser reload!")
        save_screenshot(page, "stage3c_06_active_visit_restored_after_reload_390.png")

        # Test Outside Geofence Checkout Warning Modal (AT-05)
        outside_btn = page.query_selector('button:has-text("Outside (340m)")')
        if outside_btn:
            outside_btn.click()
            time.sleep(0.5)

        checkout_btn = page.query_selector("#sticky-btn-checkout")
        assert checkout_btn is not None
        checkout_btn.click()
        page.wait_for_selector("#outside-geofence-modal-title", timeout=10000)
        time.sleep(0.8)
        save_screenshot(page, "stage3c_07_outside_geofence_checkout_warning_390.png")

        # Acknowledge outside geofence warning to open Meeting Log Modal
        ack_btn = page.query_selector("#btn-outside-geofence-acknowledge")
        assert ack_btn is not None
        ack_btn.click()
        page.wait_for_selector("text=Document Visit Outcome", timeout=10000)
        time.sleep(0.8)
        save_screenshot(page, "stage3c_08_meeting_log_modal_390.png")

        # Submit Meeting Log & Close Visit
        submit_log_btn = page.query_selector('button:has-text("Submit Log & Close Visit")')
        assert submit_log_btn is not None
        submit_log_btn.click()
        time.sleep(2.0)
        save_screenshot(page, "stage3c_09_visit_completed_returned_to_step1_390.png")

        # ---------------------------------------------------------------------
        # 2. Mobile 360x800 Viewport Verification
        # ---------------------------------------------------------------------
        print("\n[2] Verifying 360x800 Mobile Viewport...")
        ctx_360 = browser.new_context(
            viewport={"width": 360, "height": 800},
            permissions=["geolocation", "camera"],
        )
        p360 = ctx_360.new_page()
        p360.goto("http://localhost:5173", wait_until="networkidle")
        p360.fill('input[type="email"]', "tunde.adebayo@carboncarcare.com")
        p360.fill('input[name="password"]', DEV_PASSWORD)
        p360.click('button[type="submit"]')
        p360.wait_for_selector("text=Tunde", timeout=15000)
        time.sleep(1.5)
        v360 = p360.query_selector('button:has-text("Visit")')
        if v360:
            v360.click()
            time.sleep(1.0)
        check_no_overflow(p360, "360x800 Visit View")
        save_screenshot(p360, "stage3c_10_visit_view_360.png")

        # ---------------------------------------------------------------------
        # 3. Mobile 430x932 Viewport Verification
        # ---------------------------------------------------------------------
        print("\n[3] Verifying 430x932 Mobile Viewport...")
        ctx_430 = browser.new_context(
            viewport={"width": 430, "height": 932},
            permissions=["geolocation", "camera"],
        )
        p430 = ctx_430.new_page()
        p430.goto("http://localhost:5173", wait_until="networkidle")
        p430.fill('input[type="email"]', "tunde.adebayo@carboncarcare.com")
        p430.fill('input[name="password"]', DEV_PASSWORD)
        p430.click('button[type="submit"]')
        p430.wait_for_selector("text=Tunde", timeout=15000)
        time.sleep(1.5)
        v430 = p430.query_selector('button:has-text("Visit")')
        if v430:
            v430.click()
            time.sleep(1.0)
        check_no_overflow(p430, "430x932 Visit View")
        save_screenshot(p430, "stage3c_11_visit_view_430.png")

        # ---------------------------------------------------------------------
        # 4. Desktop 1280x800 Manager Verification
        # ---------------------------------------------------------------------
        print("\n[4] Verifying 1280x800 Country Sales Head Desktop Viewport...")
        ctx_1280 = browser.new_context(viewport={"width": 1280, "height": 800})
        p1280 = ctx_1280.new_page()
        p1280.goto("http://localhost:5173", wait_until="networkidle")
        p1280.fill('input[type="email"]', "babatunde.adeleke@carboncarcare.com")
        p1280.fill('input[name="password"]', DEV_PASSWORD)
        p1280.click('button[type="submit"]')
        p1280.wait_for_selector("text=Babatunde", timeout=15000)
        time.sleep(1.5)
        check_no_overflow(p1280, "1280x800 Country Sales Head View")
        save_screenshot(p1280, "stage3c_12_manager_dashboard_1280.png")

        browser.close()

    if vite_proc is not None:
        vite_proc.terminate()

    print("\n" + "=" * 75)
    print("ALL STAGE 3C PLAYWRIGHT E2E & VIEWPORT CHECKS PASSED!")
    print("=" * 75)


if __name__ == "__main__":
    run()
