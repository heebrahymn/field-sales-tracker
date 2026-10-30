import React, { useState } from 'react';
import { useFieldSession } from '@/context/FieldSessionContext';
import { NonVisitDayModal } from '@/features/field/NonVisitDayModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  CalendarCheck,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  XCircle,
  ChevronLeft,
} from 'lucide-react';

interface NonVisitDaysViewProps {
  onNavigateHome?: () => void;
}

export const NonVisitDaysView: React.FC<NonVisitDaysViewProps> = ({ onNavigateHome }) => {
  const {
    userNonVisitRequests,
    refreshNonVisitRequests,
    cancelNonVisitDayRequest,
  } = useFieldSession();

  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshNonVisitRequests();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this pending non-visit workday request?')) {
      setCancellingId(id);
      try {
        await cancelNonVisitDayRequest(id);
      } finally {
        setCancellingId(null);
      }
    }
  };

  const pendingCount = userNonVisitRequests.filter((r) => r.status === 'pending').length;
  const approvedCount = userNonVisitRequests.filter((r) => r.status === 'approved').length;
  const rejectedCount = userNonVisitRequests.filter((r) => r.status === 'rejected').length;

  const filteredRequests = userNonVisitRequests.filter((r) => {
    if (filterStatus === 'pending') return r.status === 'pending';
    if (filterStatus === 'approved') return r.status === 'approved';
    if (filterStatus === 'rejected') return r.status === 'rejected';
    return true;
  });

  const formatCategory = (cat: string) => {
    return cat
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onNavigateHome && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateHome}
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
              title="Return to Dashboard"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-brand-blue" />
              Non-Visit Workday Authorizations
            </h2>
            <p className="text-[11px] text-slate-500">
              PRD §7.6 • Office, training &amp; authorized non-field working days
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 px-2.5 text-xs text-slate-700 bg-white border-slate-300"
            title="Refresh requests"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="h-8 px-3 text-xs font-bold bg-brand-blue hover:bg-brand-blue-700 text-white gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Request</span>
          </Button>
        </div>
      </div>

      {/* Info Notice Box */}
      <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-slate-700 leading-relaxed">
        <strong className="text-brand-blue font-semibold block mb-0.5">Manager Approval Policy (PRD §6.2 &amp; §7.6):</strong>
        Approved non-visit days provide full daily attendance credit without penalizing daily physical client visit quotas. All requests require prior authorization from your Country Sales Head.
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shrink-0 ${
            filterStatus === 'all'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Requests ({userNonVisitRequests.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('pending')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shrink-0 flex items-center gap-1.5 ${
            filterStatus === 'pending'
              ? 'bg-amber-600 text-white border-amber-600'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-3 h-3" />
          Pending ({pendingCount})
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('approved')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shrink-0 flex items-center gap-1.5 ${
            filterStatus === 'approved'
              ? 'bg-emerald-700 text-white border-emerald-700'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CheckCircle2 className="w-3 h-3" />
          Approved ({approvedCount})
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('rejected')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shrink-0 flex items-center gap-1.5 ${
            filterStatus === 'rejected'
              ? 'bg-rose-700 text-white border-rose-700'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AlertCircle className="w-3 h-3" />
          Rejected ({rejectedCount})
        </button>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 space-y-3">
            <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <div>
              <h4 className="font-bold text-sm text-slate-800">No non-visit requests found</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {filterStatus === 'all'
                  ? 'You have not submitted any non-visit day requests.'
                  : `No requests with status "${filterStatus}".`}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="text-xs h-8 px-3 bg-brand-blue hover:bg-brand-blue-700 text-white font-bold"
            >
              Submit Non-Visit Day Request
            </Button>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isPending = req.status === 'pending';
            const isApproved = req.status === 'approved';
            const isRejected = req.status === 'rejected';

            return (
              <Card
                key={req.id}
                className={`border shadow-xs transition-all ${
                  isApproved
                    ? 'border-emerald-200 bg-white'
                    : isRejected
                    ? 'border-rose-200 bg-white'
                    : 'border-amber-200 bg-amber-50/20'
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Top Header Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-brand-blue" />
                        <span>Workday: {req.absence_date}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 mt-0.5 block">
                        {formatCategory(req.category)}
                      </span>
                    </div>

                    <div>
                      {isPending && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-amber-700" />
                          Pending Review
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          Approved
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3 text-rose-700" />
                          Rejected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Justification Narrative */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Salesperson Justification:
                    </span>
                    <p className="text-slate-800 leading-relaxed font-medium">
                      {req.justification || 'No narrative justification provided.'}
                    </p>
                  </div>

                  {/* Decision Callout */}
                  {isApproved && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 leading-relaxed">
                      <strong>Approved by Country Sales Head:</strong> Attendance credit granted for this workday; physical visit targets waived.
                    </div>
                  )}

                  {isRejected && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 leading-relaxed">
                      <strong>Rejected by Country Sales Head:</strong> Reason:{' '}
                      <em>&quot;{req.rejection_reason || 'Physical in-person visits required for this scheduled date.'}&quot;</em>
                    </div>
                  )}

                  {/* Footer / Cancel Action for Pending Requests */}
                  {isPending && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono">
                        Awaiting Country Sales Head Decision
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancel(req.id)}
                        disabled={cancellingId === req.id}
                        className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 font-bold gap-1"
                      >
                        <XCircle className="w-3 h-3" />
                        {cancellingId === req.id ? 'Cancelling...' : 'Cancel Request'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* New Request Modal */}
      <NonVisitDayModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          refreshNonVisitRequests();
        }}
      />
    </div>
  );
};

