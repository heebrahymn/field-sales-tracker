import React from 'react';
import { useAuth, MarketCode } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Globe2,
  Smartphone,
  UploadCloud,
  ArrowRight,
  Layers,
  SlidersHorizontal,
  Users,
  CheckCircle2,
  ShieldAlert,
  Clock,
} from 'lucide-react';

export const HqAdminDashboardPreview: React.FC = () => {
  const { selectedMarket, switchMarket } = useAuth();

  const marketsData = [
    {
      code: 'NG' as MarketCode,
      name: 'Nigeria',
      hub: 'Lagos Regional Hub',
      tz: 'Africa/Lagos (UTC+1)',
      reps: '10 Reps',
      devices: '10 Handsets (100%)',
      verifiedToday: '34 Verified Visits',
      approvedUnverified: '3 Exceptions',
      slaRate: '98%',
      status: 'Active Field Operations',
    },
    {
      code: 'ZM' as MarketCode,
      name: 'Zambia',
      hub: 'Lusaka Regional Hub',
      tz: 'Africa/Lusaka (UTC+2)',
      reps: '6 Reps',
      devices: '6 Handsets (100%)',
      verifiedToday: '18 Verified Visits',
      approvedUnverified: '1 Exception',
      slaRate: '95%',
      status: 'Active Field Operations',
    },
    {
      code: 'MW' as MarketCode,
      name: 'Malawi',
      hub: 'Blantyre Regional Hub',
      tz: 'Africa/Blantyre (UTC+2)',
      reps: '4 Reps',
      devices: '4 Handsets (100%)',
      verifiedToday: '11 Verified Visits',
      approvedUnverified: '1 Exception',
      slaRate: '96%',
      status: 'Active Field Operations',
    },
  ];

  return (
    <div className="space-y-6 select-none">
      {/* Top Banner Notice: Cross-Market Governance */}
      <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm border border-slate-800">
        <div className="flex items-start gap-3">
          <Globe2 className="w-5 h-5 text-brand-blue-300 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-white text-sm">
              HQ Regional Administration & Tri-Market Oversight
            </p>
            <p className="text-slate-300 mt-0.5 font-medium">
              Consolidated governance for Carbon Car Care across Nigeria, Zambia, and Malawi. Multi-market totals are aggregated below with individual hub filtering.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] bg-slate-800 border border-slate-700 px-3 py-1 rounded-md text-slate-200 font-mono font-semibold">
            Active Rule Version: v1.2-canonical
          </span>
          <Button variant="outline" size="sm" className="text-xs font-semibold bg-white text-slate-900 border-slate-300 hover:bg-slate-100">
            Export Regional CSV
          </Button>
        </div>
      </div>

      {/* ================= 1. REGIONAL MULTI-MARKET TOTALS (CONSOLIDATED) ================= */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-blue" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Regional Multi-Market Aggregates (Cross-Country Totals)
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            Aggregated across 3 operational hubs
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
          {/* 1. Total Field Force */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 p-3.5 flex flex-col justify-between min-h-[142px]">
            <div className="flex items-start justify-between gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide leading-tight">
                Total Field Force
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-1.5">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 tracking-tight">20</span>
                <span className="text-xs font-semibold text-slate-500">reps</span>
              </div>
              <div className="mt-1">
                <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/70 px-1.5 py-0.5 rounded">
                  3 Country Hubs
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Across NG, ZM, MW</span>
            </div>
          </div>

          {/* 2. Verified Visits */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 p-3.5 flex flex-col justify-between min-h-[142px]">
            <div className="flex items-start justify-between gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide leading-tight">
                Verified Visits
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-1.5">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 tracking-tight">63</span>
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
              <span>GPS & photo confirmed</span>
            </div>
          </div>

          {/* 3. Unverified Activity */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 p-3.5 flex flex-col justify-between min-h-[142px]">
            <div className="flex items-start justify-between gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide leading-tight">
                Unverified Activity
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-1.5">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 tracking-tight">5</span>
                <span className="text-xs font-semibold text-slate-500">exceptions</span>
              </div>
              <div className="mt-1">
                <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 rounded">
                  Approved (No GPS)
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>Manager approved logs</span>
            </div>
          </div>

          {/* 4. Device Fleet Active */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 p-3.5 flex flex-col justify-between min-h-[142px]">
            <div className="flex items-start justify-between gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide leading-tight">
                Device Fleet Active
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-1.5">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 tracking-tight">26</span>
                <span className="text-xs font-semibold text-slate-500">/ 28</span>
              </div>
              <div className="mt-1">
                <span className="inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-1.5 py-0.5 rounded">
                  93% Enrolled
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>2 Pending allocation</span>
            </div>
          </div>

          {/* 5. Regional SLA Met */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 p-3.5 flex flex-col justify-between min-h-[142px] col-span-2 lg:col-span-1">
            <div className="flex items-start justify-between gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide leading-tight">
                Regional SLA Met
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-1.5">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 tracking-tight">96.3%</span>
              </div>
              <div className="mt-1">
                <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 rounded">
                  SLA Compliant
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>≤2-day turnaround</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 2. COUNTRY OVERVIEW CARDS (FILTERABLE) ================= */}
      <div className="space-y-2 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-brand-blue" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Country Hub Detail & Filter Selection
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-600">
            Click to switch console market scope
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
          {marketsData.map((m) => {
            const isSelected = selectedMarket === m.code;
            return (
              <Card
                key={m.code}
                className={`transition-all border-2 ${
                  isSelected
                    ? 'border-brand-blue bg-blue-50/20 shadow-md ring-2 ring-brand-blue/20'
                    : 'border-slate-200 hover:border-slate-300 shadow-xs bg-white'
                }`}
              >
                <CardHeader className="pb-3 border-b border-slate-100 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-brand-blue bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                      {m.code} • {m.hub}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 shrink-0">
                      {m.status}
                    </span>
                  </div>
                  <CardTitle className="text-lg mt-2 font-bold text-slate-900">{m.name}</CardTitle>
                  <p className="text-[11px] text-slate-600 font-mono font-semibold">{m.tz}</p>
                </CardHeader>

                <CardContent className="space-y-2.5 pt-3 p-4 sm:p-5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Sales Reps:</span>
                    <span className="font-bold text-slate-900">{m.reps}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Assigned Handsets:</span>
                    <span className="font-bold text-slate-900">{m.devices}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Location Verified Visits:</span>
                    <span className="font-bold text-emerald-800">{m.verifiedToday}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Approved Unverified:</span>
                    <span className="font-bold text-amber-900">{m.approvedUnverified}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Approval SLA Adherence:</span>
                    <span className="font-bold text-slate-900">{m.slaRate}</span>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      className={`w-full text-xs font-bold justify-between h-9 ${
                        isSelected
                          ? 'bg-brand-blue hover:bg-brand-blue-700 text-white'
                          : 'border-slate-300 text-slate-800 hover:bg-slate-50'
                      }`}
                      onClick={() => switchMarket(m.code)}
                    >
                      <span className="truncate">{isSelected ? `Active Scope: ${m.name}` : `Switch Filter to ${m.name}`}</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ================= 3. HQ GOVERNANCE & FLEET INVENTORY ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 pt-2">
        {/* Company Device Fleet Status */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 p-4 sm:p-5">
            <div>
              <CardTitle className="text-base text-slate-900">Company Handset Inventory & Device Policy</CardTitle>
              <p className="text-xs text-slate-600 font-medium">Assigned devices, OS builds, and revocation controls</p>
            </div>
            <Smartphone className="w-4 h-4 text-brand-blue shrink-0" />
          </CardHeader>
          <CardContent className="space-y-3 pt-3 p-4 sm:p-5 text-xs">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center pb-2 border-b border-slate-100">
              <div className="bg-slate-50 p-2 sm:p-2.5 rounded-lg border border-slate-200">
                <p className="text-[9px] sm:text-[10px] text-slate-600 font-bold uppercase truncate">Total Enrolled</p>
                <p className="text-base sm:text-lg font-extrabold text-slate-900">28</p>
              </div>
              <div className="bg-emerald-50 p-2 sm:p-2.5 rounded-lg border border-emerald-200">
                <p className="text-[9px] sm:text-[10px] text-emerald-800 font-bold uppercase truncate">Active In Field</p>
                <p className="text-base sm:text-lg font-extrabold text-emerald-900">26</p>
              </div>
              <div className="bg-amber-50 p-2 sm:p-2.5 rounded-lg border border-amber-200">
                <p className="text-[9px] sm:text-[10px] text-amber-800 font-bold uppercase truncate">Pending Alloc.</p>
                <p className="text-base sm:text-lg font-extrabold text-amber-900">2</p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {[
                { tag: 'CC-DEV-LAG-019', model: 'Samsung Galaxy A15', rep: 'Tunde Adebayo', market: 'Nigeria (Lagos)', status: 'Approved & Active' },
                { tag: 'CC-DEV-LUS-004', model: 'Samsung Galaxy A15', rep: 'Kondwani Banda', market: 'Zambia (Lusaka)', status: 'Approved & Active' },
                { tag: 'CC-DEV-BLA-002', model: 'Samsung Galaxy A15', rep: 'Chifundo Phiri', market: 'Malawi (Blantyre)', status: 'Approved & Active' },
              ].map((d, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-slate-500 shrink-0" />
                    <div>
                      <p className="font-bold text-xs text-slate-900 font-mono">{d.tag}</p>
                      <p className="text-[11px] text-slate-600 font-medium">{d.model} • {d.rep} ({d.market})</p>
                    </div>
                  </div>
                  <span className="self-start sm:self-center text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Client Master Import & Rule Sets (Fictional Demo Names) */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 p-4 sm:p-5">
            <div>
              <CardTitle className="text-base text-slate-900">Client Master Batch Imports & Rules</CardTitle>
              <p className="text-xs text-slate-600 font-medium">Immutable CSV import history and geofence configuration</p>
            </div>
            <UploadCloud className="w-4 h-4 text-brand-blue shrink-0" />
          </CardHeader>
          <CardContent className="space-y-3 pt-3 p-4 sm:p-5 text-xs">
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-brand-blue text-xs">Canonical Geofence Rules</span>
                <span className="text-[10px] bg-white text-slate-800 px-2 py-0.5 rounded border border-blue-200 font-mono font-bold">
                  v1.2-canonical
                </span>
              </div>
              <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                Branch geofence radius: <strong>200m</strong> • Desired visit GPS accuracy: <strong>≤100m</strong> • Proposed pin accuracy: <strong>≤50m</strong>.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Recent Master Imports (Immutable Batches):
              </h4>
              {[
                { batch: 'IMP-2026-10-NG-01', desc: 'Apex Heavy Logistics Master List', market: 'Nigeria', rows: '412 branches', status: 'Validated & Merged', date: '12 Oct 2026' },
                { batch: 'IMP-2026-09-ZM-02', desc: 'Equatorial Energy Hub Network', market: 'Zambia', rows: '148 branches', status: 'Validated & Merged', date: '28 Sep 2026' },
              ].map((imp, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div>
                    <span className="font-bold font-mono text-xs text-slate-900">{imp.batch}</span>
                    <p className="text-[11px] text-slate-700 font-medium">{imp.desc}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{imp.market} • {imp.rows} • {imp.date}</p>
                  </div>
                  <span className="self-start sm:self-center text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300 shrink-0">
                    {imp.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
