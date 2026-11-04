import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Camera,
  Info,
  Loader2,
  Compass,
  FileText,
  X,
  AlertOctagon,
  Eye,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  adminService,
  HqClientRecord,
  EditClientPayload,
} from '@/services/adminService';
import { ApprovalDecisionModal, ApprovalItem } from '@/features/review/ApprovalDecisionModal';
import { useMarketConfig } from '@/context/MarketConfigContext';
import { MarketCode } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export const HqClientDirectory: React.FC = () => {
  const { getActiveMarketRules } = useMarketConfig();
  const [clients, setClients] = useState<HqClientRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMarket, setSelectedMarket] = useState<'ALL' | 'NG' | 'ZM' | 'MW'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(3);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modals state
  const [editingClient, setEditingClient] = useState<HqClientRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [deletingClient, setDeletingClient] = useState<HqClientRecord | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deleteReason, setDeleteReason] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<{ url: string; title: string } | null>(null);

  // Pin Approval Modal state
  const [pinApprovalItem, setPinApprovalItem] = useState<ApprovalItem | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);

  // Edit form state
  const [editForm, setEditForm] = useState<{
    organisationName: string;
    branchName: string;
    category: string;
    streetAddress: string;
    city: string;
    switchboardPhone: string;
    contactName: string;
    contactRole: string;
    contactPhone: string;
    contactEmail: string;
    reason: string;
  }>({
    organisationName: '',
    branchName: '',
    category: 'logistics',
    streetAddress: '',
    city: '',
    switchboardPhone: '',
    contactName: '',
    contactRole: '',
    contactPhone: '',
    contactEmail: '',
    reason: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await adminService.getAllClients(
        selectedMarket === 'ALL' ? undefined : selectedMarket,
        selectedStatus === 'all' ? undefined : selectedStatus
      );

      if (fetchErr) {
        setError(fetchErr.message);
      } else {
        setClients(data || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load client directory');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMarket, selectedStatus]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter((c) => c.operatingStatus === 'active').length;
    const pending = clients.filter(
      (c) =>
        c.operatingStatus === 'pending_approval' ||
        c.locationPin?.status === 'pending_review' ||
        c.locationPin?.status === 'pending_approval'
    ).length;
    const locPending = clients.filter((c) => c.operatingStatus === 'location_pending').length;
    const inactiveOrRejected = clients.filter(
      (c) => c.operatingStatus === 'inactive' || c.operatingStatus === 'rejected'
    ).length;
    return { total, active, pending, locPending, inactiveOrRejected };
  }, [clients]);

  // Distinct salespeople / creators
  const distinctUsers = useMemo(() => {
    const userMap = new Map<string, { id: string; name: string }>();
    clients.forEach((c) => {
      if (c.creator?.fullName) {
        userMap.set(c.creator.fullName, {
          id: c.creator.id || c.createdBy || c.creator.fullName,
          name: c.creator.fullName,
        });
      } else if (c.createdBy) {
        userMap.set(c.createdBy, {
          id: c.createdBy,
          name: c.createdBy,
        });
      }
    });
    return Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  // Filtered clients list
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // Market filter
      if (selectedMarket !== 'ALL' && c.marketCode !== selectedMarket) return false;

      // Status filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'pending_approval') {
          const isPending =
            c.operatingStatus === 'pending_approval' ||
            c.locationPin?.status === 'pending_review' ||
            c.locationPin?.status === 'pending_approval';
          if (!isPending) return false;
        } else if (c.operatingStatus !== selectedStatus) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && c.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      // User / Salesperson filter
      if (selectedUser !== 'all') {
        const matchesUser =
          c.creator?.fullName === selectedUser ||
          c.creator?.id === selectedUser ||
          c.createdBy === selectedUser;
        if (!matchesUser) return false;
      }

      // Date filter (Registration date)
      if (selectedDate) {
        const regDate = c.createdAt ? c.createdAt.slice(0, 10) : '';
        if (regDate !== selectedDate) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const orgMatch = c.organisationName.toLowerCase().includes(q);
        const branchMatch = c.branchName.toLowerCase().includes(q);
        const addressMatch = (c.streetAddress || '').toLowerCase().includes(q) || (c.city || '').toLowerCase().includes(q);
        const contactMatch =
          (c.primaryContact?.fullName || '').toLowerCase().includes(q) ||
          (c.primaryContact?.phoneNumber || '').toLowerCase().includes(q) ||
          (c.primaryContact?.email || '').toLowerCase().includes(q);
        const phoneMatch = (c.switchboardPhone || '').toLowerCase().includes(q);
        if (!orgMatch && !branchMatch && !addressMatch && !contactMatch && !phoneMatch) {
          return false;
        }
      }

      return true;
    });
  }, [clients, selectedMarket, selectedStatus, selectedCategory, selectedUser, selectedDate, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClients.slice(start, start + pageSize);
  }, [filteredClients, currentPage, pageSize]);

  // Handle Edit Click
  const handleOpenEdit = (client: HqClientRecord) => {
    setEditingClient(client);
    setEditForm({
      organisationName: client.organisationName,
      branchName: client.branchName,
      category: client.category || 'logistics',
      streetAddress: client.streetAddress || '',
      city: client.city || '',
      switchboardPhone: client.switchboardPhone || '',
      contactName: client.primaryContact?.fullName || '',
      contactRole: client.primaryContact?.designation || '',
      contactPhone: client.primaryContact?.phoneNumber || client.switchboardPhone || '',
      contactEmail: client.primaryContact?.email || '',
      reason: '',
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit
  const handleSaveEdit = async () => {
    if (!editingClient) return;
    if (!editForm.organisationName.trim() || !editForm.branchName.trim() || !editForm.streetAddress.trim()) {
      showToast('error', 'Company name, branch name, and street address are required.');
      return;
    }
    if (!editForm.reason.trim()) {
      showToast('error', 'Mandatory administrative reason is required for enterprise audit logging.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const payload: EditClientPayload = {
        branchId: editingClient.id,
        organisationId: editingClient.organisationId,
        organisationName: editForm.organisationName.trim(),
        branchName: editForm.branchName.trim(),
        category: editForm.category,
        streetAddress: editForm.streetAddress.trim(),
        city: editForm.city.trim() || editingClient.city || 'Lagos',
        switchboardPhone: editForm.switchboardPhone.trim(),
        contactId: editingClient.primaryContact?.id,
        contactName: editForm.contactName.trim(),
        contactRole: editForm.contactRole.trim(),
        contactPhone: editForm.contactPhone.trim(),
        contactEmail: editForm.contactEmail.trim() || undefined,
        reason: editForm.reason.trim(),
      };

      const res = await adminService.updateClientBranch(payload);
      if (res.error) {
        showToast('error', res.error.message);
      } else {
        showToast('success', `Client details for "${editForm.branchName}" updated successfully.`);
        setIsEditModalOpen(false);
        setEditingClient(null);
        await loadClients();
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to update client details.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Delete Click
  const handleOpenDelete = (client: HqClientRecord) => {
    setDeletingClient(client);
    setDeleteReason('');
    setIsDeleteModalOpen(true);
  };

  // Submit Delete or Deactivate
  const handleConfirmDelete = async () => {
    if (!deletingClient) return;
    setIsDeleting(true);
    try {
      const res = await adminService.deleteClientBranch(
        deletingClient.id,
        deleteReason.trim() || 'Deleted by HQ Administrator'
      );

      if (res.hasHistory) {
        // Offer or perform deactivation
        showToast(
          'error',
          'Site has historical visits/exceptions and cannot be permanently erased. Marking as Inactive instead.'
        );
        const deactRes = await adminService.deactivateClientBranch(
          deletingClient.id,
          deleteReason.trim() || 'Decommissioned by HQ Admin due to operational history'
        );
        if (deactRes.error) {
          showToast('error', deactRes.error.message);
        } else {
          showToast('info', `Branch "${deletingClient.branchName}" has been safely decommissioned (Inactive).`);
          setIsDeleteModalOpen(false);
          setDeletingClient(null);
          await loadClients();
        }
      } else if (res.error) {
        showToast('error', res.error.message);
      } else {
        showToast('success', `Client site "${deletingClient.branchName}" permanently removed from registry.`);
        setIsDeleteModalOpen(false);
        setDeletingClient(null);
        await loadClients();
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete client site.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Pin Approval Modal Open
  const handleOpenPinReview = (client: HqClientRecord) => {
    if (!client.locationPin) return;
    const clientMarket = (client.marketCode as MarketCode) || 'NG';
    const clientRules = getActiveMarketRules(clientMarket);
    const maxPinThreshold = clientRules?.maxProposedPinGpsAccuracyMeters || 50;

    const item: ApprovalItem = {
      id: client.locationPin.id,
      type: 'pin_approval',
      title: `${client.organisationName} — ${client.branchName}`,
      subtitle: `${client.streetAddress}, ${client.city}`,
      repName: client.creator?.fullName || 'Field Salesperson',
      claimedTime: new Date(client.locationPin.proposedAt).toLocaleString(),
      accuracy: `±${client.locationPin.reportedAccuracyM}m (Threshold: ≤${maxPinThreshold}m)`,
      evidenceNote: `Coordinates: ${client.locationPin.latitude.toFixed(6)}°, ${client.locationPin.longitude.toFixed(6)}°. Category: ${client.category}. Contact: ${client.primaryContact?.fullName || 'N/A'} (${client.primaryContact?.phoneNumber || 'N/A'})`,
      premisesPhotoUrl: client.locationPin.premisesPhotoUrl || undefined,
      sharedPhoneWarning: client.switchboardPhone === client.primaryContact?.phoneNumber,
    };
    setPinApprovalItem(item);
    setIsPinModalOpen(true);
  };

  // Submit Pin Review Decision
  const handlePinDecision = async (
    pinId: string,
    decision: 'approved' | 'rejected' | 'escalated',
    reason: string
  ) => {
    try {
      const action = decision === 'approved' ? 'approved' : 'rejected';
      const res = await adminService.reviewBranchLocationPin(pinId, action, reason);
      if (res.error) {
        showToast('error', res.error.message);
      } else {
        showToast(
          'success',
          `Location pin ${decision === 'approved' ? 'approved & activated' : 'rejected'} successfully.`
        );
        await loadClients();
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to submit review decision.');
    }
  };

  const getMarketFlag = (code: string) => {
    switch (code) {
      case 'NG':
        return '🇳🇬 Nigeria';
      case 'ZM':
        return '🇿🇲 Zambia';
      case 'MW':
        return '🇲🇼 Malawi';
      default:
        return code;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Active Site
          </span>
        );
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending Approval
          </span>
        );
      case 'location_pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Compass className="w-3 h-3 text-blue-600" />
            Location Pending
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" />
            Rejected
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <AlertOctagon className="w-3 h-3 text-slate-500" />
            Inactive / Decommissioned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-50 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-200',
            toastMessage.type === 'success' && 'bg-emerald-50 border-emerald-300 text-emerald-900',
            toastMessage.type === 'error' && 'bg-red-50 border-red-300 text-red-900',
            toastMessage.type === 'info' && 'bg-blue-50 border-blue-300 text-blue-900'
          )}
        >
          {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
          {toastMessage.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />}
          {toastMessage.type === 'info' && <Info className="w-5 h-5 text-blue-600 shrink-0" />}
          <span className="text-xs font-semibold">{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-auto text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-50 text-brand-blue border border-blue-100">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Clients & Sites Directory</h2>
              <p className="text-xs text-slate-500">
                Authoritative multi-market registry of corporate accounts, physical branches, site contacts, and location pins.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadClients}
            disabled={isLoading}
            className="text-xs font-bold gap-1.5 h-9"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
            Refresh Directory
          </Button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Sites</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Across NG, ZM, and MW</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Active & Approved</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{stats.active}</div>
          <div className="text-[10px] text-emerald-600/80 mt-0.5">Verified geofence active</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pending Review</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{stats.pending}</div>
          <div className="text-[10px] text-amber-600/80 mt-0.5">Requires manager/HQ action</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Location Pending</div>
          <div className="text-2xl font-black text-blue-700 mt-1">{stats.locPending}</div>
          <div className="text-[10px] text-blue-600/80 mt-0.5">Awaiting on-site field fix</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inactive / Rejected</div>
          <div className="text-2xl font-black text-slate-700 mt-1">{stats.inactiveOrRejected}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Decommissioned or rejected</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        {/* Market Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> Market:
          </span>
          {[
            { code: 'ALL', label: 'All Markets' },
            { code: 'NG', label: '🇳🇬 Nigeria' },
            { code: 'ZM', label: '🇿🇲 Zambia' },
            { code: 'MW', label: '🇲🇼 Malawi' },
          ].map((m) => (
            <button
              key={m.code}
              onClick={() => setSelectedMarket(m.code as any)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                selectedMarket === m.code
                  ? 'bg-brand-blue text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Secondary Filters & Search Bar */}
        <div className="space-y-3">
          {/* Row 1: Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              type="text"
              placeholder="Search company, branch, address, contact name, or phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 text-xs h-9 bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Row 2: 4-Column Grid (Status, Category, Salesperson, Date) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 text-xs rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-brand-blue/20"
              >
                <option value="all">All Operational Statuses</option>
                <option value="active">Active & Approved Sites</option>
                <option value="pending_approval">Pending Manager Approval</option>
                <option value="location_pending">Location Pending</option>
                <option value="rejected">Rejected Registrations</option>
                <option value="inactive">Inactive / Decommissioned</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Facility Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 text-xs rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-brand-blue/20"
              >
                <option value="all">All Facility Categories</option>
                <option value="logistics">Logistics & Freight</option>
                <option value="fleet_operator">Fleet Operator</option>
                <option value="workshop">Maintenance Workshop</option>
                <option value="retail">Retail Station / Outlet</option>
                <option value="dealer">Dealership</option>
                <option value="distributor">Distributor Hub</option>
                <option value="other">Other Commercial</option>
              </select>
            </div>

            {/* User / Salesperson Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" /> Salesperson / Rep
              </label>
              <select
                value={selectedUser}
                onChange={(e) => {
                  setSelectedUser(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 text-xs rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-brand-blue/20"
              >
                <option value="all">All Salespeople ({distinctUsers.length})</option>
                {distinctUsers.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> Registered Date
              </label>
              <div className="relative flex items-center">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 text-xs pr-7 bg-white"
                  title="Filter by registration date"
                />
                {selectedDate && (
                  <button
                    onClick={() => {
                      setSelectedDate('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5"
                    title="Clear date filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main List Table / Cards */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-brand-blue animate-spin mx-auto" />
          <div className="text-sm font-bold text-slate-700">Loading client and branch records...</div>
          <div className="text-xs text-slate-400">Querying real Supabase organisations, branches, and location pins.</div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
          <div className="text-sm font-bold text-red-900">Failed to load client directory</div>
          <div className="text-xs text-red-600">{error}</div>
          <Button variant="outline" size="sm" onClick={loadClients} className="text-xs font-bold mt-2">
            Try Again
          </Button>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
          <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
          <div className="text-sm font-bold text-slate-700">No client sites match your criteria</div>
          <div className="text-xs text-slate-400">
            {searchQuery
              ? `No results found for "${searchQuery}". Try adjusting your search or filters.`
              : 'No client records found matching the active filters.'}
          </div>
          {(searchQuery ||
            selectedMarket !== 'ALL' ||
            selectedStatus !== 'all' ||
            selectedCategory !== 'all' ||
            selectedUser !== 'all' ||
            selectedDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedMarket('ALL');
                setSelectedStatus('all');
                setSelectedCategory('all');
                setSelectedUser('all');
                setSelectedDate('');
                setCurrentPage(1);
              }}
              className="text-xs font-bold mt-2"
            >
              Reset All Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Top Pagination & Stats Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="text-xs font-medium text-slate-600">
              Showing <strong className="text-slate-900 font-bold">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-slate-900 font-bold">
                {Math.min(currentPage * pageSize, filteredClients.length)}
              </strong>{' '}
              of <strong className="text-slate-900 font-bold">{filteredClients.length}</strong> client sites
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
              {/* Rows Per Page */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                <span>Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-brand-blue"
                >
                  <option value={3}>3 per page</option>
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>

              {/* Prev / Page / Next */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="h-8 px-2.5 text-xs font-semibold gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </Button>
                <span className="px-2 font-semibold text-slate-700 whitespace-nowrap text-xs">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="h-8 px-2.5 text-xs font-semibold gap-1"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Cards List (rendering paginated clients) */}
          <div className="grid grid-cols-1 gap-3.5">
            {paginatedClients.map((client) => {
              const hasPendingPin =
                client.operatingStatus === 'pending_approval' ||
                client.locationPin?.status === 'pending_review' ||
                client.locationPin?.status === 'pending_approval';

              const clientMarket = (client.marketCode as MarketCode) || 'NG';
              const clientRules = getActiveMarketRules(clientMarket);
              const maxPinUncertainty = clientRules?.maxProposedPinGpsAccuracyMeters || 50;

              const accuracyValid =
                client.locationPin?.reportedAccuracyM !== undefined &&
                client.locationPin.reportedAccuracyM <= maxPinUncertainty;

              return (
                <Card
                  key={client.id}
                  className={cn(
                    'overflow-hidden border transition-all hover:shadow-md bg-white',
                    hasPendingPin ? 'border-amber-200/90 ring-1 ring-amber-100' : 'border-slate-200'
                  )}
                >
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* Top Row: Company, Branch, Status, Market */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-black uppercase tracking-wider text-brand-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {client.organisationName}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded">
                            {client.category.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                            {getMarketFlag(client.marketCode)}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                          {client.branchName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {client.streetAddress}
                            {client.city ? `, ${client.city}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        {getStatusBadge(client.operatingStatus)}
                      </div>
                    </div>

                    {/* Middle Section: 3-column breakdown (Contact, GPS Pin, Photo) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
                      {/* Column 1: Primary Site Contact */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" /> Site Contact Person
                        </div>
                        {client.primaryContact ? (
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {client.primaryContact.fullName}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {client.primaryContact.designation || 'Facility Contact'}
                            </div>
                            <div className="text-[11px] text-brand-blue font-bold flex items-center gap-1 mt-1">
                              <Phone className="w-3 h-3" />
                              {client.primaryContact.phoneNumber}
                            </div>
                            {client.primaryContact.email && (
                              <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3" />
                                {client.primaryContact.email}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic">No contact registered</div>
                        )}
                        {client.switchboardPhone && (
                          <div className="text-[10px] text-slate-400 mt-1">
                            Switchboard: <span className="font-semibold text-slate-600">{client.switchboardPhone}</span>
                          </div>
                        )}
                      </div>

                      {/* Column 2: GPS Location Pin */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" /> Proposed / Active Location Pin
                        </div>
                        {client.locationPin ? (
                          <div>
                            <div className="text-xs font-mono font-bold text-slate-800">
                              {client.locationPin.latitude.toFixed(5)}° N, {client.locationPin.longitude.toFixed(5)}° E
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span
                                className={cn(
                                  'text-[10px] font-bold px-1.5 py-0.5 rounded',
                                  accuracyValid
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                )}
                              >
                                Fix Accuracy: ±{client.locationPin.reportedAccuracyM}m
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                (≤{maxPinUncertainty}m req.)
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                              <span>Pin Status:</span>
                              <span
                                className={cn(
                                  'font-bold',
                                  client.locationPin.status === 'approved'
                                    ? 'text-emerald-600'
                                    : client.locationPin.status === 'rejected'
                                    ? 'text-red-600'
                                    : 'text-amber-600'
                                )}
                              >
                                {client.locationPin.status === 'approved'
                                  ? 'Approved on-site pin'
                                  : client.locationPin.status === 'rejected'
                                  ? 'Pin rejected'
                                  : 'Pending manager review'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic flex items-center gap-1 mt-1">
                            <Compass className="w-3.5 h-3.5 text-blue-500" />
                            <span>No GPS pin registered yet (Location Pending)</span>
                          </div>
                        )}
                      </div>

                      {/* Column 3: Live Premises Photo */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Camera className="w-3 h-3 text-slate-400" /> Live Premises Photograph
                        </div>
                        {client.locationPin?.premisesPhotoUrl ? (
                          <div className="flex items-center gap-2.5">
                            <div
                              onClick={() =>
                                setPreviewPhotoUrl({
                                  url: client.locationPin!.premisesPhotoUrl!,
                                  title: `${client.organisationName} — ${client.branchName}`,
                                })
                              }
                              className="relative w-16 h-14 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 cursor-pointer group shadow-2xs shrink-0"
                            >
                              <img
                                src={client.locationPin.premisesPhotoUrl}
                                alt="Premises"
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] font-bold text-slate-700">Photo Registered</div>
                              <button
                                onClick={() =>
                                  setPreviewPhotoUrl({
                                    url: client.locationPin!.premisesPhotoUrl!,
                                    title: `${client.organisationName} — ${client.branchName}`,
                                  })
                                }
                                className="text-[10px] font-bold text-brand-blue hover:underline flex items-center gap-1 mt-0.5"
                              >
                                View full photo <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic">No premises photo attached</div>
                        )}
                      </div>
                    </div>

                    {/* Metadata & Submitting Rep Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {client.creator && (
                          <span>
                            Submitted by: <span className="font-semibold text-slate-700">{client.creator.fullName}</span>
                          </span>
                        )}
                        <span>•</span>
                        <span>
                          Registered: {new Date(client.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Manager Audit Rationale pill if reviewed */}
                      {client.locationPin?.decisionReason && (
                        <div className="bg-emerald-50/80 px-2 py-0.5 rounded text-[10px] font-medium text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Review: "{client.locationPin.decisionReason}"</span>
                          {client.locationPin.reviewerName && (
                            <span className="text-emerald-700 font-bold">({client.locationPin.reviewerName})</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Bar (Sales Head Actions + Edit/Delete for HQ Admin) */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      {/* Action 1: Pin Approval / Rejection (Sales Head & HQ Admin) */}
                      {client.locationPin && (
                        <Button
                          variant={hasPendingPin ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleOpenPinReview(client)}
                          className={cn(
                            'text-xs font-bold gap-1.5 h-8',
                            hasPendingPin
                              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                              : 'text-slate-700 hover:bg-slate-100'
                          )}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {hasPendingPin ? 'Review Pin Proposal' : 'Re-audit Location Pin'}
                        </Button>
                      )}

                      {/* Action 2: Edit Client / Branch Details */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(client)}
                        className="text-xs font-bold gap-1.5 h-8 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        Edit Details
                      </Button>

                      {/* Action 3: Delete Client / Branch Site */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDelete(client)}
                        className="text-xs font-bold gap-1.5 h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200/80"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        Delete Site
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Bottom Pagination Controls */}
          {filteredClients.length > 0 && (
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs mt-4">
              <div className="text-xs font-medium text-slate-600">
                Showing <strong className="text-slate-900 font-bold">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                <strong className="text-slate-900 font-bold">
                  {Math.min(currentPage * pageSize, filteredClients.length)}
                </strong>{' '}
                of <strong className="text-slate-900 font-bold">{filteredClients.length}</strong> client sites
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                  <span>Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-brand-blue"
                  >
                    <option value={3}>3 per page</option>
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="h-8 px-2.5 text-xs font-semibold gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Previous
                  </Button>
                  <span className="px-2 font-semibold text-slate-700 whitespace-nowrap text-xs">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="h-8 px-2.5 text-xs font-semibold gap-1"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: EDIT CLIENT DETAILS                                   */}
      {/* ============================================================== */}
      {isEditModalOpen && editingClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-100 text-brand-blue">
                  <Edit2 className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Edit Client & Site Details</h3>
                  <p className="text-[11px] text-slate-500">Correct typos or update contact info for enterprise records</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Company Name */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700">Company / Organisation Name *</label>
                  <Input
                    type="text"
                    value={editForm.organisationName}
                    onChange={(e) => setEditForm({ ...editForm, organisationName: e.target.value })}
                    placeholder="e.g. Dangote Haulage Ltd"
                    className="text-xs h-9"
                  />
                </div>

                {/* Branch Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Branch / Site Name *</label>
                  <Input
                    type="text"
                    value={editForm.branchName}
                    onChange={(e) => setEditForm({ ...editForm, branchName: e.target.value })}
                    placeholder="e.g. Apapa Commercial Depot"
                    className="text-xs h-9"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Facility Category *</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full h-9 text-xs rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700"
                  >
                    <option value="logistics">Logistics & Freight</option>
                    <option value="fleet_operator">Fleet Operator</option>
                    <option value="workshop">Maintenance Workshop</option>
                    <option value="retail">Retail Station / Outlet</option>
                    <option value="dealer">Dealership</option>
                    <option value="distributor">Distributor Hub</option>
                    <option value="other">Other Commercial</option>
                  </select>
                </div>

                {/* Street Address */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700">Street Address & Landmark *</label>
                  <Input
                    type="text"
                    value={editForm.streetAddress}
                    onChange={(e) => setEditForm({ ...editForm, streetAddress: e.target.value })}
                    placeholder="e.g. 14 Wharf Road, Apapa, Lagos"
                    className="text-xs h-9"
                  />
                </div>

                {/* City */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">City / Town</label>
                  <Input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    placeholder="e.g. Lagos"
                    className="text-xs h-9"
                  />
                </div>

                {/* Switchboard Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Switchboard Telephone</label>
                  <Input
                    type="text"
                    value={editForm.switchboardPhone}
                    onChange={(e) => setEditForm({ ...editForm, switchboardPhone: e.target.value })}
                    placeholder="e.g. +234 1 270 5000"
                    className="text-xs h-9"
                  />
                </div>
              </div>

              {/* Primary Contact Details */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-brand-blue" />
                  Primary Site Contact Person
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Contact Full Name</label>
                    <Input
                      type="text"
                      value={editForm.contactName}
                      onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                      placeholder="e.g. Alhaji Musa Garba"
                      className="text-xs h-8 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Designation / Role</label>
                    <Input
                      type="text"
                      value={editForm.contactRole}
                      onChange={(e) => setEditForm({ ...editForm, contactRole: e.target.value })}
                      placeholder="e.g. Head of Fleet Operations"
                      className="text-xs h-8 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Contact Direct Phone</label>
                    <Input
                      type="text"
                      value={editForm.contactPhone}
                      onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                      placeholder="e.g. +234 803 777 8888"
                      className="text-xs h-8 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Contact Email Address</label>
                    <Input
                      type="email"
                      value={editForm.contactEmail}
                      onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                      placeholder="e.g. contact@company.com"
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Mandatory Audit Rationale */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Mandatory Audit Rationale *
                </label>
                <textarea
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  placeholder="State the reason for this administrative correction (e.g. 'Corrected company name typo reported by rep; verified contact telephone with site manager')."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-brand-blue/20 resize-none font-medium text-slate-800"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSavingEdit}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="text-xs font-bold bg-brand-blue hover:bg-blue-700 text-white gap-1.5"
              >
                {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Save Corrections
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: DELETE CLIENT SITE CONFIRMATION                       */}
      {/* ============================================================== */}
      {isDeleteModalOpen && deletingClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-red-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-red-50 border-b border-red-100 flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-xl text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-red-900 text-sm">Delete Client Site</h3>
                <p className="text-[11px] text-red-700">Permanent removal of branch registration</p>
              </div>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-600">
              <p>
                Are you sure you want to delete <strong className="text-slate-900 font-bold">{deletingClient.branchName}</strong> under <strong className="text-slate-900 font-bold">{deletingClient.organisationName}</strong>?
              </p>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>Audit Compliance Notice:</strong> If this site has existing visit records or salesperson exceptions, it cannot be deleted to preserve enterprise history; it will be marked as <em>Inactive (Decommissioned)</em> instead.
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Reason for Deletion / Deactivation *</label>
                <Input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Erroneous test entry registered by salesperson"
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white gap-1.5"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Confirm Deletion
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: FULL PREMISES PHOTO PREVIEW                           */}
      {/* ============================================================== */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div
            className="bg-slate-900 rounded-2xl overflow-hidden max-w-2xl w-full border border-slate-800 shadow-2xl space-y-2 p-3 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 px-2">
              <div className="font-bold text-xs truncate">{previewPhotoUrl.title}</div>
              <button
                onClick={() => setPreviewPhotoUrl(null)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-hidden rounded-lg flex items-center justify-center bg-black">
              <img
                src={previewPhotoUrl.url}
                alt={previewPhotoUrl.title}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
            <div className="text-[11px] text-slate-400 text-center pt-1">
              Live physical premises photo captured on-site during salesperson registration.
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: PIN APPROVAL DECISION MODAL (Sales Head & HQ Admin)    */}
      {/* ============================================================== */}
      {isPinModalOpen && pinApprovalItem && (
        <ApprovalDecisionModal
          item={pinApprovalItem}
          isOpen={isPinModalOpen}
          onClose={() => {
            setIsPinModalOpen(false);
            setPinApprovalItem(null);
          }}
          onDecision={handlePinDecision}
        />
      )}
    </div>
  );
};
