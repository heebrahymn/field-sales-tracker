# ADR 0003: Stage 1B Implementation — Complete Salesperson Mobile Interface

**Date:** 2026-10-16  
**Status:** Completed & Pending Stakeholder Review  
**Context:** Full implementation of Stage 1B — Salesperson Mobile Interface for the Carbon Field Sales Tracker PWA using the approved Stage 1A design system tokens, components, and layout architecture.

---

## 1. Implemented Screens and Interactive Workflows

### 1.1 Salesperson Home Dashboard (`SalespersonHomePreview.tsx`)
- Operational header displaying greeting, salesperson name, employee ID, assigned market (`Nigeria / Lagos - WAT`), and active workday status badge.
- Active visit summary card with live elapsed timer, branch designation, distance, check-in coordinate, and quick-action buttons.
- Context-aware primary field action tiles (Start/End Day with active visit block, Resume Active Visit, Add Branch, My Exceptions, Non-Visit Request, Sync Now).
- Real-time today's activity counters (Location Verified, Manager Approved Unverified, Exceptions).
- Dynamic list of completed physical visit records with status badges and audit flag labels.

### 1.2 Start Day and End Day (`StartDayModal.tsx` & `EndDayModal.tsx`)
- **Start Day:** Simulated front-camera viewfinder with framing overlay, live selfie capture silhouette, timestamp and coordinate watermark, fresh GPS accuracy check (satellite lock, ±12m reported accuracy within ≤100m threshold), and workday commencement logging.
- **End Day (PRD §6.1 / AT-03 Enforcement):** Strict hard block modal preventing workday closure while an active physical visit session remains open. Displays resolution guidance (proceed to check out, or file an abandoned visit exception).
- When clear of active visits, displays full day summary metrics, total completed visits, verification breakdown, and closing GPS coordinate.

### 1.3 Client & Branch Management (`ClientsDirectoryView.tsx` & `RegisterBranchModal.tsx`)
- Interactive search across parent company name, branch designation, facility code, and street address.
- Outdoor-friendly filter chips: All, Nearby (<500m), Haulage & Depots, Pending Review.
- **Shared Company Phone Rule Compliance (PRD §4.2):** Explicitly supports multiple distinct branches sharing the same switchboard telephone number (`+234 1 270 5000`); flags them as compliant and prevents automatic duplicate rejection.
- **Register Branch Modal:** Captures company name, branch name, category, street address, landmark, site contact person (Name, Role, Direct Phone), proposed GPS pin (with accuracy check ≤50m required by PRD), and live premises photo preview. Submits as `pending_approval` for Country Sales Head review.

### 1.4 Client Visit Workflow (`VisitWorkflowView.tsx`)
- 6-step physical visit flow:
  1. Target branch selection.
  2. GPS geofence validation with interactive test controls:
     - Preset A: Inside geofence (38m / 200m, GPS ±14m).
     - Preset B: Outside geofence (340m, GPS ±18m).
     - Preset C: Degraded GPS (±140m > 100m limit, advising outdoor movement or exception filing).
  3. Live rear-camera premises photo preview with timestamp & GPS coordinate watermark.
  4. Check-in action (enforcing AT-04 single active normal visit rule).
  5. Active visit session with real-time ticking elapsed timer (`MM:SS`).
  6. Check-out action with outside-geofence warning: per PRD §7.2 / AT-05, check-out outside the 200m perimeter is permitted and never blocks closure, but raises an audit flag (`Checkout Outside Geofence`) for manager review.

### 1.5 Meeting Logs (`MeetingLogModal.tsx`)
- Captures contact person met, visit purpose (from PRD approved categories), products discussed (multi-select), narrative meeting outcome, and optional business-card photograph capture preview.
- **Next Step Description:** Strictly constrained to free-text narrative format. Creates zero reminder tasks, due dates, or automated pipeline updates (enforcing PRD MVP exclusions).
- **Submission Timing:** Supports immediate submission at check-out or 2-hour SLA deferral without penalty.

### 1.6 GPS and Device Failure Exceptions (`ExceptionsWorkbenchView.tsx` & `CreateExceptionModal.tsx`)
- **Strict Rep-Only Submission Authority (PRD §7.4):** Enforced both in UI copy and data flow: only the salesperson creates and submits failure or missed visit claims. Managers review, approve, or reject, but never create records for salespeople.
- 4 exception categories supported: GPS Signal Failure, Camera Hardware/Capture Failure, Handset Battery Depletion & Retrospective Submission, Missed Physical Visit Claim.
- Displays submitted claims with manager decision status: `pending_review`, `approved_unverified` ("Manager Approved — Location Unverified" per PRD §2 approved decision), and `rejected`.

### 1.7 Non-Visit Workday Requests (`NonVisitDayModal.tsx`)
- Allows salesperson to submit authorised non-field activity requests: Proposal Preparation (Office), Technical Training, Virtual Client Meeting, Internal Operations Review, Administrative Work.
- PRD governance banner: clarifies that approved non-visit days count toward attendance, but strictly **zero** physical visit targets.

### 1.8 Offline Queue & Synchronisation (`OfflineSyncView.tsx`)
- Cellular network simulation controls (Online vs Offline / Airplane mode).
- Interactive "Sync Now" trigger with animated server synchronization.
- Demonstrates durable IndexedDB event journal showing monotonic sequence counters, event types (`ATTENDANCE_EVENT`, `VISIT_CHECKIN`, `VISIT_CHECKOUT`, `MEETING_LOG`), timestamps, and client-generated UUID idempotency keys (`evt-8f4b-2291-a10c`).
- Educational note on offline resilience, dependency-ordered uploads, and tamper-proof constraints.

---

## 2. Technical Quality & Verification Results

- **TypeScript Compilation:** Passed cleanly with `npx tsc --noEmit` (0 errors, strict mode enforced).
- **Frontend Test Suite:** 13 unit tests passed across 4 test files in Vitest (brand logos, status badges, strict MVP exclusions, and salesperson context-aware rules).
- **Production Bundle:** Successfully compiled via `npm run build` in 5.11s.
- **Mobile Responsiveness:** Tested and verified on 390px mobile viewport (`390x844`), tablet viewports, and desktop viewports. Minimum 48px touch targets maintained across all primary mobile actions.

---

## 3. Explicitly Identified Simulated Functionality

All Stage 1B functionality remains fully simulated using mock data:
1. **GPS & Geolocation:** Coordinates, satellite fix status, and horizontal uncertainty meters are simulated (interactive test presets provided to toggle inside/outside/degraded GPS).
2. **Camera Hardware:** Camera viewfinders, silhouettes, and premises photo previews are simulated.
3. **Offline Queue:** IndexedDB journal and server synchronization progress are simulated in browser memory.
4. **Authentication:** User sessions and role profiles are simulated via `AuthContext`.

Live Supabase database integration, PostgreSQL schema migrations, Row-Level Security policies, and hardware API bindings are scheduled for subsequent stages.

---

## 4. Next Step & Stop Gate

In accordance with `AGENTS.md` and user instructions, execution has halted at the Stage 1B boundary. Awaiting stakeholder review and approval before proceeding to **Stage 1C — Country Sales Head Dashboard**.
