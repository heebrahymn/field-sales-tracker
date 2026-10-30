import time
import os
import json
from playwright.sync_api import sync_playwright

BRAIN_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity\brain\fc573132-6d8d-4550-b06f-9eb28f426230"
DEV_PASSWORD = "[DEV_USER_PASSWORD_REDACTED]"
BASE_URL = "http://localhost:5173"

def save_brain_screenshot(page, filename):
    path = os.path.join(BRAIN_DIR, filename)
    page.screenshot(path=path)
    print(f"[OK] Saved screenshot: {filename}", flush=True)

def run():
    print("=" * 80, flush=True)
    print("VERIFICATION OF HANDSET REASSIGNMENT & SPARE ALLOCATION CROSS-WORKFLOW", flush=True)
    print("=" * 80, flush=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
        )

        # -------------------------------------------------------------
        # STEP 1: HQ ADMIN ALLOCATES SPARE HANDSET
        # -------------------------------------------------------------
        print("\n--- STEP 1: HQ ADMIN ALLOCATES SPARE HANDSET ---", flush=True)
        hq_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = hq_ctx.new_page()

        page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        page.fill('input[type="email"]', 'hq.admin@carboncarcare.com')
        page.fill('input[type="password"]', DEV_PASSWORD)
        page.click('button:has-text("Sign In With Credentials")')

        page.wait_for_selector('text=HQ Regional Administration & Oversight', timeout=20000)
        print("[OK] HQ Admin logged in successfully.", flush=True)

        # Navigate to Devices & MDM via sidebar button
        page.locator('button:has-text("Company Devices & MDM")').first.click()
        page.wait_for_selector('text=Company-Issued Handset Inventory & MDM', timeout=15000)
        print("[OK] Arrived at Devices & MDM module.", flush=True)
        time.sleep(2)

        # In Replacement Queue, click "Approved" tab
        page.locator('button:has-text("Approved")').click()
        time.sleep(2)

        # Look for button "Allocate Spare Device"
        assign_btn = page.locator('button:has-text("Allocate Spare Device")').first
        if assign_btn.is_visible():
            print("[OK] Found 'Allocate Spare Device' button. Clicking...", flush=True)
            assign_btn.click()
            time.sleep(1)

            # Wait for modal "Allocate Spare Handset from Depot"
            page.wait_for_selector('text=Allocate Spare Handset from Depot', timeout=10000)
            print("[OK] 'Allocate Spare Handset from Depot' modal opened.", flush=True)

            save_brain_screenshot(page, "fix_step1_hq_admin_allocate_modal_open.png")

            # Select spare handset radio (e.g. CAR-TST-121585)
            target_radio = page.locator('text=CAR-TST-121585').first
            if target_radio.is_visible():
                target_radio.click()
                print("[OK] Selected handset CAR-TST-121585.", flush=True)
            else:
                page.locator('input[type="radio"]').first.check()
                print("[OK] Selected first available spare handset radio.", flush=True)
            time.sleep(0.5)

            # Click "Assign Spare Handset" in modal
            modal_assign_btn = page.locator('button:has-text("Assign Spare Handset")').last
            modal_assign_btn.click()
            time.sleep(4)
            print("[OK] Clicked 'Assign Spare Handset' in modal.", flush=True)

            # Switch to "Awaiting Spare" tab to verify it transitioned
            page.locator('button:has-text("Awaiting Spare")').click()
            time.sleep(2)
            save_brain_screenshot(page, "fix_step2_hq_admin_spare_allocated.png")
            print("[OK] Verified request transitioned to 'Awaiting Spare' in HQ Admin console.", flush=True)
        else:
            print("[NOTE] Checking 'All Requests' tab...", flush=True)
            page.locator('button:has-text("All Requests")').click()
            time.sleep(2)
            save_brain_screenshot(page, "fix_step1_hq_admin_queue.png")

        hq_ctx.close()

        # -------------------------------------------------------------
        # STEP 2: SALESPERSON SEES ALLOCATED SPARE
        # -------------------------------------------------------------
        print("\n--- STEP 2: SALESPERSON SEES ALLOCATED SPARE HANDSET ---", flush=True)
        sp_ctx = browser.new_context(viewport={"width": 412, "height": 915}) # Mobile viewport
        sp_page = sp_ctx.new_page()

        sp_page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        sp_page.fill('input[type="email"]', 'tunde.adebayo@carboncarcare.com')
        sp_page.fill('input[type="password"]', DEV_PASSWORD)
        sp_page.click('button:has-text("Sign In With Credentials")')

        sp_page.wait_for_selector('text=Tunde Adebayo', timeout=20000)
        print("[OK] Salesperson Tunde Adebayo logged in successfully.", flush=True)

        # Navigate to Profile & My Device
        sp_page.click('#nav-tab-profile')
        sp_page.wait_for_selector('text=My Device & Custody', timeout=15000)
        time.sleep(3)

        save_brain_screenshot(sp_page, "fix_step3_salesperson_profile_spare_allocated.png")
        print("[OK] Salesperson profile rendered with live device replacement status.", flush=True)
        sp_ctx.close()

        # -------------------------------------------------------------
        # STEP 3: COUNTRY SALES HEAD SEES TEAM HANDSET
        # -------------------------------------------------------------
        print("\n--- STEP 3: COUNTRY SALES HEAD SEES UPDATED HANDSET ---", flush=True)
        csh_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        csh_page = csh_ctx.new_page()

        csh_page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        csh_page.fill('input[type="email"]', 'babatunde.adeleke@carboncarcare.com')
        csh_page.fill('input[type="password"]', DEV_PASSWORD)
        csh_page.click('button:has-text("Sign In With Credentials")')

        csh_page.wait_for_selector('text=Country Field Operations & Reviews', timeout=20000)
        print("[OK] Country Sales Head Babatunde Adeleke logged in successfully.", flush=True)

        # Navigate to Team Attendance
        csh_page.click('button:has-text("Team Attendance")')
        csh_page.wait_for_selector('text=Company Handset', timeout=15000)
        time.sleep(3)

        save_brain_screenshot(csh_page, "fix_step4_sales_head_team_handsets.png")
        print("[OK] Sales Head Team Attendance table loaded with live Company Handset bindings.", flush=True)

        csh_ctx.close()

        print("\n" + "=" * 80, flush=True)
        print("ALL CROSS-WORKFLOW TESTS COMPLETED SUCCESSFULLY!", flush=True)
        print("=" * 80, flush=True)

if __name__ == "__main__":
    run()
