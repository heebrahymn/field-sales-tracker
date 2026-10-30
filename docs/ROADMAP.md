# Carbon Field Sales Tracker — Development Roadmap

**Project:** Carbon Field Sales Tracker  
**Business:** Carbon Car Care  
**Reference:** PRD v1.2 (MVP Updated)  
**Last Updated:** October 30, 2026  
**Current Milestone:** Stage 3F Completed, Supabase SSoT, Admin Governance & Country Review/Sync Governance Completed (Controlled Field Pilot Prepared; Business Rollout Awaiting Authorization)  

---

## 1. Project Milestone Status

```
[✓] Stage 0  — Technical Architecture, Database Model & Implementation Plan (ADR 0001)
[✓] Stage 1  — Frontend Development & Cross-Role Walkthroughs (ADRs 0002–0006)
               ├─ 1A: Design System, Brand Compliance, Application Shell
               ├─ 1B: Salesperson Mobile Interface & Visit Workflows
               ├─ 1C: Country Sales Head Dashboard & Reviews
               ├─ 1D: HQ Admin Regional Console & Device Management
               └─ 1E: Frontend Integration QA & Cross-Role Tests
[✓] Stage 2  — Supabase Backend, Schema Migrations & RLS Security (ADRs 0007–0008)
               ├─ 2A: Backend Architecture Plan
               └─ 2B: 25 SQL Migrations, PostGIS, Storage, RLS Policies
[✓] Pre-3    — Product Audit, Terminology Standardization & Usability Fixes
[✓] Stage 3A — Real Supabase Authentication & Role-Based Access Control (ADR 0009)
[✓] Stage 3B — Real Attendance & Workday Management (ADR 0010)
[✓] Stage 3C — Real Client Visits, Authoritative PostGIS Geofencing, Camera Evidence & Meeting Logs (ADR 0011, Migrations 00026–00027)
[✓] Stage 3D — Offline IndexedDB Journal, Media Queuing & Dependency Sync (ADR 0012)
[✓] Stage 3E — Management Dashboards, GPS Pin Governance, Zero Bottleneck MDM, Safe CSV Exports & Dispute Resolution (ADR 0013)
[✓] Stage 3F — End-to-End QA, Physical Device Protocols, Vercel Staging Deployment & Pilot Readiness (ADR 0014)
[✓] SSoT     — Supabase Development Single Source of Truth & Mock Data Elimination (ADR 0015)
[✓] Admin/Cam — Device & User Governance, Pagination, Manual Dialog Dismissals & Mobile Camera Switching (ADR 0016)
[✓] Review/Sync — Country Sales Head Reviews, Dedicated Non-Visit Screen, Bidirectional Real-Time Sync & Storage Bucket Alignment (ADR 0017)
[✓] Reassign/Sync — HQ Admin Device Reassignment Supersession, Spare Allocation RPC Alignment & Central Inventory Governance (ADR 0018)
[ ] Field Pilot — Controlled Real-Device Field Pilot (Samsung Galaxy A15 / Nokia G22 in Lagos, Lusaka, Blantyre)
[ ] Operational Rollout — Multi-Market Business Production Rollout across Nigeria, Zambia, and Malawi
```

---

## 2. Completed Milestones

### Stage 0: Architecture & Foundation
- Detailed mapping of PRD v1.2 functional requirements and acceptance tests (AT-01–AT-16).
- MVP boundaries established: zero quotations, orders, pipelines, automated task schedulers, or continuous GPS tracking.
- Database ERD with PostGIS spatial types for client coordinates.

### Stage 1 (1A–1E): High-Fidelity Frontend
- Pixel-perfect, responsive frontend for Field Salespeople, Country Sales Heads, and HQ Administrators.
- Carbon Car Care brand mark (`#21409A`, `#1B9A4A`, `#E8CF2F`) with Manrope typography.
- Simulated operational workflows demonstrating start day, visits, meeting notes, exceptions, branch registration, and manager approvals.
- 100% test coverage for frontend components and cross-role state handoffs.

### Stage 2 (2A–2B): Supabase Backend & Database Security
- Hosted Supabase development database initialized (`[SUPABASE_PROJECT_ID]`).
- 25 applied SQL migrations establishing 24 canonical tables, enums, indexes, and RPC procedures.
- Comprehensive PostgreSQL Row-Level Security (RLS) enforcing strict country sandboxing (`NG`, `ZM`, `MW`).
- Private storage buckets (`attendance-selfies`, `premises-photos`, `meeting-cards`, `exception-evidence`) with path-based RLS (`auth.uid()`).

### Pre-Stage 3: Product Audit & Usability Fixes
- Independent live deployment audit (`scripts/audit_live_site.py`).
- Keyboard-accessible persistent Sync Queue navigation.
- Accessible sticky mobile footer CTA for visit workflows on compact screens.
- Standardized terminology across Rep and Manager views ("Add Client", "Clients & Locations").

### Stage 3A: Real Supabase Authentication & RBAC
- Official GoTrue password authentication via public publishable keys.
- Trusted database profile roles (`public.profiles`) derived from `auth.uid()`.
- Country sandboxing enforced by RLS at both UI and direct API levels.
- Session-scoped React context providers preventing multi-user state bleed.
- Removed development account helper drawers for production readiness.
- Company handset inventory asset tag display (`CAR-SPR-117352`).

### Stage 3B: Real Attendance & Workday Management (ADR 0010)
- Canonical PostgreSQL persistence in `public.attendance_days` with PostGIS point geometry.
- Live front-camera selfie capture via HTML5 MediaStreams; auto-released camera hardware tracks.
- Private Cloud Storage uploads to `attendance-selfies/${userId}/...` with 300-second signed URL inspection for managers.
- Fresh GPS satellite fix acquisition validating accuracy ≤ 100m (AT-01, AT-02).
- Automatic workday persistence and cross-session restoration across reload/login.
- AT-03 hard block on End Day when open client visit session exists.
- Non-visit workday governance via RPCs (`request_non_visit_workday`, `review_non_visit_workday`), strictly enforcing attendance compliance with zero physical-visit target credits.
- PostgreSQL RLS enforcement of salesperson sole-authorship (CSH direct insert returns HTTP 403).

### Stage 3C: Real Client Visits, Authoritative PostGIS Geofencing, Camera Evidence & Meeting Logs (ADR 0011, Migrations 00026 & 00027)
- Applied Migrations 00026 (`20261028000026_stage_3c_visit_integrity_and_triggers.sql`) and 00027 (`20261028000027_stage_3c_authoritative_geofence_verification.sql`) to Supabase remote dev project `[SUPABASE_PROJECT_ID]`.
- Bi-directional transaction-safe locking model (`FOR UPDATE` on open normal visits during End Day; `FOR SHARE` on parent `attendance_days` during visit check-in) verified under concurrent barrier-synchronized race testing (`scripts/test_stage_3c_concurrency_race.py`).
- Authoritative server-side PostGIS geofence verification (`ST_Distance(check_in_geom::geography, pin_geom::geography)`) computing WGS84 ellipsoidal distance and overriding client-supplied `location_classification` to prevent spoofing (`inside_confident` rejected when $d + a > r$).
- Real client (`public.organisations`) and physical location (`public.branches`) selection starting with zero preselected client, approved/pending GPS pin retrieval (`public.branch_location_pins`), and contact loading (`public.client_contacts`).
- Live rear-camera premises photo viewfinder (`facingMode: { ideal: 'environment' }`) with private Storage upload (`visit-premises-photos/${userId}/...`, `upsert: false`) and automatic cleanup if DB insert fails.
- Authoritative active visit restoration across browser reloads and re-logins (`visitService.getActiveVisit`).
- Outside-geofence checkout permitted with acknowledgement modal and audit flag (`Checkout Outside Geofence (>200m)`) while preserving original `location_verified` check-in classification (`trg_preserve_visit_checkin_evidence_on_update`).
- Canonical `public.meeting_logs` persistence with free-text next steps only (AT-15) and automatic fallback queuing if submission fails after checkout.
- Verified via 143/143 Vitest tests, 10/10 direct API/PostGIS/Storage tests (`scripts/test_stage_3c_db_integrity.py`), concurrency race test, and Playwright E2E multi-viewport suite (`scripts/verify_stage_3c_browser.py`).
- Physical Android hardware acceptance explicitly documented as **NOT TESTED** in local/CI workstation environment.

### Stage 3D: Offline IndexedDB Journal, Media Queuing & Dependency Sync (ADR 0012)
- Durable `Dexie.js` IndexedDB database (`CarbonOfflineJournalDB` in `src/services/offlineSyncService.ts`) with `eventJournal`, `mediaQueue` (`Uint8Array` binary storage), and `cachedContext` tables partitioned strictly by `ownerUserId`.
- Topological dependency-aware synchronisation (`ATTENDANCE_START_DAY → VISIT_CHECKIN → VISIT_CHECKOUT → MEETING_LOG_SUBMIT → ATTENDANCE_END_DAY`) enforcing `pending → syncing → synced`, `failed`, `needs_review`, and `blocked_dependency` states.
- Safe App-Shell Service Worker (`public/sw.js`) caching same-origin static assets (strictly excluding `*.supabase.co` API/Storage endpoints) plus `AuthContext` offline profile recovery so browser reloads and cold-starts while offline preserve session and queue state.
- Capture-time `branchPinId`/`branchPinVersion` and `ruleVersionId`/`ruleVersionTag` immutability (transitions to `needs_review` without silent substitution if changed), sync-execution-boundary JWT/active-profile authorization, idempotent media uploads (`attendance-selfies`, `visit-premises-photos`, `business-cards`), duplicate-key `23505` reconciliation, bounded exponential backoff, clock anomaly detection, and browser storage quota telemetry.
- Verified via 170/170 Vitest tests (including 27 Stage 3D scenarios in `src/test/stage-3d-offline-sync.test.tsx`) and the Full 16-Step Offline Workday, App-Shell Cold-Start & Multi-User Isolation Browser E2E suite (`scripts/verify_stage_3d_browser.py`).
- Physical Android hardware acceptance explicitly documented as **NOT TESTED** in local/CI workstation environment.

---

## 3. Upcoming Implementation Phases

### Stage 3E: Management Dashboards, GPS Pin Governance, Zero Bottleneck MDM & Safe CSV Exports (ADR 0013)
- Country Sales Head console (`src/services/managementService.ts`) connected to real Supabase tables and RPCs, strictly sandboxed to assigned market (`profiles.market_code = branches.market_code`).
- Managerial non-origination invariant enforced: managers and HQ admins never originate attendance records, client visits, GPS fixes, or photographs for salespeople.
- Location Unverified Invariant on approved visit exceptions (PRD §7.3, §8.1 / AT-06): approved missing-GPS or device-depletion visit exceptions remain `manager_approved_unverified` and are never converted to GPS verified.
- GPS Pin Governance (PRD §7.1): Salesperson proposes GPS pin coordinates and premises photo; Country Sales Head approves or rejects via RPCs `approve_branch_location_pin` / `reject_branch_location_pin` with mandatory rationale; approval activates versioned pin while historical visits preserve original capture-time pin references.
- Zero Bottleneck Company Device Replacement (PRD §6.5): Salesperson submits replacement requests directly to HQ Admin; Country Sales Heads have zero approval or submission gate. HQ Admin reviews (`hq_review_device_replacement`), dispatches replacement handset from central depot spare inventory (`hq_dispatch_replacement_device`), and confirms Knox MDM activation (`hq_confirm_replacement_activation`) while recording old device disposition (`returned_to_depot`, `quarantined`); `uq_single_active_device_per_rep` strictly preserved.
- 5% Random Weekly Audit Sampling & Dispute Workflow (PRD §8.3 / AT-09, AT-10): Samples completed visits; records call results; client denial automatically sets dispute status to `under_investigation` and raises `audit_dispute` verification flag; managerial inquiry dispute resolution (`resolve_client_audit_dispute`).
- Formula-Safe Audited CSV Export (PRD §10): Mitigates spreadsheet formula injection (CWE-1236) by sanitizing cells beginning with `=, +, -, @, \t, \r` with single-quote prefix, and logs audit events to `public.export_jobs`.
- Client Master ERP Ingestion (PRD §4.2 / AT-08): CSV onboarding pipeline allowing shared parent company phone numbers across different branches, marking unpinned branches as `location_pending`, and logging batches to `public.import_batches`.
- Verified via 187/187 Vitest tests (including 17 Stage 3E integration tests in `src/test/stage-3e-manager-hq.test.tsx`), live Supabase database integrity suite (`scripts/test_stage_3e_db_integrity.py`), and 15 multi-viewport browser screenshots (`scripts/verify_stage_3e_browser.py`).

---

### Stage 3F: End-to-End QA, Physical Device Protocols & Staging Deployment (Completed)
- **Objective:** Final hardening, live Vercel staging deployment, multi-viewport verification, and physical handset test protocols.
- **Accomplishments:**
  - Deployed to live Vercel staging environment (`https://field-sales-tracker-b6l7.vercel.app/`).
  - Executed 27/27 passing Playwright live staging tests across all roles and viewports (390x844, 360x800, 1280x800).
  - 187/187 Vitest unit and integration tests passing; 9/9 live Supabase security suites passing.
  - Prepared formal Physical Device Testing Protocols for Samsung Galaxy A15 and Nokia G22 handsets (`STAGE_3F_FIELD_QA.md`).
  - Established ADR 0014 governing staging deployment isolation and field pilot readiness.

---

## 3. Upcoming Implementation Phases

### Field Pilot: Controlled Real-Device Field Execution
- **Objective:** Controlled 2-week field pilot with designated salespeople in Lagos, Lusaka, and Blantyre.
- **Scope:**
  - IT commissioning of company-issued Samsung Galaxy A15 and Nokia G22 handsets.
  - PWA standalone installation via Chrome Mobile.
  - Real-world GNSS satellite acquisition under varying weather and urban density.
  - Cellular connectivity testing (LTE, 3G, and Airplane mode offline journaling).
  - Validation of rear camera premises photos and front camera selfie captures.
- **Approval Gate:** Formal field pilot evaluation report and stakeholder operational sign-off.

### Operational Rollout: Multi-Market Business Go-Live
- **Scope:**
  - Production client master CSV ingestion following ERP header verification and administrative approval.
  - Organization-wide employee onboarding across Nigeria, Zambia, and Malawi.
  - Enterprise monitoring and operational SLA tracking.

---

## 4. Special Workflows & MVP Exclusions

### ERP Client Master Import
- Direct ERP API integration is **outside MVP scope**.
- A semi-automated, 4-step CSV/XLSX import wizard is provided in the HQ Admin portal (`ERP Export → Clean → Import → Review`).
- Imported coordinates are treated as unverified reference locations until approved by the Country Sales Head.

### Strict Non-Commercial Boundaries
The following features are permanently excluded from the MVP baseline:
- No quotation creation, pricing values, or discount approvals.
- No commercial purchase orders, invoicing, or revenue tracking.
- No sales pipeline deal conversion stages or financial analytics.
- No continuous GPS tracking or route breadcrumb mapping.
- No automated follow-up calendar task management.
