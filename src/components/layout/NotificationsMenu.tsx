import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { managementService } from '@/services/managementService';
import { attendanceService } from '@/services/attendanceService';
import { DesktopNavSection } from '@/components/layout/DesktopSidebar';
import { BADGE_COUNTS_CHANGED_EVENT, isClientAuditActionRequired } from '@/utils/badgeSync';
import {
  Bell,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  CheckSquare,
  Smartphone,
  CalendarDays,
  PhoneCall,
  Building2,
  RefreshCw,
  X,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NotificationAlert {
  id: string;
  sectionId: DesktopNavSection;
  title: string;
  count: number;
  description: string;
  icon: React.ElementType;
  severity: 'high' | 'medium' | 'info';
}

interface NotificationsMenuProps {
  onSelectSection?: (section: DesktopNavSection) => void;
}

export const NotificationsMenu: React.FC<NotificationsMenuProps> = ({ onSelectSection }) => {
  const { currentUser, selectedMarket } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState<NotificationAlert[]>([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (currentUser.role === 'hq_admin') {
        // HQ Admin Oversight across markets
        const [
          { count: devCount, error: devErr },
          { count: excCount, error: excErr },
          { count: branchCount, error: branchErr },
          { count: flagCount, error: flagErr },
          { count: auditCount, error: auditErr },
        ] = await Promise.all([
          supabase
            .from('device_replacement_requests')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending_review'),
          supabase
            .from('exceptions')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending_review'),
          supabase
            .from('branches')
            .select('id', { count: 'exact', head: true })
            .eq('operating_status', 'pending_approval'),
          supabase
            .from('verification_flags')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'open'),
          supabase
            .from('client_audit_records')
            .select('id', { count: 'exact', head: true })
            .eq('dispute_status', 'under_investigation'),
        ]);

        if (devErr || excErr || branchErr || flagErr) {
          console.warn('[NotificationsMenu] Some HQ counts failed to load:', {
            devErr,
            excErr,
            branchErr,
            flagErr,
            auditErr,
          });
        }

        const items: NotificationAlert[] = [
          {
            id: 'hq-devices',
            sectionId: 'devices',
            title: 'Company Device Replacements',
            count: devCount ?? 0,
            description: `${devCount ?? 0} device replacement ${devCount === 1 ? 'request' : 'requests'} pending HQ decision & spare depot allocation`,
            icon: Smartphone,
            severity: 'high',
          },
          {
            id: 'hq-exceptions',
            sectionId: 'exceptions',
            title: 'Field Exceptions Oversight',
            count: excCount ?? 0,
            description: `${excCount ?? 0} field ${excCount === 1 ? 'exception' : 'exceptions'} pending review across regional teams`,
            icon: ShieldAlert,
            severity: 'medium',
          },
          {
            id: 'hq-branches',
            sectionId: 'clients',
            title: 'Pending Branch Registrations',
            count: branchCount ?? 0,
            description: `${branchCount ?? 0} client ${branchCount === 1 ? 'branch' : 'branches'} pending administrative approval`,
            icon: Building2,
            severity: 'medium',
          },
          {
            id: 'hq-flags',
            sectionId: 'dashboard',
            title: 'Open Verification Flags',
            count: flagCount ?? 0,
            description: `${flagCount ?? 0} open risk ${flagCount === 1 ? 'flag' : 'flags'} requiring regional review`,
            icon: AlertTriangle,
            severity: 'high',
          },
          {
            id: 'hq-audits',
            sectionId: 'audits',
            title: 'Client Audit Disputes',
            count: auditCount ?? 0,
            description: `${auditCount ?? 0} disputed client audit ${auditCount === 1 ? 'record' : 'records'} requiring investigation`,
            icon: PhoneCall,
            severity: 'high',
          },
        ];

        setAlerts(items);
      } else {
        // Country Sales Head Review queues for their specific market
        const market = currentUser.marketCode || selectedMarket || 'NG';

        const [excsRes, pinsRes, flagsRes, absRes, auditsRes] = await Promise.all([
          managementService.getCountryExceptions(market, 'pending_review'),
          managementService.getCountryPendingPins(market),
          managementService.getCountryVerificationFlags(market, 'open'),
          attendanceService.getPendingNonVisitRequests(market),
          managementService.getClientAuditRecords(market),
        ]);

        const excCount = excsRes.data?.length ?? 0;
        const pinCount = Array.isArray(pinsRes) ? pinsRes.length : ((pinsRes as any)?.data?.length ?? 0);
        const flagCount = flagsRes.data?.length ?? 0;
        const absCount = absRes.data?.length ?? 0;
        const auditCount = (auditsRes.data || []).filter(isClientAuditActionRequired).length;

        const items: NotificationAlert[] = [
          {
            id: 'csh-exceptions',
            sectionId: 'exceptions',
            title: 'Pending Field Exceptions',
            count: excCount,
            description: `${excCount} salesperson exception ${excCount === 1 ? 'report' : 'reports'} awaiting manager decision`,
            icon: ShieldAlert,
            severity: 'high',
          },
          {
            id: 'csh-approvals',
            sectionId: 'approvals',
            title: 'Client & GPS Pin Approvals',
            count: pinCount,
            description: `${pinCount} branch ${pinCount === 1 ? 'registration or location pin' : 'registrations or location pins'} pending approval`,
            icon: CheckSquare,
            severity: 'medium',
          },
          {
            id: 'csh-flags',
            sectionId: 'flags',
            title: 'Risk Flags Queue',
            count: flagCount,
            description: `${flagCount} anomalous field ${flagCount === 1 ? 'visit' : 'visits'} flagged for audit review`,
            icon: AlertTriangle,
            severity: 'high',
          },
          {
            id: 'csh-attendance',
            sectionId: 'attendance',
            title: 'Non-Visit Workday Requests',
            count: absCount,
            description: `${absCount} non-visit workday ${absCount === 1 ? 'request' : 'requests'} pending manager sign-off`,
            icon: CalendarDays,
            severity: 'info',
          },
          {
            id: 'csh-audits',
            sectionId: 'audits',
            title: 'Client Audit Calls (5%)',
            count: auditCount,
            description: `${auditCount} client verification ${auditCount === 1 ? 'call' : 'calls'} pending completion or resolution`,
            icon: PhoneCall,
            severity: 'medium',
          },
        ];

        setAlerts(items);
      }

      setLastRefreshedAt(new Date());
    } catch (err: any) {
      console.error('[NotificationsMenu] Error loading notifications:', err);
      setError('Unable to refresh alerts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.role, currentUser.marketCode, selectedMarket]);

  // Initial load and reload when role/market changes
  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Reload when review/queue badges change across workbenches
  useEffect(() => {
    const handleRefreshEvent = () => {
      loadAlerts();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(BADGE_COUNTS_CHANGED_EVENT, handleRefreshEvent);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(BADGE_COUNTS_CHANGED_EVENT, handleRefreshEvent);
      }
    };
  }, [loadAlerts]);

  // Reload when the dropdown is opened to guarantee freshness
  useEffect(() => {
    if (isOpen) {
      loadAlerts();
    }
  }, [isOpen, loadAlerts]);

  // Handle outside click & Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const totalPendingCount = alerts.reduce((acc, item) => acc + item.count, 0);
  const activeAlerts = alerts.filter((item) => item.count > 0);

  const handleSelectAlert = (sectionId: DesktopNavSection) => {
    setIsOpen(false);
    onSelectSection?.(sectionId);
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        id="console-notifications-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={
          totalPendingCount > 0
            ? `${totalPendingCount} pending review alerts`
            : 'Review notifications and alerts'
        }
        title={
          totalPendingCount > 0
            ? `${totalPendingCount} unresolved review alerts`
            : 'Notifications & review alerts'
        }
        className={cn(
          'relative p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30 cursor-pointer',
          isOpen
            ? 'bg-slate-200 text-slate-900'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        )}
      >
        <Bell className="w-4 h-4" />
        {totalPendingCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs animate-in zoom-in-50 leading-none">
            {totalPendingCount > 99 ? '99+' : totalPendingCount}
          </span>
        ) : (
          <span className="sr-only">No unread alerts</span>
        )}
      </button>

      {/* Notifications Dropdown Card */}
      {isOpen && (
        <div
          id="console-notifications-dropdown"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-top-2 duration-150"
          role="dialog"
          aria-label="Notifications panel"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 leading-none truncate">
                  Review Notifications
                </h3>
                <p
                  className="text-[11px] text-slate-500 font-medium mt-0.5 truncate"
                  title={currentUser.marketName || currentUser.marketCode}
                >
                  {currentUser.role === 'hq_admin'
                    ? 'HQ Regional Governance'
                    : `Assigned Market: ${currentUser.marketName || currentUser.marketCode}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {totalPendingCount > 0 ? (
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap shrink-0">
                  {totalPendingCount} Action Required
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 whitespace-nowrap shrink-0">
                  <CheckCircle2 className="w-3 h-3 shrink-0" /> All Clear
                </span>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors shrink-0 cursor-pointer"
                title="Close"
                aria-label="Close notifications panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Alert Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading && alerts.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-brand-blue" />
                <span className="text-xs font-medium">Checking review queues...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center space-y-2">
                <p className="text-xs font-semibold text-red-700">{error}</p>
                <button
                  onClick={loadAlerts}
                  className="px-3 py-1 bg-white border border-red-300 text-red-700 text-xs font-bold rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : activeAlerts.length > 0 ? (
              <>
                <p className="text-[11px] font-semibold text-slate-500 px-1 uppercase tracking-wider">
                  Pending Action Queues
                </p>
                {activeAlerts.map((alert) => {
                  const Icon = alert.icon;
                  const isHigh = alert.severity === 'high';
                  return (
                    <button
                      key={alert.id}
                      onClick={() => handleSelectAlert(alert.sectionId)}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-brand-blue/40 hover:bg-slate-50 transition-all flex items-start gap-3 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                          isHigh
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-blue-100 text-brand-blue border border-blue-200'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-blue transition-colors truncate">
                            {alert.title}
                          </h4>
                          <span
                            className={cn(
                              'px-2 py-0.5 text-[10px] font-extrabold rounded-full shrink-0',
                              isHigh
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            )}
                          >
                            {alert.count}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                          {alert.description}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-brand-blue mt-1.5 opacity-90 group-hover:opacity-100">
                          <span>Open workbench</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </>
            ) : (
              <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 border border-emerald-100">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">All Queues Up to Date</h4>
                <p className="text-[11px] text-slate-500 max-w-[220px] mt-1 leading-snug">
                  There are currently no unresolved exceptions, registration requests, or unhandled
                  flags requiring manager review.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-[11px]">
            <span className="text-slate-500">
              {lastRefreshedAt
                ? `Updated ${lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Live queue monitoring'}
            </span>
            <button
              onClick={loadAlerts}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 font-bold text-brand-blue hover:text-blue-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={cn('w-3 h-3', isLoading && 'animate-spin')} />
              <span>{isLoading ? 'Checking...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
