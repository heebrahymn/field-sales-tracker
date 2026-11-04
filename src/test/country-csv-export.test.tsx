import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CountryCsvExportModal } from '@/features/review/CountryCsvExportModal';
import { managementService } from '@/services/managementService';

// Mock managementService
vi.mock('@/services/managementService', () => {
  return {
    managementService: {
      exportCountryVisitsCsv: vi.fn(),
      getMarketSalespeople: vi.fn(),
      getCountryVisits: vi.fn(),
    },
  };
});

describe('CountryCsvExportModal & Custom Date Range / Salesperson Filtering', () => {
  const mockSalespeople = [
    { id: 'rep-uuid-1', name: 'Tunde Adebayo', territory: 'Nigeria (Lagos Hub)' },
    { id: 'rep-uuid-2', name: 'Chinyere Nwosu', territory: 'Nigeria (Apapa Port)' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (managementService.exportCountryVisitsCsv as any).mockResolvedValue({
      rowCount: 5,
      error: null,
    });
    (managementService.getMarketSalespeople as any).mockResolvedValue(mockSalespeople);
  });

  it('renders modal with period buttons and salesperson select', () => {
    render(
      <CountryCsvExportModal
        isOpen={true}
        onClose={vi.fn()}
        marketName="Nigeria"
        salespeople={mockSalespeople}
      />
    );

    expect(screen.getByText('Audited Country CSV Export')).toBeInTheDocument();
    expect(screen.getByText('Today (Provisional)')).toBeInTheDocument();
    expect(screen.getByText('Current Workweek')).toBeInTheDocument();
    expect(screen.getByText('Quarter-to-Date (Q4 2026)')).toBeInTheDocument();
    expect(screen.getByText('Custom Date Range')).toBeInTheDocument();
    expect(screen.getByText(/Tunde Adebayo/i)).toBeInTheDocument();
  });

  it('displays Start Date and End Date inputs when "Custom Date Range" is clicked', () => {
    render(
      <CountryCsvExportModal
        isOpen={true}
        onClose={vi.fn()}
        marketName="Nigeria"
        salespeople={mockSalespeople}
      />
    );

    // Initially custom date pickers are not visible
    expect(screen.queryByLabelText(/Start Date/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/End Date/i)).not.toBeInTheDocument();

    // Click "Custom Date Range" button
    fireEvent.click(screen.getByText('Custom Date Range'));

    // Date inputs appear
    const startDateInput = screen.getByLabelText(/Start Date/i);
    const endDateInput = screen.getByLabelText(/End Date/i);
    expect(startDateInput).toBeInTheDocument();
    expect(endDateInput).toBeInTheDocument();

    // Change custom dates
    fireEvent.change(startDateInput, { target: { value: '2026-10-15' } });
    fireEvent.change(endDateInput, { target: { value: '2026-10-25' } });

    expect(startDateInput).toHaveValue('2026-10-15');
    expect(endDateInput).toHaveValue('2026-10-25');
  });

  it('triggers exportCountryVisitsCsv with selected salesperson and custom date range', async () => {
    render(
      <CountryCsvExportModal
        isOpen={true}
        onClose={vi.fn()}
        marketName="Nigeria"
        salespeople={mockSalespeople}
      />
    );

    // Switch to custom date range
    fireEvent.click(screen.getByText('Custom Date Range'));
    const startDateInput = screen.getByLabelText(/Start Date/i);
    const endDateInput = screen.getByLabelText(/End Date/i);
    fireEvent.change(startDateInput, { target: { value: '2026-10-01' } });
    fireEvent.change(endDateInput, { target: { value: '2026-10-31' } });

    // Select Tunde Adebayo
    const repSelect = screen.getByRole('combobox');
    fireEvent.change(repSelect, { target: { value: 'rep-uuid-1' } });

    // Click Download Sanitised CSV
    fireEvent.click(screen.getByText('Download Sanitised CSV'));

    await waitFor(() => {
      expect(managementService.exportCountryVisitsCsv).toHaveBeenCalledWith(
        expect.objectContaining({
          marketCode: 'NG',
          repId: 'rep-uuid-1',
          repName: 'Tunde Adebayo',
          dateRange: 'custom',
          startDate: '2026-10-01',
          endDate: '2026-10-31',
        })
      );
    });

    // Displays success confirmation with row count
    await waitFor(() => {
      expect(screen.getByText(/5 visit records with CWE-1236/i)).toBeInTheDocument();
    });
  });

  it('gracefully handles 0 matching records without throwing an error', async () => {
    (managementService.exportCountryVisitsCsv as any).mockResolvedValue({
      rowCount: 0,
      error: null,
    });

    render(
      <CountryCsvExportModal
        isOpen={true}
        onClose={vi.fn()}
        marketName="Nigeria"
        salespeople={mockSalespeople}
      />
    );

    fireEvent.click(screen.getByText('Download Sanitised CSV'));

    await waitFor(() => {
      expect(screen.getByText(/0 visit records matched the selected criteria/i)).toBeInTheDocument();
    });
  });
});

