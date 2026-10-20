import React from 'react';
import { DesktopNavSection } from '@/components/layout/DesktopSidebar';
import { HqOperationsDashboard } from './HqOperationsDashboard';
import { HqUserManagement } from './HqUserManagement';
import { HqDeviceManagement } from './HqDeviceManagement';
import { HqMarketConfiguration } from './HqMarketConfiguration';
import { HqClientMasterImport } from './HqClientMasterImport';
import { HqExceptionOversight } from './HqExceptionOversight';
import { HqClientAuditOversight } from './HqClientAuditOversight';
import { HqReportingExport } from './HqReportingExport';
import { HqSystemAuditLog } from './HqSystemAuditLog';
import {
  LayoutDashboard,
  Users,
  Smartphone,
  Sliders,
  UploadCloud,
  FileSpreadsheet,
  ShieldAlert,
  PhoneCall,
  FileClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HqAdminDashboardPreviewProps {
  activeSection?: DesktopNavSection;
  onSelectSection?: (section: DesktopNavSection) => void;
}

const HQ_MODULE_TABS: { id: DesktopNavSection; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'HQ Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Users & Roles', icon: Users },
  { id: 'devices', label: 'Devices & MDM', icon: Smartphone },
  { id: 'markets', label: 'Rule Sets', icon: Sliders },
  { id: 'import', label: 'Client Import', icon: UploadCloud },
  { id: 'exceptions', label: 'Exceptions', icon: ShieldAlert },
  { id: 'audits', label: 'Client Audits', icon: PhoneCall },
  { id: 'exports', label: 'CSV Exports', icon: FileSpreadsheet },
  { id: 'audit_log', label: 'System Audit Log', icon: FileClock },
];

export const HqAdminDashboardPreview: React.FC<HqAdminDashboardPreviewProps> = ({
  activeSection = 'dashboard',
  onSelectSection,
}) => {
  const currentSection = activeSection || 'dashboard';

  return (
    <div className="space-y-6 select-none max-w-7xl mx-auto">
      {/* Module Quick-Switch Navigation Bar */}
      <div className="bg-white p-2 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-1 overflow-x-auto scrollbar-none">
        {HQ_MODULE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectSection?.(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all shrink-0',
                isActive
                  ? 'bg-brand-blue text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Render Active HQ Module */}
      {currentSection === 'dashboard' && (
        <HqOperationsDashboard onNavigateSection={onSelectSection} />
      )}
      {currentSection === 'users' && <HqUserManagement />}
      {currentSection === 'devices' && <HqDeviceManagement />}
      {currentSection === 'markets' && <HqMarketConfiguration />}
      {currentSection === 'import' && <HqClientMasterImport />}
      {currentSection === 'exceptions' && <HqExceptionOversight />}
      {currentSection === 'audits' && <HqClientAuditOversight />}
      {currentSection === 'exports' && <HqReportingExport />}
      {currentSection === 'audit_log' && <HqSystemAuditLog />}
    </div>
  );
};
