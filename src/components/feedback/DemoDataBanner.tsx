import React from 'react';
import { useAuth, MarketCode } from '@/context/AuthContext';
import { Smartphone, Users, Globe2 } from 'lucide-react';

export const DemoDataBanner: React.FC = () => {
  const { currentUser, switchRole, switchMarket, selectedMarket } = useAuth();

  return (
    <div className="bg-slate-900 text-white text-xs px-3 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shadow-inner">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 bg-[#E8CF2F] text-slate-950 font-bold px-1.5 py-0.5 rounded text-[10px] tracking-wide uppercase">
          Stage 1A Demo
        </span>
        <span className="text-slate-300 hidden sm:inline">
          Deterministic Mock Data • Zero Production Mutations • Non-commercial MVP
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
          <span className="text-slate-400 px-2 text-[11px] font-medium hidden md:inline">Role:</span>
          <button
            onClick={() => switchRole('salesperson')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              currentUser.role === 'salesperson'
                ? 'bg-brand-blue text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
            title="Field Salesperson (Mobile-first PWA flow)"
          >
            <Smartphone className="w-3 h-3" />
            <span>Salesperson</span>
          </button>

          <button
            onClick={() => switchRole('sales_head')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              currentUser.role === 'sales_head'
                ? 'bg-brand-blue text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
            title="Country Sales Head (Review Console)"
          >
            <Users className="w-3 h-3" />
            <span>Sales Head</span>
          </button>

          <button
            onClick={() => switchRole('hq_admin')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              currentUser.role === 'hq_admin'
                ? 'bg-brand-blue text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
            title="HQ Administrator (Cross-market Oversight)"
          >
            <Globe2 className="w-3 h-3" />
            <span>HQ Admin</span>
          </button>
        </div>

        {currentUser.role === 'hq_admin' && (
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <span className="text-slate-400 px-2 text-[11px] font-medium hidden lg:inline">Market:</span>
            {(['NG', 'ZM', 'MW'] as MarketCode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMarket(m)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  selectedMarket === m
                    ? 'bg-emerald-700 text-white font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
