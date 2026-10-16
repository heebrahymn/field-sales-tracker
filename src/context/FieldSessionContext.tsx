import React, { createContext, useContext, useState } from 'react';

export interface BranchContact {
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
  isRegisteredByRep?: boolean;
  status: 'approved' | 'pending_approval' | 'rejected';
  lastVisitDate?: string;
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
}

export interface CompletedVisitRecord {
  id: string;
  branchName: string;
  companyName: string;
  branchCode: string;
  checkInTime: string;
  checkOutTime: string;
  durationMinutes: number;
  verificationStatus: 'location_verified' | 'manager_approved_unverified' | 'disputed';
  meetingLogSubmitted: boolean;
  meetingLogDeferredUntil?: string;
  flagRaised?: string;
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
  status: 'pending_review' | 'approved_unverified' | 'rejected';
  managerComment?: string;
  decisionDate?: string;
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
  startDay: (selfieUrl: string) => void;
  endDay: () => boolean; // returns false if blocked by active visit

  // Active Visit
  activeVisit: ActiveVisitSession | null;
  checkInVisit: (branch: ClientBranch, photoUrl: string, accuracy: number, distance: number) => void;
  checkOutVisit: (outsideGeofence: boolean, meetingLogData?: any) => void;
  cancelVisit: () => void;

  // History & Operations
  completedVisits: CompletedVisitRecord[];
  pendingMeetingLogs: CompletedVisitRecord[];
  submitMeetingLog: (visitId: string, logData: any) => void;

  // Branches & Directory
  branches: ClientBranch[];
  registerBranch: (newBranch: Omit<ClientBranch, 'id' | 'status' | 'distanceMeters'>) => void;

  // Exceptions
  exceptions: FieldExceptionRecord[];
  submitException: (exception: Omit<FieldExceptionRecord, 'id' | 'submittedAt' | 'status'>) => void;

  // Non-Visit Day
  nonVisitDayRequest: NonVisitDayRequest | null;
  submitNonVisitDayRequest: (req: Omit<NonVisitDayRequest, 'id' | 'status'>) => void;

  // Offline & Sync Simulation
  isOnline: boolean;
  toggleOnline: () => void;
  syncState: 'synced' | 'pending' | 'syncing' | 'failed' | 'needs_review';
  syncQueue: QueuedEvent[];
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

export const FieldSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Attendance
  const [workdayStatus, setWorkdayStatus] = useState<'not_started' | 'started' | 'ended'>('started');
  const [startDayTime, setStartDayTime] = useState<string | null>('08:05 WAT');
  const [startDaySelfie, setStartDaySelfie] = useState<string | null>('/demo/demo_selfie_silhouette.png');

  // 2. Active Visit (Initial active visit for context-aware testing AT-04)
  const [activeVisit, setActiveVisit] = useState<ActiveVisitSession | null>({
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
  });

  // 3. Completed Visits Today
  const [completedVisits, setCompletedVisits] = useState<CompletedVisitRecord[]>([
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
  ]);

  const [pendingMeetingLogs, setPendingMeetingLogs] = useState<CompletedVisitRecord[]>([]);

  // 4. Branch Directory (Realistic Fictional Entities with Shared Phone Number support)
  const [branches, setBranches] = useState<ClientBranch[]>([
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
  ]);

  // 5. Rep-Submitted Exceptions
  const [exceptions, setExceptions] = useState<FieldExceptionRecord[]>([
    {
      id: 'exc-01',
      type: 'gps_failure',
      title: 'GPS Signal Failure (Basement Facility)',
      branchName: 'Metroline Basement Fleet Hub',
      claimedDate: 'Today 16 Oct 2026',
      claimedTime: '13:40 - 14:10 WAT',
      reason: 'Underground parking concrete attenuation prevented GPS lock (Accuracy ±140m).',
      evidenceNote: 'Premises gate and workshop signage clearly photographed on entry.',
      submittedAt: 'Today 14:15 WAT',
      status: 'approved_unverified',
      managerComment: 'Approved based on verifiable basement multi-path signal and stamped entrance image.',
      decisionDate: 'Today 14:45 WAT',
    },
    {
      id: 'exc-02',
      type: 'device_breakdown',
      title: 'Device Battery Depletion & Recovery',
      branchName: 'Titan Engineering Fleet Depot',
      claimedDate: 'Yesterday 15 Oct 2026',
      claimedTime: '11:15 - 11:55 WAT',
      reason: 'Assigned handset battery depleted unexpectedly during meeting. Submitted after power restoration at depot base.',
      evidenceNote: 'Signed physical visitor log sheet scanned and attached.',
      submittedAt: 'Yesterday 14:00 WAT',
      status: 'pending_review',
    },
  ]);

  // 6. Non-Visit Day Request
  const [nonVisitDayRequest, setNonVisitDayRequest] = useState<NonVisitDayRequest | null>(null);

  // 7. Offline & Sync Queue
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncState, setSyncState] = useState<'synced' | 'pending' | 'syncing' | 'failed' | 'needs_review'>('synced');
  const [syncQueue, setSyncQueue] = useState<QueuedEvent[]>([
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
  ]);

  // 8. Simulation Controls
  const [simulatedGpsAccuracy, setSimulatedGpsAccuracy] = useState<number>(14);
  const [simulatedGeofenceDistance, setSimulatedGeofenceDistance] = useState<number>(38);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const notify = (msg: string) => {
    setSessionNotice(msg);
    setTimeout(() => setSessionNotice(null), 5000);
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

  const checkInVisit = (branch: ClientBranch, photoUrl: string, accuracy: number, distance: number) => {
    if (activeVisit) {
      notify('Cannot start a new visit while a visit is in progress (AT-04).');
      return;
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
    };
    setActiveVisit(newVisit);
    notify(`Checked in at ${branch.branchName}. Active visit timer running.`);
  };

  const checkOutVisit = (outsideGeofence: boolean, meetingLogData?: any) => {
    if (!activeVisit) return;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isDeferred = !meetingLogData;
    const newCompleted: CompletedVisitRecord = {
      id: activeVisit.id,
      branchName: activeVisit.branchName,
      companyName: activeVisit.companyName,
      branchCode: activeVisit.branchCode,
      checkInTime: activeVisit.checkInTime,
      checkOutTime: nowStr,
      durationMinutes: Math.max(1, Math.round(activeVisit.elapsedSeconds / 60)),
      verificationStatus: outsideGeofence ? 'manager_approved_unverified' : 'location_verified',
      meetingLogSubmitted: !isDeferred,
      meetingLogDeferredUntil: isDeferred ? 'Within 2h SLA' : undefined,
      flagRaised: outsideGeofence ? 'Checkout Outside Geofence (>200m)' : undefined,
    };

    setCompletedVisits((prev) => [newCompleted, ...prev]);
    if (isDeferred) {
      setPendingMeetingLogs((prev) => [newCompleted, ...prev]);
    }
    setActiveVisit(null);
    notify(
      outsideGeofence
        ? 'Checkout recorded outside geofence: Flagged for manager review. Visit closed.'
        : 'Visit successfully completed and location verified.'
    );
  };

  const cancelVisit = () => {
    setActiveVisit(null);
    notify('Active visit cancelled without saving.');
  };

  const submitMeetingLog = (visitId: string, _logData: any) => {
    setPendingMeetingLogs((prev) => prev.filter((p) => p.id !== visitId));
    setCompletedVisits((prev) =>
      prev.map((v) => (v.id === visitId ? { ...v, meetingLogSubmitted: true, meetingLogDeferredUntil: undefined } : v))
    );
    notify('Meeting log submitted successfully. Stored as narrative outcome.');
  };

  const registerBranch = (newBranchData: Omit<ClientBranch, 'id' | 'status' | 'distanceMeters'>) => {
    const newBranch: ClientBranch = {
      ...newBranchData,
      id: `br-rep-${Date.now()}`,
      status: 'pending_approval',
      distanceMeters: 120,
      isRegisteredByRep: true,
    };
    setBranches((prev) => [newBranch, ...prev]);
    notify(`Branch "${newBranch.branchName}" registered. Submitted to Country Sales Head for pin review.`);
  };

  const submitException = (exceptionData: Omit<FieldExceptionRecord, 'id' | 'submittedAt' | 'status'>) => {
    const newExc: FieldExceptionRecord = {
      ...exceptionData,
      id: `exc-${Date.now()}`,
      submittedAt: 'Just now',
      status: 'pending_review',
    };
    setExceptions((prev) => [newExc, ...prev]);
    notify('Exception claim submitted for Country Sales Head review.');
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

  const toggleOnline = () => {
    setIsOnline((prev) => {
      const next = !prev;
      notify(next ? 'Device back online. Reconnected to Carbon network.' : 'Device offline (Airplane mode / Tunnel loss). Events will queue in IndexedDB.');
      return next;
    });
  };

  const triggerSyncNow = async () => {
    setSyncState('syncing');
    notify('Synchronising offline event queue with server...');
    await new Promise((r) => setTimeout(r, 1200));
    setSyncQueue((prev) => prev.map((q) => ({ ...q, syncStatus: 'synced' })));
    setSyncState('synced');
    notify('Sync Complete: All events acknowledged by server idempotently.');
  };

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
        startDay,
        endDay,
        activeVisit,
        checkInVisit,
        checkOutVisit,
        cancelVisit,
        completedVisits,
        pendingMeetingLogs,
        submitMeetingLog,
        branches,
        registerBranch,
        exceptions,
        submitException,
        nonVisitDayRequest,
        submitNonVisitDayRequest,
        isOnline,
        toggleOnline,
        syncState,
        syncQueue,
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
