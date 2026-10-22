import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { CountryCsvExportModal } from '@/features/review/CountryCsvExportModal';
import {
  Calendar,
  CheckCircle2,
  ShieldAlert,
  Building2,
  Download,
  BarChart3,
  TrendingUp,
  Info,
  Filter,
  RotateCcw,
  User,
  Search,
  Clock,
  WifiOff,
  Wifi,
  FileText,
  AlertCircle,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CountryReportingViewProps {
  marketName: string;
}

export interface GranularVisitRecord {
  id: string;
  repId: string;
  repName: string;
  branchCode: string;
  branchName: string;
  clientCompany: string;
  date: string;
  timeWAT: string;
  status: 'location_verified' | 'manager_approved_unverified' | 'pending_review' | 'disputed';
  offlineCaptured: boolean;
  logStatus: 'complete' | 'missing' | 'late_submitted';
  logDurationMinutes: number;
  productsDiscussed: string;
  territory: string;
}

export const CountryReportingView: React.FC<CountryReportingViewProps> = ({ marketName }) => {
  // Timeframe and Multi-Dimensional Filter States
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'quarterly'>('weekly');
  const [selectedRep, setSelectedRep] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<'daily' | 'weekly' | 'quarterly' | 'custom'>('weekly');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-10-13');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-10-19');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'granular'>('summary');

  // Baseline Rollup Figures per timeframe
  const baselineData = {
    daily: {
      label: 'Today (Provisional — Subject to 19:00 WAT Cutoff)',
      scheduledReps: 10,
      activePresent: 8,
      onLeave: 1,
      nonVisitWorkday: 1,
      verifiedVisits: 34,
      managerApprovedUnverified: 3,
      uniqueBranches: 28,
      missingLogs: 2,
      offlineEventShare: '18%',
      logCompliance: '94%',
      auditSampleRate: '5.2%',
      provisional: true,
    },
    weekly: {
      label: 'Current Workweek (13 - 19 Oct 2026)',
      scheduledReps: 10,
      activePresent: 9.2,
      onLeave: 1,
      nonVisitWorkday: 2,
      verifiedVisits: 168,
      managerApprovedUnverified: 12,
      uniqueBranches: 94,
      missingLogs: 3,
      offlineEventShare: '14.5%',
      logCompliance: '95%',
      auditSampleRate: '5.1%',
      provisional: false,
    },
    quarterly: {
      label: 'Quarter 4 (Oct - Dec 2026, QTD)',
      scheduledReps: 10,
      activePresent: 9.4,
      onLeave: 3,
      nonVisitWorkday: 8,
      verifiedVisits: 482,
      managerApprovedUnverified: 31,
      uniqueBranches: 142,
      missingLogs: 7,
      offlineEventShare: '15.8%',
      logCompliance: '93%',
      auditSampleRate: '5.0%',
      provisional: false,
    },
  };

  // Canonical Mock Sales Representatives
  const salesReps = [
    {
      id: 'CC-REP-042',
      name: 'Tunde Adebayo',
      territory: 'Lagos Island & Lekki',
      daily: { verified: 8, unverified: 1, branches: 7, offline: '12%', compliance: '98%' },
      weekly: { verified: 38, unverified: 3, branches: 24, offline: '12%', compliance: '98%' },
      quarterly: { verified: 112, unverified: 6, branches: 35, offline: '13%', compliance: '97%' },
    },
    {
      id: 'CC-REP-038',
      name: 'Chinyere Nwosu',
      territory: 'Apapa Port Corridor',
      daily: { verified: 7, unverified: 0, branches: 6, offline: '19%', compliance: '95%' },
      weekly: { verified: 36, unverified: 2, branches: 21, offline: '19%', compliance: '95%' },
      quarterly: { verified: 108, unverified: 5, branches: 32, offline: '18%', compliance: '94%' },
    },
    {
      id: 'CC-REP-039',
      name: 'Emeka Nwosu',
      territory: 'Ibeju-Lekki Hub',
      daily: { verified: 6, unverified: 1, branches: 5, offline: '15%', compliance: '91%' },
      weekly: { verified: 32, unverified: 4, branches: 19, offline: '15%', compliance: '91%' },
      quarterly: { verified: 98, unverified: 9, branches: 28, offline: '16%', compliance: '90%' },
    },
    {
      id: 'CC-REP-044',
      name: 'Ibrahim Sani',
      territory: 'Kano North Transit Route',
      daily: { verified: 5, unverified: 1, branches: 5, offline: '26%', compliance: '88%' },
      weekly: { verified: 30, unverified: 3, branches: 18, offline: '26%', compliance: '88%' },
      quarterly: { verified: 92, unverified: 8, branches: 26, offline: '24%', compliance: '89%' },
    },
  ];

  // Canonical Granular Operational Records (MVP Scope: No financial or pipeline fields)
  const allRecords: GranularVisitRecord[] = [
    {
      id: 'VIS-LAG-901',
      repId: 'CC-REP-042',
      repName: 'Tunde Adebayo',
      branchCode: 'BR-LAG-108',
      branchName: 'Apex Commercial Transit Hub',
      clientCompany: 'Apex Commercial Transit Ltd',
      date: '2026-10-19',
      timeWAT: '09:15 WAT',
      status: 'location_verified',
      offlineCaptured: false,
      logStatus: 'complete',
      logDurationMinutes: 12,
      productsDiscussed: 'Heavy Duty Coolant 20L, Fleet Degreaser',
      territory: 'Lagos Island & Lekki',
    },
    {
      id: 'VIS-LAG-904',
      repId: 'CC-REP-042',
      repName: 'Tunde Adebayo',
      branchCode: 'BR-LAG-014',
      branchName: 'Apex Heavy Logistics Fleet Depot',
      clientCompany: 'Apex Heavy Logistics Ltd',
      date: '2026-10-19',
      timeWAT: '11:30 WAT',
      status: 'location_verified',
      offlineCaptured: true,
      logStatus: 'complete',
      logDurationMinutes: 18,
      productsDiscussed: 'Ceramic Glass Coat Pro, Tire Dressing 5L',
      territory: 'Lagos Island & Lekki',
    },
    {
      id: 'VIS-LAG-908',
      repId: 'CC-REP-042',
      repName: 'Tunde Adebayo',
      branchCode: 'BR-LAG-052',
      branchName: 'Metroline Basement Depot',
      clientCompany: 'Metroline Express Logistics',
      date: '2026-10-19',
      timeWAT: '14:00 WAT',
      status: 'manager_approved_unverified',
      offlineCaptured: true,
      logStatus: 'complete',
      logDurationMinutes: 25,
      productsDiscussed: 'Premium Carnauba Wash & Wax',
      territory: 'Lagos Island & Lekki',
    },
    {
      id: 'VIS-LAG-892',
      repId: 'CC-REP-038',
      repName: 'Chinyere Nwosu',
      branchCode: 'BR-LAG-014',
      branchName: 'Apex Heavy Logistics Fleet Depot',
      clientCompany: 'Apex Heavy Logistics Ltd',
      date: '2026-10-18',
      timeWAT: '10:15 WAT',
      status: 'location_verified',
      offlineCaptured: false,
      logStatus: 'complete',
      logDurationMinutes: 8,
      productsDiscussed: 'Fleet Degreaser 25L, Heavy Duty Wash Sponge',
      territory: 'Apapa Port Corridor',
    },
    {
      id: 'VIS-LAG-896',
      repId: 'CC-REP-038',
      repName: 'Chinyere Nwosu',
      branchCode: 'BR-LAG-091',
      branchName: 'Dangote Flour Transport Wing',
      clientCompany: 'Dangote Group',
      date: '2026-10-19',
      timeWAT: '13:20 WAT',
      status: 'location_verified',
      offlineCaptured: true,
      logStatus: 'missing',
      logDurationMinutes: 0,
      productsDiscussed: 'Pending log entry by representative',
      territory: 'Apapa Port Corridor',
    },
    {
      id: 'VIS-LAG-885',
      repId: 'CC-REP-039',
      repName: 'Emeka Nwosu',
      branchCode: 'BR-LAG-077',
      branchName: 'Titan Engineering Fleet Depot',
      clientCompany: 'Titan Engineering Ltd',
      date: '2026-10-19',
      timeWAT: '11:45 WAT',
      status: 'manager_approved_unverified',
      offlineCaptured: true,
      logStatus: 'complete',
      logDurationMinutes: 40,
      productsDiscussed: 'Engine Degreaser Concentrate, Microfiber Bales',
      territory: 'Ibeju-Lekki Hub',
    },
    {
      id: 'VIS-LAG-888',
      repId: 'CC-REP-039',
      repName: 'Emeka Nwosu',
      branchCode: 'BR-LAG-108',
      branchName: 'Apex Commercial Transit Hub',
      clientCompany: 'Apex Commercial Transit Ltd',
      date: '2026-10-17',
      timeWAT: '15:10 WAT',
      status: 'disputed',
      offlineCaptured: false,
      logStatus: 'complete',
      logDurationMinutes: 15,
      productsDiscussed: 'Wheel Cleaner Acid-Free 5L',
      territory: 'Ibeju-Lekki Hub',
    },
    {
      id: 'VIS-KAN-701',
      repId: 'CC-REP-044',
      repName: 'Ibrahim Sani',
      branchCode: 'BR-KAN-003',
      branchName: 'Kano Freight Express Terminal',
      clientCompany: 'Kano Freight Express Ltd',
      date: '2026-10-19',
      timeWAT: '08:45 WAT',
      status: 'location_verified',
      offlineCaptured: true,
      logStatus: 'complete',
      logDurationMinutes: 22,
      productsDiscussed: 'All-Purpose Fleet Cleaner 20L',
      territory: 'Kano North Transit Route',
    },
    {
      id: 'VIS-KAN-705',
      repId: 'CC-REP-044',
      repName: 'Ibrahim Sani',
      branchCode: 'BR-KAN-003',
      branchName: 'Kano Freight Express Terminal',
      clientCompany: 'Kano Freight Express Ltd',
      date: '2026-10-16',
      timeWAT: '14:30 WAT',
      status: 'location_verified',
      offlineCaptured: true,
      logStatus: 'missing',
      logDurationMinutes: 0,
      productsDiscussed: 'Pending log entry (>2h SLA flagged)',
      territory: 'Kano North Transit Route',
    },
    {
      id: 'VIS-LAG-870',
      repId: 'CC-REP-039',
      repName: 'Emeka Nwosu',
      branchCode: 'BR-LAG-063',
      branchName: 'Seven-Up Logistics Hub',
      clientCompany: 'Seven-Up Bottling Company',
      date: '2026-10-14',
      timeWAT: '11:00 WAT',
      status: 'location_verified',
      offlineCaptured: false,
      logStatus: 'complete',
      logDurationMinutes: 10,
      productsDiscussed: 'Truck Wash Concentrate, Interior Foam',
      territory: 'Ibeju-Lekki Hub',
    },
  ];

  // Active Filter Count calculation
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedRep !== 'all') count++;
    if (selectedDateRange !== 'weekly') count++;
    if (selectedBranch !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    if (searchQuery.trim().length > 0) count++;
    return count;
  }, [selectedRep, selectedDateRange, selectedBranch, selectedStatus, searchQuery]);

  // Handle Date Range Selection
  const handleDateRangeChange = (val: 'daily' | 'weekly' | 'quarterly' | 'custom') => {
    setSelectedDateRange(val);
    if (val === 'daily' || val === 'weekly' || val === 'quarterly') {
      setTimeframe(val);
    }
  };

  // Reset All Filters
  const handleResetFilters = () => {
    setSelectedRep('all');
    setSelectedDateRange('weekly');
    setTimeframe('weekly');
    setSelectedBranch('all');
    setSelectedStatus('all');
    setSearchQuery('');
  };

  // Filtered Granular Records
  const filteredRecords = useMemo(() => {
    return allRecords.filter((record) => {
      // 1. Salesperson filter
      if (selectedRep !== 'all' && record.repId !== selectedRep) {
        return false;
      }

      // 2. Branch filter
      if (selectedBranch !== 'all' && record.branchCode !== selectedBranch) {
        return false;
      }

      // 3. Status filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'missing_log') {
          if (record.logStatus !== 'missing') return false;
        } else if (record.status !== selectedStatus) {
          return false;
        }
      }

      // 4. Date range filter
      if (selectedDateRange === 'daily' && record.date !== '2026-10-19') {
        return false;
      }
      if (selectedDateRange === 'custom') {
        if (customStartDate && record.date < customStartDate) return false;
        if (customEndDate && record.date > customEndDate) return false;
      }

      // 5. Search Query filter (matches ID, rep, client, branch)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          record.id.toLowerCase().includes(q) ||
          record.repName.toLowerCase().includes(q) ||
          record.clientCompany.toLowerCase().includes(q) ||
          record.branchName.toLowerCase().includes(q) ||
          record.branchCode.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [allRecords, selectedRep, selectedBranch, selectedStatus, selectedDateRange, customStartDate, customEndDate, searchQuery]);

  // Filtered Rep Breakdown Table Data
  const filteredReps = useMemo(() => {
    return salesReps.filter((rep) => {
      if (selectedRep !== 'all' && rep.id !== selectedRep) {
        return false;
      }
      return true;
    });
  }, [salesReps, selectedRep]);

  // Dynamically Adjusted Rollup Metrics based on filtered slice
  const dynamicMetrics = useMemo(() => {
    const isFiltered = activeFilterCount > 0;
    if (!isFiltered) {
      return baselineData[timeframe];
    }

    // Compute from filteredRecords when filters are active
    const verified = filteredRecords.filter((r) => r.status === 'location_verified').length;
    const unverified = filteredRecords.filter((r) => r.status === 'manager_approved_unverified').length;
    const uniqueBranchSet = new Set(filteredRecords.map((r) => r.branchCode));
    const offlineCount = filteredRecords.filter((r) => r.offlineCaptured).length;
    const offlinePct = filteredRecords.length > 0 ? Math.round((offlineCount / filteredRecords.length) * 100) : 0;
    const compliantLogs = filteredRecords.filter((r) => r.logStatus === 'complete').length;
    const logCompliancePct = filteredRecords.length > 0 ? Math.round((compliantLogs / filteredRecords.length) * 100) : 100;

    return {
      label: `Filtered Slice (${filteredRecords.length} records matching)`,
      scheduledReps: filteredReps.length,
      activePresent: filteredReps.length,
      onLeave: 0,
      nonVisitWorkday: 0,
      verifiedVisits: verified,
      managerApprovedUnverified: unverified,
      uniqueBranches: uniqueBranchSet.size,
      missingLogs: filteredRecords.filter((r) => r.logStatus === 'missing').length,
      offlineEventShare: `${offlinePct}%`,
      logCompliance: `${logCompliancePct}%`,
      auditSampleRate: '5.0%',
      provisional: selectedDateRange === 'daily',
    };
  }, [activeFilterCount, baselineData, timeframe, filteredRecords, filteredReps, selectedDateRange]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Export Trigger */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <BarChart3 className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
          <div className="text-xs">
            <h3 className="font-bold text-slate-900 text-sm">
              Operational Reporting &amp; Audit Analytics (PRD §10)
            </h3>
            <p className="text-slate-700 font-medium mt-0.5">
              Multi-dimensional reporting across attendance, physical GPS visits, exception rates, unique branches, and offline sync. Strict MVP scope:{' '}
              <span className="font-bold text-slate-900">no commercial sales pipelines, orders, or quotation metrics</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="default"
            size="sm"
            className="text-xs font-bold bg-brand-green-700 hover:bg-brand-green-800 text-white flex items-center gap-1.5"
            onClick={() => setIsExportModalOpen(true)}
          >
            <Download className="w-3.5 h-3.5" />
            Export Safe Country CSV
          </Button>
        </div>
      </div>

      {/* ================= COMPREHENSIVE FILTER BAR ================= */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-brand-blue" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Filter Operational Records
            </h4>
            {activeFilterCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-brand-blue">
                {activeFilterCount} active {activeFilterCount === 1 ? 'filter' : 'filters'}
              </span>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-slate-500 hover:text-rose-600 font-semibold flex items-center gap-1 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset all filters
            </button>
          )}
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Filter by Salesperson */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-500" /> Salesperson
            </label>
            <select
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
              className="w-full text-xs h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              <option value="all">All Salespeople (4 active)</option>
              <option value="CC-REP-042">Tunde Adebayo (CC-REP-042)</option>
              <option value="CC-REP-038">Chinyere Nwosu (CC-REP-038)</option>
              <option value="CC-REP-039">Emeka Nwosu (CC-REP-039)</option>
              <option value="CC-REP-044">Ibrahim Sani (CC-REP-044)</option>
            </select>
          </div>

          {/* 2. Filter by Date Range */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" /> Date Range
            </label>
            <select
              value={selectedDateRange}
              onChange={(e) => handleDateRangeChange(e.target.value as any)}
              className="w-full text-xs h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              <option value="daily">Daily: Today (19 Oct 2026)</option>
              <option value="weekly">Weekly: Workweek 42 (13 - 19 Oct 2026)</option>
              <option value="quarterly">Quarterly: Q4 (Oct - Dec 2026 QTD)</option>
              <option value="custom">Custom Date Range...</option>
            </select>
          </div>

          {/* 3. Filter by Location */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-500" /> Client Location
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full text-xs h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              <option value="all">All Client Locations</option>
              <option value="BR-LAG-108">Apex Commercial Transit Hub (BR-LAG-108)</option>
              <option value="BR-LAG-014">Apex Heavy Logistics Fleet Depot (BR-LAG-014)</option>
              <option value="BR-LAG-052">Metroline Basement Depot (BR-LAG-052)</option>
              <option value="BR-LAG-077">Titan Engineering Fleet Depot (BR-LAG-077)</option>
              <option value="BR-KAN-003">Kano Freight Express Terminal (BR-KAN-003)</option>
              <option value="BR-LAG-091">Dangote Flour Transport Wing (BR-LAG-091)</option>
              <option value="BR-LAG-063">Seven-Up Bottling Logistics Hub (BR-LAG-063)</option>
            </select>
          </div>

          {/* 4. Filter by Status */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" /> Verification Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              <option value="all">All Verification Statuses</option>
              <option value="location_verified">Location Verified (GPS + Live Photo)</option>
              <option value="manager_approved_unverified">Approved Unverified (Manager Sign-off)</option>
              <option value="missing_log">Missing Log (&gt;2h SLA Flagged)</option>
              <option value="disputed">Disputed — Pending Review</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Inputs when 'custom' is active */}
        {selectedDateRange === 'custom' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Start Date:</span>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 text-xs w-36 bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">End Date:</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 text-xs w-36 bg-white"
              />
            </div>
            <span className="text-[11px] text-slate-500 italic">
              Filtering records between {customStartDate} and {customEndDate}
            </span>
          </div>
        )}

        {/* Active Filter Tags Bar */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] font-bold text-slate-500">Active Filters:</span>
            {selectedRep !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 text-brand-blue border border-blue-200 font-semibold text-[11px]">
                Salesperson: {salesReps.find((r) => r.id === selectedRep)?.name || selectedRep}
                <button onClick={() => setSelectedRep('all')} className="hover:text-red-600 ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedDateRange !== 'weekly' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 text-brand-blue border border-blue-200 font-semibold text-[11px]">
                Date: {selectedDateRange === 'daily' ? 'Today' : selectedDateRange === 'quarterly' ? 'Quarter 4' : `${customStartDate} to ${customEndDate}`}
                <button onClick={() => handleDateRangeChange('weekly')} className="hover:text-red-600 ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedBranch !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 text-brand-blue border border-blue-200 font-semibold text-[11px]">
                Location: {selectedBranch}
                <button onClick={() => setSelectedBranch('all')} className="hover:text-red-600 ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 text-brand-blue border border-blue-200 font-semibold text-[11px]">
                Status: {selectedStatus.replace('_', ' ')}
                <button onClick={() => setSelectedStatus('all')} className="hover:text-red-600 ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Quick Timeframe Preset Switcher & Provisional Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-500 mr-2 flex items-center gap-1 shrink-0">
            <Calendar className="w-3.5 h-3.5" /> Scope:
          </span>
          <button
            onClick={() => handleDateRangeChange('daily')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
              selectedDateRange === 'daily'
                ? 'bg-brand-blue text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Daily Summary
          </button>
          <button
            onClick={() => handleDateRangeChange('weekly')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
              selectedDateRange === 'weekly'
                ? 'bg-brand-blue text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Weekly Rollup
          </button>
          <button
            onClick={() => handleDateRangeChange('quarterly')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
              selectedDateRange === 'quarterly'
                ? 'bg-brand-blue text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Quarterly Coverage (Q4)
          </button>
        </div>

        <div className="text-xs font-medium text-slate-600">
          {dynamicMetrics.label}
        </div>
      </div>

      {/* Provisional Reconciliation Indicator Alert */}
      {dynamicMetrics.provisional && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs flex items-center gap-2 text-amber-900">
          <Info className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Provisional Data Notice (PRD §10):</strong> Daily figures reflect real-time synced events. Devices with unsynchronised offline queues will be reconciled at the 19:00 daily cutoff.
          </span>
        </div>
      )}

      {/* ================= MULTI-DIMENSIONAL ROLLUP KPI CARDS ================= */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Verified Visits */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Location Verified</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{dynamicMetrics.verifiedVisits}</div>
          <div className="text-[11px] text-emerald-700 font-bold">GPS ≤100m + Premises Photo</div>
        </div>

        {/* 2. Manager Approved Unverified */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Approved Unverified</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{dynamicMetrics.managerApprovedUnverified}</div>
          <div className="text-[11px] text-amber-800 font-bold">Manager Sign-off Only</div>
        </div>

        {/* 3. Unique Branches Reached */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Unique Branches</span>
            <Building2 className="w-4 h-4 text-brand-blue" />
          </div>
          <div className="text-2xl font-black text-slate-900">{dynamicMetrics.uniqueBranches}</div>
          <div className="text-[11px] text-slate-500 font-medium">Distinct client sites</div>
        </div>

        {/* 4. Offline Event Share */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Offline Event Share</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{dynamicMetrics.offlineEventShare}</div>
          <div className="text-[11px] text-purple-700 font-bold">Durable Dexie Sync</div>
        </div>

        {/* 5. Log SLA Compliance */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1 shadow-xs col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Log SLA Compliance</span>
            <Clock className="w-4 h-4 text-brand-blue" />
          </div>
          <div className="text-2xl font-black text-slate-900">{dynamicMetrics.logCompliance}</div>
          <div className="text-[11px] text-brand-blue font-bold">≤2h SLA Submission</div>
        </div>
      </div>

      {/* ================= VIEW SELECTOR TABS ================= */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('summary')}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'summary'
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Sales Representative Operational Breakdown</span>
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded-full font-mono text-slate-700">
              {filteredReps.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('granular')}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'granular'
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Individual Visit Records (Filtered)</span>
            <span className="text-[10px] bg-blue-100 text-brand-blue px-1.5 py-0.2 rounded-full font-mono font-bold">
              {filteredRecords.length}
            </span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: SALES REPRESENTATIVE OPERATIONAL BREAKDOWN ================= */}
      {activeTab === 'summary' && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900">
                Sales Representative Operational Breakdown
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparative activity across {marketName} team for {timeframe} window
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {filteredReps.length} Active {filteredReps.length === 1 ? 'Rep' : 'Reps'}
            </span>
          </CardHeader>

          <CardContent className="p-0">
            {filteredReps.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No sales representatives match the current filter criteria.</p>
                <button
                  onClick={handleResetFilters}
                  className="mt-2 text-brand-blue hover:underline font-bold"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Salesperson</th>
                      <th className="py-3 px-4">Assigned Territory</th>
                      <th className="py-3 px-4">Verified Visits</th>
                      <th className="py-3 px-4">Approved Unverified</th>
                      <th className="py-3 px-4">Unique Branches</th>
                      <th className="py-3 px-4">Offline Share</th>
                      <th className="py-3 px-4 text-right">Log SLA Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReps.map((rep) => {
                      const repData = rep[timeframe];
                      return (
                        <tr key={rep.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{rep.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{rep.id}</div>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-700">{rep.territory}</td>
                          <td className="py-3.5 px-4 font-bold text-emerald-700">{repData.verified}</td>
                          <td className="py-3.5 px-4 font-bold text-amber-800">{repData.unverified}</td>
                          <td className="py-3.5 px-4 font-medium text-slate-900">{repData.branches}</td>
                          <td className="py-3.5 px-4 font-medium text-slate-600">{repData.offline}</td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="font-bold text-brand-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {repData.compliance}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================= TAB 2: DETAILED FILTERED VISIT & ACTIVITY RECORDS ================= */}
      {activeTab === 'granular' && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base text-slate-900">
                Individual Operational Records
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed audit trail filtered by representative, date range, location, and status
              </p>
            </div>

            {/* Quick Text Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                placeholder="Search record ID, rep, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8 bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No operational records match the chosen filter combinations.</p>
                <p className="text-slate-500 mt-1">Try adjusting the representative, date range, location, or verification status.</p>
                <button
                  onClick={handleResetFilters}
                  className="mt-3 text-brand-blue hover:underline font-bold inline-block"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Visit ID</th>
                      <th className="py-3 px-4">Salesperson</th>
                      <th className="py-3 px-4">Client Location</th>
                      <th className="py-3 px-4">Date &amp; Time</th>
                      <th className="py-3 px-4">Verification Status</th>
                      <th className="py-3 px-4">Sync Origin</th>
                      <th className="py-3 px-4 text-right">Meeting Log</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {record.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{record.repName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{record.repId}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{record.branchName}</div>
                          <div className="text-[10px] text-slate-500">{record.clientCompany} • {record.branchCode}</div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-medium text-slate-900">{record.date}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{record.timeWAT}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={record.status} size="sm" />
                        </td>
                        <td className="py-3.5 px-4">
                          {record.offlineCaptured ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                              <WifiOff className="w-3 h-3" /> Dexie Queue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              <Wifi className="w-3 h-3" /> Direct Network
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {record.logStatus === 'complete' ? (
                            <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              Logged in {record.logDurationMinutes}m
                            </span>
                          ) : (
                            <span className="inline-block text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                              Missing Log (&gt;2h)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CSV Export Dialog */}
      <CountryCsvExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        marketName={marketName}
        defaultRep={selectedRep}
        defaultDateRange={selectedDateRange === 'quarterly' ? 'quarter_to_date' : selectedDateRange === 'daily' ? 'today' : 'current_week'}
      />
    </div>
  );
};
