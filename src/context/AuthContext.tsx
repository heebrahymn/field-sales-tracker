import React, { createContext, useContext, useState } from 'react';

export type UserRole = 'salesperson' | 'sales_head' | 'hq_admin';
export type MarketCode = 'NG' | 'ZM' | 'MW';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  marketCode: MarketCode;
  marketName: string;
  timezone: string;
  employeeId: string;
  assignedDevice?: {
    assetTag: string;
    model: string;
    status: 'approved' | 'pending' | 'revoked';
  };
}

export const DEMO_PROFILES: Record<UserRole, UserProfile> = {
  salesperson: {
    id: 'usr-sp-01',
    name: 'Tunde Adebayo',
    email: 'tunde.adebayo@carboncarcare.com',
    role: 'salesperson',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos)',
    timezone: 'Africa/Lagos',
    employeeId: 'CC-NG-042',
    assignedDevice: {
      assetTag: 'CC-DEV-LAG-019',
      model: 'Samsung Galaxy A15 (Company Issued)',
      status: 'approved',
    },
  },
  sales_head: {
    id: 'usr-sh-01',
    name: 'Amaka Okonkwo',
    email: 'amaka.okonkwo@carboncarcare.com',
    role: 'sales_head',
    marketCode: 'NG',
    marketName: 'Nigeria (Lagos Hub)',
    timezone: 'Africa/Lagos',
    employeeId: 'CC-MGT-NG-003',
  },
  hq_admin: {
    id: 'usr-hq-01',
    name: 'Chirenj Chandran',
    email: 'c.chandran@carboncarcare.com',
    role: 'hq_admin',
    marketCode: 'NG', // default view, can switch markets
    marketName: 'All Markets (HQ London / Regional)',
    timezone: 'UTC',
    employeeId: 'CC-HQ-DIR-001',
  },
};

interface AuthContextType {
  currentUser: UserProfile;
  switchRole: (role: UserRole) => void;
  switchMarket: (market: MarketCode) => void;
  selectedMarket: MarketCode;
  attendanceStatus: 'started' | 'ended' | 'scheduled';
  setAttendanceStatus: (status: 'started' | 'ended' | 'scheduled') => void;
  gpsAccuracyMeters: number;
  syncQueueCount: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>('salesperson');
  const [selectedMarket, setSelectedMarket] = useState<MarketCode>('NG');
  const [attendanceStatus, setAttendanceStatus] = useState<'started' | 'ended' | 'scheduled'>('started');
  const [gpsAccuracyMeters] = useState<number>(14); // Simulated accurate GPS (14m <= 100m)
  const [syncQueueCount] = useState<number>(0); // 0 pending

  const currentUser = {
    ...DEMO_PROFILES[currentRole],
    marketCode: currentRole === 'hq_admin' ? selectedMarket : DEMO_PROFILES[currentRole].marketCode,
    marketName:
      selectedMarket === 'NG'
        ? 'Nigeria (Africa/Lagos)'
        : selectedMarket === 'ZM'
        ? 'Zambia (Africa/Lusaka)'
        : 'Malawi (Africa/Blantyre)',
  };

  const switchRole = (role: UserRole) => {
    setCurrentRole(role);
  };

  const switchMarket = (market: MarketCode) => {
    setSelectedMarket(market);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        switchRole,
        switchMarket,
        selectedMarket,
        attendanceStatus,
        setAttendanceStatus,
        gpsAccuracyMeters,
        syncQueueCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
