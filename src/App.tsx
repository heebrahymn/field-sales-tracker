import { useState } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { LoginView } from '@/features/auth/LoginView';
import { AppShell } from '@/components/layout/AppShell';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  return (
    <AuthProvider>
      {isAuthenticated ? (
        <AppShell onLogout={() => setIsAuthenticated(false)} />
      ) : (
        <LoginView onLoginSuccess={() => setIsAuthenticated(true)} />
      )}
    </AuthProvider>
  );
}
