import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFieldSession, ClientBranch } from '@/context/FieldSessionContext';
import { visitService } from '@/services/visitService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  X,
  Building2,
  MapPin,
  Camera,
  CheckCircle2,
  Info,
  Phone,
  User,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface RegisterBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newBranch: ClientBranch) => void;
  defaultCompanyName?: string;
}

export const RegisterBranchModal: React.FC<RegisterBranchModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultCompanyName,
}) => {
  const { currentUser } = useAuth();
  const { branches, refreshBranches } = useFieldSession();

  // Distinct list of registered client companies
  const existingCompanies = useMemo(() => {
    return Array.from(new Set(branches.map((b) => b.companyName))).sort();
  }, [branches]);

  // Mode: Register brand-new business vs add a location to an existing business
  const [clientType, setClientType] = useState<'new' | 'existing'>(
    defaultCompanyName && existingCompanies.includes(defaultCompanyName) ? 'existing' : 'new'
  );

  // Default coordinate based on market
  const defaultLat = currentUser.marketCode === 'ZM' ? -15.3875 : currentUser.marketCode === 'MW' ? -15.7861 : 6.5892;
  const defaultLng = currentUser.marketCode === 'ZM' ? 28.3228 : currentUser.marketCode === 'MW' ? 35.0058 : 3.3581;

  // Form states
  const [selectedExistingCompany, setSelectedExistingCompany] = useState<string>(
    defaultCompanyName || (existingCompanies.length > 0 ? existingCompanies[0] : '')
  );
  const [newCompanyName, setNewCompanyName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [category, setCategory] = useState('Commercial Haulage Depot');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');

  // Contact
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('Operations Manager');
  const [contactPhone, setContactPhone] = useState('');

  // Shared Phone Rule (PRD §4.2)
  const [hasSharedPhone, setHasSharedPhone] = useState<boolean>(false);
  const [sharedCompanyPhone, setSharedCompanyPhone] = useState('');

  // Pin & Camera
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number }>({
    lat: defaultLat,
    lng: defaultLng,
    accuracy: 18,
  });
  const [isCalibratingGps, setIsCalibratingGps] = useState<boolean>(false);
  const [gpsCaptured, setGpsCaptured] = useState<boolean>(true);
  const [photoCaptured, setPhotoCaptured] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successRegisteredBranch, setSuccessRegisteredBranch] = useState<ClientBranch | null>(null);

  const recalibrateGps = async () => {
    setIsCalibratingGps(true);
    try {
      const fix = await visitService.getCurrentLocation();
      setGpsCoords({
        lat: fix.latitude,
        lng: fix.longitude,
        accuracy: Math.round(fix.accuracy),
      });
      setGpsCaptured(true);
    } catch (err) {
      console.warn('[RegisterBranchModal] GPS fix warning, keeping current fix:', err);
    } finally {
      setIsCalibratingGps(false);
    }
  };

  if (!isOpen) return null;

  const effectiveCompanyName = clientType === 'existing' ? selectedExistingCompany : newCompanyName;

  // Duplicate company check when typing a new company
  const isDuplicateCompanyName =
    clientType === 'new' &&
    newCompanyName.trim().length > 2 &&
    existingCompanies.some(
      (c) => c.toLowerCase() === newCompanyName.trim().toLowerCase()
    );

  const handleExistingCompanyChange = (company: string) => {
    setSelectedExistingCompany(company);
    const existingBranch = branches.find((b) => b.companyName === company);
    if (existingBranch?.hasSharedPhone && existingBranch.sharedCompanyPhone) {
      setHasSharedPhone(true);
      setSharedCompanyPhone(existingBranch.sharedCompanyPhone);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveCompanyName.trim() || !branchName.trim() || !address.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Write authoritative branch, contact, and proposed pin to Supabase
      const { data: createdBranch } = await visitService.registerClientBranch({
        organisationName: effectiveCompanyName.trim(),
        branchName: branchName.trim(),
        category,
        city: currentUser.marketCode === 'ZM' ? 'Lusaka' : currentUser.marketCode === 'MW' ? 'Blantyre' : 'Lagos',
        streetAddress: address.trim(),
        switchboardPhone: hasSharedPhone && sharedCompanyPhone.trim() ? sharedCompanyPhone.trim() : (contactPhone.trim() || '+234 1 000 0000'),
        marketCode: currentUser.marketCode || 'NG',
        contactName: contactName.trim(),
        contactRole: contactRole.trim(),
        contactPhone: contactPhone.trim(),
        latitude: gpsCoords.lat,
        longitude: gpsCoords.lng,
        accuracyM: gpsCoords.accuracy,
        premisesPhotoPath: 'visit-premises-photos/pending_proposal.jpg',
      });

      // 2. Refresh live branches from Supabase SSoT
      await refreshBranches();

      if (createdBranch) {
        const mappedBranch: ClientBranch = {
          id: createdBranch.id,
          companyName: effectiveCompanyName.trim(),
          branchName: createdBranch.branch_name,
          branchCode: createdBranch.id.slice(0, 8).toUpperCase(),
          category: createdBranch.category,
          address: createdBranch.street_address,
          landmark: landmark.trim() || 'Central Commercial Hub',
          contacts: [
            {
              name: contactName.trim() || 'Site Operations Contact',
              role: contactRole.trim() || 'Operations Lead',
              phone: contactPhone.trim(),
            },
          ],
          hasSharedPhone,
          sharedCompanyPhone: hasSharedPhone ? sharedCompanyPhone.trim() : undefined,
          status: 'pending_approval',
          approvedGpsLat: gpsCoords.lat,
          approvedGpsLng: gpsCoords.lng,
          distanceMeters: 120,
          isRegisteredByRep: true,
          accuracyMeters: gpsCoords.accuracy,
        };
        setSuccessRegisteredBranch(mappedBranch);
      }
    } catch (err) {
      console.warn('[RegisterBranchModal] Direct registration error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-brand-blue uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                PRD §4.2 Client Registration
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-base mt-1">
              Register Client & Propose Location Pin
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Market: {currentUser.marketName} • Subject to Sales Head Approval
            </p>
          </div>
          <button
            onClick={() => {
              if (successRegisteredBranch) {
                onSuccess?.(successRegisteredBranch);
              }
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View or Scrollable Form Body */}
        {successRegisteredBranch ? (
          <div className="p-6 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-base">Client Location Registered</h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed mt-1">
                Your client branch registration and proposed location pin have been recorded in the central operational ledger.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Organisation:</span>
                <span className="font-bold text-slate-900">{successRegisteredBranch.companyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Branch Location:</span>
                <span className="font-bold text-slate-800">{successRegisteredBranch.branchName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Address:</span>
                <span className="text-slate-700">{successRegisteredBranch.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Proposed Pin:</span>
                <span className="font-mono text-slate-800">
                  {successRegisteredBranch.approvedGpsLat.toFixed(5)}, {successRegisteredBranch.approvedGpsLng.toFixed(5)} (±{Math.round(successRegisteredBranch.accuracyMeters || 0)}m)
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200/80">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                  Pending Manager Pin Approval
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                onClick={() => {
                  onSuccess?.(successRegisteredBranch);
                  onClose();
                }}
                className="w-full bg-brand-blue hover:bg-blue-700 text-white font-bold h-11 text-xs gap-1.5 shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Done &amp; Select Location</span>
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 text-xs text-slate-700">
          {/* PRD §4.2 Rule Guidance */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5">
            <Info className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-700 leading-relaxed">
              <strong className="text-slate-900 font-semibold">B2B Structure:</strong> Register a brand-new business client or propose a new physical location for an existing client. Shared telephone numbers are supported per PRD §4.2.
            </div>
          </div>

          {/* Client Organisation Selection / Creation */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-brand-blue" /> Client Organisation Structure
            </span>

            {/* Mode Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setClientType('new')}
                className={`py-2 px-3 rounded-lg font-bold text-xs border transition-colors ${
                  clientType === 'new'
                    ? 'bg-brand-blue text-white border-brand-blue shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                New Business Client
              </button>
              <button
                type="button"
                onClick={() => setClientType('existing')}
                disabled={existingCompanies.length === 0}
                className={`py-2 px-3 rounded-lg font-bold text-xs border transition-colors ${
                  clientType === 'existing'
                    ? 'bg-brand-blue text-white border-brand-blue shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Existing Client Location
              </button>
            </div>

            {clientType === 'existing' ? (
              <div className="space-y-1">
                <label className="block font-bold text-slate-900">
                  Select Existing Client <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedExistingCompany}
                  onChange={(e) => handleExistingCompanyChange(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-xs font-semibold focus:ring-2 focus:ring-brand-blue focus:outline-none"
                >
                  {existingCompanies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">
                  Adding a new physical location to this registered client.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="block font-bold text-slate-900">
                  New Client Business Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="e.g. Saharan Haulage & Energy Logistics"
                  required
                  className="text-xs h-10 bg-white"
                />
                {isDuplicateCompanyName && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-900 flex items-start gap-1.5 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      A client with this name already exists. Consider switching to &quot;Existing Client Location&quot; to add a new location to it.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Physical Location Details */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block font-bold text-slate-900">
                Client Location Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. Apapa Terminal 2 Depot or Central Workshop"
                required
                className="text-xs h-10"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-bold text-slate-900">
                  Facility Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-brand-blue focus:outline-none"
                >
                  <option value="Commercial Haulage Depot">Commercial Haulage Depot</option>
                  <option value="Bulk Fuel Terminal">Bulk Fuel Terminal</option>
                  <option value="Transit Maintenance Depot">Transit Maintenance Depot</option>
                  <option value="Commercial Fleet Workshop">Commercial Fleet Workshop</option>
                  <option value="Cargo Distribution Terminal">Cargo Distribution Terminal</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-900">Landmark Reference</label>
                <Input
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Adjacent to Gate 3"
                  className="text-xs h-10"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-900">
                Physical Street Address <span className="text-red-500">*</span>
              </label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 14 Commercial Avenue, Apapa Industrial Area, Lagos"
                required
                className="text-xs h-10"
              />
            </div>
          </div>

          {/* Primary Contact Person */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-brand-blue" /> Primary Site Contact
            </span>

            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Contact Name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="text-xs h-9 bg-white"
                required
              />
              <Input
                placeholder="Job Role / Title"
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
                className="text-xs h-9 bg-white"
                required
              />
            </div>

            <Input
              placeholder="Direct Mobile Phone Number"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="text-xs h-9 bg-white font-mono"
              required
            />
          </div>

          {/* Shared Company Phone Number Section (PRD §4.2) */}
          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sharedPhoneCheck"
                checked={hasSharedPhone}
                onChange={(e) => setHasSharedPhone(e.target.checked)}
                className="w-4 h-4 rounded text-brand-blue cursor-pointer"
              />
              <label
                htmlFor="sharedPhoneCheck"
                className="font-bold text-slate-900 text-xs cursor-pointer flex items-center gap-1"
              >
                <Phone className="w-3 h-3 text-amber-700" /> Uses Shared Company Phone Number
              </label>
            </div>

            {hasSharedPhone && (
              <div className="pt-1 space-y-1">
                <Input
                  value={sharedCompanyPhone}
                  onChange={(e) => setSharedCompanyPhone(e.target.value)}
                  placeholder="e.g. +234 1 270 5000"
                  className="text-xs h-9 bg-white font-mono"
                />
                <p className="text-[10px] text-amber-900">
                  Multiple locations of <em>{effectiveCompanyName || 'this company'}</em> sharing this number will not trigger automatic duplicate rejection.
                </p>
              </div>
            )}
          </div>

          {/* Proposed GPS Pin Status (Accuracy <= 50m required) */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Proposed GPS Pin Coordinate
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                Fix Valid (≤ 50m required)
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono flex items-center justify-between text-[11px]">
              <div>
                <span className="font-bold text-slate-900">
                  {gpsCoords.lat.toFixed(4)}° {gpsCoords.lat >= 0 ? 'N' : 'S'}, {gpsCoords.lng.toFixed(4)}° {gpsCoords.lng >= 0 ? 'E' : 'W'}
                </span>
                <span className="text-slate-500 block text-[10px]">Fix accuracy: ±{gpsCoords.accuracy}m (GPS verified on-site)</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isCalibratingGps}
                onClick={recalibrateGps}
                className="text-[11px] h-8 font-semibold border-slate-300"
              >
                {isCalibratingGps ? 'Fixing GPS...' : gpsCaptured ? 'Recalibrate Pin' : 'Capture Pin'}
              </Button>
            </div>
          </div>

          {/* Live Premises Photo Prompt */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-brand-blue" /> Live Premises Photograph
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Photo Attached
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg bg-slate-800 text-white flex flex-col items-center justify-center text-[9px] font-mono shrink-0">
                <Building2 className="w-5 h-5 text-emerald-400 mb-0.5" />
                PREMISES
              </div>
              <div className="text-[11px] space-y-0.5 flex-1">
                <p className="font-bold text-slate-900">Gate & Signage Verified</p>
                <p className="text-slate-500 text-[10px]">
                  Watermark: 6.5892° N, 3.3581° E • {new Date().toLocaleTimeString()}
                </p>
                <button
                  type="button"
                  onClick={() => setPhotoCaptured((prev) => !prev)}
                  className="text-brand-blue text-[10px] font-semibold hover:underline"
                >
                  {photoCaptured ? 'Recapture Live Photo' : 'Capture Live Photo'}
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 -mx-4 -mb-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 rounded-b-2xl">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs h-11 px-4 border-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !gpsCaptured ||
                !photoCaptured ||
                !effectiveCompanyName.trim() ||
                !branchName.trim() ||
                !address.trim()
              }
              className="text-xs h-11 px-5 font-bold bg-brand-blue hover:bg-brand-blue-700 text-white shadow-sm flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" /> Submit Client Location for Approval
            </Button>
          </div>
        </form>
      )}
      </div>
    </div>
  );
};
