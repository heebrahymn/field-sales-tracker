import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { managementService, RealVerificationFlag } from '@/services/managementService';
import {
  AlertTriangle,
  Gauge,
  MapPinOff,
  Clock,
  WifiOff,
  AlertOctagon,
  CheckCircle2,
  Search,
  X,
  RefreshCw,
  Loader2,
  Database as DatabaseIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface RiskFlagRecord {
  id: string;
  flagType:
    | 'out_of_bounds_checkout'
    | 'rapid_travel'
    | 'short_visit'
    | 'late_meeting_log'
    | 'near_origin_visit'
    | 'high_offline_share'
    | 'audit_dispute';
  severity: 'high' | 'medium' | 'low';
  repName: string;
  clientName: string;
  branchName: string;
  detectedAt: string;
  metricObserved: string;
  thresholdLimit: string;
  explanation: string;
  status: 'open_review' | 'dismissed' | 'explanation_requested' | 'confirmed_violation';
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  isRealRecord?: boolean;
}

export const RiskFlagsWorkbench: React.FC = () => {
  const { currentUser } = useAuth();
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlagForAction, setSelectedFlagForAction] = useState<RiskFlagRecord | null>(null);
  const [actionType, setActionType] = useState<'dismiss' | 'request_explanation' | 'confirm_violation' | null>(null);
  const [justificationReason, setJustificationReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [realFlags, setRealFlags] = useState<RealVerificationFlag[]>([]);
  const [isLoadingReal, setIsLoadingReal] = useState(false);

  const loadRealFlags = useCallback(async () => {
    setIsLoadingReal(true);
    try {
      const market = currentUser?.marketCode || 'NG';
      const { data, error } = await managementService.getCountryVerificationFlags(market, 'all');
      if (error) {
        console.warn('[RiskFlagsWorkbench] Failed to load Supabase flags:', error.message);
      } else {
        setRealFlags(data);
      }
    } catch (err: any) {
      console.warn('[RiskFlagsWorkbench] Error:', err);
    } finally {
      setIsLoadingReal(false);
    }
  }, [currentUser?.marketCode]);

  useEffect(() => {
    loadRealFlags();
  }, [loadRealFlags]);

  // Merge real flags with demo flags
  const flags: RiskFlagRecord[] = useMemo(() => {
    const realMapped: RiskFlagRecord[] = realFlags.map((rf) => {
      let mappedType: RiskFlagRecord['flagType'] = 'short_visit';
      if (rf.flagCode === 'out_of_bounds_checkout') mappedType = 'out_of_bounds_checkout';
      else if (rf.flagCode === 'rapid_travel') mappedType = 'rapid_travel';
      else if (rf.flagCode === 'late_meeting_log') mappedType = 'late_meeting_log';
      else if (rf.flagCode === 'near_origin_visit') mappedType = 'near_origin_visit';
      else if (rf.flagCode === 'high_offline_share') mappedType = 'high_offline_share';
      else if (rf.flagCode === 'audit_dispute') mappedType = 'audit_dispute';

      let mappedSeverity: RiskFlagRecord['severity'] = 'medium';
      if (rf.severity === 'critical' || rf.severity === 'high') mappedSeverity = 'high';
      else if (rf.severity === 'low') mappedSeverity = 'low';

      let mappedStatus: RiskFlagRecord['status'] = 'open_review';
      if (rf.status === 'cleared') mappedStatus = 'dismissed';
      else if (rf.status === 'under_review' || rf.status === 'escalated') mappedStatus = 'explanation_requested';
      else if (rf.status === 'confirmed_violation') mappedStatus = 'confirmed_violation';

      return {
        id: rf.id,
        flagType: mappedType,
        severity: mappedSeverity,
        repName: rf.repName,
        clientName: rf.organisationName || 'Client Organisation',
        branchName: rf.branchName || 'Field Location',
        detectedAt: rf.createdAt ? new Date(rf.createdAt).toLocaleString() : 'Detected',
        metricObserved: rf.details?.metricObserved || rf.details?.reason || rf.flagCode,
        thresholdLimit: rf.details?.thresholdLimit || 'Automated Telemetry Threshold',
        explanation: rf.details?.notes || rf.details?.explanation || 'Flag raised by database telemetry or audit check.',
        status: mappedStatus,
        resolutionNotes: rf.reviewerNotes || undefined,
        resolvedBy: rf.reviewedBy ? 'Country Sales Head' : undefined,
        resolvedAt: rf.reviewedAt ? new Date(rf.reviewedAt).toLocaleString() : undefined,
        isRealRecord: true,
      };
    });

    return realMapped;
  }, [realFlags]);

  const handleOpenActionModal = (
    flag: RiskFlagRecord,
    type: 'dismiss' | 'request_explanation' | 'confirm_violation'
  ) => {
    setSelectedFlagForAction(flag);
    setActionType(type);
    setJustificationReason('');
  };

  const handleConfirmAction = async () => {
    if (!selectedFlagForAction || !actionType) return;
    if (!justificationReason.trim()) {
      alert('A decision rationale is required for every flag resolution.');
      return;
    }

    const newStatus: RiskFlagRecord['status'] =
      actionType === 'dismiss'
        ? 'dismissed'
        : actionType === 'request_explanation'
        ? 'explanation_requested'
        : 'confirmed_violation';

    if (selectedFlagForAction.isRealRecord) {
      try {
        const { error } = await managementService.reviewVerificationFlag({
          flagId: selectedFlagForAction.id,
          status: newStatus as any,
          reviewerNotes: justificationReason,
        });
        if (error) throw error;
        await loadRealFlags();
      } catch (err: any) {
        setToastMessage(`Failed to review flag: ${err.message}`);
        return;
      }
    }

    const actionText =
      actionType === 'dismiss'
        ? 'Dismissed with Justification'
        : actionType === 'request_explanation'
        ? 'Explanation Requested from Rep'
        : 'Confirmed Policy Violation';

    setToastMessage(`Flag [${selectedFlagForAction.id}] updated: ${actionText}. Audit logged.`);
    setSelectedFlagForAction(null);
    setActionType(null);
  };

  const filteredFlags = flags.filter((f) => {
    if (filterSeverity !== 'all' && f.severity !== filterSeverity) return false;
    if (filterStatus === 'open' && f.status !== 'open_review') return false;
    if (filterStatus === 'resolved' && f.status === 'open_review') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.repName.toLowerCase().includes(q) ||
        f.clientName.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q) ||
        f.metricObserved.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openCount = flags.filter((f) => f.status === 'open_review').length;

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

      {/* Top Banner */}
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">
                Behavioral Risk Flags &amp; Telemetry Exceptions (PRD §8.2)
              </h3>
              <span className="text-[11px] font-mono font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-rose-200">
                Market: {currentUser?.marketCode || 'NG'}
              </span>
            </div>
            <p className="text-slate-700 font-medium mt-0.5">
              Automated trip and checkout anomalies requiring human review. Flags are investigatory signals, not conclusive fraud findings. Document all review rationales.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadRealFlags}
            disabled={isLoadingReal}
            className="h-8 text-xs font-semibold gap-1.5 bg-white border-rose-300 text-rose-800"
          >
            {isLoadingReal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </Button>
          <span className="text-xs font-bold px-3 py-1 rounded-lg bg-rose-600 text-white shadow-xs">
            {openCount} Open Flags
          </span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search flags by rep name, client, flag ID, or metric..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 bg-slate-50/50 border-slate-200"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Severity Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="font-semibold text-slate-500 mr-1">Severity:</span>
                <button
                  onClick={() => setFilterSeverity('all')}
                  className={`px-2 py-1 rounded font-bold text-xs ${
                    filterSeverity === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterSeverity('high')}
                  className={`px-2 py-1 rounded font-bold text-xs ${
                    filterSeverity === 'high' ? 'bg-rose-700 text-white' : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  High
                </button>
                <button
                  onClick={() => setFilterSeverity('medium')}
                  className={`px-2 py-1 rounded font-bold text-xs ${
                    filterSeverity === 'medium' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  Medium
                </button>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 text-xs border-l border-slate-200 pl-2">
                <span className="font-semibold text-slate-500 mr-1">Status:</span>
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                    filterStatus === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  All ({flags.length})
                </button>
                <button
                  onClick={() => setFilterStatus('open')}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                    filterStatus === 'open' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Open ({openCount})
                </button>
                <button
                  onClick={() => setFilterStatus('resolved')}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                    filterStatus === 'resolved' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Resolved
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flag Cards */}
      <div className="space-y-4">
        {filteredFlags.map((flag) => {
          const isOpen = flag.status === 'open_review';

          return (
            <Card
              key={flag.id}
              className={`border transition-all ${
                isOpen ? 'border-rose-200 bg-white shadow-xs' : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <CardContent className="p-5 sm:p-6 pt-5 sm:pt-6 space-y-4">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        flag.severity === 'high'
                          ? 'bg-rose-100 text-rose-900 border border-rose-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {flag.severity} Priority
                    </span>

                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {flag.id}
                    </span>

                    {flag.isRealRecord && (
                      <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1">
                        <DatabaseIcon className="w-2.5 h-2.5" /> Supabase Flag
                      </span>
                    )}

                    <span className="text-xs text-slate-600 font-medium">
                      Salesperson: <strong className="text-slate-900">{flag.repName}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">{flag.detectedAt}</span>
                    {isOpen ? (
                      <span className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                        Pending Adjudication
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Resolved
                      </span>
                    )}
                  </div>
                </div>

                {/* Metric & Technical Anomaly */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-2">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        {flag.flagType === 'rapid_travel' && <Gauge className="w-4 h-4 text-rose-600" />}
                        {flag.flagType === 'out_of_bounds_checkout' && <MapPinOff className="w-4 h-4 text-rose-600" />}
                        {flag.flagType === 'short_visit' && <Clock className="w-4 h-4 text-amber-600" />}
                        {flag.flagType === 'late_meeting_log' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                        {flag.flagType === 'high_offline_share' && <WifiOff className="w-4 h-4 text-slate-600" />}
                        {flag.flagType === 'audit_dispute' && <AlertOctagon className="w-4 h-4 text-rose-600" />}
                        {flag.flagType.replace(/_/g, ' ').toUpperCase()}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {flag.clientName} • <span className="text-slate-800 font-medium">{flag.branchName}</span>
                      </p>
                    </div>

                    <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-3 text-xs space-y-1">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Observed Telemetry Metric vs Rule Threshold:
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                        <div>
                          <span className="text-slate-500 block">Observed:</span>
                          <strong className="text-rose-900">{flag.metricObserved}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Threshold Limit:</span>
                          <strong className="text-slate-700">{flag.thresholdLimit}</strong>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 pt-1 leading-relaxed">{flag.explanation}</p>
                    </div>
                  </div>

                  {/* Resolution Notes Box if resolved */}
                  {!isOpen && flag.resolutionNotes && (
                    <div className="bg-slate-100 rounded-lg p-3 border border-slate-200 text-xs space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Manager Resolution Record
                      </span>
                      <p className="text-slate-800 italic leading-relaxed">&ldquo;{flag.resolutionNotes}&rdquo;</p>
                      <div className="text-[10px] text-slate-500 pt-1 font-mono">
                        By {flag.resolvedBy} • {flag.resolvedAt}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Bar */}
                {isOpen && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500 italic">
                      Review telemetry before issuing formal inquiry or disciplinary action.
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-semibold border-slate-300"
                        onClick={() => handleOpenActionModal(flag, 'dismiss')}
                      >
                        Dismiss as False Positive
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-semibold text-amber-900 border-amber-300 bg-amber-50"
                        onClick={() => handleOpenActionModal(flag, 'request_explanation')}
                      >
                        Request Explanation
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white"
                        onClick={() => handleOpenActionModal(flag, 'confirm_violation')}
                      >
                        Confirm Violation
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Action Resolution Modal */}
      {selectedFlagForAction && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {actionType === 'dismiss' && 'Dismiss Risk Flag with Rationale'}
                {actionType === 'request_explanation' && 'Request Rep Explanation'}
                {actionType === 'confirm_violation' && 'Confirm Policy Violation'}
              </h3>
              <button
                onClick={() => {
                  setSelectedFlagForAction(null);
                  setActionType(null);
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-600">
                Flag: <strong className="font-mono text-slate-900">{selectedFlagForAction.id}</strong> •{' '}
                {selectedFlagForAction.clientName}
              </p>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Manager Decision Rationale (Required for Audit Trail):
                </label>
                <textarea
                  rows={3}
                  value={justificationReason}
                  onChange={(e) => setJustificationReason(e.target.value)}
                  placeholder="Document specific rationale, verified conditions, or explanation..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setSelectedFlagForAction(null);
                  setActionType(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                className="text-xs font-bold bg-brand-blue hover:bg-brand-blue-700 text-white"
                onClick={handleConfirmAction}
              >
                Commit Decision
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
