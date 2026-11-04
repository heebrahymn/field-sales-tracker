import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RiskFlagsWorkbench } from '../features/review/RiskFlagsWorkbench';
import { AuthContext } from '../context/AuthContext';
import { managementService, RealVerificationFlag } from '../services/managementService';

const mockManagerUser = {
  id: '22222222-2222-4222-a222-222222222222',
  name: 'Babatunde Adeleke',
  email: 'babatunde.adeleke@carboncarcare.com',
  role: 'country_sales_head' as const,
  marketCode: 'NG' as const,
  marketName: 'Nigeria (Lagos Hub)',
  timezone: 'Africa/Lagos',
  employeeId: 'CSH-NG-001',
  isActive: true,
};

const createMockFlags = (count: number): RealVerificationFlag[] => {
  return Array.from({ length: count }, (_, idx) => {
    const isHigh = idx % 2 === 0;
    const isOpen = idx < 7; // 7 open flags, remainder resolved
    const repName = idx % 2 === 0 ? 'Tunde Adebayo' : 'Chukwudi Okafor';
    const day = 20 + (idx % 10); // 2026-10-20 to 2026-10-29
    return {
      id: `FLAG-UUID-${String(idx + 1).padStart(4, '0')}`,
      visitId: `VISIT-${idx + 1}`,
      attendanceDayId: null,
      userId: `rep-${(idx % 2) + 1}`,
      repName,
      marketCode: 'NG',
      flagCode: idx % 3 === 0 ? 'out_of_bounds_checkout' : idx % 3 === 1 ? 'rapid_travel' : 'short_visit',
      severity: isHigh ? 'high' : 'medium',
      status: isOpen ? 'open' : 'cleared',
      details: {
        metricObserved: `Anomaly observation #${idx + 1}`,
        thresholdLimit: 'Automated Telemetry Threshold',
        notes: `Flag explanation notes for item ${idx + 1}`,
      },
      reviewerNotes: isOpen ? null : 'Manager resolution verified',
      reviewedBy: isOpen ? null : mockManagerUser.id,
      reviewedAt: isOpen ? null : '2026-11-04T10:00:00Z',
      createdAt: `2026-10-${day}T08:00:00Z`,
      organisationName: `Client Org ${idx + 1}`,
      branchName: `Branch Location ${idx + 1}`,
    };
  });
};

const renderWorkbench = (flagCount = 24) => {
  const flags = createMockFlags(flagCount);
  vi.spyOn(managementService, 'getCountryVerificationFlags').mockResolvedValue({
    data: flags,
    error: null,
  });

  const authValue: any = {
    currentUser: mockManagerUser,
    refreshProfile: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <RiskFlagsWorkbench />
    </AuthContext.Provider>
  );
};

describe('RiskFlagsWorkbench - Pagination & Filter Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults to page size 5 and renders exactly 5 items with pagination summary', async () => {
    renderWorkbench(24);

    await waitFor(() => {
      expect(screen.getByText(/Showing/)).toBeInTheDocument();
    });

    // Check pagination summary
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 5 of 24 flags');

    // Page 1 should display items 1 through 5
    expect(screen.getByText('Client Org 1 •')).toBeInTheDocument();
    expect(screen.getByText('Client Org 5 •')).toBeInTheDocument();

    // Item 6 should not be on page 1
    expect(screen.queryByText('Client Org 6 •')).not.toBeInTheDocument();
  });

  it('navigates through pages using Next and Previous controls', async () => {
    renderWorkbench(24);

    await waitFor(() => {
      expect(screen.getByText(/Showing/)).toBeInTheDocument();
    });

    const nextBtn = screen.getByTitle(/Next Page/i);
    expect(nextBtn).toBeEnabled();

    // Go to page 2
    fireEvent.click(nextBtn);

    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 6 to 10 of 24 flags');
    expect(screen.getByText('Client Org 6 •')).toBeInTheDocument();
    expect(screen.getByText('Client Org 10 •')).toBeInTheDocument();
    expect(screen.queryByText('Client Org 1 •')).not.toBeInTheDocument();

    // Go back to page 1
    const prevBtn = screen.getByTitle(/Previous Page/i);
    fireEvent.click(prevBtn);

    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 5 of 24 flags');
    expect(screen.getByText('Client Org 1 •')).toBeInTheDocument();
  });

  it('allows changing page size to 10, 20, and 50', async () => {
    renderWorkbench(24);

    await waitFor(() => {
      expect(screen.getByText(/Showing/)).toBeInTheDocument();
    });

    const pageSizeSelect = screen.getByTitle('Items per page');
    expect(pageSizeSelect).toBeInTheDocument();

    // Change page size to 10
    fireEvent.change(pageSizeSelect, { target: { value: '10' } });
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 10 of 24 flags');
    expect(screen.getByText('Client Org 1 •')).toBeInTheDocument();
    expect(screen.getByText('Client Org 10 •')).toBeInTheDocument();
    expect(screen.queryByText('Client Org 11 •')).not.toBeInTheDocument();

    // Change page size to 20
    fireEvent.change(pageSizeSelect, { target: { value: '20' } });
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 20 of 24 flags');
    expect(screen.getByText('Client Org 20 •')).toBeInTheDocument();
    expect(screen.queryByText('Client Org 21 •')).not.toBeInTheDocument();

    // Change page size to 50 (all 24 items fit on single page)
    fireEvent.change(pageSizeSelect, { target: { value: '50' } });
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 24 of 24 flags');
    expect(screen.getByText('Client Org 1 •')).toBeInTheDocument();
    expect(screen.getByText('Client Org 24 •')).toBeInTheDocument();
  });

  it('filters by salesperson name dropdown and updates pagination', async () => {
    renderWorkbench(24);

    await waitFor(() => {
      expect(screen.getByText(/Showing/)).toBeInTheDocument();
    });

    const repSelect = screen.getByTitle('Filter by salesperson name');
    expect(repSelect).toBeInTheDocument();

    // Filter by Chukwudi Okafor (12 out of 24 items)
    fireEvent.change(repSelect, { target: { value: 'Chukwudi Okafor' } });

    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 5 of 12 flags');

    // All displayed cards should belong to Chukwudi Okafor
    const salespersonLabels = screen.getAllByText('Chukwudi Okafor');
    expect(salespersonLabels.length).toBeGreaterThan(0);
    // Tunde Adebayo should only exist in the dropdown option, not on any rendered card
    expect(screen.getAllByText('Tunde Adebayo')).toHaveLength(1);
  });

  it('filters by date range (From and To) and clears date range', async () => {
    renderWorkbench(24);

    await waitFor(() => {
      expect(screen.getByText(/Showing/)).toBeInTheDocument();
    });

    const fromInput = screen.getByTitle('Start date');
    const toInput = screen.getByTitle('End date');

    // Set date range 2026-10-22 to 2026-10-24
    fireEvent.change(fromInput, { target: { value: '2026-10-22' } });
    fireEvent.change(toInput, { target: { value: '2026-10-24' } });

    // Should filter items and update summary
    expect(screen.getByText(/Showing/)).toBeInTheDocument();

    // Clear date range button should be visible
    const clearDatesBtn = screen.getByTitle('Clear date range');
    expect(clearDatesBtn).toBeInTheDocument();

    fireEvent.click(clearDatesBtn);
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 5 of 24 flags');
  });

  it('resets page to 1 when status, severity, or search filters change', async () => {
    renderWorkbench(24);

    await waitFor(() => {
      expect(screen.getByText(/Showing/)).toBeInTheDocument();
    });

    // Advance to page 2
    const nextBtn = screen.getByTitle(/Next Page/i);
    fireEvent.click(nextBtn);
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 6 to 10 of 24 flags');

    // Filter by Open status (7 items total)
    const openStatusBtn = screen.getByRole('button', { name: /Open \(7\)/i });
    fireEvent.click(openStatusBtn);

    // Should reset to page 1
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 5 of 7 flags');

    // Switch back to All
    const allStatusBtn = screen.getByRole('button', { name: /All \(24\)/i });
    fireEvent.click(allStatusBtn);
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 5 of 24 flags');

    // Advance to page 3
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 11 to 15 of 24 flags');

    // Search query should reset to page 1
    const searchInput = screen.getByPlaceholderText(/Search flags by rep name/i);
    fireEvent.change(searchInput, { target: { value: 'Client Org 1' } });

    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to');
  });

  it('renders an empty state card when no flags match search query', async () => {
    renderWorkbench(24);

    await waitFor(() => {
      expect(screen.getByText(/Showing/)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search flags by rep name/i);
    fireEvent.change(searchInput, { target: { value: 'Non-Existent Org Search Key' } });

    expect(screen.getByText('No behavioral risk flags match the selected criteria.')).toBeInTheDocument();
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });
});
