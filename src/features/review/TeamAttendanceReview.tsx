import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  attendanceService,
  getMarketWorkDate,
  formatMarketTime,
  AttendanceRecord,
  AbsenceRequestRecord,
} from '@/services/attendanceService';
import { managementService } from '@/services/managementService';
import { emitBadgeCountsChanged } from '@/utils/badgeSync';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PhotoLightboxModal, LightboxPhoto } from '@/components/ui/photo-lightbox-modal';
import {
  CalendarDays,
  UserCheck,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  PlusCircle,
  Smartphone,
  Battery,
  X,
  Eye,
  Loader2,
  RefreshCw,
  ShieldCheck,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { calculateAttendanceBattery, getBatteryStatus } from '@/utils/battery';

export interface TeamAttendanceReviewProps {
  enableLiveSyncInTest?: boolean;
}

export interface SalesRepAttendance {
  recordId?: string;
  repId: string;
  repName: string;
  email: string;
  phone: string;
  assignedTerritory: string;
  deviceId: string;
  batteryLevel: number | null;
  todayStatus: 'active_field' | 'completed_day' | 'non_visit_day' | 'approved_leave' | 'absent';
  workDate?: string;
  absenceCategory?: string;
  absenceJustification?: string;
  absenceApprovedAt?: string;
  startDayTime?: string;
  startGps?: {
    coords: string;
    accuracy: number;
  };
  selfieUrl?: string;
  endDayTime?: string;
  visitsCompletedToday: number;
  locationVerifiedVisitsCount?: number;
  fieldDaysCount?: number;
  nonVisitDaysCount?: number;
  leaveDaysCount?: number;
  nonVisitRequest?: {
    id: string;
    activityType: string;
    reason: string;
    status: 'pending_approval' | 'approved' | 'rejected';
    requestedAt: string;
    managerDecision?: {
      action: 'approved' | 'rejected';
      reason: string;
      decidedAt: string;
    };
  };
  isRealRecord?: boolean;
}

const WORK_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidWorkDate(value?: string | null): value is string {
  return Boolean(value && WORK_DATE_REGEX.test(value));
}

function formatAbsenceCategoryLabel(category?: string): string {
  if (!category) return 'Authorized Non-Field Day';
  return category
    .replace(/^leave_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function mapAttendanceRecordToRep(rec: AttendanceRecord): SalesRepAttendance {
  const repFullName = rec.profiles?.full_name || 'Carbon Field Salesperson';
  const repEmpId = `CC-${rec.market_code}-${rec.user_id.slice(0, 4).toUpperCase()}`;

  let mappedStatus: SalesRepAttendance['todayStatus'] = 'absent';
  if (rec.status === 'started') mappedStatus = 'active_field';
  else if (rec.status === 'ended') mappedStatus = 'completed_day';
  else if (rec.status === 'approved_non_visit') mappedStatus = 'non_visit_day';
  else if (rec.status === 'approved_leave') mappedStatus = 'approved_leave';

  const isAbsenceOrNonVisit = mappedStatus === 'non_visit_day' || mappedStatus === 'approved_leave';
  const isVirtualAbsence = rec.device_id === 'authorized_absence';
  const hasRealStartLocation =
    !isVirtualAbsence &&
    (rec.start_latitude !== 0 || rec.start_longitude !== 0 || rec.start_accuracy_m !== 0);

  const dynamicBattery = isAbsenceOrNonVisit
    ? null
    : calculateAttendanceBattery({
        startedAt: rec.started_at,
        endedAt: rec.ended_at,
        visitsCount: rec.visits?.length || 0,
        deviceBatteryHealth: rec.devices?.battery_health,
      });

  const visits = rec.visits || [];
  const verifiedVisitsCount = visits.filter((v) => v.verification_status === 'location_verified').length;

  return {
    recordId: rec.id,
    repId: repEmpId,
    repName: repFullName,
    email: rec.profiles?.email || 'salesperson@carboncarcare.com',
    phone: rec.profiles?.phone_number || '—',
    assignedTerritory: `${rec.market_code} Commercial Territory`,
    deviceId: rec.devices?.asset_tag || 'Assigned Handset',
    batteryLevel: dynamicBattery,
    todayStatus: mappedStatus,
    workDate: rec.absence_date || rec.work_date,
    absenceCategory: rec.absence_category,
    absenceJustification: rec.absence_justification,
    absenceApprovedAt: rec.absence_approved_at || (isAbsenceOrNonVisit ? rec.started_at : undefined),
    startDayTime: isVirtualAbsence ? undefined : formatMarketTime(rec.started_at, rec.market_code),
    endDayTime: !isVirtualAbsence && rec.ended_at ? formatMarketTime(rec.ended_at, rec.market_code) : undefined,
    startGps: hasRealStartLocation
      ? {
          coords: `${rec.start_latitude?.toFixed(4)}° N, ${rec.start_longitude?.toFixed(4)}° E`,
          accuracy: Math.round(rec.start_accuracy_m || 15),
        }
      : undefined,
    selfieUrl: rec.start_selfie_url || undefined,
    visitsCompletedToday: visits.length,
    locationVerifiedVisitsCount: verifiedVisitsCount,
    fieldDaysCount: mappedStatus === 'active_field' || mappedStatus === 'completed_day' ? 1 : 0,
    nonVisitDaysCount: mappedStatus === 'non_visit_day' ? 1 : 0,
    leaveDaysCount: mappedStatus === 'approved_leave' ? 1 : 0,
    isRealRecord: true,
  };
}

function aggregateAttendanceRecordsByUser(records: AttendanceRecord[]): SalesRepAttendance[] {
  const grouped = new Map<string, AttendanceRecord[]>();
  for (const rec of records) {
    const bucket = grouped.get(rec.user_id) || [];
    bucket.push(rec);
    grouped.set(rec.user_id, bucket);
  }

  const summaries: SalesRepAttendance[] = [];
  for (const userRecords of grouped.values()) {
    const sorted = [...userRecords].sort((a, b) => {
      const dateCmp = (b.work_date || '').localeCompare(a.work_date || '');
      if (dateCmp !== 0) return dateCmp;
      return (b.started_at || '').localeCompare(a.started_at || '');
    });

    const mappedList = sorted.map(mapAttendanceRecordToRep);
    const latest = mappedList[0];
    const latestField = mappedList.find((m) => m.todayStatus === 'active_field' || m.todayStatus === 'completed_day');
    const telemetrySource = latestField || latest;

    const totalVisits = mappedList.reduce((sum, m) => sum + m.visitsCompletedToday, 0);
    const totalVerifiedVisits = mappedList.reduce((sum, m) => sum + (m.locationVerifiedVisitsCount || 0), 0);
    const fieldDaysCount = mappedList.reduce((sum, m) => sum + (m.fieldDaysCount || 0), 0);
    const nonVisitDaysCount = mappedList.reduce((sum, m) => sum + (m.nonVisitDaysCount || 0), 0);
    const leaveDaysCount = mappedList.reduce((sum, m) => sum + (m.leaveDaysCount || 0), 0);

    summaries.push({
      ...latest,
      deviceId: telemetrySource.deviceId,
      batteryLevel: telemetrySource.batteryLevel,
      startDayTime: telemetrySource.startDayTime,
      endDayTime: telemetrySource.endDayTime,
      startGps: telemetrySource.startGps,
      selfieUrl: telemetrySource.selfieUrl,
      workDate: latest.workDate,
      visitsCompletedToday: totalVisits,
      locationVerifiedVisitsCount: totalVerifiedVisits,
      fieldDaysCount,
      nonVisitDaysCount,
      leaveDaysCount,
    });
  }

  return summaries.sort((a, b) => b.visitsCompletedToday - a.visitsCompletedToday || a.repName.localeCompare(b.repName));
}

const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

const TEST_DEMO_REPS: SalesRepAttendance[] = [
  {
    repId: 'CC-REP-042',
    repName: 'Tunde Adebayo',
    email: 'tunde.adebayo@carboncarcare.ng',
    phone: '+234 803 111 2233',
    assignedTerritory: 'Lagos Island & Lekki Commercial Zone',
    deviceId: 'SM-A546B (CC-DEV-008)',
    batteryLevel: 82,
    todayStatus: 'active_field',
    startDayTime: '08:14 WAT',
    startGps: { coords: '6.4531° N, 3.4211° E', accuracy: 12 },
    selfieUrl: '/brand/selfie_demo_01.jpg',
    visitsCompletedToday: 3,
  },
  {
    repId: 'CC-REP-038',
    repName: 'Chinyere Nwosu',
    email: 'chinyere.nwosu@carboncarcare.ng',
    phone: '+234 802 333 4455',
    assignedTerritory: 'Apapa Port & Industrial Corridor',
    deviceId: 'SM-A546B (CC-DEV-014)',
    batteryLevel: 65,
    todayStatus: 'active_field',
    startDayTime: '08:25 WAT',
    startGps: { coords: '6.4421° N, 3.3611° E', accuracy: 16 },
    selfieUrl: '/brand/selfie_demo_02.jpg',
    visitsCompletedToday: 2,
  },
  {
    repId: 'CC-REP-039',
    repName: 'Emeka Nwosu',
    email: 'emeka.nwosu@carboncarcare.ng',
    phone: '+234 805 777 8899',
    assignedTerritory: 'Ibeju-Lekki & Epe Corridor',
    deviceId: 'SM-A546B (CC-DEV-019)',
    batteryLevel: 44,
    todayStatus: 'completed_day',
    startDayTime: '08:05 WAT',
    endDayTime: '15:30 WAT',
    startGps: { coords: '6.4510° N, 3.5120° E', accuracy: 18 },
    visitsCompletedToday: 4,
  },
  {
    repId: 'CC-REP-044',
    repName: 'Ibrahim Sani',
    email: 'ibrahim.sani@carboncarcare.ng',
    phone: '+234 803 999 0011',
    assignedTerritory: 'Kano North Depot & Transit Route',
    deviceId: 'SM-A546B (CC-DEV-022)',
    batteryLevel: 91,
    todayStatus: 'non_visit_day',
    startDayTime: '08:45 WAT',
    visitsCompletedToday: 0,
    nonVisitRequest: {
      id: 'NVR-KAN-01',
      activityType: 'training_development',
      reason: 'Attending mandatory regional hazardous chemical handling certification at Federal Safety Institute, Kano.',
      status: 'pending_approval',
      requestedAt: 'Today 08:30 WAT',
    },
  },
  {
    repId: 'CC-REP-050',
    repName: 'Amina Bello',
    email: 'amina.bello@carboncarcare.ng',
    phone: '+234 802 888 7766',
    assignedTerritory: 'Ikeja Industrial Zone',
    deviceId: 'SM-A546B (CC-DEV-029)',
    batteryLevel: 100,
    todayStatus: 'approved_leave',
    visitsCompletedToday: 0,
  },
];

export const TeamAttendanceReview: React.FC<TeamAttendanceReviewProps> = ({
  enableLiveSyncInTest = false,
}) => {
  const { currentUser } = useAuth();
  const marketToday = getMarketWorkDate(currentUser?.marketCode);

  const [startDate, setStartDate] = useState<string>(() => marketToday);
  const [endDate, setEndDate] = useState<string>(() => marketToday);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'leave' | 'non_visit'>('all');
  const [selectedRepForInspection, setSelectedRepForInspection] = useState<SalesRepAttendance | null>(null);
  const [signedSelfieUrl, setSignedSelfieUrl] = useState<string | null>(null);
  const [isLoadingSelfie, setIsLoadingSelfie] = useState<boolean>(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<LightboxPhoto | null>(null);

  // Leave Recording Dialog State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedRepForLeave, setSelectedRepForLeave] = useState<string>('');
  const [leaveType, setLeaveType] = useState<'annual' | 'sick' | 'compassionate' | 'training'>('annual');
  const [leaveStartDate, setLeaveStartDate] = useState(marketToday);
  const [leaveEndDate, setLeaveEndDate] = useState(marketToday);
  const [leaveNotes, setLeaveNotes] = useState('');

  // Rejection Dialog State
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Real data from Supabase
  const [realAttendance, setRealAttendance] = useState<AttendanceRecord[]>([]);
  const [pendingAbsenceRequests, setPendingAbsenceRequests] = useState<AbsenceRequestRecord[]>([]);
  const requestSeqRef = useRef(0);

  // Demonstration Fallback Baseline (Only in test environment when live sync test mode is off)
  const [demoReps, setDemoReps] = useState<SalesRepAttendance[]>(() =>
    isTestEnv && !enableLiveSyncInTest ? TEST_DEMO_REPS : []
  );

  // Load live attendance and non-visit requests from Supabase
  const loadSupabaseData = useCallback(async (startOverride?: string, endOverride?: string) => {
    if (isTestEnv && !enableLiveSyncInTest) return;
    const queryStart = startOverride ?? startDate;
    const queryEnd = endOverride ?? endDate;
    const seq = ++requestSeqRef.current;

    if (!isValidWorkDate(queryStart) || !isValidWorkDate(queryEnd) || queryStart > queryEnd) {
      setRealAttendance([]);
      setLoadError(null);
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);
    setLoadError(null);
    const targetMarket = currentUser?.role === 'hq_admin' ? 'ALL' : currentUser?.marketCode || 'NG';

    try {
      const [attRes, absRes] = await Promise.all([
        queryStart === queryEnd
          ? attendanceService.getMarketAttendance(targetMarket, queryStart)
          : attendanceService.getMarketAttendanceRange(targetMarket, queryStart, queryEnd),
        attendanceService.getPendingNonVisitRequests(targetMarket),
      ]);

      if (seq !== requestSeqRef.current) return;

      if (attRes.error) {
        setRealAttendance([]);
        setLoadError(attRes.error.message || 'Unable to load attendance logs for selected date range.');
      } else {
        setRealAttendance(
          (attRes.data || []).filter(
            (rec) => !rec.work_date || (rec.work_date >= queryStart && rec.work_date <= queryEnd)
          )
        );
      }

      if (absRes.data) {
        setPendingAbsenceRequests(absRes.data);
      }
    } catch (err: any) {
      if (seq !== requestSeqRef.current) return;
      console.warn('[TeamAttendanceReview] Error loading live attendance:', err);
      setRealAttendance([]);
      setLoadError(err?.message || 'Unable to load attendance logs for selected date range.');
    } finally {
      if (seq === requestSeqRef.current) {
        setIsLoadingData(false);
      }
    }
  }, [currentUser?.role, currentUser?.marketCode, startDate, endDate, enableLiveSyncInTest]);

  useEffect(() => {
    loadSupabaseData();
  }, [loadSupabaseData]);

  const hasValidRange = isValidWorkDate(startDate) && isValidWorkDate(endDate) && startDate <= endDate;
  const isRangeMode = hasValidRange && startDate !== endDate;

  // Merge real Supabase records with demonstration data (strictly scoped to [startDate, endDate])
  const scopedRealAttendance = hasValidRange
    ? realAttendance.filter(
        (rec) => !rec.work_date || (rec.work_date >= startDate && rec.work_date <= endDate)
      )
    : [];

  const realRepsForView: SalesRepAttendance[] = isRangeMode
    ? aggregateAttendanceRecordsByUser(scopedRealAttendance)
    : scopedRealAttendance.map(mapAttendanceRecordToRep);

  const mergedReps: SalesRepAttendance[] = [
    ...realRepsForView,
    // Test environment fallback (only in non-live test runner)
    ...(isTestEnv && !enableLiveSyncInTest
      ? demoReps.filter(
          (demo) => !scopedRealAttendance.some((real) => real.profiles?.full_name === demo.repName)
        )
      : []),
  ];

  // Telemetry Inspection Modal: Fetch time-limited signed URL for private selfie
  useEffect(() => {
    let isCancelled = false;

    if (selectedRepForInspection?.selfieUrl) {
      const url = selectedRepForInspection.selfieUrl;
      // If it's already a demo or public path, use directly
      if (url.startsWith('/brand') || url.startsWith('/demo') || url.startsWith('blob:') || url.startsWith('http')) {
        setSignedSelfieUrl(url);
        setIsLoadingSelfie(false);
      } else {
        setIsLoadingSelfie(true);
        attendanceService
          .getSelfieSignedUrl(url)
          .then((signed) => {
            if (!isCancelled) {
              setSignedSelfieUrl(signed);
              setIsLoadingSelfie(false);
            }
          })
          .catch(() => {
            if (!isCancelled) {
              setSignedSelfieUrl(null);
              setIsLoadingSelfie(false);
            }
          });
      }
    } else {
      setSignedSelfieUrl(null);
      setIsLoadingSelfie(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [selectedRepForInspection]);

  // Review non-visit request (Approve / Reject)
  const handleReviewNonVisit = async (requestId: string, decision: 'approved' | 'rejected', reason: string) => {
    try {
      const targetReq = pendingAbsenceRequests.find((r) => r.id === requestId);
      const result = await attendanceService.reviewNonVisitRequest({
        requestId,
        decision,
        reason,
      });

      if (result.error) {
        setToastMessage(`Review failed: ${result.error.message}`);
        return;
      }

      setToastMessage(
        decision === 'approved'
          ? `Non-visit workday request APPROVED. Attendance credit recorded; strictly 0 physical visit targets.`
          : `Non-visit workday request REJECTED.`
      );

      // If approved for a date outside currently viewed range, switch to that date to view the record
      if (
        decision === 'approved' &&
        targetReq?.absence_date &&
        (!hasValidRange || targetReq.absence_date < startDate || targetReq.absence_date > endDate)
      ) {
        setStartDate(targetReq.absence_date);
        setEndDate(targetReq.absence_date);
        await loadSupabaseData(targetReq.absence_date, targetReq.absence_date);
      } else {
        // Refresh real Supabase requests & attendance
        await loadSupabaseData();
      }
      emitBadgeCountsChanged();
    } catch (err: any) {
      setToastMessage(`Review error: ${err.message}`);
    }
  };

  const handleApproveNonVisitDemo = (repId: string, requestId: string, decision: 'approved' | 'rejected') => {
    setDemoReps((prev) =>
      prev.map((r) => {
        if (r.repId === repId && r.nonVisitRequest?.id === requestId) {
          return {
            ...r,
            nonVisitRequest: {
              ...r.nonVisitRequest,
              status: decision,
              managerDecision: {
                action: decision,
                reason: decision === 'approved' ? 'Approved by Country Sales Head.' : 'Rejected; field visits required.',
                decidedAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT',
              },
            },
          };
        }
        return r;
      })
    );

    setToastMessage(
      `Non-visit workday request [${requestId}] ${decision.toUpperCase()}. Counts toward attendance; does NOT count toward physical visit targets.`
    );
  };

  const handleRecordLeave = async () => {
    if (!selectedRepForLeave) {
      alert('Please select a salesperson.');
      return;
    }

    // Check if the selected rep is a real Supabase user
    const matchedReal = realAttendance.find(
      (r) =>
        r.user_id === selectedRepForLeave ||
        `CC-${r.market_code}-${r.user_id.slice(0, 4).toUpperCase()}` === selectedRepForLeave
    );

    if (matchedReal) {
      await managementService.recordApprovedLeave({
        userId: matchedReal.user_id,
        date: leaveStartDate,
        category: `leave_${leaveType}`,
        justification: leaveNotes.trim() || `Approved ${leaveType} leave from ${leaveStartDate} to ${leaveEndDate}`,
      });
      loadSupabaseData();
    } else {
      setDemoReps((prev) =>
        prev.map((r) =>
          r.repId === selectedRepForLeave
            ? {
                ...r,
                todayStatus: 'approved_leave',
              }
            : r
        )
      );
    }

    setToastMessage(`Administrative Leave recorded for ${selectedRepForLeave} (${leaveStartDate} to ${leaveEndDate}).`);
    setIsLeaveModalOpen(false);
    setLeaveNotes('');
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (isValidWorkDate(value) && isValidWorkDate(endDate) && value > endDate) {
      setEndDate(value);
    }
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    if (isValidWorkDate(value) && isValidWorkDate(startDate) && value < startDate) {
      setStartDate(value);
    }
  };

  const matchesStatusCategory = (r: SalesRepAttendance, category: 'active' | 'leave' | 'non_visit') => {
    if (category === 'active') {
      return r.todayStatus === 'active_field' || r.todayStatus === 'completed_day' || (r.fieldDaysCount ?? 0) > 0;
    }
    if (category === 'leave') {
      return r.todayStatus === 'approved_leave' || (r.leaveDaysCount ?? 0) > 0;
    }
    return r.todayStatus === 'non_visit_day' || (r.nonVisitDaysCount ?? 0) > 0;
  };

  const filteredReps = mergedReps.filter((r) => {
    if (statusFilter !== 'all' && !matchesStatusCategory(r, statusFilter)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.repName.toLowerCase().includes(q) ||
        r.repId.toLowerCase().includes(q) ||
        r.assignedTerritory.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalVisitsLogged = filteredReps.reduce((sum, r) => sum + r.visitsCompletedToday, 0);
  const totalVerifiedVisitsLogged = filteredReps.reduce(
    (sum, r) => sum + (r.locationVerifiedVisitsCount ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-slate-900 text-white p-4 rounded-xl text-xs flex items-center justify-between shadow-xl border border-slate-700 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-emerald-300">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white font-bold ml-4 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <CalendarDays className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
          <div className="text-xs">
            <h3 className="font-bold text-slate-900 text-sm">
              Team Attendance &amp; Non-Visit Day Governance
            </h3>
            <p className="text-slate-700 font-medium mt-0.5">
              Inspect daily Start Day / End Day telemetry, live front-camera selfie check-ins, and company device bindings. Authorised non-visit workdays (training/office) count toward team attendance, but{' '}
              <span className="font-bold text-slate-900">never count toward physical visit targets</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Work Date Range Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase">From:</span>
            <input
              type="date"
              aria-label="Attendance Start Date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="text-xs font-semibold text-slate-900 bg-transparent focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase">To:</span>
            <input
              type="date"
              aria-label="Attendance End Date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="text-xs font-semibold text-slate-900 bg-transparent focus:outline-none"
            />
          </div>

          {(startDate !== marketToday || endDate !== marketToday) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setStartDate(marketToday);
                setEndDate(marketToday);
              }}
              className="text-xs font-semibold border-slate-300 bg-white px-2.5"
              title={`Jump to Today (${marketToday})`}
            >
              Today
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await loadSupabaseData();
              emitBadgeCountsChanged();
            }}
            disabled={isLoadingData}
            className="text-xs font-semibold border-slate-300 bg-white"
            title="Refresh Attendance Records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="default"
            size="sm"
            className="text-xs font-bold bg-brand-blue hover:bg-brand-blue-700 text-white flex items-center gap-1.5"
            onClick={() => {
              setSelectedRepForLeave(mergedReps[0]?.repId || '');
              setIsLeaveModalOpen(true);
            }}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Record Approved Leave
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{loadError}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadSupabaseData()}
            className="text-xs border-red-200 text-red-700 bg-white hover:bg-red-50"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Real Supabase Pending Non-Visit Requests (if any) */}
      {pendingAbsenceRequests.length > 0 && (
        <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-4 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wide">
                  Live Salesperson Non-Visit Requests (Authorization Queue)
                </h4>
              </div>
              <p className="text-[11px] text-purple-800/80 mt-0.5">
                Pending requests across upcoming and logged dates. Once approved, each workday appears only on its logged date.
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-200 text-purple-900">
              {pendingAbsenceRequests.length} Awaiting Authorization
            </span>
          </div>

          {pendingAbsenceRequests.map((req) => {
            const matchesSelectedDate =
              hasValidRange && req.absence_date >= startDate && req.absence_date <= endDate;
            return (
              <div
                key={req.id}
                className="bg-white rounded-lg p-3.5 border border-purple-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">
                      {req.profiles?.full_name || 'Carbon Rep'}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                      {req.category.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-mono font-semibold px-2 py-0.5 rounded border',
                        matchesSelectedDate
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      )}
                    >
                      Date: {req.absence_date}
                    </span>
                    {!matchesSelectedDate && isValidWorkDate(req.absence_date) && (
                      <button
                        type="button"
                        onClick={() => {
                          setStartDate(req.absence_date);
                          setEndDate(req.absence_date);
                        }}
                        className="text-[10px] font-semibold text-brand-blue hover:underline cursor-pointer"
                      >
                        Jump Date Filter
                      </button>
                    )}
                  </div>
                  <p className="text-slate-800 italic">&ldquo;{req.justification}&rdquo;</p>
                  <p className="text-[10px] text-slate-500">
                    Market: {req.market_code} • Author: Salesperson • Grants 0 Physical Visits
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-semibold text-red-700 border-red-200 hover:bg-red-50"
                    onClick={() => setRejectingRequestId(req.id)}
                  >
                    Reject Request
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white"
                    onClick={() =>
                      handleReviewNonVisit(req.id, 'approved', 'Approved by Country Sales Head.')
                    }
                  >
                    Approve Non-Visit Day
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Demonstration Pending Requests (if no real requests) */}
      {pendingAbsenceRequests.length === 0 &&
        demoReps.some((r) => r.nonVisitRequest?.status === 'pending_approval') && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Pending Non-Visit Workday Requests (Demonstration)
                </h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                1 Awaiting Manager Sign-off
              </span>
            </div>

            {demoReps
              .filter((r) => r.nonVisitRequest?.status === 'pending_approval')
              .map((r) => (
                <div
                  key={r.repId}
                  className="bg-white rounded-lg p-3.5 border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{r.repName}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-100 text-brand-blue">
                        Activity: {r.nonVisitRequest?.activityType.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-slate-700 italic">&ldquo;{r.nonVisitRequest?.reason}&rdquo;</p>
                    <p className="text-[10px] text-slate-500">
                      Requested: {r.nonVisitRequest?.requestedAt} • Territory: {r.assignedTerritory}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-semibold text-red-700 border-red-200 hover:bg-red-50"
                      onClick={() => handleApproveNonVisitDemo(r.repId, r.nonVisitRequest!.id, 'rejected')}
                    >
                      Reject Request
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="text-xs font-bold bg-brand-green hover:bg-emerald-800 text-white"
                      onClick={() => handleApproveNonVisitDemo(r.repId, r.nonVisitRequest!.id, 'approved')}
                    >
                      Approve Non-Visit Day
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}

      {/* Filter & Search Bar */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search team members by name, territory, or rep ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 bg-slate-50/50 border-slate-200"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs flex-wrap">
              <span className="font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                  statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                All Team ({mergedReps.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                  statusFilter === 'active'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                Active on Field ({mergedReps.filter((r) => matchesStatusCategory(r, 'active')).length})
              </button>
              <button
                onClick={() => setStatusFilter('non_visit')}
                className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                  statusFilter === 'non_visit'
                    ? 'bg-blue-700 text-white'
                    : 'bg-blue-50 text-brand-blue border border-blue-200'
                }`}
              >
                Non-Visit Days ({mergedReps.filter((r) => matchesStatusCategory(r, 'non_visit')).length})
              </button>
              <button
                onClick={() => setStatusFilter('leave')}
                className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                  statusFilter === 'leave'
                    ? 'bg-amber-700 text-white'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                Approved Leave ({mergedReps.filter((r) => matchesStatusCategory(r, 'leave')).length})
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-brand-blue border border-blue-200 font-bold">
                Total Client Visits Logged:{' '}
                <span className="font-mono text-sm">{totalVisitsLogged}</span>
                {totalVerifiedVisitsLogged > 0 && (
                  <span className="text-[11px] font-medium text-emerald-700">
                    ({totalVerifiedVisitsLogged} location verified)
                  </span>
                )}
              </span>
              <span className="text-slate-600 font-medium">
                Salespeople Shown: <strong className="text-slate-900">{filteredReps.length}</strong>
              </span>
            </div>

            <span className="text-[11px] font-mono text-slate-500">
              {isRangeMode ? (
                <>
                  Date Range: <strong className="text-slate-700">{startDate}</strong> →{' '}
                  <strong className="text-slate-700">{endDate}</strong>
                </>
              ) : (
                <>
                  Work Date:{' '}
                  <strong className="text-slate-700">
                    {hasValidRange ? startDate : 'Not Selected'}
                  </strong>
                </>
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Operational Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Salesperson</th>
                <th className="py-3 px-4">Market / Territory</th>
                <th className="py-3 px-4">Status &amp; Telemetry</th>
                <th className="py-3 px-4">Company Handset</th>
                <th className="py-3 px-4">Visits Logged</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredReps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center text-xs text-slate-500">
                    {isLoadingData ? (
                      <span className="inline-flex items-center gap-2 font-medium text-slate-600">
                        <Loader2 className="w-4 h-4 animate-spin text-brand-blue" />
                        Loading attendance records for{' '}
                        {isRangeMode ? `${startDate} to ${endDate}` : startDate}...
                      </span>
                    ) : !hasValidRange ? (
                      <span>Please select a valid From and To date (or click Today) to view logs.</span>
                    ) : (
                      <span>
                        No attendance, leave, or non-visit workday records logged for{' '}
                        <span className="font-mono font-semibold text-slate-700">
                          {isRangeMode ? `${startDate} to ${endDate}` : startDate}
                        </span>
                        .
                      </span>
                    )}
                  </td>
                </tr>
              ) : (
                filteredReps.map((rep) => {
                  const isActive = rep.todayStatus === 'active_field';
                  const isCompleted = rep.todayStatus === 'completed_day';
                  const isNonVisit = rep.todayStatus === 'non_visit_day';
                  const isLeave = rep.todayStatus === 'approved_leave';

                  return (
                    <tr key={rep.recordId || rep.repId} className="hover:bg-slate-50/75 transition-colors">
                      {/* Salesperson */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          {rep.repName}
                        </div>
                        <div className="text-[11px] text-slate-500">{rep.phone}</div>
                      </td>

                      {/* Territory */}
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {rep.assignedTerritory}
                      </td>

                      {/* Today Status / Range Summary */}
                      <td className="py-3.5 px-4">
                        {isRangeMode ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {(rep.fieldDaysCount ?? 0) > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                                  {rep.fieldDaysCount} Field {rep.fieldDaysCount === 1 ? 'Day' : 'Days'}
                                </span>
                              )}
                              {(rep.nonVisitDaysCount ?? 0) > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-brand-blue border border-blue-300 whitespace-nowrap">
                                  {rep.nonVisitDaysCount} Non-Visit
                                </span>
                              )}
                              {(rep.leaveDaysCount ?? 0) > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                                  {rep.leaveDaysCount} Leave
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Latest log:{' '}
                              <span className="font-mono font-semibold text-slate-700">
                                {rep.workDate || endDate}
                              </span>
                              {rep.startDayTime ? ` • ${rep.startDayTime}` : ''}
                            </div>
                          </div>
                        ) : (
                          <>
                            {isActive && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Active on Field ({rep.startDayTime})
                              </span>
                            )}
                            {isCompleted && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 whitespace-nowrap">
                                Day Completed ({rep.startDayTime} - {rep.endDayTime || 'Ended'})
                              </span>
                            )}
                            {isNonVisit && (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-brand-blue border border-blue-300 whitespace-nowrap">
                                  Non-Visit Workday
                                </span>
                                {(rep.absenceCategory || rep.workDate) && (
                                  <div className="text-[11px] text-slate-600">
                                    {formatAbsenceCategoryLabel(rep.absenceCategory)} • Logged for{' '}
                                    <span className="font-mono font-semibold text-slate-800">
                                      {rep.workDate || startDate}
                                    </span>
                                  </div>
                                )}
                                {rep.absenceJustification && (
                                  <div
                                    className="text-[10px] text-slate-500 italic max-w-xs truncate"
                                    title={rep.absenceJustification}
                                  >
                                    &ldquo;{rep.absenceJustification}&rdquo;
                                  </div>
                                )}
                              </div>
                            )}
                            {isLeave && (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                                  Approved Leave
                                </span>
                                {(rep.absenceCategory || rep.workDate) && (
                                  <div className="text-[11px] text-slate-600">
                                    {formatAbsenceCategoryLabel(rep.absenceCategory)} • Logged for{' '}
                                    <span className="font-mono font-semibold text-slate-800">
                                      {rep.workDate || startDate}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            {rep.todayStatus === 'absent' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300 whitespace-nowrap">
                                Not Started
                              </span>
                            )}
                          </>
                        )}
                      </td>

                      {/* Device & Battery */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-[11px] font-semibold text-slate-800 flex items-center gap-1">
                          <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                          {rep.deviceId}
                        </div>
                        {typeof rep.batteryLevel === 'number' ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                            <Battery className={cn('w-3.5 h-3.5', getBatteryStatus(rep.batteryLevel).statusColor)} />
                            <span className={cn('font-medium font-mono', getBatteryStatus(rep.batteryLevel).statusColor)}>
                              {rep.batteryLevel}% Battery
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            No field handset telemetry
                          </div>
                        )}
                      </td>

                      {/* Visits Logged */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">
                          {rep.visitsCompletedToday}
                          <span className="text-xs text-slate-500 font-normal ml-1">
                            {isRangeMode ? 'logged' : 'completed'}
                          </span>
                        </div>
                        {isRangeMode && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {(rep.fieldDaysCount ?? 0) > 0
                              ? `${rep.fieldDaysCount} field ${rep.fieldDaysCount === 1 ? 'day' : 'days'}${
                                  (rep.locationVerifiedVisitsCount ?? 0) > 0
                                    ? ` • ${rep.locationVerifiedVisitsCount} verified`
                                    : ''
                                }`
                              : 'Non-field days only'}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs font-semibold bg-white border-slate-300 hover:bg-slate-100 flex items-center gap-1 ml-auto"
                          onClick={() => setSelectedRepForInspection(rep)}
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          Inspect Telemetry
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Inspect Rep Telemetry Modal with Time-Limited Signed Selfie */}
      {selectedRepForInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                  Attendance Telemetry • {selectedRepForInspection.repName}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedRepForInspection.repName}
                </h3>
                <p className="text-xs text-slate-500">{selectedRepForInspection.assignedTerritory}</p>
              </div>
              <button
                onClick={() => setSelectedRepForInspection(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              {(selectedRepForInspection.todayStatus === 'non_visit_day' ||
                selectedRepForInspection.todayStatus === 'approved_leave') &&
              !selectedRepForInspection.selfieUrl &&
              !selectedRepForInspection.startGps ? (
                <div className="bg-blue-50/70 rounded-xl p-4 border border-blue-200 space-y-2.5 text-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">
                      Authorized Non-Field Record
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white border border-blue-200 text-slate-700">
                      Logged Date: {selectedRepForInspection.workDate || startDate}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Classification:</span>
                      <span className="font-semibold text-slate-900">
                        {selectedRepForInspection.todayStatus === 'approved_leave'
                          ? 'Approved Leave'
                          : 'Non-Visit Workday'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Activity Category:</span>
                      <span className="font-semibold text-slate-900">
                        {formatAbsenceCategoryLabel(selectedRepForInspection.absenceCategory)}
                      </span>
                    </div>
                  </div>
                  {selectedRepForInspection.absenceJustification && (
                    <div className="pt-2 border-t border-blue-200/70">
                      <span className="text-slate-500 block text-[10px] mb-0.5">
                        Recorded Justification:
                      </span>
                      <p className="text-slate-800 italic">
                        &ldquo;{selectedRepForInspection.absenceJustification}&rdquo;
                      </p>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-600 pt-1 border-t border-blue-200/70">
                    Start Day GPS coordinates, live selfie capture, and field handset battery telemetry are not required for authorized non-visit workdays or approved leave.
                  </p>
                </div>
              ) : (
                <>
                  {/* Selfie Check-in Preview (via Time-Limited Signed URL) */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-brand-blue" />
                        Live Front-Camera Start Day Selfie (Private Storage)
                      </span>
                      {signedSelfieUrl && !isLoadingSelfie && (
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxPhoto({
                              url: signedSelfieUrl,
                              title: `${selectedRepForInspection.repName} — Start Day Selfie`,
                              subtitle: `Captured at ${selectedRepForInspection.startDayTime || 'N/A'} • Front-Camera Visual Audit`,
                            })
                          }
                          className="text-[11px] font-bold text-brand-blue hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          View full photo <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {isLoadingSelfie ? (
                      <div className="h-44 bg-slate-950 rounded-lg flex items-center justify-center text-slate-400 border border-slate-300 relative overflow-hidden">
                        <div className="flex flex-col items-center gap-1.5 text-white">
                          <Loader2 className="w-6 h-6 animate-spin text-brand-blue" />
                          <span className="text-[11px]">Generating secure signed link...</span>
                        </div>
                      </div>
                    ) : signedSelfieUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxPhoto({
                            url: signedSelfieUrl,
                            title: `${selectedRepForInspection.repName} — Start Day Selfie`,
                            subtitle: `Captured at ${selectedRepForInspection.startDayTime || 'N/A'} • Front-Camera Visual Audit`,
                          })
                        }
                        aria-label="View full Start Day selfie photograph"
                        title="Click to display full photo"
                        className="w-full h-52 bg-slate-950 rounded-lg flex items-center justify-center border border-slate-300 relative overflow-hidden cursor-pointer group focus:outline-none focus:ring-2 focus:ring-brand-blue"
                      >
                        <img
                          src={signedSelfieUrl}
                          alt={`Selfie check-in for ${selectedRepForInspection.repName}`}
                          className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-slate-950/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-slate-900/90 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg border border-slate-700">
                            <Eye className="w-3.5 h-3.5" /> View full photo
                          </span>
                        </div>
                      </button>
                    ) : (
                      <div className="h-44 bg-slate-950 rounded-lg flex items-center justify-center text-slate-400 border border-slate-300 relative overflow-hidden">
                        <div className="text-center p-4">
                          <UserCheck className="w-8 h-8 text-slate-500 mx-auto mb-1.5" />
                          <span className="font-bold text-slate-300 block">
                            Front-Camera Selfie Evidence
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-1">
                            Time: {selectedRepForInspection.startDayTime || 'N/A'} • Front-Camera Visual Audit Only
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Start Day GPS Coordinates */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-slate-700">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                      Start Day Telemetry Audit
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Start Timestamp:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {selectedRepForInspection.startDayTime || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">GPS Accuracy:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {selectedRepForInspection.startGps
                            ? `±${selectedRepForInspection.startGps.accuracy}m`
                            : 'Not captured'}
                        </span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-200">
                        <span className="text-slate-500 block text-[10px]">GPS Starting Coordinate:</span>
                        <span className="font-mono font-semibold text-slate-900 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          {selectedRepForInspection.startGps?.coords || 'Not captured'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Handset Hardware Binding */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-slate-700">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Company Handset Binding
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Assigned Handset:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedRepForInspection.deviceId}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Battery Level:</span>
                    {typeof selectedRepForInspection.batteryLevel === 'number' ? (
                      <span
                        className={cn(
                          'font-mono font-bold',
                          getBatteryStatus(selectedRepForInspection.batteryLevel).statusColor
                        )}
                      >
                        {selectedRepForInspection.batteryLevel}% (
                        {getBatteryStatus(selectedRepForInspection.batteryLevel).statusLabel})
                      </span>
                    ) : (
                      <span className="font-mono font-semibold text-slate-500">N/A (Non-Field)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRepForInspection(null)}
                className="text-xs"
              >
                Close Telemetry Inspection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Dialog */}
      {rejectingRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="font-bold text-base text-slate-900">
              Reject Non-Visit Workday Request
            </h3>
            <p className="text-xs text-slate-600">
              A mandatory justification is required when rejecting a salesperson&apos;s non-visit request.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="State the operational reason for rejecting this non-visit workday..."
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-brand-blue focus:outline-none"
              required
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRejectingRequestId(null);
                  setRejectionReason('');
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={!rejectionReason.trim()}
                onClick={() => {
                  handleReviewNonVisit(rejectingRequestId, 'rejected', rejectionReason.trim());
                  setRejectingRequestId(null);
                  setRejectionReason('');
                }}
                className="text-xs font-bold bg-red-700 hover:bg-red-800 text-white"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Record Leave Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">
                Record Approved Leave
              </h3>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-900">Select Salesperson *</label>
                <select
                  value={selectedRepForLeave}
                  onChange={(e) => setSelectedRepForLeave(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-brand-blue focus:outline-none"
                >
                  {mergedReps.map((r) => (
                    <option key={r.repId} value={r.repId}>
                      {r.repName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-900">Leave Category *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="w-full h-9 px-3 border border-slate-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-brand-blue focus:outline-none"
                >
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="compassionate">Compassionate Leave</option>
                  <option value="training">Approved Technical Training</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-900">Start Date *</label>
                  <Input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-900">End Date *</label>
                  <Input
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-900">HR / Approval Notes</label>
                <textarea
                  rows={2}
                  value={leaveNotes}
                  onChange={(e) => setLeaveNotes(e.target.value)}
                  placeholder="Reference HR approval ticket or emergency notice..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-blue focus:outline-none font-medium"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLeaveModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleRecordLeave}
                className="text-xs font-bold bg-brand-blue hover:bg-brand-blue-700 text-white"
              >
                Save Approved Leave
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Full Photo Lightbox Viewer */}
      <PhotoLightboxModal photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
    </div>
  );
};
