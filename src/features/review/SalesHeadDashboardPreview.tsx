import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMarketConfig } from '@/context/MarketConfigContext';
import {
  attendanceService,
  getMarketWorkDate,
} from '@/services/attendanceService';
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
import { PhotoLightboxModal, LightboxPhoto } from '@/components/ui/photo-lightbox-modal';
import { TablePagination } from '@/components/ui/table-pagination';
import { BranchApprovalsQueue } from '@/features/review/BranchApprovalsQueue';
import { ExceptionReviewWorkbench } from '@/features/review/ExceptionReviewWorkbench';
import { ClientVisitVerification } from '@/features/review/ClientVisitVerification';
import { RiskFlagsWorkbench } from '@/features/review/RiskFlagsWorkbench';
import { ClientAuditWorkbench } from '@/features/review/ClientAuditWorkbench';
import { TeamAttendanceReview } from '@/features/review/TeamAttendanceReview';
import { CountryReportingView } from '@/features/review/CountryReportingView';
import { CountryCsvExportModal } from '@/features/review/CountryCsvExportModal';
import { DesktopNavSection } from '@/components/layout/DesktopSidebar';
import {
  BADGE_COUNTS_CHANGED_EVENT,
  emitBadgeCountsChanged,
  isClientAuditActionRequired,
} from '@/utils/badgeSync';
import { cn } from '@/lib/utils';
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
  WifiOff,
  Camera,
  AlertOctagon,
  FileText,
  Building2,
} from 'lucide-react';

interface DashboardExceptionItem extends ApprovalItem {
  organisationName: string;
  exceptionTypeKey: string;
  exceptionTypeLabel: string;
  shortId: string;
}

const EXCEPTION_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; badgeClass: string }
> = {
  gps_failure: {
    label: 'GPS Failure',
    icon: WifiOff,
    badgeClass: 'bg-orange-50 text-orange-900 border-orange-200',
  },
  device_depletion: {
    label: 'New Client Approval Delay',
    icon: Clock,
    badgeClass: 'bg-blue-50 text-brand-blue border-blue-200',
  },
  device_failure: {
    label: 'New Client Approval Delay',
    icon: Clock,
    badgeClass: 'bg-blue-50 text-brand-blue border-blue-200',
  },
  camera_failure: {
    label: 'Camera Issue',
    icon: Camera,
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  missed_visit: {
    label: 'Missed Visit',
    icon: AlertOctagon,
    badgeClass: 'bg-rose-50 text-rose-900 border-rose-200',
  },
};

const getExceptionTypeConfig = (type?: string) =>
  (type && EXCEPTION_TYPE_CONFIG[type]) || {
    label: 'Field Exception',
    icon: ShieldAlert,
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
  };

interface SalesHeadDashboardPreviewProps {
  activeSection?: DesktopNavSection;
  onSelectSection?: (section: DesktopNavSection) => void;
}

export const SalesHeadDashboardPreview: React.FC<SalesHeadDashboardPreviewProps> = ({
  activeSection: propActiveSection,
  onSelectSection,
}) => {
  const { currentUser } = useAuth();
  const { getActiveMarketRules } = useMarketConfig();
  const logSlaHours = getActiveMarketRules((currentUser?.marketCode || 'NG') as any).meetingLogSlaHours ?? 2;
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
  const [pendingAuditsCount, setPendingAuditsCount] = useState<number>(0);
  const [pendingAbsencesCount, setPendingAbsencesCount] = useState<number>(0);
  const [activeRepsCount, setActiveRepsCount] = useState<number>(0);
  const [totalRepsCount, setTotalRepsCount] = useState<number>(0);
  const [lightboxPhoto, setLightboxPhoto] = useState<LightboxPhoto | null>(null);
  const [loadingPhotoId, setLoadingPhotoId] = useState<string | null>(null);

  const handleOpenExceptionPhoto = async (item: DashboardExceptionItem) => {
    if (!item.premisesPhotoUrl) return;
    setLoadingPhotoId(item.id);
    try {
      const signedUrl = item.premisesPhotoUrl.startsWith('http')
        ? item.premisesPhotoUrl
        : await managementService.getExceptionEvidenceSignedUrl?.(item.premisesPhotoUrl);
      if (signedUrl) {
        setLightboxPhoto({
          url: signedUrl,
          title: `${item.title} • Picture Evidence`,
          subtitle: `Submitted by ${item.repName} (${item.exceptionTypeLabel})`,
        });
      }
    } finally {
      setLoadingPhotoId(null);
    }
  };

  const loadDashboardData = useCallback(async () => {
    try {
      const market = currentUser?.marketCode || 'NG';
      const todayStr = getMarketWorkDate(market);
      const [vRes, pRes, eRes, fRes, repRes, attRes, absRes, auditRes] = await Promise.all([
        managementService.getCountryVisits(market),
        managementService.getCountryPendingPins(market),
        managementService.getCountryExceptions(market, 'pending_review'),
        managementService.getCountryVerificationFlags(market, 'open'),
        managementService.getMarketSalespeople(market),
        attendanceService.getMarketAttendance(market, todayStr),
        attendanceService.getPendingNonVisitRequests(market),
        managementService.getClientAuditRecords
          ? managementService.getClientAuditRecords(market)
          : Promise.resolve({ data: [], error: null }),
      ]);
      setLiveVisits(vRes.data || []);
      setLivePins(Array.isArray(pRes) ? pRes : (pRes as any).data || []);
      setLiveExceptions(eRes.data || []);
      setLiveFlags(fRes.data || []);
      setPendingAuditsCount((auditRes?.data || []).filter(isClientAuditActionRequired).length);
      setPendingAbsencesCount(absRes.data?.length ?? 0);
      if (Array.isArray(repRes)) {
        setTotalRepsCount(repRes.length);
      }
      if (attRes.data) {
        const activeToday = attRes.data.filter((a) => a.status === 'started' || a.status === 'ended');
        setActiveRepsCount(activeToday.length);
      }
    } catch (err) {
      console.warn('[SalesHeadDashboard] Failed loading live metrics:', err);
    }
  }, [currentUser?.marketCode]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, currentSection]);

  useEffect(() => {
    const handleRefreshEvent = () => {
      loadDashboardData();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(BADGE_COUNTS_CHANGED_EVENT, handleRefreshEvent);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(BADGE_COUNTS_CHANGED_EVENT, handleRefreshEvent);
      }
    };
  }, [loadDashboardData]);

  // Summary Scope dynamic labels and date boundaries
  const now = useMemo(() => new Date(), []);

  const isoWeekNumber = useMemo(() => {
    const target = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNr = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNr);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }, [now]);

  const currentQuarter = useMemo(() => Math.floor(now.getMonth() / 3) + 1, [now]);

  const dailyPillLabel = useMemo(() => {
    const formattedDate = now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return `Daily (${formattedDate})`;
  }, [now]);

  const weeklyPillLabel = useMemo(() => `Weekly Rollup (W${isoWeekNumber})`, [isoWeekNumber]);

  const quarterlyPillLabel = useMemo(
    () => `Quarterly (Q${currentQuarter} ${now.getFullYear()})`,
    [currentQuarter, now]
  );

  const todayStr = useMemo(
    () => getMarketWorkDate(currentUser?.marketCode || 'NG'),
    [currentUser?.marketCode]
  );
  const oneWeekAgoStr = useMemo(() => new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), []);
  const quarterStartStr = useMemo(
    () => new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1).toISOString().slice(0, 10),
    [now, currentQuarter]
  );

  const scopedVisits = useMemo(() => {
    return liveVisits.filter((v) => {
      const vDate = v.workDate || (v.checkInAt ? v.checkInAt.slice(0, 10) : '');
      if (!vDate) return false;
      if (summaryTimeframe === 'daily') {
        return vDate === todayStr;
      }
      if (summaryTimeframe === 'weekly') {
        return vDate >= oneWeekAgoStr;
      }
      if (summaryTimeframe === 'quarterly') {
        return vDate >= quarterStartStr;
      }
      return true;
    });
  }, [liveVisits, summaryTimeframe, todayStr, oneWeekAgoStr, quarterStartStr]);

  const scopedFlags = useMemo(() => {
    return liveFlags.filter((f) => {
      const fDate = f.createdAt ? f.createdAt.slice(0, 10) : '';
      if (!fDate) return true;
      if (summaryTimeframe === 'daily') {
        return fDate === todayStr;
      }
      if (summaryTimeframe === 'weekly') {
        return fDate >= oneWeekAgoStr;
      }
      if (summaryTimeframe === 'quarterly') {
        return fDate >= quarterStartStr;
      }
      return true;
    });
  }, [liveFlags, summaryTimeframe, todayStr, oneWeekAgoStr, quarterStartStr]);

  const scopedActiveRepsCount = useMemo(() => {
    if (summaryTimeframe === 'daily') {
      return activeRepsCount;
    }
    const activeRepIds = new Set<string>();
    scopedVisits.forEach((v) => {
      if (v.repId) activeRepIds.add(v.repId);
    });
    return Math.max(activeRepsCount, activeRepIds.size);
  }, [summaryTimeframe, activeRepsCount, scopedVisits]);

  const locationVerifiedCount = useMemo(() => {
    return scopedVisits.filter((v) => v.verificationStatus === 'location_verified').length;
  }, [scopedVisits]);

  const approvedUnverifiedCount = useMemo(() => {
    return scopedVisits.filter((v) => v.verificationStatus === 'manager_approved_unverified').length;
  }, [scopedVisits]);

  const missingLogsCount = useMemo(() => {
    return scopedVisits.filter((v) => !v.meetingLog).length;
  }, [scopedVisits]);

  const urgentFlagsCount = useMemo(() => {
    return scopedFlags.length;
  }, [scopedFlags]);

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
    sharedPhoneWarning: Boolean(p.hasSharedPhone),
    premisesPhotoUrl: p.premisesPhotoPath || undefined,
  }));

  const pendingExceptions: DashboardExceptionItem[] = liveExceptions.map((e) => {
    const cfg = getExceptionTypeConfig(e.exceptionType);
    const shortId = e.id.length > 8 ? e.id.slice(0, 8).toUpperCase() : e.id;
    const claimedTimeFormatted = e.claimedCheckInTime
      ? new Date(e.claimedCheckInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Claimed';
    return {
      id: e.id,
      type: 'exception_approval',
      title: e.branchName,
      subtitle: `${e.organisationName} • ${cfg.label}`,
      organisationName: e.organisationName,
      exceptionTypeKey: e.exceptionType || 'field_exception',
      exceptionTypeLabel: cfg.label,
      shortId,
      repName: e.repName,
      claimedTime: claimedTimeFormatted,
      accuracy: 'GPS Unverified',
      evidenceNote: e.failureReason,
      premisesPhotoUrl: e.supportingEvidenceUrl || undefined,
    };
  });

  // Track expanded long narratives inside preview exception cards
  const [expandedExceptionIds, setExpandedExceptionIds] = useState<Record<string, boolean>>({});
  const toggleExceptionExpand = (id: string) => {
    setExpandedExceptionIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Pagination state for pending pins and exceptions preview cards (default to 5 items)
  const [pinsPage, setPinsPage] = useState(1);
  const [pinsPageSize, setPinsPageSize] = useState(5);

  const [exceptionsPage, setExceptionsPage] = useState(1);
  const [exceptionsPageSize, setExceptionsPageSize] = useState(5);

  const totalPinsPages = Math.max(1, Math.ceil(pendingPins.length / pinsPageSize));
  const safePinsPage = Math.min(Math.max(1, pinsPage), totalPinsPages);
  const paginatedPins = useMemo(() => {
    const start = (safePinsPage - 1) * pinsPageSize;
    return pendingPins.slice(start, start + pinsPageSize);
  }, [pendingPins, safePinsPage, pinsPageSize]);

  const totalExceptionsPages = Math.max(1, Math.ceil(pendingExceptions.length / exceptionsPageSize));
  const safeExceptionsPage = Math.min(Math.max(1, exceptionsPage), totalExceptionsPages);
  const paginatedExceptions = useMemo(() => {
    const start = (safeExceptionsPage - 1) * exceptionsPageSize;
    return pendingExceptions.slice(start, start + exceptionsPageSize);
  }, [pendingExceptions, safeExceptionsPage, exceptionsPageSize]);

  const handleOpenReview = (item: ApprovalItem) => {
    setSelectedReviewItem(item);
    setReviewModalOpen(true);
  };

  const handleDecisionRecorded = async (
    itemId: string,
    decision: 'approved' | 'rejected' | 'escalated',
    reason: string
  ) => {
    const shortId = itemId.length > 8 ? itemId.slice(0, 8).toUpperCase() : itemId;
    try {
      if (selectedReviewItem?.type === 'pin_approval' && livePins.some((p) => p.id === itemId)) {
        const res =
          decision === 'approved'
            ? await managementService.approveBranchLocationPin?.(itemId, reason)
            : await managementService.rejectBranchLocationPin?.(itemId, reason);
        if (res?.error) throw res.error;
        await loadDashboardData();
        emitBadgeCountsChanged();
      } else if (
        selectedReviewItem?.type === 'exception_approval' &&
        liveExceptions.some((e) => e.id === itemId)
      ) {
        const res = await managementService.reviewSalespersonException?.(itemId, decision as any, reason);
        if (res?.error) throw res.error;
        await loadDashboardData();
        emitBadgeCountsChanged();
      }
      setFeedbackMessage(
        `Decision for #${shortId} (${selectedReviewItem?.title || 'Review Item'}): ${decision.toUpperCase()}. Rationale: "${reason.slice(0, 35)}..." Logged to immutable audit ledger.`
      );
    } catch (err: any) {
      setFeedbackMessage(`Review action failed for #${shortId}: ${err?.message || 'Unable to save decision'}`);
    }
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
          <span className="bg-teal-100 text-teal-900 px-1.5 py-0.2 rounded-full text-[10px]">
            {pendingAuditsCount}
          </span>
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
          {pendingAbsencesCount > 0 && (
            <span className="bg-purple-100 text-purple-900 px-1.5 py-0.2 rounded-full text-[10px]">
              {pendingAbsencesCount}
            </span>
          )}
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
      {/* 'clients' consolidated into Client & GPS Approvals (redundant screen removed) */}
      {currentSection === 'clients' && <BranchApprovalsQueue />}

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
                className={`text-xs px-2.5 py-1 rounded-md font-bold transition-all ${
                  summaryTimeframe === 'daily'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {dailyPillLabel}
              </button>
              <button
                onClick={() => setSummaryTimeframe('weekly')}
                className={`text-xs px-2.5 py-1 rounded-md font-bold transition-all ${
                  summaryTimeframe === 'weekly'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {weeklyPillLabel}
              </button>
              <button
                onClick={() => setSummaryTimeframe('quarterly')}
                className={`text-xs px-2.5 py-1 rounded-md font-bold transition-all ${
                  summaryTimeframe === 'quarterly'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {quarterlyPillLabel}
              </button>
            </div>

            <span className="text-[11px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hidden sm:inline-block">
              {summaryTimeframe === 'daily'
                ? 'Provisional live events • Cutoff at 19:00 WAT'
                : summaryTimeframe === 'weekly'
                ? 'Workweek Rollup (Last 7 Days) • Updated live'
                : 'Quarter to Date • Updated live'}
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
                  <span className="text-2xl font-black text-slate-900 tracking-tight">{scopedActiveRepsCount}</span>
                  <span className="text-xs font-semibold text-slate-500">/ {totalRepsCount || scopedActiveRepsCount}</span>
                </div>
                <div className="mt-1">
                  <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/70 px-1.5 py-0.5 rounded">
                    {summaryTimeframe === 'daily'
                      ? (totalRepsCount > 0 ? `${Math.round((scopedActiveRepsCount / totalRepsCount) * 100)}% Present` : '100% Present')
                      : (totalRepsCount > 0 ? `${Math.round((scopedActiveRepsCount / totalRepsCount) * 100)}% Active` : '100% Active')}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>
                  {summaryTimeframe === 'daily'
                    ? 'Field active reps'
                    : summaryTimeframe === 'weekly'
                    ? 'Active reps this week'
                    : 'Active reps this quarter'}
                </span>
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
                    {locationVerifiedCount}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">visits</span>
                </div>
                <div className="mt-1">
                  <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 rounded">
                    {summaryTimeframe === 'daily'
                      ? 'Provisional (Live)'
                      : summaryTimeframe === 'weekly'
                      ? `Weekly Rollup (W${isoWeekNumber})`
                      : 'Quarter to Date'}
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
                    {approvedUnverifiedCount}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">exceptions</span>
                </div>
                <div className="mt-1">
                  <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 rounded">
                    {summaryTimeframe === 'daily'
                      ? 'Separate Audit'
                      : summaryTimeframe === 'weekly'
                      ? 'Weekly Sign-offs'
                      : 'Quarterly Total'}
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
                    {missingLogsCount}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">flagged</span>
                </div>
                <div className="mt-1">
                  <span className="inline-block text-[10px] font-bold text-orange-800 bg-orange-50 border border-orange-200/70 px-1.5 py-0.5 rounded">
                    {summaryTimeframe === 'daily'
                      ? `>${logSlaHours}h SLA Overdue`
                      : summaryTimeframe === 'weekly'
                      ? 'Unlogged (Week)'
                      : 'Unlogged (Quarter)'}
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
                  <span className="text-2xl font-black text-slate-900 tracking-tight">{urgentFlagsCount}</span>
                  <span className="text-xs font-semibold text-slate-500">open</span>
                </div>
                <div className="mt-1">
                  <span className="inline-block text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200/70 px-1.5 py-0.5 rounded">
                    {summaryTimeframe === 'daily'
                      ? 'Action Required'
                      : summaryTimeframe === 'weekly'
                      ? 'Open This Week'
                      : 'Quarterly Backlog'}
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
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="min-w-0">
                  <CardTitle className="text-base text-slate-900">Pending Client &amp; GPS Approvals</CardTitle>
                  <p className="text-xs text-slate-600 font-medium">Proposed client locations requiring manager GPS verification</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold text-brand-blue border-blue-200 hover:bg-blue-50 flex items-center gap-1 shrink-0 whitespace-nowrap"
                  onClick={() => handleSectionChange('approvals')}
                >
                  View All ({pendingPins.length}) <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardHeader>

              <CardContent className="space-y-3.5 pt-3.5">
                {pendingPins.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    No pending client location pins awaiting manager verification.
                  </div>
                ) : (
                  paginatedPins.map((item) => (
                  <div key={item.id} className="p-4 sm:p-5 pt-4 sm:pt-5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                        <p className="text-xs text-slate-700 font-medium flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{item.subtitle}</span>
                        </p>
                        <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                          Submitted by: <span className="text-slate-900">{item.repName}</span>
                        </p>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap shrink-0">
                        {item.claimedTime}
                      </span>
                    </div>

                    {item.sharedPhoneWarning && (
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-brand-blue font-semibold">
                        Note: Shared company telephone detected with Apapa location (Permitted under company policy).
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
                ))
              )}

                {pendingPins.length > 0 && (
                  <TablePagination
                    currentPage={safePinsPage}
                    pageSize={pinsPageSize}
                    totalItems={pendingPins.length}
                    onPageChange={setPinsPage}
                    onPageSizeChange={setPinsPageSize}
                    pageSizeOptions={[5, 10, 20]}
                    itemName="approvals"
                    className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs mt-3"
                  />
                )}
              </CardContent>
            </Card>

            {/* Exceptions Awaiting Manager Review Preview */}
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="min-w-0">
                  <CardTitle className="text-base text-slate-900">Exceptions Workbench</CardTitle>
                  <p className="text-xs text-slate-600 font-medium">Salesperson-created missed-visit, GPS and device breakdown logs</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold text-brand-blue border-blue-200 hover:bg-blue-50 flex items-center gap-1 shrink-0 whitespace-nowrap"
                  onClick={() => handleSectionChange('exceptions')}
                >
                  View All ({pendingExceptions.length}) <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardHeader>

              <CardContent className="space-y-3.5 pt-3.5">
                {pendingExceptions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    No pending field exceptions awaiting manager review.
                  </div>
                ) : (
                  paginatedExceptions.map((item) => {
                    const typeCfg = getExceptionTypeConfig(item.exceptionTypeKey);
                    const TypeIcon = typeCfg.icon;
                    const isLongNote = item.evidenceNote.length > 160;
                    const isExpanded = Boolean(expandedExceptionIds[item.id]);

                    return (
                      <div
                        key={item.id}
                        className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-3"
                      >
                        {/* Top Metadata & Status Badge Row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap',
                                  typeCfg.badgeClass
                                )}
                              >
                                <TypeIcon className="w-3 h-3 shrink-0" />
                                {item.exceptionTypeLabel}
                              </span>
                              <span className="text-[10px] font-mono font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap">
                                #{item.shortId}
                              </span>
                            </div>

                            <div>
                              <h4 className="font-bold text-slate-900 text-sm leading-snug">
                                {item.title}
                              </h4>
                              {item.organisationName && (
                                <p className="text-xs text-slate-600 font-medium flex items-center gap-1 mt-0.5">
                                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{item.organisationName}</span>
                                </p>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-600 font-medium flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span>
                                Submitted by: <strong className="text-slate-900">{item.repName}</strong>
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="inline-flex items-center gap-1 font-mono text-slate-700">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                {item.claimedTime}
                              </span>
                            </p>
                          </div>

                          <StatusBadge status="pending_review" size="sm" />
                        </div>

                        {/* Single Clean Narrative Explanation Box */}
                        <div className="bg-white rounded-lg border border-slate-200/90 p-3 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-amber-600 shrink-0" />
                            Exception Reason
                          </span>
                          <p
                            className={cn(
                              'text-xs text-slate-700 leading-relaxed break-words',
                              isLongNote && !isExpanded && 'line-clamp-3'
                            )}
                          >
                            {item.evidenceNote}
                          </p>
                          {isLongNote && (
                            <button
                              type="button"
                              onClick={() => toggleExceptionExpand(item.id)}
                              className="text-[11px] font-bold text-brand-blue hover:underline cursor-pointer pt-0.5"
                            >
                              {isExpanded ? 'Show less' : 'Read full note'}
                            </button>
                          )}
                        </div>

                        {item.premisesPhotoUrl && (
                          <div className="flex items-center justify-between gap-2 bg-blue-50/70 border border-blue-200/80 rounded-lg px-3 py-2">
                            <span className="text-[11px] font-semibold text-brand-blue flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 shrink-0" />
                              Picture evidence attached
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenExceptionPhoto(item)}
                              disabled={loadingPhotoId === item.id}
                              className="text-[11px] font-bold text-brand-blue hover:text-blue-800 hover:underline flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-60"
                            >
                              {loadingPhotoId === item.id ? 'Loading photo...' : 'View Picture Evidence'}
                            </button>
                          </div>
                        )}

                        {/* Footer Status & Action Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>
                              Status: <strong className="text-amber-900">Unverified Activity</strong>
                            </span>
                          </span>
                          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 px-3 text-red-700 border-red-200 hover:bg-red-50 font-semibold flex-1 sm:flex-initial"
                              onClick={() => handleOpenReview(item)}
                            >
                              Reject
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="text-xs h-8 px-3.5 bg-brand-blue hover:bg-brand-blue-700 text-white font-bold flex-1 sm:flex-initial"
                              onClick={() => handleOpenReview(item)}
                            >
                              Review &amp; Decide
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}

                {pendingExceptions.length > 0 && (
                  <TablePagination
                    currentPage={safeExceptionsPage}
                    pageSize={exceptionsPageSize}
                    totalItems={pendingExceptions.length}
                    onPageChange={setExceptionsPage}
                    onPageSizeChange={setExceptionsPageSize}
                    pageSizeOptions={[5, 10, 20]}
                    itemName="exceptions"
                    className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs mt-3"
                  />
                )}
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

      {/* Full-View Picture Evidence Lightbox */}
      <PhotoLightboxModal
        photo={lightboxPhoto}
        onClose={() => setLightboxPhoto(null)}
      />
    </div>
  );
};
