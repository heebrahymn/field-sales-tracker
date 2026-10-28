# Carbon Field Sales Tracker

An enterprise-grade, mobile-first, offline-capable Progressive Web Application (PWA) for field-sales activity recording, physical visit verification, client branch management, and managerial audits across African markets (**Nigeria**, **Zambia**, and **Malawi**).

Built for **Carbon Car Care** with React, TypeScript, Vite, Tailwind CSS, shadcn/ui, and Supabase.

---

## 1. Project Overview & Business Purpose

Field sales operations in emerging markets require robust, tamper-resistant operational records without adding administrative burden or assuming permanent high-speed cellular connectivity.

The **Carbon Field Sales Tracker** establishes an objective operational baseline for field activities:
- **Attendance & Workday Tracking:** Captures authenticated employee identity, assigned company device status, fresh GPS coordinates, and live front-camera selfie check-in.
- **Physical Visit Verification:** Enforces a configurable 200m geofence radius around registered client branch GPS pins combined with live on-site premises photography.
- **Client & Branch Directory:** Distinguishes parent enterprises from individual operating branches, supporting multi-branch organizations that legitimately share switchboard telephone numbers ([PRD §4.2](docs/Carbon_Field_Sales_Tracker_PRD_v1.2_MVP_Updated.pdf)).
- **Meeting Documentation:** Records contacts met, visit purposes, products discussed, narrative meeting outcomes, free-text next steps, and business-card captures ([PRD §7.3](docs/Carbon_Field_Sales_Tracker_PRD_v1.2_MVP_Updated.pdf)).
- **Salesperson-Originated Exceptions:** Salespeople own and submit their own GPS failure, camera failure, battery depletion, or missed visit claims. Managers review, approve, or reject, but **never** fabricate or alter logs on behalf of a salesperson ([PRD §7.4](docs/Carbon_Field_Sales_Tracker_PRD_v1.2_MVP_Updated.pdf)).
- **Resilient Offline Journal:** Queues offline actions locally with monotonic ordering and client-generated UUID idempotency keys, guaranteeing ordered, duplicate-safe server reconciliation.

---

## 2. Strict MVP Boundaries (Non-Commercial Exclusions)

To maintain absolute focus on core field activity verification and operational integrity, the following features are **strictly excluded from the MVP**:

- ❌ Quotation creation, editing, pricing values, or quotation approval workflows.
- ❌ Sales pipeline stages, deal conversion probabilities, and revenue reporting charts.
- ❌ Commercial purchase order tracking, sales transactions, invoicing, or payment processing.
- ❌ Automated follow-up task scheduling engines, calendar alarms, or due-date task managers (next steps are captured strictly as narrative free text).
- ❌ Continuous employee GPS breadcrumb tracking or turn-by-turn route optimization.
- ❌ Automated facial recognition or biometric scanning.
- ❌ Live ERP / CRM synchronization.

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| **Core Framework** | React 18, TypeScript (strict mode), Vite |
| **Styling & Design System** | Tailwind CSS v4, shadcn/ui primitives, Radix UI, Lucide React |
| **Typography & Assets** | Self-hosted Manrope font family, authentic Carbon Car Care brand mark (`public/brand/carbon_logo.png`) |
| **Backend (Stage 2+)** | Supabase PostgreSQL, Auth, Row-Level Security (RLS), Edge Functions, private Storage |
| **Offline Architecture** | Service Worker, Vite PWA, IndexedDB (Dexie), UUID idempotency keys |
| **Location & Mapping** | Browser Geolocation API, Leaflet, OpenStreetMap |
| **Testing & Quality** | Vitest, React Testing Library |

### Official Brand Design Tokens

| Token | Hex Value | Usage |
|---|---|---|
| **Carbon Primary Blue** | `#21409A` | Headers, primary actions, active visit indicators |
| **Carbon Green** | `#1B9A4A` (`#157A3A` text) | Verified statuses, start day actions, success indicators |
| **Carbon Yellow Highlight** | `#E8CF2F` | Live timer pulses, active visit highlights, operational accents |
| **Neutral Surfaces** | `#FFFFFF` / Slate scales | High-contrast cards, outdoor-friendly forms, scannable tables |

---

## 4. Current Milestone Status (Stages 0, 1, 2, 3A, 3B, 3C, 3D, 3E & 3F Completed)

```
[✓] Stage 0   — Technical Architecture, Database Model & Implementation Plan (ADR 0001)
[✓] Stage 1A  — Design System, Application Shell, Role Switcher & Card Refinements (ADR 0002)
[✓] Stage 1B  — Complete Salesperson Mobile Interface (ADR 0003)
[✓] Stage 1C  — Country Sales Head Dashboard & Review Workbenches (ADR 0004)
[✓] Stage 1D  — HQ Admin Regional Oversight Console & Device Management (ADR 0005)
[✓] Stage 1E  — Final Frontend QA & Cross-Role Integration Review (ADR 0006)
[✓] Stage 2   — Supabase Dev Project, Schema Migrations, Auth & RLS Security Policies (ADR 0007, ADR 0008)
[✓] Pre-3     — Product Audit, Terminology Standardization & Usability Fixes
[✓] Stage 3A  — Real Supabase Authentication & Role-Based Access Control (ADR 0009)
[✓] Stage 3B  — Real Attendance & Workday Management (ADR 0010)
[✓] Stage 3C  — Real Client Visits, Authoritative PostGIS Geofencing, Camera Evidence & Meeting Logs (ADR 0011, Migrations 00026–00027)
[✓] Stage 3D  — Durable Offline IndexedDB Journal, Media Queuing & Dependency Synchronisation (ADR 0012)
[✓] Stage 3E  — Management Reports, GPS Pin Governance, Zero Bottleneck MDM & Safe CSV Exports (ADR 0013)
[✓] Stage 3F  — End-to-End QA, Physical Device Protocols & Live Vercel Staging Deployment (ADR 0014)
[ ] Field Pilot — Controlled Real-Device Field Pilot (Samsung Galaxy A15 / Nokia G22 in Lagos, Lusaka, Blantyre)
[ ] Operational Rollout — Multi-Market Business Production Rollout across Nigeria, Zambia, and Malawi
```

> [!IMPORTANT]
> **Operational Staging Notice:** The application is deployed for controlled staging and testing at **`https://field-sales-tracker-b6l7.vercel.app/`**. Features across **Stage 3A (Supabase GoTrue Auth), Stage 3B (Real Daily Attendance Persistence), Stage 3C (Real Client Visits, PostGIS Geofencing, Camera Evidence & Meeting Logs), Stage 3D (Durable Offline IndexedDB Event Journal & Media Queue), Stage 3E (Real Management & HQ Administration Integration), and Stage 3F (Live Staging E2E Verification)** are fully operational and backed by the hosted PostgreSQL database (`public.attendance_days`, `public.visits`, `public.meeting_logs`, `public.organisations`, `public.branches`, `public.branch_location_pins`, `public.device_replacement_requests`, `public.client_audit_records`, `public.verification_flags`, `public.export_jobs`, `public.import_batches`), private Storage buckets (`attendance-selfies`, `visit-premises-photos`, `business-cards`), and local `Dexie.js` IndexedDB (`CarbonOfflineJournalDB`). Unrestricted business-wide operational rollout requires final field-pilot sign-off.

---

## 5. Completed Stage 1B Salesperson Mobile Features

1. **Salesperson Home Dashboard:** Live attendance status, in-progress visit summary, real-time counters, completed visit history, and context-aware action tiles.
2. **Start Day & End Day Workflows:**
   - Simulated front-camera selfie preview with coordinate watermarking (`6.5244° N, 3.3792° E`).
   - Fresh GPS satellite fix accuracy meter (±12m within the ≤100m PRD limit).
   - **PRD §6.1 / AT-03 Hard Block:** Workday closure is strictly blocked while a normal visit session remains open.
3. **Clients & Branch Management:**
   - Searchable branch directory with distance tags, category filters, and direct call actions.
   - **Shared Company Phone Number Support (PRD §4.2):** Validates and supports multiple facilities sharing a switchboard phone (`+234 1 270 5000`) without duplicate rejection.
   - **Register Branch Modal:** Captures facility details, site contact, proposed GPS pin (accuracy ≤ 50m required), and live premises photo.
4. **Client Visit Workflow:**
   - Interactive 6-step flow with GPS simulator test controls (*Inside 38m*, *Outside 340m*, *Degraded ±140m*).
   - Mandatory rear-camera premises photo viewfinder.
   - Live elapsed visit timer (`MM:SS`).
   - Single active physical visit rule enforcement (AT-04).
   - **Permitted Outside-Geofence Checkout (PRD §7.2 / AT-05):** Checkouts outside 200m are permitted to avoid blocking closure, but automatically raise a review flag (`Checkout Outside Geofence`) for manager triage.
5. **Meeting Log Documentation:**
   - Categorized visit purpose, multi-select products, narrative outcome, and optional business-card capture preview.
   - Next steps captured strictly as unparsed free text narrative.
   - Immediate submission or 2-hour SLA deferral option.
6. **My Exceptions Workbench:**
   - Salesperson-exclusive claim creation (GPS failure, camera failure, device depletion recovery, missed visits).
   - Complete audit trail showing manager review decisions (`Manager Approved — Location Unverified` per PRD §2).
7. **Non-Visit Workday Requests:**
   - Requests for office proposal prep, training, virtual meetings, and internal operations.
   - Explicit governance notice: counts toward attendance, strictly zero physical visit targets.
8. **Offline Queue & Synchronisation:**
   - Cellular connectivity simulator (Online vs. Offline / Airplane Mode).
   - Animated "Sync Now" trigger.
   - Durable IndexedDB journal demonstrating monotonic sequence ordering and client-generated UUID idempotency keys (`evt-8f4b-2291-a10c`).
9. **Profile & Company Device Issue Reporting (`ProfileView.tsx`, `ReportDeviceIssueModal.tsx`):**
   - Direct-to-HQ hardware issue reporting under **Profile → My Device → Report Device Issue**.
   - Displays assigned company-issued device asset ID, hardware model, IMEI hash, battery status, and Knox enrollment.
   - Report categories: camera defects, GPS failure, screen damage, battery/charging faults, lost or stolen devices, or other issues with optional supporting photo evidence.
   - **Direct HQ Admin Submission:** Zero Country Sales Head involvement or approval bottleneck (strict direct-to-HQ flow per approved decision).
   - Live lifecycle tracking across all 7 statuses (`Pending Review`, `Approved`, `Rejected`, `Awaiting Spare`, `Dispatched`, `Awaiting Activation`, `Completed`).
   - Append-only timeline history inspection and display of HQ Admin decision commentary and courier tracking details.
   - Separate from field visit exceptions: hardware replacement is an administrative record, while visit exceptions remain field activity evidence authored solely by the salesperson.

---

## 6. Completed Stage 1C Country Sales Head Management Features

1. **Operational Management Dashboard (`SalesHeadDashboardPreview.tsx`):**
   - Daily, weekly, and quarterly summary scopes with provisional reconciliation notices (19:00 WAT cutoff per PRD §10).
   - 5 distinct counting KPI cards: Active Reps, Location Verified Visits, Approved Unverified Activity, Missing Logs, and Urgent Flags.
   - Dedicated quick-switching horizontal pill navigation bar.
2. **Team & Attendance Management (`TeamAttendanceReview.tsx`):**
   - Active country roster with territory assignments, company device ID bindings (`SM-A546B`), and battery monitoring.
   - Start Day selfie inspection with coordinate watermarking and GPS fix accuracy inspection ($\le 50\text{m}$).
   - Authorised non-visit workday review (office proposals, training; counts toward attendance, strictly zero visit targets).
   - Administrative leave recording action (annual, sick, compassionate).
3. **Client & Branch Registration Approvals (`BranchApprovalsQueue.tsx`):**
   - Pin accuracy verification enforcing PRD $\le 50\text{m}$ threshold.
   - Live premises photo verification and mandatory manager approval/rejection rationale logging.
   - **Shared Telephone Number Support (PRD §4.2):** Validates multiple branches sharing parent switchboard phone numbers without auto-rejection.
4. **Exception Approval Workbench (`ExceptionReviewWorkbench.tsx`):**
   - Salesperson-created GPS signal failure, camera failure, device depletion, and missed visit triage.
   - Enforces core PRD governance: managers **never** originate salesperson logs; approved exceptions remain **Manager Approved — Location Unverified**.
5. **Dedicated Client Visit Verification Screen (`ClientVisitVerification.tsx`):**
   - Geofence pass/fail verification ($\le 200\text{m}$ threshold with reported GPS accuracy tolerance).
   - Live premises photograph inspector modal.
   - Complete meeting log audit with free-text next steps only (strict MVP exclusion enforcement).
6. **Suspicious Activity Flags Queue (`RiskFlagsWorkbench.tsx`):**
   - Tripwire monitoring: rapid travel ($>80\text{ km/h}$), out-of-bounds checkout ($>200\text{m}$), short visits ($<5\text{m}$), and late meeting logs ($>2\text{h}$).
   - Human review actions: Dismiss with justification, request explanation, or confirm policy violation.
7. **Client Audit Phone Call Workbench (`ClientAuditWorkbench.tsx`):**
   - Weekly 5% random audit sampling queue (PRD §8.3 / AT-10) plus risk-targeted calls.
   - Standardized telephone script: in-person meeting confirmation and products discussed verification.
   - Unreachable client tracking with repeated call attempt counter (Attempt 1, Attempt 2, etc.) and re-queueing.
   - Client denial immediate transition to **Disputed — Pending Review** for management inquiry (never automated disciplinary action).
   - Management dispute investigation workbench: documents representative explanation, secondary verification (gate logbook/workshop witness), and formal resolution (`resolved_cleared` vs `resolved_violation`) with preserved audit history.
8. **Multi-Dimensional Rollups & Reporting (`CountryReportingView.tsx` & `CountryCsvExportModal.tsx`):**
   - Daily, weekly, and quarterly rollups of verified visits, approved unverified visits, unique branches visited, offline event share, and log compliance.
   - Multi-parameter filter bar: filter records by **Salesperson**, **Date Range** (with custom start/end date inputs), **Client Branch**, and **Verification Status**.
   - Dual-tab view: Sales Representative Operational Breakdown (comparative team performance) and Individual Visit Records (granular audit trail with live search).
   - **CWE-1236 Formula Injection Escaping:** Audited CSV export modal automatically escaping formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) with leading single quotes (`'`).

---

## 7. Completed Stage 1D HQ Admin Regional Governance Features

1. **HQ Operations Dashboard (`HqOperationsDashboard.tsx`):**
   - Multi-market consolidated aggregates across Nigeria (`Africa/Lagos`), Zambia (`Africa/Lusaka`), and Malawi (`Africa/Blantyre`).
   - Country operational performance comparison table benchmarking active personnel, verified visits, approved exceptions, unique branches, and offline synchronisation rates.
   - Provisional data markers indicating metrics subject to 19:00 local synchronization reconciliation.
   - Quick action links to user provisioning, handset MDM, rule sets, CSV ingestion, and audited exports.
2. **User & Role Management (`HqUserManagement.tsx`):**
   - Centralized user directory with search and multi-parameter filters (market, role, status).
   - User account provisioning modal with role assignment (`salesperson`, `sales_head`, `hq_admin`), territory scoping, and initial device pairing.
   - Role boundary enforcement: Country Sales Heads sandboxed to their assigned national market; HQ Admins have cross-market oversight.
   - One-click account activation / deactivation lifecycle controls with audit trail drawer.
3. **Company Device Management & MDM (`HqDeviceManagement.tsx`):**
   - 100% company-provided handset inventory tracking (Samsung Galaxy A15, Nokia G22, Samsung S23).
   - Knox Enterprise MDM telemetry: 15-digit IMEI, Asset Tag, battery health %, OS build, and last sync timestamp.
   - **Approved Device Replacement Lifecycle (Direct Salesperson → HQ Admin):**
     - Full queue tracking requests directly submitted by salespeople across all 7 lifecycle statuses: `Pending Review`, `Approved`, `Rejected`, `Awaiting Spare`, `Dispatched`, `Awaiting Activation`, and `Completed`.
     - **Decoupled Workflow Actions:** Review request $\to$ Approve or Reject with mandatory reason $\to$ Allocate spare device from depot inventory $\to$ Record dispatch with courier tracking notes $\to$ Confirm Knox MDM activation & record old-device disposition (`quarantined`, `returned_to_depot`, `revoked`) $\to$ Close completed request.
     - Append-only chronological history ledger documenting all status transitions, timestamps, actor roles, and administrative rationales.
     - Device reassignment handover modal with chain-of-custody audit logging.
4. **Market Configuration & Rule Sets (`HqMarketConfiguration.tsx`):**
   - Configurable settings for Nigeria, Zambia, and Malawi: working hours, shift start grace periods, late start cutoffs, daily visit targets (6 visits), and public holiday calendars.
   - Spatial thresholds: canonical 200m geofence radius, $\le 100\text{m}$ visit GPS accuracy, $\le 50\text{m}$ proposed pin accuracy, 5-min minimum visit duration, and 150-min idle gap threshold.
   - **PRD §11 Rule Immutability & Non-Retroactivity:** Rule revisions apply prospectively from effective dates and never silently alter historical visit verification results.
   - Rule version history table (`v1.0-initial`, `v1.1-clarified`, `v1.2-canonical`) with simulation tool.
5. **Client Master CSV Import (`HqClientMasterImport.tsx`):**
   - 4-step B2B CSV ingestion wizard: market selection, file upload / sample loader, row preview, validation audit, and commit.
   - **PRD §4.2 Shared Corporate Telephone Compliance:** Explicitly validates and permits sibling branches sharing parent switchboard numbers without duplicate rejection.
   - **Location Pending Classification:** Ingests accounts without GPS coordinates with `Location Pending` status until field pin registration and Sales Head approval.
   - Historical batch import log tracking total rows, approved pins, and location pending branches.
6. **Exception & Escalation Oversight (`HqExceptionOversight.tsx`):**
   - Tri-market triage of GPS failures, device freezes, and delayed submissions after phone recovery.
   - **PRD §2 & §7 Sole-Author Boundary:** Salesperson is the sole author of all visit evidence; HQ admins and managers cannot fabricate logs.
   - Overdue review tracking (>24h without Sales Head adjudication).
   - Forensic inspection modal displaying claimed visit time vs actual phone recovery time, salesperson rationale, delivery ticket evidence, and prior manager notes.
   - HQ governance actions: Request Field Re-investigation or Uphold Decision.
7. **Client Audit Oversight (`HqClientAuditOversight.tsx`):**
   - Weekly 5% random audit sampling tracking (PRD §8.3 / AT-10) and risk-targeted cases.
   - Separation of GPS verification from client confirmation: client denial transitions to `Disputed — Pending Review`, never immediate disciplinary violation.
   - Country Sales Head audit completion scorecards for Nigeria, Zambia, and Malawi.
8. **Enterprise Reporting & Data Exports (`HqReportingExport.tsx`):**
   - Multi-market CSV extracts for attendance, physical visits, country rollups, exception logs, device inventory, and system audit logs.
   - **CWE-1236 Formula Injection Sanitization:** Escaping formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) with leading single quotes (`'`).
   - Client-side download execution generating RFC-4180 compliant CSV files with download history table.
9. **System Administration Audit Trail (`HqSystemAuditLog.tsx`):**
   - Immutable administrative ledger tracking user provisioning, role modifications, device handovers, rule updates, CSV master merges, and data downloads.
   - Forensic audit metadata: Log ID, timestamp, actor, role, market scope, action, target record, diff summary, IP address, and security severity.
10. **Master Orchestration (`HqAdminDashboardPreview.tsx`):**
    - Integrated navigation via top quick-switch pill bar and full desktop sidebar synchronization.

---

## 8. Completed Stage 1E Final Frontend QA & Cross-Role Integration Review

1. **Unified Cross-Role Reactive State Architecture:**
   - Mounted four coordinated context providers at application root (`MarketConfigProvider`, `AuditProvider`, `DeviceReplacementProvider`, `FieldSessionProvider`).
   - Actions taken in one persona (e.g. Salesperson, Country Sales Head, HQ Admin) are immediately and consistently reflected in the other views without manual page reloads.
2. **Five Verified Cross-Role Workflows (Workflows A–E):**
   - **Workflow A (Branch Registration):** Salesperson registers branch with proposed GPS coordinates & premises photo $\to$ Country Sales Head reviews in approval queue $\to$ Approval updates salesperson client directory to `Active / Pin Approved`.
   - **Workflow B (Missed-Visit Exception):** Salesperson authors exception log with rationale $\to$ Country Sales Head adjudicates with mandatory justification $\to$ Rep view reflects `Manager Approved — Location Unverified` with immutable audit note.
   - **Workflow C (Direct-to-HQ Device Replacement):** Salesperson reports hardware defect via `Profile → My Device → Report Device Issue` $\to$ HQ Admin approves $\to$ HQ allocates depot spare $\to$ Courier dispatch recorded $\to$ Knox MDM activation confirmed $\to$ Salesperson sees `Completed` status.
   - **Workflow D (Client Telephone Audit):** Country Sales Head logs 5% random audit call attempts $\to$ Client denial escalates to `Disputed (Denied)` $\to$ HQ Admin regional audit oversight console reflects disputed visit.
   - **Workflow E (Versioned Market Rules):** HQ Admin updates Nigeria geofence to 150m $\to$ System increments rule version to `v1.2.04` and appends to immutable ledger $\to$ Salesperson visit workflow dynamically checks against updated 150m threshold.
3. **Comprehensive Responsive Testing:**
   - Validated layouts across 5 canonical screen resolutions: Small Mobile (`360×800`), Standard Mobile (`390×844`), Tablet (`768×1024`), Laptop/Desktop (`1440×900`), and FHD Workstation (`1920×1080`).
4. **Strict Non-Commercial MVP Verification:**
   - Confirmed zero commercial tables or screens: no quotations, commercial orders, pipeline deal stages, revenue charts, task scheduling reminders, invoicing, payments, or live CRM connectors.
5. **Quality Gate Execution:**
   - 65 unit & integration tests passing across 7 test suites in Vitest.
   - Zero TypeScript compilation errors in strict mode (`npx tsc --noEmit`).
   - Clean production bundle (`npm run build`, `dist/assets/index-gek65R7_.js` 872 kB).

---

## 9. Installation & Development Commands

### Prerequisites
- Node.js 18.0+ or 20.0+ LTS
- npm 9.0+

### Setup
```powershell
# Clone the repository
git clone https://github.com/heebrahymn/field-sales-tracker.git
cd field-sales-tracker

# Install dependencies
npm install

# Start the local development server
npm run dev
```

The application will be accessible at `http://localhost:5173/`.

### Development & Verification Commands
```powershell
# Run TypeScript compilation check (Strict Mode, 0 errors)
npx tsc --noEmit

# Run Vitest automated unit & integration tests (65 tests passing across 7 test suites)
npm test

# Build the production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 10. Known Limitations & Mock-Data Behavior

1. **In-Memory Session Persistence:**
   - State updates (e.g. branch submissions, exception approvals, device replacements) persist across in-app role switches via `DemoDataBanner` and internal routing, but reset upon a hard page reload. Persistent storage and Row-Level Security arrive in Stage 2.
2. **Simulated Hardware APIs:**
   - GPS satellite fixes and camera captures operate via high-fidelity simulation controls. Real browser Geolocation API and camera hardware integration (`navigator.mediaDevices.getUserMedia`) will be wired in Stage 3.
3. **Simulated Offline Journal:**
   - Offline events and sync queues are visualized using in-memory state. Real durable IndexedDB (Dexie) event queuing and background synchronization will be delivered in Stage 4.

---

## 11. Stage 2 Backend Readiness Checklist

- [x] **Schema Alignment:** TypeScript data contracts mirror Stage 0 PostgreSQL canonical entities (`users`, `devices`, `organisations`, `branches`, `visits`, `meeting_logs`, `exceptions`, `device_replacements`, `audit_records`, `market_rules`).
- [x] **Role Security Boundary Verification:** RLS policies mapped and verified via frontend role sandboxing.
- [x] **Clean Context API Abstraction:** Views consume business logic through decoupled React context hooks, facilitating immediate drop-in replacement with Supabase query hooks in Stage 2.
- [x] **Deterministic Event Envelopes:** Client-side event structures incorporate UUIDs, market timestamps, and idempotency headers ready for Dexie IndexedDB offline queuing.
- [x] **Safe CSV Export Utility:** Formula sanitization logic (`safeCsvExport`) ready for backend Edge Function implementation.
- [x] **Zero Prohibited Commercial Modules:** Codebase strictly conforms to PRD Section 12 exclusions.

---

## 12. Project Structure

```
carbonSalesTracker/
├── docs/                                # Project guides, PRD, and ADR records
│   ├── Carbon_Field_Sales_Tracker_PRD_v1.2_MVP_Updated.pdf
│   ├── ANTIGRAVITY_MASTER_PROMPT.md
│   ├── stage1e_qa_report.md             # Stage 1E Final Frontend QA Report
│   ├── decisions/                       # Architectural Decision Records (ADRs)
│   │   ├── 0001-stage-0-approval.md
│   │   ├── 0002-stage-1a-approval.md
│   │   ├── 0003-stage-1b-salesperson-mobile-interface.md
│   │   ├── 0004-stage-1c-country-sales-head-dashboard.md
│   │   ├── 0005-stage-1d-hq-admin-interface.md
│   │   └── 0006-stage-1e-frontend-qa-and-integration.md
│   └── screenshots/                     # High-resolution screen captures
│       ├── stage1b/
│       └── stage1d/
├── public/
│   ├── brand/
│   │   └── carbon_logo.png              # Authentic Carbon Car Care logo
│   └── fonts/                           # Self-hosted Manrope font family
├── src/
│   ├── components/                      # Reusable UI primitives and layouts
│   │   ├── brand/                       # Brand logo component
│   │   ├── feedback/                    # Demo role switcher banner
│   │   ├── field/                       # Persistent status strip
│   │   ├── layout/                      # AppShell, ConsoleHeader, Navbars, DesktopSidebar
│   │   └── ui/                          # Button, Card, Badge, Input, Table
│   ├── context/                         # Reactive application state
│   │   ├── AuthContext.tsx              # Role-switching demo provider
│   │   ├── AuditContext.tsx             # Tri-market client audit queue & dispute escalation
│   │   ├── DeviceReplacementContext.tsx # 7-status device replacement lifecycle engine
│   │   ├── FieldSessionContext.tsx      # Comprehensive field state & approvals engine
│   │   └── MarketConfigContext.tsx      # Versioned market rules & geofence configuration
│   ├── features/                        # Role-specific feature modules
│   │   ├── admin/                       # HQ Admin regional console
│   │   │   ├── HqAdminDashboardPreview.tsx
│   │   │   ├── HqClientAuditOversight.tsx
│   │   │   ├── HqClientMasterImport.tsx
│   │   │   ├── HqDeviceManagement.tsx   # Direct replacement management & MDM
│   │   │   ├── HqExceptionOversight.tsx
│   │   │   ├── HqMarketConfiguration.tsx
│   │   │   ├── HqOperationsDashboard.tsx
│   │   │   ├── HqReportingExport.tsx
│   │   │   ├── HqSystemAuditLog.tsx
│   │   │   └── HqUserManagement.tsx
│   │   ├── auth/                        # Branded login screen
│   │   ├── field/                       # Salesperson mobile screens & modals
│   │   │   ├── ProfileView.tsx          # My Device & direct issue reporting
│   │   │   └── ReportDeviceIssueModal.tsx # Direct-to-HQ defect reporting modal
│   │   └── review/                      # Country Sales Head dashboard & workbenches
│   │       ├── ApprovalDecisionModal.tsx
│   │       ├── BranchApprovalsQueue.tsx
│   │       ├── ClientAuditWorkbench.tsx
│   │       ├── ClientVisitVerification.tsx
│   │       ├── CountryCsvExportModal.tsx
│   │       ├── CountryReportingView.tsx
│   │       ├── ExceptionReviewWorkbench.tsx
│   │       ├── RiskFlagsWorkbench.tsx
│   │       ├── SalesHeadDashboardPreview.tsx
│   │       └── TeamAttendanceReview.tsx
│   ├── lib/                             # Utilities, Tailwind helpers & Supabase client
│   │   ├── supabase.ts                  # Typed Supabase client wrapper
│   │   └── utils.ts                     # UI styling utilities
│   ├── types/                           # Strongly-typed schemas
│   │   └── database.types.ts            # Supabase database TypeScript definitions
│   └── test/                            # Vitest unit test suites (14 suites, 190 tests)
│       ├── at15-exclusions.test.tsx     # Strict MVP scope boundary assertions
│       ├── brand-logo.test.tsx          # Brand identity compliance assertions
│       ├── salesperson-context.test.tsx # AT-03, AT-04, PRD §4.2, §7.4, §9 tests
│       ├── stage-1c-manager-dashboard.test.tsx # Stage 1C business rules, rollups, audit, and boundary tests
│       ├── stage-1d-hq-admin.test.tsx   # Stage 1D HQ Admin & device replacement workflow tests
│       ├── stage-1e-cross-role-integration.test.tsx # Cross-role state integration tests (Workflows A-E)
│       ├── stage-3c-client-visits.test.tsx # Stage 3C real client visits, geofencing & meeting logs (18 tests)
│       ├── stage-3d-offline-sync.test.tsx  # Stage 3D durable IndexedDB journal & dependency sync (27 scenarios)
│       ├── stage-3e-manager-hq.test.tsx    # Stage 3E management dashboards, review queues & user provisioning (20 tests)
│       └── status-badge.test.tsx        # Operational status badge tests
├── scripts/
│   ├── provision-users.ts               # Official Supabase Auth Admin API account provisioning
│   ├── verify_stage_3f_vercel_e2e.py    # Live Vercel staging E2E QA suite (27 tests)
│   ├── verify_live_user_provisioning.py # Live HQ Admin user provisioning and mobile login verification
│   └── test-backend.ts                  # Stage 2B automated backend verification suite (60 tests)
├── supabase/
│   ├── functions/admin-provision-user/  # Secure GoTrue admin user provisioning Edge Function
│   └── migrations/                      # 28 sequential declarative SQL migrations
├── docs/
│   ├── provisioning.md                  # Account provisioning & credential security protocol
│   └── decisions/                       # Architecture Decision Records (ADRs 0001–0014)
├── AGENTS.md                            # Always-on Antigravity master instructions
└── package.json
```

---

## 13. Authentication & Backend Architecture (Stage 2 & Stage 3A)

The application backend runs on Supabase PostgreSQL (PostGIS) with strict Row-Level Security (RLS) and cryptographic sandboxing across Nigeria (`NG`), Zambia (`ZM`), and Malawi (`MW`).

Stage 3A integrates real, cryptographic GoTrue authentication using publishable keys:
- **Zero Service-Role Exposure:** Browser code never receives administrative credentials.
- **Trusted Profile RBAC:** User roles (`salesperson`, `country_sales_head`, `hq_admin`) and country scoping (`NG`, `ZM`, `MW`) are derived server-side from `public.profiles`.
- **Session Scoping & State Isolation:** All React operational contexts (`FieldSessionProvider`, `AuditProvider`, `DeviceReplacementProvider`) are dynamically keyed to `currentUser.id`. Signing out immediately purges in-memory operational state with zero multi-user state leakage.
- **Production-Clean Sign-In:** The login view contains no hardcoded test account shortcuts or credentials.

### Environment Configuration

Create a `.env.local` file at the project root based on `.env.example`:

```bash
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=ey... # Required for administrative provisioning scripts only
```

> **Security Note:** Never commit `.env.local` to Git. It is automatically excluded by `.gitignore`. The repository and migrations contain zero hardcoded credentials.

---

## 14. Local Development, Testing & Verification

### Prerequisites
- Node.js 18.x or later
- npm 9.x or later
- Python 3.10+ (for Playwright browser automation scripts)

### Installation & Local Dev Server
```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```

### Static Analysis & Unit Tests
```bash
# TypeScript strict type checking
npx tsc --noEmit

# ESLint static code quality audit
npm run lint

# Automated unit & integration tests (Vitest — 14 suites, 190 tests)
npm test
```

### Supabase Backend & Live Verification Tests
```bash
# Stage 2B automated backend verification suite (60 RLS, schema, and PostGIS tests)
npm run test:backend

# Stage 3A live GoTrue authentication verification (8 tests across NG, ZM, MW, HQ)
npx tsx scripts/test-stage-3a-live.ts

# Stage 3A direct API RLS negative security tests (13 tests enforcing country sandboxing)
npx tsx scripts/test-stage-3a-direct-api-auth.ts

# Stage 3B live attendance & non-visit governance verification (RPCs, RLS sole-author HTTP 403)
python scripts/verify_stage_3b_live.py

# Stage 3B final integration audit & evidence immutability verification (upsert: false, fail-closed)
python scripts/verify_stage_3b_audit_corrections.py

# Stage 3C direct API, PostGIS spoofing, storage isolation & meeting log E2E verification (10 tests)
python scripts/test_stage_3c_db_integrity.py

# Stage 3C barrier-synchronized concurrent End Day vs. Visit Check-In race test
python scripts/test_stage_3c_concurrency_race.py
```

### Playwright Browser Automation Suite
```bash
# Execute browser verification across desktop (1280px) and mobile viewports (360px, 390px, 430px)
python scripts/verify_stage_3b_browser.py
python scripts/verify_stage_3c_browser.py
python scripts/verify_stage_3d_browser.py
```

### Production Build (Vercel Preview / Production)
```bash
# Compile and bundle with strict tree-shaking and zero credential leakage
npm run build
```

---

## 15. Architecture Decision Records (ADRs) & Stage Documentation

- [ADR 0001: Project Initiation & Architecture Baseline](docs/decisions/0001-stage-0-approval.md)
- [ADR 0002: Stage 1A Design System & Brand Compliance](docs/decisions/0002-stage-1a-approval.md)
- [ADR 0003: Stage 1B Salesperson Mobile Experience](docs/decisions/0003-stage-1b-salesperson-mobile-interface.md)
- [ADR 0004: Stage 1C Country Sales Head Console](docs/decisions/0004-stage-1c-country-sales-head-dashboard.md)
- [ADR 0005: Stage 1D HQ Admin Regional Oversight & Device Fleet](docs/decisions/0005-stage-1d-hq-admin-interface.md)
- [ADR 0006: Stage 1E Frontend Quality Assurance & Cross-Role Integration](docs/decisions/0006-stage-1e-frontend-qa-and-integration.md)
- [ADR 0007: Stage 2A Backend Architecture & Planning](docs/decisions/0007-stage-2a-backend-architecture-and-planning.md)
- [ADR 0008: Stage 2B Supabase Backend Implementation & Verification](docs/decisions/0008-stage-2b-supabase-backend-implementation.md)
- [ADR 0009: Stage 3A Real Supabase Authentication & Role-Based Access Control](docs/decisions/0009-stage-3a-supabase-authentication-and-rbac.md)
- [ADR 0010: Stage 3B Real Workday Attendance & Non-Visit Governance](docs/decisions/0010-stage-3b-real-attendance-and-workday-management.md)
- [ADR 0011: Stage 3C Client Visit Database Integrity, Authoritative PostGIS Geofencing & Visit Capture](docs/decisions/0011-stage-3c-client-visit-database-integrity.md)
- [ADR 0012: Stage 3D Durable Offline IndexedDB Journal, Media Queue & Dependency Synchronisation](docs/decisions/0012-stage-3d-offline-indexeddb-journal-and-sync.md)
- [ADR 0013: Stage 3E Management Dashboards, GPS Pin Governance, Zero Bottleneck MDM & Safe CSV Exports](docs/decisions/0013-stage-3e-management-and-hq-integration.md)
- [ADR 0014: Stage 3F Staging Deployment, Physical Device QA Protocols & Staging Isolation](docs/decisions/0014-stage-3f-staging-deployment-and-field-pilot-readiness.md)

### Technical Implementation & QA Reports
- [Stage 3B Attendance Implementation Guide](docs/implementation/STAGE_3B_ATTENDANCE.md)
- [Stage 3B QA & Security Verification Report](docs/testing/STAGE_3B_QA_REPORT.md)
- [Stage 3C Client Visit Capture Implementation Guide](docs/implementation/STAGE_3C_VISIT_CAPTURE.md)
- [Stage 3C QA & Security Verification Report](docs/testing/STAGE_3C_QA_REPORT.md)
- [Stage 3D Offline Sync Implementation Guide](docs/implementation/STAGE_3D_OFFLINE_SYNC.md)
- [Stage 3D QA & Security Verification Report](docs/testing/STAGE_3D_QA_REPORT.md)
- [Stage 3E Management & HQ Implementation Guide](docs/implementation/STAGE_3E_MANAGER_HQ.md)
- [Stage 3E QA & Security Verification Report](docs/testing/STAGE_3E_QA_REPORT.md)
- [Stage 3F End-to-End QA & Staging Implementation Guide](docs/implementation/STAGE_3F_FIELD_QA.md)
- [Stage 3F QA & Field Pilot Readiness Report](docs/testing/STAGE_3F_QA_REPORT.md)

---

## 16. License

Proprietary — Internal application developed for **Carbon Car Care**. All rights reserved.

