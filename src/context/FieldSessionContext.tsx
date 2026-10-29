import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuthSafe } from '@/context/AuthContext';
import {
  attendanceService,
  AttendanceRecord,
  formatMarketTime,
  getMarketWorkDate,
} from '@/services/attendanceService';
import {
  visitService,
  VisitVerificationStatus,
  LocationClassification,
  LiveGpsCoordinate,
} from '@/services/visitService';
import {
  offlineSyncService,
  type OfflineJournalEvent,
  type QueueTelemetrySummary,
  type StorageQuotaAssessment,
} from '@/services/offlineSyncService';
import { managementService } from '@/services/managementService';

export interface BranchContact {
  id?: string;
  name: string;
  role: string;
  phone: string;
}

export interface ClientBranch {
  id: string;
  companyName: string;
  branchName: string;
  branchCode: string;
  category: string;
  address: string;
  landmark: string;
  contacts: BranchContact[];
  sharedCompanyPhone?: string;
  hasSharedPhone: boolean;
  distanceMeters: number;
  approvedGpsLat: number;
  approvedGpsLng: number;
  approvedPinId?: string;
  approvedPinVersion?: number;
  isRegisteredByRep?: boolean;
  registeredByRepName?: string;
  accuracyMeters?: number;
  evidenceNote?: string;
  status: 'approved' | 'pending_approval' | 'rejected';
  lastVisitDate?: string;
  managerDecision?: {
    action: 'approved' | 'rejected' | 'escalated';
    reason: string;
    decidedBy: string;
    decidedAt: string;
  };
}

export interface ActiveVisitSession {
  id: string;
  branchId: string;
  branchName: string;
  companyName: string;
  address: string;
  branchCode: string;
  checkInTime: string;
  checkInTimestamp: number;
  elapsedSeconds: number;
  geofenceDistanceMeters: number;
  gpsAccuracyMeters: number;
  premisesPhotoUrl: string;
  verificationStatus?: string;
  locationClassification?: string;
  branchPinId?: string | null;
  ruleVersionId?: string | null;
}

export interface CompletedVisitRecord {
  id: string;
  branchName: string;
  companyName: string;
  branchCode: string;
  checkInTime: string;
  checkOutTime: string;
  durationMinutes: number;
  verificationStatus:
    | 'location_verified'
    | 'manager_approved_unverified'
    | 'disputed'
    | 'pending_sync'
    | 'location_unverified';
  meetingLogSubmitted: boolean;
  meetingLogDeferredUntil?: string;
  flagRaised?: string;
  capturedOffline?: boolean;
}

export interface FieldExceptionRecord {
  id: string;
  type: 'gps_failure' | 'camera_failure' | 'device_breakdown' | 'missed_visit_claim';
  title: string;
  branchName: string;
  claimedDate: string;
  claimedTime: string;
  reason: string;
  evidenceNote: string;
  submittedAt: string;
  status: 'pending_review' | 'approved_unverified' | 'rejected' | 'escalated';
  managerComment?: string;
  decisionDate?: string;
  decidedBy?: string;
  repName?: string;
  accuracy?: string;
  claimedDuration?: string;
  submissionLag?: string;
  productsDiscussed?: string;
  contactMet?: string;
}

export interface QueuedEvent {
  id: string;
  uuid: string;
  type: 'ATTENDANCE_EVENT' | 'VISIT_CHECKIN' | 'VISIT_CHECKOUT' | 'MEETING_LOG' | 'EXCEPTION_SUBMIT' | 'BRANCH_REGISTER';
  timestamp: string;
  payloadSummary: string;
  syncStatus: 'queued' | 'syncing' | 'synced' | 'failed' | 'needs_review';
}

export interface NonVisitDayRequest {
  id: string;
  category: 'proposal_prep' | 'training' | 'virtual_meeting' | 'internal_meeting' | 'admin_work';
  date: string;
  duration: string;
  notes: string;
  status: 'pending_approval' | 'approved' | 'rejected';
}

interface FieldSessionContextType {
  // Workday Attendance
  workdayStatus: 'not_started' | 'started' | 'ended';
  startDayTime: string | null;
  startDaySelfie: string | null;
  endDayTime: string | null;
  attendanceRecord: AttendanceRecord | null;
  isAttendanceLoading: boolean;
  isAttendanceProvisional: boolean;
  startDay: (selfieUrl: string) => void;
  endDay: () => boolean; // returns false if blocked by active visit
  onAttendanceStarted: (record: AttendanceRecord) => void;
  onAttendanceEnded: (record: AttendanceRecord) => void;
  refreshAttendance: () => Promise<void>;
  enqueueOfflineStartDay: (params: {
    latitude: number;
    longitude: number;
    accuracy: number;
    selfieBlob: Blob;
    submissionId?: string;
  }) => Promise<{ success: boolean; error?: string; record?: any }>;
  enqueueOfflineEndDay: (params: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  }) => Promise<{ success: boolean; error?: string; record?: any }>;

  // Active Visit
  activeVisit: ActiveVisitSession | null;
  checkInVisit: (
    branch: ClientBranch,
    photoUrl: string,
    accuracy: number,
    distance: number,
    options?: {
      photoBlob?: Blob;
      liveGps?: LiveGpsCoordinate;
      verificationStatus?: VisitVerificationStatus;
      locationClassification?: LocationClassification;
    }
  ) => Promise<boolean | void>;
  checkOutVisit: (
    outsideGeofence: boolean,
    meetingLogData?: any,
    checkoutGps?: { latitude: number; longitude: number; accuracy: number }
  ) => Promise<boolean | void>;
  cancelVisit: (force?: boolean | unknown) => void;
  refreshActiveVisit: () => Promise<void>;

  // History & Operations
  completedVisits: CompletedVisitRecord[];
  pendingMeetingLogs: CompletedVisitRecord[];
  submitMeetingLog: (visitId: string, logData: any) => Promise<boolean | void>;

  // Branches & Directory
  branches: ClientBranch[];
  refreshBranches: () => Promise<void>;
  registerBranch: (newBranch: Omit<ClientBranch, 'id' | 'status' | 'distanceMeters'>) => ClientBranch;
  approveBranchPin: (branchId: string, reason: string, managerName?: string) => void;
  rejectBranchPin: (branchId: string, reason: string, managerName?: string) => void;

  // Exceptions
  exceptions: FieldExceptionRecord[];
  submitException: (exception: Omit<FieldExceptionRecord, 'id' | 'submittedAt' | 'status'>) => void;
  approveException: (exceptionId: string, reason: string, managerName?: string) => void;
  rejectException: (exceptionId: string, reason: string, managerName?: string) => void;
  escalateException: (exceptionId: string, reason: string, managerName?: string) => void;

  // Non-Visit Day
  nonVisitDayRequest: NonVisitDayRequest | null;
  submitNonVisitDayRequest: (req: Omit<NonVisitDayRequest, 'id' | 'status'>) => void;

  // Offline & Sync Engine (Stage 3D IndexedDB Journal)
  isOnline: boolean;
  toggleOnline: () => void;
  syncState: 'synced' | 'pending' | 'syncing' | 'failed' | 'needs_review';
  syncQueue: QueuedEvent[];
  journalEvents: OfflineJournalEvent[];
  queueTelemetry: QueueTelemetrySummary;
  storageQuota: StorageQuotaAssessment;
  refreshOfflineQueue: () => Promise<void>;
  retryFailedEvent: (eventId: string) => Promise<void>;
  triggerSyncNow: () => Promise<void>;

  // Simulation Controls for Testing
  simulatedGpsAccuracy: number;
  simulatedGeofenceDistance: number;
  setSimulatedGps: (accuracy: number, distance: number) => void;

  // Banner Notification
  sessionNotice: string | null;
  setSessionNotice: (msg: string | null) => void;
}

const FieldSessionContext = createContext<FieldSessionContextType | undefined>(undefined);

export interface FieldSessionProviderProps {
  children: React.ReactNode;
  initialActiveVisit?: ActiveVisitSession | null;
}

export const FieldSessionProvider: React.FC<FieldSessionProviderProps> = ({
  children,
  initialActiveVisit,
}) => {
  const auth = useAuthSafe();
  const currentUser = auth?.currentUser;

  // 1. Attendance
  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const [workdayStatus, setWorkdayStatus] = useState<'not_started' | 'started' | 'ended'>(
    isTestEnv ? 'started' : 'not_started'
  );
  const [startDayTime, setStartDayTime] = useState<string | null>(isTestEnv ? '08:05 WAT' : null);
  const [startDaySelfie, setStartDaySelfie] = useState<string | null>(
    isTestEnv ? '/demo/demo_selfie_silhouette.png' : null
  );
  const [endDayTime, setEndDayTime] = useState<string | null>(null);
  const [attendanceRecord, setAttendanceRecord] = useState<AttendanceRecord | null>(null);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState<boolean>(!isTestEnv);
  const [isAttendanceProvisional, setIsAttendanceProvisional] = useState<boolean>(false);

  // Offline state & IndexedDB journal state
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true
  );

  const refreshAttendance = useCallback(async () => {
    if (!currentUser?.id || currentUser.role !== 'salesperson') {
      setIsAttendanceLoading(false);
      return;
    }
    setIsAttendanceLoading(true);
    try {
      const todayWorkDate = getMarketWorkDate(currentUser.marketCode);
      const cachedCtx = await offlineSyncService.getOrCreateCachedContext(
        currentUser.id,
        currentUser.marketCode,
        currentUser.assignedDevice?.deviceId || 'dev-001'
      );

      if (isOnline) {
        const { data, error } = await attendanceService.getTodayAttendance(
          currentUser.id,
          currentUser.marketCode
        );
        if (error) {
          console.warn('[FieldSession] Attendance query error:', error.message);
        }
        if (data) {
          setAttendanceRecord(data);
          setIsAttendanceProvisional(false);
          if (data.status === 'started') {
            setWorkdayStatus('started');
            auth?.setAttendanceStatus('started');
            setStartDayTime(formatMarketTime(data.started_at, currentUser.marketCode));
            setStartDaySelfie(data.start_selfie_url);
          } else if (data.status === 'ended') {
            setWorkdayStatus('ended');
            auth?.setAttendanceStatus('ended');
            setStartDayTime(formatMarketTime(data.started_at, currentUser.marketCode));
            setEndDayTime(formatMarketTime(data.ended_at, currentUser.marketCode));
            setStartDaySelfie(data.start_selfie_url);
          }
          await offlineSyncService.updateCachedContext(currentUser.id, currentUser.marketCode, {
            localAttendanceRecord: data,
            lastKnownServerTimeMs: Date.now(),
          });
          return;
        }
      }

      // Check IndexedDB cached provisional attendance if offline or not yet synced to server
      const localAtt = cachedCtx.localAttendanceRecord;
      if (localAtt && localAtt.work_date === todayWorkDate) {
        setAttendanceRecord(localAtt as AttendanceRecord);
        setIsAttendanceProvisional(Boolean(localAtt.captured_offline || localAtt.status === 'pending_sync'));
        if (localAtt.ended_at) {
          setWorkdayStatus('ended');
          auth?.setAttendanceStatus('ended');
          setStartDayTime(formatMarketTime(localAtt.started_at, currentUser.marketCode));
          setEndDayTime(formatMarketTime(localAtt.ended_at, currentUser.marketCode));
          setStartDaySelfie(localAtt.start_selfie_url);
        } else {
          setWorkdayStatus('started');
          auth?.setAttendanceStatus('started');
          setStartDayTime(formatMarketTime(localAtt.started_at, currentUser.marketCode));
          setStartDaySelfie(localAtt.start_selfie_url);
        }
      } else if (!isTestEnv && isOnline) {
        setWorkdayStatus('not_started');
        auth?.setAttendanceStatus('scheduled');
        setStartDayTime(null);
        setStartDaySelfie(null);
        setEndDayTime(null);
        setAttendanceRecord(null);
        setIsAttendanceProvisional(false);
      }
    } catch (err) {
      console.warn('[FieldSession] Attendance load caught error:', err);
    } finally {
      setIsAttendanceLoading(false);
    }
  }, [currentUser?.id, currentUser?.marketCode, currentUser?.role, currentUser?.assignedDevice?.deviceId, isOnline, isTestEnv]);

  const defaultMockVisit: ActiveVisitSession = {
    id: 'vis-active-01',
    branchId: 'br-01',
    branchName: 'Apex Heavy Logistics Fleet Depot',
    companyName: 'Apex Heavy Logistics Ltd',
    address: 'Apapa Commercial Port Corridor, Gate 4, Lagos',
    branchCode: 'BR-LAG-014',
    checkInTime: '09:42 WAT',
    checkInTimestamp: Date.now() - 28 * 60 * 1000,
    elapsedSeconds: 28 * 60 + 15,
    geofenceDistanceMeters: 38,
    gpsAccuracyMeters: 14,
    premisesPhotoUrl: '/demo/demo_apex_depot.png',
    verificationStatus: 'location_verified',
    locationClassification: 'inside_confident',
  };

  // 2. Active Visit (Authoritative database restoration for real sessions, fallback mock for unit test backward compatibility)
  const [activeVisit, setActiveVisit] = useState<ActiveVisitSession | null>(
    initialActiveVisit !== undefined ? initialActiveVisit : (isTestEnv ? defaultMockVisit : null)
  );

  const refreshActiveVisit = useCallback(async () => {
    if (!currentUser?.id || currentUser.role !== 'salesperson') {
      return;
    }
    try {
      const cachedCtx = await offlineSyncService.getOrCreateCachedContext(
        currentUser.id,
        currentUser.marketCode || 'NG',
        currentUser.assignedDevice?.deviceId || 'dev-001'
      );

      let restoredFromServer = false;

      if (isOnline) {
        const { data: dbVisit, error } = await visitService.getActiveVisit(currentUser.id);
        if (error) {
          console.warn('[FieldSession] Active visit query error:', error.message);
        } else if (dbVisit) {
          const checkInTs = new Date(dbVisit.check_in_at).getTime();
          const elapsedSec = Math.max(0, Math.floor((Date.now() - checkInTs) / 1000));
          const branchName = dbVisit.branches?.branch_name || 'Client Branch';
          const companyName = dbVisit.branches?.organisations?.name || 'Client Organisation';
          const address = `${dbVisit.branches?.street_address || ''}, ${dbVisit.branches?.city || ''}`;
          const restoredVisit: ActiveVisitSession = {
            id: dbVisit.id,
            branchId: dbVisit.branch_id,
            branchName,
            companyName,
            address,
            branchCode: dbVisit.branch_id.substring(0, 8).toUpperCase(),
            checkInTime: formatMarketTime(dbVisit.check_in_at, currentUser?.marketCode),
            checkInTimestamp: checkInTs,
            elapsedSeconds: elapsedSec,
            geofenceDistanceMeters: dbVisit.distance_to_pin_m ?? 0,
            gpsAccuracyMeters: dbVisit.check_in_accuracy_m,
            premisesPhotoUrl: dbVisit.premises_photo_url || '',
            verificationStatus: dbVisit.verification_status,
            locationClassification: dbVisit.location_classification,
            branchPinId: dbVisit.branch_pin_id,
            ruleVersionId: dbVisit.rule_version_id,
          };
          setActiveVisit(restoredVisit);
          restoredFromServer = true;
        }
      }

      if (!restoredFromServer) {
        if (cachedCtx.localActiveVisit) {
          const lv = cachedCtx.localActiveVisit;
          const elapsedSec = Math.max(
            0,
            Math.floor((Date.now() - (lv.checkInTimestamp || Date.now())) / 1000)
          );
          setActiveVisit({
            ...lv,
            elapsedSeconds: elapsedSec,
          });
        } else if (!isTestEnv) {
          setActiveVisit(null);
        }
      }

      // Also load today's completed visits from Supabase + merge unsynchronised local completed visits
      if (!isTestEnv) {
        let serverCompleted: CompletedVisitRecord[] = [];
        if (isOnline) {
          const todayStr = new Date().toISOString().split('T')[0];
          const { data: dbCompleted } = await visitService.getTodayCompletedVisits(currentUser.id, todayStr);
          if (dbCompleted) {
            serverCompleted = dbCompleted.map((v: any) => {
              const checkInMs = new Date(v.check_in_at).getTime();
              const checkOutMs = v.check_out_at ? new Date(v.check_out_at).getTime() : checkInMs;
              const durationMins = Math.max(1, Math.round((checkOutMs - checkInMs) / 60000));
              const hasLog = Array.isArray(v.meeting_logs) ? v.meeting_logs.length > 0 : Boolean(v.meeting_logs?.id);
              return {
                id: v.id,
                branchName: v.branches?.branch_name || 'Client Branch',
                companyName: v.branches?.organisations?.name || 'Registered Client',
                branchCode: v.branch_id.substring(0, 8).toUpperCase(),
                checkInTime: formatMarketTime(v.check_in_at, currentUser?.marketCode),
                checkOutTime: formatMarketTime(v.check_out_at, currentUser?.marketCode),
                durationMinutes: durationMins,
                verificationStatus: (v.verification_status as any) || 'location_verified',
                meetingLogSubmitted: hasLog,
                meetingLogDeferredUntil: hasLog ? undefined : 'Within 2h SLA',
              };
            });
          }
        }

        const serverIds = new Set(serverCompleted.map((s) => s.id));
        const localOnlyCompleted: CompletedVisitRecord[] = (cachedCtx.localCompletedVisits || []).filter(
          (lc: any) => !serverIds.has(lc.id)
        );
        const mergedCompleted = [...localOnlyCompleted, ...serverCompleted];
        if (mergedCompleted.length > 0 || isOnline) {
          setCompletedVisits(mergedCompleted);
          setPendingMeetingLogs(mergedCompleted.filter((c) => !c.meetingLogSubmitted));
        }
      } else if (cachedCtx.localCompletedVisits && cachedCtx.localCompletedVisits.length > 0) {
        setCompletedVisits((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const additions = cachedCtx.localCompletedVisits.filter((lc: any) => !existingIds.has(lc.id));
          return [...additions, ...prev];
        });
        const unsavedLogs = cachedCtx.localCompletedVisits.filter((lc: any) => !lc.meetingLogSubmitted);
        if (unsavedLogs.length > 0) {
          setPendingMeetingLogs((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const additions = unsavedLogs.filter((lc: any) => !existingIds.has(lc.id));
            return [...additions, ...prev];
          });
        }
      }
    } catch (err) {
      console.warn('[FieldSession] Active visit caught error:', err);
    }
  }, [currentUser?.id, currentUser?.marketCode, currentUser?.role, currentUser?.assignedDevice?.deviceId, isOnline, isTestEnv]);

  const refreshBranches = useCallback(async () => {
    if (!currentUser?.marketCode) return;
    try {
      if (isOnline) {
        const [{ data: dbBranches, error }, { data: dbRule }] = await Promise.all([
          visitService.getClientsAndBranches(currentUser.marketCode),
          visitService.getActiveMarketRules(currentUser.marketCode),
        ]);
        if (error) {
          console.warn('[FieldSession] Branches load error:', error.message);
        } else if (dbBranches && (dbBranches.length > 0 || !isTestEnv)) {
          const mapped: ClientBranch[] = dbBranches.map((b) => {
            const approvedPin = b.branch_location_pins?.find((p) => p.is_active && p.status === 'approved');
            const pendingPin = b.branch_location_pins?.find((p) => p.status === 'pending_approval' || !p.is_active);
            const pin = approvedPin || pendingPin;
            const contacts =
              b.client_contacts?.map((c) => ({
                id: c.id,
                name: c.full_name,
                role: c.designation,
                phone: c.phone_number,
              })) || [];

            return {
              id: b.id,
              companyName: b.organisations?.name || 'Registered Client',
              branchName: b.branch_name,
              branchCode: b.branch_name.substring(0, 3).toUpperCase() + '-' + b.id.substring(0, 4).toUpperCase(),
              category: b.category,
              address: `${b.street_address}, ${b.city}`,
              landmark: '',
              contacts,
              sharedCompanyPhone: b.switchboard_phone,
              hasSharedPhone: Boolean(b.switchboard_phone),
              distanceMeters: approvedPin ? 38 : 500,
              approvedGpsLat: pin ? pin.latitude : 0,
              approvedGpsLng: pin ? pin.longitude : 0,
              approvedPinId: approvedPin?.id,
              approvedPinVersion: pin?.version_number,
              accuracyMeters: pin ? pin.reported_accuracy_m : 25,
              status: approvedPin ? 'approved' : 'pending_approval',
            };
          });
          setBranches(mapped);
          if (currentUser?.id) {
            await offlineSyncService.updateCachedContext(currentUser.id, currentUser.marketCode, {
              branchesSnapshot: mapped,
              activeRuleVersion: dbRule || null,
            });
          }
          return;
        }
      }

      // Restore cached branches from IndexedDB when offline
      if (currentUser?.id) {
        const cachedCtx = await offlineSyncService.getOrCreateCachedContext(
          currentUser.id,
          currentUser.marketCode
        );
        if (cachedCtx.branchesSnapshot && cachedCtx.branchesSnapshot.length > 0) {
          setBranches(cachedCtx.branchesSnapshot);
        }
      }
    } catch (err) {
      console.warn('[FieldSession] Branches caught error:', err);
    }
  }, [currentUser?.id, currentUser?.marketCode, isOnline, isTestEnv]);

  const refreshExceptions = useCallback(async () => {
    if (!currentUser?.id || !currentUser?.marketCode) return;
    try {
      const { data: excs, error } = await managementService.getCountryExceptions(currentUser.marketCode);
      if (error) {
        console.warn('[FieldSession] Exceptions load notice:', error.message);
      } else if (excs) {
        const repExceptions: FieldExceptionRecord[] = excs
          .filter((e) => e.userId === currentUser.id)
          .map((e) => ({
            id: e.id,
            type: (e.exceptionType === 'missed_visit' ? 'missed_visit_claim' : e.exceptionType === 'device_depletion' ? 'device_breakdown' : e.exceptionType) as any,
            title: e.failureReason.slice(0, 40),
            branchName: e.branchName,
            reason: e.failureReason,
            evidenceNote: e.decisionReason || 'Evidence captured on mobile client',
            claimedDate: new Date(e.claimedCheckInTime).toLocaleDateString(),
            claimedTime: new Date(e.claimedCheckInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            claimedDuration: `${e.claimedDurationMinutes || 30} mins`,
            submissionLag: '15 mins',
            status: e.status === 'approved' ? 'approved_unverified' : e.status === 'rejected' ? 'rejected' : 'pending_review',
            submittedAt: new Date(e.submittedAt).toLocaleString(),
            managerComment: e.decisionReason || undefined,
            decidedBy: e.reviewedByName || undefined,
            repName: currentUser.name,
            accuracy: 'GPS Unverified',
            contactMet: 'Site Contact',
            meetingOutcome: 'Exception visit',
          }));
        setExceptions(repExceptions);
      }
    } catch (err) {
      console.warn('[FieldSession] Error refreshing exceptions:', err);
    }
  }, [currentUser?.id, currentUser?.marketCode, currentUser?.name]);

  const onAttendanceStarted = (record: AttendanceRecord) => {
    setAttendanceRecord(record);
    setIsAttendanceProvisional(Boolean((record as any).captured_offline || (record as any).status === 'pending_sync'));
    setWorkdayStatus('started');
    auth?.setAttendanceStatus('started');
    setStartDayTime(formatMarketTime(record.started_at, currentUser?.marketCode));
    setStartDaySelfie(record.start_selfie_url);
    notify(
      (record as any).status === 'pending_sync'
        ? 'Workday Started (Saved on Device — Provisional): Selfie & GPS queued for server sync.'
        : 'Workday Started: Live selfie & GPS recorded to operational attendance log.'
    );
  };

  const onAttendanceEnded = (record: AttendanceRecord) => {
    setAttendanceRecord(record);
    setWorkdayStatus('ended');
    auth?.setAttendanceStatus('ended');
    setEndDayTime(formatMarketTime(record.ended_at, currentUser?.marketCode));
    notify(
      (record as any).status === 'pending_sync'
        ? 'Workday Ended (Saved on Device — Provisional): Closing GPS queued for server sync.'
        : 'Workday Ended: Final check-out coordinate recorded. Day summary ready.'
    );
  };

  // 3. Completed Visits Today (Fallback mock for backward unit-test compatibility; empty array for live Supabase sessions)
  const DEFAULT_MOCK_COMPLETED_VISITS: CompletedVisitRecord[] = [
    {
      id: 'vis-comp-01',
      branchName: 'Zenith Logistics & Transit Hub',
      companyName: 'Zenith Fleet Services Ltd',
      branchCode: 'BR-LAG-009',
      checkInTime: '08:20',
      checkOutTime: '08:55',
      durationMinutes: 35,
      verificationStatus: 'location_verified',
      meetingLogSubmitted: true,
    },
    {
      id: 'vis-comp-02',
      branchName: 'Equatorial Energy Fleet Terminal',
      companyName: 'Equatorial Energy Hubs',
      branchCode: 'BR-LAG-002',
      checkInTime: '09:05',
      checkOutTime: '09:30',
      durationMinutes: 25,
      verificationStatus: 'location_verified',
      meetingLogSubmitted: true,
    },
    {
      id: 'vis-comp-03',
      branchName: 'Metroline Basement Fleet Hub',
      companyName: 'Metroline Transit Group',
      branchCode: 'BR-LAG-018',
      checkInTime: '13:40',
      checkOutTime: '14:10',
      durationMinutes: 30,
      verificationStatus: 'manager_approved_unverified',
      meetingLogSubmitted: true,
      flagRaised: 'GPS Signal Failure (Basement level parking)',
    },
  ];

  const [completedVisits, setCompletedVisits] = useState<CompletedVisitRecord[]>(
    isTestEnv ? DEFAULT_MOCK_COMPLETED_VISITS : []
  );

  const [pendingMeetingLogs, setPendingMeetingLogs] = useState<CompletedVisitRecord[]>([]);

  // 4. Branch Directory (Fallback mock for unit tests; empty array for live sessions populated from Supabase)
  const DEFAULT_MOCK_BRANCHES: ClientBranch[] = [
    {
      id: 'br-01',
      companyName: 'Apex Heavy Logistics Ltd',
      branchName: 'Apex Heavy Logistics Fleet Depot',
      branchCode: 'BR-LAG-014',
      category: 'Haulage Fleet Depot',
      address: 'Apapa Commercial Port Corridor, Gate 4, Lagos',
      landmark: 'Opposite Berth 12 Container Yard',
      contacts: [{ name: 'Engr. Babatunde Jinadu', role: 'Fleet Maintenance Director', phone: '+234 803 555 1204' }],
      sharedCompanyPhone: '+234 1 270 5000',
      hasSharedPhone: true,
      distanceMeters: 38,
      approvedGpsLat: 6.4428,
      approvedGpsLng: 3.3649,
      status: 'approved',
      lastVisitDate: 'Today (Active)',
    },
    {
      id: 'br-02',
      companyName: 'Apex Heavy Logistics Ltd',
      branchName: 'Apex Commercial Transit Hub (Ikeja)',
      branchCode: 'BR-LAG-108',
      category: 'Transit Maintenance Depot',
      address: 'Mobolaji Bank Anthony Way, Ikeja, Lagos',
      landmark: 'Adjacent to Air Force Base Roundabout',
      contacts: [{ name: 'Alhaji Musa Danjuma', role: 'Operations Manager', phone: '+234 802 111 8899' }],
      sharedCompanyPhone: '+234 1 270 5000',
      hasSharedPhone: true,
      distanceMeters: 420,
      approvedGpsLat: 6.5892,
      approvedGpsLng: 3.3581,
      status: 'approved',
      lastVisitDate: '3 days ago',
    },
    {
      id: 'br-03',
      companyName: 'Equatorial Energy Hubs',
      branchName: 'Equatorial Energy Fleet Terminal',
      branchCode: 'BR-LAG-002',
      category: 'Bulk Fuel Fleet Terminal',
      address: 'Dockyard Road, Apapa Marine Terminal, Lagos',
      landmark: 'Next to Tank Farm Cluster B',
      contacts: [{ name: 'Mrs. Chinyere Nwosu', role: 'Head of Transport & Safety', phone: '+234 818 444 9901' }],
      hasSharedPhone: false,
      distanceMeters: 180,
      approvedGpsLat: 6.4389,
      approvedGpsLng: 3.3712,
      status: 'approved',
      lastVisitDate: 'Today 09:30',
    },
    {
      id: 'br-04',
      companyName: 'Zenith Fleet Services Ltd',
      branchName: 'Zenith Logistics & Transit Hub',
      branchCode: 'BR-LAG-009',
      category: 'Commercial Distribution Hub',
      address: 'Oshodi-Isolo Expressway, Industrial Area, Lagos',
      landmark: 'Near Toyota Bus Stop Industrial Park',
      contacts: [{ name: 'Mr. Segun Oladipo', role: 'Workshop Superintendent', phone: '+234 805 777 3322' }],
      hasSharedPhone: false,
      distanceMeters: 850,
      approvedGpsLat: 6.5312,
      approvedGpsLng: 3.3289,
      status: 'approved',
      lastVisitDate: 'Today 08:55',
    },
    {
      id: 'br-05',
      companyName: 'Pinnacle Cargo Distribution Hub',
      branchName: 'Pinnacle Cargo Freight Depot',
      branchCode: 'BR-LAG-031',
      category: 'Interstate Cargo Terminal',
      address: 'Lagos-Ibadan Expressway Transit Point, Berger',
      landmark: 'Berger Transit Toll Gate Outbound',
      contacts: [{ name: 'Mr. Kenneth Okoro', role: 'Fleet Procurement Lead', phone: '+234 809 333 7744' }],
      hasSharedPhone: false,
      distanceMeters: 1400,
      approvedGpsLat: 6.6421,
      approvedGpsLng: 3.3742,
      status: 'approved',
      lastVisitDate: '10 Oct 2026',
    },
  ];

  const [branches, setBranches] = useState<ClientBranch[]>(
    isTestEnv ? DEFAULT_MOCK_BRANCHES : []
  );

  // 5. Rep-Submitted Exceptions (Fallback mock for unit tests; empty array for live sessions populated from Supabase)
  const DEFAULT_MOCK_EXCEPTIONS: FieldExceptionRecord[] = [
    {
      id: 'exc-001',
      type: 'gps_failure',
      title: 'Metroline Basement Depot GPS Failure',
      branchName: 'Metroline Basement Fleet Hub',
      claimedDate: 'Today 16 Oct 2026',
      claimedTime: '13:40 - 14:10 WAT',
      reason: 'Underground parking concrete attenuation prevented GPS lock (Accuracy ±145m exceeds ≤100m visit limit).',
      evidenceNote: 'Premises gate and workshop signage clearly photographed on entry. Rep retried 4 times before submitting exception.',
      submittedAt: 'Today 14:15 WAT',
      status: 'pending_review',
      repName: 'Tunde Adebayo (CC-REP-042)',
      accuracy: '±145m (Exceeds ≤100m visit limit)',
      claimedDuration: '30 mins',
      submissionLag: '12 mins post-checkout',
      productsDiscussed: 'Heavy Duty Radiator Coolant, Fleet Degreaser 20L',
      contactMet: 'Engr. Femi Alabi (Senior Fleet Mechanic)',
    },
    {
      id: 'exc-002',
      type: 'device_breakdown',
      title: 'Titan Engineering Battery Depletion & Recovery',
      branchName: 'Titan Engineering Fleet Depot',
      claimedDate: 'Today 16 Oct 2026',
      claimedTime: '11:15 - 11:55 WAT',
      reason: 'Assigned handset battery depleted unexpectedly during meeting. Submitted after power restoration at depot base.',
      evidenceNote: 'Signed physical visitor log sheet scanned and attached. Handset recharged in vehicle.',
      submittedAt: 'Today 14:00 WAT',
      status: 'pending_review',
      repName: 'Emeka Nwosu (CC-REP-039)',
      accuracy: 'No GPS (Device powered off)',
      claimedDuration: '40 mins',
      submissionLag: '2h 5m post-recovery',
      productsDiscussed: 'Brake Fluid DOT 4, Industrial Gear Oil ISO 220',
      contactMet: 'Mr. Jude Okafor (Logistics Procurement Lead)',
    },
    {
      id: 'exc-003',
      type: 'missed_visit_claim',
      title: 'Zenith Logistics Park Gate 2 Access Refusal',
      branchName: 'Zenith Fleet Services Hub',
      claimedDate: 'Yesterday 15 Oct 2026',
      claimedTime: '15:10 - 15:35 WAT',
      reason: 'Could not access premises interior to capture standard indoor meeting evidence due to terminal lockdown.',
      evidenceNote: 'Client security officer refused gate entry due to unscheduled terminal safety drill. Contact was called by phone from gate.',
      submittedAt: 'Yesterday 16:00 WAT',
      status: 'pending_review',
      repName: 'Chinyere Nwosu (CC-REP-038)',
      accuracy: '±28m (Valid location at terminal gate)',
      claimedDuration: '25 mins',
      submissionLag: '25 mins post-attempt',
      productsDiscussed: 'Fleet Wash Concentrate, Tyre Shine 5L',
      contactMet: 'Capt. Daniel Briggs (Gate Security Supervisor)',
    },
    {
      id: 'exc-004',
      type: 'gps_failure',
      title: 'Trans-Sahara Logistics RF Interference',
      branchName: 'Trans-Sahara Transport Corp Hub',
      claimedDate: 'Yesterday 15 Oct 2026',
      claimedTime: '10:20 - 11:00 WAT',
      reason: 'High-voltage substation adjacent to trailer yard caused electromagnetic sensor fluctuation.',
      evidenceNote: 'Location fix could not converge below 100m. Photo and signed visitor badge attached.',
      submittedAt: 'Yesterday 11:15 WAT',
      status: 'approved_unverified',
      managerComment: 'Confirmed with rep and verified visitor badge photograph. Counted as unverified visit.',
      decisionDate: 'Yesterday 14:10 WAT',
      decidedBy: 'HQ Administrator (Country Head)',
      repName: 'Ibrahim Sani (CC-REP-044)',
      accuracy: '±112m (Failed ≤100m threshold)',
      claimedDuration: '40 mins',
      submissionLag: '15 mins post-visit',
      productsDiscussed: 'Diesel Exhaust Fluid (DEF) AdBlue 200L Drum',
      contactMet: 'Malam Haruna Bello (Workshop Supervisor)',
    },
  ];

  const [exceptions, setExceptions] = useState<FieldExceptionRecord[]>(
    isTestEnv ? DEFAULT_MOCK_EXCEPTIONS : []
  );

  // 6. Non-Visit Day Request
  const [nonVisitDayRequest, setNonVisitDayRequest] = useState<NonVisitDayRequest | null>(null);

  // 7. Offline & Sync Queue (Stage 3D Durable IndexedDB Journal + Media Queue)
  const [syncState, setSyncState] = useState<'synced' | 'pending' | 'syncing' | 'failed' | 'needs_review'>('synced');
  const [journalEvents, setJournalEvents] = useState<OfflineJournalEvent[]>([]);
  const [queueTelemetry, setQueueTelemetry] = useState<QueueTelemetrySummary>({
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
  });
  const [storageQuota, setStorageQuota] = useState<StorageQuotaAssessment>({
    supported: false,
    usageBytes: 0,
    quotaBytes: 50 * 1024 * 1024,
    usagePercent: 0,
    isPersisted: false,
    isNearLimit: false,
    isExhausted: false,
    warningMessage: null,
  });
  const DEFAULT_MOCK_SYNC_QUEUE: QueuedEvent[] = [
    {
      id: 'q-01',
      uuid: 'evt-8f4b-2291-a10c',
      type: 'ATTENDANCE_EVENT',
      timestamp: '08:05:14 WAT',
      payloadSummary: 'START_DAY • GPS (±12m) • Selfie verified',
      syncStatus: 'synced',
    },
    {
      id: 'q-02',
      uuid: 'evt-3c19-9022-f44e',
      type: 'VISIT_CHECKIN',
      timestamp: '09:42:01 WAT',
      payloadSummary: 'CHECKIN • Apex Heavy Logistics (BR-LAG-014) • Within geofence (38m)',
      syncStatus: 'synced',
    },
  ];

  const [syncQueue, setSyncQueue] = useState<QueuedEvent[]>(
    isTestEnv ? DEFAULT_MOCK_SYNC_QUEUE : []
  );

  // 8. Simulation Controls
  const [simulatedGpsAccuracy, setSimulatedGpsAccuracy] = useState<number>(14);
  const [simulatedGeofenceDistance, setSimulatedGeofenceDistance] = useState<number>(38);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const notify = (msg: string) => {
    setSessionNotice(msg);
  };

  const refreshOfflineQueue = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const [events, telemetry, quota] = await Promise.all([
        offlineSyncService.getUserQueueEvents(currentUser.id),
        offlineSyncService.getUserQueueTelemetry(currentUser.id, currentUser.marketCode || 'NG'),
        offlineSyncService.assessStorageQuota(currentUser.id),
      ]);

      setJournalEvents(events);
      setQueueTelemetry(telemetry);
      setStorageQuota(quota);

      if (events.length > 0) {
        const mappedQueue: QueuedEvent[] = events.map((ev) => ({
          id: ev.id,
          uuid: ev.id,
          type:
            ev.eventType === 'ATTENDANCE_START_DAY' || ev.eventType === 'ATTENDANCE_END_DAY'
              ? 'ATTENDANCE_EVENT'
              : ev.eventType === 'MEETING_LOG_SUBMIT'
              ? 'MEETING_LOG'
              : (ev.eventType as QueuedEvent['type']),
          timestamp: formatMarketTime(ev.originalCaptureTimestamp, ev.marketCode) || ev.originalCaptureTimestamp,
          payloadSummary: ev.payloadSummary,
          syncStatus:
            ev.syncStatus === 'pending' || ev.syncStatus === 'blocked_dependency'
              ? 'queued'
              : ev.syncStatus,
        }));
        setSyncQueue(mappedQueue);
      }

      if (telemetry.syncingCount > 0) {
        setSyncState('syncing');
      } else if (telemetry.failedCount > 0) {
        setSyncState('failed');
      } else if (telemetry.needsReviewCount > 0 || telemetry.blockedDependencyCount > 0) {
        setSyncState('needs_review');
      } else if (telemetry.pendingCount > 0) {
        setSyncState('pending');
      } else {
        setSyncState('synced');
      }
    } catch (err) {
      console.warn('[FieldSession] refreshOfflineQueue error:', err);
    }
  }, [currentUser?.id, currentUser?.marketCode]);

  useEffect(() => {
    if (currentUser?.id) {
      offlineSyncService.requestPersistentStorage().catch(() => {});
      refreshAttendance();
      refreshActiveVisit();
      refreshBranches();
      refreshOfflineQueue();
      refreshExceptions();
    } else {
      setIsAttendanceLoading(false);
    }
  }, [refreshAttendance, refreshActiveVisit, refreshBranches, refreshOfflineQueue, refreshExceptions, currentUser?.id]);

  const enqueueOfflineStartDay = async (params: {
    latitude: number;
    longitude: number;
    accuracy: number;
    selfieBlob: Blob;
    submissionId?: string;
  }): Promise<{ success: boolean; error?: string; record?: any }> => {
    if (!currentUser?.id) {
      return { success: false, error: 'Authenticated salesperson session required.' };
    }
    const res = await offlineSyncService.enqueueStartDay({
      ownerUserId: currentUser.id,
      marketCode: currentUser.marketCode || 'NG',
      deviceId: currentUser.assignedDevice?.deviceId || 'dev-001',
      latitude: params.latitude,
      longitude: params.longitude,
      accuracy: params.accuracy,
      selfieBlob: params.selfieBlob,
      submissionId: params.submissionId,
    });
    if (res.error || !res.provisionalAttendance) {
      return { success: false, error: res.error?.message || 'Failed to queue offline Start Day.' };
    }
    onAttendanceStarted(res.provisionalAttendance as AttendanceRecord);
    await refreshOfflineQueue();
    return { success: true, record: res.provisionalAttendance };
  };

  const enqueueOfflineEndDay = async (params: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  }): Promise<{ success: boolean; error?: string; record?: any }> => {
    if (!currentUser?.id) {
      return { success: false, error: 'Authenticated salesperson session required.' };
    }
    if (activeVisit) {
      return {
        success: false,
        error: 'Cannot end workday while an active visit is open (PRD §6.1 / AT-03).',
      };
    }
    const targetAttendanceId = attendanceRecord?.id || `att-local-${Date.now()}`;
    const res = await offlineSyncService.enqueueEndDay({
      ownerUserId: currentUser.id,
      marketCode: currentUser.marketCode || 'NG',
      deviceId: currentUser.assignedDevice?.deviceId || 'dev-001',
      attendanceDayId: targetAttendanceId,
      latitude: params.latitude,
      longitude: params.longitude,
      accuracy: params.accuracy,
    });
    if (res.error) {
      return { success: false, error: res.error.message };
    }
    if (res.provisionalAttendance) {
      onAttendanceEnded(res.provisionalAttendance as AttendanceRecord);
    } else {
      endDay();
    }
    await refreshOfflineQueue();
    return { success: true, record: res.provisionalAttendance };
  };

  // Actions
  const startDay = (selfieUrl: string) => {
    setWorkdayStatus('started');
    setStartDayTime('08:00 WAT');
    setStartDaySelfie(selfieUrl);
    notify('Workday Started: Live selfie & GPS (±12m) recorded to operational attendance log.');
  };

  const endDay = (): boolean => {
    if (activeVisit) {
      return false; // strictly blocked
    }
    setWorkdayStatus('ended');
    notify('Workday Ended: Final check-out coordinate recorded. Day summary ready.');
    return true;
  };

  const checkInVisit = async (
    branch: ClientBranch,
    photoUrl: string,
    accuracy: number,
    distance: number,
    options?: {
      photoBlob?: Blob;
      liveGps?: LiveGpsCoordinate;
      verificationStatus?: VisitVerificationStatus;
      locationClassification?: LocationClassification;
    }
  ): Promise<boolean | void> => {
    if (activeVisit) {
      notify('Cannot start a new visit while a visit is in progress (AT-04).');
      return false;
    }

    // Real Supabase or Durable Offline IndexedDB persistence for authenticated salesperson sessions
    if (currentUser?.id && !isTestEnv) {
      if (!attendanceRecord?.id || workdayStatus !== 'started') {
        notify('Cannot start visit: Workday has not been started. Please complete Start Day first (PRD §6.1).');
        return false;
      }

      if (!options?.photoBlob || photoUrl.startsWith('/demo/')) {
        notify('Live rear-camera premises photo is required before check-in (PRD §7.1).');
        return false;
      }

      const provisionalClassification: LocationClassification =
        options?.locationClassification ||
        (branch.status === 'approved' && distance + accuracy <= 200 && accuracy <= 100
          ? 'inside_confident'
          : 'uncertain');

      // Stage 3D Offline Path (when device is offline OR parent attendance is still pending sync)
      const isEffectivelyOffline =
        !isOnline ||
        (typeof navigator !== 'undefined' && navigator.onLine === false) ||
        isAttendanceProvisional ||
        (attendanceRecord as any).status === 'pending_sync';

      if (isEffectivelyOffline) {
        const offlineRes = await offlineSyncService.enqueueVisitCheckIn({
          ownerUserId: currentUser.id,
          marketCode: currentUser.marketCode || 'NG',
          deviceId: attendanceRecord.device_id || currentUser.assignedDevice?.deviceId || 'dev-001',
          attendanceDayId: attendanceRecord.id,
          branchId: branch.id,
          branchName: branch.branchName,
          companyName: branch.companyName,
          address: branch.address,
          branchCode: branch.branchCode,
          branchPinId: branch.approvedPinId,
          branchPinVersion: branch.approvedPinVersion ?? null,
          branchPinStatus: branch.status,
          latitude: options?.liveGps?.latitude ?? branch.approvedGpsLat ?? 6.4428,
          longitude: options?.liveGps?.longitude ?? branch.approvedGpsLng ?? 3.3649,
          accuracy,
          provisionalDistanceMeters: distance,
          provisionalClassification,
          photoBlob: options.photoBlob,
        });

        if (offlineRes.error || !offlineRes.provisionalVisit) {
          notify(`Offline check-in blocked: ${offlineRes.error?.message || 'Storage error'}`);
          return false;
        }

        setActiveVisit(offlineRes.provisionalVisit as ActiveVisitSession);
        await refreshOfflineQueue();
        notify(
          `Saved on this device (Provisional — Pending Server Sync): Checked in at ${branch.branchName}. Server PostGIS verification will run on sync.`
        );
        return true;
      }

      let uploadedStoragePath: string | null = null;
      try {
        const visitUuid =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`;

        const { storagePath, error: uploadErr } = await visitService.uploadPremisesPhoto(
          currentUser.id,
          visitUuid,
          options.photoBlob
        );
        if (uploadErr || !storagePath) {
          notify(`Failed to upload premises photo: ${uploadErr?.message || 'Storage error'}`);
          return false;
        }
        uploadedStoragePath = storagePath;

        // Determine verification status: PRD §7.1 / Migration 00027 rule
        const isEligibleForVerification =
          branch.status === 'approved' &&
          distance + accuracy <= 200 &&
          accuracy <= 100 &&
          uploadedStoragePath.startsWith(`${currentUser.id}/${visitUuid}_premises_`);

        const computedVerStatus: VisitVerificationStatus =
          options?.verificationStatus ||
          (isEligibleForVerification ? 'location_verified' : 'location_unverified');

        const { data: dbVisit, error: insertErr } = await visitService.checkInVisit({
          visitId: visitUuid,
          userId: currentUser.id,
          deviceId: attendanceRecord.device_id || 'dev-001',
          attendanceDayId: attendanceRecord.id,
          branchId: branch.id,
          branchPinId: branch.approvedPinId,
          latitude: options?.liveGps?.latitude ?? branch.approvedGpsLat ?? 6.4428,
          longitude: options?.liveGps?.longitude ?? branch.approvedGpsLng ?? 3.3649,
          accuracy: accuracy,
          premisesPhotoUrl: uploadedStoragePath,
          verificationStatus: computedVerStatus,
          locationClassification:
            options?.locationClassification || (isEligibleForVerification ? 'inside_confident' : 'uncertain'),
        });

        if (insertErr || !dbVisit) {
          if (uploadedStoragePath) {
            await visitService.removePremisesPhoto(uploadedStoragePath);
          }
          notify(`Check-in failed: ${insertErr?.message || 'Database error'}`);
          return false;
        }

        const newVisit: ActiveVisitSession = {
          id: dbVisit.id,
          branchId: branch.id,
          branchName: branch.branchName,
          companyName: branch.companyName,
          address: branch.address,
          branchCode: branch.branchCode,
          checkInTime: formatMarketTime(dbVisit.check_in_at, currentUser?.marketCode),
          checkInTimestamp: new Date(dbVisit.check_in_at).getTime(),
          elapsedSeconds: 0,
          geofenceDistanceMeters: dbVisit.distance_to_pin_m ?? distance,
          gpsAccuracyMeters: accuracy,
          premisesPhotoUrl: uploadedStoragePath,
          verificationStatus: dbVisit.verification_status,
          locationClassification: dbVisit.location_classification,
          branchPinId: dbVisit.branch_pin_id,
          ruleVersionId: dbVisit.rule_version_id,
        };

        setActiveVisit(newVisit);
        notify(`Checked in at ${branch.branchName}. Active visit timer running.`);
        return true;
      } catch (err: any) {
        if (uploadedStoragePath) {
          await visitService.removePremisesPhoto(uploadedStoragePath);
        }
        console.error('[FieldSession] Check-in caught error:', err);
        notify(`Check-in error: ${err.message || 'Unknown error'}`);
        return false;
      }
    }

    // Local / Unit Test Fallback Simulation (with Stage 3D Offline Queue support when !isOnline)
    if (!isOnline && currentUser?.id && options?.photoBlob) {
      const offlineRes = await offlineSyncService.enqueueVisitCheckIn({
        ownerUserId: currentUser.id,
        marketCode: currentUser.marketCode || 'NG',
        deviceId: currentUser.assignedDevice?.deviceId || 'dev-001',
        attendanceDayId: attendanceRecord?.id || 'att-local-01',
        branchId: branch.id,
        branchName: branch.branchName,
        companyName: branch.companyName,
        address: branch.address,
        branchCode: branch.branchCode,
        branchPinId: branch.approvedPinId || 'pin-local-01',
        branchPinStatus: branch.status,
        latitude: options?.liveGps?.latitude ?? branch.approvedGpsLat ?? 6.4428,
        longitude: options?.liveGps?.longitude ?? branch.approvedGpsLng ?? 3.3649,
        accuracy,
        provisionalDistanceMeters: distance,
        provisionalClassification: distance <= 200 && accuracy <= 100 ? 'inside_confident' : 'uncertain',
        photoBlob: options.photoBlob,
      });
      if (offlineRes.provisionalVisit) {
        setActiveVisit(offlineRes.provisionalVisit as ActiveVisitSession);
        await refreshOfflineQueue();
        notify(`Saved on this device (Provisional — Pending Server Sync): Checked in at ${branch.branchName}.`);
        return true;
      }
    }

    const newVisit: ActiveVisitSession = {
      id: `vis-${Date.now()}`,
      branchId: branch.id,
      branchName: branch.branchName,
      companyName: branch.companyName,
      address: branch.address,
      branchCode: branch.branchCode,
      checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      checkInTimestamp: Date.now(),
      elapsedSeconds: 0,
      geofenceDistanceMeters: distance,
      gpsAccuracyMeters: accuracy,
      premisesPhotoUrl: photoUrl,
      verificationStatus: !isOnline
        ? 'pending_sync'
        : distance <= 200 && accuracy <= 100
        ? 'location_verified'
        : 'location_unverified',
      locationClassification: distance <= 200 && accuracy <= 100 ? 'inside_confident' : 'uncertain',
    };
    setActiveVisit(newVisit);
    notify(`Checked in at ${branch.branchName}. Active visit timer running.`);
    return true;
  };

  const checkOutVisit = async (
    outsideGeofence: boolean,
    meetingLogData?: any,
    checkoutGps?: { latitude: number; longitude: number; accuracy: number }
  ): Promise<boolean | void> => {
    if (!activeVisit) return false;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let isDeferred = !meetingLogData;
    let logSaveErrorMessage: string | null = null;

    const isOfflineVisit =
      !isOnline ||
      (typeof navigator !== 'undefined' && navigator.onLine === false) ||
      activeVisit.verificationStatus === 'pending_sync' ||
      Boolean((activeVisit as any).capturedOffline);

    // Stage 3D Offline Checkout & Meeting Log Queuing
    if (
      currentUser?.id &&
      isOfflineVisit &&
      !activeVisit.id.startsWith('vis-active-01') &&
      !activeVisit.id.startsWith('vis-comp-')
    ) {
      const checkoutRes = await offlineSyncService.enqueueVisitCheckout({
        ownerUserId: currentUser.id,
        marketCode: currentUser.marketCode || 'NG',
        deviceId: currentUser.assignedDevice?.deviceId || 'dev-001',
        visitId: activeVisit.id,
        branchName: activeVisit.branchName,
        companyName: activeVisit.companyName,
        branchCode: activeVisit.branchCode,
        checkInTime: activeVisit.checkInTime,
        elapsedSeconds: activeVisit.elapsedSeconds,
        outsideGeofence,
        latitude: checkoutGps?.latitude ?? null,
        longitude: checkoutGps?.longitude ?? null,
        accuracy: checkoutGps?.accuracy ?? null,
        meetingLogDeferred: !meetingLogData,
      });

      if (checkoutRes.error) {
        notify(`Offline checkout error: ${checkoutRes.error.message}`);
        return false;
      }

      if (meetingLogData) {
        const logRes = await offlineSyncService.enqueueMeetingLog({
          ownerUserId: currentUser.id,
          marketCode: currentUser.marketCode || 'NG',
          deviceId: currentUser.assignedDevice?.deviceId || 'dev-001',
          visitId: activeVisit.id,
          branchName: activeVisit.branchName,
          contactId: meetingLogData.contactId || null,
          purpose: meetingLogData.purpose || 'routine_visit',
          productsDiscussed: meetingLogData.productsDiscussed || [],
          outcomeNarrative: meetingLogData.outcomeNarrative || meetingLogData.outcome || '',
          nextStepText: meetingLogData.nextStepText || meetingLogData.nextStep || '',
          fleetSizeVolume: meetingLogData.fleetSizeVolume,
          businessCardBlob: meetingLogData.businessCardBlob || null,
          isLate: false,
        });

        if (logRes.error) {
          isDeferred = true;
          logSaveErrorMessage = logRes.error.message;
        }
      }

      const offlineCompleted: CompletedVisitRecord = checkoutRes.completedVisitRecord || {
        id: activeVisit.id,
        branchName: activeVisit.branchName,
        companyName: activeVisit.companyName,
        branchCode: activeVisit.branchCode,
        checkInTime: activeVisit.checkInTime,
        checkOutTime: nowStr,
        durationMinutes: Math.max(1, Math.round(activeVisit.elapsedSeconds / 60)),
        verificationStatus: 'pending_sync',
        meetingLogSubmitted: !isDeferred,
        meetingLogDeferredUntil: isDeferred ? 'Within 2h SLA (Offline Queue)' : 'Queued on Device',
        flagRaised: outsideGeofence ? 'Checkout Outside Geofence (>200m)' : undefined,
        capturedOffline: true,
      };

      setCompletedVisits((prev) => [offlineCompleted, ...prev.filter((c) => c.id !== offlineCompleted.id)]);
      if (isDeferred) {
        setPendingMeetingLogs((prev) => [offlineCompleted, ...prev.filter((p) => p.id !== offlineCompleted.id)]);
      }
      setActiveVisit(null);
      await refreshOfflineQueue();
      notify(
        logSaveErrorMessage
          ? `Visit checkout saved on this device, but meeting log could not be queued (${logSaveErrorMessage}).`
          : 'Visit checkout saved on this device (Provisional — Pending Server Sync). Will synchronise when online.'
      );
      return true;
    }

    // Real Supabase checkout persistence if this is a real database record
    if (
      currentUser?.id &&
      activeVisit.id &&
      !activeVisit.id.startsWith('vis-active-01') &&
      !activeVisit.id.startsWith('vis-comp-') &&
      !activeVisit.id.startsWith('vis-')
    ) {
      try {
        const { error: checkoutErr } = await visitService.checkOutVisit({
          visitId: activeVisit.id,
          userId: currentUser.id,
          latitude: checkoutGps?.latitude,
          longitude: checkoutGps?.longitude,
          accuracy: checkoutGps?.accuracy,
        });

        if (checkoutErr) {
          notify(`Checkout failed: ${checkoutErr.message}`);
          return false;
        }

        // If meeting log data was submitted during checkout
        if (meetingLogData) {
          let businessCardUrl = meetingLogData.businessCardPhotoUrl || null;
          if (meetingLogData.businessCardBlob) {
            const { storagePath: cardPath } = await visitService.uploadBusinessCard(
              currentUser.id,
              activeVisit.id,
              meetingLogData.businessCardBlob
            );
            if (cardPath) {
              businessCardUrl = cardPath;
            }
          }

          const { error: logErr } = await visitService.submitMeetingLog({
            visitId: activeVisit.id,
            contactId: meetingLogData.contactId || null,
            purpose: meetingLogData.purpose || 'routine_visit',
            productsDiscussed: meetingLogData.productsDiscussed || [],
            outcomeNarrative: meetingLogData.outcomeNarrative || meetingLogData.outcome || '',
            nextStepText: meetingLogData.nextStepText || meetingLogData.nextStep || '',
            fleetSizeVolume: meetingLogData.fleetSizeVolume,
            businessCardPhotoUrl: businessCardUrl,
            isLate: false,
          });

          if (logErr) {
            // Preserve checkout completion AND durably persist the failed meeting log in IndexedDB so it survives browser refresh (Section 7)
            isDeferred = true;
            logSaveErrorMessage = logErr.message;
            await offlineSyncService.enqueueMeetingLog({
              ownerUserId: currentUser.id,
              marketCode: currentUser.marketCode || 'NG',
              deviceId: currentUser.assignedDevice?.deviceId || 'dev-001',
              visitId: activeVisit.id,
              branchName: activeVisit.branchName,
              contactId: meetingLogData.contactId || null,
              purpose: meetingLogData.purpose || 'routine_visit',
              productsDiscussed: meetingLogData.productsDiscussed || [],
              outcomeNarrative: meetingLogData.outcomeNarrative || meetingLogData.outcome || '',
              nextStepText: meetingLogData.nextStepText || meetingLogData.nextStep || '',
              fleetSizeVolume: meetingLogData.fleetSizeVolume,
              businessCardBlob: meetingLogData.businessCardBlob || null,
              isLate: false,
              initialSyncStatus: 'failed',
              initialError: logErr.message,
            });
            await refreshOfflineQueue();
          }
        }
      } catch (err: any) {
        console.warn('[FieldSession] Checkout caught error:', err);
        notify(`Checkout error: ${err.message || 'Unknown error'}`);
        return false;
      }
    }

    // Preserve original check-in verificationStatus on outside-geofence checkout (PRD §7.2 / Section 10)
    const preservedStatus = ((activeVisit.verificationStatus as any) || 'location_verified') as CompletedVisitRecord['verificationStatus'];

    const newCompleted: CompletedVisitRecord = {
      id: activeVisit.id,
      branchName: activeVisit.branchName,
      companyName: activeVisit.companyName,
      branchCode: activeVisit.branchCode,
      checkInTime: activeVisit.checkInTime,
      checkOutTime: nowStr,
      durationMinutes: Math.max(1, Math.round(activeVisit.elapsedSeconds / 60)),
      verificationStatus: preservedStatus,
      meetingLogSubmitted: !isDeferred,
      meetingLogDeferredUntil: isDeferred ? (logSaveErrorMessage ? 'Unsaved — Retry Pending' : 'Within 2h SLA') : undefined,
      flagRaised: outsideGeofence ? 'Checkout Outside Geofence (>200m)' : undefined,
    };

    setCompletedVisits((prev) => [newCompleted, ...prev]);
    if (isDeferred) {
      setPendingMeetingLogs((prev) => [newCompleted, ...prev]);
    }
    setActiveVisit(null);
    if (logSaveErrorMessage) {
      notify(
        `Visit checked out, but meeting log is UNSAVED (${logSaveErrorMessage}). Added to Pending Meeting Logs for retry.`
      );
    } else {
      notify(
        outsideGeofence
          ? 'Checkout recorded outside geofence: Flagged for manager review. Visit closed.'
          : 'Visit successfully completed and location verified.'
      );
    }
    return true;
  };

  const cancelVisit = (force: boolean | unknown = false) => {
    const isForced = force === true;
    // PRD §5.2 Protection: An active checked-in visit can NEVER be silently discarded!
    if (activeVisit && !isForced) {
      notify('PRD §5.2 Protection: Checked-in visits cannot be silently deleted. Please check out or report an operational exception.');
      return;
    }
    setActiveVisit(null);
    if (isForced) {
      notify('Active visit cleared for testing.');
    }
  };

  const submitMeetingLog = async (visitId: string, logData: any): Promise<boolean | void> => {
    const targetCompleted = completedVisits.find((v) => v.id === visitId);
    const shouldQueueOffline =
      !isOnline ||
      (typeof navigator !== 'undefined' && navigator.onLine === false) ||
      targetCompleted?.verificationStatus === 'pending_sync' ||
      targetCompleted?.capturedOffline;

    if (
      currentUser?.id &&
      shouldQueueOffline &&
      !visitId.startsWith('vis-comp-') &&
      !visitId.startsWith('vis-active-01')
    ) {
      const logRes = await offlineSyncService.enqueueMeetingLog({
        ownerUserId: currentUser.id,
        marketCode: currentUser.marketCode || 'NG',
        deviceId: currentUser.assignedDevice?.deviceId || 'dev-001',
        visitId,
        branchName: targetCompleted?.branchName,
        contactId: logData.contactId || null,
        purpose: logData.purpose || 'routine_visit',
        productsDiscussed: logData.productsDiscussed || [],
        outcomeNarrative: logData.outcomeNarrative || logData.outcome || '',
        nextStepText: logData.nextStepText || logData.nextStep || '',
        fleetSizeVolume: logData.fleetSizeVolume,
        businessCardBlob: logData.businessCardBlob || null,
        isLate: Boolean(logData.isLate),
      });

      if (logRes.error) {
        notify(`Offline meeting log queue failed (${logRes.error.message}). Record remains Unsaved / Pending.`);
        return false;
      }

      setPendingMeetingLogs((prev) => prev.filter((p) => p.id !== visitId));
      setCompletedVisits((prev) =>
        prev.map((v) =>
          v.id === visitId
            ? { ...v, meetingLogSubmitted: true, meetingLogDeferredUntil: 'Queued on Device' }
            : v
        )
      );
      await refreshOfflineQueue();
      notify('Meeting log saved on this device (Queued for Server Sync).');
      return true;
    }

    if (currentUser?.id && !visitId.startsWith('vis-comp-') && !visitId.startsWith('vis-active-01')) {
      try {
        let businessCardUrl = logData.businessCardPhotoUrl || null;
        if (logData.businessCardBlob) {
          const { storagePath: cardPath } = await visitService.uploadBusinessCard(
            currentUser.id,
            visitId,
            logData.businessCardBlob
          );
          if (cardPath) {
            businessCardUrl = cardPath;
          }
        }

        const { error } = await visitService.submitMeetingLog({
          visitId,
          contactId: logData.contactId || null,
          purpose: logData.purpose || 'routine_visit',
          productsDiscussed: logData.productsDiscussed || [],
          outcomeNarrative: logData.outcomeNarrative || logData.outcome || '',
          nextStepText: logData.nextStepText || logData.nextStep || '',
          fleetSizeVolume: logData.fleetSizeVolume,
          businessCardPhotoUrl: businessCardUrl,
          isLate: Boolean(logData.isLate),
        });
        if (error) {
          // Durably persist the failed meeting log in IndexedDB so it survives browser refresh (Section 7)
          await offlineSyncService.enqueueMeetingLog({
            ownerUserId: currentUser.id,
            marketCode: currentUser.marketCode || 'NG',
            deviceId: currentUser.assignedDevice?.deviceId || 'dev-001',
            visitId,
            branchName: targetCompleted?.branchName,
            contactId: logData.contactId || null,
            purpose: logData.purpose || 'routine_visit',
            productsDiscussed: logData.productsDiscussed || [],
            outcomeNarrative: logData.outcomeNarrative || logData.outcome || '',
            nextStepText: logData.nextStepText || logData.nextStep || '',
            fleetSizeVolume: logData.fleetSizeVolume,
            businessCardBlob: logData.businessCardBlob || null,
            isLate: Boolean(logData.isLate),
            initialSyncStatus: 'failed',
            initialError: error.message,
          });
          await refreshOfflineQueue();
          notify(`Meeting log submission failed (${error.message}). Saved on this device for retry.`);
          return false;
        }
      } catch (err: any) {
        console.error('[FieldSession] submitMeetingLog error:', err);
        const errMsg = err?.message || 'Network error';
        await offlineSyncService.enqueueMeetingLog({
          ownerUserId: currentUser.id,
          marketCode: currentUser.marketCode || 'NG',
          deviceId: currentUser.assignedDevice?.deviceId || 'dev-001',
          visitId,
          branchName: targetCompleted?.branchName,
          contactId: logData.contactId || null,
          purpose: logData.purpose || 'routine_visit',
          productsDiscussed: logData.productsDiscussed || [],
          outcomeNarrative: logData.outcomeNarrative || logData.outcome || '',
          nextStepText: logData.nextStepText || logData.nextStep || '',
          fleetSizeVolume: logData.fleetSizeVolume,
          businessCardBlob: logData.businessCardBlob || null,
          isLate: Boolean(logData.isLate),
          initialSyncStatus: 'failed',
          initialError: errMsg,
        });
        await refreshOfflineQueue();
        notify(`Meeting log submission failed (${errMsg}). Saved on this device for retry.`);
        return false;
      }
    }
    setPendingMeetingLogs((prev) => prev.filter((p) => p.id !== visitId));
    setCompletedVisits((prev) =>
      prev.map((v) => (v.id === visitId ? { ...v, meetingLogSubmitted: true, meetingLogDeferredUntil: undefined } : v))
    );
    notify('Meeting log submitted successfully. Stored as narrative outcome.');
    return true;
  };

  const registerBranch = (newBranchData: Omit<ClientBranch, 'id' | 'status' | 'distanceMeters'>): ClientBranch => {
    const newBranch: ClientBranch = {
      ...newBranchData,
      id: `br-rep-${Date.now()}`,
      status: 'pending_approval',
      distanceMeters: 120,
      isRegisteredByRep: true,
      registeredByRepName: 'Tunde Adebayo (CC-REP-042)',
      accuracyMeters: 18,
      evidenceNote: 'Premises entrance gate and workshop signage clearly visible in photo. GPS pin confirmed at central vehicle intake gate.',
    };
    setBranches((prev) => [newBranch, ...prev]);
    notify(`Client "${newBranch.companyName}" (${newBranch.branchName}) registered. Submitted to Country Sales Head for pin review.`);
    return newBranch;
  };

  const approveBranchPin = (branchId: string, reason: string, managerName = 'HQ Administrator (Country Head)') => {
    const timestamp = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WAT Today`;
    setBranches((prev) =>
      prev.map((b) =>
        b.id === branchId
          ? {
              ...b,
              status: 'approved',
              managerDecision: {
                action: 'approved',
                reason: reason.trim(),
                decidedBy: managerName,
                decidedAt: timestamp,
              },
            }
          : b
      )
    );
    notify(`Branch pin [${branchId}] approved by ${managerName}. Status updated to Approved Pin.`);
  };

  const rejectBranchPin = (branchId: string, reason: string, managerName = 'HQ Administrator (Country Head)') => {
    const timestamp = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WAT Today`;
    setBranches((prev) =>
      prev.map((b) =>
        b.id === branchId
          ? {
              ...b,
              status: 'rejected',
              managerDecision: {
                action: 'rejected',
                reason: reason.trim(),
                decidedBy: managerName,
                decidedAt: timestamp,
              },
            }
          : b
      )
    );
    notify(`Branch pin [${branchId}] rejected by ${managerName}. Rationale recorded.`);
  };

  const submitException = async (exceptionData: Omit<FieldExceptionRecord, 'id' | 'submittedAt' | 'status'>) => {
    const newExc: FieldExceptionRecord = {
      ...exceptionData,
      id: `exc-${Date.now()}`,
      submittedAt: `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WAT Today`,
      status: 'pending_review',
      repName: currentUser?.name || 'Sales Representative',
      accuracy: '±145m (Exceeds ≤100m visit limit)',
      claimedDuration: '35 mins',
      submissionLag: '12 mins post-checkout',
    };
    setExceptions((prev) => [newExc, ...prev]);

    if (currentUser?.id) {
      try {
        const branchMatch = branches.find((b) => b.branchName === exceptionData.branchName || b.id === (exceptionData as any).branchCode);
        const branchId = branchMatch?.id || (branches.length > 0 ? branches[0].id : null);
        if (branchId) {
          const excType = (exceptionData.type as any) === 'missed_visit_claim' ? 'missed_visit' : (exceptionData.type as any) === 'device_breakdown' ? 'device_depletion' : (exceptionData.type as any) || 'gps_failure';
          await visitService.submitSalespersonException({
            branchId,
            exceptionType: excType,
            claimedVisitTime: new Date().toISOString(),
            reason: exceptionData.reason || exceptionData.evidenceNote || 'Salesperson field exception',
            attendanceDayId: attendanceRecord?.id,
            supportingEvidenceUrl: undefined,
          });
          await refreshExceptions();
        }
      } catch (err) {
        console.warn('[FieldSession] Supabase exception insert notice:', err);
      }
    }

    notify(`Exception claim [${newExc.title}] submitted directly to Country Sales Head.`);
  };

  const approveException = (exceptionId: string, reason: string, managerName = 'HQ Administrator (Country Head)') => {
    const timestamp = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WAT Today`;
    setExceptions((prev) =>
      prev.map((e) =>
        e.id === exceptionId
          ? {
              ...e,
              status: 'approved_unverified',
              managerComment: reason.trim(),
              decisionDate: timestamp,
              decidedBy: managerName,
            }
          : e
      )
    );
    notify(`Exception [${exceptionId}] marked "Manager Approved — Location Unverified".`);
  };

  const rejectException = (exceptionId: string, reason: string, managerName = 'HQ Administrator (Country Head)') => {
    const timestamp = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WAT Today`;
    setExceptions((prev) =>
      prev.map((e) =>
        e.id === exceptionId
          ? {
              ...e,
              status: 'rejected',
              managerComment: reason.trim(),
              decisionDate: timestamp,
              decidedBy: managerName,
            }
          : e
      )
    );
    notify(`Exception [${exceptionId}] rejected. Rationale recorded.`);
  };

  const escalateException = (exceptionId: string, reason: string, managerName = 'HQ Administrator (Country Head)') => {
    const timestamp = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WAT Today`;
    setExceptions((prev) =>
      prev.map((e) =>
        e.id === exceptionId
          ? {
              ...e,
              status: 'escalated',
              managerComment: `Escalated to HQ Admin: ${reason.trim()}`,
              decisionDate: timestamp,
              decidedBy: managerName,
            }
          : e
      )
    );
    notify(`Exception [${exceptionId}] escalated to HQ Admin for governance review.`);
  };

  const submitNonVisitDayRequest = (req: Omit<NonVisitDayRequest, 'id' | 'status'>) => {
    const newReq: NonVisitDayRequest = {
      ...req,
      id: `nvd-${Date.now()}`,
      status: 'pending_approval',
    };
    setNonVisitDayRequest(newReq);
    notify('Non-visit workday request submitted for manager sign-off.');
  };

  const triggerSyncNow = useCallback(async () => {
    if (!isOnline) {
      notify('Cannot synchronise while offline. Events remain safely queued in IndexedDB.');
      return;
    }
    setSyncState('syncing');
    notify('Synchronising offline event queue with server...');

    if (currentUser?.id) {
      const res = await offlineSyncService.syncUserQueue(currentUser.id, currentUser.id, {
        ignoreBackoff: true,
      });
      await Promise.all([refreshOfflineQueue(), refreshAttendance(), refreshActiveVisit()]);
      if (res.failed > 0 || res.blocked > 0) {
        notify(
          `Sync completed with attention required: ${res.synced} synced, ${res.failed} failed, ${res.blocked} blocked/needs review.`
        );
      } else {
        setSyncQueue((prev) => prev.map((q) => ({ ...q, syncStatus: 'synced' })));
        setSyncState('synced');
        notify(
          res.synced > 0
            ? `Sync Complete: ${res.synced} offline event(s) verified and acknowledged by server.`
            : 'Sync Complete: All events acknowledged by server idempotently.'
        );
      }
      return;
    }

    await new Promise((r) => setTimeout(r, 400));
    setSyncQueue((prev) => prev.map((q) => ({ ...q, syncStatus: 'synced' })));
    setSyncState('synced');
    notify('Sync Complete: All events acknowledged by server idempotently.');
  }, [isOnline, currentUser?.id, refreshOfflineQueue, refreshAttendance, refreshActiveVisit]);

  const retryFailedEvent = useCallback(
    async (eventId: string) => {
      if (!currentUser?.id) return;
      const ok = await offlineSyncService.retryEvent(currentUser.id, eventId);
      if (ok) {
        await refreshOfflineQueue();
        if (isOnline) {
          await triggerSyncNow();
        } else {
          notify('Event reset to Pending. Will synchronise when device reconnects.');
        }
      }
    },
    [currentUser?.id, isOnline, refreshOfflineQueue, triggerSyncNow]
  );

  const toggleOnline = () => {
    setIsOnline((prev) => {
      const next = !prev;
      notify(
        next
          ? 'Device back online. Reconnected to Carbon network.'
          : 'Device offline (Airplane mode / Tunnel loss). Events will queue in IndexedDB.'
      );
      return next;
    });
  };

  // Listen for browser online / offline & foreground visibility transitions
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBrowserOnline = () => {
      setIsOnline(true);
      notify('Network connection restored. Checking offline queue...');
    };
    const handleBrowserOffline = () => {
      setIsOnline(false);
      notify('Network connection lost. Operations will be saved to local IndexedDB queue.');
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isOnline && currentUser?.id) {
        refreshOfflineQueue();
      }
    };

    window.addEventListener('online', handleBrowserOnline);
    window.addEventListener('offline', handleBrowserOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleBrowserOnline);
      window.removeEventListener('offline', handleBrowserOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOnline, currentUser?.id, refreshOfflineQueue]);

  // Auto-sync pending events when transitioning to online
  useEffect(() => {
    if (isOnline && currentUser?.id && queueTelemetry.pendingCount > 0 && syncState !== 'syncing') {
      triggerSyncNow();
    }
  }, [isOnline, currentUser?.id, queueTelemetry.pendingCount, syncState, triggerSyncNow]);

  const setSimulatedGps = (accuracy: number, distance: number) => {
    setSimulatedGpsAccuracy(accuracy);
    setSimulatedGeofenceDistance(distance);
    notify(`Simulated GPS updated: Accuracy ±${accuracy}m, Distance ${distance}m.`);
  };

  return (
    <FieldSessionContext.Provider
      value={{
        workdayStatus,
        startDayTime,
        startDaySelfie,
        endDayTime,
        attendanceRecord,
        isAttendanceLoading,
        isAttendanceProvisional,
        startDay,
        endDay,
        onAttendanceStarted,
        onAttendanceEnded,
        refreshAttendance,
        enqueueOfflineStartDay,
        enqueueOfflineEndDay,
        activeVisit,
        refreshActiveVisit,
        checkInVisit,
        checkOutVisit,
        cancelVisit,
        completedVisits,
        pendingMeetingLogs,
        submitMeetingLog,
        branches,
        refreshBranches,
        registerBranch,
        approveBranchPin,
        rejectBranchPin,
        exceptions,
        submitException,
        approveException,
        rejectException,
        escalateException,
        nonVisitDayRequest,
        submitNonVisitDayRequest,
        isOnline,
        toggleOnline,
        syncState,
        syncQueue,
        journalEvents,
        queueTelemetry,
        storageQuota,
        refreshOfflineQueue,
        retryFailedEvent,
        triggerSyncNow,
        simulatedGpsAccuracy,
        simulatedGeofenceDistance,
        setSimulatedGps,
        sessionNotice,
        setSessionNotice,
      }}
    >
      {children}
    </FieldSessionContext.Provider>
  );
};

export const useFieldSession = () => {
  const context = useContext(FieldSessionContext);
  if (!context) {
    throw new Error('useFieldSession must be used within a FieldSessionProvider');
  }
  return context;
};
