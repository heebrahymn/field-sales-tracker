import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SalespersonHomePreview } from '@/features/field/SalespersonHomePreview';
import { AuthProvider } from '@/context/AuthContext';

describe('Salesperson Context-Aware Field Rules & Fictional Data (AT-04 / PRD §6.1)', () => {
  it('renders fictional company names only (no real entities)', () => {
    render(
      <AuthProvider>
        <SalespersonHomePreview />
      </AuthProvider>
    );

    // Assert fictional company names exist
    expect(screen.getByText('Apex Heavy Logistics Fleet Depot')).toBeInTheDocument();
    expect(screen.getByText('Equatorial Energy Fleet Terminal')).toBeInTheDocument();
    expect(screen.getByText('Zenith Logistics & Transit Hub')).toBeInTheDocument();
    expect(screen.getByText('Pinnacle Cargo Distribution Hub')).toBeInTheDocument();

    // Assert real entities are absent
    expect(screen.queryByText(/Dangote/i)).toBeNull();
    expect(screen.queryByText(/TotalEnergies/i)).toBeNull();
    expect(screen.queryByText(/Bollor/i)).toBeNull();
    expect(screen.queryByText(/DHL/i)).toBeNull();
  });

  it('blocks End Day and parallel visits while active visit is open', () => {
    render(
      <AuthProvider>
        <SalespersonHomePreview />
      </AuthProvider>
    );

    // Initial state: active visit is open
    expect(screen.getByText('Active Client Visit')).toBeInTheDocument();
    expect(screen.getByText('End Day Blocked')).toBeInTheDocument();
    expect(screen.getByText('Resume Active Visit')).toBeInTheDocument();

    // Clicking End Day while visit active triggers hard block modal (PRD §6.1)
    const endDayTile = screen.getByText('End Day Blocked');
    fireEvent.click(endDayTile);

    expect(screen.getByText(/Cannot End Day: Active Visit Open/i)).toBeInTheDocument();
    expect(screen.getByText(/PRD §6.1 Hard Block/i)).toBeInTheDocument();
  });
});
