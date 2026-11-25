# Stage 3D Implementation Specification: Durable Offline IndexedDB Journal, Media Queuing & Dependency Synchronisation

**Document type:** Technical Implementation Specification & Architecture Baseline  
**Project:** Carbon Field Sales Tracker  
**Business:** Carbon Car Care  
**Milestone:** Stage 3D (Durable Offline Operations, IndexedDB Event Journal, Binary Media Queue & Topological Dependency Sync)  
**Status:** Completed & Verified (170/170 Vitest Tests incl. 27 Stage 3D Scenarios + Full 16-Step Offline Workday & Multi-User Isolation Browser Verification Passing)  
**Date:** October 28, 2026  
**Reference:** PRD v1.2 (MVP Updated) §6.1, §7.1, §7.2, §7.3, §8.4, §9; AT-01–AT-05, AT-15; ADR 0010, ADR 0011, ADR 0012  

---

## 1. Objectives & Scope

Stage 3D upgrades the Carbon Field Sales Tracker from in-memory React Context queuing to a **durable, user-partitioned IndexedDB offline journal and binary media store** powered by `Dexie.js`. Salespeople in Nigeria (`Africa/Lagos`), Zambia (`Africa/Lusaka`), and Malawi (`Africa/Blantyre`) can capture attendance, client visits, live camera photographs, and meeting logs while offline or on degraded cellular networks, survive page refreshes and browser restarts, and synchronise in topological dependency order when connectivity returns.

### Core Deliverables Implemented
1. **Dexie.js IndexedDB Database (`CarbonOfflineJournalDB` in `src/services/offlineSyncService.ts`):**
   - `eventJournal`: Durable operational event store supporting `ATTENDANCE_START_DAY`, `VISIT_CHECKIN`, `VISIT_CHECKOUT`, `MEETING_LOG_SUBMIT`, and `ATTENDANCE_END_DAY`.
   - `mediaQueue`: Durable binary media store (`Uint8Array` payload + metadata) supporting `attendance_selfie` (`attendance-selfies` bucket), `visit_premises_photo` (`visit-premises-photos` bucket), and `business_card_photo` (`business-cards` bucket).
   - `cachedContext`: User- and market-scoped offline snapshot of approved client locations (`branchesSnapshot`), active market rule (`activeRuleVersion`), provisional/active attendance (`localAttendanceRecord`), open visit (`localActiveVisit`), and completed visits (`localCompletedVisits`).
2. **State Model & Dependency Graph:**
   - States: `pending → syncing → synced`, plus `failed`, `needs_review`, and `blocked_dependency`.
   - Enforces topological dependency ordering:
     `ATTENDANCE_START_DAY → VISIT_CHECKIN (+ premises photo) → VISIT_CHECKOUT → MEETING_LOG_SUBMIT (+ optional business card) → ATTENDANCE_END_DAY (+ end-day selfie)`.
   - Automatically blocks child events (`blocked_dependency`) when a required parent event fails or requires review.
3. **Provisional Client Capture vs. Authoritative Server Verification:**
   - Offline Start Day, Visit Check-In, Checkout, Meeting Log, and End Day are explicitly labelled `"Saved on Device (Provisional — Pending Server Sync)"`.
   - Offline visits remain `pending_sync` until server synchronisation completes and Migration 00027's PostGIS trigger (`trg_validate_visit_location_verification`) confirms `location_verified` or `location_unverified`.
   - Before syncing `VISIT_CHECKIN`, the sync engine verifies that the branch's GPS pin is still active/approved (`getBranchApprovedPin`) and checks the current market rule (`getActiveMarketRules`), transitioning to `needs_review` if a pin or rule change invalidates the offline capture.
4. **Idempotent Media Upload & Duplicate-Key (`23505`) Reconciliation:**
   - Media Blobs are uploaded to private Supabase Storage buckets with `upsert: false` and deterministic paths (`${ownerUserId}/${entityId}_${type}_${ts}.jpg`).
   - Already-uploaded media (`uploadStatus === 'uploaded'`) is never re-uploaded when retrying a failed database insert.
   - Duplicate-key `23505` responses on retried attendance, visit, or meeting log inserts are reconciled against existing server records owned by `ownerUserId`.
5. **Offline Attendance & Visit Continuity (`src/context/FieldSessionContext.tsx`, `StartDayModal.tsx`, `EndDayModal.tsx`):**
   - Supports offline Start Day (with front-camera selfie Blob + GPS) and offline End Day (with AT-03 open-visit hard block enforced both online and offline).
   - Restores cached branches, market rules, provisional attendance, active visit, and completed visits across page reloads and browser restarts.
   - Automatically triggers queue synchronisation on browser `online` and `visibilitychange` events as well as manual `Sync Now`.
6. **Live Sync Queue UX (`src/features/field/OfflineSyncView.tsx`, `src/components/field/PersistentStatusStrip.tsx`, `src/features/field/SalespersonHomePreview.tsx`):**
   - Displays live IndexedDB counts (`Pending Sync`, `Media Queued` + KB size, `Syncing Now`, `Synced to Server`, `Failed`, `Needs Review / Blocked`), `Last Server Sync` timestamp, browser Storage Quota bar, Provisional vs. Authoritative explanation banner, and per-event retry controls.

---

## 2. IndexedDB Schema & Event Structure

### 2.1 `OfflineJournalEvent` (`eventJournal`)
| Field | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | Stable client transaction UUID (primary key) |
| `sequenceNumber` | `number` | Monotonic per-user sequence number |
| `ownerUserId` | `string` (UUID) | Authenticated salesperson user ID |
| `marketCode` | `string` | Market code (`NG`, `ZM`, `MW`) |
| `deviceId` | `string` | Assigned company device reference |
| `eventType` | `OfflineEventType` | `ATTENDANCE_START_DAY \| VISIT_CHECKIN \| VISIT_CHECKOUT \| MEETING_LOG_SUBMIT \| ATTENDANCE_END_DAY` |
| `entityId` | `string` (UUID) | Stable UUID of the target attendance day, visit, or meeting log |
| `parentEntityId` | `string \| null` | Parent attendance day or visit UUID |
| `dependsOnTxUuids` | `string[]` | Transaction UUIDs of parent events that must be `synced` first |
| `originalCaptureTimestamp` | `string` (ISO) | Immutable client timestamp at moment of field capture |
| `localCreatedAt` | `string` (ISO) | Timestamp when written to IndexedDB |
| `timezone` | `string` | Market IANA timezone (`Africa/Lagos`, `Africa/Lusaka`, `Africa/Blantyre`) |
| `clockSkewWarning` | `string \| null` | Non-null warning if device clock drifted backward or skewed >15 min vs. server |
| `payload` | `Record<string, any>` | Event-specific parameters (coordinates, accuracy, storage paths, meeting log fields) |
| `mediaIds` | `string[]` | Foreign keys into `mediaQueue` that must upload before DB persistence |
| `syncStatus` | `OfflineSyncStatus` | `pending \| syncing \| synced \| failed \| needs_review \| blocked_dependency` |
| `retryCount` | `number` | Number of synchronisation attempts |
| `nextRetryAfter` | `number \| null` | Epoch ms for bounded exponential backoff (`min(300000, 2000 * 2^retry)`) |
| `lastError` | `string \| null` | Last server/network error or dependency block reason |
| `serverAckRef` | `string \| null` | Reconciled canonical server record ID |
| `serverReceivedAt` | `string \| null` | Server receipt timestamp (`server_received_at`) |
| `serverVerificationResult` | `string \| null` | Authoritative server status (`location_verified`, `location_unverified`, `started`, `ended`) |

### 2.2 `OfflineMediaRecord` (`mediaQueue`)
| Field | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | Media queue item UUID |
| `ownerUserId` | `string` (UUID) | Authenticated salesperson user ID |
| `eventId` | `string` (UUID) | Associated `eventJournal.id` |
| `entityId` | `string` (UUID) | Associated attendance day, visit, or meeting log UUID |
| `category` | `OfflineMediaCategory` | `attendance_selfie \| visit_premises_photo \| business_card_photo` |
| `storageBucket` | `string` | `attendance-selfies \| visit-premises-photos \| business-cards` |
| `storagePath` | `string` | Deterministic path `${ownerUserId}/${entityId}_${type}_${ts}.jpg` |
| `mimeType` | `string` | Image MIME type (`image/jpeg`) |
| `sizeBytes` | `number` | Binary payload size in bytes |
| `binaryData` | `Uint8Array` | Durable binary image bytes |
| `capturedAt` | `string` (ISO) | Original capture timestamp |
| `uploadStatus` | `string` | `pending_upload \| uploading \| uploaded \| failed` |

---

## 3. Storage Limits, Quota Guidance & Eviction Risks

1. **Per-Item & Total Media Guardrails:**
   - Individual compressed camera JPEGs (`<= 1280x720`, `0.85` quality) are capped at `MAX_SINGLE_MEDIA_BYTES = 5 MB` (typical size 80 KB–250 KB).
   - Total pending offline media per user is guarded at `MAX_TOTAL_MEDIA_QUEUE_BYTES = 45 MB`.
2. **Browser Quota Monitoring (`assessStorageQuota`):**
   - Queries `navigator.storage.estimate()` and requests `navigator.storage.persist()` when supported.
   - Displays a warning banner in `OfflineSyncView` when storage usage reaches `>= 80%`.
   - Refuses to silently drop evidence when storage reaches `>= 95%` or `< 2 MB` free, displaying clear guidance to connect and synchronise pending items.
3. **Browser Eviction Honesty (PRD §9):**
   - Mobile browsers (Android Chrome / WebView / iOS Safari) can evict site storage under extreme OS disk pressure or if the user manually clears browser site data.
   - If browser storage is cleared before synchronisation, the app never fabricates or reconstructs missing records; the salesperson must submit an explicit exception log.

---

## 4. App-Shell Service Worker, Session Recovery & Security Boundaries

### 4.1 Safe App-Shell Service Worker (`public/sw.js` & `src/main.tsx`)
- Registers `/sw.js` (`carbon-app-shell-v1`) on application boot so the static HTML/JS/CSS/logo shell can load during an offline page reload or offline browser close/reopen cold-start.
- **Strict Security Exclusion:** The service worker intercepts **only** same-origin `GET` requests (`url.origin === self.location.origin`) and explicitly ignores all `*.supabase.co`, `/rest/`, `/auth/`, `/storage/`, and `/realtime/` URLs. Sensitive Supabase API and private Storage responses are never cached in the Service Worker Cache Storage.

### 4.2 Offline Session & Profile Recovery (`src/context/AuthContext.tsx`)
- When an authenticated user's profile (`public.profiles`) is verified active online, `AuthContext` caches the profile snapshot under `carbon_cached_profile_${userId}` in `localStorage`.
- When the browser reloads or restarts while offline (`navigator.onLine === false` or network fetch error), `AuthContext` restores the cached profile for the active GoTrue session so the salesperson retains uninterrupted access to their IndexedDB queue and active workday.
- The cached profile is immediately purged on `signOut()` or if the server reports `is_active === false`.

### 4.3 Capture-Time Pin & Rule Version Immutability (`enqueueVisitCheckIn` & `_syncSingleEventToServer`)
- At the moment of offline visit check-in, `enqueueVisitCheckIn` records the exact `branchPinId`, `branchPinVersion`, `ruleVersionId`, and `ruleVersionTag` from the user's cached market context into the immutable `OfflineJournalEvent.payload`.
- During synchronisation, `_syncSingleEventToServer` compares the capture-time `branchPinId`/`branchPinVersion` and `ruleVersionId`/`ruleVersionTag` against the current server state:
  - If the branch pin was revoked/superseded or its `id`/`version_number` changed, the event transitions to `needs_review` **without silent substitution**.
  - If the active market rule's `id` or `version_tag` changed since capture, the event transitions to `needs_review` **without silent substitution**.

### 4.4 Sync-Execution-Boundary Authorization & Multi-User Isolation
- Every IndexedDB query (`eventJournal`, `mediaQueue`, `cachedContext`) is strictly partitioned by `ownerUserId`.
- At the sync execution boundary (`syncUserQueue` and `_executeUserQueueSync`), the sync service verifies:
  1. `ownerUserId === authenticatedUserId`.
  2. Live GoTrue session JWT (`supabase.auth.getSession()`) matches `ownerUserId` when a real session is active.
  3. Server profile check (`public.profiles.is_active === true` and `market_code` match); suspended employees (`is_active === false`) are blocked from synchronising protected operations, and cross-market mismatches transition to `needs_review`.

### 4.5 Shared Company Device Storage Risk Disclosure
- While the application enforces strict `ownerUserId` logical isolation in IndexedDB and JWT verification at the sync execution boundary, browser IndexedDB storage on a shared operating-system user profile is unencrypted at rest.
- On company-provided handsets shared across multiple employees without OS-level user separation, a user with physical USB debugging or browser DevTools access could inspect raw IndexedDB binary blobs before they are synchronised and cleared. Operational mitigation requires single-assignee company device custody (`public.devices` assignment) and prompt synchronisation upon network restoration.


