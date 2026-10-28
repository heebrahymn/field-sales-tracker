import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAudit } from '@/context/AuditContext';
import { useAuth } from '@/context/AuthContext';
import { managementService, RealAuditCallRecord } from '@/services/managementService';
import {
  PhoneCall,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  Phone,
  User,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  FileText,
  X,
  RefreshCw,
  Loader2,
  Database as DatabaseIcon,
  Sparkles,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface AuditQueueItem {
  id: string;
  visitId: string;
  sampleType: 'random_5_percent' | 'risk_targeted';
  clientName: string;
  branchName: string;
  contactName: string;
  contactRole: string;
  contactPhone: string;
  repName: string;
  claimedDate: string;
  claimedTime: string;
  productsDiscussed: string;
  status:
    | 'pending_call'
    | 'confirmed'
    | 'unavailable'
    | 'disputed'
    | 'resolved_cleared'
    | 'resolved_violation';
  callAttempts: number;
  callNotes?: string;
  disputeFindings?: string;
  secondaryContact?: string;
  auditedBy?: string;
  auditedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  isRealRecord?: boolean;
}

export const ClientAuditWorkbench: React.FC = () => {
  const { currentUser } = useAuth();
  const { audits: demoAudits, recordAuditCall, resolveDispute } = useAudit();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'random' | 'targeted'>('all');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'pending' | 'resolved' | 'disputed' | 'unavailable'
  >('all');
  const [activeCallItem, setActiveCallItem] = useState<AuditQueueItem | null>(null);
  const [activeDisputeItem, setActiveDisputeItem] = useState<AuditQueueItem | null>(null);

  // Call Script Form State
  const [clientMetInPerson, setClientMetInPerson] = useState<'yes' | 'no' | 'unreachable'>('yes');
  const [productsConfirmed, setProductsConfirmed] = useState<boolean>(true);
  const [callNotes, setCallNotes] = useState('');

  // Dispute Investigation Form State
  const [disputeFindings, setDisputeFindings] = useState('');
  const [secondaryContact, setSecondaryContact] = useState('');
  const [disputeDecision, setDisputeDecision] = useState<'cleared' | 'violation'>('cleared');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Real Supabase audit records
  const [realAudits, setRealAudits] = useState<RealAuditCallRecord[]>([]);
  const [isLoadingReal, setIsLoadingReal] = useState(false);
  const [isSampling, setIsSampling] = useState(false);

  const loadRealAudits = useCallback(async () => {
    setIsLoadingReal(true);
    try {
      const market = currentUser?.marketCode || 'NG';
      const { data, error } = await managementService.getClientAuditRecords(market);
      if (error) {
        console.warn('[ClientAuditWorkbench] Failed to load real audit records:', error.message);
      } else {
        setRealAudits(data);
      }
    } catch (err: any) {
      console.warn('[ClientAuditWorkbench] Error loading real audits:', err);
    } finally {
      setIsLoadingReal(false);
    }
  }, [currentUser?.marketCode]);

  useEffect(() => {
    loadRealAudits();
  }, [loadRealAudits]);

  const handleSample5Pct = async () => {
    setIsSampling(true);
    try {
      const market = currentUser?.marketCode || 'NG';
      const { sampledCount, error } = await managementService.sampleWeeklyVisitsForAudit(market);
      if (error) throw error;

      if (sampledCount > 0) {
        setToastMessage(`Sampled ${sampledCount} verified visit(s) into the 5% weekly audit queue.`);
      } else {
        setToastMessage(`No unsampled completed visits available in ${market}. Queue is current.`);
      }
      await loadRealAudits();
    } catch (err: any) {
      setToastMessage(`Sampling failed: ${err.message}`);
    } finally {
      setIsSampling(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const auditQueue: AuditQueueItem[] = useMemo(() => {
    // Map real audits from Supabase
    const realMapped: AuditQueueItem[] = realAudits.map((a) => {
      let status: AuditQueueItem['status'] = 'pending_call';
      if (a.callStatus === 'connected' && a.meetingConfirmed === true) {
        status = 'confirmed';
      } else if (a.callStatus === 'connected' && a.meetingConfirmed === false) {
        if (a.disputeStatus === 'resolved_cleared') status = 'resolved_cleared';
        else if (a.disputeStatus === 'resolved_violation') status = 'resolved_violation';
        else status = 'disputed';
      } else if (a.callStatus === 'no_answer' || a.callStatus === 'busy' || a.callStatus === 'disconnected') {
        status = 'unavailable';
      }

      return {
        id: a.id,
        visitId: a.visitId,
        sampleType: a.selectionMethod === 'random_5pct' ? 'random_5_percent' : 'risk_targeted',
        clientName: a.visit?.organisationName || 'Client Organisation',
        branchName: a.visit?.branchName || 'Site Location',
        contactName: a.contactName,
        contactRole: 'Site Contact',
        contactPhone: a.contactPhone,
        repName: a.visit?.repName || 'Carbon Salesperson',
        claimedDate: a.visit?.checkInAt ? a.visit.checkInAt.slice(0, 10) : 'Visit Date',
        claimedTime: a.visit?.checkInAt ? new Date(a.visit.checkInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' WAT' : '—',
        productsDiscussed: a.visit?.productsDiscussed?.join(', ') || 'Heavy Duty Lubricants & Coolants',
        status,
        callAttempts: a.attempts.length,
        callNotes: a.attempts.length > 0 ? a.attempts[a.attempts.length - 1].callNotes || undefined : undefined,
        disputeFindings: a.disputeNotes || undefined,
        auditedBy: a.attempts.length > 0 ? a.attempts[a.attempts.length - 1].auditorName : undefined,
        auditedAt: a.attempts.length > 0 ? new Date(a.attempts[a.attempts.length - 1].dialedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : undefined,
        resolvedBy: a.resolvedBy || undefined,
        resolvedAt: a.resolvedAt ? new Date(a.resolvedAt).toLocaleDateString() : undefined,
        isRealRecord: true,
      };
    });

    // Map demo audits as fallback
    const demoMapped: AuditQueueItem[] = demoAudits
      .filter((a) => a.marketCode === (currentUser?.marketCode || 'NG') && !realAudits.some((r) => r.id === a.id))
      .map((a) => {
        let status: AuditQueueItem['status'] = 'pending_call';
        if (a.callStatus === 'confirmed_meeting') {
          status = a.disputeDecision === 'cleared' ? 'resolved_cleared' : 'confirmed';
        } else if (a.callStatus === 'disputed_client_denial') {
          status =
            a.disputeDecision === 'violation'
              ? 'resolved_violation'
              : a.disputeDecision === 'cleared'
              ? 'resolved_cleared'
              : 'disputed';
        } else if (a.callStatus === 'unreachable_rescheduled') {
          status = 'unavailable';
        }

        return {
          id: a.id,
          visitId: a.visitId,
          sampleType: a.sampleType,
          clientName: a.organisationName,
          branchName: a.branchName,
          contactName: a.clientContactPerson,
          contactRole: a.clientContactRole,
          contactPhone: a.clientContactPhone,
          repName: a.salespersonName,
          claimedDate: a.visitDate,
          claimedTime: a.claimedTime || '09:30 WAT',
          productsDiscussed: a.productsDiscussed || 'Fleet Radiator Coolant, Degreaser',
          status,
          callAttempts: a.callAttemptCount,
          callNotes: a.callNotes,
          disputeFindings: a.disputeFindings,
          secondaryContact: a.secondaryContact,
          auditedBy: a.auditorName,
          auditedAt: a.lastCallTimestamp,
          resolvedBy: a.resolvedBy,
          resolvedAt: a.resolvedAt,
          isRealRecord: false,
        };
      });

    return [...realMapped, ...demoMapped];
  }, [realAudits, demoAudits, currentUser?.marketCode]);

  const handleOpenCallModal = (item: AuditQueueItem) => {
    setActiveCallItem(item);
    setClientMetInPerson('yes');
    setProductsConfirmed(true);
    setCallNotes('');
  };

  const handleOpenDisputeModal = (item: AuditQueueItem) => {
    setActiveDisputeItem(item);
    setDisputeFindings('');
    setSecondaryContact('');
    setDisputeDecision('cleared');
  };

  const handleSaveAuditOutcome = async () => {
    if (!activeCallItem) return;
    if (!callNotes.trim()) {
      alert('Please enter detailed interview notes before saving.');
      return;
    }

    if (activeCallItem.isRealRecord) {
      try {
        const callResult =
          clientMetInPerson === 'yes'
            ? 'reached_confirmed'
            : clientMetInPerson === 'no'
            ? 'reached_denied'
            : 'no_answer';

        const { error } = await managementService.recordClientAuditCall({
          auditRecordId: activeCallItem.id,
          callResult,
          notes: callNotes,
        });

        if (error) throw error;
        await loadRealAudits();

        const statusLabel =
          clientMetInPerson === 'yes'
            ? 'Client Confirmed'
            : clientMetInPerson === 'no'
            ? 'Disputed — Pending Human Review (Audit Dispute Flag Raised)'
            : 'Client Unavailable (Re-queued)';

        setToastMessage(`Audit call [${activeCallItem.id}] saved to Supabase: "${statusLabel}".`);
      } catch (err: any) {
        setToastMessage(`Audit call recording failed: ${err.message}`);
      }
    } else {
      const outcome =
        clientMetInPerson === 'yes'
          ? 'confirmed'
          : clientMetInPerson === 'no'
          ? 'disputed'
          : 'unreachable';

      recordAuditCall(activeCallItem.id, outcome, callNotes, productsConfirmed);

      const resultingStatus =
        clientMetInPerson === 'yes'
          ? 'confirmed'
          : clientMetInPerson === 'no'
          ? 'disputed'
          : 'unavailable';

      const statusLabel =
        resultingStatus === 'confirmed'
          ? 'Client Confirmed'
          : resultingStatus === 'disputed'
          ? 'Disputed — Pending Human Review'
          : `Client Unavailable (Re-queued)`;

      setToastMessage(`Audit call [${activeCallItem.id}] recorded as: "${statusLabel}".`);
    }

    setTimeout(() => setToastMessage(null), 5000);
    setActiveCallItem(null);
  };

  const handleSaveDisputeResolution = async () => {
    if (!activeDisputeItem) return;
    if (!disputeFindings.trim()) {
      alert('Please enter managerial inquiry findings before resolving the dispute.');
      return;
    }

    if (activeDisputeItem.isRealRecord) {
      try {
        const decision = disputeDecision === 'cleared' ? 'rep_substantiated' : 'confirmed_violation';
        const { error } = await managementService.resolveClientAuditDispute({
          auditRecordId: activeDisputeItem.id,
          decision,
          mandatoryReason: disputeFindings,
        });

        if (error) throw error;
        await loadRealAudits();

        const resolutionLabel =
          disputeDecision === 'cleared'
            ? 'Dispute Cleared (Secondary Witness Validated)'
            : 'Confirmed Violation (Escalated to HQ Admin/HR)';

        setToastMessage(`Dispute for [${activeDisputeItem.id}] resolved in Supabase: "${resolutionLabel}".`);
      } catch (err: any) {
        setToastMessage(`Failed to resolve dispute: ${err.message}`);
      }
    } else {
      resolveDispute(
        activeDisputeItem.id,
        disputeFindings,
        secondaryContact,
        disputeDecision
      );

      const resolutionLabel =
        disputeDecision === 'cleared'
          ? 'Dispute Cleared (Secondary Witness Validated)'
          : 'Confirmed Violation (Escalated to HQ Admin/HR)';

      setToastMessage(`Dispute for [${activeDisputeItem.id}] resolved: "${resolutionLabel}".`);
    }

    setTimeout(() => setToastMessage(null), 5000);
    setActiveDisputeItem(null);
  };

  const filteredQueue = auditQueue.filter((item) => {
    if (filterType === 'random' && item.sampleType !== 'random_5_percent') return false;
    if (filterType === 'targeted' && item.sampleType !== 'risk_targeted') return false;

    if (filterStatus === 'pending' && item.status !== 'pending_call') return false;
    if (filterStatus === 'resolved' && item.status !== 'confirmed' && item.status !== 'resolved_cleared') return false;
    if (filterStatus === 'disputed' && item.status !== 'disputed' && item.status !== 'resolved_violation') return false;
    if (filterStatus === 'unavailable' && item.status !== 'unavailable') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.clientName.toLowerCase().includes(q) ||
        item.repName.toLowerCase().includes(q) ||
        item.contactName.toLowerCase().includes(q) ||
        item.branchName.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.visitId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = auditQueue.filter((q) => q.status === 'pending_call').length;
  const disputedCount = auditQueue.filter((q) => q.status === 'disputed').length;

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
            className="text-slate-400 hover:text-white font-bold ml-4 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Audit Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <PhoneCall className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">
                Client Audit Phone Call Workbench (PRD §8.3 &amp; AT-10)
              </h3>
              <span className="text-[11px] font-mono font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-emerald-200">
                Market: {currentUser?.marketCode || 'NG'}
              </span>
            </div>
            <p className="text-slate-700 font-medium mt-0.5">
              Weekly 5% random sampling plus risk-targeted visits. Location verification and client confirmation are separate audit dimensions. Client denials trigger{' '}
              <span className="font-bold text-rose-800">Disputed — Pending Review</span> for human management investigation, never automatic disciplinary action.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadRealAudits}
            disabled={isLoadingReal}
            className="h-8 text-xs font-semibold gap-1.5 bg-white border-emerald-300 text-emerald-900"
          >
            {isLoadingReal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleSample5Pct}
            disabled={isSampling}
            className="h-8 text-xs font-bold gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            {isSampling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Run 5% Sample
          </Button>

          <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-900 shadow-2xs">
            {pendingCount} Pending Calls • {disputedCount} Open Disputes
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search audit calls by client, branch, rep, contact, or visit ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 bg-slate-50/50 border-slate-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-xs">
                <span className="font-semibold text-slate-500 mr-1">Status:</span>
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs cursor-pointer ${
                    filterStatus === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  All ({auditQueue.length})
                </button>
                <button
                  onClick={() => setFilterStatus('pending')}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs cursor-pointer ${
                    filterStatus === 'pending'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-900 border border-amber-200'
                  }`}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  onClick={() => setFilterStatus('disputed')}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs cursor-pointer ${
                    filterStatus === 'disputed'
                      ? 'bg-rose-700 text-white'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  Disputes ({disputedCount})
                </button>
                <button
                  onClick={() => setFilterStatus('resolved')}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs cursor-pointer ${
                    filterStatus === 'resolved'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  Confirmed
                </button>
                <button
                  onClick={() => setFilterStatus('unavailable')}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs cursor-pointer ${
                    filterStatus === 'unavailable'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  Unavailable
                </button>
              </div>

              <div className="flex items-center gap-1 text-xs border-l border-slate-200 pl-2">
                <span className="font-semibold text-slate-500 mr-1">Queue:</span>
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2 py-0.5 rounded font-bold text-[11px] cursor-pointer ${
                    filterType === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('random')}
                  className={`px-2 py-0.5 rounded font-bold text-[11px] cursor-pointer ${
                    filterType === 'random'
                      ? 'bg-blue-700 text-white'
                      : 'bg-blue-50 text-brand-blue border border-blue-200'
                  }`}
                >
                  5% Random
                </button>
                <button
                  onClick={() => setFilterType('targeted')}
                  className={`px-2 py-0.5 rounded font-bold text-[11px] cursor-pointer ${
                    filterType === 'targeted'
                      ? 'bg-orange-700 text-white'
                      : 'bg-orange-50 text-orange-800 border border-orange-200'
                  }`}
                >
                  Risk Targeted
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Queue Grid */}
      <div className="space-y-4">
        {filteredQueue.map((item) => {
          const isPending = item.status === 'pending_call';
          const isConfirmed = item.status === 'confirmed';
          const isDisputed = item.status === 'disputed';
          const isUnavailable = item.status === 'unavailable';
          const isResolvedCleared = item.status === 'resolved_cleared';
          const isResolvedViolation = item.status === 'resolved_violation';

          return (
            <Card
              key={item.id}
              className={`border transition-all ${
                isDisputed
                  ? 'border-rose-300 bg-rose-50/20 shadow-xs'
                  : isPending
                  ? 'border-amber-200 bg-white shadow-xs'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <CardContent className="p-5 sm:p-6 pt-5 sm:pt-6 space-y-4">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        item.sampleType === 'random_5_percent'
                          ? 'bg-blue-100 text-brand-blue border border-blue-200'
                          : 'bg-orange-100 text-orange-900 border border-orange-200'
                      }`}
                    >
                      {item.sampleType === 'random_5_percent' ? '5% Random Sample' : 'Risk-Based Audit'}
                    </span>

                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {item.id}
                    </span>

                    {item.isRealRecord && (
                      <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1">
                        <DatabaseIcon className="w-2.5 h-2.5" /> Supabase Audit
                      </span>
                    )}

                    <span className="text-xs text-slate-700 font-semibold">
                      Claimed Rep: <strong className="text-slate-900">{item.repName}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">
                      {item.claimedDate} • {item.claimedTime}
                    </span>
                    {isPending && (
                      <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Call Pending
                      </span>
                    )}
                    {isConfirmed && (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Client Confirmed
                      </span>
                    )}
                    {isDisputed && (
                      <span className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Disputed — Pending Review
                      </span>
                    )}
                    {isUnavailable && (
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        Unavailable (Attempt #{item.callAttempts})
                      </span>
                    )}
                    {isResolvedCleared && (
                      <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-brand-blue" />
                        Dispute Cleared (Secondary Confirmed)
                      </span>
                    )}
                    {isResolvedViolation && (
                      <span className="text-xs font-bold text-red-900 bg-red-100 border border-red-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <AlertOctagon className="w-3.5 h-3.5 text-red-700" />
                        Confirmed Violation (Escalated)
                      </span>
                    )}
                  </div>
                </div>

                {/* Main Client & Contact Call Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-1.5">
                    <h4 className="text-sm font-bold text-slate-900">{item.clientName}</h4>
                    <p className="text-xs text-slate-600 font-medium">{item.branchName}</p>

                    <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3 text-xs space-y-1">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-emerald-800" />
                        Contact: {item.contactName} ({item.contactRole})
                      </div>
                      <div className="flex items-center gap-2 text-slate-700 font-mono font-bold">
                        <Phone className="w-3.5 h-3.5 text-emerald-700" />
                        {item.contactPhone}
                      </div>
                      <div className="text-[11px] text-slate-600 pt-1 border-t border-emerald-100">
                        <strong>Logged Discussion:</strong> {item.productsDiscussed}
                      </div>
                    </div>

                    {/* Dispute Findings if investigated */}
                    {item.disputeFindings && (
                      <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3 text-xs space-y-1">
                        <div className="font-bold text-slate-900 flex items-center gap-1 text-[11px]">
                          <FileText className="w-3.5 h-3.5 text-brand-blue" />
                          Manager Inquiry Findings:
                        </div>
                        <p className="text-[11px] text-slate-700 italic">
                          &ldquo;{item.disputeFindings}&rdquo;
                        </p>
                        {item.secondaryContact && (
                          <p className="text-[10px] text-slate-600 font-semibold">
                            Secondary Contact: {item.secondaryContact}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-500 pt-1 border-t border-blue-100">
                          Resolved by {item.resolvedBy} • {item.resolvedAt}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Audit Result / Status Box */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs flex flex-col justify-between">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Audit Disposition
                      </span>
                      {item.callNotes ? (
                        <p className="text-[11px] text-slate-700 italic">&ldquo;{item.callNotes}&rdquo;</p>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">
                          No call logged yet. Follow standard verification script.
                        </p>
                      )}
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-200 space-y-2">
                      {isPending && (
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full text-xs font-bold bg-brand-green-700 hover:bg-brand-green-800 text-white flex items-center justify-center gap-1.5 cursor-pointer"
                          onClick={() => handleOpenCallModal(item)}
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          Launch Audit Call Workbench
                        </Button>
                      )}

                      {isUnavailable && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs font-bold bg-white border-amber-300 text-amber-900 hover:bg-amber-50 flex items-center justify-center gap-1.5 cursor-pointer"
                          onClick={() => handleOpenCallModal(item)}
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                          Retry Call Attempt ({item.callAttempts + 1})
                        </Button>
                      )}

                      {isDisputed && (
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white flex items-center justify-center gap-1.5 cursor-pointer"
                          onClick={() => handleOpenDisputeModal(item)}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Investigate Dispute
                        </Button>
                      )}

                      {!isPending && (
                        <div className="text-[10px] text-slate-500">
                          Audited by {item.auditedBy || 'Country Sales Head'} • {item.auditedAt || 'Recorded'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 1. Audit Call Questionnaire Modal */}
      {activeCallItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                  Client Audit Workbench • {activeCallItem.id} (Attempt #{activeCallItem.callAttempts + 1})
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Call Verification: {activeCallItem.contactName}
                </h3>
                <p className="text-xs text-slate-500">{activeCallItem.clientName}</p>
              </div>
              <button
                onClick={() => setActiveCallItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Call Info Box */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-slate-800 space-y-1">
                <div className="flex justify-between font-mono font-bold">
                  <span>Direct Phone:</span>
                  <a href={`tel:${activeCallItem.contactPhone}`} className="text-emerald-800 hover:underline">
                    {activeCallItem.contactPhone}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span>Claimed Rep &amp; Time:</span>
                  <span>
                    {activeCallItem.repName} ({activeCallItem.claimedDate} {activeCallItem.claimedTime})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Claimed Products:</span>
                  <span>{activeCallItem.productsDiscussed}</span>
                </div>
              </div>

              {/* Standard Call Script Questions */}
              <div className="space-y-3 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-900 block">
                    1. Did the salesperson physically meet with you in person?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setClientMetInPerson('yes')}
                      className={`p-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        clientMetInPerson === 'yes'
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Yes, Met In Person
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientMetInPerson('no')}
                      className={`p-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        clientMetInPerson === 'no'
                          ? 'bg-rose-600 text-white border-rose-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      No, Meeting Denied
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientMetInPerson('unreachable')}
                      className={`p-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        clientMetInPerson === 'unreachable'
                          ? 'bg-amber-600 text-white border-amber-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Client Unreachable
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <label className="font-bold text-slate-900 block">
                    2. Were the claimed products discussed or inspected?
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                      <input
                        type="radio"
                        name="productsConfirmed"
                        checked={productsConfirmed}
                        onChange={() => setProductsConfirmed(true)}
                        className="text-brand-blue"
                      />
                      Yes, confirmed discussion
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                      <input
                        type="radio"
                        name="productsConfirmed"
                        checked={!productsConfirmed}
                        onChange={() => setProductsConfirmed(false)}
                        className="text-brand-blue"
                      />
                      No / Different topic
                    </label>
                  </div>
                </div>
              </div>

              {/* Call Notes Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 block">
                  Auditor Conversation Notes (Required):
                </label>
                <textarea
                  rows={3}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Summarize the client's comments, confirmed meeting details, or reason for denial..."
                  className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
                />
              </div>

              {clientMetInPerson === 'no' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]">
                  <strong>Warning:</strong> Client denial will immediately transition visit to{' '}
                  <span className="font-bold">Disputed — Pending Review</span> and raise an automated audit dispute flag in Supabase.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs cursor-pointer"
                onClick={() => setActiveCallItem(null)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                className="text-xs font-bold bg-brand-blue hover:bg-brand-blue-700 text-white cursor-pointer"
                onClick={handleSaveAuditOutcome}
              >
                Save Audit Outcome
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Dispute Investigation & Resolution Modal */}
      {activeDisputeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/60">
              <div>
                <span className="text-[10px] font-mono font-bold text-rose-900 uppercase">
                  Management Dispute Inquiry • {activeDisputeItem.id} ({activeDisputeItem.visitId})
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Dispute Investigation: {activeDisputeItem.repName}
                </h3>
                <p className="text-xs text-slate-600">Client: {activeDisputeItem.clientName}</p>
              </div>
              <button
                onClick={() => setActiveDisputeItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Context Summary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 space-y-1">
                <div className="font-bold text-slate-900">Original Audit Denial Statement:</div>
                <p className="italic text-rose-900 bg-white p-2 rounded border border-rose-200 text-[11px]">
                  &ldquo;{activeDisputeItem.callNotes}&rdquo;
                </p>
                <div className="flex justify-between text-[11px] pt-1 text-slate-600">
                  <span>Claimed Rep: {activeDisputeItem.repName}</span>
                  <span>Contact: {activeDisputeItem.contactName} ({activeDisputeItem.contactPhone})</span>
                </div>
              </div>

              {/* Resolution Form */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-900 block">
                    Manager Inquiry Findings &amp; Rep Statement (Required):
                  </label>
                  <textarea
                    rows={3}
                    value={disputeFindings}
                    onChange={(e) => setDisputeFindings(e.target.value)}
                    placeholder="Document interview with representative, witness statements, gate logbook check..."
                    className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-900 block">
                    Secondary Verification Contact / Witness (Optional):
                  </label>
                  <Input
                    placeholder="e.g. Workshop Foreman Hassan or Gate Logbook Entry #412"
                    value={secondaryContact}
                    onChange={(e) => setSecondaryContact(e.target.value)}
                    className="text-xs h-8 bg-white"
                  />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <label className="font-bold text-slate-900 block">
                    Managerial Resolution Disposition:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDisputeDecision('cleared')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                        disputeDecision === 'cleared'
                          ? 'bg-blue-50 border-brand-blue text-brand-blue'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-brand-blue" />
                        Clear Dispute (Validated)
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Secondary contact confirmed representative visit; client contact was absent or mistaken.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDisputeDecision('violation')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                        disputeDecision === 'violation'
                          ? 'bg-rose-50 border-rose-600 text-rose-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <AlertOctagon className="w-4 h-4 text-rose-600" />
                        Confirm Violation (Escalate)
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Investigation concluded meeting did not occur; escalate to HQ Admin &amp; HR for disciplinary review.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs cursor-pointer"
                onClick={() => setActiveDisputeItem(null)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                className="text-xs font-bold bg-brand-blue hover:bg-brand-blue-700 text-white cursor-pointer"
                onClick={handleSaveDisputeResolution}
              >
                Record Management Resolution
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
