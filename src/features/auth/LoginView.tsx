import React, { useState } from 'react';
import { useAuth, UserRole, MarketCode } from '@/context/AuthContext';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import {
  Smartphone,
  Shield,
  ArrowRight,
  Info,
  CheckCircle2,
  Globe2,
  AlertOctagon,
  WifiOff,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

type LoginSimulationState = 'normal' | 'loading' | 'auth_error' | 'network_error' | 'unapproved_device';

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { switchRole, switchMarket, selectedMarket } = useAuth();
  const [email, setEmail] = useState('tunde.adebayo@carboncarcare.com');
  const [password, setPassword] = useState('••••••••••••');
  const [showNotice, setShowNotice] = useState(false);
  const [simState, setSimState] = useState<LoginSimulationState>('normal');

  const handleQuickLogin = (role: UserRole, market: MarketCode) => {
    switchMarket(market);
    switchRole(role);
    if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (simState === 'auth_error' || simState === 'network_error' || simState === 'unapproved_device') {
      return;
    }
    setSimState('loading');
    setTimeout(() => {
      setSimState('normal');
      handleQuickLogin('salesperson', selectedMarket);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 select-none">
      <div className="w-full max-w-md space-y-5">
        {/* State Previewer for Reviewers (Stage 1 Requirement) */}
        <div className="bg-slate-900 text-white rounded-xl p-3 text-xs shadow-md space-y-2 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-300">
              Simulate Auth States (Demo):
            </span>
            <span className="text-[10px] bg-[#E8CF2F] text-slate-950 font-bold px-1.5 py-0.2 rounded">
              Stage 1A QA
            </span>
          </div>

          <div className="flex flex-wrap gap-1">
            {[
              { id: 'normal', label: 'Normal' },
              { id: 'loading', label: 'Loading' },
              { id: 'auth_error', label: 'Auth Error' },
              { id: 'network_error', label: 'Network Error' },
              { id: 'unapproved_device', label: 'Revoked Device' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSimState(st.id as LoginSimulationState)}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                  simState === st.id
                    ? 'bg-brand-blue text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Login Card */}
        <Card className="border-slate-200 shadow-lg overflow-hidden bg-white">
          {/* Authentic Logo Header */}
          <div className="bg-white p-6 pb-4 flex flex-col items-center text-center border-b border-slate-100">
            <BrandLogo size="lg" className="mb-3" />
            <span className="text-xs font-bold text-brand-blue uppercase tracking-wider bg-brand-blue-50 px-3 py-1 rounded-full border border-brand-blue-100">
              Field Sales Activity & Visit Verification
            </span>
          </div>

          <CardHeader className="pt-4 pb-2">
            <CardTitle className="text-lg text-center text-slate-900">
              Company Device Sign-In
            </CardTitle>
            <CardDescription className="text-center text-xs text-slate-600 font-medium">
              Authorized access for Carbon Car Care field teams in Nigeria, Zambia, and Malawi.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            {/* ================= SIMULATED STATE ALERTS ================= */}
            {simState === 'auth_error' && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-xl flex items-start gap-2.5 text-xs text-red-900 animate-in fade-in duration-150">
                <AlertOctagon className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-950">Authentication Failed (401)</p>
                  <p className="text-[11px] text-red-800 mt-0.5">
                    Invalid employee credentials or your account has been temporarily suspended by HQ Admin.
                  </p>
                </div>
              </div>
            )}

            {simState === 'network_error' && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in duration-150">
                <WifiOff className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-950">Authentication Service Unreachable</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    No cellular data connection detected. Offline-cached session will be used if previously enrolled.
                  </p>
                </div>
              </div>
            )}

            {simState === 'unapproved_device' && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-xl flex items-start gap-2.5 text-xs text-red-900 animate-in fade-in duration-150">
                <ShieldAlert className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-950">Unapproved Device Hardware</p>
                  <p className="text-[11px] text-red-800 mt-0.5">
                    Device tag <strong>CC-DEV-LAG-099</strong> is not registered in company inventory or authorization was revoked. Contact IT / HQ.
                  </p>
                </div>
              </div>
            )}

            {/* ================= 1. DEMO ROLE PREVIEW SELECTOR ================= */}
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                  Stage 1 Demo Quick Selector:
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Bypasses password for testing</span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('salesperson', 'NG')}
                  className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-800 hover:border-brand-blue hover:text-brand-blue hover:bg-brand-blue-50/50 transition-all text-left shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-brand-blue" />
                    <span>Field Salesperson (Mobile PWA)</span>
                  </div>
                  <span className="text-[11px] text-slate-600 font-semibold font-mono">Tunde A. (NG)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('sales_head', 'NG')}
                  className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-800 hover:border-brand-blue hover:text-brand-blue hover:bg-brand-blue-50/50 transition-all text-left shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-700" />
                    <span>Country Sales Head (Review)</span>
                  </div>
                  <span className="text-[11px] text-slate-600 font-semibold font-mono">Amaka O. (NG)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('hq_admin', 'NG')}
                  className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-800 hover:border-brand-blue hover:text-brand-blue hover:bg-brand-blue-50/50 transition-all text-left shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-indigo-700" />
                    <span>HQ Administrator (All Markets)</span>
                  </div>
                  <span className="text-[11px] text-slate-600 font-semibold font-mono">Chirenj C. (HQ)</span>
                </button>
              </div>
            </div>

            {/* Visual Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                or production credentials
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* ================= 2. PRODUCTION AUTHENTICATION FORM ================= */}
            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Employee Work Email
                </label>
                <Input
                  type="email"
                  placeholder="name@carboncarcare.com"
                  value={email}
                  disabled={simState === 'loading'}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-xs h-11"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  disabled={simState === 'loading'}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-xs h-11"
                />
              </div>

              {/* Company Device Status Pill */}
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs ${
                simState === 'unapproved_device'
                  ? 'bg-red-50 border-red-300 text-red-900 font-semibold'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
              }`}>
                {simState === 'unapproved_device' ? (
                  <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                )}
                <span className="text-[11px] leading-tight">
                  {simState === 'unapproved_device' ? (
                    <>Hardware Revoked: <strong>CC-DEV-LAG-099</strong></>
                  ) : (
                    <>Company Handset Enrolled: <strong>CC-DEV-LAG-019</strong> (Samsung A15)</>
                  )}
                </span>
              </div>

              <Button
                type="submit"
                disabled={simState === 'loading' || simState === 'unapproved_device'}
                className="w-full font-bold h-12 text-sm bg-brand-blue hover:bg-brand-blue-700 text-white shadow-sm mt-1"
              >
                {simState === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Hardware Session...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 justify-center">
                    <span>Sign In With Credentials</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 pt-0 pb-4">
            <button
              type="button"
              onClick={() => setShowNotice(!showNotice)}
              className="text-[11px] text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 transition-colors font-medium"
            >
              <Info className="w-3.5 h-3.5 text-slate-500" />
              <span>Company Device & Activity Notice</span>
            </button>

            {showNotice && (
              <div className="p-3 bg-slate-100 rounded-lg text-[10px] text-slate-700 space-y-1 text-left border border-slate-200">
                <p className="font-bold text-slate-900">Operational Transparency Notice:</p>
                <p>
                  Location readings and photo evidence are captured strictly at discrete action triggers (Start Day, Check-in, Check-out). Continuous GPS tracking is not used. Unsynced offline data is queued securely in your company handset.
                </p>
              </div>
            )}
          </CardFooter>
        </Card>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500 font-medium">
          Carbon Car Care B2B Field Operations • Nigeria • Zambia • Malawi
        </p>
      </div>
    </div>
  );
};
