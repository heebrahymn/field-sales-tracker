# Stage 3E QA & Verification Report: Management Console, Country Sales Head & HQ Administration Integration

**Document type:** QA, Security & Architecture Verification Report  
**Project:** Carbon Field Sales Tracker  
**Business:** Carbon Car Care  
**Milestone:** Stage 3E (Real Country Sales Head & HQ Administration Integration)  
**Status:** Passed (14/14 Vitest Suites, 190/190 Automated Tests incl. 20 Stage 3E Integration Tests + Complete Live Supabase Dev Project Suite + 15 Multi-Viewport Browser Screenshots)  
**Date:** October 28, 2026  
**Reference:** PRD v1.2 (MVP Updated) §3, §4.2, §6.2, §6.5, §7.1, §7.3, §7.5, §8.1, §8.2, §8.3, §10; Acceptance Tests AT-06, AT-07, AT-08, AT-09, AT-10, AT-13, AT-14, AT-15; ADR 0013  

---

## 1. Executive Summary

Stage 3E connects the management console for **Country Sales Heads** and **HQ Enterprise Administrators** to real Supabase tables, views, stored procedures (RPCs), private private Storage buckets, and PostgreSQL Row-Level Security (RLS) policies.

All **20 Stage 3E integration tests** (`src/test/stage-3e-manager-hq.test.tsx`), all **13 prior regression test suites** (`190/190` total Vitest tests), TypeScript strict compilation (`npx tsc --noEmit`), ESLint (`npm run lint`), production build (`npm run build`), the live Supabase database integrity and RPC verification suite (`scripts/test_stage_3e_db_integrity.py`), the Edge Function test suite (`scripts/test_provision_user_edge_function.py`), and the multi-viewport browser suite (`scripts/verify_stage_3e_browser.py`) passed with zero errors.

---

## 2. Automated Vitest Integration Tests (`src/test/stage-3e-manager-hq.test.tsx`)

| # | Test Scenario | Requirement & Verification Focus | Result |
|---|---|---|---|
| **01** | Approves branch GPS pin proposal via RPC | Invokes `approve_branch_location_pin(p_pin_id, p_reason)` with pin ID and mandatory review reason | **PASS** |
| **02** | Rejects pin approval without mandatory reason | Verifies client-side validation guard throws `Review reason is required to approve or reject a branch pin` | **PASS** |
| **03** | Rejects branch GPS pin proposal via RPC | Invokes `reject_branch_location_pin(p_pin_id, p_reason)` with pin ID and mandatory rejection rationale | **PASS** |
| **04** | Proposes branch location pin from field | Invokes `propose_branch_location_pin` with coordinates, reported accuracy, and premises photo URL | **PASS** |
| **05** | Exception adjudication preserves Location Unverified Invariant (AT-06) | Invokes `review_salesperson_exception(p_exception_id, p_status, p_reason)`. Confirms status is `manager_approved_unverified` and **never** `location_verified` | **PASS** |
| **06** | Requires mandatory rationale when adjudicating exceptions | Verifies guard blocks empty reasons when rejecting or escalating exceptions | **PASS** |
| **07** | Zero Bottleneck: HQ Admin approves replacement directly | Calls `hq_review_device_replacement(p_replacement_id, p_status, p_reason)` directly; bypasses Country Sales Head | **PASS** |
| **08** | Zero Bottleneck: HQ Admin dispatches spare device | Calls `hq_dispatch_replacement_device` with tracking reference and central spare depot device ID | **PASS** |
| **09** | Zero Bottleneck: HQ Admin confirms Knox MDM activation | Calls `hq_confirm_replacement_activation`, deactivates old device custody, activates replacement, and records old handset disposition | **PASS** |
| **10** | 5% random audit call sampling (PRD §8.3 / AT-09) | Samples exactly 5% of completed, un-audited visits in the market and inserts rows into `client_audit_records` | **PASS** |
| **11** | Records client meeting audit call outcome | Calls `record_client_audit_call` with `reached_confirmed` and notes | **PASS** |
| **12** | Client denial triggers dispute and raises verification flag | Calls `record_client_audit_call` with `reached_denied`; verifies dispute status transitions to `under_investigation` and raises flag `audit_dispute` | **PASS** |
| **13** | Resolves audit dispute with inquiry findings | Calls `resolve_client_audit_dispute(p_audit_record_id, p_decision, p_mandatory_reason)` with `rep_substantiated` vs `confirmed_violation` | **PASS** |
| **14** | CWE-1236 spreadsheet formula injection mitigation | Sanitizes formula prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`) by prepending `'` in `sanitizeCsvCell` | **PASS** |
| **15** | CountryCsvExportModal renders with CWE-1236 notice | Renders modal, displays injection protection notice, triggers export, and logs audit record into `public.export_jobs` | **PASS** |
| **16** | Shared company telephone permitted across branches (PRD §4.2) | Client Master ERP ingestion allows multiple branches of the same client to share switchboard telephone (+234 1 270 5000) | **PASS** |
| **17** | Unpinned branches marked `location_pending` (AT-08) | Branches imported without confirmed GPS coordinates are marked `location_pending = true` with `approved_pin_id = null` | **PASS** |
| **18** | Edge Function user provisioning call | Calls `adminService.provisionUser` invoking `admin-provision-user` edge function; returns success and temporary credentials | **PASS** |
| **19** | Duplicate email conflict handling (HTTP 409) | Propagates Edge Function conflict error message when provisioning an existing email | **PASS** |
| **20** | Corporate email validation handling (HTTP 400) | Propagates validation error when email is malformed | **PASS** |

---

## 3. Live Supabase Dev Project Suite (`scripts/test_stage_3e_db_integrity.py`)

Executed against remote Supabase dev project `[SUPABASE_PROJECT_ID]`:
```
======================================================================
CARBON FIELD SALES TRACKER — STAGE 3E DATABASE INTEGRITY & RPC SUITE
======================================================================

[1] Authenticating Actors...
  CSH: 22222222... (Nigeria Country Sales Head)
  HQ:  33333333... (Enterprise Administrator)
  REP: 11111111... (Field Salesperson - Nigeria)

[2] Testing Market Scoping & RLS Isolation...
  PASS: CSH correctly restricted to 2 Nigeria branches.
  Using Target Branch: f1111111-1111-4111-d111-111111111111 (Apapa Terminal Depot)

[3] Testing GPS Pin Governance (Propose -> CSH Approval)...
  Rep proposed pin: 200 "94dc698f-bb7f-4d3c-b694-188d258e0767"
  PASS: Rep self-approval blocked (P0001: Unauthorized).
  CSH approved pin status: 204
  PASS: CSH approved pin [94dc698f...]. Versioned pin activated.

[4] Testing Zero Bottleneck Company Device Replacement (PRD §6.5)...
  Current active device for rep: 17cd51ac...
  Depot spare device for replacement: e3ec1d14...
  Rep submitted replacement request [7096d24e...] directly to HQ.
  PASS: Country Sales Head approval blocked by Zero Bottleneck violation rule.
  PASS: HQ Admin approved device replacement.
  PASS: HQ Admin dispatched spare device with courier tracking.
  PASS: HQ Admin confirmed activation and recorded old device disposition = returned_to_depot.

[5] Testing 5% Client Call Audit & Dispute Resolution (PRD §8.3 / AT-09)...
  Created random 5% audit call record [324ff7ab...]
  PASS: Client denial recorded. Dispute opened with status 'under_investigation'.
  PASS: Verification flag 'audit_dispute' automatically raised: 6bcd1a27...
  PASS: CSH resolved dispute as 'rep_substantiated' with mandatory justification logged.

[6] Testing Audited Safe CSV Export Ledger Logging (PRD §10)...
  PASS: CSV export logged into public.export_jobs (Job ID: 859d274e..., formula_escaped: true).

======================================================================
ALL STAGE 3E BACKEND INTEGRITY, RPC & RLS INVARIANTS CONFIRMED!
======================================================================
```

---

## 4. Multi-Viewport Browser Visual Verification (`scripts/verify_stage_3e_browser.py`)

All 15 visual artifacts were captured across Desktop (1280px), Mobile (390px), and Compact (360px) viewports with zero horizontal overflow:

| # | Artifact | Viewport | Role | Description |
|---|---|---|---|---|
| **01** | `stage3e_01_country_manager_dashboard_1280.png` | 1280x800 | CSH | Country Operations Overview, attendance metrics, verified vs unverified visits |
| **02** | `stage3e_02_branch_pin_approvals_queue_1280.png` | 1280x800 | CSH | Client branch & GPS pin proposals queue, reported accuracy checks, premises photos |
| **03** | `stage3e_03_exception_review_workbench_1280.png` | 1280x800 | CSH | Salesperson-authored exceptions, mandatory rationale modal, unverified status notice |
| **04** | `stage3e_04_client_visit_verification_1280.png` | 1280x800 | CSH | Real visit list, PostGIS geofence metrics, private premises photos, meeting logs |
| **05** | `stage3e_05_risk_flags_workbench_1280.png` | 1280x800 | CSH | Verification risk flags, investigatory signals, review notes submission |
| **06** | `stage3e_06_client_audit_workbench_1280.png` | 1280x800 | CSH | 5% weekly random sampling workbench, phone call outcomes, dispute resolution |
| **07** | `stage3e_07_country_csv_export_modal_1280.png` | 1280x800 | CSH | Audited Country CSV Export modal with CWE-1236 protection notice and row count |
| **08** | `stage3e_08_hq_operations_overview_1280.png` | 1280x800 | HQ Admin | Enterprise cross-market rollups across Nigeria, Zambia, and Malawi |
| **09** | `stage3e_09_hq_user_management_1280.png` | 1280x800 | HQ Admin | User directory, role provisioning, national market scoping, active status toggle |
| **10** | `stage3e_10_hq_device_management_zero_bottleneck_1280.png` | 1280x800 | HQ Admin | Company device inventory, Knox MDM compliance, direct-to-HQ replacement workbench |
| **11** | `stage3e_11_hq_market_configuration_1280.png` | 1280x800 | HQ Admin | National market operating rules (geofence radius, pin accuracy, working hours) |
| **12** | `stage3e_12_hq_system_audit_log_1280.png` | 1280x800 | HQ Admin | Immutable cryptographic ledger tracking administrative mutations and compliance actions |
| **13** | `stage3e_13_hq_client_master_import_1280.png` | 1280x800 | HQ Admin | Client master ERP CSV ingestion pipeline with validation and batch audit logging |
| **14** | `stage3e_14_manager_mobile_390.png` | 390x844 | CSH | Country manager dashboard responsive rendering on mobile viewport (0 overflow) |
| **15** | `stage3e_15_manager_compact_360.png` | 360x800 | CSH | Country manager dashboard responsive rendering on compact viewport (0 overflow) |

---

## 5. Security & Boundary Compliance

1. **Managerial Non-Origination:**
   - Country Sales Heads and HQ Administrators cannot create visits, attendance records, or meeting logs.
   - Enforced by database RLS (`auth_role() = 'salesperson'`), schema constraints, and UI design.
2. **Zero Bottleneck Device Replacement (PRD §6.5):**
   - Country Sales Heads have no approval or submission role in device replacements.
   - Any non-HQ role invoking `hq_review_device_replacement`, `hq_dispatch_replacement_device`, or `hq_confirm_replacement_activation` is rejected by PostgreSQL check `NOT is_hq()` with error code `P0001`.
3. **Location Unverified Invariant (AT-06):**
   - Approved missing-GPS, camera-defect, or device-depletion visit exceptions remain `manager_approved_unverified`.
   - Never converted to `location_verified`.
4. **CWE-1236 Formula Injection Mitigation:**
   - All cell values beginning with `=, +, -, @, \t, \r` are prepended with `'` in exported CSVs.
   - Each export event is immutably logged into `public.export_jobs`.
5. **Client Master ERP Ingestion:**
   - Different branches of the same organisation may share central switchboard phone numbers without auto-rejection.
   - Branches imported without confirmed GPS coordinates are marked `location_pending`.

