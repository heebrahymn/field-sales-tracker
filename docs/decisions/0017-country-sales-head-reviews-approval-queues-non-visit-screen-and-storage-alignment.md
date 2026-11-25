# ADR 0017: Country Sales Head Reviews, Approval Queues, Dedicated Non-Visit Screen, Bidirectional Real-Time Sync & Storage Bucket Alignment

- **Status:** Approved & Verified in Dev / Staging
- **Date:** 2026-10-30
- **Authors:** Senior Full-Stack Architect & QA Engineering
- **Deciders:** Project Owner, Architecture Team, Field QA Lead
- **Related ADRs:** ADR 0010 (Stage 3B Attendance), ADR 0011 (Stage 3C Visits), ADR 0012 (Stage 3D Offline Journal), ADR 0013 (Stage 3E Management & HQ), ADR 0014 (Stage 3F Staging), ADR 0015 (Supabase Dev SSoT), ADR 0016 (Admin Governance & Camera Flip)

---

## 1. Context & Operational Review Feedback

During real-world manual walkthroughs of the Country Sales Head review & approval workflows and field salesperson interfaces, four distinct operational areas required critical alignment:

1. **Client Visit Verification & Business Card Image Signed URLs:**
   - When Country Sales Head inspected visits in `ClientVisitVerification`, the business card section was stuck on `"Generating secure temporary preview link..."` or failed to load.
   - Investigation revealed `managementService.getBusinessCardSignedUrl` was querying storage bucket `'visit-business-cards'`, whereas Migration 00012 created the bucket as `'business-cards'`. Supabase returned `Object not found`.
   - Furthermore, `ClientVisitVerification` lacked user and date filters, pagination, and resilience against distance trigger rejections.

2. **Non-Visit Working Day Governance & Attendance Reconciliation:**
   - Salespeople only had an ephemeral modal and an un-dismissible banner on Home with no request history or cancel option.
   - Approved non-visit workdays (`approved_absences`) did not appear in the Country Sales Head `Team Attendance` table because `attendanceService.getMarketAttendance` only read `public.attendance_days`.
   - The "Visits Logged" column in the team attendance table did not reflect completed visits.

3. **Exception Creation & Manager Review Bidirectional Sync:**
   - Salesperson bottom nav badge on the exception icon did not match real pending review counts.
   - Approval/rejection decisions made by the Country Sales Head on `ExceptionReviewWorkbench` did not update on the salesperson screen without manual hard reloads.
   - `ExceptionReviewWorkbench` lacked user and date filters and pagination controls.

4. **Client Registration, Live Viewfinder & Canonical Pin Approval:**
   - Newly registered clients assigned to new organizations were defaulting to an existing company name due to an RLS fallback in `visitService.ts`.
   - Salesperson client list did not reflect `"Pending Manager Approval"` state, and live premises photos did not display in the manager's review modal.
   - Two redundant screens existed for client location/GPS reviews.

---

## 2. Decision & Architectural Implementations

### Decision 1: Storage Bucket Alignment & Resilient Signed URL Generation
- Corrected bucket target in `src/services/managementService.ts` to canonical `'business-cards'`.
- Implemented path prefix normalization to safely handle paths with or without `business-cards/` or legacy prefixes.
- Added explicit `isCardLoading`, `cardLoadError`, and user-facing `Retry` buttons in `ClientVisitVerification.tsx`.
- Added user filtering, date filtering, and configurable pagination (5, 10, 20, 50 rows) to `ClientVisitVerification.tsx`.

### Decision 2: Dedicated Non-Visit Workday Management & Attendance Merging
- Created [`src/features/field/NonVisitDaysView.tsx`](file:///c:/Projects/CARBON/carbonSalesTracker/src/features/field/NonVisitDaysView.tsx) providing a full-featured screen with status tabs (**All**, **Pending**, **Approved**, **Rejected**), request counters, submission history, and `+ New Request` trigger.
- Added `cancelAbsenceRequest` in `attendanceService.ts` and `cancelNonVisitDayRequest` in `FieldSessionContext.tsx`.
- Updated Home banner to be dismissible (`[✕]`), display a direct `Cancel Request` button for pending requests, and link directly to the dedicated screen.
- Enhanced `attendanceService.getMarketAttendance` to perform a union join of `public.attendance_days` and `public.approved_absences`, correctly labeling approved non-visit days in the manager's team table.
- Calculated live completed visit counts in the `Team Attendance` review table per salesperson.

### Decision 3: Exception Workbench Filters, Accurate Badges & Bidirectional Sync
- Added user filter, date filter, and configurable pagination (5 default; 10, 20, 50) to `ExceptionReviewWorkbench.tsx`.
- Corrected bottom nav badge in `MobileBottomNav.tsx` to reflect active pending review exceptions.
- Exposed `refreshExceptions()` in `FieldSessionContext.tsx` with lifecycle hooks on mount and post-submission to ensure instant status reconciliation upon manager approval or rejection.

### Decision 4: Client Registration Integrity, Live Camera Flip & Real-time Pin Sync
- Added dual camera support (front/rear flip) with canvas snapshot capture in `RegisterBranchModal.tsx`.
- Replaced the fallback in `visitService.ts` with market-scoped custodian organization provisioning, guaranteeing new organizations retain their authentic name.
- Included `operating_status` in `visitService.getClientsAndBranches`, rendering amber `"Pending Manager Approval"` badges and disabling visit selection until approved.
- Consolidated GPS pin review onto `BranchApprovalsQueue.tsx` with user/date filtering, request timestamps, pagination, and premises photo preview, deprecating the redundant screen.
- Added 6-second polling and window focus event listeners in `ClientsDirectoryView.tsx` for real-time bidirectional status updates.

---

## 3. PRD & Security Governance Compliance

1. **Company Device & Salesperson Authoring (PRD §2):**
   - Salespeople remain the sole authors of visit records, exception submissions, and non-visit requests. Managers only review and approve/reject with mandatory audit comments.
2. **PostGIS Geofencing (PRD §7.1, §8.4):**
   - Database trigger `trg_validate_visit_location_verification` remains authoritative. Unverified fallbacks preserve salesperson field flow without spoofing verified status.
3. **Strict MVP Exclusions (PRD §12):**
   - Zero commercial pipeline, quotation, invoicing, or task management artifacts were introduced. Next steps remain free text only.

---

## 4. Verification & Validation Results

1. **Static Analysis & Type Checking:**
   - `npx tsc --noEmit` passed with 0 errors.
2. **Vitest Unit & Integration Suite:**
   - 199 / 199 tests passed across 14 test suites.
3. **Automated Playwright E2E Suite:**
   - Verified non-visit request creation, cancellation, and team attendance table display.
   - Verified exception submission, filtering, pagination, manager approval, and salesperson status update.
   - Verified client registration with live camera, pin approval, and real-time directory refresh.
   - Verified business card image rendering from private signed URL in the inspection modal (`fix_round4_sales_head_business_card_inspection.png`).
