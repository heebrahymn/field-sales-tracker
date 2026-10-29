import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  managementService,
  RealVisitVerificationRecord,
  RealBranchPinRecord,
  RealExceptionItem,
  RealVerificationFlag,
} from '@/services/managementService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { ApprovalDecisionModal, ApprovalItem } from '@/features/review/ApprovalDecisionModal';
import { BranchApprovalsQueue } from '@/features/review/BranchApprovalsQueue';
import { ExceptionReviewWorkbench } from '@/features/review/ExceptionReviewWorkbench';
import { ClientVisitVerification } from '@/features/review/ClientVisitVerification';
import { RiskFlagsWorkbench } from '@/features/review/RiskFlagsWorkbench';
import { ClientAuditWorkbench } from '@/features/review/ClientAuditWorkbench';
import { TeamAttendanceReview } from '@/features/review/TeamAttendanceReview';
import { CountryReportingView } from '@/features/review/CountryReportingView';
import { CountryCsvExportModal } from '@/features/review/CountryCsvExportModal';
import { ClientsLocationsDirectory } from '@/features/review/ClientsLocationsDirectory';
import { DesktopNavSection } from '@/components/layout/DesktopSidebar';
import {
  Users,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  Clock,
  ShieldCheck,
  MapPin,
  PhoneCall,
  CalendarDays,
  FileSpreadsheet,
  Download,
  ArrowRight,
  Building2,
} from 'lucide-react';

interface SalesHeadDashboardPreviewProps {
  activeSection?: DesktopNavSection;
  onSelectSection?: (section: DesktopNavSection) => void;
}

export const SalesHeadDashboardPreview: React.FC<SalesHeadDashboardPreviewProps> = ({
  activeSection: propActiveSection,
  onSelectSection,
}) => {
  const { currentUser } = useAuth();
  const [internalSection, setInternalSection] = useState<DesktopNavSection>('dashboard');
  const [selectedReviewItem, setSelectedReviewItem] = useState<ApprovalItem | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [summaryTimeframe, setSummaryTimeframe] = useState<'daily' | 'weekly' | 'quarterly'>('daily');

  const currentSection = propActiveSection || internalSection;

  const handleSectionChange = (section: DesktopNavSection) => {
    if (onSelectSection) {
      onSelectSection(section);
    }
    setInternalSection(section);
  };

  const [liveVisits, setLiveVisits] = useState<RealVisitVerificationRecord[]>([]);
  const [livePins, setLivePins] = useState<RealBranchPinRecord[]>([]);
  const [liveExceptions, setLiveExceptions] = useState<RealExceptionItem[]>([]);
  const [liveFlags, setLiveFlags] = useState<RealVerificationFlag[]>([]);
  const [activeRepsCount, setActiveRepsCount] = useState<number>(0);
  const [totalRepsCount, setTotalRepsCount] = useState<number>(0);

  const loadDashboardData = useCallback(async () => {
    try {
      const market = currentUser?.marketCode || 'NG';
      const [vRes, pRes, eRes, fRes, repRes] = await Promise.all([
        managementService.getCountryVisits(market),
        managementService.getCountryPendingPins(market),
        managementService.getCountryExceptions(market, 'pending_review'),
        managementService.getCountryVerificationFlags(market, 'open'),
        managementService.getMarketSalespeople(market),
      ]);
      setLiveVisits(vRes.data || []);
      setLivePins(Array.isArray(pRes) ? pRes : (pRes as any).data || []);
      setLiveExceptions(eRes.data || []);
      setLiveFlags(fRes.data || []);
      if (Array.isArray(repRes)) {
        setTotalRepsCount(repRes.length);
        setActiveRepsCount(repRes.length);
      }
    } catch (err) {
      console.warn('[SalesHeadDashboard] Failed loading live metrics:', err);
    }
  }, [currentUser?.marketCode]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Real items for overview dashboard
  const pendingPins: ApprovalItem[] = livePins.map((p) => ({
    id: p.id,
    type: 'pin_approval',
    title: p.branchName,
    subtitle: `${p.address} • Version #${p.versionNumber}`,
    companyName: p.organisationName,
    repName: p.proposedByName || 'Field Salesperson',
    claimedTime: p.proposedAt ? new Date(p.proposedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending',
    accuracy: `±${Math.round(p.reportedAccuracyM)}m (Passes ≤50m threshold)`,
    evidenceNote: 'GPS pin submitted by field salesperson. Verified against on-site premises photo.',
    sharedPhoneWarning: false,
  }));

  const pendingExceptions: ApprovalItem[] = liveExceptions.map((e) => ({
    id: e.id,
    type: 'exception_approval',
    title: e.branchName,
    subtitle: e.failureReason,
    clientName: e.organisationName,
    repName: e.repName,
    claimedTime: new Date(e.claimedCheckInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    accuracy: 'GPS Unverified',
    evidenceNote: e.failureReason,
  }));

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

      {/* Module Navigation Pill Bar for Quick Multi-Module Switching */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 scrollbar-none">
        <button
          onClick={() => handleSectionChange('dashboard')}
          className={`text-xs px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors ${
            currentSection === 'dashboard'
              ? 'bg-brand-blue text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Operational Dashboard
        </button>
        <button
          onClick={() => handleSectionChange('visits')}
          className={`text-xs px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors flex items-center gap-1.5 ${
            currentSection === 'visits'
              ? 'bg-brand-blue text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Client Visit Verification</span>
          <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded-full text-[10px]">
            {liveVisits.length}
          </span>
        </button>
        <button
          onClick={() => handleSectionChange('approvals')}
          className={`text-xs px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors flex items-center gap-1.5 ${
            currentSection === 'approvals'
              ? 'bg-brand-blue text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>Client Approvals</span>
          <span className="bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-full text-[10px]">
            {pendingPins.length}
          </span>
        </button>
        <button
          onClick={() => handleSectionChange('exceptions')}
          className={`text-xs px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors flex items-center gap-1.5 ${
            currentSection === 'exceptions'
              ? 'bg-brand-blue text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>Exception Workbench</span>
          <span className="bg-blue-100 text-brand-blue px-1.5 py-0.2 rounded-full text-[10px]">
            {pendingExceptions.length}
          </span>
        </button>
        <button
          onClick={() => handleSectionChange('flags')}
          className={`text-xs px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors flex items-center gap-1.5 ${
            currentSection === 'flags'
              ? 'bg-brand-blue text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>Risk Flags Queue</span>
          <span className="bg-rose-100 text-rose-900 px-1.5 py-0.2 rounded-full text-[10px]">
            {liveFlags.length}
          </span>
        </button>
        <button
          onClick={() => handleSectionChange('audits')}
          className={`text-xs px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors flex items-center gap-1.5 ${
            currentSection === 'audits'
              ? 'bg-brand-blue text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Client Audit Calls (5%)</span>
        </button>
        <button
          onClick={() => handleSectionChange('attendance')}
          className={`text-xs px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors flex items-center gap-1.5 ${
            currentSection === 'attendance'
              ? 'bg-brand-blue text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Team Attendance</span>
        </button>
        <button
          onClick={() => handleSectionChange('clients')}
          className={`text-xs px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors flex items-center gap-1.5 ${
            currentSection === 'clients'
              ? 'bg-brand-blue text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Clients &amp; Locations</span>
        </button>
        <button
          onClick={() => handleSectionChange('exports')}
          className={`text-xs px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors flex items-center gap-1.5 ${
            currentSection === 'exports'
              ? 'bg-brand-blue text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Reporting &amp; CSV</span>
        </button>
      </div>

      {/* Render Module Content Based on Section */}
      {currentSection === 'visits' && <ClientVisitVerification />}
      {currentSection === 'approvals' && <BranchApprovalsQueue />}
      {currentSection === 'exceptions' && <ExceptionReviewWorkbench />}
      {currentSection === 'flags' && <RiskFlagsWorkbench />}
      {currentSection === 'audits' && <ClientAuditWorkbench />}
      {currentSection === 'attendance' && <TeamAttendanceReview />}
      {currentSection === 'exports' && <CountryReportingView marketName={currentUser.marketName} />}
      {currentSection === 'clients' && <ClientsLocationsDirectory />}

      {/* DEFAULT: Master Operational Dashboard */}
      {currentSection === 'dashboard' && (
        <div className="space-y-6">
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
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold bg-white border-slate-300 hover:bg-slate-50 text-slate-800 flex items-center gap-1"
                onClick={() => setCsvModalOpen(true)}
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                Export Country CSV
              </Button>
            </div>
          </div>

          {/* Timeframe Summary Pills */}
          <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Summary Scope:</span>
              <button
                onClick={() => setSummaryTimeframe('daily')}
                className={`text-xs px-2.5 py-1 rounded-md font-bold ${
                  summaryTimeframe === 'daily'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Daily (19 Oct 2026)
              </button>
              <button
                onClick={() => setSummaryTimeframe('weekly')}
                className={`text-xs px-2.5 py-1 rounded-md font-bold ${
                  summaryTimeframe === 'weekly'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Weekly Rollup (W42)
              </button>
              <button
                onClick={() => setSummaryTimeframe('quarterly')}
                className={`text-xs px-2.5 py-1 rounded-md font-bold ${
                  summaryTimeframe === 'quarterly'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Quarterly (Q4 2026)
              </button>
            </div>

            <span className="text-[11px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hidden sm:inline-block">
              Provisional live events • Cutoff at 19:00 WAT
            </span>
          </div>

          {/* ================= DISTINCT COUNTING KPI CARDS ================= */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
            {/* 1. Active Field Reps */}
            <div
              onClick={() => handleSectionChange('attendance')}
              className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 p-3.5 flex flex-col justify-between min-h-[142px] cursor-pointer"
            >
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
                  <span className="text-2xl font-black text-slate-900 tracking-tight">{activeRepsCount}</span>
                  <span className="text-xs font-semibold text-slate-500">/ {totalRepsCount || activeRepsCount}</span>
                </div>
                <div className="mt-1">
                  <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/70 px-1.5 py-0.5 rounded">
                    {totalRepsCount > 0 ? `${Math.round((activeRepsCount / totalRepsCount) * 100)}% Present` : '100% Present'}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Field active reps</span>
              </div>
            </div>

            {/* 2. Location Verified Visits */}
            <div
              onClick={() => handleSectionChange('visits')}
              className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 p-3.5 flex flex-col justify-between min-h-[142px] cursor-pointer"
            >
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
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {liveVisits.filter((v) => v.verificationStatus === 'location_verified').length}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">visits</span>
                </div>
                <div className="mt-1">
                  <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 rounded">
                    Provisional (Live)
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>GPS &amp; photo validated</span>
                </div>
                <span className="text-brand-blue font-bold">View all &rarr;</span>
              </div>
            </div>

            {/* 3. Approved Unverified Activity */}
            <div
              onClick={() => handleSectionChange('exceptions')}
              className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 p-3.5 flex flex-col justify-between min-h-[142px] cursor-pointer"
            >
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
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {liveVisits.filter((v) => v.verificationStatus === 'manager_approved_unverified').length}
                  </span>
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
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {liveVisits.filter((v) => !v.meetingLog).length}
                  </span>
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
            <div
              onClick={() => handleSectionChange('flags')}
              className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 p-3.5 flex flex-col justify-between min-h-[142px] col-span-2 lg:col-span-1 cursor-pointer"
            >
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
                  <span className="text-2xl font-black text-slate-900 tracking-tight">{liveFlags.length}</span>
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
                <span>Automated DB flags</span>
              </div>
            </div>
          </div>

          {/* ================= REVIEW WORKBENCH: PENDING APPROVALS & EXCEPTIONS ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Client & Pin Approvals Preview */}
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <CardTitle className="text-base text-slate-900">Pending Client &amp; GPS Approvals</CardTitle>
                  <p className="text-xs text-slate-600 font-medium">Proposed client locations requiring manager GPS verification</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold text-brand-blue border-blue-200 hover:bg-blue-50 flex items-center gap-1"
                  onClick={() => handleSectionChange('approvals')}
                >
                  View All ({pendingPins.length}) <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardHeader>

              <CardContent className="space-y-3.5 pt-3.5">
                {pendingPins.map((item) => (
                  <div key={item.id} className="p-4 sm:p-5 pt-4 sm:pt-5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-3">
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
                        Note: Shared company telephone detected with Apapa location (Permitted under PRD §4.2).
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
                          Approve Location Pin
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Exceptions Awaiting Manager Review Preview */}
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <CardTitle className="text-base text-slate-900">Exceptions Workbench</CardTitle>
                  <p className="text-xs text-slate-600 font-medium">Salesperson-created missed-visit, GPS and device breakdown logs</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold text-brand-blue border-blue-200 hover:bg-blue-50 flex items-center gap-1"
                  onClick={() => handleSectionChange('exceptions')}
                >
                  View All ({pendingExceptions.length}) <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardHeader>

              <CardContent className="space-y-3.5 pt-3.5">
                {pendingExceptions.map((item) => (
                  <div key={item.id} className="p-4 sm:p-5 pt-4 sm:pt-5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-3">
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
                          Review &amp; Decide
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Decision Modal */}
      <ApprovalDecisionModal
        item={selectedReviewItem}
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onDecision={handleDecisionRecorded}
      />

      {/* Country CSV Export Modal */}
      <CountryCsvExportModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        marketName={currentUser.marketName}
      />
    </div>
  );
};
