import React from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  ShieldAlert,
  CloudUpload,
  Loader2,
  CloudOff,
  Clock,
  AlertTriangle,
  XCircle,
  AlertOctagon,
  UserCheck,
  CalendarCheck,
  Building2,
  MapPin,
  CircleDot,
} from 'lucide-react';

export type OperationalStatus =
  | 'location_verified'
  | 'location_unverified'
  | 'manager_approved_unverified'
  | 'pending_sync'
  | 'syncing'
  | 'captured_offline'
  | 'pending_review'
  | 'pending_client'
  | 'disputed'
  | 'rejected'
  | 'confirmed_violation'
  | 'client_confirmed'
  | 'approved_non_visit'
  | 'started'
  | 'ended'
  | 'scheduled'
  | 'active'
  | 'location_pending';

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  className: string;
  iconClassName?: string;
}

const statusMap: Record<OperationalStatus, StatusConfig> = {
  location_verified: {
    label: 'Location Verified',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    iconClassName: 'text-emerald-700',
  },
  location_unverified: {
    label: 'Location Unverified',
    icon: AlertTriangle,
    className: 'bg-amber-50 text-amber-800 border-amber-300',
    iconClassName: 'text-amber-700',
  },
  manager_approved_unverified: {
    label: 'Manager Approved — Unverified',
    icon: ShieldAlert,
    className: 'bg-amber-50 text-amber-900 border-amber-300 font-semibold',
    iconClassName: 'text-amber-700',
  },
  pending_sync: {
    label: 'Pending Sync',
    icon: CloudUpload,
    className: 'bg-slate-100 text-slate-800 border-slate-300',
    iconClassName: 'text-slate-600',
  },
  syncing: {
    label: 'Syncing...',
    icon: Loader2,
    className: 'bg-blue-50 text-brand-blue border-blue-300',
    iconClassName: 'text-brand-blue animate-spin',
  },
  captured_offline: {
    label: 'Captured Offline',
    icon: CloudOff,
    className: 'bg-slate-100 text-slate-900 border-slate-400 font-medium',
    iconClassName: 'text-slate-700',
  },
  pending_review: {
    label: 'Pending Review',
    icon: Clock,
    className: 'bg-blue-50 text-brand-blue border-blue-200',
    iconClassName: 'text-brand-blue',
  },
  pending_client: {
    label: 'Pending Client',
    icon: Building2,
    className: 'bg-slate-50 text-slate-800 border-slate-300',
    iconClassName: 'text-slate-600',
  },
  disputed: {
    label: 'Disputed — Under Review',
    icon: AlertTriangle,
    className: 'bg-orange-50 text-orange-900 border-orange-300 font-semibold',
    iconClassName: 'text-orange-700',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    className: 'bg-red-50 text-red-800 border-red-300',
    iconClassName: 'text-red-600',
  },
  confirmed_violation: {
    label: 'Confirmed Violation',
    icon: AlertOctagon,
    className: 'bg-red-100 text-red-900 border-red-400 font-bold',
    iconClassName: 'text-red-700',
  },
  client_confirmed: {
    label: 'Client Confirmed',
    icon: UserCheck,
    className: 'bg-teal-50 text-teal-900 border-teal-300 font-semibold',
    iconClassName: 'text-teal-700',
  },
  approved_non_visit: {
    label: 'Approved Non-Visit',
    icon: CalendarCheck,
    className: 'bg-indigo-50 text-indigo-900 border-indigo-300',
    iconClassName: 'text-indigo-700',
  },
  started: {
    label: 'Day Started',
    icon: CircleDot,
    className: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-medium',
    iconClassName: 'text-emerald-600',
  },
  ended: {
    label: 'Day Ended',
    icon: CheckCircle2,
    className: 'bg-slate-100 text-slate-700 border-slate-300',
    iconClassName: 'text-slate-600',
  },
  scheduled: {
    label: 'Scheduled',
    icon: Clock,
    className: 'bg-slate-50 text-slate-700 border-slate-200',
    iconClassName: 'text-slate-500',
  },
  active: {
    label: 'Active',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    iconClassName: 'text-emerald-600',
  },
  location_pending: {
    label: 'Location Pending',
    icon: MapPin,
    className: 'bg-amber-50 text-amber-900 border-amber-300',
    iconClassName: 'text-amber-700',
  },
};

interface StatusBadgeProps {
  status: OperationalStatus;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
  size = 'md',
}) => {
  const config = statusMap[status] || {
    label: status,
    icon: CircleDot,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border rounded-full font-medium transition-colors select-none',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        config.className,
        className
      )}
    >
      <Icon className={cn('shrink-0', size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5', config.iconClassName)} />
      <span>{config.label}</span>
    </span>
  );
};
