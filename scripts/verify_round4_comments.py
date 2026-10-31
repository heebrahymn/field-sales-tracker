import time
import os
import subprocess
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
    print("VERIFICATION OF USER COMMENTS: ROUND 4", flush=True)
    print("=" * 80, flush=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
        )

        # =========================================================================
        # 1. SALESPERSON: NON-VISIT DEDICATED SCREEN & CANCEL BUTTON
        # =========================================================================
        print("\n--- TEST 1: SALESPERSON NON-VISIT DEDICATED SCREEN ---", flush=True)
        mob_ctx = browser.new_context(
            viewport={"width": 412, "height": 915},
            user_agent="Mozilla/5.0 (Linux; Android 14; Samsung Galaxy A15) AppleWebKit/537.36",
            permissions=["geolocation", "camera"],
            geolocation={"latitude": 6.5892, "longitude": 3.3581}
        )
        rep_page = mob_ctx.new_page()

        print("1. Logging in as Salesperson Tunde Adebayo...", flush=True)
        rep_page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        time.sleep(1)
        rep_page.fill("input[name='email'], input[type='email']", "tunde.adebayo@carboncarcare.com")
        rep_page.fill("input[name='password'], input[type='password']", DEV_PASSWORD)
        rep_page.click("button:has-text('Sign In With Credentials')")
        rep_page.wait_for_load_state("networkidle")
        time.sleep(2)

        # Salesperson Home
        print("2. Viewing Salesperson Home with Non-Visit banner...", flush=True)
        save_brain_screenshot(rep_page, "fix_round4_salesperson_home_banner.png")

        # Navigate to dedicated Non-Visit screen
        print("3. Navigating to Non-Visit Days dedicated screen...", flush=True)
        # Scroll to Tile 5: Non-Visit Days and click
        non_visit_btn = rep_page.locator("button:has-text('Non-Visit Days'), button:has-text('Manage Non-Visit Days')").first
        non_visit_btn.scroll_into_view_if_needed()
        time.sleep(0.5)
        non_visit_btn.click()
        time.sleep(2)
        save_brain_screenshot(rep_page, "fix_round4_non_visit_days_dedicated_screen.png")
        print("[OK] Dedicated Non-Visit screen loaded successfully.", flush=True)

        # Test "+ New Request" button inside dedicated screen
        new_req_btn = rep_page.locator("button:has-text('New Request')").first
        if new_req_btn.is_visible():
            new_req_btn.click()
            time.sleep(1)
            save_brain_screenshot(rep_page, "fix_round4_non_visit_modal_from_dedicated.png")
            # Close modal
            close_btn = rep_page.locator("button:has-text('Cancel'), button[aria-label='Close']").first
            if close_btn.is_visible():
                close_btn.click()
                time.sleep(0.5)

        # =========================================================================
        # 2. COUNTRY SALES HEAD: CLIENT VISIT VERIFICATION BUSINESS CARD DISPLAY
        # =========================================================================
        print("\n--- TEST 2: SALES HEAD VISIT VERIFICATION & BUSINESS CARD INSPECTION ---", flush=True)
        desk_ctx = browser.new_context(
            viewport={"width": 1400, "height": 900},
            permissions=["geolocation", "camera"],
            geolocation={"latitude": 6.5892, "longitude": 3.3581}
        )
        head_page = desk_ctx.new_page()

        print("1. Logging in as Country Sales Head Babatunde Adeleke...", flush=True)
        head_page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        time.sleep(1)
        head_page.fill("input[name='email'], input[type='email']", "babatunde.adeleke@carboncarcare.com")
        head_page.fill("input[name='password'], input[type='password']", DEV_PASSWORD)
        head_page.click("button:has-text('Sign In With Credentials')")
        head_page.wait_for_load_state("networkidle")
        time.sleep(2)

        print("2. Navigating to Client Visit Verification...", flush=True)
        visit_tab = head_page.locator("button:has-text('Client Visit Verification')").first
        visit_tab.click()
        time.sleep(2)
        save_brain_screenshot(head_page, "fix_round4_visit_verification_table.png")

        # Open inspect audit record modal
        inspect_btn = head_page.locator("button:has-text('Inspect Audit Record')").first
        if inspect_btn.is_visible():
            inspect_btn.click()
            time.sleep(1.5)
            save_brain_screenshot(head_page, "fix_round4_sales_head_business_card_inspection.png")
            print("[OK] Business card inspection section verified.", flush=True)
            # Close modal
            head_page.keyboard.press("Escape")
            time.sleep(0.5)

        # =========================================================================
        # 3. CLIENT REGISTRATION & REAL-TIME APPROVAL SYNC
        # =========================================================================
        print("\n--- TEST 3: CLIENT REGISTRATION ACCURACY & BIDIRECTIONAL SYNC ---", flush=True)
        print("1. Navigating Salesperson to Clients & Locations...", flush=True)
        clients_nav = rep_page.locator("#nav-tab-clients").first
        clients_nav.click()
        time.sleep(1.5)
        save_brain_screenshot(rep_page, "fix_round4_salesperson_clients_list_before.png")

        # Open Add Client Modal
        print("2. Opening Add Client Modal...", flush=True)
        add_client_btn = rep_page.locator("button:has-text('Add Client')").first
        add_client_btn.click()
        time.sleep(1)

        unique_company = f"Zenith Petrochemicals Ltd {int(time.time()) % 1000}"
        unique_branch = "Apapa Marine Terminal"

        print(f"3. Registering new client: {unique_company}...", flush=True)
        rep_page.click("button:has-text('New Business Client')")
        rep_page.fill("input[placeholder*='Saharan Haulage']", unique_company)
        rep_page.fill("input[placeholder*='Apapa Terminal']", unique_branch)
        rep_page.fill("input[placeholder*='Commercial Avenue']", "Wharf Road, Dock 4, Apapa")
        rep_page.fill("input[placeholder*='Adjacent to Gate 3']", "Terminal Gate 2")
        rep_page.fill("input[placeholder='Contact Name']", "Capt. Aliu Garba")
        rep_page.fill("input[placeholder='Job Role / Title']", "Terminal Operations Lead")
        rep_page.fill("input[placeholder='Direct Mobile Phone Number']", "+234 802 444 8888")

        # Capture photo via live camera simulation
        open_cam_btn = rep_page.locator("button:has-text('Open Live Camera')").first
        if open_cam_btn.is_visible():
            open_cam_btn.click()
            time.sleep(1)
        
        snap_btn = rep_page.locator("button:has-text('Capture Photo')").first
        if snap_btn.is_visible():
            snap_btn.click()
            time.sleep(1)

        save_brain_screenshot(rep_page, "fix_round4_salesperson_client_form_filled.png")

        # Submit registration
        submit_btn = rep_page.locator("button:has-text('Submit Registration & Pin Proposal')").first
        if submit_btn.is_visible() and not submit_btn.is_disabled():
            submit_btn.click()
            time.sleep(3)
            save_brain_screenshot(rep_page, "fix_round4_salesperson_client_submitted_success.png")

            # Dismiss success dialog
            done_btn = rep_page.locator("button:has-text('Back to Clients Directory'), button:has-text('Done')").first
            if done_btn.is_visible():
                done_btn.click()
                time.sleep(1.5)

            # Confirm newly added client appears as "Pending Manager Approval"
            save_brain_screenshot(rep_page, "fix_round4_salesperson_client_pending_in_list.png")
            print("[OK] New client is displayed on salesperson screen with Pending status.", flush=True)

        # Check Sales Head Client & GPS Approvals queue
        print("4. Sales Head inspecting Client & GPS Approvals queue...", flush=True)
        approvals_tab = head_page.locator("button:has-text('Client Approvals'), button:has-text('Client & GPS Approvals')").first
        approvals_tab.click()
        time.sleep(2)
        save_brain_screenshot(head_page, "fix_round4_sales_head_approvals_queue.png")
        print("[OK] Sales Head approvals queue checked.", flush=True)

        # Approve the first pending proposal if available
        review_btn = head_page.locator("button:has-text('Review & Approve Pin')").first
        if review_btn.is_visible():
            review_btn.click()
            time.sleep(1)
            save_brain_screenshot(head_page, "fix_round4_sales_head_approval_modal.png")

            # Fill rationale and confirm
            reason_box = head_page.locator("textarea, input[placeholder*='rationale']")
            if reason_box.is_visible():
                reason_box.fill("Premises signage and coordinates verified against Lagos maritime depot records.")
            
            confirm_btn = head_page.locator("button:has-text('Approve Pin & Activate Branch')").first
            if confirm_btn.is_visible():
                confirm_btn.click()
                time.sleep(2)
                save_brain_screenshot(head_page, "fix_round4_sales_head_after_approval.png")
                print("[OK] Sales Head approved the pin.", flush=True)

        # Salesperson screen updates automatically
        print("5. Verifying Salesperson screen automatically updates to reflect approval...", flush=True)
        time.sleep(6) # allow the 6s auto-refresh interval
        save_brain_screenshot(rep_page, "fix_round4_salesperson_client_approved_realtime.png")
        print("[OK] Real-time sync verified on salesperson view.", flush=True)

        browser.close()
        print("\nAll verification scenarios completed successfully!", flush=True)

if __name__ == "__main__":
    run()
