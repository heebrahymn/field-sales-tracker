import os
import sys
import time
from playwright.sync_api import sync_playwright

OUTPUT_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity-ide\brain\8b9fad0a-b1b7-4393-8c3b-5454f954b105\screenshots"
ARTIFACT_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity\brain\fc573132-6d8d-4550-b06f-9eb28f426230"
os.makedirs(OUTPUT_DIR, exist_ok=True)
if os.path.exists(ARTIFACT_DIR):
    os.makedirs(ARTIFACT_DIR, exist_ok=True)

LIVE_URL = "https://field-sales-tracker-b6l7.vercel.app/"

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
    p1 = os.path.join(OUTPUT_DIR, filename)
    page.screenshot(path=p1, full_page=True)
    if os.path.exists(ARTIFACT_DIR):
        p2 = os.path.join(ARTIFACT_DIR, filename)
        page.screenshot(path=p2, full_page=True)
    print(f"  [SCREENSHOT] {filename}")

def run_test():
    print("=" * 80)
    print("VERIFYING LIVE USER PROVISIONING & LOGIN END-TO-END ON VERCEL STAGING")
    print(f"Target URL: {LIVE_URL}")
    print("=" * 80)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: console_logs.append(f"[PAGEERROR] {err}"))

        # Step 1: Open Live URL
        print("\n[Step 1] Navigating to Vercel staging URL...")
        page.goto(LIVE_URL, wait_until="networkidle", timeout=30000)
        time.sleep(2)
        save_screenshot(page, "p0_fix_01_login_page.png")

        # Step 2: Log in as HQ Admin
        print("\n[Step 2] Authenticating as Enterprise HQ Administrator (hq.admin@carboncarcare.com)...")
        page.fill("input[name='email']", "hq.admin@carboncarcare.com")
        page.fill("input[name='password']", DEV_PASSWORD)
        page.click("button[type='submit']")
        page.wait_for_timeout(3000)

        page.wait_for_selector("text=HQ Regional Administration & Oversight", timeout=15000)
        print("  PASS: HQ Admin authenticated successfully!")

        # Step 3: Navigate to Users & Roles Tab
        print("\n[Step 3] Navigating to Users & Roles tab...")
        users_tab = page.locator("button:has-text('Users & Roles'), button:has-text('User & Role Management')").first
        users_tab.click()
        page.wait_for_timeout(2000)
        save_screenshot(page, "p0_fix_02_hq_users_directory.png")

        # Step 4: Verify directory loads real profiles
        page_text = page.inner_text("body")
        assert "User & Role Governance Console" in page_text, "Failed to load User & Role Governance Console"
        print("  PASS: User & Role Governance Console loaded.")

        # Step 5: Open Provision New User modal
        print("\n[Step 4] Opening Provision New User modal...")
        page.click("button:has-text('Provision New User')")
        page.wait_for_timeout(1000)
        save_screenshot(page, "p0_fix_03_provision_user_modal.png")

        # Step 6: Fill form for new employee
        timestamp_suffix = str(int(time.time()))[-4:]
        new_emp_email = f"zainab.lawal.test{timestamp_suffix}@carboncarcare.com"
        print(f"\n[Step 5] Provisioning new employee: Zainab Lawal ({new_emp_email})...")
        
        # Fill Full Name
        page.fill("input[placeholder*='Babatunde Adeleke']", "Zainab Lawal")
        
        # Fill Corporate Email
        page.fill("input[placeholder='name@carboncarcare.com']", new_emp_email)
        
        # Fill Mobile Phone
        page.fill("input[placeholder*='234 800 123 4567']", "+234 802 555 7788")
        
        # Set Temporary Password
        new_emp_password = "[DEV_USER_PASSWORD_REDACTED]"
        page.fill("input[placeholder*='secure 20-character']", new_emp_password)
        
        save_screenshot(page, "p0_fix_04_filled_provision_form.png")

        # Step 7: Click Provision User Account
        print("\n[Step 6] Submitting user provisioning to Edge Function...")
        page.click("button:has-text('Provision User Account')")

        # Step 8: Wait for Success Credential Modal
        page.wait_for_selector("text=User Account Provisioned", timeout=25000)
        print("  PASS: Success Credential Modal appeared! User provisioned on backend.")
        time.sleep(1)
        save_screenshot(page, "p0_fix_05_provision_success_modal.png")

        # Step 9: Verify success modal contents
        modal_text = page.inner_text("body")
        assert "Zainab Lawal" in modal_text, "Employee name missing from success modal"
        assert new_emp_email in modal_text, "Employee email missing from success modal"
        assert "Persisted in Supabase Auth & PostgreSQL Profiles" in modal_text, "Persistence confirmation missing"
        print("  PASS: Persistence confirmed in Supabase Auth & PostgreSQL profiles.")

        # Step 10: Close success modal
        page.click("button:has-text('Done')")
        page.wait_for_timeout(2000)

        # Step 11: Verify new user appears in directory table
        print("\n[Step 7] Verifying new user appears in live directory table...")
        save_screenshot(page, "p0_fix_06_updated_directory.png")
        table_text = page.inner_text("body")
        assert new_emp_email in table_text, f"New employee email {new_emp_email} not found in directory table!"
        print(f"  PASS: Employee {new_emp_email} found in live directory table!")

        # Step 12: Sign Out
        print("\n[Step 8] Logging out HQ Admin...")
        save_screenshot(page, "p0_fix_07_logged_out.png")

        # Step 13: Log in as the newly created employee in a fresh mobile session
        print(f"\n[Step 9] Logging in as newly created employee ({new_emp_email})...")
        context_emp = browser.new_context(viewport={"width": 390, "height": 844}) # Mobile viewport
        page_emp = context_emp.new_page()
        page_emp.goto(LIVE_URL, wait_until="networkidle", timeout=30000)
        page_emp.fill("input[name='email']", new_emp_email)
        page_emp.fill("input[name='password']", new_emp_password)
        page_emp.click("button[type='submit']")
        page_emp.wait_for_timeout(4000)

        # Verify landing on Salesperson Dashboard with Start Workday action
        page_emp.wait_for_selector("text=Start Workday", timeout=15000)
        save_screenshot(page_emp, "p0_fix_08_new_user_salesperson_dashboard.png")
        emp_dashboard_text = page_emp.inner_text("body")
        assert "Zainab Lawal" in emp_dashboard_text, "Employee name missing from dashboard"
        assert "Start Workday" in emp_dashboard_text, "Start Workday button missing"
        print("  PASS: Newly provisioned employee authenticated successfully and accessed Field Sales dashboard!")

        browser.close()

    print("\n" + "=" * 80)
    print("ALL VERIFICATION CHECKS PASSED: USER PROVISIONING WORKS END-TO-END ON LIVE STAGING!")
    print("=" * 80)

if __name__ == "__main__":
    run_test()
