import React, { createContext, useContext, useState } from 'react';
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
      approvedBy: 'Ayodele Ibraheem (HQ Admin)',
      changeSummary: 'Canonical MVP baseline: 200m geofence, 100m GPS visit accuracy, 50m pin proposing limit, 150m idle flag threshold.',
    },
    {
      version: 'v1.1-clarified',
      effectiveDate: '2026-08-15',
      approvedBy: 'Ayodele Ibraheem (HQ Admin)',
      changeSummary: 'Clarified shared corporate phone number exemption per PRD §4.2.',
    },
    {
      version: 'v1.0-initial',
      effectiveDate: '2026-07-01',
      approvedBy: 'Ayodele Ibraheem (HQ Admin)',
      changeSummary: 'Initial deployment parameter baseline across Lagos transit corridor.',
    },
  ],
  ZM: [
    {
      version: 'v1.2-canonical',
      effectiveDate: '2026-09-01',
      approvedBy: 'Ayodele Ibraheem (HQ Admin)',
      changeSummary: 'Aligned Lusaka and Copperbelt route thresholds with regional PRD baseline.',
    },
    {
      version: 'v1.0-initial',
      effectiveDate: '2026-07-01',
      approvedBy: 'Ayodele Ibraheem (HQ Admin)',
      changeSummary: 'Initial deployment parameter baseline.',
    },
  ],
  MW: [
    {
      version: 'v1.2-canonical',
      effectiveDate: '2026-09-01',
      approvedBy: 'Ayodele Ibraheem (HQ Admin)',
      changeSummary: 'Blantyre and Lilongwe commercial cluster parameter baseline.',
    },
    {
      version: 'v1.0-initial',
      effectiveDate: '2026-07-01',
      approvedBy: 'Ayodele Ibraheem (HQ Admin)',
      changeSummary: 'Initial deployment parameter baseline.',
    },
  ],
};

interface MarketConfigContextType {
  marketRules: Record<MarketCode, MarketRuleConfig>;
  ruleHistory: Record<MarketCode, RuleVersionHistoryItem[]>;
  updateMarketRules: (
    marketCode: MarketCode,
    updates: Partial<MarketRuleConfig>,
    reason: string,
    approvedBy?: string
  ) => { success: boolean; newVersion: string };
  getActiveMarketRules: (marketCode: MarketCode) => MarketRuleConfig;
}

const MarketConfigContext = createContext<MarketConfigContextType | undefined>(undefined);

export const MarketConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [marketRules, setMarketRules] = useState<Record<MarketCode, MarketRuleConfig>>(INITIAL_MARKET_RULES);
  const [ruleHistory, setRuleHistory] = useState<Record<MarketCode, RuleVersionHistoryItem[]>>(INITIAL_RULE_HISTORY);

  const updateMarketRules = (
    marketCode: MarketCode,
    updates: Partial<MarketRuleConfig>,
    reason: string,
    approvedBy = 'Ayodele Ibraheem (HQ Admin)'
  ): { success: boolean; newVersion: string } => {
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
    throw new Error('useMarketConfig must be used within a MarketConfigProvider');
  }
  return context;
};
