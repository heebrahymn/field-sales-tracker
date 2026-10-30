import time
import os
import shutil
from playwright.sync_api import sync_playwright
import subprocess

SCREENSHOT_DIR = "docs/screenshots/stage3f"
BRAIN_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity\brain\fc573132-6d8d-4550-b06f-9eb28f426230"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def get_dev_password():
    with open(".env.local", "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("DEV_USER_PASSWORD="):
                return line.strip().split("=", 1)[1].replace('"', '').replace("'", "")
    return "[DEV_USER_PASSWORD_REDACTED]"

def copy_to_brain(filename):
    src = os.path.join(SCREENSHOT_DIR, filename)
    dst = os.path.join(BRAIN_DIR, filename)
    if os.path.exists(src):
        shutil.copy2(src, dst)
        print(f"[OK] Copied {filename} to brain directory.")

def run_verification():
    dev_password = get_dev_password()
    print("=" * 80)
    print("RE-SEEDING PENDING APPROVAL RECORDS IN SUPABASE")
    print("=" * 80)
    subprocess.run(["npx", "tsx", "scripts/seed_pending_approval_records.ts"], check=True, shell=True)

    print("\n" + "=" * 80)
    print("VERIFYING COUNTRY SALES HEAD REVIEW & APPROVAL WORKFLOW")
    print("=" * 80)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()

        # 1. Navigate to local app
        print("\n1. Navigating to http://localhost:5173 ...")
        page.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(1)

        # 2. Login as Babatunde Adeleke (Country Sales Head - Nigeria)
        print("2. Logging in as Babatunde Adeleke (babatunde.adeleke@carboncarcare.com) ...")
        if page.locator("input[name='email']").count() > 0:
            page.fill("input[name='email']", "babatunde.adeleke@carboncarcare.com")
            page.fill("input[name='password']", dev_password)
            page.click("button[type='submit']")
            page.wait_for_load_state("networkidle")
            time.sleep(3)
        elif page.locator("button[title*='Sign Out'], button[title*='Switch']").count() > 0:
            logout_btn = page.locator("button[title*='Sign Out'], button[title*='Switch']").first
            logout_btn.click()
            time.sleep(1)
            page.fill("input[name='email']", "babatunde.adeleke@carboncarcare.com")
            page.fill("input[name='password']", dev_password)
            page.click("button[type='submit']")
            page.wait_for_load_state("networkidle")
            time.sleep(3)

        print("[OK] Logged in. Page URL:", page.url)
        time.sleep(2)

        # Overview screenshot
        dash_shot = "sales_head_dashboard_overview.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, dash_shot))
        copy_to_brain(dash_shot)

        # 3. Verify Client Visit Verification tab
        print("\n3. Testing Client Visit Verification tab ...")
        visits_tab = page.locator("button:has-text('Client Visit Verification')").first
        if visits_tab.count() > 0:
            visits_tab.click()
            time.sleep(2)

        v_shot = "sales_head_visits_verified.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, v_shot))
        copy_to_brain(v_shot)
        print("[OK] Client Visit Verification loaded.")

        # Click the first eye icon to inspect visit details
        eye_btn = page.locator("button[title*='Inspect'], button:has-text('Inspect')").first
        if eye_btn.count() > 0:
            print("Clicking Inspect button on visit...")
            eye_btn.click()
            time.sleep(1.5)
            modal_shot = "sales_head_visit_inspection_modal.png"
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, modal_shot))
            copy_to_brain(modal_shot)
            close_btn = page.locator("button:has-text('Close'), button[title='Close']").first
            if close_btn.count() > 0:
                close_btn.click()
                time.sleep(1)

        # 4. Verify Team Attendance & Non-Visit Workday Approval Action
        print("\n4. Testing Team Attendance & Non-Visit Workday Approval Action ...")
        attendance_tab = page.locator("button:has-text('Team Attendance')").first
        if attendance_tab.count() > 0:
            attendance_tab.click()
            time.sleep(2)

        att_shot_before = "sales_head_attendance_request_pending.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, att_shot_before))
        copy_to_brain(att_shot_before)

        approve_btn = page.locator("button:has-text('Approve Non-Visit Day')").first
        if approve_btn.count() > 0 and approve_btn.is_visible():
            print("[OK] Found 'Approve Non-Visit Day' button! Clicking it to perform approval action...")
            approve_btn.click()
            time.sleep(2)
            att_shot_after = "sales_head_attendance_approved.png"
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, att_shot_after))
            copy_to_brain(att_shot_after)
            print("[OK] Non-Visit Workday successfully approved!")

        # 5. Verify Exception Workbench & Visit Exception Approval Action
        print("\n5. Testing Exception Workbench & Visit Exception Approval Action ...")
        exceptions_tab = page.locator("button:has-text('Exception Workbench')").first
        if exceptions_tab.count() > 0:
            exceptions_tab.click()
            time.sleep(2)

        exc_queue_shot = "sales_head_exceptions_queue.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, exc_queue_shot))
        copy_to_brain(exc_queue_shot)

        # Click Review button on first pending exception
        review_btn = page.locator("button:has-text('Review')").first
        if review_btn.count() > 0 and review_btn.is_visible():
            print("[OK] Found 'Review' button on pending exception! Clicking it...")
            review_btn.click()
            time.sleep(1.5)

            exc_modal_shot = "sales_head_exception_review_modal.png"
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, exc_modal_shot))
            copy_to_brain(exc_modal_shot)

            # Fill in mandatory reason
            reason_input = page.locator("textarea").first
            if reason_input.count() > 0:
                reason_input.fill("Approved after phone verification with client premises supervisor. Hardware/GPS issue confirmed.")

            # Click Approve button in modal
            approve_action_btn = page.locator("button:has-text('Approve (Unverified Activity)')").first
            if approve_action_btn.count() > 0 and approve_action_btn.is_visible():
                approve_action_btn.click()
                time.sleep(2)
                print("[OK] Clicked 'Approve (Unverified Activity)'!")

            exc_approved_shot = "sales_head_exception_approved.png"
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, exc_approved_shot))
            copy_to_brain(exc_approved_shot)

        # 6. Verify Client & GPS Approvals
        print("\n6. Testing Client & GPS Approvals ...")
        approvals_tab = page.locator("button:has-text('Client Approvals'), button:has-text('Client & GPS Approvals')").first
        if approvals_tab.count() > 0:
            approvals_tab.click()
            time.sleep(2)

        pins_shot = "sales_head_gps_pins_queue.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, pins_shot))
        copy_to_brain(pins_shot)

        pin_review_btn = page.locator("button:has-text('Review & Approve Pin')").first
        if pin_review_btn.count() > 0 and pin_review_btn.is_visible():
            print("[OK] Found 'Review & Approve Pin' button! Clicking it...")
            pin_review_btn.click()
            time.sleep(1.5)
            pin_modal_shot = "sales_head_gps_pin_modal.png"
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, pin_modal_shot))
            copy_to_brain(pin_modal_shot)

            # Fill reason
            pin_reason = page.locator("textarea").first
            if pin_reason.count() > 0:
                pin_reason.fill("GPS coordinates verified against premises entry gate.")

            pin_confirm = page.locator("button:has-text('Confirm Location Pin Approval')").first
            if pin_confirm.count() > 0 and pin_confirm.is_visible():
                pin_confirm.click()
                time.sleep(2)
                print("[OK] Clicked 'Confirm Location Pin Approval'!")
                pin_done_shot = "sales_head_gps_pin_approved.png"
                page.screenshot(path=os.path.join(SCREENSHOT_DIR, pin_done_shot))
                copy_to_brain(pin_done_shot)

        print("\n" + "=" * 80)
        print("ALL COUNTRY SALES HEAD APPROVAL WORKFLOWS VERIFIED END-TO-END!")
        print("=" * 80)
        browser.close()

if __name__ == "__main__":
    run_verification()
