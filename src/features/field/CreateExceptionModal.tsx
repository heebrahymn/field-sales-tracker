import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFieldSession, FieldExceptionRecord } from '@/context/FieldSessionContext';
import { getMarketWorkDate } from '@/services/attendanceService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  X,
  ShieldAlert,
  Info,
  Building2,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface CreateExceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateExceptionModal: React.FC<CreateExceptionModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const { branches, submitException } = useFieldSession();

  const [type, setType] = useState<FieldExceptionRecord['type']>('gps_failure');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || '');
  const [branchName, setBranchName] = useState<string>(branches[0]?.branchName || 'Apex Heavy Logistics Fleet Depot');
  const [claimedDate, setClaimedDate] = useState<string>(() => getMarketWorkDate(currentUser?.marketCode));
  const [claimedTime, setClaimedTime] = useState<string>('13:40 - 14:15 WAT');
  const [reason, setReason] = useState<string>(
    'Client facility workshop is located in an underground basement loading bay; severe concrete attenuation prevented satellite acquisition (GPS accuracy degraded beyond 140m).'
  );
  const [evidenceNote, setEvidenceNote] = useState<string>(
    'Signage photographed at facility gate; stamped manual visitor log entry signed by Workshop Superintendent.'
  );

  useEffect(() => {
    if (branches && branches.length > 0) {
      if (!selectedBranchId || !branches.some((b) => b.id === selectedBranchId)) {
        setSelectedBranchId(branches[0].id);
        setBranchName(branches[0].branchName);
      }
    }
  }, [branches, selectedBranchId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let title = 'GPS Signal Failure Exception';
    if (type === 'camera_failure') title = 'Camera Hardware / Capture Failure';
    if (type === 'device_breakdown') title = 'Handset Depletion & Retrospective Submission';
    if (type === 'missed_visit_claim') title = 'Missed Visit Activity Claim';

    submitException({
      type,
      title,
      branchName,
      branchCode: selectedBranchId,
      claimedDate,
      claimedTime,
      reason,
      evidenceNote,
    } as any);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                PRD §7.4 Salesperson-Originated Exception
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-base mt-1">
              Submit Operational Exception Claim
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Salesperson: {currentUser.name} • Strictly Rep-Created
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 text-xs text-slate-700">
          {/* PRD Authority Rule */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-950 leading-relaxed">
              <strong className="text-amber-900 font-semibold">Mandatory Business Rule:</strong> Salesperson creates and submits every missed-visit, GPS-failure, or device-failure record. Managers review and approve/reject, but <strong>never</strong> create logs on your behalf.
            </div>
          </div>

          {/* Exception Type */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-900">
              Failure / Exception Category <span className="text-red-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-brand-blue focus:outline-none"
            >
              <option value="gps_failure">GPS Signal Failure (Basement / Multipath / Obstruction)</option>
              <option value="camera_failure">Camera Hardware / Capture Failure</option>
              <option value="device_breakdown">Device Depletion / Post-Recovery Submission</option>
              <option value="missed_visit_claim">Missed Physical Visit Activity Claim</option>
            </select>
          </div>

          {/* Target Branch */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-900 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-brand-blue" />
              Target Client Branch <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedBranchId(id);
                const b = branches.find((item) => item.id === id);
                if (b) setBranchName(b.branchName);
              }}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-brand-blue focus:outline-none"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.branchName} ({b.branchCode})
                </option>
              ))}
            </select>
          </div>

          {/* Claimed Date & Time Window */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-900">
                Claimed Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={claimedDate}
                onChange={(e) => setClaimedDate(e.target.value)}
                className="text-xs h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-900">
                Claimed Meeting Time <span className="text-red-500">*</span>
              </label>
              <Input
                value={claimedTime}
                onChange={(e) => setClaimedTime(e.target.value)}
                placeholder="e.g. 13:40 - 14:15 WAT"
                className="text-xs h-10 font-mono"
              />
            </div>
          </div>

          {/* Detailed Narrative Reason */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-900">
              Operational Failure Narrative <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State exactly why automated GPS or camera capture could not be obtained..."
              required
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-blue focus:outline-none font-medium text-slate-900"
            />
          </div>

          {/* Supporting Evidence Note */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-900 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-brand-blue" />
              Supporting Evidence Available <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              value={evidenceNote}
              onChange={(e) => setEvidenceNote(e.target.value)}
              placeholder="e.g. Signed visitor book entry, paper card, or entrance photograph..."
              required
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-blue focus:outline-none font-medium text-slate-900"
            />
          </div>

          {/* Manager Audit Dimension Warning */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <p className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Audit Dimension Reminder:
            </p>
            <p className="text-[10px] text-slate-600 leading-tight">
              Approved records become <strong className="text-slate-900">Manager Approved — Location Unverified</strong>. They are never converted into GPS Verified visits, preserving audit integrity.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="p-4 -mx-4 -mb-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 rounded-b-2xl">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs h-11 px-4 border-slate-300"
            >
              Cancel
            </Button>
            <Button
              id="btn-submit-exception-claim"
              type="submit"
              className="text-xs h-11 px-5 font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-1.5"
            >
              <ShieldAlert className="w-4 h-4" /> Submit Exception Claim
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
