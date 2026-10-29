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

def get_env_var(key_name):
    val = os.environ.get(key_name)
    if not val and os.path.exists(".env.local"):
        with open(".env.local", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith(f"{key_name}="):
                    return line.strip().split("=", 1)[1]
    return val or ""

DEV_PASSWORD = get_env_var("DEV_USER_PASSWORD") or "[DEV_USER_PASSWORD_REDACTED]"

def save_screenshot(page, filename):
    p = os.path.join(OUTPUT_DIR, filename)
    page.screenshot(path=p, full_page=False)
    print(f"  [SCREENSHOT] {filename}", flush=True)

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        print("1. Logging into HQ Admin...", flush=True)
        page.goto(TARGET_URL, wait_until="networkidle")
        page.fill("input[name='email']", "hq.admin@carboncarcare.com")
        page.fill("input[name='password']", DEV_PASSWORD)
        page.click("button[type='submit']")
        page.wait_for_timeout(3000)

        # Confirm dashboard
        page.wait_for_selector('text="HQ Regional Administration & Oversight"', timeout=15000)
        print("   ✓ HQ Dashboard loaded.", flush=True)

        print("2. Navigating to Users & Roles tab...", flush=True)
        page.click("button:has-text('Users & Roles')")
        page.wait_for_timeout(2000)

        print("3. Opening Provision New User modal...", flush=True)
        page.click("button:has-text('Provision New User')")
        page.wait_for_selector('text="Provision New System User"', timeout=5000)
        page.wait_for_timeout(1000)
        print("   ✓ Provision New System User modal opened.", flush=True)

        # Nigeria check (default)
        print("\n--- 4. Checking Nigeria (NG) ---", flush=True)
        device_select = page.locator('#newUserDeviceId')
        ng_options = device_select.locator('option').all_inner_texts()
        print(f"Total NG options: {len(ng_options)}", flush=True)
        for opt in ng_options:
            print(f"   Option: {opt}", flush=True)

        ng_warning = page.locator('text=No unassigned company devices are currently available for this market')
        print(f"Is warning visible for NG? {ng_warning.is_visible()}", flush=True)
        
        # Select first available device in Nigeria
        device_select.select_option(index=1)
        page.wait_for_timeout(500)
        save_screenshot(page, "ng_provision_unassigned_devices_dropdown.png")

        # Zambia check
        print("\n--- 5. Checking Zambia (ZM) ---", flush=True)
        market_select = page.locator('#newUserMarketCode')
        market_select.select_option('ZM')
        page.wait_for_timeout(1000)

        zm_options = device_select.locator('option').all_inner_texts()
        print(f"Total ZM options: {len(zm_options)}", flush=True)
        for opt in zm_options:
            print(f"   Option: {opt}", flush=True)

        print(f"Is warning visible for ZM? {ng_warning.is_visible()}", flush=True)
        device_select.select_option(index=1)
        page.wait_for_timeout(500)
        save_screenshot(page, "zm_provision_unassigned_devices_dropdown.png")

        # Malawi check
        print("\n--- 6. Checking Malawi (MW) ---", flush=True)
        market_select.select_option('MW')
        page.wait_for_timeout(1000)

        mw_options = device_select.locator('option').all_inner_texts()
        print(f"Total MW options: {len(mw_options)}", flush=True)
        for opt in mw_options:
            print(f"   Option: {opt}", flush=True)

        print(f"Is warning visible for MW? {ng_warning.is_visible()}", flush=True)
        device_select.select_option(index=1)
        page.wait_for_timeout(500)
        save_screenshot(page, "mw_provision_unassigned_devices_dropdown.png")

        browser.close()
        print("\nAll checks completed successfully!", flush=True)

if __name__ == "__main__":
    run_test()
