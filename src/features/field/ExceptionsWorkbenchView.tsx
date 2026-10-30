import React, { useState, useEffect } from 'react';
import { useFieldSession } from '@/context/FieldSessionContext';
import { CreateExceptionModal } from '@/features/field/CreateExceptionModal';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  FileText,
  AlertTriangle,
  UserCheck,
  AlertOctagon,
  RefreshCw,
} from 'lucide-react';

export const ExceptionsWorkbenchView: React.FC = () => {
  const { exceptions, refreshExceptions } = useFieldSession();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshExceptions();
  }, [refreshExceptions]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshExceptions();
    } finally {
      setIsRefreshing(false);
    }
  };

  const pendingCount = exceptions.filter((e) => e.status === 'pending_review').length;
  const approvedCount = exceptions.filter((e) => e.status === 'approved_unverified').length;
  const rejectedCount = exceptions.filter((e) => e.status === 'rejected').length;

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto select-none">
      {/* Top Header Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
            PRD §7.4 Operational Exceptions
          </span>
          <h2 className="text-lg font-bold text-slate-900 leading-tight">
            My Exceptions Workbench
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            GPS failure, device recovery, and missed visit claims
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="h-10 px-3 text-xs font-semibold border-slate-300 text-slate-700 bg-white hover:bg-slate-50 min-h-[44px]"
            title="Refresh exceptions status from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-10 px-3.5 gap-1.5 shadow-sm min-h-[44px]"
          >
            <Plus className="w-4 h-4" /> New Claim
          </Button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wide">
            Pending Review
          </span>
          <span className="text-xl font-bold text-amber-600 font-mono">{pendingCount}</span>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wide">
            Approved Unverified
          </span>
          <span className="text-xl font-bold text-blue-800 font-mono">{approvedCount}</span>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wide">
            Rejected
          </span>
          <span className="text-xl font-bold text-slate-700 font-mono">{rejectedCount}</span>
        </div>
      </div>

      {/* Strict Salesperson-Only Authority Governance Alert */}
      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs">
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-[11px] text-amber-950 leading-relaxed">
          <strong className="text-amber-900">Governance Rule:</strong> Salesperson creates and submits every missed-visit, GPS-failure, or device-failure record. Managers review/approve/reject, but <strong>never</strong> create logs for a salesperson.
        </div>
      </div>

      {/* Exceptions List */}
      <div className="space-y-3">
        {exceptions.map((exc) => {
          return (
            <div
              key={exc.id}
              className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3"
            >
              {/* Header: Title & Status Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Claim #{exc.id.slice(-6)} • Submitted {exc.submittedAt}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base leading-snug">
                    {exc.title}
                  </h3>
                </div>

                {exc.status === 'pending_review' && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" /> Pending Review
                  </span>
                )}

                {exc.status === 'approved_unverified' && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-brand-blue" /> Manager Approved (Unverified)
                  </span>
                )}

                {exc.status === 'rejected' && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1 shrink-0">
                    <XCircle className="w-3 h-3" /> Rejected
                  </span>
                )}

                {exc.status === 'escalated' && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1 shrink-0">
                    <AlertOctagon className="w-3 h-3 text-purple-700" /> Escalated to HQ
                  </span>
                )}
              </div>

              {/* Branch & Claimed Time */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Building2 className="w-3.5 h-3.5 text-brand-blue" />
                  <span>{exc.branchName}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-600 font-mono">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Claimed: {exc.claimedDate} • {exc.claimedTime}</span>
                </div>
              </div>

              {/* Reason Narrative */}
              <div className="text-xs space-y-1">
                <span className="font-bold text-slate-700 block text-[11px]">Failure Reason:</span>
                <p className="text-slate-800 leading-relaxed bg-slate-50/50 p-2 rounded border border-slate-100">
                  {exc.reason}
                </p>
              </div>

              {/* Supporting Evidence */}
              <div className="text-xs space-y-1">
                <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
                  <FileText className="w-3 h-3 text-slate-400" /> Supporting Evidence:
                </span>
                <p className="text-slate-600 italic text-[11px]">
                  {exc.evidenceNote}
                </p>
              </div>

              {/* Manager Decision Audit Box if reviewed */}
              {exc.managerComment && (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-brand-blue flex items-center gap-1 text-[11px]">
                      <UserCheck className="w-3.5 h-3.5" /> Sales Head Review Decision
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{exc.decisionDate}</span>
                  </div>
                  <p className="text-slate-800 text-[11px] leading-relaxed">
                    &quot;{exc.managerComment}&quot;
                  </p>
                  <p className="text-[9px] text-slate-500 italic pt-0.5">
                    * Retains audit status: Manager Approved — Location Unverified.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      <CreateExceptionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};
