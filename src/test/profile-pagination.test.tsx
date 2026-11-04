import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileView } from '../features/field/ProfileView';
import { AuthContext } from '../context/AuthContext';
import { DeviceReplacementContext } from '../context/DeviceReplacementContext';

const mockCurrentUser = {
  id: '11111111-1111-4111-a111-111111111111',
  name: 'Tunde Adebayo',
  email: 'tunde.adebayo@carboncarcare.com',
  role: 'salesperson' as const,
  marketCode: 'NG' as const,
  marketName: 'Nigeria (Lagos Hub)',
  timezone: 'Africa/Lagos',
  employeeId: 'CC-NG-042',
  isActive: true,
  assignedDevice: {
    deviceId: 'dev-001',
    assetTag: 'CC-DEV-LAG-014',
    model: 'Samsung Galaxy A15 Enterprise',
    make: 'Samsung',
    status: 'approved' as const,
    securityAuthorization: 'authorized' as const,
    batteryHealth: 92,
  },
};

const createMockRequests = (count: number) => {
  return Array.from({ length: count }, (_, idx) => ({
    id: `REQ-${idx + 1}`,
    salespersonId: mockCurrentUser.id,
    salespersonName: mockCurrentUser.name,
    marketCode: 'NG' as const,
    marketName: 'Nigeria (Lagos)',
    companyDeviceAssetId: 'CC-DEV-LAG-014',
    deviceModel: 'Samsung Galaxy A15 Enterprise',
    issueCategory: 'screen_damage' as const,
    issueDescription: `Issue description number ${idx + 1}`,
    submittedAt: '2026-11-03T10:00:00Z',
    status: idx % 2 === 0 ? ('Pending Review' as const) : ('Completed' as const),
    history: [],
  }));
};

const renderWithProviders = (requestCount = 25) => {
  const mockRequests = createMockRequests(requestCount);

  const authValue: any = {
    currentUser: mockCurrentUser,
    refreshProfile: vi.fn(),
  };

  const deviceReplacementValue: any = {
    devices: [],
    refreshDevices: vi.fn(),
    registerDevice: vi.fn(),
    assignDevice: vi.fn(),
    reassignDevice: vi.fn(),
    updateDeviceLifecycleStatus: vi.fn(),
    replacementRequests: mockRequests,
    refreshRequests: vi.fn(),
    spareInventory: [],
    submitReplacementRequest: vi.fn(),
    approveRequest: vi.fn(),
    rejectRequest: vi.fn(),
    assignSpareDevice: vi.fn(),
    recordDispatch: vi.fn(),
    confirmDeviceActivation: vi.fn(),
    closeRequest: vi.fn(),
    getRequestsForSalesperson: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <DeviceReplacementContext.Provider value={deviceReplacementValue}>
        <ProfileView />
      </DeviceReplacementContext.Provider>
    </AuthContext.Provider>
  );
};

describe('ProfileView - My Replacement Requests Pagination', () => {
  it('defaults to page size 5 and renders exactly 5 items with pagination summary', () => {
    renderWithProviders(25);

    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 5 of 25 requests');

    // Check that exactly 5 request items are visible
    expect(screen.getByText('Issue description number 1')).toBeInTheDocument();
    expect(screen.getByText('Issue description number 5')).toBeInTheDocument();
    expect(screen.queryByText('Issue description number 6')).not.toBeInTheDocument();

    // Page size dropdown defaults to 5
    const pageSizeSelect = screen.getByTitle('Items per page') as HTMLSelectElement;
    expect(pageSizeSelect.value).toBe('5');
  });

  it('allows changing page size to 10, 20, 50', () => {
    renderWithProviders(25);

    const pageSizeSelect = screen.getByTitle('Items per page') as HTMLSelectElement;

    // Change to 10
    fireEvent.change(pageSizeSelect, { target: { value: '10' } });
    expect(screen.getByText('Issue description number 10')).toBeInTheDocument();
    expect(screen.queryByText('Issue description number 11')).not.toBeInTheDocument();

    // Change to 20
    fireEvent.change(pageSizeSelect, { target: { value: '20' } });
    expect(screen.getByText('Issue description number 20')).toBeInTheDocument();
    expect(screen.queryByText('Issue description number 21')).not.toBeInTheDocument();

    // Change to 50
    fireEvent.change(pageSizeSelect, { target: { value: '50' } });
    expect(screen.getByText('Issue description number 25')).toBeInTheDocument();
  });

  it('navigates to page 2 and shows the next batch of requests', () => {
    renderWithProviders(25);

    // Default 5 per page, click page 2 button
    const page2Btn = screen.getByRole('button', { name: '2' });
    fireEvent.click(page2Btn);

    expect(screen.queryByText('Issue description number 1')).not.toBeInTheDocument();
    expect(screen.getByText('Issue description number 6')).toBeInTheDocument();
    expect(screen.getByText('Issue description number 10')).toBeInTheDocument();
    expect(screen.queryByText('Issue description number 11')).not.toBeInTheDocument();
  });

  it('resets to page 1 when switching status filter', () => {
    renderWithProviders(25);

    // Go to page 3
    const page3Btn = screen.getByRole('button', { name: '3' });
    fireEvent.click(page3Btn);

    // Click Active filter pill
    const activeFilterBtn = screen.getByRole('button', { name: 'Active' });
    fireEvent.click(activeFilterBtn);

    // Should reset to page 1 showing Active items (odd index: 1, 3, 5, 7, 9)
    expect(screen.getByText('Issue description number 1')).toBeInTheDocument();
  });
});
