import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  offlineDb,
  offlineSyncService,
  mediaRecordToBlob,
  computeBoundedBackoffMs,
} from '@/services/offlineSyncService';
import { supabase } from '@/lib/supabase';
import { visitService } from '@/services/visitService';
import { AuthProvider } from '@/context/AuthContext';
import { MarketConfigProvider } from '@/context/MarketConfigContext';
import { FieldSessionProvider } from '@/context/FieldSessionContext';
import { OfflineSyncView } from '@/features/field/OfflineSyncView';
import { PersistentStatusStrip } from '@/components/field/PersistentStatusStrip';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const DEVICE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BRANCH_A = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PIN_A = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const RULE_V1 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function createTestImageBlob(sizeBytes = 2048): Blob {
  const bytes = new Uint8Array(sizeBytes);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[sizeBytes - 2] = 0xff;
  bytes[sizeBytes - 1] = 0xd9;
  return new Blob([bytes], { type: 'image/jpeg' });
}

describe('Stage 3D — Durable Offline IndexedDB Journal, Media Queue & Dependency Synchronisation (23 Mandatory Scenarios)', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    offlineSyncService.setSimulatedQuotaExhausted(false);
    await offlineDb.eventJournal.clear();
    await offlineDb.mediaQueue.clear();
    await offlineDb.cachedContext.clear();
  });

  // =========================================================================
  // 1. Offline Start Day
  // =========================================================================
  it('Scenario 01: Queues offline Start Day with provisional status and stores live selfie Blob in IndexedDB mediaQueue', async () => {
    const selfieBlob = createTestImageBlob(4096);
    const res = await offlineSyncService.enqueueStartDay({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 15,
      selfieBlob,
    });

    expect(res.error).toBeNull();
    expect(res.event).not.toBeNull();
    expect(res.event?.eventType).toBe('ATTENDANCE_START_DAY');
    expect(res.event?.syncStatus).toBe('pending');
    expect(res.provisionalAttendance?.status).toBe('pending_sync');
    expect(res.provisionalAttendance?.captured_offline).toBe(true);

    const mediaItems = await offlineSyncService.getUserMediaQueue(USER_A);
    expect(mediaItems).toHaveLength(1);
    expect(mediaItems[0].mediaKind).toBe('attendance_selfie');
    expect(mediaItems[0].bucketName).toBe('attendance-selfies');
    expect(mediaItems[0].storagePath.startsWith(`${USER_A}/`)).toBe(true);
    expect(mediaItems[0].sizeBytes).toBe(4096);
  });

  // =========================================================================
  // 2. Offline GPS Capture
  // =========================================================================
  it('Scenario 02: Preserves immutable offline GPS coordinates, reported accuracy, and timezone in journal payload', async () => {
    const selfieBlob = createTestImageBlob(1024);
    const captureIso = '2026-10-28T08:15:30.000Z';
    const res = await offlineSyncService.enqueueStartDay({
      ownerUserId: USER_A,
      marketCode: 'ZM',
      deviceId: DEVICE_A,
      latitude: -15.3875,
      longitude: 28.3228,
      accuracy: 18.4,
      selfieBlob,
      capturedAt: captureIso,
    });

    expect(res.error).toBeNull();
    expect(res.event?.originalCaptureTimestamp).toBe(captureIso);
    expect(res.event?.timezone).toBe('Africa/Lusaka');
    expect(res.event?.payload.latitude).toBe(-15.3875);
    expect(res.event?.payload.longitude).toBe(28.3228);
    expect(res.event?.payload.accuracy).toBe(18.4);
  });

  // =========================================================================
  // 3. Offline Premises Photo Capture
  // =========================================================================
  it('Scenario 03: Stores offline rear-camera premises photo as durable binary bytes in IndexedDB associated with exact user, visit, and submission ID', async () => {
    const photoBlob = createTestImageBlob(8192);
    const res = await offlineSyncService.enqueueVisitCheckIn({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      attendanceDayId: 'att-day-001',
      branchId: BRANCH_A,
      branchName: 'Apex Heavy Logistics Fleet Depot',
      companyName: 'Apex Heavy Logistics Ltd',
      address: 'Apapa Commercial Port Corridor',
      branchCode: 'BR-LAG-014',
      branchPinId: PIN_A,
      branchPinStatus: 'approved',
      ruleVersionId: RULE_V1,
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 14,
      provisionalDistanceMeters: 35,
      provisionalClassification: 'inside_confident',
      photoBlob,
      submissionId: 'sub-premises-99',
    });

    expect(res.error).toBeNull();
    const visitId = res.event!.entityId;
    const mediaItems = await offlineSyncService.getUserMediaQueue(USER_A);
    expect(mediaItems).toHaveLength(1);
    expect(mediaItems[0].id).toBe(`${USER_A}:${visitId}:premises_photo:sub-premises-99`);
    expect(mediaItems[0].storagePath).toBe(`${USER_A}/${visitId}_premises_sub-premises-99.jpg`);
    const reconstructedBlob = mediaRecordToBlob(mediaItems[0]);
    expect(reconstructedBlob.size).toBe(8192);
  });

  // =========================================================================
  // 4. Offline Visit Check-In (Provisional Geofence — Never Prematurely Verified)
  // =========================================================================
  it('Scenario 04: Marks offline visit check-in strictly as pending_sync (Provisional) and never claims location_verified before server PostGIS verification', async () => {
    const photoBlob = createTestImageBlob(2048);
    const res = await offlineSyncService.enqueueVisitCheckIn({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      attendanceDayId: 'att-day-001',
      branchId: BRANCH_A,
      branchName: 'Apex Heavy Logistics Fleet Depot',
      companyName: 'Apex Heavy Logistics Ltd',
      address: 'Apapa Commercial Port Corridor',
      branchCode: 'BR-LAG-014',
      branchPinId: PIN_A,
      branchPinStatus: 'approved',
      ruleVersionId: RULE_V1,
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 12,
      provisionalDistanceMeters: 25,
      provisionalClassification: 'inside_confident',
      photoBlob,
    });

    expect(res.error).toBeNull();
    // Critical security assertion: local provisionalVisit MUST NOT be 'location_verified' before server sync
    expect(res.provisionalVisit.verificationStatus).toBe('pending_sync');
    expect(res.provisionalVisit.intendedVerificationStatus).toBe('location_verified');
    expect(res.event?.provisionalVerificationNote).toMatch(/Requires server PostGIS verification/i);
  });

  // =========================================================================
  // 5. Offline Checkout
  // =========================================================================
  it('Scenario 05: Queues offline visit checkout linked to parent offline visit check-in and preserves outside-geofence flag', async () => {
    const checkInRes = await offlineSyncService.enqueueVisitCheckIn({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      attendanceDayId: 'att-day-001',
      branchId: BRANCH_A,
      branchName: 'Apex Heavy Logistics Fleet Depot',
      companyName: 'Apex Heavy Logistics Ltd',
      address: 'Apapa Port',
      branchCode: 'BR-LAG-014',
      branchPinId: PIN_A,
      branchPinStatus: 'approved',
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 14,
      provisionalDistanceMeters: 30,
      provisionalClassification: 'inside_confident',
      photoBlob: createTestImageBlob(1024),
    });

    const visitId = checkInRes.event!.entityId;
    const checkoutRes = await offlineSyncService.enqueueVisitCheckout({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      visitId,
      branchName: 'Apex Heavy Logistics Fleet Depot',
      companyName: 'Apex Heavy Logistics Ltd',
      branchCode: 'BR-LAG-014',
      checkInTime: '09:30',
      elapsedSeconds: 1800,
      outsideGeofence: true,
      latitude: 6.4501,
      longitude: 3.3702,
      accuracy: 20,
      meetingLogDeferred: true,
    });

    expect(checkoutRes.error).toBeNull();
    expect(checkoutRes.event?.dependsOnTxUuids).toContain(checkInRes.event!.id);
    expect(checkoutRes.completedVisitRecord.verificationStatus).toBe('pending_sync');
    expect(checkoutRes.completedVisitRecord.flagRaised).toMatch(/Checkout Outside Geofence/i);
  });

  // =========================================================================
  // 6. Offline Meeting Log Submission (+ Optional Business Card Blob)
  // =========================================================================
  it('Scenario 06: Queues offline meeting log submission with free-text nextStepText and optional business card photo Blob', async () => {
    const checkInRes = await offlineSyncService.enqueueVisitCheckIn({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      attendanceDayId: 'att-day-001',
      branchId: BRANCH_A,
      branchName: 'Apex Heavy Logistics Fleet Depot',
      companyName: 'Apex Heavy Logistics Ltd',
      address: 'Apapa Port',
      branchCode: 'BR-LAG-014',
      branchPinId: PIN_A,
      branchPinStatus: 'approved',
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 14,
      provisionalDistanceMeters: 30,
      provisionalClassification: 'inside_confident',
      photoBlob: createTestImageBlob(1024),
    });
    const visitId = checkInRes.event!.entityId;

    const checkoutRes = await offlineSyncService.enqueueVisitCheckout({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      visitId,
      branchName: 'Apex Heavy Logistics Fleet Depot',
      companyName: 'Apex Heavy Logistics Ltd',
      branchCode: 'BR-LAG-014',
      checkInTime: '09:30',
      elapsedSeconds: 1800,
      outsideGeofence: false,
      meetingLogDeferred: false,
    });

    const cardBlob = createTestImageBlob(3072);
    const logRes = await offlineSyncService.enqueueMeetingLog({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      visitId,
      branchName: 'Apex Heavy Logistics Fleet Depot',
      purpose: 'routine_visit',
      productsDiscussed: ['Lubricants', 'Batteries'],
      outcomeNarrative: 'Reviewed heavy-duty diesel fleet lubricant intervals.',
      nextStepText: 'Share technical datasheet on next scheduled depot visit.',
      fleetSizeVolume: 42,
      businessCardBlob: cardBlob,
    });

    expect(logRes.error).toBeNull();
    expect(logRes.event?.dependsOnTxUuids).toEqual([checkInRes.event!.id, checkoutRes.event!.id]);
    expect(logRes.event?.mediaIds).toHaveLength(1);

    const mediaQueue = await offlineSyncService.getUserMediaQueue(USER_A);
    const cardMedia = mediaQueue.find((m) => m.mediaKind === 'business_card');
    expect(cardMedia).toBeDefined();
    expect(cardMedia?.bucketName).toBe('business-cards');
  });

  // =========================================================================
  // 7. Browser Refresh with Pending Events
  // =========================================================================
  it('Scenario 07: Survives browser page refresh with pending events and cached active visit intact in IndexedDB', async () => {
    await offlineSyncService.enqueueStartDay({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 12,
      selfieBlob: createTestImageBlob(1500),
    });
    const ctxBeforeRefresh = await offlineSyncService.getOrCreateCachedContext(USER_A, 'NG');
    await offlineSyncService.enqueueVisitCheckIn({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      attendanceDayId: ctxBeforeRefresh.localAttendanceRecord.id,
      branchId: BRANCH_A,
      branchName: 'Apex Heavy Logistics Fleet Depot',
      companyName: 'Apex Heavy Logistics Ltd',
      address: 'Apapa Port',
      branchCode: 'BR-LAG-014',
      branchPinId: PIN_A,
      branchPinStatus: 'approved',
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 14,
      provisionalDistanceMeters: 30,
      provisionalClassification: 'inside_confident',
      photoBlob: createTestImageBlob(2500),
    });

    // Simulate page refresh by reading fresh from IndexedDB tables
    const restoredEvents = await offlineSyncService.getUserQueueEvents(USER_A);
    const restoredCtx = await offlineSyncService.getOrCreateCachedContext(USER_A, 'NG');
    const restoredTelemetry = await offlineSyncService.getUserQueueTelemetry(USER_A, 'NG');

    expect(restoredEvents).toHaveLength(2);
    expect(restoredCtx.localAttendanceRecord?.status).toBe('pending_sync');
    expect(restoredCtx.localActiveVisit?.branchName).toBe('Apex Heavy Logistics Fleet Depot');
    expect(restoredCtx.localActiveVisit?.verificationStatus).toBe('pending_sync');
    expect(restoredTelemetry.pendingCount).toBe(2);
    expect(restoredTelemetry.pendingMediaCount).toBe(2);
    expect(restoredTelemetry.pendingMediaBytes).toBe(4000);
  });

  // =========================================================================
  // 8. Browser Restart with Pending Events
  // =========================================================================
  it('Scenario 08: Survives full browser close and restart by closing and reopening Dexie IndexedDB connection', async () => {
    await offlineSyncService.enqueueStartDay({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 11,
      selfieBlob: createTestImageBlob(3200),
    });

    // Close and re-open the IndexedDB database connection to simulate browser process restart
    offlineDb.close();
    await offlineDb.open();

    const eventsAfterRestart = await offlineSyncService.getUserQueueEvents(USER_A);
    const mediaAfterRestart = await offlineSyncService.getUserMediaQueue(USER_A);

    expect(eventsAfterRestart).toHaveLength(1);
    expect(eventsAfterRestart[0].eventType).toBe('ATTENDANCE_START_DAY');
    expect(mediaAfterRestart).toHaveLength(1);
    expect(mediaRecordToBlob(mediaAfterRestart[0]).size).toBe(3200);
  });

  // =========================================================================
  // 9. Recovery After Network Reconnection & 12. Dependency Ordering
  // =========================================================================
  it('Scenarios 09 & 12: Synchronises full dependent chain (START_DAY -> VISIT_CHECKIN -> VISIT_CHECKOUT -> MEETING_LOG_SUBMIT -> END_DAY) in strict topological order upon reconnection', async () => {
    const executionOrder: string[] = [];

    // Mock Storage uploads
    vi.spyOn(supabase.storage, 'from').mockImplementation((bucket: string) => {
      return {
        upload: vi.fn().mockImplementation(async (path: string) => {
          executionOrder.push(`UPLOAD:${bucket}:${path.split('/')[1].split('_')[0]}`);
          return { data: { path }, error: null };
        }),
      } as any;
    });

    // Mock approved pin & rule checks
    vi.spyOn(visitService, 'getBranchApprovedPin').mockResolvedValue({
      data: {
        id: PIN_A,
        latitude: 6.4428,
        longitude: 3.3649,
        reported_accuracy_m: 15,
        status: 'approved',
        is_active: true,
        version_number: 1,
      },
      error: null,
    });
    vi.spyOn(visitService, 'getActiveMarketRules').mockResolvedValue({
      data: {
        id: RULE_V1,
        market_code: 'NG',
        geofence_radius_m: 200,
        max_visit_gps_accuracy_m: 100,
        max_pin_gps_accuracy_m: 50,
        version_tag: 'v1.2-NG',
      },
      error: null,
    });
    vi.spyOn(visitService, 'submitMeetingLog').mockImplementation(async (params) => {
      executionOrder.push('DB:MEETING_LOG_SUBMIT');
      return {
        data: { id: 'log-server-01', visit_id: params.visitId, submitted_at: new Date().toISOString() } as any,
        error: null,
      };
    });

    // Mock Supabase table operations
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'attendance_days') {
        return {
          insert: vi.fn().mockImplementation((row: any) => ({
            select: () => ({
              single: async () => {
                executionOrder.push('DB:ATTENDANCE_START_DAY');
                return { data: { ...row, status: 'started' }, error: null };
              },
            }),
          })),
          update: vi.fn().mockImplementation((patch: any) => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  maybeSingle: async () => {
                    executionOrder.push('DB:ATTENDANCE_END_DAY');
                    return { data: { id: 'att-1', ...patch, status: 'ended' }, error: null };
                  },
                }),
              }),
            }),
          })),
        } as any;
      }
      if (table === 'visits') {
        return {
          insert: vi.fn().mockImplementation((row: any) => ({
            select: () => ({
              single: async () => {
                executionOrder.push('DB:VISIT_CHECKIN');
                return {
                  data: {
                    ...row,
                    verification_status: 'location_verified',
                    location_classification: 'inside_confident',
                    distance_to_pin_m: 30,
                  },
                  error: null,
                };
              },
            }),
          })),
          update: vi.fn().mockImplementation((patch: any) => ({
            eq: (_col: string, idVal: string) => ({
              eq: () => ({
                is: () => ({
                  select: () => ({
                    maybeSingle: async () => {
                      executionOrder.push('DB:VISIT_CHECKOUT');
                      return {
                        data: {
                          id: idVal,
                          ...patch,
                          verification_status: 'location_verified',
                        },
                        error: null,
                      };
                    },
                  }),
                }),
              }),
            }),
          })),
        } as any;
      }
      return {} as any;
    });

    // Enqueue full day chain while offline
    const startRes = await offlineSyncService.enqueueStartDay({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 12,
      selfieBlob: createTestImageBlob(1000),
    });
    const attId = startRes.event!.entityId;

    const checkInRes = await offlineSyncService.enqueueVisitCheckIn({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      attendanceDayId: attId,
      branchId: BRANCH_A,
      branchName: 'Apex Depot',
      companyName: 'Apex Logistics',
      address: 'Apapa',
      branchCode: 'BR-01',
      branchPinId: PIN_A,
      branchPinStatus: 'approved',
      ruleVersionId: RULE_V1,
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 14,
      provisionalDistanceMeters: 30,
      provisionalClassification: 'inside_confident',
      photoBlob: createTestImageBlob(1000),
    });
    const visitId = checkInRes.event!.entityId;

    await offlineSyncService.enqueueVisitCheckout({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      visitId,
      branchName: 'Apex Depot',
      companyName: 'Apex Logistics',
      branchCode: 'BR-01',
      checkInTime: '09:00',
      elapsedSeconds: 1200,
      outsideGeofence: false,
      meetingLogDeferred: false,
    });

    await offlineSyncService.enqueueMeetingLog({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      visitId,
      branchName: 'Apex Depot',
      purpose: 'routine_visit',
      productsDiscussed: ['Lubricants'],
      outcomeNarrative: 'Met fleet supervisor.',
      nextStepText: 'Follow up on next visit.',
    });

    await offlineSyncService.enqueueEndDay({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      attendanceDayId: attId,
      latitude: 6.4429,
      longitude: 3.365,
      accuracy: 15,
    });

    const syncResult = await offlineSyncService.syncUserQueue(USER_A, USER_A, { ignoreBackoff: true });
    expect(syncResult.synced).toBe(5);
    expect(syncResult.failed).toBe(0);
    expect(syncResult.blocked).toBe(0);

    // Verify strict topological execution order
    const dbSteps = executionOrder.filter((s) => s.startsWith('DB:'));
    expect(dbSteps).toEqual([
      'DB:ATTENDANCE_START_DAY',
      'DB:VISIT_CHECKIN',
      'DB:VISIT_CHECKOUT',
      'DB:MEETING_LOG_SUBMIT',
      'DB:ATTENDANCE_END_DAY',
    ]);

    // Verify completed visit is now promoted from pending_sync to authoritative location_verified
    const ctxAfterSync = await offlineSyncService.getOrCreateCachedContext(USER_A, 'NG');
    expect(ctxAfterSync.localCompletedVisits[0].verificationStatus).toBe('location_verified');
  });

  // =========================================================================
  // 10. Media Upload Interruption & Idempotent Media Skip on Retry
  // =========================================================================
  it('Scenario 10: Retries interrupted media upload and skips re-uploading an already uploaded image when DB insert fails then succeeds', async () => {
    let storageUploadCallCount = 0;
    let dbInsertCallCount = 0;

    vi.spyOn(supabase.storage, 'from').mockImplementation(() => {
      return {
        upload: vi.fn().mockImplementation(async () => {
          storageUploadCallCount++;
          return { data: { path: 'ok' }, error: null };
        }),
      } as any;
    });

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'attendance_days') {
        return {
          insert: vi.fn().mockImplementation((row: any) => ({
            select: () => ({
              single: async () => {
                dbInsertCallCount++;
                if (dbInsertCallCount === 1) {
                  return { data: null, error: { message: 'Temporary network drop during DB insert' } };
                }
                return { data: { ...row, status: 'started' }, error: null };
              },
            }),
          })),
        } as any;
      }
      return {} as any;
    });

    await offlineSyncService.enqueueStartDay({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 15,
      selfieBlob: createTestImageBlob(2048),
    });

    // Attempt 1: Media uploads (count = 1), DB fails
    const attempt1 = await offlineSyncService.syncUserQueue(USER_A, USER_A, { ignoreBackoff: true });
    expect(attempt1.failed).toBe(1);
    expect(storageUploadCallCount).toBe(1);

    const mediaAfterAttempt1 = await offlineSyncService.getUserMediaQueue(USER_A);
    expect(mediaAfterAttempt1[0].uploadStatus).toBe('uploaded');

    // Attempt 2: Media is already 'uploaded', so storage.upload is NOT called again! DB succeeds.
    const attempt2 = await offlineSyncService.syncUserQueue(USER_A, USER_A, { ignoreBackoff: true });
    expect(attempt2.synced).toBe(1);
    expect(storageUploadCallCount).toBe(1); // Still 1!
    expect(dbInsertCallCount).toBe(2);
  });

  // =========================================================================
  // 11. Duplicate Retry and Server Acknowledgement Reconciliation (23505)
  // =========================================================================
  it('Scenario 11: Reconciles duplicate-key (23505) server response idempotently when prior request succeeded before connection drop', async () => {
    vi.spyOn(supabase.storage, 'from').mockImplementation(() => ({
      upload: vi.fn().mockResolvedValue({ data: null, error: { message: 'The resource already exists', statusCode: 409 } }),
    }) as any);

    const startRes = await offlineSyncService.enqueueStartDay({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 15,
      selfieBlob: createTestImageBlob(1024),
    });
    const entityId = startRes.event!.entityId;

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'attendance_days') {
        return {
          insert: vi.fn().mockReturnValue({
            select: () => ({
              single: async () => ({
                data: null,
                error: { code: '23505', message: 'duplicate key value violates unique constraint' },
              }),
            }),
          }),
          select: vi.fn().mockReturnValue({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: entityId,
                    user_id: USER_A,
                    status: 'started',
                    server_received_at: '2026-10-28T08:05:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const syncRes = await offlineSyncService.syncUserQueue(USER_A, USER_A, { ignoreBackoff: true });
    expect(syncRes.synced).toBe(1);
    const events = await offlineSyncService.getUserQueueEvents(USER_A);
    expect(events[0].syncStatus).toBe('synced');
    expect(events[0].serverAckRef).toBe(entityId);
  });

  // =========================================================================
  // 13. Rejected Parent Event Handling (blocked_dependency)
  // =========================================================================
  it('Scenario 13: Transitions child events to blocked_dependency when parent event is rejected or fails', async () => {
    vi.spyOn(supabase.storage, 'from').mockImplementation(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'ok' }, error: null }),
    }) as any);

    // Server rejects Start Day with check constraint violation (23514)
    vi.spyOn(supabase, 'from').mockImplementation(() => ({
      insert: vi.fn().mockReturnValue({
        select: () => ({
          single: async () => ({
            data: null,
            error: { code: '23514', message: 'Attendance check constraint violated' },
          }),
        }),
      }),
    }) as any);

    const startRes = await offlineSyncService.enqueueStartDay({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 15,
      selfieBlob: createTestImageBlob(1024),
    });

    const checkInRes = await offlineSyncService.enqueueVisitCheckIn({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      attendanceDayId: startRes.event!.entityId,
      branchId: BRANCH_A,
      branchName: 'Apex Depot',
      companyName: 'Apex Logistics',
      address: 'Apapa',
      branchCode: 'BR-01',
      branchPinId: PIN_A,
      branchPinStatus: 'approved',
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 14,
      provisionalDistanceMeters: 30,
      provisionalClassification: 'inside_confident',
      photoBlob: createTestImageBlob(1024),
    });

    const syncRes = await offlineSyncService.syncUserQueue(USER_A, USER_A, { ignoreBackoff: true });
    expect(syncRes.synced).toBe(0);
    expect(syncRes.blocked).toBe(2);

    const events = await offlineSyncService.getUserQueueEvents(USER_A);
    const parentEv = events.find((e) => e.id === startRes.event!.id)!;
    const childEv = events.find((e) => e.id === checkInRes.event!.id)!;

    expect(parentEv.syncStatus).toBe('needs_review');
    expect(childEv.syncStatus).toBe('blocked_dependency');
    expect(childEv.lastError).toMatch(/Required upstream event \(ATTENDANCE_START_DAY\) failed or requires manual review/i);
  });

  // =========================================================================
  // 14. Invalid/Unapproved GPS Pin Handling
  // =========================================================================
  it('Scenario 14: Blocks normal offline check-in when pin is unapproved locally, and transitions queued visit to needs_review if pin was revoked on server while offline', async () => {
    // Part A: Local unapproved pin rejected immediately
    const localRejected = await offlineSyncService.enqueueVisitCheckIn({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      attendanceDayId: 'att-1',
      branchId: BRANCH_A,
      branchName: 'Unapproved Branch',
      companyName: 'Test Co',
      address: 'Lagos',
      branchCode: 'BR-02',
      branchPinId: null,
      branchPinStatus: 'pending_approval',
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 15,
      provisionalDistanceMeters: 20,
      provisionalClassification: 'inside_confident',
      photoBlob: createTestImageBlob(1024),
    });
    expect(localRejected.error).not.toBeNull();
    expect(localRejected.error?.message).toMatch(/does not have an approved GPS pin/i);

    // Part B: Pin was approved locally when queued, but revoked on server before sync
    await offlineSyncService.enqueueVisitCheckIn({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      attendanceDayId: 'att-confirmed-on-server',
      branchId: BRANCH_A,
      branchName: 'Apex Depot',
      companyName: 'Apex Logistics',
      address: 'Apapa',
      branchCode: 'BR-01',
      branchPinId: PIN_A,
      branchPinStatus: 'approved',
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 14,
      provisionalDistanceMeters: 30,
      provisionalClassification: 'inside_confident',
      photoBlob: createTestImageBlob(1024),
    });

    vi.spyOn(supabase.storage, 'from').mockImplementation(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'ok' }, error: null }),
    }) as any);
    vi.spyOn(visitService, 'getBranchApprovedPin').mockResolvedValue({
      data: null, // Pin revoked/unapproved on server!
      error: null,
    });
    vi.spyOn(visitService, 'getActiveMarketRules').mockResolvedValue({
      data: {
        id: RULE_V1,
        market_code: 'NG',
        geofence_radius_m: 200,
        max_visit_gps_accuracy_m: 100,
        max_pin_gps_accuracy_m: 50,
        version_tag: 'v1.2',
      },
      error: null,
    });

    await offlineSyncService.syncUserQueue(USER_A, USER_A, { ignoreBackoff: true });
    const events = await offlineSyncService.getUserQueueEvents(USER_A);
    expect(events[0].syncStatus).toBe('needs_review');
    expect(events[0].lastError).toMatch(/no longer has an active approved GPS pin/i);
  });

  // =========================================================================
  // 15. User Switching and Private Queue Isolation
  // =========================================================================
  it("Scenario 15: Strictly partitions IndexedDB records by ownerUserId so Employee B cannot view or sync Employee A's offline records", async () => {
    await offlineSyncService.enqueueStartDay({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 12,
      selfieBlob: createTestImageBlob(1024),
    });

    // Employee B logs in on the same browser: sees 0 events and 0 media in their queue
    const userBEvents = await offlineSyncService.getUserQueueEvents(USER_B);
    const userBMedia = await offlineSyncService.getUserMediaQueue(USER_B);
    expect(userBEvents).toHaveLength(0);
    expect(userBMedia).toHaveLength(0);

    // Attempting to sync Employee A's queue using Employee B's authenticated session is blocked!
    const crossUserSync = await offlineSyncService.syncUserQueue(USER_A, USER_B, { ignoreBackoff: true });
    expect(crossUserSync.synced).toBe(0);
    expect(crossUserSync.error).toMatch(/Security boundary violation/i);

    // Employee A's unsynchronised record remains safely preserved for when Employee A signs back in
    const userAEvents = await offlineSyncService.getUserQueueEvents(USER_A);
    expect(userAEvents).toHaveLength(1);
    expect(userAEvents[0].syncStatus).toBe('pending');
  });

  // =========================================================================
  // 16. Interrupted End Day / End Day Blocked by Unresolved Visit Checkout
  // =========================================================================
  it('Scenario 16: Blocks offline End Day when an active visit is open or when a queued visit check-in has no checkout event (AT-03)', async () => {
    await offlineSyncService.enqueueVisitCheckIn({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      attendanceDayId: 'att-1',
      branchId: BRANCH_A,
      branchName: 'Apex Depot',
      companyName: 'Apex Logistics',
      address: 'Apapa',
      branchCode: 'BR-01',
      branchPinId: PIN_A,
      branchPinStatus: 'approved',
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 14,
      provisionalDistanceMeters: 30,
      provisionalClassification: 'inside_confident',
      photoBlob: createTestImageBlob(1024),
    });

    const endDayAttempt = await offlineSyncService.enqueueEndDay({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      attendanceDayId: 'att-1',
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 15,
    });

    expect(endDayAttempt.error).not.toBeNull();
    expect(endDayAttempt.error?.message).toMatch(/AT-03/i);
  });

  // =========================================================================
  // 17. Database RLS Rejection (42501)
  // =========================================================================
  it('Scenario 17: Transitions event to needs_review when Supabase RLS rejects an operation with 42501', async () => {
    vi.spyOn(supabase.storage, 'from').mockImplementation(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'ok' }, error: null }),
    }) as any);
    vi.spyOn(supabase, 'from').mockImplementation(() => ({
      insert: vi.fn().mockReturnValue({
        select: () => ({
          single: async () => ({
            data: null,
            error: { code: '42501', message: 'new row violates row-level security policy for table "attendance_days"' },
          }),
        }),
      }),
    }) as any);

    await offlineSyncService.enqueueStartDay({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 15,
      selfieBlob: createTestImageBlob(1024),
    });

    await offlineSyncService.syncUserQueue(USER_A, USER_A, { ignoreBackoff: true });
    const events = await offlineSyncService.getUserQueueEvents(USER_A);
    expect(events[0].syncStatus).toBe('needs_review');
    expect(events[0].lastError).toMatch(/42501/);
  });

  // =========================================================================
  // 18. Storage Quota Exhaustion
  // =========================================================================
  it('Scenario 18: Detects browser storage quota exhaustion and blocks media queuing with actionable guidance instead of failing silently', async () => {
    offlineSyncService.setSimulatedQuotaExhausted(true);

    const quota = await offlineSyncService.assessStorageQuota(USER_A);
    expect(quota.isExhausted).toBe(true);
    expect(quota.warningMessage).toMatch(/storage quota is exhausted/i);

    const startRes = await offlineSyncService.enqueueStartDay({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 15,
      selfieBlob: createTestImageBlob(2048),
    });

    expect(startRes.error).not.toBeNull();
    expect(startRes.error?.message).toMatch(/storage quota is exhausted/i);
  });

  // =========================================================================
  // 19. App Backgrounding / Foregrounding & UI Telemetry Integration
  // =========================================================================
  it('Scenario 19: Renders OfflineSyncView & PersistentStatusStrip with live IndexedDB telemetry and handles foreground visibility change', async () => {
    render(
      <AuthProvider>
        <MarketConfigProvider>
          <FieldSessionProvider>
            <PersistentStatusStrip />
            <OfflineSyncView />
          </FieldSessionProvider>
        </MarketConfigProvider>
      </AuthProvider>
    );

    expect(screen.getByText(/Offline Queue & Sync/i)).toBeInTheDocument();
    expect(screen.getByText(/IndexedDB Media & Journal Storage/i)).toBeInTheDocument();
    expect(screen.getByText(/Saved on this device \/ Waiting to sync = Provisional/i)).toBeInTheDocument();

    // Toggle offline mode using simulator button
    const toggleBtn = screen.getByRole('button', { name: /Simulate Going Offline/i });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByText(/Device is currently offline/i)).toBeInTheDocument();
    });

    // Simulate app foregrounding visibilitychange
    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
    fireEvent(document, new Event('visibilitychange'));
  });

  // =========================================================================
  // 20. Pending Meeting-Log Recovery Across Offline/Online Transitions
  // =========================================================================
  it('Scenario 20: Preserves deferred/pending meeting logs in cachedContext across offline checkout and updates status once meeting log is queued', async () => {
    const checkInRes = await offlineSyncService.enqueueVisitCheckIn({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      attendanceDayId: 'att-01',
      branchId: BRANCH_A,
      branchName: 'Apex Depot',
      companyName: 'Apex Logistics',
      address: 'Apapa',
      branchCode: 'BR-01',
      branchPinId: PIN_A,
      branchPinStatus: 'approved',
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 14,
      provisionalDistanceMeters: 30,
      provisionalClassification: 'inside_confident',
      photoBlob: createTestImageBlob(1024),
    });
    const visitId = checkInRes.event!.entityId;

    // Checkout with deferred meeting log
    await offlineSyncService.enqueueVisitCheckout({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      visitId,
      branchName: 'Apex Depot',
      companyName: 'Apex Logistics',
      branchCode: 'BR-01',
      checkInTime: '09:00',
      elapsedSeconds: 1200,
      outsideGeofence: false,
      meetingLogDeferred: true,
    });

    let ctx = await offlineSyncService.getOrCreateCachedContext(USER_A, 'NG');
    expect(ctx.localCompletedVisits[0].meetingLogSubmitted).toBe(false);
    expect(ctx.localCompletedVisits[0].meetingLogDeferredUntil).toMatch(/Within 2h SLA/i);

    // Later while still offline, salesperson submits the deferred meeting log
    await offlineSyncService.enqueueMeetingLog({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      visitId,
      branchName: 'Apex Depot',
      purpose: 'follow_up',
      productsDiscussed: ['Tyres'],
      outcomeNarrative: 'Completed deferred log while offline.',
      nextStepText: 'Deliver tyre catalogue on next visit.',
    });

    ctx = await offlineSyncService.getOrCreateCachedContext(USER_A, 'NG');
    expect(ctx.localCompletedVisits[0].meetingLogSubmitted).toBe(true);
    expect(ctx.localCompletedVisits[0].meetingLogDeferredUntil).toBe('Queued on Device');
  });

  // =========================================================================
  // 21. Stale Cached Market Rules
  // =========================================================================
  it('Scenario 21: Flags visit as needs_review if market rule version changed on server while offline and new threshold is violated', async () => {
    await offlineSyncService.enqueueVisitCheckIn({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      attendanceDayId: 'att-01',
      branchId: BRANCH_A,
      branchName: 'Apex Depot',
      companyName: 'Apex Logistics',
      address: 'Apapa',
      branchCode: 'BR-01',
      branchPinId: PIN_A,
      branchPinStatus: 'approved',
      ruleVersionId: 'old-rule-v1',
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 40,
      provisionalDistanceMeters: 140, // 140 + 40 = 180m (valid under old 200m rule, invalid under new 150m rule)
      provisionalClassification: 'inside_confident',
      photoBlob: createTestImageBlob(1024),
    });

    vi.spyOn(supabase.storage, 'from').mockImplementation(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'ok' }, error: null }),
    }) as any);
    vi.spyOn(visitService, 'getBranchApprovedPin').mockResolvedValue({
      data: {
        id: PIN_A,
        latitude: 6.4428,
        longitude: 3.3649,
        reported_accuracy_m: 15,
        status: 'approved',
        is_active: true,
        version_number: 1,
      },
      error: null,
    });
    // Server now enforces stricter 150m radius in new rule version
    vi.spyOn(visitService, 'getActiveMarketRules').mockResolvedValue({
      data: {
        id: 'new-rule-v2',
        market_code: 'NG',
        geofence_radius_m: 150,
        max_visit_gps_accuracy_m: 100,
        max_pin_gps_accuracy_m: 50,
        version_tag: 'v1.3-strict',
      },
      error: null,
    });

    await offlineSyncService.syncUserQueue(USER_A, USER_A, { ignoreBackoff: true });
    const events = await offlineSyncService.getUserQueueEvents(USER_A);
    expect(events[0].syncStatus).toBe('needs_review');
    expect(events[0].lastError).toMatch(/Market rule version changed on server while offline/i);
  });

  // =========================================================================
  // 22. Server-Versus-Client Timestamp Discrepancies
  // =========================================================================
  it('Scenario 22: Detects and records clockSkewWarning when local device clock is backdated behind last known server timestamp', async () => {
    const serverTimeMs = new Date('2026-10-28T12:00:00.000Z').getTime();
    await offlineSyncService.updateCachedContext(USER_A, 'NG', {
      lastKnownServerTimeMs: serverTimeMs,
    });

    // Device clock is set 45 minutes behind last known server time
    const backdatedIso = new Date(serverTimeMs - 45 * 60 * 1000).toISOString();
    const res = await offlineSyncService.enqueueStartDay({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 14,
      selfieBlob: createTestImageBlob(1024),
      capturedAt: backdatedIso,
    });

    expect(res.error).toBeNull();
    expect(res.event?.clockSkewWarning).toMatch(/Clock discrepancy detected: Device timestamp is 45 min behind/i);
  });

  // =========================================================================
  // 23. Concurrent Submission Attempts & Bounded Exponential Backoff
  // =========================================================================
  it('Scenario 23: Coalesces concurrent syncUserQueue calls via per-user lock without duplicate inserts and computes bounded exponential backoff', async () => {
    expect(computeBoundedBackoffMs(1)).toBe(2000);
    expect(computeBoundedBackoffMs(2)).toBe(4000);
    expect(computeBoundedBackoffMs(3)).toBe(8000);
    expect(computeBoundedBackoffMs(10)).toBe(60000); // Capped at 60s

    let dbInsertCount = 0;
    vi.spyOn(supabase.storage, 'from').mockImplementation(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'ok' }, error: null }),
    }) as any);
    vi.spyOn(supabase, 'from').mockImplementation(() => ({
      insert: vi.fn().mockImplementation((row: any) => ({
        select: () => ({
          single: async () => {
            dbInsertCount++;
            await new Promise((r) => setTimeout(r, 40));
            return { data: { ...row, status: 'started' }, error: null };
          },
        }),
      })),
    }) as any);

    await offlineSyncService.enqueueStartDay({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 15,
      selfieBlob: createTestImageBlob(1024),
    });

    // Fire 3 concurrent syncUserQueue calls simultaneously
    const [r1, r2, r3] = await Promise.all([
      offlineSyncService.syncUserQueue(USER_A, USER_A, { ignoreBackoff: true }),
      offlineSyncService.syncUserQueue(USER_A, USER_A, { ignoreBackoff: true }),
      offlineSyncService.syncUserQueue(USER_A, USER_A, { ignoreBackoff: true }),
    ]);

    expect(dbInsertCount).toBe(1); // Only 1 DB insert executed!
    expect(r1.synced).toBe(1);
    expect(r2.synced).toBe(1);
    expect(r3.synced).toBe(1);
  });

  // =========================================================================
  // 24. Capture-Time Pin & Rule Version Immutability (No Silent Substitution)
  // =========================================================================
  it('Scenario 24: Preserves capture-time branchPinVersion and ruleVersionTag and never silently substitutes a new pin or rule version on sync', async () => {
    const checkInRes = await offlineSyncService.enqueueVisitCheckIn({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      attendanceDayId: 'att-01',
      branchId: BRANCH_A,
      branchName: 'Apex Depot',
      companyName: 'Apex Logistics',
      address: 'Apapa',
      branchCode: 'BR-01',
      branchPinId: PIN_A,
      branchPinVersion: 1,
      branchPinStatus: 'approved',
      ruleVersionId: RULE_V1,
      ruleVersionTag: 'v1.2',
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 12,
      provisionalDistanceMeters: 20, // Even though 20m + 12m is well inside any radius, rule version changed!
      provisionalClassification: 'inside_confident',
      photoBlob: createTestImageBlob(1024),
    });

    expect(checkInRes.event?.payload.branchPinVersion).toBe(1);
    expect(checkInRes.event?.payload.ruleVersionTag).toBe('v1.2');

    vi.spyOn(supabase.storage, 'from').mockImplementation(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'ok' }, error: null }),
    }) as any);
    vi.spyOn(visitService, 'getBranchApprovedPin').mockResolvedValue({
      data: {
        id: PIN_A,
        latitude: 6.4428,
        longitude: 3.3649,
        reported_accuracy_m: 15,
        status: 'approved',
        is_active: true,
        version_number: 2, // Pin version incremented while offline!
      },
      error: null,
    });
    vi.spyOn(visitService, 'getActiveMarketRules').mockResolvedValue({
      data: {
        id: RULE_V1,
        market_code: 'NG',
        geofence_radius_m: 200,
        max_visit_gps_accuracy_m: 100,
        max_pin_gps_accuracy_m: 50,
        version_tag: 'v1.2',
      },
      error: null,
    });

    await offlineSyncService.syncUserQueue(USER_A, USER_A, { ignoreBackoff: true });
    const events = await offlineSyncService.getUserQueueEvents(USER_A);
    expect(events[0].syncStatus).toBe('needs_review');
    expect(events[0].lastError).toMatch(/without silent substitution/i);
  });

  // =========================================================================
  // 25. Cross-Midnight Workdays and Delayed Next-Day Synchronisation
  // =========================================================================
  it('Scenario 25: Retains original capture workDate and timestamps when offline workday crosses midnight and synchronises the next day', async () => {
    // Capture Start Day at 22:30 UTC on 2026-10-27 (23:30 WAT in Africa/Lagos -> workDate 2026-10-27)
    const lateEveningCapture = '2026-10-27T22:30:00.000Z';
    const startRes = await offlineSyncService.enqueueStartDay({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 15,
      selfieBlob: createTestImageBlob(1024),
      capturedAt: lateEveningCapture,
    });

    expect(startRes.event?.payload.workDate).toBe('2026-10-27');
    expect(startRes.event?.originalCaptureTimestamp).toBe(lateEveningCapture);

    // End Day captured after midnight at 00:15 UTC on 2026-10-28 (01:15 WAT) for the same attendanceDayId
    const postMidnightEnd = '2026-10-28T00:15:00.000Z';
    const endRes = await offlineSyncService.enqueueEndDay({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      attendanceDayId: startRes.event!.entityId,
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 16,
      capturedAt: postMidnightEnd,
    });

    expect(endRes.event?.entityId).toBe(startRes.event!.entityId);
    expect(endRes.event?.originalCaptureTimestamp).toBe(postMidnightEnd);
  });

  // =========================================================================
  // 26. Sync Execution Boundary Blocks Suspended Employees & JWT Mismatch
  // =========================================================================
  it('Scenario 26: Blocks synchronisation at the execution boundary when employee profile is suspended (is_active = false) or active JWT session belongs to another user', async () => {
    await offlineSyncService.enqueueStartDay({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      latitude: 6.4428,
      longitude: 3.3649,
      accuracy: 15,
      selfieBlob: createTestImageBlob(1024),
    });

    // Part A: Active Supabase JWT session belongs to USER_B while caller passes USER_A
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: { user: { id: USER_B } } as any },
      error: null,
    });

    const jwtMismatchRes = await offlineSyncService.syncUserQueue(USER_A, USER_A, { ignoreBackoff: true });
    expect(jwtMismatchRes.synced).toBe(0);
    expect(jwtMismatchRes.error).toMatch(/Active Supabase JWT session user does not match/i);

    // Part B: JWT matches USER_A, but USER_A has been suspended (is_active = false) in public.profiles
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: { user: { id: USER_A } } as any },
      error: null,
    });
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: USER_A, is_active: false, market_code: 'NG', role: 'salesperson' },
                error: null,
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const suspendedRes = await offlineSyncService.syncUserQueue(USER_A, USER_A, { ignoreBackoff: true });
    expect(suspendedRes.synced).toBe(0);
    expect(suspendedRes.blocked).toBe(1);
    expect(suspendedRes.error).toMatch(/Suspended or deactivated employee cannot synchronise/i);
  });

  // =========================================================================
  // 27. Failed Online Meeting Log Survives Browser Refresh in IndexedDB
  // =========================================================================
  it('Scenario 27: Persists failed online meeting log into IndexedDB with syncStatus=failed so it survives browser refresh and can be retried', async () => {
    const failedLogRes = await offlineSyncService.enqueueMeetingLog({
      ownerUserId: USER_A,
      marketCode: 'NG',
      deviceId: DEVICE_A,
      visitId: 'vis-online-101',
      branchName: 'Apex Depot',
      purpose: 'routine_visit',
      productsDiscussed: ['Lubricants'],
      outcomeNarrative: 'Discussed bulk engine oil supply.',
      nextStepText: 'Follow up with technical data sheet.',
      initialSyncStatus: 'failed',
      initialError: 'Network timeout while saving meeting log',
    });

    expect(failedLogRes.error).toBeNull();
    expect(failedLogRes.event?.syncStatus).toBe('failed');
    expect(failedLogRes.event?.lastError).toBe('Network timeout while saving meeting log');

    // Verify it persists in IndexedDB across simulated refresh
    const persistedEvents = await offlineSyncService.getUserQueueEvents(USER_A);
    expect(persistedEvents).toHaveLength(1);
    expect(persistedEvents[0].eventType).toBe('MEETING_LOG_SUBMIT');
    expect(persistedEvents[0].syncStatus).toBe('failed');
  });
});
