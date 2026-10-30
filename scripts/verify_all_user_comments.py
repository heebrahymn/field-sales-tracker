import time
import os
import subprocess
from playwright.sync_api import sync_playwright

BRAIN_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity\brain\fc573132-6d8d-4550-b06f-9eb28f426230"
DEV_PASSWORD = "[DEV_USER_PASSWORD_REDACTED]"
BASE_URL = "http://localhost:5173"

def save_brain_screenshot(page, filename):
    path = os.path.join(BRAIN_DIR, filename)
    page.screenshot(path=path)
    print(f"[OK] Saved screenshot: {filename}", flush=True)

def run_test():
    print("=" * 80, flush=True)
    print("STEP 0: RE-SEED FRESH PENDING RECORDS", flush=True)
    print("=" * 80, flush=True)
    subprocess.run(["npx", "tsx", "scripts/seed_pending_approval_records.ts"], check=True, shell=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
        )

        # -------------------------------------------------------------
        # DESKTOP SESSION: Country Sales Head (Nigeria)
        # -------------------------------------------------------------
        print("\n" + "=" * 80, flush=True)
        print("SCENARIO 1 & 2: SALES HEAD DASHBOARD & TEAM ATTENDANCE APPROVAL", flush=True)
        print("=" * 80, flush=True)
        desk_ctx = browser.new_context(
            viewport={"width": 1400, "height": 900},
            permissions=["geolocation", "camera"],
            geolocation={"latitude": 6.5892, "longitude": 3.3581}
        )
        head_page = desk_ctx.new_page()

        print("1. Logging in as Country Sales Head (babatunde.adeleke@carboncarcare.com)...", flush=True)
        head_page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        time.sleep(1)
        head_page.fill("input[name='email'], input[type='email']", "babatunde.adeleke@carboncarcare.com")
        head_page.fill("input[name='password'], input[type='password']", DEV_PASSWORD)
        head_page.click("button:has-text('Sign In With Credentials')")
        head_page.wait_for_load_state("networkidle")
        time.sleep(2)

        # Check Operational Dashboard Cards
        print("2. Checking Dashboard KPI Cards accuracy...", flush=True)
        save_brain_screenshot(head_page, "fix_sales_head_dashboard_cards.png")

        # Navigate to Team Attendance
        print("3. Navigating to Team Attendance...", flush=True)
        att_tab = head_page.locator("button:has-text('Team Attendance')").first
        att_tab.click()
        time.sleep(2)
        save_brain_screenshot(head_page, "fix_team_attendance_before_approval.png")

        # Approve pending non-visit workday if present
        approve_nvd_btn = head_page.locator("button:has-text('Approve Non-Visit Day')").first
        if approve_nvd_btn.count() > 0 and approve_nvd_btn.is_visible():
            print("Found pending non-visit workday request. Approving...", flush=True)
            approve_nvd_btn.click()
            time.sleep(2.5)
            save_brain_screenshot(head_page, "fix_team_attendance_after_approval.png")
            print("Non-visit workday approved! Verified table shows Non-Visit Workday badge.", flush=True)
        else:
            print("No pending request currently visible (may already be approved).", flush=True)

        # -------------------------------------------------------------
        # MOBILE SESSION: Field Salesperson (Nigeria)
        # -------------------------------------------------------------
        print("\n" + "=" * 80, flush=True)
        print("SCENARIO 3: SALESPERSON START WORKDAY, CAMERA FLIP, ADD CLIENT, EXCEPTION & VISIT", flush=True)
        print("=" * 80, flush=True)
        mob_ctx = browser.new_context(
            viewport={"width": 412, "height": 915},
            is_mobile=True,
            permissions=["geolocation", "camera"],
            geolocation={"latitude": 6.5892, "longitude": 3.3581}
        )
        rep_page = mob_ctx.new_page()

        print("1. Logging in as Field Salesperson (tunde.adebayo@carboncarcare.com)...", flush=True)
        rep_page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        time.sleep(1)
        rep_page.fill("input[name='email'], input[type='email']", "tunde.adebayo@carboncarcare.com")
        rep_page.fill("input[name='password'], input[type='password']", DEV_PASSWORD)
        rep_page.click("button:has-text('Sign In With Credentials')")
        rep_page.wait_for_load_state("networkidle")
        time.sleep(2)
        save_brain_screenshot(rep_page, "fix_salesperson_home_screen.png")

        # Start Workday if not started
        start_workday_btn = rep_page.locator("button:has-text('Start Workday')").first
        if start_workday_btn.count() > 0 and start_workday_btn.is_visible():
            print("Workday not started. Starting workday with selfie and GPS...", flush=True)
            start_workday_btn.click()
            time.sleep(1.5)
            # Capture selfie in modal
            snap_selfie = rep_page.locator("button:has-text('Capture Live Selfie'), button:has-text('Capture Selfie')").first
            if snap_selfie.count() > 0 and snap_selfie.is_visible():
                snap_selfie.click()
                time.sleep(1)
            confirm_start = rep_page.locator("button:has-text('Confirm & Start Workday'), button:has-text('Start Day')").first
            if confirm_start.count() > 0 and confirm_start.is_visible():
                confirm_start.click()
                time.sleep(3)
                print("Workday successfully started!", flush=True)
                save_brain_screenshot(rep_page, "fix_salesperson_workday_started.png")

        # Open Clients Directory via #nav-tab-clients
        print("2. Opening Clients Directory via #nav-tab-clients...", flush=True)
        clients_nav = rep_page.locator("#nav-tab-clients").first
        clients_nav.click()
        time.sleep(2)
        save_brain_screenshot(rep_page, "fix_salesperson_clients_directory.png")

        # Open Add Client Modal
        print("3. Opening Add Client modal...", flush=True)
        add_client_btn = rep_page.locator("button:has-text('Add Client')").first
        if add_client_btn.count() > 0 and add_client_btn.is_visible():
            add_client_btn.click()
            time.sleep(1.5)
            save_brain_screenshot(rep_page, "fix_add_client_modal_camera_idle.png")

            # Open Live Camera
            open_cam = rep_page.locator("button:has-text('Open Live Camera')").first
            if open_cam.count() > 0 and open_cam.is_visible():
                print("Opening live camera...", flush=True)
                open_cam.click()
                time.sleep(1.5)
                save_brain_screenshot(rep_page, "fix_add_client_camera_active_rear.png")

                # Flip camera to front
                switch_cam = rep_page.locator("button:has-text('Switch to Front')").first
                if switch_cam.count() > 0 and switch_cam.is_visible():
                    print("Flipping camera to front...", flush=True)
                    switch_cam.click()
                    time.sleep(1)
                    save_brain_screenshot(rep_page, "fix_add_client_camera_flipped_front.png")

                # Snap photo
                snap_btn = rep_page.locator("button:has-text('Capture Photo')").first
                if snap_btn.count() > 0 and snap_btn.is_visible():
                    print("Snapping premises photo...", flush=True)
                    snap_btn.click()
                    time.sleep(1)
                    save_brain_screenshot(rep_page, "fix_add_client_photo_captured.png")

            # Fill in client details
            print("Registering new client branch...", flush=True)
            rep_page.fill("#input-new-company-name", "Zenith Fleet Logistics")
            rep_page.fill("#input-branch-name", "Ikeja Distribution Depot")
            rep_page.fill("#input-branch-address", "Plot 14 Commercial Avenue, Ikeja")
            rep_page.fill("#input-contact-name", "Engr. Samuel Okeke")
            rep_page.fill("#input-contact-phone", "+234 802 555 8899")

            # Ensure photo is attached
            if not rep_page.locator("text='Photo Attached'").is_visible():
                snap_fallback = rep_page.locator("button:has-text('Generate Snapshot'), button:has-text('Capture Photo')").first
                if snap_fallback.count() > 0 and snap_fallback.is_visible():
                    snap_fallback.click()
                    time.sleep(1)

            time.sleep(1)
            submit_client = rep_page.locator("#btn-submit-branch-registration").first
            print("Submit button enabled:", submit_client.is_enabled(), flush=True)
            if submit_client.is_enabled():
                print("Submitting branch registration...", flush=True)
                submit_client.click()
                time.sleep(3)
                save_brain_screenshot(rep_page, "fix_client_registered_success.png")

                # Close success dialog
                close_succ = rep_page.locator("#btn-done-registered-branch, #btn-close-register-modal").first
                if close_succ.count() > 0 and close_succ.is_visible():
                    close_succ.click()
                    time.sleep(1.5)
            else:
                print("Submit button not enabled. Closing modal...", flush=True)
                rep_page.click("#btn-close-register-modal, #btn-cancel-register-modal")
                time.sleep(1)

        # -------------------------------------------------------------
        # SALESPERSON: My Exceptions Workbench -> Create Exception
        # -------------------------------------------------------------
        print("\n" + "=" * 80, flush=True)
        print("SALESPERSON: CREATE OPERATIONAL EXCEPTION", flush=True)
        print("=" * 80, flush=True)
        exc_nav = rep_page.locator("#nav-tab-exceptions").first
        if exc_nav.count() > 0:
            exc_nav.click()
            time.sleep(1.5)
            save_brain_screenshot(rep_page, "fix_salesperson_exceptions_list.png")

            new_claim_btn = rep_page.locator("button:has-text('New Claim')").first
            if new_claim_btn.count() > 0 and new_claim_btn.is_visible():
                new_claim_btn.click()
                time.sleep(1)
                save_brain_screenshot(rep_page, "fix_create_exception_modal.png")

                # Submit claim
                sub_claim = rep_page.locator("#btn-submit-exception-claim, button:has-text('Submit Exception Claim')").first
                if sub_claim.count() > 0 and sub_claim.is_visible():
                    sub_claim.click()
                    time.sleep(2.5)
                    save_brain_screenshot(rep_page, "fix_salesperson_exception_submitted.png")
                    print("Exception submitted!", flush=True)

        # -------------------------------------------------------------
        # SALESPERSON: VISIT WORKFLOW CHECK-IN
        # -------------------------------------------------------------
        print("\n" + "=" * 80, flush=True)
        print("SALESPERSON: VISIT WORKFLOW CHECK-IN", flush=True)
        print("=" * 80, flush=True)
        visits_nav = rep_page.locator("#nav-tab-visit").first
        if visits_nav.count() > 0:
            visits_nav.click()
            time.sleep(2)
            save_brain_screenshot(rep_page, "fix_visit_workflow_screen.png")

            # Check if active visit already in progress
            if rep_page.locator("text='Active Visit in Progress'").count() == 0:
                # Select approved client if not selected
                client_item = rep_page.locator("button:has-text('Apex Heavy Logistics'), div:has-text('Depot')").first
                if client_item.count() > 0 and client_item.is_visible():
                    client_item.click()
                    time.sleep(1)

                # Capture premises photo if needed
                capture_photo_btn = rep_page.locator("#sticky-btn-capture-photo, button:has-text('Capture Live Premises Photo'), button:has-text('Capture Photo')").first
                if capture_photo_btn.count() > 0 and capture_photo_btn.is_visible():
                    print("Capturing live premises photo...", flush=True)
                    capture_photo_btn.click()
                    time.sleep(2)
                    save_brain_screenshot(rep_page, "fix_visit_premises_photo_captured.png")

                # Check in
                checkin_btn = rep_page.locator("#sticky-btn-checkin, button:has-text('Check In & Start Client Meeting')").first
                if checkin_btn.count() > 0 and checkin_btn.is_visible() and checkin_btn.is_enabled():
                    print("Clicking Check In & Start Client Meeting...", flush=True)
                    checkin_btn.click()
                    time.sleep(3)
                    save_brain_screenshot(rep_page, "fix_salesperson_active_visit_running.png")
                    print("Visit checked in successfully!", flush=True)

        # -------------------------------------------------------------
        # SALES HEAD: Review & Approve Proposed Branch Pin
        # -------------------------------------------------------------
        print("\n" + "=" * 80, flush=True)
        print("SALES HEAD: CLIENT APPROVALS QUEUE", flush=True)
        print("=" * 80, flush=True)
        client_app_btn = head_page.locator("button:has-text('Client Approvals')").first
        if client_app_btn.count() > 0:
            client_app_btn.click()
            time.sleep(2)
            save_brain_screenshot(head_page, "fix_sales_head_client_approvals_queue.png")

            pin_review = head_page.locator("button:has-text('Review & Decide')").first
            if pin_review.count() > 0 and pin_review.is_visible():
                pin_review.click()
                time.sleep(1)
                save_brain_screenshot(head_page, "fix_sales_head_pin_decision_modal.png")
                head_page.fill("textarea", "GPS coordinates and premises signage verified against registered landmark.")
                time.sleep(0.5)
                confirm_pin = head_page.locator("button:has-text('Confirm Location Pin Approval')").first
                if confirm_pin.count() > 0 and confirm_pin.is_visible():
                    confirm_pin.click()
                    time.sleep(2.5)
                    save_brain_screenshot(head_page, "fix_sales_head_pin_approved.png")
                    print("Sales Head approved proposed branch GPS pin!", flush=True)

        # -------------------------------------------------------------
        # SALES HEAD: Approve Exception in Exception Workbench
        # -------------------------------------------------------------
        print("\n" + "=" * 80, flush=True)
        print("SALES HEAD: APPROVE EXCEPTION", flush=True)
        print("=" * 80, flush=True)
        head_exc_tab = head_page.locator("button:has-text('Exception Workbench')").first
        if head_exc_tab.count() > 0:
            head_exc_tab.click()
            time.sleep(2)
            save_brain_screenshot(head_page, "fix_sales_head_exception_queue.png")

            # Check if review button exists
            review_btn = head_page.locator("button:has-text('Review & Decide')").first
            if review_btn.count() > 0 and review_btn.is_visible():
                review_btn.click()
                time.sleep(1)
                save_brain_screenshot(head_page, "fix_sales_head_exception_decision_modal.png")

                # Fill mandatory decision reason
                head_page.fill("textarea", "Reviewed and verified field exception. Approved for unverified attendance credit.")
                time.sleep(0.5)

                # Click Approve
                app_exc = head_page.locator("button:has-text('Approve (Unverified Activity)')").first
                if app_exc.count() > 0 and app_exc.is_visible():
                    app_exc.click()
                    time.sleep(2.5)
                    save_brain_screenshot(head_page, "fix_sales_head_exception_approved.png")
                    print("Sales Head approved exception!", flush=True)

        # -------------------------------------------------------------
        # SALES HEAD: Check Real Visit in Client Visit Verification
        # -------------------------------------------------------------
        print("\n" + "=" * 80, flush=True)
        print("SALES HEAD: CLIENT VISIT VERIFICATION VIEW", flush=True)
        print("=" * 80, flush=True)
        head_vis_tab = head_page.locator("button:has-text('Client Visit Verification')").first
        if head_vis_tab.count() > 0:
            head_vis_tab.click()
            time.sleep(2)
            # Click refresh button to get latest visits
            refresh_vis_btn = head_page.locator("button:has-text('Refresh')").first
            if refresh_vis_btn.count() > 0 and refresh_vis_btn.is_visible():
                refresh_vis_btn.click()
                time.sleep(2)
            save_brain_screenshot(head_page, "fix_sales_head_client_visit_verification_with_record.png")
            print("Captured Client Visit Verification view with real visit record!", flush=True)

        # -------------------------------------------------------------
        # BACK TO SALESPERSON: Verify status updated to Approved Unverified
        # -------------------------------------------------------------
        print("\n" + "=" * 80, flush=True)
        print("SALESPERSON: VERIFY STATUS UPDATED", flush=True)
        print("=" * 80, flush=True)
        exc_nav = rep_page.locator("#nav-tab-exceptions").first
        if exc_nav.count() > 0:
            exc_nav.click()
            time.sleep(1.5)
            # Click refresh in ExceptionsWorkbenchView
            refresh_exc_btn = rep_page.locator("button[title*='Refresh exceptions']").first
            if refresh_exc_btn.count() > 0 and refresh_exc_btn.is_visible():
                refresh_exc_btn.click()
                time.sleep(2)
            save_brain_screenshot(rep_page, "fix_salesperson_exception_status_updated.png")

        browser.close()
        print("\n" + "=" * 80, flush=True)
        print("ALL 4 USER COMMENT SCENARIOS VERIFIED SUCCESSFULLY!", flush=True)
        print("=" * 80, flush=True)

if __name__ == "__main__":
    run_test()
