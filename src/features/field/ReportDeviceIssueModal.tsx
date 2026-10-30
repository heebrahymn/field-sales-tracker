import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useDeviceReplacement, DeviceIssueCategory } from '@/context/DeviceReplacementContext';
import {
  Smartphone,
  X,
  Send,
  CheckCircle2,
} from 'lucide-react';

interface ReportDeviceIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReportDeviceIssueModal: React.FC<ReportDeviceIssueModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const { submitReplacementRequest, refreshRequests } = useDeviceReplacement();

  const [issueCategory, setIssueCategory] = useState<DeviceIssueCategory>('camera_defect');
  const [description, setDescription] = useState('');
  const [supportingEvidence, setSupportingEvidence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const assignedDeviceTag = currentUser.assignedDevice?.assetTag || 'CC-DEV-LOS-001';
  const assignedDeviceModel = currentUser.assignedDevice?.model || 'Samsung Galaxy A15 Enterprise';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);

    try {
      await submitReplacementRequest({
        salespersonId: currentUser.id || currentUser.employeeId,
        salespersonName: currentUser.name,
        marketCode: currentUser.marketCode,
        marketName: currentUser.marketName,
        companyDeviceAssetId:
          currentUser.assignedDevice?.deviceId ||
          currentUser.assignedDevice?.assetTag ||
          assignedDeviceTag,
        deviceModel: assignedDeviceModel,
        issueCategory,
        issueDescription: description.trim(),
        supportingEvidence: supportingEvidence.trim() || undefined,
      });

      await refreshRequests?.();
      setFeedbackMessage('Request submitted directly to HQ Admin. Track status under My Device.');
      setDescription('');
      setSupportingEvidence('');
      onSuccess?.();
    } catch (err: any) {
      console.error('Failed to submit replacement request:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in select-none">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Report Company Device Issue</h3>
              <p className="text-[11px] text-slate-500">Direct submission to HQ Administrator</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {feedbackMessage ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Replacement Request Dispatched</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed pl-7">
                {feedbackMessage}
              </p>
            </div>
            <div className="pt-2">
              <Button
                type="button"
                onClick={() => {
                  setFeedbackMessage(null);
                  onClose();
                }}
                className="w-full bg-brand-blue hover:bg-blue-700 text-white font-bold h-10 text-xs gap-1.5 shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Done</span>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Assigned Hardware Card */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Assigned Hardware:</span>
                <span className="font-mono font-bold text-slate-900">{assignedDeviceTag}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Model:</span>
                <span className="font-medium text-slate-800">{assignedDeviceModel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Custodian Rep:</span>
                <span className="font-semibold text-slate-800">{currentUser.name} ({currentUser.employeeId})</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Issue Category *</label>
                <select
                  value={issueCategory}
                  onChange={(e) => setIssueCategory(e.target.value as DeviceIssueCategory)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue bg-white"
                >
                  <option value="camera_defect">Camera Defect (Sensor failure, autofocus blur)</option>
                  <option value="gps_failure">GPS Failure (Hardware sensor unable to lock satellites)</option>
                  <option value="screen_damage">Screen Damage (Cracked display, digitizer touch fault)</option>
                  <option value="battery_charging_fault">Battery / Charging Fault (Battery swelling, failure to charge)</option>
                  <option value="lost_or_stolen">Lost or Stolen Device (Requires immediate remote MDM wipe)</option>
                  <option value="other">Other Hardware Breakdown</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Detailed Problem Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe what occurred, when it started, and how it impacts field visit check-in or premises capture..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Supporting Evidence / Attachment (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Blurry photo filename, police report ref for lost phone, or notes"
                  value={supportingEvidence}
                  onChange={(e) => setSupportingEvidence(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  If original phone is unusable, this report may be filed upon gaining access to an authorized replacement handset.
                </p>
              </div>

              {/* Direct HQ Admin Routing Notice */}
              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-slate-700 text-[11px] leading-relaxed">
                <span className="font-bold text-brand-blue">Direct HQ Admin Workflow:</span> This hardware request dispatches directly to HQ Admin. Country Sales Heads have read-only visibility and do not act as an approval bottleneck.
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] leading-relaxed">
                <strong>Important:</strong> A device replacement request is an administrative hardware record. If device failure caused missed visit check-ins, also file a separate field visit exception log under <em>My Exceptions</em> when access is restored.
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Submitting to HQ...' : 'Submit Directly to HQ Admin'}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
