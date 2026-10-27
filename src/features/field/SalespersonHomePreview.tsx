import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFieldSession } from '@/context/FieldSessionContext';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MeetingLogModal } from '@/features/field/MeetingLogModal';
import { StartDayModal } from '@/features/field/StartDayModal';
import { EndDayModal } from '@/features/field/EndDayModal';
import { NonVisitDayModal } from '@/features/field/NonVisitDayModal';
import { RegisterBranchModal } from '@/features/field/RegisterBranchModal';
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
  Smartphone,
  ChevronRight,
} from 'lucide-react';

interface SalespersonHomePreviewProps {
  onNavigateTab?: (tab: 'home' | 'clients' | 'visit' | 'exceptions' | 'sync' | 'profile') => void;
}

export const SalespersonHomePreview: React.FC<SalespersonHomePreviewProps> = ({ onNavigateTab }) => {
  const { currentUser } = useAuth();
  const {
    workdayStatus,
    startDayTime,
    activeVisit,
    completedVisits,
    exceptions,
    isOnline,
    syncState,
    triggerSyncNow,
    sessionNotice,
    setSessionNotice,
    checkOutVisit,
  } = useFieldSession();

  // Modals state
  const [isStartDayModalOpen, setIsStartDayModalOpen] = useState(false);
  const [isEndDayModalOpen, setIsEndDayModalOpen] = useState(false);
  const [isNonVisitModalOpen, setIsNonVisitModalOpen] = useState(false);
  const [isRegisterBranchModalOpen, setIsRegisterBranchModalOpen] = useState(false);
  const [isMeetingLogOpen, setIsMeetingLogOpen] = useState(false);

  const verifiedVisitsCount = completedVisits.filter((v) => v.verificationStatus === 'location_verified').length;
  const unverifiedVisitsCount = completedVisits.filter((v) => v.verificationStatus === 'manager_approved_unverified').length;

  const handleStartEndDayClick = () => {
    if (workdayStatus === 'started') {
      setIsEndDayModalOpen(true);
    } else if (workdayStatus === 'ended') {
      setSessionNotice("Today's field workday has already concluded. Attendance is recorded.");
    } else {
      setIsStartDayModalOpen(true);
    }
  };

  const handleVisitActionClick = () => {
    if (onNavigateTab) {
      onNavigateTab('visit');
    }
  };

  const handleMeetingLogSubmitted = (onTime: boolean) => {
    checkOutVisit(false, onTime ? { completed: true } : undefined);
    setIsMeetingLogOpen(false);
  };

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto select-none">
      {/* Toast Notification Banner */}
      {sessionNotice && (
        <div className="bg-slate-900 text-white p-3 rounded-xl text-xs flex items-center justify-between shadow-md border border-slate-800 animate-in fade-in duration-200">
          <span className="leading-tight font-medium pr-2">{sessionNotice}</span>
          <button
            onClick={() => setSessionNotice(null)}
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
            status={workdayStatus === 'started' ? 'started' : workdayStatus === 'ended' ? 'ended' : 'scheduled'}
            size="sm"
          />
          <span className="text-[11px] text-slate-500 font-mono font-medium">
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            {startDayTime && workdayStatus === 'started' && ` • On Duty: ${startDayTime}`}
          </span>
        </div>
      </div>

      {/* Assigned Company Device Quick Strip (Profile -> My Device) */}
      <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-50 text-brand-blue flex items-center justify-center shrink-0">
            <Smartphone className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-semibold text-slate-900">
              {currentUser.assignedDevice?.assetTag || 'CC-DEV-LAG-019'}
            </span>
            <span className="text-[10px] text-slate-500 ml-1.5 hidden sm:inline">
              ({currentUser.assignedDevice?.model || 'Samsung Galaxy A15 Enterprise'})
            </span>
          </div>
        </div>
        <button
          onClick={() => onNavigateTab?.('profile')}
          className="text-brand-blue hover:text-blue-800 font-bold text-[11px] flex items-center gap-1"
        >
          My Device & Issues
          <ChevronRight className="w-3 h-3" />
        </button>
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
                Started {activeVisit.checkInTime}
              </span>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base">{activeVisit.branchName}</h3>
              <p className="text-xs text-slate-700 flex items-center gap-1 mt-0.5 font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                {activeVisit.address} • Branch #{activeVisit.branchCode}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-blue-100">
              <span className="text-emerald-800 font-semibold flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                Within Geofence ({activeVisit.geofenceDistanceMeters}m / 200m)
              </span>
              <span className="text-slate-600 font-medium text-[11px]">
                GPS Fix: ±{activeVisit.gpsAccuracyMeters}m
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                size="default"
                className="w-full text-xs font-bold h-12 min-h-[48px] bg-white border-slate-300 hover:bg-slate-50"
                onClick={() => setIsMeetingLogOpen(true)}
              >
                Draft Meeting Log
              </Button>
              <Button
                variant="default"
                size="default"
                className="w-full text-xs font-bold h-12 min-h-[48px] bg-brand-blue hover:bg-brand-blue-700 text-white"
                onClick={handleVisitActionClick}
              >
                Go to Visit View
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
            Ready for your next client visit. Check-in captures fresh GPS reading and prompts for live premises photograph.
          </p>
          <Button
            size="default"
            className="font-bold text-xs bg-brand-blue hover:bg-brand-blue-700 text-white h-11 min-h-[48px] px-6"
            onClick={handleVisitActionClick}
          >
            Start Client Visit
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
          {/* Tile 1: Start / End Day */}
          <button
            onClick={handleStartEndDayClick}
            className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left min-h-[112px] ${
              activeVisit && workdayStatus === 'started'
                ? 'bg-amber-50/70 border-amber-300 shadow-2xs hover:bg-amber-100/50'
                : 'bg-white border-slate-200 hover:border-brand-blue active:scale-[0.98] shadow-xs'
            }`}
          >
            <div className={`p-2.5 rounded-lg mb-2 ${
              activeVisit && workdayStatus === 'started'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : workdayStatus === 'started'
                ? 'bg-amber-100 text-amber-900'
                : workdayStatus === 'ended'
                ? 'bg-slate-100 text-slate-700'
                : 'bg-emerald-100 text-emerald-900'
            }`}>
              {activeVisit && workdayStatus === 'started' ? (
                <Lock className="w-5 h-5 text-amber-900" />
              ) : workdayStatus === 'started' ? (
                <Square className="w-5 h-5 fill-current" />
              ) : workdayStatus === 'ended' ? (
                <CheckCircle2 className="w-5 h-5 text-slate-700" />
              ) : (
                <Play className="w-5 h-5 fill-current" />
              )}
            </div>

            <span className="font-bold text-slate-900 text-sm flex items-center gap-1">
              {activeVisit && workdayStatus === 'started'
                ? 'End Day (Blocked)'
                : workdayStatus === 'started'
                ? 'End Workday'
                : workdayStatus === 'ended'
                ? 'Workday Completed'
                : 'Start Workday'}
            </span>

            <span className="text-[11px] text-slate-600 font-medium mt-0.5 leading-tight">
              {activeVisit && workdayStatus === 'started'
                ? 'Active visit must close first (PRD §6.1)'
                : workdayStatus === 'started'
                ? 'Capture final GPS & close'
                : workdayStatus === 'ended'
                ? "Today's operational log saved"
                : 'Selfie & GPS check'}
            </span>
          </button>

          {/* Tile 2: Visit Client / Resume Active Visit (Context-Aware) */}
          <button
            onClick={handleVisitActionClick}
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
                ? '1 in progress (AT-04 single visit)'
                : 'Check-in & photo'}
            </span>
          </button>

          {/* Tile 3: Add Client */}
          <button
            onClick={() => setIsRegisterBranchModalOpen(true)}
            className="flex flex-col items-start p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-brand-blue active:scale-[0.98] transition-all text-left min-h-[104px]"
          >
            <div className="p-2.5 rounded-lg mb-2 bg-blue-50 text-brand-blue">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 text-sm">Add Client</span>
            <span className="text-[11px] text-slate-600 font-medium mt-0.5">Register a new business client</span>
          </button>

          {/* Tile 4: My Exceptions */}
          <button
            onClick={() => onNavigateTab ? onNavigateTab('exceptions') : alert('Open Exceptions')}
            className="flex flex-col items-start p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-brand-blue active:scale-[0.98] transition-all text-left min-h-[104px]"
          >
            <div className="p-2.5 rounded-lg mb-2 bg-amber-50 text-amber-800 border border-amber-200">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 text-sm">My Exceptions</span>
            <span className="text-[11px] text-slate-600 font-medium mt-0.5">
              {exceptions.length} filed ({exceptions.filter(e => e.status === 'pending_review').length} pending)
            </span>
          </button>

          {/* Tile 5: Request Non-Visit Day */}
          <button
            onClick={() => setIsNonVisitModalOpen(true)}
            className="flex flex-col items-start p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-brand-blue active:scale-[0.98] transition-all text-left min-h-[104px]"
          >
            <div className="p-2.5 rounded-lg mb-2 bg-purple-50 text-purple-900 border border-purple-200">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 text-sm">Non-Visit Request</span>
            <span className="text-[11px] text-slate-600 font-medium mt-0.5">Office proposal prep / training</span>
          </button>

          {/* Tile 6: Sync Now */}
          <button
            onClick={triggerSyncNow}
            className="flex flex-col items-start p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-brand-blue active:scale-[0.98] transition-all text-left min-h-[104px]"
          >
            <div className={`p-2.5 rounded-lg mb-2 ${
              syncState === 'syncing' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
            }`}>
              <RefreshCw className={`w-5 h-5 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />
            </div>
            <span className="font-bold text-slate-900 text-sm">Sync Queue</span>
            <span className="text-[11px] text-slate-600 font-medium mt-0.5 truncate w-full">
              {syncState === 'syncing' ? 'Syncing...' : isOnline ? 'All synced' : 'Offline queue active'}
            </span>
          </button>
        </div>
      </div>

      {/* ================= TODAY'S ACTIVITY SUMMARY ================= */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Today&apos;s Field Activity Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 font-semibold">Verified</p>
              <p className="text-xl font-bold text-emerald-800">{verifiedVisitsCount}</p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 font-semibold">Unverified</p>
              <p className="text-xl font-bold text-amber-800">{unverifiedVisitsCount}</p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 font-semibold">Exceptions</p>
              <p className="text-xl font-bold text-purple-800">{exceptions.length}</p>
            </div>
          </div>

          <div className="text-xs text-slate-600 space-y-1.5 pt-1 border-t border-slate-200">
            {completedVisits.map((record) => (
              <div key={record.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                <div className="space-y-0.5">
                  <p className="text-slate-900 font-bold truncate max-w-[210px]">{record.branchName}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {record.checkInTime} - {record.checkOutTime} ({record.durationMinutes} min)
                    {record.flagRaised && <span className="text-amber-800 font-bold block">{record.flagRaised}</span>}
                  </p>
                </div>
                <StatusBadge status={record.verificationStatus} size="sm" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ================= MODALS ================= */}
      <StartDayModal
        isOpen={isStartDayModalOpen}
        onClose={() => setIsStartDayModalOpen(false)}
      />

      <EndDayModal
        isOpen={isEndDayModalOpen}
        onClose={() => setIsEndDayModalOpen(false)}
        onOpenCheckOutVisit={() => {
          setIsEndDayModalOpen(false);
          setIsMeetingLogOpen(true);
        }}
        onOpenExceptionModal={() => {
          setIsEndDayModalOpen(false);
          if (onNavigateTab) onNavigateTab('exceptions');
        }}
      />

      <NonVisitDayModal
        isOpen={isNonVisitModalOpen}
        onClose={() => setIsNonVisitModalOpen(false)}
      />

      <RegisterBranchModal
        isOpen={isRegisterBranchModalOpen}
        onClose={() => setIsRegisterBranchModalOpen(false)}
      />

      {activeVisit && (
        <MeetingLogModal
          isOpen={isMeetingLogOpen}
          onClose={() => setIsMeetingLogOpen(false)}
          branchName={activeVisit.branchName}
          onSubmitted={handleMeetingLogSubmitted}
        />
      )}
    </div>
  );
};
