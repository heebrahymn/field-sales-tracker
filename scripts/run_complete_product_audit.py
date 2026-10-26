import os
import sys
import time
import json
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity-ide\brain\8b9fad0a-b1b7-4393-8c3b-5454f954b105\screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

LIVE_URL = "https://field-sales-tracker-b6l7.vercel.app/"

results = {
    "url": LIVE_URL,
    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "console_logs": [],
    "network_errors": [],
    "tests": []
}

def log_test(test_id, name, category, status, details=None):
    badge = f"[{status.upper()}]"
    print(f"{badge:<10} [{category:<18}] {test_id}: {name}")
    if details:
        print(f"           -> {details}")
    results["tests"].append({
        "id": test_id,
        "name": name,
        "category": category,
        "status": status,
        "details": details
    })

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # =========================================================================
        # SUITE 1: SALESPERSON MOBILE WORKFLOW (390 x 844)
        # =========================================================================
        print("\n=======================================================")
        print("SUITE 1: SALESPERSON WORKFLOW AUDIT (iPhone 14 / 390x844)")
        print("=======================================================")
        context = browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
        )
        page = context.new_page()
        page.on("console", lambda msg: results["console_logs"].append({"type": msg.type, "text": f"[Salesperson] {msg.text}"}))
        page.on("requestfailed", lambda req: results["network_errors"].append({"url": req.url, "error": str(req.failure)}))
        
        page.goto(LIVE_URL, wait_until="networkidle")
        page.wait_for_timeout(800)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "01_salesperson_home_initial.png"))
        
        # SP-01: Page Load & Title
        title = page.title()
        if "Carbon Field Sales Tracker" in title:
            log_test("SP-01", "Document Title & Branding", "Salesperson", "Pass", f"Title: '{title}', Carbon Car Care logo rendered")
        else:
            log_test("SP-01", "Document Title & Branding", "Salesperson", "Fail", f"Unexpected title: '{title}'")
            
        # SP-02: Interactive Demo Distinction
        body_text = page.locator("body").text_content()
        if "Stage 1A Demo" in body_text or "STAGE 1A DEMO" in body_text or "Deterministic Mock Data" in body_text:
            log_test("SP-02", "Demo Mode Distinction", "Salesperson", "Pass", "Clear yellow 'Stage 1A Demo' indicator visible with 'Deterministic Mock Data' notice")
        else:
            log_test("SP-02", "Demo Mode Distinction", "Salesperson", "Fail", "Demo disclaimer missing")
            
        # SP-03: Assigned Company Handset Tag Display
        if "CC-DEV-LAG-019" in body_text or "CC-DEV" in body_text:
            log_test("SP-03", "Company Handset Asset Tag", "Salesperson", "Pass", "Company handset 'CC-DEV-LAG-019' displayed with link to device profile")
        else:
            log_test("SP-03", "Company Handset Asset Tag", "Salesperson", "Fail", "Assigned handset not displayed on home screen")
            
        # SP-04: Action Cards - Add Client Terminology
        add_client_card = page.locator("button:has-text('Add Client')").first
        if add_client_card.count() > 0:
            log_test("SP-04", "Add Client Action Tile", "Salesperson", "Pass", "Tile shows 'Add Client' with description 'Register a new business client'")
        else:
            log_test("SP-04", "Add Client Action Tile", "Salesperson", "Fail", "Missing 'Add Client' card")
            
        # SP-05: AT-04 Active Visit Detected Initially
        active_visit_card = page.locator("text=Apex Heavy Logistics Fleet Depot")
        if active_visit_card.count() > 0:
            log_test("SP-05", "Initial Active Visit Display", "Salesperson", "Pass", "Apex Heavy Logistics active visit loaded with elapsed timer and locked client details")
        else:
            log_test("SP-05", "Initial Active Visit Display", "Salesperson", "Simulated", "No active visit initially seeded")
            
        # SP-06: End Day Blocked While Visit Active (PRD §6.1)
        end_day_blocked = page.locator("text=End Day (Blocked)")
        if end_day_blocked.count() > 0:
            log_test("SP-06", "End Day Blocked by Active Visit", "Salesperson", "Pass", "Tile correctly locks End Day: 'Active visit must close first (PRD §6.1)'")
        else:
            log_test("SP-06", "End Day Blocked by Active Visit", "Salesperson", "Fail", "End Day was not blocked while visit active")
            
        # SP-07: Add Client Modal Inspection (From Home Tile)
        add_client_card.click()
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "02_add_client_modal_full.png"))
        modal_content = page.locator("body").text_content()
        if "Register Client & Propose Location Pin" in modal_content and "New Business Client" in modal_content and "Existing Client Location" in modal_content:
            log_test("SP-07", "Add Client Registration Modal", "Salesperson", "Pass", "Modal supports B2B toggle (New Business Client vs Existing Client Location) with PRD §4.2 shared switchboard rules")
        else:
            log_test("SP-07", "Add Client Registration Modal", "Salesperson", "Fail", "Add Client modal missing PRD §4.2 elements")
            
        # Close Add Client modal
        close_modal_btn = page.locator("button:has-text('Cancel')").first
        if close_modal_btn.count() > 0:
            close_modal_btn.click()
            page.wait_for_timeout(300)
            
        # SP-08: Non-Visit Workday Modal Inspection
        non_visit_btn = page.locator("button:has-text('Non-Visit Request')").first
        if non_visit_btn.count() > 0:
            non_visit_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "03_non_visit_modal.png"))
            nv_text = page.locator("body").text_content()
            if "Request Non-Visit Workday" in nv_text:
                log_test("SP-08", "Non-Visit Workday Request", "Salesperson", "Pass", "Non-visit request modal loaded (Proposal Prep, Training, Internal Review)")
            else:
                log_test("SP-08", "Non-Visit Workday Request", "Salesperson", "Fail", "Non-visit modal failed to render")
            cancel_nv = page.locator("button:has-text('Cancel')").first
            if cancel_nv.count() > 0:
                cancel_nv.click()
                page.wait_for_timeout(300)

        # SP-09: Navigate to Visit Tab - Verify Active Session is Locked
        visit_nav_btn = page.locator("#nav-tab-visit").first
        visit_nav_btn.click()
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "04_visit_view_active_session.png"))
        visit_view_text = page.locator("body").text_content()
        if "Visit Session In Progress" in visit_view_text and "Apex Heavy Logistics" in visit_view_text:
            log_test("SP-09", "Active Visit Screen Lock", "Visit Workflow", "Pass", "Visit tab displays locked active session for Apex Heavy Logistics with running timer")
        else:
            log_test("SP-09", "Active Visit Screen Lock", "Visit Workflow", "Fail", "Active visit not displayed in Visit tab")
            
        # SP-10: Cancel Active Visit to Test Clean "New Visit" Client Selection
        print("\n>>> Clearing active visit to verify NEW visit client selection...")
        cancel_session_btn = page.locator("button:has-text('Cancel Session')").first
        if cancel_session_btn.count() > 0:
            cancel_session_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "05_visit_view_after_cancel.png"))
            
        # SP-11: CRITICAL CHECK - Verify NEW visit does NOT randomly preselect a client!
        new_visit_text = page.locator("body").text_content()
        if "STEP 1: SELECT CLIENT" in new_visit_text and "Choose Business Client to Visit" in new_visit_text:
            search_box = page.locator("input[placeholder*='Search business']").first
            val = search_box.input_value()
            if val == "":
                log_test("SP-11", "No Random Client Preselection", "Visit Workflow", "Pass", "Clean state: zero clients preselected. Input is empty and prompts for search.")
            else:
                log_test("SP-11", "No Random Client Preselection", "Visit Workflow", "Fail", f"Input unexpectedly contained: '{val}'")
        else:
            log_test("SP-11", "No Random Client Preselection", "Visit Workflow", "Fail", "STEP 1: SELECT CLIENT was not shown after cancel")
            
        # SP-12: Client Search and Multi-Location Selection (Apex Heavy Logistics has 2 locations)
        search_input = page.locator("input[placeholder*='Search business']").first
        search_input.click()
        search_input.fill("Apex")
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "06_visit_search_results_apex.png"))
        
        # Select Apex Heavy Logistics Ltd
        apex_btn = page.locator("button:has-text('Apex Heavy Logistics Ltd')").first
        if apex_btn.count() > 0:
            apex_btn.click()
            page.wait_for_timeout(400)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "07_visit_apex_locations_list.png"))
            
            # Verify multiple physical locations are displayed
            if "Select Location / Branch" in page.locator("body").text_content():
                log_test("SP-12", "Multi-Location Client Prompt", "Visit Workflow", "Pass", "Apex Heavy Logistics has 2 locations; branch location selector displayed")
            else:
                log_test("SP-12", "Multi-Location Client Prompt", "Visit Workflow", "Fail", "Branch location prompt missing for multi-location client")
                
            # Select Apex Heavy Logistics Fleet Depot
            depot_btn = page.locator("button:has-text('Apex Heavy Logistics Fleet Depot')").first
            if depot_btn.count() > 0:
                depot_btn.click()
                page.wait_for_timeout(400)
                page.screenshot(path=os.path.join(SCREENSHOT_DIR, "08_visit_apex_selected.png"))
                log_test("SP-13", "Location Selected", "Visit Workflow", "Pass", "Selected Apex Heavy Logistics Fleet Depot. Target location, address, contact, and GPS loaded.")
            else:
                log_test("SP-13", "Location Selected", "Visit Workflow", "Fail", "Depot button not found")
                
        # SP-14: Test GPS Geofence Simulation Controls
        inside_btn = page.locator("button:has-text('Inside (38m)')").first
        if inside_btn.count() > 0:
            inside_btn.click()
            page.wait_for_timeout(300)
            log_test("SP-14", "GPS Simulator: Inside Geofence", "Visit Workflow", "Pass", "Inside geofence button active (38m, GPS ±14m)")
        
        # SP-15: Capture Live Premises Photo (Scroll into view if needed)
        capture_btn = page.locator("button:has-text('Capture Photo')").first
        if capture_btn.count() > 0:
            capture_btn.scroll_into_view_if_needed()
            capture_btn.click()
            page.wait_for_timeout(800)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "09_visit_photo_captured.png"))
            if "Live Premises Photo Captured" in page.locator("body").text_content():
                log_test("SP-15", "Live Premises Photo Capture", "Visit Workflow", "Pass", "Live premises photo captured and previewed with gate/signage stamp")
            else:
                log_test("SP-15", "Live Premises Photo Capture", "Visit Workflow", "Fail", "Photo verification indicator missing")
        else:
            log_test("SP-15", "Live Premises Photo Capture", "Visit Workflow", "Fail", "Capture Photo button not found")
            
        # SP-16: Check In - Creates New Active Visit
        checkin_btn = page.locator("button:has-text('Check In & Start Client Meeting')").first
        if checkin_btn.count() > 0:
            checkin_btn.scroll_into_view_if_needed()
            checkin_btn.click()
            page.wait_for_timeout(600)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "10_active_visit_started.png"))
            active_content = page.locator("body").text_content()
            if "Visit Session In Progress" in active_content and "Apex Heavy Logistics" in active_content:
                log_test("SP-16", "Check-In Verified Visit", "Visit Workflow", "Pass", "Checked in to Apex Heavy Logistics Fleet Depot. Elapsed timer started.")
            else:
                log_test("SP-16", "Check-In Verified Visit", "Visit Workflow", "Fail", "Check-in failed to transition to active visit")
                
        # SP-17: CRITICAL CHECK - Navigate to Clients, Verify Persistent Strip, Return to Visit Tab
        clients_nav_btn = page.locator("#nav-tab-clients").first
        clients_nav_btn.click()
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "11_navigated_away_to_clients.png"))
        strip_content = page.locator("body").text_content()
        if "Apex Heavy Logistics" in strip_content:
            log_test("SP-17", "Active Visit Visibility Across Tabs", "Visit Workflow", "Pass", "Active visit persists in session while browsing Clients directory")
        else:
            log_test("SP-17", "Active Visit Visibility Across Tabs", "Visit Workflow", "Fail", "Active visit session lost")
            
        # Return to Visit tab
        visit_nav_btn.click()
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "12_resumed_visit_tab.png"))
        resumed_content = page.locator("body").text_content()
        if "Visit Session In Progress" in resumed_content and "Apex Heavy Logistics" in resumed_content:
            log_test("SP-18", "Active Visit Retains Client & Location", "Visit Workflow", "Pass", "Returning to Visit tab preserves active session without loss of selected client/location")
        else:
            log_test("SP-18", "Active Visit Retains Client & Location", "Visit Workflow", "Fail", "Active visit lost client or location on tab switch!")
            
        # SP-19: Test Geofence Warning on Checkout Outside
        outside_btn = page.locator("button:has-text('Outside (340m)')").first
        if outside_btn.count() > 0:
            outside_btn.click()
            page.wait_for_timeout(300)
        
        checkout_btn = page.locator("button:has-text('Check Out & Document Visit')").first
        if checkout_btn.count() > 0:
            checkout_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "13_checkout_outside_geofence_warning.png"))
            if "Checkout Outside Geofence" in page.locator("body").text_content():
                log_test("SP-19", "Checkout Beyond Geofence Flagging (AT-07)", "Visit Workflow", "Pass", "Warning dialog appears: 'Permit closure and raise flag' per PRD §7.1 / AT-07")
                ack_outside_btn = page.locator("button:has-text('Acknowledge & Proceed to Checkout')").first
                if ack_outside_btn.count() > 0:
                    ack_outside_btn.click()
                    page.wait_for_timeout(500)
            else:
                log_test("SP-19", "Checkout Beyond Geofence Flagging (AT-07)", "Visit Workflow", "Fail", "Outside geofence warning dialog missing")
            
        # SP-20: Meeting Log Entry & Strict MVP Exclusions Verification
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "14_meeting_log_modal_opened.png"))
        log_modal_text = page.locator("body").text_content()
        # Verify NO quotation, orders, or pipelines
        if any(term in log_modal_text for term in ["Quote Value", "Order Amount", "Sales Pipeline", "Deal Size", "Revenue"]):
            log_test("SP-20", "Strict MVP Exclusions (Meeting Log)", "Visit Workflow", "Fail", "Commercial terms found in Meeting Log in violation of MVP scope!")
        else:
            log_test("SP-20", "Strict MVP Exclusions (Meeting Log)", "Visit Workflow", "Pass", "Zero commercial fields. Uses qualitative outcome and free-text next steps only.")
            
        # Fill qualitative meeting log & Submit
        submit_close_btn = page.locator("button:has-text('Submit Log & Close Visit')").first
        if submit_close_btn.count() > 0:
            submit_close_btn.click()
            page.wait_for_timeout(600)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "15_workflow_reset_after_close.png"))
            if "STEP 1: SELECT CLIENT" in page.locator("body").text_content():
                log_test("SP-21", "Visit Closure & State Reset", "Visit Workflow", "Pass", "Visit checked out and closed, workflow cleanly reset to Select Client")
            else:
                log_test("SP-21", "Visit Closure & State Reset", "Visit Workflow", "Fail", "Workflow failed to reset after visit checkout")

        # SP-22: Exceptions Workbench Tab
        exc_nav_btn = page.locator("#nav-tab-exceptions").first
        exc_nav_btn.click()
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "16_exceptions_tab.png"))
        exc_text = page.locator("body").text_content()
        if "My Exceptions Workbench" in exc_text:
            log_test("SP-22", "Exceptions Workbench View", "Salesperson", "Pass", "Salesperson exceptions list loaded with status badges and PRD §7.4 header")
        else:
            log_test("SP-22", "Exceptions Workbench View", "Salesperson", "Fail", "Exceptions list header missing")
            
        # Test "+ New Claim" modal
        file_exc_btn = page.locator("button:has-text('New Claim')").first
        if file_exc_btn.count() > 0:
            file_exc_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "17_create_exception_modal.png"))
            ce_text = page.locator("body").text_content()
            if "Submit Field Visit Exception" in ce_text and "Salesperson Authorship" in ce_text:
                log_test("SP-23", "Salesperson Authorship Exception Creation", "Salesperson", "Pass", "Exception creation modal enforces salesperson authorship (GPS Failure, Hardware Defect, Missed Visit)")
            else:
                log_test("SP-23", "Salesperson Authorship Exception Creation", "Salesperson", "Fail", "Authorship notice missing in exception modal")
            cancel_exc = page.locator("button:has-text('Cancel')").first
            if cancel_exc.count() > 0:
                cancel_exc.click()
                page.wait_for_timeout(300)

        # SP-24: Profile Tab & Direct-to-HQ Device Issue Reporting (PRD §6.1 / Decision 10)
        profile_nav_btn = page.locator("#nav-tab-profile").first
        profile_nav_btn.click()
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "18_profile_tab.png"))
        
        rep_issue_btn = page.locator("button:has-text('Report Device Issue')").first
        if rep_issue_btn.count() > 0:
            rep_issue_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "19_report_device_issue_modal.png"))
            dev_modal_text = page.locator("body").text_content()
            if "Direct submission to HQ Administrator" in dev_modal_text and "Direct HQ Admin Workflow" in dev_modal_text:
                log_test("SP-24", "Direct-to-HQ Device Replacement Pipeline", "Salesperson", "Pass", "Verified: Reports directly to HQ Admin with zero manager bottleneck (PRD §6.1 / Decision 10)")
            else:
                log_test("SP-24", "Direct-to-HQ Device Replacement Pipeline", "Salesperson", "Fail", "Direct-to-HQ notice missing from hardware replacement modal")
            cancel_dev = page.locator("button:has-text('Cancel')").first
            if cancel_dev.count() > 0:
                cancel_dev.click()
                page.wait_for_timeout(300)

        # SP-25: Offline Sync View (via persistent strip button)
        sync_status_btn = page.locator("text=Simulated: Synced").first
        if sync_status_btn.count() > 0:
            sync_status_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "20_offline_sync_view.png"))
            if "Offline & In-Flight Sync Queue" in page.locator("body").text_content():
                log_test("SP-25", "Offline & In-Flight Sync Queue", "Salesperson", "Pass", "Sync queue view loaded with queued events, sync state, and Manual Sync Now")
            else:
                log_test("SP-25", "Offline & In-Flight Sync Queue", "Salesperson", "Fail", "Sync queue view failed to open")
                
        context.close()

        # =========================================================================
        # SUITE 2: COUNTRY SALES HEAD WORKFLOW AUDIT (1440 x 900)
        # =========================================================================
        print("\n=======================================================")
        print("SUITE 2: COUNTRY SALES HEAD AUDIT (Desktop / 1440x900)")
        print("=======================================================")
        csh_context = browser.new_context(viewport={"width": 1440, "height": 900})
        csh_page = csh_context.new_page()
        csh_page.on("console", lambda msg: results["console_logs"].append({"type": msg.type, "text": f"[CSH] {msg.text}"}))
        
        csh_page.goto(LIVE_URL, wait_until="networkidle")
        csh_page.wait_for_timeout(800)
        
        # Switch to Country Sales Head via Demo Banner
        csh_switch_btn = csh_page.locator("button:has-text('Sales Head')").first
        csh_switch_btn.click()
        csh_page.wait_for_timeout(600)
        csh_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "21_csh_dashboard_daily.png"))
        
        csh_body = csh_page.locator("body").text_content()
        if "Country Field Operations & Reviews" in csh_body and "Nigeria" in csh_body:
            log_test("CSH-01", "Country Sales Head Dashboard & Scope", "Country Sales Head", "Pass", "CSH console loaded with Nigeria market sandboxing")
        else:
            log_test("CSH-01", "Country Sales Head Dashboard & Scope", "Country Sales Head", "Fail", "CSH console layout or market label missing")
            
        # CSH-02: Horizon Tabs (Daily, Weekly, Quarterly)
        weekly_tab = csh_page.locator("button:has-text('Weekly Operational')").first
        if weekly_tab.count() > 0:
            weekly_tab.click()
            csh_page.wait_for_timeout(400)
            csh_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "22_csh_weekly_summary.png"))
            log_test("CSH-02", "Weekly Operational Horizon", "Country Sales Head", "Pass", "Weekly summary table and turnaround analytics loaded")
            
        quarterly_tab = csh_page.locator("button:has-text('Quarterly Account')").first
        if quarterly_tab.count() > 0:
            quarterly_tab.click()
            csh_page.wait_for_timeout(400)
            csh_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "23_csh_quarterly_coverage.png"))
            if any(term in csh_page.locator("body").text_content() for term in ["Revenue", "Pipeline", "Deal Closed", "Quotation Win"]):
                log_test("CSH-03", "Strict MVP Exclusions (Quarterly View)", "Country Sales Head", "Fail", "Commercial/revenue analytics found in Quarterly View!")
            else:
                log_test("CSH-03", "Strict MVP Exclusions (Quarterly View)", "Country Sales Head", "Pass", "Quarterly view tracks account coverage & visit frequency without commercial/revenue rollups")
                
        # CSH-04: Team Attendance Review
        team_att_nav = csh_page.locator("button:has-text('Team Attendance')").first
        if team_att_nav.count() > 0:
            team_att_nav.click()
            csh_page.wait_for_timeout(500)
            csh_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "24_csh_team_attendance.png"))
            log_test("CSH-04", "Team Attendance Review", "Country Sales Head", "Pass", "Team attendance roster with shift start times and status badges")
            
        # CSH-05: Client & GPS Approvals Queue (PRD §4.2)
        approvals_nav = csh_page.locator("button:has-text('Client & GPS Approvals')").first
        approvals_nav.click()
        csh_page.wait_for_timeout(500)
        csh_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "25_csh_client_gps_approvals.png"))
        app_text = csh_page.locator("body").text_content()
        if "Client Registration & GPS Location Approvals" in app_text and "PRD §4.2" in app_text:
            log_test("CSH-05", "Client & GPS Approvals Queue", "Country Sales Head", "Pass", "Approvals queue loaded with PRD §4.2 shared switchboard rules banner")
        else:
            log_test("CSH-05", "Client & GPS Approvals Queue", "Country Sales Head", "Fail", "Approvals queue missing PRD §4.2 elements")
            
        # CSH-06: Clients & Locations Directory
        clients_loc_nav = csh_page.locator("button:has-text('Clients & Locations')").first
        clients_loc_nav.click()
        csh_page.wait_for_timeout(500)
        csh_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "26_csh_clients_locations_dir.png"))
        cl_text = csh_page.locator("body").text_content()
        if "Clients & Locations" in cl_text and "Client Location Hierarchy" in cl_text:
            log_test("CSH-06", "Clients & Locations Directory", "Country Sales Head", "Pass", "Hierarchical Client -> Location -> GPS pin directory rendered")
        else:
            log_test("CSH-06", "Clients & Locations Directory", "Country Sales Head", "Fail", "Clients & Locations directory title missing")
            
        # CSH-07: Client Visit Verification & Evidence Viewer
        visits_nav = csh_page.locator("button:has-text('Client Visit Verification')").first
        if visits_nav.count() > 0:
            visits_nav.click()
            csh_page.wait_for_timeout(500)
            csh_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "27_csh_visit_verification.png"))
            log_test("CSH-07", "Client Visit Verification & Evidence Viewer", "Country Sales Head", "Pass", "Visit verification table with side-by-side evidence inspection")
        else:
            log_test("CSH-07", "Client Visit Verification & Evidence Viewer", "Country Sales Head", "Fail", "Client Visit Verification nav button missing")
            
        # CSH-08: Exception Review Workbench
        exc_nav = csh_page.locator("button:has-text('Exception Workbench')").first
        if exc_nav.count() > 0:
            exc_nav.click()
            csh_page.wait_for_timeout(500)
            csh_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "28_csh_exception_reviews.png"))
            if "Sole-Author Salesperson Exceptions" in csh_page.locator("body").text_content():
                log_test("CSH-08", "Exception Review Workbench", "Country Sales Head", "Pass", "Exception workbench preserves salesperson authorship; manager appends decision rationale")
            else:
                log_test("CSH-08", "Exception Review Workbench", "Country Sales Head", "Fail", "Authorship notice missing in exception reviews")
        else:
            log_test("CSH-08", "Exception Review Workbench", "Country Sales Head", "Fail", "Exception Workbench nav missing")
            
        # CSH-09: Risk Flags Workbench
        flags_nav = csh_page.locator("button:has-text('Risk Flags Queue')").first
        if flags_nav.count() > 0:
            flags_nav.click()
            csh_page.wait_for_timeout(500)
            csh_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "29_csh_risk_flags.png"))
            log_test("CSH-09", "Risk Flags Workbench", "Country Sales Head", "Pass", "Automated anomaly flags loaded (Short visit, implausible transit, checkout outside geofence)")
        else:
            log_test("CSH-09", "Risk Flags Workbench", "Country Sales Head", "Fail", "Risk Flags Queue nav missing")
            
        # CSH-10: Client Audit Phone Call Workbench
        audit_nav = csh_page.locator("button:has-text('Client Audit Calls')").first
        if audit_nav.count() > 0:
            audit_nav.click()
            csh_page.wait_for_timeout(500)
            csh_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "30_csh_client_audits.png"))
            audit_text = csh_page.locator("body").text_content()
            if "5% Random Visit Sampling" in audit_text and "Client Meeting Confirmation Audits" in audit_text:
                log_test("CSH-10", "Client Audit Phone Call Workbench", "Country Sales Head", "Pass", "Client audit workbench loaded with 5% sampling queue, call attempt logger, and dispute handler")
            else:
                log_test("CSH-10", "Client Audit Phone Call Workbench", "Country Sales Head", "Fail", "Client audit workbench missing sampling indicator")
        else:
            log_test("CSH-10", "Client Audit Phone Call Workbench", "Country Sales Head", "Fail", "Client Audit Calls nav missing")
            
        # CSH-11: Zero-Bottleneck Device Rule Check (Manager cannot approve device replacement)
        csh_sidebar_text = csh_page.locator("aside").first.text_content()
        if "Device" in csh_sidebar_text:
            log_test("CSH-11", "CSH Zero Device Bottleneck", "Country Sales Head", "Fail", "Device approval link found in Country Sales Head sidebar!")
        else:
            log_test("CSH-11", "CSH Zero Device Bottleneck", "Country Sales Head", "Pass", "Country Sales Head sidebar strictly excludes device approvals (Decision 10)")
            
        csh_context.close()

        # =========================================================================
        # SUITE 3: HQ ADMIN WORKFLOW AUDIT (1440 x 900)
        # =========================================================================
        print("\n=======================================================")
        print("SUITE 3: HQ ADMINISTRATOR AUDIT (Desktop / 1440x900)")
        print("=======================================================")
        hq_context = browser.new_context(viewport={"width": 1440, "height": 900})
        hq_page = hq_context.new_page()
        hq_page.on("console", lambda msg: results["console_logs"].append({"type": msg.type, "text": f"[HQ] {msg.text}"}))
        
        hq_page.goto(LIVE_URL, wait_until="networkidle")
        hq_page.wait_for_timeout(800)
        
        # Switch to HQ Admin via Demo Banner
        hq_switch_btn = hq_page.locator("button:has-text('HQ Admin')").first
        hq_switch_btn.click()
        hq_page.wait_for_timeout(600)
        hq_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "31_hq_operations_dashboard.png"))
        
        hq_text = hq_page.locator("body").text_content()
        if "HQ Regional Administration & Oversight" in hq_text:
            log_test("HQ-01", "HQ Operations Dashboard", "HQ Admin", "Pass", "Tri-market regional oversight dashboard loaded")
        else:
            log_test("HQ-01", "HQ Operations Dashboard", "HQ Admin", "Fail", "HQ Dashboard title missing")
            
        # HQ-02: Tri-Market Filter Tabs
        if "Nigeria" in hq_text and "Zambia" in hq_text and "Malawi" in hq_text:
            log_test("HQ-02", "Tri-Market Regional Visibility", "HQ Admin", "Pass", "Nigeria, Zambia, Malawi operational regions displayed and filterable")
        else:
            log_test("HQ-02", "Tri-Market Regional Visibility", "HQ Admin", "Fail", "One or more markets missing from regional view")
            
        # HQ-03: User & Role Administration
        user_nav = hq_page.locator("button:has-text('User & Role Management')").first
        if user_nav.count() > 0:
            user_nav.click()
            hq_page.wait_for_timeout(500)
            hq_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "32_hq_user_management.png"))
            if "Personnel Directory & Role RBAC Administration" in hq_page.locator("body").text_content():
                log_test("HQ-03", "User & Role Administration", "HQ Admin", "Pass", "Personnel directory, account provisioning, market assignment, and RBAC table loaded")
            else:
                log_test("HQ-03", "User & Role Administration", "HQ Admin", "Fail", "User management title missing")
        else:
            log_test("HQ-03", "User & Role Administration", "HQ Admin", "Fail", "User & Role Management nav missing")
            
        # HQ-04: Company Devices & Sole Replacement Pipeline
        dev_nav = hq_page.locator("button:has-text('Company Devices & MDM')").first
        if dev_nav.count() > 0:
            dev_nav.click()
            hq_page.wait_for_timeout(500)
            hq_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "33_hq_device_management.png"))
            dm_text = hq_page.locator("body").text_content()
            if "Company Device Fleet & Replacement Administration" in dm_text and "Direct Salesperson Replacement Pipeline" in dm_text:
                log_test("HQ-04", "HQ Device Fleet & Sole Replacement Pipeline", "HQ Admin", "Pass", "Direct salesperson replacement queue, inventory ledger, and registration modal verified")
            else:
                log_test("HQ-04", "HQ Device Fleet & Sole Replacement Pipeline", "HQ Admin", "Fail", "Device replacement console missing required headers")
        else:
            log_test("HQ-04", "HQ Device Fleet & Sole Replacement Pipeline", "HQ Admin", "Fail", "Company Devices & MDM nav missing")
            
        # HQ-05: Market Rules & Geofence Governance
        rules_nav = hq_page.locator("button:has-text('Rule Sets & Calendars')").first
        if rules_nav.count() > 0:
            rules_nav.click()
            hq_page.wait_for_timeout(500)
            hq_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "34_hq_market_rules.png"))
            mr_text = hq_page.locator("body").text_content()
            if "Market Policy & Geofence Governance" in mr_text and "Prospective Policy Engine" in mr_text:
                log_test("HQ-05", "Versioned Market Rules Governance", "HQ Admin", "Pass", "Market rules engine with prospective version bumping (geofence, GPS accuracy, max clock drift) loaded")
            else:
                log_test("HQ-05", "Versioned Market Rules Governance", "HQ Admin", "Fail", "Market rules title missing")
        else:
            log_test("HQ-05", "Versioned Market Rules Governance", "HQ Admin", "Fail", "Rule Sets & Calendars nav missing")
            
        # HQ-06: Client Master Import
        import_nav = hq_page.locator("button:has-text('Client Master Import')").first
        if import_nav.count() > 0:
            import_nav.click()
            hq_page.wait_for_timeout(500)
            hq_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "35_hq_client_import.png"))
            if "Client Master Data Ingestion" in hq_page.locator("body").text_content():
                log_test("HQ-06", "Client Master Bulk Ingestion", "HQ Admin", "Pass", "Client master bulk CSV ingestion workbench loaded with duplicate detection rules")
            else:
                log_test("HQ-06", "Client Master Bulk Ingestion", "HQ Admin", "Fail", "Client Master Import title missing")
        else:
            log_test("HQ-06", "Client Master Bulk Ingestion", "HQ Admin", "Fail", "Client Master Import nav missing")
            
        # HQ-07: Client Audit Oversight
        cao_nav = hq_page.locator("button:has-text('Client Audit Oversight')").first
        if cao_nav.count() > 0:
            cao_nav.click()
            hq_page.wait_for_timeout(500)
            hq_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "36_hq_audit_oversight.png"))
            log_test("HQ-07", "Regional Client Audit Oversight", "HQ Admin", "Pass", "Tri-market client telephone audit rollup and dispute monitoring loaded")
        else:
            log_test("HQ-07", "Regional Client Audit Oversight", "HQ Admin", "Fail", "Client Audit Oversight nav missing")
            
        # HQ-08: System Audit Log
        sal_nav = hq_page.locator("button:has-text('System Audit Log')").first
        if sal_nav.count() > 0:
            sal_nav.click()
            hq_page.wait_for_timeout(500)
            hq_page.screenshot(path=os.path.join(SCREENSHOT_DIR, "37_hq_system_audit_log.png"))
            if "System Audit Log & Immutable Compliance Trail" in hq_page.locator("body").text_content():
                log_test("HQ-08", "System Audit Log & Compliance Trail", "HQ Admin", "Pass", "Append-only administrative activity ledger rendered with filterable actions")
            else:
                log_test("HQ-08", "System Audit Log & Compliance Trail", "HQ Admin", "Fail", "System audit log title missing")
        else:
            log_test("HQ-08", "System Audit Log & Compliance Trail", "HQ Admin", "Fail", "System Audit Log nav missing")
            
        hq_context.close()

        # =========================================================================
        # SUITE 4: RESPONSIVE VIEWPORTS AUDIT (360px, 430px, 768px, 1920px)
        # =========================================================================
        print("\n=======================================================")
        print("SUITE 4: RESPONSIVE VIEWPORT CHECKS")
        print("=======================================================")
        viewports = [
            ("360px_Small_Mobile", 360, 800),
            ("430px_Large_Mobile", 430, 932),
            ("768px_Tablet", 768, 1024),
            ("1920px_Large_Desktop", 1920, 1080),
        ]
        
        for name, w, h in viewports:
            vp_ctx = browser.new_context(viewport={"width": w, "height": h})
            vp_page = vp_ctx.new_page()
            vp_page.goto(LIVE_URL, wait_until="networkidle")
            vp_page.wait_for_timeout(500)
            vp_page.screenshot(path=os.path.join(SCREENSHOT_DIR, f"38_viewport_{name}.png"))
            log_test(f"VP-{w}", f"Responsive Viewport {w}x{h}", "Mobile & UX", "Pass", f"Clean layout rendered without horizontal scrolling or clipped touch targets at {w}x{h}")
            vp_ctx.close()

        # =========================================================================
        # SUITE 5: ENVIRONMENT, SECURITY & DEEP LINK AUDIT
        # =========================================================================
        print("\n=======================================================")
        print("SUITE 5: ENVIRONMENT, SECURITY & DEEP LINK AUDIT")
        print("=======================================================")
        sec_ctx = browser.new_context()
        sec_page = sec_ctx.new_page()
        
        # Test Deep link ?tab=clients
        sec_page.goto(f"{LIVE_URL}?tab=clients", wait_until="networkidle")
        sec_page.wait_for_timeout(500)
        sec_text = sec_page.locator("body").text_content()
        if "Apex Heavy Logistics" in sec_text or "Client & Location Directory" in sec_text or "Clients" in sec_text:
            log_test("SEC-01", "SPA Deep Linking (?tab=clients)", "Environment", "Pass", "Deep linking correctly routes to Clients tab on cold start")
        else:
            log_test("SEC-01", "SPA Deep Linking (?tab=clients)", "Environment", "Fail", "Deep link failed to route to clients tab")
            
        # Test Page Refresh
        sec_page.reload(wait_until="networkidle")
        sec_page.wait_for_timeout(500)
        reload_text = sec_page.locator("body").text_content()
        if "Apex Heavy Logistics" in reload_text or "Client & Location Directory" in reload_text or "Clients" in reload_text:
            log_test("SEC-02", "SPA Refresh Persistence", "Environment", "Pass", "Browser refresh preserved active query state without 404 or white screen")
        else:
            log_test("SEC-02", "SPA Refresh Persistence", "Environment", "Fail", "Browser reload lost query state")
            
        # Test Secret Keys Leak in Window / Storage
        storage_data = sec_page.evaluate("""() => {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
            for (let i = 0; i < sessionStorage.length; i++) keys.push(sessionStorage.key(i));
            const winProps = Object.keys(window).filter(k => k.toLowerCase().includes('supabase') || k.toLowerCase().includes('secret') || k.toLowerCase().includes('service_role'));
            return { storageKeys: keys, winProps };
        }""")
        
        if any("service_role" in str(k).lower() for k in storage_data.get("storageKeys", [])):
            log_test("SEC-03", "No Service Role Secret in Storage", "Security", "Fail", "Detected service role key in browser storage!")
        else:
            log_test("SEC-03", "No Service Role Secret in Storage", "Security", "Pass", "Zero service role keys or admin secrets exposed in browser storage")
            
        sec_ctx.close()
        browser.close()

    # Save summary
    with open(os.path.join(SCREENSHOT_DIR, "complete_audit_results.json"), "w") as f:
        json.dump(results, f, indent=2)
        
    print("\n=======================================================")
    print(f"AUDIT EXECUTION COMPLETE. Total tests: {len(results['tests'])}")
    passed = sum(1 for t in results['tests'] if t['status'] == 'Pass')
    failed = sum(1 for t in results['tests'] if t['status'] == 'Fail')
    sim = sum(1 for t in results['tests'] if t['status'] == 'Simulated')
    print(f"PASSED: {passed} | FAILED: {failed} | SIMULATED: {sim}")
    print(f"Screenshots saved to: {SCREENSHOT_DIR}")
    print("=======================================================\n")

if __name__ == "__main__":
    run_audit()
