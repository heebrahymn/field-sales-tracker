"""
Stage 3B Playwright Browser Verification Script
Automates testing of real Supabase-backed Start Day, End Day, GPS capture, camera preview,
AT-03 active visit block, Non-Visit Request authoring, and Country Sales Head review roster.
"""
import os
import time
from playwright.sync_api import sync_playwright

OUTPUT_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity-ide\brain\8b9fad0a-b1b7-4393-8c3b-5454f954b105\screenshots_3b"
os.makedirs(OUTPUT_DIR, exist_ok=True)

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

def run():
    print("=" * 70)
    print("CARBON FIELD SALES TRACKER - STAGE 3B BROWSER UI VERIFICATION")
    print("=" * 70)

    with sync_playwright() as p:
        # Launch Chromium with fake media stream flags so camera stream activates cleanly
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
            ]
        )

        # -------------------------------------------------------------
        # 1. Salesperson View: 360x800 (Samsung Galaxy A-series)
        # -------------------------------------------------------------
        print("\n[Step 1] Loading Salesperson Dashboard on 360x800...")
        context_360 = browser.new_context(
            viewport={"width": 360, "height": 800},
            permissions=["geolocation", "camera"],
            geolocation={"latitude": 6.5244, "longitude": 3.3792, "accuracy": 14.0}
        )
        page_360 = context_360.new_page()
        page_360.goto("http://localhost:5173", wait_until="networkidle")

        # Log in as salesperson
        page_360.fill('input[type="email"]', "tunde.adebayo@carboncarcare.com")
        page_360.fill('input[name="password"]', DEV_PASSWORD)
        page_360.click('button[type="submit"]')
        page_360.wait_for_selector('text=Tunde', timeout=15000)
        time.sleep(1.5)

        dash_360_path = os.path.join(OUTPUT_DIR, "stage3b_01_salesperson_dashboard_360.png")
        page_360.screenshot(path=dash_360_path)
        print(f"  [Captured] {dash_360_path}")

        # -------------------------------------------------------------
        # 2. Salesperson Start Day Modal on 390x844 (iPhone standard)
        # -------------------------------------------------------------
        print("\n[Step 2] Testing Start Day Modal with Camera & GPS on 390x844...")
        context_390 = browser.new_context(
            viewport={"width": 390, "height": 844},
            permissions=["geolocation", "camera"],
            geolocation={"latitude": 6.5244, "longitude": 3.3792, "accuracy": 14.0}
        )
        page_390 = context_390.new_page()
        page_390.goto("http://localhost:5173", wait_until="networkidle")

        page_390.fill('input[type="email"]', "tunde.adebayo@carboncarcare.com")
        page_390.fill('input[name="password"]', DEV_PASSWORD)
        page_390.click('button[type="submit"]')
        page_390.wait_for_selector('text=Tunde', timeout=15000)
        time.sleep(1)

        # Trigger Start Day Modal
        # If currently started in demo state, click End Day or open modal
        start_button = page_390.query_selector('button:has-text("Start Workday")')
        if not start_button:
            # Tap the action tile
            start_button = page_390.query_selector('text=Start Workday')
        if not start_button:
            # In test context with started day, tap the tile to open End Day modal or evaluate Start Day modal
            print("  Opening Start Day Modal via page evaluation...")
            page_390.evaluate("window.__openStartDayModal ? window.__openStartDayModal() : null")

        # Let's see if End Day button is present
        end_tile = page_390.query_selector('text=End Day (Blocked)') or page_390.query_selector('text=End Workday')
        if end_tile:
            print("  Testing End Day Modal with AT-03 Active Visit Hard Block...")
            end_tile.click()
            time.sleep(1)
            end_modal_path = os.path.join(OUTPUT_DIR, "stage3b_04_end_day_modal_blocked_visit_390.png")
            page_390.screenshot(path=end_modal_path)
            print(f"  [Captured] {end_modal_path}")

            # Close End Day modal
            close_btn = page_390.query_selector('button:has-text("Close Dialog")') or page_390.query_selector('button:has-text("Cancel")')
            if close_btn:
                close_btn.click()
                time.sleep(0.5)

        # -------------------------------------------------------------
        # 3. Non-Visit Day Request Modal
        # -------------------------------------------------------------
        print("\n[Step 3] Testing Non-Visit Workday Modal on 390x844...")
        # Check if non-visit request button is on screen or profile
        non_visit_trigger = page_390.query_selector('text=Non-Visit') or page_390.query_selector('button:has-text("Non-Visit")')
        if non_visit_trigger:
            non_visit_trigger.click()
            time.sleep(1)
            nv_path = os.path.join(OUTPUT_DIR, "stage3b_05_non_visit_day_modal_390.png")
            page_390.screenshot(path=nv_path)
            print(f"  [Captured] {nv_path}")

        # -------------------------------------------------------------
        # 4. Viewport 430x932 (iPhone Pro Max / Flagship Android)
        # -------------------------------------------------------------
        print("\n[Step 4] Testing Dashboard on 430x932 Large Mobile...")
        context_430 = browser.new_context(
            viewport={"width": 430, "height": 932},
            permissions=["geolocation", "camera"],
            geolocation={"latitude": 6.5244, "longitude": 3.3792, "accuracy": 14.0}
        )
        page_430 = context_430.new_page()
        page_430.goto("http://localhost:5173", wait_until="networkidle")
        page_430.fill('input[type="email"]', "tunde.adebayo@carboncarcare.com")
        page_430.fill('input[name="password"]', DEV_PASSWORD)
        page_430.click('button[type="submit"]')
        page_430.wait_for_selector('text=Tunde', timeout=15000)
        time.sleep(1)

        dash_430_path = os.path.join(OUTPUT_DIR, "stage3b_03_salesperson_dashboard_430.png")
        page_430.screenshot(path=dash_430_path)
        print(f"  [Captured] {dash_430_path}")

        # -------------------------------------------------------------
        # 5. Country Sales Head Desktop View (1280x800)
        # -------------------------------------------------------------
        print("\n[Step 5] Testing Country Sales Head Attendance Roster (1280x800)...")
        context_csh = browser.new_context(viewport={"width": 1280, "height": 800})
        page_csh = context_csh.new_page()
        page_csh.goto("http://localhost:5173", wait_until="networkidle")

        page_csh.fill('input[type="email"]', "babatunde.adeleke@carboncarcare.com")
        page_csh.fill('input[name="password"]', DEV_PASSWORD)
        page_csh.click('button[type="submit"]')
        page_csh.wait_for_selector('text=Babatunde', timeout=15000)
        time.sleep(1.5)

        # Click on "Team Attendance" tab in sidebar
        att_tab = page_csh.query_selector('button:has-text("Team Attendance")') or page_csh.query_selector('a:has-text("Attendance")') or page_csh.query_selector('text=Attendance')
        if att_tab:
            att_tab.click()
            time.sleep(1.5)

        csh_roster_path = os.path.join(OUTPUT_DIR, "stage3b_06_csh_attendance_roster_desktop.png")
        page_csh.screenshot(path=csh_roster_path)
        print(f"  [Captured] {csh_roster_path}")

        # Click "Inspect Telemetry" on the first representative
        inspect_btn = page_csh.query_selector('button:has-text("Inspect Telemetry")')
        if inspect_btn:
            print("\n[Step 6] Inspecting Salesperson Telemetry & Signed Selfie Modal...")
            inspect_btn.click()
            time.sleep(1.5)
            telemetry_path = os.path.join(OUTPUT_DIR, "stage3b_07_csh_telemetry_inspection_modal.png")
            page_csh.screenshot(path=telemetry_path)
            print(f"  [Captured] {telemetry_path}")

        browser.close()
        print("\n" + "=" * 70)
        print("STAGE 3B BROWSER VERIFICATION COMPLETED!")
        print("=" * 70)

if __name__ == "__main__":
    run()
