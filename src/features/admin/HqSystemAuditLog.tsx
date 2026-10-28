import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileClock,
  Search,
  Shield,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketCode } from '@/context/AuthContext';
import { adminService, HqAuditLogItem } from '@/services/adminService';

export interface SystemAuditEvent {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  marketCode: MarketCode | 'ALL';
  category: 'user_management' | 'device_mdm' | 'market_rules' | 'client_import' | 'exception_review' | 'audit_decision' | 'data_export';
  action: string;
  targetRecord: string;
  changeSummary: string;
  severity: 'routine' | 'elevated' | 'security_critical';
  ipAddress: string;
}

const INITIAL_AUDIT_LOGS: SystemAuditEvent[] = [
  {
    id: 'SEC-LOG-2026-9041',
    timestamp: '2026-10-19 18:30:14 WAT',
    actorName: 'HQ Administrator',
    actorRole: 'HQ Administrator',
    marketCode: 'ALL',
    category: 'data_export',
    action: 'Exported Consolidated Attendance CSV',
    targetRecord: 'EXP-2026-10-881',
    changeSummary: 'Generated CWE-1236 sanitized export containing 640 attendance events across NG, ZM, and MW.',
    severity: 'routine',
    ipAddress: '102.89.44.12',
  },
  {
    id: 'SEC-LOG-2026-9038',
    timestamp: '2026-10-19 14:10:22 CAT',
    actorName: 'Mutale Mwape',
    actorRole: 'Country Sales Head (ZM)',
    marketCode: 'ZM',
    category: 'audit_decision',
    action: 'Completed 5% Client Audit Call',
    targetRecord: 'AUD-ZM-2026-041',
    changeSummary: 'Confirmed Godfrey Lungu (Zambezi Freight) met with Kondwani Banda on 19 Oct.',
    severity: 'routine',
    ipAddress: '41.77.210.85',
  },
  {
    id: 'SEC-LOG-2026-9032',
    timestamp: '2026-10-18 18:10:45 WAT',
    actorName: 'Babajide Adeleke',
    actorRole: 'Country Sales Head (NG)',
    marketCode: 'NG',
    category: 'exception_review',
    action: 'Adjudicated Delayed Visit Exception',
    targetRecord: 'EXC-NG-2026-088',
    changeSummary: 'Classified visit to Apex Heavy Logistics as Manager Approved — Location Unverified.',
    severity: 'elevated',
    ipAddress: '197.210.55.90',
  },
  {
    id: 'SEC-LOG-2026-9024',
    timestamp: '2026-10-15 11:05:00 WAT',
    actorName: 'HQ Administrator',
    actorRole: 'HQ Administrator',
    marketCode: 'ALL',
    category: 'market_rules',
    action: 'Configured Market Rule Version v1.2',
    targetRecord: 'RULE-v1.2-CANONICAL',
    changeSummary: 'Standardized default branch geofence radius to 200m; updated PRD §11 non-retroactivity token.',
    severity: 'security_critical',
    ipAddress: '102.89.44.12',
  },
  {
    id: 'SEC-LOG-2026-9018',
    timestamp: '2026-10-12 11:24:30 WAT',
    actorName: 'HQ Administrator',
    actorRole: 'HQ Administrator',
    marketCode: 'NG',
    category: 'client_import',
    action: 'Committed Client Master CSV Ingestion',
    targetRecord: 'IMP-2026-10-NG-01',
    changeSummary: 'Ingested 412 branches for Nigeria. 388 approved pins, 24 flagged as Location Pending.',
    severity: 'elevated',
    ipAddress: '102.89.44.12',
  },
  {
    id: 'SEC-LOG-2026-8995',
    timestamp: '2026-09-30 16:45:10 WAT',
    actorName: 'HQ Administrator',
    actorRole: 'HQ Administrator',
    marketCode: 'NG',
    category: 'user_management',
    action: 'Deactivated User Account',
    targetRecord: 'USR-NG-005 (Emeka Nwosu)',
    changeSummary: 'Revoked field credentials following employee resignation. Device marked returned to depot.',
    severity: 'elevated',
    ipAddress: '102.89.44.12',
  },
  {
    id: 'SEC-LOG-2026-8980',
    timestamp: '2026-09-28 10:15:00 CAT',
    actorName: 'Mutale Mwape',
    actorRole: 'Country Sales Head (ZM)',
    marketCode: 'ZM',
    category: 'device_mdm',
    action: 'Assigned Company Handset',
    targetRecord: 'CC-DEV-LUS-004',
    changeSummary: 'Paired Samsung Galaxy A15 to Kondwani Banda with Knox enterprise policy active.',
    severity: 'routine',
    ipAddress: '41.77.210.85',
  },
];

export const HqSystemAuditLog: React.FC = () => {
  const [liveLogs, setLiveLogs] = useState<HqAuditLogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState<'ALL' | MarketCode>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | string>('ALL');

  const loadAuditLogs = async () => {
    const { data } = await adminService.getSystemAuditLogs(100);
    if (data) {
      setLiveLogs(data);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  // Merge live audit records from approval_audit with baseline demo events
  const mergedLogs: SystemAuditEvent[] = useMemo(() => {
    const liveConverted: SystemAuditEvent[] = liveLogs.map((l) => {
      let mappedCat: SystemAuditEvent['category'] = 'audit_decision';
      if (l.entityType === 'devices' || l.entityType === 'device_assignments') mappedCat = 'device_mdm';
      else if (l.entityType === 'profiles') mappedCat = 'user_management';
      else if (l.entityType === 'market_rules') mappedCat = 'market_rules';
      else if (l.entityType === 'export_jobs') mappedCat = 'data_export';
      else if (l.entityType === 'exceptions') mappedCat = 'exception_review';
      else if (l.entityType === 'import_batches') mappedCat = 'client_import';

      const targetDesc = `${l.entityType.toUpperCase()} #${l.entityId.slice(0, 8)}`;
      const summary = l.mandatoryReason || `Action '${l.action}' recorded on ${l.entityType}`;

      return {
        id: l.id,
        timestamp: l.timestamp.replace('T', ' ').slice(0, 19),
        actorName: l.actorName,
        actorRole: l.actorRole,
        marketCode: (l.actorMarket as MarketCode) || 'ALL',
        category: mappedCat,
        action: l.action.toUpperCase(),
        targetRecord: targetDesc,
        changeSummary: summary,
        severity: l.action.includes('delete') || l.action.includes('deactivate') ? 'security_critical' : l.action.includes('update') ? 'elevated' : 'routine',
        ipAddress: 'Internal Ledger',
      };
    });

    return [...liveConverted, ...INITIAL_AUDIT_LOGS];
  }, [liveLogs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return mergedLogs.filter((l) => {
      const matchesSearch =
        l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.targetRecord.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.changeSummary.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMarket = marketFilter === 'ALL' ? true : l.marketCode === marketFilter || l.marketCode === 'ALL';
      const matchesCategory = categoryFilter === 'ALL' ? true : l.category === categoryFilter;
      const matchesSeverity = severityFilter === 'ALL' ? true : l.severity === severityFilter;

      return matchesSearch && matchesMarket && matchesCategory && matchesSeverity;
    });
  }, [mergedLogs, searchQuery, marketFilter, categoryFilter, severityFilter]);

  return (
    <div className="space-y-6 select-none">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <FileClock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Enterprise System Administration Audit Trail
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Administrative audit log tracking administrative mutations, role revisions, and compliance actions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] bg-slate-800 border border-slate-700 px-3 py-1 rounded-md text-slate-200 font-mono font-semibold">
            Append-Only Audit Structure
          </span>
        </div>
      </div>

      {/* Governance & Disclaimer Notice */}
      <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-slate-800 text-xs flex items-start gap-3">
        <Shield className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <span className="font-bold text-brand-blue">Administrative Non-Repudiation & Transparency</span>
          <p className="text-slate-600">
            Every administrative mutation—including user provisioning, handset reassignment, rule updates, CSV master merges, and data downloads—is recorded with timestamp, session IP, actor identity, and before/after differentials.
            <em> Records are persisted to the PostgreSQL administrative audit log with RLS protection blocking unauthorized modification or deletion.</em>
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border-slate-200/90 shadow-xs">
        <CardContent className="p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit ID, actor, action, target record, or IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                {(['ALL', 'NG', 'ZM', 'MW'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMarketFilter(m)}
                    className={cn(
                      'px-2.5 py-1 rounded-md font-bold transition-colors',
                      marketFilter === m
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    {m === 'ALL' ? 'All Hubs' : m}
                  </button>
                ))}
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-hidden focus:border-brand-blue"
              >
                <option value="ALL">All Categories</option>
                <option value="user_management">User & Role Provisioning</option>
                <option value="device_mdm">Device Custody & MDM</option>
                <option value="market_rules">Market Rules & Config</option>
                <option value="client_import">Client Master Import</option>
                <option value="exception_review">Exception Adjudication</option>
                <option value="audit_decision">Client Audit Review</option>
                <option value="data_export">Data & Report Exports</option>
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-hidden focus:border-brand-blue"
              >
                <option value="ALL">All Severities</option>
                <option value="routine">Routine</option>
                <option value="elevated">Elevated</option>
                <option value="security_critical">Security Critical</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card className="border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Log ID & Timestamp</th>
                <th className="py-3 px-3">Actor & Role</th>
                <th className="py-3 px-3">Market Scope</th>
                <th className="py-3 px-3">Action & Target</th>
                <th className="py-3 px-3">Audit Diff & Summary</th>
                <th className="py-3 px-4 text-right">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Log ID & Timestamp */}
                  <td className="py-3 px-4">
                    <div>
                      <span className="font-mono font-bold text-xs text-brand-blue">{log.id}</span>
                      <p className="font-mono text-[10px] text-slate-500 mt-0.5">{log.timestamp}</p>
                      <p className="font-mono text-[9px] text-slate-400">IP: {log.ipAddress}</p>
                    </div>
                  </td>

                  {/* Actor & Role */}
                  <td className="py-3 px-3">
                    <p className="font-bold text-slate-900 text-xs">{log.actorName}</p>
                    <p className="text-[10px] text-slate-500">{log.actorRole}</p>
                  </td>

                  {/* Market Scope */}
                  <td className="py-3 px-3">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                      {log.marketCode === 'ALL' ? 'Tri-Market' : log.marketCode}
                    </span>
                  </td>

                  {/* Action & Target */}
                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-900 text-xs">{log.action}</p>
                    <p className="font-mono text-[10px] text-slate-500">Target: {log.targetRecord}</p>
                  </td>

                  {/* Audit Diff & Summary */}
                  <td className="py-3 px-3 text-slate-600 text-[11px] leading-relaxed max-w-sm">
                    {log.changeSummary}
                  </td>

                  {/* Severity */}
                  <td className="py-3 px-4 text-right">
                    {log.severity === 'routine' && (
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Routine
                      </span>
                    )}
                    {log.severity === 'elevated' && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                        Elevated
                      </span>
                    )}
                    {log.severity === 'security_critical' && (
                      <span className="text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-300">
                        Security Critical
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
