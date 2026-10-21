import { useState } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { MarketConfigProvider } from '@/context/MarketConfigContext';
import { FieldSessionProvider } from '@/context/FieldSessionContext';
import { AuditProvider } from '@/context/AuditContext';
import { DeviceReplacementProvider } from '@/context/DeviceReplacementContext';
import { LoginView } from '@/features/auth/LoginView';
import { AppShell } from '@/components/layout/AppShell';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  return (
    <AuthProvider>
      <MarketConfigProvider>
        <FieldSessionProvider>
          <AuditProvider>
            <DeviceReplacementProvider>
              {isAuthenticated ? (
                <AppShell onLogout={() => setIsAuthenticated(false)} />
              ) : (
                <LoginView onLoginSuccess={() => setIsAuthenticated(true)} />
              )}
            </DeviceReplacementProvider>
          </AuditProvider>
        </FieldSessionProvider>
      </MarketConfigProvider>
    </AuthProvider>
  );
}
