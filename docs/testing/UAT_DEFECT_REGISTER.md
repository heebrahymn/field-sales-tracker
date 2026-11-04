# Carbon Field Sales Tracker — UAT Defect & Gap Register

**Document Version:** 1.2 (Post-UAT Final Acceptance Baseline)  
**Audit Date:** November 4, 2026  
**Project:** Carbon Field Sales Tracker  
**Baseline:** PRD v1.2, ADRs 0001–0022  
**Acceptance Status:** **ALL 19 DEFECTS ACCEPTED — PROJECT OWNER RETEST PASSED**  

---

## 1. Defect Severity Classification

- **P0 (Blocker):** Security violation, data corruption, or total blockage of an essential MVP operation.
- **P1 (Critical):** Broken business workflow, security compliance finding, or inability to complete a core business process.
- **P2 (Major):** Important reporting, validation, data integrity, or usability defect with existing operational workaround.
- **P3 (Minor):** Cosmetic defect, microcopy enhancement, or non-blocking polish item.

---

## 2. Master Defect Register

### DEF-001: Hardcoded Mock Audit Log in HQ User Management
- **Module:** HQ Administrator (`HqUserManagement.tsx`)
- **Severity:** **P1 (Critical Data Integrity)**
- **Issue:** The "User Audit Trail" drawer in `HqUserManagement.tsx` displayed three hardcoded static mock records (`AUD-001`, `AUD-002`, `AUD-003`) instead of loading live governance events from Supabase.
- **Expected Behaviour:** Inspecting a user's audit history must display actual administrative mutations from `public.approval_audit` (e.g. provisioning, device assignments, status changes).
- **Actual Behaviour:** Displayed static demo data from earlier UI scaffolding regardless of actual database mutations.
- **Root Cause:** `auditLog` state was initialized with static array without connecting to `adminService.getSystemAuditLogs()`.
- **Files Affected:** `src/features/admin/HqUserManagement.tsx`.
- **Supabase Impact:** `public.approval_audit` was not being queried in the user management view.
- **Correction Implemented:** 
  1. Updated `HqUserManagement.tsx` to initialize `auditLog` with empty array in live mode (`isTestEnv ? INITIAL_USER_AUDIT_LOGS : []`).
  2. Implemented `loadAuditLogs()` fetching live records via `adminService.getSystemAuditLogs(200)`.
  3. Hooked `loadAuditLogs()` to mount and whenever `selectedUserForAudit` is selected.
- **Test Required:** Select a user in HQ User Management; click "Audit Trail"; verify real administrative actions from `approval_audit` are rendered.
- **Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED**
- **Acceptance Basis:** Confirmed passed in project owner formal manual UAT retest sign-off (November 4, 2026). No further retesting required.

---

### DEF-002: Storage Bucket Name Mismatch for Visit Business Cards
- **Module:** Field Salesperson & Country Sales Head (`managementService.ts`, `ClientVisitVerification.tsx`)
- **Severity:** **P2 (Major Functional)**
- **Issue:** Country Sales Head could not inspect business card photographs attached during visit check-out in `ClientVisitVerification.tsx`.
- **Expected Behaviour:** Business card image captured during meeting log submission renders cleanly in visit inspection modal via signed URL.
- **Actual Behaviour:** Modal displayed broken image or loading failure.
- **Root Cause:** Backend migration `20261022000012_storage_buckets_and_policies.sql` created bucket `business-cards`, but `managementService.getBusinessCardSignedUrl()` requested bucket `visit-business-cards`.
- **Files Affected:** `src/services/managementService.ts`, `src/features/review/ClientVisitVerification.tsx`.
- **Supabase Impact:** 404 / 400 error from Supabase Storage API when generating signed URL.
- **Correction Implemented:** Aligned bucket target in `managementService.ts` to canonical `'business-cards'`; added explicit loading and retry indicators (ADR 0017).
- **Test Required:** Run `snap_business_card.py` and inspect visit in Country Sales Head modal.
- **Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED**
- **Acceptance Basis:** Confirmed passed in project owner formal manual UAT retest sign-off (November 4, 2026). No further retesting required.

---

### DEF-003: Handset Custody Reassignment Hard Lockout
- **Module:** HQ Administrator (`HqDeviceManagement.tsx`, `adminService.ts`)
- **Severity:** **P1 (Critical Workflow)**
- **Issue:** When an HQ Admin attempted to assign a new or replacement handset to a salesperson who already held an active device, the handover was rejected with a hard error: *"Salesperson already assigned to active device. Please reassign or return the existing device first."*
- **Expected Behaviour:** Reassigning a handset should automatically relinquish the previous device assignment and activate the new one with an auditable custody supersession notice.
- **Actual Behaviour:** Required an unguided, multi-step manual return workaround before assignment could proceed.
- **Root Cause:** Unique constraint `uq_single_active_device_per_rep` on `device_assignments` aborted insert without handling active custody termination.
- **Files Affected:** `src/features/admin/HqDeviceManagement.tsx`, `src/features/admin/HqUserManagement.tsx`, `src/services/adminService.ts`, `src/context/DeviceReplacementContext.tsx`, `supabase/functions/admin-provision-user/index.ts`.
- **Supabase Impact:** Unblocked device reassignment transactions in PostgreSQL while preserving strict 1:1 active custody.
- **Correction Implemented:** Implemented automatic custody supersession in `adminService.reassignDevice()` and `DeviceReplacementContext`: sets `is_current = false, returned_at = now()` on the relinquished device, transitions the superseded handset to `pending_inspection` (`security_authorization = 'quarantined'`), inserts the new active assignment, and displays a dynamic "Custody Reassignment Notice" in UI (ADR 0018).
- **Test Required:** Run `verify_reassign_handset_workflow.py`.
- **Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED**
- **Acceptance Basis:** Confirmed passed in project owner formal manual UAT retest sign-off (November 4, 2026). No further retesting required.

---

### DEF-004: UI Reversion on Spare Handset Depot Allocation
- **Module:** HQ Administrator (`HqDeviceManagement.tsx`, `adminService.ts`)
- **Severity:** **P1 (Critical Workflow)**
- **Issue:** When allocating a spare handset for a direct-to-HQ device replacement request, the selection appeared in UI but reverted back to unallocated upon the 10-second background polling cycle.
- **Expected Behaviour:** Allocated spare device persists in database and remains assigned across background sync intervals.
- **Actual Behaviour:** Handset selection reverted to blank after 10 seconds.
- **Root Cause:** `allocateSpareDevice` was receiving `asset_tag` (e.g. `CAR-TST-121585`) instead of the device UUID required by RPC `hq_allocate_spare_device`.
- **Files Affected:** `src/features/admin/HqDeviceManagement.tsx`, `src/services/adminService.ts`.
- **Supabase Impact:** RPC rejected update due to UUID type mismatch; changes not saved to `public.device_replacement_requests`.
- **Correction Implemented:** Resolved asset tag to device UUID prior to RPC invocation; added PostgreSQL table fallback to guarantee atomic persistence (ADR 0018).
- **Test Required:** Run `verify_dispatch_and_activation.py`.
- **Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED**
- **Acceptance Basis:** Confirmed passed in project owner formal manual UAT retest sign-off (November 4, 2026). No further retesting required.

---

### DEF-005: Scaffold Geometric Placeholder Favicon
- **Module:** Application Shell & Branding (`public/favicon.svg`, `index.html`)
- **Severity:** **P3 (Minor Brand Compliance)**
- **Issue:** Browser tab displayed early scaffold geometric placeholder (blue square, yellow triangle, green circle) instead of authentic Carbon Car Care brand mark.
- **Expected Behaviour:** Browser tab displays authentic dynamic Carbon mark (Green wing, Blue chevron, Yellow curve) with white divider stripes and transparent background.
- **Actual Behaviour:** Displayed scaffold geometric icon.
- **Root Cause:** `public/favicon.svg` had not been replaced with production brand assets.
- **Files Affected:** `public/favicon.*`, `public/apple-touch-icon.png`, `public/site.webmanifest`, `index.html`, `public/sw.js`.
- **Supabase Impact:** None.
- **Correction Implemented:** Generated complete multi-resolution favicon and PWA suite using authentic brand assets with antialiased white base underlay for dual-theme contrast (ADR 0019).
- **Test Required:** Verify favicon rendering in light and dark browser tabs.
- **Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED**
- **Acceptance Basis:** Confirmed passed in project owner formal manual UAT retest sign-off (November 4, 2026). No further retesting required.

---

### DEF-006: Plaintext Test Passwords in Test Plans & Acceptance Documentation
- **Module:** Security & Acceptance Documentation (`FULL_ROLE_BASED_UAT_PLAN.md`, `UAT_TEST_CASES.md`)
- **Severity:** **P1 (Security / Compliance)**
- **Issue:** Plaintext development test password literals were committed to acceptance documentation, triggering automated secret detection alerts (GitGuardian).
- **Expected Behaviour:** Zero reusable plaintext passwords stored in repository files, markdown artifacts, or test scripts. Test documentation references "Use the securely supplied test credentials."
- **Actual Behaviour:** Literal strings were included in UAT account tables and login steps.
- **Root Cause:** Acceptance test documentation authored with explicit sample passwords instead of referring to secure credential management.
- **Files Affected:** `docs/testing/FULL_ROLE_BASED_UAT_PLAN.md`, `docs/testing/UAT_TEST_CASES.md`, `scripts/provision-users.ts`.
- **Supabase Impact:** Triggered credential rotation for all test user accounts via GoTrue Admin API (`npm run provision:users`).
- **Correction Implemented:**
  1. Excised all plaintext passwords from UAT plan, test cases, and test documentation; replaced with "Use the securely supplied test credentials."
  2. Synchronized `scripts/provision-users.ts` with all corporate test user accounts (`hq.admin@carboncarcare.com`, `tunde.adebayo@carboncarcare.com`, `babatunde.adeleke@carboncarcare.com`, etc.).
  3. Executed runtime credential rotation via `npm run provision:users` updating GoTrue Auth passwords in the hosted Supabase dev project and saving them securely to the git-ignored `.env.local`.
  4. Verified zero occurrences of cleartext passwords remain in tracked files.
- **Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED**
- **Acceptance Basis:** Confirmed passed in project owner formal manual UAT retest sign-off (November 4, 2026). No further retesting required.

---

### DEF-007: Device Status False Depot Attribution on Custody Supersession & Activation
- **Module:** HQ Administration (`adminService.ts`, `DeviceReplacementContext.tsx`, `HqDeviceManagement.tsx`, `HqUserManagement.tsx`)
- **Severity:** **P2 (Major Data Integrity)**
- **Issue:** When superseding a handset during reassignment, deactivating a user account, or completing a device replacement request, the relinquished handset could be marked `returned` or `available` (falsely implying physical depot receipt or immediate readiness for reissue), and UI assignment pools conflated `returned` with `available`.
- **Expected Behaviour:** Superseded, deactivated, or unreturned hardware must transition to `pending_inspection` (`quarantined` / `revoked`)—never falsely marked physically `returned` or `available`. Actual physical receipt at the IT depot transitions a handset to `returned` (still non-assignable until technician inspection/wipe clearance), and only `available` handsets appear in assignable/spare pools.
- **Actual Behaviour:** Superseded devices defaulted to `returned` (or `available` upon user deactivation), and `returned` devices appeared in assignment/spare selectors alongside `available` devices.
- **Root Cause:** `adminService.reassignDevice` and `DeviceReplacementContext` defaulted superseded devices to `returned`, `updateUserProfile` deactivation set `available`, `confirmReplacementActivation` defaulted to `returned_to_depot` / mapped `quarantined` to `revoked`, and UI selectors filtered for `Available || Returned`.
- **Files Affected:** `src/services/adminService.ts`, `src/context/DeviceReplacementContext.tsx`, `src/features/admin/HqDeviceManagement.tsx`, `src/features/admin/HqUserManagement.tsx`, `supabase/functions/admin-provision-user/index.ts`.
- **Supabase Impact:** Preserves distinct physical custody states (`pending_inspection`, `returned`, `available`, `lost_stolen`, `revoked`) in `public.devices` while maintaining full 29-migration parity.
- **Correction Implemented:** Reconciled `reassignDevice`, `updateUserProfile` (deactivation), `confirmReplacementActivation`, `DeviceReplacementContext`, `HqDeviceManagement`, `HqUserManagement`, and `admin-provision-user` so superseded/relinquished handsets transition to `pending_inspection`, `returned` represents confirmed physical depot receipt only, and strictly `available` handsets populate assignment and spare pools. Updated UI copy to state custody is relinquished and marked `Pending Inspection` until physical depot receipt and IT clearance.
- **Automated Verification:** Vitest suites `src/test/device-custody-reconciliation.test.tsx` (4/4 PASS) and `src/test/stage-3e-manager-hq.test.tsx` (26/26 PASS).
- **Manual Retest Evidence:** Verified in local Playwright browser inspection (`verify_device_replacement_reporting.py`).
- **Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED**
- **Acceptance Basis:** Confirmed passed in project owner formal manual UAT retest sign-off (November 4, 2026). No further retesting required.

---

### DEF-008: Country Reporting Salesperson Name & Date Range Filtering
- **Module:** Country Sales Head (`CountryReportingView.tsx`, `CountryCsvExportModal.tsx`)
- **Severity:** **P2 (Major Usability & Audit Filter)**
- **Issue:** Country Sales Head could not filter operational visit records by specific salesperson name and custom date range in Country Reporting.
- **Expected Behaviour:** Selecting a salesperson and choosing a date range restricts the Individual Operational Records table strictly to the matching representative and date scope.
- **Actual Behaviour:** Dropdown filters failed to bind synchronously to the live visit dataset.
- **Root Cause:** Filter state was not passed into the active visit query memoization in `CountryReportingView.tsx`.
- **Files Affected:** `src/features/review/CountryReportingView.tsx`, `src/features/review/CountryCsvExportModal.tsx`.
- **Supabase Impact:** None (frontend filter layer on real queried visits).
- **Correction Implemented:** Bound salesperson filter dropdown and date range states directly to the computed `filteredRecords` pipeline with proper ISO date normalization.
- **Automated Verification:** Vitest suite `src/test/country-reporting-pagination.test.tsx` (PASS).
- **Manual Retest Evidence:** Tested in local browser with Tunde Adebayo and custom date ranges.
- **Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED**
- **Acceptance Basis:** Confirmed passed in project owner formal manual UAT retest sign-off (November 4, 2026). No further retesting required.

---

### DEF-009: Country Sales Head Dashboard Workbench Card Overflow
- **Module:** Country Sales Head (`SalesHeadDashboardPreview.tsx`)
- **Severity:** **P3 (Minor Usability & Layout Density)**
- **Issue:** The "Pending Client & GPS Approvals" and "Exceptions Workbench" cards on the Sales Head Dashboard displayed all pending items without pagination or limiting, resulting in massive vertical scroll.
- **Expected Behaviour:** Workbench preview cards should default to showing the top 5 most urgent items with a clear "View All (N)" button leading to the dedicated full-screen queue.
- **Actual Behaviour:** Displayed all 11+ exceptions and 8+ client approvals in an unconstrained list.
- **Root Cause:** Array slicing was omitted in the preview cards.
- **Files Affected:** `src/features/review/SalesHeadDashboardPreview.tsx`.
- **Supabase Impact:** None.
- **Correction Implemented:** Sliced preview arrays to `.slice(0, 5)` and added dynamic counters to header buttons (`View All (${total})`).
- **Automated Verification:** Vitest passing (`src/test/stage-1c-manager-dashboard.test.tsx`).
- **Manual Retest Evidence:** Verified in local browser (`media_1793794706749_031a2eb6.jpg`).
- **Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED**
- **Acceptance Basis:** Confirmed passed in project owner formal manual UAT retest sign-off (November 4, 2026). No further retesting required.

---

### DEF-010: Salesperson CSV Export Filter & Custom Date Picker Button Non-Functional
- **Module:** Country Sales Head (`CountryCsvExportModal.tsx`, `countryCsvService.ts`)
- **Severity:** **P2 (Major Reporting & Data Extraction)**
- **Issue:** When filtering by a salesperson, the Country CSV Export failed to download; clicking the "Custom Date Range" button was completely unresponsive.
- **Expected Behaviour:** Clicking "Custom Date Range" exposes date pickers for start and end dates; exporting downloads sanitized CSV scoped to selected representative and date interval.
- **Actual Behaviour:** Date picker modal failed to activate; CSV export threw a null reference on undefined date inputs.
- **Root Cause:** Missing date input toggle state and incomplete date bounds validation in `CountryCsvExportModal.tsx`.
- **Files Affected:** `src/features/review/CountryCsvExportModal.tsx`, `src/services/countryCsvService.ts`.
- **Supabase Impact:** None.
- **Correction Implemented:** Implemented active date range mode toggle with controlled native date inputs (`startDate`, `endDate`), validation disabling the download button until valid dates are selected, and formula injection escaping.
- **Automated Verification:** Vitest suites `src/test/country-csv-export.test.tsx` and `src/test/country-csv-service.test.ts` (PASS).
- **Manual Retest Evidence:** Verified in local browser (`media_1793795462497_b0e7e0a4.jpg`).
- **Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED**
- **Acceptance Basis:** Confirmed passed in project owner formal manual UAT retest sign-off (November 4, 2026). No further retesting required.

---

### DEF-011: Missing Table Pagination on Country Reporting Operational Records
- **Module:** Country Sales Head (`CountryReportingView.tsx`, `table-pagination.tsx`)
- **Severity:** **P2 (Major Usability & Performance)**
- **Issue:** Individual Operational Records table displayed unbounded rows, causing lag with large datasets.
- **Expected Behaviour:** Table must support standard pagination defaulting to 10 rows per page, with options for 20, 50, and 100 rows, page navigation, and item counts.
- **Actual Behaviour:** Unpaginated continuous table rendering.
- **Root Cause:** Standard pagination component was not integrated into `CountryReportingView.tsx`.
- **Files Affected:** `src/features/review/CountryReportingView.tsx`, `src/components/ui/table-pagination.tsx`.
- **Supabase Impact:** None.
- **Correction Implemented:** Integrated reusable `TablePagination` component defaulting to `pageSize: 10` with options `[10, 20, 50, 100]`, tracking `currentPage`, and resetting to page 1 on filter changes.
- **Automated Verification:** Vitest suite `src/test/country-reporting-pagination.test.tsx` (PASS).
- **Manual Retest Evidence:** Verified in local browser (`media_1793796762026_0a86d0fe.png`).
- **Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED**
- **Acceptance Basis:** Confirmed passed in project owner formal manual UAT retest sign-off (November 4, 2026). No further retesting required.

---

### DEF-012: Inaccurate Metric Nomenclature ("Unique Branches" vs "Locations visited")
- **Module:** Country Sales Head & Salesperson Dashboards (`CountryReportingView.tsx`, `SalesHeadDashboardPreview.tsx`)
- **Severity:** **P3 (Minor Terminology & Brand Polish)**
- **Issue:** Team Operational Breakdown table header labeled unique physical visits as "Unique Branches", which conflicted with operational terminology.
- **Expected Behaviour:** Column header and operational KPI metrics must be clearly titled "Locations visited".
- **Actual Behaviour:** Labeled as "Unique Branches".
- **Root Cause:** Early UI scaffolding terminology.
- **Files Affected:** `src/features/review/CountryReportingView.tsx`, `src/features/review/SalesHeadDashboardPreview.tsx`.
- **Supabase Impact:** None.
- **Correction Implemented:** Replaced all user-facing instances of "Unique Branches" with "Locations visited" across tables, tooltips, and summary cards.
- **Automated Verification:** Vitest passing (`src/test/country-reporting-pagination.test.tsx`).
- **Manual Retest Evidence:** Verified in local browser (`locations_visited_updated.png`).
- **Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED**
- **Acceptance Basis:** Confirmed passed in project owner formal manual UAT retest sign-off (November 4, 2026). No further retesting required.

---

### DEF-013: Salesperson Non-Visit Workday Cancellation Authorization Failure
- **Module:** Salesperson (`NonVisitDaysView.tsx`, `attendanceService.ts`, `api/attendance/cancel-non-visit.ts`)
- **Severity:** **P1 (Critical Workflow)**
- **Issue:** When a salesperson clicked "Cancel Request" on their own pending non-visit workday request, the action failed with error: *"Failed to cancel request: Failed to authenticate request cancellation reviewer."*
- **Expected Behaviour:** A salesperson must be able to cancel their own pending non-visit request before manager review without requiring manager privileges.
- **Actual Behaviour:** Cancellation API blocked the salesperson with a 403 Forbidden / reviewer authentication error.
- **Root Cause:** Backend API route `/api/attendance/cancel-non-visit.ts` attempted to verify manager credentials (`country_sales_head` or `hq_admin`) instead of verifying that the caller was the requesting salesperson or an authorized manager.
- **Files Affected:** `api/attendance/cancel-non-visit.ts`, `src/services/attendanceService.ts`, `src/features/field/NonVisitDaysView.tsx`, `src/context/FieldSessionContext.tsx`.
- **Supabase Impact:** RPC / API security check rejected valid salesperson cancellation.
- **Correction Implemented:**
  1. Updated API endpoint `/api/attendance/cancel-non-visit.ts` to allow cancellation if `callerUserId === request.user_id` AND `request.status === 'pending'`.
  2. Updated `attendanceService.cancelAbsenceRequest()` to pass authenticated user token and identity.
  3. Added relational audit log entry for the cancellation event.
- **Automated Verification:** Vitest suite `src/test/non-visit-cancellation.test.ts` (PASS, 5/5 tests).
- **Manual Retest Evidence:** Verified in local browser (`non_visit_after_cancel_success.png`).
- **Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED**
- **Acceptance Basis:** Confirmed passed in project owner formal manual UAT retest sign-off (November 4, 2026). No further retesting required.

---

### DEF-014: Missing Table Pagination on HQ Exception Oversight
- **Module:** HQ Administrator (`HqExceptionOversight.tsx`)
- **Severity:** **P2 (Major Usability)**
- **Issue:** The cross-market exception list in `HqExceptionOversight.tsx` rendered all tri-market exceptions in a single continuous view.
- **Expected Behaviour:** Table must support standard pagination defaulting to 10 items, with options for 20, 50, and 100, and reset to page 1 upon filtering.
- **Actual Behaviour:** Displayed all 64 exceptions on one page.
- **Root Cause:** Pagination component not wired into the view.
- **Files Affected:** `src/features/admin/HqExceptionOversight.tsx`.
- **Supabase Impact:** None.
- **Correction Implemented:** Added `TablePagination` with page size state (`pageSize: 10`, options `[10, 20, 50, 100]`), page bounds clamping, and search/filter resets.
- **Automated Verification:** Vitest suite `src/test/hq-exception-oversight-pagination.test.tsx` (PASS, 5/5 tests).
- **Manual Retest Evidence:** Verified in local browser (`hq_exception_pagination_default_10.png`, `hq_exception_pagination_20_per_page.png`).
- **Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED**
- **Acceptance Basis:** Confirmed passed in project owner formal manual UAT retest sign-off (November 4, 2026). No further retesting required.

---

### DEF-015: Missing Table Pagination Across HQ Admin Oversight & Profile Views
- **Module:** HQ Administrator & Salesperson Profile (`HqClientAuditOversight.tsx`, `HqSystemAuditLog.tsx`, `HqClientMasterImport.tsx`, `ProfileView.tsx`, `RiskFlagsWorkbench.tsx`)
- **Severity:** **P2 (Major Usability & Consistency)**
- **Issue:** Multiple administrative and reporting tables lacked standard table pagination, causing layout inconsistency.
- **Expected Behaviour:** Consistent pagination defaulting to 10 items per page (or 5 for profile replacement cards) with options 20, 50, 100.
- **Actual Behaviour:** Tables rendered continuous unbounded rows.
- **Root Cause:** Pagination components omitted during initial UI implementation.
- **Files Affected:**
  - `src/features/admin/HqClientAuditOversight.tsx`
  - `src/features/admin/HqSystemAuditLog.tsx`
  - `src/features/admin/HqClientMasterImport.tsx`
  - `src/features/field/ProfileView.tsx`
  - `src/features/review/RiskFlagsWorkbench.tsx`
- **Supabase Impact:** None.
- **Correction Implemented:** Integrated `TablePagination` across all 5 views with uniform page size controls, item counters, and search reset hooks.
- **Automated Verification:** Vitest suites `src/test/hq-admin-pagination-suites.test.tsx` (6/6 PASS), `src/test/profile-pagination.test.tsx` (5/5 PASS), and `src/test/risk-flags-pagination.test.tsx` (5/5 PASS).
- **Manual Retest Evidence:** Verified in local browser (`hq_client_audits_pagination.png`, `hq_system_audit_log_pagination.png`, `hq_import_batches_pagination.png`).
- **Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED**
- **Acceptance Basis:** Confirmed passed in project owner formal manual UAT retest sign-off (November 4, 2026). No further retesting required.

---

### DEF-016: ERP Client Master Import Rigidly Requiring GPS Coordinates
- **Module:** HQ Administrator & Field Salesperson (`HqClientMasterImport.tsx`, `RegisterBranchModal.tsx`, `adminService.ts`)
- **Severity:** **P1 (Critical Business Operations)**
- **Issue:** Legacy ERP client exports often lack GPS latitude/longitude. The import tool rejected CSV rows missing coordinates, blocking client onboarding.
- **Expected Behaviour:** ERP imports without GPS must succeed, creating branches in `location_pending` status; field salespeople propose pins upon physical arrival (ADR 0020).
- **Actual Behaviour:** CSV parser rejected rows without coordinates with validation errors.
- **Root Cause:** Overly restrictive client-side schema requiring non-null GPS floats.
- **Files Affected:** `src/features/admin/HqClientMasterImport.tsx`, `src/features/field/RegisterBranchModal.tsx`, `src/services/adminService.ts`, `src/services/visitService.ts`.
- **Supabase Impact:** Supported `operating_status = 'location_pending'` and RPC `propose_branch_location_pin`.
- **Correction Implemented:** Updated CSV parser to treat GPS as optional; imported unpinned branches receive `location_pending` status; salespeople can propose pins on site subject to Country Sales Head review (ADR 0020).
- **Automated Verification:** Vitest suite `src/test/erp-import-and-pin-proposal.test.tsx` (8/8 PASS).
- **Manual Retest Evidence:** Verified with `test_erp_import_live_workflow.py`.
- **Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED**
- **Acceptance Basis:** Confirmed passed in project owner formal manual UAT retest sign-off (November 4, 2026). No further retesting required.

---

### DEF-017: Market Rules Lack Dynamic Supabase Persistence & Prospective Immutability
- **Module:** HQ Administrator (`HqMarketConfiguration.tsx`, `MarketConfigContext.tsx`, `adminService.ts`)
- **Severity:** **P1 (Critical Audit Integrity)**
- **Issue:** Market rule edits (geofence radius, GPS accuracy limits, clock drift) were saved to React state only and did not persist across sessions or enforce prospective immutability.
- **Expected Behaviour:** Rule changes must insert a new immutable version in `public.market_rules` with effective timestamps, leaving historical visit evaluations unaltered (ADR 0021).
- **Actual Behaviour:** Rule updates reverted upon page reload.
- **Root Cause:** Missing Supabase RPC connection in `HqMarketConfiguration.tsx`.
- **Files Affected:** `src/features/admin/HqMarketConfiguration.tsx`, `src/context/MarketConfigContext.tsx`, `src/services/adminService.ts`.
- **Supabase Impact:** Writes to `public.market_rules` with version increment.
- **Correction Implemented:** Wired `adminService.updateMarketRules()` to persist new rule versions; enforced prospective immutability ensuring existing visits maintain historical thresholds (ADR 0021).
- **Automated Verification:** Vitest suite `src/test/stage-1e-cross-role-integration.test.tsx` (PASS).
- **Manual Retest Evidence:** Verified live in Supabase (`market_rules` table: 23 versions).
- **Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED**
- **Acceptance Basis:** Confirmed passed in project owner formal manual UAT retest sign-off (November 4, 2026). No further retesting required.

---

### DEF-018: Lack of HQ Admin Master Client Directory & Audit-Protected Editing
- **Module:** HQ Administrator (`HqClientDirectory.tsx`, `api/admin/clients.ts`, `adminService.ts`)
- **Severity:** **P2 (Major Administrative Governance)**
- **Issue:** HQ Admins could import clients via CSV but lacked an interactive directory to search, inspect, or correct typographical errors in branch names/addresses without corrupting visit foreign keys.
- **Expected Behaviour:** Interactive Master Client Directory with search, status filters, and change reason tracking in `approval_audit` (ADR 0022).
- **Actual Behaviour:** No dedicated directory view in HQ Admin dashboard.
- **Root Cause:** Feature omitted from initial MVP scope.
- **Files Affected:** `src/features/admin/HqClientDirectory.tsx`, `api/admin/clients.ts`, `src/services/adminService.ts`, `src/components/layout/DesktopSidebar.tsx`.
- **Supabase Impact:** Writes audit entries to `public.approval_audit` on branch mutation.
- **Correction Implemented:** Built dedicated `HqClientDirectory` view, added `/api/admin/clients.ts` endpoint with mandatory change reasons, and added desktop navigation link (ADR 0022).
- **Automated Verification:** Vitest suite `src/test/hq-client-directory.test.tsx` (5/5 PASS).
- **Manual Retest Evidence:** Verified in local browser with search and editing.
- **Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED**
- **Acceptance Basis:** Confirmed passed in project owner formal manual UAT retest sign-off (November 4, 2026). No further retesting required.

---

### DEF-019: In-App Simulator GPS Telemetry & Test Controls Present in UI
- **Module:** Field Salesperson (`PersistentStatusStrip.tsx`, `FieldSessionContext.tsx`, `VisitWorkflowView.tsx`, `OfflineSyncView.tsx`)
- **Severity:** **P2 (Major Polish & Telemetry Authenticity)**
- **Issue:** Development simulator artifacts remained visible in the UI: persistent strip displayed static `±14m` with "Simulated Hardware GPS" tooltip; branch selection triggered "Simulated GPS updated" toast; Offline Queue view displayed "Offline Simulator Controls" card with "Simulate Reconnecting" button and "Toggle Network Simulator" tooltip.
- **Expected Behaviour:** Zero simulator controls or fake telemetry in production UI; persistent strip displays authentic GPS status (`GPS Ready` or real hardware accuracy); offline screen displays real network status.
- **Actual Behaviour:** Displayed simulator controls and confusing toasts.
- **Root Cause:** Development-phase simulation scaffolding was not conditionally removed for production builds.
- **Files Affected:**
  - `src/components/field/PersistentStatusStrip.tsx`
  - `src/context/FieldSessionContext.tsx`
  - `src/features/field/VisitWorkflowView.tsx`
  - `src/features/field/OfflineSyncView.tsx`
  - `src/features/field/StartDayModal.tsx`
  - `src/features/field/EndDayModal.tsx`
- **Supabase Impact:** None.
- **Correction Implemented:**
  1. Replaced static ±14m in `PersistentStatusStrip` with dynamic hardware accuracy (`liveGpsCoordinate`, `activeVisit.gpsAccuracyMeters`, or `GPS Ready`).
  2. Removed `"Simulated GPS updated..."` toast notification.
  3. Scoped "Offline Simulator Controls" card strictly to test environments (`isTestEnv`).
  4. Converted "Toggle Network Simulator" button to read-only Network Connection Status badge (`Online` / `Offline`).
- **Automated Verification:** Vitest passing (284/284 tests across 29 test files; 0 TypeScript errors; ESLint passing).
- **Manual Retest Evidence:** Verified locally in browser after full build.
- **Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED**
- **Acceptance Basis:** Confirmed passed in project owner formal manual UAT retest sign-off (November 4, 2026). No further retesting required.

---

## 3. Summary of Defects by Severity

| Severity Level | Open Count | Resolved & Accepted by Project Owner | Retest Required | Blocking Status for RC |
|:---|:---|:---|:---|:---|
| **P0 (Blocker)** | 0 | 0 | 0 | **ZERO P0 BLOCKERS** |
| **P1 (Critical)** | 0 | 7 (DEF-001, 003, 004, 006, 013, 016, 017) | 0 | **100% ACCEPTED — ZERO BLOCKERS** |
| **P2 (Major)** | 0 | 9 (DEF-002, 007, 008, 010, 011, 014, 015, 018, 019) | 0 | **100% ACCEPTED — ZERO BLOCKERS** |
| **P3 (Minor)** | 0 | 3 (DEF-005, 009, 012) | 0 | **100% ACCEPTED — ZERO BLOCKERS** |
| **Total** | **0 Open** | **19 Resolved & Accepted** | **0 Retest Required** | **ALL 19 DEFECTS FORMALLY ACCEPTED — ZERO BLOCKERS** |
