# Carbon Field Sales Tracker — Project Changelog

All notable changes to the Carbon Field Sales Tracker project are documented in this file in reverse chronological order.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), adhering to Semantic Versioning and staged Antigravity milestone checkpoints.

---

## [Stage 3B] - Real Attendance & Workday Management (2026-10-27)

### Added
- **Supabase-Backed Attendance Persistence:** Created `src/services/attendanceService.ts` providing authoritative PostgreSQL writes to `public.attendance_days`, PostGIS point geometry storage, and timezone-aware business date formatting (`Africa/Lagos`, `Africa/Lusaka`, `Africa/Blantyre`).
- **Live Hardware Camera Viewfinder:** Integrated HTML5 `navigator.mediaDevices.getUserMedia` in `StartDayModal.tsx` displaying live front-camera video preview with `<video>` element and canvas snapshot to JPEG Blob. Explicitly releases hardware tracks (`track.stop()`) on capture, modal dismissal, or unmount.
- **Fresh GPS Satellite Fix Acquisition:** Live Geolocation API integration enforcing PRD horizontal accuracy threshold (≤ 100m for normal capture) with amber guidance on degraded signals.
- **Private Supabase Storage Uploads:** Secure front-camera selfie storage in private bucket `attendance-selfies/${userId}/${workDate}_selfie_${timestamp}.jpg`.
- **Ephemeral Signed URLs for CSH Audit:** `TeamAttendanceReview.tsx` dynamically generates 300-second time-limited signed URLs (`supabase.storage.createSignedUrl`) for private selfie inspection.
- **Workday State Durability:** Connected `FieldSessionContext.tsx` to automatically restore active `'started'` or completed `'ended'` workday status from PostgreSQL across browser reloads and sessions.
- **PRD §6.1 / AT-03 Hard Block:** `EndDayModal.tsx` strictly blocks workday closure while an active client visit session remains in progress.
- **Non-Visit Workday Governance:** Connected `NonVisitDayModal.tsx` to RPC `request_non_visit_workday` and `TeamAttendanceReview.tsx` to RPC `review_non_visit_workday`. Strictly enforces: approved non-visit days credit daily attendance but grant zero physical-visit target credits.
- **Sole-Author Principle Verification:** Direct API security test verifying PostgreSQL RLS policy `attendance_days_insert_salesperson_only` returns `HTTP 403 Forbidden` if a manager attempts to insert attendance for a salesperson.
- **Stage 3B Automated Test Suites:** Created `src/test/stage-3b-attendance.test.tsx` (25 Vitest tests, 125/125 passed across suite), `scripts/verify_stage_3b_live.py` (5 live Supabase tests), `scripts/verify_stage_3b_audit_corrections.py` (12 direct integration and storage tests), and Playwright browser suite capturing 7 full-fidelity screenshots.
- **Documentation & Decision Records:** Created ADR `docs/decisions/0010-stage-3b-real-attendance-and-workday-management.md`, `docs/implementation/STAGE_3B_ATTENDANCE.md`, and `docs/testing/STAGE_3B_QA_REPORT.md`.

### Changed
- **Selfie Evidence Immutability Safeguards:** Hardened selfie upload path to unique submission identifier `${userId}/${workDate}_${submissionId}.jpg` with `upsert: false`. Direct API tests confirm duplicate uploads are rejected (`HTTP 400 Bad Request`), confirmed attendance records skip uploads entirely, failed inserts clean up uncommitted files, and concurrent conflicts (`23505`) clean only uncommitted files without deleting winner evidence.
- **Fail-Closed Active Visit Query Error Handling:** Updated `attendanceService.endDayAttendance` to explicitly handle query failures (`visitError !== null`). End Day halts immediately without modifying `attendance_days`, returns a clear error message, and allows safe retry without assuming empty results means zero visits.
- **Multi-Tiered Active Visit Protection:** Enforces UI warning guard (`activeVisitId !== null`), service layer fail-closed check on `public.visits`, and documents the Stage 3C database trigger contract (`trg_prevent_attendance_close_with_open_visit` with `FOR UPDATE` and `trg_prevent_visit_start_on_ended_workday`).
- **Duplicate End Day Guard:** Hardened `attendanceService.endDayAttendance` to verify current record status and reject calls if status is already `'ended'`.
- **Salesperson Home Preview:** Updated Tile 1 in `src/features/field/SalespersonHomePreview.tsx` to display *"Workday Completed — Today's operational log saved"* when `workdayStatus === 'ended'`.
- **Context Type Expansion:** Added `attendanceRecord`, `isAttendanceLoading`, `onAttendanceStarted`, `onAttendanceEnded`, and `refreshAttendance` to `FieldSessionContextType`.
- **Team Attendance Review:** Connected manager review table directly to live Supabase queries filtered by `market_code`.

---

## [Stage 3A] - Real Supabase Authentication & Role-Based Access Control (2026-10-26)

### Added
- **Official Supabase GoTrue Auth:** Replaced in-memory mock logins with cryptographic GoTrue password authentication (`supabase.auth.signInWithPassword`, `signOut`, `getSession`, `onAuthStateChange`).
- **Database Profile RBAC:** Dynamically load authoritative user profile records from `public.profiles` keyed to `auth.uid()`. Role (`salesperson`, `country_sales_head`, `hq_admin`) and country assignment (`NG`, `ZM`, `MW`) are derived server-side.
- **Direct API & RLS Security Suite:** Added `scripts/test-stage-3a-direct-api-auth.ts` (13 RLS tests) and `scripts/test-stage-3a-live.ts` (8 GoTrue auth checks) validating that RLS blocks cross-market queries, privilege escalation attempts, and unauthorized data modification.
- **Playwright Browser Suite:** Added `scripts/verify_stage_3a_browser.py` verifying real authentication across mobile viewports (360px, 390px, 430px) and desktop (1280px), invalid password feedback, session refresh restoration, and sign-out.
- **Enterprise Password Assistance Modal:** Accessible from the login screen; explains Carbon Car Care mobile fleet policy and provides HQ IT contact instructions.
- **Architecture Decision Record:** Created `docs/decisions/0009-stage-3a-supabase-authentication-and-rbac.md`.
- **Stage 3A Implementation & Test Reports:** Created `docs/stage3a_implementation_report.md` and `docs/stage3a_test_report.md`.

### Changed
- **Removed Development Accounts Drawer:** Excised the dev account helper drawer, seed account list, and fixed demo password helpers from `src/features/auth/LoginView.tsx` to ensure a clean, production-ready login interface.
- **Session-Scoped Operational Providers:** Dynamically keyed `FieldSessionProvider`, `AuditProvider`, and `DeviceReplacementProvider` by `currentUser.id` in `src/App.tsx`, guaranteeing total in-memory state purging upon logout with zero multi-user state leakage.
- **Status Indicator Refinements:** Replaced generic badges in `src/components/feedback/DemoDataBanner.tsx` with `"Signed in securely"` and a prominent, separate `"Demo Field Data"` indicator.
- **Company Handset Display:** Profile screen now displays database-assigned asset tags (`CAR-SPR-117352`) and explicitly disclaims physical hardware attestation (*Future Knox MDM - Unattested in MVP*).
- **Consolidated Check-in CTA:** Removed redundant in-card button in `src/features/field/VisitWorkflowView.tsx`, preserving a single accessible sticky mobile footer action.

---

## [Pre-Stage 3] - Product Audit & Usability Corrections (2026-10-26)

### Added
- **Automated Live Deployment Verification:** Python Playwright script (`scripts/audit_live_site.py`) for live Vercel testing across mobile and desktop breakpoints.

### Changed
- **Sync Queue Accessibility (P1):** Made the persistent sync queue status badge an interactive, keyboard-accessible button that navigates directly to the Sync Queue view without losing active visit state.
- **Mobile Sticky CTA (P2):** Added sticky primary action footer for visit workflows on compact screens (≤ 390px).
- **Terminology Consistency:** Standardized "+ Add Client", "Select Client for Visit", and "Clients & Locations" across all roles.
- **Client Switchboard Support:** Verified shared parent company phone number handling across multiple branches without validation errors.

---

## [Stage 2B] - Supabase Backend Implementation & Security Verification (2026-10-21)

### Added
- **Remote PostgreSQL Schema (25 Migrations):** PostGIS extensions, domain enums, 24 tables, and RPC functions deployed to hosted Supabase project (`[SUPABASE_PROJECT_ID]`).
- **Comprehensive RLS Security:** Row-Level Security policies covering all public tables, restricting access by market and role.
- **Private Storage Buckets:** Private buckets (`attendance-selfies`, `premises-photos`, `meeting-cards`, `exception-evidence`) with path-based RLS (`auth.uid()`).
- **Automated Backend Test Suite:** `scripts/test-backend.ts` validating 30 security, schema, and workflow test cases.
- **Architecture Decision Record:** Created `docs/decisions/0008-stage-2b-supabase-backend-implementation.md`.

---

## [Stage 2A] - Backend Architecture & Planning (2026-10-20)

### Added
- **Backend Architecture Specification:** Comprehensive data model, RLS policy matrix, and migration roadmap (`docs/stage2a_backend_architecture_plan.md`).
- **Architecture Decision Record:** Created `docs/decisions/0007-stage-2a-backend-architecture-and-planning.md`.

---

## [Stage 1E] - Final Frontend QA & Cross-Role Integration (2026-10-18)

### Added
- **Cross-Role Integration Tests:** Automated tests in `src/test/stage-1e-cross-role-integration.test.tsx` verifying end-to-end rep registration to manager approval flows.
- **QA Report:** Created `docs/stage1e_qa_report.md`.
- **Architecture Decision Record:** Created `docs/decisions/0006-stage-1e-frontend-qa-and-integration.md`.

---

## [Stage 1D] - HQ Admin Regional Oversight Console (2026-10-16)

### Added
- **HQ Administration Portal:** Cross-market operational dashboard, company device fleet custody workbench, hardware replacement pipeline, ERP client master import wizard, and audit log viewer.
- **Architecture Decision Record:** Created `docs/decisions/0005-stage-1d-hq-admin-interface.md`.

---

## [Stage 1C] - Country Sales Head Dashboard (2026-10-14)

### Added
- **Manager Operations Dashboard:** Daily attendance monitoring, visit evidence review, branch/pin approval queue, algorithmic verification flag triage, client audit phone workbench, and audited safe CSV export.
- **Architecture Decision Record:** Created `docs/decisions/0004-stage-1c-country-sales-head-dashboard.md`.

---

## [Stage 1B] - Salesperson Mobile Interface (2026-10-12)

### Added
- **Salesperson PWA Shell:** Mobile-first layout, attendance check-in (selfie + GPS fix), client branch directory, 6-step visit workflow, rear-camera premises photo capture, meeting log capture, and exception filing.
- **Architecture Decision Record:** Created `docs/decisions/0003-stage-1b-salesperson-mobile-interface.md`.

---

## [Stage 1A] - Brand Identity, Design System & Application Shell (2026-10-10)

### Added
- **Authentic Brand Integration:** Deployed official logo (`public/brand/carbon_logo.png`) and design tokens (Primary Blue `#21409A`, Green `#1B9A4A`, Yellow `#E8CF2F`).
- **Design System:** Manrope typography, Tailwind CSS v4, shadcn/ui primitives.
- **Architecture Decision Record:** Created `docs/decisions/0002-stage-1a-approval.md`.

---

## [Stage 0] - Project Architecture & Staged Delivery Plan (2026-10-08)

### Added
- **Foundational Master Plan:** Functional PRD v1.2 breakdown, entity-relationship diagrams, MVP boundaries, risk mitigation, and staged delivery roadmap (`stage0_implementation_plan.md`).
- **Architecture Decision Record:** Created `docs/decisions/0001-stage-0-approval.md`.
