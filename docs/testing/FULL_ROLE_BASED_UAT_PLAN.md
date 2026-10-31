# Carbon Field Sales Tracker — Full Role-Based Manual UAT Plan

**Document Version:** 1.0  
**Date:** October 31, 2026  
**Project:** Carbon Field Sales Tracker  
**Business:** Carbon Car Care  
**Reference Document:** Carbon Field Sales Tracker PRD v1.2 (Approved Scope)  
**Execution Environment:** Localhost Staging (`http://localhost:5173`) & Vercel Staging (`https://field-sales-tracker-b6l7.vercel.app/`)  
**Backend:** Hosted Supabase Development Project (`[SUPABASE_PROJECT_ID]`)  

---

## 1. Objectives & Testing Scope

The objective of this User Acceptance Testing (UAT) plan is to validate that the Carbon Field Sales Tracker application satisfies all business operational requirements defined in PRD v1.2 prior to business operational rollout.

### In Scope
1. **Field Salesperson Workflows:** Mobile experience on company phones, attendance check-in/out, GPS and selfie validation, client directory search, new client registration, physical visit verification via PostGIS, premises photography, meeting logs, free-text next steps, field exceptions, non-visit day requests, durable offline capture, and device replacement tickets.
2. **Country Sales Head Workflows:** Attendance review, visit evidence inspection, branch registration and GPS pin approvals, field exception adjudication, non-visit workday approvals, risk flag triage, weekly 5% client audits, telephone verification, dispute resolution, and sanitized CSV exports.
3. **HQ Administrator Workflows:** Multi-market oversight, staff provisioning, role/market assignment, company handset inventory management, direct device replacement processing, spare depot allocation, courier tracking, Knox activation, ERP client master CSV ingestion, market configuration, and append-only system audit logs.
4. **Cross-Role Process Handoffs:** End-to-end data flow between Field Salesperson, Country Sales Head, and HQ Administrator.
5. **Multi-Market Sandboxing:** Strict data isolation between Nigeria (`NG`), Zambia (`ZM`), and Malawi (`MW`).

### Strictly Out of Scope (PRD §1.3 Non-Commercial Boundary)
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

| Role | Name | Email | Market | Assigned Company Device | Password |
|:---|:---|:---|:---|:---|:---|
| **HQ Administrator** | HQ Administrator | `hq.admin@carboncarcare.com` | Global (`ALL`) | IT Administrative Console | `CarbonAdmin2026!` |
| **Country Sales Head (NG)** | Babatunde Adeleke | `babatunde.adeleke@carboncarcare.com` | Nigeria (`NG`) | Manager Laptop / Console | `CarbonAdmin2026!` |
| **Field Salesperson (NG)** | Tunde Adebayo | `tunde.adebayo@carboncarcare.com` | Nigeria (`NG`) | `CAR-TST-121585` (Samsung Galaxy A15) | `CarbonSales2026!` |
| **Field Salesperson (NG)** | Merusha Kisten | `k.mersha@carbon.com` | Nigeria (`NG`) | `CAR-NG-002` (Samsung Galaxy A15) | `CarbonSales2026!` |
| **Country Sales Head (ZM)** | Chileshe Mwape | `chileshe.mwape@carboncarcare.com` | Zambia (`ZM`) | Manager Laptop / Console | `CarbonAdmin2026!` |
| **Field Salesperson (ZM)** | Peter Mwale | `peter.mwale@carboncarcare.com` | Zambia (`ZM`) | `CAR-ZM-001` (Samsung Galaxy A15) | `CarbonSales2026!` |
| **Country Sales Head (MW)** | Tamika Phiri | `tamika.phiri@carboncarcare.com` | Malawi (`MW`) | Manager Laptop / Console | `CarbonAdmin2026!` |
| **Field Salesperson (MW)** | Kondwani Banda | `kondwani.banda@carboncarcare.com` | Malawi (`MW`) | `CC-DEV-BLA-001` (Nokia G22) | `CarbonSales2026!` |

---

## 3. Physical Android Device Prerequisites

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

*Note: If physical devices are unavailable during local testing, browser device emulation mode (Samsung Galaxy A51/71 viewport 412x915) is permitted for functional verification, with hardware-specific tests flagged as `IMPLEMENTED — MANUAL UAT PENDING`.*

---

## 4. Test Execution Protocol & Quality Criteria

### Pass Criteria
- **Functional Integrity:** Feature behaves exactly as described in PRD v1.2 without JavaScript errors.
- **Data Persistence:** Submissions appear in the corresponding Supabase table with correct foreign keys and timestamps.
- **Zero Mock Contamination:** In live testing, data originates strictly from Supabase REST/RPC APIs.
- **Role Isolation:** Cross-market reads or writes outside the user's assigned country return 403 Forbidden or empty datasets.
- **Append-Only Immutability:** Historical field evidence (check-in coordinates, photos) cannot be edited after submission.

### Severity Definitions
- **P0 (Blocker):** Security vulnerability, data loss, or inability to complete core field flow.
- **P1 (Critical):** Major workflow failure with no operational workaround.
- **P2 (Major):** Important reporting, validation, or usability defect with existing operational workaround.
- **P3 (Minor):** Cosmetic alignment, microcopy, or non-blocking polish item.

---

## 5. Test Dataset Reset & Isolation Protocol

To ensure repeatable UAT cycles without corrupting production or baseline data:
1. Test records created during UAT use prefixes `UAT-` (e.g. `UAT-Branch-01`, `UAT-Client-Delta`).
2. Script `scripts/reset_tunde_attendance.ts` can be safely executed to clear active attendance or open visits for Tunde Adebayo between test runs.
3. System seed records (`Terminal Alpha`, `Apex Heavy Logistics`, `Zambezi Freight`) are baseline assets and should not be deleted.

