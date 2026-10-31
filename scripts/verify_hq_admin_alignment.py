import time
import os
from playwright.sync_api import sync_playwright

BRAIN_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity\brain\fc573132-6d8d-4550-b06f-9eb28f426230"
DEV_PASSWORD = os.environ.get("DEV_USER_PASSWORD", "")
BASE_URL = "http://localhost:5173"

def save_brain_screenshot(page, filename):
    path = os.path.join(BRAIN_DIR, filename)
    page.screenshot(path=path)
    print(f"[OK] Saved screenshot: {filename}", flush=True)

def run():
    print("=" * 80, flush=True)
    print("VERIFICATION OF HQ ADMIN METRICS & MODULE ALIGNMENT", flush=True)
    print("=" * 80, flush=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
        )

        ctx = browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        )
        page = ctx.new_page()

        print("1. Logging in as HQ Admin (hq.admin@carboncarcare.com)...", flush=True)
        page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        time.sleep(1)

        page.fill('input[type="email"]', 'hq.admin@carboncarcare.com')
        page.fill('input[type="password"]', DEV_PASSWORD)
        page.click('button:has-text("Sign In With Credentials")')

        # Wait until dashboard is loaded
        print("Waiting for dashboard to load...", flush=True)
        page.wait_for_selector("text=HQ Regional Administration", timeout=15000)
        time.sleep(3)

        # 1. Capture HQ Operations Dashboard
        print("2. Capturing HQ Operations Dashboard...", flush=True)
        save_brain_screenshot(page, "hq_dashboard_aligned_metrics.png")

        # 2. Navigate to User & Role Management
        print("3. Navigating to User & Role Management...", flush=True)
        page.click("button:has-text('User & Role Management')")
        page.wait_for_selector("text=User & Role Governance Console", timeout=10000)
        time.sleep(3)
        save_brain_screenshot(page, "hq_user_directory_aligned.png")

        # 3. Navigate to Company Devices & MDM
        print("4. Navigating to Company Devices & MDM...", flush=True)
        page.click("button:has-text('Company Devices & MDM')")
        page.wait_for_selector("text=Company-Issued Handset Inventory & MDM", timeout=10000)
        time.sleep(3)
        save_brain_screenshot(page, "hq_device_inventory_aligned.png")

        # 4. Navigate to Client Audit Oversight
        print("5. Navigating to Client Audit Oversight...", flush=True)
        page.click("button:has-text('Client Audit Oversight')")
        page.wait_for_selector("text=Client Audit Oversight & Verification Sampling", timeout=10000)
        time.sleep(3)
        save_brain_screenshot(page, "hq_client_audit_oversight_aligned.png")

        browser.close()
        print("\n[SUCCESS] All HQ Admin screens captured and verified!", flush=True)

if __name__ == "__main__":
    run()
