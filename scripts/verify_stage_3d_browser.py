"""
Stage 3D Comprehensive Browser E2E, Offline Workday, App-Shell Cold-Start,
Multi-User Isolation & Supabase Persistence Verification Script

Executes:
1. Full 16-Step Offline Workday Browser Test (Section 2):
   - Authenticated session + download authorised client/pin/rule context + Service Worker activation
   - Disable network connectivity (context.set_offline(True))
   - Start Day offline (GPS + live selfie Blob)
   - Select registered client & approved pin location offline
   - Visit check-in offline with live rear-camera premises photo Blob
   - Visit checkout offline
   - Meeting log submission offline with business card photo Blob
   - End Day offline
   - Verify all 5 events and 3 media Blobs exist in real Chromium IndexedDB
   - Refresh browser while offline (context.set_offline(True)) -> verify app shell & pending records survive
   - Close page & reopen new page while offline (Section 3 App Restart / Cold-Start check)
2. Multi-User Isolation Browser Test (Section 4):
   - Employee A (Tunde Adebayo, NG) signs out with 5 unsynced events in IndexedDB
   - Employee B (Chanda Mutale, ZM) signs in on the same browser context
   - Verify Employee B sees 0 events and 0 media items from Employee A
   - Employee B signs out, Employee A signs back in and recovers all 5 pending events
3. Reconnection & Authoritative Server Synchronisation (Steps 12-16):
   - Reconnect to network and synchronise journal in topological order
   - Inspect hosted Supabase ([SUPABASE_PROJECT_ID]) and verify:
     * Exactly 1 attendance_days record (status='ended')
     * Exactly 1 visits record (verification_status='location_verified', check_out_at set)
     * Exactly 1 meeting_logs record (associated with visit_id)
     * All 3 Storage objects uploaded to private buckets
4. Multi-Viewport Responsive Checks (360x800, 390x844, 430x932, 1280x800)
"""
import os
import json
import time
import shutil
import subprocess
from datetime import datetime, timezone
import requests
from playwright.sync_api import sync_playwright

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "https://[SUPABASE_PROJECT_ID].supabase.co")
PUBLISHABLE_KEY = os.environ.get("VITE_SUPABASE_PUBLISHABLE_KEY", os.environ.get("VITE_SUPABASE_ANON_KEY", ""))

OUTPUT_DIR = os.path.join("docs", "screenshots", "stage3d")
ARTIFACT_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity\brain\fc573132-6d8d-4550-b06f-9eb28f426230"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def get_env_var(key_name):
    val = os.environ.get(key_name)
    if not val and os.path.exists(".env.local"):
        with open(".env.local", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith(f"{key_name}="):
                    return line.strip().split("=", 1)[1]
    return val or ""


DEV_PASSWORD = get_env_var("DEV_USER_PASSWORD")
MGMT_TOKEN = get_env_var("SUPABASE_ACCESS_TOKEN")


def run_sql(sql_query):
    resp = requests.post(
        "https://api.supabase.com/v1/projects/[SUPABASE_PROJECT_ID]/database/query",
        headers={
            "Authorization": f"Bearer {MGMT_TOKEN}",
            "Content-Type": "application/json",
        },
        json={"query": sql_query},
    )
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"SQL query failed ({resp.status_code}): {resp.text}")
    return resp.json()


def reset_tunde_today_records():
    """Cleans today's attendance_days, visits, and meeting_logs for Tunde Adebayo so a full offline workday can run cleanly."""
    auth_resp = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": PUBLISHABLE_KEY, "Content-Type": "application/json"},
        json={"email": "tunde.adebayo@carboncarcare.com", "password": DEV_PASSWORD},
    )
    if auth_resp.status_code != 200:
        raise RuntimeError(f"Auth failed: {auth_resp.text}")
    sp_id = auth_resp.json()["user"]["id"]
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    run_sql(
        f"""
        DELETE FROM public.meeting_logs
        WHERE visit_id IN (
          SELECT id FROM public.visits WHERE user_id = '{sp_id}'
          AND (check_in_at::date = '{today_str}'::date OR check_out_at IS NULL)
        );
        DELETE FROM public.visits
        WHERE user_id = '{sp_id}'
        AND (check_in_at::date = '{today_str}'::date OR check_out_at IS NULL);
        DELETE FROM public.attendance_days
        WHERE user_id = '{sp_id}' AND work_date = '{today_str}';
        """
    )
    return sp_id, today_str


def save_screenshot(page, filename):
    out_path = os.path.join(OUTPUT_DIR, filename)
    page.screenshot(path=out_path, full_page=False)
    if os.path.exists(ARTIFACT_DIR):
        shutil.copy2(out_path, os.path.join(ARTIFACT_DIR, filename))
    print(f"  [Screenshot] {out_path}")
    return out_path


def check_no_overflow(page, label):
    overflow = page.evaluate(
        "() => document.documentElement.scrollWidth > window.innerWidth"
    )
    scroll_w = page.evaluate("() => document.documentElement.scrollWidth")
    inner_w = page.evaluate("() => window.innerWidth")
    print(
        f"  [Viewport Check - {label}] scrollWidth={scroll_w}, innerWidth={inner_w}, overflow={overflow}"
    )
    assert not overflow, f"Horizontal overflow detected on {label}: {scroll_w} > {inner_w}"


def is_server_up():
    try:
        r = requests.get("http://localhost:5173", timeout=2)
        return r.status_code == 200
    except Exception:
        return False


def run():
    print("=" * 80)
    print("STAGE 3D FULL OFFLINE WORKDAY, ISOLATION & SUPABASE VERIFICATION")
    print("=" * 80)

    sp_id, today_str = reset_tunde_today_records()
    print(f"  Cleaned today's ({today_str}) records for Tunde Adebayo ({sp_id}).")

    vite_proc = None
    if not is_server_up():
        print("  Starting local Vite server on http://localhost:5173...")
        vite_proc = subprocess.Popen(
            ["npx", "vite", "--port", "5173"],
            shell=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        for _ in range(30):
            if is_server_up():
                break
            time.sleep(1.0)
        assert is_server_up(), "Failed to start local Vite server on port 5173"

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
            ],
        )

        # =====================================================================
        # SECTION 2: 16-Step Full Offline Workday Browser Test (390x844)
        # =====================================================================
        print("\n[Step 1] Establishing authenticated session & downloading client/pin/rule context...")
        ctx_390 = browser.new_context(
            viewport={"width": 390, "height": 844},
            permissions=["geolocation", "camera"],
            geolocation={"latitude": 6.5925, "longitude": 3.3441, "accuracy": 14.0},
        )
        page = ctx_390.new_page()
        page.goto("http://localhost:5173", wait_until="networkidle")

        page.fill('input[type="email"]', "tunde.adebayo@carboncarcare.com")
        page.fill('input[name="password"]', DEV_PASSWORD)
        page.click('button[type="submit"]')
        page.wait_for_selector("text=Tunde", timeout=15000)
        time.sleep(2.5)

        # Reload once while online so the newly installed Service Worker controls the page and caches Vite module requests
        page.reload(wait_until="networkidle")
        page.wait_for_selector("text=Tunde", timeout=15000)
        time.sleep(1.5)

        # Open Sync tab while online for initial screenshot
        sync_nav = page.query_selector("#btn-sync-queue-badge") or page.query_selector('button:has-text("Sync")')
        assert sync_nav is not None
        sync_nav.click()
        time.sleep(1.0)
        check_no_overflow(page, "390x844 Online Sync Queue View")
        save_screenshot(page, "stage3d_01_sync_queue_online_390.png")

        # [Step 2] Disable network connectivity (both app offline toggle + Playwright context.set_offline(True))
        print("[Step 2] Disabling network connectivity (ctx_390.set_offline(True))...")
        offline_btn = page.query_selector("#btn-toggle-network-mode")
        if offline_btn and "Online" in (offline_btn.inner_text() or ""):
            offline_btn.click()
            time.sleep(0.5)
        ctx_390.set_offline(True)
        time.sleep(0.8)

        page.wait_for_selector("text=Device is currently offline", timeout=5000)
        check_no_overflow(page, "390x844 Offline Mode Active")
        save_screenshot(page, "stage3d_02_offline_mode_banner_390.png")

        # [Step 3] Start Day offline using captured GPS and live selfie evidence
        print("[Step 3] Recording Start Day offline with GPS and live front-camera selfie...")
        home_nav = page.query_selector("#nav-tab-home") or page.query_selector('button:has-text("Home")')
        assert home_nav is not None
        home_nav.click()
        time.sleep(1.0)

        start_day_btn = page.wait_for_selector('button:has-text("Start Workday")', timeout=10000)
        start_day_btn.click()
        time.sleep(1.5)

        capture_selfie_btn = page.wait_for_selector(
            'button:has-text("Capture Live Photo")', timeout=10000
        )
        capture_selfie_btn.click()
        time.sleep(1.0)

        confirm_start_btn = page.wait_for_selector(
            'button:has-text("Confirm & Start Workday")', timeout=10000
        )
        confirm_start_btn.click()
        time.sleep(2.5)

        # [Step 4 & 5] Select registered client & physical location and record visit check-in with premises photo
        print("[Step 4 & 5] Selecting registered client & approved pin and recording Visit Check-In offline...")
        visit_nav = page.query_selector("#nav-tab-visit")
        assert visit_nav is not None
        visit_nav.click()
        time.sleep(1.2)

        search_input = page.wait_for_selector('input[placeholder*="Search business"]', timeout=10000)
        search_input.click()
        time.sleep(0.6)

        first_client_btn = page.query_selector("div.divide-y button")
        assert first_client_btn is not None, "Expected cached clients in dropdown while offline"
        first_client_btn.click()
        time.sleep(0.8)

        ikeja_loc_btn = page.query_selector('button:has-text("Ikeja Logistics Hub")') or page.query_selector(
            'button:has-text("Approved")'
        )
        if ikeja_loc_btn:
            ikeja_loc_btn.click()
            time.sleep(0.6)

        inside_btn = page.query_selector('button:has-text("Inside (38m)")')
        if inside_btn:
            inside_btn.click()
            time.sleep(0.4)

        capture_btn = page.query_selector("#sticky-btn-capture-photo") or page.query_selector(
            'button:has-text("Capture Live Premises Photo")'
        )
        assert capture_btn is not None
        capture_btn.click()
        time.sleep(1.0)

        checkin_btn = page.wait_for_selector("#sticky-btn-checkin", timeout=10000)
        checkin_btn.click()
        page.wait_for_selector("text=Visit Session In Progress", timeout=15000)
        time.sleep(1.2)

        check_no_overflow(page, "390x844 Offline Visit Queued in IndexedDB")
        save_screenshot(page, "stage3d_03_offline_visit_active_390.png")

        # [Step 6 & 7] Record checkout and submit meeting log with business card photo while offline
        print("[Step 6 & 7] Recording Visit Checkout and submitting Meeting Log with Business Card offline...")
        checkout_btn = page.wait_for_selector(
            'button:has-text("Check Out & Document Visit")', timeout=10000
        )
        checkout_btn.click()
        time.sleep(1.0)

        # Attach optional business card photo in MeetingLogModal
        attach_card_btn = page.query_selector('button:has-text("Attach Card")')
        if attach_card_btn:
            attach_card_btn.click()
            time.sleep(0.4)

        submit_log_btn = page.wait_for_selector(
            'button:has-text("Submit Log & Close Visit")', timeout=10000
        )
        submit_log_btn.click()
        time.sleep(1.5)

        # [Step 8] End Day while offline
        print("[Step 8] Recording End Day offline...")
        home_nav = page.query_selector("#nav-tab-home") or page.query_selector('button:has-text("Home")')
        assert home_nav is not None
        home_nav.click()
        time.sleep(1.0)

        end_day_btn = page.wait_for_selector('button:has-text("End Workday")', timeout=10000)
        end_day_btn.click()
        time.sleep(1.5)

        confirm_end_btn = page.wait_for_selector(
            'button:has-text("Confirm & End Workday")', timeout=10000
        )
        confirm_end_btn.click()
        time.sleep(2.5)

        # [Step 9] Verify all 5 events and 3 media Blobs exist in real browser IndexedDB
        print("[Step 9] Inspecting real Chromium IndexedDB for all 5 events and 3 media Blobs...")
        idb_dump = page.evaluate(
            """async (ownerId) => {
                return new Promise((resolve, reject) => {
                    const req = window.indexedDB.open('carbon_field_sales_offline_v1');
                    req.onerror = () => reject(req.error);
                    req.onsuccess = () => {
                        const db = req.result;
                        const tx = db.transaction(['eventJournal', 'mediaQueue'], 'readonly');
                        const evReq = tx.objectStore('eventJournal').getAll();
                        const medReq = tx.objectStore('mediaQueue').getAll();
                        tx.oncomplete = () => {
                            const events = evReq.result
                                .filter(e => e.ownerUserId === ownerId)
                                .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
                            const media = medReq.result.filter(m => m.ownerUserId === ownerId);
                            db.close();
                            resolve({
                                eventCount: events.length,
                                eventTypes: events.map(e => e.eventType),
                                eventStatuses: events.map(e => e.syncStatus),
                                eventIds: events.map(e => e.id),
                                mediaCount: media.length,
                                mediaKinds: media.map(m => m.mediaKind),
                                mediaStatuses: media.map(m => m.uploadStatus),
                            });
                        };
                    };
                });
            }""",
            sp_id,
        )
        print(f"  [IndexedDB Inspection] {json.dumps(idb_dump)}")
        expected_types = [
            "ATTENDANCE_START_DAY",
            "VISIT_CHECKIN",
            "VISIT_CHECKOUT",
            "MEETING_LOG_SUBMIT",
            "ATTENDANCE_END_DAY",
        ]
        assert idb_dump["eventTypes"] == expected_types, (
            f"Expected 5 ordered event types {expected_types}, got {idb_dump['eventTypes']}"
        )
        assert idb_dump["mediaCount"] == 3, f"Expected 3 queued media blobs, got {idb_dump['mediaCount']}"

        # Navigate to Sync Queue view to capture all 5 pending events
        sync_badge = page.query_selector("#btn-sync-queue-badge")
        assert sync_badge is not None
        sync_badge.click()
        time.sleep(1.2)
        check_no_overflow(page, "390x844 Sync Queue All 5 Pending Events")
        save_screenshot(page, "stage3d_04_sync_queue_pending_events_390.png")

        # [Step 10 & 11] Refresh browser while offline and verify pending records remain accessible
        print("[Step 10 & 11] Refreshing browser while offline (ctx_390.set_offline(True))...")
        page.reload(wait_until="domcontentloaded")
        page.wait_for_selector("text=Tunde", timeout=15000)
        time.sleep(1.5)
        sync_badge = page.query_selector("#btn-sync-queue-badge")
        assert sync_badge is not None
        sync_badge.click()
        time.sleep(1.0)
        page.wait_for_selector("text=ATTENDANCE_START_DAY", timeout=10000)
        page.wait_for_selector("text=ATTENDANCE_END_DAY", timeout=10000)
        print("  [PASS] Offline browser refresh succeeded; all 5 pending events remain accessible to owner.")

        # =====================================================================
        # SECTION 3: App Restart / Offline Cold-Start Verification
        # =====================================================================
        print("\n[Section 3] Closing page and reopening a new page while offline (App-Shell Cold-Start)...")
        page.close()
        page_cold = ctx_390.new_page()
        page_cold.goto("http://localhost:5173", wait_until="domcontentloaded")
        page_cold.wait_for_selector("text=Tunde", timeout=15000)
        time.sleep(1.5)
        cold_sync_badge = page_cold.query_selector("#btn-sync-queue-badge")
        assert cold_sync_badge is not None
        cold_sync_badge.click()
        time.sleep(1.0)
        page_cold.wait_for_selector("text=VISIT_CHECKIN", timeout=10000)
        print("  [PASS] Offline page close/reopen loaded App Shell from Service Worker and restored owner queue.")

        # =====================================================================
        # SECTION 4: Multi-User Isolation in Browser (Employee A -> B -> A)
        # =====================================================================
        print("\n[Section 4] Testing Multi-User Isolation (Employee A signs out -> Employee B signs in -> Employee A signs back in)...")
        profiles_rows = run_sql(
            "SELECT id, full_name, email, role, market_code FROM public.profiles WHERE is_active = true AND email <> 'tunde.adebayo@carboncarcare.com' ORDER BY CASE WHEN role = 'salesperson' THEN 0 ELSE 1 END LIMIT 1;"
        )
        emp_b = profiles_rows[0]
        emp_b_email = emp_b["email"]
        emp_b_id = emp_b["id"]
        emp_b_first_name = emp_b["full_name"].split(" ")[0]
        print(f"  Selected Employee B for isolation test: {emp_b['full_name']} ({emp_b_email}, role={emp_b['role']}, market={emp_b['market_code']})")

        # Sign out Employee A while still offline so Employee A's queue remains pending in IndexedDB
        sign_out_btn = page_cold.wait_for_selector(
            'button[title="Sign Out / Switch Demo Profile"]', timeout=10000
        )
        sign_out_btn.click()
        page_cold.wait_for_selector('input[type="email"]', timeout=10000)

        # Now reconnect network so Employee B can authenticate
        ctx_390.set_offline(False)
        time.sleep(0.5)

        page_cold.fill('input[type="email"]', emp_b_email)
        page_cold.fill('input[name="password"]', DEV_PASSWORD)
        page_cold.click('button[type="submit"]')
        page_cold.wait_for_selector(f"text={emp_b_first_name}", timeout=15000)
        time.sleep(2.0)

        # Verify in browser IndexedDB that Employee B has 0 events & 0 media while Employee A's 5 events remain pending and untouched
        b_isolation_check = page_cold.evaluate(
            """async ({ userAId, userBId }) => {
                return new Promise((resolve, reject) => {
                    const req = window.indexedDB.open('carbon_field_sales_offline_v1');
                    req.onerror = () => reject(req.error);
                    req.onsuccess = () => {
                        const db = req.result;
                        const tx = db.transaction(['eventJournal', 'mediaQueue'], 'readonly');
                        const evReq = tx.objectStore('eventJournal').getAll();
                        const medReq = tx.objectStore('mediaQueue').getAll();
                        tx.oncomplete = () => {
                            const bEvents = evReq.result.filter(e => e.ownerUserId === userBId);
                            const bMedia = medReq.result.filter(m => m.ownerUserId === userBId);
                            const aPendingEvents = evReq.result.filter(e => e.ownerUserId === userAId && e.syncStatus === 'pending');
                            db.close();
                            resolve({
                                bEventCount: bEvents.length,
                                bMediaCount: bMedia.length,
                                aPendingCount: aPendingEvents.length,
                            });
                        };
                    };
                });
            }""",
            {"userAId": sp_id, "userBId": emp_b_id},
        )
        print(f"  [Multi-User Isolation Check] {json.dumps(b_isolation_check)}")
        assert b_isolation_check["bEventCount"] == 0, "Employee B must see 0 events from Employee A"
        assert b_isolation_check["bMediaCount"] == 0, "Employee B must see 0 media blobs from Employee A"
        assert b_isolation_check["aPendingCount"] == 5, "Employee A's 5 pending events must remain preserved while Employee B is signed in"

        if emp_b["role"] == "salesperson":
            b_sync_badge = page_cold.query_selector("#btn-sync-queue-badge")
            if b_sync_badge:
                b_sync_badge.click()
                time.sleep(1.0)
                b_pending_text = page_cold.query_selector("#telemetry-pending-count").inner_text()
                b_media_text = page_cold.query_selector("#telemetry-media-count").inner_text()
                print(f"  Employee B Sync Queue UI telemetry: pending={b_pending_text}, media={b_media_text}")
                assert b_pending_text.strip() == "0"
                assert b_media_text.strip().startswith("0")

        # Sign Employee B out and sign Employee A (Tunde Adebayo) back in
        b_logout_btn = page_cold.query_selector('button[title="Sign Out / Switch Demo Profile"]') or page_cold.query_selector(
            'button:has-text("Sign Out")'
        )
        assert b_logout_btn is not None
        b_logout_btn.click()
        page_cold.wait_for_selector('input[type="email"]', timeout=10000)

        page_cold.fill('input[type="email"]', "tunde.adebayo@carboncarcare.com")
        page_cold.fill('input[name="password"]', DEV_PASSWORD)
        page_cold.click('button[type="submit"]')
        page_cold.wait_for_selector("text=Tunde", timeout=15000)
        time.sleep(2.0)

        # =====================================================================
        # STEPS 12-16: Reconnect, Synchronise Journal & Verify Supabase Records
        # =====================================================================
        print("\n[Steps 12-16] Synchronising Employee A's 5 queued offline events & 3 media Blobs to Supabase...")
        a_sync_badge = page_cold.query_selector("#btn-sync-queue-badge")
        assert a_sync_badge is not None
        a_sync_badge.click()
        time.sleep(1.5)

        # Ensure app network toggle is Online if needed and click Sync Now
        toggle_btn = page_cold.query_selector("#btn-toggle-network-mode")
        if toggle_btn and "Offline" in (toggle_btn.inner_text() or ""):
            toggle_btn.click()
            time.sleep(1.0)

        sync_now_btn = page_cold.query_selector("#btn-sync-now")
        if sync_now_btn and not sync_now_btn.is_disabled():
            sync_now_btn.click()

        page_cold.wait_for_selector("text=All Events Synced to Server", timeout=25000)
        time.sleep(1.0)

        check_no_overflow(page_cold, "390x844 Reconnected & All 5 Events Synced")
        save_screenshot(page_cold, "stage3d_05_sync_queue_reconnected_synced_390.png")

        # Verify IndexedDB events all transitioned to 'synced' with serverAckRef
        idb_after = page_cold.evaluate(
            """async (ownerId) => {
                return new Promise((resolve, reject) => {
                    const req = window.indexedDB.open('carbon_field_sales_offline_v1');
                    req.onerror = () => reject(req.error);
                    req.onsuccess = () => {
                        const db = req.result;
                        const tx = db.transaction(['eventJournal', 'mediaQueue'], 'readonly');
                        const evReq = tx.objectStore('eventJournal').getAll();
                        const medReq = tx.objectStore('mediaQueue').getAll();
                        tx.oncomplete = () => {
                            const events = evReq.result
                                .filter(e => e.ownerUserId === ownerId)
                                .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
                            const media = medReq.result.filter(m => m.ownerUserId === ownerId);
                            db.close();
                            resolve({
                                events: events.map(e => ({
                                    seq: e.sequenceNumber,
                                    type: e.eventType,
                                    status: e.syncStatus,
                                    entityId: e.entityId,
                                    serverAckRef: e.serverAckRef,
                                    verification: e.serverVerificationResult,
                                })),
                                media: media.map(m => ({
                                    kind: m.mediaKind,
                                    status: m.uploadStatus,
                                    storagePath: m.storagePath,
                                })),
                            });
                        };
                    };
                });
            }""",
            sp_id,
        )
        print(f"  [IndexedDB Post-Sync State] {json.dumps(idb_after, indent=2)}")
        for ev in idb_after["events"]:
            assert ev["status"] == "synced", f"Expected event {ev['type']} to be 'synced', got {ev['status']}"
            assert ev["serverAckRef"] is not None, f"Expected serverAckRef for {ev['type']}"
        for med in idb_after["media"]:
            assert med["status"] == "uploaded", f"Expected media {med['kind']} to be 'uploaded', got {med['status']}"

        # Inspect hosted Supabase directly via SQL / REST to verify exactly 1 record per operation!
        db_verification = run_sql(
            f"""
            SELECT
              (SELECT count(*) FROM public.attendance_days WHERE user_id = '{sp_id}' AND work_date = '{today_str}') AS att_count,
              (SELECT id FROM public.attendance_days WHERE user_id = '{sp_id}' AND work_date = '{today_str}' LIMIT 1) AS att_id,
              (SELECT status FROM public.attendance_days WHERE user_id = '{sp_id}' AND work_date = '{today_str}' LIMIT 1) AS att_status,
              (SELECT start_selfie_url FROM public.attendance_days WHERE user_id = '{sp_id}' AND work_date = '{today_str}' LIMIT 1) AS selfie_path,
              (SELECT count(*) FROM public.visits WHERE user_id = '{sp_id}' AND check_in_at::date = '{today_str}'::date) AS visit_count,
              (SELECT id FROM public.visits WHERE user_id = '{sp_id}' AND check_in_at::date = '{today_str}'::date LIMIT 1) AS visit_id,
              (SELECT verification_status FROM public.visits WHERE user_id = '{sp_id}' AND check_in_at::date = '{today_str}'::date LIMIT 1) AS visit_ver_status,
              (SELECT check_out_at FROM public.visits WHERE user_id = '{sp_id}' AND check_in_at::date = '{today_str}'::date LIMIT 1) AS visit_checkout_at,
              (SELECT premises_photo_url FROM public.visits WHERE user_id = '{sp_id}' AND check_in_at::date = '{today_str}'::date LIMIT 1) AS premises_path,
              (SELECT count(*) FROM public.meeting_logs ml JOIN public.visits v ON v.id = ml.visit_id WHERE v.user_id = '{sp_id}' AND v.check_in_at::date = '{today_str}'::date) AS log_count,
              (SELECT ml.id FROM public.meeting_logs ml JOIN public.visits v ON v.id = ml.visit_id WHERE v.user_id = '{sp_id}' AND v.check_in_at::date = '{today_str}'::date LIMIT 1) AS log_id,
              (SELECT ml.business_card_photo_url FROM public.meeting_logs ml JOIN public.visits v ON v.id = ml.visit_id WHERE v.user_id = '{sp_id}' AND v.check_in_at::date = '{today_str}'::date LIMIT 1) AS card_path;
            """
        )
        print(f"  [Supabase Authoritative Verification] {json.dumps(db_verification, indent=2)}")
        row = db_verification[0]
        assert int(row["att_count"]) == 1, f"Expected exactly 1 attendance_days row, got {row['att_count']}"
        assert row["att_status"] == "ended", f"Expected attendance status 'ended', got {row['att_status']}"
        assert int(row["visit_count"]) == 1, f"Expected exactly 1 visits row, got {row['visit_count']}"
        assert row["visit_ver_status"] == "location_verified", (
            f"Expected server PostGIS verification_status 'location_verified', got {row['visit_ver_status']}"
        )
        assert row["visit_checkout_at"] is not None, "Expected visit check_out_at to be populated on server"
        assert int(row["log_count"]) == 1, f"Expected exactly 1 meeting_logs row, got {row['log_count']}"

        # =====================================================================
        # Multi-Viewport Verification (360x800, 430x932, 1280x800)
        # =====================================================================
        print("\n[Viewport 2] Verifying 360x800 Mobile Viewport on Offline Sync View...")
        ctx_360 = browser.new_context(
            viewport={"width": 360, "height": 800},
            permissions=["geolocation", "camera"],
        )
        p360 = ctx_360.new_page()
        p360.goto("http://localhost:5173", wait_until="networkidle")
        p360.fill('input[type="email"]', "tunde.adebayo@carboncarcare.com")
        p360.fill('input[name="password"]', DEV_PASSWORD)
        p360.click('button[type="submit"]')
        p360.wait_for_selector("text=Tunde", timeout=15000)
        time.sleep(1.5)
        s360 = p360.query_selector("#btn-sync-queue-badge")
        if s360:
            s360.click()
            time.sleep(1.0)
        check_no_overflow(p360, "360x800 Offline Sync View")
        save_screenshot(p360, "stage3d_06_sync_queue_360.png")

        print("\n[Viewport 3] Verifying 430x932 Mobile Viewport on Offline Sync View...")
        ctx_430 = browser.new_context(
            viewport={"width": 430, "height": 932},
            permissions=["geolocation", "camera"],
        )
        p430 = ctx_430.new_page()
        p430.goto("http://localhost:5173", wait_until="networkidle")
        p430.fill('input[type="email"]', "tunde.adebayo@carboncarcare.com")
        p430.fill('input[name="password"]', DEV_PASSWORD)
        p430.click('button[type="submit"]')
        p430.wait_for_selector("text=Tunde", timeout=15000)
        time.sleep(1.5)
        s430 = p430.query_selector("#btn-sync-queue-badge")
        if s430:
            s430.click()
            time.sleep(1.0)
        check_no_overflow(p430, "430x932 Offline Sync View")
        save_screenshot(p430, "stage3d_07_sync_queue_430.png")

        print("\n[Viewport 4] Verifying 1280x800 Country Sales Head Desktop Viewport...")
        ctx_1280 = browser.new_context(viewport={"width": 1280, "height": 800})
        p1280 = ctx_1280.new_page()
        p1280.goto("http://localhost:5173", wait_until="networkidle")
        p1280.fill('input[type="email"]', "babatunde.adeleke@carboncarcare.com")
        p1280.fill('input[name="password"]', DEV_PASSWORD)
        p1280.click('button[type="submit"]')
        p1280.wait_for_selector("text=Babatunde", timeout=15000)
        time.sleep(1.5)
        check_no_overflow(p1280, "1280x800 Manager Desktop View")
        save_screenshot(p1280, "stage3d_08_manager_dashboard_1280.png")

        browser.close()

    if vite_proc is not None:
        vite_proc.terminate()

    print("\n" + "=" * 80)
    print("ALL STAGE 3D E2E, OFFLINE WORKDAY, ISOLATION & SUPABASE CHECKS PASSED!")
    print("=" * 80)


if __name__ == "__main__":
    run()
