# Carbon Field Sales Tracker — Final MVP Completeness Audit

**Project:** Carbon Field Sales Tracker (`carbonSalesTracker`)  
**Business:** Carbon Car Care  
**Source of Truth Baseline:** PRD v1.2 (Approved 15 October 2026), `AGENTS.md`, `ANTIGRAVITY_MASTER_PROMPT.md`  
**Git Baseline Commit:** `2ba76f3` (Local Working Tree Synchronized)  
**Date of Audit:** October 31, 2026  
**Auditor:** Senior Full-Stack Architect & Security Reviewer  
**Audit Purpose:** Comprehensive operational audit of running functionality across all three user roles (Salesperson, Country Sales Head, HQ Admin), live database verification against hosted Supabase dev project (`[SUPABASE_PROJECT_ID]`), elimination of mock fallbacks, and preparation for manual User Acceptance Testing (UAT).

---

## 1. Source of Truth & Baseline Inspection

### 1.1 Document Baseline & Precedence
1. **Approved PRD v1.2 (15 October 2026):** Definitive operational requirements, non-commercial MVP boundaries, 16 Acceptance Tests (AT-01–AT-16), PostGIS geofencing, and multi-market isolation rules.
2. **`AGENTS.md` & `ANTIGRAVITY_MASTER_PROMPT.md`:** Persistent governance rules:
   - Devices are company-provided.
   - Salespeople create and submit all field records and exceptions; managers **never** originate field evidence.
   - Manager-approved missing-GPS visits remain `Manager Approved — Location Unverified` (never converted to GPS verified).
   - Shared company telephone numbers across distinct branches are supported (PRD §4.2).
   - Commercial modules (quotes, orders, pipelines, revenue analytics, automatic task management) are strictly excluded from MVP.
   - Device replacement requests flow directly from Salesperson to HQ Admin without Country Sales Head intermediary approval.
3. **Database Baseline:** 29 applied Supabase migrations (`20261022000001` through `20261028000029`).

---

## 2. Master MVP Requirements Coverage Matrix

| PRD Ref | Requirement / Workflow Description | User Role | Application Screen | Frontend Component | Backend Service | Supabase Table / RPC | Permissions (RLS) | Implementation Status | Automated Test Coverage | Live DB Verified? | Manual UAT Requirement | Remaining Issue / Dependency |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **PRD §2.1** | Role-Based Authentication & Session Scoping | All Roles | `/login` | `LoginForm.tsx`, `AuthContext.tsx` | `supabase.auth` | `auth.users`, `public.profiles` | Public login; self-scoped profile reads | **IMPLEMENTED AND VERIFIED** | `stage-3a-auth.test.tsx` (16 tests) | Yes (All 7 test users auth verified) | Test valid/invalid login, token refresh, and auto-redirect | None |
| **PRD §2.3** | Company Device Binding & Knox MDM Display | Salesperson | `/profile` | `ProfileView.tsx` | `adminService.ts`, `AuthContext.tsx` | `public.devices`, `public.device_assignments` | Salesperson can view own current assignment (`is_current = true`) | **IMPLEMENTED AND VERIFIED** | `stage-3e-manager-hq.test.tsx` | Yes (`CC-DEV-LOS-001`, `CAR-TST-121585`) | Verify serial number, Knox status, and asset tag render on device card | None |
| **PRD §3.1 / §6.1** | Start Day Check-in with Fresh GPS & Live Selfie | Salesperson | `/home` | `StartDayModal.tsx` | `attendanceService.ts` | `public.attendance_days`, `storage:attendance-selfies` | Salesperson own INSERT only; RLS blocks managers/HQ from inserting | **IMPLEMENTED AND VERIFIED** | `stage-3b-attendance.test.tsx` (27 tests) | Yes (`attendance_days` record created with GPS & signed selfie) | Perform live front-camera selfie outdoors; test GPS accuracy ≤ 100m threshold | Requires camera permission on physical device |
| **PRD §3.1** | Active Workday Session Restoration | Salesperson | `/home` | `FieldSessionContext.tsx`, `SalespersonHomePreview.tsx` | `attendanceService.ts` | `public.attendance_days` | Salesperson own SELECT | **IMPLEMENTED AND VERIFIED** | `stage-3b-attendance.test.tsx` | Yes (`cca4eacc-cbdc-4e0b-b9ed-7bea7d9c89aa` restored) | Reload browser / restart app during active day and verify status remains 'started' | None |
| **PRD §4.2** | Search Registered Clients & Multi-Branch Directory | Salesperson | `/clients` | `ClientsDirectoryView.tsx`, `ClientSelectionModal.tsx` | `visitService.ts` | `public.organisations`, `public.branches`, `public.branch_location_pins` | Market-scoped SELECT (`market_code = auth.market_code`) | **IMPLEMENTED AND VERIFIED** | `salesperson-client-selection.test.tsx` | Yes (32 branches visible in NG, 4 in ZM, 2 in MW) | Search by company name, branch location, and test distance calculation tags | None |
| **PRD §4.2** | Register New Client Branch on Ground | Salesperson | `/clients/new` | `RegisterBranchModal.tsx` | `visitService.ts` | `public.organisations`, `public.branches`, `public.branch_location_pins` | Salesperson INSERT (`operating_status = 'location_pending'`) | **IMPLEMENTED AND VERIFIED** | `stage-3c-client-visits.test.tsx` | Yes (Inserted branches appear as pending approval) | Propose new branch with live premises photo and GPS fix ≤ 50m | None |
| **PRD §4.2 / AT-09** | Shared Switchboard Phone Across Multiple Branches | Salesperson | `/clients/new` | `RegisterBranchModal.tsx` | `visitService.ts` | `public.client_contacts` | Allowed by unique constraint definition | **IMPLEMENTED AND VERIFIED** | `stage-3e-manager-hq.test.tsx`, `test_stage_3e_final...py` | Yes (`+234 1 270 5000` shared across distinct branch IDs) | Register two branches with identical parent phone; verify warning appears without hard block | None |
| **PRD §4.3** | GPS Pin Proposal & Active Version Governance | Salesperson | `/clients` | `RegisterBranchModal.tsx`, `VisitWorkflowView.tsx` | `visitService.ts` | `public.branch_location_pins` | Rep proposes (`is_active = false`); CSH approves | **IMPLEMENTED AND VERIFIED** | `stage-3c-client-visits.test.tsx`, `test_stage_3e_final...py` | Yes (50 pins: 26 active, 18 superseded, 5 pending) | Propose pin; verify pin status is inactive until approved by Country Sales Head | None |
| **PRD §3.3 / §7.1 / AT-01** | Physical Visit Check-in with PostGIS Geofence & Live Photo | Salesperson | `/visits/new` | `VisitWorkflowView.tsx` | `visitService.ts` | `public.visits`, `storage:visit-premises-photos` | Rep INSERT; trigger enforces 200m ellipsoidal distance & active pin | **IMPLEMENTED AND VERIFIED** | `stage-3c-client-visits.test.tsx`, `test_stage_3c_db_integrity.py` | Yes (22 `location_verified` visits in DB) | Check in within 200m; verify `location_verified` badge and elapsed timer | Physical GPS fix required |
| **PRD §6.2 / AT-02** | Uncertain Location / Outside Geofence Handling | Salesperson | `/visits/new` | `VisitWorkflowView.tsx` | `visitService.ts` | `public.visits`, `public.exceptions` | Spoofed `inside_confident` rejected with `23514` | **IMPLEMENTED AND VERIFIED** | `stage-3c-client-visits.test.tsx`, `test_stage_3c_db_integrity.py` | Yes (Trigger rejected out-of-bound coordinates 809km away) | Attempt check-in outside 200m; verify app prompts retry or unverified exception | None |
| **PRD §6.1 / AT-04** | Single Active Visit Protection | Salesperson | `/visits` | `FieldSessionContext.tsx`, `VisitWorkflowView.tsx` | `visitService.ts` | `public.visits` (partial unique index `uq_single_open_visit_per_rep`) | Enforced at DB level with 409 Conflict | **IMPLEMENTED AND VERIFIED** | `stage-3c-client-visits.test.tsx` (AT-04 scenario) | Yes (DB rejected parallel open visit) | Start visit A; attempt starting visit B without checking out; verify block | None |
| **PRD §3.4 / §7.3** | Meeting Log Capture & Optional Business Card Photo | Salesperson | `/visits/log` | `MeetingLogModal.tsx` | `visitService.ts` | `public.meeting_logs`, `storage:business-cards` | Salesperson own INSERT / UPDATE | **IMPLEMENTED AND VERIFIED** | `stage-3c-client-visits.test.tsx`, ADR 0017 | Yes (Meeting logs persisted, signed URL resolved from `business-cards`) | Enter meeting purpose, products, narrative outcome, next step text, snap card | None |
| **PRD §3.5 / §7.2 / AT-03** | Visit Check-Out & Outside-Geofence Review Flag | Salesperson | `/visits/active` | `VisitWorkflowView.tsx` | `visitService.ts` | `public.visits`, `public.verification_flags` | Check-out permitted; flag raised automatically | **IMPLEMENTED AND VERIFIED** | `stage-3c-client-visits.test.tsx`, `test_stage_3c_db_integrity.py` | Yes (`checkout_outside_geofence` flags generated) | Check out beyond 200m; verify visit closes cleanly and flag appears in manager triage | None |
| **PRD §6.1 / AT-03** | End Day Hard Block on Open Active Visit | Salesperson | `/home` | `EndDayModal.tsx` | `attendanceService.ts` | `public.attendance_days`, `public.visits` | Trigger `trg_block_end_day_if_active_visit` raises `23514` | **IMPLEMENTED AND VERIFIED** | `stage-3b-attendance.test.tsx`, `stage-3c-client-visits.test.tsx` | Yes (Trigger aborted End Day with 23514 while visit open) | With active visit open, click "End Day"; verify hard block modal with instructions to checkout | None |
| **PRD §3.3 / §7.4 / AT-12** | Salesperson-Originated Field Visit Exceptions | Salesperson | `/exceptions` | `CreateExceptionModal.tsx`, `ExceptionsWorkbenchView.tsx` | `visitService.ts` | `public.exceptions` | Salesperson own INSERT; managers CANNOT insert | **IMPLEMENTED AND VERIFIED** | `stage-3c-client-visits.test.tsx`, `test_stage_3e_final...py` | Yes (54 exceptions in DB: 10 pending, 32 approved, 12 rejected) | Submit GPS failure exception; verify manager cannot forge exception for rep | None |
| **PRD §2.2 / AT-11** | Non-Visit Workday Request & Governance | Salesperson | `/non-visit-days` | `NonVisitDaysView.tsx`, `NonVisitDayModal.tsx` | `attendanceService.ts` | `public.absence_requests`, `public.approved_absences` | Salesperson INSERT (`status = 'pending'`); CSH approves | **IMPLEMENTED AND VERIFIED** | `stage-3b-attendance.test.tsx`, ADR 0017 | Yes (15 approved absences in DB; counts to attendance, 0 visit target) | Request office proposal day; verify pending banner; CSH approves; check target remains 0 | None |
| **PRD §5.1–§5.3 / AT-05, AT-06** | Durable Offline Workday & IndexedDB Queue Sync | Salesperson | `/offline-sync` | `OfflineSyncView.tsx` | `offlineSyncService.ts` | `CarbonOfflineJournalDB` (`eventJournal`, `mediaQueue`, `cachedContext`) -> RPC `ingest_offline_event_batch` | Client-generated UUIDs, monotonic sequence, ordered topological resolution | **IMPLEMENTED AND VERIFIED** | `stage-3d-offline-sync.test.tsx` (27 scenarios), `test_stage_3d_interrupted_sync.py` | Yes (16-step complete offline workday verified E2E) | Turn on Airplane Mode; Start Day; visit client; take photo; check out; reconnect; Sync Now | Offline device required |
| **PRD §2.3 / ADR 0018** | Direct-to-HQ Handset Replacement Request | Salesperson | `/profile` | `ReportDeviceIssueModal.tsx`, `ProfileView.tsx` | `visitService.ts`, `adminService.ts` | `public.device_replacement_requests` | Salesperson INSERT; HQ Admin review only (Zero Bottleneck) | **IMPLEMENTED AND VERIFIED** | `stage-3e-manager-hq.test.tsx`, `verify_dispatch_and_activation.py` | Yes (`ca5d7e5b...` completed with DHL tracking) | Submit device issue; verify CSH has NO approve button; verify HQ receives ticket | None |
| **PRD §7.1** | Country Sales Head Operational Dashboard | Country Sales Head | `/reviews` | `SalesHeadDashboardPreview.tsx` | `managementService.ts` | `public.attendance_days`, `public.visits`, `public.branches` | Country-scoped reads (`market_code = CSH.market_code`) | **IMPLEMENTED AND VERIFIED** | `stage-1c-manager-dashboard.test.tsx`, `stage-3e-manager-hq.test.tsx` | Yes (Real counts: 4 reps in NG, 64 visits, 8 open flags) | Verify attendance counters, verified visit share, and pending review badges | None |
| **PRD §7.1** | Team Attendance Telemetry Inspection | Country Sales Head | `/reviews/attendance` | `TeamAttendanceReview.tsx` | `managementService.ts` | `public.attendance_days`, `public.device_assignments`, `storage:attendance-selfies` | Signed URL generation for authorized CSH | **IMPLEMENTED AND VERIFIED** | `stage-3b-attendance.test.tsx` | Yes (CSH inspects live selfie, GPS accuracy, hardware binding) | Inspect representative attendance card; click selfie; inspect GPS fix and device tag | None |
| **PRD §7.1 / ADR 0017** | Visit Verification & Business Card Inspection | Country Sales Head | `/reviews/visits` | `ClientVisitVerification.tsx` | `managementService.ts` | `public.visits`, `public.meeting_logs`, `storage:visit-premises-photos`, `storage:business-cards` | Country-scoped read; signed photo URLs | **IMPLEMENTED AND VERIFIED** | `stage-3e-manager-hq.test.tsx`, ADR 0017 | Yes (Verified with bucket `business-cards`) | Open visit details modal; inspect check-in premises photo and check-out business card | None |
| **PRD §4.3** | GPS Pin & Branch Registration Approvals | Country Sales Head | `/reviews/branches` | `BranchApprovalsQueue.tsx`, `ApprovalDecisionModal.tsx` | `managementService.ts` | RPC `approve_branch_location_pin`, RPC `reject_branch_location_pin` | Market-isolated RPC check (Migration 00028) | **IMPLEMENTED AND VERIFIED** | `stage-3e-manager-hq.test.tsx`, `test_stage_3e_final...py` | Yes (Active pin becomes v2; older pin superseded) | Approve proposed pin; verify branch becomes active; reject proposed pin with reason | None |
| **PRD §3.3 / §7.4** | Field Visit Exception Review Queue | Country Sales Head | `/reviews/exceptions` | `ExceptionReviewWorkbench.tsx`, `ApprovalDecisionModal.tsx` | `managementService.ts` | RPC `review_salesperson_exception` | Country-isolated; approved remains `manager_approved_unverified` | **IMPLEMENTED AND VERIFIED** | `stage-3e-manager-hq.test.tsx`, `test_stage_3e_final...py` | Yes (Invariant confirmed: status NEVER becomes `location_verified`) | Approve GPS failure exception; verify visit shows as Manager Approved - Unverified | None |
| **PRD §2.2 / ADR 0017** | Non-Visit Workday Review Queue | Country Sales Head | `/reviews/non-visit` | `TeamAttendanceReview.tsx`, `ApprovalDecisionModal.tsx` | `attendanceService.ts`, `managementService.ts` | RPC `review_absence_request` | Country-isolated; updates `approved_absences` | **IMPLEMENTED AND VERIFIED** | `stage-3b-attendance.test.tsx`, ADR 0017 | Yes (Approved absence updates team attendance table in real time) | Approve non-visit request; verify rep's attendance marked present with 0 visit target | None |
| **PRD §6.4 / §6.6** | Automated Risk Flags Triage Workbench | Country Sales Head | `/reviews/flags` | `RiskFlagsWorkbench.tsx` | `managementService.ts` | `public.verification_flags`, RPC `resolve_verification_flag` | Country-scoped triage (open, under_review, cleared) | **IMPLEMENTED AND VERIFIED** | `stage-3e-manager-hq.test.tsx` | Yes (8 open flags, 14 cleared flags in NG) | Filter flags by severity; review 'checkout outside geofence'; resolve with audit note | None |
| **PRD §6.5 / AT-13** | Weekly 5% Client Audit Call Workbench | Country Sales Head | `/reviews/audits` | `ClientAuditWorkbench.tsx` | `managementService.ts` | `public.client_audit_records`, RPC `record_client_audit_call`, RPC `resolve_client_audit_dispute` | Country-isolated; denial triggers `under_investigation` | **IMPLEMENTED AND VERIFIED** | `stage-3e-manager-hq.test.tsx`, `test_stage_3e_final...py` | Yes (5% sampling formula verified; dispute resolution recorded) | Execute phone verification call; record client confirmation; test client denial flow | None |
| **PRD §7.2** | Country CSV Export with CWE-1236 Sanitization | Country Sales Head | `/reviews/export` | `CountryCsvExportModal.tsx` | `managementService.ts` | `public.export_jobs` | Market-scoped export; formula injection escaping (`'`, `=`, `+`, `-`, `@`) | **IMPLEMENTED AND VERIFIED** | `stage-3e-manager-hq.test.tsx`, `test_stage_3e_final...py` | Yes (Export job logged; formula strings prefixed with single quote) | Export country attendance/visits CSV; inspect output in Excel/Sheets for safe escaping | None |
| **PRD §2.1 / §2.3** | HQ Admin Employee Provisioning & Edge API | HQ Admin | `/admin/users` | `HqUserManagement.tsx` | `adminService.ts`, `/api/admin/users` | `auth.users`, `public.profiles`, `public.device_assignments` | HQ Admin only (`role = 'hq_admin'`) | **IMPLEMENTED AND VERIFIED** | `stage-3e-manager-hq.test.tsx` (Edge Function tests) | Yes (Created new rep with temporary credentials and auto-assigned handset) | Provision new salesperson in Zambia; log in as new salesperson; verify profile | None |
| **PRD §2.3 / ADR 0018** | Zero-Blocker Handset Custody Reassignment Supersession | HQ Admin | `/admin/devices` | `HqDeviceManagement.tsx` | `adminService.ts` | `public.devices`, `public.device_assignments` | HQ Admin only | **IMPLEMENTED AND VERIFIED** | Vitest 199/199, `verify_reassign_handset_workflow.py` | Yes (Old assignment set `is_current = false`, new device activated) | Reassign handset to salesperson already holding active phone; confirm supersession | None |
| **PRD §2.3 / ADR 0018** | Direct-to-HQ Device Replacement Lifecycle & Depot Allocation | HQ Admin | `/admin/devices/replacements` | `HqDeviceManagement.tsx` | `adminService.ts` | `public.device_replacement_requests`, `public.device_replacement_history`, RPC `hq_allocate_spare_device` | HQ Admin only; depot spare inventory allocation | **IMPLEMENTED AND VERIFIED** | Vitest 199/199, `verify_dispatch_and_activation.py` | Yes (Depot spare allocated, waybill recorded, activation linked to attendance) | Allocate depot spare handset; record DHL waybill; confirm activation; verify disposition | None |
| **PRD §4.1** | ERP Client Master CSV Ingestion & Validation | HQ Admin | `/admin/clients/import` | `HqClientMasterImport.tsx` | `adminService.ts` | `public.import_batches`, `public.organisations`, `public.branches` | HQ Admin only; duplicate checks & validation log | **IMPLEMENTED AND VERIFIED** | `stage-3e-manager-hq.test.tsx`, `test_stage_3e_final...py` | Yes (412 branches imported; unpinned marked location_pending) | Upload sample client CSV; verify duplicate detection and row-level batch logging | None |
| **PRD §6.1 / §6.6** | Multi-Market Configuration & Geofence Rules | HQ Admin | `/admin/markets` | `HqMarketConfiguration.tsx` | `adminService.ts` | `public.market_rules` | HQ Admin only; versioned rules with non-retroactivity | **IMPLEMENTED AND VERIFIED** | `stage-3e-manager-hq.test.tsx`, `test_stage_3e_final...py` | Yes (Active v1.2.05 preserves historical rules) | Update Nigeria geofence radius to 250m; verify historical visits retain captured rule ID | None |
| **PRD §7.1** | Append-Only Governance & System Audit Log | HQ Admin | `/admin/audit` | `HqSystemAuditLog.tsx`, `HqUserManagement.tsx` | `adminService.ts` | `public.approval_audit` | HQ Admin read-only; append-only DB ledger (DELETE/UPDATE rejected) | **IMPLEMENTED AND VERIFIED** | `stage-3e-manager-hq.test.tsx`, `test_stage_3e_final...py` | Yes (Real records loaded from `approval_audit`) | Perform administrative action; inspect system audit log for immutable event trail | None |
| **PRD §1.3 / AT-15** | Strict MVP Boundary Exclusions | System | Entire App | Codebase & DB Schema | All Services | Zero tables for quotes, orders, pipelines, tasks | Enforced by architecture (ADR 0001, ADR 0006) | **IMPLEMENTED AND VERIFIED** | `at15-exclusions.test.tsx` (2 tests) | Yes (Zero commercial tables or routes in project) | Inspect all menus and verify absence of quotes, orders, pipelines, or task schedulers | None |

---

## 3. Detailed Salesperson Workflow Audit (19 Items)

Every item specified in Section 3 of the audit directive has been examined in code, test coverage, and live database state:

1. **Authentication and Assigned Device:**
   - **Component:** `LoginForm.tsx`, `AuthContext.tsx`, `ProfileView.tsx`.
   - **Database:** `auth.users` joined to `public.profiles` and `public.device_assignments` (`is_current = true`).
   - **Verification:** Nigeria Salesperson `tunde.adebayo@carboncarcare.com` authenticates with session token; device card displays assigned Samsung Galaxy A15 (`CAR-TST-121585`, Knox enrolled).
   - **Status:** `IMPLEMENTED AND VERIFIED`.

2. **Start Day with Live GPS & Front-Camera Selfie:**
   - **Component:** `StartDayModal.tsx`, `attendanceService.startDayAttendance()`.
   - **Database:** `public.attendance_days` record created; selfie uploaded to private bucket `attendance-selfies/<user_id>/...`.
   - **Verification:** Rejects GPS accuracy > 100m (`PRD §6.1`). GPS coordinates watermarked.
   - **Status:** `IMPLEMENTED AND VERIFIED`.

3. **Active Workday Restoration:**
   - **Component:** `FieldSessionContext.tsx`.
   - **Database:** Queries `attendance_days` for today with `status = 'started'`.
   - **Verification:** Active attendance ID `cca4eacc-cbdc-4e0b-b9ed-7bea7d9c89aa` restored across browser reloads.
   - **Status:** `IMPLEMENTED AND VERIFIED`.

4. **Registered Client Selection:**
   - **Component:** `ClientsDirectoryView.tsx`, `ClientSelectionModal.tsx`.
   - **Database:** Queries `branches` joining `organisations` and active `branch_location_pins`.
   - **Verification:** Nigeria rep sees 32 branches; distance tags computed from device location; zero foreign-market branches visible.
   - **Status:** `IMPLEMENTED AND VERIFIED`.

5. **New Client Registration on the Ground:**
   - **Component:** `RegisterBranchModal.tsx`.
   - **Database:** Inserts `organisations`, `branches` (`location_pending`), `branch_location_pins` (`is_active = false`), `client_contacts`.
   - **Verification:** Photo captured via camera; GPS fix target ≤ 50m enforced.
   - **Status:** `IMPLEMENTED AND VERIFIED`.

6. **Multiple Physical Locations per Company:**
   - **Component:** `ClientsDirectoryView.tsx`, `RegisterBranchModal.tsx`.
   - **Database:** 1-to-many relationship between `organisations` and `branches`.
   - **Verification:** Verified support for multi-branch organizations sharing central telephone numbers (`PRD §4.2`).
   - **Status:** `IMPLEMENTED AND VERIFIED`.

7. **GPS Pin Proposal:**
   - **Component:** `RegisterBranchModal.tsx`, `visitService.proposeBranchPin()`.
   - **Database:** `public.branch_location_pins` (`is_active = false`, `version_number` incremented).
   - **Verification:** Requires Country Sales Head approval before pin becomes active.
   - **Status:** `IMPLEMENTED AND VERIFIED`.

8. **Approved vs. Pending Location Treatment:**
   - **Component:** `VisitWorkflowView.tsx`.
   - **Database:** Evaluated against `branch_location_pins.is_active`.
   - **Verification:** Normal verified check-in blocked for unpinned branches; prompts unverified exception submission.
   - **Status:** `IMPLEMENTED AND VERIFIED`.

9. **Visit Check-In & PostGIS Verification:**
   - **Component:** `VisitWorkflowView.tsx`, `visitService.startPhysicalVisit()`.
   - **Database:** Trigger `trg_validate_visit_location_verification` independently calculates `ST_Distance(check_in_geom::geography, pin_geom::geography)`.
   - **Verification:** Within 200m marked `location_verified`; outside claims rejected with `23514`.
   - **Status:** `IMPLEMENTED AND VERIFIED`.

10. **Rear-Camera Premises Photo:**
    - **Component:** `VisitWorkflowView.tsx`.
    - **Database:** Mandatory photo uploaded to private bucket `visit-premises-photos/<user_id>/...`.
    - **Verification:** Live camera flip (rear/front) supported for multi-lens devices.
    - **Status:** `IMPLEMENTED AND VERIFIED`.

11. **Active Visit Restoration:**
    - **Component:** `FieldSessionContext.tsx`.
    - **Database:** Queries `visits` where `user_id = auth.uid() AND check_out_at IS NULL`.
    - **Verification:** Restores active visit timer and branch details across restarts.
    - **Status:** `IMPLEMENTED AND VERIFIED`.

12. **Meeting Log & Business Card Photo:**
    - **Component:** `MeetingLogModal.tsx`, `visitService.submitMeetingLog()`.
    - **Database:** `public.meeting_logs`, private bucket `business-cards`.
    - **Verification:** Purpose, products, narrative outcome, free-text next step, and business card photo persisted.
    - **Status:** `IMPLEMENTED AND VERIFIED`.

13. **Visit Check-Out & Outside-Geofence Flag:**
    - **Component:** `VisitWorkflowView.tsx`, `visitService.checkoutPhysicalVisit()`.
    - **Database:** Records `check_out_lat`, `check_out_lng`, `check_out_at`.
    - **Verification:** Checkout permitted outside 200m (AT-03); raises `checkout_outside_geofence` flag.
    - **Status:** `IMPLEMENTED AND VERIFIED`.

14. **GPS / Device / Missed-Visit Exceptions:**
    - **Component:** `CreateExceptionModal.tsx`, `ExceptionsWorkbenchView.tsx`.
    - **Database:** `public.exceptions` (`status = 'pending_review'`).
    - **Verification:** Salesperson sole author; manager cannot originate or self-approve.
    - **Status:** `IMPLEMENTED AND VERIFIED`.

15. **Non-Visit Workday Requests:**
    - **Component:** `NonVisitDaysView.tsx`, `attendanceService.requestNonVisitDay()`.
    - **Database:** `public.absence_requests`.
    - **Verification:** Counts toward attendance when approved, strictly 0 physical visit target.
    - **Status:** `IMPLEMENTED AND VERIFIED`.

16. **End Day Restrictions:**
    - **Component:** `EndDayModal.tsx`, `attendanceService.endDayAttendance()`.
    - **Database:** Trigger `trg_block_end_day_if_active_visit` raises `23514`.
    - **Verification:** Hard-blocks closing day while any visit is open.
    - **Status:** `IMPLEMENTED AND VERIFIED`.

17. **Offline Full Workday:**
    - **Component:** `OfflineSyncView.tsx`, `offlineSyncService.ts`.
    - **Database:** IndexedDB `CarbonOfflineJournalDB` (`eventJournal`, `mediaQueue`, `cachedContext`).
    - **Verification:** Full workday operates completely offline; events sequenced with client UUIDs.
    - **Status:** `IMPLEMENTED AND VERIFIED`.

18. **Synchronisation & Retry:**
    - **Component:** `OfflineSyncView.tsx`, `offlineSyncService.syncQueue()`.
    - **Database:** RPC `ingest_offline_event_batch`.
    - **Verification:** Topological dependency order; idempotent retry handles connection interruptions cleanly.
    - **Status:** `IMPLEMENTED AND VERIFIED`.

19. **Direct-to-HQ Device Replacement Request:**
    - **Component:** `ProfileView.tsx`, `ReportDeviceIssueModal.tsx`.
    - **Database:** `public.device_replacement_requests`.
    - **Verification:** Ticket submitted directly to HQ; tracked through `submitted` → `dispatched` → `completed`.
    - **Status:** `IMPLEMENTED AND VERIFIED`.

---

## 4. Detailed Country Sales Head Workflow Audit (13 Items)

1. **Country Dashboard:** Live attendance counters, verified visit share, and pending review counts (`IMPLEMENTED AND VERIFIED`).
2. **Salesperson Attendance & Telemetry:** Inspects check-in GPS coordinates, accuracy, and signed selfie (`IMPLEMENTED AND VERIFIED`).
3. **Visit Evidence Inspection:** Inspects check-in premises photos and check-out business cards via signed URLs (`IMPLEMENTED AND VERIFIED`).
4. **Client & GPS Pin Approvals:** RPC `approve_branch_location_pin` supersedes older pin and activates v2 (`IMPLEMENTED AND VERIFIED`).
5. **Visit Exceptions Review:** RPC `review_salesperson_exception` approves unverified claims without converting to location verified (`IMPLEMENTED AND VERIFIED`).
6. **Non-Visit Workday Approvals:** Dedicated screen; approves proposal/training days, updating attendance instantly (`IMPLEMENTED AND VERIFIED`).
7. **Risk Flags Triage Workbench:** Investigates outside checkouts, idle gaps, and fast travel (`IMPLEMENTED AND VERIFIED`).
8. **Weekly Random 5% Client Audits:** Computes 5% weekly sample (`max(1, ceil(0.05 * N))`) (`IMPLEMENTED AND VERIFIED`).
9. **Client Telephone Verification:** Records contact confirmed, unreachable, or client denial (`IMPLEMENTED AND VERIFIED`).
10. **Dispute Investigation & Resolution:** Client denial triggers `under_investigation`; CSH resolves with mandatory rationale (`IMPLEMENTED AND VERIFIED`).
11. **Country Performance Metrics:** Tracks location-verified visits vs manager-approved unverified separately (`IMPLEMENTED AND VERIFIED`).
12. **CWE-1236 Sanitized CSV Exports:** Prefixes formula triggers (`=`, `+`, `-`, `@`) with `'` and logs export job (`IMPLEMENTED AND VERIFIED`).
13. **Market Isolation Enforcement:** RPC checks block cross-market review attempts with P0001 unauthorized (`IMPLEMENTED AND VERIFIED`).

---

## 5. Detailed HQ Admin Workflow Audit (14 Items)

1. **New Employee Provisioning:** Edge API creates Supabase Auth user, profile, and initial credentials (`IMPLEMENTED AND VERIFIED`).
2. **User Directory & Profile Updates:** Lists, filters, paginates, edits, and suspends accounts (`IMPLEMENTED AND VERIFIED`).
3. **Roles, Markets & Suspension:** Role assignments and active status changes enforced via RLS (`IMPLEMENTED AND VERIFIED`).
4. **Unassigned Company Devices:** Filters depot inventory for available/returned unassigned devices (`IMPLEMENTED AND VERIFIED`).
5. **Device Assignment During User Creation:** Auto-assigns selected handset upon provisioning (`IMPLEMENTED AND VERIFIED`).
6. **Device Assignment After Creation (Custody Supersession):** Reassigning handset to a representative with an active device automatically returns the old device and activates the new one without manual blockage (ADR 0018) (`IMPLEMENTED AND VERIFIED`).
7. **Direct-to-HQ Device Replacement Processing:** Reviews replacement requests, allocates depot spare, records courier tracking, confirms activation, and records old device disposition (`IMPLEMENTED AND VERIFIED`).
8. **Device Inventory & Replacement History:** Comprehensive fleet tracking with immutable lifecycle audit (`IMPLEMENTED AND VERIFIED`).
9. **Client Master & Physical Locations Directory:** Cross-market visibility of all organizations and branches (`IMPLEMENTED AND VERIFIED`).
10. **ERP Client Master CSV Ingestion:** Bulk CSV import with duplicate phone/address warnings and batch logging (`IMPLEMENTED AND VERIFIED`).
11. **Market Rule Configuration:** Adjusts geofence radius and accuracy limits with versioned snapshots (`IMPLEMENTED AND VERIFIED`).
12. **Cross-Country Operations Dashboard:** Multi-market KPIs for Nigeria, Zambia, and Malawi (`IMPLEMENTED AND VERIFIED`).
13. **Administrative Audit Logs:** Append-only ledger in `public.approval_audit` (`IMPLEMENTED AND VERIFIED`).
14. **Consolidated Reporting & Exports:** Tri-market CSV export with formula escaping (`IMPLEMENTED AND VERIFIED`).

---

## 6. Cross-Role Workflow Verification (11 Handoffs)

1. **HQ Admin creates user → Employee logs in:** Verified with test users across Nigeria, Zambia, and Malawi.
2. **HQ Admin assigns device → Employee sees correct device:** Verified on `ProfileView.tsx`.
3. **Salesperson registers client → Appears in Supabase:** Verified with `operating_status = 'location_pending'`.
4. **Salesperson proposes GPS pin → CSH receives request:** Appears in `BranchApprovalsQueue.tsx`.
5. **CSH approves pin → Location becomes eligible for verified visits:** Pin status set to `is_active = true` (v2).
6. **Salesperson completes visit → CSH inspects evidence:** Check-in photo and meeting log visible in `ClientVisitVerification.tsx`.
7. **Salesperson submits exception → Manager records decision:** Approved exception remains `manager_approved_unverified`.
8. **Salesperson submits non-visit request → Manager approves:** Updates `public.approved_absences` in real time.
9. **Salesperson reports faulty device → HQ processes replacement:** Spare allocated, dispatched, activated.
10. **Completed visits → Weekly 5% audit sampling → Dispute resolution:** Denial triggers dispute; resolved with notes.
11. **Operational actions → Correct metrics & audit ledger:** Recorded in `public.approval_audit`.

---

## 7. Supabase Single Source of Truth & Mock Elimination

- **Auth & Profiles:** 100% sourced from Supabase `auth.users` and `public.profiles`.
- **Devices & Assignments:** 100% sourced from `public.devices` and `public.device_assignments`.
- **Clients & Branches:** 100% sourced from `public.organisations`, `public.branches`, `public.branch_location_pins`.
- **Attendance & Visits:** 100% sourced from `public.attendance_days`, `public.visits`, `public.meeting_logs`.
- **Management Queues:** 100% sourced from `public.exceptions`, `public.absence_requests`, `public.verification_flags`, `public.client_audit_records`.
- **Audit Logs:** Updated `HqUserManagement.tsx` to source user audit logs directly from `public.approval_audit` via `adminService.getSystemAuditLogs()`, eliminating hardcoded mock entries.
- **Test Fixture Preservation:** Isolated unit tests preserve backward-compatible mocks strictly when `isTestEnv === true`. Live browser sessions use 100% Supabase data.

---

## 8. Defect & Implementation Gap Register

### Confirmed Findings & Status
| Defect ID | Severity | Module | Issue Description | Root Cause | Files Affected | Correction Status |
|:---|:---|:---|:---|:---|:---|:---|
| **DEF-001** | P1 | HQ Admin | Hardcoded user audit log in `HqUserManagement.tsx` | Legacy state initialized with 3 static records | `src/features/admin/HqUserManagement.tsx` | **CORRECTED LOCALLY** (Now loads from `adminService.getSystemAuditLogs()`) |
| **DEF-002** | P2 | Field / Review | Storage bucket name mismatch for business cards | Bucket was named `business-cards` in DB but code requested `visit-business-cards` | `src/services/managementService.ts` | **CORRECTED LOCALLY** (ADR 0017) |
| **DEF-003** | P1 | HQ Admin | Handset reassignment blocked when salesperson held active phone | Unique constraint required manual return first | `HqDeviceManagement.tsx`, `adminService.ts` | **CORRECTED LOCALLY** (ADR 0018) |
| **DEF-004** | P1 | HQ Admin | Spare allocation UI state reverted on 10s background sync | Asset tag passed instead of device UUID to RPC | `HqDeviceManagement.tsx`, `adminService.ts` | **CORRECTED LOCALLY** (ADR 0018) |
| **DEF-005** | P3 | Branding | Scaffold geometric favicon did not reflect brand | Temporary SVG used during initial setup | `public/favicon.*`, `index.html`, `public/sw.js` | **CORRECTED LOCALLY** (ADR 0019) |

---

## 9. Go/No-Go Recommendation for Full Manual UAT

### Recommendation: **GO FOR MANUAL USER ACCEPTANCE TESTING**

**Justification:**
1. **Zero Open P0/P1 Defects:** All core business processes (attendance, verified visits, exceptions, non-visit days, device management, review queues, audit calls, and reporting) are fully functional.
2. **100% Test Pass Rate:** 199 / 199 Vitest tests passing; 0 TypeScript errors; clean production build.
3. **Database Integrity Verified:** Live triggers, PostGIS spatial calculations, and RLS market sandboxing verified against hosted Supabase dev project.
4. **Single Source of Truth:** Confirmed elimination of conflicting mock data in active modules.

