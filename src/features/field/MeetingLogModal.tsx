import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, CheckCircle2, Clock } from 'lucide-react';

interface MeetingLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchName: string;
  onSubmitted: (submittedOnTime: boolean) => void;
}

export const MeetingLogModal: React.FC<MeetingLogModalProps> = ({
  isOpen,
  onClose,
  branchName,
  onSubmitted,
}) => {
  const [contactName, setContactName] = useState('Babajide Adeleke');
  const [contactRole, setContactRole] = useState('Fleet Operations Director');
  const [purpose, setPurpose] = useState('Product discussion');
  const [outcome, setOutcome] = useState('Interest expressed');
  const [nextStep, setNextStep] = useState('Deliver technical specification sheet for heavy-duty commercial battery fleet trial.');
  const [selectedProducts, setSelectedProducts] = useState<string[]>(['Batteries', 'Lubricants']);
  const [deferLog, setDeferLog] = useState(false);

  if (!isOpen) return null;

  const toggleProduct = (prod: string) => {
    setSelectedProducts((prev) =>
      prev.includes(prod) ? prev.filter((p) => p !== prod) : [...prev, prod]
    );
  };

  const handleComplete = () => {
    onSubmitted(!deferLog);
    onClose();
  };

  const productsList = ['Tyres', 'Batteries', 'Lubricants', 'Fleet servicing', 'Telematics', 'Other'];
  const purposeList = [
    'New pitch',
    'Client follow-up meeting',
    'Product discussion',
    'Negotiation',
    'Relationship maintenance',
    'Other',
  ];
  const outcomeList = [
    'Interest expressed',
    'Information requested',
    'Met decision-maker',
    'No decision-maker',
    'Not interested',
    'Other',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50 rounded-t-2xl">
          <div>
            <span className="text-[10px] font-bold text-brand-blue uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              PRD §7.3 Meeting Documentation
            </span>
            <h3 className="font-bold text-slate-900 text-base mt-1">
              Document Visit Outcome
            </h3>
            <p className="text-xs text-slate-600 truncate max-w-[280px]">{branchName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-slate-800">
          {/* Submission Timing Rule Note (PRD §3 Step 6) */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-700 leading-relaxed">
              <strong className="text-slate-900">2-Hour Submission Window:</strong> You may submit this meeting log right now at check-out, or within 2 hours. Records submitted beyond 2 hours are flagged as <span className="font-semibold text-amber-900">Late Meeting Log</span> for manager review.
            </div>
          </div>

          {/* Contact Person */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-900">
              Contact Person Met <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Full Name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="text-xs"
              />
              <Input
                placeholder="Role / Title"
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Visit Purpose */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-900">
              Visit Purpose <span className="text-red-500">*</span>
            </label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-brand-blue focus:outline-none"
            >
              {purposeList.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Products Discussed */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-900">
              Products Discussed (Multi-select) <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {productsList.map((prod) => {
                const isSelected = selectedProducts.includes(prod);
                return (
                  <button
                    key={prod}
                    type="button"
                    onClick={() => toggleProduct(prod)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-brand-blue text-white border-brand-blue shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {prod}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meeting Outcome */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-900">
              Meeting Outcome Note <span className="text-red-500">*</span>
            </label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-brand-blue focus:outline-none"
            >
              {outcomeList.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 italic">Descriptive activity outcome only; not a sales deal or conversion stage.</p>
          </div>

          {/* Next Step - Free Text ONLY (Strict Exclusion Enforcement) */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-900">
              Next Step Description (Free Text Only) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              placeholder="Describe the expected next action in narrative format..."
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-blue focus:outline-none font-medium text-slate-900"
            />
            <p className="text-[10px] text-slate-500">
              Mandatory free-text summary. Creates <strong>no</strong> reminder, due-date task, or automated pipeline trigger.
            </p>
          </div>

          {/* Premises Evidence Photo Thumbnail */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-md bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-[9px] text-slate-600">
                [DEMO]
              </div>
              <div>
                <p className="font-bold text-slate-800 text-[11px]">Premises Photo Captured</p>
                <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Live Camera Verified (Simulated)
                </p>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">09:42:15</span>
          </div>

          {/* Optional Business Card Photograph Capture (PRD §7.3) */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-[11px]">
                Business Card Photograph (Optional)
              </span>
              <span className="text-[10px] text-slate-500 font-medium">PRD §7.3 Supporting Asset</span>
            </div>

            <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-9 h-7 rounded bg-slate-100 border border-slate-300 flex items-center justify-center font-mono text-[8px] text-slate-600">
                  CARD
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-[10px]">Client Contact Card</p>
                  <p className="text-[9px] text-slate-500">Live rear-camera macro capture (simulated)</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Attached
              </span>
            </div>
          </div>

          {/* Defer Submission Checkbox (Simulate 2h grace window) */}
          <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
            <input
              type="checkbox"
              id="deferCheck"
              checked={deferLog}
              onChange={(e) => setDeferLog(e.target.checked)}
              className="w-4 h-4 rounded text-brand-blue focus:ring-brand-blue cursor-pointer"
            />
            <label htmlFor="deferCheck" className="text-[11px] text-slate-700 font-medium cursor-pointer">
              Defer completion (Complete within permitted 2-hour window)
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 rounded-b-2xl shrink-0">
          <Button variant="outline" size="default" onClick={onClose} className="text-xs h-11 px-4">
            Cancel
          </Button>
          <Button
            variant="default"
            size="default"
            onClick={handleComplete}
            className="text-xs h-11 px-5 font-bold bg-brand-blue hover:bg-brand-blue-700"
          >
            {deferLog ? 'Check Out & Defer Log (2h SLA)' : 'Submit Log & Close Visit'}
          </Button>
        </div>
      </div>
    </div>
  );
};
