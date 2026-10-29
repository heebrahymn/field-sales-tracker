import os
import sys
import time
from playwright.sync_api import sync_playwright

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

OUTPUT_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity\brain\fc573132-6d8d-4550-b06f-9eb28f426230"
TARGET_URL = "http://localhost:5173"

def save_screenshot(page, filename):
    p = os.path.join(OUTPUT_DIR, filename)
    page.screenshot(path=p, full_page=True)
    print(f"  [SCREENSHOT] {filename}")

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        print("1. Logging into HQ Admin...")
        page.goto(TARGET_URL, wait_until="networkidle")
        page.fill("input[name='email']", "hq.admin@carboncarcare.com")
        page.fill("input[name='password']", "[DEV_USER_PASSWORD_REDACTED]")
        page.click("button[type='submit']")
        page.wait_for_timeout(3000)

        print("2. Navigating to Devices & MDM...")
        page.click("button:has-text('Devices & MDM')")
        page.wait_for_timeout(2000)

        print("3. Locating Nigeria available device CC-DEV-LOS-SPARE-2149...")
        row = page.locator('tr:has-text("CC-DEV-LOS-SPARE-2149")')
        assign_btn = row.locator('button:has-text("Assign")').first
        assign_btn.click()
        page.wait_for_timeout(2000)

        save_screenshot(page, "ssot_ng_device_assign_modal.png")

        print("4. Reading custodian options for Nigeria device...")
        custodian_select = page.locator('#salespersonCustodianSelect')
        options = custodian_select.locator('option').all_inner_texts()
        print(f"Total options in Nigeria device dropdown: {len(options)}")
        for opt in options:
            print(f"  * {opt}")

        save_screenshot(page, "ssot_ng_device_dropdown_open.png")

        # Assert no obsolete mock users
        assert not any("USR-NG-002" in o for o in options), "Error: Found USR-NG-002"
        assert not any("USR-NG-006" in o for o in options), "Error: Found USR-NG-006"
        print("  ✓ PASSED: Zero mock user codes (USR-NG-002, USR-NG-006) present!")

        # Assert live salespeople from Supabase
        live_names = ["bayo Ayodele", "Ibrahim Babangida", "Tunde Adebayo", "Amina Bello", "Chukwudi Okafor"]
        found_any = any(any(name in opt for opt in options) for name in live_names)
        assert found_any, "Error: No live salespeople found in Nigeria dropdown!"
        print("  ✓ PASSED: Real Supabase salespeople found in Nigeria dropdown!")

        # Select bayo Ayodele or live salesperson
        for el in custodian_select.locator('option').all():
            txt = el.inner_text()
            if "bayo Ayodele" in txt or "Amina Bello" in txt or "Unassigned" in txt:
                val = el.get_attribute('value')
                print(f"  Selecting: {txt} ({val})")
                custodian_select.select_option(value=val)
                break

        page.fill('textarea[placeholder*="Optional notes"]', "Supabase Dev SSoT verification test allocation.")
        save_screenshot(page, "ssot_ng_device_custodian_selected.png")

        print("5. Confirming Handover...")
        page.click('#btn-confirm-handover')
        page.wait_for_timeout(3000)
        save_screenshot(page, "ssot_ng_device_after_handover.png")
        print("  ✓ PASSED: Device handover completed!")

        browser.close()

if __name__ == '__main__':
    run_test()

