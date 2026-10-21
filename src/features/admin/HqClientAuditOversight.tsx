import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PhoneCall,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PhoneOff,
  ShieldCheck,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketCode } from '@/context/AuthContext';
import { useAudit } from '@/context/AuditContext';

export interface HqAuditCallRecord {
  id: string;
  samplingType: 'random_5_percent' | 'risk_targeted';
  marketCode: MarketCode;
  marketName: string;
  organisationName: string;
  branchName: string;
  clientContactPerson: string;
  clientContactPhone: string;
  clientContactRole: string;
  salespersonName: string;
  visitDate: string;
  callStatus: 'pending_call' | 'confirmed_meeting' | 'disputed_client_denial' | 'unreachable_rescheduled';
  callAttemptCount: number;
  lastCallTimestamp?: string;
  auditorName?: string;
  auditorNotes?: string;
  gpsStatus: 'location_verified' | 'manager_approved_unverified';
}

export const HqClientAuditOversight: React.FC = () => {
  const { audits: sharedAudits } = useAudit();

  const audits: HqAuditCallRecord[] = useMemo(() => {
    return sharedAudits.map((a) => ({
      id: a.id,
      samplingType: a.sampleType,
      marketCode: a.marketCode,
      marketName: a.marketName,
      organisationName: a.organisationName,
      branchName: a.branchName,
      clientContactPerson: a.clientContactPerson,
      clientContactPhone: a.clientContactPhone,
      clientContactRole: a.clientContactRole,
      salespersonName: a.salespersonName,
      visitDate: a.visitDate,
      callStatus: a.callStatus,
      callAttemptCount: a.callAttemptCount,
      lastCallTimestamp: a.lastCallTimestamp,
      auditorName: a.auditorName,
      auditorNotes: a.callNotes,
      gpsStatus: a.gpsStatus,
    }));
  }, [sharedAudits]);

  const [searchQuery, setSearchQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState<'ALL' | MarketCode>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | string>('ALL');
  const [samplingFilter, setSamplingFilter] = useState<'ALL' | string>('ALL');

  // Inspection Drawer
  const [selectedAudit, setSelectedAudit] = useState<HqAuditCallRecord | null>(null);

  // Filtered Audits
  const filteredAudits = useMemo(() => {
    return audits.filter((a) => {
      const matchesSearch =
        a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.organisationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.salespersonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.clientContactPerson.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMarket = marketFilter === 'ALL' ? true : a.marketCode === marketFilter;
      const matchesStatus = statusFilter === 'ALL' ? true : a.callStatus === statusFilter;
      const matchesSampling = samplingFilter === 'ALL' ? true : a.samplingType === samplingFilter;

      return matchesSearch && matchesMarket && matchesStatus && matchesSampling;
    });
  }, [audits, searchQuery, marketFilter, statusFilter, samplingFilter]);

  return (
    <div className="space-y-6 select-none">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Client Audit Oversight & Verification Sampling
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Governance tracking for weekly 5% random sampling and risk-targeted telephone audits across all hubs
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] bg-slate-800 border border-slate-700 px-3 py-1 rounded-md text-slate-200 font-mono font-semibold">
            PRD §8.3 / AT-10 Sampling
          </span>
        </div>
      </div>

      {/* PRD MANDATORY AUDIT DISPUTE POLICY NOTICE */}
      <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-slate-800 text-xs flex items-start gap-3 shadow-xs">
        <ShieldCheck className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <span className="font-bold text-brand-blue text-sm">
            Separation of GPS Verification from Client Confirmation
          </span>
          <p className="text-slate-700">
            A properly evidenced GPS visit counts as <strong>Location Verified</strong> independent of audit telephone calls.
            When a client denies a meeting, the record transitions to <strong>Disputed — Pending Review</strong> for factual investigation.
            <strong> Client denial does NOT automatically trigger disciplinary findings or fraud conclusions.</strong>
          </p>
        </div>
      </div>

      {/* Country Performance Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            code: 'NG' as MarketCode,
            name: 'Nigeria Hub (Lagos)',
            head: 'Babajide Adeleke',
            totalCalls: 3,
            completed: 2,
            rate: '67%',
            confirmed: 1,
            disputed: 0,
            unreachable: 1,
          },
          {
            code: 'ZM' as MarketCode,
            name: 'Zambia Hub (Lusaka)',
            head: 'Mutale Mwape',
            totalCalls: 1,
            completed: 1,
            rate: '100%',
            confirmed: 1,
            disputed: 0,
            unreachable: 0,
          },
          {
            code: 'MW' as MarketCode,
            name: 'Malawi Hub (Blantyre)',
            head: 'Blessings Gondwe',
            totalCalls: 1,
            completed: 1,
            rate: '100%',
            confirmed: 0,
            disputed: 1,
            unreachable: 0,
          },
        ].map((score) => (
          <Card key={score.code} className="border-slate-200/90 shadow-xs">
            <CardHeader className="pb-2 border-b border-slate-100 p-3.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">{score.name}</span>
                <span className="text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.2 rounded text-slate-700">
                  {score.rate} Completed
                </span>
              </div>
              <p className="text-[10px] text-slate-500">Auditor: {score.head}</p>
            </CardHeader>
            <CardContent className="p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Confirmed Meetings:</span>
                <span className="font-bold text-emerald-700">{score.confirmed}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Disputed (Denied):</span>
                <span className="font-bold text-rose-700">{score.disputed}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Unreachable / Rescheduled:</span>
                <span className="font-bold text-amber-700">{score.unreachable}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter and Search */}
      <Card className="border-slate-200/90 shadow-xs">
        <CardContent className="p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit ID, client, rep, or contact person..."
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
                value={samplingFilter}
                onChange={(e) => setSamplingFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-hidden focus:border-brand-blue"
              >
                <option value="ALL">All Sampling</option>
                <option value="random_5_percent">Random 5% Audit</option>
                <option value="risk_targeted">Risk-Targeted</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-hidden focus:border-brand-blue"
              >
                <option value="ALL">All Call Statuses</option>
                <option value="confirmed_meeting">Confirmed Meeting</option>
                <option value="pending_call">Pending Call</option>
                <option value="unreachable_rescheduled">Unreachable (Rescheduled)</option>
                <option value="disputed_client_denial">Disputed (Client Denied)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audits Table */}
      <Card className="border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Audit ID & Sampling</th>
                <th className="py-3 px-3">Market</th>
                <th className="py-3 px-3">Organisation & Branch</th>
                <th className="py-3 px-3">Contact Met</th>
                <th className="py-3 px-3">Rep & Visit Date</th>
                <th className="py-3 px-3">Call Outcome</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAudits.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* ID & Sampling */}
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-mono font-bold text-xs text-brand-blue">{a.id}</p>
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-1.5 py-0.2 rounded inline-block mt-0.5',
                          a.samplingType === 'random_5_percent'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        )}
                      >
                        {a.samplingType === 'random_5_percent' ? '5% Random Sample' : 'Risk-Targeted'}
                      </span>
                    </div>
                  </td>

                  {/* Market */}
                  <td className="py-3 px-3 font-semibold text-slate-800 text-[11px]">
                    {a.marketName}
                  </td>

                  {/* Organisation & Branch */}
                  <td className="py-3 px-3">
                    <p className="font-bold text-slate-900 text-xs">{a.organisationName}</p>
                    <p className="text-[11px] text-slate-500">{a.branchName}</p>
                  </td>

                  {/* Contact Met */}
                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-800 text-xs">{a.clientContactPerson}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{a.clientContactPhone}</p>
                  </td>

                  {/* Rep & Visit Date */}
                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-800 text-xs">{a.salespersonName}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{a.visitDate}</p>
                  </td>

                  {/* Call Outcome */}
                  <td className="py-3 px-3">
                    {a.callStatus === 'confirmed_meeting' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                        Confirmed Meeting
                      </span>
                    )}
                    {a.callStatus === 'pending_call' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                        <Clock className="w-2.5 h-2.5 text-slate-500" />
                        Pending Call
                      </span>
                    )}
                    {a.callStatus === 'unreachable_rescheduled' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
                        <PhoneOff className="w-2.5 h-2.5 text-amber-600" />
                        Unreachable ({a.callAttemptCount}x)
                      </span>
                    )}
                    {a.callStatus === 'disputed_client_denial' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                        Disputed (Denied)
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      onClick={() => setSelectedAudit(a)}
                      className="h-7 px-2 text-[11px] bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 font-semibold"
                    >
                      Audit Record
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* AUDIT DETAILS DRAWER */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-brand-blue" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Client Verification Call Record</h3>
                  <p className="text-[11px] font-mono text-slate-500">{selectedAudit.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAudit(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Client:</span>
                  <span className="font-bold text-slate-900">{selectedAudit.organisationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Branch Location:</span>
                  <span className="font-medium text-slate-800">{selectedAudit.branchName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Contact Person Called:</span>
                  <span className="font-medium text-slate-800">
                    {selectedAudit.clientContactPerson} ({selectedAudit.clientContactRole})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone Dialled:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedAudit.clientContactPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Salesperson:</span>
                  <span className="font-bold text-slate-900">{selectedAudit.salespersonName}</span>
                </div>
              </div>

              {selectedAudit.auditorNotes && (
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Auditor Notes</label>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed text-[11px]">
                    "{selectedAudit.auditorNotes}"
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Audited by: {selectedAudit.auditorName} • {selectedAudit.lastCallTimestamp}
                  </p>
                </div>
              )}

              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-slate-700 text-[11px] leading-relaxed">
                <strong>PRD Verification Standard:</strong> Client audit calls evaluate human meeting confirmation. Physical presence evidence remains indexed separately under GPS records.
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAudit(null)}
                className="text-xs"
              >
                Close Audit View
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
