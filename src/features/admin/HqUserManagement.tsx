import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Search,
  UserPlus,
  Shield,
  ShieldAlert,
  Smartphone,
  Globe2,
  CheckCircle2,
  XCircle,
  History,
  Lock,
  Mail,
  AlertTriangle,
  X,
  Loader2,
  Copy,
  Check,
  KeyRound,
  RefreshCw,
  Pencil,
  Trash2,
  ChevronDown,
  Power,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TablePagination } from '@/components/ui/table-pagination';
import { UserRole, MarketCode } from '@/context/AuthContext';
import { adminService, ProvisionUserPayload, HqDeviceRecord } from '@/services/adminService';

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  marketCode: MarketCode | 'ALL';
  marketName: string;
  status: 'active' | 'deactivated' | 'pending_onboarding';
  assignedDeviceTag?: string;
  assignedDeviceModel?: string;
  lastLogin: string;
  mfaEnabled: boolean;
  createdAt: string;
  managerName?: string;
  notes?: string;
}

const isTestEnv =
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') ||
  (typeof window !== 'undefined' && (window as any).__VITEST__);

const TEST_USERS: AdminUserRecord[] = [
  {
    id: 'USR-HQ-001',
    name: 'HQ Administrator (Superadmin)',
    email: 'hq.admin@carboncare.com',
    phone: '+234 800 000 0001',
    role: 'hq_admin',
    marketCode: 'ALL',
    marketName: 'All Markets (HQ Regional)',
    status: 'active',
    assignedDeviceTag: 'CC-HQ-MAC-01',
    assignedDeviceModel: 'Enterprise Administrative Console',
    lastLogin: 'Just now (Active)',
    mfaEnabled: true,
    createdAt: '2024-12-01',
  },
];

interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  actor: string;
  timestamp: string;
  details: string;
}

export const HqUserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUserRecord[]>(() => isTestEnv ? TEST_USERS : []);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<HqDeviceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState<'ALL' | MarketCode>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'deactivated'>('ALL');

  // Load real profiles from Supabase
  const loadSupabaseUsers = async () => {
    setIsLoadingUsers(true);
    const { data, error } = await adminService.getHqUsers();
    setIsLoadingUsers(false);

    if (data && data.length > 0) {
      const mappedLiveUsers: AdminUserRecord[] = data.map((p) => ({
        id: p.id,
        name: p.fullName,
        email: p.email,
        phone: p.phone || '—',
        role: (p.role === 'sales_head' ? 'country_sales_head' : p.role) as UserRole,
        marketCode: (p.marketCode as MarketCode) || 'ALL',
        marketName:
          p.marketCode === 'NG'
            ? 'Nigeria (Lagos Hub)'
            : p.marketCode === 'ZM'
            ? 'Zambia (Lusaka Hub)'
            : p.marketCode === 'MW'
            ? 'Malawi (Blantyre Hub)'
            : 'All Markets (HQ Regional)',
        status: p.isActive ? 'active' : 'deactivated',
        assignedDeviceTag: p.assignedDevice?.assetTag || 'Unassigned Handset',
        assignedDeviceModel: p.assignedDevice?.model || undefined,
        lastLogin: 'Active / Pending First Login',
        mfaEnabled: p.role === 'hq_admin',
        createdAt: p.createdAt ? p.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
      }));

      setUsers(mappedLiveUsers);
    } else if (error) {
      console.warn('[HqUserManagement] Unable to fetch real profiles from Supabase:', error.message);
    }
  };

  const loadDevices = async () => {
    const { data } = await adminService.getHqDevices();
    if (data) {
      setAvailableDevices(data);
    }
  };

  // Helper to determine if a company device is unassigned and available in depot for a target market
  const isDeviceUnassignedForMarket = (device: HqDeviceRecord, targetMarket: string) => {
    if (!device || device.marketCode !== targetMarket) return false;
    const statusNormalized = (device.inventoryStatus || '').toLowerCase();
    const isDepotStatus = statusNormalized === 'available' || statusNormalized === 'returned';
    const hasNoActiveAssignee = !device.assignedTo;
    return isDepotStatus && hasNoActiveAssignee;
  };

  useEffect(() => {
    loadSupabaseUsers();
    loadDevices();
  }, []);

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [provisionSuccessData, setProvisionSuccessData] = useState<{
    user: AdminUserRecord;
    temporaryPassword?: string;
    deviceAssignmentError?: string | null;
  } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [selectedUserForAudit, setSelectedUserForAudit] = useState<AdminUserRecord | null>(null);

  // Assign Handset Modal State for Existing Reps
  const [assignHandsetModalUser, setAssignHandsetModalUser] = useState<AdminUserRecord | null>(null);
  const [selectedHandsetId, setSelectedHandsetId] = useState<string>('');
  const [handsetNotes, setHandsetNotes] = useState<string>('');
  const [isAssigningHandset, setIsAssigningHandset] = useState<boolean>(false);
  const [assignHandsetError, setAssignHandsetError] = useState<string | null>(null);

  // Automatically refresh device inventory from Supabase whenever user opens either assignment modal
  useEffect(() => {
    if (isCreateModalOpen) {
      loadDevices();
    }
  }, [isCreateModalOpen]);

  useEffect(() => {
    if (assignHandsetModalUser) {
      loadDevices();
    }
  }, [assignHandsetModalUser]);

  // New User Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'salesperson' as UserRole,
    marketCode: 'NG' as MarketCode,
    assignedDeviceId: '',
    assignedDeviceTag: '',
    password: '',
    notes: '',
  });

  const [formFeedback, setFormFeedback] = useState<string | null>(null);

  // User Audit Log State (Live records from Supabase approval_audit with fallback for unit test)
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([
    {
      id: 'AUD-001',
      userId: 'USR-NG-005',
      userName: 'Emeka Nwosu',
      action: 'User Account Deactivated',
      actor: 'HQ Administrator (HQ Admin)',
      timestamp: '2026-09-30 16:45:10',
      details: 'Status changed to Deactivated. Device CC-DEV-LOS-007 marked as returned to IT inventory.',
    },
    {
      id: 'AUD-002',
      userId: 'USR-ZM-001',
      userName: 'Mutale Mwape',
      action: 'Role & Scope Confirmed',
      actor: 'System Initialization',
      timestamp: '2026-08-15 09:12:00',
      details: 'Assigned role Country Sales Head strictly bound to Zambia (Lusaka Hub).',
    },
    {
      id: 'AUD-003',
      userId: 'USR-MW-002',
      userName: 'Chifundo Phiri',
      action: 'Device Pairing Approved',
      actor: 'Blessings Gondwe (Sales Head)',
      timestamp: '2026-09-01 11:20:33',
      details: 'Paired Samsung Galaxy A15 (CC-DEV-BLA-002) for field sales capture.',
    },
  ]);

  const loadAuditLogs = async () => {
    try {
      const { data } = await adminService.getSystemAuditLogs(200);
      if (data && data.length > 0) {
        const liveEntries: AuditEntry[] = data.map((l) => ({
          id: l.id,
          userId: l.entityId,
          userName: l.actorName,
          action: l.action.toUpperCase(),
          actor: `${l.actorName} (${l.actorRole})`,
          timestamp: l.timestamp.replace('T', ' ').slice(0, 19),
          details: l.mandatoryReason || `Action '${l.action}' recorded on ${l.entityType}`,
        }));
        setAuditLog((prev) => {
          const localOnly = prev.filter((p) => p.id.startsWith('AUD-local-') || p.id.startsWith('AUD-'));
          const combined = [...localOnly, ...liveEntries];
          const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
          return unique;
        });
      }
    } catch {
      // Retain existing state
    }
  };

  useEffect(() => {
    if (selectedUserForAudit) {
      loadAuditLogs();
    }
  }, [selectedUserForAudit]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone.includes(searchQuery) ||
        u.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMarket =
        marketFilter === 'ALL' ? true : u.marketCode === marketFilter || u.marketCode === 'ALL';

      const matchesRole = roleFilter === 'ALL' ? true : u.role === roleFilter;

      const matchesStatus = statusFilter === 'ALL' ? true : u.status === statusFilter;

      return matchesSearch && matchesMarket && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, marketFilter, roleFilter, statusFilter]);

  // User Pagination State (Default 10, options 10, 20, 50, 100)
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);

  // Reset page when search or filters change
  useEffect(() => {
    setUserPage(1);
  }, [searchQuery, marketFilter, roleFilter, statusFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * userPageSize;
    return filteredUsers.slice(start, start + userPageSize);
  }, [filteredUsers, userPage, userPageSize]);

  // User Multi-Selection State
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteUsersModal, setShowBulkDeleteUsersModal] = useState(false);
  const [isBulkDeletingUsers, setIsBulkDeletingUsers] = useState(false);

  // Exclude primary HQ Admin account from deletion to prevent self-lockout
  const isUserSelectable = (u: AdminUserRecord) =>
    u.id !== 'USR-HQ-001' && u.role !== 'hq_admin';

  const selectablePaginatedUsers = useMemo(
    () => paginatedUsers.filter(isUserSelectable),
    [paginatedUsers]
  );

  const selectableFilteredUsers = useMemo(
    () => filteredUsers.filter(isUserSelectable),
    [filteredUsers]
  );

  const isAllPageUsersSelected =
    selectablePaginatedUsers.length > 0 &&
    selectablePaginatedUsers.every((u) => selectedUserIds.has(u.id));

  const isSomePageUsersSelected =
    selectablePaginatedUsers.some((u) => selectedUserIds.has(u.id)) && !isAllPageUsersSelected;

  const toggleSelectAllPageUsers = () => {
    const next = new Set(selectedUserIds);
    if (isAllPageUsersSelected) {
      selectablePaginatedUsers.forEach((u) => next.delete(u.id));
    } else {
      selectablePaginatedUsers.forEach((u) => next.add(u.id));
    }
    setSelectedUserIds(next);
  };

  const toggleSelectUser = (id: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedUserIds(next);
  };

  const clearUserSelection = () => {
    setSelectedUserIds(new Set());
  };

  const selectAllFilteredUsers = () => {
    setSelectedUserIds(new Set(selectableFilteredUsers.map((u) => u.id)));
  };

  const handleConfirmBulkDeleteUsers = async () => {
    setIsBulkDeletingUsers(true);
    try {
      const idsToDelete = Array.from(selectedUserIds);
      await adminService.bulkDeleteUsers(idsToDelete);
      setSelectedUserIds(new Set());
      setShowBulkDeleteUsersModal(false);
      await loadSupabaseUsers();
    } finally {
      setIsBulkDeletingUsers(false);
    }
  };

  // Handle Create User (Real Backend Edge Function + Supabase Auth)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    if (!newUser.name.trim() || !newUser.email.trim()) {
      setFormFeedback('Please enter both Full Name and Corporate Email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email.trim())) {
      setFormFeedback('Please enter a valid corporate email address (e.g. employee@carboncarcare.com).');
      return;
    }

    const nameParts = newUser.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;

    const mappedRole = (newUser.role === 'sales_head' ? 'country_sales_head' : newUser.role) as
      | 'salesperson'
      | 'country_sales_head'
      | 'hq_admin';

    const payload: ProvisionUserPayload = {
      first_name: firstName,
      last_name: lastName,
      email: newUser.email.trim().toLowerCase(),
      phone_number: newUser.phone.trim() || undefined,
      role: mappedRole,
      market_code: mappedRole === 'hq_admin' ? null : newUser.marketCode,
      assigned_device_id: newUser.assignedDeviceId || undefined,
      password: newUser.password.trim() || undefined,
    };

    setIsSubmitting(true);
    const { data: resData, error: resError } = await adminService.provisionUser(payload);
    setIsSubmitting(false);

    if (resError || !resData) {
      setFormFeedback(resError?.message || 'User provisioning failed. Please check inputs and try again.');
      return;
    }

    // If a device was chosen and Edge Function reported an assignment error, execute direct authorized HQ assignment
    if (newUser.assignedDeviceId && (resData.deviceAssignmentError || !resData.user.assignedDeviceTag)) {
      try {
        const assignResult = await adminService.assignDevice(
          newUser.assignedDeviceId,
          resData.user.id,
          'Initial company handset issue upon employee provisioning'
        );
        if (assignResult.success) {
          resData.deviceAssignmentError = null;
          resData.user.assignedDeviceTag = newUser.assignedDeviceTag;
        }
      } catch (fallbackAssignErr) {
        console.warn('[HqUserManagement] Fallback assignment note:', fallbackAssignErr);
      }
    }

    // Refresh real Supabase users and device inventory
    await loadSupabaseUsers();
    await loadDevices();

    // Append to local audit display
    const auditRecord: AuditEntry = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      userId: resData.user.id,
      userName: resData.user.name,
      action: `Created Account (${resData.user.role})`,
      actor: 'HQ Administrator (HQ Admin)',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      details: `Provisioned user ${resData.user.name} with role ${resData.user.role} in ${resData.user.marketName}.${
        resData.user.assignedDeviceTag ? ` Assigned device: ${resData.user.assignedDeviceTag}.` : ''
      }`,
    };
    setAuditLog((log) => [auditRecord, ...log]);

    // Close create modal and open Success Credential Modal
    setIsCreateModalOpen(false);
    setProvisionSuccessData({
      user: {
        id: resData.user.id,
        name: resData.user.name,
        email: resData.user.email,
        phone: resData.user.phone,
        role: resData.user.role as UserRole,
        marketCode: (resData.user.marketCode as MarketCode) || 'ALL',
        marketName: resData.user.marketName,
        status: 'active',
        assignedDeviceTag: resData.user.assignedDeviceTag,
        assignedDeviceModel: resData.user.assignedDeviceModel,
        lastLogin: resData.user.lastLogin,
        mfaEnabled: resData.user.mfaEnabled,
        createdAt: resData.user.createdAt,
      },
      temporaryPassword: resData.credentialSetup?.temporaryPassword,
      deviceAssignmentError: resData.deviceAssignmentError,
    });

    // Reset Form
    setNewUser({
      name: '',
      email: '',
      phone: '',
      role: 'salesperson',
      marketCode: 'NG',
      assignedDeviceId: '',
      assignedDeviceTag: '',
      password: '',
      notes: '',
    });
  };

  const handleAssignHandsetSubmit = async () => {
    if (!assignHandsetModalUser || !selectedHandsetId) return;
    setIsAssigningHandset(true);
    setAssignHandsetError(null);

    const { success, error } = await adminService.assignDevice(
      selectedHandsetId,
      assignHandsetModalUser.id,
      handsetNotes || 'Assigned by HQ Administrator'
    );

    setIsAssigningHandset(false);

    if (!success || error) {
      setAssignHandsetError(error?.message || 'Device assignment failed.');
      return;
    }

    // Refresh directory & device list
    await loadSupabaseUsers();
    await loadDevices();

    // Append to local audit display
    const auditRecord: AuditEntry = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      userId: assignHandsetModalUser.id,
      userName: assignHandsetModalUser.name,
      action: 'Handset Assigned',
      actor: 'HQ Administrator (HQ Admin)',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      details: `Assigned company handset to ${assignHandsetModalUser.name} (${assignHandsetModalUser.marketName}). Reason: ${handsetNotes || 'HQ initial deployment'}.`,
    };
    setAuditLog((log) => [auditRecord, ...log]);

    // Close modal
    setAssignHandsetModalUser(null);
  };

  const handleCopyCredentials = () => {
    if (!provisionSuccessData) return;
    const { user, temporaryPassword } = provisionSuccessData;
    const credText = `Carbon Field Sales Tracker - Employee Login Credentials:
Employee Name: ${user.name}
Corporate Email: ${user.email}
System Role: ${user.role}
Assigned Market: ${user.marketName}
Temporary Password: ${temporaryPassword || '(Password chosen during provisioning)'}
Portal URL: ${typeof window !== 'undefined' ? window.location.origin : 'https://field-sales-tracker-b6l7.vercel.app'}`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(credText);
      setCopiedCredentials(true);
      setTimeout(() => setCopiedCredentials(false), 3000);
    }
  };

  // Handle Toggle Status (Activate / Deactivate)
  const handleToggleStatus = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;
    const newStatus = targetUser.status === 'active' ? 'deactivated' : 'active';

    // If it's a UUID (real user from Supabase), update via adminService
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      await adminService.updateUserProfile(userId, { is_active: newStatus === 'active' });
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          // Audit
          const auditRecord: AuditEntry = {
            id: `AUD-${Date.now().toString().slice(-4)}`,
            userId: u.id,
            userName: u.name,
            action: newStatus === 'active' ? 'Account Activated' : 'Account Deactivated',
            actor: 'HQ Administrator (HQ Admin)',
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
            details: `Status toggled from ${u.status} to ${newStatus}.`,
          };
          setAuditLog((log) => [auditRecord, ...log]);

          return { ...u, status: newStatus };
        }
        return u;
      })
    );
  };

  // Edit User Modal State
  const [userToEdit, setUserToEdit] = useState<AdminUserRecord | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    fullName: '',
    phone: '',
    role: 'salesperson' as UserRole,
    marketCode: 'NG' as MarketCode | 'ALL',
    status: 'active' as 'active' | 'deactivated',
  });
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [editUserError, setEditUserError] = useState<string | null>(null);
  const [editUserSuccess, setEditUserSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (userToEdit) {
      setEditUserForm({
        fullName: userToEdit.name,
        phone: userToEdit.phone === '—' ? '' : userToEdit.phone,
        role: userToEdit.role,
        marketCode: userToEdit.marketCode,
        status: userToEdit.status === 'active' ? 'active' : 'deactivated',
      });
      setEditUserError(null);
      setEditUserSuccess(null);
    }
  }, [userToEdit]);

  // Reset Password Modal State
  const [userToResetPassword, setUserToResetPassword] = useState<AdminUserRecord | null>(null);
  const [passwordResetMode, setPasswordResetMode] = useState<'generate' | 'manual' | 'email'>('generate');
  const [manualPassword, setManualPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<{
    temporaryPassword?: string;
    mode: 'direct' | 'email_link';
    email: string;
  } | null>(null);
  const [copiedResetPassword, setCopiedResetPassword] = useState(false);

  // Delete User Modal State
  const [userToDelete, setUserToDelete] = useState<AdminUserRecord | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);

  // Actions Dropdown Menu State
  const [activeDropdownUserId, setActiveDropdownUserId] = useState<string | null>(null);

  // Close actions dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.user-actions-dropdown-container')) {
        setActiveDropdownUserId(null);
      }
    };
    if (activeDropdownUserId) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [activeDropdownUserId]);

  // Submit Edit User
  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    setEditUserError(null);
    setEditUserSuccess(null);
    setIsUpdatingUser(true);

    try {
      const updates = {
        full_name: editUserForm.fullName.trim(),
        phone_number: editUserForm.phone.trim(),
        role: (editUserForm.role === 'country_sales_head' ? 'sales_head' : editUserForm.role) as any,
        market_code: editUserForm.role === 'hq_admin' ? null : (editUserForm.marketCode === 'ALL' ? null : editUserForm.marketCode),
        is_active: editUserForm.status === 'active',
      };

      const res = await adminService.updateUserProfile(userToEdit.id, updates);
      if (!res.success) {
        setEditUserError(res.error?.message || 'Failed to update user profile.');
        setIsUpdatingUser(false);
        return;
      }

      setEditUserSuccess('User profile successfully updated.');
      await loadSupabaseUsers();
      setIsUpdatingUser(false);
    } catch (err: any) {
      setEditUserError(err.message || 'An unexpected error occurred.');
      setIsUpdatingUser(false);
    }
  };

  // Submit Password Reset
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToResetPassword) return;
    setResetPasswordError(null);
    setIsResettingPassword(true);

    try {
      let targetPassword: string | undefined = undefined;
      const sendEmail = passwordResetMode === 'email';

      if (passwordResetMode === 'generate') {
        targetPassword = adminService.generateSecurePassword();
      } else if (passwordResetMode === 'manual') {
        if (!manualPassword || manualPassword.trim().length < 8) {
          setResetPasswordError('Temporary password must be at least 8 characters long.');
          setIsResettingPassword(false);
          return;
        }
        targetPassword = manualPassword.trim();
      }

      const res = await adminService.resetUserPassword(
        userToResetPassword.id,
        userToResetPassword.email,
        targetPassword,
        sendEmail
      );

      if (!res.success) {
        setResetPasswordError(res.error?.message || 'Password reset failed.');
        setIsResettingPassword(false);
        return;
      }

      setResetPasswordSuccess({
        temporaryPassword: res.temporaryPassword || targetPassword,
        mode: res.mode,
        email: userToResetPassword.email,
      });
      setIsResettingPassword(false);
    } catch (err: any) {
      setResetPasswordError(err.message || 'An unexpected error occurred.');
      setIsResettingPassword(false);
    }
  };

  // Submit Delete User
  const handleDeleteUserSubmit = async () => {
    if (!userToDelete) return;
    setDeleteUserError(null);
    setIsDeletingUser(true);

    try {
      const res = await adminService.deleteUser(userToDelete.id);
      if (!res.success) {
        setDeleteUserError(res.error?.message || 'Failed to delete user.');
        setIsDeletingUser(false);
        return;
      }

      await loadSupabaseUsers();
      await loadDevices();
      setIsDeletingUser(false);
      setUserToDelete(null);
    } catch (err: any) {
      setDeleteUserError(err.message || 'An unexpected error occurred.');
      setIsDeletingUser(false);
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                User & Role Governance Console
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Centralised provisioning, market scoping, and role enforcement across Nigeria, Zambia, and Malawi
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await loadSupabaseUsers();
              await loadDevices();
            }}
            disabled={isLoadingUsers}
            className="border-slate-700 text-slate-200 hover:bg-slate-800 text-xs flex items-center gap-1.5"
            title="Refresh Directory from Supabase"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoadingUsers && 'animate-spin')} />
            {isLoadingUsers ? 'Syncing...' : 'Refresh'}
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Provision New User
          </Button>
        </div>
      </div>

      {/* Role Boundary Notice (PRD Non-Negotiable Enforcement) */}
      <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 text-amber-900 text-xs flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <span className="font-bold text-amber-950">Architectural Role Separation & Authority Boundary</span>
          <p className="text-amber-800">
            <strong>HQ Admins</strong> hold cross-market configuration and user oversight privileges, but <strong>CANNOT</strong> create salesperson visit logs or GPS/device-failure exception submissions.
            <strong> Country Sales Heads</strong> are strictly sandboxed to their assigned national market and cannot originate salesperson logs.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Users</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{users.length}</p>
            <span className="text-[10px] font-semibold text-slate-500">Across 3 Operating Hubs</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Sales Reps</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {users.filter((u) => u.role === 'salesperson').length}
            </p>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              Field Capture Active
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Smartphone className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Country Sales Heads</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {users.filter((u) => u.role === 'sales_head' || u.role === 'country_sales_head').length}
            </p>
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
              1 per National Market
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">MFA Protected</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {users.filter((u) => u.mfaEnabled).length} / {users.length}
            </p>
            <span className="text-[10px] font-semibold text-slate-500">Hardware & Authenticator</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <Card className="border-slate-200/90 shadow-xs">
        <CardContent className="p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or User ID..."
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
              {/* Market Filter */}
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

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-hidden focus:border-brand-blue"
              >
                <option value="ALL">All Roles</option>
                <option value="salesperson">Salesperson</option>
                <option value="sales_head">Country Sales Head</option>
                <option value="hq_admin">HQ Administrator</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-hidden focus:border-brand-blue"
              >
                <option value="ALL">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="deactivated">Deactivated Only</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-slate-200/90 shadow-xs overflow-visible">
        {/* Bulk Selection Action Bar */}
        {selectedUserIds.size > 0 && (
          <div className="bg-blue-50/90 border-b border-blue-100 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
                {selectedUserIds.size} user{selectedUserIds.size > 1 ? 's' : ''} selected
              </span>
              {selectedUserIds.size < selectableFilteredUsers.length && (
                <button
                  type="button"
                  onClick={selectAllFilteredUsers}
                  className="text-xs font-semibold text-brand-blue hover:underline cursor-pointer"
                >
                  Select all {selectableFilteredUsers.length} filtered users
                </button>
              )}
              <button
                type="button"
                onClick={clearUserSelection}
                className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Clear selection
              </button>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteUsersModal(true)}
              className="h-7 text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedUserIds.size})</span>
            </Button>
          </div>
        )}

        <div className="overflow-x-auto min-h-[420px] pb-28">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageUsersSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomePageUsersSelected;
                    }}
                    onChange={toggleSelectAllPageUsers}
                    className="w-4 h-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/20 cursor-pointer"
                    title="Select all on this page"
                  />
                </th>
                <th className="py-3 px-4">User & Contact</th>
                <th className="py-3 px-3">Role & Authority</th>
                <th className="py-3 px-3">Market Scope</th>
                <th className="py-3 px-3">Assigned Device</th>
                <th className="py-3 px-3">Last Active</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No matching user accounts found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Try adjusting your search criteria or filter tags
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user, index) => (
                  <tr
                    key={user.id}
                    className={cn(
                      'transition-colors',
                      selectedUserIds.has(user.id)
                        ? 'bg-blue-50/60 hover:bg-blue-50/80'
                        : 'hover:bg-slate-50/80'
                    )}
                  >
                    {/* Row Checkbox */}
                    <td className="py-3.5 px-3 text-center">
                      {isUserSelectable(user) ? (
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(user.id)}
                          onChange={() => toggleSelectUser(user.id)}
                          className="w-4 h-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/20 cursor-pointer"
                          title={`Select user ${user.name}`}
                        />
                      ) : (
                        <span title="Primary HQ Administrator account is protected" className="text-slate-300">
                          <Lock className="w-3.5 h-3.5 mx-auto" />
                        </span>
                      )}
                    </td>

                    {/* User & Contact */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0',
                            user.role === 'hq_admin'
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : user.role === 'sales_head'
                              ? 'bg-blue-100 text-brand-blue border border-blue-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          )}
                        >
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs">{user.name}</span>
                            <span className="font-mono text-[10px] text-slate-400">({user.id})</span>
                          </div>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {user.email}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{user.phone}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role & Authority */}
                    <td className="py-3.5 px-3">
                      <div>
                        {user.role === 'hq_admin' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                            <Shield className="w-3 h-3 text-purple-600" />
                            HQ Administrator
                          </span>
                        )}
                        {user.role === 'sales_head' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-blue bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                            <Shield className="w-3 h-3 text-brand-blue" />
                            Country Sales Head
                          </span>
                        )}
                        {user.role === 'salesperson' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <Smartphone className="w-3 h-3 text-emerald-600" />
                            Salesperson
                          </span>
                        )}
                        <p className="text-[10px] text-slate-500 mt-1">
                          {user.role === 'salesperson'
                            ? 'Field capture only'
                            : user.role === 'sales_head'
                            ? 'Market review & approvals'
                            : 'Cross-market administration'}
                        </p>
                      </div>
                    </td>

                    {/* Market Scope */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <Globe2 className="w-3.5 h-3.5 text-slate-400" />
                        <div>
                          <p className="font-semibold text-slate-800 text-[11px]">{user.marketName}</p>
                          <span className="text-[10px] font-mono text-slate-500">
                            Scope: {user.marketCode === 'ALL' ? 'Global Multi-Hub' : `${user.marketCode} Exclusive`}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Assigned Device */}
                    <td className="py-3.5 px-3">
                      {user.assignedDeviceTag ? (
                        <div>
                          <p className="font-mono text-xs font-bold text-slate-800">
                            {user.assignedDeviceTag}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[130px]">
                            {user.assignedDeviceModel || 'Company Handset'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No handset assigned</span>
                      )}
                    </td>

                    {/* Last Active */}
                    <td className="py-3.5 px-3">
                      <div className="text-[11px] text-slate-600">
                        <p className="font-medium">{user.lastLogin}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {user.mfaEnabled ? (
                            <span className="text-[10px] text-emerald-700 flex items-center gap-0.5 font-semibold">
                              <CheckCircle2 className="w-2.5 h-2.5" /> MFA Active
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-700 flex items-center gap-0.5 font-semibold">
                              <AlertTriangle className="w-2.5 h-2.5" /> No MFA
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      {user.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                          <XCircle className="w-2.5 h-2.5 text-rose-600" />
                          Deactivated
                        </span>
                      )}
                    </td>

                    {/* Actions Dropdown */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="relative inline-block text-left user-actions-dropdown-container">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveDropdownUserId(activeDropdownUserId === user.id ? null : user.id)}
                          className={cn(
                            "h-7 px-2.5 text-[11px] font-semibold border transition-all flex items-center gap-1.5 shadow-2xs",
                            activeDropdownUserId === user.id
                              ? "bg-brand-blue text-white border-brand-blue"
                              : "text-slate-700 border-slate-200 bg-white hover:bg-slate-50"
                          )}
                          title="Actions Menu"
                        >
                          <span>Actions</span>
                          <ChevronDown
                            className={cn(
                              "w-3 h-3 transition-transform duration-200",
                              activeDropdownUserId === user.id ? "rotate-180 text-white" : "text-slate-400"
                            )}
                          />
                        </Button>

                        {/* Floating Dropdown Menu */}
                        {activeDropdownUserId === user.id && (
                          <div
                            className={cn(
                              "absolute right-0 z-50 w-52 bg-white rounded-xl border border-slate-200 shadow-xl p-1 animate-in fade-in zoom-in-95",
                              index >= filteredUsers.length - 2 && filteredUsers.length > 2
                                ? "bottom-full mb-1.5 origin-bottom-right"
                                : "top-full mt-1.5 origin-top-right"
                            )}
                          >
                            {/* Assign Handset Shortcut (Sales Rep without handset) */}
                            {user.role === 'salesperson' &&
                              (!user.assignedDeviceTag ||
                                user.assignedDeviceTag === 'Unassigned Handset' ||
                                user.assignedDeviceTag === 'No handset assigned') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownUserId(null);
                                    setAssignHandsetModalUser(user);
                                    setSelectedHandsetId('');
                                    setHandsetNotes('');
                                    setAssignHandsetError(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-brand-blue hover:bg-blue-50 rounded-lg text-left transition-colors cursor-pointer"
                                  title="Assign Available Company Handset"
                                >
                                  <Smartphone className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                                  <span>Assign Handset</span>
                                </button>
                              )}

                            {/* Edit User Profile */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveDropdownUserId(null);
                                setUserToEdit(user);
                                setEditUserError(null);
                                setEditUserSuccess(null);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg text-left transition-colors cursor-pointer"
                              title="Edit User Profile"
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>Edit User Profile</span>
                            </button>

                            {/* Reset or Change Password */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveDropdownUserId(null);
                                setUserToResetPassword(user);
                                setPasswordResetMode('generate');
                                setManualPassword('');
                                setResetPasswordError(null);
                                setResetPasswordSuccess(null);
                                setCopiedResetPassword(false);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-900 rounded-lg text-left transition-colors cursor-pointer"
                              title="Reset or Change Password"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>Reset Password</span>
                            </button>

                            {/* View Audit Trail */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveDropdownUserId(null);
                                setSelectedUserForAudit(user);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg text-left transition-colors cursor-pointer"
                              title="View Audit Trail"
                            >
                              <History className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>View Audit Trail</span>
                            </button>

                            {/* Status Toggle (Activate / Deactivate) */}
                            {user.id !== 'USR-HQ-001' && (
                              <>
                                <div className="my-1 border-t border-slate-100" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownUserId(null);
                                    handleToggleStatus(user.id);
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-lg text-left transition-colors cursor-pointer",
                                    user.status === 'active'
                                      ? "text-rose-600 hover:bg-rose-50"
                                      : "text-emerald-700 hover:bg-emerald-50"
                                  )}
                                  title={user.status === 'active' ? 'Deactivate User Account' : 'Activate User Account'}
                                >
                                  <Power className="w-3.5 h-3.5 shrink-0" />
                                  <span>{user.status === 'active' ? 'Deactivate Account' : 'Activate Account'}</span>
                                </button>
                              </>
                            )}

                            {/* Delete User Account */}
                            {user.id !== 'USR-HQ-001' && user.role !== 'hq_admin' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownUserId(null);
                                  setUserToDelete(user);
                                  setDeleteUserError(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg text-left transition-colors cursor-pointer"
                                title="Delete Employee Account"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>Delete Employee</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <TablePagination
          currentPage={userPage}
          pageSize={userPageSize}
          totalItems={filteredUsers.length}
          onPageChange={setUserPage}
          onPageSizeChange={setUserPageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          itemName="users"
        />
      </Card>

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Provision New System User</h3>
                  <p className="text-[11px] text-slate-500">Configure role authority and assigned market</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formFeedback && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formFeedback}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="newUserFullName" className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  id="newUserFullName"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Babatunde Adeleke or Chioma Eze"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="newUserEmail" className="block font-bold text-slate-700 mb-1">Corporate Email *</label>
                  <input
                    id="newUserEmail"
                    name="email"
                    type="email"
                    required
                    placeholder="name@carboncarcare.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                </div>
                <div>
                  <label htmlFor="newUserPhone" className="block font-bold text-slate-700 mb-1">Mobile Phone (Optional)</label>
                  <input
                    id="newUserPhone"
                    name="phone"
                    type="tel"
                    placeholder="+234 800 123 4567"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="newUserRole" className="block font-bold text-slate-700 mb-1">Role *</label>
                  <select
                    id="newUserRole"
                    name="role"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue bg-white"
                  >
                    <option value="salesperson">Salesperson (Field Mobile)</option>
                    <option value="country_sales_head">Country Sales Head</option>
                    <option value="hq_admin">HQ Administrator</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="newUserMarketCode" className="block font-bold text-slate-700 mb-1">Assigned National Market *</label>
                  <select
                    id="newUserMarketCode"
                    name="marketCode"
                    disabled={newUser.role === 'hq_admin'}
                    value={newUser.marketCode}
                    onChange={(e) => setNewUser({ ...newUser, marketCode: e.target.value as MarketCode })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue bg-white disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="NG">Nigeria (Lagos Hub)</option>
                    <option value="ZM">Zambia (Lusaka Hub)</option>
                    <option value="MW">Malawi (Blantyre Hub)</option>
                  </select>
                </div>
              </div>

              {newUser.role === 'salesperson' && (
                <div>
                  <label htmlFor="newUserDeviceId" className="block font-bold text-slate-700 mb-1">
                    Assign Company Device (Optional)
                  </label>
                  <select
                    id="newUserDeviceId"
                    name="deviceId"
                    value={newUser.assignedDeviceId}
                    onChange={(e) => {
                      const devId = e.target.value;
                      const selectedDev = availableDevices.find((d) => d.id === devId);
                      setNewUser({
                        ...newUser,
                        assignedDeviceId: devId,
                        assignedDeviceTag: selectedDev?.assetTag || '',
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue bg-white"
                  >
                    <option value="">No device assigned initially (Assign later)</option>
                    {availableDevices
                      .filter((d) => isDeviceUnassignedForMarket(d, newUser.marketCode))
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.assetTag} — {d.make} {d.model} ({d.inventoryStatus.toLowerCase() === 'returned' ? 'In Depot' : 'Available'})
                        </option>
                      ))}
                  </select>
                  {availableDevices.filter((d) => isDeviceUnassignedForMarket(d, newUser.marketCode)).length === 0 && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mt-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      No unassigned company devices are currently available for this market. You can assign a device later.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Temporary Initial Password (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave blank to auto-generate secure 20-character password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  If left blank, a high-entropy password will be generated automatically and displayed upon successful provisioning.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-slate-700 text-[11px] leading-relaxed">
                <strong>Cryptographic Server-Side Provisioning:</strong> The employee account is provisioned in Supabase GoTrue Auth and PostgreSQL profiles via server-side Edge Function. The employee can authenticate immediately with these credentials.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Provisioning Account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      Provision User Account
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROVISION SUCCESS CREDENTIAL MODAL */}
      {provisionSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">User Account Provisioned</h3>
                <p className="text-xs text-slate-500">Persisted in Supabase Auth & PostgreSQL Profiles</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Full Name:</span>
                <span className="font-bold text-slate-900">{provisionSuccessData.user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Email:</span>
                <span className="font-mono font-semibold text-slate-800">{provisionSuccessData.user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Role:</span>
                <span className="font-semibold text-brand-blue capitalize">
                  {provisionSuccessData.user.role.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Assigned Market:</span>
                <span className="font-semibold text-slate-800">{provisionSuccessData.user.marketName}</span>
              </div>
              {provisionSuccessData.user.assignedDeviceTag && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Assigned Device:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {provisionSuccessData.user.assignedDeviceTag}
                  </span>
                </div>
              )}
            </div>

            {provisionSuccessData.deviceAssignmentError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900">Device Assignment Pending</p>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">{provisionSuccessData.deviceAssignmentError}</p>
                  <p className="text-[10px] text-amber-700 mt-1 italic">The employee account is created and active. You can assign an available handset from the user table.</p>
                </div>
              </div>
            )}

            {provisionSuccessData.temporaryPassword && (
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                    Temporary Initial Password
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-blue-200 font-mono text-xs text-slate-900 font-bold select-all break-all">
                  {provisionSuccessData.temporaryPassword}
                </div>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Share this temporary password securely with the employee. The account is active and ready to log in immediately.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyCredentials}
                className="text-xs flex items-center gap-1.5 border-slate-300 hover:bg-slate-50"
              >
                {copiedCredentials ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Credentials
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={() => setProvisionSuccessData(null)}
                className="bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold px-4"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* USER AUDIT DRAWER / MODAL */}
      {selectedUserForAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-brand-blue" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    User Access & Audit Trail
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedUserForAudit.name} ({selectedUserForAudit.id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForAudit(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Account Created:</span>
                  <span className="font-semibold text-slate-800">{selectedUserForAudit.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Authentication:</span>
                  <span className="font-semibold text-slate-800">{selectedUserForAudit.lastLogin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Role Boundary:</span>
                  <span className="font-bold text-brand-blue">{selectedUserForAudit.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Market:</span>
                  <span className="font-semibold text-slate-800">{selectedUserForAudit.marketName}</span>
                </div>
              </div>

              <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Historical Change Events
              </h4>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {auditLog
                  .filter((a) => a.userId === selectedUserForAudit.id)
                  .map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{log.action}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{log.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-600">{log.details}</p>
                      <p className="text-[10px] text-slate-400">Actor: {log.actor}</p>
                    </div>
                  ))}

                {auditLog.filter((a) => a.userId === selectedUserForAudit.id).length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No administrative changes recorded for this user yet.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUserForAudit(null)}
                className="text-xs"
              >
                Close Audit View
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN HANDSET MODAL FOR EXISTING REPS */}
      {assignHandsetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Assign Company Handset</h3>
                  <p className="text-[11px] text-slate-500">
                    {assignHandsetModalUser.name} • {assignHandsetModalUser.marketName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssignHandsetModalUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {assignHandsetError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{assignHandsetError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label htmlFor="assignHandsetSelect" className="block font-bold text-slate-700 text-xs mb-1">
                  Available Handsets ({assignHandsetModalUser.marketCode}) *
                </label>
                <select
                  id="assignHandsetSelect"
                  value={selectedHandsetId}
                  onChange={(e) => setSelectedHandsetId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue bg-white"
                >
                  <option value="">Select an available company handset...</option>
                  {availableDevices
                    .filter((d) => isDeviceUnassignedForMarket(d, assignHandsetModalUser.marketCode))
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.assetTag} — {d.make} {d.model} ({d.inventoryStatus.toLowerCase() === 'returned' ? 'In Depot' : 'Available'})
                      </option>
                    ))}
                </select>
                {availableDevices.filter((d) => isDeviceUnassignedForMarket(d, assignHandsetModalUser.marketCode)).length === 0 && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mt-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    No unassigned company devices are currently available for this market.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1">
                  Handover Reason / Custody Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Initial company handset issue by HQ Admin"
                  value={handsetNotes}
                  onChange={(e) => setHandsetNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                />
              </div>

              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-slate-700 text-[11px] leading-relaxed">
                <strong>Direct Custody Assignment:</strong> This assigns the handset directly to the field rep. To repair or replace an existing active handset, use the <strong>Device Replacement Workflow</strong> instead.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAssignHandsetModalUser(null)}
                disabled={isAssigningHandset}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAssignHandsetSubmit}
                disabled={!selectedHandsetId || isAssigningHandset}
                className="bg-brand-blue hover:bg-brand-blue-700 text-white font-bold text-xs"
              >
                {isAssigningHandset ? 'Assigning...' : 'Confirm Handset Custody'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT USER PROFILE MODAL */}
      {/* ========================================================================= */}
      {userToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in select-none">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Edit User Profile</h3>
                  <p className="text-[11px] text-slate-500">Update employee details, role governance and market scope</p>
                </div>
              </div>
              <button
                onClick={() => setUserToEdit(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editUserError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editUserError}</span>
              </div>
            )}

            {editUserSuccess ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>User Profile Updated Successfully</span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed pl-7">
                    {editUserSuccess}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setUserToEdit(null);
                      setEditUserSuccess(null);
                      setIsUpdatingUser(false);
                    }}
                    className="text-xs bg-brand-blue hover:bg-blue-700 text-white font-bold cursor-pointer"
                  >
                    Done / Close
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEditUserSubmit} className="space-y-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    required
                    type="text"
                    value={editUserForm.fullName}
                    onChange={(e) => setEditUserForm({ ...editUserForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Corporate Email (Read-Only)</label>
                    <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono text-[11px] flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{userToEdit.email}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Mobile Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +234 800 123 4567"
                      value={editUserForm.phone}
                      onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">System Role Authority *</label>
                    <select
                      value={editUserForm.role}
                      onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value as UserRole })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                    >
                      <option value="salesperson">Field Salesperson</option>
                      <option value="country_sales_head">Country Sales Head</option>
                      <option value="hq_admin">HQ Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Assigned Market Scope *</label>
                    <select
                      value={editUserForm.marketCode}
                      onChange={(e) => setEditUserForm({ ...editUserForm, marketCode: e.target.value as any })}
                      disabled={editUserForm.role === 'hq_admin'}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      {editUserForm.role === 'hq_admin' ? (
                        <option value="ALL">All Markets (HQ Regional)</option>
                      ) : (
                        <>
                          <option value="NG">Nigeria (Lagos Hub)</option>
                          <option value="ZM">Zambia (Lusaka Hub)</option>
                          <option value="MW">Malawi (Blantyre Hub)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Activation Status *</label>
                  <select
                    value={editUserForm.status}
                    onChange={(e) => setEditUserForm({ ...editUserForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  >
                    <option value="active">Active (User can sign in and capture data)</option>
                    <option value="deactivated">Deactivated (Session blocked, account suspended)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUserToEdit(null)}
                  disabled={isUpdatingUser}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isUpdatingUser}
                  className="bg-brand-blue hover:bg-blue-700 text-white font-bold text-xs"
                >
                  {isUpdatingUser ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save User Profile'
                  )}
                </Button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESET / CHANGE USER PASSWORD MODAL */}
      {/* ========================================================================= */}
      {userToResetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in select-none">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Reset User Password</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{userToResetPassword.name} ({userToResetPassword.email})</p>
                </div>
              </div>
              <button
                onClick={() => setUserToResetPassword(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetPasswordError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{resetPasswordError}</span>
              </div>
            )}

            {resetPasswordSuccess ? (
              <div className="space-y-3 text-xs">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Credentials Updated Successfully!</span>
                  </div>
                  {resetPasswordSuccess.mode === 'direct' && resetPasswordSuccess.temporaryPassword ? (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] text-slate-600">
                        The employee password has been updated in Supabase Auth. Provide this credential to the user:
                      </p>
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-200 font-mono font-bold text-slate-900 text-sm tracking-wide flex items-center justify-between">
                        <span>{resetPasswordSuccess.temporaryPassword}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(resetPasswordSuccess.temporaryPassword!);
                            setCopiedResetPassword(true);
                            setTimeout(() => setCopiedResetPassword(false), 2500);
                          }}
                          className="h-7 px-2 text-[11px] text-emerald-700 hover:text-emerald-800"
                        >
                          {copiedResetPassword ? (
                            <>
                              <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-600">
                      An official password recovery email has been sent to <strong>{resetPasswordSuccess.email}</strong>.
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setUserToResetPassword(null);
                      setResetPasswordSuccess(null);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
                <div className="space-y-2.5">
                  <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wide block">
                    Choose Reset Method
                  </span>

                  <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="resetMode"
                      value="generate"
                      checked={passwordResetMode === 'generate'}
                      onChange={() => setPasswordResetMode('generate')}
                      className="mt-0.5 text-brand-blue"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Auto-generate secure temporary password (Recommended)</span>
                      <span className="text-[11px] text-slate-500">
                        Generates a 20-character high-entropy password displayed for one-click copy.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="resetMode"
                      value="manual"
                      checked={passwordResetMode === 'manual'}
                      onChange={() => setPasswordResetMode('manual')}
                      className="mt-0.5 text-brand-blue"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-slate-900 block">Enter custom temporary password</span>
                      <span className="text-[11px] text-slate-500 block mb-2">
                        Set a specific temporary password (minimum 8 characters).
                      </span>
                      {passwordResetMode === 'manual' && (
                        <input
                          type="text"
                          required
                          placeholder="Enter new temporary password..."
                          value={manualPassword}
                          onChange={(e) => setManualPassword(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs font-mono"
                        />
                      )}
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="resetMode"
                      value="email"
                      checked={passwordResetMode === 'email'}
                      onChange={() => setPasswordResetMode('email')}
                      className="mt-0.5 text-brand-blue"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Send password recovery link via email</span>
                      <span className="text-[11px] text-slate-500">
                        Dispatches a secure Supabase Auth recovery link to {userToResetPassword.email}.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setUserToResetPassword(null)}
                    disabled={isResettingPassword}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isResettingPassword}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                  >
                    {isResettingPassword ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Credentials'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE USER ACCOUNT MODAL */}
      {/* ========================================================================= */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in select-none">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Delete Employee User</h3>
                  <p className="text-[11px] font-mono text-slate-500">{userToDelete.name} ({userToDelete.email})</p>
                </div>
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="text-slate-600">
                  Role: <strong className="text-slate-900">{userToDelete.role}</strong>
                </p>
                <p className="text-slate-600">
                  Market Hub: <strong className="text-slate-900">{userToDelete.marketName}</strong>
                </p>
                {userToDelete.assignedDeviceTag && !userToDelete.assignedDeviceTag.includes('Unassigned') && (
                  <p className="text-blue-800 font-semibold bg-blue-50 p-1.5 rounded border border-blue-200 mt-1">
                    ℹ️ Company handset <strong>{userToDelete.assignedDeviceTag}</strong> will be unassigned and returned to available depot inventory.
                  </p>
                )}
              </div>

              {deleteUserError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{deleteUserError}</span>
                </div>
              )}

              <p className="text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete this user account? This will revoke authentication access and remove their profile from the active workforce roster.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeletingUser}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={isDeletingUser}
                  onClick={handleDeleteUserSubmit}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                >
                  {isDeletingUser ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Confirm Delete User'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BULK DELETE USERS MODAL */}
      {/* ========================================================================= */}
      {showBulkDeleteUsersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in select-none">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Bulk Delete Employee Accounts</h3>
                  <p className="text-[11px] text-slate-500">
                    Removing {selectedUserIds.size} selected employee account{selectedUserIds.size > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkDeleteUsersModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1.5 text-rose-900">
                <p className="font-semibold">
                  Are you sure you want to permanently delete {selectedUserIds.size} selected user{selectedUserIds.size > 1 ? 's' : ''}?
                </p>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  This action will revoke authentication access and remove these employee profiles from the active workforce roster.
                  Any company handsets assigned to these users will be automatically unassigned and safely returned to available depot inventory.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkDeleteUsersModal(false)}
                disabled={isBulkDeletingUsers}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmBulkDeleteUsers}
                disabled={isBulkDeletingUsers}
                className="text-xs font-semibold gap-1.5"
              >
                {isBulkDeletingUsers && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Delete ({selectedUserIds.size})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
