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
    print("VERIFYING VISIT WORKFLOW LIVE PREMISES CAMERA FLIP (REAR <-> FRONT)")
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

        print("[STEP 2] Signing in as Field Salesperson Tunde Adebayo...")
        page.fill('input[type="email"]', "tunde.adebayo@carboncarcare.com")
        page.fill('input[type="password"]', os.environ.get("DEV_USER_PASSWORD", ""))
        page.click('button[type="submit"]')
        page.wait_for_load_state("networkidle")
        time.sleep(3)

        print("[STEP 3] Navigating to Visit Client view...")
        visit_tile = page.locator("button:has-text('Visit Client Check-in & photo')").or_(page.locator("button:has-text('Start Client Visit')")).or_(page.locator("button:has-text('Visit Client')")).first
        visit_tile.click()
        time.sleep(2)

        print("[STEP 4] Selecting Client & Branch in Step 1...")
        # Focus/click search input to trigger dropdown
        search_input = page.locator("input[placeholder*='Search business by name']").first
        search_input.click()
        time.sleep(1)

        first_client = page.locator("button:has-text('Location')").first
        first_client.click()
        time.sleep(1.5)

        # Check for branch selection buttons under "Select Location / Branch"
        branch_btn = page.locator("button:has-text('Approved'), button:has-text('Pending Pin'), button:has-text('Depot'), button:has-text('Main')").first
        if branch_btn.is_visible():
            print("Selecting specific branch location...")
            branch_btn.click()
            time.sleep(1.5)

        # Take screenshot of selected branch state
        page.screenshot(path="docs/screenshots/stage3f/visit_step1_selected.png")

        print("[STEP 5] Starting Live Viewfinder in Step 3 Live Premises Photo...")
        # Find Start Camera button
        start_camera_btn = page.locator("button:has-text('Start Camera')").first
        page.wait_for_selector("button:has-text('Start Camera')", timeout=10000)
        start_camera_btn.scroll_into_view_if_needed()
        time.sleep(0.5)
        start_camera_btn.click()
        time.sleep(2.5)

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
        time.sleep(2.5)

        v_flipped_text = v_flip_btn.text_content() or ""
        print(f"  [OK] Visit Camera Mode after flip: '{v_flipped_text.strip()}' (Front camera active)")
        assert "Flip to Rear" in v_flipped_text, f"Expected 'Flip to Rear', got: {v_flipped_text}"

        # Capture Visit Front camera screenshot
        shot4 = "salesperson_visit_camera_front.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot4))
        copy_to_brain(shot4)

        # Flip back to Rear
        print("  -> Toggling Visit camera back to Rear...")
        v_flip_btn.click()
        time.sleep(2)

        # Capture photo frame
        capture_frame_btn = page.locator("button:has-text('Capture Photo Frame')")
        capture_frame_btn.click()
        time.sleep(1.5)

        # Verify photo captured
        page.wait_for_selector("text='Live Premises Photo Captured'", timeout=5000)
        print("  [OK] Premises photo frame captured and verified!")

        # Take screenshot of captured state
        shot5 = "salesperson_visit_photo_captured.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot5))
        copy_to_brain(shot5)

        print("\n" + "=" * 80)
        print("VISIT CAMERA FLIP & CAPTURE SUCCEEDED!")
        print("=" * 80)

        browser.close()

if __name__ == "__main__":
    main()
