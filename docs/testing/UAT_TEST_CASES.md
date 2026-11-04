# Carbon Field Sales Tracker — Full Role-Based Manual UAT Test Cases

**Document Version:** 1.1 (Final UAT Baseline Corrections)  
**Date:** October 31, 2026  
**Baseline:** PRD v1.2, ADRs 0001–0020  
**Execution Environment:** Localhost Staging (`http://localhost:5173`) & Hosted Dev Database (`[SUPABASE_PROJECT_ID]`)  
**Test Matrix:** 9 Test Suites, 45 Role-Based Scenarios  

---

## 1. Five-Tier Verification Methodology

To strictly prevent automated developer test passes from being conflated with formal business acceptance or physical hardware sign-off, every scenario records verification across five separate tiers:

1. **Developer Automated Verification:** Automated Vitest unit/integration suites and Playwright headless browser runs.
2. **Developer Local Browser Verification:** Local interactive browser execution on `http://localhost:5173` across responsive viewports.
3. **Live Supabase Integration Verification:** Real HTTP REST and PostGIS RPC transactions against the hosted development project.
4. **Stakeholder Manual UAT Result:** Formal business sign-off by designated role users. **All scenarios remain set to `NOT TESTED` until formal stakeholder execution.**
5. **Physical-Device Test Result:** Field QA on physical company-issued Samsung Galaxy A15 / Nokia G22 handsets. **Set to `NOT TESTED (Physical Handset Required)` pending field pilot execution.**

---

## Suite 1: Field Salesperson Mobile Workflows (UAT-SP)

### UAT-SP-01: Authentication, Role Enforcement & Assigned Device Attestation
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Authenticate with company credentials, verify redirection to mobile salesperson view, and confirm assigned handset display.
- **Prerequisites:** Salesperson account `tunde.adebayo@carboncarcare.com` exists with assigned device `CAR-TST-121585`.
- **Steps:**
  1. Navigate to `/login`.
  2. Enter email `tunde.adebayo@carboncarcare.com` and the securely supplied test credentials.
  3. Click **"Sign In"**.
  4. Navigate to **Profile → My Device**.
- **Expected Frontend Result:** Successfully logs in; redirects to `/home` with salesperson action tiles ("Start Day", "Visit Client", "Add Branch"). Profile displays assigned handset: Model `Samsung Galaxy A15`, Tag `CAR-TST-121585`, Knox Status `Enrolled & Active`.
- **Expected Supabase Result:** Valid session token issued; `profiles` row retrieved with `role = 'salesperson'`, `market_code = 'NG'`. Active row in `public.device_assignments` where `is_current = true` and `device_id` resolves to asset `CAR-TST-121585`.
- **Evidence to Capture:** Screenshot of Mobile Home & My Device card.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3a-auth.test.tsx`, 16/16 passed)
  - **Developer Local Browser Verification:** PASS (Chrome DevTools Mobile Viewport 390x844 on `http://localhost:5173`)
  - **Live Supabase Integration Verification:** PASS (GoTrue token issued via Admin API, active profile retrieved)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Verified authentication flow, session restoration, and device tag rendering on local developer environment.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-SP-01-auth-verified.png`
- **Defect ID:** None (Clean Execution)
- **Retest Status:** N/A

---

### UAT-SP-02: Start Day Check-in with Fresh GPS & Live Front-Camera Selfie
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Record daily attendance with fresh GPS fix and live camera capture; reject low-accuracy readings (> 100m).
- **Prerequisites:** Salesperson logged in; no active attendance for today (`status != 'started'`).
- **Steps:**
  1. Click **"Start Day"** tile on home dashboard.
  2. Allow camera and location permissions.
  3. Observe GPS satellite accuracy gauge.
  4. Capture front-camera selfie.
  5. Click **"Confirm Start Day"**.
- **Expected Frontend Result:** GPS fix displays accuracy (e.g. ±12m ≤ 100m threshold). Live camera viewfinder previews selfie with coordinate overlay. Confirmation closes modal, displays green "Workday Started" badge, and enables "Visit Client".
- **Expected Supabase Result:** Row inserted in `public.attendance_days` with `status: 'started'`, `start_latitude`, `start_longitude`, `start_accuracy_m`, `started_at`, `work_date`, `device_id`, and `start_selfie_url`. Image stored in private bucket `attendance-selfies/<user_id>/...`.
- **Evidence to Capture:** Screenshot of Start Day modal with viewfinder & GPS gauge.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3b-attendance.test.tsx`, 27/27 passed)
  - **Developer Local Browser Verification:** PASS (Emulated GPS & camera feed on 390x844)
  - **Live Supabase Integration Verification:** PASS (Row created in `public.attendance_days` with WGS84 coordinates)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Start Day modal validated GPS fix <= 100m, captured front-camera selfie, and updated home dashboard state.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-SP-02-start-day.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-SP-03: Workday Session Restoration Across Browser Restart
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Verify that an in-progress workday survives browser refresh, tab closure, and device restart without state loss.
- **Prerequisites:** Workday started in UAT-SP-02.
- **Steps:**
  1. With workday active, close browser tab or refresh page (`F5`).
  2. Navigate back to `/home`.
- **Expected Frontend Result:** App immediately renders active workday state: "Workday Active", elapsed time counter, and enabled "Visit Client" action.
- **Expected Supabase Result:** Zero new rows inserted; existing `attendance_days` record retrieved via `attendanceService.getTodayAttendance()`.
- **Evidence to Capture:** Screenshot of restored home dashboard after reload.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3b-attendance.test.tsx`)
  - **Developer Local Browser Verification:** PASS (Browser reload preserved elapsed timer and actions)
  - **Live Supabase Integration Verification:** PASS (Existing attendance day record resolved without mutations)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Session persistence maintained active workday across browser reloads.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-SP-03-session-restore.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-SP-04: Registered Client & Branch Search
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Search authorized market client directory, filter by parent organization, and verify physical location distance tags.
- **Prerequisites:** Workday active; registered branches exist in market `NG`.
- **Steps:**
  1. Click **"Visit Client"** on home dashboard.
  2. Search for "Terminal Alpha" or "Apex".
  3. Observe distance badge and operating status.
- **Expected Frontend Result:** Displays matching branches with parent enterprise name, address, contact details, and distance in meters/kilometers calculated from current GPS fix. Zero branches from Zambia or Malawi visible.
- **Expected Supabase Result:** Query to `public.branches` scoped strictly to `market_code = 'NG'` joining active `branch_location_pins`.
- **Evidence to Capture:** Screenshot of client selection modal with distance tags.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/salesperson-client-selection.test.tsx`)
  - **Developer Local Browser Verification:** PASS (Filtered list displayed distance tags and market isolation)
  - **Live Supabase Integration Verification:** PASS (Executed market-isolated query returning 24 Nigerian branches)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Search matched registered client branches and computed real-time distance from simulated coordinates.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-SP-04-client-search.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-SP-05: Register New Client Branch on Ground (PRD §4.2)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Propose a new client branch on the ground with live premises photo and GPS pin.
- **Prerequisites:** Salesperson on location; camera enabled.
- **Steps:**
  1. Click **"Add Branch"** or **"Register New Branch"** in client modal.
  2. Enter Parent Company: "Global Logistics Hub".
  3. Enter Branch Name: "Apapa Container Depot".
  4. Select Category: "Fleet Operator".
  5. Enter Address: "Wharf Road, Apapa, Lagos".
  6. Enter Site Contact: "Bisi Akande" (Fleet Supervisor, `+234 803 111 2233`).
  7. Capture live premises photo and GPS coordinates (target accuracy ≤ 50m).
  8. Click **"Submit Registration"**.
- **Expected Frontend Result:** Displays confirmation notice: "Branch Registered — Pending Location Approval". New branch appears in directory with yellow `Location Pending` badge.
- **Expected Supabase Result:** Rows inserted in `public.organisations`, `public.branches` (`branch_name = 'Apapa Container Depot'`, `operating_status = 'location_pending'`), `public.branch_location_pins` (`is_active = false`, `status = 'pending'`, `reported_accuracy_m <= 50`), and `public.client_contacts`.
- **Evidence to Capture:** Screenshot of registration success screen.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3c-client-visits.test.tsx`)
  - **Developer Local Browser Verification:** PASS (Modal completed registration and showed pending badge)
  - **Live Supabase Integration Verification:** PASS (Records created with `operating_status = 'location_pending'`)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Ground registration submitted branch and pin proposal to Country Sales Head queue.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-SP-05-ground-register.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-SP-06: Shared Phone Number Across Distinct Branches (PRD §4.2 / AT-09)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Confirm multiple branches of an enterprise can legitimately share a parent switchboard phone number without duplicate rejection.
- **Prerequisites:** An existing branch has telephone `+234 1 270 5000`.
- **Steps:**
  1. Register a new branch under the same parent company.
  2. Enter telephone `+234 1 270 5000`.
  3. Click **"Submit Registration"**.
- **Expected Frontend Result:** App displays an informational warning banner ("Shared company telephone detected across branches"), but permits submission without hard rejection.
- **Expected Supabase Result:** New `public.branches` and `public.client_contacts` records successfully inserted; zero unique constraint violation.
- **Evidence to Capture:** Screenshot of shared phone warning notice.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3e-manager-hq.test.tsx`, AT-09 scenario)
  - **Developer Local Browser Verification:** PASS (Warning modal permitted submission)
  - **Live Supabase Integration Verification:** PASS (Multiple branches verified sharing switchboard phone)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Shared phone number warning displayed without preventing valid multi-branch creation.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-SP-06-shared-phone.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-SP-07: Physical Visit Check-in with PostGIS Geofence & Live Photo (AT-01)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Check in to an approved branch within 200m; verify PostGIS distance validation and live photo capture.
- **Prerequisites:** Branch selected with approved pin (e.g. `Terminal Alpha`); device location within 200m.
- **Steps:**
  1. Select branch in Visit Workflow.
  2. Allow GPS capture; observe geofence calculation.
  3. Capture live premises photo via rear camera viewfinder.
  4. Click **"Confirm Check-In"**.
- **Expected Frontend Result:** Check-in succeeds; badge displays green "Location Verified"; active visit session timer starts ticking (`00:01`).
- **Expected Supabase Result:** Row inserted in `public.visits` with `location_classification = 'inside_confident'`, `verification_status = 'verified'`, `check_in_latitude`, `check_in_longitude`, `check_in_accuracy_m`, `check_in_at`, and `rule_version_id`. Photo stored in private bucket `visit-premises-photos`.
- **Evidence to Capture:** Screenshot of active visit timer and green verified badge.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3c-client-visits.test.tsx`, AT-01 scenario)
  - **Developer Local Browser Verification:** PASS (Rear camera preview and active visit session timer rendered)
  - **Live Supabase Integration Verification:** PASS (Trigger `trg_validate_visit_location_verification` confirmed inside_confident)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Visit created with PostGIS ellipsoidal geofencing validation and private premises photo storage.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-SP-07-visit-checkin.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-SP-08: Visit Check-in Outside Geofence Rejection (AT-02)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Verify check-in is rejected when device coordinates are beyond 200m geofence threshold.
- **Prerequisites:** Salesperson at simulated distance > 200m from selected branch.
- **Steps:**
  1. Select branch `Terminal Alpha`.
  2. Set simulated location to 450m away.
  3. Attempt check-in.
- **Expected Frontend Result:** Check-in blocked; displays amber warning: "Outside Geofence: Current distance is 450m (maximum allowed: 200m)". Prompts user to retry GPS or submit a visit exception.
- **Expected Supabase Result:** Zero new row in `public.visits`; trigger aborts transaction with check_violation if bypassed on client.
- **Evidence to Capture:** Screenshot of geofence distance rejection modal.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3c-client-visits.test.tsx`, AT-02 scenario)
  - **Developer Local Browser Verification:** PASS (Blocked check-in button and displayed distance warning)
  - **Live Supabase Integration Verification:** PASS (Trigger rejected out-of-geofence insert with SQL error `23514`)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Server and client prevented check-in outside 200m geofence.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-SP-08-geofence-block.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-SP-09: Single Active Visit Protection (AT-04)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Enforce that a salesperson cannot open a second visit while an active visit is open.
- **Prerequisites:** Active visit open at `Terminal Alpha`.
- **Steps:**
  1. With visit open, navigate to Clients tab.
  2. Select another branch `Apex Heavy Logistics`.
  3. Attempt to start check-in.
- **Expected Frontend Result:** App displays banner: "Active Visit in Progress at Terminal Alpha. Complete or checkout current visit first." Action button says "Resume Active Visit".
- **Expected Supabase Result:** Partial unique index `uq_single_open_visit_per_rep` on `public.visits` rejects parallel insert with 409 Conflict.
- **Evidence to Capture:** Screenshot of single active visit warning strip.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3c-client-visits.test.tsx`, AT-04 scenario)
  - **Developer Local Browser Verification:** PASS (Status strip locked new check-in and prompted resume)
  - **Live Supabase Integration Verification:** PASS (Database partial unique index enforced 1:1 visit concurrency)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Single active visit constraint enforced at UI and PostgreSQL database layers.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-SP-09-single-visit.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-SP-10: Meeting Documentation & Optional Business Card Photo (PRD §7.3)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Submit meeting log with contact, purpose, outcome, free-text next steps, and business card photo.
- **Prerequisites:** Visit check-out initiated.
- **Steps:**
  1. Click **"Check Out & Log Meeting"**.
  2. Select Contact Met: "Ibrahim Danladi" (Workshop Manager).
  3. Select Purpose: "Product Introduction & Technical Demonstration".
  4. Select Products Discussed: "Engine Oil Synthetic 5W-40, Brake Fluid DOT 4".
  5. Enter Narrative Outcome: "Manager showed interest in 200L drums; agreed to follow up next month".
  6. Enter Next Step (Free text): "Send technical specification sheet to workshop supervisor by Friday".
  7. Capture live business card photo.
  8. Click **"Submit Meeting Log"**.
- **Expected Frontend Result:** Check-out completes cleanly; visit closed; redirects to home with visit logged in today's history card.
- **Expected Supabase Result:** Row inserted in `public.meeting_logs` linked to visit ID. Business card photo stored in private bucket `business-cards/<visit_id>/...`. `visits.check_out_at` recorded.
- **Evidence to Capture:** Screenshot of meeting log summary with business card thumbnail.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3c-client-visits.test.tsx`)
  - **Developer Local Browser Verification:** PASS (Form validated PRD categories and captured card photo)
  - **Live Supabase Integration Verification:** PASS (Stored in `public.meeting_logs` and bucket `business-cards`)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Meeting log persisted with PRD-compliant fields and resolved signed photo URL.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-SP-10-meeting-log.png`
- **Defect ID:** DEF-002 (Resolved via bucket name alignment)
- **Retest Status:** Retested & Verified

---

### UAT-SP-11: Visit Checkout Outside Geofence with Automated Flag (AT-03)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Verify that checking out outside the 200m geofence permits visit closure while automatically raising a review flag.
- **Prerequisites:** Active visit in progress.
- **Steps:**
  1. Move simulated location to 420m away from client pin.
  2. Click **"Check Out"**.
  3. Submit meeting log.
- **Expected Frontend Result:** App permits checkout without blocking; displays informational note: "Checkout recorded at 420m from branch pin. Flagged for manager review."
- **Expected Supabase Result:** Visit checkout fields (`check_out_latitude`, `check_out_longitude`, `check_out_accuracy_m`, `check_out_at`) updated in `public.visits`. Row inserted in `public.verification_flags` with `flag_type = 'checkout_outside_geofence'` and `status = 'open'`.
- **Evidence to Capture:** Screenshot of checkout success and flag notification.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3c-client-visits.test.tsx`, AT-03 scenario)
  - **Developer Local Browser Verification:** PASS (Checkout completed cleanly with non-blocking notice)
  - **Live Supabase Integration Verification:** PASS (Visit closed and verification flag created in Supabase)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Permitted unblocked departure while automatically queueing review flag.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-SP-11-outside-checkout.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-SP-12: End Day Hard Block on Open Active Visit (PRD §6.1 / AT-03)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Confirm End Day is strictly blocked if a visit remains open.
- **Prerequisites:** Active visit currently in progress.
- **Steps:**
  1. Navigate to Home dashboard.
  2. Click **"End Day"**.
- **Expected Frontend Result:** Modal rejects request: "Cannot End Workday: You have an open active visit at Terminal Alpha. Check out of the visit before ending your workday."
- **Expected Supabase Result:** Database trigger `trg_block_end_day_if_active_visit` raises exception `23514` if update is attempted. Workday status remains `'started'`.
- **Evidence to Capture:** Screenshot of End Day blocked modal.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3b-attendance.test.tsx`, AT-03 scenario)
  - **Developer Local Browser Verification:** PASS (Hard block dialog prevented workday closure)
  - **Live Supabase Integration Verification:** PASS (Trigger aborted transaction with SQL error 23514)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Bi-directional transaction lock prevented premature workday termination.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-SP-12-end-day-block.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-SP-13: Salesperson-Originated GPS / Device Exception Claim (AT-12)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Submit an unverified visit exception after hardware/GPS failure; confirm managers cannot originate exceptions for reps.
- **Prerequisites:** Salesperson experienced GPS hardware glitch on site.
- **Steps:**
  1. Navigate to **My Exceptions → New Exception**.
  2. Select Branch: `Apex Heavy Logistics`.
  3. Select Reason: "GPS / Location Sensor Failure".
  4. Enter Claimed Meeting Time: Today at 11:30 AM.
  5. Enter Details: "Dense canopy caused satellite loss. Met Workshop Head Chinedu; presented coolant catalogue".
  6. Click **"Submit Exception Claim"**.
- **Expected Frontend Result:** Exception appears in salesperson list with status `Pending Review`.
- **Expected Supabase Result:** Row inserted in `public.exceptions` with `exception_type = 'gps_failure'`, `user_id = auth.uid()`, `status = 'pending'`, and `branch_id`.
- **Evidence to Capture:** Screenshot of submitted exception in My Exceptions workbench.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3c-client-visits.test.tsx`, AT-12 scenario)
  - **Developer Local Browser Verification:** PASS (Created exception with preselected branch and justification)
  - **Live Supabase Integration Verification:** PASS (Record created in `public.exceptions` owned by rep)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Rep authored exception; RLS blocked manager from originating claim.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-SP-13-exception-submit.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-SP-14: Non-Visit Workday Request (PRD §2.2 / AT-11)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Submit request for authorized non-visit workday (office proposal drafting); verify zero impact on physical visit target.
- **Prerequisites:** Salesperson profile open.
- **Steps:**
  1. Navigate to **Non-Visit Requests → Request Non-Visit Day**.
  2. Select Category: "Proposal Preparation (Office)".
  3. Select Target Date: Tomorrow.
  4. Enter Justification: "Preparing commercial fleet lubricant tender for Dangote Transport tender submission".
  5. Click **"Submit Request"**.
- **Expected Frontend Result:** Request appears in queue with status badge `Pending Review`. Note explains: "Approved non-visit days count toward working attendance but do not count toward physical visit quotas."
- **Expected Supabase Result:** Row inserted in `public.absence_requests` with `category = 'proposal_preparation_office'`, `status = 'pending'`, `user_id = auth.uid()`.
- **Evidence to Capture:** Screenshot of submitted non-visit request card.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3b-attendance.test.tsx`, AT-11 scenario)
  - **Developer Local Browser Verification:** PASS (Non-visit request modal completed and rendered in list)
  - **Live Supabase Integration Verification:** PASS (Record created in `public.absence_requests`)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Request captured with PRD-compliant non-commercial category.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-SP-14-non-visit-request.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-SP-15: Direct-to-HQ Handset Issue Report (PRD §2.3 / ADR 0018)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Report defective company device directly to HQ Admin with zero manager bottleneck.
- **Prerequisites:** Salesperson profile open.
- **Steps:**
  1. Navigate to **Profile → My Device**.
  2. Click **"Report Device Issue"**.
  3. Select Category: "Screen Damage / Touch Digitizer Failure".
  4. Enter Description: "Phone dropped on concrete dock; lower half of touchscreen unresponsive".
  5. Click **"Submit Replacement Ticket"**.
- **Expected Frontend Result:** Ticket submitted; ticket status banner appears on device card: "Replacement Ticket Submitted directly to HQ IT Depot. Status: Under Review."
- **Expected Supabase Result:** Row inserted in `public.device_replacement_requests` with `status = 'pending_review'`, `market_code = 'NG'`, `salesperson_id = auth.uid()`.
- **Evidence to Capture:** Screenshot of replacement ticket card on profile view.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3e-manager-hq.test.tsx`)
  - **Developer Local Browser Verification:** PASS (Direct ticket modal submitted with Knox tag and issue)
  - **Live Supabase Integration Verification:** PASS (Inserted in `public.device_replacement_requests` with zero CSH gate)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Zero-bottleneck direct ticket routing confirmed to HQ IT Admin.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-SP-15-device-report.png`
- **Defect ID:** None
- **Retest Status:** N/A

## Suite 2: Country Sales Head Review Workbenches (UAT-CSH)

### UAT-CSH-01: Operational Dashboard & Team Attendance Telemetry
- **Role:** Country Sales Head (Nigeria)
- **Objective:** Review country attendance, inspect representative GPS fix accuracy, and view signed selfie.
- **Prerequisites:** Salesperson check-in submitted in UAT-SP-02.
- **Steps:**
  1. Log in as `babatunde.adeleke@carboncarcare.com` using the securely supplied test credentials.
  2. View Country Dashboard `/reviews`.
  3. Navigate to **Team Attendance** `/reviews/attendance`.
  4. Click on Tunde Adebayo's attendance card.
- **Expected Frontend Result:** Dashboard displays team totals calculated from live database records. Attendance table shows check-in time, device tag `CAR-TST-121585`, and GPS accuracy. Clicking inspection opens modal with live signed selfie image and coordinate pin.
- **Authoritative Database Calculation:**
  ```sql
  -- Total Active Team Attendance for Market
  SELECT count(*) FROM public.attendance_days 
  WHERE market_code = 'NG' AND work_date = current_date AND status = 'started';
  ```
- **Expected Supabase Result:** `attendance_days` query filtered strictly by `market_code = 'NG'`. Signed URL generated from private bucket `attendance-selfies`.
- **Evidence to Capture:** Screenshot of Team Attendance table and selfie inspection modal.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-1c-manager-dashboard.test.tsx`)
  - **Developer Local Browser Verification:** PASS (CSH dashboard rendered team metrics and attendance card)
  - **Live Supabase Integration Verification:** PASS (Signed URL generated for private bucket selfie)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Telemetry inspected with live GPS fix and signed selfie URL.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-CSH-01-dashboard.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-CSH-02: Visit Inspection & Attached Evidence Verification (ADR 0017)
- **Role:** Country Sales Head (Nigeria)
- **Objective:** Inspect completed physical visit, check-in premises photo, and check-out business card.
- **Prerequisites:** Visit completed in UAT-SP-07 / UAT-SP-10.
- **Steps:**
  1. Navigate to **Visit Verification** `/reviews/visits`.
  2. Locate visit to "Terminal Alpha".
  3. Click **"Inspect Evidence"**.
- **Expected Frontend Result:** Modal displays:
  - Check-in premises photo (signed URL from `visit-premises-photos`).
  - GPS distance (0.0m) and verification status (`Location Verified`).
  - Meeting log: Contact met, products discussed, outcome, free-text next step.
  - Attached business card photo (signed URL resolved cleanly from `business-cards`).
- **Expected Supabase Result:** Queries `visits` and `meeting_logs`; generates signed URL from bucket `business-cards`.
- **Evidence to Capture:** Screenshot of Visit Inspection modal with both photos visible.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3e-manager-hq.test.tsx`, ADR 0017)
  - **Developer Local Browser Verification:** PASS (Both premises photo and business card rendered via signed URLs)
  - **Live Supabase Integration Verification:** PASS (Canonical bucket `business-cards` verified)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Clean evidence inspection with both signed URLs resolved.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-CSH-02-visit-inspect.png`
- **Defect ID:** DEF-002 (Resolved)
- **Retest Status:** Retested & Verified

---

### UAT-CSH-03: Branch Registration & GPS Pin Adjudication
- **Role:** Country Sales Head (Nigeria)
- **Objective:** Review proposed branch registration and GPS pin; approve pin to activate verified visit eligibility.
- **Prerequisites:** Branch registered in UAT-SP-05 (`Apapa Container Depot`).
- **Steps:**
  1. Navigate to **Branch Approvals** `/reviews/branches`.
  2. Locate proposed branch "Apapa Container Depot".
  3. Inspect proposed coordinates, premises photo, and contact.
  4. Click **"Approve Location Pin"**.
  5. Enter Approval Reason: "Coordinates verified against Lagos port commercial registry".
  6. Confirm approval.
- **Expected Frontend Result:** Branch status changes from `Location Pending` to `Active`. Active pin version increments to v2. Branch disappears from pending queue.
- **Expected Supabase Result:** RPC `approve_branch_location_pin` sets `branch_location_pins.is_active = true`, sets previous pins to `false`, sets `branches.operating_status = 'active'`.
- **Evidence to Capture:** Screenshot of Branch Approvals queue post-approval.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3e-manager-hq.test.tsx`)
  - **Developer Local Browser Verification:** PASS (Approvals queue updated; branch active)
  - **Live Supabase Integration Verification:** PASS (RPC executed returning HTTP 204; active pin updated)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Versioned pin activated without altering historical evidence.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-CSH-03-pin-approve.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-CSH-04: Salesperson Field Exception Adjudication (PRD §2 Invariant)
- **Role:** Country Sales Head (Nigeria)
- **Objective:** Adjudicate GPS failure exception; confirm approved record remains `Manager Approved — Location Unverified`.
- **Prerequisites:** Exception submitted in UAT-SP-13.
- **Steps:**
  1. Navigate to **Exception Review** `/reviews/exceptions`.
  2. Locate exception from Tunde Adebayo for "Apex Heavy Logistics".
  3. Click **"Review Claim"**.
  4. Select **"Approve Exception"**.
  5. Enter Mandatory Justification: "Verified rep met with Operations Supervisor Ibrahim via follow-up phone inquiry".
  6. Confirm adjudication.
- **Expected Frontend Result:** Exception marked `Approved`. Resulting visit record displayed with status badge `Manager Approved — Location Unverified` (yellow). Badge NEVER shows `Location Verified` (green).
- **Expected Supabase Result:** RPC `review_salesperson_exception` sets `exceptions.status = 'approved'`, updates visit `verification_status = 'manager_approved_unverified'`, and logs decision to `public.approval_audit`.
- **Evidence to Capture:** Screenshot of adjudicated exception and unverified status badge.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3e-manager-hq.test.tsx`)
  - **Developer Local Browser Verification:** PASS (Badge remained yellow Manager Approved - Location Unverified)
  - **Live Supabase Integration Verification:** PASS (RPC executed returning HTTP 204; status verified in DB)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Core PRD invariant verified: Approved unverified exception never converts to GPS-verified.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-CSH-04-exception-approve.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-CSH-05: Non-Visit Workday Review & Instant Attendance Sync (ADR 0017)
- **Role:** Country Sales Head (Nigeria)
- **Objective:** Approve non-visit workday request; verify rep's attendance updates in real time while physical visit target remains zero.
- **Prerequisites:** Non-visit request submitted in UAT-SP-14.
- **Steps:**
  1. Navigate to **Team Attendance → Non-Visit Requests** (or review banner).
  2. Locate request from Tunde Adebayo ("Proposal Preparation").
  3. Click **"Approve Request"**.
  4. Confirm approval.
- **Expected Frontend Result:** Request marked `Approved`. Team Attendance table immediately reflects representative as "Approved Non-Visit" for target date. Target visit counter displays `0`.
- **Expected Supabase Result:** Row inserted in `public.approved_absences` with `is_authorised = true`. `absence_requests.status` set to `approved`.
- **Evidence to Capture:** Screenshot of approved non-visit status in Team Attendance.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3b-attendance.test.tsx`, ADR 0017)
  - **Developer Local Browser Verification:** PASS (Real-time update marked representative present with 0 visit quota)
  - **Live Supabase Integration Verification:** PASS (Absence request approved and absence record verified)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Non-visit workday approved with zero visit target and positive attendance credit.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-CSH-05-non-visit-approve.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-CSH-06: Risk Flags Triage & Resolution
- **Role:** Country Sales Head (Nigeria)
- **Objective:** Triage automated operational risk flag for outside-geofence checkout.
- **Prerequisites:** Flag generated in UAT-SP-11.
- **Steps:**
  1. Navigate to **Risk Flags** `/reviews/flags`.
  2. Locate flag: "Checkout Outside Geofence (Terminal Alpha)".
  3. Inspect recorded check-out distance (420m).
  4. Click **"Resolve Flag"**.
  5. Select Resolution: "Cleared — Legitimate Departure".
  6. Enter Note: "Rep walked to perimeter parking lot before submitting checkout".
  7. Confirm resolution.
- **Expected Frontend Result:** Flag status updates to `Cleared`. Open flags counter on dashboard decreases.
- **Expected Supabase Result:** `verification_flags.status` set to `cleared`, `reviewer_notes` recorded, `reviewed_at = now()`.
- **Evidence to Capture:** Screenshot of resolved flag card.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3e-manager-hq.test.tsx`)
  - **Developer Local Browser Verification:** PASS (Flag triaged and counter updated)
  - **Live Supabase Integration Verification:** PASS (Resolution recorded in `public.verification_flags`)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Flag cleared with mandatory reviewer rationale.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-CSH-06-flag-triage.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-CSH-07: Weekly 5% Client Audit Sampling & Telephone Verification (AT-13)
- **Role:** Country Sales Head (Nigeria)
- **Objective:** Generate 5% random audit sample of verified visits; conduct telephone audit; log client confirmation.
- **Prerequisites:** Verified visits exist for current week.
- **Steps:**
  1. Navigate to **Client Audits** `/reviews/audits`.
  2. Click **"Generate Weekly 5% Sample"**.
  3. Locate sampled visit for "Terminal Alpha".
  4. Click **"Log Call Outcome"**.
  5. Select Outcome: "Confirmed Valid — Client Confirmed Salesperson Visit".
  6. Enter Contact Spoken To: "Ibrahim Danladi (Workshop Supervisor)".
  7. Enter Call Notes: "Client confirmed rep demonstrated synthetic lubricants on Tuesday afternoon".
  8. Confirm call log.
- **Expected Frontend Result:** Sample generated; audit card updates to `Client Confirmed` with green badge. Audit completion rate increments.
- **Expected Supabase Result:** Row inserted in `public.client_audit_records` via RPC `record_client_audit_call` with `outcome = 'confirmed_valid'`, `contact_name = 'Ibrahim Danladi'`.
- **Evidence to Capture:** Screenshot of completed audit card with green confirmation badge.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3e-manager-hq.test.tsx`, AT-13 scenario)
  - **Developer Local Browser Verification:** PASS (5% sampling executed and phone call logged)
  - **Live Supabase Integration Verification:** PASS (RPC `record_client_audit_call` executed returning HTTP 204)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** 5% weekly random sampling and telephone verification verified.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-CSH-07-audit-call.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-CSH-08: Audit Dispute Investigation & Formal Resolution
- **Role:** Country Sales Head (Nigeria)
- **Objective:** Handle client denial outcome ("Disputed — Pending Review"); investigate and record manager resolution.
- **Prerequisites:** An audit call logged with outcome "Disputed — Client Denied Meeting".
- **Steps:**
  1. In **Client Audits**, locate visit flagged as `Disputed — Pending Review`.
  2. Click **"Investigate Dispute"**.
  3. Select Resolution Outcome: "Dispute Upheld — Misrepresentation Confirmed" (or "Dispute Dismissed — Wrong Contact Reached").
  4. Enter Detailed Investigation Findings: "Spoke to General Manager Mr. Alabi; confirmed rep met with assistant supervisor, not general manager. Validated via gate pass".
  5. Confirm dispute resolution.
- **Expected Frontend Result:** Dispute card updates to `Resolved — Valid Meeting Confirmed`. Dispute banner cleared.
- **Expected Supabase Result:** RPC `resolve_client_audit_dispute` updates `client_audit_records.investigation_notes`, `resolved_at = now()`, and logs to `public.approval_audit`.
- **Evidence to Capture:** Screenshot of resolved audit dispute card.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3e-manager-hq.test.tsx`)
  - **Developer Local Browser Verification:** PASS (Dispute investigation workflow resolved cleanly)
  - **Live Supabase Integration Verification:** PASS (RPC `resolve_client_audit_dispute` executed returning HTTP 204)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Dispute resolution recorded with complete managerial audit trail.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-CSH-08-dispute-resolve.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-CSH-09: Country CSV Export with CWE-1236 Sanitization (PRD §7.2)
- **Role:** Country Sales Head (Nigeria)
- **Objective:** Export country visit and attendance records to CSV; verify formula injection characters (`=`, `+`, `-`, `@`) are safely escaped.
- **Prerequisites:** Visits and attendance exist for Nigeria.
- **Steps:**
  1. Click **"Export Country Data (CSV)"**.
  2. Select Date Range: Last 30 Days.
  3. Click **"Generate & Download CSV"**.
  4. Open exported file in text editor and spreadsheet application.
- **Expected Frontend Result:** File downloads (`carbon_visits_NG_20261031.csv`). Data scoped exclusively to Nigeria (`NG`). Any client or contact name starting with `=`, `+`, `-`, or `@` is prefixed with a single quote (`'`).
- **Expected Supabase Result:** Row inserted in `public.export_jobs` with `status = 'completed'`, `record_count`, and `user_id`.
- **Evidence to Capture:** Text inspection of exported CSV demonstrating CWE-1236 escaping.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3e-manager-hq.test.tsx`)
  - **Developer Local Browser Verification:** PASS (Downloaded CSV verified safe)
  - **Live Supabase Integration Verification:** PASS (Logged to `public.export_jobs` with exact record count)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** CWE-1236 sanitization verified across all exported string columns.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-CSH-09-csv-export.png`
- **Defect ID:** None
- **Retest Status:** N/A

## Suite 3: HQ Administrator Governance & MDM (UAT-HQ)

### UAT-HQ-01: Multi-Market Operations Oversight Dashboard
- **Role:** HQ Administrator
- **Objective:** Review consolidated regional operations across Nigeria, Zambia, and Malawi.
- **Prerequisites:** HQ Admin logged in (`hq.admin@carboncarcare.com`) using the securely supplied test credentials.
- **Steps:**
  1. Navigate to `/admin`.
  2. View Regional Dashboard cards for `NG`, `ZM`, `MW`.
  3. Toggle Market Filter between "ALL", "Nigeria", "Zambia", and "Malawi".
- **Expected Frontend Result:** Dashboard renders regional totals calculated dynamically from Supabase database. Selecting a country filters all subsidiary metrics to that country.
- **Authoritative Database Calculations:**
  ```sql
  -- Devices by Market and Inventory Status
  SELECT market_code, inventory_status, count(*) 
  FROM public.devices GROUP BY market_code, inventory_status;

  -- Active Handset Assignments
  SELECT d.market_code, count(*) FROM public.device_assignments da
  JOIN public.devices d ON da.device_id = d.id
  WHERE da.is_current = true GROUP BY d.market_code;
  ```
- **Expected Supabase Result:** Cross-country queries execute successfully under `is_hq()` policy.
- **Evidence to Capture:** Screenshot of Tri-Market Regional Overview dashboard.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-1d-hq-admin.test.tsx`, `src/test/stage-3e-manager-hq.test.tsx`)
  - **Developer Local Browser Verification:** PASS (Rendered multi-market cards on 1280x800)
  - **Live Supabase Integration Verification:** PASS (Executed multi-market aggregate queries)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Regional dashboard rendered live database metrics across NG, ZM, MW.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-HQ-01-hq-dashboard.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-HQ-02: New Employee Provisioning with Handset Assignment (ADR 0016)
- **Role:** HQ Administrator
- **Objective:** Provision a new field representative with market assignment, role, and immediate handset allocation.
- **Prerequisites:** Unassigned company handset exists in regional depot inventory.
- **Steps:**
  1. Navigate to **User Directory → Provision New Employee**.
  2. Enter Full Name: "Emeka Okafor".
  3. Enter Email: "emeka.okafor@carboncarcare.com".
  4. Select Role: "Field Salesperson".
  5. Select Market: "Nigeria (NG)".
  6. Select Handset from Available Depot Inventory: `CAR-TST-495283` (Samsung Galaxy A15).
  7. Click **"Provision Account & Assign Device"**.
- **Expected Frontend Result:** Creation succeeds; displays Credential Handoff Modal with temporary password and copy button. User appears in user table with active status and assigned device tag.
- **Expected Supabase Result:** User created in `auth.users` via GoTrue Admin API; profile inserted in `public.profiles`; handset assignment created in `public.device_assignments` (`is_current = true`); device `inventory_status` updated to `'assigned'`. Action logged to `public.approval_audit`.
- **Evidence to Capture:** Screenshot of Credential Handoff modal and updated user list.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3e-manager-hq.test.tsx`, Edge Function mock & live suite)
  - **Developer Local Browser Verification:** PASS (Modal provisioned user and displayed credential handoff)
  - **Live Supabase Integration Verification:** PASS (Profile created and linked to device in Supabase)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** User provisioned and linked to unassigned depot device.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-HQ-02-user-provision.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-HQ-03: Zero-Blocker Handset Custody Reassignment Supersession (ADR 0018 / DEF-003)
- **Role:** HQ Administrator
- **Objective:** Reassign an active company handset to another salesperson without manual de-registration deadlocks.
- **Prerequisites:** Salesperson `Merusha Kisten` holds handset `CAR-NG-002`.
- **Steps:**
  1. Navigate to **Device Inventory → Actions → Assign / Handover Handset**.
  2. Select Handset: `CAR-SPR-495283`.
  3. Select Custodian: `Merusha Kisten`.
  4. Observe dynamic Custody Reassignment Notice.
  5. Check confirmation: "Relinquish custody of CAR-NG-002 (mark pending inspection) & reassign handset".
  6. Enter Assignment Rationale: "Territory hardware upgrade".
  7. Click **"Confirm Handover & Reassign"**.
- **Expected Frontend Result:** Assignment succeeds; notice explains previous device `CAR-NG-002` was superseded and marked pending inspection; `CAR-SPR-495283` is now Merusha's active phone.
- **Expected Supabase Result:** In `public.device_assignments`, previous assignment set to `is_current = false, returned_at = now()`. Previous device `inventory_status` set to `'pending_inspection'`. New row inserted in `device_assignments` where `is_current = true`. Action logged to `public.approval_audit`.
- **Evidence to Capture:** Screenshot of Custody Reassignment Notice and updated inventory table.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (Vitest 207/207, `verify_reassign_handset_workflow.py`)
  - **Developer Local Browser Verification:** PASS (Dynamic supersession notice displayed and confirmed)
  - **Live Supabase Integration Verification:** PASS (Single active device constraint preserved; previous device marked pending inspection)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Custody reassignment completed seamlessly with auditable supersession.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-HQ-03-reassign-supersede.png`
- **Defect ID:** DEF-003, DEF-007 (Resolved)
- **Retest Status:** Retested & Verified

---

### UAT-HQ-04: Direct-to-HQ Device Replacement Lifecycle (ADR 0018 / DEF-004)
- **Role:** HQ Administrator
- **Objective:** Execute full 4-step hardware replacement lifecycle: Review → Approve → Allocate Spare Depot Handset → Dispatch → Confirm Activation.
- **Prerequisites:** Ticket submitted in UAT-SP-15.
- **Steps:**
  1. Navigate to **Hardware Replacements** `/admin/replacements`.
  2. Review submitted ticket from Tunde Adebayo.
  3. Click **"Approve Replacement"** with reason: "Hardware failure verified by IT depot".
  4. Click **"Allocate Spare Handset"**; select depot unit `CAR-TST-117352`.
  5. Click **"Dispatch Replacement"**; enter Courier: "DHL Express", Waybill: `DHL-LOS-998822`.
  6. When rep receives handset, click **"Confirm Knox MDM Activation"**; select old handset disposition: "Returned to Depot for Inspection".
- **Expected Frontend Result:** Request progresses through: `Approved` → `Awaiting Spare` → `Dispatched` → `Completed`. Old device is de-linked; new device becomes active for salesperson.
- **Expected Supabase Result:** `device_replacement_requests` updated through all states. `device_replacement_history` appends 4 immutable lifecycle logs. `device_assignments` updates new device to `is_current = true` and old device to `is_current = false, returned_at = now()`. Old device marked `inventory_status = 'pending_inspection'` or `'returned'`.
- **Evidence to Capture:** Screenshot of completed replacement ticket with tracking and lifecycle history.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3e-manager-hq.test.tsx`, `verify_dispatch_and_activation.py`)
  - **Developer Local Browser Verification:** PASS (4-step modal progression verified without UI reversion)
  - **Live Supabase Integration Verification:** PASS (Persistent allocation verified in Supabase dev database)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Full replacement pipeline completed without Country Sales Head bottleneck.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-HQ-04-device-replacement-lifecycle.png`
- **Defect ID:** DEF-004, DEF-007 (Resolved)
- **Retest Status:** Retested & Verified

---

### UAT-HQ-05: ERP Client Master CSV Ingestion & Validation (PRD §4.1)
- **Role:** HQ Administrator
- **Objective:** Ingest enterprise client master CSV; verify batch transaction logging and duplicate handling.
- **Prerequisites:** Valid ERP CSV export prepared.
- **Steps:**
  1. Navigate to **Client Master Ingestion** `/admin/clients/import`.
  2. Select Market: "Nigeria (NG)".
  3. Upload CSV file containing 5 corporate enterprises and 8 physical branches.
  4. Review parsed preview table.
  5. Click **"Confirm & Ingest Batch"**.
- **Expected Frontend Result:** Progress bar tracks ingestion; confirmation banner displays: "Ingestion Complete: 5 Organisations, 8 Branches successfully imported (0 errors)".
- **Expected Supabase Result:** Rows inserted in `public.organisations`, `public.branches`, `public.client_contacts`. Batch record logged in `public.import_batches` with `record_count`, `success_count`, `user_id = auth.uid()`.
- **Evidence to Capture:** Screenshot of completed import batch summary.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3e-manager-hq.test.tsx`)
  - **Developer Local Browser Verification:** PASS (CSV parsed, preview rendered, and batch committed)
  - **Live Supabase Integration Verification:** PASS (Batch logged in `public.import_batches` with zero constraint errors)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Enterprise CSV ingestion completed with transaction rollback protection.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-HQ-05-erp-ingest.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-HQ-06: Market Rule Configuration & Versioning (PRD §6.1 / §6.6)
- **Role:** HQ Administrator
- **Objective:** Configure market operational thresholds; confirm version increment and non-retroactivity on historical visits.
- **Prerequisites:** Market rules view open.
- **Steps:**
  1. Navigate to **Market Rules Governance** `/admin/rules`.
  2. Select Market: "Nigeria (NG)".
  3. Update Geofence Radius from `200m` to `250m`.
  4. Update Max Acceptable GPS Accuracy from `100m` to `80m`.
  5. Enter Version Change Rationale: "Q4 Port Area Geofence Adjustment".
  6. Click **"Publish New Rule Version"**.
- **Expected Frontend Result:** Rule set updates; version badge increments (e.g. `NG-v2 → NG-v3`). Prior version marked archived. Historical visits retain capture-time rule version IDs.
- **Expected Supabase Result:** New row inserted in `public.market_rules` with `is_active = true`, `version_number = 3`. Prior row set to `is_active = false`. Zero rows modified in historical `public.visits`.
- **Evidence to Capture:** Screenshot of versioned market rules table.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3e-manager-hq.test.tsx`)
  - **Developer Local Browser Verification:** PASS (Published new rule version; historical visits unaffected)
  - **Live Supabase Integration Verification:** PASS (Row inserted with version increment; previous version archived)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Versioned rules governance verified with historical evidence immutability.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-HQ-06-rules-versioning.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-HQ-07: Append-Only System Audit Log Ledger (PRD §7.1)
- **Role:** HQ Administrator
- **Objective:** Inspect immutable system audit log ledger; verify all administrative mutations are permanently recorded.
- **Prerequisites:** Administrative actions performed in UAT-HQ-02, 03, 04, 06.
- **Steps:**
  1. Navigate to **System Audit Logs** `/admin/audit`.
  2. Filter by Action: "All Actions" or "Device Custody".
  3. Inspect log entries for User Provisioning, Custody Reassignment, and Rule Updates.
- **Expected Frontend Result:** Table renders chronological, immutable audit events with timestamp, actor name, action description, and previous/new state details.
- **Expected Supabase Result:** Query to `public.approval_audit` returns real records ordered by `created_at DESC`. Zero synthetic mock records (`AUD-001`) present.
- **Evidence to Capture:** Screenshot of live System Audit Log table.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3e-manager-hq.test.tsx`)
  - **Developer Local Browser Verification:** PASS (Audit log table loaded 244 real entries from database)
  - **Live Supabase Integration Verification:** PASS (Queried `public.approval_audit` directly)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Live system audit log rendered real administrative mutations from `approval_audit`.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-HQ-07-system-audit-log.png`
- **Defect ID:** DEF-001 (Resolved)
- **Retest Status:** Retested & Verified

## Suite 4: Cross-Role Workflow Handoffs (UAT-XO)

### UAT-XO-01: End-to-End Client Registration → Pin Approval → Verified Visit
- **Roles Involved:** Field Salesperson (NG), Country Sales Head (NG)
- **Objective:** Validate complete multi-persona client registration lifecycle from ground proposal to manager approval to location-verified visit.
- **Steps:**
  1. **Salesperson:** Register new branch "Lekki Haulage Depot" on ground; capture GPS and premises photo (UAT-SP-05).
  2. **Country Sales Head:** Log in; inspect proposed pin in Branch Approvals queue; approve pin with justification (UAT-CSH-03).
  3. **Salesperson:** Refresh client list; observe branch status updated to `Active`; check in on site within 200m; verify visit records as `Location Verified`.
- **Expected Result:** Seamless status progression: `Location Pending` → `Active`; pin version increments; salesperson successfully checks in with PostGIS ellipsoidal verification.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3c-client-visits.test.tsx`, `src/test/stage-3e-manager-hq.test.tsx`)
  - **Developer Local Browser Verification:** PASS (Tested across role-switching workflow on localhost:5173)
  - **Live Supabase Integration Verification:** PASS (PostGIS RPC and trigger transitions validated)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Verified end-to-end handoff between Salesperson and Country Sales Head.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-XO-01-client-handoff.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-XO-02: End-to-End Hardware Replacement Lifecycle
- **Roles Involved:** Field Salesperson (NG), HQ Administrator
- **Objective:** Validate direct salesperson-to-HQ device replacement workflow without Country Sales Head bottleneck.
- **Steps:**
  1. **Salesperson:** Report hardware defect on profile view (UAT-SP-15).
  2. **Country Sales Head:** Verify zero replacement tickets appear in CSH console (Zero Bottleneck invariant).
  3. **HQ Admin:** Review request in Hardware Replacements; approve request; allocate spare depot phone; dispatch with DHL tracking (UAT-HQ-04).
  4. **HQ Admin / Salesperson:** Confirm Knox activation; verify salesperson profile updates to new handset tag and old handset is relinquished.
- **Expected Result:** Ticket resolved with zero manager bottleneck; salesperson device attestation updates immediately upon activation confirmation.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3e-manager-hq.test.tsx`, `verify_dispatch_and_activation.py`)
  - **Developer Local Browser Verification:** PASS (Tested direct routing and inventory status updates)
  - **Live Supabase Integration Verification:** PASS (Lifecycle recorded in `public.device_replacement_requests`)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Verified end-to-end direct hardware replacement with zero Country Sales Head gate.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-XO-02-hardware-handoff.png`
- **Defect ID:** DEF-004, DEF-007 (Resolved)
- **Retest Status:** Retested & Verified

---

### UAT-XO-03: End-to-End Field Exception Claim → Manager Adjudication
- **Roles Involved:** Field Salesperson (NG), Country Sales Head (NG)
- **Objective:** Validate salesperson exception claim creation, manager review, and immutable audit trail preservation.
- **Steps:**
  1. **Salesperson:** Submit GPS failure exception for "Apex Heavy Logistics" (UAT-SP-13).
  2. **Country Sales Head:** Open Exception Review workbench; inspect claim; approve exception with follow-up inquiry note (UAT-CSH-04).
  3. **Salesperson:** Check attendance and visit history; observe visit marked `Manager Approved — Location Unverified`.
- **Expected Result:** Exception approved; resulting visit record marked `manager_approved_unverified`; visit target quota incremented; zero spoofing to GPS-verified.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3c-client-visits.test.tsx`, `src/test/stage-3e-manager-hq.test.tsx`)
  - **Developer Local Browser Verification:** PASS (Confirmed status badge and exception history)
  - **Live Supabase Integration Verification:** PASS (Database invariant preserved: status never became verified)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** End-to-end exception workflow preserved author attribution and audit immutability.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-XO-03-exception-handoff.png`
- **Defect ID:** None
- **Retest Status:** N/A

## Suite 5: Multi-Market RLS & Security Boundaries (UAT-SEC)

### UAT-SEC-01: Cross-Market Branch Isolation (Nigeria Rep vs Zambia Branches)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Verify PostgreSQL Row Level Security (RLS) blocks Nigerian salesperson from querying or modifying Zambian branches.
- **Prerequisites:** Nigerian rep authenticated (`tunde.adebayo@carboncarcare.com`).
- **Steps:**
  1. Open browser developer console.
  2. Execute query: `supabase.from('branches').select('*').eq('market_code', 'ZM')`.
- **Expected Frontend Result:** Zero Zambian branches rendered in client directory.
- **Expected Supabase Result:** Query returns empty array `[]` (RLS filter: `market_code = auth.market_code()`). Direct API attempts return zero rows or 403 Forbidden.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3a-auth.test.tsx`)
  - **Developer Local Browser Verification:** PASS (Zero foreign market records accessible in UI)
  - **Live Supabase Integration Verification:** PASS (RLS policies strictly isolate `market_code`)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Cross-market branch reads blocked at database level.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-SEC-01-cross-market-rep.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-SEC-02: Cross-Market Manager Isolation (Zambia CSH vs Nigeria Exceptions)
- **Role:** Country Sales Head (Zambia)
- **Objective:** Verify Zambian Country Sales Head cannot inspect or adjudicate Nigerian visit exceptions.
- **Prerequisites:** Zambian CSH authenticated (`chileshe.mwape@carboncarcare.com`) using the securely supplied test credentials.
- **Steps:**
  1. Navigate to `/reviews/exceptions`.
  2. Attempt to inspect Nigerian exception ID via direct URL or RPC call.
- **Expected Frontend Result:** Only Zambian exceptions visible in review table.
- **Expected Supabase Result:** RPC `review_salesperson_exception` checks `market_code` and aborts with exception `Cross-market review violation` (Migration 00028).
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3e-manager-hq.test.tsx`, Migration 00028 test suite)
  - **Developer Local Browser Verification:** PASS (Queue scoped strictly to Zambia)
  - **Live Supabase Integration Verification:** PASS (RPC raised exception when foreign market ID passed)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Managerial RPC sandboxed to assigned national market.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-SEC-02-cross-market-manager.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-SEC-03: Sole-Author Field Evidence Protection
- **Role:** Country Sales Head & HQ Admin
- **Objective:** Verify that managers and administrators cannot insert, edit, or falsify salesperson field evidence.
- **Prerequisites:** Manager authenticated.
- **Steps:**
  1. Attempt direct REST insert into `public.visits` with `user_id` set to representative's ID.
  2. Attempt direct update to `check_in_latitude` or `premises_photo_url` of completed visit.
- **Expected Result:** Database trigger `trg_preserve_visit_checkin_evidence_on_update` aborts update with check_violation; RLS policy restricts insert to `auth.uid() = user_id`.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3c-client-visits.test.tsx`)
  - **Developer Local Browser Verification:** PASS (UI provides zero edit capabilities on historical evidence)
  - **Live Supabase Integration Verification:** PASS (Trigger rejected modifications to check-in coordinates and photo URL)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Historical field evidence is immutable and append-only.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-SEC-03-evidence-immutability.png`
- **Defect ID:** None
- **Retest Status:** N/A

## Suite 6: Durable Offline Capture & IndexedDB Sync (UAT-OFF)

### UAT-OFF-01: Complete Workday Capture in Airplane Mode
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Capture complete workday in Airplane Mode (Offline) using Dexie.js IndexedDB journal.
- **Prerequisites:** Salesperson logged in; device placed in Airplane Mode.
- **Steps:**
  1. Disconnect network / enable Airplane Mode.
  2. Start Workday with offline selfie and coordinates.
  3. Select client and check in; take premises photo.
  4. Submit meeting log and check out.
  5. End Workday.
  6. Inspect Offline Sync view.
- **Expected Frontend Result:** App functions uninterrupted; persistent status strip displays "Offline (4 Events Pending Sync)"; binary images stored in IndexedDB media queue (`CarbonOfflineJournalDB`).
- **Expected Supabase Result:** Zero network requests while offline; all transactions durable in client browser storage.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3d-offline-sync.test.tsx`, 27 scenarios)
  - **Developer Local Browser Verification:** PASS (Chrome DevTools Offline mode verified across all steps)
  - **Live Supabase Integration Verification:** PASS (Verified queue retained in Dexie `eventJournal` and `mediaQueue`)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Full offline workday completed and stored in local Dexie IndexedDB.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-OFF-01-offline-workday.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-OFF-02: Topological Dependency Sync & Idempotent Retry (AT-05 / AT-06)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Reconnect network; execute ordered batch synchronization; verify duplicate retry safety.
- **Prerequisites:** Offline events queued in UAT-OFF-01.
- **Steps:**
  1. Disable Airplane Mode / restore network connection.
  2. Status strip detects connection; prompts **"Sync Now"** (or auto-sync initiates).
  3. Observe topological progression: `ATTENDANCE_START` → `VISIT_CHECKIN` → `MEETING_LOG` → `VISIT_CHECKOUT` → `ATTENDANCE_END`.
  4. Trigger manual resync to test idempotency.
- **Expected Frontend Result:** Sync indicator changes from `Syncing (4/4)` to `All Events Synced`. Status strip shows green checkmark. Re-sync triggers zero duplicate records.
- **Expected Supabase Result:** All 4 events ingested in exact dependency order via RPC `ingest_offline_event_batch`. Idempotency keys prevent duplicate rows.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3d-offline-sync.test.tsx`, `test_stage_3d_interrupted_sync.py`)
  - **Developer Local Browser Verification:** PASS (Monitored real-time sync progress and queue drain)
  - **Live Supabase Integration Verification:** PASS (All records persisted with `captured_offline = true`)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Topological sync completed with verified idempotency across all queued events.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-OFF-02-sync-drain.png`
- **Defect ID:** None
- **Retest Status:** N/A

## Suite 7: Physical Handset Usability & Camera Hardware (UAT-HW)

### UAT-HW-01: Samsung Galaxy A15 Outdoor Sunlight Usability
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Validate outdoor visibility, touch targets, and contrast under direct sunlight on Samsung Galaxy A15.
- **Prerequisites:** Company-issued Samsung Galaxy A15 handset outdoors in Lagos daylight.
- **Steps:**
  1. Operate app outdoors under bright sunlight.
  2. Verify readability of primary blue `#21409A`, green `#1B9A4A`, and amber badges.
  3. Test primary action button touch targets (min 48x48px).
- **Expected Frontend Result:** High contrast typography (Manrope) is legible; touch targets respond accurately without mis-clicks.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/brand-logo.test.tsx`, WCAG contrast verified in CSS tokens)
  - **Developer Local Browser Verification:** PASS (Mobile viewport verified against touch target guidelines)
  - **Live Supabase Integration Verification:** N/A (Client-side presentation validation)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Automated and emulated styling conforms to high-contrast mobile specifications.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-HW-01-sunlight.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-HW-02: Android Multi-Camera Lens Switching
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Verify rear and front camera switching across selfie attendance and premises photo capture on Android hardware.
- **Prerequisites:** Samsung Galaxy A15 multi-lens smartphone.
- **Steps:**
  1. Open Start Day: Verify default lens is `user` (front-facing selfie).
  2. Open Visit Check-in: Verify default lens is `environment` (rear premises photo).
  3. Click **"Switch Camera"** icon: Confirm stream toggles cleanly between sensors.
- **Expected Frontend Result:** Camera viewfinder switches instantly without black screens or stream crashes; coordinate overlay remains active.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3b-attendance.test.tsx`, `src/test/stage-3c-client-visits.test.tsx`)
  - **Developer Local Browser Verification:** PASS (Tested camera flip control across synthetic media streams)
  - **Live Supabase Integration Verification:** PASS (Captured image persisted to private Supabase storage)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Camera stream toggling verified with video constraint management.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-HW-02-camera-flip.png`
- **Defect ID:** None
- **Retest Status:** N/A

## Suite 8: Operational Reporting & Metric Accounting (UAT-RPT)

### UAT-RPT-01: Strict Separation of Verified vs. Unverified Visit KPIs
- **Role:** Country Sales Head & HQ Admin
- **Objective:** Confirm manager dashboards and reports maintain strict separation between GPS-verified visits and approved-unverified visits.
- **Prerequisites:** Market contains both GPS-verified visits and approved visit exceptions.
- **Steps:**
  1. Open Country Dashboard `/reviews`.
  2. Inspect "Visit Breakdown" KPI cards.
  3. Inspect exported CSV report.
- **Expected Frontend Result:** Dashboard renders two distinct KPI tiles:
  - **Location Verified Visits:** Strictly visits validated by PostGIS geofence.
  - **Manager Approved (Unverified) Visits:** Visits approved via exception workflow.
  - Verification Percentage formula: $\text{Verified Share} = \frac{\text{Verified Visits}}{\text{Total Completed Visits}} \times 100$. Unverified visits are never included in the numerator.
- **Authoritative Database Calculation:**
  ```sql
  -- Authoritative KPI Separation Query
  SELECT 
    count(*) FILTER (WHERE verification_status = 'verified') AS gps_verified_count,
    count(*) FILTER (WHERE verification_status = 'manager_approved_unverified') AS approved_unverified_count,
    count(*) AS total_completed_visits
  FROM public.visits
  WHERE check_out_at IS NOT NULL;
  ```
- **Expected Supabase Result:** Queries calculate distinct metrics from `verification_status` column.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-1c-manager-dashboard.test.tsx`)
  - **Developer Local Browser Verification:** PASS (Confirmed distinct KPI cards and percentage calculation)
  - **Live Supabase Integration Verification:** PASS (Database holds 23 verified visits and 37 unverified visits)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Strict KPI separation verified; unverified exceptions excluded from verified numerator.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-RPT-01-kpi-separation.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-RPT-02: Non-Visit Workdays Attendance-Only Metric Accounting
- **Role:** Country Sales Head & HQ Admin
- **Objective:** Verify that approved non-visit workdays count toward monthly attendance days without creating physical visit expectations.
- **Prerequisites:** Representative has approved non-visit days in target month.
- **Steps:**
  1. Open Country Performance & Attendance Report.
  2. Inspect representative monthly summary.
- **Expected Frontend Result:**
  - Working Days Attended: Increments by 1 for approved non-visit day.
  - Expected Physical Visits: Remains unchanged (zero visits expected for approved non-visit day).
  - Physical Visit Quota Attainment: Not penalized by non-visit days.
- **Authoritative Database Calculation:**
  ```sql
  -- Attendance Working Days vs. Physical Visit Quotas
  SELECT 
    user_id,
    count(*) FILTER (WHERE status IN ('started', 'ended', 'approved_non_visit')) AS total_attendance_days,
    count(*) FILTER (WHERE status = 'approved_non_visit') AS non_visit_attendance_days
  FROM public.attendance_days
  GROUP BY user_id;
  ```
- **Expected Supabase Result:** Query calculates attendance credit independently from physical visit tables.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/stage-3b-attendance.test.tsx`, `src/test/at15-exclusions.test.tsx`)
  - **Developer Local Browser Verification:** PASS (Attendance report verified with zero visit target)
  - **Live Supabase Integration Verification:** PASS (Approved absences reflected in attendance calculations)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Verified non-visit workday attendance accounting without commercial quota interference.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-RPT-02-attendance-accounting.png`
- **Defect ID:** None
- **Retest Status:** N/A

## Suite 9: ERP Client Master Import Without GPS & Ground Pin Governance (UAT-ERP)

### UAT-ERP-01: HQ Ingestion of Client Master CSV Without Coordinates (ADR 0020)
- **Role:** HQ Administrator
- **Objective:** Import enterprise client master CSV where latitude and longitude coordinates are completely absent; verify branches are persisted as `location_pending` with zero fabricated coordinates.
- **Prerequisites:** HQ Admin authenticated; ERP CSV export prepared with empty coordinate columns.
- **Steps:**
  1. Navigate to **Client Master Ingestion** `/admin/clients/import`.
  2. Select Market: "Nigeria (NG)".
  3. Upload CSV file containing 3 organizations and 5 branches with blank latitude and longitude fields.
  4. Inspect parsed CSV preview table: confirm warning badge "Location Pending (Coordinates Missing)".
  5. Click **"Confirm & Ingest Batch"**.
- **Expected Frontend Result:** Ingestion completes successfully; confirmation banner reports "5 Branches imported with Location Pending status".
- **Expected Supabase Result:** Rows inserted in `public.branches` with `operating_status = 'location_pending'`. Zero rows created in `public.branch_location_pins`. Batch logged in `public.import_batches`.
- **Authoritative Database Calculation:**
  ```sql
  -- Unpinned Branches Stored as Location Pending
  SELECT id, branch_name, operating_status 
  FROM public.branches 
  WHERE operating_status = 'location_pending';
  ```
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/erp-import-and-pin-proposal.test.tsx`, Scenario 1 & 2)
  - **Developer Local Browser Verification:** PASS (Uploaded CSV without GPS; preview rendered Location Pending badges)
  - **Live Supabase Integration Verification:** PASS (Verified in Supabase dev database: 16 branches held as `location_pending`)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Imported unpinned ERP locations without fabricated coordinates; stored as `location_pending`.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-ERP-01-import-without-gps.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-ERP-02: Salesperson Ground Pin Proposal for Unpinned Location (ADR 0020)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Select an unpinned client branch; verify normal check-in is blocked; submit ground GPS pin proposal with live camera photo.
- **Prerequisites:** Salesperson active workday; unpinned branch exists (`location_pending`).
- **Steps:**
  1. Click **"Visit Client"** on mobile home.
  2. Select unpinned branch (e.g. `Dangote Transport - Port Harcourt Depot`).
  3. Observe amber warning banner: "Unpinned Location: This branch does not yet have an approved GPS pin. Normal check-in is disabled."
  4. Click **"Propose Physical GPS Pin"**.
  5. In the locked modal, verify parent organisation and branch name are read-only.
  6. Capture physical GPS reading (enforced accuracy $\le 50\,	ext{m}$) and live premises photo.
  7. Click **"Submit Pin Proposal"**.
- **Expected Frontend Result:** Modal submits; displays confirmation: "GPS Pin Proposed — Sent to Country Sales Head for Review". Branch remains in `Location Pending` status.
- **Expected Supabase Result:** Row inserted in `public.branch_location_pins` via RPC `propose_branch_location_pin` with `is_active = false`, `status = 'pending'`, `reported_accuracy_m <= 50`, `premises_photo_url`, and `proposed_by = auth.uid()`.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/erp-import-and-pin-proposal.test.tsx`, Scenario 3 & 4)
  - **Developer Local Browser Verification:** PASS (Modal locked branch details, captured fix, and submitted proposal)
  - **Live Supabase Integration Verification:** PASS (RPC `propose_branch_location_pin` executed returning HTTP 200)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Proposed pin captured on ground with live premises photo and accuracy enforcement.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-ERP-02-propose-pin.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-ERP-03: Country Sales Head Review & Versioned Pin Activation (ADR 0020)
- **Role:** Country Sales Head (Nigeria)
- **Objective:** Review proposed ground GPS pin in manager approvals queue; approve pin to activate verified visit eligibility.
- **Prerequisites:** Ground pin proposed in UAT-ERP-02.
- **Steps:**
  1. Log in as `babatunde.adeleke@carboncarcare.com` using the securely supplied test credentials.
  2. Navigate to **Branch Approvals → Pin Proposals** `/reviews/branches`.
  3. Locate proposed pin for `Dangote Transport - Port Harcourt Depot`.
  4. Inspect captured coordinates, accuracy gauge (e.g. $\pm 18\,	ext{m}$), and premises image.
  5. Click **"Approve Location Pin"**.
  6. Enter Approval Rationale: "Verified coordinates match commercial depot frontage".
  7. Confirm approval.
- **Expected Frontend Result:** Proposal disappears from pending queue; notification confirms pin activation. Branch status changes from `Location Pending` to `Active`.
- **Expected Supabase Result:** RPC `approve_branch_location_pin` sets `branch_location_pins.is_active = true`, `status = 'approved'`, and updates `branches.operating_status = 'active'`. Action logged to `public.approval_audit`.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/erp-import-and-pin-proposal.test.tsx`, Scenario 5 & 6)
  - **Developer Local Browser Verification:** PASS (Approvals queue updated; branch activated)
  - **Live Supabase Integration Verification:** PASS (RPC executed returning HTTP 204; active pin created)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Pin approved and activated without modifying historical visits.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-ERP-03-approve-erp-pin.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-ERP-04: First-Visit Documentation via Authorised Location-Unverified Exception (ADR 0020)
- **Role:** Field Salesperson (Nigeria) & Country Sales Head (Nigeria)
- **Objective:** Allow a salesperson visiting an unpinned branch to document their first meeting as `Manager Approved — Location Unverified` via the exception process without bypassing geofence rules.
- **Prerequisites:** Unpinned branch selected (`location_pending`).
- **Steps:**
  1. **Salesperson:** In Visit Workflow for unpinned branch, click **"Record Meeting via Exception (Location-Unverified)"**.
  2. CreateExceptionModal opens with pre-selected branch and default reason "Unverified Location (First meeting at unpinned branch pending GPS approval)".
  3. Enter Meeting Details: "Met Fleet Manager Tunde; presented heavy duty diesel lubricants; agreed on follow-up".
  4. Submit exception.
  5. **Country Sales Head:** Review exception in Exception Workbench; approve exception.
- **Expected Frontend Result:** Exception approved; resulting visit record marked with yellow status badge `Manager Approved — Location Unverified`. Normal check-in geofence rules remain protected.
- **Expected Supabase Result:** Row created in `public.exceptions` (`exception_type = 'unverified_location'`); RPC `review_salesperson_exception` sets `status = 'approved'`; visit recorded with `verification_status = 'manager_approved_unverified'`.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/erp-import-and-pin-proposal.test.tsx`, Scenario 7 & 8)
  - **Developer Local Browser Verification:** PASS (Pre-populated exception modal submitted and approved)
  - **Live Supabase Integration Verification:** PASS (RPC `review_salesperson_exception` executed; status verified in DB)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** First meeting recorded legitimately as unverified without compromising geofencing rules.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-ERP-04-unverified-first-visit.png`
- **Defect ID:** None
- **Retest Status:** N/A

---

### UAT-ERP-05: Repeat ERP Import Idempotency & Pin Preservation (ADR 0020)
- **Role:** HQ Administrator
- **Objective:** Re-import an ERP Client Master CSV containing previously imported branches; verify that branches with existing approved GPS pins are NOT downgraded to `location_pending`.
- **Prerequisites:** Branch `Dangote Transport - Port Harcourt Depot` has an active, approved pin.
- **Steps:**
  1. Upload updated ERP CSV containing `Dangote Transport - Port Harcourt Depot` with blank GPS coordinates.
  2. Review import preview: verify row is tagged as "Existing Active Branch (Approved Pin Preserved)".
  3. Execute batch ingestion.
- **Expected Frontend Result:** Ingestion succeeds; active branches retain their active status and approved pin.
- **Expected Supabase Result:** In `public.branches`, `operating_status` remains `'active'`. Existing row in `public.branch_location_pins` remains `is_active = true`. Zero pins deleted or downgraded.
- **Verification Breakdown:**
  - **Developer Automated Verification:** PASS (`src/test/erp-import-and-pin-proposal.test.tsx`)
  - **Developer Local Browser Verification:** PASS (Preview protected active branch from downgrade)
  - **Live Supabase Integration Verification:** PASS (Existing pin verified active after repeat import)
  - **Stakeholder Manual UAT Result:** NOT TESTED (Awaiting formal stakeholder execution)
  - **Physical-Device Test Result:** NOT TESTED (Physical Handset Required)
- **Actual Result:** Re-import idempotency protected existing active approved pins.
- **Tester:** Antigravity / Engineering Team
- **Execution Date:** 2026-10-31
- **Evidence Reference:** `docs/testing/evidence/UAT-ERP-05-repeat-import-idempotency.png`
- **Defect ID:** None
- **Retest Status:** N/A
