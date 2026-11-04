# Carbon Field Sales Tracker — Full Role-Based Manual UAT Plan

**Document Version:** 1.1 (Final UAT Baseline Corrections)  
**Date:** October 31, 2026  
**Project:** Carbon Field Sales Tracker  
**Business:** Carbon Car Care  
**Reference Document:** Carbon Field Sales Tracker PRD v1.2 (Approved Scope)  
**Execution Environment:** Localhost Staging (`http://localhost:5173`) & Vercel Staging (`https://field-sales-tracker-b6l7.vercel.app/`)  
**Backend:** Hosted Supabase Development Project (`[SUPABASE_PROJECT_ID]`)  

---

## 1. Objectives & Testing Scope

The objective of this User Acceptance Testing (UAT) plan is to provide a structured, role-based manual acceptance framework for business stakeholders and designated pilot testers to validate that the Carbon Field Sales Tracker application satisfies all operational requirements defined in PRD v1.2 prior to business operational rollout.

### 1.1 In Scope
1. **Field Salesperson Workflows:** Mobile experience on company phones, attendance check-in/out, GPS and selfie validation, client directory search, new client registration, physical visit verification via PostGIS, premises photography, meeting logs, free-text next steps, field exceptions, non-visit day requests, durable offline capture, ground GPS pin proposals for unpinned locations, and device replacement tickets.
2. **Country Sales Head Workflows:** Attendance review, visit evidence inspection, branch registration and GPS pin approvals, field exception adjudication, non-visit workday approvals, risk flag triage, weekly 5% client audits, telephone verification, dispute resolution, and sanitized CSV exports.
3. **HQ Administrator Workflows:** Multi-market oversight, staff provisioning, role/market assignment, company handset inventory management, direct device replacement processing, spare depot allocation, courier tracking, Knox activation, ERP client master CSV ingestion with optional GPS coordinates, market configuration, and append-only system audit logs.
4. **Cross-Role Process Handoffs:** End-to-end data flow between Field Salesperson, Country Sales Head, and HQ Administrator.
5. **Multi-Market Sandboxing:** Strict data isolation between Nigeria (`NG`), Zambia (`ZM`), and Malawi (`MW`).

### 1.2 Strictly Out of Scope (PRD §1.3 Non-Commercial Boundary)
- Quotation creation, values, or approval workflows.
- Order placement, sales transactions, or invoicing.
- Sales pipeline stages, deal probabilities, and revenue reporting.
- Automatic task management, due-date schedulers, or calendar alerts.
- Continuous employee GPS breadcrumb tracking.
- Automated facial recognition or biometric matching.

---

## 2. Test Account & Synthetic Dataset Inventory

All test accounts exist in the hosted Supabase development database and have pre-seeded test fixtures:

### 2.1 Authorized User Accounts

| Role | Name | Email | Market | Assigned Company Device | Test Credential Protocol |
|:---|:---|:---|:---|:---|:---|
| **HQ Administrator** | HQ Administrator | `hq.admin@carboncarcare.com` | Global (`ALL`) | IT Administrative Console | Use securely supplied test credentials |
| **Country Sales Head (NG)** | Babatunde Adeleke | `babatunde.adeleke@carboncarcare.com` | Nigeria (`NG`) | Manager Laptop / Console | Use securely supplied test credentials |
| **Field Salesperson (NG)** | Tunde Adebayo | `tunde.adebayo@carboncarcare.com` | Nigeria (`NG`) | `CAR-TST-121585` (Samsung Galaxy A15) | Use securely supplied test credentials |
| **Field Salesperson (NG)** | Merusha Kisten | `k.mersha@carbon.com` | Nigeria (`NG`) | `CAR-NG-002` (Samsung Galaxy A15) | Use securely supplied test credentials |
| **Country Sales Head (ZM)** | Chileshe Mwape | `chileshe.mwape@carboncarcare.com` | Zambia (`ZM`) | Manager Laptop / Console | Use securely supplied test credentials |
| **Field Salesperson (ZM)** | Peter Mwale | `peter.mwale@carboncarcare.com` | Zambia (`ZM`) | `CAR-ZM-001` (Samsung Galaxy A15) | Use securely supplied test credentials |
| **Country Sales Head (MW)** | Tamika Phiri | `tamika.phiri@carboncarcare.com` | Malawi (`MW`) | Manager Laptop / Console | Use securely supplied test credentials |
| **Field Salesperson (MW)** | Kondwani Banda | `kondwani.banda@carboncarcare.com` | Malawi (`MW`) | `CC-DEV-BLA-001` (Nokia G22) | Use securely supplied test credentials |

> [!IMPORTANT]
> **Authentication Security Protocol:** In accordance with Carbon Car Care application security governance, all test users authenticate using dynamic credentials securely provisioned via the Supabase Auth Admin API (`npm run provision:users`) and stored in the local development environment (`.env.local`). Plaintext passwords must never be stored in repository markdown files, test scripts, or completion reports.

---

## 3. Five-Tier Verification Framework

To strictly distinguish developer verification from stakeholder manual acceptance and physical hardware validation, all test cases record status across five distinct dimensions:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           5-TIER VERIFICATION MODEL                            │
├────────────────────────────────┬───────────────────────────────────────────────┤
│ 1. Developer Automated         │ Vitest unit/integration tests & Playwright    │
│    Verification                │ automated browser script runs.                │
├────────────────────────────────┼───────────────────────────────────────────────┤
│ 2. Developer Local Browser     │ Interactive manual execution by engineers on  │
│    Verification                │ localhost:5173 using Chrome/Edge DevTools.    │
├────────────────────────────────┼───────────────────────────────────────────────┤
│ 3. Live Supabase Integration   │ Direct HTTP REST & PostGIS RPC verification   │
│    Verification                │ against hosted Supabase development database. │
├────────────────────────────────┼───────────────────────────────────────────────┤
│ 4. Stakeholder Manual UAT      │ Formal acceptance by business stakeholders     │
│    Result                      │ (Set to NOT TESTED until formal execution).   │
├────────────────────────────────┼───────────────────────────────────────────────┤
│ 5. Physical-Device Test        │ QA on company-issued Samsung Galaxy A15 /     │
│    Result                      │ Nokia G22 handsets in field pilot conditions. │
└────────────────────────────────┴───────────────────────────────────────────────┘
```

- **Developer Automated Verification:** PASS / FAIL (references specific Vitest or Playwright suites).
- **Developer Local Browser Verification:** PASS / FAIL (references responsive viewport, e.g. 390x844).
- **Live Supabase Integration Verification:** PASS / FAIL (verifies table mutations, RLS, and RPC return codes).
- **Stakeholder Manual UAT Result:** **NOT TESTED** (Unless and until formally verified and signed off by the business stakeholder).
- **Physical-Device Test Result:** **NOT TESTED (Physical Handset Required)** (Awaiting physical pilot commissioning).

---

## 4. Physical Android Device Prerequisites

Where manual testing is conducted on physical hardware:
1. **Handset Models:** Samsung Galaxy A15 (primary fleet) or Nokia G22 (pilot secondary).
2. **Operating System:** Android 13 or Android 14 with latest security patch.
3. **Browser / PWA Container:** Google Chrome for Android v120+.
4. **Device Settings:**
   - Location: Google Location Accuracy (`enableHighAccuracy`) enabled.
   - Camera Permissions: Chrome granted Camera permission ("Allow while using app").
   - Power Saving: Chrome excluded from aggressive battery optimization.
   - Display: Font size default; screen zoom default.
5. **Connectivity Modes:** Tested across High-Speed 4G, Degraded 2G/3G, and Airplane Mode (Offline).

*Note: In the local development environment, browser device emulation mode (Samsung Galaxy A51/71 viewport 412x915 or iPhone 390x844) is used for functional verification. All hardware-specific tests remain flagged as `NOT TESTED (Physical Handset Required)` until on-site device pilot execution.*

---

## 5. Database-Driven Expected Results Methodology

UAT test cases must never rely on brittle, hardcoded dashboard figures that become obsolete as records are added. Instead, all expected management and HQ reporting outputs are verified against authoritative SQL calculations:

### 5.1 Completed vs. Verified vs. Unverified Visit Queries
```sql
-- Total Completed Visits for Date and Market
SELECT count(*) FROM public.visits v
JOIN public.attendance_days a ON v.attendance_day_id = a.id
WHERE a.market_code = :market AND a.work_date = :date AND v.check_out_at IS NOT NULL;

-- Location Verified Visits (PostGIS Geofence Validated)
SELECT count(*) FROM public.visits v
JOIN public.attendance_days a ON v.attendance_day_id = a.id
WHERE a.market_code = :market AND a.work_date = :date
  AND v.location_classification = 'inside_confident' 
  AND v.verification_status = 'verified';

-- Manager Approved Location-Unverified Visits (Approved Exceptions)
SELECT count(*) FROM public.visits v
JOIN public.attendance_days a ON v.attendance_day_id = a.id
WHERE a.market_code = :market AND a.work_date = :date
  AND v.verification_status = 'manager_approved_unverified';
```

### 5.2 Device Fleet & Custody Reassignment Queries
```sql
-- Single Active Device Enforcement per Salesperson
SELECT salesperson_id, count(*) FROM public.device_assignments
WHERE is_current = true
GROUP BY salesperson_id HAVING count(*) > 1; -- Must return 0 rows

-- Handsets Pending Depot Physical Inspection
SELECT asset_tag, serial_number, inventory_status, security_authorization
FROM public.devices
WHERE inventory_status = 'pending_inspection';
```

---

## 6. UAT Test Suite Structure

The manual UAT test suite comprises 45 detailed test cases across 9 operational suites detailed in `docs/testing/UAT_TEST_CASES.md`:

1. **Suite 1: Field Salesperson Mobile Workflows (UAT-SP-01 to UAT-SP-15)** — Authentication, attendance, client selection, ground registration, PostGIS check-in, outside checkout flag, meeting log, unverified exceptions, non-visit requests, and direct hardware replacement.
2. **Suite 2: Country Sales Head Reviews & Approvals (UAT-CSH-01 to UAT-CSH-09)** — Country dashboard, attendance review, visit evidence inspection, pin approvals, exception adjudication, risk flags triage, 5% audit sampling, phone verification, and safe CSV export.
3. **Suite 3: HQ Administrator Governance & MDM (UAT-HQ-01 to UAT-HQ-07)** — Tri-market dashboard, user provisioning, custody supersession, direct replacement fulfillment, ERP client master import, market rule set versioning, and system audit log ledger.
4. **Suite 4: Cross-Role Workflow Handoffs (UAT-XO-01 to UAT-XO-03)** — End-to-end multi-persona operational lifecycles.
5. **Suite 5: Multi-Market RLS & Security Boundaries (UAT-SEC-01 to UAT-SEC-03)** — Cross-market read/write isolation and sole-authorship field evidence immutability.
6. **Suite 6: Durable Offline Capture & IndexedDB Sync (UAT-OFF-01 to UAT-OFF-02)** — Airplane mode full workday capture, binary media queue, and topological dependency sync.
7. **Suite 7: Physical Handset Usability & Camera Hardware (UAT-HW-01 to UAT-HW-02)** — Sunlight contrast, outdoor ergonomics, front/rear camera switching, and native GPS fix timing.
8. **Suite 8: Operational Reporting & Metric Accounting (UAT-RPT-01 to UAT-RPT-02)** — Strict separation of GPS verified vs. manager-approved-unverified visits, and non-visit attendance target isolation.
9. **Suite 9: ERP Client Master Import Without GPS & Ground Pin Governance (UAT-ERP-01 to UAT-ERP-05)** — Ingestion without coordinates, `location_pending` display, ground pin proposals, versioned pin approval, and first-meeting unverified exception logging.

---

## 7. Execution Protocol & Sign-Off Criteria

1. **Prerequisite:** Ensure local development server is active (`http://localhost:5173`) and connected to hosted Supabase dev project.
2. **Execution:** Testers execute test cases following step-by-step instructions in `docs/testing/UAT_TEST_CASES.md`.
3. **Evidence:** For every test case, capture required screenshot evidence and record actual results.
4. **Defect Logging:** Any unexpected behavior must be logged in `docs/testing/UAT_DEFECT_REGISTER.md` with full reproduction steps.
5. **Sign-Off:** Formal UAT sign-off requires 100% of P0/P1 defects resolved and verified in both automated and manual tests.
