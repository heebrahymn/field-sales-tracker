import React, { useState } from 'react';
import { useFieldSession, ClientBranch } from '@/context/FieldSessionContext';
import { RegisterBranchModal } from '@/features/field/RegisterBranchModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Building2,
  MapPin,
  Search,
  Plus,
  Phone,
  User,
  CheckCircle2,
  Clock,
  Navigation,
  Lock,
} from 'lucide-react';

interface ClientsDirectoryViewProps {
  onStartVisitAtBranch?: (branch: ClientBranch) => void;
}

export const ClientsDirectoryView: React.FC<ClientsDirectoryViewProps> = ({ onStartVisitAtBranch }) => {
  const { branches, activeVisit } = useFieldSession();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'nearby' | 'depots' | 'pending'>('all');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Filtered branch directory
  const filteredBranches = branches.filter((b) => {
    const matchesSearch =
      b.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.branchCode.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterMode === 'nearby') return b.distanceMeters <= 500;
    if (filterMode === 'depots') return b.category.toLowerCase().includes('depot') || b.category.toLowerCase().includes('terminal');
    if (filterMode === 'pending') return b.status === 'pending_approval';

    return true;
  });

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto select-none">
      {/* Top Header Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">
            Approved Client Directory
          </span>
          <h2 className="text-lg font-bold text-slate-900 leading-tight">
            Clients & Branches
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {branches.length} verified physical sites in Lagos Market
          </p>
        </div>

        <Button
          onClick={() => setIsRegisterModalOpen(true)}
          className="bg-brand-blue hover:bg-brand-blue-700 text-white font-bold text-xs h-10 px-3.5 gap-1.5 shadow-sm min-h-[44px]"
        >
          <Plus className="w-4 h-4" /> Add Branch
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company, branch code, or address..."
            className="pl-9 pr-4 h-11 text-xs bg-white border-slate-300 rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shrink-0 ${
              filterMode === 'all'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All ({branches.length})
          </button>
          <button
            onClick={() => setFilterMode('nearby')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shrink-0 flex items-center gap-1 ${
              filterMode === 'nearby'
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Navigation className="w-3 h-3" /> Nearby (&lt;500m)
          </button>
          <button
            onClick={() => setFilterMode('depots')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shrink-0 ${
              filterMode === 'depots'
                ? 'bg-brand-blue text-white border-brand-blue'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Haulage & Depots
          </button>
          <button
            onClick={() => setFilterMode('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shrink-0 ${
              filterMode === 'pending'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Pending Pin ({branches.filter((b) => b.status === 'pending_approval').length})
          </button>
        </div>
      </div>

      {/* Branch Cards List */}
      <div className="space-y-3">
        {filteredBranches.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 space-y-2">
            <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="font-bold text-sm text-slate-800">No matching branches found</h4>
            <p className="text-xs text-slate-500">
              Try adjusting your search terms or register this new site.
            </p>
          </div>
        ) : (
          filteredBranches.map((branch) => {
            const isCurrentlyActive = activeVisit?.branchId === branch.id;
            const isInsideGeofence = branch.distanceMeters <= 200;

            return (
              <div
                key={branch.id}
                className={`bg-white rounded-xl p-4 border transition-all space-y-3 shadow-xs ${
                  isCurrentlyActive
                    ? 'border-brand-blue ring-2 ring-blue-500/20 bg-blue-50/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Branch Header & Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      {branch.companyName}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base leading-snug">
                      {branch.branchName}
                    </h3>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        isInsideGeofence
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <MapPin className="w-3 h-3" />
                      {branch.distanceMeters}m
                    </span>

                    {branch.status === 'pending_approval' && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> Pin Review
                      </span>
                    )}

                    {branch.status === 'approved' && (
                      <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Approved Pin
                      </span>
                    )}
                  </div>
                </div>

                {/* Location & Landmark */}
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="flex items-center gap-1.5 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{branch.address}</span>
                  </p>
                  {branch.landmark && (
                    <p className="text-[11px] text-slate-500 pl-5">
                      Landmark: {branch.landmark}
                    </p>
                  )}
                </div>

                {/* Shared Phone Support Note (PRD §4.2) */}
                {branch.hasSharedPhone && branch.sharedCompanyPhone && (
                  <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Phone className="w-3 h-3 text-amber-700" />
                      Shared Co. Phone: <strong className="font-mono">{branch.sharedCompanyPhone}</strong>
                    </span>
                    <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                      PRD §4.2 Approved
                    </span>
                  </div>
                )}

                {/* Site Contact Person */}
                {branch.contacts.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{branch.contacts[0].name}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 text-[11px]">{branch.contacts[0].role}</span>
                    </div>

                    <a
                      href={`tel:${branch.contacts[0].phone}`}
                      className="text-brand-blue font-mono font-bold text-[11px] flex items-center gap-1 hover:underline"
                    >
                      <Phone className="w-3 h-3" /> Call
                    </a>
                  </div>
                )}

                {/* Action Buttons: Context-Aware Visit Start */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  {isCurrentlyActive ? (
                    <div className="w-full bg-blue-100 text-brand-blue font-bold text-xs p-2.5 rounded-lg text-center flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#E8CF2F] animate-pulse" />
                      Visit in progress here • {activeBranchTimer(activeVisit.checkInTime)}
                    </div>
                  ) : activeVisit ? (
                    <div className="w-full bg-slate-100 text-slate-500 font-bold text-xs p-2.5 rounded-lg text-center flex items-center justify-center gap-1.5 cursor-not-allowed">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      Visit Blocked: Close active visit at {activeVisit.branchName.slice(0, 18)}... first (AT-04)
                    </div>
                  ) : (
                    <Button
                      onClick={() => onStartVisitAtBranch?.(branch)}
                      className="w-full font-bold text-xs h-11 bg-brand-blue hover:bg-brand-blue-700 text-white min-h-[48px]"
                    >
                      Check In at this Branch
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Register Branch Modal */}
      <RegisterBranchModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />
    </div>
  );
};

function activeBranchTimer(checkinTime: string) {
  return `Checked in ${checkinTime}`;
}
