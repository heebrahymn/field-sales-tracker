import { AuthProvider, useAuth } from '@/context/AuthContext';
import { MarketConfigProvider } from '@/context/MarketConfigContext';
import { FieldSessionProvider } from '@/context/FieldSessionContext';
import { AuditProvider } from '@/context/AuditContext';
import { DeviceReplacementProvider } from '@/context/DeviceReplacementContext';
import { LoginView } from '@/features/auth/LoginView';
import { AppShell } from '@/components/layout/AppShell';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, isInitialLoading, currentUser, signOut } = useAuth();

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <BrandLogo size="lg" className="mb-5 animate-pulse" />
        <div className="flex items-center gap-2.5 text-slate-700 bg-white px-5 py-3 rounded-xl shadow-xs border border-slate-200">
          <Loader2 className="w-5 h-5 text-brand-blue animate-spin" />
          <span className="text-xs font-semibold text-slate-800">
            Verifying Carbon Car Care Session...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <MarketConfigProvider>
      <FieldSessionProvider key={`field-${currentUser.id}`}>
        <AuditProvider key={`audit-${currentUser.id}`}>
          <DeviceReplacementProvider key={`device-${currentUser.id}`}>
            <AppShell onLogout={signOut} />
          </DeviceReplacementProvider>
        </AuditProvider>
      </FieldSessionProvider>
    </MarketConfigProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
