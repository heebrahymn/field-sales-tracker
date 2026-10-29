import time
import os
import shutil
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = "docs/screenshots/stage3f"
BRAIN_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity\brain\fc573132-6d8d-4550-b06f-9eb28f426230"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def get_dev_password():
    with open(".env.local", "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("DEV_USER_PASSWORD="):
                return line.strip().split("=", 1)[1]
    return "[DEV_USER_PASSWORD_REDACTED]"

def copy_to_brain(filename):
    src = os.path.join(SCREENSHOT_DIR, filename)
    dst = os.path.join(BRAIN_DIR, filename)
    if os.path.exists(src):
        shutil.copy2(src, dst)
        print(f"Copied {filename} to brain directory.")

def test_manual_success_close():
    dev_password = get_dev_password()
    print("=" * 80)
    print("VERIFYING MANUAL CLOSE FOR SUCCESS MODALS & BANNERS ACROSS SYSTEM")
    print("=" * 80)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # -------------------------------------------------------------------------
        # TEST 1: HQ ADMIN - NEW DEVICE ADDED MANUAL CLOSE
        # -------------------------------------------------------------------------
        print("\n[TEST 1] HQ Admin: Register New Handset Manual Close Verification...")
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        page.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(2)

        email_input = page.query_selector('input[type="email"]') or page.query_selector('#email')
        if email_input:
            email_input.fill("hq.admin@carboncarcare.com")
            pwd_input = page.query_selector('input[type="password"]') or page.query_selector('#password')
            pwd_input.fill(dev_password)
            page.click('button[type="submit"]')
            page.wait_for_load_state("networkidle")
            time.sleep(3)

        # Navigate to Devices & MDM
        page.click("button:has-text('Devices & MDM')")
        page.wait_for_selector('text="Company-Issued Handset Inventory & MDM"', timeout=10000)
        time.sleep(1)

        # Click Register Handset
        page.click("#btn-register-new-device")
        page.wait_for_selector('text="Register New Company Device"', timeout=5000)
        time.sleep(1)

        # Fill in unique device
        unique_asset = f"CAR-TST-{int(time.time()) % 100000}"
        unique_serial = f"SN-MANUAL-{int(time.time()) % 100000}"
        print(f"Registering handset {unique_asset}...")
        page.fill("#input-reg-asset-id", unique_asset)
        page.fill("#input-reg-serial-number", unique_serial)

        # Submit
        page.click("#btn-submit-register-device")
        time.sleep(1.5)

        # Verify success message is displayed
        success_title = page.locator("text='Company Device Registered Successfully'")
        assert success_title.is_visible(), "Success screen not displayed after registration"
        print("Success screen displayed immediately after registration.")

        # WAIT 3.5 SECONDS (well past the old 1200ms auto-close timeout)
        print("Waiting 3.5 seconds to confirm modal DOES NOT auto-close...")
        time.sleep(3.5)

        # Verify modal is STILL VISIBLE
        assert success_title.is_visible(), "Defect: Modal auto-closed! It should stay open until manually dismissed."
        print("PASS: Modal is STILL OPEN after 3.5s! No auto-close occurred.")

        # Capture screenshot
        shot1 = "hq_device_registered_manual_close.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot1))
        copy_to_brain(shot1)

        # Click manual "Done / Close" button
        print("Clicking manual 'Done / Close' button...")
        page.click("button:has-text('Done / Close')")
        time.sleep(1)

        # Verify modal is now closed
        assert not success_title.is_visible(), "Modal should close after clicking Done / Close"
        print("PASS: Device registration modal closed cleanly upon manual button click.")

        context.close()

        # -------------------------------------------------------------------------
        # TEST 2: SALESPERSON - START DAY SUCCESS MANUAL CLOSE
        # -------------------------------------------------------------------------
        print("\n[TEST 2] Salesperson: Start Day Attendance Manual Close Verification...")
        sp_context = browser.new_context(
            viewport={"width": 412, "height": 915},
            permissions=["geolocation", "camera"],
            geolocation={"latitude": 6.4281, "longitude": 3.4219},
        )
        sp_page = sp_context.new_page()

        sp_page.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(2)

        # Sign in as salesperson Tunde Adebayo
        sp_email = sp_page.query_selector('input[type="email"]') or sp_page.query_selector('#email')
        if sp_email:
            sp_email.fill("tunde.adebayo@carboncarcare.com")
            sp_pwd = sp_page.query_selector('input[type="password"]') or sp_page.query_selector('#password')
            sp_pwd.fill(dev_password)
            sp_page.click('button[type="submit"]')
            sp_page.wait_for_load_state("networkidle")
            time.sleep(3)

        print("Salesperson authenticated. Checking workday status...")

        # Find the workday action tile (Start Workday or End Workday)
        workday_tile = sp_page.locator("button:has-text('Start Workday'), button:has-text('End Workday')").first
        if workday_tile.is_visible():
            tile_text = workday_tile.text_content() or ""
            print(f"Workday tile found with text: {tile_text.strip()[:30]}")
            workday_tile.click()
            time.sleep(2)

            start_day_modal = sp_page.locator("text='Start Workday & Attendance'")
            end_day_modal = sp_page.locator("text='End Field Workday'")

            if start_day_modal.is_visible():
                print("Start Day modal opened. Capturing live photo...")
                capture_btn = sp_page.locator("button:has-text('Capture Live Photo')")
                if capture_btn.is_visible():
                    capture_btn.click()
                    time.sleep(1)

                confirm_btn = sp_page.locator("button:has-text('Confirm & Start Workday')")
                if confirm_btn.is_visible() and confirm_btn.is_enabled():
                    print("Submitting Start Workday...")
                    confirm_btn.click()
                    time.sleep(2)

                    # Verify Success screen appears
                    start_success = sp_page.locator("text=/Start Day Successful|Start Day Saved on Device/i")
                    assert start_success.is_visible(), "Start day success screen not shown"
                    print("Start Day success screen displayed.")

                    # WAIT 3.5 SECONDS (well past old 1800ms auto-close timeout)
                    print("Waiting 3.5 seconds to confirm Start Day modal DOES NOT auto-close...")
                    time.sleep(3.5)

                    assert start_success.is_visible(), "Defect: Start Day modal auto-closed!"
                    print("PASS: Start Day modal is STILL OPEN after 3.5s! No auto-close occurred.")

                    # Capture screenshot
                    shot2 = "salesperson_start_day_manual_close.png"
                    sp_page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot2))
                    copy_to_brain(shot2)

                    # Click manual action button
                    ack_btn = sp_page.locator("button:has-text('Acknowledge & Proceed to Field Operations')")
                    assert ack_btn.is_visible(), "Manual acknowledge button missing"
                    ack_btn.click()
                    time.sleep(1)

                    assert not start_success.is_visible(), "Start Day modal should close after manual click"
                    print("PASS: Start Day modal closed cleanly upon manual button click.")

            elif end_day_modal.is_visible():
                print("End Day modal opened...")
                confirm_end_btn = sp_page.locator("button:has-text('Confirm & End Workday')")
                if confirm_end_btn.is_visible() and confirm_end_btn.is_enabled():
                    print("Submitting End Workday...")
                    confirm_end_btn.click()
                    time.sleep(2)

                    end_success = sp_page.locator("text=/Workday Completed|End Day Saved on Device/i")
                    assert end_success.is_visible(), "End day success screen not shown"
                    print("End Day success screen displayed.")

                    # WAIT 3.5 SECONDS (well past old 1800ms timeout)
                    print("Waiting 3.5 seconds to confirm End Day modal DOES NOT auto-close...")
                    time.sleep(3.5)

                    assert end_success.is_visible(), "Defect: End Day modal auto-closed!"
                    print("PASS: End Day modal is STILL OPEN after 3.5s! No auto-close occurred.")

                    # Capture screenshot
                    shot2 = "salesperson_end_day_manual_close.png"
                    sp_page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot2))
                    copy_to_brain(shot2)

                    ack_end_btn = sp_page.locator("button:has-text('Acknowledge & Finish Workday')")
                    assert ack_end_btn.is_visible(), "Manual finish workday button missing"
                    ack_end_btn.click()
                    time.sleep(1)

                    assert not end_success.is_visible(), "End Day modal should close after manual click"
                    print("PASS: End Day modal closed cleanly upon manual button click.")

        sp_context.close()
        browser.close()
        print("\nAll manual close verifications PASSED successfully!")

if __name__ == "__main__":
    test_manual_success_close()

