import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Smartphone,
  Search,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldCheck,
  Battery,
  X,
  RotateCcw,
  Globe2,
  Truck,
  Clock,
  XCircle,
  RotateCw,
  Plus,
  Sliders,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketCode } from '@/context/AuthContext';
import {
  useDeviceReplacement,
  CompanyDevice,
  DeviceInventoryStatus,
  RegisterDeviceInput,
  DeviceReplacementRequest,
  ReplacementRequestStatus,
  DeviceIssueCategory,
} from '@/context/DeviceReplacementContext';

const FIELD_SALESPEOPLE = [
  { id: 'USR-NG-002', name: 'Chukwudi Okafor', marketCode: 'NG', marketName: 'Nigeria (Lagos Hub)' },
  { id: 'USR-NG-003', name: 'Amina Bello', marketCode: 'NG', marketName: 'Nigeria (Lagos Hub)' },
  { id: 'USR-NG-004', name: 'Oluwaseun Fashola', marketCode: 'NG', marketName: 'Nigeria (Lagos Hub)' },
  { id: 'CC-NG-042', name: 'Tunde Adebayo', marketCode: 'NG', marketName: 'Nigeria (Lagos Hub)' },
  { id: 'USR-NG-006', name: 'Kayode Williams', marketCode: 'NG', marketName: 'Nigeria (Lagos Hub)' },
  { id: 'USR-ZM-002', name: 'Kondwani Banda', marketCode: 'ZM', marketName: 'Zambia (Lusaka Hub)' },
  { id: 'USR-ZM-003', name: 'Thandiwe Tembo', marketCode: 'ZM', marketName: 'Zambia (Lusaka Hub)' },
  { id: 'USR-ZM-004', name: 'Peter Mwale', marketCode: 'ZM', marketName: 'Zambia (Lusaka Hub)' },
  { id: 'USR-MW-002', name: 'Chifundo Phiri', marketCode: 'MW', marketName: 'Malawi (Blantyre Hub)' },
  { id: 'USR-MW-003', name: 'Tadala Banda', marketCode: 'MW', marketName: 'Malawi (Blantyre Hub)' },
];

export const HqDeviceManagement: React.FC = () => {
  // Shared Centralized Device Replacement & Fleet Inventory Engine
  const {
    devices,
    registerDevice,
    assignDevice,
    reassignDevice,
    updateDeviceLifecycleStatus,
    replacementRequests,
    approveRequest,
    rejectRequest,
    assignSpareDevice,
    recordDispatch,
    confirmDeviceActivation,
    closeRequest,
  } = useDeviceReplacement();

  // Search & Filter state for Fleet Inventory
  const [searchQuery, setSearchQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState<'ALL' | MarketCode>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DeviceInventoryStatus>('ALL');

  // Tab filter for replacement queue
  const [replacementTabFilter, setReplacementTabFilter] = useState<'ALL' | ReplacementRequestStatus>('Pending Review');

  // Multi-Step Workflow Modal States for Replacement Queue
  const [requestToApprove, setRequestToApprove] = useState<DeviceReplacementRequest | null>(null);
  const [approvalReason, setApprovalReason] = useState('');

  const [requestToReject, setRequestToReject] = useState<DeviceReplacementRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [requestToAssignSpare, setRequestToAssignSpare] = useState<DeviceReplacementRequest | null>(null);
  const [selectedSpareAssetId, setSelectedSpareAssetId] = useState('');

  const [requestToDispatch, setRequestToDispatch] = useState<DeviceReplacementRequest | null>(null);
  const [dispatchNotes, setDispatchNotes] = useState('');

  const [requestToActivate, setRequestToActivate] = useState<DeviceReplacementRequest | null>(null);
  const [oldDeviceDisposition, setOldDeviceDisposition] = useState<'revoked' | 'returned_to_depot' | 'quarantined'>('returned_to_depot');

  const [selectedRequestForHistory, setSelectedRequestForHistory] = useState<DeviceReplacementRequest | null>(null);

  // Device Registration Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState<RegisterDeviceInput>({
    assetId: '',
    make: 'Samsung',
    model: 'Galaxy A15 Enterprise',
    serialNumber: '',
    marketCode: 'NG',
    initialStatus: 'Available',
    imei: '',
    osVersion: 'Android 14 / One UI 6.0',
    purchaseDate: new Date().toISOString().slice(0, 10),
    supplier: 'Samsung West Africa Direct',
    warrantyExpiryDate: '',
    notes: '',
  });
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);

  // Device Assignment Modal State (for Available devices)
  const [deviceToAssign, setDeviceToAssign] = useState<CompanyDevice | null>(null);
  const [assigneeId, setAssigneeId] = useState('');
  const [assignmentReason, setAssignmentReason] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);

  // Device Reassign Modal State (for currently Assigned devices)
  const [deviceToReassign, setDeviceToReassign] = useState<CompanyDevice | null>(null);
  const [reassignSalespersonId, setReassignSalespersonId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassignError, setReassignError] = useState<string | null>(null);

  // Device Lifecycle Status Update Modal State
  const [deviceForStatusUpdate, setDeviceForStatusUpdate] = useState<CompanyDevice | null>(null);
  const [targetLifecycleStatus, setTargetLifecycleStatus] = useState<DeviceInventoryStatus>('Available');
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);

  // Device History Timeline Modal
  const [selectedDeviceForHistory, setSelectedDeviceForHistory] = useState<CompanyDevice | null>(null);

  // Filtered Devices
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        d.assetId.toLowerCase().includes(q) ||
        d.serialNumber.toLowerCase().includes(q) ||
        (d.imei && d.imei.includes(q)) ||
        (d.assignedSalespersonName && d.assignedSalespersonName.toLowerCase().includes(q)) ||
        d.model.toLowerCase().includes(q);

      const matchesMarket = marketFilter === 'ALL' ? true : d.marketCode === marketFilter;
      const matchesStatus = statusFilter === 'ALL' ? true : d.inventoryStatus === statusFilter;

      return matchesSearch && matchesMarket && matchesStatus;
    });
  }, [devices, searchQuery, marketFilter, statusFilter]);

  // Filtered Replacement Requests
  const filteredReplacements = useMemo(() => {
    return replacementRequests.filter((r) => {
      if (replacementTabFilter === 'ALL') return true;
      return r.status === replacementTabFilter;
    });
  }, [replacementRequests, replacementTabFilter]);

  // 1. Submit Register New Device
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(null);

    const res = registerDevice(registerForm);
    if (!res.success) {
      setRegisterError(res.error || 'Failed to register company device.');
      return;
    }

    setRegisterSuccess(`Device ${res.device?.assetId} successfully registered in ${res.device?.marketName} inventory.`);
    // Reset form
    setRegisterForm({
      assetId: '',
      make: 'Samsung',
      model: 'Galaxy A15 Enterprise',
      serialNumber: '',
      marketCode: 'NG',
      initialStatus: 'Available',
      imei: '',
      osVersion: 'Android 14 / One UI 6.0',
      purchaseDate: new Date().toISOString().slice(0, 10),
      supplier: 'Samsung West Africa Direct',
      warrantyExpiryDate: '',
      notes: '',
    });

    setTimeout(() => {
      setShowRegisterModal(false);
      setRegisterSuccess(null);
    }, 1200);
  };

  // 2. Submit Device Assignment
  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceToAssign || !assigneeId) return;
    setAssignError(null);

    const person = FIELD_SALESPEOPLE.find((p) => p.id === assigneeId);
    if (!person) return;

    const res = assignDevice(deviceToAssign.assetId, person.id, person.name, assignmentReason);
    if (!res.success) {
      setAssignError(res.error || 'Failed to assign device.');
      return;
    }

    setDeviceToAssign(null);
    setAssigneeId('');
    setAssignmentReason('');
  };

  // 3. Submit Reassignment (Custody Transfer)
  const handleReassignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceToReassign || !reassignSalespersonId) return;
    setReassignError(null);

    if (!reassignReason.trim()) {
      setReassignError('A mandatory reason is required to reassign a company device.');
      return;
    }

    const person = FIELD_SALESPEOPLE.find((p) => p.id === reassignSalespersonId);
    if (!person) return;

    const res = reassignDevice(deviceToReassign.assetId, person.id, person.name, reassignReason.trim());
    if (!res.success) {
      setReassignError(res.error || 'Failed to reassign device.');
      return;
    }

    setDeviceToReassign(null);
    setReassignSalespersonId('');
    setReassignReason('');
  };

  // 4. Submit Lifecycle Status Update
  const handleStatusUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceForStatusUpdate) return;
    setStatusUpdateError(null);

    if (!statusChangeReason.trim()) {
      setStatusUpdateError('A mandatory reason is required for status changes.');
      return;
    }

    const res = updateDeviceLifecycleStatus(deviceForStatusUpdate.assetId, targetLifecycleStatus, statusChangeReason.trim());
    if (!res.success) {
      setStatusUpdateError(res.error || 'Failed to update status.');
      return;
    }

    setDeviceForStatusUpdate(null);
    setStatusChangeReason('');
  };

  // Step 1: Confirm Approval (Mandatory Reason)
  const handleConfirmApprove = () => {
    if (!requestToApprove || !approvalReason.trim()) return;
    approveRequest(requestToApprove.id, approvalReason.trim());
    setRequestToApprove(null);
    setApprovalReason('');
  };

  // Step 2: Confirm Rejection (Mandatory Reason)
  const handleConfirmReject = () => {
    if (!requestToReject || !rejectionReason.trim()) return;
    rejectRequest(requestToReject.id, rejectionReason.trim());
    setRequestToReject(null);
    setRejectionReason('');
  };

  // Step 3: Assign Spare Device
  const handleConfirmAssignSpare = () => {
    if (!requestToAssignSpare || !selectedSpareAssetId) return;
    assignSpareDevice(requestToAssignSpare.id, selectedSpareAssetId);
    setRequestToAssignSpare(null);
    setSelectedSpareAssetId('');
  };

  // Step 4: Record Dispatch
  const handleConfirmDispatch = () => {
    if (!requestToDispatch || !dispatchNotes.trim()) return;
    recordDispatch(requestToDispatch.id, dispatchNotes.trim());
    setRequestToDispatch(null);
    setDispatchNotes('');
  };

  // Step 5: Confirm Activation & Set Old Device Disposition
  const handleConfirmActivation = () => {
    if (!requestToActivate) return;
    confirmDeviceActivation(requestToActivate.id, oldDeviceDisposition);
    setRequestToActivate(null);
  };

  // Helpers for Status Styling
  const getInventoryStatusBadge = (status: DeviceInventoryStatus) => {
    switch (status) {
      case 'Available':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Available in Depot
          </span>
        );
      case 'Assigned':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-300 px-2.5 py-0.5 rounded-full">
            <UserCheck className="w-2.5 h-2.5 text-blue-600" /> Assigned
          </span>
        );
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-900 bg-emerald-100 border border-emerald-400 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" /> Active in Field
          </span>
        );
      case 'Pending Inspection':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full">
            <Clock className="w-2.5 h-2.5 text-amber-600" /> Pending Inspection
          </span>
        );
      case 'Under Maintenance':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-400 px-2.5 py-0.5 rounded-full">
            <RotateCcw className="w-2.5 h-2.5 text-amber-700" /> Under Maintenance
          </span>
        );
      case 'Lost/Stolen':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-900 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full">
            <ShieldAlert className="w-2.5 h-2.5 text-rose-600" /> Lost / Stolen
          </span>
        );
      case 'Returned':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-300 px-2.5 py-0.5 rounded-full">
            <RotateCw className="w-2.5 h-2.5 text-indigo-600" /> Returned to Depot
          </span>
        );
      case 'Revoked':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-300 px-2.5 py-0.5 rounded-full">
            <XCircle className="w-2.5 h-2.5 text-rose-600" /> Revoked
          </span>
        );
      case 'Retired':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full">
            <X className="w-2.5 h-2.5 text-slate-500" /> Retired / Recycled
          </span>
        );
      default:
        return null;
    }
  };

  const getSecurityBadge = (auth: string) => {
    switch (auth) {
      case 'Authorized':
        return (
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Authorized
          </span>
        );
      case 'Quarantined':
        return (
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Quarantined
          </span>
        );
      case 'Revoked':
        return (
          <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-rose-600" /> Revoked
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            {auth}
          </span>
        );
    }
  };

  const getCategoryLabel = (category: DeviceIssueCategory) => {
    switch (category) {
      case 'camera_defect':
        return 'Camera Defect';
      case 'gps_failure':
        return 'GPS Sensor Failure';
      case 'screen_damage':
        return 'Screen / Digitizer Damage';
      case 'battery_charging_fault':
        return 'Battery / Charging Fault';
      case 'lost_or_stolen':
        return 'Lost or Stolen Device';
      default:
        return 'Other Hardware Issue';
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header Banner with Register New Device Action */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-slate-800">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Company-Issued Handset Inventory & MDM
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Hardware tracking, custodian assignment, Knox telemetry, and replacement workflows across Nigeria, Zambia, and Malawi
              </p>
            </div>
          </div>
        </div>

        {/* Action button and status pill - guaranteed single horizontal line */}
        <div className="flex items-center gap-3 shrink-0 flex-nowrap">
          <Button
            id="btn-register-new-device"
            onClick={() => {
              setRegisterError(null);
              setRegisterSuccess(null);
              setShowRegisterModal(true);
            }}
            className="h-9 bg-brand-blue hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm px-3.5 py-2 rounded-lg border border-blue-400/30 shrink-0 whitespace-nowrap cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Register New Device
          </Button>

          <span className="h-9 inline-flex items-center text-[11px] bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-lg text-slate-200 font-mono font-semibold shrink-0 whitespace-nowrap">
            100% Company Fleet
          </span>
        </div>
      </div>

      {/* Mandatory PRD Policy Notice */}
      <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-slate-800 text-xs flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <span className="font-bold text-brand-blue">Hardware Policy & Chain-of-Custody Integrity</span>
          <p className="text-slate-600">
            Per PRD §2.1, Carbon Car Care provides all field handsets. Device identifiers are cryptographically bonded to field session tokens.
            When a device fails or is lost, the salesperson submits exception logs upon device recovery; HQ admins manage replacement hardware without fabricating field evidence.
          </p>
        </div>
      </div>

      {/* Device Replacement Requests Management Module (PRD Approved Architecture) */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <CardTitle className="text-sm font-bold text-slate-900">
                  Pending Device Replacement Requests
                </CardTitle>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 shrink-0 whitespace-nowrap">
                  {replacementRequests.filter((r) => r.status === 'Pending Review').length} Pending Review
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Direct salesperson submissions to HQ Administrator • No Country Sales Head approval bottleneck
              </p>
            </div>

            <div className="text-xs text-slate-500 font-medium shrink-0 hidden sm:block">
              <span className="font-semibold text-slate-700">{replacementRequests.length}</span> Total Requests Across Hubs
            </div>
          </div>

          {/* Filter Tabs - Clean full-width horizontal tab strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 border-t border-slate-100">
            {(
              [
                'Pending Review',
                'Approved',
                'Awaiting Spare',
                'Dispatched',
                'Awaiting Activation',
                'Completed',
                'Rejected',
                'ALL',
              ] as const
            ).map((tab) => {
              const count =
                tab === 'ALL'
                  ? replacementRequests.length
                  : replacementRequests.filter((r) => r.status === tab).length;
              const isActive = replacementTabFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setReplacementTabFilter(tab)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer',
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  )}
                >
                  <span>{tab === 'ALL' ? 'All Requests' : tab}</span>
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                      isActive
                        ? 'bg-white/20 text-white font-semibold'
                        : tab === 'Pending Review' && count > 0
                        ? 'bg-amber-200 text-amber-900 font-bold'
                        : 'bg-slate-200 text-slate-700 font-medium'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-3.5">
          {filteredReplacements.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-1">
              <CheckCircle2 className="w-7 h-7 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No requests in this status.</p>
              <p className="text-[11px] text-slate-400">
                All field replacement workflows in this filter are up to date.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReplacements.map((req) => (
                <div
                  key={req.id}
                  className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-mono font-bold text-slate-900 text-xs bg-white px-2 py-0.5 rounded border border-slate-200">
                        {req.id}
                      </span>
                      <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded font-semibold text-slate-700">
                        {req.marketName}
                      </span>
                      <span className="text-slate-500 font-medium">
                        Salesperson: <strong className="text-slate-800">{req.salespersonName}</strong>
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">({req.salespersonId})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-mono">Logged: {req.submittedAt}</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800">
                        {req.status}
                      </span>
                    </div>
                  </div>

                  {/* Device & Issue Meta */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 bg-white p-3 rounded-lg border border-slate-200/80">
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block">Reported Handset</span>
                      <span className="font-mono font-bold text-slate-900">{req.companyDeviceAssetId}</span>
                      <span className="text-[11px] text-slate-600 block">{req.deviceModel}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block">Issue Category</span>
                      <span className="font-semibold text-slate-800">{getCategoryLabel(req.issueCategory)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block">Supporting Evidence</span>
                      <span className="text-[11px] text-slate-600 italic">
                        {req.supportingEvidence || 'None attached'}
                      </span>
                    </div>
                  </div>

                  {/* Problem Description */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Problem Description
                    </span>
                    <p className="text-slate-800 font-medium leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/70">
                      {req.issueDescription}
                    </p>
                  </div>

                  {/* Status Dependent Feedback */}
                  {req.approvalReason && (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs">
                      <strong className="block text-[11px] uppercase tracking-wide">HQ Approval Rationale:</strong>
                      <span>{req.approvalReason}</span>
                    </div>
                  )}

                  {req.rejectionReason && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs">
                      <strong className="block text-[11px] uppercase tracking-wide">HQ Rejection Rationale:</strong>
                      <span>{req.rejectionReason}</span>
                    </div>
                  )}

                  {req.replacementDeviceAssetId && (
                    <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900 text-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wide block">Allocated Replacement Handset</span>
                        <strong className="font-mono text-xs">{req.replacementDeviceAssetId}</strong> ({req.replacementDeviceModel})
                      </div>
                      {req.dispatchNotes && (
                        <div className="text-right">
                          <span className="text-[10px] text-indigo-700 block">{req.dispatchNotes}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contextual Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRequestForHistory(req)}
                      className="h-8 text-xs text-slate-600 hover:text-brand-blue flex items-center gap-1.5"
                    >
                      <History className="w-3.5 h-3.5" />
                      View Audit History ({req.history.length})
                    </Button>

                    <div className="flex items-center gap-2">
                      {req.status === 'Pending Review' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRequestToReject(req);
                              setRejectionReason('');
                            }}
                            className="h-8 text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                          >
                            Reject Request
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setRequestToApprove(req);
                              setApprovalReason('');
                            }}
                            className="h-8 text-xs bg-brand-blue hover:bg-blue-700 text-white font-semibold"
                          >
                            Approve Request
                          </Button>
                        </>
                      )}

                      {req.status === 'Approved' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setRequestToAssignSpare(req);
                            setSelectedSpareAssetId('');
                          }}
                          className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          Allocate Spare Device
                        </Button>
                      )}

                      {req.status === 'Awaiting Spare' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setRequestToDispatch(req);
                            setDispatchNotes('');
                          }}
                          className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1.5"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Record Dispatch
                        </Button>
                      )}

                      {req.status === 'Dispatched' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setRequestToActivate(req);
                            setOldDeviceDisposition('returned_to_depot');
                          }}
                          className="h-8 text-xs bg-cyan-700 hover:bg-cyan-800 text-white font-semibold flex items-center gap-1.5"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          Confirm Activation & Handover
                        </Button>
                      )}

                      {req.status === 'Awaiting Activation' && (
                        <Button
                          size="sm"
                          onClick={() => closeRequest(req.id)}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Close Completed Request
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Inventory</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{devices.length}</p>
            <span className="text-[10px] font-semibold text-slate-500">Company-Owned Assets</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center">
            <Smartphone className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Active in Field</p>
            <p className="text-2xl font-black text-emerald-800 mt-0.5">
              {devices.filter((d) => d.inventoryStatus === 'Active' || d.inventoryStatus === 'Assigned').length}
            </p>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              Synchronising Normally
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Available in Depot</p>
            <p className="text-2xl font-black text-indigo-700 mt-0.5">
              {devices.filter((d) => d.inventoryStatus === 'Available' || d.inventoryStatus === 'Returned').length}
            </p>
            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
              Ready for Assignment
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Smartphone className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Avg Battery Health</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {Math.round(devices.reduce((acc, d) => acc + (d.batteryHealth || 90), 0) / devices.length)}%
            </p>
            <span className="text-[10px] font-semibold text-slate-500">Hardware Telemetry Good</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
            <Battery className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200/90 shadow-xs">
        <CardContent className="p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Asset ID, Serial Number, IMEI, model, or assigned rep..."
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
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-hidden focus:border-brand-blue"
              >
                <option value="ALL">All 9 Lifecycle Statuses</option>
                <option value="Available">Available (In Depot)</option>
                <option value="Assigned">Assigned</option>
                <option value="Active">Active in Field</option>
                <option value="Pending Inspection">Pending Inspection</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="Lost/Stolen">Lost / Stolen</option>
                <option value="Returned">Returned to Depot</option>
                <option value="Revoked">Revoked</option>
                <option value="Retired">Retired / Recycled</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Devices Inventory Table */}
      <Card className="border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Asset ID & Serial Number</th>
                <th className="py-3 px-3">Make & Model</th>
                <th className="py-3 px-3">Market Hub</th>
                <th className="py-3 px-3">Assigned Salesperson</th>
                <th className="py-3 px-3">Security Auth</th>
                <th className="py-3 px-3">Inventory Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Smartphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No matching handsets found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Adjust filter tags or search terms</p>
                  </td>
                </tr>
              ) : (
                filteredDevices.map((device) => (
                  <tr key={device.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Asset ID & Serial */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <p className="font-mono font-bold text-xs text-slate-900">{device.assetId}</p>
                          <p className="font-mono text-[10px] text-slate-500">SN: {device.serialNumber}</p>
                          {device.imei && <p className="font-mono text-[9px] text-slate-400">IMEI: {device.imei}</p>}
                        </div>
                      </div>
                    </td>

                    {/* Make & Model */}
                    <td className="py-3 px-3">
                      <div>
                        <p className="font-semibold text-slate-800 text-xs">
                          {device.make} {device.model}
                        </p>
                        <p className="text-[10px] text-slate-500">{device.osVersion || 'Android 14'}</p>
                      </div>
                    </td>

                    {/* Market Hub */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <Globe2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-800 text-[11px]">{device.marketName}</span>
                      </div>
                    </td>

                    {/* Assigned Salesperson */}
                    <td className="py-3 px-3">
                      {device.assignedSalespersonName ? (
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{device.assignedSalespersonName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Assigned: {device.assignedDate || '2025-02-01'}</p>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic font-medium">Unassigned (In Depot)</span>
                      )}
                    </td>

                    {/* Security Authorization */}
                    <td className="py-3 px-3">
                      {getSecurityBadge(device.securityAuthorization)}
                    </td>

                    {/* Inventory Status */}
                    <td className="py-3 px-3">
                      {getInventoryStatusBadge(device.inventoryStatus)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Assign if Available or Returned */}
                        {(device.inventoryStatus === 'Available' || device.inventoryStatus === 'Returned') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDeviceToAssign(device);
                              setAssigneeId('');
                              setAssignmentReason('');
                              setAssignError(null);
                            }}
                            className="h-7 px-2 text-[11px] text-brand-blue border-blue-200 hover:bg-blue-50 font-semibold"
                            title="Assign to Salesperson"
                          >
                            <UserCheck className="w-3 h-3 mr-1" />
                            Assign
                          </Button>
                        )}

                        {/* Reassign if Assigned or Active */}
                        {(device.inventoryStatus === 'Assigned' || device.inventoryStatus === 'Active') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDeviceToReassign(device);
                              setReassignSalespersonId('');
                              setReassignReason('');
                              setReassignError(null);
                            }}
                            className="h-7 px-2 text-[11px] text-slate-700 border-slate-200 hover:bg-slate-100"
                            title="Reassign to another rep"
                          >
                            Reassign
                          </Button>
                        )}

                        {/* Lifecycle Status Update */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeviceForStatusUpdate(device);
                            setTargetLifecycleStatus(device.inventoryStatus);
                            setStatusChangeReason('');
                            setStatusUpdateError(null);
                          }}
                          className="h-7 px-1.5 text-[11px] text-slate-600 hover:text-slate-900"
                          title="Update Status / Retire"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </Button>

                        {/* View Audit History */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDeviceForHistory(device)}
                          className="h-7 px-1.5 text-[11px] text-slate-600 hover:text-brand-blue"
                          title="Device Audit History"
                        >
                          <History className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 1. REGISTER NEW COMPANY DEVICE MODAL */}
      {/* ========================================================================= */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in select-none">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Register New Company Device</h3>
                  <p className="text-[11px] text-slate-500">Add company-owned field handset to central inventory & MDM</p>
                </div>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {registerError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{registerError}</span>
              </div>
            )}

            {registerSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{registerSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              {/* Section 1: Required Identification */}
              <div className="space-y-2.5">
                <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wide block">
                  Required Device Identification
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Company Asset ID *</label>
                    <input
                      id="input-reg-asset-id"
                      required
                      type="text"
                      placeholder="e.g. CC-DEV-LOS-010"
                      value={registerForm.assetId}
                      onChange={(e) => setRegisterForm({ ...registerForm, assetId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                    />
                    <span className="text-[10px] text-slate-400">Must be unique across all country fleets.</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Manufacturer Serial Number *</label>
                    <input
                      id="input-reg-serial-number"
                      required
                      type="text"
                      placeholder="e.g. R58M998811A"
                      value={registerForm.serialNumber}
                      onChange={(e) => setRegisterForm({ ...registerForm, serialNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                    />
                    <span className="text-[10px] text-slate-400">Printed on hardware chassis / packaging.</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Device Make *</label>
                    <select
                      value={registerForm.make}
                      onChange={(e) => setRegisterForm({ ...registerForm, make: e.target.value })}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-white font-medium focus:border-brand-blue"
                    >
                      <option value="Samsung">Samsung</option>
                      <option value="Nokia">Nokia</option>
                      <option value="Google">Google</option>
                      <option value="Motorola">Motorola</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Device Model *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Galaxy A15 Enterprise"
                      value={registerForm.model}
                      onChange={(e) => setRegisterForm({ ...registerForm, model: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Assigned Market *</label>
                    <select
                      value={registerForm.marketCode}
                      onChange={(e) => setRegisterForm({ ...registerForm, marketCode: e.target.value as MarketCode })}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-white font-medium focus:border-brand-blue"
                    >
                      <option value="NG">Nigeria (Lagos Hub)</option>
                      <option value="ZM">Zambia (Lusaka Hub)</option>
                      <option value="MW">Malawi (Blantyre Hub)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Initial Inventory Status *</label>
                  <select
                    value={registerForm.initialStatus}
                    onChange={(e) => setRegisterForm({ ...registerForm, initialStatus: e.target.value as any })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-white font-medium focus:border-brand-blue"
                  >
                    <option value="Available">Available (Default — ready for field assignment)</option>
                    <option value="Pending Inspection">Pending Inspection (Requires IT hardware checks)</option>
                  </select>
                </div>
              </div>

              {/* Section 2: Optional Enterprise Metadata */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wide block">
                  Optional Enterprise Metadata
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">15-Digit IMEI</label>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="e.g. 864209051999123"
                      value={registerForm.imei}
                      onChange={(e) => setRegisterForm({ ...registerForm, imei: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:border-brand-blue"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">OS & Build Version</label>
                    <input
                      type="text"
                      placeholder="e.g. Android 14 / One UI 6.0"
                      value={registerForm.osVersion}
                      onChange={(e) => setRegisterForm({ ...registerForm, osVersion: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-brand-blue"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Purchase Date</label>
                    <input
                      type="date"
                      value={registerForm.purchaseDate}
                      onChange={(e) => setRegisterForm({ ...registerForm, purchaseDate: e.target.value })}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs focus:border-brand-blue"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Supplier / Vendor</label>
                    <input
                      type="text"
                      placeholder="e.g. Samsung Direct"
                      value={registerForm.supplier}
                      onChange={(e) => setRegisterForm({ ...registerForm, supplier: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-brand-blue"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Warranty Expiry Date</label>
                    <input
                      type="date"
                      value={registerForm.warrantyExpiryDate}
                      onChange={(e) => setRegisterForm({ ...registerForm, warrantyExpiryDate: e.target.value })}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs focus:border-brand-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Administrative Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Enter deployment notes or storage location..."
                    value={registerForm.notes}
                    onChange={(e) => setRegisterForm({ ...registerForm, notes: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:border-brand-blue"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-slate-700 text-[11px] leading-relaxed">
                <strong>HQ Admin Authority:</strong> Only HQ Admin is authorized to register new hardware into inventory. A permanent registration log entry will be recorded in the device audit ledger.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRegisterModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  id="btn-submit-register-device"
                  type="submit"
                  className="bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Confirm Registration
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ASSIGN DEVICE MODAL */}
      {/* ========================================================================= */}
      {deviceToAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in select-none">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-brand-blue" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Assign Handset to Salesperson</h3>
                  <p className="text-[11px] font-mono text-slate-500">{deviceToAssign.assetId}</p>
                </div>
              </div>
              <button
                onClick={() => setDeviceToAssign(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {assignError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {assignError}
              </div>
            )}

            <form onSubmit={handleAssignSubmit} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="text-slate-500">
                  Model: <strong className="text-slate-800">{deviceToAssign.make} {deviceToAssign.model}</strong>
                </p>
                <p className="text-slate-500">
                  Serial Number: <strong className="font-mono text-slate-800">{deviceToAssign.serialNumber}</strong>
                </p>
                <p className="text-slate-500">
                  Market: <strong className="text-slate-800">{deviceToAssign.marketName}</strong>
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Salesperson Custodian *</label>
                <select
                  required
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-white font-medium focus:border-brand-blue"
                >
                  <option value="">-- Choose Sales Representative --</option>
                  {FIELD_SALESPEOPLE.filter((p) => p.marketCode === deviceToAssign.marketCode).map((rep) => {
                    const alreadyHasDevice = devices.some(
                      (d) =>
                        d.assignedSalespersonId === rep.id &&
                        (d.inventoryStatus === 'Active' || d.inventoryStatus === 'Assigned')
                    );
                    return (
                      <option key={rep.id} value={rep.id}>
                        {rep.name} ({rep.id}) {alreadyHasDevice ? '⚠️ Currently has active handset' : '✓ Unassigned'}
                      </option>
                    );
                  })}
                </select>
                <span className="text-[10px] text-slate-400">Rule: A salesperson cannot hold multiple active handsets simultaneously.</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assignment Rationale / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional notes regarding territory deployment..."
                  value={assignmentReason}
                  onChange={(e) => setAssignmentReason(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:border-brand-blue"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeviceToAssign(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!assigneeId}
                  className="bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Confirm Handover
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. REASSIGN DEVICE MODAL (WITH CONFIRMATION & MANDATORY REASON) */}
      {/* ========================================================================= */}
      {deviceToReassign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in select-none">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Reassign Company Handset</h3>
                  <p className="text-[11px] font-mono text-slate-500">{deviceToReassign.assetId}</p>
                </div>
              </div>
              <button
                onClick={() => setDeviceToReassign(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reassignError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {reassignError}
              </div>
            )}

            <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[11px] leading-relaxed">
              <strong>Custody Transfer Warning:</strong> This handset is currently assigned to{' '}
              <strong>{deviceToReassign.assignedSalespersonName}</strong>. Reassigning will revoke the current active session
              and log a chain-of-custody transfer in the permanent audit ledger.
            </div>

            <form onSubmit={handleReassignSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select New Salesperson Custodian *</label>
                <select
                  required
                  value={reassignSalespersonId}
                  onChange={(e) => setReassignSalespersonId(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-white font-medium focus:border-brand-blue"
                >
                  <option value="">-- Choose New Custodian --</option>
                  {FIELD_SALESPEOPLE.filter((p) => p.id !== deviceToReassign.assignedSalespersonId).map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name} ({rep.marketName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mandatory Reassignment Reason *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="State the administrative reason for transferring custody (e.g., territory reassignment, staff reallocation)..."
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:border-brand-blue"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeviceToReassign(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!reassignSalespersonId || !reassignReason.trim()}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                >
                  Confirm Custody Transfer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. LIFECYCLE STATUS UPDATE MODAL */}
      {/* ========================================================================= */}
      {deviceForStatusUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in select-none">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-brand-blue" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Update Device Lifecycle Status</h3>
                  <p className="text-[11px] font-mono text-slate-500">{deviceForStatusUpdate.assetId}</p>
                </div>
              </div>
              <button
                onClick={() => setDeviceForStatusUpdate(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {statusUpdateError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {statusUpdateError}
              </div>
            )}

            <form onSubmit={handleStatusUpdateSubmit} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="text-slate-500">
                  Current Status: <strong className="text-slate-900">{deviceForStatusUpdate.inventoryStatus}</strong>
                </p>
                <p className="text-slate-500">
                  Custodian: <strong className="text-slate-900">{deviceForStatusUpdate.assignedSalespersonName || 'Unassigned (Depot)'}</strong>
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">New Lifecycle Status *</label>
                <select
                  value={targetLifecycleStatus}
                  onChange={(e) => setTargetLifecycleStatus(e.target.value as DeviceInventoryStatus)}
                  className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-white font-medium focus:border-brand-blue"
                >
                  <option value="Available">Available (In Depot)</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Active">Active in Field</option>
                  <option value="Pending Inspection">Pending Inspection (Quarantined)</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="Lost/Stolen">Lost / Stolen (Revokes Knox License)</option>
                  <option value="Returned">Returned to Depot</option>
                  <option value="Revoked">Revoked</option>
                  <option value="Retired">Retired / Recycled (Permanent Decommission)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mandatory Status Change Reason *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="State the technical or administrative reason for this lifecycle transition..."
                  value={statusChangeReason}
                  onChange={(e) => setStatusChangeReason(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:border-brand-blue"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeviceForStatusUpdate(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!statusChangeReason.trim()}
                  className="bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Update Lifecycle
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. DEVICE AUDIT HISTORY TIMELINE MODAL */}
      {/* ========================================================================= */}
      {selectedDeviceForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in select-none">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-brand-blue" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Device Audit History & Custody Ledger</h3>
                  <p className="text-[11px] font-mono text-slate-500">
                    {selectedDeviceForHistory.assetId} • SN: {selectedDeviceForHistory.serialNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDeviceForHistory(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Make & Model:</span>
                  <span className="font-bold text-slate-800">{selectedDeviceForHistory.make} {selectedDeviceForHistory.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Inventory Status:</span>
                  <span>{getInventoryStatusBadge(selectedDeviceForHistory.inventoryStatus)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Security Authorization:</span>
                  <span>{getSecurityBadge(selectedDeviceForHistory.securityAuthorization)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Custodian:</span>
                  <span className="font-bold text-slate-800">
                    {selectedDeviceForHistory.assignedSalespersonName || 'Unassigned (In Depot)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Registered By:</span>
                  <span className="font-medium text-slate-700">{selectedDeviceForHistory.registeredBy} ({selectedDeviceForHistory.registeredAt})</span>
                </div>
              </div>

              <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Immutable Custody & Lifecycle Ledger ({selectedDeviceForHistory.history.length})
              </h4>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 relative before:absolute before:top-2 before:bottom-2 before:left-3 before:w-0.5 before:bg-slate-200">
                {selectedDeviceForHistory.history.map((entry, idx) => (
                  <div key={idx} className="relative pl-7 space-y-0.5 text-xs">
                    <span className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-brand-blue ring-4 ring-white" />
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{entry.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{entry.timestamp}</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-700">{entry.actorName}</span>{' '}
                      <span className="text-slate-400">({entry.actorRole})</span>
                    </div>
                    {entry.previousStatus && entry.newStatus && (
                      <p className="text-[10px] text-slate-500 font-medium">
                        Status Transition: <span className="font-mono text-slate-700">{entry.previousStatus}</span> → <span className="font-mono font-bold text-slate-900">{entry.newStatus}</span>
                      </p>
                    )}
                    {entry.assigneeName && (
                      <p className="text-[10px] text-blue-700 font-medium">
                        Custodian: <strong>{entry.assigneeName}</strong>
                      </p>
                    )}
                    {entry.reason && (
                      <div className="bg-slate-50 p-2 rounded text-[11px] text-slate-700 border border-slate-200/70 mt-1">
                        {entry.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDeviceForHistory(null)}
                className="text-xs"
              >
                Close Audit View
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. REPLACEMENT REQUEST AUDIT MODALS (Decoupled Replacement Steps) */}
      {/* ========================================================================= */}
      {/* 1. APPROVE REPLACEMENT MODAL */}
      {requestToApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in select-none">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Approve Device Replacement</h3>
                  <p className="text-[11px] font-mono text-slate-500">{requestToApprove.id} • {requestToApprove.companyDeviceAssetId}</p>
                </div>
              </div>
              <button
                onClick={() => setRequestToApprove(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="text-slate-500">
                  Salesperson: <strong className="text-slate-800">{requestToApprove.salespersonName}</strong> ({requestToApprove.marketName})
                </p>
                <p className="text-slate-500">
                  Defect Category: <strong className="text-slate-800">{getCategoryLabel(requestToApprove.issueCategory)}</strong>
                </p>
                <p className="text-slate-600 mt-1 italic">&quot;{requestToApprove.issueDescription}&quot;</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mandatory Approval Reason *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the technical reason for authorizing hardware replacement (e.g., sensor failure confirmed, screen digitizer fault impedes check-in)..."
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                />
              </div>

              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-slate-700 text-[11px] leading-relaxed">
                <strong>PRD Governance Rule:</strong> Approving transitions status to <em>Approved</em>. Spare handset allocation, dispatch, and MDM activation will follow as distinct audit steps.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRequestToApprove(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!approvalReason.trim()}
                  onClick={handleConfirmApprove}
                  className="bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Confirm Approval
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. REJECT REPLACEMENT MODAL */}
      {requestToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in select-none">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Reject Device Replacement Request</h3>
                  <p className="text-[11px] font-mono text-slate-500">{requestToReject.id} • {requestToReject.companyDeviceAssetId}</p>
                </div>
              </div>
              <button
                onClick={() => setRequestToReject(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="text-slate-500">
                  Salesperson: <strong className="text-slate-800">{requestToReject.salespersonName}</strong> ({requestToReject.marketName})
                </p>
                <p className="text-slate-500">
                  Reported Issue: <strong className="text-slate-800">{getCategoryLabel(requestToReject.issueCategory)}</strong>
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mandatory Rejection Reason *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="State why this replacement request is rejected (e.g. cosmetic wear only, hardware passes remote diagnostics)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200 text-rose-900 text-[11px] leading-relaxed">
                <strong>Mandatory Audit Trail:</strong> The rejection rationale will be logged immutably and displayed to the salesperson under <em>Profile → My Device</em>.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRequestToReject(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!rejectionReason.trim()}
                  onClick={handleConfirmReject}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. ASSIGN SPARE DEVICE MODAL */}
      {requestToAssignSpare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in select-none">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Allocate Spare Handset from Depot</h3>
                  <p className="text-[11px] font-mono text-slate-500">{requestToAssignSpare.id} • {requestToAssignSpare.marketName}</p>
                </div>
              </div>
              <button
                onClick={() => setRequestToAssignSpare(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="text-slate-500">
                  Recipient Salesperson: <strong className="text-slate-800">{requestToAssignSpare.salespersonName}</strong>
                </p>
                <p className="text-slate-500">
                  Defective Handset: <strong className="font-mono text-slate-800">{requestToAssignSpare.companyDeviceAssetId}</strong> ({requestToAssignSpare.deviceModel})
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Select Available Handset from IT Depot Inventory *</label>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {devices
                    .filter((d) => d.inventoryStatus === 'Available' || d.inventoryStatus === 'Returned')
                    .map((spare) => (
                      <label
                        key={spare.assetId}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all',
                          selectedSpareAssetId === spare.assetId
                            ? 'border-indigo-600 bg-indigo-50/50'
                            : 'border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="spare_selection"
                            value={spare.assetId}
                            checked={selectedSpareAssetId === spare.assetId}
                            onChange={() => setSelectedSpareAssetId(spare.assetId)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900">{spare.assetId}</span>
                              <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded font-semibold text-slate-700">
                                {spare.marketCode} Depot
                              </span>
                            </div>
                            <span className="text-slate-600 text-[11px] block">{spare.make} {spare.model}</span>
                            <span className="text-[10px] text-slate-400 font-mono">SN: {spare.serialNumber} • {spare.marketName}</span>
                          </div>
                        </div>
                      </label>
                    ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRequestToAssignSpare(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!selectedSpareAssetId}
                  onClick={handleConfirmAssignSpare}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  Assign Spare Handset
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. DISPATCH REPLACEMENT MODAL */}
      {requestToDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in select-none">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Record Device Dispatch / Handover</h3>
                  <p className="text-[11px] font-mono text-slate-500">{requestToDispatch.id}</p>
                </div>
              </div>
              <button
                onClick={() => setRequestToDispatch(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="text-slate-500">
                  Recipient Salesperson: <strong className="text-slate-800">{requestToDispatch.salespersonName}</strong>
                </p>
                <p className="text-slate-500">
                  Replacement Asset: <strong className="font-mono text-slate-800">{requestToDispatch.replacementDeviceAssetId}</strong>
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dispatch Waybill & Logistics Notes *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter courier company, waybill number, or depot physical handover details..."
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-purple-50/70 border border-purple-200 text-purple-900 text-[11px] leading-relaxed">
                Marks handset as in transit. The salesperson will see the dispatched status and waybill under <em>Profile → My Device</em>.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRequestToDispatch(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!dispatchNotes.trim()}
                  onClick={handleConfirmDispatch}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                >
                  Confirm Dispatch
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. ACTIVATION & OLD DEVICE DISPOSITION MODAL */}
      {requestToActivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in select-none">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                  <RotateCw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Confirm Activation & Disposition</h3>
                  <p className="text-[11px] font-mono text-slate-500">{requestToActivate.id}</p>
                </div>
              </div>
              <button
                onClick={() => setRequestToActivate(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="text-slate-500">
                  Salesperson: <strong className="text-slate-800">{requestToActivate.salespersonName}</strong>
                </p>
                <p className="text-slate-500">
                  New Handset: <strong className="font-mono text-slate-800">{requestToActivate.replacementDeviceAssetId}</strong>
                </p>
                <p className="text-slate-500">
                  Original Handset: <strong className="font-mono text-slate-800">{requestToActivate.companyDeviceAssetId}</strong>
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Select Original Handset Disposition *</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="disposition"
                      value="returned_to_depot"
                      checked={oldDeviceDisposition === 'returned_to_depot'}
                      onChange={() => setOldDeviceDisposition('returned_to_depot')}
                      className="mt-0.5 text-cyan-600"
                    />
                    <div>
                      <strong className="text-slate-900 block">Return to IT Depot</strong>
                      <span className="text-[11px] text-slate-500">Handset returned to country IT logistics depot for diagnostic repair or parts salvage.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="disposition"
                      value="quarantined"
                      checked={oldDeviceDisposition === 'quarantined'}
                      onChange={() => setOldDeviceDisposition('quarantined')}
                      className="mt-0.5 text-cyan-600"
                    />
                    <div>
                      <strong className="text-slate-900 block">Quarantine for Investigation</strong>
                      <span className="text-[11px] text-slate-500">Place handset in IT security quarantine for sensor inspection.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="disposition"
                      value="revoked"
                      checked={oldDeviceDisposition === 'revoked'}
                      onChange={() => setOldDeviceDisposition('revoked')}
                      className="mt-0.5 text-cyan-600"
                    />
                    <div>
                      <strong className="text-slate-900 block">Revoke & Remote Wipe (Lost/Stolen)</strong>
                      <span className="text-[11px] text-slate-500">Trigger immediate Samsung Knox MDM remote wipe and decommission asset license.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRequestToActivate(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmActivation}
                  className="bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-semibold"
                >
                  Confirm Activation & Disposition
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. REPLACEMENT REQUEST HISTORY MODAL */}
      {selectedRequestForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in select-none">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {selectedRequestForHistory.id} Audit History
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {selectedRequestForHistory.companyDeviceAssetId} • Custodian: {selectedRequestForHistory.salespersonName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRequestForHistory(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 relative before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-0.5 before:bg-slate-200">
              {selectedRequestForHistory.history.map((entry, idx) => (
                <div key={idx} className="relative pl-8 space-y-0.5 text-xs">
                  <span className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-brand-blue ring-4 ring-white" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{entry.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{entry.timestamp}</span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-700">{entry.actorName}</span>{' '}
                    <span className="text-slate-400 font-medium">({entry.actorRole})</span>
                  </div>
                  {entry.notes && (
                    <div className="bg-slate-50 p-2 rounded text-[11px] text-slate-700 border border-slate-200/70 mt-1">
                      {entry.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedRequestForHistory(null)}
                className="text-xs"
              >
                Close Audit History
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
