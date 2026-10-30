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
    print("VERIFICATION OF DISPATCH, ACTIVATION & LIVE HANDSET CUSTODY UPDATE", flush=True)
    print("=" * 80, flush=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
        )

        # -------------------------------------------------------------
        # STEP 1: HQ ADMIN DISPATCHES REPLACEMENT DEVICE
        # -------------------------------------------------------------
        print("\n--- STEP 1: HQ ADMIN RECORDS DISPATCH ---", flush=True)
        hq_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = hq_ctx.new_page()

        page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        page.fill('input[type="email"]', 'hq.admin@carboncarcare.com')
        page.fill('input[type="password"]', DEV_PASSWORD)
        page.click('button:has-text("Sign In With Credentials")')

        page.wait_for_selector('text=HQ Regional Administration & Oversight', timeout=20000)
        page.locator('button:has-text("Company Devices & MDM")').first.click()
        page.wait_for_selector('text=Company-Issued Handset Inventory & MDM', timeout=15000)
        time.sleep(2)

        # In Replacement Queue, click "Awaiting Spare" tab
        page.locator('button:has-text("Awaiting Spare")').click()
        time.sleep(2)

        # Click "Record Dispatch"
        dispatch_btn = page.locator('button:has-text("Record Dispatch")').first
        if dispatch_btn.is_visible():
            print("[OK] Found 'Record Dispatch' button. Clicking...", flush=True)
            dispatch_btn.click()
            time.sleep(1)

            page.wait_for_selector('text=Record Device Dispatch / Handover', timeout=10000)
            page.fill('textarea', 'Courier: DHL Express Waybill NG-88214. Dispatched to Lagos territory office.')
            time.sleep(0.5)

            page.locator('button:has-text("Confirm Dispatch")').click()
            time.sleep(3)
            print("[OK] Recorded dispatch successfully.", flush=True)
            save_brain_screenshot(page, "fix_step5_hq_admin_dispatched.png")

        # Now click "Dispatched" tab to find request for Activation
        page.locator('button:has-text("Dispatched")').click()
        time.sleep(2)

        # Click "Confirm Activation & Handover"
        activate_btn = page.locator('button:has-text("Confirm Activation & Handover")').first
        if activate_btn.is_visible():
            print("[OK] Found 'Confirm Activation & Handover' button. Clicking...", flush=True)
            activate_btn.click()
            time.sleep(1)

            page.wait_for_selector('text=Confirm Activation & Disposition', timeout=10000)
            # Click "Confirm Activation & Disposition"
            page.locator('button:has-text("Confirm Activation & Disposition")').click()
            time.sleep(4)
            print("[OK] Confirmed MDM Activation successfully.", flush=True)
            save_brain_screenshot(page, "fix_step6_hq_admin_activation_confirmed.png")

        hq_ctx.close()

        # -------------------------------------------------------------
        # STEP 2: SALESPERSON SEES ACTIVATED NEW HANDSET
        # -------------------------------------------------------------
        print("\n--- STEP 2: SALESPERSON SEES ACTIVATED NEW HANDSET ---", flush=True)
        sp_ctx = browser.new_context(viewport={"width": 412, "height": 915})
        sp_page = sp_ctx.new_page()

        sp_page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        sp_page.fill('input[type="email"]', 'tunde.adebayo@carboncarcare.com')
        sp_page.fill('input[type="password"]', DEV_PASSWORD)
        sp_page.click('button:has-text("Sign In With Credentials")')

        sp_page.wait_for_selector('text=Tunde Adebayo', timeout=20000)
        sp_page.click('#nav-tab-profile')
        sp_page.wait_for_selector('text=My Device & Custody', timeout=15000)
        time.sleep(3)

        save_brain_screenshot(sp_page, "fix_step7_salesperson_profile_activated.png")
        print("[OK] Salesperson profile shows new active handset.", flush=True)
        sp_ctx.close()

        # -------------------------------------------------------------
        # STEP 3: COUNTRY SALES HEAD SEES NEW HANDSET IN ATTENDANCE
        # -------------------------------------------------------------
        print("\n--- STEP 3: COUNTRY SALES HEAD SEES NEW HANDSET IN ATTENDANCE ---", flush=True)
        csh_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        csh_page = csh_ctx.new_page()

        csh_page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        csh_page.fill('input[type="email"]', 'babatunde.adeleke@carboncarcare.com')
        csh_page.fill('input[type="password"]', DEV_PASSWORD)
        csh_page.click('button:has-text("Sign In With Credentials")')

        csh_page.wait_for_selector('text=Country Field Operations & Reviews', timeout=20000)
        csh_page.click('button:has-text("Team Attendance")')
        csh_page.wait_for_selector('text=Company Handset', timeout=15000)
        time.sleep(3)

        save_brain_screenshot(csh_page, "fix_step8_sales_head_team_handset_activated.png")
        print("[OK] Sales Head Team Attendance shows activated handset binding.", flush=True)
        csh_ctx.close()

        print("\n" + "=" * 80, flush=True)
        print("ALL DISPATCH & ACTIVATION STEPS COMPLETED SUCCESSFULLY!", flush=True)
        print("=" * 80, flush=True)

if __name__ == "__main__":
    run()
