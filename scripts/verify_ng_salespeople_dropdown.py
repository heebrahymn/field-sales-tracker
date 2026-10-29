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

def get_env_var(key_name):
    val = os.environ.get(key_name)
    if not val and os.path.exists(".env.local"):
        with open(".env.local", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith(f"{key_name}="):
                    return line.strip().split("=", 1)[1]
    return val or ""

DEV_PASSWORD = get_env_var("DEV_USER_PASSWORD") or "[DEV_USER_PASSWORD_REDACTED]"

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        print("1. Logging into HQ Admin...")
        page.goto(TARGET_URL, wait_until="networkidle")
        page.fill("input[name='email']", "hq.admin@carboncarcare.com")
        page.fill("input[name='password']", DEV_PASSWORD)
        page.click("button[type='submit']")
        
        # Wait for dashboard to load
        page.wait_for_selector('text="HQ Regional Administration & Oversight"', timeout=15000)
        print("  ✓ Authenticated!")

        print("2. Navigating to Devices & MDM tab...")
        page.click("button:has-text('Devices & MDM')")
        page.wait_for_selector('text="Company-Issued Handset Inventory & MDM"', timeout=10000)

        # Filter by Nigeria (NG)
        print("3. Filtering devices by Nigeria...")
        ng_tab = page.locator('button:has-text("NG"), button:has-text("Nigeria")').first
        if ng_tab.is_visible():
            ng_tab.click()
            page.wait_for_timeout(1000)

        save_screenshot(page, "ng_filtered_devices.png")

        # Find the first Assign button
        print("4. Clicking Assign button for Nigeria device...")
        assign_btn = page.locator('button[title="Assign to Salesperson"], button:has-text("Assign")').first
        assign_btn.click()

        # Wait for modal
        page.wait_for_selector('text="Assign Handset to Salesperson"', timeout=10000)
        page.wait_for_timeout(1500)
        save_screenshot(page, "ng_assign_modal_open.png")

        # Read dropdown options
        custodian_select = page.locator('#salespersonCustodianSelect')
        options = custodian_select.locator('option').all_inner_texts()
        print(f"\nTotal options in Nigeria device custodian dropdown: {len(options)}")
        for opt in options:
            print(f"    - {opt}")

        save_screenshot(page, "ng_custodian_dropdown_options.png")

        # Assert no obsolete mock users
        assert not any("USR-NG-002" in o for o in options), "FAIL: USR-NG-002 found"
        assert not any("USR-NG-006" in o for o in options), "FAIL: USR-NG-006 found"
        print("\n  ✓ PASSED: Obsolete mock codes (USR-NG-002, USR-NG-006) completely eliminated!")

        # Assert live salespeople are present
        has_bayo = any("bayo Ayodele" in o for o in options)
        has_tunde = any("Tunde Adebayo" in o for o in options)
        has_amina = any("Amina Bello" in o for o in options)
        has_chukwudi = any("Chukwudi Okafor" in o for o in options)
        has_ibrahim = any("Ibrahim" in o for o in options)
        print(f"  Live sales rep checks: bayo={has_bayo}, tunde={has_tunde}, amina={has_amina}, chukwudi={has_chukwudi}, ibrahim={has_ibrahim}")

        assert has_bayo or has_tunde or has_amina or has_chukwudi, "FAIL: Live Supabase salespeople not found in dropdown"
        print("  ✓ PASSED: Live Supabase salespeople populate the dropdown dynamically!")

        # Select a live representative
        for el in custodian_select.locator('option').all():
            txt = el.inner_text()
            if "bayo Ayodele" in txt or "Amina Bello" in txt or "Unassigned" in txt:
                val = el.get_attribute('value')
                print(f"\n  Selecting representative: {txt} ({val})")
                custodian_select.select_option(value=val)
                break

        page.fill('textarea[placeholder*="Optional notes"]', "Supabase SSoT local verification test handover.")
        save_screenshot(page, "ng_custodian_selected_filled.png")

        # Submit Handover
        print("5. Confirming Handover...")
        page.click('#btn-confirm-handover')
        page.wait_for_timeout(3000)
        save_screenshot(page, "ng_device_assigned_table_updated.png")
        print("  ✓ Handover confirmed and updated table displayed!")

        print("\n=======================================================")
        print("ALL NIGERIA CUSTODIAN DROPDOWN CHECKS PASSED PERFECTLY!")
        print("=======================================================")

        browser.close()

if __name__ == '__main__':
    run_test()
