# ADR 0004: Stage 1C Implementation — Country Sales Head Dashboard & Review Workbenches

**Date:** 2026-10-20  
**Status:** Completed & Approved  
**Context:** Full implementation of Stage 1C — Country Sales Head Dashboard for the Carbon Field Sales Tracker PWA using the approved React, TypeScript, Tailwind CSS v4, and shadcn/ui architecture.

---

## 1. Executive Summary

Stage 1C completes the operational management, review, and audit layer for the assigned Country Sales Head (Nigeria, Zambia, Malawi markets). It establishes strict managerial oversight, auditable decision-making, and risk governance while upholding non-negotiable PRD boundaries:
1. **Managers Never Originate Salesperson Logs:** All visit logs, GPS failures, device failures, and missed-visit exceptions are originated exclusively by field salespeople. Country Sales Heads review, approve, reject, comment, or escalate, but can never create records on behalf of a salesperson.
2. **Distinct Verification Classifications:** Approved missing-GPS visits remain **Manager Approved — Location Unverified** and are never converted to GPS Verified.
3. **CWE-1236 Formula Injection Defense:** All exported CSV records strictly escape formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) with leading single quotes (`'`).
4. **Strict MVP Exclusions Enforced:** Zero quotation workflows, order values, commercial sales pipelines, automated task managers, or revenue metrics.

---

## 2. Implemented Modules & Workbenches

### 2.1 Module 1: Operational Dashboard (`SalesHeadDashboardPreview.tsx`)
- **Daily, Weekly, and Quarterly Activity Summaries:** Interactive toggle between daily live events, weekly rollups, and quarter-to-date coverage.
- **5 Distinct Counting KPI Cards:**
  1. *Active Reps:* Scheduled vs present, with breakdown of approved leave and authorised training.
  2. *Location Verified Visits:* Verified by valid GPS fix ($\le 100\text{m}$) within geofence perimeter ($\le 200\text{m}$) and live camera photo.
  3. *Approved Unverified Activity:* Rep-submitted exceptions signed off by management; kept strictly isolated from GPS targets.
  4. *Missing Meeting Logs:* Overdue visits exceeding the 2-hour post-checkout SLA.
  5. *Urgent Risk Flags:* Open tripwire anomalies requiring investigation.
- **Provisional Data Reconciliation Marker:** Labels live daily metrics as provisional subject to the 19:00 daily sync reconciliation cutoff per PRD §10.
- **Unified Navigation Bar:** Horizontal module switcher pills allowing instantaneous tab switching on desktop, tablet, and mobile views.

### 2.2 Module 2: Team and Attendance Management (`TeamAttendanceReview.tsx`)
- **Assigned Country Roster:** Displays sales representatives, assigned territories, company device ID bindings (`SM-A546B`), live battery levels, and attendance states.
- **Start Day Telemetry Inspection:** Modal previewing the front-camera live selfie check-in (no biometric matching claimed per MVP scope), initial GPS coordinates, fix accuracy ($\pm 12\text{m} \le 50\text{m}$), and timestamp.
- **Non-Visit Workday Requests:** Review workbench for salesperson-requested training, proposal preparation, or virtual meetings. Manager approvals count toward attendance but explicitly **zero** towards physical visit targets (PRD §7.6).
- **Administrative Leave Action:** Manager dialog to record approved annual, sick, or compassionate leave, updating rep attendance and removing them from expected daily scheduling.

### 2.3 Module 3: Client and Branch Approvals (`BranchApprovalsQueue.tsx`)
- **Proposed Branch Queue:** Full review workbench for newly registered companies and branch facilities.
- **GPS Pin Accuracy Gate:** Inspects reported pin accuracy against the mandatory PRD $\le 50\text{m}$ threshold.
- **PRD §4.2 Shared Telephone Compliance:** Detects multiple branches sharing a switchboard phone number; flags as compliant and prevents automatic duplicate rejection.
- **Live Premises Photograph:** Displays watermarked photo captured at the facility entrance.
- **Audit Decision Modal:** Requires a documented manager rationale for every approval or rejection, logging to `approval_audit`.

### 2.4 Module 4: Exception Approval Workbench (`ExceptionReviewWorkbench.tsx`)
- **Failure Class Triage:** Review queue for rep-created GPS-failure logs (underground concrete facilities, RF interference), device-failure logs (battery depletion, retrospective recovery submissions), and missed-visit submissions (security access refusal).
- **Evidence & Telemetry Review:** Inspects claimed duration, submission lag, contact person met, products discussed, and technical cause.
- **Decision Engine:** Manager can approve, reject, comment, or escalate. Mandatory rationale is enforced.
- **Status Transition:** Approving updates status to **Manager Approved — Location Unverified**.

### 2.5 Module 5: Client Visit Verification (`ClientVisitVerification.tsx`)
- **Elevated Dedicated Screen:** Accessible via desktop sidebar item, top pill navigation, and "View all →" on the Location Verified KPI card.
- **Visit Audit Records:** Comprehensive audit view distinguishing physical location verification from meeting log completeness.
- **GPS Evidence & Geofence Check:** Inspects check-in coordinates, accuracy, registered branch pin, and calculated distance (e.g., $42\text{m} \le 200\text{m}$ passed).
- **Meeting Log Inspection:** Contact met, role, visit purpose, products discussed, reported fleet size, and narrative outcome.
- **PRD Exclusions Compliance:** Next step is strictly restricted to free-text narrative; zero reminder tasks or due dates.
- **Detailed Audit Modal:** Full-fidelity inspector with live premises photograph preview and client audit status.

### 2.6 Module 6: Audit and Risk Monitoring (`RiskFlagsWorkbench.tsx` & `ClientAuditWorkbench.tsx`)
- **Suspicious Activity Flags Queue (`RiskFlagsWorkbench.tsx`):**
  - Out-of-bounds checkout ($>200\text{m}$ from branch pin; permitted to close visit per PRD §7.4, but flagged).
  - Rapid travel ($>80\text{ km/h}$ apparent velocity).
  - Short visit ($<5\text{ minutes}$ duration).
  - Late meeting log ($>2\text{ hours}$ SLA breach).
  - High offline event share ($>30\%$).
  - Decision options: *Dismiss with Justification*, *Request Rep Explanation*, or *Confirm Policy Violation*.
- **Client Audit Phone Call Workbench (`ClientAuditWorkbench.tsx`):**
  - Weekly 5% random audit sampling queue (PRD §8.3 / AT-10) plus risk-targeted calls.
  - Interactive call verification script:
    1. In-person meeting confirmation.
    2. Products discussed confirmation.
    3. Detailed interview notes.
  - **Confirmed Meetings:** Marked as `Client Confirmed` with preserved auditor notes.
  - **Client Denials & Dispute Creation:** Immediately transitions visit to **Disputed — Pending Review** for human management inquiry, never automated disciplinary action.
  - **Unreachable Clients & Repeated Call Attempts:** Increments call attempts count and re-queues without penalizing the representative.
  - **Dispute Investigation & Resolution Workbench:** Managerial inquiry modal allowing documentation of representative explanations, secondary verification checks (gate security/logbook), and resolution as either `resolved_cleared` or `resolved_violation`.
  - **Audit History Preservation:** Retains original client denial statements, subsequent findings, timestamps, and reviewer attribution.
  - **Search & Filtering:** Search by client, branch, rep, or ID, and filter by status and sample type.

### 2.7 Module 7: Multi-Dimensional Rollups & Safe CSV Exports (`CountryReportingView.tsx` & `CountryCsvExportModal.tsx`)
- **Multi-Dimensional Rollups:** Daily, weekly, and quarterly breakdown of verified visits, approved unverified visits, unique branches visited, offline event share, and log compliance.
- **Multi-Parameter Filter Bar:**
  - Filter records by **Salesperson** (`All Salespeople` or individual reps).
  - Filter records by **Date Range** (`Daily`, `Weekly`, `Quarterly`, or `Custom Date Range` with start/end date pickers).
  - Filter records by **Client Branch** (`All Branches` or specific facility codes).
  - Filter records by **Verification Status** (`All Statuses`, `Location Verified`, `Approved Unverified`, `Missing Log`, `Disputed`).
  - Active filter tags with one-click removal and "Reset all filters" control.
- **Dynamic Data Breakdown:**
  - Tab 1: Sales Representative Operational Breakdown (preserves approved comparative layout with filtered slice).
  - Tab 2: Individual Visit Records (Filtered) (granular audit trail with status badges, offline sync markers, and log SLA duration).
- **Safe CSV Download Simulation:**
  - Formula injection mitigation: Automatically escapes any cell beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` by prefixing a single quote (`'`).
  - Downloads actual `.csv` file via browser Blob URL with active filter inheritance.

---

## 3. Verification & Automated Test Results

- **TypeScript Compilation:** `npx tsc --noEmit` verified with **0 errors**.
- **Vitest Test Suite:** `vitest run` executed with **31 passed tests across 5 test suites**:
  - `src/test/stage-1c-manager-dashboard.test.tsx` (18 tests: formula injection escaping, verification states distinction, PRD §4.2 shared phone compliance, MVP exclusions, rollups, multi-parameter filtering, client audit workflows, repeated attempts, dispute investigation, and role security boundary).
  - `src/test/salesperson-context.test.tsx` (5 tests).
  - `src/test/status-badge.test.tsx` (4 tests).
  - `src/test/brand-logo.test.tsx` (2 tests).
  - `src/test/at15-exclusions.test.tsx` (2 tests).
- **Production Build:** `npm run build` (`tsc -b && vite build`) generated production bundle in 11.58s without errors.
- **Local Dev Server:** Verified HTTP 200 on `http://localhost:5173/`.

---

## 4. Modified & Created Files Summary

| File | Action | Purpose |
|---|---|---|
| `src/features/review/SalesHeadDashboardPreview.tsx` | Modified | Master Country Sales Head dashboard orchestrating all 7 modules with quick-switching pills |
| `src/features/review/BranchApprovalsQueue.tsx` | Created | Client branch registration and GPS pin verification workbench ($\le 50\text{m}$ gate, shared phone compliance) |
| `src/features/review/ExceptionReviewWorkbench.tsx` | Created | Rep-created GPS/device failure and missed-visit exception triage workbench |
| `src/features/review/ClientVisitVerification.tsx` | Created | Dedicated visit evidence inspector (GPS geofence, premises photo, meeting logs, free-text next steps) |
| `src/features/review/RiskFlagsWorkbench.tsx` | Created | Suspicious activity flags triage queue (rapid travel, out-of-bounds checkout, short visits) |
| `src/features/review/ClientAuditWorkbench.tsx` | Created | 5% weekly random sampling, repeated call attempts, dispute investigation and resolution workbench |
| `src/features/review/TeamAttendanceReview.tsx` | Created | Sales reps roster, Start Day selfie/GPS telemetry inspection, non-visit approvals, approved leave action |
| `src/features/review/CountryReportingView.tsx` | Created | Multi-dimensional rollups, multi-parameter filters (rep, date, branch, status), and granular records inspection |
| `src/features/review/CountryCsvExportModal.tsx` | Created | Audited CSV export modal with CWE-1236 formula injection sanitization and filter inheritance |
| `src/components/layout/AppShell.tsx` | Modified | Connected `activeDesktopSection` and `setActiveDesktopSection` to `SalesHeadDashboardPreview` |
| `src/components/layout/DesktopSidebar.tsx` | Modified | Added dedicated `visits` ('Client Visit Verification') navigation item with badge count 34 |
| `src/components/ui/card.tsx` | Modified | Restored natural padding by removing hardcoded `pt-0` default |
| `src/test/stage-1c-manager-dashboard.test.tsx` | Created | Automated Vitest test suite for Stage 1C business rules and workflows |
| `docs/decisions/0004-stage-1c-country-sales-head-dashboard.md` | Created | This architectural decision record |

---

## 5. Next Approval Gate

Stage 1C has been verified and approved.
- All Stage 1C code committed with `feat: complete Stage 1C Country Sales Head Dashboard`.
- Tagged with annotated git tag `stage-1c-approved`.
- **Awaiting user instruction before starting Stage 1D — HQ Admin Regional Oversight Console.**
