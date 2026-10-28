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
  AlertTriangle,
  HardDrive,
  Image as ImageIcon,
  ShieldAlert,
  GitBranch,
  RotateCcw,
} from 'lucide-react';

export const OfflineSyncView: React.FC = () => {
  const {
    isOnline,
    toggleOnline,
    syncState,
    syncQueue,
    journalEvents,
    queueTelemetry,
    storageQuota,
    retryFailedEvent,
    triggerSyncNow,
  } = useFieldSession();

  const isSyncing = syncState === 'syncing' || queueTelemetry.syncingCount > 0;
  const attentionCount = queueTelemetry.needsReviewCount + queueTelemetry.blockedDependencyCount;
  const pendingOrUnsyncedCount =
    queueTelemetry.totalEvents > 0
      ? queueTelemetry.pendingCount +
        queueTelemetry.syncingCount +
        queueTelemetry.failedCount +
        attentionCount
      : syncQueue.filter((q) => q.syncStatus !== 'synced').length;

  const formattedLastSync = queueTelemetry.lastServerSyncAt
    ? new Date(queueTelemetry.lastServerSyncAt).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'No server sync in this session yet';

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto select-none">
      {/* Top Header Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">
            PRD §9 Data Resilience
          </span>
          <h2 className="text-lg font-bold text-slate-900 leading-tight">
            Offline Queue &amp; Sync
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            IndexedDB durable event queue with UUID idempotency
          </p>
        </div>

        <button
          id="btn-toggle-network-mode"
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

      {/* Sync Health & Telemetry Card */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Server Synchronisation Status
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isSyncing
                      ? 'bg-amber-500 animate-ping'
                      : queueTelemetry.failedCount > 0 || attentionCount > 0
                      ? 'bg-red-500'
                      : pendingOrUnsyncedCount > 0
                      ? 'bg-amber-500'
                      : isOnline
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  }`}
                />
                <h3 className="font-bold text-slate-900 text-base">
                  {isSyncing
                    ? 'Synchronising Events...'
                    : queueTelemetry.failedCount > 0
                    ? 'Sync Retry Required'
                    : attentionCount > 0
                    ? 'Manual Review / Dependency Attention'
                    : pendingOrUnsyncedCount > 0
                    ? 'Saved on Device (Provisional — Pending Sync)'
                    : 'All Events Synced to Server'}
                </h3>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
              {journalEvents.length > 0 ? journalEvents.length : syncQueue.length} Queue Items
            </span>
          </div>

          {/* 6-Tile Telemetry Grid (Requirement 9) */}
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-semibold block">Pending Sync</span>
              <span
                id="telemetry-pending-count"
                className="text-sm font-bold font-mono text-amber-800"
              >
                {queueTelemetry.pendingCount}
              </span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-semibold block">Media Queued</span>
              <span
                id="telemetry-media-count"
                className="text-sm font-bold font-mono text-brand-blue flex items-center justify-center gap-1"
              >
                <ImageIcon className="w-3 h-3" />
                {queueTelemetry.pendingMediaCount}
                <span className="text-[9px] text-slate-500">
                  ({Math.round(queueTelemetry.pendingMediaBytes / 1024)}KB)
                </span>
              </span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-semibold block">Syncing Now</span>
              <span id="telemetry-syncing-count" className="text-sm font-bold font-mono text-blue-700">
                {queueTelemetry.syncingCount}
              </span>
            </div>
            <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-200">
              <span className="text-[10px] text-emerald-800 font-semibold block">Synced (Server)</span>
              <span id="telemetry-synced-count" className="text-sm font-bold font-mono text-emerald-800">
                {journalEvents.length > 0
                  ? queueTelemetry.syncedCount
                  : syncQueue.filter((q) => q.syncStatus === 'synced').length}
              </span>
            </div>
            <div className="bg-red-50/60 p-2 rounded-lg border border-red-200">
              <span className="text-[10px] text-red-800 font-semibold block">Failed</span>
              <span id="telemetry-failed-count" className="text-sm font-bold font-mono text-red-800">
                {queueTelemetry.failedCount}
              </span>
            </div>
            <div className="bg-amber-50/60 p-2 rounded-lg border border-amber-200">
              <span className="text-[10px] text-amber-900 font-semibold block">Needs Review</span>
              <span id="telemetry-attention-count" className="text-sm font-bold font-mono text-amber-900">
                {attentionCount}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="font-semibold">Last Successful Server Sync:</span>
            <span className="font-mono font-bold text-slate-800">{formattedLastSync}</span>
          </div>

          {/* Sync Now Action */}
          <Button
            id="btn-sync-now"
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
              Device is currently offline. Events &amp; photo Blobs are queued securely in local browser IndexedDB until network connection is restored.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Distinction Banner: Saved on Device (Provisional) vs Saved to Server (Authoritative) */}
      <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs">
        <Info className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-700 leading-relaxed space-y-1">
          <div>
            <strong className="text-slate-900 font-semibold">PRD §9 Integrity Contract:</strong> Every offline event is assigned a client-generated UUID idempotency key, local monotonic sequence counter, and device timestamp. Upon upload, server rejects duplicates and validates dependency order.
          </div>
          <div className="pt-1 border-t border-blue-200/60 flex flex-wrap gap-2.5 text-[10px]">
            <span className="inline-flex items-center gap-1 font-semibold text-amber-900">
              <Clock className="w-3 h-3 text-amber-700" />
              Saved on this device / Waiting to sync = Provisional (Pending PostGIS verification)
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-900">
              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
              Saved to Supabase = Authoritative
            </span>
          </div>
        </div>
      </div>

      {/* Browser Storage Quota & Persistence Card */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-brand-blue" />
            IndexedDB Media &amp; Journal Storage
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-600">
            {Math.round(storageQuota.usageBytes / 1024)} KB used ({storageQuota.usagePercent}%)
          </span>
        </div>

        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className={`h-full transition-all ${
              storageQuota.isExhausted
                ? 'bg-red-600'
                : storageQuota.isNearLimit
                ? 'bg-amber-500'
                : 'bg-emerald-600'
            }`}
            style={{ width: `${Math.max(2, Math.min(100, storageQuota.usagePercent))}%` }}
          />
        </div>

        {storageQuota.warningMessage && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-1.5 text-[11px] text-red-900 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
            <span>{storageQuota.warningMessage}</span>
          </div>
        )}
      </div>

      {/* Queue Events List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            IndexedDB Event Journal (Topological FIFO)
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">Durable FIFO</span>
        </div>

        <div className="space-y-2">
          {journalEvents.length > 0
            ? journalEvents.map((ev) => {
                const isSynced = ev.syncStatus === 'synced';
                const isFailed = ev.syncStatus === 'failed';
                const isNeedsReview = ev.syncStatus === 'needs_review';
                const isBlocked = ev.syncStatus === 'blocked_dependency';

                return (
                  <div
                    key={ev.id}
                    className={`bg-white p-3 rounded-xl border text-xs space-y-1.5 shadow-xs ${
                      isFailed || isNeedsReview
                        ? 'border-red-300 bg-red-50/20'
                        : isBlocked
                        ? 'border-amber-300 bg-amber-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 text-[10px] font-mono font-bold flex items-center justify-center text-slate-700">
                          {ev.sequenceNumber}
                        </span>
                        <span className="font-bold text-slate-900 font-mono text-[11px]">
                          {ev.eventType}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                          isSynced
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : isFailed
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : isNeedsReview
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : isBlocked
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {isSynced ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Saved to Supabase
                          </>
                        ) : ev.syncStatus === 'syncing' ? (
                          <>
                            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" /> Synchronising
                          </>
                        ) : isFailed ? (
                          <>
                            <AlertTriangle className="w-3 h-3 text-red-600" /> Failed — retry available (#{ev.retryCount})
                          </>
                        ) : isNeedsReview ? (
                          <>
                            <ShieldAlert className="w-3 h-3 text-purple-700" /> Needs manager review
                          </>
                        ) : isBlocked ? (
                          <>
                            <GitBranch className="w-3 h-3 text-amber-700" /> Waiting to sync (Blocked by Dependency)
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-600" /> Saved on this device · Waiting to sync
                          </>
                        )}
                      </span>
                    </div>

                    <p className="text-slate-700 font-medium text-[11px] pl-7">
                      {ev.payloadSummary}
                    </p>

                    {ev.provisionalVerificationNote && !isSynced && (
                      <p className="text-[10px] text-amber-800 bg-amber-50/80 border border-amber-200 rounded px-2 py-1 ml-7">
                        {ev.provisionalVerificationNote}
                      </p>
                    )}

                    {ev.clockSkewWarning && (
                      <p className="text-[10px] text-orange-900 bg-orange-50 border border-orange-200 rounded px-2 py-1 ml-7 font-medium">
                        {ev.clockSkewWarning}
                      </p>
                    )}

                    {ev.lastError && (
                      <div className="ml-7 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-2 text-[10px] text-red-900">
                        <span className="font-medium">{ev.lastError}</span>
                        {(isFailed || isNeedsReview || isBlocked) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => retryFailedEvent(ev.id)}
                            className="h-6 px-2 text-[10px] font-bold bg-white border-red-300 text-red-800 shrink-0"
                          >
                            <RotateCcw className="w-2.5 h-2.5 mr-1" /> Retry
                          </Button>
                        )}
                      </div>
                    )}

                    <div className="pl-7 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Key className="w-3 h-3 text-slate-400" /> UUID: {ev.id.substring(0, 18)}
                      </span>
                      <span>
                        {new Date(ev.originalCaptureTimestamp).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            : syncQueue.map((item, idx) => {
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

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          item.syncStatus === 'synced'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
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
          id="btn-simulate-offline-toggle"
          variant="outline"
          size="sm"
          onClick={toggleOnline}
          className="text-xs font-bold border-slate-300 w-full h-9 bg-white"
        >
          {isOnline
            ? 'Simulate Going Offline (Airplane Mode)'
            : 'Simulate Reconnecting to Cellular Network'}
        </Button>
      </div>
    </div>
  );
};
