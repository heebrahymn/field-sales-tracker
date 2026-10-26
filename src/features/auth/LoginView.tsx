import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import {
  Shield,
  ArrowRight,
  Info,
  AlertOctagon,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  HelpCircle,
  X,
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { signIn, isLoading, authError, setAuthError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [showProvisioningHelp, setShowProvisioningHelp] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setAuthError('Please enter both your work email and password.');
      return;
    }

    const res = await signIn({ email, password });
    if (res.success && onLoginSuccess) {
      onLoginSuccess();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 select-none font-sans">
      <div className="w-full max-w-md space-y-4">
        {/* Main Login Card */}
        <Card className="border-slate-200 shadow-xl overflow-hidden bg-white">
          {/* Authentic Logo Header */}
          <div className="bg-white p-6 pb-4 flex flex-col items-center text-center border-b border-slate-100">
            <BrandLogo size="lg" className="mb-3" />
            <span className="text-[11px] font-bold text-brand-blue uppercase tracking-wider bg-brand-blue-50 px-3 py-1 rounded-full border border-brand-blue-100">
              Field Sales Activity & Visit Verification
            </span>
          </div>

          <CardHeader className="pt-4 pb-2">
            <CardTitle className="text-lg text-center text-slate-900 font-bold">
              Company Device Sign-In
            </CardTitle>
            <CardDescription className="text-center text-xs text-slate-600 font-medium">
              Authorized access for Carbon Car Care field teams in Nigeria, Zambia, and Malawi.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            {/* Real Supabase Error Banner */}
            {authError && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-xl flex items-start gap-2.5 text-xs text-red-900 animate-in fade-in duration-150">
                <AlertOctagon className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-red-950">Authentication Notice</p>
                  <p className="text-[11px] text-red-800 mt-0.5">{authError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthError(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Production Credentials Form */}
            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Employee Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                  <Input
                    type="email"
                    name="email"
                    autoComplete="username"
                    required
                    placeholder="name@carboncarcare.com"
                    value={email}
                    disabled={isLoading}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-xs h-11 pl-9 font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowProvisioningHelp(true)}
                    className="text-[11px] text-brand-blue hover:underline font-medium inline-flex items-center gap-0.5"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    disabled={isLoading}
                    onChange={(e) => setPassword(e.target.value)}
                    className="text-xs h-11 pl-9 pr-10 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full font-bold h-12 text-sm bg-brand-blue hover:bg-brand-blue-700 text-white shadow-sm mt-1 transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating with Supabase...</span>
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
              <span>Company Handset & Privacy Notice</span>
            </button>

            {showNotice && (
              <div className="p-3 bg-slate-100 rounded-lg text-[10px] text-slate-700 space-y-1 text-left border border-slate-200 animate-in fade-in">
                <p className="font-bold text-slate-900">Operational Transparency Notice:</p>
                <p>
                  Location readings and photo evidence are captured strictly at discrete action triggers (Start Day, Check-in, Check-out). Continuous GPS tracking is not used. Unsynced offline data is queued securely in your company handset.
                </p>
              </div>
            )}
          </CardFooter>
        </Card>

        {/* Self-registration & Provisioning Notice */}
        <div className="bg-white/80 backdrop-blur-xs border border-slate-200 rounded-xl p-3 text-center text-[11px] text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700">Enterprise Access Security Policy</p>
          <p>
            No public self-registration. Employee accounts and company phones are provisioned exclusively by HQ Admin.
          </p>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500 font-medium">
          Carbon Car Care B2B Field Operations • Nigeria • Zambia • Malawi
        </p>
      </div>

      {/* Provisioning / Password Reset Modal */}
      {showProvisioningHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-blue" />
                <h3 className="font-bold text-sm text-slate-900">Account Assistance</h3>
              </div>
              <button
                onClick={() => setShowProvisioningHelp(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                Self-service password resets are restricted under company mobile security policy.
              </p>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-[11px]">
                <p className="font-bold text-slate-800">To reset your credentials:</p>
                <p>1. Contact your Country Sales Head or HQ IT Administrator.</p>
                <p>2. Provide your employee ID and company device asset tag.</p>
                <p>3. An authorized password reset link or temporary token will be issued.</p>
              </div>
              <p className="text-[10px] text-slate-400">
                IT Desk: support@carboncarcare.com • HQ London / Regional Hubs
              </p>
            </div>

            <Button
              type="button"
              onClick={() => setShowProvisioningHelp(false)}
              className="w-full bg-slate-900 text-white font-bold h-10 text-xs"
            >
              Understood
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
