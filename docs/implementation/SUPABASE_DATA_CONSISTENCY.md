# Carbon Field Sales Tracker — Supabase SSoT & Data Consistency Architecture

**Document Type:** Architecture & Implementation Specification  
**Project:** Carbon Field Sales Tracker  
**Milestone:** Post-Stage 3F / Single Source of Truth Enforcement  
**SSoT Database:** Supabase Development (`https://[SUPABASE_PROJECT_ID].supabase.co`)  
**Status:** Completed & Locally Verified  

---

## 1. Overview & Purpose

This document details the architectural refactoring undertaken to establish the hosted Supabase DEVELOPMENT project as the authoritative Single Source of Truth (SSoT) for all operational, management, and audit data, completely eliminating frontend mock data arrays and artificial metric floors.

---

## 2. Refactored Services & Components

### 2.1 Backend Services (`src/services/`)
- **`src/services/adminService.ts`:**
  - Added `getClientImportBatches()`: Queries `public.import_batches` joined with `profiles` to list ERP imports.
  - Updated `getHqDashboardOverview()`: Eliminated `Math.max(reps.length, ...)` artificial minimums. `totalSalespeople` derives 100% from active profiles in `public.profiles`.
- **`src/services/managementService.ts`:**
  - Added `getMarketSalespeople(marketCode)`: Queries `public.profiles` filtered by `role = 'salesperson'` and market code.
  - Added `getCountryPendingPins(marketCode)`: Queries `public.branch_location_pins` filtered by `status = 'pending_approval'` and market code.
  - Exported `type RealBranchPinRecord = RealBranchPinProposal` for unified typing across review queues.
- **`src/services/visitService.ts`:**
  - Added `registerClientBranch(...)`: Inserts new organization/branch and proposes initial GPS pin.
  - Added `submitSalespersonException(...)`: Inserts salesperson exception log with audit trail.
- **`src/lib/supabase.ts`:**
  - Added fallback check to `VITE_SUPABASE_ANON_KEY` if `VITE_SUPABASE_PUBLISHABLE_KEY` is not defined in environment variables.

### 2.2 Global State Providers (`src/context/`)
- **`src/context/DeviceReplacementContext.tsx`:**
  - Removed 700+ lines of hardcoded mock devices (`INITIAL_COMPANY_DEVICES`) and mock replacement tickets (`INITIAL_REQUESTS`).
  - Added `refreshDevices()` and `refreshRequests()` methods.
  - Connected `assignDevice`, `reassignDevice`, and `registerDevice` to invoke Supabase RPCs / table updates.
- **`src/context/FieldSessionContext.tsx`:**
  - Converted `completedVisits`, `branches`, `exceptions`, and `syncQueue` initial states to empty arrays `[]` in browser runtime.
  - Connected `refreshExceptions` and `submitSalespersonException` to live Supabase endpoints.

### 2.3 HQ Administration Features (`src/features/admin/`)
- **`src/features/admin/HqDeviceManagement.tsx`:**
  - Eliminated `FIELD_SALESPEOPLE` (hardcoded 5 mock reps).
  - Replaced with `liveSalespeople` loaded from `adminService.getHqUsers()`.
  - Updated `#salespersonCustodianSelect` to display all active market salespeople with accurate `hasActiveHandset` indicators.
- **`src/features/admin/HqUserManagement.tsx`:**
  - Removed `INITIAL_MOCK_USERS` (200+ lines of mock user objects).
  - Initialises to `[]` when `!isTestEnv` and loads 100% from `adminService.getHqUsers()`.
- **`src/features/admin/HqOperationsDashboard.tsx`:**
  - Removed artificial metric minimums (`Math.max(..., 34/18/11/4/2)`). All cards reflect actual database rows.
- **`src/features/admin/HqClientMasterImport.tsx`:**
  - Replaced static batch list with live query to `adminService.getClientImportBatches()`.
- **`src/features/admin/HqExceptionOversight.tsx`:**
  - Replaced `INITIAL_HQ_EXCEPTIONS` with live query to `managementService.getCountryExceptions('ALL')`.
- **`src/features/admin/HqSystemAuditLog.tsx`:**
  - Eliminated mock log merger; returns live immutable ledger records from `adminService.getSystemAuditLogs()`.
- **`src/features/admin/HqReportingExport.tsx`:**
  - Initialises export history to empty array `[]` in browser runtime.

### 2.4 Management & Review Features (`src/features/review/`)
- **`src/features/review/CountryReportingView.tsx`:**
  - Dynamic calculations derived from `managementService.getCountryVisits()` and `managementService.getMarketSalespeople()`.
- **`src/features/review/SalesHeadDashboardPreview.tsx`:**
  - Connected to live country queries for visits, pending pins, exceptions, flags, and salespeople.
- **`src/features/review/BranchApprovalsQueue.tsx`:**
  - Loads 100% from `managementService.getBranchLocationPins()`.
- **`src/features/review/TeamAttendanceReview.tsx`:**
  - Loads 100% from `attendanceService.getMarketAttendance()`.

### 2.5 Feedback & Indicators (`src/components/feedback/`)
- **`src/components/feedback/DemoDataBanner.tsx`:**
  - Replaced obsolete "Demo Field Data" with "Supabase Dev SSoT".
  - States: `Connected to Live Supabase DB: [SUPABASE_PROJECT_ID] (Single Source of Truth)`.

---

## 3. Data Integrity & Verification Summary

| Component / Workflow | Previous State | SSoT Refactored State | Verification Method |
|---|---|---|---|
| **HQ Handset Assign Custodian** | Hardcoded 5 mock reps (`USR-NG-002`, etc.) | 22 live Supabase reps dynamically loaded | Playwright E2E (`verify_ng_salespeople_dropdown.py`) |
| **HQ User Management** | 8 hardcoded mock users | 30 live authenticated profiles | Vitest + Browser E2E |
| **HQ Fleet Inventory** | Static React state array | Real `public.devices` joined with assignments | Playwright E2E Handover |
| **HQ Operations Overview** | Artificial `Math.max()` minimums | 100% live PostGIS & attendance aggregates | Live SQL & Browser Inspection |
| **Country Sales Head Review** | Mixed mock & live fallback | Live country-isolated database records | 197/197 Vitest pass |

