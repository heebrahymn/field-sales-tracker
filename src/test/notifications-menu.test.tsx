import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationsMenu } from '@/components/layout/NotificationsMenu';
import { ConsoleHeader } from '@/components/layout/ConsoleHeader';

// Mock AuthContext
const mockCurrentUser = {
  id: 'usr-head-01',
  name: 'Babajide Adeleke',
  email: 'babajide.adeleke@carboncarcare.com',
  role: 'country_sales_head',
  marketCode: 'NG',
  marketName: 'Nigeria (Lagos)',
};

const mockSwitchMarket = vi.fn();

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: mockCurrentUser,
    selectedMarket: 'NG',
    switchMarket: mockSwitchMarket,
  }),
}));

// Mock services
const mockGetCountryExceptions = vi.fn();
const mockGetCountryPendingPins = vi.fn();
const mockGetCountryVerificationFlags = vi.fn();
const mockGetPendingNonVisitRequests = vi.fn();
const mockGetClientAuditRecords = vi.fn();

vi.mock('@/services/managementService', () => ({
  managementService: {
    getCountryExceptions: (...args: any[]) => mockGetCountryExceptions(...args),
    getCountryPendingPins: (...args: any[]) => mockGetCountryPendingPins(...args),
    getCountryVerificationFlags: (...args: any[]) => mockGetCountryVerificationFlags(...args),
    getClientAuditRecords: (...args: any[]) => mockGetClientAuditRecords(...args),
  },
}));

vi.mock('@/services/attendanceService', () => ({
  attendanceService: {
    getPendingNonVisitRequests: (...args: any[]) => mockGetPendingNonVisitRequests(...args),
  },
}));

// Mock supabase for HQ Admin tests
const mockSupabaseFrom = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockSupabaseFrom(table),
  },
}));

describe('NotificationsMenu Component & Review Alerts Dropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.role = 'country_sales_head';
    mockCurrentUser.marketCode = 'NG';

    mockGetCountryExceptions.mockResolvedValue({
      data: [{ id: 'exc-1' }, { id: 'exc-2' }],
      error: null,
    });
    mockGetCountryPendingPins.mockResolvedValue([
      { id: 'pin-1' },
    ]);
    mockGetCountryVerificationFlags.mockResolvedValue({
      data: [{ id: 'flag-1' }],
      error: null,
    });
    mockGetPendingNonVisitRequests.mockResolvedValue({
      data: [],
      error: null,
    });
    mockGetClientAuditRecords.mockResolvedValue({
      data: [],
      error: null,
    });
  });

  it('renders the clickable bell trigger icon in ConsoleHeader', async () => {
    render(<ConsoleHeader title="Country Operations" />);

    const trigger = screen.getByRole('button', { name: /review notifications|pending review alerts/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('id', 'console-notifications-trigger');
  });

  it('displays the total unresolved alerts badge on the bell trigger', async () => {
    render(<NotificationsMenu />);

    // Total: 2 exceptions + 1 pin + 1 flag = 4 pending
    await waitFor(() => {
      const badge = screen.getByText('4');
      expect(badge).toBeInTheDocument();
    });
  });

  it('opens the notification dropdown when bell icon is clicked', async () => {
    render(<NotificationsMenu />);

    // Wait for initial load so count badge appears
    await screen.findByText('4');

    const trigger = screen.getByRole('button', { name: /alerts/i });
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: /notifications panel/i })).toBeInTheDocument();
    expect(screen.getByText('Review Notifications')).toBeInTheDocument();
    expect(await screen.findByText(/4 Action Required/i)).toBeInTheDocument();

    // Verify list of pending queues
    expect(screen.getByText('Pending Field Exceptions')).toBeInTheDocument();
    expect(screen.getByText('Client & GPS Pin Approvals')).toBeInTheDocument();
    expect(screen.getByText('Risk Flags Queue')).toBeInTheDocument();
  });

  it('navigates directly to the corresponding review workbench on alert item click', async () => {
    const onSelectSection = vi.fn();
    render(<NotificationsMenu onSelectSection={onSelectSection} />);

    // Open dropdown
    const trigger = screen.getByRole('button', { name: /alerts/i });
    fireEvent.click(trigger);

    // Click on Pending Field Exceptions
    const exceptionsItem = await screen.findByText('Pending Field Exceptions');
    fireEvent.click(exceptionsItem.closest('button')!);

    expect(onSelectSection).toHaveBeenCalledWith('exceptions');
    // Dropdown should close after click
    expect(screen.queryByRole('dialog', { name: /notifications panel/i })).not.toBeInTheDocument();
  });

  it('closes dropdown when user presses Escape key', async () => {
    render(<NotificationsMenu />);

    const trigger = screen.getByRole('button', { name: /alerts/i });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: /notifications panel/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /notifications panel/i })).not.toBeInTheDocument();
  });

  it('renders "All Queues Up to Date" when there are 0 pending items', async () => {
    mockGetCountryExceptions.mockResolvedValue({ data: [], error: null });
    mockGetCountryPendingPins.mockResolvedValue([]);
    mockGetCountryVerificationFlags.mockResolvedValue({ data: [], error: null });
    mockGetPendingNonVisitRequests.mockResolvedValue({ data: [], error: null });
    mockGetClientAuditRecords.mockResolvedValue({ data: [], error: null });

    render(<NotificationsMenu />);

    // Bell trigger should not display an alert count badge
    await waitFor(() => {
      expect(screen.queryByText(/^[0-9]+$/)).not.toBeInTheDocument();
    });

    const trigger = screen.getByRole('button', { name: /review notifications/i });
    fireEvent.click(trigger);

    expect(await screen.findByText('All Queues Up to Date')).toBeInTheDocument();
    expect(screen.getByText(/All Clear/i)).toBeInTheDocument();
  });

  it('loads and navigates HQ Admin alerts when logged in as hq_admin', async () => {
    mockCurrentUser.role = 'hq_admin';
    const onSelectSection = vi.fn();

    // Mock supabase counts for HQ Admin
    mockSupabaseFrom.mockImplementation((table: string) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockImplementation((_col: string, _val: string) => {
          if (table === 'device_replacement_requests') {
            return Promise.resolve({ count: 3, error: null });
          }
          if (table === 'exceptions') {
            return Promise.resolve({ count: 2, error: null });
          }
          if (table === 'branches') {
            return Promise.resolve({ count: 1, error: null });
          }
          return Promise.resolve({ count: 0, error: null });
        }),
      }),
    }));

    render(<NotificationsMenu onSelectSection={onSelectSection} />);

    // Total: 3 devices + 2 exceptions + 1 branch = 6
    await waitFor(() => {
      expect(screen.getByText('6')).toBeInTheDocument();
    });

    const trigger = screen.getByRole('button', { name: /alerts/i });
    fireEvent.click(trigger);

    expect(await screen.findByText('Company Device Replacements')).toBeInTheDocument();
    expect(screen.getByText('Field Exceptions Oversight')).toBeInTheDocument();
    expect(screen.getByText('Pending Branch Registrations')).toBeInTheDocument();

    // Click on Company Device Replacements -> navigates to 'devices'
    const deviceItem = screen.getByText('Company Device Replacements');
    fireEvent.click(deviceItem.closest('button')!);

    expect(onSelectSection).toHaveBeenCalledWith('devices');
  });
});
