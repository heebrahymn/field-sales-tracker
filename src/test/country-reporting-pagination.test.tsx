import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CountryReportingView } from '@/features/review/CountryReportingView';
import { managementService } from '@/services/managementService';

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: {
      id: 'head-uuid-1',
      fullName: 'Babatunde Adeleke',
      role: 'country_sales_head',
      marketCode: 'NG',
      marketName: 'Nigeria',
    },
  }),
}));

// Mock managementService
vi.mock('@/services/managementService', () => ({
  managementService: {
    getCountryVisits: vi.fn(),
    getMarketSalespeople: vi.fn(),
  },
}));

describe('CountryReportingView - Individual Operational Records Pagination', () => {
  // Generate 25 mock visits to test pagination across pages
  const generateMockVisits = (count: number) => {
    const todayDate = new Date().toISOString().slice(0, 10);
    return Array.from({ length: count }, (_, idx) => {
      const num = idx + 1;
      return {
        id: `V${String(num).padStart(7, '0')}`, // 8 chars e.g. V0000001
        repId: num % 2 === 0 ? 'rep-uuid-1' : 'rep-uuid-2',
        repName: num % 2 === 0 ? 'Tunde Adebayo' : 'Chinyere Nwosu',
        organisationName: `Client Org ${num}`,
        branchName: `Branch ${num}`,
        branchAddress: `Street Address ${num}`,
        category: 'fleet_operator',
        marketCode: 'NG',
        workDate: todayDate,
        checkInAt: `${todayDate}T08:${String(num % 60).padStart(2, '0')}:00Z`,
        checkOutAt: `${todayDate}T09:${String(num % 60).padStart(2, '0')}:00Z`,
        durationMinutes: 30,
        verificationStatus: num % 3 === 0 ? 'location_verified' : 'manager_approved_unverified',
        checkInAccuracyM: 15,
        distanceMeters: 45,
        capturedOffline: num % 5 === 0,
        premisesPhotoPath: 'photo.jpg',
        meetingLog: {
          id: `log-${num}`,
          contactName: `Contact ${num}`,
          contactRole: 'Fleet Manager',
          visitPurpose: 'routine_visit',
          productsDiscussed: ['Heavy Duty Engine Oil'],
          fleetSizeOrVolume: '25 units',
          outcomeNarrative: 'Meeting completed',
          nextStepText: 'Follow up',
          submittedAt: `${todayDate}T09:15:00Z`,
        },
        clientAuditStatus: null,
      };
    });
  };

  const mockSalespeople = [
    { id: 'rep-uuid-1', full_name: 'Tunde Adebayo', market_code: 'NG' },
    { id: 'rep-uuid-2', full_name: 'Chinyere Nwosu', market_code: 'NG' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (managementService.getCountryVisits as any).mockResolvedValue({
      data: generateMockVisits(25),
      error: null,
    });
    (managementService.getMarketSalespeople as any).mockResolvedValue(mockSalespeople);
  });

  it('renders Individual Operational Records and defaults to 10 items per page with pagination summary', async () => {
    render(<CountryReportingView marketName="Nigeria" />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/Individual Visit Records \(Filtered\)/i)).toBeInTheDocument();
    });

    // Switch to Tab 2: Individual Visit Records (Filtered)
    const granularTabBtn = screen.getByText(/Individual Visit Records \(Filtered\)/i);
    fireEvent.click(granularTabBtn);

    // Verify title and subtitle
    expect(screen.getByText('Individual Operational Records')).toBeInTheDocument();
    expect(
      screen.getByText(/Detailed audit trail filtered by representative, date range, location, and status/i)
    ).toBeInTheDocument();

    // Verify table rendered with 10 rows
    const rows = screen.getAllByText(/#V0/i);
    expect(rows).toHaveLength(10);
    expect(rows[0]).toHaveTextContent('#V0000001');
    expect(rows[9]).toHaveTextContent('#V0000010');

    // Verify pagination controls: Showing 1 to 10 of 25 records
    const summary = screen.getByText(/Showing/i).closest('div');
    expect(summary).toHaveTextContent(/Showing 1 to 10 of 25 records/i);

    // Verify page size options include 10, 20, 50, 100
    const pageSizeSelect = screen.getByTitle('Items per page') as HTMLSelectElement;
    expect(pageSizeSelect.value).toBe('10');
    const options = Array.from(pageSizeSelect.options).map((o) => o.value);
    expect(options).toEqual(['10', '20', '50', '100']);
  });

  it('navigates to page 2 and page 3', async () => {
    render(<CountryReportingView marketName="Nigeria" />);

    await waitFor(() => {
      expect(screen.getByText(/Individual Visit Records \(Filtered\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Individual Visit Records \(Filtered\)/i));

    // Click Next Page button
    const nextBtn = screen.getByTitle(/Next Page/i);
    fireEvent.click(nextBtn);

    // Should now show records 11 to 20
    const page2Rows = screen.getAllByText(/#V0/i);
    expect(page2Rows).toHaveLength(10);
    expect(page2Rows[0]).toHaveTextContent('#V0000011');
    expect(page2Rows[9]).toHaveTextContent('#V0000020');

    const summary = screen.getByText(/Showing/i).closest('div');
    expect(summary).toHaveTextContent(/Showing 11 to 20 of 25 records/i);

    // Click Next Page again to go to page 3
    fireEvent.click(nextBtn);
    const page3Rows = screen.getAllByText(/#V0/i);
    expect(page3Rows).toHaveLength(5);
    expect(page3Rows[0]).toHaveTextContent('#V0000021');
    expect(page3Rows[4]).toHaveTextContent('#V0000025');

    const summaryPage3 = screen.getByText(/Showing/i).closest('div');
    expect(summaryPage3).toHaveTextContent(/Showing 21 to 25 of 25 records/i);
  });

  it('changes page size to 20 and displays 20 items per page', async () => {
    render(<CountryReportingView marketName="Nigeria" />);

    await waitFor(() => {
      expect(screen.getByText(/Individual Visit Records \(Filtered\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Individual Visit Records \(Filtered\)/i));

    const pageSizeSelect = screen.getByTitle('Items per page');
    fireEvent.change(pageSizeSelect, { target: { value: '20' } });

    const rows = screen.getAllByText(/#V0/i);
    expect(rows).toHaveLength(20);
    expect(rows[0]).toHaveTextContent('#V0000001');
    expect(rows[19]).toHaveTextContent('#V0000020');

    const summary = screen.getByText(/Showing/i).closest('div');
    expect(summary).toHaveTextContent(/Showing 1 to 20 of 25 records/i);
  });

  it('resets pagination to page 1 when search query is entered', async () => {
    render(<CountryReportingView marketName="Nigeria" />);

    await waitFor(() => {
      expect(screen.getByText(/Individual Visit Records \(Filtered\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Individual Visit Records \(Filtered\)/i));

    // Go to Page 2
    const nextBtn = screen.getByTitle(/Next Page/i);
    fireEvent.click(nextBtn);
    expect(screen.getByText(/Showing/i).closest('div')).toHaveTextContent(/Showing 11 to 20 of 25 records/i);

    // Search for a specific client
    const searchInput = screen.getByPlaceholderText(/Search record ID, rep, client/i);
    fireEvent.change(searchInput, { target: { value: 'Client Org 1' } });

    // Should reset to page 1
    await waitFor(() => {
      const summary = screen.getByText(/Showing/i).closest('div');
      expect(summary).toHaveTextContent(/Showing 1 to/i);
    });
  });
});
