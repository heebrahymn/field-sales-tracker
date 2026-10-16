import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { StatusBadge } from '@/components/ui/status-badge';
import { MapPin, Wifi, Smartphone } from 'lucide-react';

export const PersistentStatusStrip: React.FC = () => {
  const { currentUser, attendanceStatus, gpsAccuracyMeters, syncQueueCount } = useAuth();

  return (
    <div className="bg-white border-b border-slate-200 px-3.5 py-2 flex items-center justify-between text-xs shadow-xs select-none">
      <div className="flex items-center gap-2 overflow-x-auto py-0.5 no-scrollbar">
        {/* Attendance Status */}
        <StatusBadge
          status={attendanceStatus === 'started' ? 'started' : 'scheduled'}
          size="sm"
        />

        {/* GPS Fix & Accuracy - Explicitly labelled as simulated for Stage 1 */}
        <div
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold tracking-tight ${
            gpsAccuracyMeters <= 50
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : gpsAccuracyMeters <= 100
              ? 'bg-blue-50 text-brand-blue border-blue-300'
              : 'bg-amber-50 text-amber-900 border-amber-300'
          }`}
          title={`Simulated GPS Fix: Horizontal Uncertainty ±${gpsAccuracyMeters}m (Threshold: ≤100m for visits, ≤50m for pins)`}
        >
          <MapPin className="w-3 h-3 shrink-0 text-emerald-700" />
          <span>Simulated GPS: ±{gpsAccuracyMeters}m</span>
        </div>

        {/* Sync Queue State - Explicitly labelled as simulated */}
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-medium"
          title={syncQueueCount === 0 ? 'Simulated Sync Engine: All local events synced to server' : `Simulated Outbox: ${syncQueueCount} events queued in IndexedDB`}
        >
          <Wifi className="w-3 h-3 text-emerald-700 shrink-0" />
          <span>Simulated: {syncQueueCount === 0 ? 'Synced' : `${syncQueueCount} Queued`}</span>
        </div>
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
