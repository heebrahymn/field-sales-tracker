import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { supabase } from '@/lib/supabase';
import { managementService } from '@/services/managementService';
import { attendanceService } from '@/services/attendanceService';
import {
  LayoutDashboard,
  CheckCircle2,
  CheckSquare,
  ShieldAlert,
  AlertTriangle,
  PhoneCall,
  CalendarDays,
  FileSpreadsheet,
  Smartphone,
  Sliders,
  UploadCloud,
  FileClock,
  LogOut,
  X,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type DesktopNavSection =
  | 'dashboard'
  | 'visits'
  | 'approvals'
  | 'exceptions'
  | 'flags'
  | 'audits'
  | 'attendance'
  | 'clients'
  | 'exports'
  | 'users'
  | 'devices'
  | 'markets'
  | 'import'
  | 'audit_log';

interface DesktopSidebarProps {
  activeSection: DesktopNavSection;
  onSelectSection: (section: DesktopNavSection) => void;
  onLogout?: () => void;
  isMobileDrawer?: boolean;
  onClose?: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeSection,
  onSelectSection,
  onLogout,
  isMobileDrawer = false,
  onClose,
}) => {
  const { currentUser } = useAuth();
  const isHQ = currentUser.role === 'hq_admin';
  const [liveBadges, setLiveBadges] = useState<Partial<Record<DesktopNavSection, number>>>({});

  useEffect(() => {
    let active = true;
    async function loadCounts() {
      try {
        if (currentUser.role === 'hq_admin') {
          const [{ count: excCount }, { count: devCount }] = await Promise.all([
            supabase.from('exceptions').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
            supabase.from('device_replacement_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
          ]);
          if (active) {
            setLiveBadges({
              exceptions: excCount ?? 0,
              devices: devCount ?? 0,
            });
          }
        } else {
          const market = currentUser.marketCode || 'NG';
          const [vRes, pPins, excs, flags, absReqs] = await Promise.all([
            managementService.getCountryVisits(market),
            managementService.getCountryPendingPins(market),
            managementService.getCountryExceptions(market, 'pending_review'),
            managementService.getCountryVerificationFlags(market, 'open'),
            attendanceService.getPendingNonVisitRequests(market),
          ]);
          if (active) {
            setLiveBadges({
              visits: vRes.data?.length ?? 0,
              approvals: pPins.length ?? 0,
              exceptions: excs.data?.length ?? 0,
              flags: flags.data?.length ?? 0,
              attendance: absReqs.data?.length ?? 0,
            });
          }
        }
      } catch (err) {
        console.warn('[DesktopSidebar] Failed to load live counts:', err);
      }
    }
    loadCounts();
    return () => {
      active = false;
    };
  }, [currentUser.role, currentUser.marketCode]);

  const navItems = isHQ
    ? [
        {
          group: 'Executive Overview',
          items: [
            { id: 'dashboard' as DesktopNavSection, label: 'HQ Operations Dashboard', icon: LayoutDashboard },
          ],
        },
        {
          group: 'Administration & MDM',
          items: [
            { id: 'users' as DesktopNavSection, label: 'User & Role Management', icon: Users },
            { id: 'devices' as DesktopNavSection, label: 'Company Devices & MDM', icon: Smartphone },
            { id: 'markets' as DesktopNavSection, label: 'Rule Sets & Calendars', icon: Sliders },
          ],
        },
        {
          group: 'Data & Imports',
          items: [
            { id: 'import' as DesktopNavSection, label: 'Client Master Import', icon: UploadCloud },
            { id: 'exports' as DesktopNavSection, label: 'Reporting & Data Exports', icon: FileSpreadsheet },
          ],
        },
        {
          group: 'Governance & Oversight',
          items: [
            { id: 'exceptions' as DesktopNavSection, label: 'Exception Oversight', icon: ShieldAlert },
            { id: 'audits' as DesktopNavSection, label: 'Client Audit Oversight', icon: PhoneCall },
            { id: 'audit_log' as DesktopNavSection, label: 'System Audit Log', icon: FileClock },
          ],
        },
      ]
    : [
        {
          group: 'Oversight & Monitoring',
          items: [
            { id: 'dashboard' as DesktopNavSection, label: 'Operational Dashboard', icon: LayoutDashboard },
            { id: 'visits' as DesktopNavSection, label: 'Client Visit Verification', icon: CheckCircle2 },
            { id: 'approvals' as DesktopNavSection, label: 'Client & GPS Approvals', icon: CheckSquare },
            { id: 'exceptions' as DesktopNavSection, label: 'Exception Workbench', icon: ShieldAlert },
            { id: 'flags' as DesktopNavSection, label: 'Risk Flags Queue', icon: AlertTriangle },
            { id: 'audits' as DesktopNavSection, label: 'Client Audit Calls (5%)', icon: PhoneCall },
          ],
        },
        {
          group: 'Team & Directory',
          items: [
            { id: 'attendance' as DesktopNavSection, label: 'Team Attendance', icon: CalendarDays },
            { id: 'exports' as DesktopNavSection, label: 'Audited CSV Exports', icon: FileSpreadsheet },
          ],
        },
      ];

  return (
    <aside
      className={cn(
        'bg-white border-r border-slate-200 flex flex-col select-none shrink-0',
        isMobileDrawer ? 'h-full w-full' : 'w-64 h-screen'
      )}
    >
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <BrandLogo size="md" />
          {isMobileDrawer && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-blue-50 text-brand-blue border border-brand-blue-200">
            {currentUser.role === 'hq_admin' ? 'HQ Admin Console' : 'Sales Head Review'}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            {currentUser.marketCode}
          </span>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navItems.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <h4 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              {group.group}
            </h4>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectSection(item.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left',
                    isActive
                      ? 'bg-brand-blue text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-slate-500')} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {liveBadges[item.id] !== undefined && liveBadges[item.id]! > 0 && (
                    <span
                      className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      )}
                    >
                      {liveBadges[item.id]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* User Footer Profile */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
          <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-white transition-colors"
            title="Sign Out / Switch User"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
