# Stage 3D QA & Security Verification Report: Offline IndexedDB Journal, Media Queuing & Dependency Synchronisation

**Document type:** QA, Offline Integrity & Security Verification Report  
**Project:** Carbon Field Sales Tracker  
**Business:** Carbon Car Care  
**Milestone:** Stage 3D (Durable Offline Operations, IndexedDB Event Journal, Binary Media Queue & Topological Dependency Sync)  
**Status:** Passed (13/13 Vitest Suites, 170/170 Automated Tests including 27 Stage 3D Scenarios + Full 16-Step Offline Workday, App-Shell Cold-Start & Multi-User Isolation Browser Suite)  
**Date:** October 28, 2026  
**Reference:** PRD v1.2 (MVP Updated) §6.1, §7.1, §7.2, §7.3, §8.4, §9; AT-01–AT-05, AT-15; ADR 0010, ADR 0011, ADR 0012  

---

## 1. Executive Summary

Stage 3D introduces durable IndexedDB offline persistence (`src/services/offlineSyncService.ts` via `Dexie.js`), binary camera media queuing (`attendance_selfie`, `visit_premises_photo`, `business_card_photo`), topological dependency synchronisation, capture-time pin/rule version immutability, sync-execution-boundary authorization, safe app-shell service worker caching (`public/sw.js`), server-authoritative PostGIS geofence verification upon sync, duplicate-key (`23505`) reconciliation, and cross-user isolation.

All **26 test blocks covering 27 Stage 3D test scenarios** (`src/test/stage-3d-offline-sync.test.tsx`), all **12 prior regression test suites** (`170/170` total Vitest tests), TypeScript strict compilation (`npx tsc --noEmit`), ESLint (`npm run lint`), production build (`npm run build`), Stage 3C RLS/DB integrity tests (`scripts/test_stage_3c_db_integrity.py` — `15/15` passed), and the full 16-step Playwright offline workday & multi-user isolation browser suite (`scripts/verify_stage_3d_browser.py`) passed with zero errors.

---

## 2. Mandatory 27 Stage 3D Test Scenarios (`src/test/stage-3d-offline-sync.test.tsx`)

| # | Scenario | Verification Focus | Status |
|---|---|---|---|
| **01** | Offline Start Day queues attendance event and selfie Blob in IndexedDB | Verifies `ATTENDANCE_START_DAY` journal row, `attendance_selfie` `Uint8Array` binary payload in `mediaQueue`, and provisional `pending_sync` status | **PASS** |
| **02** | Offline Start Day survives page refresh / IndexedDB re-read | Re-queries `offlineDb` and `cachedContext` to confirm provisional attendance record, coordinates, and selfie binary bytes persist intact | **PASS** |
| **03** | Offline Visit Check-In queues visit event and premises photo Blob | Verifies `VISIT_CHECKIN` event depends on `ATTENDANCE_START_DAY` (`dependsOnTxUuids`), stores `visit_premises_photo` in `mediaQueue`, and marks visit `pending_sync` | **PASS** |
| **04** | Offline active visit survives page refresh | Verifies `localActiveVisit` in `cachedContext` retains branch, coordinates, accuracy, elapsed time, and `pending_sync` status across reload | **PASS** |
| **05** | Offline Checkout queues checkout event dependent on visit check-in | Verifies `VISIT_CHECKOUT` depends on `VISIT_CHECKIN` transaction UUID, clears `localActiveVisit`, and appends to `localCompletedVisits` as `pending_sync` | **PASS** |
| **06** | Offline Meeting Log queues log event and optional business card photo | Verifies `MEETING_LOG_SUBMIT` depends on `VISIT_CHECKIN` + `VISIT_CHECKOUT`, stores `business_card_photo` in `mediaQueue`, and enforces free-text `nextStepText` | **PASS** |
| **07** | Offline End Day is blocked while an active visit remains open (AT-03) | Verifies `enqueueEndDay` returns `23514` check violation (`Cannot end workday while a client visit is still in progress`) when `localActiveVisit` is open | **PASS** |
| **08** | Offline End Day queues after visit checkout | Verifies `ATTENDANCE_END_DAY` queues cleanly after checkout and depends on `ATTENDANCE_START_DAY`, `VISIT_CHECKIN`, and `VISIT_CHECKOUT` | **PASS** |
| **09** | Reconnection synchronises dependent events in strict topological order | Verifies execution sequence: `UPLOAD:attendance-selfies` → `DB:ATTENDANCE_START_DAY` → `UPLOAD:visit-premises-photos` → `DB:VISIT_CHECKIN` → `DB:VISIT_CHECKOUT` → `UPLOAD:business-cards` → `DB:MEETING_LOG_SUBMIT` → `UPLOAD:attendance-selfies` → `DB:ATTENDANCE_END_DAY` | **PASS** |
| **10** | Child event does not sync if parent event fails (`blocked_dependency`) | Simulates parent `ATTENDANCE_START_DAY` failure; verifies downstream `VISIT_CHECKIN` transitions to `blocked_dependency` and is not sent to Supabase | **PASS** |
| **11** | Media uploaded once is not re-uploaded when only DB step is retried | Simulates Storage upload success followed by transient DB timeout on first sync; verifies second sync does not call Storage `.upload()` again (`uploadCallCount === 1`) | **PASS** |
| **12** | Retried check-in or checkout does not create duplicate visit rows (`23505` idempotency) | Simulates PostgreSQL `23505` duplicate key on retry after client timeout; verifies sync engine reconciles with existing server row and marks `synced` | **PASS** |
| **13** | Retried meeting log does not create duplicate meeting log rows | Verifies idempotent `MEETING_LOG_SUBMIT` retry reconciles with existing `meeting_logs` row | **PASS** |
| **14** | Offline outside-geofence visit does not become `location_verified` after sync | Captures visit 350m away offline (`outside`); verifies server sync preserves `location_unverified` | **PASS** |
| **15** | Offline inside-geofence visit becomes `location_verified` only after server confirms | Verifies visit starts as `pending_sync` offline and promotes to `location_verified` only after server PostGIS response returns `location_verified` | **PASS** |
| **16** | Failed meeting log remains pending in IndexedDB and visible in Sync Queue | Simulates server failure on `MEETING_LOG_SUBMIT`; verifies event stays `failed` with `retryCount = 1`, `nextRetryAfter` backoff, and error message | **PASS** |
| **17** | Manual `Sync Now` processes eligible queued items | Renders `OfflineSyncView`, clicks `Sync Now`, and verifies queued items transition to `synced` | **PASS** |
| **18** | Per-item retry works for a failed operation | Verifies `retrySingleEvent` resets backoff and synchronises a previously failed item | **PASS** |
| **19** | Offline state banner and queue counts update accurately | Verifies `OfflineSyncView` and `PersistentStatusStrip` render `Offline — Capturing Locally`, pending counts, media KB, and quota progress bar | **PASS** |
| **20** | Cross-user protection prevents User B from viewing or syncing User A's queue | Enqueues events for `USER_A`, queries/syncs as `USER_B`; verifies `USER_B` sees 0 events from `USER_A` and `clearInMemoryStateOnLogout` preserves `USER_A`'s IndexedDB journal | **PASS** |
| **21** | Storage quota failure / unavailable IndexedDB shows clear user guidance | Mocks `navigator.storage.estimate` at 98.4% usage; verifies `enqueueMedia` returns actionable quota error without silently dropping photo evidence | **PASS** |
| **22** | Server rule/pin change while offline re-evaluates verification and routes to `needs_review` | Simulates offline capture at $140\text{m} + 40\text{m} = 180\text{m}$ under 200m rule, followed by server rule tightening to 150m before sync; verifies `VISIT_CHECKIN` transitions to `needs_review` | **PASS** |
| **23** | Clock anomaly detection flags backward device clock drift without trusting client time | Sets `lastKnownServerTimeMs` ahead of client clock by 1 hour; verifies `clockSkewWarning` is recorded on the journal event | **PASS** |
| **24** | Capture-time `branchPinId`/`branchPinVersion` or `ruleVersionId` change transitions visit to `needs_review` without silent substitution | Verifies that if the server's active `branch_pin_id`, `version_number`, or `rule_version_id` changes before sync, `_syncSingleEventToServer` marks the visit `needs_review` rather than silently substituting the new pin/rule | **PASS** |
| **25** | Cross-midnight offline capture preserves capture-day `work_date` (`YYYY-MM-DD` in market timezone) | Captures Start Day at `23:50` in `Africa/Lagos` (`2026-10-28`) and syncs after midnight (`2026-10-29`); verifies `work_date = '2026-10-28'` is preserved | **PASS** |
| **26** | Sync execution boundary blocks suspended employees (`is_active = false`) and JWT owner mismatches | Verifies `syncUserQueue` blocks execution when `profiles.is_active === false` or when the active GoTrue JWT user ID does not match `ownerUserId` | **PASS** |
| **27** | Failed online meeting log submission is durably queued in IndexedDB and survives reload | Simulates an online `MEETING_LOG_SUBMIT` failure; verifies `enqueueMeetingLog(..., { initialSyncStatus: 'failed' })` persists the log in IndexedDB across reload and syncs cleanly on retry | **PASS** |

---

## 3. Full 16-Step Offline Workday, App-Shell Cold-Start & Multi-User Isolation Browser Verification (`scripts/verify_stage_3d_browser.py`)

### 3.1 Full 16-Step Offline Workday Lifecycle (Real Supabase + Chromium IndexedDB)
Executed end-to-end as `tunde.adebayo@carboncarcare.com` (`user_id = 11111111-1111-4111-a111-111111111111`, Market `NG`):
1. **Authenticated Session & Context Download:** Signed in against real Supabase GoTrue and cached 4 authorised Nigerian client branches (`Apex Heavy Logistics`, `Dangote Cement`, `Julius Berger`, `Lafarge Africa`) and active market rule `NG-v1.0` in IndexedDB (`cachedContext`).
2. **Offline Transition:** Disabled network connectivity (`ctx_390.set_offline(True)`).
3. **Offline Start Day:** Captured GPS (`6.4428, 3.3649, ±12m`) and live front-camera selfie Blob; queued `ATTENDANCE_START_DAY` (`tx_uuid = 70ef7b25-216b-4adf-ae13-ec1551682059`) and `attendance_selfie` in IndexedDB.
4. **Client & Location Selection:** Selected `Apex Heavy Logistics Ltd — Apapa Wharf Fleet Terminal` (`branch_id = d1111111-1111-4111-a111-111111111101`, `pin_id = e1111111-1111-4111-a111-111111111101`).
5. **Offline Visit Check-In:** Captured rear-camera premises photo Blob and GPS; queued `VISIT_CHECKIN` (`tx_uuid = 77cac3ec-02b0-4a45-82d2-eedf4a9c676c`, dependent on `70ef7b25-...`) and `visit_premises_photo` in IndexedDB.
6. **Offline Visit Checkout:** Completed checkout; queued `VISIT_CHECKOUT` (`tx_uuid = 87d2c91e-30fa-425e-9962-d3e6c2b55b58`, dependent on `77cac3ec-...`).
7. **Offline Meeting Log + Business Card:** Submitted meeting log with narrative outcome, free-text next step, and live business-card photo Blob; queued `MEETING_LOG_SUBMIT` (`tx_uuid = 45eb8047-dec0-4ba0-9b25-a6518d1edc7f`, dependent on `77cac3ec-...` and `87d2c91e-...`) and `business_card_photo`.
8. **Offline End Day:** Completed End Day; queued `ATTENDANCE_END_DAY` (`tx_uuid = f4ab833c-0677-433b-a68f-277402ba8c68`, dependent on `70ef7b25-...`, `77cac3ec-...`, `87d2c91e-...`).
9. **IndexedDB Inspection:** Confirmed all **5 events** (`pending`) and **3 binary media records** (`14 KB` `Uint8Array`) persisted in `CarbonOfflineJournalDB`.
10. **Offline Browser Refresh & App-Shell Cold-Start:**
    - Reloaded page (`page.reload()`) while offline -> `/sw.js` served the app shell, `AuthContext` restored the cached profile, and all 5 pending events + 3 media Blobs remained visible to Employee A.
    - Closed the page (`page.close()`) and opened a fresh page (`ctx_390.new_page()`) while offline -> cold-start succeeded via `/sw.js` with all 5 pending events intact.
11. **Multi-User Isolation in Browser (Employee A -> Employee B -> Employee A):**
    - Signed out Employee A (`tunde.adebayo@carboncarcare.com`) and signed in Employee B (`peter.mwale@carboncarcare.com`, `salesperson`, Market `ZM`).
    - Confirmed Employee B saw `0` events and `0` media (`{"bEventCount": 0, "bMediaCount": 0, "aPendingCount": 5}`), while Employee A's 5 events remained untouched in IndexedDB.
    - Signed Employee B out, signed Employee A back in, and recovered all 5 queued events.
12. **Network Reconnection & Topological Synchronisation:** Re-enabled network (`ctx_390.set_offline(False)`) and synchronised the journal.
13. **Authoritative Supabase Database Verification (`[SUPABASE_PROJECT_ID]`):**
    - `public.attendance_days`: `count = 1`, `id = 96cb2f64-46b1-4cda-a0cc-bd280f695d7f`, `status = 'ended'`, `start_selfie_url = '11111111-1111-4111-a111-111111111111/2026-10-28_491fc85f-fc82-4df2-a55b-b38c1cebf1c8.jpg'`
    - `public.visits`: `count = 1`, `id = c464f50e-7219-452f-8aca-648f2e06a255`, `attendance_day_id = 96cb2f64-46b1-4cda-a0cc-bd280f695d7f`, `verification_status = 'location_verified'`, `location_classification = 'inside_confident'`, `check_out_at = '2026-10-28 13:21:39.352+00'`, `premises_photo_url = '11111111-1111-4111-a111-111111111111/c464f50e-7219-452f-8aca-648f2e06a255_premises_6fc2f76c-44d8-4082-aaf7-444c3c8cfdae.jpg'`
    - `public.meeting_logs`: `count = 1`, `id = 2f46ea4c-1d21-4b14-a78c-95d9e0219e09`, `visit_id = c464f50e-7219-452f-8aca-648f2e06a255`, `business_card_photo_url = '11111111-1111-4111-a111-111111111111/c464f50e-7219-452f-8aca-648f2e06a255_card_c41ff888-a768-42e6-9288-afc380e5e6bf.jpg'`

### 3.2 Multi-Viewport Layout & Responsive Verification
Verified across mobile and desktop viewports with zero horizontal overflow (`document.documentElement.scrollWidth <= window.innerWidth`):
- **Mobile `360×800`:** `docs/screenshots/stage3d/stage3d_06_sync_queue_360.png`
- **Mobile `390×844`:**
  - Online Sync Queue & Quota Telemetry: `docs/screenshots/stage3d/stage3d_01_sync_queue_online_390.png`
  - Offline Mode Banner (`Offline — Capturing Locally`): `docs/screenshots/stage3d/stage3d_02_offline_mode_banner_390.png`
  - Offline Visit Check-In Queued in IndexedDB: `docs/screenshots/stage3d/stage3d_03_offline_visit_active_390.png`
  - Sync Queue Pending Event & Media Telemetry (5 Queued Events + 3 Media Blobs): `docs/screenshots/stage3d/stage3d_04_sync_queue_pending_events_390.png`
  - Reconnected & Synchronised State (5/5 Events Synced to Supabase): `docs/screenshots/stage3d/stage3d_05_sync_queue_reconnected_synced_390.png`
- **Mobile `430×932`:** `docs/screenshots/stage3d/stage3d_07_sync_queue_430.png`
- **Desktop `1280×800` (Country Sales Head):** `docs/screenshots/stage3d/stage3d_08_manager_dashboard_1280.png`

---

## 4. Physical Android Handset QA Status & Hardware Test Plan

> [!WARNING]
> **Physical Android Handset Verification Status: NOT TESTED (Workstation / CI Environment)**  
> Automated Vitest (`fake-indexeddb` + JSDOM) and Playwright Chromium desktop/mobile viewport emulation do **not** replace physical company-issued Android phone QA.

### Mandatory Physical Android Handset Test Plan (Pre-Pilot Gate in Stage 6)
Before pilot field deployment in Nigeria, Zambia, and Malawi, QA must execute the following on physical company-issued Android phones (e.g., Samsung Galaxy A15 / Nokia G22 running Chrome for Android installed as a standalone PWA):
1. **Airplane Mode Full Workday Lifecycle:**
   - Enable Airplane Mode with GPS Location enabled.
   - Capture Start Day front-camera selfie and outdoor GPS satellite fix.
   - Capture Client Visit Check-In with rear-camera premises photo (`facingMode: 'environment'`).
   - Force-close Chrome / reboot the Android handset and reopen the installed PWA while still in Airplane Mode; verify active visit timer and IndexedDB media queue remain intact.
   - Complete Visit Checkout and Meeting Log with optional business-card photo.
   - Disable Airplane Mode on cellular data (`3G`/`4G`); verify automatic topological synchronisation and server PostGIS `location_verified` promotion.
2. **Intermittent Cellular Packet Loss (`2G` / Edge / Tunnel Transition):**
   - Trigger `Sync Now` while walking into a low-signal zone; verify interrupted photo upload or DB insert resumes cleanly without duplicate rows (`23505`) or re-uploading already-stored images.
3. **Android OS Storage Pressure & Site Data Controls:**
   - Verify `navigator.storage.persist()` grant status on installed Android PWA and validate quota warning banner behavior.

