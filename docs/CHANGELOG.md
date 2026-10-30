# Carbon Field Sales Tracker — Project Changelog

All notable changes to the Carbon Field Sales Tracker project are documented in this file in reverse chronological order.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), adhering to Semantic Versioning and staged Antigravity milestone checkpoints.

---

## [Post-Stage 3F Milestone] - HQ Admin Handset Custody Reassignment Supersession, Spare Allocation RPC Alignment & Central Inventory Governance (2026-10-30)

### Handset Reassignment, Spare Allocation & Central Inventory (ADR 0018)
- **Depot Spare Allocation Persistence & RPC Alignment:**
  - Implemented `adminService.allocateSpareDevice({ replacementId, spareDeviceId })` resolving asset tags to UUIDs and invoking RPC `hq_allocate_spare_device` with direct PostgreSQL table fallback.
  - Linked `HqDeviceManagement.tsx` spare allocation modal to database persistence, eliminating UI reversion on 10s background sync.
  - Updated `dispatchReplacementDevice` and `confirmReplacementActivation` to record tracking, activate replacement handsets, link today's `attendance_days.device_id`, and record old device disposition in `public.device_replacement_history`.
- **Handset Custody Reassignment Supersession (Zero-Blocker Reassignment):**
  - Enhanced `adminService.reassignDevice()` and `DeviceReplacementContext.assignDevice()` with custody supersession logic: assigning a new device to a representative who holds an active handset automatically marks the old device as `returned` (`is_current = false, returned_at = now()`), activates the target device, and updates attendance records.
  - Updated the "Assign Handset to Salesperson" modal in `HqDeviceManagement.tsx` to dynamically detect existing active custody, display an informative **Custody Reassignment Notice**, provide a pre-checked supersession option, and enable **"Confirm Handover & Reassign"** without requiring manual multi-step workarounds.
- **Central Inventory Lifecycle Status Supabase Persistence:**
  - Updated `handleStatusUpdateSubmit` in `HqDeviceManagement.tsx` to persist status transitions to Supabase `public.devices` via `adminService.updateDevice()`.
  - Automatically terminates active custody in `public.device_assignments` when devices transition to `returned`, `retired`, or `lost_stolen`.
- **Real-Time Hardware Profile Refresh & Team Attendance Linkage:**
  - Exposed `refreshProfile()` on `AuthContext.tsx` to bust `localStorage` caching and reload profile and device bindings from Supabase.
  - Connected `ProfileView.tsx` to `refreshProfile()` on mount and after replacement ticket lifecycle updates.
  - Enriched `attendanceService.getMarketAttendance()` with `device_assignments` active device lookups (`is_current = true`), ensuring Country Sales Head Team Attendance reflects the representative's latest assigned handset in real time.

### Verified
- **TypeScript:** `npx tsc --noEmit` passed with 0 errors.
- **Vitest Suite:** 199 / 199 tests passing across all 14 test suites.
- **Multi-Role Browser E2E:** 100% pass across HQ Admin spare allocation, salesperson profile sync, dispatch & activation, Country Sales Head team table linkage, and direct zero-blocker handset custody reassignment.

---

## [Post-Stage 3F Milestone] - Country Sales Head Reviews, Dedicated Non-Visit Screen, Bidirectional Real-Time Sync & Storage Bucket Alignment (2026-10-30)

### Manager Review Queues, Dedicated Screens & Storage Alignment (ADR 0017)
- **Storage Bucket Alignment for Business Card Signed URLs (P0 Fix):**
  - Resolved private bucket name mismatch in `managementService.getBusinessCardSignedUrl()` by updating target from `'visit-business-cards'` to canonical `'business-cards'` (per Migration 00012).
  - Implemented path prefix normalization and added explicit `isCardLoading`, `cardLoadError`, and user-facing `Retry` buttons in `ClientVisitVerification.tsx`.
  - Verified signed URL resolution and clean rendering of uploaded business cards in the audit inspection modal.
- **Dedicated Non-Visit Working Days Screen (`NonVisitDaysView.tsx`):**
  - Built dedicated salesperson screen with status tabs (**All**, **Pending**, **Approved**, **Rejected**), live counter badges, submission history, and `+ New Request` modal trigger.
  - Implemented `cancelAbsenceRequest` in `attendanceService.ts` and `cancelNonVisitDayRequest` in `FieldSessionContext.tsx`.
  - Updated Salesperson Home banner: added dismissal `[✕]`, instant `Cancel Request` button for pending submissions, and direct navigation via Home Tile 5.
- **Attendance Table Merging & Real Completed Visit Counts:**
  - Enhanced `attendanceService.getMarketAttendance()` to merge records from `public.approved_absences` alongside `public.attendance_days`, accurately displaying approved non-visit days in the manager's team table.
  - Derived the "Visits Logged" column in `TeamAttendanceReview.tsx` from real completed/started visits for each representative.
  - Aligned `DesktopSidebar` live badges with dashboard metric cards by querying market-scoped endpoints.
- **Exception Workbench Bidirectional Sync & Enhanced Filtering:**
  - Added salesperson filtering, date filtering, and configurable pagination (5 default; 10, 20, 50 rows) to `ExceptionReviewWorkbench.tsx`.
  - Corrected bottom nav badge count on the salesperson interface (`MobileBottomNav.tsx`).
  - Exported `refreshExceptions()` in `FieldSessionContext.tsx` with automatic polling and post-decision reconciliation so salesperson sees manager approvals/rejections immediately.
- **Client Registration Integrity, Live Viewfinder & Canonical Approvals Queue:**
  - Added front/rear camera flip (`SwitchCamera`) and snapshot frame capture to `RegisterBranchModal.tsx`.
  - Replaced the fallback in `visitService.ts` with market-scoped custodian organization provisioning, preventing new registrations from defaulting to existing organizations.
  - Included `operating_status` in `visitService.getClientsAndBranches()`, rendering amber `"Pending Manager Approval"` badges and disabling visit check-ins until manager approval.
  - Consolidated client location & GPS approvals into `BranchApprovalsQueue.tsx` with user/date filtering, timestamps, and live photo previews, deprecating the redundant screen.
  - Added 6-second polling and window focus listeners in `ClientsDirectoryView.tsx` for real-time status updates upon manager decisions.

### Verified
- **TypeScript:** `npx tsc --noEmit` passed with 0 errors.
- **Vitest Suite:** 199 / 199 tests passing across all 14 test suites.
- **Browser Playwright E2E:** 100% pass across all user-reported approval walkthroughs (Non-visit dedicated screen, Exception sync, Client registration & pin approval, Business card inspection).
- **Evidence:** Captured verified visual artifacts in artifacts directory and `docs/screenshots/stage3f/`.

---

## [Post-Stage 3F Milestone] - Device & User Admin Governance, Pagination, Manual Dialog Dismissal & Mobile Camera Switching (2026-10-29)

### Architecture, Administration & Mobile Camera (ADR 0016)
- **Unassigned Device Market Filtering Discrepancies Resolved:**
  - Expanded `adminService.getUnassignedDevicesByMarket()` to return available fleet handsets across `'available'`, `'in_depot'`, and `'returned_to_depot'` inventory statuses.
  - Eliminated discrepancy where unassigned devices in Nigeria, Zambia, and Malawi were omitted from the User Provisioning modal handset assignment dropdown.
- **Direct Supabase Handset Registration:**
  - Connected `Register New Company Device` modal in `HqDeviceManagement.tsx` directly to Supabase (`adminService.registerCompanyDevice()`), storing serial number, asset tag, model, make, IMEI, build version, supplier, warranty, and notes to `public.devices`.
  - Newly registered handsets immediately appear in the inventory directory and become available for user assignment without page refresh.
- **HQ Administrative Governance (Device & User CRUD):**
  - **Edit Device:** Implemented modal for updating handset metadata with live PostgreSQL persistence (`adminService.updateCompanyDevice()`).
  - **Delete Device:** Added safe deletion/retirement workflow with validation checks preventing deletion of devices currently deployed in the field (`adminService.deleteCompanyDevice()`).
  - **Edit User:** Implemented modal allowing HQ Admin to modify Full Name and Mobile Phone (`adminService.updateHqUserProfile()`).
  - **Password Reset:** Added administrative password reset modal with support for custom passwords or auto-generating cryptographically secure 20-character passwords via Edge Function (`adminService.adminResetUserPassword()`).
  - **Delete User:** Added double-confirmation deletion modal invoking GoTrue Admin `deleteUser()` and profile cleanup (`adminService.deleteHqUser()`).
  - **Actions Dropdown:** Converted inline action buttons into an accessible, responsive dropdown menu (`DropdownMenu` primitive with `ChevronDown`).
- **Table Pagination & Multi-Select Bulk Operations:**
  - Created reusable `TablePagination` component (`src/components/ui/table-pagination.tsx`).
  - Configured 10 items default with 20/50/100 page size options on both User Management and Device Management tables.
  - Implemented multi-select row checkboxes with header indeterminate state, sticky selection count action bar, and bulk deletion confirmation modals.
- **Strict Manual Dismissal for Modals & Banners:**
  - Eliminated all automatic `setTimeout` auto-dismissals across all modules.
  - Success dialogs and notification banners remain visible until explicitly dismissed by user interaction via clear confirmation CTAs (e.g. "Acknowledge & Proceed to Field Operations", "Done & Select Location", "Close & View Summary").
- **Mobile Live Feed Camera Switching (Front $\leftrightarrow$ Back):**
  - **Start Day Workday Selfie:** Added `#btn-switch-camera` on the live camera viewport defaulting to front selfie mode with one-tap toggle to rear camera and dynamic selfie mirroring (`-scale-x-100`).
  - **Visit Premises Photo:** Added `#btn-visit-switch-camera` on the live viewfinder defaulting to rear premises mode with one-tap toggle to front camera.
  - Graceful stream track stopping, hardware re-initialization, and fallback error handling.

### Verified
- **TypeScript:** `npx tsc --noEmit` passed with 0 errors.
- **Vitest Suite:** 199 / 199 tests passing across all 14 test suites (added dedicated unit tests for camera toggling).
- **Production Build:** `npm run build` (`tsc -b && vite build`) passed in 11.05s.
- **Browser Playwright E2E:** Verified live camera stream toggling, dynamic button state updates, and snapshot captures on phone viewport ($390 \times 844$).
- **Evidence:** 18 new responsive screenshots captured and stored in `docs/screenshots/stage3f/`.

---

## [Post-Stage 3F Milestone] - Supabase Development SSoT & Frontend Mock Elimination (2026-10-29)

### Architecture & Data Consistency
- **Supabase Single Source of Truth (SSoT):**
  - Enforced hosted Supabase development project (`[SUPABASE_PROJECT_ID].supabase.co`) as the single authoritative source of operational, managerial, and audit records.
  - Eliminated all hardcoded demonstration arrays and artificial metric floors (`Math.max(...)`) across Salesperson, Country Sales Head, and HQ Administrator modules in runtime code (`process.env.NODE_ENV !== 'test'`).
  - Updated `DemoDataBanner.tsx` with `Supabase Dev SSoT` badge confirming direct live connection to `[SUPABASE_PROJECT_ID]`.
- **HQ Device Management Custodian Dropdown Fix (P0):**
  - Eliminated obsolete `FIELD_SALESPEOPLE` (hardcoded 5 mock reps) in `src/features/admin/HqDeviceManagement.tsx`.
  - Replaced with dynamic hydration via `adminService.getHqUsers()`.
  - Verified 22 live Supabase representatives (including `bayo Ayodele`, `Ibrahim Babangida`, `Tunde Adebayo`, `Amina Bello`, `Chukwudi Okafor`) appear in the dropdown with zero mock user codes (`USR-NG-002`, `USR-NG-006`).
  - Connected device assignment, reassignment, and registration to PostgreSQL persistence.
- **HQ Management & Oversight Refactoring:**
  - Removed `INITIAL_COMPANY_DEVICES` and `INITIAL_REQUESTS` in `DeviceReplacementContext.tsx`.
  - Removed `INITIAL_MOCK_USERS` in `HqUserManagement.tsx`.
  - Removed static batches in `HqClientMasterImport.tsx`; now hydrates live from `adminService.getClientImportBatches()`.
  - Removed static exceptions in `HqExceptionOversight.tsx`; now hydrates live from `managementService.getCountryExceptions('ALL')`.
  - Replaced static fallback mergers in `HqSystemAuditLog.tsx` with live ledger stream.
  - Removed artificial metric minimums in `HqOperationsDashboard.tsx`.
- **Management & Review Refactoring:**
  - `CountryReportingView.tsx` derives all metrics from `managementService.getCountryVisits()` and `managementService.getMarketSalespeople()`.
  - Connected `BranchApprovalsQueue.tsx` to `managementService.getBranchLocationPins()`.
  - Connected `TeamAttendanceReview.tsx` to `attendanceService.getMarketAttendance()`.

### Verified
- Automated Vitest Suite: 197/197 tests passing across all 14 test files (0 failures).
- Production Build: `tsc -b && vite build` completed in 12.65 seconds (0 errors).
- Localhost Playwright E2E: Verified dynamic 22-rep dropdown and live handset assignment handover at `http://localhost:5173`.
- Strict local isolation: Zero commits pushed to GitHub and zero Vercel deployments triggered per user instruction.

---

## [Post-Stage 3F Hotfix] - P1 Hotfix: Real Fleet Device Assignment Dropdown & Salesperson Live Camera Preview (2026-10-28)

### Fixed (P1 Functional Corrections)
- **Issue A — HQ Admin "Assign Company Device" Dropdown & Fleet Assignment:**
  - Connected the "Assign Company Device" select dropdown in Provision New System User modal (`src/features/admin/HqUserManagement.tsx`) directly to real Supabase device inventory (`public.devices`).
  - Added reactive market filtering: changing the employee market dynamically filters devices by matching `market_code` (`NG`, `ZM`, `MW`) and `inventory_status = 'available'`, excluding currently assigned or non-functional devices.
  - Added canonical first option: `"No device assigned initially (Assign later)"`.
  - Added informative warning message if no unassigned devices are available for the selected market.
  - Updated `admin-provision-user` Edge Function to execute device assignment with valid enum value `'assigned'` (fixing PostgreSQL constraint error on `'assigned_active'`), market isolation, and rollback isolation (device failure does not block account creation).
  - Added "Assign Device" inline button in directory for unassigned salespeople with an interactive `AssignHandsetModal`.
  - Seeded 6 canonical unassigned fleet handsets across Nigeria, Zambia, and Malawi in Migration `00029` (`supabase/migrations/20261028000029_seed_available_fleet_devices.sql`).
- **Issue B — Salesperson Live Camera Preview & Frame Capture:**
  - Resolved root cause of black camera preview in `src/features/field/StartDayModal.tsx` where conditional mounting on `cameraState === 'active'` caused `videoRef.current` to be `null` when `getUserMedia` stream resolved.
  - Kept `<video>` permanently mounted in DOM with class toggling (`block`/`hidden`) and direct stream binding via `useEffect`.
  - Added video telemetry monitoring (`onLoadedMetadata`, `onPlaying`, `onError`) verifying `videoWidth > 0 && videoHeight > 0`.
  - Ensured "Capture Live Photo" CTA is strictly disabled until the live camera stream is verified ready and playing.
  - Implemented canvas-based frame capture to standard JPEG blob with full preview, retake action, and automatic memory cleanup (`URL.revokeObjectURL`).
  - Preserved strict GPS accuracy validation: maximum allowable threshold ≤ 100m.

### Verified
- Automated Vitest Suite: 195/195 tests passing across 14 test suites (added 5 new tests in `stage-3e-manager-hq.test.tsx` and `stage-3b-attendance.test.tsx`).
- Edge Function deployed and verified on Supabase project `[SUPABASE_PROJECT_ID]`.
- End-to-End Browser Verification (`scripts/verify_p1_hotfixes.py`):
  - HQ Admin authenticated, verified available handsets for NG (`CAR-NG-001`, `CAR-NG-002`, `CC-DEV-LOS-SPARE-01`).
  - Reactive market filtering verified for Zambia (`CAR-ZM-001`, `CAR-ZM-002`) and Malawi (`CAR-MW-001`, `CAR-MW-002`) with zero cross-market leakage.
  - Provisioned new salesperson with assigned device `CAR-NG-001`; verified credentials modal and directory row update.
  - Verified assigned device was immediately removed from available pool in Assign Device modal.
  - Salesperson authenticated, opened Start Workday modal, verified `<video>` stream telemetry (640x480, `paused: false`, `readyState: 4`, "Live Stream" badge).
  - Captured live selfie onto canvas (640x480 natural dimensions, valid JPEG data URL).
  - Tested Retake Photo button; verified live video stream restored seamlessly and recaptured.
- Captured 13 verification screenshots in artifacts directory (`p1_hotfix_01_*.png` through `p1_hotfix_13_*.png`).

---

## [Post-Stage 3F Hotfix] - P0 Defect Resolution: Secure Server-Side HQ Admin User Provisioning & Directory Disambiguation (2026-10-28)

### Fixed (P0 Critical Defect)
- **HQ Admin User Creation Persistence & Authentication:**
  - Resolved P0 defect where creating an employee under **HQ Admin → User & Role Management** only updated local React state (`setUsers`) and did not persist records to Supabase GoTrue Auth or PostgreSQL `profiles` table.
  - Resolved PostgREST relationship ambiguity (`PGRST201`) in `adminService.getHqUsers()` where multiple foreign keys between `profiles` and `device_assignments` (`assigned_by` vs `salesperson_id`) caused directory queries to fail with HTTP 300, forcing the UI into demo fallback mode.

### Added
- **Server-Side User Provisioning Edge Function (`supabase/functions/admin-provision-user/index.ts`):**
  - Secure Deno Edge Function deployed to remote Supabase development project `[SUPABASE_PROJECT_ID]`.
  - Verifies caller session JWT server-side via `auth.getUser()`.
  - Enforces caller profile authorization: caller must possess `role = 'hq_admin'` and `is_active = true` in `public.profiles` (Salesperson and Country Sales Head callers are rejected with HTTP 403 Forbidden; unauthenticated callers rejected with HTTP 401).
  - Validates full name, corporate email regex, role (`salesperson`, `country_sales_head`, `hq_admin`), and market scoping (`NG`, `ZM`, `MW` for reps/heads; `null` for global HQ admin).
  - Enforces duplicate email prevention (HTTP 409 Conflict).
  - Creates cryptographic identity in `auth.users` via Supabase GoTrue Admin API with `email_confirm: true`.
  - Creates matching record in `public.profiles` with identical UUID, role, and market code.
  - Implements compensating rollback: automatically deletes created `auth.users` record if `public.profiles` persistence encounters any constraint violation.
  - Supports optional company handset device binding in `public.device_assignments`.
  - Logs immutable audit record in `public.approval_audit` with `action: 'user_provisioned'`.
- **Frontend Management Service Integration (`src/services/adminService.ts`):**
  - Added `adminService.provisionUser(payload)` calling the Edge Function with the caller's active GoTrue access token.
  - Disambiguated `getHqUsers()` query using `device_assignments!device_assignments_salesperson_id_fkey`.
- **HQ User Management Console UI Polish (`src/features/admin/HqUserManagement.tsx`):**
  - Connected modal to `adminService.provisionUser` with loading spinner, disabled submission state, and server error banner.
  - Replaced mock user blending with live Supabase database directory loading.
  - Added "User Account Provisioned" credential modal displaying employee summary, temporary initial password, and "Copy Credentials" clipboard button.
  - Added Directory "Refresh" action in header to pull fresh Supabase profiles on demand.

### Verified
- Automated Vitest suite: 190/190 passing tests across 14 test suites (added 3 unit & error scenarios in `stage-3e-manager-hq.test.tsx`).
- Live backend security test: `scripts/test_provision_user_edge_function.py` passing 100% (401 unauth, 403 salesperson, 403 sales head, 201 HQ admin, profile persistence, duplicate rejection).
- Live Vercel Staging E2E Verification: `scripts/verify_live_user_provisioning.py` passing 100% against `https://field-sales-tracker-b6l7.vercel.app/`:
  - HQ Admin provisioned real employee `zainab.lawal.test0480@carboncarcare.com`.
  - Successfully logged in as the newly created employee on mobile viewport and confirmed immediate access to Mobile Field Salesperson dashboard.
- Captured 8 verification screenshots in `docs/screenshots/stage3f/p0_fix_*.png`.

---

## [Stage 3F] - End-to-End QA, Physical Handset Protocols & Live Vercel Staging Deployment (2026-10-28)

### Added
- **Live Vercel Staging Deployment (`https://field-sales-tracker-b6l7.vercel.app/`):**
  - Configured and deployed commit `d4dbb37` (tag `stage-3e-management-approved`) to Vercel staging environment backed by Supabase development database `[SUPABASE_PROJECT_ID]`.
  - Deployed hashed assets (`/assets/index-CyOFaEZZ.js` and `/assets/index-CcrtVqeJ.css`) matching local production build.
  - Enforced strict HTTP security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, with immutable asset caching.
- **Automated Live Staging E2E Verification Suite (`scripts/verify_stage_3f_vercel_e2e.py`):**
  - 27 automated Playwright test scenarios executed against the live Vercel staging URL (100% pass rate).
  - Covers unauthenticated brand verification, authentication error rejection, Salesperson mobile workflow (Nigeria - Tunde Adebayo), Country Sales Head management console (Nigeria - Babatunde Adeleke), cross-market isolation (Zambia - Chileshe Mwape & Malawi - Tamika Phiri), HQ Admin console (HQ Administrator), and offline PWA responsiveness.
  - Captured 19 multi-viewport visual artifacts in `docs/screenshots/stage3f/` across mobile (390x844), compact mobile (360x800 - Samsung Galaxy A15 standard), and desktop (1280x800).
- **Physical Handset Testing Protocols (`docs/implementation/STAGE_3F_FIELD_QA.md`):**
  - Standardized device matrices for company-issued Samsung Galaxy A15 (Android 14 / One UI 6.0) and Nokia G22 (Android 13).
  - Formal field execution protocol for local IT and field pilot coordinators in Lagos, Lusaka, and Blantyre.
  - Explicit distinction between automated browser emulation (Playwright) and physical hardware verification (marked NOT TESTED until field pilot).
- **Architecture & Quality Assurance Artifacts:**
  - **ADR 0014:** Stage 3F Staging Deployment, Physical Device QA Protocols & Staging Isolation (`docs/decisions/0014-stage-3f-staging-deployment-and-field-pilot-readiness.md`).
  - **Comprehensive QA Report:** Stage 3F Quality Assurance & Field Pilot Readiness Report (`docs/testing/STAGE_3F_QA_REPORT.md`).

### Verified
- Automated test coverage: 187/187 Vitest unit & integration tests passing across all 14 test suites.
- Live backend security: 9/9 domains passing in `scripts/test_stage_3e_final_security_and_governance.py`.
- Static quality: 0 TypeScript errors (`tsc --noEmit`), 0 ESLint errors (`eslint .`), clean production bundle build in 8.73s.
- Controlled Field Pilot Readiness achieved; business-wide operational rollout paused pending field pilot review.

---

## [Stage 3E] - Management Console, GPS Pin Governance, Zero Bottleneck MDM & Safe CSV Exports (2026-10-28)

### Added
- **Country Sales Head Review Console Service (`src/services/managementService.ts`):**
  - Implemented market-scoped query and review functions: `getCountryTeamAttendance`, `recordApprovedLeave` (calling RPC `record_approved_leave`), `getCountryVisits`, `getPremisesPhotoSignedUrl` / `getBusinessCardSignedUrl` (60-minute expiry for private Storage buckets), `getBranchLocationPins`, `approveBranchLocationPin` (calling RPC `approve_branch_location_pin` with mandatory rationale), `rejectBranchLocationPin` (calling RPC `reject_branch_location_pin`), `proposeBranchLocationPin`, `getCountryExceptions`, `reviewSalespersonException` (calling RPC `review_salesperson_exception`), `getCountryVerificationFlags`, `reviewVerificationFlag`, `getClientAuditRecords`, `sampleWeeklyVisitsForAudit`, `recordClientAuditCall` (calling RPC `record_client_audit_call`), `resolveClientAuditDispute` (calling RPC `resolve_client_audit_dispute`), and `exportCountryVisitsCsv`.
- **HQ Enterprise Administration Service (`src/services/adminService.ts`):**
  - Implemented cross-market operations functions: `getHqOperationsOverview` (multi-market rollups across Nigeria, Zambia, and Malawi), `getHqUsers`, `updateUserProfile`, `getHqDevices`, `registerDevice`, `assignDevice`, `getHqDeviceReplacements`, `reviewDeviceReplacement` (calling RPC `hq_review_device_replacement`), `dispatchReplacementDevice` (calling RPC `hq_dispatch_replacement_device`), `confirmReplacementActivation` (calling RPC `hq_confirm_replacement_activation`), `getMarketRules`, `updateMarketRule`, `getSystemAuditLogs`, and `processClientMasterImport`.
- **Architectural Security & Data Invariants:**
  - **Managerial Non-Origination:** Enforced through database RLS policies and UI architecture that Country Sales Heads and HQ Administrators can never create attendance records, client visits, GPS fixes, or photographs on behalf of salespeople.
  - **Location Unverified Invariant on Exceptions (PRD §7.3, §8.1 / AT-06):** Approved missing-GPS, camera-defect, or device-depletion visit exceptions remain `manager_approved_unverified` and are never converted to GPS verified.
  - **GPS Pin Governance (PRD §7.1):** Salesperson proposals remain `pending_approval` until reviewed by Country Sales Head against reported accuracy ($\le 50\text{m}$) and premises photographs; approval activates a versioned pin in `public.branch_location_pins` while historical visits retain capture-time pin references.
  - **Zero Bottleneck Company Device Replacement (PRD §6.5):** Field salespeople submit device replacement requests directly to HQ Admin (`company_device_id`, `issue_category`, `issue_description`); Country Sales Heads have zero approval or submission gate (blocked via `P0001: Zero Bottleneck Violation`); HQ Admin reviews, dispatches replacement handsets from central depot spare inventory, and confirms Knox MDM activation while recording old handset disposition (`returned_to_depot`, `quarantined`, etc.); `uq_single_active_device_per_rep` constraint strictly preserved.
  - **5% Random Weekly Audit Sampling & Dispute Workflow (PRD §8.3 / AT-09, AT-10):** Random sampling of completed un-audited visits; recording call outcomes; client denials automatically transition dispute status to `under_investigation` and raise verification flag `audit_dispute`; managerial inquiry dispute resolution (`resolve_client_audit_dispute` with `rep_substantiated` vs `confirmed_violation`).
  - **Formula-Safe Audited CSV Export (PRD §10):** Sanitizes leading characters (`=, +, -, @, \t, \r`) by prepending `'` per CWE-1236, and logs each export into `public.export_jobs`.
  - **Client Master ERP Batch Ingestion (PRD §4.2 / AT-08):** Ingests parent organisations and branch locations, allows shared company telephone numbers across different branches of the same client without auto-rejection, marks unpinned branches as `location_pending`, and logs batches to `public.import_batches`.
- **Management & HQ User Interface Components:**
  - `BranchApprovalsQueue.tsx`: Real pin queue, coordinates preview, accuracy check, premises photos, shared phone rule callout.
  - `ExceptionReviewWorkbench.tsx`: Salesperson-authored exceptions, mandatory rationale modal, "Manager Approved — Location Unverified" guarantee.
  - `ClientVisitVerification.tsx`: Real visit list, PostGIS distance check, signed private premises photos, meeting logs.
  - `RiskFlagsWorkbench.tsx`: Behavioral risk flags queue, investigatory signals, review notes submission.
  - `ClientAuditWorkbench.tsx`: Weekly 5% random sampling workbench, phone call outcomes, dispute resolution.
  - `CountryCsvExportModal.tsx`: Date range filter, row count preview, CWE-1236 injection protection notice, audit logging to `export_jobs`.
  - `TeamAttendanceReview.tsx`: Team daily attendance, start/end GPS fixes, signed selfie inspection, administrative leave booking.
  - `HqOperationsDashboard.tsx`: Multi-market rollups (`NG`, `ZM`, `MW`), attendance rates, verified visits, active exceptions, pending approvals.
  - `HqUserManagement.tsx`: User directory, role provisioning, national market scoping, active status toggle.
  - `HqDeviceManagement.tsx`: Device fleet inventory, Zero Bottleneck salesperson replacement queue, courier dispatch, Knox activation.
  - `HqMarketConfiguration.tsx`: National market parameters (geofence radius 200m, pin accuracy 50m, working hours).
  - `HqSystemAuditLog.tsx`: Enterprise immutable audit trail, actor tracking, entity mutations.
  - `HqClientMasterImport.tsx`: ERP CSV ingestion, shared telephone support, unpinned branches marked `location_pending`, batch history.
- **Stage 3E Verification & Documentation:**
  - `src/test/stage-3e-manager-hq.test.tsx`: 17 dedicated integration tests covering GPS pin governance, exception adjudication, zero bottleneck device replacements, 5% random audits, CWE-1236 mitigation, and client master ingestion (187/187 total Vitest tests passing).
  - `scripts/test_stage_3e_db_integrity.py`: Live Supabase database integrity and RPC verification suite against hosted project `[SUPABASE_PROJECT_ID]` (all 6 sections passing).
  - `scripts/verify_stage_3e_browser.py`: Multi-viewport browser verification capturing 15 high-fidelity screenshots across Desktop (1280px), Mobile (390px), and Compact (360px) (`docs/screenshots/stage3e/`).
  - Created ADR 0013 (`docs/decisions/0013-stage-3e-management-and-hq-integration.md`), `docs/implementation/STAGE_3E_MANAGER_HQ.md`, and `docs/testing/STAGE_3E_QA_REPORT.md`.

---

## [Stage 3D] - Durable Offline IndexedDB Journal, Media Queuing & Dependency Synchronisation (2026-10-28)

### Added
- **Dexie.js IndexedDB Offline Journal & Media Store (`src/services/offlineSyncService.ts`):**
  - Implemented `CarbonOfflineJournalDB` with `eventJournal`, `mediaQueue` (`Uint8Array` durable binary payloads), and `cachedContext` object stores partitioned strictly by `ownerUserId`.
  - Supports durable offline queuing and survival across page refreshes/browser restarts for `ATTENDANCE_START_DAY`, `VISIT_CHECKIN`, `VISIT_CHECKOUT`, `MEETING_LOG_SUBMIT`, and `ATTENDANCE_END_DAY`, plus `attendance_selfie`, `visit_premises_photo`, and `business_card_photo` binary blobs.
- **Topological Dependency-Aware Synchronisation Engine:**
  - Enforces strict parent-before-child ordering (`ATTENDANCE_START_DAY → VISIT_CHECKIN → VISIT_CHECKOUT → MEETING_LOG_SUBMIT → ATTENDANCE_END_DAY`) with explicit `pending`, `syncing`, `synced`, `failed`, `needs_review`, and `blocked_dependency` states.
  - Propagates `blocked_dependency` to dependent child operations if a parent operation fails or requires review.
  - Implements idempotent media upload skipping on DB-only retries, duplicate-key (`23505`) server reconciliation, bounded exponential backoff (`computeBoundedBackoffMs`), clock anomaly detection (`detectClockAnomaly`), and browser storage quota monitoring (`assessStorageQuota`).
- **Offline Attendance & Visit Continuity (`src/context/FieldSessionContext.tsx`, `src/features/field/StartDayModal.tsx`, `src/features/field/EndDayModal.tsx`):**
  - Integrated offline Start Day and End Day queuing with provisional `"Saved on Device (Provisional — Pending Server Sync)"` confirmation states and AT-03 open-visit hard block enforcement offline.
  - Caches and restores approved client branches, active market rule versions, provisional attendance, open active visits, and completed visits across page reloads while offline.
  - Automatically triggers ordered synchronisation on browser `online` and `visibilitychange` events.
- **Safe App-Shell Service Worker & Offline Session Recovery (`public/sw.js`, `src/main.tsx`, `src/context/AuthContext.tsx`):**
  - Registered `/sw.js` (`carbon-app-shell-v1`) to cache same-origin `GET` static app-shell assets for offline page refreshes and offline browser cold-starts while strictly excluding all `*.supabase.co` API and private Storage URLs.
  - Added offline profile recovery in `AuthContext` (`carbon_cached_profile_${userId}`) with automatic purge on `signOut()` or account suspension (`is_active === false`).
- **Capture-Time Pin/Rule Immutability & Sync-Boundary Security (`src/services/offlineSyncService.ts`):**
  - Enforced capture-time `branchPinId`/`branchPinVersion` and `ruleVersionId`/`ruleVersionTag` verification on sync (`needs_review` without silent substitution if changed).
  - Enforced sync-execution-boundary checks for `ownerUserId === authenticatedUserId`, active GoTrue JWT ownership, and active employee status (`profiles.is_active === true`).
- **Live Sync Queue Telemetry & UX (`src/features/field/OfflineSyncView.tsx`, `src/components/field/PersistentStatusStrip.tsx`, `src/features/field/SalespersonHomePreview.tsx`):**
  - Displays live IndexedDB queue counts (`Pending Sync`, `Media Queued` + KB size, `Syncing Now`, `Synced (Server)`, `Failed`, `Needs Review`), `Last Successful Server Sync` timestamp, browser Storage Quota bar, explicit status badges (`Saved on this device`, `Waiting to sync`, `Synchronising`, `Saved to Supabase`, `Failed — retry available`, `Needs manager review`), and per-event retry actions.
- **Comprehensive Stage 3D Verification & Documentation:**
  - `src/test/stage-3d-offline-sync.test.tsx`: 26 test blocks covering 27 Stage 3D offline journal, media durability, dependency ordering, idempotency, capture-time immutability, sync-boundary security, and UI test scenarios (170/170 total Vitest tests passing).
  - `scripts/verify_stage_3d_browser.py`: Full 16-step offline workday, offline cold-start, multi-user isolation (`Tunde Adebayo` vs. `Peter Mwale`), Supabase E2E reconciliation, and multi-viewport (`360px`, `390px`, `430px`, `1280px`) browser verification (`docs/screenshots/stage3d/`).
  - Created ADR 0012 (`docs/decisions/0012-stage-3d-offline-indexeddb-journal-and-sync.md`), `docs/implementation/STAGE_3D_OFFLINE_SYNC.md`, and `docs/testing/STAGE_3D_QA_REPORT.md`.

---

## [Stage 3C] - Real Client Visits, Authoritative PostGIS Geofencing, Camera Evidence & Meeting Logs (2026-10-28)

### Added
- **Applied Migrations 00026 & 00027:**
  - `supabase/migrations/20261028000026_stage_3c_visit_integrity_and_triggers.sql`: Bi-directional transaction locking (`trg_prevent_attendance_close_with_open_visit` with `FOR UPDATE` and `trg_prevent_visit_start_on_ended_workday` with `FOR SHARE`), format string correction, and immutable snapshotting of `branch_pin_id` and `rule_version_id`.
  - `supabase/migrations/20261028000027_stage_3c_authoritative_geofence_verification.sql`: Authoritative server-side PostGIS WGS84 distance computation (`ST_Distance(check_in_geom::geography, pin_geom::geography)`) overriding client-supplied `location_classification` to prevent client spoofing of `inside_confident`, cross-market branch verification (`profiles.market_code = branches.market_code`), foreign attendance day ownership verification (`attendance_days.user_id = NEW.user_id`), and checkout immutability trigger (`trg_preserve_visit_checkin_evidence_on_update`).
- **Real Client & Branch Selection (`src/services/visitService.ts`, `src/features/field/VisitWorkflowView.tsx`):**
  - Connects to `public.organisations`, `public.branches`, `public.branch_location_pins`, `public.client_contacts`, and `public.market_rules`.
  - Starts with no client automatically preselected; distinguishes approved vs. pending GPS pins and offers Pin Proposal (Stage 3E queue) or Visit Exception routes for unapproved pins.
- **Live Geolocation & Rear-Camera Premises Photo Capture:**
  - Fresh `navigator.geolocation.getCurrentPosition` integration with accuracy and confidence calculation ($d + a \le r$).
  - Environment-facing camera viewfinder (`facingMode: { ideal: 'environment' }`), JPEG compression, private storage upload to `visit-premises-photos/${userId}/...` with `upsert: false`, and automatic orphan file cleanup if DB check-in fails.
- **Active Visit Restoration, Outside-Geofence Checkout & Meeting Logs (`src/context/FieldSessionContext.tsx`, `src/features/field/MeetingLogModal.tsx`):**
  - Restores active open visit and today's completed visits from Supabase across browser reloads and re-logins.
  - Permits outside-geofence checkouts with acknowledgement modal and audit flag (`Checkout Outside Geofence (>200m)`) while preserving original `location_verified` check-in status.
  - Persists structured meeting logs to `public.meeting_logs` with free-text next steps only (AT-15) and queues pending logs if submission fails after checkout.
- **Comprehensive Stage 3C Test Suites:**
  - `src/test/stage-3c-client-visits.test.tsx`: 18 unit/integration tests (143/143 total Vitest tests passing).
  - `scripts/test_stage_3c_db_integrity.py`: 10 direct API, PostGIS spoofing, RLS, private storage isolation, checkout immutability, and meeting log E2E tests.
  - `scripts/test_stage_3c_concurrency_race.py`: Barrier-synchronized concurrent End Day vs. Visit Check-In race test.
  - `scripts/verify_stage_3c_browser.py`: Playwright multi-viewport (`360px`, `390px`, `430px`, `1280px`) E2E verification and 12 screenshots (`docs/screenshots/stage3c/`).

---

## [Stage 3B] - Real Attendance & Workday Management (2026-10-27)

### Added
- **Supabase-Backed Attendance Persistence:** Created `src/services/attendanceService.ts` providing authoritative PostgreSQL writes to `public.attendance_days`, PostGIS point geometry storage, and timezone-aware business date formatting (`Africa/Lagos`, `Africa/Lusaka`, `Africa/Blantyre`).
- **Live Hardware Camera Viewfinder:** Integrated HTML5 `navigator.mediaDevices.getUserMedia` in `StartDayModal.tsx` displaying live front-camera video preview with `<video>` element and canvas snapshot to JPEG Blob. Explicitly releases hardware tracks (`track.stop()`) on capture, modal dismissal, or unmount.
- **Fresh GPS Satellite Fix Acquisition:** Live Geolocation API integration enforcing PRD horizontal accuracy threshold (≤ 100m for normal capture) with amber guidance on degraded signals.
- **Private Supabase Storage Uploads:** Secure front-camera selfie storage in private bucket `attendance-selfies/${userId}/${workDate}_selfie_${timestamp}.jpg`.
- **Ephemeral Signed URLs for CSH Audit:** `TeamAttendanceReview.tsx` dynamically generates 300-second time-limited signed URLs (`supabase.storage.createSignedUrl`) for private selfie inspection.
- **Workday State Durability:** Connected `FieldSessionContext.tsx` to automatically restore active `'started'` or completed `'ended'` workday status from PostgreSQL across browser reloads and sessions.
- **PRD §6.1 / AT-03 Hard Block:** `EndDayModal.tsx` strictly blocks workday closure while an active client visit session remains in progress.
- **Non-Visit Workday Governance:** Connected `NonVisitDayModal.tsx` to RPC `request_non_visit_workday` and `TeamAttendanceReview.tsx` to RPC `review_non_visit_workday`. Strictly enforces: approved non-visit days credit daily attendance but grant zero physical-visit target credits.
- **Sole-Author Principle Verification:** Direct API security test verifying PostgreSQL RLS policy `attendance_days_insert_salesperson_only` returns `HTTP 403 Forbidden` if a manager attempts to insert attendance for a salesperson.
- **Stage 3B Automated Test Suites:** Created `src/test/stage-3b-attendance.test.tsx` (25 Vitest tests, 125/125 passed across suite), `scripts/verify_stage_3b_live.py` (5 live Supabase tests), `scripts/verify_stage_3b_audit_corrections.py` (12 direct integration and storage tests), and Playwright browser suite capturing 7 full-fidelity screenshots.
- **Documentation & Decision Records:** Created ADR `docs/decisions/0010-stage-3b-real-attendance-and-workday-management.md`, `docs/implementation/STAGE_3B_ATTENDANCE.md`, and `docs/testing/STAGE_3B_QA_REPORT.md`.

### Changed
- **Selfie Evidence Immutability Safeguards:** Hardened selfie upload path to unique submission identifier `${userId}/${workDate}_${submissionId}.jpg` with `upsert: false`. Direct API tests confirm duplicate uploads are rejected (`HTTP 400 Bad Request`), confirmed attendance records skip uploads entirely, failed inserts clean up uncommitted files, and concurrent conflicts (`23505`) clean only uncommitted files without deleting winner evidence.
- **Fail-Closed Active Visit Query Error Handling:** Updated `attendanceService.endDayAttendance` to explicitly handle query failures (`visitError !== null`). End Day halts immediately without modifying `attendance_days`, returns a clear error message, and allows safe retry without assuming empty results means zero visits.
- **Multi-Tiered Active Visit Protection:** Enforces UI warning guard (`activeVisitId !== null`), service layer fail-closed check on `public.visits`, and documents the Stage 3C database trigger contract (`trg_prevent_attendance_close_with_open_visit` with `FOR UPDATE` and `trg_prevent_visit_start_on_ended_workday`).
- **Duplicate End Day Guard:** Hardened `attendanceService.endDayAttendance` to verify current record status and reject calls if status is already `'ended'`.
- **Salesperson Home Preview:** Updated Tile 1 in `src/features/field/SalespersonHomePreview.tsx` to display *"Workday Completed — Today's operational log saved"* when `workdayStatus === 'ended'`.
- **Context Type Expansion:** Added `attendanceRecord`, `isAttendanceLoading`, `onAttendanceStarted`, `onAttendanceEnded`, and `refreshAttendance` to `FieldSessionContextType`.
- **Team Attendance Review:** Connected manager review table directly to live Supabase queries filtered by `market_code`.

---

## [Stage 3A] - Real Supabase Authentication & Role-Based Access Control (2026-10-26)

### Added
- **Official Supabase GoTrue Auth:** Replaced in-memory mock logins with cryptographic GoTrue password authentication (`supabase.auth.signInWithPassword`, `signOut`, `getSession`, `onAuthStateChange`).
- **Database Profile RBAC:** Dynamically load authoritative user profile records from `public.profiles` keyed to `auth.uid()`. Role (`salesperson`, `country_sales_head`, `hq_admin`) and country assignment (`NG`, `ZM`, `MW`) are derived server-side.
- **Direct API & RLS Security Suite:** Added `scripts/test-stage-3a-direct-api-auth.ts` (13 RLS tests) and `scripts/test-stage-3a-live.ts` (8 GoTrue auth checks) validating that RLS blocks cross-market queries, privilege escalation attempts, and unauthorized data modification.
- **Playwright Browser Suite:** Added `scripts/verify_stage_3a_browser.py` verifying real authentication across mobile viewports (360px, 390px, 430px) and desktop (1280px), invalid password feedback, session refresh restoration, and sign-out.
- **Enterprise Password Assistance Modal:** Accessible from the login screen; explains Carbon Car Care mobile fleet policy and provides HQ IT contact instructions.
- **Architecture Decision Record:** Created `docs/decisions/0009-stage-3a-supabase-authentication-and-rbac.md`.
- **Stage 3A Implementation & Test Reports:** Created `docs/stage3a_implementation_report.md` and `docs/stage3a_test_report.md`.

### Changed
- **Removed Development Accounts Drawer:** Excised the dev account helper drawer, seed account list, and fixed demo password helpers from `src/features/auth/LoginView.tsx` to ensure a clean, production-ready login interface.
- **Session-Scoped Operational Providers:** Dynamically keyed `FieldSessionProvider`, `AuditProvider`, and `DeviceReplacementProvider` by `currentUser.id` in `src/App.tsx`, guaranteeing total in-memory state purging upon logout with zero multi-user state leakage.
- **Status Indicator Refinements:** Replaced generic badges in `src/components/feedback/DemoDataBanner.tsx` with `"Signed in securely"` and a prominent, separate `"Demo Field Data"` indicator.
- **Company Handset Display:** Profile screen now displays database-assigned asset tags (`CAR-SPR-117352`) and explicitly disclaims physical hardware attestation (*Future Knox MDM - Unattested in MVP*).
- **Consolidated Check-in CTA:** Removed redundant in-card button in `src/features/field/VisitWorkflowView.tsx`, preserving a single accessible sticky mobile footer action.

---

## [Pre-Stage 3] - Product Audit & Usability Corrections (2026-10-26)

### Added
- **Automated Live Deployment Verification:** Python Playwright script (`scripts/audit_live_site.py`) for live Vercel testing across mobile and desktop breakpoints.

### Changed
- **Sync Queue Accessibility (P1):** Made the persistent sync queue status badge an interactive, keyboard-accessible button that navigates directly to the Sync Queue view without losing active visit state.
- **Mobile Sticky CTA (P2):** Added sticky primary action footer for visit workflows on compact screens (≤ 390px).
- **Terminology Consistency:** Standardized "+ Add Client", "Select Client for Visit", and "Clients & Locations" across all roles.
- **Client Switchboard Support:** Verified shared parent company phone number handling across multiple branches without validation errors.

---

## [Stage 2B] - Supabase Backend Implementation & Security Verification (2026-10-21)

### Added
- **Remote PostgreSQL Schema (25 Migrations):** PostGIS extensions, domain enums, 24 tables, and RPC functions deployed to hosted Supabase project (`[SUPABASE_PROJECT_ID]`).
- **Comprehensive RLS Security:** Row-Level Security policies covering all public tables, restricting access by market and role.
- **Private Storage Buckets:** Private buckets (`attendance-selfies`, `premises-photos`, `meeting-cards`, `exception-evidence`) with path-based RLS (`auth.uid()`).
- **Automated Backend Test Suite:** `scripts/test-backend.ts` validating 30 security, schema, and workflow test cases.
- **Architecture Decision Record:** Created `docs/decisions/0008-stage-2b-supabase-backend-implementation.md`.

---

## [Stage 2A] - Backend Architecture & Planning (2026-10-20)

### Added
- **Backend Architecture Specification:** Comprehensive data model, RLS policy matrix, and migration roadmap (`docs/stage2a_backend_architecture_plan.md`).
- **Architecture Decision Record:** Created `docs/decisions/0007-stage-2a-backend-architecture-and-planning.md`.

---

## [Stage 1E] - Final Frontend QA & Cross-Role Integration (2026-10-18)

### Added
- **Cross-Role Integration Tests:** Automated tests in `src/test/stage-1e-cross-role-integration.test.tsx` verifying end-to-end rep registration to manager approval flows.
- **QA Report:** Created `docs/stage1e_qa_report.md`.
- **Architecture Decision Record:** Created `docs/decisions/0006-stage-1e-frontend-qa-and-integration.md`.

---

## [Stage 1D] - HQ Admin Regional Oversight Console (2026-10-16)

### Added
- **HQ Administration Portal:** Cross-market operational dashboard, company device fleet custody workbench, hardware replacement pipeline, ERP client master import wizard, and audit log viewer.
- **Architecture Decision Record:** Created `docs/decisions/0005-stage-1d-hq-admin-interface.md`.

---

## [Stage 1C] - Country Sales Head Dashboard (2026-10-14)

### Added
- **Manager Operations Dashboard:** Daily attendance monitoring, visit evidence review, branch/pin approval queue, algorithmic verification flag triage, client audit phone workbench, and audited safe CSV export.
- **Architecture Decision Record:** Created `docs/decisions/0004-stage-1c-country-sales-head-dashboard.md`.

---

## [Stage 1B] - Salesperson Mobile Interface (2026-10-12)

### Added
- **Salesperson PWA Shell:** Mobile-first layout, attendance check-in (selfie + GPS fix), client branch directory, 6-step visit workflow, rear-camera premises photo capture, meeting log capture, and exception filing.
- **Architecture Decision Record:** Created `docs/decisions/0003-stage-1b-salesperson-mobile-interface.md`.

---

## [Stage 1A] - Brand Identity, Design System & Application Shell (2026-10-10)

### Added
- **Authentic Brand Integration:** Deployed official logo (`public/brand/carbon_logo.png`) and design tokens (Primary Blue `#21409A`, Green `#1B9A4A`, Yellow `#E8CF2F`).
- **Design System:** Manrope typography, Tailwind CSS v4, shadcn/ui primitives.
- **Architecture Decision Record:** Created `docs/decisions/0002-stage-1a-approval.md`.

---

## [Stage 0] - Project Architecture & Staged Delivery Plan (2026-10-08)

### Added
- **Foundational Master Plan:** Functional PRD v1.2 breakdown, entity-relationship diagrams, MVP boundaries, risk mitigation, and staged delivery roadmap (`stage0_implementation_plan.md`).
- **Architecture Decision Record:** Created `docs/decisions/0001-stage-0-approval.md`.
