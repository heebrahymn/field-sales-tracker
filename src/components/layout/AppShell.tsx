import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { DemoDataBanner } from '@/components/feedback/DemoDataBanner';
import { PersistentStatusStrip } from '@/components/field/PersistentStatusStrip';
import { MobileBottomNav, MobileTab } from '@/components/layout/MobileBottomNav';
import { DesktopSidebar, DesktopNavSection } from '@/components/layout/DesktopSidebar';
import { ConsoleHeader } from '@/components/layout/ConsoleHeader';
import { SalespersonHomePreview } from '@/features/field/SalespersonHomePreview';
import { SalesHeadDashboardPreview } from '@/features/review/SalesHeadDashboardPreview';
import { HqAdminDashboardPreview } from '@/features/admin/HqAdminDashboardPreview';
import { LogOut } from 'lucide-react';

interface AppShellProps {
  onLogout: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({ onLogout }) => {
  const { currentUser } = useAuth();
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('home');
  const [activeDesktopSection, setActiveDesktopSection] = useState<DesktopNavSection>('dashboard');
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
            {activeMobileTab === 'home' && <SalespersonHomePreview />}
            {activeMobileTab === 'clients' && (
              <div className="max-w-lg mx-auto bg-white p-6 rounded-xl border border-slate-200 text-center space-y-3">
                <h3 className="font-bold text-base text-slate-900">Client & Branch Directory</h3>
                <p className="text-xs text-slate-500">
                  Search approved organisations, nearby pinned branches within 2km, and propose new branch registrations.
                </p>
                <div className="p-3 bg-blue-50 text-brand-blue rounded-lg text-xs font-semibold">
                  Preview in Stage 1A: Comprehensive interactive client flow arrives in Stage 1B.
                </div>
              </div>
            )}
            {activeMobileTab === 'visit' && (
              <div className="max-w-lg mx-auto bg-white p-6 rounded-xl border border-slate-200 text-center space-y-3">
                <h3 className="font-bold text-base text-slate-900">Active Visit Flow</h3>
                <p className="text-xs text-slate-500">
                  Geofence check (200m), live premises photo capture prompt, in-progress elapsed timer, and check-out outside warning.
                </p>
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold">
                  Within Geofence (38m / 200m) • GPS Fix: ±14m
                </div>
              </div>
            )}
            {activeMobileTab === 'exceptions' && (
              <div className="max-w-lg mx-auto bg-white p-6 rounded-xl border border-slate-200 text-center space-y-3">
                <h3 className="font-bold text-base text-slate-900">My Exceptions Workbench</h3>
                <p className="text-xs text-slate-500">
                  Salesperson-created missed-visit, GPS failure, or device breakdown exception logs.
                </p>
                <div className="p-3 bg-amber-50 text-amber-900 rounded-lg text-xs font-semibold">
                  Managers cannot create exceptions for you. You own and submit all failure claims.
                </div>
              </div>
            )}
            {activeMobileTab === 'sync' && (
              <div className="max-w-lg mx-auto bg-white p-6 rounded-xl border border-slate-200 text-center space-y-3">
                <h3 className="font-bold text-base text-slate-900">Offline Queue & Device Health</h3>
                <p className="text-xs text-slate-500">
                  IndexedDB event queue with unique UUID idempotency and ordered retry logic.
                </p>
                <div className="p-3 bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold">
                  Queue: 0 pending events • All records acknowledged by server
                </div>
              </div>
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
              {currentUser.role === 'sales_head' && <SalesHeadDashboardPreview />}
              {currentUser.role === 'hq_admin' && <HqAdminDashboardPreview />}
            </main>
          </div>
        </div>
      )}
    </div>
  );
};
