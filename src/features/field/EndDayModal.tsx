import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFieldSession } from '@/context/FieldSessionContext';
import { attendanceService } from '@/services/attendanceService';
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
  Loader2,
  RefreshCw,
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
    attendanceRecord,
    onAttendanceEnded,
    isOnline,
    isAttendanceProvisional,
    enqueueOfflineEndDay,
  } = useFieldSession();

  // Fresh End Day GPS state
  const [gpsState, setGpsState] = useState<'acquiring' | 'acquired' | 'error'>('acquiring');
  const [gpsCoords, setGpsCoords] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    endTime: string;
    verifiedVisits: number;
    accuracy: number | null;
    provisionalOffline?: boolean;
  } | null>(null);

  // Acquire fresh GPS fix for End Day closure
  const acquireEndGps = useCallback(() => {
    setGpsState('acquiring');
    setGpsError(null);

    if (!navigator.geolocation?.getCurrentPosition) {
      setGpsState('error');
      setGpsError('Geolocation is not supported by your browser environment.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsCoords({
          lat: latitude,
          lng: longitude,
          accuracy: accuracy,
        });
        setGpsState('acquired');
      },
      (err) => {
        console.warn('[EndDayModal] Geolocation error:', err);
        setGpsState('error');
        if (err.code === 1) {
          setGpsError('Location permission denied. Please allow location access to record checkout coordinates.');
        } else if (err.code === 2) {
          setGpsError('GPS signal unavailable. Please ensure location services are enabled.');
        } else if (err.code === 3) {
          setGpsError('GPS acquisition timed out. Please retry.');
        } else {
          setGpsError(err.message || 'Failed to acquire closing GPS fix.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, []);

  useEffect(() => {
    if (isOpen && !activeVisit) {
      setSubmitError(null);
      setSuccessInfo(null);
      acquireEndGps();
    }
  }, [isOpen, activeVisit, acquireEndGps]);

  if (!isOpen) return null;

  const verifiedCount = completedVisits.filter((v) => v.verificationStatus === 'location_verified').length;
  const unverifiedCount = completedVisits.filter((v) => v.verificationStatus === 'manager_approved_unverified').length;

  const handleConfirmEndDay = async () => {
    if (activeVisit) {
      return; // strictly blocked by AT-03 rule
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formattedEnd = new Date().toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });

      if (
        !isOnline ||
        (typeof navigator !== 'undefined' && navigator.onLine === false) ||
        isAttendanceProvisional ||
        (attendanceRecord as any)?.status === 'pending_sync'
      ) {
        const offlineRes = await enqueueOfflineEndDay({
          latitude: gpsCoords?.lat,
          longitude: gpsCoords?.lng,
          accuracy: gpsCoords?.accuracy,
        });

        if (!offlineRes.success) {
          setSubmitError(offlineRes.error || 'Failed to queue offline End Day.');
          setIsSubmitting(false);
          return;
        }

        setAttendanceStatus('ended');
        setSuccessInfo({
          endTime: `${formattedEnd} ${currentUser.marketCode === 'NG' ? 'WAT' : 'CAT'}`,
          verifiedVisits: verifiedCount,
          accuracy: gpsCoords ? Math.round(gpsCoords.accuracy) : null,
          provisionalOffline: true,
        });

        setTimeout(() => {
          onClose();
        }, 1800);
        return;
      }

      // Find today's attendance record id
      let targetId = attendanceRecord?.id;
      if (!targetId) {
        const todayQuery = await attendanceService.getTodayAttendance(
          currentUser.id,
          currentUser.marketCode
        );
        if (todayQuery.data?.id) {
          targetId = todayQuery.data.id;
        }
      }

      if (targetId) {
        // Persist real End Day transition to Supabase
        const result = await attendanceService.endDayAttendance({
          attendanceId: targetId,
          userId: currentUser.id,
          latitude: gpsCoords?.lat,
          longitude: gpsCoords?.lng,
          accuracy: gpsCoords?.accuracy,
        });

        if (result.error) {
          setSubmitError(result.error.message);
          setIsSubmitting(false);
          return;
        }

        if (result.data) {
          onAttendanceEnded(result.data);
          setAttendanceStatus('ended');
        }
      } else {
        // In local test context without prior DB insert, call context endDay
        endDay();
        setAttendanceStatus('ended');
      }

      setSuccessInfo({
        endTime: `${formattedEnd} ${currentUser.marketCode === 'NG' ? 'WAT' : 'CAT'}`,
        verifiedVisits: verifiedCount,
        accuracy: gpsCoords ? Math.round(gpsCoords.accuracy) : null,
        provisionalOffline: false,
      });

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error('[EndDayModal] Error ending workday:', err);
      setSubmitError(err.message || 'Unexpected failure while ending workday.');
    } finally {
      setIsSubmitting(false);
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
              End Workday &amp; Final Summary
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Salesperson: {currentUser.name} ({currentUser.employeeId})
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-slate-700">
          {/* Success View */}
          {successInfo ? (
            <div
              className={`p-6 rounded-2xl text-center space-y-3 animate-in fade-in zoom-in-95 border ${
                successInfo.provisionalOffline
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-emerald-50 border-emerald-300'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-xs ${
                  successInfo.provisionalOffline
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4
                  className={`text-base font-bold ${
                    successInfo.provisionalOffline ? 'text-amber-950' : 'text-emerald-950'
                  }`}
                >
                  {successInfo.provisionalOffline
                    ? 'End Day Saved on Device (Provisional)'
                    : 'Workday Completed'}
                </h4>
                <p
                  className={`text-xs font-medium mt-0.5 ${
                    successInfo.provisionalOffline ? 'text-amber-800' : 'text-emerald-800'
                  }`}
                >
                  {successInfo.provisionalOffline
                    ? 'Closing GPS queued in durable IndexedDB journal. Will sync after upstream visit & attendance events.'
                    : 'End of day status and closing GPS coordinate recorded in Supabase.'}
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-left space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Day Started At:</span>
                  <span className="font-mono font-bold text-slate-800">{startDayTime || '08:00 WAT'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Workday Ended At:</span>
                  <span className="font-mono font-bold text-brand-blue">{successInfo.endTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Verified Visits:</span>
                  <span className="font-mono font-bold text-emerald-700">{successInfo.verifiedVisits}</span>
                </div>
                {successInfo.accuracy !== null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Closing GPS Accuracy:</span>
                    <span className="font-mono font-bold text-slate-800">±{successInfo.accuracy}m</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-slate-700">
                    {successInfo.provisionalOffline
                      ? 'Pending Sync (Provisional on Device)'
                      : 'Completed (Ended)'}
                  </span>
                </div>
              </div>
            </div>
          ) : activeVisit ? (
            /* HARD BLOCK CASE: Open Active Visit */
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
                    <span>1. Proceed to normal <strong>Check Out &amp; Log</strong></span>
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
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                      {currentUser.marketCode === 'NG' ? 'WAT' : 'CAT'}
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

              {/* Live Closing GPS Coordinate Status */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-slate-800 font-bold block">Closing GPS Fix</span>
                    {gpsState === 'acquired' && gpsCoords && (
                      <span className="text-slate-600 font-mono text-[10px]">
                        {gpsCoords.lat.toFixed(5)}°, {gpsCoords.lng.toFixed(5)}° • Accuracy ±{Math.round(gpsCoords.accuracy)}m
                      </span>
                    )}
                    {gpsState === 'acquiring' && (
                      <span className="text-slate-500 text-[10px] flex items-center gap-1">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" /> Acquiring position...
                      </span>
                    )}
                    {gpsState === 'error' && (
                      <span className="text-amber-700 text-[10px] block">
                        {gpsError || 'GPS fix optional for checkout closure'}
                      </span>
                    )}
                  </div>
                </div>
                {gpsState === 'error' ? (
                  <button
                    type="button"
                    onClick={acquireEndGps}
                    className="p-1 hover:bg-slate-100 rounded text-slate-500"
                    title="Retry GPS"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <Clock className="w-4 h-4 text-slate-400" />
                )}
              </div>

              {/* Submission Error Banner */}
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-900">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-[11px]">
                    <strong>End Day Failed:</strong> {submitError}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!successInfo && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 rounded-b-2xl shrink-0">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs h-11 px-4 border-slate-300"
            >
              {activeVisit ? 'Close Dialog' : 'Cancel'}
            </Button>

            {!activeVisit && (
              <Button
                variant="default"
                disabled={isSubmitting}
                onClick={handleConfirmEndDay}
                className="text-xs h-11 px-5 font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Closing Workday...
                  </>
                ) : (
                  <>
                    <CalendarCheck className="w-4 h-4" /> Confirm &amp; End Workday
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
