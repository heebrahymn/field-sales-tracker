import React from 'react';
import { useFieldSession } from '@/context/FieldSessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  Database,
  Key,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';

export const OfflineSyncView: React.FC = () => {
  const {
    isOnline,
    toggleOnline,
    syncState,
    syncQueue,
    triggerSyncNow,
  } = useFieldSession();

  const isSyncing = syncState === 'syncing';

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto select-none">
      {/* Top Header Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">
            PRD §9 Data Resilience
          </span>
          <h2 className="text-lg font-bold text-slate-900 leading-tight">
            Offline Queue & Sync
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            IndexedDB durable event queue with UUID idempotency
          </p>
        </div>

        <button
          onClick={toggleOnline}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shadow-2xs ${
            isOnline
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
          }`}
          title="Toggle Network Simulator"
        >
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-red-600" />
              <span>Offline</span>
            </>
          )}
        </button>
      </div>

      {/* Sync Health Card */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Server Synchronisation Status
              </span>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  isSyncing ? 'bg-amber-500 animate-ping' : isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                }`} />
                <h3 className="font-bold text-slate-900 text-base capitalize">
                  {isSyncing ? 'Synchronising Events...' : syncState === 'synced' ? 'All Events Synced' : 'Pending Server Acknowledgment'}
                </h3>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
              {syncQueue.length} Queue Items
            </span>
          </div>

          {/* Sync Now Action */}
          <Button
            onClick={triggerSyncNow}
            disabled={isSyncing || !isOnline}
            className={`w-full h-12 min-h-[48px] font-bold text-xs shadow-sm flex items-center justify-center gap-2 ${
              isOnline
                ? 'bg-brand-blue hover:bg-brand-blue-700 text-white'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Synchronising with Carbon Server...' : 'Sync Now (Order-Preserved)'}
          </Button>

          {!isOnline && (
            <p className="text-[11px] text-amber-800 text-center font-medium bg-amber-50 p-2 rounded-lg border border-amber-200">
              Device is currently offline. Events are queued securely in local browser IndexedDB until network connection is restored.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Architecture Integrity Notice (PRD §9) */}
      <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs">
        <Info className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-700 leading-relaxed">
          <strong className="text-slate-900 font-semibold">PRD §9 Integrity Contract:</strong> Every offline event is assigned a client-generated UUID idempotency key, local monotonic sequence counter, and device timestamp. Upon upload, server rejects duplicates and validates dependency order.
        </div>
      </div>

      {/* Queue Events List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            IndexedDB Event Journal (Simulated)
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">Durable FIFO</span>
        </div>

        <div className="space-y-2">
          {syncQueue.map((item, idx) => {
            return (
              <div
                key={item.id}
                className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 text-[10px] font-mono font-bold flex items-center justify-center text-slate-700">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-900 font-mono text-[11px]">
                      {item.type}
                    </span>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    item.syncStatus === 'synced'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {item.syncStatus === 'synced' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Synced
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-amber-600" /> Queued
                      </>
                    )}
                  </span>
                </div>

                <p className="text-slate-700 font-medium text-[11px] pl-7">
                  {item.payloadSummary}
                </p>

                <div className="pl-7 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span className="flex items-center gap-1">
                    <Key className="w-3 h-3 text-slate-400" /> UUID: {item.uuid}
                  </span>
                  <span>{item.timestamp}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Network Simulator Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-blue" /> Offline Simulator Controls
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Manual toggle</span>
        </div>
        <p className="text-[11px] text-slate-600">
          Simulate losing mobile data connection in remote rural depots or port container terminals.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleOnline}
          className="text-xs font-bold border-slate-300 w-full h-9 bg-white"
        >
          {isOnline ? 'Simulate Going Offline (Airplane Mode)' : 'Simulate Reconnecting to Cellular Network'}
        </Button>
      </div>
    </div>
  );
};
