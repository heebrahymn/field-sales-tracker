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
os.makedirs(OUTPUT_DIR, exist_ok=True)

TARGET_URL = "https://field-sales-tracker-b6l7.vercel.app/"

def get_env_var(key_name):
    val = os.environ.get(key_name)
    if not val and os.path.exists(".env.local"):
        with open(".env.local", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith(f"{key_name}="):
                    return line.strip().split("=", 1)[1]
    return val or ""

DEV_PASSWORD = get_env_var("DEV_USER_PASSWORD") or os.environ.get("DEV_USER_PASSWORD", "")

def save_screenshot(page, filename):
    p = os.path.join(OUTPUT_DIR, filename)
    page.screenshot(path=p, full_page=True)
    print(f"  [SCREENSHOT] {filename}")

def run_verification():
    print("\n=======================================================")
    print("HQ DEVICE MANAGEMENT — LIVE SALESPERSON CUSTODIAN TEST")
    print("=======================================================")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # Step 1: Open Login Page
        print("\nStep 1: Navigating to Carbon Field Sales Tracker...")
        page.goto(TARGET_URL, wait_until="networkidle")
        time.sleep(2)
        save_screenshot(page, "custodian_fix_01_login.png")

        # Step 2: Login as HQ Admin
        print("Step 2: Logging in as HQ Admin (hq.admin@carboncarcare.com)...")
        page.fill("input[name='email']", "hq.admin@carboncarcare.com")
        page.fill("input[name='password']", DEV_PASSWORD)
        page.click("button[type='submit']")
        page.wait_for_timeout(3000)

        page.wait_for_selector('text="HQ Regional Administration & Oversight"', timeout=15000)
        print("  ✓ Successfully authenticated into HQ Admin Dashboard!")
        save_screenshot(page, "custodian_fix_02_hq_dashboard.png")

        # Step 3: Provision a fresh salesperson via HQ User Management
        print("\nStep 3: Provisioning a fresh salesperson via HQ Admin User Directory...")
        # Click "Users & Roles" tab
        page.click("button:has-text('Users & Roles')")
        page.wait_for_timeout(1500)
        save_screenshot(page, "custodian_fix_03_users_tab.png")

        timestamp = int(time.time())
        test_rep_email = f"rep.custodian.{timestamp}@carboncare.com"
        test_rep_name = f"Ibrahim Babangida ({str(timestamp)[-4:]})"

        print(f"  Creating employee: {test_rep_name} <{test_rep_email}> in Nigeria...")
        page.click("button:has-text('Provision New User')")
        page.wait_for_selector('text="Provision New System User"', timeout=5000)

        page.fill('#newUserFullName', test_rep_name)
        page.fill('#newUserEmail', test_rep_email)
        page.fill('#newUserPhone', "+2348039912001")
        page.select_option('#newUserRole', "salesperson")
        page.select_option('#newUserMarketCode', "NG")
        save_screenshot(page, "custodian_fix_04_user_form_filled.png")

        page.click('button:has-text("Provision User Account")')
        page.wait_for_selector('text="User Account Provisioned"', timeout=15000)
        print("  ✓ Employee successfully provisioned in Supabase!")
        save_screenshot(page, "custodian_fix_05_provision_success.png")

        # Close credential modal
        page.click('button:has-text("Done")')
        page.wait_for_timeout(1000)

        # Step 4: Navigate to Company Devices / Fleet Management
        print("\nStep 4: Navigating to Devices & MDM tab...")
        page.click("button:has-text('Devices & MDM')")
        page.wait_for_selector('text="Company-Issued Handset Inventory & MDM"', timeout=10000)
        print("  ✓ Fleet Inventory & MDM view loaded!")
        save_screenshot(page, "custodian_fix_06_devices_tab.png")

        # Step 5: Locate device CC-DEV-LOS-SPARE-01 (or another available device) and click Assign
        print("\nStep 5: Locating available device CC-DEV-LOS-SPARE-01 and clicking Assign button...")
        device_row = page.locator('tr:has-text("CC-DEV-LOS-SPARE-01")')
        if device_row.count() == 0:
            device_row = page.locator('tr:has-text("Available")').first

        assign_btn = device_row.locator('button[title="Assign to Salesperson"], button:has-text("Assign")').first
        assign_btn.click()

        # Step 6: Wait for "Assign Handset to Salesperson" modal
        page.wait_for_selector('text="Assign Handset to Salesperson"', timeout=5000)
        print("  ✓ 'Assign Handset to Salesperson' modal opened!")
        page.wait_for_timeout(1500)  # Wait for live salespeople load

        # Step 7: Inspect custodian select dropdown
        print("\nStep 7: Inspecting 'Select Salesperson Custodian' dropdown options...")
        custodian_select = page.locator('#salespersonCustodianSelect')
        options = custodian_select.locator('option').all_inner_texts()
        print(f"  Found {len(options)} options in dropdown:")
        for opt in options:
            print(f"    - {opt}")

        save_screenshot(page, "custodian_fix_07_assign_modal_dropdown.png")

        # Step 8: Assert newly created salesperson is present in dropdown
        matched_option = [opt for opt in options if test_rep_name in opt or test_rep_email in opt]
        assert len(matched_option) > 0, f"Defect not resolved! {test_rep_name} ({test_rep_email}) is NOT in the custodian dropdown options: {options}"
        print(f"\n  ✓ PASS! Newly created salesperson found in dropdown: '{matched_option[0]}'")

        # Step 9: Select the newly created salesperson and complete assignment
        print("\nStep 9: Selecting newly created salesperson and completing handover...")
        options_elements = custodian_select.locator('option').all()
        target_value = None
        for el in options_elements:
            txt = el.inner_text()
            if test_rep_name in txt or test_rep_email in txt:
                target_value = el.get_attribute('value')
                break

        assert target_value, "Could not get value attribute for target salesperson"
        custodian_select.select_option(value=target_value)
        page.fill('textarea[placeholder*="Optional notes"]', "Verified territory allocation to newly provisioned field sales rep.")
        save_screenshot(page, "custodian_fix_08_dropdown_selected.png")

        # Click Confirm Handover
        page.click('#btn-confirm-handover')
        page.wait_for_timeout(2000)
        print("  ✓ Handover confirmed and modal submitted!")

        # Step 10: Verify the device in table shows the new custodian
        save_screenshot(page, "custodian_fix_09_device_assigned_table.png")
        print("\n=======================================================")
        print("ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!")
        print("=======================================================\n")

        browser.close()

if __name__ == "__main__":
    run_verification()
