import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole, MarketCode } from '@/context/AuthContext';

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

const INITIAL_MOCK_USERS: AdminUserRecord[] = [
  // Nigeria Team
  {
    id: 'USR-NG-001',
    name: 'Babajide Adeleke',
    email: 'b.adeleke@carboncare.ng',
    phone: '+234 802 345 6789',
    role: 'sales_head',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos Hub)',
    status: 'active',
    assignedDeviceTag: 'CC-DEV-LOS-HQ1',
    assignedDeviceModel: 'Samsung Galaxy S23 Enterprise',
    lastLogin: 'Today, 08:14 WAT',
    mfaEnabled: true,
    createdAt: '2025-01-15',
    notes: 'Country Sales Head for Nigeria. Authorised to review Lagos and regional submissions.',
  },
  {
    id: 'USR-NG-002',
    name: 'Chukwudi Okafor',
    email: 'c.okafor@carboncare.ng',
    phone: '+234 803 112 2334',
    role: 'salesperson',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos Hub)',
    status: 'active',
    assignedDeviceTag: 'CC-DEV-LOS-001',
    assignedDeviceModel: 'Samsung Galaxy A15 Enterprise',
    lastLogin: 'Today, 07:55 WAT',
    mfaEnabled: true,
    createdAt: '2025-02-01',
    managerName: 'Babajide Adeleke',
  },
  {
    id: 'USR-NG-003',
    name: 'Amina Bello',
    email: 'a.bello@carboncare.ng',
    phone: '+234 809 887 6543',
    role: 'salesperson',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos Hub)',
    status: 'active',
    assignedDeviceTag: 'CC-DEV-LOS-002',
    assignedDeviceModel: 'Samsung Galaxy A15 Enterprise',
    lastLogin: 'Today, 08:02 WAT',
    mfaEnabled: true,
    createdAt: '2025-02-10',
    managerName: 'Babajide Adeleke',
  },
  {
    id: 'USR-NG-004',
    name: 'Oluwaseun Fashola',
    email: 'o.fashola@carboncare.ng',
    phone: '+234 818 998 7766',
    role: 'salesperson',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos Hub)',
    status: 'active',
    assignedDeviceTag: 'CC-DEV-LOS-003',
    assignedDeviceModel: 'Nokia G22 Field Edition',
    lastLogin: 'Yesterday, 18:30 WAT',
    mfaEnabled: true,
    createdAt: '2025-03-01',
    managerName: 'Babajide Adeleke',
  },
  {
    id: 'USR-NG-005',
    name: 'Emeka Nwosu',
    email: 'e.nwosu@carboncare.ng',
    phone: '+234 807 554 3322',
    role: 'salesperson',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos Hub)',
    status: 'deactivated',
    assignedDeviceTag: 'CC-DEV-LOS-007 (Revoked)',
    assignedDeviceModel: 'Samsung Galaxy A15',
    lastLogin: '28 Sep 2026',
    mfaEnabled: false,
    createdAt: '2025-04-12',
    notes: 'Resigned 30 Sep 2026. Handset checked in to Lagos IT inventory.',
  },

  // Zambia Team
  {
    id: 'USR-ZM-001',
    name: 'Mutale Mwape',
    email: 'm.mwape@carboncare.zm',
    phone: '+260 97 123 4567',
    role: 'sales_head',
    marketCode: 'ZM',
    marketName: 'Zambia (Lusaka Hub)',
    status: 'active',
    assignedDeviceTag: 'CC-DEV-LUS-HQ1',
    assignedDeviceModel: 'Samsung Galaxy S23 Enterprise',
    lastLogin: 'Today, 08:30 CAT',
    mfaEnabled: true,
    createdAt: '2025-01-20',
    notes: 'Country Sales Head for Zambia. Manages Copperbelt and Lusaka corridors.',
  },
  {
    id: 'USR-ZM-002',
    name: 'Kondwani Banda',
    email: 'k.banda@carboncare.zm',
    phone: '+260 96 234 5678',
    role: 'salesperson',
    marketCode: 'ZM',
    marketName: 'Zambia (Lusaka Hub)',
    status: 'active',
    assignedDeviceTag: 'CC-DEV-LUS-004',
    assignedDeviceModel: 'Samsung Galaxy A15 Enterprise',
    lastLogin: 'Today, 08:05 CAT',
    mfaEnabled: true,
    createdAt: '2025-02-15',
    managerName: 'Mutale Mwape',
  },
  {
    id: 'USR-ZM-003',
    name: 'Thandiwe Tembo',
    email: 't.tembo@carboncare.zm',
    phone: '+260 95 345 6789',
    role: 'salesperson',
    marketCode: 'ZM',
    marketName: 'Zambia (Lusaka Hub)',
    status: 'active',
    assignedDeviceTag: 'CC-DEV-LUS-005',
    assignedDeviceModel: 'Nokia G22 Field Edition',
    lastLogin: 'Today, 07:48 CAT',
    mfaEnabled: true,
    createdAt: '2025-03-05',
    managerName: 'Mutale Mwape',
  },

  // Malawi Team
  {
    id: 'USR-MW-001',
    name: 'Blessings Gondwe',
    email: 'b.gondwe@carboncare.mw',
    phone: '+265 99 912 3456',
    role: 'sales_head',
    marketCode: 'MW',
    marketName: 'Malawi (Blantyre Hub)',
    status: 'active',
    assignedDeviceTag: 'CC-DEV-BLA-HQ1',
    assignedDeviceModel: 'Samsung Galaxy S23 Enterprise',
    lastLogin: 'Today, 08:22 CAT',
    mfaEnabled: true,
    createdAt: '2025-02-01',
    notes: 'Country Sales Head for Malawi.',
  },
  {
    id: 'USR-MW-002',
    name: 'Chifundo Phiri',
    email: 'c.phiri@carboncare.mw',
    phone: '+265 88 823 4567',
    role: 'salesperson',
    marketCode: 'MW',
    marketName: 'Malawi (Blantyre Hub)',
    status: 'active',
    assignedDeviceTag: 'CC-DEV-BLA-002',
    assignedDeviceModel: 'Samsung Galaxy A15 Enterprise',
    lastLogin: 'Today, 08:10 CAT',
    mfaEnabled: true,
    createdAt: '2025-03-10',
    managerName: 'Blessings Gondwe',
  },

  // HQ Regional Admins
  {
    id: 'USR-HQ-001',
    name: 'Ayodele Ibraheem (Superadmin)',
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
    notes: 'HQ Administrator with tri-market configuration, MDM, and governance authority.',
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
  const [users, setUsers] = useState<AdminUserRecord[]>(INITIAL_MOCK_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState<'ALL' | MarketCode>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'deactivated'>('ALL');

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUserForAudit, setSelectedUserForAudit] = useState<AdminUserRecord | null>(null);

  // New User Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'salesperson' as UserRole,
    marketCode: 'NG' as MarketCode,
    assignedDeviceTag: '',
    notes: '',
  });

  const [formFeedback, setFormFeedback] = useState<string | null>(null);

  // Mock Audit Log for Users
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([
    {
      id: 'AUD-001',
      userId: 'USR-NG-005',
      userName: 'Emeka Nwosu',
      action: 'User Account Deactivated',
      actor: 'Ayodele Ibraheem (HQ Admin)',
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

  // Handle Create User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.phone.trim()) {
      setFormFeedback('Please fill out all required fields.');
      return;
    }

    const marketMap: Record<MarketCode, string> = {
      NG: 'Nigeria (Lagos Hub)',
      ZM: 'Zambia (Lusaka Hub)',
      MW: 'Malawi (Blantyre Hub)',
    };

    const newId = `USR-${newUser.marketCode}-${String(users.length + 1).padStart(3, '0')}`;
    const createdUserRecord: AdminUserRecord = {
      id: newId,
      name: newUser.name.trim(),
      email: newUser.email.trim(),
      phone: newUser.phone.trim(),
      role: newUser.role,
      marketCode: newUser.role === 'hq_admin' ? 'ALL' : newUser.marketCode,
      marketName: newUser.role === 'hq_admin' ? 'All Markets (HQ Regional)' : marketMap[newUser.marketCode],
      status: 'active',
      assignedDeviceTag: newUser.assignedDeviceTag.trim() || undefined,
      assignedDeviceModel: newUser.assignedDeviceTag.trim() ? 'Samsung Galaxy A15 Enterprise' : undefined,
      lastLogin: 'Never (Pending First Login)',
      mfaEnabled: false,
      createdAt: new Date().toISOString().split('T')[0],
      notes: newUser.notes.trim() || undefined,
    };

    setUsers([createdUserRecord, ...users]);

    // Append to audit log
    const auditRecord: AuditEntry = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      userId: newId,
      userName: createdUserRecord.name,
      action: `Created Account (${createdUserRecord.role})`,
      actor: 'Ayodele Ibraheem (HQ Admin)',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      details: `Created new user ${createdUserRecord.name} with role ${createdUserRecord.role} assigned to ${createdUserRecord.marketName}.`,
    };
    setAuditLog([auditRecord, ...auditLog]);

    setIsCreateModalOpen(false);
    setNewUser({
      name: '',
      email: '',
      phone: '',
      role: 'salesperson',
      marketCode: 'NG',
      assignedDeviceTag: '',
      notes: '',
    });
    setFormFeedback(null);
  };

  // Handle Toggle Status (Activate / Deactivate)
  const handleToggleStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const newStatus = u.status === 'active' ? 'deactivated' : 'active';

          // Audit
          const auditRecord: AuditEntry = {
            id: `AUD-${Date.now().toString().slice(-4)}`,
            userId: u.id,
            userName: u.name,
            action: newStatus === 'active' ? 'Account Activated' : 'Account Deactivated',
            actor: 'Ayodele Ibraheem (HQ Admin)',
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
              {users.filter((u) => u.role === 'sales_head').length}
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
      <Card className="border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
              <tr>
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
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No matching user accounts found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Try adjusting your search criteria or filter tags
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
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

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUserForAudit(user)}
                          className="h-7 px-2 text-[11px] text-slate-600 hover:text-brand-blue"
                          title="View Audit Trail"
                        >
                          <History className="w-3.5 h-3.5 mr-1" />
                          Audit
                        </Button>

                        {user.id !== 'USR-HQ-001' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(user.id)}
                            className={cn(
                              'h-7 px-2 text-[11px] font-semibold',
                              user.status === 'active'
                                ? 'text-rose-700 border-rose-200 hover:bg-rose-50'
                                : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                            )}
                          >
                            {user.status === 'active' ? 'Deactivate' : 'Activate'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
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
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tunde Balogun or Joseph Mwape"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Corporate Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@carboncare.ng"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+234 800 123 4567"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue bg-white"
                  >
                    <option value="salesperson">Salesperson (Field Mobile)</option>
                    <option value="sales_head">Country Sales Head</option>
                    <option value="hq_admin">HQ Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned National Market *</label>
                  <select
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

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Assigned Device Identifier (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. CC-DEV-LOS-009"
                  value={newUser.assignedDeviceTag}
                  onChange={(e) => setNewUser({ ...newUser, assignedDeviceTag: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                />
              </div>

              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-slate-700 text-[11px] leading-relaxed">
                <strong>Simulated Security Provisioning:</strong> A temporary one-time password and enrolment link will be dispatched to the provided corporate email. Device binding will complete on first launch.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Provision User Account
                </Button>
              </div>
            </form>
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
    </div>
  );
};
