import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, CheckCircle2, AlertTriangle, Camera } from 'lucide-react';

export interface ApprovalItem {
  id: string;
  type: 'pin_approval' | 'exception_approval';
  title: string;
  subtitle: string;
  repName: string;
  claimedTime: string;
  accuracy: string;
  evidenceNote: string;
  sharedPhoneWarning?: boolean;
}

interface ApprovalDecisionModalProps {
  item: ApprovalItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDecision: (itemId: string, decision: 'approved' | 'rejected' | 'escalated', reason: string) => void;
}

export const ApprovalDecisionModal: React.FC<ApprovalDecisionModalProps> = ({
  item,
  isOpen,
  onClose,
  onDecision,
}) => {
  const [decisionReason, setDecisionReason] = useState('');
  const [validationError, setValidationError] = useState('');

  if (!isOpen || !item) return null;

  const handleAction = (decision: 'approved' | 'rejected' | 'escalated') => {
    if (!decisionReason.trim()) {
      setValidationError('A documented decision rationale is required for managerial audit trails.');
      return;
    }
    setValidationError('');
    onDecision(item.id, decision, decisionReason);
    setDecisionReason('');
    onClose();
  };

  const isPin = item.type === 'pin_approval';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-bold text-brand-blue uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {isPin ? 'Client Location & GPS Pin Proposal Review' : 'Salesperson Exception Review'}
            </span>
            <h3 className="font-bold text-slate-900 text-base mt-1">
              Manager Approval Decision Workbench
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-800">
          {/* Target Subject Details */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                <p className="text-xs text-slate-600 font-medium">{item.subtitle}</p>
              </div>
              <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                {item.claimedTime}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-[11px]">
              <div>
                <span className="text-slate-500 font-medium">Submitted by:</span>{' '}
                <strong className="text-slate-900">{item.repName}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">GPS Accuracy:</span>{' '}
                <strong className="text-emerald-800 font-mono">{item.accuracy}</strong>
              </div>
            </div>
          </div>

          {/* Evidence Review Panel */}
          <div className="space-y-1.5">
            <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              1. Captured Field Evidence:
            </h5>
            <div className="p-3 bg-white border border-slate-300 rounded-xl space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-300 flex flex-col items-center justify-center font-bold text-[9px] text-slate-600 shrink-0">
                  <Camera className="w-4 h-4 mb-0.5 text-slate-400" />
                  <span>[DEMO]</span>
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-900 text-[11px]">Live Premises Photograph</p>
                  <p className="text-[10px] text-slate-600">Captured at timestamp: {item.claimedTime}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Camera Stream Validated
                  </span>
                </div>
              </div>

              {item.sharedPhoneWarning && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-slate-700 leading-tight">
                  <strong className="text-brand-blue font-bold">Policy Note (PRD §4.2):</strong> A shared parent telephone number was detected across sibling client locations. This is explicitly permitted and does not invalidate the physical client location.
                </div>
              )}

              <p className="text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <strong className="text-slate-900">Salesperson Narrative Note:</strong> &ldquo;{item.evidenceNote}&rdquo;
              </p>
            </div>
          </div>

          {/* Mandatory Decision Reason Input */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-900 text-xs">
              2. Manager Decision Rationale / Audit Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={decisionReason}
              onChange={(e) => {
                setDecisionReason(e.target.value);
                if (validationError) setValidationError('');
              }}
              placeholder="Enter mandatory justification for audit history (e.g., 'Coordinates verified against landmark building. Premises signage matches trade registry.')..."
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-blue focus:outline-none font-medium text-slate-900"
            />
            {validationError ? (
              <p className="text-[11px] text-red-600 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {validationError}
              </p>
            ) : (
              <p className="text-[10px] text-slate-500">
                This rationale is permanently recorded in the append-only `approval_audit` table.
              </p>
            )}
          </div>

          {/* PRD Counting Reminder */}
          {!isPin && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900">
              <strong className="font-bold">Counting Policy Notice:</strong> Approving this exception classifies the visit as <strong className="font-bold">Manager Approved — Location Unverified</strong>. It will be reported separately and will <strong>never</strong> count as a standard GPS-verified visit.
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs h-10 px-3 text-slate-600"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('rejected')}
              className="text-xs h-10 px-3 border-red-200 text-red-700 hover:bg-red-50 font-semibold"
            >
              Reject Submission
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => handleAction('approved')}
              className={`text-xs h-10 px-4 font-bold text-white ${
                isPin ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-brand-blue hover:bg-brand-blue-700'
              }`}
            >
              {isPin ? 'Confirm Location Pin Approval' : 'Approve (Unverified Activity)'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
