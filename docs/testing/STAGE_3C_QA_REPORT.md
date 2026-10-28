# Stage 3C Quality Assurance, PostGIS Geofence Security & E2E Verification Report

**Document type:** QA, Security & Direct API Verification Report  
**Project:** Carbon Field Sales Tracker  
**Business:** Carbon Car Care  
**Milestone:** Stage 3C (Real Client Visits, Authoritative PostGIS Geofencing, Camera Evidence & Meeting Logs)  
**Date:** October 28, 2026  
**Target Environment:** Hosted Supabase Dev (`[SUPABASE_PROJECT_ID]`) + Local Workstation PWA  
**Status:** **PASSED (143/143 Vitest Tests, 10/10 Direct API & PostGIS/Storage Tests, 1/1 Concurrency Race Test, 12/12 Playwright E2E & Viewport Checks)**

---

## 1. Executive Summary

This report documents the comprehensive verification of **Stage 3C** across database migrations (`00026` and `00027`), service layer (`src/services/visitService.ts`), session state (`src/context/FieldSessionContext.tsx`), and salesperson mobile UI (`src/features/field/VisitWorkflowView.tsx` and `src/features/field/MeetingLogModal.tsx`):

1. **Authoritative Backend PostGIS Geofence Verification (Migration 00027):** Verified that `trg_validate_visit_location_verification()` independently computes WGS84 ellipsoidal distance via `ST_Distance(check_in_geom::geography, pin_geom::geography)`, overrides client-supplied `location_classification`, and rejects deliberate `inside_confident` spoofing attempts with `23514 check_violation`.
2. **Bi-Directional Workday & Visit Transaction Locking (Migration 00026 + 00027):** Verified that End Day acquires `FOR UPDATE` on open normal visits (blocking closure when an active visit exists, AT-03) and Visit Check-In acquires `FOR SHARE` on parent `attendance_days` (blocking check-in against ended or foreign workdays, AT-04). Barrier-synchronized concurrency tests confirm zero race conditions.
3. **Private Premises Photo Storage Isolation (`visit-premises-photos`):** Verified that salespeople can upload JPEG evidence to their own `${userId}/...` folder with `x-upsert: false`, cannot overwrite existing evidence (`409 KeyAlreadyExists`), and cannot upload into another user's folder (`403 AccessDenied`).
4. **Checkout Immutability & Outside-Geofence Preservation:** Verified that `trg_preserve_visit_checkin_evidence_on_update()` blocks modifying check-in coordinates, photo evidence, or historical `branch_pin_id`/`rule_version_id` snapshots during or after checkout, and that checking out outside the 200m geofence preserves the original `location_verified` check-in classification while raising the `Checkout Outside Geofence (>200m)` audit flag.
5. **Active Visit Restoration & Meeting Log Persistence (`public.meeting_logs`):** Verified across both direct PostgREST API and full Playwright browser reloads (`390x844`) that open visits restore automatically from Supabase and meeting logs persist with canonical purpose and free-text next steps ONLY (AT-15).

---

## 2. Direct API, PostGIS Geofence & Storage Security Suite (`scripts/test_stage_3c_db_integrity.py`)

Executed against live Supabase project `https://[SUPABASE_PROJECT_ID].supabase.co`:

| Test ID | Test Case | Target Table / Bucket / Trigger | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| **TEST 1.1** | Prevent starting normal visit on ended workday | `public.visits` (`trg_prevent_visit_start_on_ended_workday`) | `HTTP 400` (`23514`) | `Cannot start visit: Associated workday is not active (status is ended)` | **PASS** |
| **TEST 1.2** | Prevent attaching visit to another employee's attendance day | `public.visits` (`trg_prevent_visit_start_on_ended_workday` + RLS) | `HTTP 400/403/409` | Rejected (`23503` / `23514`) | **PASS** |
| **TEST 2** | Prevent ending attendance while normal visit is open (AT-03) | `public.attendance_days` (`trg_prevent_attendance_close_with_open_visit`) | `HTTP 400` (`23514`) | `Cannot end workday: an active physical visit is currently in progress` | **PASS** |
| **TEST 3.1** | Reject `location_verified` with non-existent/unapproved pin | `public.visits` (`trg_validate_visit_location_verification`) | `HTTP 400/409` | `Cannot associate visit: Branch pin ... does not exist` | **PASS** |
| **TEST 3.2** | Reject `branch_pin_id` belonging to a different branch | `public.visits` (`trg_validate_visit_location_verification`) | `HTTP 400` (`23514`) | `Pin belongs to another branch (...) not ...` | **PASS** |
| **TEST 4** | Reject `location_verified` when `premises_photo_url` is missing (PRD §7.1) | `public.visits` (`trg_validate_visit_location_verification`) | `HTTP 400` (`23514`) | `Cannot mark visit as location_verified: Live premises photo is mandatory` | **PASS** |
| **TEST 5** | Reject client-spoofed `inside_confident` with out-of-bound coordinates `(0.0, 0.0)` | `public.visits` (`ST_Distance` PostGIS check) | `HTTP 400` (`23514`) | `Authoritative PostGIS distance (818170.48 m) + accuracy (10.00 m) does not meet inside_confident threshold (200.00 m)` | **PASS** |
| **TEST 6** | Country Sales Head attempts to insert visit for salesperson (Sole-Author Rule) | `public.visits` (`visits_insert_salesperson_only` RLS) | `HTTP 403` (`42501`) | `new row violates row-level security policy for table "visits"` | **PASS** |
| **TEST 7** | Nigeria salesperson queries or inserts visit for Malawi branch (`MW`) | `public.branches` & `public.visits` | `0 rows` / `HTTP 400` (`23514`) | `Branch market (MW) does not match salesperson assigned market (NG)` | **PASS** |
| **TEST 8** | Private `visit-premises-photos` upload, `x-upsert: false` duplicate block, & cross-user folder block | `storage.objects` (`premises_photos_insert` RLS) | `200 OK` own; `409` dup; `403` foreign folder | Own upload succeeded; overwrite blocked (`KeyAlreadyExists`); foreign folder blocked (`AccessDenied`) | **PASS** |
| **TEST 9** | Full E2E `location_verified` check-in, AT-04 duplicate open visit block, active visit restoration, checkout immutability guard, outside-geofence checkout preserving `location_verified`, and `public.meeting_logs` insert | `public.visits` & `public.meeting_logs` | `201 Created`, `409` dup, `400` tamper block, `200` checkout, `201` meeting log | All 7 sub-assertions passed against live Supabase | **PASS** |
| **TEST 10** | End Workday succeeds once all active visits are checked out | `public.attendance_days` | `HTTP 200 OK` | Workday status transitioned to `'ended'` | **PASS** |

---

## 3. Concurrent Transaction Race Verification (`scripts/test_stage_3c_concurrency_race.py`)

- **Scenario:** Two barrier-synchronized threads fire simultaneously against `https://[SUPABASE_PROJECT_ID].supabase.co`:
  - Thread 1: `PATCH /rest/v1/attendance_days` (`status = 'ended'`)
  - Thread 2: `POST /rest/v1/visits` (`kind = 'normal'`)
- **Observed Result:** Thread 1 committed `200 OK`; Thread 2 was serialized by the `FOR SHARE` lock on `public.attendance_days` and rejected with `HTTP 400` (`{"code":"23514","message":"Cannot start visit: Associated workday is not active (status is ended)"}`).
- **Verdict:** **PASS (Zero Race Conditions)**.

---

## 4. Automated Unit, Integration & Regression Suite (`npx vitest run`)

- **Total Test Suites:** 12 passed (12)
- **Total Tests:** 143 passed (143)
- **Stage 3C Suite (`src/test/stage-3c-client-visits.test.tsx` — 18 tests):**
  - Spatial math (`calculateHaversineDistanceMeters`) and geofence classification (`inside_confident`, `uncertain`, `outside`, `no_fix`).
  - Step 1 initializes with **no client preselected**.
  - Searchable client dropdown and multi-location selector for multi-branch clients.
  - Pending GPS pin approval blocks normal check-in CTA and offers GPS pin proposal (Stage 3E queue) + exception route.
  - Live device geolocation refresh button and rear-camera premises photo capture/retake lifecycle.
  - Check-in transitions to Active Visit Session with elapsed timer and AT-04 protection.
  - Silent active visit cancellation blocked (`cancelVisit()` without force preserves open visit, PRD §5.2).
  - End Day blocked while an active visit is open (AT-03).
  - Checkout outside geofence (`340m > 200m`) prompts acknowledgement warning modal and preserves original `location_verified` check-in status while flagging `Checkout Outside Geofence (>200m)`.
  - `MeetingLogModal` enforces free-text next steps ONLY, canonical `visit_purpose`, and 2-hour deferred log option (AT-15).

---

## 5. Playwright Browser E2E & Multi-Viewport Verification (`scripts/verify_stage_3c_browser.py`)

Verified across mobile and desktop viewports with zero horizontal overflow (`scrollWidth <= innerWidth`):

| Viewport | Device Profile | Overflow Check | Screenshots Captured (`docs/screenshots/stage3c/`) | Status |
|---|---|---|---|---|
| `360x800` | Android Enterprise Handset (Galaxy A15) | `360 <= 360` (`False`) | `stage3c_10_visit_view_360.png` | **PASS** |
| `390x844` | Standard Mobile Viewport (Full E2E Lifecycle) | `390 <= 390` (`False`) | `stage3c_01` through `stage3c_09` (Step 1 empty state, client search, approved pin selection, premises photo capture, active visit in progress, active visit restored after reload, outside-geofence checkout warning modal, meeting log modal, completed visit return) | **PASS** |
| `430x932` | Large Mobile Viewport | `430 <= 430` (`False`) | `stage3c_11_visit_view_430.png` | **PASS** |
| `1280x800` | Country Sales Head Desktop Dashboard | `1280 <= 1280` (`False`) | `stage3c_12_manager_dashboard_1280.png` | **PASS** |

---

## 6. Physical Android Handset Acceptance Status

- **Status:** **NOT TESTED** in local/CI workstation environment.
- **Explanation:** Automated browser, unit, and direct API tests execute on developer workstation hardware using Chromium media/geolocation emulation and live Supabase PostgREST/Storage endpoints. Physical outdoor satellite GPS lock, cellular handoff, and physical rear-camera optical framing on company-issued Samsung Galaxy A15 handsets remain scheduled for Stage 6 Pilot Readiness QA.
