"""
Stage 3A Playwright Browser Verification Script
Automates testing of real Supabase Auth, role routing, session restoration, and screenshot capture.
"""
import os
import time
from playwright.sync_api import sync_playwright

OUTPUT_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity-ide\brain\8b9fad0a-b1b7-4393-8c3b-5454f954b105\screenshots_3a"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def get_dev_password():
    pwd = os.environ.get("DEV_USER_PASSWORD")
    if not pwd and os.path.exists(".env.local"):
        with open(".env.local", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("DEV_USER_PASSWORD="):
                    pwd = line.strip().split("=", 1)[1]
                    break
    return pwd or ""

DEV_PASSWORD = get_dev_password()

def run():
    print("Launching Chromium for Stage 3A Browser Verification...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # -------------------------------------------------------------
        # 1. Desktop Login Screen (1280x800)
        # -------------------------------------------------------------
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        page.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(1)

        desktop_login_path = os.path.join(OUTPUT_DIR, "stage3a_01_login_desktop.png")
        page.screenshot(path=desktop_login_path)
        print(f"Captured: {desktop_login_path}")

        # -------------------------------------------------------------
        # 2. Mobile Login Screen - 390x844
        # -------------------------------------------------------------
        mobile_context_390 = browser.new_context(viewport={"width": 390, "height": 844})
        mobile_page_390 = mobile_context_390.new_page()
        mobile_page_390.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(1)
        mobile_390_path = os.path.join(OUTPUT_DIR, "stage3a_02_login_mobile_390.png")
        mobile_page_390.screenshot(path=mobile_390_path)
        print(f"Captured: {mobile_390_path}")

        # -------------------------------------------------------------
        # 3. Mobile Login Screen - 360x740
        # -------------------------------------------------------------
        mobile_context_360 = browser.new_context(viewport={"width": 360, "height": 740})
        mobile_page_360 = mobile_context_360.new_page()
        mobile_page_360.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(1)
        mobile_360_path = os.path.join(OUTPUT_DIR, "stage3a_03_login_mobile_360.png")
        mobile_page_360.screenshot(path=mobile_360_path)
        print(f"Captured: {mobile_360_path}")

        # -------------------------------------------------------------
        # 4. Mobile Login Screen - 430x932
        # -------------------------------------------------------------
        mobile_context_430 = browser.new_context(viewport={"width": 430, "height": 932})
        mobile_page_430 = mobile_context_430.new_page()
        mobile_page_430.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(1)
        mobile_430_path = os.path.join(OUTPUT_DIR, "stage3a_04_login_mobile_430.png")
        mobile_page_430.screenshot(path=mobile_430_path)
        print(f"Captured: {mobile_430_path}")

        # -------------------------------------------------------------
        # 5. Invalid Password Rejection Test
        # -------------------------------------------------------------
        print("\n--- Testing Invalid Password Rejection ---")
        page.fill('input[type="email"]', "tunde.adebayo@carboncarcare.com")
        page.fill('input[name="password"]', "WrongPassword999!")
        page.click('button[type="submit"]')
        time.sleep(2) # wait for Supabase 400 response
        err_path = os.path.join(OUTPUT_DIR, "stage3a_05_auth_error_invalid_password.png")
        page.screenshot(path=err_path)
        print(f"Captured: {err_path}")

        # -------------------------------------------------------------
        # 6. Real Login as Salesperson (Tunde Adebayo - NG) on 390px
        # -------------------------------------------------------------
        print("\n--- Testing Real Salesperson Login (Tunde Adebayo - NG) ---")
        mobile_page_390.fill('input[type="email"]', "tunde.adebayo@carboncarcare.com")
        mobile_page_390.fill('input[name="password"]', DEV_PASSWORD)
        mobile_page_390.click('button[type="submit"]')
        # Wait for authentication and profile load
        mobile_page_390.wait_for_selector('text=Tunde', timeout=10000)
        time.sleep(1.5)
        sales_dash_path = os.path.join(OUTPUT_DIR, "stage3a_06_salesperson_dashboard_ng.png")
        mobile_page_390.screenshot(path=sales_dash_path)
        print(f"Captured: {sales_dash_path}")

        # -------------------------------------------------------------
        # 7. Session Restoration after Refresh
        # -------------------------------------------------------------
        print("\n--- Testing Session Restoration After Page Refresh ---")
        mobile_page_390.reload(wait_until="networkidle")
        mobile_page_390.wait_for_selector('text=Tunde', timeout=10000)
        time.sleep(1)
        restored_path = os.path.join(OUTPUT_DIR, "stage3a_07_session_restored_after_refresh.png")
        mobile_page_390.screenshot(path=restored_path)
        print(f"Captured: {restored_path}")

        # -------------------------------------------------------------
        # 8. Sign Out Test
        # -------------------------------------------------------------
        print("\n--- Testing Sign Out ---")
        mobile_page_390.locator('button[title*="Sign Out"]').first.click()
        mobile_page_390.wait_for_selector('text=Company Device Sign-In', timeout=10000)
        time.sleep(1)
        signed_out_path = os.path.join(OUTPUT_DIR, "stage3a_08_signed_out_screen.png")
        mobile_page_390.screenshot(path=signed_out_path)
        print(f"Captured: {signed_out_path}")

        # -------------------------------------------------------------
        # 9. Real Login as Country Sales Head (Babatunde Adeleke - NG) on Desktop
        # -------------------------------------------------------------
        print("\n--- Testing Real Country Sales Head Login (Babatunde Adeleke - NG) ---")
        csh_context = browser.new_context(viewport={"width": 1280, "height": 800})
        csh_page = csh_context.new_page()
        csh_page.goto("http://localhost:5173", wait_until="networkidle")
        csh_page.fill('input[type="email"]', "babatunde.adeleke@carboncarcare.com")
        csh_page.fill('input[name="password"]', DEV_PASSWORD)
        csh_page.click('button[type="submit"]')
        csh_page.wait_for_selector('text=Country Field Operations & Reviews', timeout=10000)
        time.sleep(1.5)
        csh_path = os.path.join(OUTPUT_DIR, "stage3a_09_country_sales_head_ng.png")
        csh_page.screenshot(path=csh_path)
        print(f"Captured: {csh_path}")

        # -------------------------------------------------------------
        # 10. Real Login as HQ Admin (HQ Administrator - HQ) on Desktop
        # -------------------------------------------------------------
        print("\n--- Testing Real HQ Admin Login (HQ Administrator - HQ) ---")
        hq_context = browser.new_context(viewport={"width": 1280, "height": 800})
        hq_page = hq_context.new_page()
        hq_page.goto("http://localhost:5173", wait_until="networkidle")
        hq_page.fill('input[type="email"]', "hq.admin@carboncarcare.com")
        hq_page.fill('input[name="password"]', DEV_PASSWORD)
        hq_page.click('button[type="submit"]')
        hq_page.wait_for_selector('text=HQ Regional Administration & Oversight', timeout=10000)
        time.sleep(1.5)
        hq_path = os.path.join(OUTPUT_DIR, "stage3a_10_hq_admin_dashboard.png")
        hq_page.screenshot(path=hq_path)
        print(f"Captured: {hq_path}")

        # -------------------------------------------------------------
        # 11. HQ Admin Market Switching (Switch to ZM)
        # -------------------------------------------------------------
        print("\n--- Testing HQ Admin Market View Switch to ZM ---")
        hq_page.click('button[title="Filter view to ZM"]')
        time.sleep(1)
        hq_zm_path = os.path.join(OUTPUT_DIR, "stage3a_11_hq_admin_zambia_view.png")
        hq_page.screenshot(path=hq_zm_path)
        print(f"Captured: {hq_zm_path}")

        browser.close()
        print("\nBrowser verification completed successfully! All screenshots saved.")

if __name__ == "__main__":
    run()
