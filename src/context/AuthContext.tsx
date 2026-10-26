import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type UserRole = 'salesperson' | 'country_sales_head' | 'hq_admin' | 'sales_head';
export type MarketCode = 'NG' | 'ZM' | 'MW';

export interface AssignedDeviceInfo {
  assetTag: string;
  model: string;
  make?: string;
  status: 'approved' | 'pending' | 'revoked';
  securityAuthorization?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  marketCode: MarketCode;
  marketName: string;
  timezone: string;
  employeeId: string;
  isActive: boolean;
  phoneNumber?: string | null;
  assignedDevice?: AssignedDeviceInfo;
}

export const DEMO_PROFILES: Record<string, UserProfile> = {
  salesperson: {
    id: '11111111-1111-4111-a111-111111111111',
    name: 'Tunde Adebayo',
    email: 'tunde.adebayo@carboncarcare.com',
    role: 'salesperson',
    marketCode: 'NG',
    marketName: 'Nigeria (Africa/Lagos)',
    timezone: 'Africa/Lagos',
    employeeId: 'CC-NG-042',
    isActive: true,
    phoneNumber: '+2348031234567',
    assignedDevice: {
      assetTag: 'CAR-SPR-117352',
      model: 'Samsung Galaxy A15',
      make: 'Samsung',
      status: 'approved',
      securityAuthorization: 'authorized',
    },
  },
  country_sales_head: {
    id: '22222222-2222-4222-a222-222222222222',
    name: 'Babatunde Adeleke',
    email: 'babatunde.adeleke@carboncarcare.com',
    role: 'country_sales_head',
    marketCode: 'NG',
    marketName: 'Nigeria (Africa/Lagos)',
    timezone: 'Africa/Lagos',
    employeeId: 'CC-NG-MGT-001',
    isActive: true,
    phoneNumber: '+2348029876543',
  },
  sales_head: {
    id: '22222222-2222-4222-a222-222222222222',
    name: 'Babatunde Adeleke',
    email: 'babatunde.adeleke@carboncarcare.com',
    role: 'sales_head',
    marketCode: 'NG',
    marketName: 'Nigeria (Africa/Lagos)',
    timezone: 'Africa/Lagos',
    employeeId: 'CC-NG-MGT-001',
    isActive: true,
    phoneNumber: '+2348029876543',
  },
  hq_admin: {
    id: '33333333-3333-4333-a333-333333333333',
    name: 'HQ Administrator',
    email: 'hq.admin@carboncarcare.com',
    role: 'hq_admin',
    marketCode: 'NG',
    marketName: 'All Markets (HQ Regional)',
    timezone: 'UTC',
    employeeId: 'CC-HQ-DIR-001',
    isActive: true,
    phoneNumber: '+2348011122334',
  },
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  currentUser: UserProfile;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialLoading: boolean;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  signIn: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  switchMarket: (market: MarketCode) => void;
  selectedMarket: MarketCode;
  attendanceStatus: 'started' | 'ended' | 'scheduled';
  setAttendanceStatus: (status: 'started' | 'ended' | 'scheduled') => void;
  gpsAccuracyMeters: number;
  syncQueueCount: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  initialProfile?: UserProfile | null;
  disableAutoMockInTest?: boolean;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  initialProfile,
  disableAutoMockInTest = false,
}) => {
  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const shouldAutoMock = isTestEnv && !disableAutoMockInTest && initialProfile === undefined;

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile || (shouldAutoMock ? DEMO_PROFILES.salesperson : null));
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(!shouldAutoMock && initialProfile === undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<MarketCode>(
    initialProfile?.marketCode || (shouldAutoMock ? 'NG' : 'NG')
  );
  const [attendanceStatus, setAttendanceStatus] = useState<'started' | 'ended' | 'scheduled'>('started');
  const [gpsAccuracyMeters] = useState<number>(14);
  const [syncQueueCount] = useState<number>(0);

  // Helper to fetch user profile and device from Supabase
  const loadProfileAndDevice = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      // 1. Fetch profile from public.profiles
      const { data: profileRow, error: profileErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, market_code, is_active, phone_number')
        .eq('id', userId)
        .single();

      if (profileErr || !profileRow) {
        console.error('[Auth] Profile query error:', profileErr);
        setAuthError('Profile record not found in authorization directory.');
        return null;
      }

      if (!profileRow.is_active) {
        console.warn('[Auth] Inactive / revoked profile:', profileRow.email);
        setAuthError('Your employee account has been deactivated or suspended by HQ Admin.');
        await supabase.auth.signOut();
        return null;
      }

      const role: UserRole = profileRow.role === 'country_sales_head' ? 'country_sales_head' : profileRow.role;
      const marketCode = (profileRow.market_code as MarketCode) || 'NG';

      const marketName =
        marketCode === 'NG'
          ? 'Nigeria (Africa/Lagos)'
          : marketCode === 'ZM'
          ? 'Zambia (Africa/Lusaka)'
          : marketCode === 'MW'
          ? 'Malawi (Africa/Blantyre)'
          : 'All Markets (HQ Regional)';

      const timezone =
        marketCode === 'NG'
          ? 'Africa/Lagos'
          : marketCode === 'ZM'
          ? 'Africa/Lusaka'
          : marketCode === 'MW'
          ? 'Africa/Blantyre'
          : 'UTC';

      let assignedDevice: AssignedDeviceInfo | undefined = undefined;

      // 2. Fetch assigned company device for salesperson
      if (role === 'salesperson') {
        const { data: assignmentData } = await supabase
          .from('device_assignments')
          .select(`
            id,
            is_current,
            assigned_at,
            devices (
              id,
              make,
              model,
              asset_id,
              asset_tag,
              inventory_status,
              security_authorization
            )
          `)
          .eq('salesperson_id', userId)
          .eq('is_current', true)
          .maybeSingle();

        if (assignmentData && assignmentData.devices) {
          const dev = assignmentData.devices;
          assignedDevice = {
            assetTag: dev.asset_tag || dev.asset_id || 'CAR-UNKNOWN',
            model: `${dev.make || ''} ${dev.model || ''}`.trim() || 'Company Handset',
            make: dev.make || 'Samsung',
            status: dev.inventory_status === 'active' ? 'approved' : 'pending',
            securityAuthorization: dev.security_authorization || 'authorized',
          };
        }
      }

      const loadedProfile: UserProfile = {
        id: profileRow.id,
        name: profileRow.full_name || 'Carbon Staff',
        email: profileRow.email || '',
        role: role,
        marketCode: marketCode,
        marketName: marketName,
        timezone: timezone,
        employeeId: `CC-${marketCode}-${profileRow.id.slice(0, 4).toUpperCase()}`,
        isActive: profileRow.is_active,
        phoneNumber: profileRow.phone_number,
        assignedDevice: assignedDevice,
      };

      return loadedProfile;
    } catch (err: any) {
      console.error('[Auth] Failed to load profile & device:', err);
      setAuthError(err?.message || 'Failed to retrieve profile data.');
      return null;
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    // If running in unit test with mock enabled, skip Supabase async call
    if (shouldAutoMock || initialProfile !== undefined) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function initializeSession() {
      try {
        setIsLoading(true);
        const { data: { session: initialSession }, error: sessionErr } = await supabase.auth.getSession();

        if (sessionErr) {
          console.warn('[Auth] Session retrieval notice:', sessionErr.message);
        }

        if (initialSession && initialSession.user) {
          const userProfile = await loadProfileAndDevice(initialSession.user.id);
          if (isMounted) {
            if (userProfile && userProfile.isActive) {
              setSession(initialSession);
              setUser(initialSession.user);
              setProfile(userProfile);
              setSelectedMarket(userProfile.marketCode);
              setAuthError(null);
            } else {
              setSession(null);
              setUser(null);
              setProfile(null);
            }
          }
        } else {
          if (isMounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('[Auth] Initialization error:', err);
          setAuthError(err?.message || 'Authentication service unreachable.');
        }
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
          setIsLoading(false);
        }
      }
    }

    initializeSession();

    // Listen to real-time auth state events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !newSession) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(newSession);
        setUser(newSession.user);
        const loaded = await loadProfileAndDevice(newSession.user.id);
        if (isMounted) {
          if (loaded && loaded.isActive) {
            setProfile(loaded);
            setSelectedMarket(loaded.marketCode);
            setAuthError(null);
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
          }
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfileAndDevice, shouldAutoMock, initialProfile]);

  // Sign in with email and password
  const signIn = useCallback(
    async (credentials: { email: string; password: string }): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      setAuthError(null);

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email.trim(),
          password: credentials.password,
        });

        if (error) {
          const errorMsg =
            error.status === 400 || error.message.toLowerCase().includes('invalid')
              ? 'Invalid employee email or password. Please verify credentials.'
              : error.message;
          setAuthError(errorMsg);
          setIsLoading(false);
          return { success: false, error: errorMsg };
        }

        if (!data.user || !data.session) {
          const errorMsg = 'Authentication session could not be established.';
          setAuthError(errorMsg);
          setIsLoading(false);
          return { success: false, error: errorMsg };
        }

        const loadedProfile = await loadProfileAndDevice(data.user.id);

        if (!loadedProfile) {
          const errorMsg = authError || 'Your account profile could not be verified or is suspended.';
          setIsLoading(false);
          return { success: false, error: errorMsg };
        }

        setSession(data.session);
        setUser(data.user);
        setProfile(loadedProfile);
        setSelectedMarket(loadedProfile.marketCode);
        setAuthError(null);
        setIsLoading(false);

        return { success: true };
      } catch (err: any) {
        const errorMsg = err?.message || 'Network error: could not connect to authentication server.';
        setAuthError(errorMsg);
        setIsLoading(false);
        return { success: false, error: errorMsg };
      }
    },
    [loadProfileAndDevice, authError]
  );

  // Sign out
  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[Auth] Sign-out warning:', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setAuthError(null);
      setIsLoading(false);
    }
  }, []);

  // Market switching - strictly restricted to HQ Admin
  const switchMarket = useCallback(
    (market: MarketCode) => {
      if (profile?.role === 'hq_admin' || (!profile && shouldAutoMock)) {
        setSelectedMarket(market);
      } else {
        console.warn(
          '[Security] Unauthorized market switch attempt blocked. Country Sales Head and Salespeople are locked to their assigned country.'
        );
      }
    },
    [profile, shouldAutoMock]
  );

  // Role switching - strictly disabled in Stage 3A to prevent client privilege escalation
  const switchRole = useCallback(
    (_newRole: UserRole) => {
      console.warn(
        '[Security] Role switching blocked: Employee role is immutable and strictly derived from Supabase database profiles.'
      );
    },
    []
  );

  // Current active user representation
  const currentUser: UserProfile = profile || (shouldAutoMock ? DEMO_PROFILES.salesperson : {
    id: 'unauthenticated',
    name: 'Unauthenticated User',
    email: '',
    role: 'salesperson',
    marketCode: selectedMarket,
    marketName:
      selectedMarket === 'NG'
        ? 'Nigeria (Africa/Lagos)'
        : selectedMarket === 'ZM'
        ? 'Zambia (Africa/Lusaka)'
        : 'Malawi (Africa/Blantyre)',
    timezone: 'UTC',
    employeeId: 'UNAUTH',
    isActive: false,
  });

  const isAuthenticated = !!profile && profile.isActive && (!!session || shouldAutoMock);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        currentUser,
        profile,
        isAuthenticated,
        isLoading,
        isInitialLoading,
        authError,
        setAuthError,
        signIn,
        signOut,
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
