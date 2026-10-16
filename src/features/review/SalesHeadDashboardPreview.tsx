import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { ApprovalDecisionModal, ApprovalItem } from '@/features/review/ApprovalDecisionModal';
import {
  Users,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  Clock,
  ShieldCheck,
  MapPin,
} from 'lucide-react';

export const SalesHeadDashboardPreview: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedReviewItem, setSelectedReviewItem] = useState<ApprovalItem | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Fictional Mock Items
  const pendingPins: ApprovalItem[] = [
    {
      id: 'pin-01',
      type: 'pin_approval',
      title: 'Apex Commercial Transit Ltd',
      subtitle: 'Ibeju-Lekki Hub • Branch #BR-LAG-108',
      repName: 'Tunde Adebayo',
      claimedTime: 'Today 09:15',
      accuracy: '±22m (Passes ≤50m threshold)',
      evidenceNote: 'Premises gate and workshop signage clearly visible in photo. Pin placed at entrance gate.',
      sharedPhoneWarning: true,
    },
    {
      id: 'pin-02',
      type: 'pin_approval',
      title: 'Vanguard Logistics Solutions',
      subtitle: 'Kano North Depot • Branch #BR-KAN-042',
      repName: 'Ibrahim Sani',
      claimedTime: 'Yesterday 16:30',
      accuracy: '±18m (Passes ≤50m threshold)',
      evidenceNote: 'Heavy haulage trailer depot on northern transit corridor. GPS fix taken in open courtyard.',
      sharedPhoneWarning: false,
    },
  ];

  const pendingExceptions: ApprovalItem[] = [
    {
      id: 'exc-01',
      type: 'exception_approval',
      title: 'Titan Engineering Fleet Depot',
      subtitle: 'Missed-Visit Exception (Device Battery Depletion)',
      repName: 'Emeka Nwosu',
      claimedTime: '11:15 - 11:55',
      accuracy: 'No GPS (Device shutdown)',
      evidenceNote: 'Handset battery shut down unexpectedly during meeting. Submitted after power restoration at base.',
    },
    {
      id: 'exc-02',
      type: 'exception_approval',
      title: 'Metroline Basement Fleet Hub',
      subtitle: 'GPS Signal Failure (Underground Parking Facility)',
      repName: 'Tunde Adebayo',
      claimedTime: '13:40 - 14:10',
      accuracy: '±140m (Uncertain / Exceeds 100m limit)',
      evidenceNote: 'Severe multipath signal attenuation inside reinforced concrete basement. Premises photo captured.',
    },
  ];

  const handleOpenReview = (item: ApprovalItem) => {
    setSelectedReviewItem(item);
    setReviewModalOpen(true);
  };

  const handleDecisionRecorded = (
    itemId: string,
    decision: 'approved' | 'rejected' | 'escalated',
    reason: string
  ) => {
    setFeedbackMessage(
      `Decision for [${itemId}] ${selectedReviewItem?.title}: ${decision.toUpperCase()}. Rationale: "${reason.slice(0, 35)}..." Logged to immutable approval_audit.`
    );
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Toast Notification */}
      {feedbackMessage && (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl text-xs flex items-center justify-between shadow-lg border border-slate-700 animate-in fade-in duration-200">
          <span className="font-semibold text-emerald-300">{feedbackMessage}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-white font-bold ml-3 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner Notice: Provisional Reconciliation & Governance */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-slate-900 text-sm">
              Country Sales Head Review Console • Market: {currentUser.marketName}
            </p>
            <p className="text-slate-700 font-medium mt-0.5">
              Review and audit field registrations, GPS pins, and rep-submitted exceptions. Managers never originate salesperson visit or exception logs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-300">
            SLA Standard: ≤2 Workdays
          </span>
          <Button variant="outline" size="sm" className="text-xs font-semibold bg-white border-slate-300 hover:bg-slate-50 text-slate-800">
            Export Country CSV
          </Button>
        </div>
      </div>

      {/* ================= DISTINCT COUNTING KPI CARDS ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        {/* 1. Active Field Reps */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 p-3.5 flex flex-col justify-between min-h-[142px]">
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide leading-tight">
              Active Reps
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">8</span>
              <span className="text-xs font-semibold text-slate-500">/ 10</span>
            </div>
            <div className="mt-1">
              <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/70 px-1.5 py-0.5 rounded">
                80% Present
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>1 On Leave • 1 Pending</span>
          </div>
        </div>

        {/* 2. Location Verified Visits */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 p-3.5 flex flex-col justify-between min-h-[142px]">
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide leading-tight">
              Location Verified
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">34</span>
              <span className="text-xs font-semibold text-slate-500">visits</span>
            </div>
            <div className="mt-1">
              <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 rounded">
                Provisional (Today)
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>GPS & photo validated</span>
          </div>
        </div>

        {/* 3. Approved Unverified Activity */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 p-3.5 flex flex-col justify-between min-h-[142px]">
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide leading-tight">
              Approved Unverified
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">3</span>
              <span className="text-xs font-semibold text-slate-500">exceptions</span>
            </div>
            <div className="mt-1">
              <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 rounded">
                Separate Audit
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>Manager sign-off only</span>
          </div>
        </div>

        {/* 4. Missing Meeting Logs */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 p-3.5 flex flex-col justify-between min-h-[142px]">
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide leading-tight">
              Missing Logs
            </span>
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">2</span>
              <span className="text-xs font-semibold text-slate-500">flagged</span>
            </div>
            <div className="mt-1">
              <span className="inline-block text-[10px] font-bold text-orange-800 bg-orange-50 border border-orange-200/70 px-1.5 py-0.5 rounded">
                &gt;2h SLA Overdue
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
            <span>Pending rep entry</span>
          </div>
        </div>

        {/* 5. Urgent Risk Flags */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 p-3.5 flex flex-col justify-between min-h-[142px] col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide leading-tight">
              Urgent Flags
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">4</span>
              <span className="text-xs font-semibold text-slate-500">open</span>
            </div>
            <div className="mt-1">
              <span className="inline-block text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200/70 px-1.5 py-0.5 rounded">
                Action Required
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span>1 out-of-bounds • 1 short</span>
          </div>
        </div>
      </div>

      {/* ================= REVIEW WORKBENCH: PENDING APPROVALS & EXCEPTIONS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Branch & Pin Approvals */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <CardTitle className="text-base text-slate-900">Pending Branch & Pin Approvals</CardTitle>
              <p className="text-xs text-slate-600 font-medium">Proposed client branches requiring manager pin verification</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              4 Awaiting Sign-off
            </span>
          </CardHeader>

          <CardContent className="space-y-3 pt-3">
            {pendingPins.map((item) => (
              <div key={item.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 text-sm">{item.title}</h4>
                    <p className="text-xs text-slate-700 font-medium flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {item.subtitle}
                    </p>
                    <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                      Submitted by: <span className="text-slate-900">{item.repName}</span>
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                    {item.claimedTime}
                  </span>
                </div>

                {item.sharedPhoneWarning && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-brand-blue font-semibold">
                    Note: Shared parent company phone detected with Ikeja branch (Allowed under PRD §4.2).
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200">
                  <span className="text-[11px] text-emerald-800 font-bold">
                    GPS Accuracy: {item.accuracy}
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-9 sm:h-8 px-3 font-semibold bg-white border-slate-300 flex-1 sm:flex-initial"
                      onClick={() => handleOpenReview(item)}
                    >
                      Inspect Evidence
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      className="text-xs h-9 sm:h-8 px-3 font-bold bg-brand-green-700 hover:bg-brand-green-800 text-white flex-1 sm:flex-initial"
                      onClick={() => handleOpenReview(item)}
                    >
                      Approve Pin
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Exceptions Awaiting Manager Review */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <CardTitle className="text-base text-slate-900">Exceptions Workbench</CardTitle>
              <p className="text-xs text-slate-600 font-medium">Salesperson-created missed-visit, GPS and device breakdown logs</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-brand-blue border border-blue-300">
              3 Submitted
            </span>
          </CardHeader>

          <CardContent className="space-y-3 pt-3">
            {pendingExceptions.map((item) => (
              <div key={item.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                      {item.subtitle}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 text-sm mt-1.5">{item.title}</h4>
                    <p className="text-[11px] text-slate-700 font-semibold">
                      Submitted by: <span className="text-slate-900">{item.repName}</span> • Claimed Time: {item.claimedTime}
                    </p>
                  </div>
                  <StatusBadge status="pending_review" size="sm" />
                </div>

                <p className="text-[11px] text-slate-700 font-medium bg-white p-2.5 rounded-lg border border-slate-200 italic">
                  &ldquo;{item.evidenceNote}&rdquo;
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200">
                  <span className="text-[11px] text-slate-600 font-medium">
                    Status: <strong className="text-amber-900">Unverified Activity</strong>
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-9 sm:h-8 px-3 text-red-700 border-red-200 hover:bg-red-50 font-semibold flex-1 sm:flex-initial"
                      onClick={() => handleOpenReview(item)}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="text-xs h-9 sm:h-8 px-3 bg-brand-blue hover:bg-brand-blue-700 text-white font-bold flex-1 sm:flex-initial"
                      onClick={() => handleOpenReview(item)}
                    >
                      Review & Decide
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ================= DECISION MODAL ================= */}
      <ApprovalDecisionModal
        item={selectedReviewItem}
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onDecision={handleDecisionRecorded}
      />
    </div>
  );
};
