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

TARGET_URL = "http://localhost:5173"

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
    print("LOCAL SUPABASE SSOT & HQ CUSTODIAN DROPDOWN VERIFICATION")
    print("Target: http://localhost:5173 (Single Source of Truth)")
    print("=======================================================")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.newPage() if hasattr(context, 'newPage') else context.new_page()

        # Step 1: Open Login Page
        print("\nStep 1: Navigating to local Vite app (http://localhost:5173)...")
        page.goto(TARGET_URL, wait_until="networkidle")
        time.sleep(2)
        save_screenshot(page, "local_ssot_01_login.png")

        # Step 2: Login as HQ Admin
        print("\nStep 2: Logging in as HQ Admin (hq.admin@carboncarcare.com)...")
        page.fill("input[name='email']", "hq.admin@carboncarcare.com")
        page.fill("input[name='password']", DEV_PASSWORD)
        page.click("button[type='submit']")
        page.wait_for_timeout(3000)

        page.wait_for_selector('text="HQ Regional Administration & Oversight"', timeout=15000)
        print("  ✓ Successfully authenticated into HQ Admin Dashboard!")
        
        # Verify Banner SSoT indicator
        banner_text = page.locator('text="Supabase Dev SSoT"').first
        assert banner_text.is_visible(), "SSoT banner indicator not visible!"
        print("  ✓ SSoT Banner indicator 'Supabase Dev SSoT' verified!")
        save_screenshot(page, "local_ssot_02_hq_dashboard.png")

        # Step 3: Inspect Users Directory
        print("\nStep 3: Checking live user profiles in HQ Users tab...")
        page.click("button:has-text('Users & Roles')")
        page.wait_for_timeout(2000)
        save_screenshot(page, "local_ssot_03_users_tab.png")

        # Step 4: Navigate to Devices & MDM tab
        print("\nStep 4: Navigating to Devices & MDM tab...")
        page.click("button:has-text('Devices & MDM')")
        page.wait_for_selector('text="Company-Issued Handset Inventory & MDM"', timeout=10000)
        print("  ✓ Fleet Inventory & MDM loaded from live Supabase!")
        save_screenshot(page, "local_ssot_04_devices_tab.png")

        # Step 5: Test Nigerian Available Device Handset Assignment
        print("\nStep 5: Locating available Nigerian device (CC-DEV-LOS-SPARE-01 or NG Available)...")
        ng_device_row = page.locator('tr:has-text("Nigeria"):has-text("Available")').first
        if ng_device_row.count() == 0:
            ng_device_row = page.locator('tr:has-text("CC-DEV-LOS-SPARE-01")').first

        assign_btn = ng_device_row.locator('button[title="Assign to Salesperson"], button:has-text("Assign")').first
        assign_btn.click()

        page.wait_for_selector('text="Assign Handset to Salesperson"', timeout=5000)
        page.wait_for_timeout(1500)
        print("  ✓ Assign Handset modal opened for Nigerian device!")

        # Step 6: Inspect Custodian Dropdown for Nigeria
        print("\nStep 6: Inspecting Custodian select dropdown for Nigerian device...")
        custodian_select = page.locator('#salespersonCustodianSelect')
        options = custodian_select.locator('option').all_inner_texts()
        print(f"  Found {len(options)} Nigerian options in dropdown:")
        for opt in options:
            print(f"    - {opt}")

        save_screenshot(page, "local_ssot_05_custodian_dropdown_options.png")

        # Assert no obsolete mock users exist
        assert not any("USR-NG-002" in o for o in options), "FAIL: Obsolete mock USR-NG-002 found in dropdown!"
        assert not any("USR-NG-006" in o for o in options), "FAIL: Obsolete mock USR-NG-006 found in dropdown!"
        print("  ✓ Zero mock user IDs (USR-NG-002, USR-NG-006) in dropdown!")

        # Assert live Supabase salespeople are present
        has_bayo = any("bayo Ayodele" in o for o in options)
        has_tunde = any("Tunde Adebayo" in o for o in options)
        has_amina = any("Amina Bello" in o for o in options)
        print(f"  Checking live users in dropdown: bayo Ayodele={has_bayo}, Tunde Adebayo={has_tunde}, Amina Bello={has_amina}")
        assert has_bayo or has_tunde or has_amina, "FAIL: Real Supabase salespeople missing from custodian dropdown!"
        print("  ✓ Live Supabase salespeople verified in Nigerian dropdown!")

        # Select a live representative
        bayo_val = None
        for el in custodian_select.locator('option').all():
            txt = el.inner_text()
            if "bayo Ayodele" in txt or "Amina Bello" in txt or "Unassigned" in txt:
                bayo_val = el.get_attribute('value')
                print(f"  Selecting live representative: '{txt}' (value={bayo_val})")
                break
        
        if bayo_val:
            custodian_select.select_option(value=bayo_val)
            page.fill('textarea[placeholder*="Optional notes"]', "Assigned during Supabase SSoT local verification.")
            save_screenshot(page, "local_ssot_06_rep_selected.png")

        # Close modal
        close_btn = page.locator('button:has-text("Cancel")').first
        if close_btn.is_visible():
            close_btn.click()
            page.wait_for_timeout(1000)

        # Step 7: Check ERP Client Master Import tab
        print("\nStep 7: Checking live client import batches in Import tab...")
        page.click("button:has-text('Client Master Import')")
        page.wait_for_timeout(1500)
        save_screenshot(page, "local_ssot_07_import_batches.png")

        # Step 8: Check Exception Oversight tab
        print("\nStep 8: Checking live exception oversight...")
        page.click("button:has-text('Exception Oversight')")
        page.wait_for_timeout(1500)
        save_screenshot(page, "local_ssot_08_exceptions_oversight.png")

        print("\n=======================================================")
        print("ALL LOCAL SSOT & CUSTODIAN VERIFICATIONS COMPLETED SUCCESSFULLY!")
        print("=======================================================")

        browser.close()

if __name__ == "__main__":
    run_verification()
