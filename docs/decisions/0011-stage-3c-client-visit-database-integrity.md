# ADR 0011: Stage 3C Client Visit Database Integrity, Authoritative PostGIS Geofencing, Transaction Locking & Frontend Integration

- **Status:** Approved & Verified (All 143 Vitest Tests, 10/10 Direct API Database/PostGIS/Storage Tests, Concurrency Race Test, and Playwright Multi-Viewport E2E Tests Passing)
- **Date:** 2026-10-28
- **Project:** Carbon Field Sales Tracker (Nigeria, Zambia, Malawi)
- **Reference:** PRD v1.2 (MVP Updated) §2, §6.1, §7.1, §7.2, §7.3, §8.3, §8.4; Acceptance Tests AT-03, AT-04, AT-05, AT-15
- **Database Ref:** `[SUPABASE_PROJECT_ID]` (Hosted Supabase Development Project)
- **Supabase URL:** `https://[SUPABASE_PROJECT_ID].supabase.co`
- **Migrations:**
  - `supabase/migrations/20261028000026_stage_3c_visit_integrity_and_triggers.sql`
  - `supabase/migrations/20261028000027_stage_3c_authoritative_geofence_verification.sql`

---

## 1. Context & Objectives

Following the completion and acceptance of Stage 3B (Workday Attendance & Non-Visit Governance at commit `79b306e`, tag `stage-3b-attendance-approved`), Stage 3C establishes physical client visit check-in and check-out (`public.visits`), geofencing (200m), premises photography, and meeting logs.

Before building frontend visit capture UI or executing client-side visit check-in workflows, strict database-level integrity controls are required to guarantee that business rules and security invariants cannot be bypassed via direct REST API calls, concurrent race conditions, or network retries.

The primary objectives of this architectural baseline are:
1. **Format String Correction:** Correct the PostgreSQL `RAISE EXCEPTION` statement in the proposed trigger where a format placeholder `%` was missing its variable argument.
2. **Bi-Directional Transaction-Safe Locking:** Prevent concurrent races between End Day and Visit Check-In:
   - Prevent ending attendance while a normal visit is open.
   - Prevent starting a normal visit against an inactive or ended workday.
   - Eliminate race conditions where concurrent End Day and Visit Check-In requests could create inconsistent or orphaned records.
3. **Location Verification Integrity Guard:** Guarantee that unapproved, pending, or imported-but-unreviewed GPS pins can never produce `location_verified` visits under any circumstance. Live premises photo and `inside_confident` classification are strictly mandatory.
4. **Immutable Snapshotting:** Automatically snapshot the exact version of the active approved branch GPS pin (`branch_pin_id`) and active market rule (`rule_version_id`) at the instant of visit capture.
5. **Security Definer Review:** Enforce strict `search_path = public, pg_temp;`, schema qualification, and explicit execution grants on all database trigger functions.
6. **Sole-Author & Role Boundary Enforcement:** Ensure that Country Sales Heads and HQ Administrators cannot originate physical visit records on behalf of salespeople, and that cross-country access is blocked.
7. **Physical Android Hardware Disclaimer:** Explicitly document mobile handset verification status as **NOT TESTED** in local/CI development environment, establishing an acceptance protocol for company handset provisioning.

---

## 2. Architectural Decisions

### Decision 1: PostgreSQL Format String Correction
In the Stage 3B draft trigger, the exception:
```sql
-- Stage 3B draft (erroneous):
RAISE EXCEPTION 'Cannot start visit: Associated workday is not active (status is %)' USING ERRCODE = '23514';
```
lacked the format argument for `%`. This has been corrected to:
```sql
-- Migration 00026 (corrected):
RAISE EXCEPTION 'Cannot start visit: Associated workday is not active (status is %)', v_status::text
    USING ERRCODE = '23514'; -- check_violation
```
Verified via live PostgREST API: returns clean JSON error message `"Cannot start visit: Associated workday is not active (status is ended)"` with SQLSTATE `23514`.

### Decision 2: Bi-Directional Transaction-Safe Locking Model
To prevent interleaved race conditions between closing a workday and starting/closing visits, PostgreSQL row-level locks are acquired inside atomic triggers:

1. **Workday Closure Guard (`trg_prevent_attendance_close_with_open_visit`):**
   - Attached to `BEFORE UPDATE OF status ON public.attendance_days`.
   - Fires when `NEW.status = 'ended' AND OLD.status = 'started'`.
   - Executes:
     ```sql
     SELECT 1 FROM public.visits
     WHERE attendance_day_id = NEW.id
       AND check_out_at IS NULL
       AND kind = 'normal'
     FOR UPDATE;
     ```
   - If an open normal visit exists, raises `23514 check_violation`: *"Cannot end workday: an active physical visit is currently in progress (PRD §6.1 / AT-03)."*
   - Acquiring `FOR UPDATE` serializes with any concurrent visit check-out or check-in transaction.

2. **Visit Initiation Guard (`trg_prevent_visit_start_on_ended_workday`):**
   - Attached to `BEFORE INSERT OR UPDATE OF attendance_day_id, kind ON public.visits`.
   - Fires when `NEW.kind = 'normal'`.
   - Executes:
     ```sql
     SELECT status INTO v_status
     FROM public.attendance_days
     WHERE id = NEW.attendance_day_id
     FOR SHARE;
     ```
   - Acquiring `FOR SHARE` locks the parent workday row, preventing a concurrent `UPDATE attendance_days SET status = 'ended'` from committing until the visit check-in completes.
   - If `v_status != 'started'`, raises `23514 check_violation`: *"Cannot start visit: Associated workday is not active (status is %)"*.

**Mathematical Proof of Race Freedom:**
- If **End Day commits first**: The workday status becomes `'ended'`. Visit check-in acquires `FOR SHARE`, reads `status = 'ended'`, and fails with `23514`.
- If **Visit Check-In commits first**: Visit row is written with `check_out_at = NULL`. End Day executes `FOR UPDATE` on open visits, finds the open visit, and fails with `23514`.
- If **Concurrent**: One transaction acquires the row lock; the second blocks until the first completes, then evaluates the updated state. Under PostgreSQL READ COMMITTED / SERIALIZABLE semantics, both cannot succeed simultaneously.

### Decision 3: Authoritative Backend PostGIS Geofence Verification & Anti-Spoofing Guard (Migrations 00026 & 00027)
PRD §7.1 and §8.4 mandate that a visit may only be classified as `location_verified` if:
1. An approved, active branch GPS pin exists (`status = 'approved' AND is_active = true`) and belongs to the selected branch (`branch_id = NEW.branch_id`).
2. The salesperson's market matches the branch's market (`profiles.market_code = branches.market_code`), and the attendance day belongs to the salesperson (`attendance_days.user_id = NEW.user_id`).
3. The backend independently computes the WGS84 ellipsoidal distance via `ST_Distance(NEW.check_in_geom::geography, v_pin_geom::geography)` and verifies that `v_distance_m + NEW.check_in_accuracy_m <= v_geofence_radius_m` and `NEW.check_in_accuracy_m <= v_max_accuracy_m`. Any client-submitted `location_classification = 'inside_confident'` with out-of-bounds coordinates is overridden by the database trigger and rejected with `23514 check_violation`.
4. A live premises photo was captured on-site and uploaded to private storage (`visit-premises-photos/${userId}/...`).
5. Trigger `trg_preserve_visit_checkin_evidence_on_update` blocks any modification to check-in coordinates, check-in accuracy, premises photo path, `branch_pin_id`, or `rule_version_id` during or after checkout.

Under this architecture, pending pins, unapproved pins, rejected pins, superseded pins, spoofed client flags, or missing photos can NEVER produce a `location_verified` visit, even if attempted via direct PostgREST API calls.

### Decision 4: Immutable Snapshotting of Pins and Market Rules
When a visit is inserted:
- If `rule_version_id` is null, the trigger automatically selects and links the currently active market rule version for the branch's market (`public.market_rules`).
- If `branch_pin_id` is null, the trigger automatically links the latest active approved pin for the branch (`public.branch_location_pins`).
Once written to `public.visits`, these foreign keys establish an immutable historical audit snapshot. Future pin relocations or market rule changes will never alter historical visit evidence.

### Decision 5: Security Definer Hardening & Execution Grants
All trigger functions are defined with:
- `SECURITY DEFINER`
- Pinned search path: `SET search_path = public, pg_temp;` (eliminates search-path hijacking attacks)
- Fully schema-qualified object references (`public.visits`, `public.attendance_days`, etc.)
- Explicit execution privilege control:
  ```sql
  REVOKE EXECUTE ON FUNCTION public.<func>() FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.<func>() TO authenticated, service_role;
  ```

### Decision 6: Sole-Author Principle & RLS Enforcement
- Direct INSERT into `public.visits` is governed by RLS policy `visits_insert_salesperson_only`: `user_id = public.auth_uid() AND public.auth_role() = 'salesperson'`.
- Managers (Country Sales Head, HQ Admin) receive `HTTP 403 Forbidden` / `42501` if attempting to originate a visit for a salesperson.
- Cross-country isolation: Salespeople and managers can only query and reference branches in their assigned market (`branches_select`).

### Decision 7: Hardware Verification Status
- Because development and CI environments operate on desktop workstations and cloud servers, physical Android GPS and camera hardware acceptance is documented as **NOT TESTED**.
- An acceptance checklist is established in `docs/testing/STAGE_3C_QA_REPORT.md` for execution when company-provided Samsung Galaxy A15 handsets are provisioned.

---

## 3. Verification & Test Results

The Stage 3C implementation was verified against the live hosted Supabase development database (`[SUPABASE_PROJECT_ID]`) via `scripts/test_stage_3c_db_integrity.py` and `scripts/test_stage_3c_concurrency_race.py`:

| Test Case | Scenario Tested | Direct API Result | Status |
|---|---|---|---|
| **TEST 1** | Insert normal visit against ended workday | `HTTP 400` / `23514` check_violation (*"Associated workday is not active"*) | **PASSED** |
| **TEST 2** | End workday while normal visit is open | `HTTP 400` / `23514` check_violation (*"Cannot end workday: an active physical visit is currently in progress"*) | **PASSED** |
| **TEST 3** | Set `location_verified` with unapproved pin | `HTTP 400` / `23514` check_violation (*"Associated branch GPS pin is not approved and active"*) | **PASSED** |
| **TEST 4** | Set `location_verified` without premises photo | `HTTP 400` / `23514` check_violation (*"Live premises photo is mandatory for location verification"*) | **PASSED** |
| **TEST 5** | Set `location_verified` with location `outside` | `HTTP 400` / `23514` check_violation (*"Location classification must be inside_confident"*) | **PASSED** |
| **TEST 5B** | Client spoofs `inside_confident` + `location_verified` while 1.5km away | `HTTP 400` / `23514` check_violation (Authoritative PostGIS `ST_Distance` overrides to `outside`) | **PASSED** |
| **TEST 6** | Manager direct insert on visits table | `HTTP 403` / `42501` RLS violation (*"new row violates row-level security policy"*) | **PASSED** |
| **TEST 7** | Cross-country branch query & insert | `HTTP 200` (0 rows returned) / `HTTP 400` `23514` cross-market block | **PASSED** |
| **TEST 8** | Private storage isolation (`visit-premises-photos`) & `upsert: false` | Own path `200`, duplicate `400`, foreign user path `400/403`, cross-market read `400/404` | **PASSED** |
| **TEST 9** | Checkout evidence immutability, outside-geofence preservation & `meeting_logs` E2E | Check-in coords tamper `400`, outside-geofence checkout `200` (preserves `location_verified`), meeting log `201`, End Day `200` | **PASSED** |
| **CONCURRENCY** | Barrier-synchronized simultaneous End Day vs. Visit Check-In (`scripts/test_stage_3c_concurrency_race.py`) | Serialized via `FOR UPDATE` / `FOR SHARE`; zero orphaned open visits on ended workdays | **PASSED** |

**Regression & Browser Test Suite:**
- Vitest: 143 passed across 12 test suites (0 failures), including 18/18 tests in `src/test/stage-3c-client-visits.test.tsx`.
- Playwright E2E (`scripts/verify_stage_3c_browser.py`): Full visit workflow and multi-viewport verification (`360×800`, `390×844`, `430×932`, `1280×800`) passed with zero horizontal overflow.
- TypeScript: `tsc --noEmit` exited with code 0.
- ESLint: `eslint .` exited with code 0.
- Production Build: `npm run build` exited with code 0.
- Supabase Migrations: 27 migrations applied and synchronized with remote database (`00001` through `00027`).

---

## 4. Consequences & Status

- **Status:** Stage 3C (Database Integrity, Authoritative PostGIS Geofencing, Service Layer, and Frontend Visit Capture & Meeting Logs) is fully implemented and verified on remote Supabase (`[SUPABASE_PROJECT_ID]`).
- **Next Phase:** Stage 3D (Offline IndexedDB Journal, Media Queuing & Dependency Sync) — awaiting explicit user review and authorization.
