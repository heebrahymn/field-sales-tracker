import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  X,
  AlertOctagon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketCode } from '@/context/AuthContext';

export interface HqExceptionRecord {
  id: string;
  exceptionType: 'gps_failure' | 'device_failure' | 'camera_defect' | 'delayed_submission_recovery';
  salespersonId: string;
  salespersonName: string;
  marketCode: MarketCode;
  marketName: string;
  organisationName: string;
  branchName: string;
  claimedVisitTime: string;
  actualSubmissionTime: string; // phone restored / recovered
  status:
    | 'pending_manager_review'
    | 'manager_approved_unverified'
    | 'rejected'
    | 'disputed_client_review'
    | 'escalated_to_hq';
  overdueReviewHours?: number; // >24h
  salespersonRationale: string;
  evidenceProvided: string;
  salesHeadDecision?: {
    reviewedBy: string;
    reviewTimestamp: string;
    outcome: string;
    notes: string;
  };
  hqAdministrativeNote?: string;
}

const INITIAL_HQ_EXCEPTIONS: HqExceptionRecord[] = [
  // Nigeria Exceptions
  {
    id: 'EXC-NG-2026-088',
    exceptionType: 'delayed_submission_recovery',
    salespersonId: 'USR-NG-002',
    salespersonName: 'Chukwudi Okafor',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos)',
    organisationName: 'Apex Heavy Logistics Ltd',
    branchName: 'Apapa Port Terminal Hub',
    claimedVisitTime: '2026-10-18 11:30 WAT',
    actualSubmissionTime: '2026-10-18 16:45 WAT (5h 15m delay after battery recovery)',
    status: 'manager_approved_unverified',
    salespersonRationale:
      'Device battery died while conducting warehouse yard inspection at Apapa depot. Recharged upon return to base at 16:30 and immediately submitted meeting log with paper delivery ticket photo.',
    evidenceProvided: 'Scanned paper gate-pass signed by Capt. Danjuma & photo of physical premises board.',
    salesHeadDecision: {
      reviewedBy: 'Babajide Adeleke (Country Sales Head)',
      reviewTimestamp: '2026-10-18 18:10 WAT',
      outcome: 'Manager Approved — Location Unverified',
      notes: 'Reviewed gate ticket with warehouse supervisor. Visit verified as genuine, but remains Location Unverified per PRD rules.',
    },
  },
  {
    id: 'EXC-NG-2026-091',
    exceptionType: 'gps_failure',
    salespersonId: 'USR-NG-003',
    salespersonName: 'Amina Bello',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos)',
    organisationName: 'Lekki Transit Commercial Fleets',
    branchName: 'Admiralty Way Express Hub',
    claimedVisitTime: '2026-10-19 14:15 WAT',
    actualSubmissionTime: '2026-10-19 14:25 WAT',
    status: 'pending_manager_review',
    overdueReviewHours: 26, // OVERDUE REVIEW
    salespersonRationale:
      'Heavy underground workshop roofing caused GPS accuracy to degrade to 180m (>100m threshold). Attempted 3 retries, then submitted exception log.',
    evidenceProvided: 'Timestamped photo of client workshop banner and business card of Fleet Lead.',
  },
  {
    id: 'EXC-NG-2026-094',
    exceptionType: 'device_failure',
    salespersonId: 'USR-NG-004',
    salespersonName: 'Oluwaseun Fashola',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos)',
    organisationName: 'Bua Haulage & Cement Logistics',
    branchName: 'Epe Transit Weighbridge',
    claimedVisitTime: '2026-10-17 10:00 WAT',
    actualSubmissionTime: '2026-10-17 17:15 WAT',
    status: 'escalated_to_hq',
    salespersonRationale:
      'Handset OS screen freeze prevented check-out click. Salesperson rebooted device 4 times before UI unjammed.',
    evidenceProvided: 'Weighbridge slip serial #WB-9921 stamped by site cashier.',
    salesHeadDecision: {
      reviewedBy: 'Babajide Adeleke (Country Sales Head)',
      reviewTimestamp: '2026-10-18 09:30 WAT',
      outcome: 'Escalated to HQ',
      notes: 'Repeat hardware freeze on Nokia G22. Escalated to HQ for MDM replacement authorization.',
    },
  },

  // Zambia Exceptions
  {
    id: 'EXC-ZM-2026-034',
    exceptionType: 'gps_failure',
    salespersonId: 'USR-ZM-002',
    salespersonName: 'Kondwani Banda',
    marketCode: 'ZM',
    marketName: 'Zambia (Lusaka)',
    organisationName: 'Zambezi Freight & Mining Transit',
    branchName: 'Kafue Road Operations Yard',
    claimedVisitTime: '2026-10-19 09:45 CAT',
    actualSubmissionTime: '2026-10-19 10:05 CAT',
    status: 'manager_approved_unverified',
    salespersonRationale:
      'Cellular tower outage in Kafue industrial park resulted in poor triangulation (accuracy 145m).',
    evidenceProvided: 'Live photo of yard gate and signed reception logbook.',
    salesHeadDecision: {
      reviewedBy: 'Mutale Mwape (Country Sales Head)',
      reviewTimestamp: '2026-10-19 11:20 CAT',
      outcome: 'Manager Approved — Location Unverified',
      notes: 'Confirmed Kafue tower downtime with telecom provider. Approved as location unverified.',
    },
  },

  // Malawi Exceptions
  {
    id: 'EXC-MW-2026-018',
    exceptionType: 'camera_defect',
    salespersonId: 'USR-MW-002',
    salespersonName: 'Chifundo Phiri',
    marketCode: 'MW',
    marketName: 'Malawi (Blantyre)',
    organisationName: 'Nyasa Express Couriers',
    branchName: 'Ginnery Corner Distribution Hub',
    claimedVisitTime: '2026-10-18 15:20 CAT',
    actualSubmissionTime: '2026-10-18 15:30 CAT',
    status: 'disputed_client_review',
    salespersonRationale:
      'Camera black screen glitch during premises capture. GPS coordinates were within 25m of geofence center.',
    evidenceProvided: 'GPS geofence match (25m), but blank camera image submitted.',
    salesHeadDecision: {
      reviewedBy: 'Blessings Gondwe (Country Sales Head)',
      reviewTimestamp: '2026-10-19 09:00 CAT',
      outcome: 'Disputed — Client Review Needed',
      notes: 'Customer dispatch desk receptionist denied rep meeting when contacted. Flagged for secondary audit.',
    },
  },
];

export const HqExceptionOversight: React.FC = () => {
  const [exceptions, setExceptions] = useState<HqExceptionRecord[]>(INITIAL_HQ_EXCEPTIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState<'ALL' | MarketCode>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | string>('ALL');

  // Review Modal State
  const [selectedException, setSelectedException] = useState<HqExceptionRecord | null>(null);
  const [adminActionNotes, setAdminActionNotes] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Filtered Exceptions
  const filteredExceptions = useMemo(() => {
    return exceptions.filter((exc) => {
      const matchesSearch =
        exc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exc.salespersonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exc.organisationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exc.branchName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMarket = marketFilter === 'ALL' ? true : exc.marketCode === marketFilter;
      const matchesStatus = statusFilter === 'ALL' ? true : exc.status === statusFilter;

      return matchesSearch && matchesMarket && matchesStatus;
    });
  }, [exceptions, searchQuery, marketFilter, statusFilter]);

  // Handle HQ Escalation Action
  const handleHqAction = (actionType: 'uphold' | 'request_reinvestigation' | 'add_administrative_note') => {
    if (!selectedException) return;

    const actionText =
      actionType === 'uphold'
        ? 'HQ Audited & Upheld Sales Head Decision'
        : actionType === 'request_reinvestigation'
        ? 'HQ Requested Country Re-investigation'
        : 'HQ Administrative Note Added';

    const note = `${actionText} by Ayodele Ibraheem (HQ Admin) on ${new Date().toISOString().slice(0, 16)}: ${adminActionNotes || 'Governance review completed.'}`;

    setExceptions((prev) =>
      prev.map((e) => {
        if (e.id === selectedException.id) {
          return {
            ...e,
            status: actionType === 'request_reinvestigation' ? 'pending_manager_review' : e.status,
            hqAdministrativeNote: note,
          };
        }
        return e;
      })
    );

    setActionFeedback(note);
    setTimeout(() => {
      setSelectedException(null);
      setAdminActionNotes('');
      setActionFeedback(null);
    }, 1200);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600/30 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Exception & Escalation Oversight Console
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Multi-market adjudication of GPS failures, device failures, and delayed submissions across Nigeria, Zambia, and Malawi
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] bg-slate-800 border border-slate-700 px-3 py-1 rounded-md text-slate-200 font-mono font-semibold">
            {exceptions.filter((e) => e.overdueReviewHours && e.overdueReviewHours > 24).length} Overdue Reviews (&gt;24h)
          </span>
        </div>
      </div>

      {/* STRICT PRD AUTHORITY BOUNDARY (NON-NEGOTIABLE) */}
      <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300/80 text-amber-950 text-xs flex items-start gap-3 shadow-xs">
        <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1.5 leading-relaxed">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-950 text-sm">
              Strict Author Separation & No-Fabrication Guarantee
            </span>
            <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded font-mono font-bold">
              PRD §2 & §7 Rule
            </span>
          </div>
          <p className="text-amber-900">
            <strong>The salesperson is the sole author of all visit and exception submissions.</strong> HQ Administrators and Country Sales Heads have review and escalation authority, but <strong>CANNOT</strong> create, backdate, or fabricate salesperson visit evidence or exception records.
            Approved GPS-failed visits permanently retain the status <strong>Manager Approved — Location Unverified</strong>.
          </p>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Total Logged</p>
          <p className="text-2xl font-black text-slate-900 mt-0.5">{exceptions.length}</p>
          <span className="text-[10px] text-slate-400 font-medium">Tri-Market Scope</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] font-bold text-blue-700 uppercase">Manager Approved</p>
          <p className="text-2xl font-black text-blue-900 mt-0.5">
            {exceptions.filter((e) => e.status === 'manager_approved_unverified').length}
          </p>
          <span className="text-[10px] font-semibold text-blue-700">Location Unverified</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] font-bold text-amber-700 uppercase">Pending Review</p>
          <p className="text-2xl font-black text-amber-900 mt-0.5">
            {exceptions.filter((e) => e.status === 'pending_manager_review').length}
          </p>
          <span className="text-[10px] font-semibold text-amber-700">Awaiting Sales Head</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] font-bold text-purple-700 uppercase">HQ Escalated</p>
          <p className="text-2xl font-black text-purple-900 mt-0.5">
            {exceptions.filter((e) => e.status === 'escalated_to_hq').length}
          </p>
          <span className="text-[10px] font-semibold text-purple-700">Hardware / Policy</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] font-bold text-rose-700 uppercase">Disputed / Denied</p>
          <p className="text-2xl font-black text-rose-900 mt-0.5">
            {exceptions.filter((e) => e.status === 'disputed_client_review').length}
          </p>
          <span className="text-[10px] font-semibold text-rose-700">Secondary Audit</span>
        </div>
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
                placeholder="Search exception ID, rep name, client, or location..."
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-hidden focus:border-brand-blue"
              >
                <option value="ALL">All Statuses</option>
                <option value="pending_manager_review">Pending Sales Head Review</option>
                <option value="manager_approved_unverified">Manager Approved (Unverified)</option>
                <option value="escalated_to_hq">Escalated to HQ</option>
                <option value="disputed_client_review">Disputed — Client Review</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exceptions Table */}
      <Card className="border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Exception ID & Type</th>
                <th className="py-3 px-3">Salesperson</th>
                <th className="py-3 px-3">Market Hub</th>
                <th className="py-3 px-3">Client & Location</th>
                <th className="py-3 px-3">Claim vs Recovery Time</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExceptions.map((exc) => (
                <tr key={exc.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* ID & Type */}
                  <td className="py-3 px-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-brand-blue">{exc.id}</span>
                        {exc.overdueReviewHours && exc.overdueReviewHours > 24 && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                            Overdue ({exc.overdueReviewHours}h)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-slate-700 capitalize">
                        {exc.exceptionType.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </td>

                  {/* Salesperson */}
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-800 text-xs">
                      {exc.salespersonName}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{exc.salespersonId}</span>
                  </td>

                  {/* Market Hub */}
                  <td className="py-3 px-3 font-semibold text-slate-800 text-[11px]">
                    {exc.marketName}
                  </td>

                  {/* Client & Branch */}
                  <td className="py-3 px-3">
                    <p className="font-bold text-slate-900 text-xs">{exc.organisationName}</p>
                    <p className="text-[11px] text-slate-500">{exc.branchName}</p>
                  </td>

                  {/* Claim vs Recovery Time */}
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                    <div>Claimed: {exc.claimedVisitTime}</div>
                    <div className="text-[10px] text-slate-400">Actual: {exc.actualSubmissionTime}</div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3">
                    {exc.status === 'manager_approved_unverified' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" />
                        Approved — Location Unverified
                      </span>
                    )}
                    {exc.status === 'pending_manager_review' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
                        <Clock className="w-2.5 h-2.5 text-amber-600" />
                        Pending Review
                      </span>
                    )}
                    {exc.status === 'escalated_to_hq' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                        <ShieldAlert className="w-2.5 h-2.5 text-purple-600" />
                        Escalated to HQ
                      </span>
                    )}
                    {exc.status === 'disputed_client_review' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                        Disputed — Client Denied
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      onClick={() => setSelectedException(exc)}
                      className="h-7 px-2 text-[11px] bg-slate-900 hover:bg-black text-white font-semibold"
                    >
                      Inspect & Adjudicate
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* INSPECT & ADJUDICATE MODAL */}
      {selectedException && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    HQ Exception Forensic Inspection
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500">
                    {selectedException.id} • {selectedException.marketName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedException(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionFeedback && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                {actionFeedback}
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              {/* Salesperson Sole-Author Block */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      Author Salesperson
                    </span>
                    <p className="font-bold text-slate-900 text-sm">{selectedException.salespersonName}</p>
                    <p className="text-slate-500 text-[11px]">{selectedException.salespersonId}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      Target Client
                    </span>
                    <p className="font-bold text-slate-900 text-xs">{selectedException.organisationName}</p>
                    <p className="text-slate-500 text-[11px]">{selectedException.branchName}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">Claimed Meeting:</span>
                    <p className="font-mono font-bold text-slate-800">{selectedException.claimedVisitTime}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Submission Timestamp:</span>
                    <p className="font-mono font-bold text-slate-800">{selectedException.actualSubmissionTime}</p>
                  </div>
                </div>
              </div>

              {/* Rationale & Evidence */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">Salesperson Narrative Rationale</label>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed text-[11px]">
                  "{selectedException.salespersonRationale}"
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">Physical Evidence Attached</label>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-[11px] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-blue shrink-0" />
                  <span>{selectedException.evidenceProvided}</span>
                </div>
              </div>

              {/* Sales Head Prior Review */}
              {selectedException.salesHeadDecision && (
                <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 space-y-1 text-[11px]">
                  <div className="flex justify-between font-bold text-brand-blue">
                    <span>Prior Review: {selectedException.salesHeadDecision.reviewedBy}</span>
                    <span className="font-mono">{selectedException.salesHeadDecision.reviewTimestamp}</span>
                  </div>
                  <p className="text-slate-700">{selectedException.salesHeadDecision.notes}</p>
                </div>
              )}

              {/* HQ Administrative Note / Action */}
              <div className="space-y-1.5 pt-1">
                <label className="block font-bold text-slate-700">
                  HQ Governance Action Notes (Administrative Audit Trail)
                </label>
                <textarea
                  rows={2}
                  placeholder="Record administrative findings or instructions for Country Sales Head..."
                  value={adminActionNotes}
                  onChange={(e) => setAdminActionNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedException(null)}
                  className="text-xs"
                >
                  Close
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleHqAction('request_reinvestigation')}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  Request Field Re-investigation
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleHqAction('uphold')}
                  className="text-xs bg-brand-blue hover:bg-blue-700 text-white font-semibold"
                >
                  Uphold & Conclude Review
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
