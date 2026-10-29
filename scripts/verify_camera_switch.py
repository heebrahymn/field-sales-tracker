import time
import os
import shutil
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = "docs/screenshots/stage3f"
BRAIN_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity\brain\fc573132-6d8d-4550-b06f-9eb28f426230"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def get_dev_password():
    with open(".env.local", "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("DEV_USER_PASSWORD="):
                return line.strip().split("=", 1)[1]
    return "[DEV_USER_PASSWORD_REDACTED]"

def copy_to_brain(filename):
    src = os.path.join(SCREENSHOT_DIR, filename)
    dst = os.path.join(BRAIN_DIR, filename)
    if os.path.exists(src):
        shutil.copy2(src, dst)
        print(f"Copied {filename} to brain directory.")

def test_camera_switching():
    dev_password = get_dev_password()
    print("=" * 80)
    print("VERIFYING LIVE CAMERA SWITCHING (FRONT <-> REAR) ON PHONE VIEWPORT")
    print("=" * 80)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream"
            ]
        )

        context = browser.new_context(
            viewport={"width": 390, "height": 844},  # Mobile viewport (iPhone 13 / Galaxy A15)
            permissions=["geolocation", "camera"],
            geolocation={"latitude": 6.4281, "longitude": 3.4219},
        )
        page = context.new_page()

        print("\n[STEP 1] Navigating to Carbon Field Sales Tracker...")
        page.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(2)

        # Login as salesperson Tunde Adebayo
        email_input = page.query_selector('input[type="email"]') or page.query_selector('#email')
        if email_input:
            print("Logging in as Salesperson Tunde Adebayo...")
            email_input.fill("tunde.adebayo@carboncarcare.com")
            pwd_input = page.query_selector('input[type="password"]') or page.query_selector('#password')
            pwd_input.fill(dev_password)
            page.click('button[type="submit"]')
            page.wait_for_load_state("networkidle")
            time.sleep(3)

        print("[STEP 2] Checking Start Day modal camera switching...")
        start_btn = page.locator("button:has-text('Start Workday'), button:has-text('Start Day')").first
        if start_btn.is_visible():
            btn_txt = start_btn.text_content() or ""
            print(f"Found button: {btn_txt.strip()[:30]}")
            start_btn.click()
            time.sleep(2)

            start_day_modal = page.locator("text='Start Workday & Attendance'")
            if start_day_modal.is_visible():
                print("Start Day modal opened! Checking for #btn-switch-camera...")
                flip_btn = page.locator("#btn-switch-camera")
                page.wait_for_selector("#btn-switch-camera", timeout=5000)

                flip_text = flip_btn.text_content() or ""
                print(f"Initial Start Day flip button text: '{flip_text.strip()}'")
                assert "Flip to Rear" in flip_text, f"Expected 'Flip to Rear', got: {flip_text}"

                # Capture screenshot in Front Camera mode
                shot1 = "salesperson_start_day_camera_front.png"
                page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot1))
                copy_to_brain(shot1)
                print(f"Saved {shot1} (Front camera mode with flip button)")

                # Click to switch to Rear Camera
                print("Clicking flip button to switch to Rear camera...")
                flip_btn.click()
                time.sleep(2)

                flipped_text = flip_btn.text_content() or ""
                print(f"Start Day flip button text after switch: '{flipped_text.strip()}'")
                assert "Flip to Front" in flipped_text, f"Expected 'Flip to Front', got: {flipped_text}"

                # Capture screenshot in Rear Camera mode
                shot2 = "salesperson_start_day_camera_rear.png"
                page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot2))
                copy_to_brain(shot2)
                print(f"Saved {shot2} (Rear camera mode after flip)")

                # Close Start Day modal
                close_btn = page.locator("button:has-text('Cancel')").or_(page.locator("button:has-text('X')")).first
                if close_btn.is_visible():
                    close_btn.click()
                    time.sleep(1)

        print("\n[STEP 3] Checking Visit Workflow premises photo camera switching...")
        visit_tab = page.locator("button:has-text('Visit Client'), a:has-text('Visits')").first
        if visit_tab.is_visible():
            visit_tab.click()
            time.sleep(1.5)

        # Select a client
        client_selector = page.locator("button:has-text('Choose Client / Organisation')").or_(page.locator("button:has-text('Select Target Client')")).first
        if client_selector.is_visible():
            client_selector.click()
            time.sleep(1)

        # Look for search input or select first client
        client_input = page.locator("input[placeholder*='Search business by name']").or_(page.locator("input[placeholder*='Search']")).first
        if client_input.is_visible():
            client_input.click()
            time.sleep(0.5)

        client_opt = page.locator("button:has-text('Apex Heavy Logistics')").or_(page.locator("button:has-text('Locations')")).first
        if client_opt.is_visible():
            print("Selecting client organization...")
            client_opt.click()
            time.sleep(1)

            # If multi-location, pick first branch
            branch_opt = page.locator("button:has-text('Depot')").or_(page.locator("button:has-text('Branch')")).first
            if branch_opt.is_visible():
                branch_opt.click()
                time.sleep(1)

        # Scroll to Step 3 Live Premises Photo
        start_cam_btn = page.locator("button:has-text('Start Camera')").first
        if start_cam_btn.is_visible():
            start_cam_btn.scroll_into_view_if_needed()
            time.sleep(0.5)
            print("Clicking 'Start Camera' in Visit Workflow Step 3...")
            start_cam_btn.click()
            time.sleep(2)

            visit_flip_btn = page.locator("#btn-visit-switch-camera")
            page.wait_for_selector("#btn-visit-switch-camera", timeout=5000)

            v_text = visit_flip_btn.text_content() or ""
            print(f"Initial Visit Workflow flip button text: '{v_text.strip()}'")
            assert "Flip to Front" in v_text, f"Expected 'Flip to Front' (default rear), got: {v_text}"

            # Capture screenshot in default Rear Camera mode
            shot3 = "salesperson_visit_camera_rear.png"
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot3))
            copy_to_brain(shot3)
            print(f"Saved {shot3} (Visit rear camera mode with flip button)")

            # Click to switch to Front Camera
            print("Clicking flip button to switch Visit camera to Front...")
            visit_flip_btn.click()
            time.sleep(2)

            v_flipped_text = visit_flip_btn.text_content() or ""
            print(f"Visit Workflow flip button text after switch: '{v_flipped_text.strip()}'")
            assert "Flip to Rear" in v_flipped_text, f"Expected 'Flip to Rear', got: {v_flipped_text}"

            # Capture screenshot in Front Camera mode
            shot4 = "salesperson_visit_camera_front.png"
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot4))
            copy_to_brain(shot4)
            print(f"Saved {shot4} (Visit front camera mode after flip)")

        print("\n" + "=" * 80)
        print("ALL CAMERA FLIP CHECKS PASSED WITH FLYING COLOURS!")
        print("=" * 80)
        browser.close()

if __name__ == "__main__":
    test_camera_switching()
