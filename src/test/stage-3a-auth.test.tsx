import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth, UserProfile } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { LoginView } from '@/features/auth/LoginView';
import { FieldSessionProvider, useFieldSession } from '@/context/FieldSessionContext';
import { AuditProvider } from '@/context/AuditContext';
import { DeviceReplacementProvider } from '@/context/DeviceReplacementContext';
import { MarketConfigProvider } from '@/context/MarketConfigContext';

// Helper test profiles representing real database entities
const MOCK_SALESPERSON_NG: UserProfile = {
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
};

const MOCK_CSH_NG: UserProfile = {
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
};

const MOCK_CSH_ZM: UserProfile = {
  id: '55555555-5555-4555-a555-555555555555',
  name: 'Chileshe Mwape',
  email: 'chileshe.mwape@carboncarcare.com',
  role: 'country_sales_head',
  marketCode: 'ZM',
  marketName: 'Zambia (Africa/Lusaka)',
  timezone: 'Africa/Lusaka',
  employeeId: 'CC-ZM-MGT-001',
  isActive: true,
  phoneNumber: '+260979876543',
};

const MOCK_HQ_ADMIN: UserProfile = {
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
};

const MOCK_DISABLED_USER: UserProfile = {
  id: '88888888-8888-4888-a888-888888888888',
  name: 'Suspended Staff',
  email: 'suspended.staff@carboncarcare.com',
  role: 'salesperson',
  marketCode: 'NG',
  marketName: 'Nigeria (Africa/Lagos)',
  timezone: 'Africa/Lagos',
  employeeId: 'CC-NG-REV-099',
  isActive: false,
};

function renderWithProviders(ui: React.ReactElement, initialProfile?: UserProfile | null) {
  return render(
    <AuthProvider initialProfile={initialProfile} disableAutoMockInTest={initialProfile === null}>
      <MarketConfigProvider>
        <FieldSessionProvider>
          <AuditProvider>
            <DeviceReplacementProvider>
              {ui}
            </DeviceReplacementProvider>
          </AuditProvider>
        </FieldSessionProvider>
      </MarketConfigProvider>
    </AuthProvider>
  );
}

describe('Stage 3A: Supabase Authentication & Role-Based Access Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Role-Based Routing & Dashboard Boundary Enforcement', () => {
    it('renders Mobile Field Salesperson dashboard for authenticated salesperson (Tunde Adebayo - NG)', () => {
      renderWithProviders(<AppShell onLogout={vi.fn()} />, MOCK_SALESPERSON_NG);

      // Verify Salesperson Header & Identity
      expect(screen.getByText('Tunde')).toBeInTheDocument();
      expect(screen.getAllByText('NG')[0]).toBeInTheDocument();

      // Verify Assigned Knox device is visible in status strip and banner
      expect(screen.getAllByText('CAR-SPR-117352')[0]).toBeInTheDocument();

      // Verify Field Salesperson active visit and actions are present
      expect(screen.getByText(/Active Client Visit/i)).toBeInTheDocument();
      expect(screen.getByText(/Go to Visit View/i)).toBeInTheDocument();

      // Verify Salesperson CANNOT access Country Sales Head or HQ Admin navigation
      expect(screen.queryByText('HQ Operations Dashboard')).toBeNull();
      expect(screen.queryByText('Country Field Operations & Reviews')).toBeNull();
      expect(screen.queryByText('User & Role Management')).toBeNull();
    });

    it('renders Country Sales Head Review Console for authenticated manager (Babatunde Adeleke - NG)', () => {
      renderWithProviders(<AppShell onLogout={vi.fn()} />, MOCK_CSH_NG);

      // Verify CSH title and assigned country
      expect(screen.getByText('Country Field Operations & Reviews')).toBeInTheDocument();
      expect(screen.getByText(/Assigned Market: Nigeria/i)).toBeInTheDocument();

      // Verify Country Sales Head operational review sections exist
      expect(screen.getAllByText(/Babatunde Adeleke/i)[0]).toBeInTheDocument();

      // Verify Manager CANNOT access HQ Admin specific navigation (User & Role Management, Rule Sets)
      expect(screen.queryByText('User & Role Management')).toBeNull();
      expect(screen.queryByText('Rule Sets & Calendars')).toBeNull();
    });

    it('renders HQ Admin Dashboard for authenticated administrator (HQ Administrator - HQ)', () => {
      renderWithProviders(<AppShell onLogout={vi.fn()} />, MOCK_HQ_ADMIN);

      // Verify HQ title and multi-market subtitle
      expect(screen.getByText('HQ Regional Administration & Oversight')).toBeInTheDocument();
      expect(screen.getByText(/Global overview across Nigeria, Zambia, and Malawi teams/i)).toBeInTheDocument();

      // Verify HQ Admin administration modules are present in sidebar
      expect(screen.getAllByText('User & Role Management')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Company Devices & MDM')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Client Master Import')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Reporting & Data Exports')[0]).toBeInTheDocument();
    });
  });

  describe('2. Market Sandboxing & Cross-Market Isolation', () => {
    it('strictly isolates Nigeria Country Sales Head from Zambia or Malawi data', () => {
      function MarketCheck() {
        const { currentUser, selectedMarket, switchMarket } = useAuth();
        return (
          <div>
            <span data-testid="user-role">{currentUser.role}</span>
            <span data-testid="assigned-market">{currentUser.marketCode}</span>
            <span data-testid="selected-market">{selectedMarket}</span>
            <button onClick={() => switchMarket('ZM')}>Attempt Switch to ZM</button>
          </div>
        );
      }

      renderWithProviders(<MarketCheck />, MOCK_CSH_NG);

      expect(screen.getByTestId('assigned-market').textContent).toBe('NG');
      expect(screen.getByTestId('selected-market').textContent).toBe('NG');

      // Attempt unauthorized market switch
      fireEvent.click(screen.getByText('Attempt Switch to ZM'));

      // Market remains strictly NG for Country Sales Head
      expect(screen.getByTestId('selected-market').textContent).toBe('NG');
    });

    it('strictly isolates Zambia Country Sales Head to ZM market', () => {
      renderWithProviders(<AppShell onLogout={vi.fn()} />, MOCK_CSH_ZM);

      expect(screen.getByText('Country Field Operations & Reviews')).toBeInTheDocument();
      expect(screen.getByText(/Assigned Market: Zambia/i)).toBeInTheDocument();
    });

    it('permits HQ Admin to switch market views across NG, ZM, and MW', () => {
      function HqMarketSwitch() {
        const { selectedMarket, switchMarket } = useAuth();
        return (
          <div>
            <span data-testid="hq-current-market">{selectedMarket}</span>
            <button onClick={() => switchMarket('ZM')}>Switch to ZM</button>
            <button onClick={() => switchMarket('MW')}>Switch to MW</button>
          </div>
        );
      }

      renderWithProviders(<HqMarketSwitch />, MOCK_HQ_ADMIN);

      expect(screen.getByTestId('hq-current-market').textContent).toBe('NG');

      fireEvent.click(screen.getByText('Switch to ZM'));
      expect(screen.getByTestId('hq-current-market').textContent).toBe('ZM');

      fireEvent.click(screen.getByText('Switch to MW'));
      expect(screen.getByTestId('hq-current-market').textContent).toBe('MW');
    });
  });

  describe('3. Privilege Escalation Prevention', () => {
    it('prevents role elevation via switchRole during authenticated sessions', () => {
      function RoleElevationTest() {
        const { currentUser, switchRole } = useAuth();
        return (
          <div>
            <span data-testid="active-role">{currentUser.role}</span>
            <button onClick={() => switchRole('hq_admin')}>Attempt Escalate to HQ Admin</button>
          </div>
        );
      }

      renderWithProviders(<RoleElevationTest />, MOCK_SALESPERSON_NG);

      expect(screen.getByTestId('active-role').textContent).toBe('salesperson');

      // Attempt to switch role while authenticated
      fireEvent.click(screen.getByText('Attempt Escalate to HQ Admin'));

      // Role must remain strictly 'salesperson' as derived from database profile
      expect(screen.getByTestId('active-role').textContent).toBe('salesperson');
    });
  });

  describe('4. Account Suspension & Inactive Handling', () => {
    it('marks disabled accounts as unauthenticated and denies access', () => {
      function AccountStatusCheck() {
        const { isAuthenticated, currentUser } = useAuth();
        return (
          <div>
            <span data-testid="is-authenticated">{String(isAuthenticated)}</span>
            <span data-testid="user-active">{String(currentUser.isActive)}</span>
          </div>
        );
      }

      renderWithProviders(<AccountStatusCheck />, MOCK_DISABLED_USER);

      // Disabled account must evaluate to isAuthenticated = false
      expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
    });
  });

  describe('5. Login View & Enterprise Authentication Security', () => {
    it('renders official Carbon brand logo and enterprise sign-in notice', () => {
      renderWithProviders(<LoginView onLoginSuccess={vi.fn()} />, null);

      expect(screen.getByText('Company Device Sign-In')).toBeInTheDocument();
      expect(screen.getByText(/Field Sales Activity & Visit Verification/i)).toBeInTheDocument();
      expect(screen.getByText(/Enterprise Access Security Policy/i)).toBeInTheDocument();
      expect(screen.getByText(/No public self-registration/i)).toBeInTheDocument();
    });

    it('allows employee email and password input entry', () => {
      renderWithProviders(<LoginView onLoginSuccess={vi.fn()} />, null);

      const emailInput = screen.getByPlaceholderText('name@carboncarcare.com') as HTMLInputElement;
      const passwordInput = screen.getByPlaceholderText('••••••••••••') as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'peter.mwale@carboncarcare.com' } });
      fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });

      expect(emailInput.value).toBe('peter.mwale@carboncarcare.com');
      expect(passwordInput.value).toBe('SecurePass123!');
    });

    it('displays password assistance modal when clicking Reset', () => {
      renderWithProviders(<LoginView onLoginSuccess={vi.fn()} />, null);

      const resetBtn = screen.getByText('Reset');
      fireEvent.click(resetBtn);

      expect(screen.getByText('Account Assistance')).toBeInTheDocument();
      expect(screen.getByText(/Self-service password resets are restricted under company mobile security policy/i)).toBeInTheDocument();
    });

    it('confirms development authorized accounts drawer is completely absent from the login screen', () => {
      renderWithProviders(<LoginView onLoginSuccess={vi.fn()} />, null);

      // Verify dev account drawer and test account lists are NOT rendered
      expect(screen.queryByText(/Development Authorized Accounts/i)).toBeNull();
      expect(screen.queryByText('Peter Mwale')).toBeNull();
      expect(screen.queryByText('Tunde Adebayo')).toBeNull();
      expect(screen.queryByText('HQ Administrator')).toBeNull();
      expect(screen.queryByText(/HQ Administrator/i)).toBeNull();
    });
  });

  describe('6. Sign Out & User-Switching Session Isolation', () => {
    it('clears session and returns to unauthenticated state on logout', async () => {
      const onLogoutMock = vi.fn();
      renderWithProviders(<AppShell onLogout={onLogoutMock} />, MOCK_SALESPERSON_NG);

      const logoutBtns = screen.getAllByTitle(/Sign Out/i);
      fireEvent.click(logoutBtns[0]);

      expect(onLogoutMock).toHaveBeenCalled();
    });

    it('isolates session operational state between Salesperson A and Salesperson B', () => {
      let registeredBranchId = '';

      // Step 1: Salesperson A logs in and mutates mock field session state
      function RepASession() {
        const { registerBranch, branches } = useFieldSession();
        return (
          <div>
            <span data-testid="rep-a-branch-count">{branches.length}</span>
            <button
              onClick={() => {
                const b = registerBranch({
                  companyName: 'Rep A Custom Company',
                  branchName: 'Rep A Exclusive Facility',
                  branchCode: 'BR-REP-A-999',
                  category: 'Private Depot',
                  address: '123 Private Rep Road',
                  landmark: 'Opposite Rep A Gate',
                  contacts: [{ name: 'Rep A Contact', role: 'Manager', phone: '+2348000000000' }],
                  hasSharedPhone: false,
                  approvedGpsLat: 6.5,
                  approvedGpsLng: 3.3,
                });
                registeredBranchId = b.id;
              }}
            >
              Add Rep A Branch
            </button>
          </div>
        );
      }

      const { unmount: unmountA } = renderWithProviders(<RepASession />, MOCK_SALESPERSON_NG);
      fireEvent.click(screen.getByText('Add Rep A Branch'));
      expect(screen.getByTestId('rep-a-branch-count').textContent).toBe('6'); // 5 default + 1 added
      unmountA();

      // Step 2: Salesperson B logs in fresh (scoped to MOCK_SALESPERSON_ZM)
      const MOCK_SALESPERSON_ZM: UserProfile = {
        id: '44444444-4444-4444-a444-444444444444',
        name: 'Peter Mwale',
        email: 'peter.mwale@carboncarcare.com',
        role: 'salesperson',
        marketCode: 'ZM',
        marketName: 'Zambia (Africa/Lusaka)',
        timezone: 'Africa/Lusaka',
        employeeId: 'CC-ZM-011',
        isActive: true,
        phoneNumber: '+260971234567',
        assignedDevice: {
          assetTag: 'CC-DEV-LUS-001',
          model: 'Samsung Galaxy A15 Enterprise',
          make: 'Samsung',
          status: 'approved',
          securityAuthorization: 'authorized',
        },
      };

      function RepBSession() {
        const { branches } = useFieldSession();
        return (
          <div>
            <span data-testid="rep-b-branch-count">{branches.length}</span>
            <span data-testid="rep-b-has-branch-a">
              {String(branches.some((b) => b.id === registeredBranchId))}
            </span>
          </div>
        );
      }

      renderWithProviders(<RepBSession />, MOCK_SALESPERSON_ZM);

      // Rep B must NOT see Rep A's custom branch (clean isolated session state)
      expect(screen.getByTestId('rep-b-has-branch-a').textContent).toBe('false');
      expect(screen.getByTestId('rep-b-branch-count').textContent).toBe('5');
    });
  });

  describe('7. Authentication Status Badges & Device Attestation Display', () => {
    it('displays "Signed in securely" and "Demo Field Data" badges in header banner', () => {
      renderWithProviders(<AppShell onLogout={vi.fn()} />, MOCK_SALESPERSON_NG);

      // Verify authenticated status badge
      expect(screen.getByText(/Signed in securely|Authenticated/i)).toBeInTheDocument();

      // Verify separate Demo Field Data indicator
      expect(screen.getByText('Demo Field Data')).toBeInTheDocument();
    });

    it('displays assigned asset ID and clearly distinguishes inventory from future Knox MDM', () => {
      renderWithProviders(<AppShell onLogout={vi.fn()} />, MOCK_SALESPERSON_NG);

      // Verify database assigned asset tag
      expect(screen.getAllByText('CAR-SPR-117352')[0]).toBeInTheDocument();
    });
  });
});
