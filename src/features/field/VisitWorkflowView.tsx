import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFieldSession, ClientBranch } from '@/context/FieldSessionContext';
import { useMarketConfig } from '@/context/MarketConfigContext';
import { MeetingLogModal } from '@/features/field/MeetingLogModal';
import { RegisterBranchModal } from '@/features/field/RegisterBranchModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  MapPin,
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  Sparkles,
  Info,
  Search,
  Plus,
  Phone,
  User,
  Lock,
  ChevronDown,
  X,
  Check,
} from 'lucide-react';

interface VisitWorkflowViewProps {
  selectedBranchFromDirectory?: ClientBranch | null;
  onClearSelectedBranch?: () => void;
  onNavigateToClients?: () => void;
  onNavigateToExceptions?: () => void;
}

export const VisitWorkflowView: React.FC<VisitWorkflowViewProps> = ({
  selectedBranchFromDirectory,
  onClearSelectedBranch,
  onNavigateToClients,
  onNavigateToExceptions,
}) => {
  const {
    activeVisit,
    branches,
    checkInVisit,
    checkOutVisit,
    cancelVisit,
    simulatedGpsAccuracy,
    simulatedGeofenceDistance,
    setSimulatedGps,
  } = useFieldSession();

  const { getActiveMarketRules } = useMarketConfig();
  const marketRules = getActiveMarketRules('NG');
  const geofenceLimit = marketRules.defaultGeofenceRadiusMeters;
  const maxGpsLimit = marketRules.maxVisitGpsAccuracyMeters;

  // ================= CLIENT & LOCATION SELECTION STATE =================
  // Strict requirement: No random or hardcoded default client preselection for new visits!
  const [selectedClientName, setSelectedClientName] = useState<string | null>(
    selectedBranchFromDirectory ? selectedBranchFromDirectory.companyName : null
  );
  const [selectedBranch, setSelectedBranch] = useState<ClientBranch | null>(
    selectedBranchFromDirectory || null
  );

  // Search & dropdown UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Register New Client modal directly in Step 1 (Change 4)
  const [isRegisterClientModalOpen, setIsRegisterClientModalOpen] = useState(false);

  // Viewfinder camera simulation states
  const [hasCapturedPhoto, setHasCapturedPhoto] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Active visit elapsed seconds ticker
  const [liveSeconds, setLiveSeconds] = useState<number>(activeVisit ? activeVisit.elapsedSeconds : 0);

  // Meeting log modal
  const [isMeetingLogOpen, setIsMeetingLogOpen] = useState<boolean>(false);
  const [checkoutOutsideWarning, setCheckoutOutsideWarning] = useState<boolean>(false);

  // Update if prop passed from Directory
  useEffect(() => {
    if (selectedBranchFromDirectory) {
      setSelectedClientName(selectedBranchFromDirectory.companyName);
      setSelectedBranch(selectedBranchFromDirectory);
      setSimulatedGps(14, selectedBranchFromDirectory.distanceMeters);
      setHasCapturedPhoto(false);
    }
  }, [selectedBranchFromDirectory]);

  // Close client dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync GPS distance specifically to selected location
  useEffect(() => {
    if (selectedBranch) {
      setSimulatedGps(14, selectedBranch.distanceMeters);
    }
  }, [selectedBranch?.id]);

  // Active visit timer
  useEffect(() => {
    let interval: any;
    if (activeVisit) {
      interval = setInterval(() => {
        setLiveSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeVisit]);

  // Distinct client organisations with their physical branches
  const clientOrganisations = useMemo(() => {
    const map = new Map<string, ClientBranch[]>();
    branches.forEach((b) => {
      const list = map.get(b.companyName) || [];
      list.push(b);
      map.set(b.companyName, list);
    });
    return Array.from(map.entries()).map(([companyName, branchList]) => ({
      companyName,
      branches: branchList,
    }));
  }, [branches]);

  // Filtered client organisations based on search query
  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return clientOrganisations;
    return clientOrganisations.filter((client) => {
      const matchesCompany = client.companyName.toLowerCase().includes(q);
      const matchesBranch = client.branches.some(
        (b) =>
          b.branchName.toLowerCase().includes(q) ||
          b.address.toLowerCase().includes(q) ||
          b.branchCode.toLowerCase().includes(q) ||
          (b.hasSharedPhone && b.sharedCompanyPhone && b.sharedCompanyPhone.includes(q)) ||
          b.contacts.some((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      );
      return matchesCompany || matchesBranch;
    });
  }, [clientOrganisations, searchQuery]);

  // Branches belonging to the currently selected client organisation
  const locationsForSelectedClient = useMemo(() => {
    if (!selectedClientName) return [];
    return branches.filter((b) => b.companyName === selectedClientName);
  }, [branches, selectedClientName]);

  // Handle client selection
  const handleSelectClient = (companyName: string) => {
    setSelectedClientName(companyName);
    setIsDropdownOpen(false);
    setSearchQuery('');
    setHasCapturedPhoto(false);

    const clientBranches = branches.filter((b) => b.companyName === companyName);
    if (clientBranches.length === 1) {
      // Auto-select location for single-location clients
      setSelectedBranch(clientBranches[0]);
      setSimulatedGps(14, clientBranches[0].distanceMeters);
    } else {
      // Prompt selection if multiple locations exist
      setSelectedBranch(null);
    }
  };

  // Handle location selection
  const handleSelectLocation = (branch: ClientBranch) => {
    setSelectedBranch(branch);
    setHasCapturedPhoto(false);
    setSimulatedGps(14, branch.distanceMeters);
  };

  // Handle Change Client action (clears state, resets GPS & photo)
  const handleChangeClient = () => {
    setSelectedClientName(null);
    setSelectedBranch(null);
    setHasCapturedPhoto(false);
    setSearchQuery('');
    onClearSelectedBranch?.();
  };

  // Handle successful registration of a new client or location
  const handleClientRegistered = (newlyCreatedBranch: ClientBranch) => {
    setSelectedClientName(newlyCreatedBranch.companyName);
    setSelectedBranch(newlyCreatedBranch);
    setHasCapturedPhoto(false);
    setSimulatedGps(14, newlyCreatedBranch.distanceMeters);
    setIsDropdownOpen(false);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCapturePhoto = () => {
    setIsCapturing(true);
    setTimeout(() => {
      setIsCapturing(false);
      setHasCapturedPhoto(true);
    }, 600);
  };

  const handleCheckIn = () => {
    if (!selectedBranch) return;
    checkInVisit(
      selectedBranch,
      '/demo/demo_apex_depot.png',
      simulatedGpsAccuracy,
      simulatedGeofenceDistance
    );
    setLiveSeconds(0);
  };

  const handleInitiateCheckOut = () => {
    if (simulatedGeofenceDistance > geofenceLimit) {
      setCheckoutOutsideWarning(true);
    } else {
      setIsMeetingLogOpen(true);
    }
  };

  const handleConfirmCheckoutOutside = () => {
    setCheckoutOutsideWarning(false);
    setIsMeetingLogOpen(true);
  };

  const handleMeetingLogFinished = (onTime: boolean) => {
    checkOutVisit(simulatedGeofenceDistance > geofenceLimit, onTime ? { completed: true } : undefined);
    setIsMeetingLogOpen(false);
    handleChangeClient();
  };

  // Check if location can proceed with verified check-in
  const isLocationApproved = selectedBranch?.status === 'approved';
  const isPendingApproval = selectedBranch?.status === 'pending_approval';
  const isPinRejected = selectedBranch?.status === 'rejected';

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto select-none">
      {/* ================= SIMULATION CONTROLS FOR TESTING ================= */}
      <div className="bg-slate-900 text-white p-3.5 rounded-xl text-xs space-y-2 border border-slate-800 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-bold flex items-center gap-1.5 text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> GPS & Geofence Simulator (Test Controls)
          </span>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
            Max: {geofenceLimit}m ({marketRules.ruleVersion})
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            onClick={() => setSimulatedGps(14, 38)}
            className={`p-2 rounded-lg text-[11px] font-bold border transition-colors ${
              simulatedGeofenceDistance <= geofenceLimit && simulatedGpsAccuracy <= maxGpsLimit
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            Inside (38m)
            <span className="block text-[9px] font-normal opacity-80">GPS ±14m (Valid)</span>
          </button>

          <button
            onClick={() => setSimulatedGps(14, 340)}
            className={`p-2 rounded-lg text-[11px] font-bold border transition-colors ${
              simulatedGeofenceDistance > geofenceLimit && simulatedGpsAccuracy <= maxGpsLimit
                ? 'bg-amber-600 text-white border-amber-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            Outside (340m)
            <span className="block text-[9px] font-normal opacity-80">Flags Checkout</span>
          </button>

          <button
            onClick={() => setSimulatedGps(140, 60)}
            className={`p-2 rounded-lg text-[11px] font-bold border transition-colors ${
              simulatedGpsAccuracy > maxGpsLimit
                ? 'bg-red-700 text-white border-red-600'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            Degraded GPS
            <span className="block text-[9px] font-normal opacity-80">Accuracy ±140m</span>
          </button>
        </div>
      </div>

      {/* ================= ACTIVE VISIT IN PROGRESS VIEW (PRD §6.1 / AT-04) ================= */}
      {activeVisit ? (
        <div className="space-y-4">
          <Card className="border-2 border-brand-blue bg-blue-50/40 shadow-sm overflow-hidden">
            <div className="p-4 space-y-3.5">
              {/* Header Badge & Timer */}
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-blue text-white text-xs font-bold shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E8CF2F] animate-pulse" />
                  Visit Session In Progress
                </span>
                <div className="flex items-center gap-1.5 bg-white border border-blue-200 px-2.5 py-1 rounded-lg text-brand-blue font-mono font-bold text-sm shadow-2xs">
                  <Clock className="w-4 h-4 text-brand-blue" />
                  {formatTimer(liveSeconds)}
                </div>
              </div>

              {/* Locked Active Visit Client Details (Cannot be switched during active visit) */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  {activeVisit.companyName}
                </span>
                <h3 className="font-bold text-slate-900 text-lg leading-tight">
                  {activeVisit.branchName}
                </h3>
                <p className="text-xs text-slate-600 flex items-center gap-1.5 pt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{activeVisit.address} • #{activeVisit.branchCode}</span>
                </p>
              </div>

              {/* Geofence & Check-in Verification Badges */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-blue-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 block">Check-in Location</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Within Geofence ({activeVisit.geofenceDistanceMeters}m / {geofenceLimit}m)
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">GPS Fix: ±{activeVisit.gpsAccuracyMeters}m</span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-blue-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 block">Check-in Timestamp</span>
                  <span className="font-bold text-slate-900 font-mono text-[11px]">
                    {activeVisit.checkInTime}
                  </span>
                  <span className="text-[9px] text-emerald-700 font-semibold">Live Photo Attached</span>
                </div>
              </div>

              {/* Single Normal Visit Rule Callout (AT-04) */}
              <div className="p-2.5 bg-white/80 border border-blue-200 rounded-lg text-[11px] text-slate-600 flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-blue shrink-0" />
                <span>PRD AT-04: Only 1 active normal physical visit is permitted at a time. All other visits blocked until closure.</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <Button
                  onClick={handleInitiateCheckOut}
                  className="w-full h-12 min-h-[48px] font-bold text-xs bg-brand-blue hover:bg-brand-blue-700 text-white shadow-sm flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" /> Check Out & Document Visit
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsMeetingLogOpen(true)}
                    className="w-1/2 h-11 text-xs font-bold border-slate-300 bg-white"
                  >
                    Draft Meeting Log
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={cancelVisit}
                    className="w-1/2 h-11 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Cancel Session
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        /* ================= NEW VISIT CHECK-IN FLOW ================= */
        <div className="space-y-4">
          {/* ================= STEP 1: SELECT CLIENT ================= */}
          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">
                  STEP 1: SELECT CLIENT
                </span>

                <div className="flex items-center gap-1.5">
                  {onNavigateToClients && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onNavigateToClients}
                      className="text-xs text-slate-600 hover:text-brand-blue h-8 font-medium px-2"
                    >
                      Directory
                    </Button>
                  )}
                  {selectedClientName && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleChangeClient}
                      className="text-xs text-brand-blue hover:underline h-8 font-semibold px-2"
                    >
                      Change Client
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRegisterClientModalOpen(true)}
                    className="text-xs font-semibold text-brand-blue border-brand-blue/30 hover:bg-blue-50 h-8 gap-1 px-2.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New Client
                  </Button>
                </div>
              </div>

              {/* State A: No Client Selected Yet */}
              {!selectedClientName ? (
                <div className="space-y-2" ref={dropdownRef}>
                  <label className="block text-xs font-bold text-slate-800">
                    Choose Business Client to Visit <span className="text-red-500">*</span>
                  </label>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      placeholder="Search business by name, address, or phone..."
                      className="pl-9 pr-8 h-11 text-xs bg-white border-slate-300 rounded-xl"
                    />
                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setIsDropdownOpen(true);
                        }}
                        className="absolute right-2.5 top-3 p-1 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen((prev) => !prev)}
                        className="absolute right-2.5 top-3 p-1 text-slate-400 hover:text-slate-600"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Searchable Dropdown List */}
                  {isDropdownOpen && (
                    <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100 z-30">
                      {filteredClients.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 space-y-1">
                          <p className="font-semibold text-slate-700">No matching registered clients found.</p>
                          <p className="text-[11px]">Use &quot;Add New Client&quot; above to register this business site.</p>
                        </div>
                      ) : (
                        filteredClients.map((client) => {
                          const locationCount = client.branches.length;
                          const primaryBranch = client.branches[0];

                          return (
                            <button
                              key={client.companyName}
                              type="button"
                              onClick={() => handleSelectClient(client.companyName)}
                              className="w-full text-left p-3 hover:bg-blue-50/60 transition-colors flex items-start justify-between gap-2"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <span className="font-bold text-slate-900 text-xs block truncate">
                                  {client.companyName}
                                </span>
                                <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{primaryBranch.address}</span>
                                </p>
                              </div>

                              <div className="flex flex-col items-end shrink-0 gap-1">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                  {locationCount === 1 ? '1 Location' : `${locationCount} Locations`}
                                </span>
                                {primaryBranch.hasSharedPhone && primaryBranch.sharedCompanyPhone && (
                                  <span className="text-[9px] font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    Shared Phone
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                    <Info className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                    <span>Select an existing client or tap &quot;Add New Client&quot; to register a new account.</span>
                  </p>
                </div>
              ) : (
                /* State B: Client Selected */
                <div className="space-y-3">
                  {/* Selected Client Summary Header */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                          Client Organisation
                        </span>
                        <h3 className="font-bold text-slate-900 text-base leading-snug flex items-center gap-1.5">
                          {selectedClientName}
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        </h3>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-brand-blue shrink-0">
                        {locationsForSelectedClient.length} Registered {locationsForSelectedClient.length === 1 ? 'Site' : 'Sites'}
                      </span>
                    </div>

                    {/* Multi-Location Switcher if client has >1 branch */}
                    {locationsForSelectedClient.length > 1 && (
                      <div className="pt-2 border-t border-slate-200 space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-800">
                          Select Location / Branch <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-1.5">
                          {locationsForSelectedClient.map((b) => {
                            const isSelected = selectedBranch?.id === b.id;
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => handleSelectLocation(b)}
                                className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs flex items-center justify-between gap-2 ${
                                  isSelected
                                    ? 'bg-blue-50/80 border-brand-blue ring-1 ring-brand-blue text-slate-900'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <div className="space-y-0.5 min-w-0">
                                  <div className="font-bold flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-brand-blue' : 'bg-slate-300'}`} />
                                    <span className="truncate">{b.branchName}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 truncate pl-3.5">
                                    {b.address}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="font-mono text-[10px] text-slate-500">
                                    {b.distanceMeters}m
                                  </span>
                                  {b.status === 'pending_approval' && (
                                    <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                      Pending Pin
                                    </span>
                                  )}
                                  {b.status === 'approved' && (
                                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                      Approved
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Location Specific Details Card */}
                  {selectedBranch && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-brand-blue uppercase tracking-wide">
                            Target Location
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm">
                            {selectedBranch.branchName}
                          </h4>
                        </div>

                        {/* Approval Status Badge */}
                        {isLocationApproved && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Approved Pin
                          </span>
                        )}
                        {isPendingApproval && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-700" /> Pending Approval
                          </span>
                        )}
                        {isPinRejected && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-rose-700" /> Pin Rejected
                          </span>
                        )}
                      </div>

                      <p className="text-slate-600 flex items-start gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{selectedBranch.address}</span>
                      </p>

                      {selectedBranch.landmark && (
                        <p className="text-[11px] text-slate-500 pl-5">
                          Landmark: {selectedBranch.landmark}
                        </p>
                      )}

                      {/* Contact & Shared Phone */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        {selectedBranch.contacts.length > 0 && (
                          <span className="text-slate-700 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {selectedBranch.contacts[0].name} ({selectedBranch.contacts[0].role})
                          </span>
                        )}

                        {selectedBranch.hasSharedPhone && selectedBranch.sharedCompanyPhone && (
                          <span className="text-amber-900 flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-amber-700" />
                            {selectedBranch.sharedCompanyPhone}
                          </span>
                        )}
                      </div>

                      {/* Prominent Warning if Location is Pending Approval */}
                      {isPendingApproval && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2 mt-2">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div className="text-[11px] leading-tight">
                            <strong className="font-bold">Pending Manager Approval:</strong> This location&apos;s proposed GPS pin is awaiting Country Sales Head approval. Per company policy, normal verified check-in cannot proceed until approved.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ================= STEP 2: GEOFENCE VALIDATION ================= */}
          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">
                  Step 2: Geofence Validation
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Radius limit: {geofenceLimit}m
                </span>
              </div>

              {!selectedBranch ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1.5">
                  <MapPin className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">No client selected</p>
                  <p className="text-[11px] text-slate-500">
                    Select a client and location in Step 1 to validate your GPS coordinates against the approved branch pin.
                  </p>
                </div>
              ) : (
                /* Geofence Meter Graphic & Confidence Classification */
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Distance to Pin:</span>
                    <span
                      className={`font-mono font-bold ${
                        simulatedGeofenceDistance <= geofenceLimit ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {simulatedGeofenceDistance} metres
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        simulatedGeofenceDistance <= geofenceLimit ? 'bg-emerald-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, (simulatedGeofenceDistance / 400) * 100)}%` }}
                    />
                  </div>

                  {simulatedGpsAccuracy > maxGpsLimit ? (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">GPS Accuracy Degraded (±{simulatedGpsAccuracy}m)</p>
                        <p className="text-[11px] text-red-800">
                          Accuracy exceeds {maxGpsLimit}m visit limit. Try moving outdoors, or submit a <strong>GPS Failure Exception</strong> if signal cannot be acquired.
                        </p>
                      </div>
                    </div>
                  ) : simulatedGeofenceDistance <= geofenceLimit ? (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="font-semibold text-[11px]">
                        Inside Geofence ({simulatedGeofenceDistance}m / {geofenceLimit}m) • Accuracy: ±{simulatedGpsAccuracy}m
                      </span>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Outside Geofence ({simulatedGeofenceDistance}m &gt; {geofenceLimit}m)</p>
                        <p className="text-[11px] text-amber-800">
                          Check-in will be marked as Location Unverified unless you are within {geofenceLimit}m of the registered pin.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-0.5">
                    <span>Approved Pin: {selectedBranch.approvedGpsLat}° N, {selectedBranch.approvedGpsLng}° E</span>
                    <span>Fix Accuracy: ±{simulatedGpsAccuracy}m</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ================= STEP 3: LIVE PREMISES PHOTO ================= */}
          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">
                  Step 3: Live Premises Photo
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                  Rear Camera • Required
                </span>
              </div>

              {!selectedBranch ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
                  <Camera className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">Client selection required</p>
                  <p className="text-[11px] text-slate-500">
                    Select a client and location in Step 1 before capturing premises photo.
                  </p>
                </div>
              ) : (
                /* Viewfinder Frame */
                <div className="relative w-full h-48 bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-300 flex flex-col items-center justify-center text-white">
                  {isCapturing ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-semibold">Capturing Premises...</span>
                    </div>
                  ) : hasCapturedPhoto ? (
                    <div className="relative w-full h-full bg-linear-to-b from-slate-800 to-slate-950 flex flex-col items-center justify-center p-3">
                      <div className="w-16 h-16 rounded-lg bg-slate-700 border border-emerald-400 flex items-center justify-center mb-2">
                        <Building2 className="w-8 h-8 text-emerald-300" />
                      </div>
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Live Premises Photo Captured
                      </span>
                      <span className="text-[10px] text-slate-300 font-mono mt-0.5">
                        {selectedBranch.branchCode} • Gate / Signage Stamped
                      </span>

                      <button
                        onClick={() => setHasCapturedPhoto(false)}
                        className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/60 hover:bg-black/80 text-white rounded-md text-[10px] font-semibold flex items-center gap-1 border border-white/20"
                      >
                        <RotateCw className="w-3 h-3" /> Retake
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4 text-center">
                      <Camera className="w-8 h-8 text-white/80" />
                      <p className="text-[11px] text-slate-300 max-w-[220px]">
                        Capture clear photo of branch entrance or company sign
                      </p>
                      <Button
                        onClick={handleCapturePhoto}
                        size="sm"
                        className="bg-brand-blue hover:bg-brand-blue-700 text-white font-bold text-xs h-9 px-4 mt-1"
                      >
                        <Camera className="w-3.5 h-3.5" /> Capture Photo
                      </Button>
                    </div>
                  )}

                  {/* Viewfinder Watermark */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono bg-black/60 px-2 py-1 rounded backdrop-blur-xs text-slate-200">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-400" /> {selectedBranch.approvedGpsLat}° N, {selectedBranch.approvedGpsLng}° E
                    </span>
                    <span>{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ================= STEP 4: CHECK-IN ACTION ================= */}
          <div className="space-y-2">
            {!selectedBranch ? (
              <Button
                disabled
                className="w-full h-12 min-h-[48px] font-bold text-xs bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
              >
                Select a Client in Step 1 to Proceed
              </Button>
            ) : isPendingApproval ? (
              <Button
                disabled
                className="w-full h-12 min-h-[48px] font-bold text-xs bg-amber-100 text-amber-800 cursor-not-allowed border border-amber-300"
              >
                Check-In Blocked: Location Pending Approval
              </Button>
            ) : isPinRejected ? (
              <Button
                disabled
                className="w-full h-12 min-h-[48px] font-bold text-xs bg-rose-100 text-rose-800 cursor-not-allowed border border-rose-300"
              >
                Check-In Blocked: Location Pin Rejected
              </Button>
            ) : !hasCapturedPhoto ? (
              <Button
                disabled
                className="w-full h-12 min-h-[48px] font-bold text-xs bg-slate-200 text-slate-500 cursor-not-allowed"
              >
                Capture Live Photo in Step 3 to Proceed
              </Button>
            ) : (
              <Button
                onClick={handleCheckIn}
                disabled={simulatedGpsAccuracy > maxGpsLimit}
                className={`w-full h-12 min-h-[48px] font-bold text-xs shadow-sm flex items-center justify-center gap-2 ${
                  simulatedGpsAccuracy <= maxGpsLimit
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" /> Check In & Start Client Meeting
              </Button>
            )}

            {simulatedGpsAccuracy > maxGpsLimit && (
              <Button
                variant="outline"
                onClick={onNavigateToExceptions}
                className="w-full text-xs h-10 border-amber-300 text-amber-900 bg-amber-50"
              >
                File GPS Failure Exception Instead
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ================= OUTSIDE GEOFENCE CHECKOUT WARNING (PRD §7.2 / AT-05) ================= */}
      {checkoutOutsideWarning && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-amber-700" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-base text-slate-900">
                Checkout Outside Geofence ({simulatedGeofenceDistance}m &gt; {geofenceLimit}m)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                PRD §7.2 & AT-05 Rule: Check-out outside the geofence is <strong>permitted</strong>, but will raise an audit flag (<span className="font-semibold text-amber-900">Checkout Outside Geofence</span>) for Country Sales Head review.
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
              Your visit session will be successfully closed and documented. The record remains reviewable by your manager.
            </div>

            <div className="space-y-2 pt-1">
              <Button
                onClick={handleConfirmCheckoutOutside}
                className="w-full font-bold h-11 bg-amber-600 hover:bg-amber-700 text-white"
              >
                Acknowledge & Proceed to Checkout
              </Button>
              <Button
                variant="outline"
                onClick={() => setCheckoutOutsideWarning(false)}
                className="w-full text-xs h-10 border-slate-300"
              >
                Cancel Checkout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MEETING LOG MODAL ================= */}
      <MeetingLogModal
        isOpen={isMeetingLogOpen}
        onClose={() => setIsMeetingLogOpen(false)}
        branchName={activeVisit ? activeVisit.branchName : (selectedBranch ? selectedBranch.branchName : '')}
        onSubmitted={handleMeetingLogFinished}
      />

      {/* ================= ADD NEW CLIENT MODAL DIRECTLY IN STEP 1 ================= */}
      <RegisterBranchModal
        isOpen={isRegisterClientModalOpen}
        onClose={() => setIsRegisterClientModalOpen(false)}
        onSuccess={handleClientRegistered}
        defaultCompanyName={selectedClientName || undefined}
      />
    </div>
  );
};
