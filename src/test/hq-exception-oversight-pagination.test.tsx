import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HqExceptionOversight, HqExceptionRecord } from '@/features/admin/HqExceptionOversight';

// Generate 25 test exceptions
const generateMockExceptions = (count: number): HqExceptionRecord[] => {
  return Array.from({ length: count }, (_, idx) => {
    const num = idx + 1;
    const market = num % 3 === 0 ? 'ZM' : num % 3 === 1 ? 'NG' : 'MW';
    const marketName =
      market === 'NG' ? 'Nigeria (Lagos)' : market === 'ZM' ? 'Zambia (Lusaka)' : 'Malawi (Blantyre)';
    return {
      id: `EXC-${market}-${String(num).padStart(4, '0')}`,
      exceptionType: num % 2 === 0 ? 'gps_failure' : 'delayed_submission_recovery',
      salespersonId: `usr-${num}`,
      salespersonName: `Salesperson Rep ${num}`,
      marketCode: market,
      marketName,
      organisationName: `Enterprise Client ${num}`,
      branchName: `Facility Depot ${num}`,
      claimedVisitTime: '2026-11-04 10:00',
      actualSubmissionTime: '2026-11-04 12:00',
      status: num % 2 === 0 ? 'manager_approved_unverified' : 'pending_manager_review',
      salespersonRationale: `Rationale explanation for exception ${num}`,
      evidenceProvided: `Evidence register document ${num}`,
    };
  });
};

describe('HqExceptionOversight - Table Pagination & Filtering', () => {
  const mockExceptions = generateMockExceptions(25);

  it('renders with default page size 10 and shows pagination summary', () => {
    render(<HqExceptionOversight initialExceptions={mockExceptions} />);

    // Total logged KPI card
    const kpiCards = screen.getAllByText('25');
    expect(kpiCards.length).toBeGreaterThanOrEqual(1);

    // Table pagination summary: "Showing 1 to 10 of 25 exceptions"
    expect(screen.getByText(/Showing/i)).toBeInTheDocument();
    expect(screen.getByText(/exceptions/i)).toBeInTheDocument();

    // Verify first page items exist
    expect(screen.getByText('Salesperson Rep 1')).toBeInTheDocument();
    expect(screen.getByText('Salesperson Rep 10')).toBeInTheDocument();

    // Verify item 11 is not on first page
    expect(screen.queryByText('Salesperson Rep 11')).not.toBeInTheDocument();
  });

  it('navigates to page 2 and renders next slice of records', () => {
    render(<HqExceptionOversight initialExceptions={mockExceptions} />);

    // Click Next Page button
    const nextBtn = screen.getByTitle('Next Page');
    fireEvent.click(nextBtn);

    // Salesperson 11 should now be visible
    expect(screen.getByText('Salesperson Rep 11')).toBeInTheDocument();
    expect(screen.getByText('Salesperson Rep 20')).toBeInTheDocument();

    // Salesperson 1 should no longer be visible
    expect(screen.queryByText('Salesperson Rep 1')).not.toBeInTheDocument();
  });

  it('allows changing page size to 20 and 50 per page', () => {
    render(<HqExceptionOversight initialExceptions={mockExceptions} />);

    const select = screen.getByTitle('Items per page');
    expect(select).toBeInTheDocument();

    // Change to 20 per page
    fireEvent.change(select, { target: { value: '20' } });

    // Should now show 1 to 20 of 25
    expect(screen.getByText('Salesperson Rep 1')).toBeInTheDocument();
    expect(screen.getByText('Salesperson Rep 20')).toBeInTheDocument();
    expect(screen.queryByText('Salesperson Rep 21')).not.toBeInTheDocument();

    // Change to 50 per page
    fireEvent.change(select, { target: { value: '50' } });

    // Should now show 1 to 25 of 25
    expect(screen.getByText('Salesperson Rep 1')).toBeInTheDocument();
    expect(screen.getByText('Salesperson Rep 25')).toBeInTheDocument();
  });

  it('resets current page to 1 when search or market filter is applied', () => {
    render(<HqExceptionOversight initialExceptions={mockExceptions} />);

    // Navigate to page 2 first using Next Page
    const nextBtn = screen.getByTitle('Next Page');
    fireEvent.click(nextBtn);
    expect(screen.getByText('Salesperson Rep 11')).toBeInTheDocument();

    // Apply search filter
    const searchInput = screen.getByPlaceholderText(/Search exception ID, rep name/i);
    fireEvent.change(searchInput, { target: { value: 'Rep 1' } });

    // Current page should have reset to 1, showing Rep 1
    expect(screen.getByText('Salesperson Rep 1')).toBeInTheDocument();
  });

  it('displays empty state when no exceptions match the filter', () => {
    render(<HqExceptionOversight initialExceptions={mockExceptions} />);

    const searchInput = screen.getByPlaceholderText(/Search exception ID, rep name/i);
    fireEvent.change(searchInput, { target: { value: 'NonExistentRepresentativeQuery' } });

    expect(screen.getByText('No exceptions match the chosen filter criteria.')).toBeInTheDocument();
    // Pagination should not be visible when no items match
    expect(screen.queryByTitle('Items per page')).not.toBeInTheDocument();
  });
});
