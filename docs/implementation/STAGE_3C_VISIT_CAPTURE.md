# Stage 3C Implementation Specification: Client Visit Capture, PostGIS Geofencing, Camera Evidence & Meeting Logs

**Document type:** Technical Implementation Specification & Architecture Baseline  
**Project:** Carbon Field Sales Tracker  
**Business:** Carbon Car Care  
**Milestone:** Stage 3C (Physical Client Visit Check-In/Out, Authoritative PostGIS Geofencing, Premises Photography & Meeting Documentation)  
**Status:** Completed & Verified (Database Migrations 00026–00027 + Frontend & Service Integration)  
**Date:** October 28, 2026  
**Reference:** PRD v1.2 (MVP Updated) §2, §6.1, §7.1, §7.2, §7.3, §8.3, §8.4; AT-03, AT-04, AT-05, AT-15; ADR 0011  
**Database Migrations:**
- `supabase/migrations/20261028000026_stage_3c_visit_integrity_and_triggers.sql`
- `supabase/migrations/20261028000027_stage_3c_authoritative_geofence_verification.sql`

---

## 1. Objectives & Scope

Stage 3C transitions the Carbon Field Sales Tracker from simulated visit workflows to **authoritative Supabase persistence** for salesperson physical branch visits, server-side PostGIS GPS geofencing, rear-camera premises photography, private storage evidence isolation, active visit restoration, and qualitative meeting documentation logs.

### Core Deliverables Implemented
1. **Real Client & Physical Location Selection (`public.organisations`, `public.branches`, `public.branch_location_pins`, `public.client_contacts`):**
   - Starts with **no client preselected**.
   - Searchable client directory and dropdown supporting multi-branch organisations and shared switchboard phone numbers.
   - Distinguishes approved (`approved`) vs pending (`pending_approval`) or rejected (`rejected`) GPS pins.
   - Blocks normal location-verified check-in for branches without an approved pin, offering both a GPS pin proposal entry point (Stage 3E governance queue) and an operational visit exception route.
2. **Authoritative GPS Pin & Market Rule Retrieval (`public.branch_location_pins`, `public.market_rules`):**
   - Loads active market rules (`geofence_radius_m = 200m`, `max_visit_gps_accuracy_m = 100m`, `version_tag`) and approved pin coordinates from Supabase.
   - Preserves the confidence calculation: `distance + reported_accuracy <= geofence_radius` AND `reported_accuracy <= max_visit_gps_accuracy_m`.
3. **Backend-Authoritative PostGIS Geofence Verification (Migration 00027):**
   - Independently computes WGS84 ellipsoidal distance in PostgreSQL (`ST_Distance(check_in_geom::geography, pin_geom::geography)`) and overrides client-supplied `location_classification` (`inside_confident`, `uncertain`, `outside`, `no_fix`).
   - Prevents any client-supplied `inside_confident` spoofing attempt from producing a `location_verified` visit when coordinates are outside the geofence or accuracy exceeds limits.
   - Enforces foreign-key integrity across `branch_id`, `branch_pin_id`, `rule_version_id`, `attendance_day_id`, and salesperson `market_code`.
4. **Live Rear-Camera Premises Photo Capture & Private Storage (`visit-premises-photos`):**
   - Requests environment-facing camera (`facingMode: { ideal: 'environment' }`), displays live viewfinder, captures compressed JPEG (`<= 1280x720`, `0.85` quality), supports preview and retake, and cleans up media tracks on capture/unmount.
   - Uploads to private Supabase Storage bucket `visit-premises-photos` under `${userId}/${visitId}_premises_${timestamp}.jpg` with `upsert: false`.
   - Rejects bundled mock images in authenticated sessions and cleans up uncommitted storage objects if the database insert fails.
5. **Active Visit Restoration & Bi-Directional Workday Locking (AT-03, AT-04):**
   - Restores open visits (`check_out_at IS NULL AND kind = 'normal'`) from Supabase across page reloads and re-logins.
   - Enforces single open normal visit via `uq_single_open_visit_per_rep` (`23505`) and serializes concurrent End Day vs. Visit Check-In via `FOR UPDATE` / `FOR SHARE` row-level locks (`23514`).
6. **Real Visit Checkout & Immutability (`trg_preserve_visit_checkin_evidence_on_update`):**
   - Captures checkout coordinates and timestamp, prompts acknowledgement when checking out outside the 200m geofence (AT-05), and raises the `Checkout Outside Geofence (>200m)` flag **without** rewriting the original `location_verified` check-in classification.
   - Prevents tampering with historical check-in coordinates, photo evidence, or pin/rule snapshots during or after checkout.
7. **Meeting Log Persistence (`public.meeting_logs`, AT-15):**
   - Persists qualitative meeting outcome, canonical `visit_purpose`, multi-select `products_discussed`, optional `fleet_size_volume`, mandatory free-text `next_step_text`, and optional business card photo (`business-cards` bucket).
   - Strictly excludes quotations, orders, revenue values, sales pipelines, and automated follow-up task engines.

---

## 2. Architecture & Data Flow

```
[Salesperson Mobile PWA]
       │
       ├─ 1. Select Client & Branch ──► Query public.branches, organisations, branch_location_pins, client_contacts
       ├─ 2. Acquire Device GPS ──► navigator.geolocation.getCurrentPosition(enableHighAccuracy: true)
       ├─ 3. Capture Live Premises Photo ──► getUserMedia(facingMode: 'environment')
       │      └─ Upload to private bucket 'visit-premises-photos' (${userId}/${visitId}_premises_${ts}.jpg, upsert: false)
       ├─ 4. Visit Check-In ──► INSERT INTO public.visits (kind: 'normal', check_in_at: now())
       │      ├─ Trigger trg_prevent_visit_start_on_ended_workday:
       │      │  Acquires FOR SHARE lock on attendance_days; verifies ownership & status = 'started'
       │      └─ Trigger trg_validate_visit_location_verification:
       │         Computes PostGIS ST_Distance, overrides location_classification, snapshots pin & rule versions,
       │         and enforces approved pin + inside_confident + non-empty premises_photo_url for location_verified
       ├─ 5. Visit Check-Out ──► UPDATE public.visits SET check_out_at = now(), check_out_latitude = ...
       │      ├─ Trigger trg_preserve_visit_checkin_evidence_on_update:
       │      │  Blocks any modification to check-in coordinates, photo URL, pin/rule snapshots, or verification_status
       │      └─ Outside-geofence checkout permitted with warning modal & audit flag; original check-in status preserved
       └─ 6. Qualitative Meeting Log ──► INSERT INTO public.meeting_logs
              (contact_id, purpose, products_discussed, fleet_size_volume, outcome_narrative, next_step_text)
              (Zero quotation, order, pipeline, or task entities!)
```

---

## 3. Database Integrity & Security Enforcement

### 3.1 Applied Migrations on `[SUPABASE_PROJECT_ID]`
1. **`20261028000026_stage_3c_visit_integrity_and_triggers.sql`:**
   - `trg_prevent_attendance_close_with_open_visit()` (`FOR UPDATE` lock on open normal visits when closing attendance).
   - `trg_prevent_visit_start_on_ended_workday()` (`FOR SHARE` lock on parent `attendance_days` row when starting a visit, with corrected `%` format string `v_status::text`).
   - Initial `trg_validate_visit_location_verification()`.
2. **`20261028000027_stage_3c_authoritative_geofence_verification.sql`:**
   - Upgrades `trg_prevent_visit_start_on_ended_workday()` to verify `attendance_days.user_id = NEW.user_id` (prevents attaching a visit to another employee's attendance record).
   - Upgrades `trg_validate_visit_location_verification()` to:
     - Verify `branches.market_code` matches `profiles.market_code` for `NEW.user_id`.
     - Verify `branch_location_pins.branch_id = NEW.branch_id` and `market_rules.market_code = branches.market_code`.
     - Compute authoritative PostGIS ellipsoidal distance (`ST_Distance(check_in_geom::geography, pin_geom::geography)`) and overwrite `NEW.distance_to_pin_m` and `NEW.location_classification`.
     - Require `v_computed_classification = 'inside_confident'`, `v_pin_status = 'approved'`, `v_pin_active = true`, and non-empty `NEW.premises_photo_url` whenever `NEW.verification_status = 'location_verified'`.
   - Adds `trg_preserve_visit_checkin_evidence_on_update()` to prevent mutating immutable check-in fields or historical pin/rule snapshots during or after checkout.
   - Tightens `visits_insert_salesperson_only` RLS policy to enforce market isolation and attendance ownership at the RLS layer.

---

## 4. Frontend & Service Layer Architecture

### 4.1 `src/services/visitService.ts`
- `calculateHaversineDistanceMeters` & `evaluateGeofenceClassification`: Client-side preliminary spatial preview matching the server's confidence threshold (`distance + accuracy <= radius`).
- `getCurrentLocation`: Fresh `navigator.geolocation.getCurrentPosition` (`maximumAge: 0`, `enableHighAccuracy: true`, `timeout: 15000`).
- `getClientsAndBranches`, `getBranchApprovedPin`, `getActiveMarketRules`: Queries live Supabase records scoped by market.
- `uploadPremisesPhoto` & `removePremisesPhoto`: Uploads JPEG blobs to private bucket `visit-premises-photos` with `upsert: false` and cleans up uncommitted files if check-in fails.
- `uploadBusinessCard`: Uploads optional business card photos to private bucket `business-cards`.
- `checkInVisit`, `getActiveVisit`, `checkOutVisit`, `submitMeetingLog`, `getTodayCompletedVisits`: Full lifecycle persistence with database reconciliation on retries.

### 4.2 `src/features/field/VisitWorkflowView.tsx` & `src/features/field/MeetingLogModal.tsx`
- 3-step guided mobile check-in (`Step 1: Select Client`, `Step 2: Geofence Validation`, `Step 3: Live Premises Photo`) with sticky primary action footer (`#sticky-visit-workflow-cta`).
- Active Visit Session view with live elapsed timer, locked client/branch details, AT-04 single-visit notice, outside-geofence checkout warning dialog (`role="dialog"`, `aria-modal="true"`), and `MeetingLogModal`.

---

## 5. Mobile Hardware Acceptance & Disclaimer

- **Physical Handset Acceptance:** **NOT TESTED** in local/CI workstation environment.
- **Handset Fleet:** Samsung Galaxy A15 Enterprise Edition (company-provided).
- **Workstations:** Local verification executes across Vitest, Playwright headless Chromium (`360x800`, `390x844`, `430x932`, `1280x800`), and direct Python PostgREST/Storage API test suites against hosted Supabase `[SUPABASE_PROJECT_ID]`. Physical Android handset field testing is scheduled for Stage 6 Pilot Readiness.
