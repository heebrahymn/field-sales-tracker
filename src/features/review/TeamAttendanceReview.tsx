import React, { useState } from 'react';
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
    activityType: 'training' | 'proposal_prep' | 'virtual_meeting' | 'internal_review';
    reason: string;
    status: 'pending_approval' | 'approved' | 'rejected';
    requestedAt: string;
    managerDecision?: {
      action: 'approved' | 'rejected';
      reason: string;
      decidedAt: string;
    };
  };
}

export const TeamAttendanceReview: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'leave' | 'non_visit'>('all');
  const [selectedRepForInspection, setSelectedRepForInspection] = useState<SalesRepAttendance | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedRepForLeave, setSelectedRepForLeave] = useState<string>('');
  const [leaveType, setLeaveType] = useState<'annual' | 'sick' | 'compassionate' | 'training'>('annual');
  const [leaveStartDate, setLeaveStartDate] = useState('2026-10-20');
  const [leaveEndDate, setLeaveEndDate] = useState('2026-10-24');
  const [leaveNotes, setLeaveNotes] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [reps, setReps] = useState<SalesRepAttendance[]>([
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
        activityType: 'training',
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

  const handleApproveNonVisit = (repId: string, requestId: string, decision: 'approved' | 'rejected') => {
    setReps((prev) =>
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

  const handleRecordLeave = () => {
    if (!selectedRepForLeave) {
      alert('Please select a salesperson.');
      return;
    }

    setReps((prev) =>
      prev.map((r) =>
        r.repId === selectedRepForLeave
          ? {
              ...r,
              todayStatus: 'approved_leave',
            }
          : r
      )
    );

    setToastMessage(`Administrative Leave recorded for ${selectedRepForLeave} (${leaveStartDate} to ${leaveEndDate}).`);
    setTimeout(() => setToastMessage(null), 5000);
    setIsLeaveModalOpen(false);
    setLeaveNotes('');
  };

  const filteredReps = reps.filter((r) => {
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
          <Button
            variant="default"
            size="sm"
            className="text-xs font-bold bg-brand-blue hover:bg-brand-blue-700 text-white flex items-center gap-1.5"
            onClick={() => {
              setSelectedRepForLeave(reps[0]?.repId || '');
              setIsLeaveModalOpen(true);
            }}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Record Approved Leave
          </Button>
        </div>
      </div>

      {/* Pending Non-Visit Requests Alert Box (if any) */}
      {reps.some((r) => r.nonVisitRequest?.status === 'pending_approval') && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                Pending Non-Visit Workday Requests
              </h4>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
              1 Awaiting Manager Sign-off
            </span>
          </div>

          {reps
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
                    onClick={() => handleApproveNonVisit(r.repId, r.nonVisitRequest!.id, 'rejected')}
                  >
                    Reject Request
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs font-bold bg-brand-green-700 hover:bg-brand-green-800 text-white"
                    onClick={() => handleApproveNonVisit(r.repId, r.nonVisitRequest!.id, 'approved')}
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

            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                  statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                All Team ({reps.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                  statusFilter === 'active'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                Active on Field (3)
              </button>
              <button
                onClick={() => setStatusFilter('non_visit')}
                className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                  statusFilter === 'non_visit'
                    ? 'bg-blue-700 text-white'
                    : 'bg-blue-50 text-brand-blue border border-blue-200'
                }`}
              >
                Non-Visit Day (1)
              </button>
              <button
                onClick={() => setStatusFilter('leave')}
                className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                  statusFilter === 'leave'
                    ? 'bg-amber-700 text-white'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                On Leave (1)
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Team Roster Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Salesperson</th>
                <th className="py-3 px-4">Assigned Territory</th>
                <th className="py-3 px-4">Today's Status</th>
                <th className="py-3 px-4">Device &amp; Telemetry</th>
                <th className="py-3 px-4">Visits Today</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReps.map((rep) => {
                const isActive = rep.todayStatus === 'active_field';
                const isCompleted = rep.todayStatus === 'completed_day';
                const isNonVisit = rep.todayStatus === 'non_visit_day';
                const isLeave = rep.todayStatus === 'approved_leave';

                return (
                  <tr key={rep.repId} className="hover:bg-slate-50/70 transition-colors">
                    {/* Rep Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{rep.repName}</div>
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
                          Day Completed ({rep.startDayTime} - {rep.endDayTime})
                        </span>
                      )}
                      {isNonVisit && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-brand-blue border border-blue-300">
                          Non-Visit Workday (Training)
                        </span>
                      )}
                      {isLeave && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          Approved Leave
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

      {/* Inspect Rep Telemetry Modal */}
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
              {/* Selfie Check-in Demonstration Box */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-brand-blue" />
                  Live Front-Camera Start Day Selfie (Captured on Device)
                </span>
                <div className="h-36 bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 border border-slate-300 relative overflow-hidden">
                  <div className="text-center p-4">
                    <UserCheck className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                    <span className="font-bold text-slate-700 block">
                      Demonstration Front-Camera Selfie: {selectedRepForInspection.repName}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Time: {selectedRepForInspection.startDayTime || 'N/A'} • No Facial Recognition Claimed (MVP Scope)
                    </span>
                  </div>
                </div>
              </div>

              {/* Start Day GPS Coordinates */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-slate-700">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Start Day Telemetry Audit
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Start Time:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedRepForInspection.startDayTime || 'Not started today'}
                  </span>
                </div>
                {selectedRepForInspection.startGps && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">GPS Origin Coords:</span>
                      <span className="font-mono text-slate-800">
                        {selectedRepForInspection.startGps.coords}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Fix Accuracy:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        ±{selectedRepForInspection.startGps.accuracy}m (≤50m threshold)
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Bound Device Session:</span>
                  <span className="font-mono text-slate-800">{selectedRepForInspection.deviceId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Battery Level:</span>
                  <span className="font-mono text-emerald-800 font-bold">
                    {selectedRepForInspection.batteryLevel}% Available
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <Button
                variant="default"
                size="sm"
                className="text-xs font-bold bg-brand-blue hover:bg-brand-blue-700 text-white"
                onClick={() => setSelectedRepForInspection(null)}
              >
                Close Inspection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Record Approved Leave Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                  Administrative Action
                </span>
                <h3 className="text-base font-bold text-slate-900">Record Approved Team Leave</h3>
              </div>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 block">Select Salesperson:</label>
                <select
                  value={selectedRepForLeave}
                  onChange={(e) => setSelectedRepForLeave(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                >
                  {reps.map((r) => (
                    <option key={r.repId} value={r.repId}>
                      {r.repName} ({r.repId}) — {r.assignedTerritory}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 block">Leave Category:</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="annual">Annual Scheduled Leave</option>
                  <option value="sick">Certified Medical / Sick Leave</option>
                  <option value="compassionate">Compassionate / Emergency Leave</option>
                  <option value="training">Approved Full-Week Training</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-900 block">Start Date:</label>
                  <Input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="text-xs h-9 bg-slate-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-900 block">End Date:</label>
                  <Input
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="text-xs h-9 bg-slate-50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 block">Administrative Notes / HR Reference:</label>
                <textarea
                  rows={3}
                  value={leaveNotes}
                  onChange={(e) => setLeaveNotes(e.target.value)}
                  placeholder="Reference HR approval ticket number or reason..."
                  className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setIsLeaveModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                className="text-xs font-bold bg-brand-blue hover:bg-brand-blue-700 text-white"
                onClick={handleRecordLeave}
              >
                Commit Approved Leave
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
