import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/ui/status-badge';

describe('StatusBadge accessibility & contrast compliance', () => {
  it('renders Location Verified with text and icon', () => {
    render(<StatusBadge status="location_verified" />);
    const badge = screen.getByText('Location Verified');
    expect(badge).toBeInTheDocument();
    expect(badge.parentElement).toHaveClass('bg-emerald-50');
  });

  it('renders Manager Approved — Unverified with distinct amber warning style', () => {
    render(<StatusBadge status="manager_approved_unverified" />);
    const badge = screen.getByText('Manager Approved — Unverified');
    expect(badge).toBeInTheDocument();
    expect(badge.parentElement).toHaveClass('bg-amber-50');
  });

  it('renders Disputed Under Review with high-visibility alert styling', () => {
    render(<StatusBadge status="disputed" />);
    const badge = screen.getByText('Disputed — Under Review');
    expect(badge).toBeInTheDocument();
    expect(badge.parentElement).toHaveClass('bg-orange-50');
  });

  it('renders Pending Sync and Captured Offline with discrete states', () => {
    const { rerender } = render(<StatusBadge status="pending_sync" />);
    expect(screen.getByText('Pending Sync')).toBeInTheDocument();

    rerender(<StatusBadge status="captured_offline" />);
    expect(screen.getByText('Captured Offline')).toBeInTheDocument();
  });
});
