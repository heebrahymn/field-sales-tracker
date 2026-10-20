import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ApprovalDecisionModal, ApprovalItem } from '@/features/review/ApprovalDecisionModal';
import {
  MapPin,
  Building2,
  Phone,
  Camera,
  CheckCircle2,
  Clock,
  Info,
  Search,
  Check,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface BranchPinRecord extends ApprovalItem {
  companyName: string;
  category: string;
  address: string;
  landmark: string;
  contactName: string;
  contactRole: string;
  contactPhone: string;
  sharedPhone?: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  managerDecision?: {
    action: 'approved' | 'rejected' | 'escalated';
    reason: string;
    decidedBy: string;
    decidedAt: string;
  };
}

export const BranchApprovalsQueue: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [branchesList, setBranchesList] = useState<BranchPinRecord[]>([
    {
      id: 'pin-01',
      type: 'pin_approval',
      title: 'Apex Heavy Logistics Fleet Depot',
      subtitle: 'Apapa Commercial Port Zone • Branch #BR-LAG-014',
      companyName: 'Apex Heavy Logistics Ltd',
      category: 'Haulage Fleet Depot',
      address: 'Apapa Commercial Port Corridor, Gate 4, Lagos',
      landmark: 'Opposite Berth 12 Container Yard',
      repName: 'Tunde Adebayo (CC-REP-042)',
      claimedTime: 'Today 09:15 WAT',
      accuracy: '±22m (Passes ≤50m threshold)',
      evidenceNote: 'Premises entrance gate and workshop signage clearly visible in photo. GPS pin confirmed at central vehicle intake gate.',
      sharedPhoneWarning: true,
      sharedPhone: '+234 1 270 5000',
      contactName: 'Engr. Babatunde Jinadu',
      contactRole: 'Fleet Maintenance Director',
      contactPhone: '+234 803 555 1204',
      status: 'pending_approval',
    },
    {
      id: 'pin-02',
      type: 'pin_approval',
      title: 'Apex Commercial Transit Hub (Ikeja)',
      subtitle: 'Mobolaji Bank Anthony Way • Branch #BR-LAG-108',
      companyName: 'Apex Heavy Logistics Ltd',
      category: 'Transit Maintenance Depot',
      address: 'Mobolaji Bank Anthony Way, Ikeja, Lagos',
      landmark: 'Adjacent to Air Force Base Roundabout',
      repName: 'Tunde Adebayo (CC-REP-042)',
      claimedTime: 'Today 10:45 WAT',
      accuracy: '±18m (Passes ≤50m threshold)',
      evidenceNote: 'Workshop entrance and fleet maintenance staging area verified. Pinned outdoors in loading courtyard.',
      sharedPhoneWarning: true,
      sharedPhone: '+234 1 270 5000',
      contactName: 'Alhaji Musa Danjuma',
      contactRole: 'Depot Operations Manager',
      contactPhone: '+234 802 111 8899',
      status: 'pending_approval',
    },
    {
      id: 'pin-03',
      type: 'pin_approval',
      title: 'Equatorial Energy Fleet Terminal',
      subtitle: 'Dockyard Road, Apapa • Branch #BR-LAG-002',
      companyName: 'Equatorial Energy Hubs',
      category: 'Bulk Fuel Fleet Terminal',
      address: 'Dockyard Road, Apapa Marine Terminal, Lagos',
      landmark: 'Next to Tank Farm Cluster B',
      repName: 'Chinyere Nwosu (CC-REP-038)',
      claimedTime: 'Yesterday 14:20 WAT',
      accuracy: '±14m (Passes ≤50m threshold)',
      evidenceNote: 'Heavy fuel tanker dispatch bay. Pin placed at main tanker weighbridge.',
      sharedPhoneWarning: false,
      contactName: 'Mrs. Chinyere Nwosu',
      contactRole: 'Head of Transport & Safety',
      contactPhone: '+234 818 444 9901',
      status: 'approved',
      managerDecision: {
        action: 'approved',
        reason: 'Pin coordinates validated against port authority registry. Premises signage clearly verified.',
        decidedBy: 'Ayodele Ibraheem (Country Head)',
        decidedAt: 'Yesterday 15:10 WAT',
      },
    },
    {
      id: 'pin-04',
      type: 'pin_approval',
      title: 'Zenith Logistics & Transit Hub',
      subtitle: 'Oshodi-Isolo Expressway • Branch #BR-LAG-009',
      companyName: 'Zenith Fleet Services Ltd',
      category: 'Commercial Distribution Hub',
      address: 'Oshodi-Isolo Expressway, Industrial Area, Lagos',
      landmark: 'Near Toyota Bus Stop Industrial Park',
      repName: 'Segun Oladipo (CC-REP-019)',
      claimedTime: '15 Oct 2026',
      accuracy: '±16m (Passes ≤50m threshold)',
      evidenceNote: 'Central parts depot and truck service center. Pin placed at security gatehouse.',
      sharedPhoneWarning: false,
      contactName: 'Mr. Segun Oladipo',
      contactRole: 'Workshop Superintendent',
      contactPhone: '+234 805 777 3322',
      status: 'approved',
      managerDecision: {
        action: 'approved',
        reason: 'Valid industrial park entrance. Stamped premises photo confirmed.',
        decidedBy: 'Ayodele Ibraheem (Country Head)',
        decidedAt: '15 Oct 2026 16:30 WAT',
      },
    },
  ]);

  const handleOpenDecision = (item: ApprovalItem) => {
    setSelectedItem(item);
    setIsDecisionModalOpen(true);
  };

  const handleDecisionRecorded = (
    itemId: string,
    decision: 'approved' | 'rejected' | 'escalated',
    reason: string
  ) => {
    setBranchesList((prev) =>
      prev.map((branch) => {
        if (branch.id === itemId) {
          return {
            ...branch,
            status: decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : branch.status,
            managerDecision: {
              action: decision,
              reason,
              decidedBy: 'Ayodele Ibraheem (Country Head)',
              decidedAt: 'Just now',
            },
          };
        }
        return branch;
      })
    );

    setToastMessage(`Decision logged for ${itemId}: ${decision.toUpperCase()}. Recorded to immutable audit log.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const filteredBranches = branchesList.filter((b) => {
    if (filterStatus === 'pending' && b.status !== 'pending_approval') return false;
    if (filterStatus === 'approved' && b.status !== 'approved') return false;
    if (filterStatus === 'rejected' && b.status !== 'rejected') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.title.toLowerCase().includes(q) ||
        b.companyName.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        b.repName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = branchesList.filter((b) => b.status === 'pending_approval').length;
  const approvedCount = branchesList.filter((b) => b.status === 'approved').length;

  return (
    <div className="space-y-5 select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl text-xs flex items-center justify-between shadow-lg border border-slate-700 animate-in fade-in duration-200">
          <span className="font-semibold text-emerald-300">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Header & Policy Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-brand-blue uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
              PRD §4.2 & §7.1 Pin Governance
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              Branch Registration & GPS Pin Approvals
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Review field-proposed physical branch pins against reported GPS uncertainty (Threshold: ≤50m) and premises photographs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300">
              {pendingCount} Awaiting Review
            </span>
            <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-300">
              {approvedCount} Approved
            </span>
          </div>
        </div>

        {/* PRD §4.2 Shared Telephone Clarification Alert */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-700">
          <Info className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong className="text-slate-900 font-semibold">Shared Telephone Approved Rule:</strong> Different branches of the same company (e.g. <em>Apex Heavy Logistics Ltd</em>) are explicitly allowed to share a central company telephone number (+234 1 270 5000). System alerts you to verify, but <strong>never</strong> auto-rejects a valid branch merely for a shared switchboard phone.
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({branchesList.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'pending' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Review ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'approved' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approved ({approvedCount})
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search branch, company, address..."
            className="pl-8 h-9 text-xs bg-white border-slate-300"
          />
        </div>
      </div>

      {/* Queue Cards */}
      <div className="space-y-4">
        {filteredBranches.map((item) => (
          <Card key={item.id} className="border-slate-200/90 shadow-xs hover:border-slate-300 transition-all overflow-hidden">
            <CardContent className="p-5 sm:p-6 pt-5 sm:pt-6 space-y-4">
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      {item.companyName}
                    </span>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                      {item.category}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">{item.title}</h3>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{item.address}</span>
                    {item.landmark && <span className="text-slate-400">• Landmark: {item.landmark}</span>}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    {item.claimedTime}
                  </span>
                  {item.status === 'pending_approval' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pending Pin Sign-off
                    </span>
                  )}
                  {item.status === 'approved' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-700" /> Pin Approved
                    </span>
                  )}
                  {item.status === 'rejected' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-900 border border-red-300">
                      Rejected
                    </span>
                  )}
                </div>
              </div>

              {/* Shared Phone Policy Box (PRD §4.2) */}
              {item.sharedPhoneWarning && (
                <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-amber-950 font-medium">
                    <Phone className="w-3.5 h-3.5 text-amber-700" />
                    <span>
                      Shared Switchboard Phone: <strong className="font-mono">{item.sharedPhone}</strong> (Used across sibling branches)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                    PRD §4.2 Compliant
                  </span>
                </div>
              )}

              {/* Site Evidence Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {/* 1. Proposed GPS Fix */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" /> Proposed GPS Coordinates
                  </span>
                  <p className="font-mono font-bold text-slate-900 text-[11px]">6.5892° N, 3.3581° E</p>
                  <p className="text-[11px] font-semibold text-emerald-800">
                    Fix Accuracy: {item.accuracy}
                  </p>
                  <span className="text-[10px] text-slate-500">Threshold: ≤ 50m required</span>
                </div>

                {/* 2. Primary Site Contact */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Site Contact Person
                  </span>
                  <p className="font-bold text-slate-900">{item.contactName}</p>
                  <p className="text-[11px] text-slate-600">{item.contactRole}</p>
                  <p className="text-[11px] font-mono font-semibold text-brand-blue">{item.contactPhone}</p>
                </div>

                {/* 3. Live Premises Photograph */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-brand-blue" /> Live Premises Photograph
                  </span>
                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="w-12 h-12 rounded-lg bg-slate-800 text-white flex flex-col items-center justify-center font-bold text-[8px] shrink-0">
                      <span>PREMISES</span>
                      <span className="text-[7px] text-emerald-400 font-mono">STAMPED</span>
                    </div>
                    <div className="text-[10px] text-slate-600 leading-tight">
                      <p className="font-semibold text-slate-900">Signage Verified</p>
                      <p className="text-[9px] text-slate-500 font-mono">Watermark: {item.claimedTime}</p>
                      <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Validated
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submitting Rep Narrative */}
              <div className="text-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-700">
                  Field Rep Submission Note ({item.repName}):
                </span>
                <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] leading-relaxed">
                  &ldquo;{item.evidenceNote}&rdquo;
                </p>
              </div>

              {/* Manager Decision History if already reviewed */}
              {item.managerDecision && (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Manager Audit Decision ({item.managerDecision.decidedBy})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{item.managerDecision.decidedAt}</span>
                  </div>
                  <p className="text-slate-800 text-[11px]">
                    <strong>Audit Rationale:</strong> &ldquo;{item.managerDecision.reason}&rdquo;
                  </p>
                </div>
              )}

              {/* Actions */}
              {item.status === 'pending_approval' && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDecision(item)}
                    className="text-xs h-9 px-3.5 font-semibold border-slate-300 bg-white"
                  >
                    Inspect Pin Evidence
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleOpenDecision(item)}
                    className="text-xs h-9 px-4 font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                  >
                    Review & Approve Pin
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Decision Modal */}
      <ApprovalDecisionModal
        item={selectedItem}
        isOpen={isDecisionModalOpen}
        onClose={() => setIsDecisionModalOpen(false)}
        onDecision={handleDecisionRecorded}
      />
    </div>
  );
};
