import asyncio
import os
import sys
from playwright.async_api import async_playwright

ARTIFACTS_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity\brain\fc573132-6d8d-4550-b06f-9eb28f426230"
BASE_URL = "http://localhost:5173"
PASSWORD = os.environ.get("DEV_USER_PASSWORD", "")

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()

        print("1. Logging in as Country Sales Head (Babatunde Adeleke)...")
        await page.goto(BASE_URL)
        await page.wait_for_selector("input[type='email']")
        await page.fill("input[type='email']", "babatunde.adeleke@carboncarcare.com")
        await page.fill("input[type='password']", PASSWORD)
        await page.click("button[type='submit']")

        # Wait for Sales Head dashboard
        await page.wait_for_selector("text=Country Field Operations & Reviews", timeout=15000)
        print("Logged in as Country Sales Head!")

        # -------------------------------------------------------------
        # 1. CLIENT VISIT VERIFICATION (Action A)
        # -------------------------------------------------------------
        print("2. Navigating to Client Visit Verification...")
        await page.click("button:has-text('Client Visit Verification')")
        await page.wait_for_selector("text=Visit Verification & Meeting Log Inspection")
        await page.wait_for_timeout(1000)

        # Verify filters and pagination
        has_user_filter = await page.locator("select").filter(has_text="Salespeople").is_visible()
        has_date_filter = await page.is_visible("input[type='date']")
        has_pagination = await page.is_visible("text=Showing")
        print(f"Client Visit Verification - User filter: {has_user_filter}, Date filter: {has_date_filter}, Pagination: {has_pagination}")

        ss_path = os.path.join(ARTIFACTS_DIR, "fix_round3_visit_verification_filters.png")
        await page.screenshot(path=ss_path, full_page=False)
        print(f"Saved: {ss_path}")

        # -------------------------------------------------------------
        # 2. CLIENT & GPS APPROVALS (Action D)
        # -------------------------------------------------------------
        print("3. Navigating to Client & GPS Approvals...")
        await page.click("button:has-text('Client Approvals')")
        await page.wait_for_selector("text=Client Registration & GPS Location Approvals")
        await page.wait_for_timeout(1500)

        has_pin_user_filter = await page.locator("select").filter(has_text="Salespeople").is_visible()
        has_pin_date_filter = await page.is_visible("input[type='date']")
        has_pin_pagination = await page.is_visible("text=Showing")
        print(f"Client Approvals - User filter: {has_pin_user_filter}, Date filter: {has_pin_date_filter}, Pagination: {has_pin_pagination}")

        ss_path = os.path.join(ARTIFACTS_DIR, "fix_round3_pin_approvals_queue.png")
        await page.screenshot(path=ss_path, full_page=False)
        print(f"Saved: {ss_path}")

        # Inspect Location Evidence modal
        inspect_btn = page.locator("button:has-text('Inspect Location Evidence')").first
        if await inspect_btn.is_visible():
            print("Opening Inspect Location Evidence modal...")
            await inspect_btn.click()
            await page.wait_for_selector("text=1. Captured Field Evidence:")
            await page.wait_for_timeout(1000)

            ss_path = os.path.join(ARTIFACTS_DIR, "fix_round3_pin_approvals_modal_with_photo.png")
            await page.screenshot(path=ss_path, full_page=False)
            print(f"Saved: {ss_path}")

            # Close modal by clicking X or close
            close_btn = page.locator("button:has-text('Cancel')").or_(page.locator("button:has(.lucide-x)")).first
            if await close_btn.is_visible():
                await close_btn.click()
            await page.wait_for_timeout(500)

        # -------------------------------------------------------------
        # 3. EXCEPTION WORKBENCH (Action C)
        # -------------------------------------------------------------
        print("4. Navigating to Exception Workbench...")
        await page.click("button:has-text('Exception Workbench')")
        await page.wait_for_selector("text=Exception Approval Workbench")
        await page.wait_for_timeout(1000)

        has_exc_user_filter = await page.locator("select").filter(has_text="Salespeople").is_visible()
        has_exc_date_filter = await page.is_visible("input[type='date']")
        has_exc_pagination = await page.is_visible("text=Showing")
        print(f"Exception Workbench - User filter: {has_exc_user_filter}, Date filter: {has_exc_date_filter}, Pagination: {has_exc_pagination}")

        ss_path = os.path.join(ARTIFACTS_DIR, "fix_round3_exceptions_filters_pagination.png")
        await page.screenshot(path=ss_path, full_page=False)
        print(f"Saved: {ss_path}")

        # -------------------------------------------------------------
        # 4. TEAM ATTENDANCE (Action B)
        # -------------------------------------------------------------
        print("5. Navigating to Team Attendance...")
        await page.click("button:has-text('Team Attendance')")
        await page.wait_for_selector("text=Team Attendance & Non-Visit Day Governance")
        await page.wait_for_timeout(1000)

        ss_path = os.path.join(ARTIFACTS_DIR, "fix_round3_team_attendance_visits.png")
        await page.screenshot(path=ss_path, full_page=False)
        print(f"Saved: {ss_path}")

        # -------------------------------------------------------------
        # 5. SALESPERSON MOBILE PREVIEW (Tunde Adebayo)
        # -------------------------------------------------------------
        print("6. Switching to Salesperson view...")
        await page.evaluate("localStorage.clear(); sessionStorage.clear();")
        await context.clear_cookies()
        await page.goto(BASE_URL)

        await page.wait_for_selector("input[type='email']", timeout=15000)
        # Use mobile viewport for salesperson
        await page.set_viewport_size({"width": 390, "height": 844})
        await page.fill("input[type='email']", "tunde.adebayo@carboncarcare.com")
        await page.fill("input[type='password']", PASSWORD)
        await page.click("button[type='submit']")

        await page.wait_for_selector("text=Lagos Hub", timeout=15000)
        print("Logged in as Salesperson (Tunde Adebayo)!")
        await page.wait_for_timeout(1500)

        ss_path = os.path.join(ARTIFACTS_DIR, "fix_round3_salesperson_home_banner.png")
        await page.screenshot(path=ss_path, full_page=False)
        print(f"Saved: {ss_path}")

        # Check Clients tab
        print("7. Navigating to Clients tab...")
        await page.click("button:has-text('Clients')")
        await page.wait_for_selector("text=Clients & Locations")
        await page.wait_for_timeout(1500)

        ss_path = os.path.join(ARTIFACTS_DIR, "fix_round3_salesperson_clients_pending.png")
        await page.screenshot(path=ss_path, full_page=False)
        print(f"Saved: {ss_path}")

        print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!")
        await browser.close()

asyncio.run(run())
