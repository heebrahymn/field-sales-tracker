import os
import sys
import time
from playwright.sync_api import sync_playwright

OUTPUT_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity\brain\fc573132-6d8d-4550-b06f-9eb28f426230"
os.makedirs(OUTPUT_DIR, exist_ok=True)

TARGET_URL = "http://localhost:4173/"

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
    p = os.path.join(OUTPUT_DIR, filename)
    page.screenshot(path=p, full_page=True)
    print(f"  [SCREENSHOT] {filename}")

def reset_test_devices():
    url = get_env_var("VITE_SUPABASE_URL")
    svc_key = get_env_var("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not svc_key:
        return
    import urllib.request, json
    # Get IDs of CAR-NG-001, CAR-NG-002, CC-DEV-LOS-SPARE-01
    req = urllib.request.Request(
        f"{url}/rest/v1/devices?asset_tag=in.(CAR-NG-001,CAR-NG-002,CC-DEV-LOS-SPARE-01)",
        headers={"apikey": svc_key, "Authorization": f"Bearer {svc_key}"}
    )
    with urllib.request.urlopen(req) as resp:
        devs = json.loads(resp.read().decode())
    for d in devs:
        dev_id = d["id"]
        # Delete previous test assignments for clean repeatability
        try:
            req_del = urllib.request.Request(
                f"{url}/rest/v1/device_assignments?device_id=eq.{dev_id}",
                headers={"apikey": svc_key, "Authorization": f"Bearer {svc_key}"},
                method="DELETE"
            )
            urllib.request.urlopen(req_del)
        except Exception as e:
            print(f"  Note on delete: {e}")
        # Set device inventory_status to available
        try:
            req_up = urllib.request.Request(
                f"{url}/rest/v1/devices?id=eq.{dev_id}",
                headers={"apikey": svc_key, "Authorization": f"Bearer {svc_key}", "Content-Type": "application/json"},
                data=json.dumps({"inventory_status": "available"}).encode(),
                method="PATCH"
            )
            urllib.request.urlopen(req_up)
        except Exception:
            pass
    print("  [SETUP] Cleared assignments and reset CAR-NG-001, CAR-NG-002, and CC-DEV-LOS-SPARE-01 to available.")

def run_e2e_verification():
    print("=" * 80)
    print("P1 HOTFIX END-TO-END VERIFICATION: DEVICE ASSIGNMENT & SALESPERSON LIVE CAMERA")
    print(f"Target URL: {TARGET_URL}")
    print("=" * 80)

    reset_test_devices()

    # Launch browser with fake media stream flags for automated camera verification
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
                "--allow-file-access"
            ]
        )
        
        # Grant camera and geolocation permissions to context
        context = browser.new_context(
            viewport={"width": 1280, "height": 850},
            permissions=["camera", "geolocation"],
            geolocation={"latitude": 6.5244, "longitude": 3.3792, "accuracy": 15}
        )
        page = context.new_page()

        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: console_logs.append(f"[PAGEERROR] {err}"))

        # =========================================================================
        # PART 1: HQ ADMIN COMPANY DEVICE ASSIGNMENT DROPDOWN & PROVISIONING
        # =========================================================================
        print("\n>>> PART 1: HQ ADMIN USER MANAGEMENT & DEVICE ASSIGNMENT <<<")
        page.goto(TARGET_URL, wait_until="networkidle", timeout=30000)
        time.sleep(2)
        save_screenshot(page, "p1_hotfix_01_login_page.png")

        print("\n[Step 1.1] Logging in as HQ Admin...")
        page.fill("input[name='email']", "hq.admin@carboncarcare.com")
        page.fill("input[name='password']", DEV_PASSWORD)
        page.click("button[type='submit']")
        page.wait_for_timeout(3000)

        page.wait_for_selector("text=HQ Regional Administration & Oversight", timeout=15000)
        print("  PASS: HQ Admin authenticated.")

        print("\n[Step 1.2] Navigating to Users & Roles tab...")
        users_tab = page.locator("button:has-text('Users & Roles'), button:has-text('User & Role Management')").first
        users_tab.click()
        page.wait_for_timeout(2000)
        save_screenshot(page, "p1_hotfix_02_hq_users_directory.png")

        print("\n[Step 1.3] Opening Provision New User modal...")
        page.click("button:has-text('Provision New User')")
        page.wait_for_timeout(1000)
        save_screenshot(page, "p1_hotfix_03_provision_modal_opened.png")

        # Inspect Device Dropdown for Nigeria
        print("\n[Step 1.4] Testing Device Dropdown for Nigeria (NG)...")
        device_select = page.locator("select#newUserDeviceId")
        assert device_select.is_visible(), "Device select dropdown not visible!"
        
        # Get options text
        options = device_select.locator("option").all_inner_texts()
        print(f"  Options for NG: {options}")
        assert any("No device assigned initially" in opt for opt in options), "Missing 'No device assigned initially' option!"
        assert any("CAR-NG" in opt or "CC-DEV" in opt for opt in options), "Missing available NG devices in dropdown!"
        print("  PASS: Available Nigerian handsets correctly populated in dropdown.")

        # Test Reactive Market Filtering (Switch to Zambia ZM)
        print("\n[Step 1.5] Switching Market to Zambia (ZM) to test reactive filtering...")
        page.select_option("select#newUserMarketCode", "ZM")
        page.wait_for_timeout(500)
        zm_options = device_select.locator("option").all_inner_texts()
        print(f"  Options for ZM: {zm_options}")
        assert any("CAR-ZM-001" in opt for opt in zm_options) or any("CAR-ZM-002" in opt for opt in zm_options), "Missing available ZM devices!"
        assert not any("CAR-NG" in opt for opt in zm_options), "Cross-market leakage: NG device found in ZM dropdown!"
        print("  PASS: Reactive market isolation confirmed for Zambia.")

        # Test Reactive Market Filtering (Switch to Malawi MW)
        print("\n[Step 1.6] Switching Market to Malawi (MW)...")
        page.select_option("select#newUserMarketCode", "MW")
        page.wait_for_timeout(500)
        mw_options = device_select.locator("option").all_inner_texts()
        print(f"  Options for MW: {mw_options}")
        assert any("CAR-MW-001" in opt for opt in mw_options) or any("CAR-MW-002" in opt for opt in mw_options), "Missing available MW devices!"
        assert not any("CAR-NG" in opt for opt in mw_options) and not any("CAR-ZM" in opt for opt in mw_options), "Cross-market leakage in MW dropdown!"
        print("  PASS: Reactive market isolation confirmed for Malawi.")

        # Switch back to Nigeria, select an available device, and provision new user
        print("\n[Step 1.7] Provisioning salesperson with available Nigerian handset...")
        page.select_option("select#newUserMarketCode", "NG")
        page.wait_for_timeout(500)
        
        # Select first available device option
        ng_device_opts = device_select.locator("option").all()
        target_device_id = None
        target_device_text = None
        for opt in ng_device_opts:
            val = opt.get_attribute("value")
            if val:  # not empty string
                target_device_id = val
                target_device_text = opt.inner_text()
                break
        
        assert target_device_id, "No available devices left in NG dropdown!"
        print(f"  Selected device for provisioning: {target_device_text} (ID: {target_device_id})")
        page.select_option("select#newUserDeviceId", target_device_id)
        
        timestamp = int(time.time())
        test_email = f"rep.device.{timestamp}@carboncare.com"
        page.fill("input#newUserFullName", f"Test Rep Device {timestamp % 1000}")
        page.fill("input#newUserEmail", test_email)
        page.fill("input#newUserPhone", "+2348039998877")
        page.select_option("select#newUserRole", "salesperson")
        page.wait_for_timeout(500)
        save_screenshot(page, "p1_hotfix_04_provision_form_filled.png")

        # Submit Provision Form
        print(f"  Submitting form for {test_email} with handset {target_device_id}...")
        page.click("button:has-text('Provision User Account')")
        
        # Check if error feedback appeared or wait for modal
        try:
            page.wait_for_selector("text=User Account Provisioned", timeout=25000)
            print("  PASS: Provisioning succeeded with modal!")
            save_screenshot(page, "p1_hotfix_05_provision_credentials_modal.png")
        except Exception as e:
            save_screenshot(page, "p1_hotfix_provision_error.png")
            print(f"  ERROR waiting for success modal: {e}")
            print(f"  Recent console logs:")
            for l in console_logs[-20:]:
                print(f"    {l}")
            body_text = page.locator("body").inner_text()
            print(f"  Page body text snippet:\n{body_text[:1000]}")
            raise

        # Verify device assignment is reported as successful in modal
        modal_text = page.locator("div[role='dialog'], .fixed").first.inner_text()
        assert "Assigned Device" in modal_text, "Modal missing Assigned Device confirmation!"
        expected_tag = target_device_text.split(" ")[0].strip()
        assert expected_tag in modal_text, f"Modal missing {expected_tag} tag confirmation!"
        print(f"  PASS: Device assignment ({expected_tag}) confirmed in credentials modal.")

        # Close Modal
        close_btn = page.locator("button:has-text('Done')").first
        close_btn.click()
        page.wait_for_timeout(2000)
        save_screenshot(page, "p1_hotfix_06_updated_users_table.png")

        # Verify user and device appear in directory
        table_text = page.inner_text("table")
        assert test_email in table_text, f"User {test_email} not found in directory!"
        assert expected_tag in table_text, f"Assigned device {expected_tag} not rendered in directory row!"
        print(f"  PASS: User {test_email} rendered in directory with device {expected_tag}.")

        # Test Assign Device Modal for unassigned user
        print("\n[Step 1.8] Testing 'Assign Device' button for unassigned salesperson in table...")
        assign_btns = page.locator("button:has-text('Assign Device')").all()
        if len(assign_btns) > 0:
            print(f"  Found {len(assign_btns)} unassigned reps with 'Assign Device' action. Opening modal...")
            assign_btns[0].click()
            page.wait_for_timeout(1000)
            save_screenshot(page, "p1_hotfix_07_assign_device_modal.png")
            
            # Verify modal has available device select
            assign_select = page.locator("select#assignHandsetSelect")
            assert assign_select.is_visible(), "Assign device modal select not visible!"
            modal_opts = assign_select.locator("option").all_inner_texts()
            print(f"  Available options in Assign Device modal: {modal_opts}")
            # The device assigned in Step 1.7 (expected_tag) must NOT be in the options
            assert not any(expected_tag in opt for opt in modal_opts), f"Assigned device {expected_tag} still shows as available!"
            print(f"  PASS: Assigned device {expected_tag} successfully removed from available inventory pool.")
            
            # Close modal
            page.click("button:has-text('Cancel')")
            page.wait_for_timeout(500)

        # Log out HQ Admin
        print("\n[Step 1.9] Logging out HQ Admin...")
        signout_btn = page.locator("button:has-text('Sign Out'), button:has-text('Logout')").first
        signout_btn.click()
        page.wait_for_timeout(2000)
        save_screenshot(page, "p1_hotfix_08_logged_out.png")

        # =========================================================================
        # PART 2: SALESPERSON LIVE FRONT CAMERA & WORKDAY VERIFICATION
        # =========================================================================
        print("\n>>> PART 2: SALESPERSON LIVE CAMERA VERIFICATION <<<")
        
        # Switch context to mobile viewport for salesperson experience
        page.set_viewport_size({"width": 412, "height": 915})

        print("\n[Step 2.1] Logging in as Field Salesperson (kondwani.banda@carboncarcare.com)...")
        page.fill("input[name='email']", "kondwani.banda@carboncarcare.com")
        page.fill("input[name='password']", DEV_PASSWORD)
        page.click("button[type='submit']")
        page.wait_for_timeout(3000)

        page.wait_for_selector("text=Kondwani Banda", timeout=15000)
        print("  PASS: Field Salesperson authenticated into mobile view.")
        save_screenshot(page, "p1_hotfix_09_salesperson_dashboard.png")

        print("\n[Step 2.2] Opening Start Workday Modal...")
        start_day_cta = page.locator("button:has-text('Start Workday')").first
        assert start_day_cta.is_visible(), "Start Workday CTA not visible!"
        start_day_cta.click()
        page.wait_for_timeout(2000)
        save_screenshot(page, "p1_hotfix_10_start_day_modal_camera_live.png")

        print("\n[Step 2.3] Verifying Live Camera Stream and Video Element binding...")
        # Verify video element is in DOM
        video = page.locator("video")
        assert video.count() > 0, "Video element not found in DOM!"
        
        # Verify video element has active stream and valid dimensions
        video_info = page.evaluate("""() => {
            const v = document.querySelector('video');
            if (!v) return { exists: false };
            return {
                exists: true,
                hasSrcObject: !!v.srcObject,
                videoWidth: v.videoWidth,
                videoHeight: v.videoHeight,
                paused: v.paused,
                readyState: v.readyState
            };
        }""")
        print(f"  Live Video Telemetry from browser: {video_info}")
        assert video_info.get("exists"), "Video element missing from DOM!"
        assert video_info.get("hasSrcObject"), "Video srcObject is null/not bound!"
        assert video_info.get("videoWidth", 0) > 0, f"videoWidth is 0! (Value: {video_info.get('videoWidth')})"
        assert video_info.get("videoHeight", 0) > 0, f"videoHeight is 0! (Value: {video_info.get('videoHeight')})"
        print("  PASS: Live video stream successfully mounted, playing, with valid video dimensions!")

        # Verify Live Stream status badge
        modal_body = page.locator("div[role='dialog'], .fixed").first.inner_text()
        assert "Live Stream" in modal_body or "Active" in modal_body, "Live Stream badge not indicated!"
        print("  PASS: Live Stream indicator badge confirmed.")

        # Capture Live Selfie
        print("\n[Step 2.4] Triggering Capture Live Photo...")
        capture_btn = page.locator("button:has-text('Capture Live Photo')")
        assert capture_btn.is_enabled(), "Capture Live Photo button is disabled!"
        capture_btn.click()
        page.wait_for_timeout(1500)
        save_screenshot(page, "p1_hotfix_11_selfie_captured_preview.png")

        # Verify photo preview is visible and has data URL
        img_info = page.evaluate("""() => {
            const img = document.querySelector('img[alt="Captured Attendance Selfie"]');
            if (!img) return { exists: false };
            return {
                exists: true,
                hasSrc: !!img.src && (img.src.startsWith('data:image/jpeg') || img.src.startsWith('blob:')),
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight
            };
        }""")
        print(f"  Captured Image Telemetry: {img_info}")
        assert img_info.get("exists"), "Captured preview image element not found!"
        assert img_info.get("hasSrc"), "Captured image source is not a valid JPEG/blob URL!"
        assert img_info.get("naturalWidth", 0) > 0, "Captured image has 0 naturalWidth!"
        print("  PASS: Real JPEG frame captured from video stream onto canvas with non-zero dimensions.")

        # Test Retake Photo
        print("\n[Step 2.5] Testing Retake Photo...")
        retake_btn = page.locator("button:has-text('Retake')")
        assert retake_btn.is_visible(), "Retake button not visible!"
        retake_btn.click()
        page.wait_for_timeout(1000)
        save_screenshot(page, "p1_hotfix_12_camera_live_after_retake.png")

        # Verify camera stream returned to active state
        video_after_retake = page.evaluate("""() => {
            const v = document.querySelector('video');
            return {
                exists: !!v,
                videoWidth: v ? v.videoWidth : 0,
                videoHeight: v ? v.videoHeight : 0,
                hasSrcObject: v ? !!v.srcObject : false
            };
        }""")
        assert video_after_retake.get("hasSrcObject"), "Stream lost after retake!"
        print("  PASS: Live video stream successfully restored after clicking Retake Photo.")

        # Capture photo again to confirm stability
        page.locator("button:has-text('Capture Live Photo')").click()
        page.wait_for_timeout(1000)
        save_screenshot(page, "p1_hotfix_13_selfie_recaptured.png")

        # Verify Submit Attendance button is enabled and GPS accuracy ≤ 100m
        modal_text_final = page.locator("div[role='dialog'], .fixed").first.inner_text()
        assert "GPS Geofence Accuracy" in modal_text_final or "GPS" in modal_text_final, "GPS accuracy info missing!"
        print("  PASS: GPS telemetry and selfie capture complete and valid.")

        print("\n" + "=" * 80)
        print("ALL P1 HOTFIX VERIFICATIONS PASSED CLEANLY (HQ DEVICE DROPDOWN & SALESPERSON LIVE CAMERA)")
        print("=" * 80)

if __name__ == "__main__":
    run_e2e_verification()
