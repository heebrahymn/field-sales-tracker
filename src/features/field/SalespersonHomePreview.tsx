import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MeetingLogModal } from '@/features/field/MeetingLogModal';
import {
  MapPin,
  Building2,
  CalendarCheck,
  RefreshCw,
  Play,
  Square,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Lock,
  AlertTriangle,
} from 'lucide-react';

export const SalespersonHomePreview: React.FC = () => {
  const { currentUser, attendanceStatus, setAttendanceStatus } = useAuth();
  const [activeVisit, setActiveVisit] = useState<boolean>(true);
  const [isMeetingLogOpen, setIsMeetingLogOpen] = useState<boolean>(false);
  const [showEndDayBlockedModal, setShowEndDayBlockedModal] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('All records synced');
  const [completedVisitsCount, setCompletedVisitsCount] = useState<number>(3);
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  const activeBranch = {
    name: 'Apex Heavy Logistics Fleet Depot',
    address: 'Apapa Commercial Port Zone, Lagos',
    branchCode: 'BR-LAG-014',
    geofenceDistance: '38m',
    checkinTime: '09:42',
    elapsed: '28m 15s',
  };

  const handleStartEndDayClick = () => {
    if (activeVisit) {
      // Context-aware enforcement: Block End Day while normal visit is open (PRD §6.1)
      setShowEndDayBlockedModal(true);
      return;
    }

    if (attendanceStatus === 'started') {
      setAttendanceStatus('ended');
      setLastNotification('Day Ended: Final GPS coordinate captured and saved to offline queue.');
    } else {
      setAttendanceStatus('started');
      setLastNotification('Day Started: Front camera selfie & fresh GPS (±14m) verified.');
    }
  };

  const handleNewVisitClick = () => {
    if (activeVisit) {
      // Context-aware enforcement: Scroll to / highlight active visit
      setLastNotification('Active visit is already open. Only 1 normal physical visit permitted at a time (AT-04).');
      return;
    }
    // Start visit
    setActiveVisit(true);
    setLastNotification('New visit initiated: Fresh GPS and branch geofence check (200m) validated.');
  };

  const handleMeetingLogSubmitted = (onTime: boolean) => {
    setActiveVisit(false);
    setCompletedVisitsCount((c) => c + 1);
    setLastNotification(
      onTime
        ? 'Visit closed: Meeting log submitted on time. Status: Location Verified.'
        : 'Visit closed: Meeting log deferred. You have 2 hours to complete without penalty.'
    );
  };

  const handleSyncNow = () => {
    setSyncStatus('Syncing events...');
    setTimeout(() => {
      setSyncStatus('All records acknowledged by server');
      setLastNotification('Sync complete: Server verified sequence, idempotency, and GPS timestamps.');
    }, 1000);
  };

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto select-none">
      {/* Toast Notification Banner */}
      {lastNotification && (
        <div className="bg-slate-900 text-white p-3 rounded-xl text-xs flex items-center justify-between shadow-md border border-slate-800 animate-in fade-in duration-200">
          <span className="leading-tight font-medium pr-2">{lastNotification}</span>
          <button
            onClick={() => setLastNotification(null)}
            className="text-slate-400 hover:text-white font-bold px-1.5 py-0.5 rounded text-xs shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Salesperson Greeting & Day Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">
            Field Sales Operations
          </span>
          <h2 className="text-lg font-bold text-slate-900 leading-tight">
            Hello, {currentUser.name.split(' ')[0]}
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            {currentUser.marketName} • ID: {currentUser.employeeId}
          </p>
        </div>

        <div className="text-right flex flex-col items-end gap-1">
          <StatusBadge
            status={attendanceStatus === 'started' ? 'started' : 'scheduled'}
            size="sm"
          />
          <span className="text-[11px] text-slate-500 font-mono font-medium">
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>

      {/* ================= ACTIVE VISIT CARD ================= */}
      {activeVisit ? (
        <Card className="border-brand-blue bg-blue-50/40 shadow-sm border-2">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-blue text-white text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#E8CF2F] animate-pulse" />
                Active Client Visit
              </span>
              <span className="text-xs font-mono font-bold text-brand-blue flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                <Clock className="w-3.5 h-3.5" />
                {activeBranch.elapsed}
              </span>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base">{activeBranch.name}</h3>
              <p className="text-xs text-slate-700 flex items-center gap-1 mt-0.5 font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                {activeBranch.address} • Branch #{activeBranch.branchCode}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-blue-100">
              <span className="text-emerald-800 font-semibold flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                Within Geofence ({activeBranch.geofenceDistance} / 200m)
              </span>
              <span className="text-slate-600 font-medium text-[11px]">Check-in: {activeBranch.checkinTime}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                size="default"
                className="w-full text-xs font-bold h-12 min-h-[48px] bg-white border-slate-300 hover:bg-slate-50"
                onClick={() => setIsMeetingLogOpen(true)}
              >
                Log Meeting
              </Button>
              <Button
                variant="default"
                size="default"
                className="w-full text-xs font-bold h-12 min-h-[48px] bg-brand-blue hover:bg-brand-blue-700 text-white"
                onClick={() => setIsMeetingLogOpen(true)}
              >
                Check Out
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border-slate-200 bg-slate-50/60 p-4 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mx-auto">
            <MapPin className="w-5 h-5 text-slate-500" />
          </div>
          <h3 className="font-bold text-sm text-slate-800">No Active Visit In Progress</h3>
          <p className="text-xs text-slate-600 max-w-xs mx-auto">
            Ready for next client visit. Check-in captures fresh GPS reading and prompts for live premises photograph.
          </p>
          <Button
            size="default"
            className="font-bold text-xs bg-brand-blue hover:bg-brand-blue-700 text-white h-11 min-h-[48px] px-6"
            onClick={() => setActiveVisit(true)}
          >
            Start New Client Visit
          </Button>
        </Card>
      )}

      {/* ================= PRIMARY CONTEXT-AWARE FIELD ACTION TILES ================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Field Actions (Context-Aware)
          </h3>
          <span className="text-[10px] text-slate-500 font-medium">AT-04 Rule Enforced</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Tile 1: Start / End Day (Context-Aware Block if visit active) */}
          <button
            onClick={handleStartEndDayClick}
            className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left min-h-[112px] ${
              activeVisit
                ? 'bg-slate-100/80 border-slate-300 opacity-90 cursor-not-allowed'
                : 'bg-white border-slate-200 hover:border-brand-blue active:scale-[0.98] shadow-xs'
            }`}
          >
            <div className={`p-2.5 rounded-lg mb-2 ${
              activeVisit
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : attendanceStatus === 'started'
                ? 'bg-amber-100 text-amber-900'
                : 'bg-emerald-100 text-emerald-900'
            }`}>
              {activeVisit ? (
                <Lock className="w-5 h-5 text-amber-900" />
              ) : attendanceStatus === 'started' ? (
                <Square className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current" />
              )}
            </div>

            <span className="font-bold text-slate-900 text-sm flex items-center gap-1">
              {activeVisit ? 'End Day Blocked' : attendanceStatus === 'started' ? 'End Day' : 'Start Day'}
            </span>

            <span className="text-[11px] text-slate-600 font-medium mt-0.5 leading-tight">
              {activeVisit
                ? 'Close active visit first (or exception)'
                : attendanceStatus === 'started'
                ? 'Capture final GPS & close'
                : 'Selfie & GPS check'}
            </span>
          </button>

          {/* Tile 2: Visit Client / Resume Active Visit (Context-Aware) */}
          <button
            onClick={handleNewVisitClick}
            className={`flex flex-col items-start p-4 rounded-xl transition-all text-left min-h-[112px] ${
              activeVisit
                ? 'bg-blue-50 border-2 border-brand-blue shadow-xs text-brand-blue'
                : 'bg-brand-blue text-white shadow-sm hover:bg-brand-blue-700 active:scale-[0.98]'
            }`}
          >
            <div className={`p-2.5 rounded-lg mb-2 ${
              activeVisit ? 'bg-brand-blue text-white shadow-xs' : 'bg-white/20 text-white'
            }`}>
              <MapPin className="w-5 h-5" />
            </div>

            <span className={`font-bold text-sm ${activeVisit ? 'text-brand-blue' : 'text-white'}`}>
              {activeVisit ? 'Resume Active Visit' : 'Visit Client'}
            </span>

            <span className={`text-[11px] mt-0.5 font-medium leading-tight ${
              activeVisit ? 'text-blue-900 font-semibold' : 'text-blue-100'
            }`}>
              {activeVisit
                ? '1 visit in progress (Parallel blocked)'
                : 'Check-in & photo'}
            </span>
          </button>

          {/* Tile 3: Add Branch */}
          <button
            onClick={() => alert('Demo: Add Branch & Propose GPS Pin registration form opens with automated duplicate branch checks.')}
            className="flex flex-col items-start p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-brand-blue active:scale-[0.98] transition-all text-left min-h-[104px]"
          >
            <div className="p-2.5 rounded-lg mb-2 bg-blue-50 text-brand-blue">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 text-sm">Add Branch</span>
            <span className="text-[11px] text-slate-600 font-medium mt-0.5">Propose new site pin</span>
          </button>

          {/* Tile 4: My Exceptions */}
          <button
            onClick={() => alert('Demo: My Exceptions workbench opens. Allows salesperson to submit GPS failure, device failure, or missed visit claims.')}
            className="flex flex-col items-start p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-brand-blue active:scale-[0.98] transition-all text-left min-h-[104px]"
          >
            <div className="p-2.5 rounded-lg mb-2 bg-amber-50 text-amber-800 border border-amber-200">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 text-sm">My Exceptions</span>
            <span className="text-[11px] text-slate-600 font-medium mt-0.5">GPS / device failure</span>
          </button>

          {/* Tile 5: Request Non-Visit Day */}
          <button
            onClick={() => alert('Demo: Request Non-Visit Day (training, proposal preparation (office), virtual meetings). Subject to Sales Head approval.')}
            className="flex flex-col items-start p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-brand-blue active:scale-[0.98] transition-all text-left min-h-[104px]"
          >
            <div className="p-2.5 rounded-lg mb-2 bg-purple-50 text-purple-900 border border-purple-200">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 text-sm">Non-Visit Request</span>
            <span className="text-[11px] text-slate-600 font-medium mt-0.5">Proposal prep / training</span>
          </button>

          {/* Tile 6: Sync Now */}
          <button
            onClick={handleSyncNow}
            className="flex flex-col items-start p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-brand-blue active:scale-[0.98] transition-all text-left min-h-[104px]"
          >
            <div className="p-2.5 rounded-lg mb-2 bg-emerald-50 text-emerald-900 border border-emerald-200">
              <RefreshCw className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 text-sm">Sync Now</span>
            <span className="text-[11px] text-slate-600 font-medium mt-0.5 truncate w-full">{syncStatus}</span>
          </button>
        </div>
      </div>

      {/* ================= TODAY'S ACTIVITY SUMMARY (FICTIONAL NAMES) ================= */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Today&apos;s Field Activity Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 font-semibold">Verified</p>
              <p className="text-xl font-bold text-emerald-800">{completedVisitsCount}</p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 font-semibold">Unverified</p>
              <p className="text-xl font-bold text-amber-800">1</p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 font-semibold">Pending Sync</p>
              <p className="text-xl font-bold text-slate-800">0</p>
            </div>
          </div>

          <div className="text-xs text-slate-600 space-y-1.5 pt-1 border-t border-slate-200">
            {/* Record 1 (Fictional Name) */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <div>
                <p className="text-slate-900 font-bold truncate max-w-[210px]">Equatorial Energy Fleet Terminal</p>
                <p className="text-[10px] text-slate-500 font-mono">08:50 - 09:25 • Lagos Mainland</p>
              </div>
              <StatusBadge status="location_verified" size="sm" />
            </div>

            {/* Record 2 (Fictional Name) */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <div>
                <p className="text-slate-900 font-bold truncate max-w-[210px]">Zenith Logistics & Transit Hub</p>
                <p className="text-[10px] text-slate-500 font-mono">10:15 - 11:00 • Ikeja Industrial Zone</p>
              </div>
              <StatusBadge status="location_verified" size="sm" />
            </div>

            {/* Record 3 (Fictional Name) */}
            <div className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-slate-900 font-bold truncate max-w-[210px]">Pinnacle Cargo Distribution Hub</p>
                <p className="text-[10px] text-slate-500 font-mono">11:40 - 12:15 • Victoria Island Hub</p>
              </div>
              <StatusBadge status="manager_approved_unverified" size="sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================= END DAY BLOCKED MODAL (PRD §6.1) ================= */}
      {showEndDayBlockedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-base text-slate-900">
                Cannot End Day: Active Visit Open
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                PRD §6.1 Hard Block: You currently have an open physical visit at <strong className="text-slate-900">{activeBranch.name}</strong>.
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-800" />
                Required Action:
              </p>
              <p className="text-[11px] leading-tight text-amber-800">
                You must either <strong>Check Out</strong> with current GPS location, or submit an <strong>Abandoned Visit Correction Exception</strong> before closing your workday.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <Button
                variant="default"
                className="w-full font-bold h-11 bg-brand-blue"
                onClick={() => {
                  setShowEndDayBlockedModal(false);
                  setIsMeetingLogOpen(true);
                }}
              >
                Proceed to Check Out & Log
              </Button>
              <Button
                variant="outline"
                className="w-full text-xs h-10 border-slate-300"
                onClick={() => setShowEndDayBlockedModal(false)}
              >
                Return to Home
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MEETING LOG FORM MODAL ================= */}
      <MeetingLogModal
        isOpen={isMeetingLogOpen}
        onClose={() => setIsMeetingLogOpen(false)}
        branchName={activeBranch.name}
        onSubmitted={handleMeetingLogSubmitted}
      />
    </div>
  );
};
