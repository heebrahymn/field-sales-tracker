import React from 'react';
import { useAuth, MarketCode } from '@/context/AuthContext';
import { ShieldCheck, Smartphone, LogOut } from 'lucide-react';

interface DemoDataBannerProps {
  onLogout?: () => void;
}

export const DemoDataBanner: React.FC<DemoDataBannerProps> = ({ onLogout }) => {
  const { currentUser, session, signOut, switchMarket, selectedMarket } = useAuth();
  const handleLogout = onLogout || signOut;

  const isHq = currentUser.role === 'hq_admin';
  const roleLabel =
    currentUser.role === 'salesperson'
      ? 'Salesperson'
      : currentUser.role === 'hq_admin'
      ? 'HQ Administrator'
      : 'Country Sales Head';

  return (
    <div className="bg-slate-900 text-white text-xs px-3 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shadow-inner">
      {/* Left: Real Authenticated Session Indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 bg-[#1B9A4A] text-white font-bold px-2 py-0.5 rounded text-[10px] tracking-wide uppercase">
          <ShieldCheck className="w-3 h-3" />
          <span>{session ? 'Signed in securely' : 'Authenticated'}</span>
        </span>

        {/* Separate Demo Field Data Indicator (PRD §5 / Audit Requirement 6) */}
        <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold px-2 py-0.5 rounded text-[10px] tracking-wide uppercase">
          Demo Field Data
        </span>

        <span className="font-semibold text-slate-200">
          {currentUser.name}
        </span>
        <span className="text-slate-400 text-[11px]">
          ({roleLabel} • {currentUser.marketCode || 'All Markets'})
        </span>

        {currentUser.assignedDevice && (
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
            <Smartphone className="w-2.5 h-2.5" />
            <span>{currentUser.assignedDevice.assetTag}</span>
          </span>
        )}
      </div>

      {/* Center: Stage Notice */}
      <div className="hidden lg:flex items-center text-slate-400 text-[11px]">
        <span>Operational visits & exceptions below remain demo mock data (Stage 3B milestone)</span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* HQ Market Selector */}
        {isHq && (
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <span className="text-slate-400 px-2 text-[10px] font-medium hidden sm:inline">Market View:</span>
            {(['NG', 'ZM', 'MW'] as MarketCode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMarket(m)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                  selectedMarket === m
                    ? 'bg-brand-blue text-white font-bold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                title={`Filter view to ${m}`}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-400 hover:bg-slate-800 px-2 py-1 rounded transition-colors"
          title="Sign Out of Carbon Car Care"
        >
          <LogOut className="w-3 h-3" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </div>
  );
};
