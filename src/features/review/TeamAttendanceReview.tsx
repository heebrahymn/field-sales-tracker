import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  attendanceService,
  getMarketWorkDate,
  formatMarketTime,
  AttendanceRecord,
  AbsenceRequestRecord,
} from '@/services/attendanceService';
import { managementService } from '@/services/managementService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
} from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface SalesRepAttendance {
  repId: string;
  repName: string;
  email: string;
  phone: string;
  assignedTerritory: string;
  deviceId: string;
  batteryLevel: number;
  todayStatus: 'active_field' | 'completed_day' | 'non_visit_day' | 'approved_leave' | 'absent';
  startDayTime?: string;
  startGps?: {
    coords: string;
    accuracy: number;
  };
  selfieUrl?: string;
  endDayTime?: string;
  visitsCompletedToday: number;
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

export const TeamAttendanceReview: React.FC = () => {
  const { currentUser } = useAuth();

  const [selectedDate, setSelectedDate] = useState<string>(() =>
    getMarketWorkDate(currentUser?.marketCode)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'leave' | 'non_visit'>('all');
  const [selectedRepForInspection, setSelectedRepForInspection] = useState<SalesRepAttendance | null>(null);
  const [signedSelfieUrl, setSignedSelfieUrl] = useState<string | null>(null);
  const [isLoadingSelfie, setIsLoadingSelfie] = useState<boolean>(false);

  // Leave Recording Dialog State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedRepForLeave, setSelectedRepForLeave] = useState<string>('');
  const [leaveType, setLeaveType] = useState<'annual' | 'sick' | 'compassionate' | 'training'>('annual');
  const [leaveStartDate, setLeaveStartDate] = useState('2026-10-20');
  const [leaveEndDate, setLeaveEndDate] = useState('2026-10-24');
  const [leaveNotes, setLeaveNotes] = useState('');

  // Rejection Dialog State
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Real data from Supabase
  const [realAttendance, setRealAttendance] = useState<AttendanceRecord[]>([]);
  const [pendingAbsenceRequests, setPendingAbsenceRequests] = useState<AbsenceRequestRecord[]>([]);

  // Demonstration Fallback Baseline
  const [demoReps, setDemoReps] = useState<SalesRepAttendance[]>([
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
  ]);

  // Load live attendance and non-visit requests from Supabase
  const loadSupabaseData = useCallback(async () => {
    setIsLoadingData(true);
    const targetMarket = currentUser?.role === 'hq_admin' ? 'ALL' : currentUser?.marketCode || 'NG';

    try {
      const [attRes, absRes] = await Promise.all([
        attendanceService.getMarketAttendance(targetMarket, selectedDate),
        attendanceService.getPendingNonVisitRequests(targetMarket),
      ]);

      if (attRes.data) {
        setRealAttendance(attRes.data);
      }
      if (absRes.data) {
        setPendingAbsenceRequests(absRes.data);
      }
    } catch (err) {
      console.warn('[TeamAttendanceReview] Error loading live attendance:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUser?.role, currentUser?.marketCode, selectedDate]);

  useEffect(() => {
    loadSupabaseData();
  }, [loadSupabaseData]);

  // Merge real Supabase records with demonstration data
  const mergedReps: SalesRepAttendance[] = [
    // 1. Real records from Supabase attendance_days
    ...realAttendance.map((rec) => {
      const repFullName = rec.profiles?.full_name || 'Carbon Field Salesperson';
      const repEmpId = `CC-${rec.market_code}-${rec.user_id.slice(0, 4).toUpperCase()}`;

      let mappedStatus: SalesRepAttendance['todayStatus'] = 'absent';
      if (rec.status === 'started') mappedStatus = 'active_field';
      else if (rec.status === 'ended') mappedStatus = 'completed_day';
      else if (rec.status === 'approved_non_visit') mappedStatus = 'non_visit_day';
      else if (rec.status === 'approved_leave') mappedStatus = 'approved_leave';

      return {
        repId: repEmpId,
        repName: repFullName,
        email: rec.profiles?.email || 'salesperson@carboncarcare.com',
        phone: rec.profiles?.phone_number || '—',
        assignedTerritory: `${rec.market_code} Commercial Territory`,
        deviceId: rec.devices?.asset_tag || 'Assigned Handset',
        batteryLevel: 88,
        todayStatus: mappedStatus,
        startDayTime: formatMarketTime(rec.started_at, rec.market_code),
        endDayTime: rec.ended_at ? formatMarketTime(rec.ended_at, rec.market_code) : undefined,
        startGps: {
          coords: `${rec.start_latitude?.toFixed(4)}° N, ${rec.start_longitude?.toFixed(4)}° E`,
          accuracy: Math.round(rec.start_accuracy_m || 15),
        },
        selfieUrl: rec.start_selfie_url,
        visitsCompletedToday: 0,
        isRealRecord: true,
      };
    }),
    // 2. Demonstration records (filtered to avoid duplicating real employee names)
    ...demoReps.filter(
      (demo) => !realAttendance.some((real) => real.profiles?.full_name === demo.repName)
    ),
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
      const result = await attendanceService.reviewNonVisitRequest({
        requestId,
        decision,
        reason,
      });

      if (result.error) {
        setToastMessage(`Review failed: ${result.error.message}`);
        setTimeout(() => setToastMessage(null), 5000);
        return;
      }

      setToastMessage(
        decision === 'approved'
          ? `Non-visit workday request APPROVED. Attendance credit recorded; strictly 0 physical visit targets.`
          : `Non-visit workday request REJECTED.`
      );
      setTimeout(() => setToastMessage(null), 6000);

      // Refresh real Supabase requests & attendance
      loadSupabaseData();
    } catch (err: any) {
      setToastMessage(`Review error: ${err.message}`);
      setTimeout(() => setToastMessage(null), 5000);
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
    setTimeout(() => setToastMessage(null), 6000);
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
    setTimeout(() => setToastMessage(null), 5000);
    setIsLeaveModalOpen(false);
    setLeaveNotes('');
  };

  const filteredReps = mergedReps.filter((r) => {
    if (statusFilter === 'active' && r.todayStatus !== 'active_field' && r.todayStatus !== 'completed_day')
      return false;
    if (statusFilter === 'leave' && r.todayStatus !== 'approved_leave') return false;
    if (statusFilter === 'non_visit' && r.todayStatus !== 'non_visit_day') return false;
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
              Team Attendance &amp; Non-Visit Day Governance (PRD §6.2 &amp; §7.6)
            </h3>
            <p className="text-slate-700 font-medium mt-0.5">
              Inspect daily Start Day / End Day telemetry, live front-camera selfie check-ins, and company device bindings. Authorised non-visit workdays (training/office) count toward team attendance, but{' '}
              <span className="font-bold text-slate-900">never count toward physical visit targets</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Work Date Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold text-slate-900 bg-transparent focus:outline-none"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadSupabaseData}
            disabled={isLoadingData}
            className="text-xs font-semibold border-slate-300 bg-white"
            title="Refresh from Supabase"
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

      {/* Real Supabase Pending Non-Visit Requests (if any) */}
      {pendingAbsenceRequests.length > 0 && (
        <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-4 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-700" />
              <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wide">
                Live Salesperson Non-Visit Requests (Supabase Authorization Queue)
              </h4>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-200 text-purple-900">
              {pendingAbsenceRequests.length} Awaiting Authorization
            </span>
          </div>

          {pendingAbsenceRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-lg p-3.5 border border-purple-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">
                    {req.profiles?.full_name || 'Carbon Rep'}
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                    {req.category.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Date: {req.absence_date}
                  </span>
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
          ))}
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
                      <span className="font-bold text-slate-900">{r.repName} ({r.repId})</span>
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
                Active on Field ({mergedReps.filter((r) => r.todayStatus === 'active_field').length})
              </button>
              <button
                onClick={() => setStatusFilter('non_visit')}
                className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                  statusFilter === 'non_visit'
                    ? 'bg-blue-700 text-white'
                    : 'bg-blue-50 text-brand-blue border border-blue-200'
                }`}
              >
                Non-Visit Days ({mergedReps.filter((r) => r.todayStatus === 'non_visit_day').length})
              </button>
              <button
                onClick={() => setStatusFilter('leave')}
                className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                  statusFilter === 'leave'
                    ? 'bg-amber-700 text-white'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                Approved Leave ({mergedReps.filter((r) => r.todayStatus === 'approved_leave').length})
              </button>
            </div>
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
              {filteredReps.map((rep) => {
                const isActive = rep.todayStatus === 'active_field';
                const isCompleted = rep.todayStatus === 'completed_day';
                const isNonVisit = rep.todayStatus === 'non_visit_day';
                const isLeave = rep.todayStatus === 'approved_leave';

                return (
                  <tr key={rep.repId} className="hover:bg-slate-50/75 transition-colors">
                    {/* Salesperson */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        {rep.repName}
                        {rep.isRealRecord && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold border border-emerald-300">
                            Live Supabase
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {rep.repId} • {rep.phone}
                      </div>
                    </td>

                    {/* Territory */}
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {rep.assignedTerritory}
                    </td>

                    {/* Today Status */}
                    <td className="py-3.5 px-4">
                      {isActive && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Active on Field ({rep.startDayTime})
                        </span>
                      )}
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                          Day Completed ({rep.startDayTime} - {rep.endDayTime || 'Ended'})
                        </span>
                      )}
                      {isNonVisit && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-brand-blue border border-blue-300">
                          Non-Visit Workday
                        </span>
                      )}
                      {isLeave && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          Approved Leave
                        </span>
                      )}
                      {rep.todayStatus === 'absent' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
                          Not Started
                        </span>
                      )}
                    </td>

                    {/* Device & Battery */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-[11px] font-semibold text-slate-800 flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                        {rep.deviceId}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <Battery className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{rep.batteryLevel}% Battery</span>
                      </div>
                    </td>

                    {/* Visits Today */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {rep.visitsCompletedToday}
                        <span className="text-xs text-slate-500 font-normal ml-1">completed</span>
                      </div>
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
              })}
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
                  Attendance Telemetry • {selectedRepForInspection.repId}
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
              {/* Selfie Check-in Preview (via Time-Limited Signed URL) */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-brand-blue" />
                  Live Front-Camera Start Day Selfie (Private Storage)
                </span>

                <div className="h-44 bg-slate-950 rounded-lg flex items-center justify-center text-slate-400 border border-slate-300 relative overflow-hidden">
                  {isLoadingSelfie ? (
                    <div className="flex flex-col items-center gap-1.5 text-white">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-blue" />
                      <span className="text-[11px]">Generating secure signed link...</span>
                    </div>
                  ) : signedSelfieUrl ? (
                    <img
                      src={signedSelfieUrl}
                      alt={`Selfie check-in for ${selectedRepForInspection.repName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <UserCheck className="w-8 h-8 text-slate-500 mx-auto mb-1.5" />
                      <span className="font-bold text-slate-300 block">
                        Front-Camera Selfie Evidence
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        Time: {selectedRepForInspection.startDayTime || 'N/A'} • No Automated Biometrics Claimed (PRD §12)
                      </span>
                    </div>
                  )}
                </div>
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
                      ±{selectedRepForInspection.startGps?.accuracy || 12}m
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200">
                    <span className="text-slate-500 block text-[10px]">GPS Starting Coordinate:</span>
                    <span className="font-mono font-semibold text-slate-900 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      {selectedRepForInspection.startGps?.coords || '6.4531° N, 3.4211° E'}
                    </span>
                  </div>
                </div>
              </div>

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
                    <span className="font-mono font-bold text-emerald-700">
                      {selectedRepForInspection.batteryLevel}% (Healthy)
                    </span>
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
                      {r.repName} ({r.repId})
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
    </div>
  );
};
