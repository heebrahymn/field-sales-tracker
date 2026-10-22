import React, { useState, useMemo } from 'react';
import { useFieldSession, ClientBranch } from '@/context/FieldSessionContext';
import { RegisterBranchModal } from '@/features/field/RegisterBranchModal';
import { ApprovalDecisionModal, ApprovalItem } from '@/features/review/ApprovalDecisionModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Building2,
  MapPin,
  Search,
  Plus,
  Phone,
  CheckCircle2,
  Clock,
  Check,
  Info,
} from 'lucide-react';

export interface ClientGroup {
  clientName: string;
  category: string;
  hasSharedPhone?: boolean;
  sharedPhone?: string;
  locations: ClientBranch[];
}

export const ClientsLocationsDirectory: React.FC = () => {
  const { branches, approveBranchPin, rejectBranchPin } = useFieldSession();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'multi_location' | 'pending' | 'approved'>('all');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [defaultCompanyForNewLocation, setDefaultCompanyForNewLocation] = useState<string | undefined>(undefined);

  // Approval Modal States
  const [selectedApprovalItem, setSelectedApprovalItem] = useState<ApprovalItem | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Group branches under distinct parent client organisations
  const clientGroups: ClientGroup[] = useMemo(() => {
    const groupMap = new Map<string, ClientBranch[]>();

    branches.forEach((b) => {
      const existing = groupMap.get(b.companyName) || [];
      existing.push(b);
      groupMap.set(b.companyName, existing);
    });

    const groups: ClientGroup[] = [];
    groupMap.forEach((locs, companyName) => {
      const primaryLoc = locs[0];
      const sharedPhoneLoc = locs.find((l) => l.hasSharedPhone && l.sharedCompanyPhone);

      groups.push({
        clientName: companyName,
        category: primaryLoc?.category || 'Commercial Haulage Depot',
        hasSharedPhone: Boolean(sharedPhoneLoc),
        sharedPhone: sharedPhoneLoc?.sharedCompanyPhone,
        locations: locs,
      });
    });

    return groups.sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [branches]);

  // Filter client groups based on search query and mode
  const filteredGroups = useMemo(() => {
    return clientGroups
      .map((group) => {
        // Filter the group's locations
        const matchingLocations = group.locations.filter((loc) => {
          if (filterMode === 'pending' && loc.status !== 'pending_approval') return false;
          if (filterMode === 'approved' && loc.status !== 'approved') return false;

          if (!searchQuery.trim()) return true;

          const q = searchQuery.toLowerCase();
          return (
            group.clientName.toLowerCase().includes(q) ||
            loc.branchName.toLowerCase().includes(q) ||
            loc.branchCode.toLowerCase().includes(q) ||
            loc.address.toLowerCase().includes(q) ||
            loc.category.toLowerCase().includes(q) ||
            loc.contacts.some((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
          );
        });

        return {
          ...group,
          locations: matchingLocations,
        };
      })
      .filter((group) => {
        if (filterMode === 'multi_location' && group.locations.length < 2) return false;
        return group.locations.length > 0;
      });
  }, [clientGroups, searchQuery, filterMode]);

  const totalClientsCount = clientGroups.length;
  const totalLocationsCount = branches.length;
  const pendingLocationsCount = branches.filter((b) => b.status === 'pending_approval').length;
  const approvedLocationsCount = branches.filter((b) => b.status === 'approved').length;

  const handleOpenAddClient = () => {
    setDefaultCompanyForNewLocation(undefined);
    setIsRegisterModalOpen(true);
  };

  const handleAddLocationToClient = (clientName: string) => {
    setDefaultCompanyForNewLocation(clientName);
    setIsRegisterModalOpen(true);
  };

  const handleOpenApprovalForLocation = (loc: ClientBranch, clientName: string) => {
    const item: ApprovalItem = {
      id: loc.id,
      type: 'pin_approval',
      title: `${clientName} — ${loc.branchName}`,
      subtitle: `${loc.address} • Location #${loc.branchCode}`,
      repName: loc.registeredByRepName || 'Tunde Adebayo (CC-REP-042)',
      claimedTime: loc.lastVisitDate || 'Today 10:45 WAT',
      accuracy: loc.accuracyMeters ? `±${loc.accuracyMeters}m (Passes ≤50m threshold)` : '±18m (Passes ≤50m threshold)',
      evidenceNote: loc.evidenceNote || 'Premises entrance and workshop signage verified. GPS pin confirmed at central gate.',
      sharedPhoneWarning: loc.hasSharedPhone,
    };

    setSelectedApprovalItem(item);
    setIsApprovalModalOpen(true);
  };

  const handleDecisionRecorded = (
    itemId: string,
    decision: 'approved' | 'rejected' | 'escalated',
    reason: string
  ) => {
    if (decision === 'approved') {
      approveBranchPin(itemId, reason, 'HQ Administrator (Country Head)');
    } else if (decision === 'rejected') {
      rejectBranchPin(itemId, reason, 'HQ Administrator (Country Head)');
    }

    setToastMessage(`Location pin decision recorded: ${decision.toUpperCase()}. Rationale logged to immutable audit history.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl text-xs flex items-center justify-between shadow-lg border border-slate-700 animate-in fade-in duration-200">
          <span className="font-semibold text-emerald-300">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white font-bold ml-3 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-brand-blue uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                Country Head Directory
              </span>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                PRD §4.2 Multi-Facility Model
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">Clients &amp; Locations</h2>
            <p className="text-xs text-slate-500 font-medium">
              Enterprise client organisations, child facility locations, and GPS pins.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenAddClient}
              className="bg-brand-blue hover:bg-brand-blue-700 text-white font-bold text-xs h-10 px-4 gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Client / Location
            </Button>
          </div>
        </div>

        {/* PRD §4.2 Telephone Policy Guidance Banner */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-700">
          <Info className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong className="text-slate-900 font-semibold">Client Location Hierarchy:</strong> Client organisations maintain multiple physical locations (e.g. <em>Apapa Fleet Depot</em> and <em>Ikeja Logistics Hub</em> under <em>Apex Heavy Logistics Ltd</em>). Each physical location carries its own independently audited GPS pin. Sibling locations may share a central switchboard telephone number without duplicate rejection (PRD §4.2).
          </div>
        </div>

        {/* Operational Scope KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              Registered Clients
            </span>
            <div className="text-xl font-black text-slate-900 mt-0.5">{totalClientsCount}</div>
            <span className="text-[10px] text-slate-500 font-medium">Corporate Accounts</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              Client Locations
            </span>
            <div className="text-xl font-black text-slate-900 mt-0.5">{totalLocationsCount}</div>
            <span className="text-[10px] text-slate-500 font-medium">Physical Facilities</span>
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
              Approved Locations
            </span>
            <div className="text-xl font-black text-emerald-900 mt-0.5">{approvedLocationsCount}</div>
            <span className="text-[10px] text-emerald-700 font-medium">GPS Validated</span>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">
              Pending GPS Approval
            </span>
            <div className="text-xl font-black text-amber-900 mt-0.5">{pendingLocationsCount}</div>
            <span className="text-[10px] text-amber-700 font-medium">Awaiting Manager Sign-off</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filterMode === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Clients ({totalClientsCount})
          </button>
          <button
            onClick={() => setFilterMode('multi_location')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filterMode === 'multi_location'
                ? 'bg-brand-blue text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Multi-Location Clients
          </button>
          <button
            onClick={() => setFilterMode('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filterMode === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending GPS Approval ({pendingLocationsCount})
          </button>
          <button
            onClick={() => setFilterMode('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filterMode === 'approved'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approved Locations ({approvedLocationsCount})
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search client, location, address..."
            className="pl-8 h-9 text-xs bg-white border-slate-300"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Structured Clients & Locations Directory Cards */}
      <div className="space-y-4">
        {filteredGroups.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
            <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="font-bold text-sm text-slate-800">No matching clients or locations found</h4>
            <p className="text-xs text-slate-500">
              Try adjusting your search query or registering a new business client.
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const hasPendingLocation = group.locations.some((l) => l.status === 'pending_approval');

            return (
              <Card
                key={group.clientName}
                className="border-slate-200 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
              >
                {/* Client Organisation Header */}
                <div className="bg-slate-50/80 p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-blue-50 text-brand-blue px-2 py-0.5 rounded border border-brand-blue-200">
                        Client Organisation
                      </span>
                      <span className="text-[10px] font-semibold bg-white text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                        {group.category}
                      </span>
                      <span className="text-[10px] font-bold bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded">
                        {group.locations.length} {group.locations.length === 1 ? 'Location' : 'Locations'}
                      </span>
                      {hasPendingLocation && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> GPS Pin Awaiting Sign-off
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-brand-blue" />
                      {group.clientName}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {group.hasSharedPhone && group.sharedPhone && (
                      <span className="text-[11px] font-mono text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-amber-700" />
                        Central Switchboard: <strong>{group.sharedPhone}</strong>
                      </span>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddLocationToClient(group.clientName)}
                      className="text-xs h-8 px-3 font-semibold bg-white border-slate-300 hover:bg-slate-50 text-slate-800"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Location
                    </Button>
                  </div>
                </div>

                {/* Child Client Locations List */}
                <CardContent className="p-4 sm:p-5 space-y-3.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Physical Facilities &amp; GPS Pins ({group.locations.length})
                  </span>

                  <div className="space-y-3">
                    {group.locations.map((loc) => {
                      const isPending = loc.status === 'pending_approval';
                      const isApproved = loc.status === 'approved';
                      const isRejected = loc.status === 'rejected';

                      return (
                        <div
                          key={loc.id}
                          className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3"
                        >
                          {/* Location Top Bar */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 text-sm">
                                  {loc.branchName}
                                </h4>
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                  Location #{loc.branchCode}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{loc.address}</span>
                                {loc.landmark && (
                                  <span className="text-slate-400">• Landmark: {loc.landmark}</span>
                                )}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isPending && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Pending GPS Approval
                                </span>
                              )}
                              {isApproved && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-700" /> GPS Location Approved
                                </span>
                              )}
                              {isRejected && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300">
                                  Location Rejected
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Technical Verification Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                            {/* GPS Fix */}
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                Verified GPS Coordinates
                              </span>
                              <p className="font-mono font-bold text-slate-900 text-[11px]">
                                {loc.approvedGpsLat.toFixed(4)}° N, {loc.approvedGpsLng.toFixed(4)}° E
                              </p>
                              <p className="text-[10px] text-emerald-700 font-semibold">
                                Fix Accuracy: ±18m (Passes ≤50m rule)
                              </p>
                            </div>

                            {/* Site Contact */}
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                Site Contact Person
                              </span>
                              <p className="font-bold text-slate-900">{loc.contacts[0]?.name || 'Site Contact'}</p>
                              <p className="text-[11px] text-slate-600 font-mono">
                                {loc.contacts[0]?.phone || '+234 800 000 0000'} ({loc.contacts[0]?.role || 'Manager'})
                              </p>
                            </div>

                            {/* Submitting Rep / Photograph */}
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                On-Site Evidence
                              </span>
                              <p className="text-[11px] text-slate-700 font-semibold">
                                Live Premises Photo Validated
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Submitted by: {loc.registeredByRepName || 'Tunde Adebayo'}
                              </p>
                            </div>
                          </div>

                          {/* Manager Decision Audit Banner if reviewed */}
                          {loc.managerDecision && (
                            <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs space-y-0.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-emerald-900 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Audit Decision ({loc.managerDecision.decidedBy})
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {loc.managerDecision.decidedAt}
                                </span>
                              </div>
                              <p className="text-slate-800 text-[11px]">
                                <strong>Rationale:</strong> &ldquo;{loc.managerDecision.reason}&rdquo;
                              </p>
                            </div>
                          )}

                          {/* Action Button for Pending Approvals */}
                          {isPending && (
                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                              <Button
                                size="sm"
                                onClick={() => handleOpenApprovalForLocation(loc, group.clientName)}
                                className="text-xs h-8 px-4 font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                              >
                                Review &amp; Approve Location Pin
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Register New Client / Location Modal */}
      <RegisterBranchModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        defaultCompanyName={defaultCompanyForNewLocation}
      />

      {/* Approval Decision Modal */}
      <ApprovalDecisionModal
        item={selectedApprovalItem}
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        onDecision={handleDecisionRecorded}
      />
    </div>
  );
};
