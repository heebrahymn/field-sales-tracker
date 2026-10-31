import time
import os
import shutil
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = "docs/screenshots/stage3f"
BRAIN_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity\brain\fc573132-6d8d-4550-b06f-9eb28f426230"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def copy_to_brain(filename):
    src = os.path.join(SCREENSHOT_DIR, filename)
    dst = os.path.join(BRAIN_DIR, filename)
    if os.path.exists(src):
        shutil.copy2(src, dst)
        print(f"[COPY] Copied {filename} to brain directory.")

def main():
    print("=" * 80)
    print("E2E VERIFICATION: CAMERA SWITCHING (FRONT <-> REAR) ON FIELD PWA")
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
            viewport={"width": 390, "height": 844},
            permissions=["geolocation", "camera"],
            geolocation={"latitude": 6.4281, "longitude": 3.4219},
        )
        page = context.new_page()

        print("\n[STEP 1] Navigating to http://localhost:5173...")
        page.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(2)

        # Clear any prior storage/session to ensure clean fresh login
        page.evaluate("() => localStorage.clear()")
        page.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(2)

        print("[STEP 2] Signing in as Field Salesperson Tunde Adebayo...")
        page.fill('input[type="email"]', "tunde.adebayo@carboncarcare.com")
        page.fill('input[type="password"]', os.environ.get("DEV_USER_PASSWORD", ""))
        page.click('button[type="submit"]')
        page.wait_for_load_state("networkidle")
        time.sleep(3)

        print("[STEP 3] Verifying Start Day Attendance Camera Flipping...")
        start_btn = page.locator("button:has-text('Start Workday'), button:has-text('Start Day')").first
        page.wait_for_selector("button:has-text('Start Workday'), button:has-text('Start Day')", timeout=10000)
        start_btn.click()
        time.sleep(2)

        page.wait_for_selector("text='Start Workday & Attendance'", timeout=5000)
        print("  [OK] Start Workday Modal opened.")

        # Check camera flip button
        flip_btn = page.locator("#btn-switch-camera")
        page.wait_for_selector("#btn-switch-camera", timeout=6000)
        assert flip_btn.is_visible(), "Start Day camera flip button #btn-switch-camera not found!"
        
        initial_text = flip_btn.text_content() or ""
        print(f"  [OK] Initial Start Day Camera Mode: '{initial_text.strip()}' (Front camera default)")
        assert "Flip to Rear" in initial_text, f"Expected 'Flip to Rear', got: {initial_text}"

        # Capture Front Camera screenshot
        shot1 = "salesperson_start_day_camera_front.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot1))
        copy_to_brain(shot1)

        # Flip to Rear Camera
        print("  -> Toggling to Rear Camera...")
        flip_btn.click()
        time.sleep(2)

        flipped_text = flip_btn.text_content() or ""
        print(f"  [OK] Start Day Camera Mode after flip: '{flipped_text.strip()}' (Rear camera active)")
        assert "Flip to Front" in flipped_text, f"Expected 'Flip to Front', got: {flipped_text}"

        # Capture Rear Camera screenshot
        shot2 = "salesperson_start_day_camera_rear.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot2))
        copy_to_brain(shot2)

        # Flip back to Front Camera for realistic selfie attendance
        print("  -> Toggling back to Front Camera...")
        flip_btn.click()
        time.sleep(1.5)

        # Capture live photo
        capture_btn = page.locator("button:has-text('Capture Live Photo')")
        capture_btn.click()
        time.sleep(1)

        # Submit Start Day
        confirm_btn = page.locator("button:has-text('Confirm & Start Workday')")
        confirm_btn.click()
        time.sleep(2.5)

        # Acknowledge success
        ack_btn = page.locator("button:has-text('Acknowledge & Proceed to Field Operations')")
        page.wait_for_selector("button:has-text('Acknowledge & Proceed to Field Operations')", timeout=8000)
        ack_btn.click()
        time.sleep(2)
        print("  [OK] Workday started successfully. Ready for field operations.")

        print("\n[STEP 4] Verifying Visit Workflow Premises Photo Camera Flipping...")
        visit_tile = page.locator("button:has-text('Visit Client Check-in & photo')").or_(page.locator("button:has-text('Start Client Visit')")).first
        visit_tile.click()
        time.sleep(2)

        # Choose client organization
        client_selector = page.locator("button:has-text('Choose Client / Organisation')").or_(page.locator("button:has-text('Select Target Client')")).first
        if client_selector.is_visible():
            client_selector.click()
            time.sleep(1)

        first_client = page.locator("button:has-text('Locations')").first
        first_client.click()
        time.sleep(1)

        first_branch = page.locator("button:has-text('Approved Pin'), button:has-text('Depot'), button:has-text('Site')").first
        if first_branch.is_visible():
            first_branch.click()
            time.sleep(1)

        # Scroll to Step 3 Live Premises Photo
        start_camera_btn = page.locator("button:has-text('Start Camera')").first
        start_camera_btn.scroll_into_view_if_needed()
        time.sleep(0.5)
        print("  -> Clicking 'Start Camera' in Step 3 Live Premises Photo...")
        start_camera_btn.click()
        time.sleep(2)

        # Verify Visit flip button
        v_flip_btn = page.locator("#btn-visit-switch-camera")
        page.wait_for_selector("#btn-visit-switch-camera", timeout=6000)
        assert v_flip_btn.is_visible(), "Visit Workflow #btn-visit-switch-camera not found!"

        v_initial_text = v_flip_btn.text_content() or ""
        print(f"  [OK] Initial Visit Camera Mode: '{v_initial_text.strip()}' (Rear camera default)")
        assert "Flip to Front" in v_initial_text, f"Expected 'Flip to Front', got: {v_initial_text}"

        # Capture Visit Rear camera screenshot
        shot3 = "salesperson_visit_camera_rear.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot3))
        copy_to_brain(shot3)

        # Flip Visit Camera to Front
        print("  -> Toggling Visit camera to Front...")
        v_flip_btn.click()
        time.sleep(2)

        v_flipped_text = v_flip_btn.text_content() or ""
        print(f"  [OK] Visit Camera Mode after flip: '{v_flipped_text.strip()}' (Front camera active)")
        assert "Flip to Rear" in v_flipped_text, f"Expected 'Flip to Rear', got: {v_flipped_text}"

        # Capture Visit Front camera screenshot
        shot4 = "salesperson_visit_camera_front.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot4))
        copy_to_brain(shot4)

        # Capture photo frame
        capture_frame_btn = page.locator("button:has-text('Capture Photo Frame')")
        capture_frame_btn.click()
        time.sleep(1.5)

        # Verify photo captured
        page.wait_for_selector("text='Live Premises Photo Captured'", timeout=5000)
        print("  [OK] Premises photo frame captured and verified!")

        print("\n" + "=" * 80)
        print("ALL CAMERA FLIP VERIFICATIONS COMPLETED AND SCREENSHOTS CAPTURED!")
        print("=" * 80)

        browser.close()

if __name__ == "__main__":
    main()
