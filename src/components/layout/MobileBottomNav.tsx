import React from 'react';
import { Home, Building2, MapPin, AlertCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MobileTab = 'home' | 'clients' | 'visit' | 'exceptions' | 'sync' | 'profile';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  exceptionBadgeCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  exceptionBadgeCount = 2,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)] shadow-lg">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {/* Home */}
        <button
          id="nav-tab-home"
          onClick={() => onTabChange('home')}
          className={cn(
            'flex flex-col items-center justify-center flex-1 py-1 transition-colors relative min-h-[48px]',
            activeTab === 'home' ? 'text-brand-blue font-bold' : 'text-slate-500 hover:text-slate-800'
          )}
        >
          <Home className="w-5 h-5 mb-1" />
          <span className="text-[10px]">Home</span>
          {activeTab === 'home' && (
            <span className="absolute top-0 w-8 h-0.5 bg-brand-blue rounded-full" />
          )}
        </button>

        {/* Clients & Branches */}
        <button
          id="nav-tab-clients"
          onClick={() => onTabChange('clients')}
          className={cn(
            'flex flex-col items-center justify-center flex-1 py-1 transition-colors relative min-h-[48px]',
            activeTab === 'clients' ? 'text-brand-blue font-bold' : 'text-slate-500 hover:text-slate-800'
          )}
        >
          <Building2 className="w-5 h-5 mb-1" />
          <span className="text-[10px]">Clients</span>
          {activeTab === 'clients' && (
            <span className="absolute top-0 w-8 h-0.5 bg-brand-blue rounded-full" />
          )}
        </button>

        {/* Center Primary Action: Start / Active Visit */}
        <div className="flex-1 flex justify-center -mt-5">
          <button
            id="nav-tab-visit"
            onClick={() => onTabChange('visit')}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-brand-blue text-white shadow-lg border-4 border-slate-50 active:scale-95 transition-transform"
            aria-label="Visit Client"
            title="Visit Client / Active Visit"
          >
            <MapPin className="w-6 h-6 text-white" />
            <span className="sr-only">Visit Client</span>
          </button>
        </div>

        {/* Exceptions */}
        <button
          id="nav-tab-exceptions"
          onClick={() => onTabChange('exceptions')}
          className={cn(
            'flex flex-col items-center justify-center flex-1 py-1 transition-colors relative min-h-[48px]',
            activeTab === 'exceptions' ? 'text-brand-blue font-bold' : 'text-slate-500 hover:text-slate-800'
          )}
        >
          <div className="relative">
            <AlertCircle className="w-5 h-5 mb-1" />
            {exceptionBadgeCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-500 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                {exceptionBadgeCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Exceptions</span>
          {activeTab === 'exceptions' && (
            <span className="absolute top-0 w-8 h-0.5 bg-brand-blue rounded-full" />
          )}
        </button>

        {/* Profile & My Device */}
        <button
          id="nav-tab-profile"
          onClick={() => onTabChange('profile')}
          className={cn(
            'flex flex-col items-center justify-center flex-1 py-1 transition-colors relative min-h-[48px]',
            activeTab === 'profile' ? 'text-brand-blue font-bold' : 'text-slate-500 hover:text-slate-800'
          )}
        >
          <User className="w-5 h-5 mb-1" />
          <span className="text-[10px]">Profile</span>
          {activeTab === 'profile' && (
            <span className="absolute top-0 w-8 h-0.5 bg-brand-blue rounded-full" />
          )}
        </button>
      </div>
    </nav>
  );
};
