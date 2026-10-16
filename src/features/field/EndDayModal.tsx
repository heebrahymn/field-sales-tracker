import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFieldSession } from '@/context/FieldSessionContext';
import { Button } from '@/components/ui/button';
import {
  X,
  Lock,
  AlertTriangle,
  CheckCircle2,
  CalendarCheck,
  MapPin,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface EndDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCheckOutVisit?: () => void;
  onOpenExceptionModal?: () => void;
}

export const EndDayModal: React.FC<EndDayModalProps> = ({
  isOpen,
  onClose,
  onOpenCheckOutVisit,
  onOpenExceptionModal,
}) => {
  const { currentUser, setAttendanceStatus } = useAuth();
  const {
    activeVisit,
    endDay,
    startDayTime,
    completedVisits,
    exceptions,
  } = useFieldSession();

  if (!isOpen) return null;

  const verifiedCount = completedVisits.filter((v) => v.verificationStatus === 'location_verified').length;
  const unverifiedCount = completedVisits.filter((v) => v.verificationStatus === 'manager_approved_unverified').length;

  const handleConfirmEndDay = () => {
    const success = endDay();
    if (success) {
      setAttendanceStatus('ended');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-brand-blue uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                PRD §6.1 Attendance Closure
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-base mt-1">
              End Workday & Final Summary
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Salesperson: {currentUser.name} ({currentUser.employeeId})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-slate-700">
          {/* HARD BLOCK CASE: Open Active Visit */}
          {activeVisit ? (
            <div className="space-y-3">
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <Lock className="w-5 h-5 text-amber-800 shrink-0" />
                  <span>End Day Blocked: Active Visit Open</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Per <strong>PRD §6.1 and Rule AT-03</strong>, you cannot end your workday while a physical visit session remains open.
                </p>
                <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200 text-[11px] text-slate-800 space-y-1">
                  <p className="font-bold text-slate-900">{activeVisit.branchName}</p>
                  <p className="text-slate-600 font-mono text-[10px]">{activeVisit.address}</p>
                  <p className="text-brand-blue font-semibold">
                    Checked in at {activeVisit.checkInTime} • Timer in progress
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Resolution Options:
                </p>
                <div className="space-y-2 text-[11px]">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenCheckOutVisit?.();
                    }}
                    className="w-full text-left p-2.5 bg-white border border-brand-blue rounded-lg hover:bg-blue-50/50 transition-colors flex items-center justify-between font-medium text-slate-900"
                  >
                    <span>1. Proceed to normal <strong>Check Out & Log</strong></span>
                    <ArrowRight className="w-3.5 h-3.5 text-brand-blue" />
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      onOpenExceptionModal?.();
                    }}
                    className="w-full text-left p-2.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between font-medium text-slate-900"
                  >
                    <span>2. File an <strong>Abandoned / Failure Exception</strong></span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ALLOWED CASE: Normal End Day */
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-[11px] text-emerald-900 leading-relaxed">
                  <strong>All visits closed:</strong> You are clear to end your field workday. Your final GPS position and daily operational metrics will be logged to your daily attendance record.
                </div>
              </div>

              {/* Day Metrics Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block">
                  Today&apos;s Field Metrics
                </span>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Day Started At</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      {startDayTime || '08:05 WAT'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">End Day Time</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WAT
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-200">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Verified</span>
                    <span className="font-bold text-emerald-700 text-base">{verifiedCount}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Unverified</span>
                    <span className="font-bold text-amber-700 text-base">{unverifiedCount}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Exceptions</span>
                    <span className="font-bold text-purple-700 text-base">{exceptions.length}</span>
                  </div>
                </div>
              </div>

              {/* Simulated GPS Final Coordinate */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="text-slate-800 font-bold block">Closing GPS Fix (Simulated)</span>
                    <span className="text-slate-500 text-[10px]">6.5312° N, 3.3289° E • Accuracy ±14m</span>
                  </div>
                </div>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 rounded-b-2xl shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-xs h-11 px-4 border-slate-300"
          >
            {activeVisit ? 'Close Dialog' : 'Cancel'}
          </Button>

          {!activeVisit && (
            <Button
              variant="default"
              onClick={handleConfirmEndDay}
              className="text-xs h-11 px-5 font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-1.5"
            >
              <CalendarCheck className="w-4 h-4" /> Confirm & End Workday
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
