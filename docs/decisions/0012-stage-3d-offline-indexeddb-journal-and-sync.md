# ADR 0012: Stage 3D Durable Offline IndexedDB Journal, Media Queue & Dependency-Aware Synchronisation

- **Status:** Accepted & Checkpointed (170/170 Vitest Tests including 27 Stage 3D Scenarios + Full 16-Step Offline Workday, App-Shell Cold-Start & Multi-User Isolation Browser Suite Passing)
- **Date:** 2026-10-28
- **Project:** Carbon Field Sales Tracker (Nigeria, Zambia, Malawi)
- **Reference:** PRD v1.2 (MVP Updated) §6.1, §7.1, §7.2, §7.3, §8.4, §9; Acceptance Tests AT-01–AT-05, AT-15
- **Database Ref:** `[SUPABASE_PROJECT_ID]` (Hosted Supabase Development Project)
- **Preceding Checkpoint:** Stage 3C (`832bd8e315bab0aa700596376e850271d693786f`, annotated tag `stage-3c-visits-approved`)

---

## 1. Context & Objectives

Salespeople operating across Nigeria (`Africa/Lagos`), Zambia (`Africa/Lusaka`), and Malawi (`Africa/Blantyre`) frequently encounter degraded or zero cellular connectivity at industrial estates, transport hubs, and rural distribution centres.

In Stages 3B and 3C, real attendance (`public.attendance_days`), client visits (`public.visits`), live camera photographs (`attendance-selfies`, `visit-premises-photos`, `business-cards`), and meeting logs (`public.meeting_logs`) were connected to Supabase with authoritative server-side PostGIS geofencing (`Migrations 00026 & 00027`). However, React Context state alone does not survive page refreshes, browser restarts, or interrupted network connections.

Stage 3D introduces a **durable, user-partitioned IndexedDB offline journal and binary media queue** powered by `Dexie.js` (`src/services/offlineSyncService.ts`), integrated with `FieldSessionContext.tsx` and the Salesperson UI (`OfflineSyncView.tsx`, `PersistentStatusStrip.tsx`, `SalespersonHomePreview.tsx`, `StartDayModal.tsx`, `EndDayModal.tsx`).

---

## 2. Architectural Decisions

### Decision 1: Three-Table Dexie.js IndexedDB Schema (`CarbonOfflineJournalDB`)
We establish a dedicated IndexedDB database (`CarbonOfflineJournalDB`) with three canonical object stores in `src/services/offlineSyncService.ts`:
1. `eventJournal`:
   - Indexed by `id, sequenceNumber, ownerUserId, marketCode, eventType, entityId, parentEntityId, syncStatus, [ownerUserId+sequenceNumber], [ownerUserId+syncStatus]`.
   - Stores immutable original capture details (`originalCaptureTimestamp`, `localCreatedAt`, `timezone`, `clockSkewWarning`), dependency references (`dependsOnTxUuids`), associated media references (`mediaIds`), retry state (`retryCount`, `nextRetryAfter`, `lastError`), and server reconciliation metadata (`serverAckRef`, `serverReceivedAt`, `serverVerificationResult`).
2. `mediaQueue`:
   - Indexed by `id, ownerUserId, eventId, entityId, category, storageBucket, uploadStatus, [ownerUserId+uploadStatus]`.
   - Stores binary media (`attendance_selfie`, `visit_premises_photo`, `business_card_photo`) as durable `Uint8Array` byte buffers alongside `mimeType`, `sizeBytes`, deterministic `storageBucket` and `storagePath` (`${ownerUserId}/${entityId}_${type}_${ts}.jpg`), and `uploadStatus` (`pending_upload | uploading | uploaded | failed`).
   - Storing `Uint8Array` buffers guarantees binary fidelity across both mobile WebKit/Chromium browsers and Node/JSDOM test environments where `Blob` structured-clone serialization can vary.
3. `cachedContext`:
   - Keyed by `${ownerUserId}:${marketCode}`.
   - Caches the authorised market rule version (`activeRuleVersion`), approved client/location snapshot (`branchesSnapshot`), provisional/active attendance record (`localAttendanceRecord`), open active visit (`localActiveVisit`), and today's completed visits (`localCompletedVisits`) so salespeople can continue working across page reloads while offline.

### Decision 2: Explicit Event State Machine & Dependency Graph
Queued operations follow the state machine:
`pending → syncing → synced` with explicit `failed`, `needs_review`, and `blocked_dependency` states.

Topological ordering is enforced by monotonic `sequenceNumber` and explicit `dependsOnTxUuids`:
```
ATTENDANCE_START_DAY
  └──► VISIT_CHECKIN (requires start-day attendance + premises photo media upload)
         └──► VISIT_CHECKOUT (requires visit check-in on server)
                ├──► MEETING_LOG_SUBMIT (requires visit check-in + checkout + optional business card upload)
                └──► ATTENDANCE_END_DAY (requires start-day + zero open visits / all prior checkouts synced)
```
If any parent operation transitions to `failed`, `needs_review`, or `blocked_dependency`, all dependent child operations are automatically marked `blocked_dependency` and never sent out of order to Supabase.

### Decision 3: Provisional Client Capture vs. Authoritative Server Verification
Offline records are **never** presented as server-confirmed or `location_verified` while still queued on the device:
- Offline Start Day and End Day display `"Saved on Device (Provisional — Pending Server Sync)"`.
- Offline Visit Check-In and Checkout display `verificationStatus: 'pending_sync'` with explicit UI copy stating that final `location_verified` status is determined by the Supabase PostGIS server upon synchronisation.
- Upon synchronisation of `VISIT_CHECKIN`, the sync engine queries `visitService.getBranchApprovedPin(branchId)` and `visitService.getActiveMarketRules(marketCode)` before inserting into `public.visits`:
  - If the branch GPS pin was revoked, rejected, or replaced by a different version while offline, the event transitions to `needs_review` rather than falsely claiming `location_verified`.
  - If the active market rule tightened (e.g., smaller geofence radius or stricter GPS accuracy) such that $d + a > r_{\text{new}}$, the event transitions to `needs_review`.
  - Otherwise, the visit is inserted into `public.visits`, where Migration 00027's `trg_validate_visit_location_verification` independently computes PostGIS `ST_Distance` and sets the authoritative `verification_status`.

### Decision 4: Idempotent Media Uploads & Duplicate-Key (`23505`) Reconciliation
- **Media Upload Idempotency:** Each `OfflineMediaRecord` tracks `uploadStatus`. Once uploaded (`uploadStatus === 'uploaded'`), subsequent retries of the parent database event skip re-uploading the binary blob. If Storage returns `Duplicate` / `already exists` (`409`) on a retry after a network drop, the same deterministic path (`${ownerUserId}/${entityId}_...`) is reconciled as `uploaded` without overwriting existing evidence (`upsert: false`).
- **Database Idempotency:** Every queued record uses a stable client-generated UUID (`entityId`). If a network drop occurs after the server commits an insert/update but before the client receives the HTTP response, retrying the operation hits PostgreSQL unique constraint `23505`. The sync engine queries the existing row owned by `ownerUserId`, verifies compatibility, reconciles `serverAckRef` and `serverReceivedAt`, and rebinds downstream `attendanceDayId` references if needed. If the server holds a conflicting state (e.g., attendance already `'ended'`), the event transitions to `needs_review`.

### Decision 5: Cross-User Partitioning & Clock Anomaly Detection
- All IndexedDB queries filter strictly by `ownerUserId`. Account switching or logout clears in-memory React state without deleting or leaking another user's pending IndexedDB queue (`test scenario 20`).
- Local capture timestamps (`originalCaptureTimestamp`) are preserved immutably alongside `timezone` (`Africa/Lagos`, `Africa/Lusaka`, `Africa/Blantyre`), while `detectClockAnomaly` compares local device time against the last known server timestamp (`lastKnownServerTimeMs`) and flags backward clock drift or >15-minute skew (`clockSkewWarning`) without trusting local browser time as authoritative server receipt time.

### Decision 6: Storage Quota Assessment & Best-Effort Persistence
- `assessStorageQuota()` inspects `navigator.storage.estimate()`, requests `navigator.storage.persist()` where supported, warns at ≥80% usage, and blocks media queuing before silent truncation if quota is exhausted (≥95% or <2 MB free).
- Documentation and UI copy explicitly inform users that browser storage is best-effort and can be evicted by OS storage pressure or manual site-data clearing.

### Decision 7: Safe App-Shell Service Worker (`public/sw.js`) & Offline Profile Recovery (`AuthContext.tsx`)
- Registers `/sw.js` (`carbon-app-shell-v1`) on startup (`src/main.tsx`) to cache same-origin `GET` static app-shell assets (`url.origin === self.location.origin`), enabling offline page refreshes and offline browser cold-starts.
- Strictly excludes all `*.supabase.co`, `/rest/`, `/auth/`, `/storage/`, and `/realtime/` URLs so sensitive Supabase API responses and private Storage evidence are never cached in Service Worker Cache Storage.
- `AuthContext` caches verified active `UserProfile` records in `localStorage` (`carbon_cached_profile_${userId}`) and restores them when offline, while immediately purging the cache on `signOut()` or when `is_active === false`.

### Decision 8: Sync-Execution-Boundary Authorization & Shared-Device Media Risk Disclosure
- At the sync execution boundary (`syncUserQueue` and `_executeUserQueueSync`), the service verifies `ownerUserId === authenticatedUserId`, checks active GoTrue JWT ownership (`supabase.auth.getSession()`), blocks suspended employees (`profiles.is_active === false`), and routes cross-market mismatches to `needs_review`.
- Capture-time `branchPinId`/`branchPinVersion` and `ruleVersionId`/`ruleVersionTag` are recorded immutably at offline check-in; if either pin or rule version changes before sync, the event transitions to `needs_review` without silent substitution.
- Because browser IndexedDB storage is unencrypted at the OS profile level, shared company devices without OS-level user separation carry a local DevTools/USB inspection risk for unsynchronised media blobs until uploaded and cleared.

---

## 3. Verification Summary

- **Automated Unit & Integration Suite (`src/test/stage-3d-offline-sync.test.tsx`):** 26 test blocks covering 27 Stage 3D scenarios across offline Start Day, Visit Check-In, Premises Photo Blob survival across reload, Checkout, Meeting Log + Business Card, End Day, AT-03 offline block, topological dependency ordering, partial failure propagation (`blocked_dependency`), idempotent media upload, duplicate-key `23505` reconciliation, server PostGIS re-evaluation on rule/pin changes, capture-time pin/rule version immutability, cross-midnight `work_date` preservation, sync-boundary blocking of suspended users & JWT mismatches, failed online meeting-log durability, cross-user isolation, storage quota exhaustion handling, and clock anomaly flagging.
- **Full 16-Step Offline Workday, App-Shell Cold-Start & Multi-User Isolation Browser Verification (`scripts/verify_stage_3d_browser.py`):** Verified end-to-end against real Supabase (`[SUPABASE_PROJECT_ID]`) and Chromium IndexedDB across `360×800`, `390×844`, `430×932`, and `1280×800` viewports with zero horizontal overflow.
- **Physical Android Handset Verification:** Explicitly marked **NOT TESTED** in local/CI workstation environment; hardware test protocol documented in `docs/testing/STAGE_3D_QA_REPORT.md`.

