# Stage 3E Implementation Specification: Management Console, Country Sales Head & HQ Administration Integration

**Document type:** Technical Implementation Specification & Architecture Baseline  
**Project:** Carbon Field Sales Tracker  
**Business:** Carbon Car Care  
**Milestone:** Stage 3E (Real Country Sales Head & HQ Administration Integration)  
**Status:** Completed & Verified (187/187 Vitest Tests incl. 17 Stage 3E Integration Tests + Complete Live Supabase Integrity Suite + 15 Multi-Viewport Browser Screenshots)  
**Date:** October 28, 2026  
**Reference:** PRD v1.2 (MVP Updated) §3, §4.2, §6.2, §6.5, §7.1, §7.3, §7.5, §8.1, §8.2, §8.3, §10; Acceptance Tests AT-06, AT-07, AT-08, AT-09, AT-10, AT-13, AT-14, AT-15; ADR 0013  

---

## 1. Objectives & Scope

Stage 3E connects the management console for **Country Sales Heads** (`country_sales_head`) and **HQ Enterprise Administrators** (`hq_admin`) to real Supabase tables, RPC functions, PostgreSQL Row-Level Security (RLS) policies, and private Storage buckets.

The implementation preserves the non-negotiable architectural invariants:
1. **Managerial Non-Origination:** Country Sales Heads and HQ Administrators have review, audit, and administrative privileges only. They **never** originate salesperson attendance, GPS check-in/out fixes, premises photos, or meeting logs.
2. **Location Unverified Invariant on Exceptions (AT-06):** Approved missing-GPS, camera-defect, or device-depletion visit exceptions remain `manager_approved_unverified`. They are never converted into GPS/location verified.
3. **Zero Bottleneck Company Device Replacement (PRD §6.5):** Field salespeople submit device replacement requests directly to HQ Admin (`Profile → My Device → Report Device Issue`). Country Sales Heads have zero approval or submission role.
4. **Authorised Country CSV Exports (PRD §10):** Formula injection protection (CWE-1236) sanitizes cells beginning with `=, +, -, @, \t, \r`, and each export is logged into `public.export_jobs`.
5. **Client Master ERP Batch Ingestion (PRD §4.2 / AT-08):** Ingests parent organizations and branch locations, allows shared company phone numbers across different branches of the same client, marks branches without GPS coordinates as `location_pending`, and logs batches to `public.import_batches`.

---

## 2. Service Layer Architecture

### 2.1 Management Service (`src/services/managementService.ts`)
Provides market-scoped operational workflows for Country Sales Heads:
- `getCountryTeamAttendance(marketCode, date)`: Fetches attendance days for the market, mapping start/end GPS, selfie URL, status, and duration.
- `recordApprovedLeave(userId, date, category, justification)`: Invokes RPC `record_approved_leave` to record authorized administrative absence.
- `getCountryVisits(marketCode, options)`: Fetches completed and open visits for the country, joining `branches`, `organisations`, `meeting_logs`, `client_audit_records`, and PostGIS geofence metrics.
- `getPremisesPhotoSignedUrl(storagePath)` / `getBusinessCardSignedUrl(storagePath)`: Generates signed temporary URLs (60-minute expiry) for private evidence inspection.
- `getBranchLocationPins(marketCode)`: Retrieves active and pending GPS pin proposals with coordinates, accuracy, and premises evidence photo.
- `approveBranchLocationPin(pinId, reason)`: Invokes RPC `approve_branch_location_pin(p_pin_id, p_reason)`. Mandatory reason required.
- `rejectBranchLocationPin(pinId, reason)`: Invokes RPC `reject_branch_location_pin(p_pin_id, p_reason)`. Mandatory reason required.
- `proposeBranchLocationPin(params)`: Invokes RPC `propose_branch_location_pin`.
- `getCountryExceptions(marketCode)`: Retrieves salesperson-authored exception logs (`gps_failure`, `camera_defect`, `device_depletion`, `missed_visit`, `non_visit_day`).
- `reviewSalespersonException(exceptionId, status, reason)`: Invokes RPC `review_salesperson_exception(p_exception_id, p_status, p_reason)`. Enforces mandatory rationale.
- `getCountryVerificationFlags(marketCode)`: Retrieves automated behavioral risk flags (`short_visit`, `outside_geofence_checkout`, `implausible_travel`, `audit_dispute`, etc.).
- `reviewVerificationFlag(flagId, status, reviewNotes)`: Updates verification flags with reviewer rationale.
- `getClientAuditRecords(marketCode)`: Retrieves 5% random sampling queue and call history.
- `sampleWeeklyVisitsForAudit(marketCode, sampleRate = 0.05)`: Samples 5% of completed, un-audited visits and enqueues them in `client_audit_records`.
- `recordClientAuditCall(params)`: Invokes RPC `record_client_audit_call`. If the client denies the visit, dispute status transitions to `under_investigation` and an `audit_dispute` flag is automatically raised.
- `resolveClientAuditDispute(params)`: Invokes RPC `resolve_client_audit_dispute(p_audit_record_id, p_decision, p_mandatory_reason)`.
- `exportCountryVisitsCsv(marketCode, userUuid)`: Fetches all visits for the market, applies CWE-1236 cell sanitization, logs the export to `public.export_jobs`, and triggers CSV download.
- `sanitizeCsvCell(val)`: Sanitizes leading characters (`=`, `+`, `-`, `@`, `\t`, `\r`) by prepending `'`.

### 2.2 HQ Admin Service (`src/services/adminService.ts`)
Provides cross-market enterprise management:
- `getHqOperationsOverview()`: Fetches cross-market rollups across Nigeria, Zambia, and Malawi.
- `getHqUsers()`: Retrieves all system profiles, roles, assigned markets, and device custody bindings via disambiguated relation `device_assignments!device_assignments_salesperson_id_fkey`.
- `provisionUser(payload)`: Provisions new employee accounts in Supabase GoTrue Auth and PostgreSQL `public.profiles` via server-side Edge Function `admin-provision-user`.
- `updateUserProfile(userId, updates)`: Updates user role, market, phone, or active status.
- `getHqDevices()`: Retrieves company-issued device fleet inventory, Knox MDM compliance, and assignments.
- `registerDevice(deviceData)`: Enrolls new company hardware in central depot pool.
- `assignDevice(deviceId, salespersonId, reason)`: Assigns device custody; preserves `uq_single_active_device_per_rep`.
- `getHqDeviceReplacements()`: Retrieves direct-to-HQ salesperson device replacement requests.
- `reviewDeviceReplacement(replacementId, status, reason)`: Invokes RPC `hq_review_device_replacement`.
- `dispatchReplacementDevice(replacementId, replacementDeviceId, courierTrackingRef, dispatchNotes)`: Invokes RPC `hq_dispatch_replacement_device`.
- `confirmReplacementActivation(replacementId, oldDeviceDisposition)`: Invokes RPC `hq_confirm_replacement_activation`. Deactivates old handset, activates replacement, and records old device disposition.
- `getMarketRules()` / `updateMarketRule(ruleId, updates)`: Manages national operating parameters (geofence radius, pin accuracy threshold, working hours).
- `getSystemAuditLogs()`: Retrieves immutable cryptographic ledger of administrative and compliance actions.
- `processClientMasterImport(fileContent, fileName, marketCode, userId)`: Validates ERP CSV data, creates parent organisations, inserts branches (`location_pending = true` for unpinned entries), and logs batch to `public.import_batches`.

---

## 3. User Interface Components

| Component | Role | Real Service Integration | Features |
|---|---|---|---|
| `SalesHeadDashboardPreview.tsx` | CSH | `managementService` | Country operations overview, daily/weekly/quarterly summaries, SLA tracking, direct modal triggers |
| `BranchApprovalsQueue.tsx` | CSH | `managementService.getBranchLocationPins`, `approveBranchLocationPin`, `rejectBranchLocationPin` | Coordinates preview, accuracy check ($\le 50\text{m}$), premises photo inspection, shared phone rule callout |
| `ExceptionReviewWorkbench.tsx` | CSH | `managementService.getCountryExceptions`, `reviewSalespersonException` | Salesperson-authored exceptions, mandatory rationale modal, "Manager Approved — Location Unverified" guarantee |
| `ClientVisitVerification.tsx` | CSH | `managementService.getCountryVisits`, `getPremisesPhotoSignedUrl` | PostGIS distance check, signed private premises photos, meeting log details, geofence radius limit |
| `RiskFlagsWorkbench.tsx` | CSH | `managementService.getCountryVerificationFlags`, `reviewVerificationFlag` | Investigatory signals, severity badges, review notes submission |
| `ClientAuditWorkbench.tsx` | CSH | `managementService.getClientAuditRecords`, `recordClientAuditCall`, `resolveClientAuditDispute`, `sampleWeeklyVisitsForAudit` | Weekly 5% random sampling, call logging, client denial dispute trigger, secondary witness inquiry resolution |
| `CountryCsvExportModal.tsx` | CSH | `managementService.exportCountryVisitsCsv` | Date range filter, row count preview, CWE-1236 injection protection notice, audit logging to `export_jobs` |
| `TeamAttendanceReview.tsx` | CSH | `managementService.getCountryTeamAttendance`, `recordApprovedLeave` | Team daily attendance, start/end GPS fixes, signed selfie inspection, administrative leave booking |
| `HqOperationsDashboard.tsx` | HQ Admin | `adminService.getHqOperationsOverview` | Cross-market rollups (`NG`, `ZM`, `MW`), attendance rates, verified visits, active exceptions, pending approvals |
| `HqUserManagement.tsx` | HQ Admin | `adminService.getHqUsers`, `adminService.updateUserProfile` | User directory, role provisioning, market assignment, active status toggle |
| `HqDeviceManagement.tsx` | HQ Admin | `adminService.getHqDevices`, `adminService.getHqDeviceReplacements`, `dispatchReplacementDevice`, `confirmReplacementActivation` | Device fleet inventory, Zero Bottleneck salesperson replacement queue, courier dispatch, Knox activation |
| `HqMarketConfiguration.tsx` | HQ Admin | `adminService.getMarketRules`, `adminService.updateMarketRule` | Market parameters (geofence radius 200m, pin accuracy 50m, sync delay threshold, working hours) |
| `HqSystemAuditLog.tsx` | HQ Admin | `adminService.getSystemAuditLogs` | Enterprise immutable audit trail, actor tracking, entity mutations |
| `HqClientMasterImport.tsx` | HQ Admin | `adminService.processClientMasterImport` | ERP CSV ingestion, shared telephone support, unpinned branches marked `location_pending`, batch history |

---

## 4. Database Integrity & RPC Invariants

1. **RPC `approve_branch_location_pin`:**
   - Parameter signature: `(p_pin_id UUID, p_reason TEXT)`.
   - Security: `SECURITY DEFINER SET search_path = public, extensions`. Enforces `is_hq() OR auth_role() = 'country_sales_head'`.
   - Action: Deactivates older active pins for the branch, sets proposal `is_active = true`, logs review reason in `branch_pin_history`.
2. **RPC `reject_branch_location_pin`:**
   - Parameter signature: `(p_pin_id UUID, p_reason TEXT)`.
   - Action: Sets proposal `is_active = false`, records rejection notes.
3. **RPC `review_salesperson_exception`:**
   - Parameter signature: `(p_exception_id UUID, p_status public.exception_status, p_reason TEXT)`.
   - Action: When approved, updates linked visit to `verification_status = 'manager_approved_unverified'`.
4. **RPC `record_client_audit_call`:**
   - Parameter signature: `(p_audit_record_id UUID, p_call_result TEXT, p_notes TEXT, p_outcome TEXT, p_contact_person TEXT, p_telephone TEXT)`.
   - Disambiguation: Passing explicit nulls for optional arguments ensures PostgREST unambiguously resolves Function 2.
   - Action: When `p_call_result = 'reached_denied'`, sets `dispute_status = 'under_investigation'` and raises verification flag `audit_dispute`.
5. **RPC `resolve_client_audit_dispute`:**
   - Parameter signature: `(p_audit_record_id UUID, p_decision TEXT, p_mandatory_reason TEXT)`.
   - Action: Resolves dispute as `rep_substantiated` (cleared) or `confirmed_violation` (escalated).
6. **Zero Bottleneck Device Replacement RPCs:**
   - `hq_review_device_replacement(p_replacement_id UUID, p_status TEXT, p_reason TEXT)`.
   - `hq_dispatch_replacement_device(p_replacement_id UUID, p_replacement_device_id UUID, p_courier_tracking_ref TEXT, p_dispatch_notes TEXT)`.
   - `hq_confirm_replacement_activation(p_replacement_id UUID, p_old_device_disposition TEXT)`.
   - Security: Strictly restricted via `IF NOT public.is_hq() THEN RAISE EXCEPTION 'Zero Bottleneck Violation'`. Country Sales Heads are blocked from approving.
   - Invariant: Deactivates previous device assignment before inserting new active assignment to preserve `uq_single_active_device_per_rep`.

