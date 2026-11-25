# ADR 0005: Stage 1D Implementation — HQ Admin Interface & Regional Governance

**Date:** 2026-10-20  
**Status:** Completed & Ready for Review  
**Context:** Full implementation of Stage 1D — HQ Admin Interface for the Carbon Field Sales Tracker PWA across Nigeria (`Africa/Lagos`), Zambia (`Africa/Lusaka`), and Malawi (`Africa/Blantyre`). Built with React, TypeScript, Tailwind CSS v4, shadcn/ui, and mock-data repository architecture.

---

## 1. Executive Summary

Stage 1D establishes the centralized regional administration, multi-country monitoring, mobile device management (MDM), client master data ingestion, and policy governance layer for Carbon Car Care operations across West, Central, and Southern Africa.

### Strict Business & Architectural Boundaries Enforced:
1. **Multi-Market Scope vs Country Sandboxing:** HQ Admins hold tri-market operational visibility and administrative control across Nigeria, Zambia, and Malawi. Country Sales Heads remain strictly sandboxed to their single assigned national territory.
2. **PRD §2 & §7 Sole-Author Boundary:** Neither HQ Administrators nor Country Sales Heads can create or fabricate salesperson visit logs or GPS/device-failure exception submissions. Salespeople are the sole authors of field activity.
3. **Approved Direct-to-HQ Device Replacement Workflow:** Salespeople submit company device replacement requests directly to HQ Admin under `Profile → My Device → Report Device Issue`. There is **zero Country Sales Head approval or intermediary submission step**. Country Sales Heads hold read-only operational visibility where appropriate.
4. **Strict Separation of Hardware Replacement & Field Visit Exceptions:** Hardware replacement is an administrative record; GPS/camera/device failure visit exceptions are field activity evidence and must be submitted separately by the salesperson under `My Exceptions` upon device restoration.
5. **PRD §4.2 Shared Telephone Compliance in Client Master Import:** When importing B2B accounts, sibling branches of the same parent company sharing a switchboard phone number are permitted and never automatically rejected as duplicates.
6. **Missing Coordinates Default to "Location Pending":** Imported B2B accounts without approved GPS pins are ingested as `Location Pending`. Reps must propose pins during first physical visits for Sales Head sign-off before visits can achieve `Location Verified` status.
7. **PRD §11 Rule Immutability & Non-Retroactivity:** Operational threshold changes (geofence radius, GPS accuracy, idle thresholds) apply strictly prospectively from the effective date and never silently recalculate or retroactively re-classify past visit records.
8. **Separation of GPS Verification & Client Confirmation:** A properly evidenced GPS visit counts as `Location Verified` independent of client telephone audits. Client denial transitions visits to `Disputed — Pending Review`, never conclusive fraud or automated disciplinary punishment.
9. **CWE-1236 Formula Injection Sanitization:** All spreadsheet extracts strictly neutralize formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) by prepending single quotes before RFC-4180 quotation.
10. **Strict MVP Exclusions:** Zero quotation management, commercial order tracking, pipelines, automated task managers, or sales revenue analytics.

---

## 2. Implemented Modules & Capabilities

### 2.1 Module A: HQ Operations Dashboard (`HqOperationsDashboard.tsx`)
- **Tri-Market Regional Summary:** Aggregates 20 field representatives, 100% company handset deployment, daily/weekly/quarterly visit rollups, and urgent review counts.
- **Country Operational Performance Comparison Table:** Side-by-side benchmarking of Nigeria (Lagos Hub), Zambia (Lusaka Hub), and Malawi (Blantyre Hub).
- **Provisional Data Reconciliation Marker:** Daily metrics clearly flagged as provisional pending the 19:00 local synchronization cutoff.
- **Quick Action Links:** Direct routing to User Provisioning, Device MDM, Market Rule Sets, Master CSV Ingestion, and Reporting Exports.

### 2.2 Module B: User & Role Management (`HqUserManagement.tsx`)
- **Tri-Market Personnel Directory:** Full roster of Salespeople, Country Sales Heads, and HQ Admins across Nigeria, Zambia, and Malawi.
- **Account Provisioning Modal:** Form to provision mock user accounts with name, corporate email, mobile phone, role authority, market scoping, and initial handset tag binding.
- **Role Authority Enforcement:** Explicitly flags that Country Sales Heads only access their assigned market, while HQ Admins hold cross-market oversight.
- **Account Lifecycle Actions:** One-click toggle between `Active` and `Deactivated` statuses with immediate feedback.
- **User Audit History Modal:** Detailed change ledger showing creation timestamps, last authentication, MFA status, and administrative role modifications.

### 2.3 Module C: Company Device Management, Registration & Replacement Workflow (`HqDeviceManagement.tsx`)
- **100% Company-Provided Fleet:** Tracks Samsung Galaxy A15 Enterprise, Nokia G22 Field Edition, and Samsung S23 handsets across Nigeria, Zambia, and Malawi.
- **Register New Company Device Modal:**
  - Added prominent **"+ Register New Device"** button aligned horizontally on a single line with the "100% Company Fleet" status pill.
  - Required fields: Unique Company Asset ID, Device Make, Device Model, Manufacturer Serial Number, Assigned Market (`NG`, `ZM`, `MW`), Initial Inventory Status (defaults to `Available` unless explicitly marked `Pending Inspection`).
  - Optional enterprise metadata: 15-digit IMEI, Operating System & Version, Purchase Date, Supplier, Warranty Expiry Date, IT Notes.
  - Client-side validation: Required field completeness, case-insensitive Asset ID uniqueness, and case-insensitive Serial Number duplication.
- **9-Status Device Lifecycle & Decoupled Security Authorization:**
  - Supports all 9 operational states: `Available` (in depot), `Assigned`, `Active` (in field), `Pending Inspection`, `Under Maintenance`, `Lost/Stolen`, `Returned`, `Revoked`, `Retired`.
  - Security authorization modeled separately (`Authorized`, `Quarantined`, `Revoked`, `Pending Activation`).
- **Device Custody Assignment & Reassignment:**
  - Single active device assignment rule: Prevents assigning a device to a salesperson who already holds an active company phone.
  - Handset reassignment requires confirmation dialog and a mandatory administrative reason.
  - Append-only chronological audit trail ledger (`DeviceAuditHistoryEntry[]`) recording registered-by, timestamps, status transitions, custodians, and reasons without overwriting historical records.
- **Direct-to-HQ Device Replacement Management:**
  - Connected directly to salesperson submissions from mobile `Profile → My Device → Report Device Issue`.
  - Dedicated full-width horizontal tab strip for replacement requests (`Pending Review`, `Approved`, `Awaiting Spare`, `Dispatched`, `Awaiting Activation`, `Completed`, `Rejected`, `All Requests`).
  - **Review & Adjudication:** Displays Request ID, salesperson name & market, device asset ID, device model, issue category, issue description, submitted date/time, supporting evidence, and full history.
  - **Mandatory Approval / Rejection Rationale:** HQ Admin must provide a non-empty rationale for approval or rejection; reasons are immutably logged and visible to the salesperson.
  - **Decoupled Lifecycle Actions:**
    1. *Approve Request:* Authorizes hardware replacement.
    2. *Allocate Spare Handset:* Selects available spare device from regional depot inventory (`spareInventory`).
    3. *Record Handset Dispatch:* Records courier waybill and logistics notes (e.g., DHL Express tracking).
    4. *Confirm Activation & Old Device Disposition:* Confirms Knox MDM enrollment of replacement device and sets disposition of defective unit (`returned_to_depot`, `quarantined`, or `revoked`).
    5. *Close Request:* Finalizes chain-of-custody transfer and marks `Completed`.
  - **Append-Only Chronological History:** Full audit drawer tracking actor names, roles, timestamps, and decision notes for every action.

### 2.4 Module D: Market Configuration & Rule Sets (`HqMarketConfiguration.tsx`)
- **Country Configuration Profiles:** Individual settings for Nigeria (`Africa/Lagos`), Zambia (`Africa/Lusaka`), and Malawi (`Africa/Blantyre`).
- **Operational Parameters:** Working hours (08:00 – 17:00), shift start grace period (15 mins), late start flag cutoff (45 mins), daily visit target (6 physical visits), and 19:00 cutoff.
- **Spatial & GPS Verification Thresholds:** Canonical 200m branch geofence radius, $\le 100\text{m}$ visit GPS accuracy, $\le 50\text{m}$ proposed pin accuracy, 5-min minimum visit duration, 150-min idle gap threshold, and 5% weekly random audit sampling.
- **Public Holiday Calendars:** 2026 statutory national holidays per country preventing false absence flags.
- **Interactive Rule Simulation:** Allows simulating configuration updates, auto-generating prospective version tags (`v1.2.xx`).
- **PRD §11 Non-Retroactivity Notice:** Prominently alerts that rule changes never silently alter historical visit verifications.
- **Rule Version History Table:** Immutable log of past revisions (`v1.0-initial`, `v1.1-clarified`, `v1.2-canonical`) with effective dates and change summaries.

### 2.5 Module E: Client Master Import (`HqClientMasterImport.tsx`)
- **4-Step CSV Ingestion Pipeline:**
  1. *Target Market & File Selection:* Country selection and dropzone with "Load Fictional B2B Sample CSV" button.
  2. *Raw Row Preview:* Formatted preview table showing raw company, branch, contact, phone, and coordinate columns.
  3. *Validation Audit:* Parser engine classifying rows into Valid & Geocoded, PRD Compliant / Pending, or Fatal Errors.
  4. *Success Summary:* Commit screen displaying merge results and location pending totals.
- **PRD §4.2 Shared Corporate Phone Compliance:** Sibling branches sharing a switchboard phone number are flagged as compliant (`Shared Parent Phone Permitted`) and never rejected.
- **Location Pending Classification:** Records lacking GPS coordinates are accepted with `Location Pending` status until a field rep proposes coordinates and the Sales Head approves the pin.
- **Batch Import History Table:** Tracks Batch ID, country, filename, operator, row counts, approved pins, and status (`Validated & Merged`, `Requires Branch Pin Verification`).

### 2.6 Module F: Exception & Escalation Oversight (`HqExceptionOversight.tsx`)
- **Cross-Market Exception Triage:** Oversight of GPS failures, device freezes, and delayed phone recovery submissions.
- **Sole-Author Boundary Banner:** Prominently enforces that the salesperson is the sole author of all visit evidence; HQ cannot fabricate logs.
- **Overdue Review Tracking:** Automatically flags exception submissions pending over 24 hours without Country Sales Head adjudication.
- **Forensic Inspection Modal:** Displays claimed visit time vs actual phone recovery time, salesperson narrative rationale, gate-pass evidence, and prior Sales Head decision notes.
- **HQ Governance Actions:** Administrative buttons to "Request Field Re-investigation" or "Uphold & Conclude Review" with audit logging.

### 2.7 Module G: Client Audit Oversight (`HqClientAuditOversight.tsx`)
- **Verification Sampling Queue:** Tracks weekly 5% random audit sampling (PRD §8.3 / AT-10) and risk-targeted calls (short visits, high offline share, geo-boundary checkouts).
- **Separation of GPS Verification from Client Confirmation:** Explicit policy notice that client denial transitions to `Disputed — Pending Review` for investigation, never immediate disciplinary fraud.
- **Country Sales Head Scorecards:** Completion rates and outcome breakdown for Nigeria, Zambia, and Malawi hubs.
- **Audit Detail Drawer:** Full review of client contact person called, telephone number dialled, sales rep, visit date, and recorded auditor notes.

### 2.8 Module H: Reporting & Data Exports (`HqReportingExport.tsx`)
- **Standardized Operational Extracts:** Attendance & work schedule reports, physical visit activity, country performance rollups, exception logs, device inventory, and system audit trails.
- **CWE-1236 Formula Injection Sanitization:** Neutralizes spreadsheet execution vulnerabilities (`=`, `+`, `-`, `@`, `\t`, `\r`) with leading single quotes (`'`).
- **Live Client-Side CSV Download:** Generates and downloads real RFC-4180 compliant CSV files with simulated sanitization.
- **Download History Table:** Audit log of requested exports showing ID, report name, market scope, requested by, row count, file size, and timestamp.

### 2.9 Module I: System Audit Log (`HqSystemAuditLog.tsx`)
- **Immutable Administrative Ledger:** Tracks mutations across user provisioning, device reassignments, market rule changes, client CSV imports, and data exports.
- **Forensic Metadata:** Displays Log ID, timestamp, actor name, actor role, market scope, action, target record, before/after change differential, session IP address, and security severity (`Routine`, `Elevated`, `Security Critical`).
- **Search & Category Filtering:** Instant search by actor, target record, or IP with filters for market, category, and severity.

### 2.10 Master Orchestration (`HqAdminDashboardPreview.tsx`)
- **Top Quick-Switch Pill Bar:** Horizontal scrollable pill navigation for rapid switching between all 9 HQ modules.
- **Desktop Sidebar Integration:** Fully wired to `DesktopSidebar.tsx` navigation groups (`Executive Overview`, `Administration & MDM`, `Data & Imports`, `Governance & Oversight`).
- **Responsive Layout:** Optimized for both 1440px desktop screens and 768px tablet viewports.

---

## 3. Verification & Testing Results

- **TypeScript Compilation:** `npx tsc --noEmit` passed with 0 errors.
- **Production Build:** `npm run build` passed with 0 errors (bundled via Vite in 7.84s).
- **Automated Vitest Suite:** 57 tests passing across 6 test files (`npm test`):
  - `stage-1d-hq-admin.test.tsx`: 26 passed tests verifying:
    - Multi-market scoping, sole-author boundaries, PRD §4.2 shared phone compliance, `Location Pending` coordinates, CWE-1236 sanitization, rule immutability, strict MVP exclusions.
    - Direct salesperson-to-HQ device replacement workflow, 7 status replacement lifecycle transitions, mandatory approval/rejection reasons, role boundaries, and separation of hardware requests from visit exceptions.
    - New Company Device Registration: required fields, unique Asset ID check (case-insensitive), unique Serial Number check (case-insensitive), initial status defaulting to `Available` or explicit `Pending Inspection`.
    - Single active user assignment rule and assignment history preservation.
    - Custody reassignment requiring mandatory reason without overwriting historical records.
    - 9-status lifecycle updates and decoupled security authorization state transitions (`Authorized`, `Quarantined`, `Revoked`).
    - Full 8-step end-to-end device registration, inventory appearance, assignment, replacement approval, spare allocation, disposition, and audit ledger demonstration.
  - `stage-1c-manager-dashboard.test.tsx`: 18 passed tests.
  - `salesperson-context.test.tsx`: 5 passed tests.
  - `status-badge.test.tsx`: 4 passed tests.
  - `brand-logo.test.tsx`: 2 passed tests.
  - `at15-exclusions.test.tsx`: 2 passed tests.
- **UI Alignments & Visual Refinements:**
  - Guaranteed single-line horizontal alignment for "+ Register New Device" action button and "100% Company Fleet" status pill in the header banner.
  - Redesigned Pending Device Replacement Requests module header with non-wrapping pill badge and a dedicated, full-width horizontal tab strip for all 8 request filters with clear counts and status indicators.

---

## 4. Git & Release Management

- Working tree remains clean on branch `main`.
- **CRITICAL COMMITMENT OBSERVED:** Stage 1D changes have **NOT** been pushed to GitHub, pending user review and explicit sign-off.
