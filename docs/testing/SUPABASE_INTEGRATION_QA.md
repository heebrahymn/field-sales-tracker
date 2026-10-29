# Carbon Field Sales Tracker — Supabase SSoT Integration QA Report

**Test Execution Date:** 2026-10-29  
**Execution Environment:** Localhost (`http://localhost:5173`)  
**Connected Database:** Hosted Supabase Project `[SUPABASE_PROJECT_ID].supabase.co`  
**Vitest Suite Status:** 197 / 197 Passed across 14 Test Files  
**TypeScript Build Status:** 0 Errors (`tsc -b && vite build` passed in 12.65s)  
**Browser Automation:** Playwright Chromium 1440x900  

---

## 1. Automated Test Results

### 1.1 Vitest Unit & Integration Suites
```
Test Files  14 passed (14)
Tests       197 passed (197)
Duration    18.51s
```
- `src/test/brand-logo.test.tsx` (2 tests) — PASS
- `src/test/at15-exclusions.test.tsx` (2 tests) — PASS
- `src/test/status-badge.test.tsx` (4 tests) — PASS
- `src/test/stage-1d-hq-admin.test.tsx` (26 tests) — PASS
- `src/test/pre-stage-3-corrections.test.tsx` (9 tests) — PASS
- `src/test/salesperson-context.test.tsx` (5 tests) — PASS
- `src/test/stage-1e-cross-role-integration.test.tsx` (8 tests) — PASS
- `src/test/stage-1c-manager-dashboard.test.tsx` (18 tests) — PASS
- `src/test/stage-3c-client-visits.test.tsx` (19 tests) — PASS
- `src/test/stage-3a-auth.test.tsx` (16 tests) — PASS
- `src/test/stage-3b-attendance.test.tsx` (26 tests) — PASS
- `src/test/stage-3d-offline-sync.test.tsx` (26 tests) — PASS
- `src/test/stage-3e-manager-hq.test.tsx` (26 tests) — PASS
- `src/test/app-shell.test.tsx` (1 test) — PASS

### 1.2 TypeScript Compilation & Production Build
```
vite v6.4.4 building for production...
✓ 2042 modules transformed.
dist/index.html                                                0.79 kB
dist/assets/index-CThKo3qz.css                                83.31 kB │ gzip:  16.85 kB
dist/assets/index-CJnTFpqn.js                              1,399.60 kB │ gzip: 335.72 kB
✓ built in 12.65s
```

---

## 2. Browser E2E Verification: HQ Device Custodian Dropdown Fix

### 2.1 Test Script Execution (`scripts/verify_ng_salespeople_dropdown.py`)
1. Navigated to `http://localhost:5173`.
2. Authenticated as HQ Admin (`hq.admin@carboncarcare.com`).
3. Verified top banner indicator: `Supabase Dev SSoT` and `Connected to Live Supabase DB: [SUPABASE_PROJECT_ID]`.
4. Navigated to **Company Devices & MDM**.
5. Located available Nigerian handset `CAR-DIFF-933111` and opened **Assign Handset to Salesperson** modal.
6. Inspected `#salespersonCustodianSelect` options:
   - **Total Options:** 22
   - **Obsolete Mock Codes (`USR-NG-002`, `USR-NG-006`):** 0 (Completely eliminated)
   - **Live Salespeople Present:** `bayo Ayodele`, `Tunde Adebayo`, `Amina Bello`, `Chukwudi Okafor`, `Ibrahim Babangida (7378)`, `Ibrahim Babangida (7477)`, `Ibrahim Babangida (7542)`, etc.
7. Selected `Amina Bello (amina.bello@carboncarcare.com) ✓ Unassigned`.
8. Submitted handover. Handset updated immediately in the table with `Amina Bello` as assigned custodian and status `Active in Field`.

### 2.2 Photographic Evidence Captured
- `local_ssot_02_hq_dashboard.png`: HQ Dashboard showing live database metrics and SSoT banner.
- `ng_filtered_devices.png`: Fleet table filtered to Nigeria hub assets.
- `ng_assign_modal_open.png`: Assign Handset modal displaying asset metadata.
- `ng_custodian_dropdown_options.png`: Custodian dropdown displaying 22 live Supabase representatives.
- `ng_custodian_selected_filled.png`: Selection of `Amina Bello` with deployment notes.
- `ng_device_assigned_table_updated.png`: Live table showing `Amina Bello` as assigned custodian.

---

## 3. Deployment Constraint Compliance

> **CRITICAL COMPLIANCE NOTICE:**
> In accordance with user instructions ("DO NOT PUSH TO GITHUB OR DEPLOY TO VERCEL UNTIL I HAVE MANUALLY REVIEWED AND APPROVED THE CHANGES LOCALLY"), all modifications remain strictly local on branch `main`. Zero git commits have been pushed and zero Vercel deployments have been triggered.

