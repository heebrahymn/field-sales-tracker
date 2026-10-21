# ADR 0008: Stage 2B Supabase Backend Implementation & Final Security Verification

- **Status:** Approved & Verified (Final Security & Completeness Audit Completed)
- **Date:** 2026-10-21
- **Project:** Carbon Field Sales Tracker (Nigeria, Zambia, Malawi)
- **Database Ref:** `jegwdnmdzuphfhpeimrf` (Hosted Supabase Development Project)
- **Supabase URL:** `https://jegwdnmdzuphfhpeimrf.supabase.co`

---

## 1. Context & Objectives

Following Stage 1 frontend development and the approval of the Stage 2A Backend Architecture Plan (ADR 0007), Stage 2B required the autonomous implementation, migration, security hardening, and verification of the PostgreSQL/PostGIS backend on the user's hosted Supabase development environment without requiring a local Docker daemon.

Following provisional acceptance of Stage 2B, a comprehensive **Final Security Audit and Completeness Verification** was conducted to close all remaining verification gaps across:
1. **Supabase Auth Provisioning Audit:** Assessment of GoTrue authentication, `auth.users` integrity, credential isolation, and production provisioning procedures.
2. **Tri-Market Sandboxing & Role Isolation:** Strict access boundaries for Salesperson, Country Sales Head, and HQ Administrator across Nigeria (`Africa/Lagos`), Zambia (`Africa/Lusaka`), and Malawi (`Africa/Blantyre`).
3. **Sole-Author Field Evidence & Immutability (PRD §2 & §7):** Salespeople are the sole creators of their visit and attendance evidence; managers and HQ are blocked by RLS from fabricating records on behalf of salespeople. Approved GPS-failure exceptions remain `manager_approved_unverified` (never promoted to location verified).
4. **Expanded Offline Event Ingestion (PRD §9):** First submissions, identical retries with zero row increment, conflicting payload detection, missing parent dependency quarantining (`pending_dependency`), and clock discrepancy anomaly tripwires.
5. **Path-Based Media Evidence Security:** Private storage buckets with path-based RLS (`(storage.foldername(name))[1] = auth.uid()::text`) and time-bounded signed URLs.
6. **100% Company Handset Fleet Custody (13 Test Cases):** Knox MDM enrollment status, unique asset IDs/serials, single active assignment index, direct Salesperson → HQ Admin device replacement pipeline (with zero Country Sales Head approval bottleneck).
7. **Business Workflows & Governance:** Authorized non-visit workdays (counting toward attendance but not visit targets), versioned location pins (v1 deactivated upon v2 approval), client audit phone calls (multiple attempts, client denial escalating to `disputed_denied` / `under_investigation` + critical flag, manager dispute resolution with mandatory audit rationale in append-only ledger).
8. **Strict MVP Exclusions:** Zero quotation, order, pipeline, task reminder, invoice, or revenue tables.

---

## 2. Complete Migration Architecture (25 Applied Migrations)

Twenty-five (25) sequential, declarative SQL migrations were applied to the remote hosted Supabase database:

1. `20261022000001_extensions_and_enums.sql`: PostGIS, pgcrypto, uuid-ossp extensions, and domain enums (`app_role`, `device_inventory_status`, `device_issue_category`, `visit_verification_status`, etc.).
2. `20261022000002_markets_and_rules.sql`: Canonical operational territories (NG, ZM, MW) and versioned market rules (`v1.2.04-canonical`).
3. `20261022000003_profiles_and_absences.sql`: User profiles extending `auth.users` 1:1, authorized absences, and non-visit workdays.
4. `20261022000004_devices_and_assignments.sql`: 100% company handset fleet inventory and partial unique active custody index (`uq_single_active_device_per_rep`).
5. `20261022000005_device_replacements.sql`: Direct Salesperson → HQ Admin hardware issue pipeline with append-only audit trail.
6. `20261022000006_clients_branches_pins.sql`: B2B client organizations, branches (supporting PRD §4.2 shared switchboard phone numbers across branches), versioned location pins with PostGIS points, and client contacts.
7. `20261022000007_attendance_and_visits.sql`: Daily attendance tracking with start selfie URLs, visit check-in/out records, and meeting logs (free-text next steps only, zero commercial values).
8. `20261022000008_offline_events_and_exceptions.sql`: Offline durable event log (`activity_events`) and salesperson-submitted exceptions.
9. `20261022000009_audits_flags_and_disputes.sql`: Algorithmic verification flags, client audit workbench (5% random + risk sampling), and immutable state transition approval audit.
10. `20261022000010_rls_security_policies.sql`: Comprehensive Row-Level Security policies covering all public tables.
11. `20261022000011_stored_procedures_and_rpc.sql`: Offline event ingestion and administrative approval workflows.
12. `20261022000012_storage_buckets_and_policies.sql`: Private storage buckets (`attendance-selfies`, `premises-photos`, `meeting-cards`, `exception-evidence`) with strict user and role access control.
13. `20261022000013_seed_data.sql`: Deterministic development test accounts across Nigeria and Zambia (Preserved in migration history; permanently superseded by Auth Admin API).
14. `20261022000014_auth_and_rpc_fixes.sql`: Configured empty string attributes and `auth.identities` records for GoTrue password authentication; granted public market reads; defined `check_geofence_status` RPC.
15. `20261022000015_fix_rls_recursion_and_rpcs.sql`: Fixed RLS recursion by making security helper functions `SECURITY DEFINER` with fixed search paths; added `::float8` cast to PostGIS `ST_MakePoint`.
16. `20261022000016_fix_device_replacement_status_enum.sql`: Aligned device inventory status to valid enum `under_maintenance` upon activation of a replacement device.
17. `20261022000017_fix_replacement_history_enum_cast.sql`: Cast `previous_status` and `new_status` in replacement history to `public.replacement_request_status`.
18. `20261022000018_security_audit_hardening.sql`: Seeded Malawi (`MW`) operational territory; enforced path-based media RLS; added explicit sole-author INSERT policies on visits/attendance; revoked DELETE on visits and attendance; implemented business workflow procedures.
19. `20261022000019_fix_audit_dispute_and_rpc_helpers.sql`: Added `'audit_dispute'` to `flag_code` enum; updated `review_salesperson_exception` to guarantee retroactive visit linkage with `manager_approved_unverified`; added `check_bucket_privacy` RPC.
20. `20261022000020_storage_update_and_absence_upsert.sql`: Added storage `UPDATE` policies to support offline media upsert retries; added idempotent conflict handling to `request_non_visit_workday`.
21. `20261022000021_fix_client_audit_enums_and_columns.sql`: Aligned client audit workbench procedures to canonical column names (`auditor_id`, `call_notes`) and canonical enum values.
22. `20261022000022_fix_flag_status_and_absence_upsert.sql`: Aligned flag status transition to canonical `'cleared'` enum; removed non-existent timestamp reference in absence upsert; restored active device assignment.
23. `20261022000023_add_processed_to_event_processing_status.sql`: Added `'processed'` to `public.event_processing_status` enum.
24. `20261022000024_auth_security_and_non_visit_workflow.sql`: Implemented `public.absence_requests` queue for pending non-visit workday approvals (`request_non_visit_workday`, `review_non_visit_workday`, `record_approved_leave`); added `max_clock_drift_minutes` (5m default) to `market_rules` with active rule `v1.2.05-canonical` and archived `v1.2.04-canonical`; enforced cross-market Storage download RLS via `storage_owner_market()`; prevented role/market tampering via `trg_prevent_profile_escalation`; revoked untrusted schema creation privileges on `public` and `extensions`.
25. `20261022000025_align_ingest_and_rpcs.sql`: Aligned `ingest_activity_events` overloads to dynamic 5-minute clock drift; added helper RPC wrappers for HQ device replacement workflows (`hq_review_device_replacement`, `hq_dispatch_replacement_device`, `hq_confirm_replacement_activation`); supported flexible parameter aliases on `record_client_audit_call`.

---

## 3. Final Security & Completeness Verification Results

An exhaustive, 60-scenario automated verification suite (`scripts/test-backend.ts`, runnable via `npm run test:backend`) was executed against the hosted Supabase instance:

```text
=================================================================
Carbon Field Sales Tracker — Stage 2B Final Security Audit Suite
=================================================================

Connecting to hosted Supabase: https://jegwdnmdzuphfhpeimrf.supabase.co

--- Group 1: Tri-Market Authentication & Credentials ---
[✅ PASS] [AUTH-01] Auth :: Authenticate Nigeria Salesperson (Tunde Adebayo)
[✅ PASS] [AUTH-02] Auth :: Authenticate Nigeria Country Sales Head (Babatunde Adeleke)
[✅ PASS] [AUTH-03] Auth :: Authenticate Zambia Salesperson (Peter Mwale)
[✅ PASS] [AUTH-04] Auth :: Authenticate Zambia Country Sales Head (Chileshe Mwape)
[✅ PASS] [AUTH-05] Auth :: Authenticate Malawi Salesperson (Kondwani Banda)
[✅ PASS] [AUTH-06] Auth :: Authenticate Malawi Country Sales Head (Tamika Phiri)
[✅ PASS] [AUTH-07] Auth :: Authenticate HQ Administrator (Ayodele Ibraheem)

--- Group 2: Tri-Market Sandboxing & Isolation ---
[✅ PASS] [ISO-01] Isolation :: Nigeria Salesperson is strictly sandboxed to NG branches (zero ZM/MW visible)
[✅ PASS] [ISO-02] Isolation :: Zambia Salesperson cannot view NG or MW branches
[✅ PASS] [ISO-03] Isolation :: Malawi Salesperson is strictly sandboxed to MW branches (zero NG/ZM visible)
[✅ PASS] [ISO-04] Isolation :: Nigeria Country Sales Head CANNOT view ZM or MW company devices
[✅ PASS] [ISO-05] Isolation :: Malawi Country Sales Head CANNOT view NG or ZM company devices
[✅ PASS] [ISO-06] Isolation :: HQ Admin has tri-market visibility across Nigeria, Zambia, and Malawi

--- Group 3: Sole-Author Field Evidence & Immutability ---
[✅ PASS] [AUTH-SO-01] Sole-Author :: Salesperson can record own attendance day check-in
[✅ PASS] [AUTH-SO-02] Sole-Author :: Country Sales Head CANNOT insert attendance on behalf of salesperson
[✅ PASS] [AUTH-SO-03] Sole-Author :: HQ Admin CANNOT insert attendance on behalf of salesperson
[✅ PASS] [AUTH-SO-04] Sole-Author :: Salesperson can insert own physical visit check-in record
[✅ PASS] [AUTH-SO-05] Sole-Author :: Country Sales Head CANNOT insert visit on behalf of salesperson
[✅ PASS] [AUTH-SO-06] Sole-Author :: Visits are strictly immutable: Salesperson CANNOT delete visit record
[✅ PASS] [AUTH-SO-07] Sole-Author :: Manager-approved GPS failure exception remains Manager Approved — Location Unverified (NEVER location_verified)

--- Group 4: Expanded Offline Event Ingestion & Clock Threshold ---
[✅ PASS] [OFF-01] Offline Ingestion :: First submission of ordered event batch succeeds
[✅ PASS] [OFF-02] Offline Ingestion :: Duplicate retry returns accepted_duplicate with ZERO row increment across events, visits, logs, and flags
[✅ PASS] [OFF-03] Offline Ingestion :: Conflicting payload / key on existing UUID is rejected (tamper protection)
[✅ PASS] [OFF-04] Offline Ingestion :: Event with missing parent dependency is quarantined as pending_dependency without batch failure
[✅ PASS] [CLK-01] Clock Drift :: Market rules versioning: Active version sets max_clock_drift_minutes = 5 and preserves historical rules
[✅ PASS] [CLK-02] Clock Drift :: Reading below 5m threshold (+4 minutes) raises NO clock discrepancy flag
[✅ PASS] [CLK-03] Clock Drift :: Reading above 5m threshold (+6 minutes) raises operational review flag without fraud classification

--- Group 5: Media Evidence & Storage Security ---
[✅ PASS] [STO-01] Storage Security :: All media evidence buckets are configured as PRIVATE (public = false)
[✅ PASS] [STO-02] Storage Security :: Salesperson can upload media to own authenticated path (<user_id>/...) in private bucket
[✅ PASS] [STO-03] Storage Security :: Path RLS prevents salesperson from uploading to another user path (tamper block)
[✅ PASS] [STO-04] Storage Security :: Private storage creates time-bounded signed URLs with cryptographic token expiration
[✅ PASS] [STO-05] Storage Security :: Storage RLS blocks salesperson from reading other users private evidence
[✅ PASS] [STO-06] Storage Security :: Storage RLS strictly blocks Country Sales Head from downloading cross-market media
[✅ PASS] [STO-07] Storage Security :: Storage RLS permits Country Sales Head to download media for reps within their own market

--- Group 6: 100% Company Device Fleet Lifecycle (13 Cases) ---
[✅ PASS] [DEV-01] Device Fleet :: Case 1: HQ Admin registers a new company handset in fleet inventory
[✅ PASS] [DEV-02] Device Fleet :: Case 2: Duplicate company asset ID is strictly rejected (UQ constraint)
[✅ PASS] [DEV-03] Device Fleet :: Case 3: Duplicate hardware serial number is strictly rejected (UQ constraint)
[✅ PASS] [DEV-04] Device Fleet :: Case 4: Available device can be assigned to a salesperson with audit custody log
[✅ PASS] [DEV-05] Device Fleet :: Case 5: Double assignment of one device to multiple reps is rejected
[✅ PASS] [DEV-06] Device Fleet :: Case 6: Multiple active devices for one salesperson strictly rejected (uq_single_active_device_per_rep)
[✅ PASS] [DEV-07] Device Fleet :: Case 7: Salesperson reports defective company device directly to HQ Admin
[✅ PASS] [DEV-09] Device Fleet :: Case 9: Country Sales Head CANNOT approve or reject device replacements (Zero Bottleneck Enforced)
[✅ PASS] [DEV-08] Device Fleet :: Case 8: HQ Admin approves device replacement request
[✅ PASS] [DEV-10] Device Fleet :: Case 10: Spare device allocated and dispatched with waybill tracking
[✅ PASS] [DEV-11] Device Fleet :: Case 11 & 12: Replacement completed; old handset marked under_maintenance & revoked
[✅ PASS] [DEV-13] Device Fleet :: Case 13: Full device replacement and custody lifecycle remains auditable in immutable history

--- Group 7: Business Workflows, Non-Visit Approvals & Governance ---
[✅ PASS] [WF-NV-01] Non-Visit Workday :: Salesperson submits non-visit request: Request starts in PENDING status in absence_requests
[✅ PASS] [WF-NV-02] Non-Visit Workday :: Pending non-visit request does NOT prematurely count as attendance (NOT in approved_absences)
[✅ PASS] [WF-NV-03] Non-Visit Workday :: Negative Access: Salesperson CANNOT self-approve non-visit workday via direct review RPC
[✅ PASS] [WF-NV-04] Non-Visit Workday :: Negative Access: Cross-market Country Sales Head CANNOT review request (ZM CSH -> NG Rep)
[✅ PASS] [WF-NV-05] Non-Visit Workday :: Positive Review: Country Sales Head approves request -> Counts toward attendance, strictly ZERO visit target
[✅ PASS] [WF-NV-06] Non-Visit Workday :: Rejection Workflow: Country Sales Head rejects request with mandatory reason -> Removed from attendance
[✅ PASS] [WF-NV-07] Non-Visit Workday :: Manager Direct Leave: Country Sales Head records approved leave directly into approved_absences
[✅ PASS] [WF-NV-08] Non-Visit Workday :: Negative Access: Salesperson CANNOT record approved leave directly via RPC
[✅ PASS] [WF-NV-09] Non-Visit Workday :: Negative Access: Salesperson CANNOT directly insert into approved_absences table (RLS blocked)
[✅ PASS] [WF-PIN-01] Workflows :: Location pin versioning: Approving new version activates v2 and deactivates v1
[✅ PASS] [WF-AUD-01] Workflows :: Client denial during audit call triggers Disputed - Under Investigation and raises critical flag
[✅ PASS] [WF-AUD-02] Workflows :: Manager resolves audit dispute with mandatory audit reason recorded in approval_audit ledger
[✅ PASS] [WF-AUD-03] Workflows :: Approval audit ledger is strictly append-only (DELETE and UPDATE rejected)
[✅ PASS] [SEC-01] Security Checks :: Profile Tampering Prevention: Salesperson CANNOT escalate own role to hq_admin (Trigger aborted)

=================================================================
Final Security Audit Verification Summary
=================================================================
Total Verification Tests Executed: 60
Passed: 60 (100%)
Failed: 0 (0%)

🎉 ALL 60 AUTOMATED SECURITY & COMPLETENESS TESTS PASSED PERFECTLY!
```

---

## 4. Frontend & Unit Test Regression Status

All existing frontend unit, component, and cross-role integration tests remain 100% green:
- `npm run test`: **65 passed (65 tests across 7 test files)**
- `npm run build`: **Succeeded cleanly in 6.46s with 0 TypeScript and 0 Vite bundling errors**
- TypeScript database types: Autonomously generated from hosted database schema into [database.types.ts](file:///c:/Projects/carbonSalesTracker/src/types/database.types.ts).

---

## 5. Security Clarifications & Non-Negotiable Boundaries

1. **MDM & Knox Attestation:** Samsung Knox enrollment is tracked as an administrative application/database security status flag (`knox_enrolled: boolean`, `security_authorization: text`). Real-device Knox cloud attestation API integration is an enterprise feature and is **not mandatory for MVP**.
2. **Auth Provisioning:** Direct SQL inserts into Supabase-managed Auth tables are strictly discontinued. Migrations 13 and 18 have been sanitized to replace historical demo passwords with randomized non-reusable hashes (`extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf'))`). In all future environments, user accounts are provisioned exclusively via the Supabase Auth Admin API script (`scripts/provision-users.ts`) using runtime-generated secure credentials. See [docs/provisioning.md](file:///c:/Projects/carbonSalesTracker/docs/provisioning.md) for full protocol.
3. **Environment Approval Scope:** **The backend is approved for development, not production deployment.** Production deployment requires dedicated VPC isolation, enterprise KMS key management, hardware Knox attestation, and individual corporate email invite onboarding.
4. **Phase Boundary:** The Stage 1 frontend mock UI remains completely intact and uncoupled. Frontend-to-backend live integration is gated for Stage 3 upon user approval.

---

## 6. Migration Credential Sanitisation & History Reconciliation Strategy

To ensure zero fixed reusable credentials are introduced into GitHub while maintaining absolute migration-ledger consistency with the hosted Supabase development project (`jegwdnmdzuphfhpeimrf`):

1. **Zero Cleartext Credentials in Repository:**
   - In `20261022000013_seed_data.sql` and `20261022000018_security_audit_hardening.sql`, historical hardcoded demo credentials were removed and replaced with `extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf'))`.
   - In `scripts/test-backend.ts`, the demo password fallback was removed; it strictly requires `DEV_USER_PASSWORD` from `.env.local` or process environment.
   - Rigorous automated scanning confirms zero occurrences of demo passwords, service-role secrets, or database passwords in tracked or staged files.
2. **Hosted Database History Consistency:**
   - The remote hosted database ledger (`supabase_migrations.schema_migrations`) has recorded migrations 1 through 25.
   - Because Supabase CLI compares migration version prefixes (`20261022000001` through `20261022000025`), the version sequence remains identical and fully reconciled.
   - Live hosted development accounts were already rotated with dynamic cryptographic credentials via `npm run provision:users`, preserving all development accounts, device assignments, and operational seed records without destruction.
3. **Reproducibility on Fresh / Staging Databases:**
   - On a fresh database, running `npx supabase db push` applies migrations 1–25 cleanly. The randomized bcrypt hashes in migrations 13 and 18 allow `public.profiles` foreign key constraints (`REFERENCES auth.users(id) ON DELETE CASCADE`) to succeed without human intervention.
   - Running `npm run provision:users` immediately provisions and synchronizes authenticated accounts via the official GoTrue Admin API.

---

## 7. Stage 2 Completion & Stage 3 Readiness

Stage 2 (Supabase Dev Project, Schema Migrations, Auth Admin API, and RLS Security Policies) is officially complete and verified:
- **60 of 60 automated backend tests pass (100%).**
- **65 of 65 frontend unit and cross-role integration tests pass (100%).**
- **0 TypeScript compile errors (`npx tsc -b`).**
- **Clean production build in ~6.1s (`npm run build`).**
- **Clean repository secret scan (zero credentials staged or tracked).**

### Stage 3 Readiness Notes
The repository and database are primed for Stage 3 (Real Geolocation, Camera Integration & Visit Workflows):
- `check_geofence_status` PostGIS RPC is deployed and verified with configurable radii (default 200m).
- Private storage buckets (`attendance-selfies`, `premises-photos`, `meeting-cards`, `exception-evidence`) are active with path-based RLS and signed URL helpers.
- Attendance check-in and visit check-in/out schema constraints and RPCs are tested and verified.
- Hardware replacement and non-visit workday approval workflows are active and security-audited.
- Development remains gated; live frontend-to-backend wiring commences only upon user authorization of Stage 3.
