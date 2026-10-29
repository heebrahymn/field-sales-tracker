# ADR 0015: Supabase Development Project as Single Source of Truth & Frontend Mock Elimination

**Status:** Approved & Implemented  
**Date:** 2026-10-29  
**Deciders:** Core Engineering Team, Project Lead  
**Scope:** All Salesperson, Country Sales Head, and HQ Administrator modules  
**Database Project:** `[SUPABASE_PROJECT_ID].supabase.co` (Hosted Supabase Development)

---

## 1. Context and Problem Statement

Following Stage 3A–3F milestones, user acceptance testing uncovered inconsistencies between hardcoded frontend demonstration arrays and real database records:
1. **Device Custodian Dropdown Disconnect:** The Assign Handset modal in HQ Device Management displayed a hardcoded list of 5 mock salespeople (`FIELD_SALESPEOPLE`), preventing newly provisioned Supabase salespeople from appearing in the custodian assignment list.
2. **Artificial Metric Floors:** HQ Operations and Management dashboards used `Math.max(reps.length, ...)` artificial minimums, misrepresenting real team attendance and location counts.
3. **Simulated State in Local Contexts:** `DeviceReplacementContext.tsx`, `HqUserManagement.tsx`, `HqClientMasterImport.tsx`, and `HqExceptionOversight.tsx` contained static initial arrays that obscured live Supabase persistence.

To establish enterprise integrity and guarantee that what users see in testing reflects actual database state, a strict architectural standard is required: **Supabase DEVELOPMENT is the authoritative Single Source of Truth (SSoT) for all operational, management, and audit data.**

---

## 2. Decision Drivers

1. **Enterprise Data Consistency:** Salespeople, company devices, branches, visits, attendance records, exceptions, flags, and import batches must persist to and hydrate from Supabase PostgreSQL tables.
2. **Zero Mock Fallbacks in Live Runtime:** In browser execution (`process.env.NODE_ENV !== 'test'`), UI components must not fall back to mock data arrays or merge fictitious records.
3. **Test Suite Stability:** In-memory Vitest unit and integration suites must continue to pass (197/197 passing) using isolated test harnesses or mocked responses.
4. **Local-First Verification:** Changes must be verified locally at `http://localhost:5173` without unreviewed GitHub pushes or Vercel production deployments.

---

## 3. Architecture & Implementation

### 3.1 Live Database Seeding
A deterministic multi-market seeding script (`scripts/seed_development_test_data.ts`) was executed against Supabase project `[SUPABASE_PROJECT_ID]`:
- **Users:** 11 canonical profiles (1 HQ Admin, 3 Country Sales Heads, 7 Field Salespeople across Nigeria, Zambia, and Malawi).
- **Devices:** 10 company devices (Samsung Galaxy A15 & XCover 6 Pro) with real hardware bindings.
- **Client Organizations & Branches:** 6 organisations and 10 branches with PostGIS coordinates and approved GPS pins.
- **Attendance & Visits:** Real attendance days, location-verified visits, meeting logs, and premises photos.
- **Exceptions & Governance:** Pending and reviewed missed-visit exceptions, verification flags, client audit calls, and replacement requests.

### 3.2 Elimination of Mock Constants & Fallback Mergers
1. **`src/features/admin/HqDeviceManagement.tsx`:**
   - Removed `FIELD_SALESPEOPLE` (hardcoded 5 mock reps).
   - Replaced with `liveSalespeople` dynamically fetched from `adminService.getHqUsers()`.
   - Filtered by target device `marketCode` to enforce cross-market sandboxing.
   - Connected `assignDevice`, `reassignDevice`, and `registerDevice` to real database persistence.
2. **`src/context/DeviceReplacementContext.tsx`:**
   - Eliminated `INITIAL_COMPANY_DEVICES` (600+ lines of mock devices) and `INITIAL_REQUESTS`.
   - Hydrates asynchronously from `adminService.getHqDevices()` and `adminService.getHqDeviceReplacements()`.
3. **`src/features/admin/HqUserManagement.tsx`:**
   - Removed `INITIAL_MOCK_USERS` (200+ lines). Initialises to `[]` when not in unit test mode and loads strictly from Supabase via `adminService.getHqUsers()`.
4. **`src/features/admin/HqOperationsDashboard.tsx`:**
   - Eliminated artificial `Math.max()` metric floors. Dashboard cards derive 100% from live Supabase counts.
5. **`src/features/admin/HqClientMasterImport.tsx`:**
   - Removed hardcoded import batches. Hydrates live from `adminService.getClientImportBatches()`.
6. **`src/features/admin/HqExceptionOversight.tsx`:**
   - Removed `INITIAL_HQ_EXCEPTIONS`. Hydrates directly from `managementService.getCountryExceptions('ALL')`.
7. **`src/features/review/CountryReportingView.tsx`:**
   - Dynamic calculations derived from `managementService.getCountryVisits()` and `managementService.getMarketSalespeople()`.
8. **`src/components/feedback/DemoDataBanner.tsx`:**
   - Displays `Supabase Dev SSoT` badge and explicitly states connection to database `[SUPABASE_PROJECT_ID]`.

---

## 4. Consequences & Verification

- **Positive:**
  - Salespeople provisioned via HQ Admin appear immediately in the Assign Handset dropdown.
  - Device assignments update the Supabase database and persist across page refreshes.
  - Zero discrepancies between user actions and database records.
  - 197/197 Vitest tests pass across all 14 test suites.
  - Production build (`npm run build`) compiles cleanly in 12.65 seconds.
  - Browser E2E verification proves dynamic 22-rep dropdown on port 5173.
- **Negative / Trade-offs:**
  - Requires active network connectivity to the Supabase development project during local runtime.
  - Asynchronous hydration requires proper loading states and skeletons (fully implemented).

