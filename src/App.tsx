import { useState } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { FieldSessionProvider } from '@/context/FieldSessionContext';
import { LoginView } from '@/features/auth/LoginView';
import { AppShell } from '@/components/layout/AppShell';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  return (
    <AuthProvider>
      <FieldSessionProvider>
        {isAuthenticated ? (
          <AppShell onLogout={() => setIsAuthenticated(false)} />
        ) : (
          <LoginView onLoginSuccess={() => setIsAuthenticated(true)} />
        )}
      </FieldSessionProvider>
    </AuthProvider>
  );
}
