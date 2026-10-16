import React from 'react';
import { useAuth, MarketCode } from '@/context/AuthContext';
import { Bell, Clock, Globe2, Menu } from 'lucide-react';

interface ConsoleHeaderProps {
  title: string;
  subtitle?: string;
  onToggleMenu?: () => void;
}

export const ConsoleHeader: React.FC<ConsoleHeaderProps> = ({
  title,
  subtitle,
  onToggleMenu,
}) => {
  const { currentUser, selectedMarket, switchMarket } = useAuth();
  const isHQ = currentUser.role === 'hq_admin';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3.5 sm:px-6 flex items-center justify-between select-none shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        {onToggleMenu && (
          <button
            onClick={onToggleMenu}
            className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden shrink-0 transition-colors"
            title="Open navigation menu"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex flex-col min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Market Selector */}
        {isHQ ? (
          <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2 sm:px-2.5 py-1 text-xs">
            <Globe2 className="w-3.5 h-3.5 text-brand-blue shrink-0" />
            <span className="hidden md:inline text-slate-500 font-medium">Market:</span>
            <select
              value={selectedMarket}
              onChange={(e) => switchMarket(e.target.value as MarketCode)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer text-xs"
            >
              <option value="NG">Nigeria (NG)</option>
              <option value="ZM">Zambia (ZM)</option>
              <option value="MW">Malawi (MW)</option>
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 sm:px-2.5 py-1 text-xs text-slate-700">
            <Globe2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="font-semibold text-xs">{currentUser.marketCode}</span>
          </div>
        )}

        {/* Provisional Reporting indicator */}
        <div
          className="hidden xl:flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg px-2.5 py-1 text-xs font-medium"
          title="Daily data remains provisional until the 19:00 local digest and next-day sync reconciliation"
        >
          <Clock className="w-3.5 h-3.5 text-amber-700" />
          <span>Provisional (Reconciliation 19:00)</span>
        </div>

        {/* Notifications Icon with pending count */}
        <button
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Unresolved review alerts"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
        </button>
      </div>
    </header>
  );
};
