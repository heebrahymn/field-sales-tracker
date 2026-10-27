# Stage 3B Implementation: Real Attendance & Workday Management

**Document type:** Technical Implementation Specification & Architecture Reference  
**Project:** Carbon Field Sales Tracker  
**Business:** Carbon Car Care  
**Milestone:** Stage 3B (Real Attendance & Workday Management)  
**Status:** Completed & Validated  
**Date:** October 27, 2026  
**Reference:** PRD v1.2 (MVP Updated) §2, §6.1, §7.4, §8; AT-01, AT-02, AT-03; ADR 0010  

---

## 1. Objectives & Scope

Stage 3B transitions the Carbon Field Sales Tracker from simulated React-state attendance to **authoritative, Supabase-backed persistence** for daily salesperson workdays.

### In-Scope Deliverables
1. **Real Start Day Attendance:** Live front-camera selfie capture, fresh browser GPS satellite coordinates (horizontal accuracy ≤ 100m), private Supabase Storage upload, and canonical database insertion into `public.attendance_days`.
2. **Real End Day Attendance:** Active workday status verification, PRD §6.1 / AT-03 hard block when an active client visit remains open, fresh checkout GPS acquisition, and state transition to `'ended'`.
3. **Session Durability & Workday Restoration:** Automatic restoration of active `started` or `ended` attendance on page reload, network reconnect, or app reopening, with dynamic multi-user state isolation.
4. **Country Sales Head Attendance Oversight:** Connected `TeamAttendanceReview.tsx` interface displaying real `attendance_days` rows, date filtering, salesperson filtering, and on-demand generation of 300-second signed URLs for private selfie evidence inspection.
5. **Salesperson-Originated Non-Visit Workdays:** Workflow for submitting non-visit workday requests (training, office proposals, internal operations) via RPC `request_non_visit_workday`, and manager approval/rejection via RPC `review_non_visit_workday`.
6. **PRD Governance Rule:** Approved non-visit workdays credit daily attendance compliance while granting **zero physical-visit targets**.
7. **Sole-Author Integrity:** PostgreSQL RLS policies guarantee that only the authenticated salesperson can create their own field attendance evidence. Managers review, approve, or comment, but cannot fabricate records.

### MVP Exclusions & Out-of-Scope Boundaries
- **Stage 3C Client Visits:** Real database writes for physical client visits (`public.visits`, geofence validation, premises photos) remain simulated until Stage 3C.
- **Stage 3D Offline Queue:** Full IndexedDB background event journaling with offline Blob storage belongs to Stage 3D.
- **Biometric Face-Matching:** The selfie viewfinder is an operational audit tool; no claims of automated facial recognition or biometric verification are made.
- **Commercial Boundaries:** Zero quotation management, order tracking, sales pipelines, or revenue analytics.

---

## 2. Architecture & Data Flow

```
[Salesperson Mobile PWA]
       │
       ├─ 1. navigator.mediaDevices.getUserMedia() ──► Live Video Preview ──► Canvas Snapshot (Blob)
       ├─ 2. navigator.geolocation.getCurrentPosition() ──► Satellite Fix (Lat, Lng, Accuracy ≤ 100m)
       ├─ 3. supabase.storage.from('attendance-selfies').upload() ──► Private Bucket (${userId}/...)
       ├─ 4. supabase.from('attendance_days').insert() ──► PostgreSQL (PostGIS Point, Timestamptz)
       │
[Supabase Backend]
       ├─ PostgreSQL RLS: attendance_days_insert_salesperson_only (Enforces auth.uid() = user_id)
       ├─ PostgreSQL RLS: attendance_days_select_market (Restricts CSH to assigned market)
       ├─ Storage RLS: User-scoped path isolation ((storage.foldername(name))[1] = auth.uid()::text)
       ├─ RPC request_non_visit_workday() ──► absence_requests (status = 'pending')
       ├─ RPC review_non_visit_workday() ──► approved_absences (counts_as_attendance = true, visit_target = false)
       │
[Country Sales Head Review]
       ├─ Direct Query: public.attendance_days joined with profiles & devices
       └─ Ephemeral Media Access: supabase.storage.createSignedUrl(path, 300) ──► 5-min Private View
```

---

## 3. Database Schema & RPC Mapping

### 3.1 `public.attendance_days` (Canonical 20-Column Schema)
Verified against PostgreSQL `information_schema.columns` and Stage 2 Migration 00007:

| Column | PostgreSQL Type | Nullable | Description & Constraints |
|---|---|---|---|
| `id` | `uuid` | NO | Primary key (`gen_random_uuid()`) |
| `user_id` | `uuid` | NO | FK to `public.profiles(id)` (`auth.uid()`) |
| `device_id` | `uuid` | NO | FK to `public.devices(id)` (company handset asset) |
| `market_code` | `varchar(2)` | NO | FK to `public.markets(code)` (`NG`, `ZM`, `MW`) |
| `work_date` | `date` | NO | Market-local calendar date; enforced unique via `CONSTRAINT uq_user_work_date UNIQUE (user_id, work_date)` |
| `started_at` | `timestamptz` | NO | Authoritative check-in timestamp (`DEFAULT now()`) |
| `ended_at` | `timestamptz` | YES | Authoritative checkout timestamp |
| `start_latitude` | `numeric(10,7)` | NO | Latitude at Start Day check-in |
| `start_longitude` | `numeric(10,7)` | NO | Longitude at Start Day check-in |
| `start_geom` | `geometry(Point, 4326)` | YES | PostGIS point GENERATED ALWAYS from start lon/lat |
| `start_accuracy_m` | `numeric(6,2)` | NO | Horizontal accuracy in metres (validated ≤ 100m) |
| `start_selfie_url` | `text` | NO | Storage path `${userId}/${workDate}_start_selfie.jpg` in private `attendance-selfies` bucket |
| `end_latitude` | `numeric(10,7)` | YES | Latitude at End Day checkout |
| `end_longitude` | `numeric(10,7)` | YES | Longitude at End Day checkout |
| `end_geom` | `geometry(Point, 4326)` | YES | PostGIS point GENERATED ALWAYS from end lon/lat |
| `end_accuracy_m` | `numeric(6,2)` | YES | Closing horizontal accuracy in metres |
| `status` | `public.attendance_status` | NO | Workday lifecycle enum: `'started'`, `'ended'`, `'auto_closed'`, `'approved_non_visit'`, `'approved_leave'`, `'pending_sync'` |
| `captured_offline` | `boolean` | NO | Offline capture marker (`DEFAULT false`) |
| `server_received_at` | `timestamptz` | NO | Ingestion timestamp (`DEFAULT now()`) |
| `created_at` | `timestamptz` | NO | Record creation timestamp (`DEFAULT now()`) |

### 3.2 Non-Visit Governance Tables & RPCs
- **`public.absence_requests`**: Stores salesperson requests with `absence_type` (`training_development`, `proposal_preparation_office`, `virtual_client_meeting`, `internal_operations`), reason, and `status` (`'pending'`, `'approved'`, `'rejected'`).
- **`public.approved_absences`**: Created upon manager approval. Strictly sets:
  ```sql
  counts_as_attendance = TRUE
  counts_as_visit_target = FALSE
  ```
- **RPC `request_non_visit_workday`**:
  ```sql
  request_non_visit_workday(
    p_date DATE,
    p_absence_type VARCHAR,
    p_reason TEXT
  ) RETURNS JSONB
  ```
- **RPC `review_non_visit_workday`**:
  ```sql
  review_non_visit_workday(
    p_request_id UUID,
    p_decision VARCHAR, -- 'approved' | 'rejected'
    p_notes TEXT
  ) RETURNS JSONB
  ```

---

## 4. Workflows & State Machine

### 4.1 Start Day Workflow
1. **Pre-Check & Database Reconciliation:** `attendanceService.getTodayAttendance(userId, marketCode)` queries `public.attendance_days` for the current market `work_date`. If already active, the app immediately restores the started state without touching Storage; if completed (`'ended'`), duplicate check-in is prevented. Confirmed attendance records cannot be replaced.
2. **Camera Initialization:** User opens Start Day modal. `navigator.mediaDevices.getUserMedia` requests front camera stream (`facingMode: 'user'`). `<video>` element displays live viewfinder.
3. **GPS Satellite Fix:** In parallel, `navigator.geolocation.getCurrentPosition` requests fresh coordinates (`maximumAge: 0`, `timeout: 15000`). Accuracy is checked against the PRD threshold (≤ 100m). If degraded (> 100m), an amber warning prompts the salesperson to move to an open area.
4. **Selfie Capture & Stable Submission ID:** User taps "Capture Selfie". Canvas captures the video frame, converts it to an image/jpeg Blob, and releases all camera media tracks (`track.stop()`). A stable `submissionId` is assigned to this capture session and preserved across retries.
5. **Storage Upload (Immutability & Orphan Prevention):**
   - Storage path: `${userId}/${workDate}_${submissionId}.jpg`.
   - Upload options: `{ contentType: 'image/jpeg', upsert: false }`.
   - By using `upsert: false` and distinct submission IDs, concurrent or malicious requests cannot overwrite confirmed evidence.
   - If a retry with the identical `submissionId` occurs after a network timeout, duplicate resource status is safely reconciled.
6. **Database Insertion & Error Cleanup:** Exact coordinates, accuracy, and storage reference are inserted into `public.attendance_days`.
   - If insertion succeeds: attendance is confirmed.
   - If insertion fails with unique constraint `23505` (concurrent submission): the uncommitted upload for this attempt is cleaned up from Storage, and the database is queried to return the confirmed winner record without touching the winner's file.
   - If insertion fails with any other error: the uncommitted file is removed from Storage, preventing uncontrolled orphan files.
7. **Confirmation:** UI transitions to confirmation screen displaying employee name, local time, GPS accuracy, and assigned handset asset tag. Context state updates to `workdayStatus = 'started'`.

### 4.2 End Day Workflow & Multi-Tiered Active Visit Protection
1. **Tier 1 — Frontend Guard (PRD §6.1 / AT-03):** If `activeVisitId !== null`, End Day is **hard blocked**. The modal displays an alert instructing the salesperson to check out of their active client meeting first.
2. **Tier 2 — Service Layer Fail-Closed Validation:** `attendanceService.endDayAttendance` queries `public.visits` where `attendance_day_id = id` and `check_out_at IS NULL` for active normal visits:
   - **Fail-Closed on Query Errors:** If the visit query fails (connectivity issue, timeout, or RLS error), End Day **halts immediately**. It does NOT proceed with updating `attendance_days`, returns a clear temporary error message, and allows a safe retry. It never assumes an empty result means no open visits when the query failed.
   - **Active Visit Block:** If `openVisits.length > 0`, an explicit AT-03 error is returned.
3. **Tier 3 — Stage 3C Database Integration Contract:**
   Full database-level constraint enforcement will be activated when persisted visits are introduced in Stage 3C. The contract requires:
   - **Prevent Attendance Close with Open Visits:**
     ```sql
     CREATE OR REPLACE FUNCTION public.trg_prevent_attendance_close_with_open_visit()
     RETURNS TRIGGER AS $$
     BEGIN
         IF NEW.status = 'ended' AND OLD.status = 'started' THEN
             IF EXISTS (
                 SELECT 1 FROM public.visits
                 WHERE attendance_day_id = NEW.id
                   AND check_out_at IS NULL
                   AND kind = 'normal'
                 FOR UPDATE
             ) THEN
                 RAISE EXCEPTION 'Cannot end workday: an active physical visit is currently in progress (PRD §6.1 / AT-03).'
                     USING ERRCODE = '23514'; -- check_violation
             END IF;
         END IF;
         RETURN NEW;
     END;
     $$ LANGUAGE plpgsql SECURITY DEFINER;

     CREATE TRIGGER trg_check_open_visits_before_attendance_close
         BEFORE UPDATE ON public.attendance_days
         FOR EACH ROW
         WHEN (NEW.status = 'ended' AND OLD.status = 'started')
         EXECUTE FUNCTION public.trg_prevent_attendance_close_with_open_visit();
     ```
   - **Prevent Visit Start on Ended Workday:**
     ```sql
     CREATE OR REPLACE FUNCTION public.trg_prevent_visit_start_on_ended_workday()
     RETURNS TRIGGER AS $$
     DECLARE
         v_status public.attendance_status;
     BEGIN
         SELECT status INTO v_status FROM public.attendance_days WHERE id = NEW.attendance_day_id;
         IF v_status IS NULL OR v_status != 'started' THEN
             RAISE EXCEPTION 'Cannot start visit: Associated workday is not active (status is %)'
                 USING ERRCODE = '23514';
         END IF;
         RETURN NEW;
     END;
     $$ LANGUAGE plpgsql SECURITY DEFINER;

     CREATE TRIGGER trg_check_workday_active_before_visit_start
         BEFORE INSERT ON public.visits
         FOR EACH ROW
         WHEN (NEW.kind = 'normal')
         EXECUTE FUNCTION public.trg_prevent_visit_start_on_ended_workday();
     ```
   - **Transactional Integrity:** Row locks (`FOR UPDATE`) prevent race conditions between concurrent checkout and End Day operations.
   - **Exception Compatibility:** Historical missed-visit and GPS-failure exceptions (`kind != 'normal'`) are unaffected.
4. **Closing Telemetry Fix:** When no active visit exists and query succeeds, fresh checkout GPS coordinates are acquired.
5. **Database Update:** Record in `public.attendance_days` is updated:
   ```sql
   status = 'ended',
   ended_at = now(),
   end_latitude = lat,
   end_longitude = lng,
   end_accuracy_m = accuracy
   ```
6. **Summary Display:** Modal displays attended duration, start time, end time, and transitions context state to `workdayStatus = 'ended'`. Tile 1 on the dashboard updates to *"Workday Completed — Today's operational log saved"*.

### 4.3 Session Restoration & Persistence
- On component mount (`FieldSessionContext.tsx`), `loadTodayAttendance` fetches the day's record for `auth.uid()`.
- If an unclosed record (`status = 'started'`) exists, `workdayStatus` is set to `'started'`, restoring live elapsed timer and active state without requiring re-entry.
- When logging out, dynamic context keying (`key={`field-${currentUser.id}`}`) unmounts all operational providers, purging memory state and preventing cross-user data leaks.

### 4.4 Country Sales Head Review & Signed URLs
- Country Sales Head accesses `TeamAttendanceReview.tsx`.
- Attendance rows are queried directly from `public.attendance_days` joined with `profiles` and `devices`, sandboxed to the manager's assigned `market_code`.
- Clicking "Inspect Evidence" opens a telemetry modal. Because the `attendance-selfies` bucket is private, `attendanceService.getSelfieSignedUrl(storagePath)` invokes:
  ```typescript
  supabase.storage.from('attendance-selfies').createSignedUrl(storagePath, 300);
  ```
  This yields a secure, time-limited URL valid for 300 seconds (5 minutes), preventing unauthorized long-term image exposure.

---

## 5. Market Timezone Handling

To prevent date attribution errors across midnight or due to skewed device clocks, the business workday date is computed using authoritative market IANA timezones:

| Market | Market Code | Timezone | UTC Offset |
|---|---|---|---|
| Nigeria | `NG` | `Africa/Lagos` | UTC+1 (WAT) |
| Zambia | `ZM` | `Africa/Lusaka` | UTC+2 (CAT) |
| Malawi | `MW` | `Africa/Blantyre` | UTC+2 (CAT) |

Implementation in `src/services/attendanceService.ts`:
```typescript
export function getMarketWorkDate(marketCode?: string): string {
  const tz = getMarketTimezone(marketCode);
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // Guaranteed YYYY-MM-DD in market local time
}
```

---

## 6. Security, RLS & Privacy Controls

1. **Salesperson Sole-Author Rule:**
   - Policy: `attendance_days_insert_salesperson_only`
   - Evaluation: `auth.uid() = user_id`
   - Verification: Managers attempting direct attendance insertion receive `HTTP 403 Forbidden` / RLS violation.
2. **Country Sandboxing:**
   - Policy: `attendance_days_select_market`
   - Evaluation: `market_code = auth_market() OR auth_role() = 'hq_admin'`
   - Verification: CSH for Nigeria cannot view Zambia or Malawi attendance records.
3. **Private Selfie Storage:**
   - Bucket: `attendance-selfies` (Private, non-public).
   - Upload Policy: `(storage.foldername(name))[1] = auth.uid()::text`.
   - Access: Ephemeral 300s signed URLs only. Raw paths never exposed to public internet.
4. **Hardware Lifecycle Safety:**
   - Video tracks are strictly stopped on capture or component unmount to prevent lingering camera hardware indicators.

---

## 7. Limitations & Stage 3C Dependencies

1. **Simulated Client Visits in Stage 3B:** While daily attendance is fully backed by PostgreSQL, physical client visit check-ins (`public.visits`) remain simulated until Stage 3C. The End Day AT-03 check correctly evaluates the in-memory active visit state.
2. **Online Prerequisite:** Stage 3B requires active internet connectivity for attendance persistence. Offline event journaling and IndexedDB queue sync will be implemented in Stage 3D.
3. **Browser Geolocation API:** Browser location is subject to hardware availability and user permission. Hardware GPS spoof-proofing is not supported by standard web APIs in MVP. Browser Geolocation API must not be described as guaranteed satellite GPS.
4. **Physical Android Handset Testing:** In the current development milestone, verification was conducted using Playwright Chromium browser viewport automation (360x800, 390x844, 430x932). Genuine physical Android handset acceptance is explicitly designated as **NOT TESTED** until dedicated hardware testing on company-issued handsets is conducted.

---

## 8. Physical Android Handset Test Plan (Pre-Stage 3C Field Pilot)

The following minimum test matrix must be executed on company-issued physical Android devices (e.g., Samsung Galaxy A-series or equivalent enterprise test units) before commencing the Stage 3C field pilot:

| Test Area | Procedure | Expected Physical Behavior | Status |
|---|---|---|---|
| **1. GPS Permission & Satellite Fix** | Open Start Day modal on fresh Chrome/PWA install. | System prompts for Android location permission ("While using the app"). GPS satellite fix acquired with reported horizontal accuracy ≤ 100m. If indoor/degraded, displays amber warning. | **NOT TESTED** (Browser Emulated Only) |
| **2. Camera Access & Selfie Orientation** | Allow camera access in Start Day modal. | Front-facing camera (`facingMode: 'user'`) opens smoothly. Viewfinder displays mirrored natural orientation. Snapshot creates clean JPEG; hardware camera indicator light immediately turns off. | **NOT TESTED** (Browser Emulated Only) |
| **3. Start Day Submission** | Tap "Confirm & Start Day" under outdoor satellite lock. | Progress indicator activates. Private selfie uploads; row inserts into `public.attendance_days`. Success screen displays local time and GPS accuracy. | **NOT TESTED** (Browser Emulated Only) |
| **4. End Day Submission & Visit Guard** | Attempt End Day with active simulated visit, then checkout and complete End Day. | Active visit warning blocks End Day. After checkout, End Day captures closing GPS fix, writes checkout timestamp, and transitions Tile 1 to "Workday Completed". | **NOT TESTED** (Browser Emulated Only) |
| **5. Network Disconnection & Reconnection** | Disconnect Wi-Fi/cellular mobile data during submission. | Error banner displays clear offline/connectivity failure message. No corrupt or orphaned database records. User can tap retry once mobile network resumes. | **NOT TESTED** (Browser Emulated Only) |
| **6. Browser Refresh & Session Restoration** | Close browser tab or swipe away PWA during active workday. Reopen app. | Auth session and active workday state (`workdayStatus = 'started'`) are restored automatically from `public.attendance_days` without requiring re-check-in. | **NOT TESTED** (Browser Emulated Only) |
| **7. Backgrounding & Screen Lock** | Lock phone screen or switch to phone dialer while camera viewfinder is active. | MediaStream tracks release gracefully. App does not crash or drain battery. Re-entering app prompts fresh camera initialization. | **NOT TESTED** (Browser Emulated Only) |
