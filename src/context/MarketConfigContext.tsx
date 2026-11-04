import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MarketCode } from '@/context/AuthContext';
import { adminService } from '@/services/adminService';
import { supabase } from '@/lib/supabase';

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

export interface RuleVersionHistoryItem {
  version: string;
  effectiveDate: string;
  approvedBy: string;
  changeSummary: string;
}

export const INITIAL_MARKET_RULES: Record<MarketCode, MarketRuleConfig> = {
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
      { name: 'John Chilembwe Day', date: '2026-01-15' },
      { name: 'Martyrs Day', date: '2026-03-03' },
      { name: 'Labour Day', date: '2026-05-01' },
      { name: 'Independence Day', date: '2026-07-06' },
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

export const INITIAL_RULE_HISTORY: Record<MarketCode, RuleVersionHistoryItem[]> = {
  NG: [
    {
      version: 'v1.2-canonical',
      effectiveDate: '2026-09-01',
      approvedBy: 'HQ Administrator (HQ Admin)',
      changeSummary: 'Canonical MVP baseline: 200m geofence, 100m GPS visit accuracy, 50m pin proposing limit, 150m idle flag threshold.',
    },
    {
      version: 'v1.1-clarified',
      effectiveDate: '2026-08-15',
      approvedBy: 'HQ Administrator (HQ Admin)',
      changeSummary: 'Clarified shared corporate phone number exemption per company policy.',
    },
    {
      version: 'v1.0-initial',
      effectiveDate: '2026-07-01',
      approvedBy: 'HQ Administrator (HQ Admin)',
      changeSummary: 'Initial deployment parameter baseline across Lagos transit corridor.',
    },
  ],
  ZM: [
    {
      version: 'v1.2-canonical',
      effectiveDate: '2026-09-01',
      approvedBy: 'HQ Administrator (HQ Admin)',
      changeSummary: 'Aligned Lusaka and Copperbelt route thresholds with regional operational baseline.',
    },
    {
      version: 'v1.0-initial',
      effectiveDate: '2026-07-01',
      approvedBy: 'HQ Administrator (HQ Admin)',
      changeSummary: 'Initial deployment parameter baseline.',
    },
  ],
  MW: [
    {
      version: 'v1.2-canonical',
      effectiveDate: '2026-09-01',
      approvedBy: 'HQ Administrator (HQ Admin)',
      changeSummary: 'Blantyre and Lilongwe commercial cluster parameter baseline.',
    },
    {
      version: 'v1.0-initial',
      effectiveDate: '2026-07-01',
      approvedBy: 'HQ Administrator (HQ Admin)',
      changeSummary: 'Initial deployment parameter baseline.',
    },
  ],
};

interface MarketConfigContextType {
  marketRules: Record<MarketCode, MarketRuleConfig>;
  ruleHistory: Record<MarketCode, RuleVersionHistoryItem[]>;
  refreshMarketRules: () => Promise<void>;
  updateMarketRules: (
    marketCode: MarketCode,
    updates: Partial<MarketRuleConfig>,
    reason: string,
    approvedBy?: string
  ) => Promise<{ success: boolean; newVersion: string }>;
  getActiveMarketRules: (marketCode: MarketCode) => MarketRuleConfig;
}

export const MarketConfigContext = createContext<MarketConfigContextType | undefined>(undefined);

export const MarketConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [marketRules, setMarketRules] = useState<Record<MarketCode, MarketRuleConfig>>(INITIAL_MARKET_RULES);
  const [ruleHistory, setRuleHistory] = useState<Record<MarketCode, RuleVersionHistoryItem[]>>(INITIAL_RULE_HISTORY);

  const refreshMarketRules = useCallback(async () => {
    try {
      const { data, error } = await adminService.getMarketRules();
      if (!error && data && data.length > 0) {
        setMarketRules((prev) => {
          const updated = { ...prev };
          for (const rule of data) {
            if (rule.isActive && (rule.marketCode === 'NG' || rule.marketCode === 'ZM' || rule.marketCode === 'MW')) {
              const code = rule.marketCode as MarketCode;
              updated[code] = {
                ...updated[code],
                defaultGeofenceRadiusMeters: Number(rule.geofenceRadiusM),
                maxVisitGpsAccuracyMeters: Number(rule.maxVisitGpsAccuracyM),
                maxProposedPinGpsAccuracyMeters: Number(rule.maxPinGpsAccuracyM),
                minVisitDurationMinutes: Math.round(rule.minVisitDurationSeconds / 60),
                idleGapThresholdMinutes: rule.maxIdleGapMinutes,
                dailyVisitTarget: rule.dailyVisitTarget,
                workingHoursStart: rule.workingHoursStart?.slice(0, 5) || updated[code].workingHoursStart,
                workingHoursEnd: rule.workingHoursEnd?.slice(0, 5) || updated[code].workingHoursEnd,
                attendanceGraceMinutes: rule.shiftGraceMinutes,
                ruleVersion: rule.versionTag,
                effectiveDate: rule.effectiveFrom?.slice(0, 10) || updated[code].effectiveDate,
              };
            }
          }
          return updated;
        });

        setRuleHistory((prev) => {
          const updatedHistory: Record<MarketCode, RuleVersionHistoryItem[]> = { ...prev };
          const byMarket: Record<string, typeof data> = { NG: [], ZM: [], MW: [] };
          for (const r of data) {
            if (byMarket[r.marketCode]) {
              byMarket[r.marketCode].push(r);
            }
          }
          for (const code of ['NG', 'ZM', 'MW'] as MarketCode[]) {
            if (byMarket[code].length > 0) {
              updatedHistory[code] = byMarket[code].map((r) => ({
                version: r.versionTag,
                effectiveDate: r.effectiveFrom?.slice(0, 10) || '2026-09-01',
                approvedBy: 'HQ Administrator (HQ Admin)',
                changeSummary: `Operational threshold version: ${r.geofenceRadiusM}m geofence, ${r.maxVisitGpsAccuracyM}m GPS limit, ${r.dailyVisitTarget} daily visit target.`,
              }));
            }
          }
          return updatedHistory;
        });
      }
    } catch (err) {
      console.warn('[MarketConfigContext] Could not load market rules from Supabase:', err);
    }
  }, []);

  useEffect(() => {
    refreshMarketRules();

    const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
    let channel: any = null;

    // Subscribe to realtime database changes on public.market_rules table in browser runtime
    if (!isTestEnv && typeof supabase?.channel === 'function') {
      try {
        channel = supabase
          .channel('public:market_rules_realtime')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'market_rules',
            },
            () => {
              refreshMarketRules();
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('[MarketConfigContext] Could not subscribe to realtime channel:', err);
      }
    }

    const handleFocus = () => {
      refreshMarketRules();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
    }

    return () => {
      if (channel && typeof supabase?.removeChannel === 'function') {
        supabase.removeChannel(channel);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
      }
    };
  }, [refreshMarketRules]);

  const updateMarketRules = async (
    marketCode: MarketCode,
    updates: Partial<MarketRuleConfig>,
    reason: string,
    approvedBy = 'HQ Administrator (HQ Admin)'
  ): Promise<{ success: boolean; newVersion: string }> => {
    const current = marketRules[marketCode];
    const newVersionTag = `v1.2.${String(ruleHistory[marketCode].length + 1).padStart(2, '0')}`;
    const today = new Date().toISOString().slice(0, 10);

    const updatedConfig: MarketRuleConfig = {
      ...current,
      ...updates,
      ruleVersion: newVersionTag,
      effectiveDate: today,
    };

    setMarketRules((prev) => ({
      ...prev,
      [marketCode]: updatedConfig,
    }));

    const newHistoryEntry: RuleVersionHistoryItem = {
      version: newVersionTag,
      effectiveDate: today,
      approvedBy,
      changeSummary: reason.trim() || 'Threshold parameters adjusted by HQ Admin.',
    };

    setRuleHistory((prev) => ({
      ...prev,
      [marketCode]: [newHistoryEntry, ...prev[marketCode]],
    }));

    // Commit to Supabase public.market_rules
    try {
      await adminService.commitMarketRuleVersion({
        marketCode,
        geofenceRadiusM: updates.defaultGeofenceRadiusMeters ?? current.defaultGeofenceRadiusMeters,
        maxVisitGpsAccuracyM: updates.maxVisitGpsAccuracyMeters ?? current.maxVisitGpsAccuracyMeters,
        maxPinGpsAccuracyM: updates.maxProposedPinGpsAccuracyMeters ?? current.maxProposedPinGpsAccuracyMeters,
        minVisitDurationSeconds: (updates.minVisitDurationMinutes ?? current.minVisitDurationMinutes) * 60,
        maxIdleGapMinutes: updates.idleGapThresholdMinutes ?? current.idleGapThresholdMinutes,
        dailyVisitTarget: updates.dailyVisitTarget ?? current.dailyVisitTarget,
        shiftGraceMinutes: updates.attendanceGraceMinutes ?? current.attendanceGraceMinutes,
        workingHoursStart: updates.workingHoursStart ?? current.workingHoursStart,
        workingHoursEnd: updates.workingHoursEnd ?? current.workingHoursEnd,
        reason,
        approvedBy,
      });
      await refreshMarketRules();
    } catch (err) {
      console.warn('[MarketConfigContext] Supabase rule commit skipped or failed:', err);
    }

    return { success: true, newVersion: newVersionTag };
  };

  const getActiveMarketRules = (marketCode: MarketCode): MarketRuleConfig => {
    return marketRules[marketCode] || marketRules.NG;
  };

  return (
    <MarketConfigContext.Provider
      value={{
        marketRules,
        ruleHistory,
        refreshMarketRules,
        updateMarketRules,
        getActiveMarketRules,
      }}
    >
      {children}
    </MarketConfigContext.Provider>
  );
};

export const useMarketConfig = (): MarketConfigContextType => {
  const context = useContext(MarketConfigContext);
  if (!context) {
    return {
      marketRules: INITIAL_MARKET_RULES,
      ruleHistory: INITIAL_RULE_HISTORY,
      refreshMarketRules: async () => {},
      updateMarketRules: async () => ({ success: true, newVersion: 'v1.2.05' }),
      getActiveMarketRules: (code: MarketCode) => INITIAL_MARKET_RULES[code] || INITIAL_MARKET_RULES.NG,
    };
  }
  return context;
};
