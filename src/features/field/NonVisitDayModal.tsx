import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFieldSession } from '@/context/FieldSessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  X,
  Briefcase,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface NonVisitDayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NonVisitDayModal: React.FC<NonVisitDayModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const { submitNonVisitDayRequest } = useFieldSession();

  const [category, setCategory] = useState<'proposal_prep' | 'training' | 'virtual_meeting' | 'internal_meeting' | 'admin_work'>('proposal_prep');
  const [date, setDate] = useState<string>('2026-10-17');
  const [duration, setDuration] = useState<string>('Full Workday (8 hrs)');
  const [notes, setNotes] = useState<string>(
    'Office preparation of commercial fleet trial specifications and technical lubrication schedules for heavy-duty haulage accounts.'
  );
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitNonVisitDayRequest({
      category,
      date,
      duration,
      notes,
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                PRD §2 & §6.1 Non-Visit Workday
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-base mt-1">
              Request Non-Visit Workday
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Salesperson: {currentUser.name} • {currentUser.marketName}
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
        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">Request Submitted</h4>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              Your non-visit workday request has been submitted to your Country Sales Head for approval.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 text-xs text-slate-700">
            {/* PRD Rule Alert */}
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-purple-800 shrink-0 mt-0.5" />
              <div className="text-[11px] text-purple-950 leading-relaxed">
                <strong>PRD Rule:</strong> An authorised non-visit working day counts toward <strong>attendance</strong>, but strictly <strong>zero</strong> physical-visit targets. Manager approval is required.
              </div>
            </div>

            {/* Category Select */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-900">
                Authorised Non-Field Activity <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-brand-blue focus:outline-none"
              >
                <option value="proposal_prep">Proposal Preparation (Office)</option>
                <option value="training">Technical Product Training</option>
                <option value="virtual_meeting">Virtual Client Meeting</option>
                <option value="internal_meeting">Internal Operations / Review Meeting</option>
                <option value="admin_work">Office Administrative / Reporting Work</option>
              </select>
            </div>

            {/* Date & Duration Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-900">
                  Scheduled Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-xs h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-900">
                  Duration <span className="text-red-500">*</span>
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full h-10 px-2.5 border border-slate-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-brand-blue focus:outline-none"
                >
                  <option value="Full Workday (8 hrs)">Full Workday (8 hrs)</option>
                  <option value="Morning Half-Day (4 hrs)">Morning Half-Day (4 hrs)</option>
                  <option value="Afternoon Half-Day (4 hrs)">Afternoon Half-Day (4 hrs)</option>
                </select>
              </div>
            </div>

            {/* Narrative Justification */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-900">
                Detailed Activity Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="State the specific client, account proposal, or training curriculum..."
                required
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-blue focus:outline-none font-medium text-slate-900"
              />
              <p className="text-[10px] text-slate-500">
                Free-text justification reviewed by Country Sales Head. <em>No sales pipeline or quotation modules are generated.</em>
              </p>
            </div>

            {/* Turnaround Note */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Review turnaround: Typically approved by Country Sales Head within 24 hours.</span>
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
                type="submit"
                className="text-xs h-11 px-5 font-bold bg-purple-700 hover:bg-purple-800 text-white shadow-sm flex items-center gap-1.5"
              >
                <Briefcase className="w-3.5 h-3.5" /> Submit for Approval
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
