# Carbon Field Sales Tracker — Project Changelog

All notable changes to the Carbon Field Sales Tracker project are documented in this file in reverse chronological order.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), adhering to Semantic Versioning and staged Antigravity milestone checkpoints.

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
