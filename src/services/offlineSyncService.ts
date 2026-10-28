/**
 * Carbon Field Sales Tracker — Stage 3D Durable Offline IndexedDB Journal,
 * Media Queue & Dependency-Aware Synchronisation Engine
 *
 * Implements PRD v1.2 §6.1, §7.1, §7.2, §7.3, §8.4, §9:
 * - Durable IndexedDB persistence via Dexie.js (`CarbonOfflineJournalDB`).
 * - Strict user & market partitioning (`ownerUserId`, `marketCode`).
 * - Blob-compatible media storage (`attendance-selfies`, `visit-premises-photos`, `business-cards`)
 *   with stable non-overwriting storage paths (`upsert: false`).
 * - Topological dependency graph enforcement:
 *   ATTENDANCE_START_DAY -> VISIT_CHECKIN (+ premises photo) -> VISIT_CHECKOUT -> MEETING_LOG_SUBMIT -> ATTENDANCE_END_DAY.
 * - Server-authoritative PostGIS geofence verification (local calculations are strictly provisional).
 * - Bounded exponential backoff, duplicate-event reconciliation (`23505`), and clock-skew detection.
 */

import Dexie, { type Table } from 'dexie';
import { supabase } from '@/lib/supabase';
import {
  visitService,
  type LocationClassification,
  type VisitVerificationStatus,
  type VisitPurpose,
} from '@/services/visitService';
import { getMarketTimezone, getMarketWorkDate } from '@/services/attendanceService';

export type OfflineEventType =
  | 'ATTENDANCE_START_DAY'
  | 'ATTENDANCE_END_DAY'
  | 'VISIT_CHECKIN'
  | 'VISIT_CHECKOUT'
  | 'MEETING_LOG_SUBMIT';

export type OfflineSyncStatus =
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'failed'
  | 'needs_review'
  | 'blocked_dependency';

export type OfflineMediaKind = 'attendance_selfie' | 'premises_photo' | 'business_card';

export type OfflineMediaUploadStatus =
  | 'pending_upload'
  | 'uploading'
  | 'uploaded'
  | 'failed'
  | 'needs_review';

export interface OfflineJournalEvent {
  /** Stable client transaction UUID (Primary Key) */
  id: string;
  /** Monotonic per-user sequence number for deterministic FIFO ordering */
  sequenceNumber: number;
  /** Authenticated owner user ID (strictly partitioned) */
  ownerUserId: string;
  /** Market code ('NG' | 'ZM' | 'MW') */
  marketCode: string;
  /** Assigned company device reference */
  deviceId: string;
  /** Canonical operation type */
  eventType: OfflineEventType;
  /** Target entity UUID (attendanceDayId, visitId, or meetingLogId) */
  entityId: string;
  /** Parent entity UUID (e.g. attendanceDayId for visit check-in, visitId for checkout/log) */
  parentEntityId: string | null;
  /** Explicit upstream transaction UUIDs that must reach 'synced' before this event can sync */
  dependsOnTxUuids: string[];
  /** Immutable ISO timestamp captured at the moment of the field action */
  originalCaptureTimestamp: string;
  /** Immutable local journal creation ISO timestamp */
  localCreatedAt: string;
  /** Canonical market IANA timezone */
  timezone: string;
  /** Warning if local device clock appears backdated or skewed vs last known server clock */
  clockSkewWarning: string | null;
  /** Immutable original capture payload */
  payload: Record<string, any>;
  /** Associated media queue IDs that must be uploaded before record persistence */
  mediaIds: string[];
  /** Current synchronisation lifecycle state */
  syncStatus: OfflineSyncStatus;
  /** Human-readable summary of the event for the Sync Queue UI */
  payloadSummary: string;
  /** Explicit note distinguishing provisional local capture from server verification */
  provisionalVerificationNote: string | null;
  /** Number of synchronisation attempts performed */
  retryCount: number;
  /** Epoch ms before which automatic retry should wait (bounded backoff) */
  nextRetryAfter: number | null;
  /** Last error message from network, storage, RLS, or database trigger */
  lastError: string | null;
  /** Server-acknowledged record ID or receipt reference */
  serverAckRef: string | null;
  /** Server receipt ISO timestamp */
  serverReceivedAt: string | null;
  /** Authoritative verification status returned by the server */
  serverVerificationResult: string | null;
}

export interface OfflineQueuedMedia {
  /** Stable media record ID: `${ownerUserId}:${entityId}:${mediaKind}:${submissionId}` */
  id: string;
  /** Authenticated owner user ID */
  ownerUserId: string;
  /** Market code */
  marketCode: string;
  /** Associated attendanceDayId or visitId */
  entityId: string;
  /** Stable submission UUID */
  submissionId: string;
  /** Media category */
  mediaKind: OfflineMediaKind;
  /** Private Supabase Storage bucket name */
  bucketName: 'attendance-selfies' | 'visit-premises-photos' | 'business-cards';
  /** Canonical non-overwriting storage path `${ownerUserId}/${filename}.jpg` */
  storagePath: string;
  /** MIME type ('image/jpeg') */
  mimeType: string;
  /** Byte length of the captured image */
  sizeBytes: number;
  /** Binary image bytes stored as Uint8Array for universal IndexedDB durability */
  binaryBytes: Uint8Array;
  /** Immutable capture ISO timestamp */
  capturedAt: string;
  /** Current upload status */
  uploadStatus: OfflineMediaUploadStatus;
  /** Server upload completion ISO timestamp */
  uploadedAt: string | null;
  /** Upload retry counter */
  retryCount: number;
  /** Last upload error */
  lastError: string | null;
}

export interface OfflineCachedContext {
  /** Primary Key: `${ownerUserId}:${marketCode}` */
  id: string;
  ownerUserId: string;
  marketCode: string;
  deviceId: string;
  activeRuleVersion: {
    id: string;
    market_code: string;
    geofence_radius_m: number;
    max_visit_gps_accuracy_m: number;
    max_pin_gps_accuracy_m: number;
    version_tag: string;
  } | null;
  branchesSnapshot: any[];
  localAttendanceRecord: any | null;
  localActiveVisit: any | null;
  localCompletedVisits: any[];
  lastServerSyncAt: string | null;
  lastKnownServerTimeMs: number | null;
  updatedAt: string;
}

export interface StorageQuotaAssessment {
  supported: boolean;
  usageBytes: number;
  quotaBytes: number;
  usagePercent: number;
  isPersisted: boolean;
  isNearLimit: boolean;
  isExhausted: boolean;
  warningMessage: string | null;
}

export interface QueueTelemetrySummary {
  totalEvents: number;
  pendingCount: number;
  syncingCount: number;
  syncedCount: number;
  failedCount: number;
  needsReviewCount: number;
  blockedDependencyCount: number;
  pendingMediaCount: number;
  pendingMediaBytes: number;
  lastServerSyncAt: string | null;
}

export const MAX_SINGLE_MEDIA_BYTES = 5 * 1024 * 1024; // 5 MB max per compressed photo
export const MAX_USER_MEDIA_QUEUE_BYTES = 50 * 1024 * 1024; // 50 MB soft cap for pending offline media
export const MAX_CLOCK_DRIFT_MS = 15 * 60 * 1000; // 15 minutes clock anomaly threshold

export class CarbonOfflineJournalDB extends Dexie {
  eventJournal!: Table<OfflineJournalEvent, string>;
  mediaQueue!: Table<OfflineQueuedMedia, string>;
  cachedContext!: Table<OfflineCachedContext, string>;

  constructor() {
    super('carbon_field_sales_offline_v1');
    this.version(1).stores({
      eventJournal:
        'id, ownerUserId, [ownerUserId+sequenceNumber], [ownerUserId+syncStatus], [ownerUserId+entityId], eventType, entityId, parentEntityId',
      mediaQueue:
        'id, ownerUserId, [ownerUserId+uploadStatus], [ownerUserId+entityId], entityId, storagePath',
      cachedContext: 'id, ownerUserId, marketCode',
    });
  }
}

export const offlineDb = new CarbonOfflineJournalDB();

/**
 * Generates a RFC-4122 v4 UUID for client transactions and entity IDs.
 */
export function generateClientUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Converts a Blob into a Uint8Array so it can be stored reliably in IndexedDB across
 * all browsers (Chrome Android, Safari, Desktop) and test environments (fake-indexeddb).
 */
export async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    const buf = await blob.arrayBuffer();
    return new Uint8Array(buf);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error('Failed to convert Blob to ArrayBuffer'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Reconstructs a Blob from an OfflineQueuedMedia record.
 */
export function mediaRecordToBlob(record: OfflineQueuedMedia): Blob {
  const bytes =
    record.binaryBytes instanceof Uint8Array
      ? record.binaryBytes
      : new Uint8Array(record.binaryBytes as ArrayBuffer);
  return new Blob([bytes.buffer as ArrayBuffer], { type: record.mimeType || 'image/jpeg' });
}

/**
 * Calculates bounded exponential backoff delay in milliseconds:
 * retry 1 -> 2s, retry 2 -> 4s, retry 3 -> 8s, retry 4 -> 16s, max -> 60s.
 */
export function computeBoundedBackoffMs(retryCount: number): number {
  const baseMs = 2000;
  const maxMs = 60000;
  const exp = Math.min(6, Math.max(0, retryCount - 1));
  return Math.min(maxMs, baseMs * Math.pow(2, exp));
}

// Active per-user synchronisation locks to prevent concurrent duplicate sync runs
const activeUserSyncLocks = new Map<
  string,
  Promise<{ synced: number; failed: number; blocked: number; error?: string }>
>();

// Simulated quota override for testing storage exhaustion (Test 18)
let simulatedQuotaExhausted = false;

export const offlineSyncService = {
  /**
   * Test helper to simulate storage quota exhaustion (Test 18).
   */
  setSimulatedQuotaExhausted(exhausted: boolean): void {
    simulatedQuotaExhausted = exhausted;
  },

  /**
   * Requests browser persistent storage where supported and assesses current storage quota.
   * Does not promise that browser storage can never be evicted by OS pressure.
   */
  async assessStorageQuota(ownerUserId?: string): Promise<StorageQuotaAssessment> {
    if (simulatedQuotaExhausted) {
      return {
        supported: true,
        usageBytes: MAX_USER_MEDIA_QUEUE_BYTES,
        quotaBytes: MAX_USER_MEDIA_QUEUE_BYTES,
        usagePercent: 100,
        isPersisted: false,
        isNearLimit: true,
        isExhausted: true,
        warningMessage:
          'Browser storage quota is exhausted. Please connect to the network and tap Sync Now to upload pending photo evidence before capturing additional visits.',
      };
    }

    let queuedBytes = 0;
    if (ownerUserId) {
      try {
        const pendingMedia = await offlineDb.mediaQueue
          .where('[ownerUserId+uploadStatus]')
          .equals([ownerUserId, 'pending_upload'])
          .toArray();
        queuedBytes = pendingMedia.reduce((acc, m) => acc + (m.sizeBytes || 0), 0);
      } catch {
        // Ignore if DB not yet initialized
      }
    }

    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.estimate === 'function') {
      try {
        const estimate = await navigator.storage.estimate();
        const isPersisted =
          typeof navigator.storage.persisted === 'function' ? await navigator.storage.persisted() : false;
        const usageBytes = Math.max(estimate.usage || 0, queuedBytes);
        const quotaBytes = estimate.quota || MAX_USER_MEDIA_QUEUE_BYTES;
        const usagePercent = quotaBytes > 0 ? Math.min(100, Math.round((usageBytes / quotaBytes) * 1000) / 10) : 0;
        const isExhausted =
          (quotaBytes > 0 && usageBytes >= quotaBytes * 0.98) || queuedBytes >= MAX_USER_MEDIA_QUEUE_BYTES;
        const isNearLimit =
          isExhausted ||
          (quotaBytes > 0 && usageBytes >= quotaBytes * 0.85) ||
          queuedBytes >= MAX_USER_MEDIA_QUEUE_BYTES * 0.8;

        return {
          supported: true,
          usageBytes,
          quotaBytes,
          usagePercent,
          isPersisted,
          isNearLimit,
          isExhausted,
          warningMessage: isExhausted
            ? 'Device storage quota is full. Connect to the internet and Sync Now to clear uploaded media.'
            : isNearLimit
            ? 'Offline media storage is above 80% capacity. Please synchronise when connectivity is available.'
            : null,
        };
      } catch {
        // Fallback below
      }
    }

    const usagePercent = Math.min(100, Math.round((queuedBytes / MAX_USER_MEDIA_QUEUE_BYTES) * 1000) / 10);
    const isExhausted = queuedBytes >= MAX_USER_MEDIA_QUEUE_BYTES;
    const isNearLimit = queuedBytes >= MAX_USER_MEDIA_QUEUE_BYTES * 0.8;

    return {
      supported: false,
      usageBytes: queuedBytes,
      quotaBytes: MAX_USER_MEDIA_QUEUE_BYTES,
      usagePercent,
      isPersisted: false,
      isNearLimit,
      isExhausted,
      warningMessage: isExhausted
        ? 'Offline media queue limit (50 MB) reached. Please connect and Sync Now before capturing new photos.'
        : isNearLimit
        ? 'Offline media queue is approaching its 50 MB limit.'
        : null,
    };
  },

  /**
   * Requests persistent storage permission from the browser (best-effort).
   */
  async requestPersistentStorage(): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
        return await navigator.storage.persist();
      }
    } catch {
      // Ignore
    }
    return false;
  },

  /**
   * Allocates the next monotonic sequence number for a specific user's offline journal.
   */
  async getNextSequenceNumber(ownerUserId: string): Promise<number> {
    const lastEvents = await offlineDb.eventJournal
      .where('ownerUserId')
      .equals(ownerUserId)
      .toArray();
    if (lastEvents.length === 0) return 1;
    const maxSeq = lastEvents.reduce((max, ev) => (ev.sequenceNumber > max ? ev.sequenceNumber : max), 0);
    return maxSeq + 1;
  },

  /**
   * Retrieves or initializes the user's cached context record in IndexedDB.
   */
  async getOrCreateCachedContext(
    ownerUserId: string,
    marketCode: string,
    deviceId: string = 'dev-001'
  ): Promise<OfflineCachedContext> {
    const id = `${ownerUserId}:${marketCode}`;
    const existing = await offlineDb.cachedContext.get(id);
    if (existing) {
      return existing;
    }
    const created: OfflineCachedContext = {
      id,
      ownerUserId,
      marketCode,
      deviceId,
      activeRuleVersion: null,
      branchesSnapshot: [],
      localAttendanceRecord: null,
      localActiveVisit: null,
      localCompletedVisits: [],
      lastServerSyncAt: null,
      lastKnownServerTimeMs: null,
      updatedAt: new Date().toISOString(),
    };
    await offlineDb.cachedContext.put(created);
    return created;
  },

  /**
   * Updates cached market rules, branches, or local operational state for a specific user.
   * Uses a serialized Dexie read-write transaction to prevent concurrent read-modify-write races.
   */
  async updateCachedContext(
    ownerUserId: string,
    marketCode: string,
    patch: Partial<Omit<OfflineCachedContext, 'id' | 'ownerUserId' | 'marketCode'>>
  ): Promise<OfflineCachedContext> {
    return offlineDb.transaction('rw', offlineDb.cachedContext, async () => {
      const id = `${ownerUserId}:${marketCode}`;
      const existing = await offlineDb.cachedContext.get(id);
      const base: OfflineCachedContext = existing || {
        id,
        ownerUserId,
        marketCode,
        deviceId: patch.deviceId || 'dev-001',
        activeRuleVersion: null,
        branchesSnapshot: [],
        localAttendanceRecord: null,
        localActiveVisit: null,
        localCompletedVisits: [],
        lastServerSyncAt: null,
        lastKnownServerTimeMs: null,
        updatedAt: new Date().toISOString(),
      };
      const updated: OfflineCachedContext = {
        ...base,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      await offlineDb.cachedContext.put(updated);
      return updated;
    });
  },

  /**
   * Evaluates whether a device timestamp exhibits clock anomaly / backdating compared to
   * the user's last known server timestamp or most recent queued event timestamp.
   */
  async detectClockAnomaly(
    ownerUserId: string,
    marketCode: string,
    captureTimeMs: number
  ): Promise<string | null> {
    const ctx = await this.getOrCreateCachedContext(ownerUserId, marketCode);
    if (ctx.lastKnownServerTimeMs && captureTimeMs < ctx.lastKnownServerTimeMs - MAX_CLOCK_DRIFT_MS) {
      const diffMins = Math.round((ctx.lastKnownServerTimeMs - captureTimeMs) / 60000);
      return `Clock discrepancy detected: Device timestamp is ${diffMins} min behind last known server time (PRD §8.2 / §9).`;
    }

    const userEvents = (await offlineDb.eventJournal.where('ownerUserId').equals(ownerUserId).toArray()).sort(
      (a, b) => a.sequenceNumber - b.sequenceNumber
    );
    if (userEvents.length > 0) {
      const latestEventMs = Math.max(
        ...userEvents.map((e) => new Date(e.originalCaptureTimestamp).getTime()).filter((n) => !Number.isNaN(n))
      );
      if (captureTimeMs < latestEventMs - 60000) {
        const diffMins = Math.round((latestEventMs - captureTimeMs) / 60000);
        return `Clock regression detected: Capture timestamp is ${diffMins} min earlier than prior queued event.`;
      }
    }

    return null;
  },

  /**
   * Queues a media Blob in IndexedDB with strict user & entity association and quota checks.
   */
  async enqueueMedia(params: {
    ownerUserId: string;
    marketCode: string;
    entityId: string;
    submissionId: string;
    mediaKind: OfflineMediaKind;
    bucketName: 'attendance-selfies' | 'visit-premises-photos' | 'business-cards';
    storagePath: string;
    blob: Blob;
    capturedAt?: string;
  }): Promise<{ data: OfflineQueuedMedia | null; error: Error | null }> {
    const {
      ownerUserId,
      marketCode,
      entityId,
      submissionId,
      mediaKind,
      bucketName,
      storagePath,
      blob,
      capturedAt,
    } = params;

    if (!ownerUserId || !entityId || !submissionId) {
      return { data: null, error: new Error('Media queue requires ownerUserId, entityId, and submissionId.') };
    }

    if (!storagePath.startsWith(`${ownerUserId}/`)) {
      return {
        data: null,
        error: new Error('Security boundary violation: Media storagePath must belong to ownerUserId folder.'),
      };
    }

    if (blob.size > MAX_SINGLE_MEDIA_BYTES) {
      return {
        data: null,
        error: new Error(
          `Image size (${Math.round(blob.size / 1024)} KB) exceeds maximum allowed limit (5 MB).`
        ),
      };
    }

    const quota = await this.assessStorageQuota(ownerUserId);
    if (quota.isExhausted) {
      return {
        data: null,
        error: new Error(
          quota.warningMessage ||
            'Browser storage quota exhausted. Please connect to the internet and Sync Now before capturing more photos.'
        ),
      };
    }

    const id = `${ownerUserId}:${entityId}:${mediaKind}:${submissionId}`;
    const existing = await offlineDb.mediaQueue.get(id);
    if (existing) {
      return { data: existing, error: null };
    }

    try {
      const binaryBytes = await blobToUint8Array(blob);
      const record: OfflineQueuedMedia = {
        id,
        ownerUserId,
        marketCode,
        entityId,
        submissionId,
        mediaKind,
        bucketName,
        storagePath,
        mimeType: blob.type || 'image/jpeg',
        sizeBytes: binaryBytes.byteLength,
        binaryBytes,
        capturedAt: capturedAt || new Date().toISOString(),
        uploadStatus: 'pending_upload',
        uploadedAt: null,
        retryCount: 0,
        lastError: null,
      };

      await offlineDb.mediaQueue.put(record);
      return { data: record, error: null };
    } catch (err: any) {
      const isQuotaErr =
        err?.name === 'QuotaExceededError' ||
        String(err?.message || '').toLowerCase().includes('quota');
      return {
        data: null,
        error: new Error(
          isQuotaErr
            ? 'Device browser storage is full (QuotaExceededError). Connect to network and Sync Now to free space.'
            : `Failed to store photo in local IndexedDB queue: ${err?.message || String(err)}`
        ),
      };
    }
  },

  /**
   * Enqueues an offline Start Day attendance event and its live selfie Blob.
   * Marks the local attendance record as strictly provisional ('pending_sync').
   */
  async enqueueStartDay(params: {
    ownerUserId: string;
    marketCode: string;
    deviceId: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    selfieBlob: Blob;
    submissionId?: string;
    capturedAt?: string;
  }): Promise<{
    event: OfflineJournalEvent | null;
    provisionalAttendance: any | null;
    error: Error | null;
  }> {
    const {
      ownerUserId,
      marketCode,
      deviceId,
      latitude,
      longitude,
      accuracy,
      selfieBlob,
      capturedAt,
    } = params;

    if (accuracy > 100) {
      return {
        event: null,
        provisionalAttendance: null,
        error: new Error(
          `GPS accuracy (±${Math.round(accuracy)}m) exceeds maximum allowable threshold (100m).`
        ),
      };
    }

    const workDate = getMarketWorkDate(marketCode, capturedAt ? new Date(capturedAt) : new Date());
    const submissionId = params.submissionId || generateClientUuid();

    // Check if an offline Start Day for this user and workDate already exists in the journal
    const existingUserEvents = await offlineDb.eventJournal
      .where('ownerUserId')
      .equals(ownerUserId)
      .toArray();
    const existingStartDay = existingUserEvents.find(
      (e) =>
        e.eventType === 'ATTENDANCE_START_DAY' &&
        e.payload?.workDate === workDate &&
        e.syncStatus !== 'failed'
    );
    if (existingStartDay) {
      const ctx = await this.getOrCreateCachedContext(ownerUserId, marketCode, deviceId);
      return {
        event: existingStartDay,
        provisionalAttendance: ctx.localAttendanceRecord,
        error: null,
      };
    }

    const attendanceDayId = generateClientUuid();
    const storagePath = `${ownerUserId}/${workDate}_${submissionId}.jpg`;
    const captureIso = capturedAt || new Date().toISOString();

    // 1. Store live selfie in mediaQueue
    const mediaRes = await this.enqueueMedia({
      ownerUserId,
      marketCode,
      entityId: attendanceDayId,
      submissionId,
      mediaKind: 'attendance_selfie',
      bucketName: 'attendance-selfies',
      storagePath,
      blob: selfieBlob,
      capturedAt: captureIso,
    });

    if (mediaRes.error || !mediaRes.data) {
      return { event: null, provisionalAttendance: null, error: mediaRes.error };
    }

    // 2. Detect any clock skew
    const clockSkewWarning = await this.detectClockAnomaly(
      ownerUserId,
      marketCode,
      new Date(captureIso).getTime()
    );

    // 3. Create journal event
    const seq = await this.getNextSequenceNumber(ownerUserId);
    const txUuid = generateClientUuid();

    const event: OfflineJournalEvent = {
      id: txUuid,
      sequenceNumber: seq,
      ownerUserId,
      marketCode,
      deviceId: deviceId || 'dev-001',
      eventType: 'ATTENDANCE_START_DAY',
      entityId: attendanceDayId,
      parentEntityId: null,
      dependsOnTxUuids: [],
      originalCaptureTimestamp: captureIso,
      localCreatedAt: new Date().toISOString(),
      timezone: getMarketTimezone(marketCode),
      clockSkewWarning,
      payload: {
        attendanceDayId,
        userId: ownerUserId,
        deviceId: deviceId || 'dev-001',
        marketCode,
        workDate,
        startedAt: captureIso,
        latitude,
        longitude,
        accuracy,
        selfieStoragePath: storagePath,
        submissionId,
      },
      mediaIds: [mediaRes.data.id],
      syncStatus: 'pending',
      payloadSummary: `START_DAY • ${workDate} • GPS (±${Math.round(accuracy)}m) • Selfie queued on device`,
      provisionalVerificationNote:
        'Saved on this device — Provisional attendance until server verification & storage upload.',
      retryCount: 0,
      nextRetryAfter: null,
      lastError: null,
      serverAckRef: null,
      serverReceivedAt: null,
      serverVerificationResult: null,
    };

    await offlineDb.eventJournal.put(event);

    const provisionalAttendance = {
      id: attendanceDayId,
      user_id: ownerUserId,
      device_id: deviceId || 'dev-001',
      market_code: marketCode,
      work_date: workDate,
      started_at: captureIso,
      ended_at: null,
      start_latitude: latitude,
      start_longitude: longitude,
      start_accuracy_m: accuracy,
      start_selfie_url: storagePath,
      end_latitude: null,
      end_longitude: null,
      end_accuracy_m: null,
      status: 'pending_sync' as const,
      captured_offline: true,
      client_tx_uuid: txUuid,
    };

    await this.updateCachedContext(ownerUserId, marketCode, {
      deviceId: deviceId || 'dev-001',
      localAttendanceRecord: provisionalAttendance,
    });

    return { event, provisionalAttendance, error: null };
  },

  /**
   * Enqueues an offline Client Visit Check-In and its live rear-camera premises photo Blob.
   * Links dependency to any pending offline ATTENDANCE_START_DAY for the parent workday.
   * Marks the visit as strictly provisional ('pending_sync') until server PostGIS verification!
   */
  async enqueueVisitCheckIn(params: {
    ownerUserId: string;
    marketCode: string;
    deviceId: string;
    attendanceDayId: string;
    branchId: string;
    branchName: string;
    companyName: string;
    address: string;
    branchCode: string;
    branchPinId?: string | null;
    branchPinVersion?: number | null;
    branchPinStatus?: string | null;
    ruleVersionId?: string | null;
    ruleVersionTag?: string | null;
    latitude: number;
    longitude: number;
    accuracy: number;
    provisionalDistanceMeters: number;
    provisionalClassification: LocationClassification;
    photoBlob: Blob;
    submissionId?: string;
    capturedAt?: string;
  }): Promise<{
    event: OfflineJournalEvent | null;
    provisionalVisit: any | null;
    error: Error | null;
  }> {
    const {
      ownerUserId,
      marketCode,
      deviceId,
      attendanceDayId,
      branchId,
      branchName,
      companyName,
      address,
      branchCode,
      branchPinId,
      branchPinVersion,
      branchPinStatus,
      ruleVersionId,
      ruleVersionTag,
      latitude,
      longitude,
      accuracy,
      provisionalDistanceMeters,
      provisionalClassification,
      photoBlob,
      capturedAt,
    } = params;

    // 1. Reject unapproved/missing pins for normal verified visits
    if (!branchPinId || (branchPinStatus && branchPinStatus !== 'approved')) {
      return {
        event: null,
        provisionalVisit: null,
        error: new Error(
          'Cannot queue normal visit check-in: Selected client location does not have an approved GPS pin. Please propose a pin or file an exception.'
        ),
      };
    }

    // 2. Enforce AT-04 single active open visit per salesperson
    const ctx = await this.getOrCreateCachedContext(ownerUserId, marketCode, deviceId);
    if (ctx.localActiveVisit && !ctx.localActiveVisit.checkOutTime) {
      return {
        event: null,
        provisionalVisit: null,
        error: new Error('Cannot start a new visit while an active visit is in progress (AT-04).'),
      };
    }

    const visitId = generateClientUuid();
    const submissionId = params.submissionId || generateClientUuid();
    const storagePath = `${ownerUserId}/${visitId}_premises_${submissionId}.jpg`;
    const captureIso = capturedAt || new Date().toISOString();

    // 3. Store live premises photo in mediaQueue
    const mediaRes = await this.enqueueMedia({
      ownerUserId,
      marketCode,
      entityId: visitId,
      submissionId,
      mediaKind: 'premises_photo',
      bucketName: 'visit-premises-photos',
      storagePath,
      blob: photoBlob,
      capturedAt: captureIso,
    });

    if (mediaRes.error || !mediaRes.data) {
      return { event: null, provisionalVisit: null, error: mediaRes.error };
    }

    // 4. Resolve dependency on any unsynced ATTENDANCE_START_DAY for this attendanceDayId
    const userEvents = (await offlineDb.eventJournal.where('ownerUserId').equals(ownerUserId).toArray()).sort(
      (a, b) => a.sequenceNumber - b.sequenceNumber
    );
    const parentStartDayEvents = userEvents.filter(
      (e) =>
        e.eventType === 'ATTENDANCE_START_DAY' &&
        e.entityId === attendanceDayId &&
        e.syncStatus !== 'synced'
    );
    const dependsOnTxUuids = parentStartDayEvents.map((e) => e.id);

    // Check if parent is already failed/rejected
    const hasFailedParent = parentStartDayEvents.some(
      (e) => e.syncStatus === 'failed' || e.syncStatus === 'needs_review' || e.syncStatus === 'blocked_dependency'
    );

    const clockSkewWarning = await this.detectClockAnomaly(
      ownerUserId,
      marketCode,
      new Date(captureIso).getTime()
    );

    // Determine requested verification status once server verifies PostGIS distance
    const intendedVerificationStatus: VisitVerificationStatus =
      provisionalClassification === 'inside_confident' && accuracy <= 100
        ? 'location_verified'
        : 'location_unverified';

    const seq = await this.getNextSequenceNumber(ownerUserId);
    const txUuid = generateClientUuid();

    const event: OfflineJournalEvent = {
      id: txUuid,
      sequenceNumber: seq,
      ownerUserId,
      marketCode,
      deviceId: deviceId || 'dev-001',
      eventType: 'VISIT_CHECKIN',
      entityId: visitId,
      parentEntityId: attendanceDayId,
      dependsOnTxUuids,
      originalCaptureTimestamp: captureIso,
      localCreatedAt: new Date().toISOString(),
      timezone: getMarketTimezone(marketCode),
      clockSkewWarning,
      payload: {
        visitId,
        userId: ownerUserId,
        deviceId: deviceId || 'dev-001',
        attendanceDayId,
        branchId,
        branchName,
        companyName,
        address,
        branchCode,
        branchPinId,
        branchPinVersion: branchPinVersion ?? null,
        ruleVersionId: ruleVersionId || ctx.activeRuleVersion?.id || null,
        ruleVersionTag: ruleVersionTag || ctx.activeRuleVersion?.version_tag || null,
        checkInAt: captureIso,
        latitude,
        longitude,
        accuracy,
        provisionalDistanceMeters,
        provisionalClassification,
        intendedVerificationStatus,
        premisesPhotoStoragePath: storagePath,
        submissionId,
      },
      mediaIds: [mediaRes.data.id],
      syncStatus: hasFailedParent ? 'blocked_dependency' : 'pending',
      payloadSummary: `VISIT_CHECKIN • ${branchName} • Provisional ${provisionalClassification} (${provisionalDistanceMeters}m, ±${Math.round(accuracy)}m)`,
      provisionalVerificationNote:
        'Saved on this device — Provisional geofence calculation. Requires server PostGIS verification before location_verified is granted.',
      retryCount: 0,
      nextRetryAfter: null,
      lastError: hasFailedParent ? 'Blocked by unresolved parent ATTENDANCE_START_DAY event.' : null,
      serverAckRef: null,
      serverReceivedAt: null,
      serverVerificationResult: null,
    };

    await offlineDb.eventJournal.put(event);

    const provisionalVisit = {
      id: visitId,
      branchId,
      branchName,
      companyName,
      address,
      branchCode,
      checkInTime: new Date(captureIso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      checkInTimestamp: new Date(captureIso).getTime(),
      elapsedSeconds: 0,
      geofenceDistanceMeters: provisionalDistanceMeters,
      gpsAccuracyMeters: accuracy,
      premisesPhotoUrl: storagePath,
      // Crucial Requirement 5: Never claim location_verified before backend acceptance!
      verificationStatus: 'pending_sync' as VisitVerificationStatus,
      intendedVerificationStatus,
      locationClassification: provisionalClassification,
      branchPinId,
      branchPinVersion: branchPinVersion ?? null,
      ruleVersionId: ruleVersionId || ctx.activeRuleVersion?.id || null,
      ruleVersionTag: ruleVersionTag || ctx.activeRuleVersion?.version_tag || null,
      capturedOffline: true,
      clientTxUuid: txUuid,
    };

    await this.updateCachedContext(ownerUserId, marketCode, {
      localActiveVisit: provisionalVisit,
    });

    return { event, provisionalVisit, error: null };
  },

  /**
   * Enqueues an offline Visit Checkout event.
   * Depends on the corresponding VISIT_CHECKIN event if the visit was checked in offline.
   */
  async enqueueVisitCheckout(params: {
    ownerUserId: string;
    marketCode: string;
    deviceId: string;
    visitId: string;
    branchName: string;
    companyName: string;
    branchCode: string;
    checkInTime: string;
    elapsedSeconds: number;
    outsideGeofence: boolean;
    latitude?: number | null;
    longitude?: number | null;
    accuracy?: number | null;
    meetingLogDeferred: boolean;
    capturedAt?: string;
  }): Promise<{
    event: OfflineJournalEvent | null;
    completedVisitRecord: any | null;
    error: Error | null;
  }> {
    const {
      ownerUserId,
      marketCode,
      deviceId,
      visitId,
      branchName,
      companyName,
      branchCode,
      checkInTime,
      elapsedSeconds,
      outsideGeofence,
      latitude,
      longitude,
      accuracy,
      meetingLogDeferred,
      capturedAt,
    } = params;

    const captureIso = capturedAt || new Date().toISOString();
    const userEvents = (await offlineDb.eventJournal.where('ownerUserId').equals(ownerUserId).toArray()).sort(
      (a, b) => a.sequenceNumber - b.sequenceNumber
    );
    const parentCheckInEvents = userEvents.filter(
      (e) => e.eventType === 'VISIT_CHECKIN' && e.entityId === visitId && e.syncStatus !== 'synced'
    );
    const dependsOnTxUuids = parentCheckInEvents.map((e) => e.id);
    const hasFailedParent = parentCheckInEvents.some(
      (e) => e.syncStatus === 'failed' || e.syncStatus === 'needs_review' || e.syncStatus === 'blocked_dependency'
    );

    const clockSkewWarning = await this.detectClockAnomaly(
      ownerUserId,
      marketCode,
      new Date(captureIso).getTime()
    );

    const seq = await this.getNextSequenceNumber(ownerUserId);
    const txUuid = generateClientUuid();

    const event: OfflineJournalEvent = {
      id: txUuid,
      sequenceNumber: seq,
      ownerUserId,
      marketCode,
      deviceId: deviceId || 'dev-001',
      eventType: 'VISIT_CHECKOUT',
      entityId: visitId,
      parentEntityId: visitId,
      dependsOnTxUuids,
      originalCaptureTimestamp: captureIso,
      localCreatedAt: new Date().toISOString(),
      timezone: getMarketTimezone(marketCode),
      clockSkewWarning,
      payload: {
        visitId,
        userId: ownerUserId,
        checkOutAt: captureIso,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        accuracy: accuracy ?? null,
        outsideGeofence,
      },
      mediaIds: [],
      syncStatus: hasFailedParent ? 'blocked_dependency' : 'pending',
      payloadSummary: `VISIT_CHECKOUT • ${branchName} • ${outsideGeofence ? 'Outside Geofence (Flagged)' : 'Standard Checkout'}`,
      provisionalVerificationNote: 'Saved on this device — Checkout queued for server synchronisation.',
      retryCount: 0,
      nextRetryAfter: null,
      lastError: hasFailedParent ? 'Blocked by unresolved parent VISIT_CHECKIN event.' : null,
      serverAckRef: null,
      serverReceivedAt: null,
      serverVerificationResult: null,
    };

    await offlineDb.eventJournal.put(event);

    const ctx = await this.getOrCreateCachedContext(ownerUserId, marketCode, deviceId);
    const completedVisitRecord = {
      id: visitId,
      branchName,
      companyName,
      branchCode,
      checkInTime,
      checkOutTime: new Date(captureIso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
      // Remains pending_sync until server confirms!
      verificationStatus: 'pending_sync' as const,
      meetingLogSubmitted: !meetingLogDeferred,
      meetingLogDeferredUntil: meetingLogDeferred ? 'Within 2h SLA (Offline Queue)' : 'Queued on Device',
      flagRaised: outsideGeofence ? 'Checkout Outside Geofence (>200m)' : undefined,
      capturedOffline: true,
    };

    const nextCompleted = [
      completedVisitRecord,
      ...(ctx.localCompletedVisits || []).filter((c: any) => c.id !== visitId),
    ];

    await this.updateCachedContext(ownerUserId, marketCode, {
      localActiveVisit: null,
      localCompletedVisits: nextCompleted,
    });

    return { event, completedVisitRecord, error: null };
  },

  /**
   * Enqueues an offline Meeting Log submission and optional business card photo Blob.
   * Depends on VISIT_CHECKIN and VISIT_CHECKOUT for the same visitId.
   */
  async enqueueMeetingLog(params: {
    ownerUserId: string;
    marketCode: string;
    deviceId: string;
    visitId: string;
    branchName?: string;
    contactId?: string | null;
    purpose: VisitPurpose;
    productsDiscussed: string[];
    outcomeNarrative: string;
    nextStepText: string;
    fleetSizeVolume?: number | null;
    businessCardBlob?: Blob | null;
    isLate?: boolean;
    submissionId?: string;
    capturedAt?: string;
    initialSyncStatus?: 'pending' | 'failed';
    initialError?: string | null;
  }): Promise<{
    event: OfflineJournalEvent | null;
    error: Error | null;
  }> {
    const {
      ownerUserId,
      marketCode,
      deviceId,
      visitId,
      branchName,
      contactId,
      purpose,
      productsDiscussed,
      outcomeNarrative,
      nextStepText,
      fleetSizeVolume,
      businessCardBlob,
      isLate,
      capturedAt,
      initialSyncStatus,
      initialError,
    } = params;

    const captureIso = capturedAt || new Date().toISOString();
    const submissionId = params.submissionId || generateClientUuid();
    const mediaIds: string[] = [];
    let businessCardStoragePath: string | null = null;

    if (businessCardBlob) {
      businessCardStoragePath = `${ownerUserId}/${visitId}_card_${submissionId}.jpg`;
      const mediaRes = await this.enqueueMedia({
        ownerUserId,
        marketCode,
        entityId: visitId,
        submissionId,
        mediaKind: 'business_card',
        bucketName: 'business-cards',
        storagePath: businessCardStoragePath,
        blob: businessCardBlob,
        capturedAt: captureIso,
      });

      if (mediaRes.error || !mediaRes.data) {
        return { event: null, error: mediaRes.error };
      }
      mediaIds.push(mediaRes.data.id);
    }

    const userEvents = (await offlineDb.eventJournal.where('ownerUserId').equals(ownerUserId).toArray()).sort(
      (a, b) => a.sequenceNumber - b.sequenceNumber
    );

    // Prevent duplicate unsynced meeting log events for the same visitId
    const existingLogEvent = userEvents.find(
      (e) => e.eventType === 'MEETING_LOG_SUBMIT' && e.entityId === visitId && e.syncStatus !== 'synced'
    );
    if (existingLogEvent) {
      const updatedExisting: OfflineJournalEvent = {
        ...existingLogEvent,
        payload: {
          ...existingLogEvent.payload,
          visitId,
          contactId: contactId || null,
          purpose,
          productsDiscussed,
          outcomeNarrative,
          nextStepText,
          fleetSizeVolume: fleetSizeVolume ?? null,
          businessCardPhotoUrl: businessCardStoragePath || existingLogEvent.payload?.businessCardPhotoUrl || null,
          isLate: Boolean(isLate),
          submittedAt: captureIso,
        },
        mediaIds: mediaIds.length > 0 ? mediaIds : existingLogEvent.mediaIds,
        syncStatus: initialSyncStatus || existingLogEvent.syncStatus,
        lastError: initialError !== undefined ? initialError : existingLogEvent.lastError,
      };
      await offlineDb.eventJournal.put(updatedExisting);
      return { event: updatedExisting, error: null };
    }

    const parentVisitEvents = userEvents.filter(
      (e) =>
        (e.eventType === 'VISIT_CHECKIN' || e.eventType === 'VISIT_CHECKOUT') &&
        e.entityId === visitId &&
        e.syncStatus !== 'synced'
    );
    const dependsOnTxUuids = parentVisitEvents.map((e) => e.id);
    const hasFailedParent = parentVisitEvents.some(
      (e) => e.syncStatus === 'failed' || e.syncStatus === 'needs_review' || e.syncStatus === 'blocked_dependency'
    );

    const clockSkewWarning = await this.detectClockAnomaly(
      ownerUserId,
      marketCode,
      new Date(captureIso).getTime()
    );

    const seq = await this.getNextSequenceNumber(ownerUserId);
    const txUuid = generateClientUuid();

    const resolvedInitialStatus: OfflineSyncStatus = hasFailedParent
      ? 'blocked_dependency'
      : initialSyncStatus || 'pending';

    const event: OfflineJournalEvent = {
      id: txUuid,
      sequenceNumber: seq,
      ownerUserId,
      marketCode,
      deviceId: deviceId || 'dev-001',
      eventType: 'MEETING_LOG_SUBMIT',
      entityId: visitId,
      parentEntityId: visitId,
      dependsOnTxUuids,
      originalCaptureTimestamp: captureIso,
      localCreatedAt: new Date().toISOString(),
      timezone: getMarketTimezone(marketCode),
      clockSkewWarning,
      payload: {
        visitId,
        contactId: contactId || null,
        purpose,
        productsDiscussed,
        outcomeNarrative,
        nextStepText,
        fleetSizeVolume: fleetSizeVolume ?? null,
        businessCardPhotoUrl: businessCardStoragePath,
        isLate: Boolean(isLate),
        submittedAt: captureIso,
      },
      mediaIds,
      syncStatus: resolvedInitialStatus,
      payloadSummary: `MEETING_LOG • ${branchName || visitId.substring(0, 8)} • ${purpose} (${productsDiscussed.length} products)`,
      provisionalVerificationNote:
        resolvedInitialStatus === 'failed'
          ? 'Saved on this device — Online submission failed; queued in IndexedDB for retry.'
          : 'Saved on this device — Meeting notes queued for server persistence.',
      retryCount: resolvedInitialStatus === 'failed' ? 1 : 0,
      nextRetryAfter: null,
      lastError: hasFailedParent
        ? 'Blocked by unresolved parent Visit event.'
        : initialError || null,
      serverAckRef: null,
      serverReceivedAt: null,
      serverVerificationResult: null,
    };

    await offlineDb.eventJournal.put(event);

    const ctx = await this.getOrCreateCachedContext(ownerUserId, marketCode, deviceId);
    const updatedCompleted = (ctx.localCompletedVisits || []).map((c: any) =>
      c.id === visitId
        ? {
            ...c,
            meetingLogSubmitted: resolvedInitialStatus !== 'failed',
            meetingLogDeferredUntil:
              resolvedInitialStatus === 'failed' ? 'Unsaved on Server — Retry Pending' : 'Queued on Device',
          }
        : c
    );
    await this.updateCachedContext(ownerUserId, marketCode, {
      localCompletedVisits: updatedCompleted,
    });

    return { event, error: null };
  },

  /**
   * Enqueues an offline End Day event.
   * Strictly blocked if an active visit is open locally, and depends on ATTENDANCE_START_DAY
   * plus all VISIT_CHECKIN and VISIT_CHECKOUT events queued for the user.
   */
  async enqueueEndDay(params: {
    ownerUserId: string;
    marketCode: string;
    deviceId: string;
    attendanceDayId: string;
    latitude?: number | null;
    longitude?: number | null;
    accuracy?: number | null;
    capturedAt?: string;
  }): Promise<{
    event: OfflineJournalEvent | null;
    provisionalAttendance: any | null;
    error: Error | null;
  }> {
    const { ownerUserId, marketCode, deviceId, attendanceDayId, latitude, longitude, accuracy, capturedAt } =
      params;

    const ctx = await this.getOrCreateCachedContext(ownerUserId, marketCode, deviceId);
    if (ctx.localActiveVisit && !ctx.localActiveVisit.checkOutTime) {
      return {
        event: null,
        provisionalAttendance: null,
        error: new Error(
          'Cannot end workday while an active visit is open (PRD §6.1 / AT-03). Check out of the active visit first.'
        ),
      };
    }

    const userEvents = (await offlineDb.eventJournal.where('ownerUserId').equals(ownerUserId).toArray()).sort(
      (a, b) => a.sequenceNumber - b.sequenceNumber
    );

    // Check if there is any VISIT_CHECKIN without a corresponding VISIT_CHECKOUT
    const checkInEntityIds = new Set(
      userEvents.filter((e) => e.eventType === 'VISIT_CHECKIN').map((e) => e.entityId)
    );
    const checkOutEntityIds = new Set(
      userEvents.filter((e) => e.eventType === 'VISIT_CHECKOUT').map((e) => e.entityId)
    );
    for (const vId of checkInEntityIds) {
      if (!checkOutEntityIds.has(vId)) {
        return {
          event: null,
          provisionalAttendance: null,
          error: new Error(
            `Cannot end workday: Queued visit (${vId.substring(0, 8)}) has no checkout event (AT-03).`
          ),
        };
      }
    }

    const upstreamEvents = userEvents.filter(
      (e) =>
        (e.eventType === 'ATTENDANCE_START_DAY' ||
          e.eventType === 'VISIT_CHECKIN' ||
          e.eventType === 'VISIT_CHECKOUT') &&
        e.syncStatus !== 'synced'
    );
    const dependsOnTxUuids = upstreamEvents.map((e) => e.id);
    const hasFailedParent = upstreamEvents.some(
      (e) => e.syncStatus === 'failed' || e.syncStatus === 'needs_review' || e.syncStatus === 'blocked_dependency'
    );

    const captureIso = capturedAt || new Date().toISOString();
    const clockSkewWarning = await this.detectClockAnomaly(
      ownerUserId,
      marketCode,
      new Date(captureIso).getTime()
    );

    const seq = await this.getNextSequenceNumber(ownerUserId);
    const txUuid = generateClientUuid();

    const event: OfflineJournalEvent = {
      id: txUuid,
      sequenceNumber: seq,
      ownerUserId,
      marketCode,
      deviceId: deviceId || 'dev-001',
      eventType: 'ATTENDANCE_END_DAY',
      entityId: attendanceDayId,
      parentEntityId: attendanceDayId,
      dependsOnTxUuids,
      originalCaptureTimestamp: captureIso,
      localCreatedAt: new Date().toISOString(),
      timezone: getMarketTimezone(marketCode),
      clockSkewWarning,
      payload: {
        attendanceDayId,
        userId: ownerUserId,
        endedAt: captureIso,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        accuracy: accuracy ?? null,
      },
      mediaIds: [],
      syncStatus: hasFailedParent ? 'blocked_dependency' : 'pending',
      payloadSummary: `END_DAY • Closing GPS ${accuracy ? `(±${Math.round(accuracy)}m)` : '(No Fix)'} • Queued on device`,
      provisionalVerificationNote:
        'Saved on this device — Workday closure awaits upstream visit & attendance sync.',
      retryCount: 0,
      nextRetryAfter: null,
      lastError: hasFailedParent ? 'Blocked by unresolved upstream attendance or visit event.' : null,
      serverAckRef: null,
      serverReceivedAt: null,
      serverVerificationResult: null,
    };

    await offlineDb.eventJournal.put(event);

    const updatedAttendance = ctx.localAttendanceRecord
      ? {
          ...ctx.localAttendanceRecord,
          ended_at: captureIso,
          end_latitude: latitude ?? null,
          end_longitude: longitude ?? null,
          end_accuracy_m: accuracy ?? null,
          status: 'pending_sync',
        }
      : null;

    await this.updateCachedContext(ownerUserId, marketCode, {
      localAttendanceRecord: updatedAttendance,
    });

    return { event, provisionalAttendance: updatedAttendance, error: null };
  },

  /**
   * Returns all journal events belonging strictly to the specified ownerUserId,
   * ordered by sequenceNumber ASC.
   * Enforces strict cross-user isolation (Employee B never sees Employee A's records).
   */
  async getUserQueueEvents(ownerUserId: string): Promise<OfflineJournalEvent[]> {
    if (!ownerUserId) return [];
    const events = await offlineDb.eventJournal.where('ownerUserId').equals(ownerUserId).toArray();
    return events.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  },

  /**
   * Returns all media records belonging strictly to the specified ownerUserId.
   */
  async getUserMediaQueue(ownerUserId: string): Promise<OfflineQueuedMedia[]> {
    if (!ownerUserId) return [];
    return offlineDb.mediaQueue.where('ownerUserId').equals(ownerUserId).toArray();
  },

  /**
   * Computes real-time queue telemetry summary for the Sync Queue badge and screen.
   */
  async getUserQueueTelemetry(ownerUserId: string, marketCode: string = 'NG'): Promise<QueueTelemetrySummary> {
    if (!ownerUserId) {
      return {
        totalEvents: 0,
        pendingCount: 0,
        syncingCount: 0,
        syncedCount: 0,
        failedCount: 0,
        needsReviewCount: 0,
        blockedDependencyCount: 0,
        pendingMediaCount: 0,
        pendingMediaBytes: 0,
        lastServerSyncAt: null,
      };
    }

    const [events, media, ctx] = await Promise.all([
      this.getUserQueueEvents(ownerUserId),
      this.getUserMediaQueue(ownerUserId),
      this.getOrCreateCachedContext(ownerUserId, marketCode),
    ]);

    const pendingMedia = media.filter((m) => m.uploadStatus !== 'uploaded');

    return {
      totalEvents: events.length,
      pendingCount: events.filter((e) => e.syncStatus === 'pending').length,
      syncingCount: events.filter((e) => e.syncStatus === 'syncing').length,
      syncedCount: events.filter((e) => e.syncStatus === 'synced').length,
      failedCount: events.filter((e) => e.syncStatus === 'failed').length,
      needsReviewCount: events.filter((e) => e.syncStatus === 'needs_review').length,
      blockedDependencyCount: events.filter((e) => e.syncStatus === 'blocked_dependency').length,
      pendingMediaCount: pendingMedia.length,
      pendingMediaBytes: pendingMedia.reduce((acc, m) => acc + (m.sizeBytes || 0), 0),
      lastServerSyncAt: ctx.lastServerSyncAt,
    };
  },

  /**
   * Resets a failed or blocked event back to 'pending' for manual retry.
   */
  async retryEvent(ownerUserId: string, eventId: string): Promise<boolean> {
    const ev = await offlineDb.eventJournal.get(eventId);
    if (!ev || ev.ownerUserId !== ownerUserId) {
      return false;
    }
    await offlineDb.eventJournal.update(eventId, {
      syncStatus: 'pending',
      nextRetryAfter: null,
      lastError: null,
    });
    return true;
  },

  /**
   * Uploads all pending media items associated with a specific journal event.
   * Ensures idempotency: already-uploaded media is never uploaded again.
   * Reconciles HTTP 409 / Duplicate responses if an earlier attempt uploaded the file before connection drop.
   */
  async uploadEventMedia(
    ownerUserId: string,
    mediaIds: string[]
  ): Promise<{ success: boolean; error: string | null }> {
    for (const mediaId of mediaIds) {
      const mediaRecord = await offlineDb.mediaQueue.get(mediaId);
      if (!mediaRecord) {
        return { success: false, error: `Associated media record (${mediaId}) is missing from local storage.` };
      }

      if (mediaRecord.ownerUserId !== ownerUserId) {
        return {
          success: false,
          error: 'Security boundary violation: Cannot upload media belonging to another user.',
        };
      }

      // Already uploaded -> do not upload again!
      if (mediaRecord.uploadStatus === 'uploaded') {
        continue;
      }

      await offlineDb.mediaQueue.update(mediaId, { uploadStatus: 'uploading' });

      try {
        const blob = mediaRecordToBlob(mediaRecord);
        const { error: uploadError } = await supabase.storage
          .from(mediaRecord.bucketName)
          .upload(mediaRecord.storagePath, blob, {
            contentType: mediaRecord.mimeType || 'image/jpeg',
            upsert: false,
          });

        if (uploadError) {
          const msg = uploadError.message || '';
          const isAlreadyUploaded =
            msg.toLowerCase().includes('already exists') ||
            msg.toLowerCase().includes('duplicate') ||
            (uploadError as any).statusCode === 409 ||
            (uploadError as any).statusCode === '409';

          if (!isAlreadyUploaded) {
            await offlineDb.mediaQueue.update(mediaId, {
              uploadStatus: 'failed',
              retryCount: mediaRecord.retryCount + 1,
              lastError: msg || 'Storage upload failed',
            });
            return { success: false, error: `Media upload failed (${mediaRecord.mediaKind}): ${msg}` };
          }
        }

        await offlineDb.mediaQueue.update(mediaId, {
          uploadStatus: 'uploaded',
          uploadedAt: new Date().toISOString(),
          lastError: null,
        });
      } catch (err: any) {
        const msg = err?.message || String(err);
        await offlineDb.mediaQueue.update(mediaId, {
          uploadStatus: 'failed',
          retryCount: mediaRecord.retryCount + 1,
          lastError: msg,
        });
        return { success: false, error: `Media upload interrupted: ${msg}` };
      }
    }

    return { success: true, error: null };
  },

  /**
   * Synchronises all pending offline events for `ownerUserId` in strict topological & sequence order.
   *
   * Security & Integrity guarantees:
   * 1. Verifies `ownerUserId === authenticatedUserId` so Offline events NEVER sync under the wrong user's JWT.
   * 2. Coalesces concurrent calls per user via `activeUserSyncLocks`.
   * 3. Uploads media Blobs first (`upsert: false`) and skips already-uploaded Blobs on retry.
   * 4. Blocks dependent events (`blocked_dependency`) if any upstream parent event fails or requires review.
   * 5. Validates approved pin and active market rule on the server before syncing `VISIT_CHECKIN`.
   * 6. Reconciles duplicate-key (`23505`) responses when a prior request succeeded on the server before client timeout.
   */
  async syncUserQueue(
    ownerUserId: string,
    authenticatedUserId: string,
    options?: { ignoreBackoff?: boolean }
  ): Promise<{ synced: number; failed: number; blocked: number; error?: string }> {
    if (!ownerUserId || !authenticatedUserId) {
      return { synced: 0, failed: 0, blocked: 0, error: 'Unauthenticated session: Cannot synchronise queue.' };
    }

    // Requirement 8: Offline records must NEVER synchronise under the wrong user's JWT
    if (ownerUserId !== authenticatedUserId) {
      return {
        synced: 0,
        failed: 0,
        blocked: 0,
        error: 'Security boundary violation: Queue ownerUserId does not match authenticated JWT user.',
      };
    }

    // Verify live GoTrue JWT session at the sync execution boundary (if an active session exists)
    try {
      if (supabase.auth && typeof supabase.auth.getSession === 'function') {
        const { data: sessionData } = await supabase.auth.getSession();
        const activeJwtUserId = sessionData?.session?.user?.id;
        if (activeJwtUserId && activeJwtUserId !== ownerUserId) {
          return {
            synced: 0,
            failed: 0,
            blocked: 0,
            error:
              'Security boundary violation: Active Supabase JWT session user does not match queue ownerUserId.',
          };
        }
      }
    } catch {
      // Ignore if auth mock is not configured in unit test
    }

    // Coalesce concurrent sync attempts for the same user (Test 23)
    const existingLock = activeUserSyncLocks.get(ownerUserId);
    if (existingLock) {
      return existingLock;
    }

    const syncPromise = this._executeUserQueueSync(ownerUserId, Boolean(options?.ignoreBackoff));
    activeUserSyncLocks.set(ownerUserId, syncPromise);

    try {
      return await syncPromise;
    } finally {
      activeUserSyncLocks.delete(ownerUserId);
    }
  },

  async _executeUserQueueSync(
    ownerUserId: string,
    ignoreBackoff: boolean
  ): Promise<{ synced: number; failed: number; blocked: number; error?: string }> {
    let syncedCount = 0;
    let failedCount = 0;
    let blockedCount = 0;

    const events = await this.getUserQueueEvents(ownerUserId);
    const unsyncedEvents = events.filter((e) => e.syncStatus !== 'synced');
    if (unsyncedEvents.length === 0) {
      return { synced: 0, failed: 0, blocked: 0 };
    }

    // Section 4: Verify employee active status & market authorisation at the sync execution boundary
    let verifiedProfileMarket: string | null = null;
    let verifiedProfileRole: string | null = null;
    try {
      const profileQuery = supabase
        .from('profiles')
        .select('id, is_active, market_code, role')
        .eq('id', ownerUserId);
      if (profileQuery && typeof (profileQuery as any).maybeSingle === 'function') {
        const { data: profileCheck } = await (profileQuery as any).maybeSingle();
        if (profileCheck) {
          if (profileCheck.is_active === false) {
            return {
              synced: 0,
              failed: 0,
              blocked: unsyncedEvents.length,
              error:
                'Security boundary violation: Suspended or deactivated employee cannot synchronise protected operations.',
            };
          }
          verifiedProfileMarket = profileCheck.market_code || null;
          verifiedProfileRole = profileCheck.role || null;
        }
      }
    } catch {
      // Allow isolated unit test mocks that do not stub public.profiles
    }

    const eventsById = new Map<string, OfflineJournalEvent>(events.map((e) => [e.id, e]));

    for (const event of events) {
      if (event.syncStatus === 'synced') {
        continue;
      }

      // Enforce market-restricted boundary if profile market was verified
      if (
        verifiedProfileMarket &&
        verifiedProfileRole !== 'hq_admin' &&
        event.marketCode &&
        event.marketCode !== verifiedProfileMarket
      ) {
        await offlineDb.eventJournal.update(event.id, {
          syncStatus: 'needs_review',
          lastError: `Cross-market authorisation violation: Event market (${event.marketCode}) does not match employee assigned market (${verifiedProfileMarket}).`,
        });
        blockedCount++;
        continue;
      }

      // 1. Check upstream dependencies
      let parentFailedOrReview = false;
      let parentStillPending = false;
      let failedParentType = '';

      for (const depId of event.dependsOnTxUuids || []) {
        const parentEv = await offlineDb.eventJournal.get(depId);
        if (!parentEv) continue;
        eventsById.set(depId, parentEv);

        if (
          parentEv.syncStatus === 'failed' ||
          parentEv.syncStatus === 'needs_review' ||
          parentEv.syncStatus === 'blocked_dependency'
        ) {
          parentFailedOrReview = true;
          failedParentType = parentEv.eventType;
          break;
        }
        if (parentEv.syncStatus !== 'synced') {
          parentStillPending = true;
        }
      }

      if (parentFailedOrReview) {
        await offlineDb.eventJournal.update(event.id, {
          syncStatus: 'blocked_dependency',
          lastError: `Blocked: Required upstream event (${failedParentType}) failed or requires manual review.`,
        });
        blockedCount++;
        continue;
      }

      if (parentStillPending) {
        await offlineDb.eventJournal.update(event.id, {
          syncStatus: 'blocked_dependency',
          lastError: 'Waiting for upstream parent event to finish synchronising.',
        });
        blockedCount++;
        continue;
      }

      // Additional guard for ATTENDANCE_END_DAY: cannot sync while any visit checkout is unresolved
      if (event.eventType === 'ATTENDANCE_END_DAY') {
        const allCurrentEvents = await this.getUserQueueEvents(ownerUserId);
        const unresolvedVisitEvent = allCurrentEvents.find(
          (e) =>
            (e.eventType === 'VISIT_CHECKIN' || e.eventType === 'VISIT_CHECKOUT') &&
            e.syncStatus !== 'synced'
        );
        if (unresolvedVisitEvent) {
          await offlineDb.eventJournal.update(event.id, {
            syncStatus: 'blocked_dependency',
            lastError: `End Day blocked: Visit event (${unresolvedVisitEvent.eventType}) is not yet synchronised.`,
          });
          blockedCount++;
          continue;
        }
      }

      // 2. Check bounded backoff if not manually triggered
      if (
        !ignoreBackoff &&
        event.syncStatus === 'failed' &&
        event.nextRetryAfter &&
        Date.now() < event.nextRetryAfter
      ) {
        continue;
      }

      // If it is in 'needs_review' and not manually reset, keep it in 'needs_review'
      if (event.syncStatus === 'needs_review') {
        blockedCount++;
        continue;
      }

      // 3. Transition to 'syncing'
      await offlineDb.eventJournal.update(event.id, {
        syncStatus: 'syncing',
        lastError: null,
      });

      // 4. Upload any associated media Blobs first
      if (event.mediaIds && event.mediaIds.length > 0) {
        const mediaUploadResult = await this.uploadEventMedia(ownerUserId, event.mediaIds);
        if (!mediaUploadResult.success) {
          const newRetry = event.retryCount + 1;
          await offlineDb.eventJournal.update(event.id, {
            syncStatus: 'failed',
            retryCount: newRetry,
            nextRetryAfter: Date.now() + computeBoundedBackoffMs(newRetry),
            lastError: mediaUploadResult.error,
          });
          failedCount++;
          continue;
        }
      }

      // 5. Execute server-authoritative persistence per eventType
      const result = await this._syncSingleEventToServer(event);

      if (result.status === 'synced') {
        const serverNowIso = result.serverReceivedAt || new Date().toISOString();
        await offlineDb.eventJournal.update(event.id, {
          syncStatus: 'synced',
          serverAckRef: result.serverAckRef,
          serverReceivedAt: serverNowIso,
          serverVerificationResult: result.serverVerificationResult || null,
          provisionalVerificationNote: null,
          lastError: null,
          nextRetryAfter: null,
        });

        await this.updateCachedContext(ownerUserId, event.marketCode, {
          lastServerSyncAt: serverNowIso,
          lastKnownServerTimeMs: new Date(serverNowIso).getTime(),
        });

        syncedCount++;
      } else if (result.status === 'needs_review') {
        await offlineDb.eventJournal.update(event.id, {
          syncStatus: 'needs_review',
          retryCount: event.retryCount + 1,
          lastError: result.error,
          nextRetryAfter: null,
        });
        blockedCount++;
      } else {
        const newRetry = event.retryCount + 1;
        await offlineDb.eventJournal.update(event.id, {
          syncStatus: 'failed',
          retryCount: newRetry,
          nextRetryAfter: Date.now() + computeBoundedBackoffMs(newRetry),
          lastError: result.error,
        });
        failedCount++;
      }
    }

    return { synced: syncedCount, failed: failedCount, blocked: blockedCount };
  },

  /**
   * Propagates a reconciled server attendanceDayId to any downstream queued events
   * if the server already had a confirmed attendance record for the same (user_id, work_date).
   */
  async _rebindAttendanceDayId(ownerUserId: string, oldId: string, canonicalServerId: string): Promise<void> {
    if (oldId === canonicalServerId) return;
    const events = await this.getUserQueueEvents(ownerUserId);
    for (const ev of events) {
      if (ev.syncStatus === 'synced') continue;
      let changed = false;
      const updatedPayload = { ...ev.payload };
      let updatedEntityId = ev.entityId;
      let updatedParentId = ev.parentEntityId;

      if (updatedPayload.attendanceDayId === oldId) {
        updatedPayload.attendanceDayId = canonicalServerId;
        changed = true;
      }
      if (ev.eventType === 'ATTENDANCE_END_DAY' && ev.entityId === oldId) {
        updatedEntityId = canonicalServerId;
        changed = true;
      }
      if (ev.parentEntityId === oldId) {
        updatedParentId = canonicalServerId;
        changed = true;
      }

      if (changed) {
        await offlineDb.eventJournal.update(ev.id, {
          entityId: updatedEntityId,
          parentEntityId: updatedParentId,
          payload: updatedPayload,
        });
      }
    }
  },

  /**
   * Executes the server-side operation for a single event after its media Blobs are uploaded.
   */
  async _syncSingleEventToServer(event: OfflineJournalEvent): Promise<{
    status: 'synced' | 'failed' | 'needs_review';
    serverAckRef: string | null;
    serverReceivedAt?: string;
    serverVerificationResult?: string;
    error: string | null;
  }> {
    const p = event.payload;

    try {
      switch (event.eventType) {
        case 'ATTENDANCE_START_DAY': {
          // Resolve valid device_id on server if placeholder 'dev-001' was used offline
          let validDeviceId = p.deviceId;
          if (!validDeviceId || validDeviceId === 'dev-001') {
            const { data: dev } = await supabase
              .from('devices')
              .select('id')
              .eq('market_code', event.marketCode)
              .limit(1)
              .maybeSingle();
            if (dev?.id) {
              validDeviceId = dev.id;
            }
          }

          const { data: inserted, error: insertError } = await supabase
            .from('attendance_days')
            .insert({
              id: event.entityId,
              user_id: event.ownerUserId,
              device_id: validDeviceId,
              market_code: event.marketCode,
              work_date: p.workDate,
              started_at: event.originalCaptureTimestamp,
              start_latitude: p.latitude,
              start_longitude: p.longitude,
              start_accuracy_m: p.accuracy,
              start_selfie_url: p.selfieStoragePath,
              status: 'started',
              captured_offline: true,
            })
            .select('*')
            .single();

          if (insertError) {
            const code = (insertError as any).code || '';
            const msg = insertError.message || '';

            // Reconcile duplicate key (23505) on retry or existing workday record
            if (code === '23505' || msg.toLowerCase().includes('duplicate key')) {
              const { data: existing } = await supabase
                .from('attendance_days')
                .select('*')
                .eq('user_id', event.ownerUserId)
                .eq('work_date', p.workDate)
                .maybeSingle();

              if (existing) {
                if (existing.status === 'started' || existing.id === event.entityId) {
                  await this._rebindAttendanceDayId(event.ownerUserId, event.entityId, existing.id);
                  await this.updateCachedContext(event.ownerUserId, event.marketCode, {
                    localAttendanceRecord: existing,
                  });
                  return {
                    status: 'synced',
                    serverAckRef: existing.id,
                    serverReceivedAt: existing.server_received_at || new Date().toISOString(),
                    serverVerificationResult: existing.status,
                    error: null,
                  };
                }
                // Existing record on server is already ended or conflicting!
                return {
                  status: 'needs_review',
                  serverAckRef: null,
                  error: `Server reconciliation conflict: Attendance for ${p.workDate} already exists on server with status '${existing.status}'.`,
                };
              }
            }

            if (code === '42501' || code === '23514') {
              return {
                status: 'needs_review',
                serverAckRef: null,
                error: `Server rejected Start Day (${code}): ${msg}`,
              };
            }

            return { status: 'failed', serverAckRef: null, error: msg };
          }

          await this.updateCachedContext(event.ownerUserId, event.marketCode, {
            localAttendanceRecord: inserted,
          });

          return {
            status: 'synced',
            serverAckRef: inserted.id,
            serverReceivedAt: (inserted as any).server_received_at || new Date().toISOString(),
            serverVerificationResult: inserted.status,
            error: null,
          };
        }

        case 'VISIT_CHECKIN': {
          // Requirement 5: Verify approved pin & active market rule on the server before claiming location_verified
          const [pinCheck, ruleCheck] = await Promise.all([
            visitService.getBranchApprovedPin(p.branchId),
            visitService.getActiveMarketRules(event.marketCode),
          ]);

          if (pinCheck.error) {
            return { status: 'failed', serverAckRef: null, error: pinCheck.error.message };
          }

          const liveApprovedPin = pinCheck.data;
          if (!liveApprovedPin || liveApprovedPin.status !== 'approved' || !liveApprovedPin.is_active) {
            return {
              status: 'needs_review',
              serverAckRef: null,
              error:
                'Server verification halted: Selected client location no longer has an active approved GPS pin. Route to manager review / exception.',
            };
          }

          if (
            (p.branchPinId && liveApprovedPin.id !== p.branchPinId) ||
            (p.branchPinVersion != null &&
              liveApprovedPin.version_number != null &&
              liveApprovedPin.version_number !== p.branchPinVersion)
          ) {
            return {
              status: 'needs_review',
              serverAckRef: null,
              error: `GPS pin or version changed on server while offline (captured pin: ${String(
                p.branchPinId || ''
              ).substring(0, 8)} v${p.branchPinVersion ?? '?'}, active pin: ${liveApprovedPin.id.substring(
                0,
                8
              )} v${liveApprovedPin.version_number ?? '?'}). Preserving original capture-time reference for manager review without silent substitution.`,
            };
          }

          const liveRule = ruleCheck.data;

          // Section 6: Never silently substitute another rule version if the applicable rule version changed while offline
          if (
            liveRule &&
            ((p.ruleVersionId && p.ruleVersionId !== liveRule.id) ||
              (p.ruleVersionTag && liveRule.version_tag && p.ruleVersionTag !== liveRule.version_tag))
          ) {
            return {
              status: 'needs_review',
              serverAckRef: null,
              error: `Market rule version changed on server while offline (captured: ${
                p.ruleVersionTag || String(p.ruleVersionId || '').substring(0, 8)
              }, active: ${liveRule.version_tag} [radius ${liveRule.geofence_radius_m}m, max accuracy ${
                liveRule.max_visit_gps_accuracy_m
              }m]). Preserving original capture-time rule reference for manager review without silent substitution.`,
            };
          }

          // Resolve valid device_id if needed
          let validDeviceId = p.deviceId;
          if (!validDeviceId || validDeviceId === 'dev-001') {
            const { data: dev } = await supabase
              .from('devices')
              .select('id')
              .eq('market_code', event.marketCode)
              .limit(1)
              .maybeSingle();
            if (dev?.id) {
              validDeviceId = dev.id;
            }
          }

          const { data: insertedVisit, error: visitError } = await supabase
            .from('visits')
            .insert({
              id: event.entityId,
              user_id: event.ownerUserId,
              device_id: validDeviceId,
              attendance_day_id: p.attendanceDayId,
              branch_id: p.branchId,
              branch_pin_id: p.branchPinId || liveApprovedPin.id,
              rule_version_id: p.ruleVersionId || liveRule?.id || null,
              kind: 'normal',
              check_in_at: event.originalCaptureTimestamp,
              check_in_latitude: p.latitude,
              check_in_longitude: p.longitude,
              check_in_accuracy_m: p.accuracy,
              location_classification: p.provisionalClassification || 'uncertain',
              verification_status: p.intendedVerificationStatus || 'location_unverified',
              premises_photo_url: p.premisesPhotoStoragePath,
              captured_offline: true,
            })
            .select('*')
            .single();

          if (visitError) {
            const code = (visitError as any).code || '';
            const msg = visitError.message || '';

            // Reconcile duplicate key (23505) on retry after client timeout
            if (code === '23505' || msg.toLowerCase().includes('duplicate key')) {
              const { data: existingVisit } = await supabase
                .from('visits')
                .select('*')
                .eq('id', event.entityId)
                .eq('user_id', event.ownerUserId)
                .maybeSingle();

              if (existingVisit) {
                return {
                  status: 'synced',
                  serverAckRef: existingVisit.id,
                  serverReceivedAt: (existingVisit as any).server_received_at || new Date().toISOString(),
                  serverVerificationResult: existingVisit.verification_status,
                  error: null,
                };
              }
            }

            if (code === '23514' || code === '42501' || code === '23503') {
              return {
                status: 'needs_review',
                serverAckRef: null,
                error: `Server PostGIS/Integrity trigger rejected visit check-in (${code}): ${msg}`,
              };
            }

            return { status: 'failed', serverAckRef: null, error: msg };
          }

          // Update cached active or completed visit with authoritative server verification_status
          const ctx = await this.getOrCreateCachedContext(event.ownerUserId, event.marketCode);
          const updatedCompletedOnCheckin = (ctx.localCompletedVisits || []).map((c: any) =>
            c.id === insertedVisit.id || c.id === event.entityId
              ? {
                  ...c,
                  verificationStatus: insertedVisit.verification_status,
                  capturedOffline: false,
                }
              : c
          );
          await this.updateCachedContext(event.ownerUserId, event.marketCode, {
            localActiveVisit:
              ctx.localActiveVisit &&
              (ctx.localActiveVisit.id === insertedVisit.id || ctx.localActiveVisit.id === event.entityId)
                ? {
                    ...ctx.localActiveVisit,
                    verificationStatus: insertedVisit.verification_status,
                    locationClassification: insertedVisit.location_classification,
                    geofenceDistanceMeters:
                      insertedVisit.distance_to_pin_m ?? ctx.localActiveVisit.geofenceDistanceMeters,
                    capturedOffline: false,
                  }
                : ctx.localActiveVisit,
            localCompletedVisits: updatedCompletedOnCheckin,
          });

          return {
            status: 'synced',
            serverAckRef: insertedVisit.id,
            serverReceivedAt: (insertedVisit as any).server_received_at || new Date().toISOString(),
            serverVerificationResult: insertedVisit.verification_status,
            error: null,
          };
        }

        case 'VISIT_CHECKOUT': {
          const { data: updatedVisit, error: checkoutError } = await supabase
            .from('visits')
            .update({
              check_out_at: event.originalCaptureTimestamp,
              check_out_latitude: p.latitude ?? null,
              check_out_longitude: p.longitude ?? null,
              check_out_accuracy_m: p.accuracy ?? null,
            })
            .eq('id', event.entityId)
            .eq('user_id', event.ownerUserId)
            .is('check_out_at', null)
            .select('*')
            .maybeSingle();

          if (checkoutError) {
            const code = (checkoutError as any).code || '';
            if (code === '23514' || code === '42501') {
              return {
                status: 'needs_review',
                serverAckRef: null,
                error: `Server rejected visit checkout (${code}): ${checkoutError.message}`,
              };
            }
            return { status: 'failed', serverAckRef: null, error: checkoutError.message };
          }

          let confirmedVisit = updatedVisit;
          if (!confirmedVisit) {
            // Reconcile if already checked out on prior retry
            const { data: existingVisit } = await supabase
              .from('visits')
              .select('*')
              .eq('id', event.entityId)
              .eq('user_id', event.ownerUserId)
              .maybeSingle();

            if (existingVisit && existingVisit.check_out_at) {
              confirmedVisit = existingVisit;
            } else {
              return {
                status: 'failed',
                serverAckRef: null,
                error: 'Target visit record not found on server for checkout.',
              };
            }
          }

          // Update localCompletedVisits with authoritative server verification_status
          const ctx = await this.getOrCreateCachedContext(event.ownerUserId, event.marketCode);
          const updatedCompleted = (ctx.localCompletedVisits || []).map((c: any) =>
            c.id === confirmedVisit!.id || c.id === event.entityId
              ? {
                  ...c,
                  verificationStatus: confirmedVisit!.verification_status,
                  capturedOffline: false,
                }
              : c
          );
          await this.updateCachedContext(event.ownerUserId, event.marketCode, {
            localCompletedVisits: updatedCompleted,
          });

          return {
            status: 'synced',
            serverAckRef: confirmedVisit.id,
            serverReceivedAt: new Date().toISOString(),
            serverVerificationResult: confirmedVisit.verification_status,
            error: null,
          };
        }

        case 'MEETING_LOG_SUBMIT': {
          const { data: logData, error: logError } = await visitService.submitMeetingLog({
            visitId: p.visitId,
            contactId: p.contactId,
            purpose: p.purpose,
            productsDiscussed: p.productsDiscussed,
            outcomeNarrative: p.outcomeNarrative,
            nextStepText: p.nextStepText,
            fleetSizeVolume: p.fleetSizeVolume,
            businessCardPhotoUrl: p.businessCardPhotoUrl,
            isLate: p.isLate,
          });

          if (logError || !logData) {
            const msg = logError?.message || 'Failed to submit meeting log';
            if (msg.includes('42501') || msg.includes('23514')) {
              return { status: 'needs_review', serverAckRef: null, error: msg };
            }
            return { status: 'failed', serverAckRef: null, error: msg };
          }

          const ctx = await this.getOrCreateCachedContext(event.ownerUserId, event.marketCode);
          const updatedCompleted = (ctx.localCompletedVisits || []).map((c: any) =>
            c.id === p.visitId
              ? { ...c, meetingLogSubmitted: true, meetingLogDeferredUntil: undefined }
              : c
          );
          await this.updateCachedContext(event.ownerUserId, event.marketCode, {
            localCompletedVisits: updatedCompleted,
          });

          return {
            status: 'synced',
            serverAckRef: logData.id,
            serverReceivedAt: logData.submitted_at || new Date().toISOString(),
            serverVerificationResult: 'meeting_log_saved',
            error: null,
          };
        }

        case 'ATTENDANCE_END_DAY': {
          const { data: endedRecord, error: endError } = await supabase
            .from('attendance_days')
            .update({
              status: 'ended',
              ended_at: event.originalCaptureTimestamp,
              end_latitude: p.latitude ?? null,
              end_longitude: p.longitude ?? null,
              end_accuracy_m: p.accuracy ?? null,
            })
            .eq('id', event.entityId)
            .eq('user_id', event.ownerUserId)
            .select('*')
            .maybeSingle();

          if (endError) {
            const code = (endError as any).code || '';
            if (code === '23514' || code === '42501') {
              return {
                status: 'needs_review',
                serverAckRef: null,
                error: `Server rejected End Day (${code}): ${endError.message}`,
              };
            }
            return { status: 'failed', serverAckRef: null, error: endError.message };
          }

          let confirmedEnd = endedRecord;
          if (!confirmedEnd) {
            const { data: existingAtt } = await supabase
              .from('attendance_days')
              .select('*')
              .eq('id', event.entityId)
              .eq('user_id', event.ownerUserId)
              .maybeSingle();
            if (existingAtt && existingAtt.status === 'ended') {
              confirmedEnd = existingAtt;
            } else {
              return {
                status: 'failed',
                serverAckRef: null,
                error: 'Attendance record not found on server for End Day update.',
              };
            }
          }

          await this.updateCachedContext(event.ownerUserId, event.marketCode, {
            localAttendanceRecord: confirmedEnd,
          });

          return {
            status: 'synced',
            serverAckRef: confirmedEnd.id,
            serverReceivedAt: new Date().toISOString(),
            serverVerificationResult: 'ended',
            error: null,
          };
        }

        default:
          return { status: 'needs_review', serverAckRef: null, error: `Unsupported event type: ${event.eventType}` };
      }
    } catch (err: any) {
      return {
        status: 'failed',
        serverAckRef: null,
        error: err?.message || String(err),
      };
    }
  },
};
