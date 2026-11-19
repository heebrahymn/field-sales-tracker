import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, within } from '@testing-library/react';
import { DesktopSidebar } from '@/components/layout/DesktopSidebar';
import { SalesHeadDashboardPreview } from '@/features/review/SalesHeadDashboardPreview';
import { ClientVisitVerification } from '@/features/review/ClientVisitVerification';
import { NotificationsMenu } from '@/components/layout/NotificationsMenu';
import { AuthContext } from '@/context/AuthContext';
import { MarketConfigContext } from '@/context/MarketConfigContext';
import { managementService } from '@/services/managementService';
import { attendanceService } from '@/services/attendanceService';
import { supabase } from '@/lib/supabase';
import { emitBadgeCountsChanged, isClientAuditActionRequired } from '@/utils/badgeSync';

const mockSalesHead = {
  id: 'sh-ng-001',
  name: 'Babajide Adeleke',
  email: 'babajide.adeleke@carboncarcare.com',
  role: 'country_sales_head',
  marketCode: 'NG',
  marketName: 'Nigeria (Africa/Lagos)',
};

const mockHqAdmin = {
  id: 'hq-001',
  name: 'Ibrahim Musa',
  email: 'ibrahim.musa@carboncarcare.com',
  role: 'hq_admin',
  marketCode: 'ALL',
  marketName: 'Global HQ',
};

const mockMarketConfig: any = {
  getActiveMarketRules: () => ({
    defaultGeofenceRadiusMeters: 200,
    maxGpsAccuracyMeters: 100,
    maxProposedPinGpsAccuracyMeters: 50,
    minVisitDurationMinutes: 5,
  }),
};

function makeVisits(count: number, marketCode = 'NG') {
  return Array.from({ length: count }, (_, idx) => ({
    id: `vis-${idx + 1}`,
    repId: `rep-${(idx % 5) + 1}`,
    repName: `Salesperson ${(idx % 5) + 1}`,
    organisationName: `Org ${(idx % 10) + 1}`,
    branchName: `Branch ${idx + 1}`,
    branchAddress: `${idx + 1} Industrial Road`,
    category: 'fleet_operator',
    marketCode,
    workDate: '2026-11-18',
    checkInAt: '2026-11-18T09:00:00Z',
    checkOutAt: '2026-11-18T09:30:00Z',
    durationMinutes: 30,
    verificationStatus: 'location_verified' as const,
    checkInLatitude: 6.5,
    checkInLongitude: 3.3,
    checkInAccuracyM: 25,
    checkOutLatitude: 6.5,
    checkOutLongitude: 3.3,
    checkOutAccuracyM: 25,
    pinLatitude: 6.5,
    pinLongitude: 3.3,
    geofenceRadiusM: 200,
    distanceMeters: 15,
    withinGeofence: true,
    capturedOffline: false,
    premisesPhotoPath: null,
    meetingLog: null,
    clientAuditStatus: null,
  }));
}

describe('Country Sales Head Badge Accuracy & Cross-Tab Synchronization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('paginates managementService.getCountryVisits beyond 1,000 rows without 50/200 caps', async () => {
    const page1 = Array.from({ length: 1000 }, (_, i) => ({
      id: `v-p1-${i}`,
      user_id: 'u-1',
      branch_id: 'b-1',
      check_in_at: '2026-11-18T10:00:00Z',
      check_out_at: '2026-11-18T10:25:00Z',
      verification_status: 'location_verified',
      profiles: { id: 'u-1', full_name: 'Tunde Adebayo', market_code: 'NG' },
      branches: { id: 'b-1', branch_name: 'Lekki Hub', market_code: 'NG', organisations: { name: 'Carbon' } },
      meeting_logs: [],
      client_audit_records: [],
    }));
    const page2 = Array.from({ length: 120 }, (_, i) => ({
      id: `v-p2-${i}`,
      user_id: 'u-1',
      branch_id: i < 103 ? 'b-1' : 'b-2',
      check_in_at: '2026-11-18T10:00:00Z',
      check_out_at: '2026-11-18T10:25:00Z',
      verification_status: 'location_verified',
      profiles: { id: 'u-1', full_name: 'Tunde Adebayo', market_code: i < 103 ? 'NG' : 'ZM' },
      branches: {
        id: i < 103 ? 'b-1' : 'b-2',
        branch_name: i < 103 ? 'Lekki Hub' : 'Lusaka Hub',
        market_code: i < 103 ? 'NG' : 'ZM',
        organisations: { name: 'Carbon' },
      },
      meeting_logs: [],
      client_audit_records: [],
    }));

    const rangeMock = vi.fn().mockImplementation((from: number) => {
      if (from === 0) return Promise.resolve({ data: page1, error: null });
      return Promise.resolve({ data: page2, error: null });
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: () => ({
        order: () => ({
          range: rangeMock,
        }),
      }),
    } as any);

    const { data, error } = await managementService.getCountryVisits('NG');
    expect(error).toBeNull();
    expect(rangeMock).toHaveBeenNthCalledWith(1, 0, 999);
    expect(rangeMock).toHaveBeenNthCalledWith(2, 1000, 1999);
    // 1000 from page 1 + 103 NG from page 2 (17 ZM rows filtered out)
    expect(data).toHaveLength(1103);
  });

  it('displays identical live counts across DesktopSidebar, Top Tabs, ClientVisitVerification, and NotificationsMenu (>50 & >200 visits)', async () => {
    const visits103 = makeVisits(103);
    const pendingPins = [{ id: 'pin-1' } as any];
    const pendingExceptions = Array.from({ length: 25 }, (_, i) => ({ id: `exc-${i}` })) as any[];
    const openFlags = Array.from({ length: 7 }, (_, i) => ({ id: `flg-${i}` })) as any[];
    const auditRecords = [
      ...Array.from({ length: 9 }, (_, i) => ({
        id: `aud-p-${i}`,
        callStatus: 'pending_call',
        meetingConfirmed: null,
        disputeStatus: 'none',
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `aud-d-${i}`,
        callStatus: 'connected',
        meetingConfirmed: false,
        disputeStatus: 'under_investigation',
      })),
      {
        id: 'aud-resolved',
        callStatus: 'connected',
        meetingConfirmed: true,
        disputeStatus: 'resolved_cleared',
      },
    ] as any[];
    const pendingNonVisit = Array.from({ length: 3 }, (_, i) => ({ id: `abs-${i}` })) as any[];

    vi.spyOn(managementService, 'getCountryVisits').mockResolvedValue({ data: visits103, error: null });
    vi.spyOn(managementService, 'getCountryPendingPins').mockResolvedValue(pendingPins);
    vi.spyOn(managementService, 'getCountryExceptions').mockResolvedValue({ data: pendingExceptions, error: null });
    vi.spyOn(managementService, 'getCountryVerificationFlags').mockResolvedValue({ data: openFlags, error: null });
    vi.spyOn(managementService, 'getClientAuditRecords').mockResolvedValue({ data: auditRecords, error: null });
    vi.spyOn(managementService, 'getMarketSalespeople').mockResolvedValue([]);
    vi.spyOn(attendanceService, 'getMarketAttendance').mockResolvedValue({ data: [], error: null });
    vi.spyOn(attendanceService, 'getPendingNonVisitRequests').mockResolvedValue({ data: pendingNonVisit, error: null });

    render(
      <AuthContext.Provider value={{ currentUser: mockSalesHead, selectedMarket: 'NG' } as any}>
        <MarketConfigContext.Provider value={mockMarketConfig}>
          <div data-testid="sidebar-wrap">
            <DesktopSidebar activeSection="visits" onSelectSection={vi.fn()} />
          </div>
          <div data-testid="bell-wrap">
            <NotificationsMenu />
          </div>
          <div data-testid="dashboard-wrap">
            <SalesHeadDashboardPreview activeSection="visits" onSelectSection={vi.fn()} />
          </div>
        </MarketConfigContext.Provider>
      </AuthContext.Provider>
    );

    const sidebar = within(screen.getByTestId('sidebar-wrap'));
    const dashboard = within(screen.getByTestId('dashboard-wrap'));

    await waitFor(() => {
      // Sidebar badges
      expect(sidebar.getByRole('button', { name: /Client Visit Verification/i })).toHaveTextContent('103');
      expect(sidebar.getByRole('button', { name: /Client & GPS Approvals/i })).toHaveTextContent('1');
      expect(sidebar.getByRole('button', { name: /Exception Workbench/i })).toHaveTextContent('25');
      expect(sidebar.getByRole('button', { name: /Risk Flags Queue/i })).toHaveTextContent('7');
      expect(sidebar.getByRole('button', { name: /Client Audit Calls \(5%\)/i })).toHaveTextContent('14');
      expect(sidebar.getByRole('button', { name: /Team Attendance/i })).toHaveTextContent('3');

      // Horizontal tab badges match sidebar 1:1
      expect(dashboard.getByRole('button', { name: /Client Visit Verification/i })).toHaveTextContent('103');
      expect(dashboard.getByRole('button', { name: /Client Approvals/i })).toHaveTextContent('1');
      expect(dashboard.getByRole('button', { name: /Exception Workbench/i })).toHaveTextContent('25');
      expect(dashboard.getByRole('button', { name: /Risk Flags Queue/i })).toHaveTextContent('7');
      expect(dashboard.getByRole('button', { name: /Client Audit Calls \(5%\)/i })).toHaveTextContent('14');
      expect(dashboard.getByRole('button', { name: /Team Attendance/i })).toHaveTextContent('3');

      // ClientVisitVerification view displays all 103 records (never capped at 50)
      expect(dashboard.getByRole('button', { name: /^All \(103\)$/i })).toBeInTheDocument();
      const matchingDiv = dashboard.getByText(
        (_content, el) =>
          el?.tagName === 'DIV' && /^Showing\s+103\s+matching visits$/i.test((el.textContent || '').trim()) && !el.querySelector('div')
      );
      expect(matchingDiv).toBeInTheDocument();
      const paginationSpan = dashboard.getByText(
        (_content, el) =>
          el?.tagName === 'SPAN' && /^Showing\s+1\s+to\s+5\s+of\s+103\s+visits$/i.test((el.textContent || '').trim())
      );
      expect(paginationSpan).toBeInTheDocument();
    });

    // Bell reflects exact sum of action queues: 1 + 25 + 7 + 14 + 3 = 50
    const bellTrigger = within(screen.getByTestId('bell-wrap')).getByRole('button');
    expect(bellTrigger).toHaveTextContent('50');
  });

  it('refreshes sidebar, top tabs, and notification bell immediately when BADGE_COUNTS_CHANGED_EVENT fires', async () => {
    const visitsSpy = vi
      .spyOn(managementService, 'getCountryVisits')
      .mockResolvedValue({ data: makeVisits(215), error: null });
    const pinsSpy = vi
      .spyOn(managementService, 'getCountryPendingPins')
      .mockResolvedValue([{ id: 'pin-1' } as any, { id: 'pin-2' } as any]);
    vi.spyOn(managementService, 'getCountryExceptions').mockResolvedValue({ data: [], error: null });
    vi.spyOn(managementService, 'getCountryVerificationFlags').mockResolvedValue({ data: [], error: null });
    const auditsSpy = vi.spyOn(managementService, 'getClientAuditRecords').mockResolvedValue({
      data: [{ id: 'a1', callStatus: 'pending_call', meetingConfirmed: null, disputeStatus: 'none' }] as any[],
      error: null,
    });
    vi.spyOn(managementService, 'getMarketSalespeople').mockResolvedValue([]);
    vi.spyOn(attendanceService, 'getMarketAttendance').mockResolvedValue({ data: [], error: null });
    vi.spyOn(attendanceService, 'getPendingNonVisitRequests').mockResolvedValue({ data: [], error: null });

    render(
      <AuthContext.Provider value={{ currentUser: mockSalesHead, selectedMarket: 'NG' } as any}>
        <MarketConfigContext.Provider value={mockMarketConfig}>
          <div data-testid="sidebar-wrap">
            <DesktopSidebar activeSection="dashboard" onSelectSection={vi.fn()} />
          </div>
          <div data-testid="bell-wrap">
            <NotificationsMenu />
          </div>
          <div data-testid="dashboard-wrap">
            <SalesHeadDashboardPreview activeSection="dashboard" onSelectSection={vi.fn()} />
          </div>
        </MarketConfigContext.Provider>
      </AuthContext.Provider>
    );

    const sidebar = within(screen.getByTestId('sidebar-wrap'));
    const dashboard = within(screen.getByTestId('dashboard-wrap'));

    await waitFor(() => {
      expect(sidebar.getByRole('button', { name: /Client Visit Verification/i })).toHaveTextContent('215');
      expect(sidebar.getByRole('button', { name: /Client & GPS Approvals/i })).toHaveTextContent('2');
      expect(dashboard.getByRole('button', { name: /Client Audit Calls \(5%\)/i })).toHaveTextContent('1');
    });

    // Simulate queue mutations (e.g., 1 new visit synced, 1 pin approved, audit call completed)
    visitsSpy.mockResolvedValue({ data: makeVisits(216), error: null });
    pinsSpy.mockResolvedValue([{ id: 'pin-2' } as any]);
    auditsSpy.mockResolvedValue({
      data: [{ id: 'a1', callStatus: 'connected', meetingConfirmed: true, disputeStatus: 'none' }] as any[],
      error: null,
    });

    act(() => {
      emitBadgeCountsChanged();
    });

    await waitFor(() => {
      expect(sidebar.getByRole('button', { name: /Client Visit Verification/i })).toHaveTextContent('216');
      expect(dashboard.getByRole('button', { name: /Client Visit Verification/i })).toHaveTextContent('216');
      expect(sidebar.getByRole('button', { name: /Client & GPS Approvals/i })).toHaveTextContent('1');
      expect(dashboard.getByRole('button', { name: /Client Approvals/i })).toHaveTextContent('1');
      expect(dashboard.getByRole('button', { name: /Client Audit Calls \(5%\)/i })).toHaveTextContent('0');
      expect(within(screen.getByTestId('bell-wrap')).getByRole('button')).toHaveTextContent('1');
    });
  });

  it('keeps HQ Admin sidebar badges (exceptions, devices, clients, audits) accurate and refreshes on events', async () => {
    const countsByTable: Record<string, number> = {
      exceptions: 4,
      device_replacement_requests: 2,
      branches: 5,
      client_audit_records: 3,
    };

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      const builder: any = {
        select: () => builder,
        eq: () => Promise.resolve({ count: countsByTable[table] ?? 0, error: null }),
      };
      return builder;
    });

    render(
      <AuthContext.Provider value={{ currentUser: mockHqAdmin, selectedMarket: 'ALL' } as any}>
        <DesktopSidebar activeSection="dashboard" onSelectSection={vi.fn()} />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Exception Oversight/i })).toHaveTextContent('4');
      expect(screen.getByRole('button', { name: /Company Devices & MDM/i })).toHaveTextContent('2');
      expect(screen.getByRole('button', { name: /Clients & Sites Directory/i })).toHaveTextContent('5');
      expect(screen.getByRole('button', { name: /Client Audit Oversight/i })).toHaveTextContent('3');
    });

    expect(isClientAuditActionRequired({ callStatus: 'pending_call' })).toBe(true);
    expect(isClientAuditActionRequired({ callStatus: 'connected', meetingConfirmed: false, disputeStatus: 'none' })).toBe(true);
    expect(isClientAuditActionRequired({ callStatus: 'connected', meetingConfirmed: false, disputeStatus: 'resolved_cleared' })).toBe(false);
    expect(isClientAuditActionRequired({ callStatus: 'connected', meetingConfirmed: true })).toBe(false);
  });

  it('renders all 103 visits in ClientVisitVerification without requiring parent wrapper', async () => {
    vi.spyOn(managementService, 'getCountryVisits').mockResolvedValue({ data: makeVisits(103), error: null });

    render(
      <AuthContext.Provider value={{ currentUser: mockSalesHead } as any}>
        <MarketConfigContext.Provider value={mockMarketConfig}>
          <ClientVisitVerification />
        </MarketConfigContext.Provider>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(managementService.getCountryVisits).toHaveBeenCalledWith('NG');
      expect(screen.getByRole('button', { name: /^All \(103\)$/i })).toBeInTheDocument();
      const matchingDiv = screen.getByText(
        (_content, el) =>
          el?.tagName === 'DIV' && /^Showing\s+103\s+matching visits$/i.test((el.textContent || '').trim()) && !el.querySelector('div')
      );
      expect(matchingDiv).toBeInTheDocument();
    });
  });
});
