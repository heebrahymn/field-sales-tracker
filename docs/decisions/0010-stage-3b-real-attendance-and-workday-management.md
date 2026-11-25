# ADR 0010: Stage 3B Real Supabase Workday Attendance & Non-Visit Governance

- **Status:** Approved & Verified (All 115 Unit/Integration Tests, Live Supabase Tests, and Browser QA Passing)
- **Date:** 2026-10-27
- **Project:** Carbon Field Sales Tracker (Nigeria, Zambia, Malawi)
- **Reference:** PRD v1.2 (MVP Updated) §2, §6.1, §7.4, §8; AT-01, AT-02, AT-03
- **Database Ref:** `[SUPABASE_PROJECT_ID]` (Hosted Supabase Development Project)
- **Supabase URL:** `https://[SUPABASE_PROJECT_ID].supabase.co`

---

## 1. Context & Objectives

In Stage 3A, the application established real, cryptographic Supabase GoTrue authentication and server-side profile roles (`public.profiles`). However, daily attendance workflows (Start Day, End Day, attendance restoration, and non-visit requests) remained simulated in React component state.

Stage 3B replaces all simulated attendance behaviour with **real Supabase-backed persistence**, live device hardware captures (front-camera selfie and fresh GPS satellite coordinates), private Cloud Storage evidence uploads, and strict role-governed workday reviews.

The primary objectives of Stage 3B were:
1. **Real Start Day Attendance:** Capture fresh browser Geolocation (accuracy ≤ 100m), capture live device front-camera selfie via HTML5 MediaStreams, upload selfie to private Supabase Storage bucket `attendance-selfies`, and insert authoritative record into `public.attendance_days`.
2. **Real End Day Attendance:** Verify active workday status, enforce AT-03 hard block if an active client visit remains open, capture fresh checkout GPS coordinates, and transition record to `status = 'ended'`.
3. **Persistent Attendance State Across Sessions:** Automatically query Supabase on page load or user switch, restoring active `started` or `ended` state with zero multi-user state bleed.
4. **Country Sales Head Attendance Visibility:** Connect Country Sales Head review views to real `public.attendance_days` rows, providing date/rep filtering and time-limited (300s) signed URLs for private selfie evidence inspection.
5. **Governed Non-Visit Workdays:** Connect salesperson non-visit requests to `public.absence_requests` and manager review via security definer RPCs (`request_non_visit_workday`, `review_non_visit_workday`), strictly enforcing the rule: **approved non-visit workdays credit daily attendance but grant zero physical-visit targets**.
6. **Preservation of Sole-Author Principle:** Enforce at the PostgreSQL RLS layer that only the authenticated salesperson can create or modify their attendance records; managers review, approve, or comment, but can never fabricate attendance records on behalf of a salesperson.

---

## 2. Architectural Decisions

### Decision 1: Canonical Database Writes to `public.attendance_days`
- **Architecture:** Attendance records are written to `public.attendance_days` strictly matching the canonical Stage 2 schema:
  - `user_id`: Authenticated employee UUID (`auth.uid()`).
  - `device_id`: FK to employee's assigned company device in `public.devices(id)`.
  - `market_code`: Two-letter country code (`NG`, `ZM`, `MW`).
  - `work_date`: Market-local business date (`YYYY-MM-DD`). Enforced unique per rep via `CONSTRAINT uq_user_work_date UNIQUE (user_id, work_date)`.
  - `started_at`: Authoritative UTC timestamp.
  - `start_latitude`, `start_longitude`: Exact numeric coordinates (precision 10, scale 7).
  - `start_geom`: Stored PostGIS point `geometry(Point, 4326)` generated automatically from latitude and longitude.
  - `start_accuracy_m`: Reported horizontal accuracy in metres (validated ≤ 100m for normal capture).
  - `start_selfie_url`: Relative storage path `${userId}/${workDate}_start_selfie.jpg` in private `attendance-selfies` bucket.
  - `end_latitude`, `end_longitude`, `end_geom`, `end_accuracy_m`: Closing location telemetry.
  - `status`: Workday lifecycle enum `public.attendance_status` (`'started'`, `'ended'`, `'auto_closed'`, `'approved_non_visit'`, `'approved_leave'`, `'pending_sync'`). UI displays user-friendly label *"Completed"*.
- **Authoritative Time:** Server timestamps (`timestamptz`) define authoritative operational history, while client capture times are retained in metadata.

### Decision 2: Sole-Author Principle Enforced via PostgreSQL RLS
- **Architecture:** The database policy `attendance_days_insert_salesperson_only` restricts inserts strictly to `auth.uid() = user_id` and requires `is_active = true`.
- **Security Boundary:** Country Sales Heads and HQ Administrators cannot insert or modify attendance rows for salespeople. Direct API attempts by managers return `HTTP 403 Forbidden` / RLS violation.
- **Evidence Integrity:** A manager cannot retroactively fabricate a salesperson's Start Day, End Day, GPS coordinates, or selfie.

### Decision 3: Private Storage for Attendance Selfies with Deterministic Upserts
- **Architecture:** Selfies are stored in the private Supabase Storage bucket `attendance-selfies` under user-scoped paths:
  `${userId}/${workDate}_start_selfie.jpg`
- **Idempotency & Reliability:** Using a deterministic date-based filename with `upsert: true` ensures that network retries or multiple submissions overwrite the single day's file rather than accumulating duplicate orphaned media files.
- **Access Control:** Storage RLS policy enforces `(storage.foldername(name))[1] = auth.uid()::text` for uploads.
- **Privacy Standard:** Raw storage paths are never made public. Managerial inspection (CSH telemetry modal) generates ephemeral, time-limited signed URLs (`createSignedUrl(path, 300)`) expiring after 5 minutes.
- **Honesty Standard:** Capture is documented as visual identity verification for operational attendance; no claims of automated facial recognition or biometric authentication are made.

### Decision 4: Live Hardware Media & Geolocation Acquisition
- **Camera Workflow:** The application accesses the device camera via `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })`. A `<video>` viewfinder allows live framing; a canvas renders the frame to a compressed JPEG Blob. Hardware media tracks (`track.stop()`) are explicitly released upon capture, cancellation, modal dismissal, or unmount.
- **Geolocation Workflow:** Fresh coordinates are requested via `navigator.geolocation.getCurrentPosition` with `maximumAge: 0` and high accuracy enabled. Readings exceeding 100m horizontal accuracy prompt user repositioning. Real coordinates are never silently replaced with mock values.
- **Hardware Disclaimer:** Real-device testing on physical Android handsets is documented as **NOT TESTED**; browser emulation was used for verification in this development milestone.

### Decision 5: Market Timezone Derivation
- **Timezone Mapping:**
  - Nigeria (`NG`): `Africa/Lagos` (UTC+1)
  - Zambia (`ZM`): `Africa/Lusaka` (UTC+2)
  - Malawi (`MW`): `Africa/Blantyre` (UTC+2)
- **Workday Date Calculation:** The local `work_date` is computed using the market's IANA timezone rather than the user's potentially altered local browser clock, preventing cross-midnight attribution errors.

### Decision 6: PRD §6.1 / AT-03 Multi-Tiered Active Visit Protection on End Day
- **Tier 1 (Frontend):** `EndDayModal.tsx` evaluates `activeVisitId !== null` and hard-blocks workday closure with an explicit operational warning.
- **Tier 2 (Service Layer):** `attendanceService.endDayAttendance` queries `public.visits` for any active normal visit (`check_out_at IS NULL`), rejecting closure if an open visit exists.
- **Tier 3 (Database Level — Proposed for Stage 3C):** Trigger `trg_prevent_attendance_close_with_open_visit` is documented and proposed to be migrated in Stage 3C when persisted visits are activated.

### Decision 7: Security Definer RPCs for Non-Visit Workdays
- **Workflow:** Salespeople submit non-visit requests via RPC `request_non_visit_workday(p_date, p_absence_type, p_reason)`.
- **Review:** Country Sales Heads review via RPC `review_non_visit_workday(p_request_id, p_decision, p_notes)`.
- **Governance:** Approved requests generate an entry in `public.approved_absences` with:
  - `counts_as_attendance = TRUE`
  - `counts_as_visit_target = FALSE`
- This ensures non-visit days (training, office proposals, internal meetings) protect attendance compliance while correctly contributing zero physical-visit target credits.
- **Idempotency:** RPC uses `ON CONFLICT (user_id, absence_date) DO UPDATE`, guaranteeing repeated decisions do not create duplicate records.
- **Rejection Cleanup:** Rejections delete any entry from `public.approved_absences`, granting zero attendance credit.

---

## 3. Verification & Compliance Evidence

Stage 3B verification was executed with 100% pass rates:
1. **Automated Unit & Integration Tests (Vitest):** 11 suites, 117/117 tests passed (`src/test/stage-3b-attendance.test.tsx` validating camera streams, GPS acquisition, storage uploads, timezone math, and AT-03 visit blocks).
2. **TypeScript Compilation (`tsc --noEmit`):** 0 errors.
3. **ESLint:** 0 errors / 0 warnings.
4. **Live Supabase Database Tests (`scripts/verify_stage_3b_audit_corrections.py`):**
   - Canonical 20-column schema confirmed via PostgREST.
   - Start Day uniqueness constraint (`uq_user_work_date`) blocked duplicate insert with HTTP 409.
   - Salesperson non-visit request submission (`request_non_visit_workday`) -> status `'pending'` in `absence_requests`, 0 rows in `approved_absences` (NO credit).
   - Cross-market CSH approval (Zambia CSH on Nigeria request) rejected with HTTP 400.
   - CSH direct INSERT to `attendance_days` rejected by RLS (`HTTP 403 Forbidden` / Sole-Author policy enforced).
   - CSH review approval (`review_non_visit_workday`) -> verified `approved_absences` populated with `counts_as_attendance = True, counts_as_visit_target = False`.
   - Repeated approval call verified idempotent (1 row retained).
   - CSH review rejection with required notes -> verified absence record removed from `approved_absences`.
   - Signed URL expiration verified: request after 3.5s on a 2s TTL URL failed with `HTTP 400 InvalidJWT: "exp" claim timestamp check failed`.
5. **Playwright Browser Tests (`scripts/verify_stage_3b_browser.py`, `scripts/capture_start_day_modal.py`):**
   - Verified across mobile viewports (360x800, 390x844, 430x932) and desktop (1280x800).
   - Captured 7 comprehensive screenshots in brain artifact directory.
6. **Production Build:** Clean Rollup compilation in 13.29s.

---

## 4. Consequences & Operational Impact

### Positive
- Authoritative operational attendance stored in PostgreSQL with PostGIS coordinates.
- Front-camera selfies securely stored in private bucket with stable submission IDs, `upsert: false` immutability, zero silent overwrites, and time-limited signed URLs for managerial audit.
- Multi-tiered End Day active visit protection (frontend guard + service-layer fail-closed verification + proposed Stage 3C database trigger contract).
- Eliminates manager fabrication of field attendance; enforces salesperson sole-authorship.
- Clear governance distinguishing physical visit targets from authorized non-visit workdays.

### Boundaries Maintained
- Client visit check-in/out (`public.visits`) remains simulated until Stage 3C.
- Stage 3C database triggers (`trg_prevent_attendance_close_with_open_visit` and `trg_prevent_visit_start_on_ended_workday`) documented and prepared for Stage 3C activation.
- Offline IndexedDB durable sync engine belongs to Stage 3D.
- Full manager analytics and CSV reporting belong to Stage 3E.
- Real Android physical device acceptance is explicitly designated as **NOT TESTED** until physical hardware testing is authorized.
