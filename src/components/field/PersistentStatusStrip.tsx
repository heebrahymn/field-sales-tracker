import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFieldSession } from '@/context/FieldSessionContext';
import { StatusBadge } from '@/components/ui/status-badge';
import { MapPin, Wifi, WifiOff, Smartphone } from 'lucide-react';

interface PersistentStatusStripProps {
  onNavigateTab?: (tab: 'sync' | 'home' | 'clients' | 'visit' | 'exceptions' | 'profile') => void;
}

export const PersistentStatusStrip: React.FC<PersistentStatusStripProps> = ({ onNavigateTab }) => {
  const { currentUser, attendanceStatus } = useAuth();
  const {
    simulatedGpsAccuracy,
    isOnline,
    syncQueue,
    queueTelemetry,
    isAttendanceProvisional,
    activeVisit,
  } = useFieldSession();

  const gpsAccuracyMeters = simulatedGpsAccuracy;
  const idbUnsyncedCount =
    queueTelemetry.pendingCount +
    queueTelemetry.syncingCount +
    queueTelemetry.failedCount +
    queueTelemetry.needsReviewCount +
    queueTelemetry.blockedDependencyCount;
  const pendingCount =
    queueTelemetry.totalEvents > 0
      ? idbUnsyncedCount
      : syncQueue.filter((q) => q.syncStatus !== 'synced').length;

  const isProvisionalActive =
    isAttendanceProvisional || activeVisit?.verificationStatus === 'pending_sync';

  return (
    <div className="bg-white border-b border-slate-200 px-3.5 py-2 flex items-center justify-between text-xs shadow-xs select-none">
      <div className="flex items-center gap-2 overflow-x-auto py-0.5 no-scrollbar">
        {/* Attendance Status */}
        <StatusBadge
          status={
            isAttendanceProvisional
              ? 'pending_sync'
              : attendanceStatus === 'started'
              ? 'started'
              : 'scheduled'
          }
          size="sm"
        />

        {/* GPS Fix & Accuracy */}
        <div
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold tracking-tight ${
            gpsAccuracyMeters <= 50
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : gpsAccuracyMeters <= 100
              ? 'bg-blue-50 text-brand-blue border-blue-300'
              : 'bg-amber-50 text-amber-900 border-amber-300'
          }`}
          title={`GPS Fix: Horizontal Uncertainty ±${gpsAccuracyMeters}m (Threshold: ≤100m for visits, ≤50m for pins)`}
        >
          <MapPin className="w-3 h-3 shrink-0 text-emerald-700" />
          <span>GPS: ±{gpsAccuracyMeters}m</span>
        </div>

        {/* Sync Queue State - Accessible and Clickable Button (Fix P1 + Stage 3D IndexedDB Telemetry) */}
        <button
          type="button"
          id="btn-sync-queue-badge"
          onClick={() => onNavigateTab?.('sync')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1 hover:brightness-95 active:scale-95 ${
            !isOnline
              ? 'bg-red-50 text-red-800 border-red-300'
              : queueTelemetry.failedCount > 0 || queueTelemetry.needsReviewCount > 0
              ? 'bg-red-50 text-red-900 border-red-300'
              : pendingCount === 0
              ? 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200/80'
              : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
          }`}
          aria-label={`Sync Queue: ${!isOnline ? 'Offline Queue' : pendingCount === 0 ? 'Synced' : `${pendingCount} Queued`}. Tap to view offline queue and sync telemetry.`}
          title={!isOnline ? 'Device offline: tap to view local event queue' : pendingCount === 0 ? 'All local events synced: tap to view queue logs' : `${pendingCount} events queued: tap to view queue and sync`}
        >
          {isOnline ? (
            <Wifi className="w-3 h-3 text-emerald-700 shrink-0" />
          ) : (
            <WifiOff className="w-3 h-3 text-red-600 shrink-0" />
          )}
          <span>
            {!isOnline
              ? `Offline (${pendingCount} Queued)`
              : pendingCount === 0
              ? 'Synced'
              : `${pendingCount} Queued${isProvisionalActive ? ' • Provisional' : ''}`}
          </span>
        </button>
      </div>

      {/* Device & Market identifier with improved contrast */}
      <div className="hidden sm:flex items-center gap-2 text-slate-700 font-semibold text-[11px]">
        <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          <Smartphone className="w-3 h-3 text-slate-600" />
          {currentUser.assignedDevice?.assetTag || 'Company Phone'}
        </span>
        <span className="text-slate-300">•</span>
        <span className="text-slate-600">{currentUser.marketCode} ({currentUser.timezone.split('/')[1]})</span>
      </div>
    </div>
  );
};
