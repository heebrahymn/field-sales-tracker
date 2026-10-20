import { useState } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { FieldSessionProvider } from '@/context/FieldSessionContext';
import { DeviceReplacementProvider } from '@/context/DeviceReplacementContext';
import { LoginView } from '@/features/auth/LoginView';
import { AppShell } from '@/components/layout/AppShell';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  return (
    <AuthProvider>
      <FieldSessionProvider>
        <DeviceReplacementProvider>
          {isAuthenticated ? (
            <AppShell onLogout={() => setIsAuthenticated(false)} />
          ) : (
            <LoginView onLoginSuccess={() => setIsAuthenticated(true)} />
          )}
        </DeviceReplacementProvider>
      </FieldSessionProvider>
    </AuthProvider>
  );
}
