import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertTriangle,
  Gauge,
  MapPinOff,
  Clock,
  WifiOff,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  X,
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
    | 'high_offline_share';
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
}

export const RiskFlagsWorkbench: React.FC = () => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlagForAction, setSelectedFlagForAction] = useState<RiskFlagRecord | null>(null);
  const [actionType, setActionType] = useState<'dismiss' | 'request_explanation' | 'confirm_violation' | null>(null);
  const [justificationReason, setJustificationReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [flags, setFlags] = useState<RiskFlagRecord[]>([
    {
      id: 'FLG-101',
      flagType: 'rapid_travel',
      severity: 'high',
      repName: 'Ibrahim Sani (CC-REP-044)',
      clientName: 'Northern Freight Corridors Ltd',
      branchName: 'Kano Transit Yard • Location #BR-KAN-012',
      detectedAt: 'Today 13:45 WAT',
      metricObserved: '112 km/h apparent velocity over 18km gap',
      thresholdLimit: 'Maximum plausible road speed: 80 km/h',
      explanation: 'System telemetry recorded consecutive check-in 18km away only 9 minutes after checkout at preceding client. Possible mock location app or passenger transit on express highway.',
      status: 'open_review',
    },
    {
      id: 'FLG-102',
      flagType: 'out_of_bounds_checkout',
      severity: 'high',
      repName: 'Tunde Adebayo (CC-REP-042)',
      clientName: 'Global Maritime Supplies',
      branchName: 'Apapa Port Terminal • Location #BR-LAG-088',
      detectedAt: 'Today 11:22 WAT',
      metricObserved: '380m distance from registered client location pin',
      thresholdLimit: 'Maximum allowed geofence: 200m',
      explanation: 'Check-in was verified at 45m from pin, but check-out was recorded 380m away. System permitted check-out per PRD §7.4 rules but raised an automated manager flag.',
      status: 'open_review',
    },
    {
      id: 'FLG-103',
      flagType: 'short_visit',
      severity: 'medium',
      repName: 'Emeka Nwosu (CC-REP-039)',
      clientName: 'Atlantic Heavy Transport',
      branchName: 'Lekki Depot Yard • Location #BR-LAG-015',
      detectedAt: 'Today 10:15 WAT',
      metricObserved: '3 minutes 40 seconds on-site duration',
      thresholdLimit: 'Minimum credible meeting duration: 5 minutes',
      explanation: 'Visit completed in under 5 minutes. Inadequate time for commercial meeting or technical discussion. Requires manager review.',
      status: 'open_review',
    },
    {
      id: 'FLG-104',
      flagType: 'late_meeting_log',
      severity: 'medium',
      repName: 'Chinyere Nwosu (CC-REP-038)',
      clientName: 'Zenith Marine Fleet Terminal',
      branchName: 'Dockyard Road • Location #BR-LAG-002',
      detectedAt: 'Today 15:00 WAT',
      metricObserved: '3 hours 10 mins overdue since check-out',
      thresholdLimit: 'Meeting Log SLA: ≤ 2 hours post-checkout',
      explanation: 'Salesperson checked out at 11:50 WAT but meeting log has not been completed within the 2-hour window.',
      status: 'open_review',
    },
    {
      id: 'FLG-105',
      flagType: 'high_offline_share',
      severity: 'low',
      repName: 'Ibrahim Sani (CC-REP-044)',
      clientName: 'Multiple Northern Transit Accounts',
      branchName: 'Kano Regional Highway Route',
      detectedAt: 'Yesterday 17:30 WAT',
      metricObserved: '42% of daily events recorded offline',
      thresholdLimit: 'Warning threshold: >30% offline share',
      explanation: 'Salesperson spent significant portion of day operating without data network connectivity along northern expressway.',
      status: 'dismissed',
      resolutionNotes: 'Verified known network blackout on Kano-Kaduna highway sector. Telemetry synced normally in evening.',
      resolvedBy: 'HQ Administrator (Country Head)',
      resolvedAt: 'Yesterday 18:15 WAT',
    },
  ]);

  const handleOpenActionModal = (
    flag: RiskFlagRecord,
    type: 'dismiss' | 'request_explanation' | 'confirm_violation'
  ) => {
    setSelectedFlagForAction(flag);
    setActionType(type);
    setJustificationReason('');
  };

  const handleConfirmAction = () => {
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

    setFlags((prev) =>
      prev.map((f) =>
        f.id === selectedFlagForAction.id
          ? {
              ...f,
              status: newStatus,
              resolutionNotes: justificationReason,
              resolvedBy: 'HQ Administrator (Country Head)',
              resolvedAt:
                new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) +
                ' WAT Today',
            }
          : f
      )
    );

    const actionText =
      actionType === 'dismiss'
        ? 'Dismissed with Justification'
        : actionType === 'request_explanation'
        ? 'Explanation Requested from Rep'
        : 'Confirmed Policy Violation';

    setToastMessage(`Flag [${selectedFlagForAction.id}] updated: ${actionText}. Audit logged.`);
    setTimeout(() => setToastMessage(null), 5000);
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

      {/* Header Banner */}
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h3 className="font-bold text-slate-900 text-sm">
              Suspicious Activity &amp; Risk Flags Queue (PRD §8.2)
            </h3>
            <p className="text-slate-700 font-medium mt-0.5">
              Automated tripwire alerts for human review. Flags are investigative prompts, never conclusive fraud verdicts. Review evidence and record reviewer rationale for every resolution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-800 shadow-2xs">
            {openCount} Open Actionable Flags
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
                placeholder="Search flags by salesperson, client, metric, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 bg-slate-50/50 border-slate-200"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-xs">
                <span className="font-semibold text-slate-500 mr-1">Status:</span>
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                    filterStatus === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  All ({flags.length})
                </button>
                <button
                  onClick={() => setFilterStatus('open')}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                    filterStatus === 'open'
                      ? 'bg-rose-700 text-white'
                      : 'bg-rose-50 text-rose-900 border border-rose-200'
                  }`}
                >
                  Open ({openCount})
                </button>
                <button
                  onClick={() => setFilterStatus('resolved')}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                    filterStatus === 'resolved'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  Resolved ({flags.length - openCount})
                </button>
              </div>

              <div className="flex items-center gap-1 text-xs border-l border-slate-200 pl-2">
                <span className="font-semibold text-slate-500 mr-1">Severity:</span>
                <button
                  onClick={() => setFilterSeverity('all')}
                  className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                    filterSeverity === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterSeverity('high')}
                  className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                    filterSeverity === 'high'
                      ? 'bg-rose-700 text-white'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  High (2)
                </button>
                <button
                  onClick={() => setFilterSeverity('medium')}
                  className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                    filterSeverity === 'medium'
                      ? 'bg-amber-700 text-white'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  Medium (2)
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flags List */}
      <div className="space-y-4">
        {filteredFlags.map((flag) => {
          const isOpen = flag.status === 'open_review';
          const isDismissed = flag.status === 'dismissed';
          const isExplanation = flag.status === 'explanation_requested';
          const isViolation = flag.status === 'confirmed_violation';

          return (
            <Card
              key={flag.id}
              className={`border transition-all ${
                isOpen
                  ? flag.severity === 'high'
                    ? 'border-rose-300 shadow-sm bg-white'
                    : 'border-amber-300 shadow-xs bg-white'
                  : 'border-slate-200 bg-slate-50/60'
              }`}
            >
              <CardContent className="p-5 sm:p-6 pt-5 sm:pt-6 space-y-4">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                        flag.severity === 'high'
                          ? 'bg-rose-600 text-white'
                          : flag.severity === 'medium'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-500 text-white'
                      }`}
                    >
                      {flag.severity} Priority
                    </span>

                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {flag.id}
                    </span>

                    <span className="text-xs text-slate-700 font-semibold">
                      Salesperson: <strong className="text-slate-900">{flag.repName}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">{flag.detectedAt}</span>
                    {isOpen && (
                      <span className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Requires Review
                      </span>
                    )}
                    {isDismissed && (
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                        Dismissed with Justification
                      </span>
                    )}
                    {isExplanation && (
                      <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                        Rep Explanation Requested
                      </span>
                    )}
                    {isViolation && (
                      <span className="text-xs font-bold text-red-800 bg-red-100 border border-red-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        Confirmed Policy Violation
                      </span>
                    )}
                  </div>
                </div>

                {/* Flag Content Body */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        {flag.flagType === 'rapid_travel' && <Gauge className="w-4 h-4 text-rose-600" />}
                        {flag.flagType === 'out_of_bounds_checkout' && <MapPinOff className="w-4 h-4 text-rose-600" />}
                        {flag.flagType === 'short_visit' && <Clock className="w-4 h-4 text-amber-600" />}
                        {flag.flagType === 'late_meeting_log' && <Clock className="w-4 h-4 text-amber-600" />}
                        {flag.flagType === 'high_offline_share' && <WifiOff className="w-4 h-4 text-slate-600" />}
                        {flag.flagType.replace(/_/g, ' ').toUpperCase()}
                      </h4>
                      <p className="text-xs text-slate-600 font-medium">
                        {flag.clientName} • {flag.branchName}
                      </p>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      {flag.explanation}
                    </p>
                  </div>

                  {/* Telemetry Limits Box */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Telemetry Anomaly
                    </span>
                    <div className="space-y-1 text-slate-700 text-[11px]">
                      <div>
                        <strong>Observed:</strong>{' '}
                        <span className="text-rose-700 font-bold">{flag.metricObserved}</span>
                      </div>
                      <div>
                        <strong>Policy Limit:</strong> {flag.thresholdLimit}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Historical Resolution (if resolved) */}
                {flag.resolutionNotes && (
                  <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-slate-700">
                        Resolution by {flag.resolvedBy} ({flag.resolvedAt}):
                      </span>
                      <p className="text-slate-800 font-medium italic">&ldquo;{flag.resolutionNotes}&rdquo;</p>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-300 shrink-0">
                      Audit Logged
                    </span>
                  </div>
                )}

                {/* Manager Actions for Open Flags */}
                {isOpen && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-200">
                    <div className="text-[11px] text-slate-600">
                      Choose an action to record reviewer rationale:
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        onClick={() => handleOpenActionModal(flag, 'dismiss')}
                      >
                        Dismiss with Justification
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-50"
                        onClick={() => handleOpenActionModal(flag, 'request_explanation')}
                      >
                        Request Rep Explanation
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
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

      {/* Decision / Action Dialog Modal */}
      {selectedFlagForAction && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                  Flag Resolution • {selectedFlagForAction.id}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {actionType === 'dismiss'
                    ? 'Dismiss Flag with Justification'
                    : actionType === 'request_explanation'
                    ? 'Request Explanation from Salesperson'
                    : 'Confirm Documented Policy Violation'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedFlagForAction(null);
                  setActionType(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 space-y-1">
                <div>
                  <strong>Rep:</strong> {selectedFlagForAction.repName}
                </div>
                <div>
                  <strong>Anomaly:</strong> {selectedFlagForAction.metricObserved}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 block">
                  Mandatory Reviewer Rationale / Inquiry Note:
                </label>
                <textarea
                  rows={4}
                  value={justificationReason}
                  onChange={(e) => setJustificationReason(e.target.value)}
                  placeholder={
                    actionType === 'dismiss'
                      ? 'State why this anomaly is benign (e.g., confirmed road traffic detour or express bus transit)...'
                      : actionType === 'request_explanation'
                      ? 'Specify the question to dispatch to the salesperson regarding this reading...'
                      : 'State the confirmed policy breach and reference in disciplinary audit...'
                  }
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
                onClick={() => {
                  setSelectedFlagForAction(null);
                  setActionType(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant={actionType === 'confirm_violation' ? 'destructive' : 'default'}
                size="sm"
                className={`text-xs font-bold text-white ${
                  actionType === 'dismiss'
                    ? 'bg-slate-800 hover:bg-slate-900'
                    : actionType === 'request_explanation'
                    ? 'bg-brand-blue hover:bg-brand-blue-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
                onClick={handleConfirmAction}
              >
                Confirm &amp; Commit to Audit Log
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
