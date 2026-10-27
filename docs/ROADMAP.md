# Carbon Field Sales Tracker — Development Roadmap

**Project:** Carbon Field Sales Tracker  
**Business:** Carbon Car Care  
**Reference:** PRD v1.2 (MVP Updated)  
**Last Updated:** October 27, 2026  
**Current Milestone:** Stage 3B Completed & Validated (Stage 3C Awaiting Authorization)  

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
[ ] Stage 3C — Real GPS Geofencing, Live Camera Capture & Client Visit Integration (Awaiting Authorization)
[ ] Stage 3D — Offline IndexedDB Journal, Media Queuing & Dependency Sync
[ ] Stage 3E — Management Dashboards, Safe CSV Exports & Dispute Resolution
[ ] Stage 3F — Security Audit, Real-Device QA & Pilot Deployment
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

---

## 3. Upcoming Implementation Phases

### Stage 3C: Real GPS Geofencing, Live Camera Capture & Client Visit Integration (Next Phase — Awaiting Authorization)
- **Objective:** Activate live database writes to `public.visits`, `public.meeting_logs`, and `public.visit_photos`.
- **Scope:**
  - Live Browser Geolocation API integration with satellite accuracy checks (≤ 100m for visits, ≤ 50m for proposed pins).
  - Server-side geofencing RPC (`check_geofence_status`) computing 200m radius against client branch PostGIS coordinates.
  - Mandatory on-site premises photography via HTML5 rear-camera viewfinder; upload to `premises-photos` bucket.
  - Check-in / check-out state transitions with permitted outside-geofence checkouts raising review flags (AT-05).
  - Meeting log submission (contact met, purpose, products, narrative outcome, free-text next steps).
- **Approval Gate:** End-to-end visit verification test suite and image upload verification.

### Stage 3D: Offline IndexedDB Journal, Media Queuing & Dependency Sync
- **Objective:** Resilient offline field capability for remote and connectivity-constrained markets.
- **Scope:**
  - Dexie.js IndexedDB schema with monotonic event sequencing and UUID idempotency keys.
  - Blob media caching in IndexedDB during offline conditions.
  - Ordered dependency-based synchronization engine (`ingest_activity_events` RPC).
  - Conflict resolution, identical retry idempotency, and clock drift anomaly detection.
  - Offline sync status indicator and manual "Sync Now" trigger.
- **Approval Gate:** Simulated network disconnection tests, offline queue processing, and duplicate prevention audit.

### Stage 3E: Management Dashboards, Safe CSV Exports & Dispute Resolution
- **Objective:** Live managerial oversight and operational reconciliation for Country Sales Heads and HQ Admin.
- **Scope:**
  - Real-time attendance and visit review feeds filtered by assigned market.
  - Branch registration and proposed location pin approval queues.
  - Algorithmic risk flag review workbench.
  - Client audit phone call workbench (5% random weekly sampling + risk-triggered audits).
  - Formula-safe CSV export module escaping spreadsheet formula injection vectors.
  - HQ Regional multi-market analytics and device inventory custody console.
- **Approval Gate:** Manager review workflow test suite and CSV formula injection penetration test.

### Stage 3F: Security Audit, Real-Device QA & Pilot Deployment
- **Objective:** Final hardening, pilot testing in Nigeria, and production sign-off.
- **Scope:**
  - Independent penetration test and RLS privilege escalation review.
  - Field QA on actual company-issued Android handsets (Samsung Galaxy A15, Nokia G22).
  - Low-bandwidth cellular network testing (2G / 3G throttling).
  - Vercel production deployment and live environment health check.
- **Approval Gate:** Formal stakeholder sign-off and pilot readiness certification.

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
