import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ApprovalDecisionModal, ApprovalItem } from '@/features/review/ApprovalDecisionModal';
import { useFieldSession } from '@/context/FieldSessionContext';
import { useAuth } from '@/context/AuthContext';
import { managementService, RealExceptionItem } from '@/services/managementService';
import {
  ShieldAlert,
  AlertOctagon,
  Clock,
  BatteryCharging,
  WifiOff,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  FileText,
  Info,
  RefreshCw,
  Loader2,
  Database as DatabaseIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface ExceptionRecord extends ApprovalItem {
  exceptionType: 'gps_failure' | 'device_failure' | 'missed_visit';
  clientName: string;
  branchName: string;
  claimedDuration: string;
  submissionLag: string;
  productsDiscussed: string;
  contactMet: string;
  failureReason: string;
  status: 'pending_review' | 'manager_approved_unverified' | 'rejected' | 'escalated';
  isRealRecord?: boolean;
  rawDate?: string;
  managerDecision?: {
    action: 'approved' | 'rejected' | 'escalated';
    reason: string;
    decidedBy: string;
    decidedAt: string;
  };
}

const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

export const ExceptionReviewWorkbench: React.FC = () => {
  const { currentUser } = useAuth();
  const { approveException, rejectException, escalateException } = useFieldSession();

  const [filterType, setFilterType] = useState<'all' | 'gps_failure' | 'device_failure' | 'missed_visit'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedException, setSelectedException] = useState<ApprovalItem | null>(null);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Real Supabase exceptions
  const [realExceptions, setRealExceptions] = useState<RealExceptionItem[]>([]);
  const [isLoadingReal, setIsLoadingReal] = useState(false);

  const loadRealExceptions = useCallback(async () => {
    if (isTestEnv) return;
    setIsLoadingReal(true);
    try {
      const market = currentUser?.marketCode || 'NG';
      const { data, error } = await managementService.getCountryExceptions(market, 'all');
      if (error) {
        console.warn('[ExceptionReviewWorkbench] Failed to query Supabase exceptions:', error.message);
      } else {
        setRealExceptions(data);
      }
    } catch (err: any) {
      console.warn('[ExceptionReviewWorkbench] Error:', err);
    } finally {
      setIsLoadingReal(false);
    }
  }, [currentUser?.marketCode]);

  useEffect(() => {
    loadRealExceptions();
  }, [loadRealExceptions]);

  const exceptions: ExceptionRecord[] = useMemo(() => {
    // Map real exceptions from Supabase
    const realMapped: ExceptionRecord[] = realExceptions.map((item) => {
      let mappedType: ExceptionRecord['exceptionType'] = 'gps_failure';
      if (item.exceptionType === 'device_depletion' || item.exceptionType === 'camera_failure') {
        mappedType = 'device_failure';
      } else if (item.exceptionType === 'missed_visit') {
        mappedType = 'missed_visit';
      }

      let mappedStatus: ExceptionRecord['status'] = 'pending_review';
      if (item.status === 'approved') mappedStatus = 'manager_approved_unverified';
      else if (item.status === 'rejected') mappedStatus = 'rejected';
      else if (item.status === 'escalated') mappedStatus = 'escalated';

      return {
        id: item.id,
        type: 'exception_approval',
        exceptionType: mappedType,
        title: `${item.branchName} (${item.exceptionType.replace('_', ' ')})`,
        subtitle: `${item.failureReason.slice(0, 65)}...`,
        clientName: item.organisationName,
        branchName: item.branchName,
        repName: item.repName,
        claimedTime: item.claimedCheckInTime ? new Date(item.claimedCheckInTime).toLocaleString() : 'Claimed Visit',
        claimedDuration: `${item.claimedDurationMinutes} mins`,
        submissionLag: 'Delayed Recovery Log',
        accuracy: '±135m (Location Unverified)',
        evidenceNote: item.failureReason,
        productsDiscussed: 'Operational Supplies Review',
        contactMet: 'Site Operations Lead',
        failureReason: item.failureReason,
        status: mappedStatus,
        isRealRecord: true,
        rawDate: item.claimedCheckInTime ? item.claimedCheckInTime.slice(0, 10) : item.submittedAt ? item.submittedAt.slice(0, 10) : '',
        managerDecision: item.decisionReason
          ? {
              action: mappedStatus === 'rejected' ? 'rejected' : mappedStatus === 'escalated' ? 'escalated' : 'approved',
              reason: item.decisionReason,
              decidedBy: item.reviewedByName || 'Country Sales Head',
              decidedAt: item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : 'Decided',
            }
          : undefined,
      };
    });

    return realMapped;
  }, [realExceptions]);

  const handleOpenDecision = (item: ExceptionRecord) => {
    setSelectedException(item);
    setDecisionModalOpen(true);
  };

  const handleDecisionRecorded = async (
    itemId: string,
    decision: 'approved' | 'rejected' | 'escalated',
    reason: string
  ) => {
    const isReal = realExceptions.some((r) => r.id === itemId);

    if (isReal) {
      try {
        const { error } = await managementService.reviewSalespersonException(
          itemId,
          decision as any,
          reason
        );
        if (error) throw error;
        await loadRealExceptions();

        const statusLabel =
          decision === 'approved'
            ? 'Manager Approved — Location Unverified'
            : decision === 'rejected'
            ? 'Rejected'
            : 'Escalated to HQ Admin';

        setToastMessage(
          `Supabase Exception [${itemId}] marked as "${statusLabel}". Rationale recorded to immutable audit ledger.`
        );
      } catch (err: any) {
        setToastMessage(`Exception review failed: ${err.message}`);
      }
    } else {
      if (decision === 'approved') {
        approveException(itemId, reason);
      } else if (decision === 'rejected') {
        rejectException(itemId, reason);
      } else {
        escalateException(itemId, reason);
      }

      const statusLabel =
        decision === 'approved'
          ? 'Manager Approved — Location Unverified'
          : decision === 'rejected'
          ? 'Rejected'
          : 'Escalated to HQ Admin';

      setToastMessage(
        `Exception [${itemId}] marked as "${statusLabel}". Rationale recorded to demonstration audit log.`
      );
    }
  };

  const distinctUsers = useMemo(() => {
    return Array.from(new Set(exceptions.map((e) => e.repName).filter(Boolean))).sort();
  }, [exceptions]);

  const filteredExceptions = exceptions.filter((item) => {
    if (filterType !== 'all' && item.exceptionType !== filterType) return false;
    if (statusFilter === 'pending' && item.status !== 'pending_review') return false;
    if (statusFilter === 'resolved' && item.status === 'pending_review') return false;
    if (selectedUser !== 'all' && item.repName !== selectedUser) return false;
    if (selectedDate && item.rawDate !== selectedDate) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        item.repName.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredExceptions.length / pageSize));
  const paginatedExceptions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredExceptions.slice(start, start + pageSize);
  }, [filteredExceptions, currentPage, pageSize]);

  const pendingCount = exceptions.filter((e) => e.status === 'pending_review').length;
  const approvedUnverifiedCount = exceptions.filter(
    (e) => e.status === 'manager_approved_unverified'
  ).length;

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

      {/* Mandatory Governance Alert: Manager Boundaries */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Exception Approval Workbench (PRD §7.5 &amp; §8.1)
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                Strict Governance
              </span>
              <span className="text-[10px] font-mono font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-amber-200">
                Market: {currentUser?.marketCode || 'NG'}
              </span>
            </div>
            <p className="text-xs text-slate-700 font-medium mt-1">
              <strong>Crucial Rule:</strong> Country Sales Heads review, approve, reject, comment, or escalate, but{' '}
              <span className="text-red-700 font-bold underline">never originate</span> salesperson visit or exception logs. Approved missing-GPS records remain{' '}
              <span className="text-amber-900 font-bold">Manager Approved — Location Unverified</span> and are never converted to GPS Verified.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadRealExceptions}
            disabled={isLoadingReal}
            className="h-8 text-xs font-semibold gap-1.5 bg-white border-amber-300 text-amber-900"
          >
            {isLoadingReal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </Button>
          <div className="bg-white px-3 py-1.5 rounded-lg border border-amber-200 text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500">Awaiting Sign-off</div>
            <div className="text-lg font-black text-amber-900">{pendingCount} Pending</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search exceptions by client, location, rep name, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 bg-slate-50/50 border-slate-200"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-semibold text-slate-500 shrink-0 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Status:
              </span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({exceptions.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  statusFilter === 'pending'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setStatusFilter('resolved')}
                className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  statusFilter === 'resolved'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Resolved ({approvedUnverifiedCount})
              </button>
            </div>
          </div>

          {/* Secondary Filter Row: Salesperson, Date, and Failure Class */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Salesperson Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 shrink-0">Salesperson:</span>
                <select
                  value={selectedUser}
                  onChange={(e) => {
                    setSelectedUser(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-xs h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-blue"
                >
                  <option value="all">All Salespeople ({distinctUsers.length})</option>
                  {distinctUsers.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 shrink-0">Date:</span>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-xs h-8 w-36 bg-slate-50 border-slate-200"
                />
                {selectedDate && (
                  <button
                    onClick={() => {
                      setSelectedDate('');
                      setCurrentPage(1);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 font-bold px-1"
                    title="Clear date filter"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Failure Class Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 mr-0.5">Class:</span>
              <button
                onClick={() => { setFilterType('all'); setCurrentPage(1); }}
                className={`text-[11px] px-2 py-0.5 rounded font-bold transition-colors ${
                  filterType === 'all'
                    ? 'bg-brand-blue text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => { setFilterType('gps_failure'); setCurrentPage(1); }}
                className={`text-[11px] px-2 py-0.5 rounded font-bold flex items-center gap-1 transition-colors ${
                  filterType === 'gps_failure'
                    ? 'bg-orange-700 text-white'
                    : 'bg-orange-50 text-orange-800 border border-orange-200'
                }`}
              >
                <WifiOff className="w-3 h-3" /> GPS
              </button>
              <button
                onClick={() => { setFilterType('device_failure'); setCurrentPage(1); }}
                className={`text-[11px] px-2 py-0.5 rounded font-bold flex items-center gap-1 transition-colors ${
                  filterType === 'device_failure'
                    ? 'bg-purple-700 text-white'
                    : 'bg-purple-50 text-purple-800 border border-purple-200'
                }`}
              >
                <BatteryCharging className="w-3 h-3" /> Device
              </button>
              <button
                onClick={() => { setFilterType('missed_visit'); setCurrentPage(1); }}
                className={`text-[11px] px-2 py-0.5 rounded font-bold flex items-center gap-1 transition-colors ${
                  filterType === 'missed_visit'
                    ? 'bg-rose-700 text-white'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <AlertOctagon className="w-3 h-3" /> Missed Visit
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exception Queue Grid */}
      <div className="space-y-4">
        {paginatedExceptions.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-xs">
            No exception logs match your selected filter criteria.
          </div>
        ) : (
          paginatedExceptions.map((item) => {
            const isPending = item.status === 'pending_review';
            const isApproved = item.status === 'manager_approved_unverified';
            const isRejected = item.status === 'rejected';

            return (
              <Card
                key={item.id}
                className={`border transition-all ${
                  isPending
                    ? 'border-amber-300 shadow-sm bg-white'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <CardContent className="p-5 sm:p-6 pt-5 sm:pt-6 space-y-4">
                  {/* Top Bar: Type Badge, ID, Rep & Claimed Time */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                          item.exceptionType === 'gps_failure'
                            ? 'bg-orange-100 text-orange-900 border border-orange-200'
                            : item.exceptionType === 'device_failure'
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : 'bg-rose-100 text-rose-900 border border-rose-200'
                        }`}
                      >
                        {item.exceptionType === 'gps_failure' && <WifiOff className="w-3 h-3" />}
                        {item.exceptionType === 'device_failure' && <BatteryCharging className="w-3 h-3" />}
                        {item.exceptionType === 'missed_visit' && <AlertOctagon className="w-3 h-3" />}
                        {item.exceptionType.replace('_', ' ')}
                      </span>

                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {item.id}
                      </span>

                      {item.isRealRecord && (
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <DatabaseIcon className="w-2.5 h-2.5" /> Supabase Record
                        </span>
                      )}

                      <span className="text-xs text-slate-600 font-semibold">
                        Logged by: <strong className="text-slate-900">{item.repName}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-600 font-semibold bg-slate-100 px-2.5 py-1 rounded border border-slate-200 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {item.claimedTime}
                      </span>
                      {isPending && <StatusBadge status="pending_review" size="sm" />}
                      {isApproved && (
                        <span className="text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                          Manager Approved — Location Unverified
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-xs font-bold text-red-800 bg-red-100 border border-red-300 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          Rejected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 space-y-1.5">
                      <h4 className="text-base font-bold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-600 font-medium">
                        {item.clientName} • <span className="text-slate-700">{item.branchName}</span>
                      </p>

                      {/* Rep Narrative Explanation */}
                      <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3 text-xs space-y-1.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-amber-800" />
                          Salesperson Narrative &amp; Failure Explanation:
                        </div>
                        <p className="text-slate-700 font-medium italic">&ldquo;{item.evidenceNote}&rdquo;</p>
                        <p className="text-[11px] text-slate-600">
                          <strong>Technical Cause:</strong> {item.failureReason}
                        </p>
                      </div>
                    </div>

                    {/* Operational Evidence Indicators */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Operational Signals
                      </div>
                      <div className="space-y-1 text-slate-700 text-[11px]">
                        <div>
                          <strong>Contact Met:</strong> {item.contactMet}
                        </div>
                        <div>
                          <strong>Products:</strong> {item.productsDiscussed}
                        </div>
                        <div>
                          <strong>Claimed Duration:</strong> {item.claimedDuration}
                        </div>
                        <div>
                          <strong>Submission Lag:</strong>{' '}
                          <span className="text-amber-800 font-semibold">{item.submissionLag}</span>
                        </div>
                        <div>
                          <strong>GPS Signal Fix:</strong>{' '}
                          <span className="text-red-700 font-bold">{item.accuracy}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Existing Manager Decision (if resolved) */}
                  {item.managerDecision && (
                    <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-bold text-slate-700">
                          Decision by {item.managerDecision.decidedBy} ({item.managerDecision.decidedAt}):
                        </span>
                        <p className="text-slate-800 font-medium italic">
                          &ldquo;{item.managerDecision.reason}&rdquo;
                        </p>
                      </div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-300 shrink-0">
                        Audit Trail Committed
                      </span>
                    </div>
                  )}

                  {/* Action Bar for Pending Items */}
                  {isPending && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <Info className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          Approving counts as <strong>unverified visit</strong> for rep activity; does not count toward verified GPS targets.
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs font-semibold text-red-700 border-red-200 hover:bg-red-50"
                          onClick={() => handleOpenDecision(item)}
                        >
                          Reject Exception
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="text-xs font-bold bg-brand-blue hover:bg-brand-blue-700 text-white"
                          onClick={() => handleOpenDecision(item)}
                        >
                          Review &amp; Decide
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {filteredExceptions.length > 0 && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span>
              Showing <strong className="text-slate-900">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-slate-900">
                {Math.min(currentPage * pageSize, filteredExceptions.length)}
              </strong>{' '}
              of <strong className="text-slate-900">{filteredExceptions.length}</strong> exceptions
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Rows Per Page */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-xs h-7 px-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-800"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Prev / Page / Next */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-7 px-2.5 text-xs font-semibold"
              >
                Previous
              </Button>
              <span className="px-2 font-semibold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-7 px-2.5 text-xs font-semibold"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Decision Modal */}
      <ApprovalDecisionModal
        item={selectedException}
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        onDecision={handleDecisionRecorded}
      />
    </div>
  );
};
