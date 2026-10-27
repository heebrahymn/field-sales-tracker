import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFieldSession } from '@/context/FieldSessionContext';
import { attendanceService, getMarketWorkDate } from '@/services/attendanceService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Send,
  AlertTriangle,
} from 'lucide-react';

interface NonVisitDayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NonVisitDayModal: React.FC<NonVisitDayModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const { submitNonVisitDayRequest } = useFieldSession();

  const [category, setCategory] = useState<
    'proposal_preparation_office' | 'training_development' | 'virtual_client_meeting' | 'internal_operations'
  >('proposal_preparation_office');

  const [date, setDate] = useState<string>(() => getMarketWorkDate(currentUser.marketCode));
  const [duration, setDuration] = useState<string>('Full Workday (8 hrs)');
  const [notes, setNotes] = useState<string>(
    'Office preparation of commercial fleet trial specifications and technical lubrication schedules for heavy-duty haulage accounts.'
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setSubmitError('A detailed activity justification is required.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Submit to Supabase via security definer RPC
      const result = await attendanceService.submitNonVisitRequest({
        date,
        category,
        justification: notes.trim(),
      });

      if (result.error) {
        setSubmitError(result.error.message);
        setIsSubmitting(false);
        return;
      }

      // 2. Update local state
      submitNonVisitDayRequest({
        category: category as any,
        date,
        duration,
        notes: notes.trim(),
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1600);
    } catch (err: any) {
      console.error('[NonVisitDayModal] Submission error:', err);
      setSubmitError(err.message || 'Failed to submit non-visit workday request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                PRD §2 &amp; §6.1 Non-Visit Workday
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
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        {submitted ? (
          <div className="p-8 text-center space-y-3 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">Request Submitted as Pending</h4>
            <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
              Your non-visit workday request has been recorded in the Supabase authorization queue for your Country Sales Head.
            </p>
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-[11px] text-purple-950 text-left">
              <strong>Attendance Note:</strong> If approved, this workday will credit daily attendance but strictly <strong>zero</strong> physical-visit targets.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 text-xs text-slate-700">
            {/* PRD Rule Alert */}
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-purple-800 shrink-0 mt-0.5" />
              <div className="text-[11px] text-purple-950 leading-relaxed">
                <strong>PRD Rule:</strong> An authorised non-visit working day counts toward <strong>attendance</strong>, but strictly <strong>zero</strong> physical-visit targets. Country Sales Head approval is required.
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
                <option value="proposal_preparation_office">Proposal Preparation (Office)</option>
                <option value="training_development">Technical Product Training</option>
                <option value="virtual_client_meeting">Virtual Client Meeting</option>
                <option value="internal_operations">Internal Operations / Review Meeting</option>
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
                  required
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

            {/* Submission Error Banner */}
            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-900">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="text-[11px]">
                  <strong>Request Failed:</strong> {submitError}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-xs h-10 px-4 border-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="text-xs h-10 px-4 font-bold bg-purple-700 hover:bg-purple-800 text-white shadow-sm flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
