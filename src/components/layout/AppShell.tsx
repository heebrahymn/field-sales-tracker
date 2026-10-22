import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { DemoDataBanner } from '@/components/feedback/DemoDataBanner';
import { PersistentStatusStrip } from '@/components/field/PersistentStatusStrip';
import { MobileBottomNav, MobileTab } from '@/components/layout/MobileBottomNav';
import { DesktopSidebar, DesktopNavSection } from '@/components/layout/DesktopSidebar';
import { ConsoleHeader } from '@/components/layout/ConsoleHeader';
import { SalespersonHomePreview } from '@/features/field/SalespersonHomePreview';
import { ClientsDirectoryView } from '@/features/field/ClientsDirectoryView';
import { VisitWorkflowView } from '@/features/field/VisitWorkflowView';
import { ExceptionsWorkbenchView } from '@/features/field/ExceptionsWorkbenchView';
import { OfflineSyncView } from '@/features/field/OfflineSyncView';
import { ProfileView } from '@/features/field/ProfileView';
import { SalesHeadDashboardPreview } from '@/features/review/SalesHeadDashboardPreview';
import { HqAdminDashboardPreview } from '@/features/admin/HqAdminDashboardPreview';
import { ClientBranch } from '@/context/FieldSessionContext';
import { LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppShellProps {
  onLogout: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({ onLogout }) => {
  const { currentUser } = useAuth();
  
  const getInitialMobileTab = (): MobileTab => {
    if (typeof window !== 'undefined') {
      const t = new URLSearchParams(window.location.search).get('tab');
      if (t === 'home' || t === 'clients' || t === 'visit' || t === 'exceptions' || t === 'sync' || t === 'profile') {
        return t as MobileTab;
      }
    }
    return 'home';
  };

  const getInitialDesktopSection = (): DesktopNavSection => {
    if (typeof window !== 'undefined') {
      const s = new URLSearchParams(window.location.search).get('adminTab');
      if (s) return s as DesktopNavSection;
    }
    return 'dashboard';
  };

  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>(getInitialMobileTab);
  const [selectedBranchForVisit, setSelectedBranchForVisit] = useState<ClientBranch | null>(null);
  const [activeDesktopSection, setActiveDesktopSection] = useState<DesktopNavSection>(getInitialDesktopSection);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isSalesperson = currentUser.role === 'salesperson';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* 1. Global Interactive Demo Banner & Role Quick Switcher */}
      <DemoDataBanner />

      {/* 2. Role Specific Layout */}
      {isSalesperson ? (
        /* ================= FIELD LAYOUT (MOBILE FIRST) ================= */
        <div className="flex-1 flex flex-col min-h-0 bg-slate-100">
          {/* Mobile Top Bar */}
          <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 shadow-2xs">
            <BrandLogo size="sm" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                {currentUser.marketCode}
              </span>
              <button
                id="header-btn-profile"
                onClick={() => setActiveMobileTab('profile')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border',
                  activeMobileTab === 'profile'
                    ? 'bg-brand-blue text-white border-brand-blue'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                )}
                title="Profile & My Device"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-bold">{currentUser.name.split(' ')[0]}</span>
                <span className="sm:hidden font-bold">Profile</span>
              </button>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Sign Out / Switch Demo Profile"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Persistent Operational Status Strip */}
          <PersistentStatusStrip />

          {/* Main Mobile Content Area */}
          <main className="flex-1 p-4 overflow-y-auto">
            {activeMobileTab === 'home' && (
              <SalespersonHomePreview onNavigateTab={setActiveMobileTab} />
            )}
            {activeMobileTab === 'clients' && (
              <ClientsDirectoryView
                onStartVisitAtBranch={(branch) => {
                  setSelectedBranchForVisit(branch);
                  setActiveMobileTab('visit');
                }}
              />
            )}
            {activeMobileTab === 'visit' && (
              <VisitWorkflowView
                selectedBranchFromDirectory={selectedBranchForVisit}
                onClearSelectedBranch={() => setSelectedBranchForVisit(null)}
                onNavigateToClients={() => setActiveMobileTab('clients')}
                onNavigateToExceptions={() => setActiveMobileTab('exceptions')}
              />
            )}
            {activeMobileTab === 'exceptions' && (
              <ExceptionsWorkbenchView />
            )}
            {activeMobileTab === 'sync' && (
              <OfflineSyncView />
            )}
            {activeMobileTab === 'profile' && (
              <ProfileView onNavigateTab={setActiveMobileTab} />
            )}
          </main>

          {/* Mobile Bottom Navigation */}
          <MobileBottomNav
            activeTab={activeMobileTab}
            onTabChange={setActiveMobileTab}
          />
        </div>
      ) : (
        /* ================= CONSOLE LAYOUT (RESPONSIVE) ================= */
        <div className="flex-1 flex h-[calc(100vh-37px)] overflow-hidden relative">
          {/* Mobile Navigation Drawer Overlay */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
                <DesktopSidebar
                  activeSection={activeDesktopSection}
                  onSelectSection={(sec) => {
                    setActiveDesktopSection(sec);
                    setMobileMenuOpen(false);
                  }}
                  onLogout={onLogout}
                  isMobileDrawer
                  onClose={() => setMobileMenuOpen(false)}
                />
              </div>
            </div>
          )}

          {/* Desktop Left Sidebar (hidden on screens < lg) */}
          <div className="hidden lg:block shrink-0">
            <DesktopSidebar
              activeSection={activeDesktopSection}
              onSelectSection={setActiveDesktopSection}
              onLogout={onLogout}
            />
          </div>

          {/* Main Console Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
            <ConsoleHeader
              title={
                currentUser.role === 'hq_admin'
                  ? 'HQ Regional Administration & Oversight'
                  : 'Country Field Operations & Reviews'
              }
              subtitle={
                currentUser.role === 'hq_admin'
                  ? 'Global overview across Nigeria, Zambia, and Malawi teams'
                  : `Assigned Market: ${currentUser.marketName}`
              }
              onToggleMenu={() => setMobileMenuOpen(true)}
            />

            <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 lg:p-8">
              {currentUser.role === 'sales_head' && (
                <SalesHeadDashboardPreview
                  activeSection={activeDesktopSection}
                  onSelectSection={setActiveDesktopSection}
                />
              )}
              {currentUser.role === 'hq_admin' && (
                <HqAdminDashboardPreview
                  activeSection={activeDesktopSection}
                  onSelectSection={setActiveDesktopSection}
                />
              )}
            </main>
          </div>
        </div>
      )}
    </div>
  );
};
