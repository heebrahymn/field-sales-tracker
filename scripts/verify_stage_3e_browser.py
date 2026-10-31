"""
Stage 3E Comprehensive Browser E2E, Country Sales Head & HQ Admin Verification Script
Automates testing and visual artifact generation across:
- Desktop viewport: 1280x800
- Mobile viewports: 390x844, 360x800
- Nigeria Country Sales Head (Babatunde Adeleke):
  1. stage3e_01_country_manager_dashboard_1280.png
  2. stage3e_02_branch_pin_approvals_queue_1280.png
  3. stage3e_03_exception_review_workbench_1280.png
  4. stage3e_04_client_visit_verification_1280.png
  5. stage3e_05_risk_flags_workbench_1280.png
  6. stage3e_06_client_audit_workbench_1280.png
  7. stage3e_07_country_csv_export_modal_1280.png
  8. stage3e_14_manager_mobile_390.png
  9. stage3e_15_manager_compact_360.png
- Enterprise HQ Administrator (HQ Administrator):
  10. stage3e_08_hq_operations_overview_1280.png
  11. stage3e_09_hq_user_management_1280.png
  12. stage3e_10_hq_device_management_zero_bottleneck_1280.png
  13. stage3e_11_hq_market_configuration_1280.png
  14. stage3e_12_hq_system_audit_log_1280.png
  15. stage3e_13_hq_client_master_import_1280.png
"""
import os
import time
import shutil
import subprocess
import requests
from playwright.sync_api import sync_playwright

OUTPUT_DIR = os.path.join("docs", "screenshots", "stage3e")
ARTIFACT_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity\brain\fc573132-6d8d-4550-b06f-9eb28f426230"
os.makedirs(OUTPUT_DIR, exist_ok=True)


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
    out_path = os.path.join(OUTPUT_DIR, filename)
    page.screenshot(path=out_path, full_page=False)
    if os.path.exists(ARTIFACT_DIR):
        shutil.copy2(out_path, os.path.join(ARTIFACT_DIR, filename))
    print(f"  [Artifact Captured] {filename} -> {out_path}")
    return out_path


def check_no_overflow(page, label):
    overflow = page.evaluate(
        "() => document.documentElement.scrollWidth > window.innerWidth"
    )
    scroll_w = page.evaluate("() => document.documentElement.scrollWidth")
    inner_w = page.evaluate("() => window.innerWidth")
    print(f"  [Viewport Check - {label}] scrollWidth={scroll_w}, innerWidth={inner_w}, overflow={overflow}")
    assert not overflow, f"Horizontal overflow detected on {label}: {scroll_w} > {inner_w}"


def is_server_up():
    try:
        r = requests.get("http://localhost:5173", timeout=2)
        return r.status_code == 200
    except Exception:
        return False


def login(page, email, password):
    page.goto("http://localhost:5173")
    page.wait_for_load_state("networkidle")
    
    # If already logged in with another user, click sign out
    logout_btns = page.locator("button:has-text('Sign Out'), button[title*='Sign Out'], #demo-switch-user")
    if logout_btns.count() > 0:
        # Clear storage and reload
        page.evaluate("() => { localStorage.clear(); sessionStorage.clear(); }")
        page.goto("http://localhost:5173")
        page.wait_for_load_state("networkidle")

    # Fill login form
    if page.locator("input[type='email']").is_visible():
        page.fill("input[type='email']", email)
        page.fill("input[type='password']", password)
        page.click("button:has-text('Sign In')")
        page.wait_for_load_state("networkidle")
        time.sleep(2.0)


def run():
    print("=" * 75)
    print("STAGE 3E BROWSER E2E: COUNTRY SALES HEAD & HQ ADMIN WORKFLOW INTEGRATION")
    print("=" * 75)

    vite_proc = None
    if not is_server_up():
        print("  Starting local Vite dev server on http://localhost:5173...")
        vite_proc = subprocess.Popen(
            ["npx", "vite", "--port", "5173"],
            shell=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        for _ in range(30):
            if is_server_up():
                break
            time.sleep(1.0)
        assert is_server_up(), "Failed to start local Vite server on port 5173"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # =====================================================================
        # PART 1: Nigeria Country Sales Head (Babatunde Adeleke)
        # =====================================================================
        print("\n--- Part 1: Nigeria Country Sales Head Verification ---")
        context_csh = browser.new_context(viewport={"width": 1280, "height": 800})
        page_csh = context_csh.new_page()

        login(page_csh, "babatunde.adeleke@carboncarcare.com", DEV_PASSWORD)
        page_csh.wait_for_selector("text=Country Field Operations & Reviews", timeout=15000)
        time.sleep(1.5)

        # 1. Country Manager Dashboard Overview (1280x800)
        print("\n[1/15] Capturing Country Manager Dashboard (1280x800)...")
        page_csh.wait_for_selector("text=Country Field Operations & Reviews", timeout=15000)
        time.sleep(1.0)
        save_screenshot(page_csh, "stage3e_01_country_manager_dashboard_1280.png")

        # 2. Branch GPS Pin Approvals Queue
        print("\n[2/15] Navigating to Client & GPS Approvals Queue...")
        page_csh.click("button:has-text('Client & GPS Approvals')")
        page_csh.wait_for_selector("text=Client Registration & GPS Location Approvals", timeout=15000)
        time.sleep(1.0)
        save_screenshot(page_csh, "stage3e_02_branch_pin_approvals_queue_1280.png")

        # 3. Exception Review Workbench
        print("\n[3/15] Navigating to Exception Review Workbench...")
        page_csh.click("button:has-text('Exception Workbench')")
        page_csh.wait_for_selector("text=Exception Approval Workbench", timeout=15000)
        time.sleep(1.0)
        save_screenshot(page_csh, "stage3e_03_exception_review_workbench_1280.png")

        # 4. Client Visit Verification
        print("\n[4/15] Navigating to Client Visit Verification...")
        page_csh.click("button:has-text('Client Visit Verification')")
        page_csh.wait_for_selector("text=Geofence Limit: 200m", timeout=15000)
        time.sleep(1.0)
        save_screenshot(page_csh, "stage3e_04_client_visit_verification_1280.png")

        # 5. Risk Flags Queue
        print("\n[5/15] Navigating to Risk Flags Queue...")
        page_csh.click("button:has-text('Risk Flags Queue')")
        page_csh.wait_for_selector("text=Behavioral Risk Flags & Telemetry Exceptions", timeout=15000)
        time.sleep(1.0)
        save_screenshot(page_csh, "stage3e_05_risk_flags_workbench_1280.png")

        # 6. Client Audit Calls (5%) Workbench
        print("\n[6/15] Navigating to Client Audit Workbench...")
        page_csh.click("button:has-text('Client Audit Calls (5%)')")
        page_csh.wait_for_selector("text=Client Audit Phone Call Workbench", timeout=15000)
        time.sleep(1.0)
        save_screenshot(page_csh, "stage3e_06_client_audit_workbench_1280.png")

        # 7. Country CSV Export Modal
        print("\n[7/15] Opening Audited Country CSV Export Modal...")
        page_csh.click("button:has-text('Operational Dashboard')")
        time.sleep(1.0)
        page_csh.click("button:has-text('Export Country CSV')")
        page_csh.wait_for_selector("text=Audited Country CSV Export", timeout=15000)
        time.sleep(1.0)
        save_screenshot(page_csh, "stage3e_07_country_csv_export_modal_1280.png")
        # Close export modal
        page_csh.keyboard.press("Escape")
        time.sleep(0.5)

        # 8. Country Manager Mobile Viewport (390x844)
        print("\n[8/15] Testing Manager Mobile Viewport (390x844)...")
        page_csh.set_viewport_size({"width": 390, "height": 844})
        time.sleep(1.0)
        check_no_overflow(page_csh, "CSH Mobile 390x844")
        save_screenshot(page_csh, "stage3e_14_manager_mobile_390.png")

        # 9. Country Manager Compact Mobile Viewport (360x800)
        print("\n[9/15] Testing Manager Compact Viewport (360x800)...")
        page_csh.set_viewport_size({"width": 360, "height": 800})
        time.sleep(1.0)
        check_no_overflow(page_csh, "CSH Compact 360x800")
        save_screenshot(page_csh, "stage3e_15_manager_compact_360.png")

        context_csh.close()

        # =====================================================================
        # PART 2: Enterprise HQ Administrator (HQ Administrator)
        # =====================================================================
        print("\n--- Part 2: Enterprise HQ Administrator Verification ---")
        context_hq = browser.new_context(viewport={"width": 1280, "height": 800})
        page_hq = context_hq.new_page()

        login(page_hq, "hq.admin@carboncarcare.com", DEV_PASSWORD)
        page_hq.wait_for_selector("text=HQ Regional Administration & Oversight", timeout=15000)
        time.sleep(1.5)

        # 10. HQ Operations Overview (1280x800)
        print("\n[10/15] Capturing HQ Operations Overview (1280x800)...")
        save_screenshot(page_hq, "stage3e_08_hq_operations_overview_1280.png")

        # 11. HQ User Management
        print("\n[11/15] Navigating to HQ User & Role Management...")
        page_hq.click("button:has-text('User & Role Management')")
        page_hq.wait_for_selector("text=User & Role Governance Console", timeout=15000)
        time.sleep(1.0)
        save_screenshot(page_hq, "stage3e_09_hq_user_management_1280.png")

        # 12. HQ Device Management & Zero Bottleneck Replacement Workbench
        print("\n[12/15] Navigating to HQ Company Devices & MDM...")
        page_hq.click("button:has-text('Company Devices & MDM')")
        page_hq.wait_for_selector("text=Company-Issued Handset Inventory & MDM", timeout=15000)
        time.sleep(1.0)
        save_screenshot(page_hq, "stage3e_10_hq_device_management_zero_bottleneck_1280.png")

        # 13. HQ Market Configuration
        print("\n[13/15] Navigating to HQ Rule Sets & Calendars...")
        page_hq.click("button:has-text('Rule Sets & Calendars')")
        page_hq.wait_for_selector("text=National Market Configuration & Operational Rule Sets", timeout=15000)
        time.sleep(1.0)
        save_screenshot(page_hq, "stage3e_11_hq_market_configuration_1280.png")

        # 14. HQ System Audit Log
        print("\n[14/15] Navigating to HQ System Audit Log...")
        page_hq.click("button:has-text('System Audit Log')")
        page_hq.wait_for_selector("text=Enterprise System Administration Audit Trail", timeout=15000)
        time.sleep(1.0)
        save_screenshot(page_hq, "stage3e_12_hq_system_audit_log_1280.png")

        # 15. HQ Client Master Import (PRD §4.2 / AT-08)
        print("\n[15/15] Navigating to HQ Client Master Import...")
        page_hq.click("button:has-text('Client Master Import')")
        page_hq.wait_for_selector("text=Client Master Batch Import & Geocode Ingestion", timeout=15000)
        time.sleep(1.0)
        save_screenshot(page_hq, "stage3e_13_hq_client_master_import_1280.png")

        context_hq.close()
        browser.close()

    if vite_proc:
        print("\n  Stopping local Vite server...")
        vite_proc.terminate()

    print("\n" + "=" * 75)
    print("ALL 15 STAGE 3E BROWSER ARTIFACTS CAPTURED AND VERIFIED!")
    print("=" * 75)


if __name__ == "__main__":
    run()
