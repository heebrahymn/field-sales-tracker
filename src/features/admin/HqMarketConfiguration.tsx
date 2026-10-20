import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sliders,
  Globe2,
  Clock,
  Calendar,
  History,
  CheckCircle2,
  ShieldAlert,
  Save,
  X,
  Compass,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketCode } from '@/context/AuthContext';

export interface MarketRuleConfig {
  marketCode: MarketCode;
  countryName: string;
  ianaTimezone: string;
  workingHoursStart: string; // "08:00"
  workingHoursEnd: string; // "17:00"
  workingDays: string[];
  publicHolidays2026: { name: string; date: string }[];
  attendanceGraceMinutes: number; // e.g. 15 mins
  lateStartCutoffMinutes: number; // e.g. 30 mins
  earlyFinishThresholdMinutes: number; // e.g. 30 mins before 17:00
  defaultGeofenceRadiusMeters: number; // 200m
  maxVisitGpsAccuracyMeters: number; // 100m
  maxProposedPinGpsAccuracyMeters: number; // 50m
  minVisitDurationMinutes: number; // 5 mins
  idleGapThresholdMinutes: number; // 150 mins
  dailyVisitTarget: number; // 6 visits/day
  dailyProvisionalCutoffHour: number; // 19:00 (19)
  auditSamplingPercentage: number; // 5%
  ruleVersion: string; // "v1.2-canonical"
  effectiveDate: string; // "2026-09-01"
}

interface RuleVersionHistoryItem {
  version: string;
  effectiveDate: string;
  approvedBy: string;
  changeSummary: string;
}

const DEFAULT_MARKET_RULES: Record<MarketCode, MarketRuleConfig> = {
  NG: {
    marketCode: 'NG',
    countryName: 'Nigeria',
    ianaTimezone: 'Africa/Lagos',
    workingHoursStart: '08:00',
    workingHoursEnd: '17:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    publicHolidays2026: [
      { name: "New Year's Day", date: '2026-01-01' },
      { name: 'Workers Day', date: '2026-05-01' },
      { name: 'Democracy Day', date: '2026-06-12' },
      { name: 'Independence Day', date: '2026-10-01' },
      { name: 'Christmas Day', date: '2026-12-25' },
    ],
    attendanceGraceMinutes: 15,
    lateStartCutoffMinutes: 45,
    earlyFinishThresholdMinutes: 30,
    defaultGeofenceRadiusMeters: 200,
    maxVisitGpsAccuracyMeters: 100,
    maxProposedPinGpsAccuracyMeters: 50,
    minVisitDurationMinutes: 5,
    idleGapThresholdMinutes: 150,
    dailyVisitTarget: 6,
    dailyProvisionalCutoffHour: 19,
    auditSamplingPercentage: 5,
    ruleVersion: 'v1.2-canonical',
    effectiveDate: '2026-09-01',
  },
  ZM: {
    marketCode: 'ZM',
    countryName: 'Zambia',
    ianaTimezone: 'Africa/Lusaka',
    workingHoursStart: '08:00',
    workingHoursEnd: '17:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    publicHolidays2026: [
      { name: "New Year's Day", date: '2026-01-01' },
      { name: 'Youth Day', date: '2026-03-12' },
      { name: 'Labour Day', date: '2026-05-01' },
      { name: 'Heroes Day', date: '2026-07-06' },
      { name: 'Independence Day', date: '2026-10-24' },
      { name: 'Christmas Day', date: '2026-12-25' },
    ],
    attendanceGraceMinutes: 15,
    lateStartCutoffMinutes: 45,
    earlyFinishThresholdMinutes: 30,
    defaultGeofenceRadiusMeters: 200,
    maxVisitGpsAccuracyMeters: 100,
    maxProposedPinGpsAccuracyMeters: 50,
    minVisitDurationMinutes: 5,
    idleGapThresholdMinutes: 150,
    dailyVisitTarget: 6,
    dailyProvisionalCutoffHour: 19,
    auditSamplingPercentage: 5,
    ruleVersion: 'v1.2-canonical',
    effectiveDate: '2026-09-01',
  },
  MW: {
    marketCode: 'MW',
    countryName: 'Malawi',
    ianaTimezone: 'Africa/Blantyre',
    workingHoursStart: '08:00',
    workingHoursEnd: '17:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    publicHolidays2026: [
      { name: "New Year's Day", date: '2026-01-01' },
      { name: 'Martyrs Day', date: '2026-03-03' },
      { name: 'Labour Day', date: '2026-05-01' },
      { name: 'Independence Day', date: '2026-07-06' },
      { name: 'Mothers Day', date: '2026-10-15' },
      { name: 'Christmas Day', date: '2026-12-25' },
    ],
    attendanceGraceMinutes: 15,
    lateStartCutoffMinutes: 45,
    earlyFinishThresholdMinutes: 30,
    defaultGeofenceRadiusMeters: 200,
    maxVisitGpsAccuracyMeters: 100,
    maxProposedPinGpsAccuracyMeters: 50,
    minVisitDurationMinutes: 5,
    idleGapThresholdMinutes: 150,
    dailyVisitTarget: 6,
    dailyProvisionalCutoffHour: 19,
    auditSamplingPercentage: 5,
    ruleVersion: 'v1.2-canonical',
    effectiveDate: '2026-09-01',
  },
};

const VERSION_HISTORY: RuleVersionHistoryItem[] = [
  {
    version: 'v1.2-canonical',
    effectiveDate: '2026-09-01',
    approvedBy: 'HQ Administrator (HQ Admin)',
    changeSummary:
      'Standardised tri-market geofence to 200m radius; codified 100m visit GPS accuracy; set 150-min idle gap threshold per PRD v1.2.',
  },
  {
    version: 'v1.1-clarified',
    effectiveDate: '2026-06-15',
    approvedBy: 'HQ Administrator (HQ Admin)',
    changeSummary:
      'Added PRD §4.2 rule allowing shared company telephone numbers across sibling branches without duplicate rejection.',
  },
  {
    version: 'v1.0-initial',
    effectiveDate: '2026-01-01',
    approvedBy: 'Executive Sponsor',
    changeSummary:
      'Initial baseline field rules for Nigeria pilot hub; standard 8-hour workday and 6-visit daily target.',
  },
];

export const HqMarketConfiguration: React.FC = () => {
  const [activeMarket, setActiveMarket] = useState<MarketCode>('NG');
  const [marketConfigs, setMarketConfigs] = useState<Record<MarketCode, MarketRuleConfig>>(DEFAULT_MARKET_RULES);
  const [isEditing, setIsEditing] = useState(false);
  const [editConfig, setEditConfig] = useState<MarketRuleConfig>(marketConfigs[activeMarket]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync editConfig when switching active market
  const handleSelectMarket = (code: MarketCode) => {
    setActiveMarket(code);
    setEditConfig(marketConfigs[code]);
    setIsEditing(false);
    setSuccessMessage(null);
  };

  const currentConfig = marketConfigs[activeMarket];

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();

    // Increment version tag for demonstration
    const newVersion = `v1.2.${Date.now().toString().slice(-2)}`;
    const updated = {
      ...editConfig,
      ruleVersion: newVersion,
      effectiveDate: new Date().toISOString().split('T')[0],
    };

    setMarketConfigs({
      ...marketConfigs,
      [activeMarket]: updated,
    });

    setIsEditing(false);
    setSuccessMessage(
      `Rule set updated for ${updated.countryName} (Version: ${newVersion}). Rule changes apply prospectively from ${updated.effectiveDate}. Historical visit verifications remain immutable.`
    );
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                National Market Configuration & Operational Rule Sets
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Country-specific working hours, geofence radii, GPS accuracy thresholds, and holiday calendars
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] bg-slate-800 border border-slate-700 px-3 py-1 rounded-md text-slate-200 font-mono font-semibold">
            Canonical Version: v1.2
          </span>
        </div>
      </div>

      {/* CRITICAL PRD MANDATE ALERT: NON-RETROACTIVITY */}
      <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300/80 text-amber-950 text-xs flex items-start gap-3 shadow-xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1.5 leading-relaxed">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-950 text-sm">
              Strict Rule Immutability & Non-Retroactivity Mandate
            </span>
            <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded font-mono font-bold">
              PRD §11 Governance
            </span>
          </div>
          <p className="text-amber-900">
            Modifications to geofence radii (default <strong>200m</strong>), GPS accuracy (<strong>≤100m</strong>), visit durations, or idle-gap thresholds take effect <strong>strictly prospectively</strong> from the effective date.
            System rules <strong>MUST NEVER silently recalculate or retroactively re-classify past visit records</strong>. Prior approvals, flags, and exceptions remain permanently bonded to their historical rule version.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Market Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-1.5">
          {(['NG', 'ZM', 'MW'] as const).map((code) => {
            const config = marketConfigs[code];
            const isSelected = activeMarket === code;
            return (
              <button
                key={code}
                onClick={() => handleSelectMarket(code)}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all',
                  isSelected
                    ? 'bg-brand-blue text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Globe2 className="w-3.5 h-3.5" />
                <span>{config.countryName}</span>
                <span
                  className={cn(
                    'text-[10px] font-mono px-1.5 py-0.2 rounded',
                    isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
                  )}
                >
                  {config.ianaTimezone.split('/')[1]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button
              onClick={() => {
                setEditConfig(currentConfig);
                setIsEditing(true);
              }}
              size="sm"
              className="text-xs bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 font-semibold h-8"
            >
              Simulate Rule Update
            </Button>
          ) : (
            <Button
              onClick={() => setIsEditing(false)}
              size="sm"
              variant="ghost"
              className="text-xs text-slate-600 hover:text-slate-900 h-8"
            >
              Cancel Edit
            </Button>
          )}
        </div>
      </div>

      {/* Main Settings Display / Form */}
      <form onSubmit={handleSaveConfig} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Time, Hours & Schedules */}
          <Card className="border-slate-200/90 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 p-4 sm:p-5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Working Hours & Attendance</CardTitle>
                <p className="text-[11px] text-slate-500 font-medium">Timezone, shifts, and attendance gates</p>
              </div>
              <Clock className="w-4 h-4 text-brand-blue" />
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">IANA Timezone (Immutable)</label>
                <div className="font-mono text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 font-bold">
                  {currentConfig.ianaTimezone}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Bound to physical country operating territory</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Shift Start</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editConfig.workingHoursStart}
                      onChange={(e) => setEditConfig({ ...editConfig, workingHoursStart: e.target.value })}
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  ) : (
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono font-bold text-slate-800">
                      {currentConfig.workingHoursStart}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Shift End</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editConfig.workingHoursEnd}
                      onChange={(e) => setEditConfig({ ...editConfig, workingHoursEnd: e.target.value })}
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  ) : (
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono font-bold text-slate-800">
                      {currentConfig.workingHoursEnd}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Start Grace Period:</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editConfig.attendanceGraceMinutes}
                      onChange={(e) => setEditConfig({ ...editConfig, attendanceGraceMinutes: Number(e.target.value) })}
                      className="w-20 p-1.5 border border-slate-200 rounded text-xs font-mono text-right"
                    />
                  ) : (
                    <span className="font-bold text-slate-900 font-mono">
                      {currentConfig.attendanceGraceMinutes} mins
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Late Start Flag Cutoff:</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editConfig.lateStartCutoffMinutes}
                      onChange={(e) => setEditConfig({ ...editConfig, lateStartCutoffMinutes: Number(e.target.value) })}
                      className="w-20 p-1.5 border border-slate-200 rounded text-xs font-mono text-right"
                    />
                  ) : (
                    <span className="font-bold text-slate-900 font-mono">
                      {currentConfig.lateStartCutoffMinutes} mins
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Daily 19:00 Cutoff:</span>
                  <span className="font-bold text-slate-900 font-mono">19:00 Local</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
                  Active Operating Days
                </p>
                <div className="flex flex-wrap gap-1">
                  {currentConfig.workingDays.map((d) => (
                    <span key={d} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Column 2: Geofence, GPS & Audit Thresholds */}
          <Card className="border-slate-200/90 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 p-4 sm:p-5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Geofence & Verification Parameters</CardTitle>
                <p className="text-[11px] text-slate-500 font-medium">Spatial boundaries, accuracy, and audit sampling</p>
              </div>
              <Compass className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-950 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Branch Geofence Radius</span>
                  <span className="font-mono font-black text-emerald-800 text-sm">
                    {isEditing ? `${editConfig.defaultGeofenceRadiusMeters}m` : `${currentConfig.defaultGeofenceRadiusMeters}m`}
                  </span>
                </div>
                <p className="text-[10px] text-emerald-800 leading-relaxed">
                  Canonical default: 200m per PRD §7. Rep check-ins within this circle count toward location verification.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Visit GPS Max Uncertainty:</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editConfig.maxVisitGpsAccuracyMeters}
                      onChange={(e) => setEditConfig({ ...editConfig, maxVisitGpsAccuracyMeters: Number(e.target.value) })}
                      className="w-20 p-1.5 border border-slate-200 rounded text-xs font-mono text-right"
                    />
                  ) : (
                    <span className="font-bold text-slate-900 font-mono">
                      ≤ {currentConfig.maxVisitGpsAccuracyMeters}m
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Proposed Pin Max Uncertainty:</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editConfig.maxProposedPinGpsAccuracyMeters}
                      onChange={(e) => setEditConfig({ ...editConfig, maxProposedPinGpsAccuracyMeters: Number(e.target.value) })}
                      className="w-20 p-1.5 border border-slate-200 rounded text-xs font-mono text-right"
                    />
                  ) : (
                    <span className="font-bold text-slate-900 font-mono">
                      ≤ {currentConfig.maxProposedPinGpsAccuracyMeters}m
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Min Visit Duration:</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editConfig.minVisitDurationMinutes}
                      onChange={(e) => setEditConfig({ ...editConfig, minVisitDurationMinutes: Number(e.target.value) })}
                      className="w-20 p-1.5 border border-slate-200 rounded text-xs font-mono text-right"
                    />
                  ) : (
                    <span className="font-bold text-slate-900 font-mono">
                      {currentConfig.minVisitDurationMinutes} mins
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Idle Gap Flag Threshold:</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editConfig.idleGapThresholdMinutes}
                      onChange={(e) => setEditConfig({ ...editConfig, idleGapThresholdMinutes: Number(e.target.value) })}
                      className="w-20 p-1.5 border border-slate-200 rounded text-xs font-mono text-right"
                    />
                  ) : (
                    <span className="font-bold text-slate-900 font-mono">
                      {currentConfig.idleGapThresholdMinutes} mins
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Daily Visit Target:</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editConfig.dailyVisitTarget}
                      onChange={(e) => setEditConfig({ ...editConfig, dailyVisitTarget: Number(e.target.value) })}
                      className="w-20 p-1.5 border border-slate-200 rounded text-xs font-mono text-right"
                    />
                  ) : (
                    <span className="font-bold text-slate-900 font-mono">
                      {currentConfig.dailyVisitTarget} physical visits
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Random Client Audit Rate:</span>
                  <span className="font-bold text-brand-blue font-mono">
                    {currentConfig.auditSamplingPercentage}% (Weekly Sampling)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Column 3: National Public Holidays Calendar */}
          <Card className="border-slate-200/90 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 p-4 sm:p-5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">2026 Public Holidays</CardTitle>
                <p className="text-[11px] text-slate-500 font-medium">Non-working statutory days for {currentConfig.countryName}</p>
              </div>
              <Calendar className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3 text-xs">
              <p className="text-[11px] text-slate-600">
                Attendance days falling on statutory holidays do not generate absent penalty flags.
              </p>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {currentConfig.publicHolidays2026.map((h, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{h.name}</p>
                      <span className="text-[10px] text-slate-500 font-mono">{h.date}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      Recognised Holiday
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Button if Editing */}
        {isEditing && (
          <div className="p-4 bg-white rounded-xl border border-blue-200 shadow-sm flex items-center justify-between">
            <div className="text-xs text-slate-700">
              <strong>Simulating Configuration Changes:</strong> Clicking save will generate a new immutable version record for <strong>{currentConfig.countryName}</strong>.
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Commit Rule Version
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* Version History Table */}
      <Card className="border-slate-200/90 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 p-4 sm:p-5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-brand-blue" />
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Rule Version History & Governance Log
              </CardTitle>
              <p className="text-[11px] text-slate-500 font-medium">
                Immutable record of operational threshold revisions across all regional markets
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Version</th>
                  <th className="py-2.5 px-3">Effective Date</th>
                  <th className="py-2.5 px-3">Approved By</th>
                  <th className="py-2.5 px-4">Change Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {VERSION_HISTORY.map((vh, i) => (
                  <tr key={i} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-brand-blue text-xs">
                      {vh.version}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">{vh.effectiveDate}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{vh.approvedBy}</td>
                    <td className="py-3 px-4 text-slate-600 leading-relaxed text-[11px]">
                      {vh.changeSummary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
