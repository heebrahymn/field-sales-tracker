import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Globe2,
  Users,
  CheckCircle2,
  ShieldAlert,
  Building2,
  AlertTriangle,
  Clock,
  Download,
  Calendar,
  Layers,
  ArrowRight,
  Smartphone,
  Sliders,
  UploadCloud,
} from 'lucide-react';
import { DesktopNavSection } from '@/components/layout/DesktopSidebar';

interface HqOperationsDashboardProps {
  onNavigateSection?: (section: DesktopNavSection) => void;
}

export type HqMarketFilter = 'ALL' | 'NG' | 'ZM' | 'MW';

export const HqOperationsDashboard: React.FC<HqOperationsDashboardProps> = ({
  onNavigateSection,
}) => {
  const [selectedMarket, setSelectedMarket] = useState<HqMarketFilter>('ALL');
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'quarterly'>('daily');

  // Multi-Market Fictional Baseline Data
  const countryMetrics = {
    NG: {
      name: 'Nigeria',
      hub: 'Lagos Hub (West Africa)',
      tz: 'Africa/Lagos (WAT, UTC+1)',
      salespeople: { total: 10, active: 8, scheduled: 10, onLeave: 1, nonVisit: 1 },
      daily: { verified: 34, unverified: 3, branches: 28, offlineShare: '18%', compliance: '94%', openFlags: 4, auditPending: 2 },
      weekly: { verified: 168, unverified: 12, branches: 94, offlineShare: '14.5%', compliance: '95%', openFlags: 4, auditPending: 2 },
      quarterly: { verified: 482, unverified: 31, branches: 142, offlineShare: '15.8%', compliance: '93%', openFlags: 4, auditPending: 2 },
      activeDevices: '10 / 10 Active',
      pinApprovalsPending: 4,
    },
    ZM: {
      name: 'Zambia',
      hub: 'Lusaka Hub (Central/Southern Africa)',
      tz: 'Africa/Lusaka (CAT, UTC+2)',
      salespeople: { total: 6, active: 5, scheduled: 6, onLeave: 1, nonVisit: 0 },
      daily: { verified: 18, unverified: 1, branches: 15, offlineShare: '22%', compliance: '92%', openFlags: 2, auditPending: 1 },
      weekly: { verified: 92, unverified: 6, branches: 48, offlineShare: '20%', compliance: '93%', openFlags: 2, auditPending: 1 },
      quarterly: { verified: 275, unverified: 18, branches: 82, offlineShare: '21%', compliance: '91%', openFlags: 2, auditPending: 1 },
      activeDevices: '6 / 6 Active',
      pinApprovalsPending: 2,
    },
    MW: {
      name: 'Malawi',
      hub: 'Blantyre Hub (East/Southern Africa)',
      tz: 'Africa/Blantyre (CAT, UTC+2)',
      salespeople: { total: 4, active: 4, scheduled: 4, onLeave: 0, nonVisit: 0 },
      daily: { verified: 11, unverified: 1, branches: 9, offlineShare: '28%', compliance: '90%', openFlags: 1, auditPending: 1 },
      weekly: { verified: 58, unverified: 4, branches: 31, offlineShare: '25%', compliance: '91%', openFlags: 1, auditPending: 1 },
      quarterly: { verified: 174, unverified: 12, branches: 54, offlineShare: '26%', compliance: '89%', openFlags: 1, auditPending: 1 },
      activeDevices: '4 / 4 Active',
      pinApprovalsPending: 1,
    },
  };

  // Consolidated Aggregates
  const consolidated = useMemo(() => {
    const totalReps = countryMetrics.NG.salespeople.total + countryMetrics.ZM.salespeople.total + countryMetrics.MW.salespeople.total;
    const activeReps = countryMetrics.NG.salespeople.active + countryMetrics.ZM.salespeople.active + countryMetrics.MW.salespeople.active;
    const onLeaveReps = countryMetrics.NG.salespeople.onLeave + countryMetrics.ZM.salespeople.onLeave + countryMetrics.MW.salespeople.onLeave;
    const nonVisitReps = countryMetrics.NG.salespeople.nonVisit + countryMetrics.ZM.salespeople.nonVisit + countryMetrics.MW.salespeople.nonVisit;

    const tfNG = countryMetrics.NG[timeframe];
    const tfZM = countryMetrics.ZM[timeframe];
    const tfMW = countryMetrics.MW[timeframe];

    return {
      totalReps,
      activeReps,
      onLeaveReps,
      nonVisitReps,
      verified: tfNG.verified + tfZM.verified + tfMW.verified,
      unverified: tfNG.unverified + tfZM.unverified + tfMW.unverified,
      uniqueBranches: tfNG.branches + tfZM.branches + tfMW.branches,
      openFlags: tfNG.openFlags + tfZM.openFlags + tfMW.openFlags,
      auditPending: tfNG.auditPending + tfZM.auditPending + tfMW.auditPending,
      pendingPins: countryMetrics.NG.pinApprovalsPending + countryMetrics.ZM.pinApprovalsPending + countryMetrics.MW.pinApprovalsPending,
      offlineShareAverage: '21.5%',
      logComplianceAverage: '93%',
    };
  }, [countryMetrics, timeframe]);

  // Display Metrics based on selected market filter
  const activeMetrics = useMemo(() => {
    if (selectedMarket === 'ALL') {
      return consolidated;
    }
    const cm = countryMetrics[selectedMarket];
    const tf = cm[timeframe];
    return {
      totalReps: cm.salespeople.total,
      activeReps: cm.salespeople.active,
      onLeaveReps: cm.salespeople.onLeave,
      nonVisitReps: cm.salespeople.nonVisit,
      verified: tf.verified,
      unverified: tf.unverified,
      uniqueBranches: tf.branches,
      openFlags: tf.openFlags,
      auditPending: tf.auditPending,
      pendingPins: cm.pinApprovalsPending,
      offlineShareAverage: tf.offlineShare,
      logComplianceAverage: tf.compliance,
    };
  }, [selectedMarket, consolidated, countryMetrics, timeframe]);

  return (
    <div className="space-y-6">
      {/* Top Banner Notice: Consolidated Governance */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md border border-slate-800">
        <div className="flex items-start gap-3">
          <Globe2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h2 className="font-bold text-white text-base flex items-center gap-2">
              <span>HQ Regional Administration &amp; Multi-Country Oversight</span>
              <span className="text-[10px] font-mono bg-blue-900 text-blue-200 px-2 py-0.5 rounded border border-blue-700">
                Rule v1.2-canonical
              </span>
            </h2>
            <p className="text-slate-300 mt-0.5 font-medium">
              Centralized operational visibility for Carbon Car Care across <strong className="text-white">Nigeria</strong>, <strong className="text-white">Zambia</strong>, and <strong className="text-white">Malawi</strong>.
              Managers and HQ administrators review and audit field evidence, but <span className="text-amber-300 font-semibold">never originate salesperson visit logs</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] bg-slate-800 border border-slate-700 px-3 py-1 rounded-md text-slate-200 font-mono font-semibold">
            Cutoff: 19:00 Local WAT/CAT
          </span>
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-semibold bg-white text-slate-900 border-slate-300 hover:bg-slate-100 cursor-pointer"
            onClick={() => onNavigateSection && onNavigateSection('exports')}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Export Multi-Country CSV
          </Button>
        </div>
      </div>

      {/* Filter Toolbar: Market Filter & Timeframe Selector */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Market Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
            <Layers className="w-3.5 h-3.5" /> Market Scope:
          </span>
          <button
            onClick={() => setSelectedMarket('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
              selectedMarket === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            All Markets (3 Countries)
          </button>
          <button
            onClick={() => setSelectedMarket('NG')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
              selectedMarket === 'NG'
                ? 'bg-brand-blue text-white shadow-xs'
                : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            🇳🇬 Nigeria (Lagos Hub)
          </button>
          <button
            onClick={() => setSelectedMarket('ZM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
              selectedMarket === 'ZM'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            🇿🇲 Zambia (Lusaka Hub)
          </button>
          <button
            onClick={() => setSelectedMarket('MW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
              selectedMarket === 'MW'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            🇲🇼 Malawi (Blantyre Hub)
          </button>
        </div>

        {/* Timeframe Scope */}
        <div className="flex items-center gap-1 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
            <Calendar className="w-3.5 h-3.5" /> Window:
          </span>
          <button
            onClick={() => setTimeframe('daily')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer ${
              timeframe === 'daily'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setTimeframe('weekly')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer ${
              timeframe === 'weekly'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Weekly (W42)
          </button>
          <button
            onClick={() => setTimeframe('quarterly')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer ${
              timeframe === 'quarterly'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Quarterly (Q4)
          </button>
        </div>
      </div>

      {/* ================= 6 DISTINCT COUNTING KPI CARDS ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
        {/* 1. Total & Active Salespeople */}
        <div
          onClick={() => onNavigateSection && onNavigateSection('users')}
          className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all p-3.5 flex flex-col justify-between min-h-[142px] cursor-pointer"
        >
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Sales Roster
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {activeMetrics.activeReps}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                / {activeMetrics.totalReps} present
              </span>
            </div>
            <div className="mt-1">
              <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                {Math.round((activeMetrics.activeReps / activeMetrics.totalReps) * 100)}% Attendance
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>{activeMetrics.onLeaveReps} on leave • {activeMetrics.nonVisitReps} non-visit</span>
          </div>
        </div>

        {/* 2. Location Verified Visits */}
        <div
          onClick={() => onNavigateSection && onNavigateSection('exports')}
          className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all p-3.5 flex flex-col justify-between min-h-[142px] cursor-pointer"
        >
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Location Verified
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {activeMetrics.verified}
              </span>
              <span className="text-xs font-semibold text-slate-500">visits</span>
            </div>
            <div className="mt-1">
              <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                GPS ≤100m + Photo
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Geofence validated</span>
          </div>
        </div>

        {/* 3. Approved Unverified Activity */}
        <div
          onClick={() => onNavigateSection && onNavigateSection('exceptions')}
          className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all p-3.5 flex flex-col justify-between min-h-[142px] cursor-pointer"
        >
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Approved Unverified
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {activeMetrics.unverified}
              </span>
              <span className="text-xs font-semibold text-slate-500">exceptions</span>
            </div>
            <div className="mt-1">
              <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                Manager Sign-off
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>Isolated from GPS target</span>
          </div>
        </div>

        {/* 4. Unique Branches Visited */}
        <div
          onClick={() => onNavigateSection && onNavigateSection('import')}
          className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all p-3.5 flex flex-col justify-between min-h-[142px] cursor-pointer"
        >
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Unique Locations
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {activeMetrics.uniqueBranches}
              </span>
              <span className="text-xs font-semibold text-slate-500">sites</span>
            </div>
            <div className="mt-1">
              <span className="inline-block text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                Physical B2B Reach
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            <span>Client locations reached</span>
          </div>
        </div>

        {/* 5. Pending Branch Approvals */}
        <div
          onClick={() => onNavigateSection && onNavigateSection('import')}
          className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all p-3.5 flex flex-col justify-between min-h-[142px] cursor-pointer"
        >
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Pending Pins
            </span>
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {activeMetrics.pendingPins}
              </span>
              <span className="text-xs font-semibold text-slate-500">registrations</span>
            </div>
            <div className="mt-1">
              <span className="inline-block text-[10px] font-bold text-orange-800 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                ≤50m Pin Gate
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
            <span>Requires manager approval</span>
          </div>
        </div>

        {/* 6. Urgent Flags & Audit Calls */}
        <div
          onClick={() => onNavigateSection && onNavigateSection('exceptions')}
          className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all p-3.5 flex flex-col justify-between min-h-[142px] cursor-pointer"
        >
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Flags &amp; Audits
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {activeMetrics.openFlags}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                flags • {activeMetrics.auditPending} calls
              </span>
            </div>
            <div className="mt-1">
              <span className="inline-block text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                Review Required
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span>Tripwires &amp; 5% calls</span>
          </div>
        </div>
      </div>

      {/* ================= COUNTRY OPERATIONAL PERFORMANCE COMPARISON TABLE ================= */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base text-slate-900 flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-brand-blue" />
              <span>Country Operational Performance Comparison</span>
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Consolidated operational benchmarks across Nigeria, Zambia, and Malawi for the {timeframe} window
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            3 Operating Markets
          </span>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Market / Hub</th>
                  <th className="py-3 px-4">Local Timezone</th>
                  <th className="py-3 px-4">Field Reps</th>
                  <th className="py-3 px-4">Verified Visits</th>
                  <th className="py-3 px-4">Approved Unverified</th>
                  <th className="py-3 px-4">Unique Locations</th>
                  <th className="py-3 px-4">Offline Sync Share</th>
                  <th className="py-3 px-4">Log SLA</th>
                  <th className="py-3 px-4 text-right">Device Fleet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {/* 1. Nigeria */}
                <tr className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>🇳🇬</span>
                      <span>Nigeria</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">Lagos Regional Hub</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">Africa/Lagos (WAT, UTC+1)</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    {countryMetrics.NG.salespeople.active} / {countryMetrics.NG.salespeople.total} Present
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-700">
                    {countryMetrics.NG[timeframe].verified}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-amber-800">
                    {countryMetrics.NG[timeframe].unverified}
                  </td>
                  <td className="py-3.5 px-4 text-slate-900 font-semibold">
                    {countryMetrics.NG[timeframe].branches}
                  </td>
                  <td className="py-3.5 px-4 text-purple-700 font-bold">
                    {countryMetrics.NG[timeframe].offlineShare}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-brand-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {countryMetrics.NG[timeframe].compliance}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      10/10 Handsets Active
                    </span>
                  </td>
                </tr>

                {/* 2. Zambia */}
                <tr className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>🇿🇲</span>
                      <span>Zambia</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">Lusaka Regional Hub</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">Africa/Lusaka (CAT, UTC+2)</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    {countryMetrics.ZM.salespeople.active} / {countryMetrics.ZM.salespeople.total} Present
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-700">
                    {countryMetrics.ZM[timeframe].verified}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-amber-800">
                    {countryMetrics.ZM[timeframe].unverified}
                  </td>
                  <td className="py-3.5 px-4 text-slate-900 font-semibold">
                    {countryMetrics.ZM[timeframe].branches}
                  </td>
                  <td className="py-3.5 px-4 text-purple-700 font-bold">
                    {countryMetrics.ZM[timeframe].offlineShare}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-brand-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {countryMetrics.ZM[timeframe].compliance}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      6/6 Handsets Active
                    </span>
                  </td>
                </tr>

                {/* 3. Malawi */}
                <tr className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>🇲🇼</span>
                      <span>Malawi</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">Blantyre Regional Hub</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">Africa/Blantyre (CAT, UTC+2)</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    {countryMetrics.MW.salespeople.active} / {countryMetrics.MW.salespeople.total} Present
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-700">
                    {countryMetrics.MW[timeframe].verified}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-amber-800">
                    {countryMetrics.MW[timeframe].unverified}
                  </td>
                  <td className="py-3.5 px-4 text-slate-900 font-semibold">
                    {countryMetrics.MW[timeframe].branches}
                  </td>
                  <td className="py-3.5 px-4 text-purple-700 font-bold">
                    {countryMetrics.MW[timeframe].offlineShare}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-brand-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {countryMetrics.MW[timeframe].compliance}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      4/4 Handsets Active
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ================= 4 HQ ADMINISTRATIVE QUICK ACTION TILES ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => onNavigateSection && onNavigateSection('users')}
          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm">User &amp; Role Management</h4>
          <p className="text-xs text-slate-500">
            Create accounts, assign market access, and review login security audit logs.
          </p>
          <div className="text-xs font-bold text-brand-blue flex items-center gap-1 pt-1">
            Manage 23 Users <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => onNavigateSection && onNavigateSection('devices')}
          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Smartphone className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Company Devices &amp; MDM</h4>
          <p className="text-xs text-slate-500">
            Assign company handsets, process replacements, and monitor fleet battery health.
          </p>
          <div className="text-xs font-bold text-emerald-700 flex items-center gap-1 pt-1">
            20 Handsets Tracked <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => onNavigateSection && onNavigateSection('markets')}
          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Market Rules &amp; Calendars</h4>
          <p className="text-xs text-slate-500">
            Configure geofence radiuses, holiday calendars, and audit sampling thresholds.
          </p>
          <div className="text-xs font-bold text-purple-700 flex items-center gap-1 pt-1">
            3 Country Rule Sets <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => onNavigateSection && onNavigateSection('import')}
          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <UploadCloud className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Client Master B2B Import</h4>
          <p className="text-xs text-slate-500">
            Bulk-import enterprise client locations with automated phone &amp; GPS validation.
          </p>
          <div className="text-xs font-bold text-amber-800 flex items-center gap-1 pt-1">
            Launch Import Engine <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
