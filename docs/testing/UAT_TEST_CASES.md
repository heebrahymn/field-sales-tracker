# Carbon Field Sales Tracker — Full Role-Based Manual UAT Test Cases

**Document Version:** 1.0  
**Baseline:** PRD v1.2, ADRs 0001–0019  
**Execution Environment:** `http://localhost:5173`  
**Test Matrix:** 8 Test Suites, 40 Role-Based Scenarios  

---

## Suite 1: Field Salesperson Mobile Workflows (UAT-SP)

### UAT-SP-01: Authentication, Role Enforcement & Assigned Device Attestation
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Authenticate with company credentials, verify redirection to mobile salesperson view, and confirm assigned handset display.
- **Prerequisites:** Salesperson account `tunde.adebayo@carboncarcare.com` exists with assigned device `CAR-TST-121585`.
- **Steps:**
  1. Navigate to `/login`.
  2. Enter email `tunde.adebayo@carboncarcare.com` and password `CarbonSales2026!`.
  3. Click **"Sign In"**.
  4. Navigate to **Profile → My Device**.
- **Expected Frontend Result:** Successfully logs in; redirects to `/home` with salesperson action tiles ("Start Day", "Visit Client", "Add Branch"). Profile displays assigned handset: Model `Samsung Galaxy A15`, Tag `CAR-TST-121585`, Knox Status `Enrolled & Active`.
- **Expected Supabase Result:** Valid session token issued; `profiles` row retrieved with `role = 'salesperson'`, `market_code = 'NG'`. Active row in `device_assignments` where `is_current = true`.
- **Evidence to Capture:** Screenshot of Mobile Home & My Device card.
- **Status:** **PASS** (Verified Locally)

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
- **Expected Supabase Result:** Row inserted in `public.attendance_days` with `workday_type: 'normal'`, `status: 'started'`, `check_in_lat`, `check_in_lng`, `check_in_accuracy`. Image stored in private bucket `attendance-selfies/<user_id>/...`.
- **Evidence to Capture:** Screenshot of Start Day modal with viewfinder & GPS gauge.
- **Status:** **PASS** (Verified Locally)

---

### UAT-SP-03: Workday Session Restoration Across Browser Restart
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Verify that an in-progress workday survives browser refresh, tab closure, and device restart without state loss.
- **Prerequisites:** Workday started in UAT-SP-02.
- **Steps:**
  1. With workday active, close browser tab or refresh page (`F5`).
  2. Navigate back to `/home`.
- **Expected Frontend Result:** App immediately renders active workday state: "Workday Active", elapsed time counter, and enabled "Visit Client" action.
- **Expected Supabase Result:** Zero new rows inserted; existing `attendance_days` record retrieved via `getTodayAttendance()`.
- **Evidence to Capture:** Screenshot of restored home dashboard after reload.
- **Status:** **PASS** (Verified Locally)

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
- **Expected Supabase Result:** Query to `branches` scoped strictly to `market_code = 'NG'` joining active `branch_location_pins`.
- **Evidence to Capture:** Screenshot of client selection modal with distance tags.
- **Status:** **PASS** (Verified Locally)

---

### UAT-SP-05: Register New Client Branch on Ground (PRD §4.2)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Propose a new client branch on the ground with live premises photo and GPS pin.
- **Prerequisites:** Salesperson on location; camera enabled.
- **Steps:**
  1. Click **"Add Branch"** or **"Register New Branch"** in client modal.
  2. Enter Parent Company: "Global Logistics Hub".
  3. Enter Branch Name: "Apapa Container Depot".
  4. Enter Address: "Wharf Road, Apapa, Lagos".
  5. Enter Site Contact: "Bisi Akande" (Fleet Supervisor, `+234 803 111 2233`).
  6. Capture live premises photo and GPS coordinates (target accuracy ≤ 50m).
  7. Click **"Submit Registration"**.
- **Expected Frontend Result:** Displays confirmation notice: "Branch Registered — Pending Location Approval". New branch appears in directory with yellow `Location Pending` badge.
- **Expected Supabase Result:** Rows inserted in `public.organisations`, `public.branches` (`operating_status = 'location_pending'`), `public.branch_location_pins` (`is_active = false`), and `public.client_contacts`.
- **Evidence to Capture:** Screenshot of registration success screen.
- **Status:** **PASS** (Verified Locally)

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
- **Expected Supabase Result:** New `branches` and `client_contacts` records successfully inserted; no unique constraint violation.
- **Evidence to Capture:** Screenshot of shared phone warning notice.
- **Status:** **PASS** (Verified Locally)

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
- **Expected Supabase Result:** Row inserted in `public.visits` with `location_classification: 'inside_confident'`, `status: 'location_verified'`, and `rule_version_id`. Photo stored in `visit-premises-photos`.
- **Evidence to Capture:** Screenshot of active visit timer and green verified badge.
- **Status:** **PASS** (Verified Locally)

---

### UAT-SP-08: Visit Check-in Outside Geofence Rejection (AT-02)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Verify that check-in attempts outside the 200m geofence radius are rejected for location-verified status and trigger retry/exception prompt.
- **Prerequisites:** Device location simulated > 200m from branch pin (e.g. 350m away).
- **Steps:**
  1. Select branch.
  2. Check-in GPS reading indicates distance > 200m.
  3. Attempt check-in.
- **Expected Frontend Result:** App warns that device is outside the 200m geofence boundary. Offers two options: "Retry GPS Fix" or "Submit Reasoned Exception". Verified check-in is blocked.
- **Expected Supabase Result:** Backend trigger `trg_validate_visit_location_verification` aborts insert with code `23514` if client attempts to force `inside_confident`.
- **Evidence to Capture:** Screenshot of outside-geofence warning dialog.
- **Status:** **PASS** (Verified Locally)

---

### UAT-SP-09: Single Active Visit Protection (AT-04)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Verify that disallowance of parallel open visits is strictly enforced.
- **Prerequisites:** Active visit in progress from UAT-SP-07.
- **Steps:**
  1. Navigate to Home.
  2. Attempt to click "Visit Client" or start a second visit session.
- **Expected Frontend Result:** App blocks starting a new visit; displays banner: "Active visit currently in progress at Terminal Alpha. Please complete or checkout existing visit before starting another."
- **Expected Supabase Result:** Database partial unique index `uq_single_open_visit_per_rep` prevents concurrent unclosed visits.
- **Evidence to Capture:** Screenshot of open visit blocker message.
- **Status:** **PASS** (Verified Locally)

---

### UAT-SP-10: Meeting Documentation & Optional Business Card Photo (PRD §7.3)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Complete meeting log with PRD-mandated fields and capture optional business card.
- **Prerequisites:** Active visit session open.
- **Steps:**
  1. Click **"Document Meeting"** or proceed to meeting log step.
  2. Select Contact Met: "Segun Obasanjo (Fleet Manager)".
  3. Select Visit Purpose: "Product discussion".
  4. Select Products: "Tyres", "Batteries", "Lubricants".
  5. Select Meeting Outcome: "Information requested".
  6. Enter Fleet Size: "45 commercial trucks".
  7. Enter Free-Text Next Step: "Prepare product pricing sheet for 315/80R22.5 tyres and deliver by Thursday afternoon".
  8. Enter Notes: "Client expanding fleet by 10 tractor heads next month".
  9. Capture optional business card photo.
  10. Click **"Save Meeting Log"**.
- **Expected Frontend Result:** Meeting log saved successfully. Confirmation indicator shows log attached to visit.
- **Expected Supabase Result:** Row inserted in `public.meeting_logs` linked to `visit_id`. Card photo saved to `business-cards/<user_id>/...`. Next step stored strictly as narrative text (zero task engine records created).
- **Evidence to Capture:** Screenshot of completed meeting log form.
- **Status:** **PASS** (Verified Locally)

---

### UAT-SP-11: Visit Checkout Outside Geofence with Automated Flag (AT-03)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Permit checkout when representative has left the geofence radius while generating an automated operational flag.
- **Prerequisites:** Active visit open; device location outside 200m.
- **Steps:**
  1. Click **"Check Out"**.
  2. Observe location warning: "You are currently 420m from branch premises".
  3. Click **"Confirm Checkout Outside Geofence"**.
- **Expected Frontend Result:** Visit session closes cleanly. Modal closes and home dashboard updates completed visit count. Notice displays: "Visit checked out; flagged for manager review due to departure distance."
- **Expected Supabase Result:** `public.visits` updated with `check_out_at` and checkout coordinates. Immutability trigger preserves original check-in evidence. Row inserted in `public.verification_flags` with `flag_type = 'checkout_outside_geofence'`.
- **Evidence to Capture:** Screenshot of checkout outside geofence prompt and completed visit card.
- **Status:** **PASS** (Verified Locally)

---

### UAT-SP-12: End Day Hard Block on Open Active Visit (PRD §6.1 / AT-03)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Confirm representative cannot close attendance day while a physical visit session remains open.
- **Prerequisites:** Start a new visit session so an open visit exists.
- **Steps:**
  1. Navigate to `/home`.
  2. Click **"End Day"**.
- **Expected Frontend Result:** Hard block modal appears: "Cannot End Workday: You have an active visit in progress at [Branch Name]. PRD §6.1 requires checking out of all customer premises before closing daily attendance." "Confirm End Day" button is disabled.
- **Expected Supabase Result:** Database trigger `trg_block_end_day_if_active_visit` raises `23514` check violation if checkout is bypassed.
- **Evidence to Capture:** Screenshot of End Day hard block dialog.
- **Status:** **PASS** (Verified Locally)

---

### UAT-SP-13: Salesperson-Originated GPS / Device Exception Claim (AT-12)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Submit an unverified visit exception claim due to GPS failure; verify manager cannot originate exception.
- **Prerequisites:** Salesperson logged in.
- **Steps:**
  1. Navigate to `/exceptions` (or click "My Exceptions").
  2. Click **"Create Exception Claim"**.
  3. Select Reason: "GPS Failure (Deep Urban Canyon / Satellite Reception Failure)".
  4. Select Branch: "Apex Heavy Logistics".
  5. Select Claimed Visit Time: Today, 11:30 AM.
  6. Enter Narrative: "Encountered total satellite lock loss inside industrial warehouse container yard. Met with Operations Supervisor Ibrahim."
  7. Click **"Submit Exception Claim"**.
- **Expected Frontend Result:** Exception claim appears in rep's exceptions list with status `Pending Review`.
- **Expected Supabase Result:** Row inserted in `public.exceptions` with `creator_user_id = auth.uid()`, `status = 'pending_review'`.
- **Evidence to Capture:** Screenshot of rep's exceptions list showing pending claim.
- **Status:** **PASS** (Verified Locally)

---

### UAT-SP-14: Non-Visit Workday Request (PRD §2.2 / AT-11)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Request an authorized non-visit day for office proposal preparation; confirm it counts toward attendance without creating visit targets.
- **Prerequisites:** Salesperson logged in.
- **Steps:**
  1. Navigate to `/non-visit-days`.
  2. Click **"Request Non-Visit Day"**.
  3. Select Date: Tomorrow.
  4. Select Category: "Proposal Preparation (Office)".
  5. Enter Reason: "Preparing tender documentation for Dangote Cement commercial fleet supply".
  6. Click **"Submit Request"**.
- **Expected Frontend Result:** Request appears in list with yellow `Pending Approval` badge and explanation notice: "Approved non-visit days count toward attendance, strictly zero physical visit targets."
- **Expected Supabase Result:** Row inserted in `public.absence_requests` with `status = 'pending'`.
- **Evidence to Capture:** Screenshot of Non-Visit Days list with pending request.
- **Status:** **PASS** (Verified Locally)

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
- **Expected Frontend Result:** Ticket submitted; ticket status banner appears on device card: "Replacement Ticket #5d932... Submitted directly to HQ IT Depot. Status: Under Review."
- **Expected Supabase Result:** Row inserted in `public.device_replacement_requests` with `status = 'submitted'`, `market_code = 'NG'`.
- **Evidence to Capture:** Screenshot of replacement ticket card on profile view.
- **Status:** **PASS** (Verified Locally)

---

## Suite 2: Country Sales Head Review Workbenches (UAT-CSH)

### UAT-CSH-01: Operational Dashboard & Team Attendance Telemetry
- **Role:** Country Sales Head (Nigeria)
- **Objective:** Review country attendance, inspect representative GPS fix accuracy, and view signed selfie.
- **Prerequisites:** Salesperson check-in submitted in UAT-SP-02.
- **Steps:**
  1. Log in as `babatunde.adeleke@carboncarcare.com`.
  2. View Country Dashboard `/reviews`.
  3. Navigate to **Team Attendance** `/reviews/attendance`.
  4. Click on Tunde Adebayo's attendance card.
- **Expected Frontend Result:** Dashboard displays team totals: 4 reps scheduled, 1 started, 0 absent. Attendance table shows check-in time, device tag `CAR-TST-121585`, and GPS accuracy. Clicking inspection opens modal with live signed selfie image and coordinate pin.
- **Expected Supabase Result:** `attendance_days` query filtered strictly by `market_code = 'NG'`. Signed URL generated from private bucket `attendance-selfies`.
- **Evidence to Capture:** Screenshot of Team Attendance table and selfie inspection modal.
- **Status:** **PASS** (Verified Locally)

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
- **Status:** **PASS** (Verified Locally)

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
- **Status:** **PASS** (Verified Locally)

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
- **Expected Supabase Result:** RPC `review_salesperson_exception` sets `exceptions.status = 'approved'`, updates visit `status = 'manager_approved_unverified'`, and logs decision to `public.approval_audit`.
- **Evidence to Capture:** Screenshot of adjudicated exception and unverified status badge.
- **Status:** **PASS** (Verified Locally)

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
- **Status:** **PASS** (Verified Locally)

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
- **Evidence to Capture:** Screenshot of resolved flag details.
- **Status:** **PASS** (Verified Locally)

---

### UAT-CSH-07: Weekly 5% Client Audit Sampling & Telephone Verification (AT-13)
- **Role:** Country Sales Head (Nigeria)
- **Objective:** Verify 5% weekly random audit sampling and execute telephone verification call workbench.
- **Prerequisites:** Verified visits exist in Nigeria.
- **Steps:**
  1. Navigate to **Client Audits** `/reviews/audits`.
  2. Observe audit sample calculation: `max(1, ceil(0.05 * TotalVerifiedVisits))`.
  3. Select an audit record assigned for verification.
  4. Click **"Call Client Contact"**.
  5. Select Call Outcome: "Client Denial (Client Denies Representative Visited)".
  6. Enter Audit Notes: "Spoke with Facility Manager; claims no meeting took place today".
  7. Submit call log.
- **Expected Frontend Result:** Visit audit outcome changes to red badge `Disputed — Pending Review`. Notice displays: "Client denial automatically initiated dispute investigation (PRD §6.5 / AT-13). Zero disciplinary penalties applied automatically."
- **Expected Supabase Result:** `client_audit_records.audit_outcome` set to `disputed`, `dispute_status` set to `under_investigation`.
- **Evidence to Capture:** Screenshot of Disputed audit record and investigation banner.
- **Status:** **PASS** (Verified Locally)

---

### UAT-CSH-08: Audit Dispute Investigation & Formal Resolution
- **Role:** Country Sales Head (Nigeria)
- **Objective:** Investigate and formally resolve a disputed client audit visit.
- **Prerequisites:** Disputed audit record from UAT-CSH-07.
- **Steps:**
  1. Locate disputed visit in Client Audit Workbench.
  2. Click **"Investigate Dispute"**.
  3. Review check-in premises photo and meeting notes.
  4. Select Resolution: "Resolved — Valid Meeting (Representative Substantiated)".
  5. Enter Mandatory Inquiry Rationale: "Reviewed security gate register photograph and confirmed representative was admitted at 10:15 AM under visitor badge #44. Client contact was in yard and had not checked front desk."
  6. Confirm resolution.
- **Expected Frontend Result:** Status updates to `Resolved Valid`. Original client denial preserved in audit history.
- **Expected Supabase Result:** RPC `resolve_client_audit_dispute` updates `client_audit_records.audit_outcome = 'resolved_valid'`, sets `dispute_status = 'resolved'`, and appends resolution note to audit history.
- **Evidence to Capture:** Screenshot of resolved dispute audit card.
- **Status:** **PASS** (Verified Locally)

---

### UAT-CSH-09: Country CSV Export with CWE-1236 Sanitization (PRD §7.2)
- **Role:** Country Sales Head (Nigeria)
- **Objective:** Export country attendance and visits CSV; verify spreadsheet formula injection protection.
- **Prerequisites:** Operational records exist in Nigeria.
- **Steps:**
  1. Navigate to **Country Reporting & Exports** `/reviews/export`.
  2. Select Export Type: "Consolidated Attendance & Visits".
  3. Click **"Generate CSV Export"**.
  4. Download generated CSV and open in text editor.
- **Expected Frontend Result:** CSV downloads cleanly. Export job recorded in history table.
- **Expected Supabase Result:** Row inserted in `public.export_jobs` with `status = 'completed'`, `formula_escaped = true`. Any string cell starting with `=`, `+`, `-`, or `@` is prefixed with a single quote `'`.
- **Evidence to Capture:** Text snippet of raw exported CSV showing safe escaping.
- **Status:** **PASS** (Verified Locally)

---

## Suite 3: HQ Administrator Central Console (UAT-HQ)

### UAT-HQ-01: Multi-Market Operations Oversight Dashboard
- **Role:** HQ Administrator
- **Objective:** View cross-country operations dashboard; confirm multi-market aggregation across Nigeria, Zambia, and Malawi.
- **Prerequisites:** Operational data exists in all three markets.
- **Steps:**
  1. Log in as `hq.admin@carboncarcare.com`.
  2. View HQ Operations Dashboard `/admin`.
  3. Filter by Market: "ALL", then "Nigeria", then "Zambia", then "Malawi".
- **Expected Frontend Result:** Global overview displays tri-market KPIs: Total Field Staff, Total Verified Visits, Approved Unverified Activities, Open Exceptions, and Fleet Handset Counts. Market filter cleanly slices data per territory.
- **Expected Supabase Result:** Queries cross-market tables (`profiles`, `visits`, `devices`, `exceptions`) without RLS market restriction.
- **Evidence to Capture:** Screenshot of HQ Multi-Market Dashboard.
- **Status:** **PASS** (Verified Locally)

---

### UAT-HQ-02: New Employee Provisioning with Handset Assignment (ADR 0016)
- **Role:** HQ Administrator
- **Objective:** Provision a new field representative via Edge API; assign company handset during creation; verify credentials modal.
- **Prerequisites:** Unassigned handset available in target market depot.
- **Steps:**
  1. Navigate to **User Management** `/admin/users`.
  2. Click **"Provision New Employee"**.
  3. Enter Name: "Kafui Mensah".
  4. Enter Email: `kafui.mensah@carboncarcare.com`.
  5. Enter Phone: `+260 971 888 999`.
  6. Select Role: "Field Salesperson".
  7. Select Market: "Zambia (Lusaka Hub)".
  8. Select Available Depot Handset from dropdown.
  9. Click **"Create Employee & Provision Account"**.
- **Expected Frontend Result:** Creation succeeds; displays Credential Handoff Modal with temporary password and copy button. User appears in user table with active status and assigned device tag.
- **Expected Supabase Result:** Edge API creates user in `auth.users`, creates row in `public.profiles`, and inserts active row in `public.device_assignments`.
- **Evidence to Capture:** Screenshot of Credential Handoff modal and updated user row.
- **Status:** **PASS** (Verified Locally)

---

### UAT-HQ-03: Zero-Blocker Handset Custody Reassignment Supersession (ADR 0018)
- **Role:** HQ Administrator
- **Objective:** Reassign a new handset to a representative who already holds an active phone; confirm automatic supersession without manual blocking.
- **Prerequisites:** Salesperson Merusha Kisten already holds active device `EHNO-123`. Unassigned handset `CAR-NG-002` available in depot.
- **Steps:**
  1. Navigate to **Device Inventory** `/admin/devices`.
  2. Locate unassigned handset `CAR-NG-002`.
  3. Click **"Assign Handset"**.
  4. Select Custodian: "Merusha Kisten".
  5. Observe Custody Reassignment Notice: "Salesperson Merusha Kisten currently holds active device EHNO-123. Reassignment will automatically mark the existing device as returned to depot."
  6. Click **"Confirm Handover & Reassign"**.
- **Expected Frontend Result:** Handover completes cleanly without blocking error. `CAR-NG-002` status updates to `assigned` to Merusha Kisten. Old device `EHNO-123` returns to depot inventory (`returned`).
- **Expected Supabase Result:** `device_assignments` for `EHNO-123` set `is_current = false, returned_at = now()`. New row inserted for `CAR-NG-002` with `is_current = true`. Single active device invariant preserved.
- **Evidence to Capture:** Screenshot of Custody Reassignment Notice and post-assignment table.
- **Status:** **PASS** (Verified Locally)

---

### UAT-HQ-04: Direct-to-HQ Device Replacement Lifecycle (ADR 0018)
- **Role:** HQ Administrator
- **Objective:** Process direct-to-HQ replacement ticket: allocate depot spare, dispatch with courier waybill, confirm activation, and record old device disposition.
- **Prerequisites:** Replacement ticket submitted in UAT-SP-15.
- **Steps:**
  1. Navigate to **Device Management → Replacement Requests** `/admin/devices/replacements`.
  2. Locate ticket from Tunde Adebayo (Screen Damage).
  3. Click **"Approve & Allocate Spare"**.
  4. Select available handset from depot inventory.
  5. Click **"Assign Spare Handset"**.
  6. Enter Courier Dispatch Notes: "DHL Express Waybill NG-88214 dispatched to Lagos territory hub".
  7. Click **"Confirm Dispatch"**.
  8. Upon delivery, click **"Confirm Knox Activation & Close Ticket"**.
  9. Select Old Device Disposition: "Returned to Depot (Under Maintenance)".
- **Expected Frontend Result:** Ticket transitions through `approved` → `awaiting_spare` → `dispatched` → `completed`. Representative's active device updates in real time.
- **Expected Supabase Result:** `device_replacement_requests.status` updated to `completed`. Immutable history recorded in `public.device_replacement_history`. Old handset marked `under_maintenance` in `public.devices`.
- **Evidence to Capture:** Screenshot of completed replacement lifecycle card.
- **Status:** **PASS** (Verified Locally)

---

### UAT-HQ-05: ERP Client Master CSV Ingestion & Validation (PRD §4.1)
- **Role:** HQ Administrator
- **Objective:** Perform bulk ERP client master CSV ingestion; verify phone normalization, duplicate warnings, and batch logging.
- **Prerequisites:** CSV prepared with client organizations and branches.
- **Steps:**
  1. Navigate to **Client Master Import** `/admin/clients/import`.
  2. Select Market: "Nigeria".
  3. Upload `clients_master_sample.csv`.
  4. Click **"Validate CSV Data"**.
  5. Review preview statistics: Valid rows, duplicate warnings, unpinned locations.
  6. Click **"Commit Import Batch"**.
- **Expected Frontend Result:** Import commits with green success indicator. Displays immutable Batch ID. Unpinned branches marked `Location Pending`.
- **Expected Supabase Result:** Row inserted in `public.import_batches` with row counts and checksum. Branches and client contacts created in database.
- **Evidence to Capture:** Screenshot of Import Batch confirmation screen.
- **Status:** **PASS** (Verified Locally)

---

### UAT-HQ-06: Market Rule Configuration & Versioning (PRD §6.1 / §6.6)
- **Role:** HQ Administrator
- **Objective:** Update market geofence radius and GPS accuracy thresholds; confirm non-retroactivity token preservation.
- **Prerequisites:** HQ Admin console open.
- **Steps:**
  1. Navigate to **Market Configuration** `/admin/markets`.
  2. Select Market: "Nigeria".
  3. Adjust Default Branch Geofence Radius from 200m to 220m.
  4. Adjust Desired GPS Accuracy from 100m to 80m.
  5. Click **"Save Configuration & Publish Version"**.
- **Expected Frontend Result:** Configuration saved; active rule version increments (e.g. `v1.2.06`). Historical rule records preserved in version list.
- **Expected Supabase Result:** New row inserted in `public.market_rules` with `is_active = true`; previous version set `is_active = false`. Historical visits retain original captured `rule_version_id`.
- **Evidence to Capture:** Screenshot of Market Configuration rule versions table.
- **Status:** **PASS** (Verified Locally)

---

### UAT-HQ-07: Append-Only System Audit Log Ledger (PRD §7.1)
- **Role:** HQ Administrator
- **Objective:** Inspect immutable system audit log ledger; confirm administrative actions produce non-deletable records.
- **Prerequisites:** Administrative actions performed in UAT-HQ-02 through UAT-HQ-06.
- **Steps:**
  1. Navigate to **System Audit Logs** `/admin/audit`.
  2. Search for recent actions ("PROVISION", "REASSIGN", "REPLACEMENT").
  3. Inspect actor name, role, timestamp, target entity, and change summary.
- **Expected Frontend Result:** Complete chronological ledger of governance events displayed. Zero edit or delete buttons exist.
- **Expected Supabase Result:** Data sourced from `public.approval_audit`. Direct SQL DELETE or UPDATE attempts are rejected by database permissions.
- **Evidence to Capture:** Screenshot of System Audit Log ledger.
- **Status:** **PASS** (Verified Locally)

---

## Suite 4: Cross-Role Workflow Handoffs (UAT-XO)

### UAT-XO-01: End-to-End Client Registration → Pin Approval → Verified Visit
- **Role:** Salesperson & Country Sales Head
- **Objective:** Validate complete multi-role lifecycle of a new client branch from field registration to approved visit.
- **Steps:**
  1. **Salesperson:** Registers new branch "Ikeja Fleet Yard" with premises photo and GPS fix (UAT-SP-05).
  2. **Country Sales Head:** Logs in; sees pending pin in Branch Approvals queue; inspects photo and approves pin (UAT-CSH-03).
  3. **Salesperson:** Refreshes client list; selects "Ikeja Fleet Yard"; checks in with live photo and PostGIS validation (UAT-SP-07).
  4. **Country Sales Head:** Navigates to Visit Verification; inspects verified visit evidence.
- **Expected Outcome:** Seamless operational transition: branch moves from `location_pending` to `active`; visit qualifies as `location_verified`; CSH inspects evidence.
- **Status:** **PASS** (Verified Locally)

---

### UAT-XO-02: End-to-End Hardware Replacement Lifecycle
- **Role:** Salesperson & HQ Administrator
- **Objective:** Validate complete multi-role lifecycle of defective company device replacement with zero Country Sales Head bottleneck.
- **Steps:**
  1. **Salesperson:** Reports device issue under Profile → My Device (UAT-SP-15).
  2. **Country Sales Head:** Logs in; verifies NO approval bottleneck or action tile exists for device hardware replacement.
  3. **HQ Admin:** Logs in; approves replacement, allocates spare from depot, records courier tracking (UAT-HQ-04).
  4. **Salesperson:** Views dispatched status and tracking number on profile.
  5. **HQ Admin:** Confirms Knox activation and records old handset returned to depot.
  6. **Salesperson:** Profile automatically updates with new handset asset tag and Knox active badge.
- **Expected Outcome:** Hardware replacement flows strictly between representative and HQ Admin without intermediary bottlenecks.
- **Status:** **PASS** (Verified Locally)

---

### UAT-XO-03: End-to-End Field Exception Claim → Manager Adjudication
- **Role:** Salesperson & Country Sales Head
- **Objective:** Validate that a salesperson-created GPS failure exception is reviewed and approved as unverified activity.
- **Steps:**
  1. **Salesperson:** Submits GPS failure claim with detailed reason (UAT-SP-13).
  2. **Country Sales Head:** Receives claim in Exception Review workbench; inspects justification; approves claim with mandatory rationale (UAT-CSH-04).
  3. **Both Roles:** Verify visit is classified as `Manager Approved — Location Unverified` and reported separately from verified visits.
- **Expected Outcome:** Manager adjudication recorded in immutable audit trail; visit NEVER converted to location verified.
- **Status:** **PASS** (Verified Locally)

---

## Suite 5: Multi-Country Sandboxing & Boundary Security (UAT-SEC)

### UAT-SEC-01: Cross-Market Branch Isolation (Nigeria Rep vs Zambia Branches)
- **Role:** Nigeria Salesperson
- **Objective:** Confirm representative cannot view, search, or associate visits with branches outside assigned market.
- **Steps:**
  1. Log in as Tunde Adebayo (`NG`).
  2. Search client directory for Zambian branch "Zambezi Freight" or Malawian branch "Blantyre Central Depot".
- **Expected Frontend Result:** Zero results returned.
- **Expected Supabase Result:** RLS policy `branches_select` restricts query to `market_code = 'NG'`. Direct API insert attempt returns 400 check violation ("Branch market does not match salesperson assigned market").
- **Status:** **PASS** (Verified Locally)

---

### UAT-SEC-02: Cross-Market Manager Isolation (Zambia CSH vs Nigeria Exceptions)
- **Role:** Zambia Country Sales Head
- **Objective:** Confirm manager cannot view or adjudicate exception claims originating in another country.
- **Steps:**
  1. Log in as Chileshe Mwape (`ZM`).
  2. View Exception Review workbench.
  3. Attempt to query or review Nigerian exception #2aadc37a.
- **Expected Frontend Result:** Nigerian exceptions are completely invisible. Direct RPC invocation fails with `P0001: Unauthorized: Country Sales Head cannot review exceptions outside assigned market`.
- **Expected Supabase Result:** RPC `review_salesperson_exception` enforces strict market match (`v_rep_market = v_csh_market`).
- **Status:** **PASS** (Verified Locally)

---

### UAT-SEC-03: Sole-Author Field Evidence Protection
- **Role:** Country Sales Head & HQ Admin
- **Objective:** Confirm managers and administrators cannot insert, edit, or forge salesperson attendance or visit records.
- **Steps:**
  1. Attempt direct API insert into `attendance_days` or `visits` using Country Sales Head or HQ Admin token.
- **Expected Frontend Result:** No UI button exists for manager visit creation.
- **Expected Supabase Result:** Database RLS policy blocks non-salesperson inserts with error `42501 (insufficient_privilege)`.
- **Status:** **PASS** (Verified Locally)

---

## Suite 6: Offline-First Operation & Queue Recovery (UAT-OFF)

### UAT-OFF-01: Complete Workday Capture in Airplane Mode
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Execute full workday offline: Start Day, Check In, Photograph Premises, Check Out, Meeting Log, and End Day.
- **Prerequisites:** Salesperson logged in; cached app shell loaded.
- **Steps:**
  1. Enable Airplane Mode (disconnect cellular and Wi-Fi).
  2. Click "Start Day" and capture offline selfie.
  3. Select cached branch and check in with live premises photo.
  4. Complete meeting log.
  5. Check out.
  6. Click "End Day".
  7. Navigate to Offline Queue `/offline-sync`.
- **Expected Frontend Result:** All actions succeed locally. Badges indicate "Captured Offline — Pending Sync". Queue shows 5 ordered events with thumbnail previews.
- **Expected Supabase Result:** Zero database mutations while offline. All records held in client IndexedDB `CarbonOfflineJournalDB`.
- **Status:** **PASS** (Verified Locally)

---

### UAT-OFF-02: Topological Dependency Sync & Idempotent Retry (AT-05 / AT-06)
- **Role:** Field Salesperson (Nigeria)
- **Objective:** Reconnect to network; sync offline queue; retry sync to verify zero duplicate creation.
- **Prerequisites:** Offline events queued in UAT-OFF-01.
- **Steps:**
  1. Disable Airplane Mode (restore network connectivity).
  2. Navigate to `/offline-sync`.
  3. Click **"Sync Now"**.
  4. Observe upload progress for binary photos and event batch.
  5. Click **"Sync Now"** a second time immediately after completion.
- **Expected Frontend Result:** First sync succeeds; queue count drops to 0; status displays "All Events Synchronized". Second sync returns "0 items pending; already synchronized" with zero errors.
- **Expected Supabase Result:** First sync commits attendance, visit, photo, meeting log, and end-day in exact dependency order. Second sync returns `accepted_duplicate` for all event UUIDs with ZERO row increments (AT-06).
- **Status:** **PASS** (Verified Locally)

---

## Suite 7: Physical Android Hardware Acceptance (UAT-HW)

### UAT-HW-01: Samsung Galaxy A15 Outdoor Sunlight Usability
- **Role:** Field Salesperson
- **Objective:** Verify UI contrast, font legibility, and touch targets outdoors in direct African sunlight.
- **Prerequisites:** Samsung Galaxy A15 physical handset.
- **Steps:**
  1. Launch PWA in direct sunlight.
  2. Walk through client search, GPS fix gauge, and photo capture.
- **Expected Result:** High-contrast design tokens (`#21409A`, `#1B9A4A`, `#FFFFFF`) remain clearly readable. Touch targets ≥ 48px are easily pressed.
- **Status:** **IMPLEMENTED — MANUAL UAT PENDING** (Physical Handset Required)

---

### UAT-HW-02: Android Multi-Camera Lens Switching
- **Role:** Field Salesperson
- **Objective:** Verify rear-to-front camera switching on Samsung triple-camera setup.
- **Prerequisites:** Samsung Galaxy A15 physical handset.
- **Steps:**
  1. Open visit check-in viewfinder.
  2. Tap camera flip icon.
- **Expected Result:** Viewfinder smoothly transitions between ultra-wide/main rear camera and front selfie camera without video freeze.
- **Status:** **IMPLEMENTED — MANUAL UAT PENDING** (Physical Handset Required)

---

## Suite 8: Reporting, Metrics & Data Integrity (UAT-RPT)

### UAT-RPT-01: Strict Separation of Verified vs. Unverified Visit KPIs
- **Role:** Country Sales Head
- **Objective:** Confirm manager dashboard separates Location-Verified visits from Manager-Approved Unverified activities.
- **Prerequisites:** Mix of verified visits and approved exceptions in database.
- **Steps:**
  1. View Country Reporting `/reviews/reporting`.
  2. Inspect KPI metric cards.
- **Expected Frontend Result:**
  - Card 1: "Location-Verified Visits" = 22.
  - Card 2: "Manager-Approved Unverified Activities" = 33.
  - Verified Visit share displays distinct percentage. Approved unverified counts are NEVER added to verified totals (PRD §1.2 counting policy).
- **Expected Supabase Result:** SQL aggregation groups by `status = 'location_verified'` vs `status = 'manager_approved_unverified'`.
- **Status:** **PASS** (Verified Locally)

---

### UAT-RPT-02: Non-Visit Workdays Attendance-Only Metric Accounting
- **Role:** Country Sales Head
- **Objective:** Confirm approved non-visit workdays increment attendance percentage but contribute zero to physical visit targets.
- **Prerequisites:** Approved absence in database.
- **Steps:**
  1. Inspect representative attendance report for day with approved training.
- **Expected Frontend Result:** Representative marked "Present (Non-Visit Activity)". Daily visit target shows `0/0`. Team visit target denominator does not increase.
- **Expected Supabase Result:** `approved_absences` joined to attendance calculation; excluded from physical visit target calculations.
- **Status:** **PASS** (Verified Locally)

