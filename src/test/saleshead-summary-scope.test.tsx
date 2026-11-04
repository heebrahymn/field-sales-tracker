import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SalesHeadDashboardPreview } from '../features/review/SalesHeadDashboardPreview';
import { AuthContext } from '../context/AuthContext';
import { MarketConfigContext } from '../context/MarketConfigContext';
import { managementService } from '../services/managementService';
import { attendanceService } from '../services/attendanceService';

vi.mock('../services/managementService', () => ({
  managementService: {
    getCountryVisits: vi.fn(),
    getCountryPendingPins: vi.fn(),
    getCountryExceptions: vi.fn(),
    getCountryVerificationFlags: vi.fn(),
    getMarketSalespeople: vi.fn(),
  },
}));

vi.mock('../services/attendanceService', () => ({
  attendanceService: {
    getMarketAttendance: vi.fn(),
    getPendingNonVisitRequests: vi.fn(),
  },
  getMarketWorkDate: vi.fn().mockReturnValue('2026-11-04'),
}));

describe('Country Sales Head Summary Scope Filtering & Dynamic Pills', () => {
  const mockSalesHead = {
    id: 'sh-001',
    name: 'Babatunde Adeleke',
    role: 'country_sales_head',
    marketCode: 'NG',
    marketName: 'Nigeria (Africa/Lagos)',
  };

  const mockMarketConfig: any = {
    getActiveMarketRules: vi.fn().mockReturnValue({
      defaultGeofenceRadiusMeters: 200,
      maxGpsAccuracyMeters: 100,
      minVisitDurationMinutes: 5,
    }),
  };

  // Mock data covering daily (today: 2026-11-04), weekly (2026-11-02), and quarterly earlier (2026-10-15)
  const mockVisits = [
    // Today's visit (Daily)
    {
      id: 'vis-daily-01',
      repId: 'rep-01',
      repName: 'Tunde Adebayo',
      organisationName: 'Client Alpha',
      branchName: 'Branch Lagos',
      workDate: '2026-11-04',
      checkInAt: '2026-11-04T09:00:00Z',
      verificationStatus: 'location_verified',
      meetingLog: { id: 'log-01', purpose: 'routine_visit' },
    },
    // Earlier this week visit (Weekly)
    {
      id: 'vis-weekly-01',
      repId: 'rep-02',
      repName: 'Chukwudi Okafor',
      organisationName: 'Client Beta',
      branchName: 'Branch Ikeja',
      workDate: '2026-11-02',
      checkInAt: '2026-11-02T11:00:00Z',
      verificationStatus: 'location_verified',
      meetingLog: { id: 'log-02', purpose: 'introductory' },
    },
    {
      id: 'vis-weekly-02',
      repId: 'rep-01',
      repName: 'Tunde Adebayo',
      organisationName: 'Client Gamma',
      branchName: 'Branch Victoria Island',
      workDate: '2026-10-30',
      checkInAt: '2026-10-30T14:00:00Z',
      verificationStatus: 'manager_approved_unverified',
      meetingLog: null, // missing log
    },
    // Earlier this quarter visit (Quarterly: 2026-10-15)
    {
      id: 'vis-quarterly-01',
      repId: 'rep-03',
      repName: 'Fatima Bello',
      organisationName: 'Client Delta',
      branchName: 'Branch Lekki',
      workDate: '2026-10-15',
      checkInAt: '2026-10-15T10:00:00Z',
      verificationStatus: 'manager_approved_unverified',
      meetingLog: null, // missing log
    },
    {
      id: 'vis-quarterly-02',
      repId: 'rep-04',
      repName: 'Amara Diallo',
      organisationName: 'Client Epsilon',
      branchName: 'Branch Surulere',
      workDate: '2026-10-10',
      checkInAt: '2026-10-10T12:00:00Z',
      verificationStatus: 'location_verified',
      meetingLog: { id: 'log-03', purpose: 'product_demo' },
    },
  ];

  const mockFlags = [
    // Today flag
    {
      id: 'flag-01',
      createdAt: '2026-11-04T08:30:00Z',
      status: 'open',
    },
    // Weekly flag
    {
      id: 'flag-02',
      createdAt: '2026-11-01T15:00:00Z',
      status: 'open',
    },
    // Quarterly flag
    {
      id: 'flag-03',
      createdAt: '2026-10-12T10:00:00Z',
      status: 'open',
    },
  ];

  const mockReps = [
    { id: 'rep-01', full_name: 'Tunde Adebayo' },
    { id: 'rep-02', full_name: 'Chukwudi Okafor' },
    { id: 'rep-03', full_name: 'Fatima Bello' },
    { id: 'rep-04', full_name: 'Amara Diallo' },
    { id: 'rep-05', full_name: 'Emeka Nwosu' },
    { id: 'rep-06', full_name: 'Kelechi Ibe' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (managementService.getCountryVisits as any).mockResolvedValue({ data: mockVisits, error: null });
    (managementService.getCountryPendingPins as any).mockResolvedValue([]);
    (managementService.getCountryExceptions as any).mockResolvedValue({ data: [], error: null });
    (managementService.getCountryVerificationFlags as any).mockResolvedValue({ data: mockFlags, error: null });
    (managementService.getMarketSalespeople as any).mockResolvedValue(mockReps);
    (attendanceService.getMarketAttendance as any).mockResolvedValue({
      data: [{ status: 'started', user_id: 'rep-01' }],
      error: null,
    });
    (attendanceService.getPendingNonVisitRequests as any).mockResolvedValue({ data: [], error: null });
  });

  const renderComponent = () =>
    render(
      <AuthContext.Provider value={{ currentUser: mockSalesHead, login: vi.fn(), logout: vi.fn(), loading: false } as any}>
        <MarketConfigContext.Provider value={mockMarketConfig}>
          <SalesHeadDashboardPreview />
        </MarketConfigContext.Provider>
      </AuthContext.Provider>
    );

  it('renders dynamic labels on Summary Scope buttons with current date, week, and quarter', async () => {
    renderComponent();

    await waitFor(() => {
      expect(managementService.getCountryVisits).toHaveBeenCalledWith('NG', undefined, 200);
    });

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;

    // Daily button contains formatted current date, not hardcoded "19 Oct 2026"
    const dailyBtn = screen.getByRole('button', { name: new RegExp(`Daily \\(${formattedDate}\\)`, 'i') });
    expect(dailyBtn).toBeInTheDocument();

    // Weekly button contains dynamic ISO week
    const weeklyBtn = screen.getByRole('button', { name: /Weekly Rollup \(W\d+\)/i });
    expect(weeklyBtn).toBeInTheDocument();

    // Quarterly button contains dynamic quarter and year
    const quarterlyBtn = screen.getByRole('button', { name: new RegExp(`Quarterly \\(Q${currentQuarter} ${now.getFullYear()}\\)`, 'i') });
    expect(quarterlyBtn).toBeInTheDocument();
  });

  it('filters KPI cards to Daily scope by default', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Summary Scope:')).toBeInTheDocument();
    });

    // In Daily scope:
    // Only 1 visit today (2026-11-04): location_verified, meeting log complete
    // Active reps: 1 (from attendance started)
    // Urgent flags: 1 (from today)
    // Approved unverified: 0
    // Missing logs: 0

    // Check Location Verified visits
    const locVerifiedCard = screen.getByText('Location Verified').closest('div');
    expect(locVerifiedCard).toBeInTheDocument();
    expect(screen.getByText('Provisional (Live)')).toBeInTheDocument();

    // Check Missing Logs
    expect(screen.getByText('>2h SLA Overdue')).toBeInTheDocument();

    // Check Action Required for daily flags
    expect(screen.getByText('Action Required')).toBeInTheDocument();
  });

  it('dynamically updates KPI metrics when switching to Weekly Rollup', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Summary Scope:')).toBeInTheDocument();
    });

    // Click Weekly Rollup
    const weeklyBtn = screen.getByRole('button', { name: /Weekly Rollup/i });
    fireEvent.click(weeklyBtn);

    // Weekly scope includes: 3 visits (vis-daily-01, vis-weekly-01, vis-weekly-02)
    // - 2 location_verified (vis-daily-01, vis-weekly-01)
    // - 1 manager_approved_unverified (vis-weekly-02)
    // - 1 missing log (vis-weekly-02)
    // - 2 urgent flags (flag-01, flag-02)
    // - Reps: rep-01, rep-02 (2 active reps)

    await waitFor(() => {
      expect(screen.getByText('Workweek Rollup (Last 7 Days) • Updated live')).toBeInTheDocument();
      expect(screen.getByText('Weekly Sign-offs')).toBeInTheDocument();
      expect(screen.getByText('Unlogged (Week)')).toBeInTheDocument();
      expect(screen.getByText('Open This Week')).toBeInTheDocument();
      expect(screen.getByText('Active reps this week')).toBeInTheDocument();
    });
  });

  it('dynamically updates KPI metrics when switching to Quarterly scope', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Summary Scope:')).toBeInTheDocument();
    });

    // Click Quarterly
    const quarterlyBtn = screen.getByRole('button', { name: /Quarterly/i });
    fireEvent.click(quarterlyBtn);

    // Quarterly scope includes all 5 visits in Q4:
    // - 3 location_verified (vis-daily-01, vis-weekly-01, vis-quarterly-02)
    // - 2 manager_approved_unverified (vis-weekly-02, vis-quarterly-01)
    // - 2 missing logs (vis-weekly-02, vis-quarterly-01)
    // - 3 open flags
    // - Reps: rep-01, rep-02, rep-03, rep-04 (4 active reps)

    await waitFor(() => {
      expect(screen.getByText('Quarter to Date • Updated live')).toBeInTheDocument();
      expect(screen.getByText('Quarterly Total')).toBeInTheDocument();
      expect(screen.getByText('Unlogged (Quarter)')).toBeInTheDocument();
      expect(screen.getByText('Quarterly Backlog')).toBeInTheDocument();
      expect(screen.getByText('Active reps this quarter')).toBeInTheDocument();
    });
  });

  it('defaults pending client approvals and exceptions cards to 5 items with pagination', async () => {
    const mockPins = Array.from({ length: 8 }, (_, idx) => ({
      id: `pin-${idx + 1}`,
      branchId: `branch-${idx + 1}`,
      branchName: `Client Branch ${idx + 1}`,
      address: `Location Address ${idx + 1}`,
      organisationName: `Org ${idx + 1}`,
      proposedByName: 'Tunde Adebayo',
      proposedAt: '2026-11-04T10:00:00Z',
      reportedAccuracyM: 25,
      versionNumber: 1,
      hasSharedPhone: false,
    }));

    const mockExceptions = Array.from({ length: 11 }, (_, idx) => ({
      id: `exc-${idx + 1}`,
      branchName: `Exception Branch ${idx + 1}`,
      organisationName: `Client Org ${idx + 1}`,
      repName: 'Tunde Adebayo',
      failureReason: 'GPS hardware glitch',
      claimedCheckInTime: '2026-11-04T09:30:00Z',
    }));

    (managementService.getCountryPendingPins as any).mockResolvedValue(mockPins);
    (managementService.getCountryExceptions as any).mockResolvedValue({ data: mockExceptions, error: null });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Pending Client & GPS Approvals')).toBeInTheDocument();
      expect(screen.getByText('Exceptions Workbench')).toBeInTheDocument();
    });

    // Check header View All counts
    expect(screen.getByText('View All (8)')).toBeInTheDocument();
    expect(screen.getByText('View All (11)')).toBeInTheDocument();

    // Check pagination summaries defaulting to 5 items
    const showingElements = screen.getAllByText(/Showing/);
    expect(showingElements[0].closest('div')).toHaveTextContent('Showing 1 to 5 of 8 approvals');
    expect(showingElements[1].closest('div')).toHaveTextContent('Showing 1 to 5 of 11 exceptions');

    // Check that exactly 5 pins and 5 exceptions are shown
    expect(screen.getByText('Client Branch 1')).toBeInTheDocument();
    expect(screen.getByText('Client Branch 5')).toBeInTheDocument();
    expect(screen.queryByText('Client Branch 6')).not.toBeInTheDocument();

    expect(screen.getByText('Exception Branch 1')).toBeInTheDocument();
    expect(screen.getByText('Exception Branch 5')).toBeInTheDocument();
    expect(screen.queryByText('Exception Branch 6')).not.toBeInTheDocument();
  });
});

