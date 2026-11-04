# Carbon Field Sales Tracker — Post-UAT Release Readiness Report

**Document Version:** 1.2 (Release Candidate 1.0.0 Frozen, Checkpoint Approved & Controlled Staging Baseline)  
**Date:** November 4, 2026  
**Project:** Carbon Field Sales Tracker  
**Business:** Carbon Car Care  
**Reference:** PRD v1.2, ADRs 0001–0022  
**Target Environments:** Local Verified Build / Supabase Dev (`[SUPABASE_PROJECT_ID].supabase.co`) / Controlled Staging (`https://field-sales-tracker-b6l7.vercel.app/`)  
**Evaluation:** **CONDITIONAL GO — RELEASE CANDIDATE 1.0.0 (`rc-1.0.0-uat-verified`) APPROVED FOR STAGING & PHYSICAL HANDSET FIELD PILOT**

---

## 1. Executive Summary

This Post-UAT Release Readiness Report consolidates all defects and feedback identified during manual User Acceptance Testing (UAT) conducted by the project owner across the application's three core roles: **Field Salesperson**, **Country Sales Head**, and **HQ Administrator**.

The project owner has formally confirmed:
1. **Full manual UAT has been completed** across all user personas and workflows.
2. **All 19 identified defects (DEF-001 through DEF-019) have been corrected.**
3. **All 19 targeted manual retests have PASSED.**
4. **No further UAT retesting is required for these defects.**

Zero open P0 or P1 defects remain in the codebase. All 19 corrected items—plus the Phase 1 3-state device custody reconciliation (`pending_inspection` vs `returned` vs `available`)—are verified through local automated regression suites (288/288 Vitest tests passing across 30 test files, 13/13 direct API RLS checks passing against the hosted Supabase development database, 0 TypeScript compiler errors, 0 ESLint errors, and a clean production Vite build with zero simulator controls or credentials).

With formal release checkpoint approval granted by the project owner, the application is frozen and promoted as **Release Candidate 1.0.0** (`rc-1.0.0-uat-verified`) to GitHub and the controlled Vercel staging environment. The sole remaining milestone dependency prior to unrestricted employee rollout is the controlled physical Android field validation on company handsets (Samsung Galaxy A15 / Nokia G22).

---

## 2. Baseline Architecture & Working-Tree Status

### 2.1 Git Repository State
- **Branch:** `main`
- **Prior Base Commit:** `929653e` (`fix(security): sanitize secret keys, credentials, supabase project refs and personal emails across workspace`)
- **Release Checkpoint Tag:** `rc-1.0.0-uat-verified` (`chore(release): finalize RC 1.0.0 after full UAT acceptance`)
- **Working-Tree Status:** Clean, frozen Release Candidate tree containing verified defect fixes (`DEF-001`–`DEF-019`), 3-state device custody reconciliation, 30 Vitest suites, 29 declarative SQL migrations, and synchronized documentation, excluding all `.env*` files, credentials, and local debug artifacts.

### 2.2 Hosted Database & Private Storage Parity
- **Supabase Project:** `https://[SUPABASE_PROJECT_ID].supabase.co`
- **Applied Migrations:** All 29 migrations in `supabase/migrations/` (00001–00029) match the hosted PostgreSQL schema (`public.device_status` includes `pending_inspection`).
- **Private Storage Buckets:** All 7 canonical Storage buckets (`attendance-selfies`, `visit-premises-photos`, `business-cards`, `exception-evidence`, `device-issue-photos`, `client-master-imports`, `export-reports`) verified active with `public = false`.
- **Database Model Parity:** 23 canonical tables and enums verified active, populated, and protected by PostgreSQL Row-Level Security (RLS) policies and PostGIS spatial functions (with zero prohibited commercial tables):
  - `public.markets` (NG, ZM, MW) & `public.market_rules`
  - `public.profiles` (Salesperson, Country Sales Head, HQ Admin)
  - `public.devices`, `public.device_assignments`, `public.device_replacement_requests` & `public.device_replacement_history`
  - `public.work_schedules`, `public.public_holidays`, `public.attendance_days` & `public.absence_requests`
  - `public.organisations`, `public.branches`, `public.client_contacts`, `public.branch_location_pins` & `public.client_change_requests`
  - `public.visits`, `public.meeting_logs`, `public.activity_events` & `public.exceptions`
  - `public.verification_flags`, `public.client_audit_records` & `public.approval_audit`
  - `public.import_batches` & `public.export_jobs`

---

## 3. Consolidated Defect Register & Resolution Status

Every defect discovered during manual UAT and developer audits is detailed below:

### DEF-001: Hardcoded Mock Audit Log in HQ User Management
- **Role & Workflow:** HQ Administrator (`HqUserManagement.tsx`)
- **Severity:** P1 (Critical Data Integrity)
- **Root Cause:** "User Audit Trail" drawer loaded static mock array (`AUD-001`–`AUD-003`) instead of querying Supabase.
- **Correction:** Connected drawer to `adminService.getSystemAuditLogs(200)` querying `public.approval_audit` with `actor_id` filter.
- **Files Modified:** `src/features/admin/HqUserManagement.tsx`.
- **Automated Verification:** Vitest suite `src/test/stage-3e-manager-hq.test.tsx` (PASS).
- **Current Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED** (Confirmed in formal manual UAT sign-off; zero further retesting required).

### DEF-002: Storage Bucket Name Mismatch for Visit Business Cards
- **Role & Workflow:** Country Sales Head (`ClientVisitVerification.tsx`)
- **Severity:** P2 (Major Functional)
- **Root Cause:** Backend migration created `business-cards` bucket, but client requested `visit-business-cards`.
- **Correction:** Aligned bucket name in `managementService.getBusinessCardSignedUrl()` to canonical `'business-cards'` (ADR 0017).
- **Files Modified:** `src/services/managementService.ts`, `src/features/review/ClientVisitVerification.tsx`.
- **Automated Verification:** Vitest passing; verified in `snap_business_card.py`.
- **Current Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED** (Confirmed in formal manual UAT sign-off; zero further retesting required).

### DEF-003: Handset Custody Reassignment Hard Lockout
- **Role & Workflow:** HQ Administrator (`HqDeviceManagement.tsx`, `adminService.ts`)
- **Severity:** P1 (Critical Workflow)
- **Root Cause:** Unique constraint `uq_single_active_device_per_rep` aborted assignment if salesperson held an active device.
- **Correction:** Implemented automatic custody supersession in `adminService.reassignDevice()`: relinquishes prior handset (`is_current = false`, `inventory_status = 'pending_inspection'`, `security_authorization = 'quarantined'`), assigns `available` handset, and displays dynamic "Custody Reassignment Notice" (ADR 0018).
- **Files Modified:** `src/features/admin/HqDeviceManagement.tsx`, `src/services/adminService.ts`, `src/context/DeviceReplacementContext.tsx`.
- **Automated Verification:** Vitest suites `src/test/stage-3e-manager-hq.test.tsx` & `src/test/device-custody-reconciliation.test.tsx` (PASS).
- **Current Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED** (Confirmed in formal manual UAT sign-off; zero further retesting required).

### DEF-004: UI Reversion on Spare Handset Depot Allocation
- **Role & Workflow:** HQ Administrator (`HqDeviceManagement.tsx`, `adminService.ts`)
- **Severity:** P1 (Critical Workflow)
- **Root Cause:** `allocateSpareDevice` received `asset_tag` instead of device UUID required by RPC `hq_allocate_spare_device`.
- **Correction:** Resolved asset tag to device UUID before RPC call; added table fallback (ADR 0018).
- **Files Modified:** `src/features/admin/HqDeviceManagement.tsx`, `src/services/adminService.ts`.
- **Automated Verification:** Vitest passing; verified in `verify_dispatch_and_activation.py`.
- **Current Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED** (Confirmed in formal manual UAT sign-off; zero further retesting required).

### DEF-005: Scaffold Geometric Placeholder Favicon
- **Role & Workflow:** Application Shell & Branding (`public/favicon.svg`, `index.html`)
- **Severity:** P3 (Minor Brand Compliance)
- **Root Cause:** Initial scaffold favicon not replaced with authentic Carbon Car Care brand mark.
- **Correction:** Built high-contrast multi-resolution SVG, ICO, and PNG suite from authentic logo with dual-theme white underlay (ADR 0019).
- **Files Modified:** `public/favicon.*`, `public/apple-touch-icon.png`, `public/site.webmanifest`, `index.html`.
- **Automated Verification:** Vitest suite `src/test/brand-logo.test.tsx` (PASS).
- **Current Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED** (Confirmed in formal manual UAT sign-off; zero further retesting required).

### DEF-006: Plaintext Test Passwords in Test Plans & Documentation
- **Role & Workflow:** Security & Acceptance Documentation (`FULL_ROLE_BASED_UAT_PLAN.md`, `UAT_TEST_CASES.md`)
- **Severity:** P1 (Security / Compliance)
- **Root Cause:** Plaintext credentials committed to acceptance markdown documentation.
- **Correction:** Excised all cleartext passwords; replaced with standardized instruction *"Use the securely supplied test credentials"*; rotated all GoTrue test credentials via `npm run provision:users` and stored in git-ignored `.env.local`.
- **Files Modified:** `docs/testing/FULL_ROLE_BASED_UAT_PLAN.md`, `docs/testing/UAT_TEST_CASES.md`, `scripts/provision-users.ts`.
- **Automated Verification:** Git search confirmed 0 secrets in tracked repository files.
- **Current Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED** (Confirmed in formal manual UAT sign-off; zero further retesting required).

### DEF-007: Device Status False Depot Attribution on Custody Supersession & Activation
- **Role & Workflow:** HQ Administration (`adminService.ts`, `HqDeviceManagement.tsx`, `HqUserManagement.tsx`, `DeviceReplacementContext.tsx`, `supabase/functions/admin-provision-user`)
- **Severity:** P2 (Major Data Integrity)
- **Root Cause:** Relinquished devices were automatically marked `returned` (or `available` on user deactivation) before physical depot inspection, and assignment/spare pickers treated `returned` identically to `available`.
- **Correction:** Enforced 3-state custody governance: relinquished/superseded/deactivated handsets transition to `pending_inspection` (`quarantined`), `returned` requires explicit depot receipt confirmation, and only `available` handsets can be assigned or allocated as spares.
- **Files Modified:** `src/services/adminService.ts`, `src/features/admin/HqDeviceManagement.tsx`, `src/features/admin/HqUserManagement.tsx`, `src/context/DeviceReplacementContext.tsx`, `supabase/functions/admin-provision-user/index.ts`.
- **Automated Verification:** Vitest suites `src/test/stage-3e-manager-hq.test.tsx` & `src/test/device-custody-reconciliation.test.tsx` (PASS).
- **Current Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED** (Confirmed in formal manual UAT sign-off; zero further retesting required).

### DEF-008: Country Reporting Salesperson Name & Date Range Filtering
- **Role & Workflow:** Country Sales Head (`CountryReportingView.tsx`, `CountryCsvExportModal.tsx`)
- **Severity:** P2 (Major Usability & Reporting)
- **Root Cause:** Dropdown filters failed to bind synchronously to the live visit dataset.
- **Correction:** Bound salesperson filter dropdown and date range states directly to computed `filteredRecords` memoization.
- **Files Modified:** `src/features/review/CountryReportingView.tsx`, `src/features/review/CountryCsvExportModal.tsx`.
- **Automated Verification:** Vitest suite `src/test/country-reporting-pagination.test.tsx` (PASS).
- **Current Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED** (Confirmed in formal manual UAT sign-off; zero further retesting required).

### DEF-009: Country Sales Head Dashboard Preview Card Overflow
- **Role & Workflow:** Country Sales Head (`SalesHeadDashboardPreview.tsx`)
- **Severity:** P3 (Minor Usability & Layout Density)
- **Root Cause:** Preview cards rendered unbounded lists of pending approvals and exceptions.
- **Correction:** Sliced preview arrays to top 5 items max; added dynamic `"View All (N)"` header buttons navigating to full queues.
- **Files Modified:** `src/features/review/SalesHeadDashboardPreview.tsx`.
- **Automated Verification:** Vitest suite `src/test/stage-1c-manager-dashboard.test.tsx` (PASS).
- **Current Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED** (Confirmed in formal manual UAT sign-off; zero further retesting required).

### DEF-010: Country CSV Export Filter & Custom Date Picker Non-Functional
- **Role & Workflow:** Country Sales Head (`CountryCsvExportModal.tsx`, `countryCsvService.ts`)
- **Severity:** P2 (Major Reporting & Data Extraction)
- **Root Cause:** Date picker inputs remained disabled; CSV export failed with null references on undefined dates.
- **Correction:** Added active date mode toggle with controlled native date inputs, input validation, and formula injection escaping (CWE-1236).
- **Files Modified:** `src/features/review/CountryCsvExportModal.tsx`, `src/services/countryCsvService.ts`.
- **Automated Verification:** Vitest suites `src/test/country-csv-export.test.tsx` and `src/test/country-csv-service.test.ts` (PASS).
- **Current Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED** (Confirmed in formal manual UAT sign-off; zero further retesting required).

### DEF-011: Missing Table Pagination on Country Reporting Operational Records
- **Role & Workflow:** Country Sales Head (`CountryReportingView.tsx`)
- **Severity:** P2 (Major Usability & Performance)
- **Root Cause:** Table rendered unbounded rows without pagination.
- **Correction:** Integrated reusable `TablePagination` defaulting to 10 rows per page with options `[10, 20, 50, 100]` and search resets.
- **Files Modified:** `src/features/review/CountryReportingView.tsx`, `src/components/ui/table-pagination.tsx`.
- **Automated Verification:** Vitest suite `src/test/country-reporting-pagination.test.tsx` (PASS).
- **Current Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED** (Confirmed in formal manual UAT sign-off; zero further retesting required).

### DEF-012: Inaccurate Metric Nomenclature ("Unique Branches" vs "Locations visited")
- **Role & Workflow:** Country Sales Head & Salesperson Dashboards (`CountryReportingView.tsx`, `SalesHeadDashboardPreview.tsx`)
- **Severity:** P3 (Minor Terminology & Polish)
- **Root Cause:** Early UI scaffolding labeled physical visit metrics as "Unique Branches".
- **Correction:** Replaced all instances of "Unique Branches" with "Locations visited" across tables, tooltips, and summary cards.
- **Files Modified:** `src/features/review/CountryReportingView.tsx`, `src/features/review/SalesHeadDashboardPreview.tsx`.
- **Automated Verification:** Vitest passing (`src/test/country-reporting-pagination.test.tsx`).
- **Current Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED** (Confirmed in formal manual UAT sign-off; zero further retesting required).

### DEF-013: Salesperson Non-Visit Workday Cancellation Authorization Failure
- **Role & Workflow:** Field Salesperson (`NonVisitDaysView.tsx`, `attendanceService.ts`, `api/attendance/cancel-non-visit.ts`)
- **Severity:** P1 (Critical Workflow)
- **Root Cause:** Endpoint `/api/attendance/cancel-non-visit.ts` checked manager credentials instead of verifying that caller was requesting salesperson.
- **Correction:** Allowed cancellation if `callerUserId === request.user_id` AND `request.status === 'pending'`; passed auth token; appended audit log.
- **Files Modified:** `api/attendance/cancel-non-visit.ts`, `src/services/attendanceService.ts`, `src/features/field/NonVisitDaysView.tsx`, `src/context/FieldSessionContext.tsx`.
- **Automated Verification:** Vitest suite `src/test/non-visit-cancellation.test.ts` (PASS, 5/5 tests).
- **Current Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED** (Confirmed in formal manual UAT sign-off; zero further retesting required).

### DEF-014: Missing Table Pagination on HQ Exception Oversight
- **Role & Workflow:** HQ Administrator (`HqExceptionOversight.tsx`)
- **Severity:** P2 (Major Usability)
- **Root Cause:** Rendered all tri-market exceptions (64+ items) in one unconstrained table.
- **Correction:** Integrated `TablePagination` with default 10 per page, options `[10, 20, 50, 100]`, page clamping, and filter reset.
- **Files Modified:** `src/features/admin/HqExceptionOversight.tsx`.
- **Automated Verification:** Vitest suite `src/test/hq-exception-oversight-pagination.test.tsx` (PASS, 5/5 tests).
- **Current Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED** (Confirmed in formal manual UAT sign-off; zero further retesting required).

### DEF-015: Missing Table Pagination Across HQ Admin Oversight & Profile Views
- **Role & Workflow:** HQ Administrator & Salesperson Profile (`HqClientAuditOversight.tsx`, `HqSystemAuditLog.tsx`, `HqClientMasterImport.tsx`, `ProfileView.tsx`, `RiskFlagsWorkbench.tsx`)
- **Severity:** P2 (Major Usability & Consistency)
- **Root Cause:** Administrative tables lacked standard table pagination.
- **Correction:** Integrated `TablePagination` across all 5 views with uniform page size controls, item counters, and search reset hooks.
- **Files Modified:** `HqClientAuditOversight.tsx`, `HqSystemAuditLog.tsx`, `HqClientMasterImport.tsx`, `ProfileView.tsx`, `RiskFlagsWorkbench.tsx`.
- **Automated Verification:** Vitest suites `hq-admin-pagination-suites.test.tsx` (6/6 PASS), `profile-pagination.test.tsx` (5/5 PASS), `risk-flags-pagination.test.tsx` (5/5 PASS).
- **Current Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED** (Confirmed in formal manual UAT sign-off; zero further retesting required).

### DEF-016: ERP Client Master Import Rigidly Requiring GPS Coordinates
- **Role & Workflow:** HQ Administrator & Field Salesperson (`HqClientMasterImport.tsx`, `RegisterBranchModal.tsx`, `adminService.ts`)
- **Severity:** P1 (Critical Business Operations)
- **Root Cause:** CSV parser rejected client rows lacking latitude/longitude coordinates.
- **Correction:** Made GPS coordinates optional in CSV schema; imported branches without GPS enter `location_pending` status; salespeople propose live pins upon physical arrival subject to CSH review (ADR 0020).
- **Files Modified:** `HqClientMasterImport.tsx`, `RegisterBranchModal.tsx`, `adminService.ts`, `visitService.ts`.
- **Automated Verification:** Vitest suite `src/test/erp-import-and-pin-proposal.test.tsx` (8/8 PASS).
- **Current Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED** (Confirmed in formal manual UAT sign-off; zero further retesting required).

### DEF-017: Market Rules Lack Dynamic Supabase Persistence & Prospective Immutability
- **Role & Workflow:** HQ Administrator (`HqMarketConfiguration.tsx`, `MarketConfigContext.tsx`, `adminService.ts`)
- **Severity:** P1 (Critical Audit Integrity)
- **Root Cause:** Market rule changes were held in React state only and did not persist across sessions or preserve historical evaluations.
- **Correction:** Wired `adminService.commitMarketRuleVersion` to persist immutable rule versions (`public.market_rules`); historical visits retain past thresholds (ADR 0021).
- **Files Modified:** `HqMarketConfiguration.tsx`, `MarketConfigContext.tsx`, `adminService.ts`.
- **Automated Verification:** Vitest suite `src/test/stage-1e-cross-role-integration.test.tsx` (PASS); live Supabase version checks.
- **Current Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED** (Confirmed in formal manual UAT sign-off; zero further retesting required).

### DEF-018: Lack of HQ Admin Master Client Directory & Audit-Protected Editing
- **Role & Workflow:** HQ Administrator (`HqClientDirectory.tsx`, `api/admin/clients.ts`, `adminService.ts`)
- **Severity:** P2 (Major Administrative Governance)
- **Root Cause:** HQ Admins could import clients but lacked an interactive UI to correct typographical mistakes without corrupting visit foreign keys.
- **Correction:** Built dedicated `HqClientDirectory` view, `/api/admin/clients.ts` endpoint with mandatory change reasons, and audit logging to `public.approval_audit` (ADR 0022).
- **Files Modified:** `src/features/admin/HqClientDirectory.tsx`, `api/admin/clients.ts`, `src/services/adminService.ts`, `src/components/layout/DesktopSidebar.tsx`.
- **Automated Verification:** Vitest suite `src/test/hq-client-directory.test.tsx` (5/5 PASS).
- **Current Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED** (Confirmed in formal manual UAT sign-off; zero further retesting required).

### DEF-019: In-App Simulator GPS Telemetry & Test Controls Present in UI
- **Role & Workflow:** Field Salesperson (`PersistentStatusStrip.tsx`, `FieldSessionContext.tsx`, `VisitWorkflowView.tsx`, `OfflineSyncView.tsx`)
- **Severity:** P2 (Major Polish & Telemetry Authenticity)
- **Root Cause:** Development simulator artifacts remained visible in UI (static ±14m, "Simulated Hardware GPS" tooltip, "Simulated GPS updated" toast, "Offline Simulator Controls" card).
- **Correction:**
  1. Replaced static ±14m in `PersistentStatusStrip` with dynamic hardware accuracy (`liveGpsCoordinate`, `activeVisit.gpsAccuracyMeters`, or `GPS Ready`); removed tooltip.
  2. Removed `"Simulated GPS updated..."` toast notification.
  3. Scoped "Offline Simulator Controls" card strictly to test environments (`isTestEnv`).
  4. Converted "Toggle Network Simulator" button into a read-only Network Connection Status badge (`Online` / `Offline`).
- **Files Modified:** `PersistentStatusStrip.tsx`, `FieldSessionContext.tsx`, `VisitWorkflowView.tsx`, `OfflineSyncView.tsx`, `StartDayModal.tsx`, `EndDayModal.tsx`.
- **Automated Verification:** Vitest passing (288/288 tests across 30 test files; 0 TS errors; ESLint passing).
- **Current Status:** **ACCEPTED — PROJECT OWNER RETEST PASSED** (Confirmed in formal manual UAT sign-off; zero further retesting required).

---

## 4. Defect Metrics & Severity Breakdown

| Severity | Discovered | Resolved in Code | Formally Accepted (Retest Passed) | Retest Required | Open Defects |
|:---|:---:|:---:|:---:|:---:|:---:|
| **P0 (Blocker)** | 0 | 0 | 0 | 0 | **0** |
| **P1 (Critical)** | 7 | 7 | 7 | 0 | **0** |
| **P2 (Major)** | 9 | 9 | 9 | 0 | **0** |
| **P3 (Minor)** | 3 | 3 | 3 | 0 | **0** |
| **Total** | **19** | **19** | **19 (100%)** | **0** | **0** |

---

## 5. Automated Regression Verification Results

| Verification Category | Target / Scope | Observed Metric | Result |
|---|---|---|:---:|
| **Vitest Unit & Integration** | 30 test files covering all modules | **288 / 288 passing (100%)** | **PASS** |
| **Direct Supabase API & RLS** | Multi-market negative security tests | **13 / 13 passing (100%)** | **PASS** |
| **TypeScript Strict Compilation** | `npx tsc -b` | **0 errors** | **PASS** |
| **ESLint Static Analysis** | `npm run lint` | **0 errors** (5 non-blocking warnings) | **PASS** |
| **Production Vite Build** | Strict bundling (`npm run build`) | Built cleanly (JS: 1,615.8 kB, CSS: 91.1 kB; 0 simulator strings) | **PASS** |
| **Database & Storage Parity** | 29 migrations, 23 tables, 7 private buckets | All 23 tables active, 0 excluded tables, 7/7 `public = false` | **PASS** |
| **Secret Sanitization** | Repository-wide credential audit | **0 plaintext passwords / secret keys / personal emails** | **PASS** |

---

## 6. Physical Android Handset Verification Status

- **Status:** **NOT TESTED (Physical Handset Required)**
- **Target Company Hardware:** Samsung Galaxy A15 / Nokia G22
- **Remaining Scope for Field Pilot:**
  1. On-device hardware GNSS acquisition time to first fix (TTFF) targets and approved accuracy rules (`≤100m` visits/attendance, `≤50m` proposed pins, `200m` geofence) under real outdoor sky conditions in Lagos, Lusaka, and Blantyre.
  2. Native WebRTC front-camera selfie and rear-camera premises photo capture with private Storage persistence (`attendance-selfies`, `visit-premises-photos`, `business-cards`, `exception-evidence`, `device-issue-photos`).
  3. Complete 5-operation offline lifecycle (`ATTENDANCE_START_DAY → VISIT_CHECKIN → VISIT_CHECKOUT → MEETING_LOG_SUBMIT → ATTENDANCE_END_DAY`) and idempotent sync recovery without guaranteeing OS battery settings prevent browser storage eviction.
  4. PWA installation, offline service worker (`public/sw.js`) app-shell caching, and home-screen launch on company-issued Samsung Galaxy A15 and Nokia G22 handsets.
- **Integrity Rule:** Browser viewport simulation and automated tests are explicitly recognized as non-equivalent to physical phone testing. Handset QA remains an outstanding prerequisite for business go-live.

---

## 7. Release Candidate Commit & Tag

- **Commit Baseline:** Frozen `main` branch commit (`chore(release): finalize RC 1.0.0 after full UAT acceptance`).
- **Annotated Git Tag:** `rc-1.0.0-uat-verified`
- **Release Scope:** Complete MVP scope conforming to PRD v1.2, ADRs 0001–0022, with all 19 UAT defects resolved in code, formally accepted by the project owner, and promoted to controlled Vercel staging (`https://field-sales-tracker-b6l7.vercel.app/`).

---

## 8. Release Recommendation

### **CONDITIONAL GO (RC 1.0.0 APPROVED FOR CONTROLLED STAGING & PHYSICAL FIELD PILOT)**

**Justification:**
1. **Code & Quality Readiness:** The codebase is frozen, stable, and completely regression-tested. 288/288 Vitest tests pass across 30 test files, with zero TypeScript compiler errors, zero ESLint errors, 13/13 Direct API/RLS checks passing, and a clean production build.
2. **Defect Resolution & Stakeholder Acceptance:** All 19 user-reported and audit-discovered defects (DEF-001 through DEF-019) have been addressed, verified by automated tests, and formally accepted by the project owner following successful targeted manual retests. Zero open defects or blockers exist.
3. **Condition 1 (Stakeholder Acceptance & Release Checkpoint):** **SATISFIED.** Project owner granted formal UAT acceptance and Release Checkpoint approval for `rc-1.0.0-uat-verified` on November 4, 2026.
4. **Condition 2 (Physical Field Pilot):** Execution of on-site hardware verification on company-provided Samsung Galaxy A15 / Nokia G22 handsets in accordance with [`PHYSICAL_ANDROID_FIELD_VALIDATION_PLAN.md`](PHYSICAL_ANDROID_FIELD_VALIDATION_PLAN.md) prior to unrestricted multi-market business deployment.
