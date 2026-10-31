import os
import sys
import time
import json
import urllib.request
from playwright.sync_api import sync_playwright

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

OUTPUT_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity\brain\fc573132-6d8d-4550-b06f-9eb28f426230"
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
SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "https://[SUPABASE_PROJECT_ID].supabase.co")
SUPABASE_SERVICE_ROLE_KEY = get_env_var("SUPABASE_SERVICE_ROLE_KEY")

TEST_ASSET_TAG = f"CC-DEV-LOS-REG-{int(time.time()) % 10000}"
TEST_SERIAL = f"SN-REG-{int(time.time()) % 10000}"

def supabase_get(table, query_params):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{query_params}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def supabase_delete(table, query_params):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{query_params}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    req = urllib.request.Request(url, headers=headers, method="DELETE")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status
    except Exception as e:
        print(f"Delete note: {e}")

def save_screenshot(page, filename):
    p = os.path.join(OUTPUT_DIR, filename)
    page.screenshot(path=p, full_page=False)
    print(f"  [SCREENSHOT] {filename}", flush=True)

def run():
    print("==================================================================", flush=True)
    print("VERIFYING LIVE DEVICE REGISTRATION & USER PROVISIONING INTEGRATION", flush=True)
    print(f"Asset ID: {TEST_ASSET_TAG} | Serial: {TEST_SERIAL}", flush=True)
    print("==================================================================", flush=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # Step 1: Login
        print("\nStep 1: Logging into HQ Admin...", flush=True)
        page.goto(TARGET_URL, wait_until="networkidle")
        page.fill("input[name='email']", "hq.admin@carboncarcare.com")
        page.fill("input[name='password']", DEV_PASSWORD)
        page.click("button[type='submit']")
        page.wait_for_timeout(3000)

        page.wait_for_selector('text="HQ Regional Administration & Oversight"', timeout=15000)
        print("  ✓ HQ Dashboard loaded.", flush=True)

        # Step 2: Navigate to Devices & MDM
        print("\nStep 2: Navigating to Devices & MDM...", flush=True)
        page.click("button:has-text('Devices & MDM')")
        page.wait_for_timeout(2000)

        # Step 3: Open Register New Device Modal
        print("\nStep 3: Opening Register New Device modal...", flush=True)
        page.click("#btn-register-new-device")
        page.wait_for_selector('text="Register New Company Device"', timeout=5000)
        page.wait_for_timeout(1000)

        # Step 4: Fill form
        print(f"\nStep 4: Filling registration form for {TEST_ASSET_TAG}...", flush=True)
        page.fill("#input-reg-asset-id", TEST_ASSET_TAG)
        page.fill("#input-reg-serial-number", TEST_SERIAL)
        page.fill("input[placeholder='e.g. 864209051999123']", "864209051999123")
        page.fill("textarea[placeholder='Enter deployment notes or storage location...']", "Live UI verification registration")
        
        save_screenshot(page, "device_reg_01_form_filled.png")

        # Step 5: Submit form
        print("\nStep 5: Submitting registration form...", flush=True)
        page.click("#btn-submit-register-device")
        
        # Wait for success banner or modal close
        page.wait_for_timeout(2500)
        save_screenshot(page, "device_reg_02_after_submit.png")

        # Step 6: Verify device in Supabase database
        print("\nStep 6: Querying Supabase PostgreSQL devices table...", flush=True)
        devices_in_db = supabase_get("devices", f"asset_tag=eq.{TEST_ASSET_TAG}&select=id,asset_tag,serial_number,market_code,inventory_status")
        assert len(devices_in_db) > 0, f"Device {TEST_ASSET_TAG} was NOT found in Supabase database!"
        db_device = devices_in_db[0]
        print(f"  ✓ Device confirmed in Supabase! ID: {db_device['id']}, Status: {db_device['inventory_status']}", flush=True)

        # Step 7: Verify device in Devices & MDM Table
        print("\nStep 7: Verifying device presence in Fleet Inventory UI table...", flush=True)
        page.wait_for_selector(f'tr:has-text("{TEST_ASSET_TAG}")', timeout=8000)
        print(f"  ✓ Device {TEST_ASSET_TAG} visible in live Fleet table!", flush=True)
        save_screenshot(page, "device_reg_03_fleet_table.png")

        # Step 8: Navigate to Users & Roles and verify in User Provisioning Dropdown
        print("\nStep 8: Navigating to Users & Roles...", flush=True)
        page.click("button:has-text('Users & Roles')")
        page.wait_for_timeout(2000)

        print("Step 9: Opening Provision New User modal...", flush=True)
        page.click("button:has-text('Provision New User')")
        page.wait_for_selector('text="Provision New System User"', timeout=5000)
        page.wait_for_timeout(1000)

        print("\nStep 10: Checking Assign Company Device dropdown for newly registered device...", flush=True)
        device_select = page.locator('#newUserDeviceId')
        options = device_select.locator('option').all_inner_texts()
        matching_opts = [opt for opt in options if TEST_ASSET_TAG in opt]
        
        print(f"  Total dropdown options: {len(options)}", flush=True)
        print(f"  Matching option for new device: {matching_opts}", flush=True)
        assert len(matching_opts) > 0, f"New device {TEST_ASSET_TAG} did not appear in user provisioning dropdown!"

        # Select the newly registered device in the dropdown
        for i, opt in enumerate(options):
            if TEST_ASSET_TAG in opt:
                device_select.select_option(index=i)
                break
        page.wait_for_timeout(1000)

        save_screenshot(page, "device_reg_04_user_provision_selected.png")
        print(f"  ✓ Device {TEST_ASSET_TAG} successfully selected in user provisioning dropdown!", flush=True)

        # Cleanup test device from Supabase
        print("\nStep 11: Cleaning up test device from Supabase...", flush=True)
        supabase_delete("approval_audit", f"entity_id=eq.{db_device['id']}")
        supabase_delete("devices", f"id=eq.{db_device['id']}")
        print("  ✓ Test device cleaned up successfully.", flush=True)

        browser.close()
        print("\n==================================================================", flush=True)
        print("ALL VERIFICATION STEPS PASSED SUCCESSFULLY!", flush=True)
        print("==================================================================", flush=True)

if __name__ == "__main__":
    run()
