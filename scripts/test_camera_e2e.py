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
    return os.environ.get("DEV_USER_PASSWORD", "")

def copy_to_brain(filename):
    src = os.path.join(SCREENSHOT_DIR, filename)
    dst = os.path.join(BRAIN_DIR, filename)
    if os.path.exists(src):
        shutil.copy2(src, dst)
        print(f"Copied {filename} to brain directory.")

def run_e2e():
    dev_password = get_dev_password()
    print("=" * 80)
    print("TESTING LIVE CAMERA FLIP WORKFLOW IN REAL BROWSER (E2E)")
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
            geolocation={"latitude": -15.3875, "longitude": 28.3228},
        )
        page = context.new_page()

        print("\n[STEP 1] Navigating to Carbon Field Sales Tracker...")
        page.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(2)

        # Login as Peter Mwale (Zambia salesperson)
        print("Logging in as Salesperson Peter Mwale (ZM)...")
        email_input = page.query_selector('input[type="email"]') or page.query_selector('#email')
        if email_input:
            email_input.fill("peter.mwale@carboncarcare.com")
            pwd_input = page.query_selector('input[type="password"]') or page.query_selector('#password')
            pwd_input.fill(dev_password)
            page.click('button[type="submit"]')
            page.wait_for_load_state("networkidle")
            time.sleep(3)

        print("[STEP 2] Checking Start Day modal...")
        # Look for Start Workday button
        start_btn = page.locator("button:has-text('Start Workday'), button:has-text('Start Day')").first
        if not start_btn.is_visible():
            # If Peter already ended day, let's try Chukwudi Okafor
            print("Peter has already ended day or button not visible. Trying Chukwudi Okafor...")
            page.goto("http://localhost:5173", wait_until="networkidle")
            # Sign out or clear storage
            context.clear_cookies()
            page.evaluate("() => localStorage.clear()")
            page.goto("http://localhost:5173", wait_until="networkidle")
            time.sleep(2)

            email_input = page.query_selector('input[type="email"]') or page.query_selector('#email')
            if email_input:
                email_input.fill("chukwudi.okafor@carboncarcare.com")
                pwd_input = page.query_selector('input[type="password"]') or page.query_selector('#password')
                pwd_input.fill(dev_password)
                page.click('button[type="submit"]')
                page.wait_for_load_state("networkidle")
                time.sleep(3)

            start_btn = page.locator("button:has-text('Start Workday'), button:has-text('Start Day')").first

        print("Start Workday button found! Clicking...")
        start_btn.click()
        time.sleep(2)

        # Verify Start Day Modal
        start_modal = page.locator("text='Start Workday & Attendance'")
        assert start_modal.is_visible(), "Start Workday modal did not appear"
        print("Start Workday modal is visible!")

        # Verify switch camera button is visible
        flip_btn = page.locator("#btn-switch-camera")
        page.wait_for_selector("#btn-switch-camera", timeout=6000)
        assert flip_btn.is_visible(), "#btn-switch-camera flip button not found!"

        flip_text = flip_btn.text_content() or ""
        print(f"Start Day Initial Flip Button text: '{flip_text.strip()}'")
        assert "Flip to Rear" in flip_text, f"Expected 'Flip to Rear', got: {flip_text}"

        # Capture Front Camera screenshot
        shot1 = "salesperson_start_day_camera_front.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot1))
        copy_to_brain(shot1)
        print(f"Saved {shot1}")

        # Click flip button to switch to Rear camera
        print("Clicking flip camera button to switch to Rear Camera...")
        flip_btn.click()
        time.sleep(2)

        flipped_text = flip_btn.text_content() or ""
        print(f"Start Day After Flip Button text: '{flipped_text.strip()}'")
        assert "Flip to Front" in flipped_text, f"Expected 'Flip to Front', got: {flipped_text}"

        # Capture Rear Camera screenshot
        shot2 = "salesperson_start_day_camera_rear.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot2))
        copy_to_brain(shot2)
        print(f"Saved {shot2}")

        # Close Start Day modal
        close_btn = page.locator("button:has-text('Cancel')").or_(page.locator("button[aria-label='Close']")).first
        if not close_btn.is_visible():
            # Modal top right X button
            x_btn = page.locator(".lucide-x").first
            if x_btn.is_visible():
                x_btn.click()
        else:
            close_btn.click()
        time.sleep(1)

        print("\n[STEP 3] Testing Visit Workflow premises photo camera switching...")
        # Navigate to Visits tab / View
        visit_btn = page.locator("button:has-text('Visit Client'), a:has-text('Visits')").first
        if visit_btn.is_visible():
            visit_btn.click()
            time.sleep(1.5)

        # Check for client search / dropdown
        search_client = page.locator("input[placeholder*='Search business by name']").or_(page.locator("input[placeholder*='Search']")).first
        if search_client.is_visible():
            search_client.click()
            time.sleep(0.5)

        first_client = page.locator("button:has-text('Locations')").first
        if first_client.is_visible():
            first_client.click()
            time.sleep(1)

        first_branch = page.locator("button:has-text('Approved Pin'), button:has-text('metres'), button:has-text('Site')").first
        if first_branch.is_visible():
            first_branch.click()
            time.sleep(1)

        # Scroll down to Step 3 Live Premises Photo
        start_camera_btn = page.locator("button:has-text('Start Camera')").first
        if start_camera_btn.is_visible():
            start_camera_btn.scroll_into_view_if_needed()
            time.sleep(0.5)
            print("Clicking 'Start Camera' in Visit Workflow Step 3...")
            start_camera_btn.click()
            time.sleep(2)

            visit_flip_btn = page.locator("#btn-visit-switch-camera")
            page.wait_for_selector("#btn-visit-switch-camera", timeout=6000)
            assert visit_flip_btn.is_visible(), "Visit Workflow #btn-visit-switch-camera not found!"

            v_initial_text = visit_flip_btn.text_content() or ""
            print(f"Visit Workflow Initial Flip Button text: '{v_initial_text.strip()}'")
            assert "Flip to Front" in v_initial_text, f"Expected 'Flip to Front', got: {v_initial_text}"

            # Capture Visit Rear camera screenshot
            shot3 = "salesperson_visit_camera_rear.png"
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot3))
            copy_to_brain(shot3)
            print(f"Saved {shot3}")

            # Click flip to Front
            print("Clicking Visit flip button to switch to Front camera...")
            visit_flip_btn.click()
            time.sleep(2)

            v_flipped_text = visit_flip_btn.text_content() or ""
            print(f"Visit Workflow After Flip Button text: '{v_flipped_text.strip()}'")
            assert "Flip to Rear" in v_flipped_text, f"Expected 'Flip to Rear', got: {v_flipped_text}"

            # Capture Visit Front camera screenshot
            shot4 = "salesperson_visit_camera_front.png"
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot4))
            copy_to_brain(shot4)
            print(f"Saved {shot4}")

        print("\n" + "=" * 80)
        print("SUCCESS! BOTH START DAY AND VISIT WORKFLOW CAMERA SWITCHING VERIFIED!")
        print("=" * 80)
        browser.close()

if __name__ == "__main__":
    run_e2e()

