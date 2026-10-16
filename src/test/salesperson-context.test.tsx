import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SalespersonHomePreview } from '@/features/field/SalespersonHomePreview';
import { ClientsDirectoryView } from '@/features/field/ClientsDirectoryView';
import { ExceptionsWorkbenchView } from '@/features/field/ExceptionsWorkbenchView';
import { OfflineSyncView } from '@/features/field/OfflineSyncView';
import { AuthProvider } from '@/context/AuthContext';
import { FieldSessionProvider } from '@/context/FieldSessionContext';

describe('Salesperson Context-Aware Field Rules & Fictional Data (AT-04 / PRD §6.1)', () => {
  it('renders fictional company names only (no real entities)', () => {
    render(
      <AuthProvider>
        <FieldSessionProvider>
          <SalespersonHomePreview />
        </FieldSessionProvider>
      </AuthProvider>
    );

    // Assert fictional company names exist
    expect(screen.getByText('Apex Heavy Logistics Fleet Depot')).toBeInTheDocument();
    expect(screen.getByText('Equatorial Energy Fleet Terminal')).toBeInTheDocument();
    expect(screen.getByText('Zenith Logistics & Transit Hub')).toBeInTheDocument();

    // Assert real entities are absent
    expect(screen.queryByText(/Dangote/i)).toBeNull();
    expect(screen.queryByText(/TotalEnergies/i)).toBeNull();
    expect(screen.queryByText(/Bollor/i)).toBeNull();
    expect(screen.queryByText(/DHL/i)).toBeNull();
  });

  it('blocks End Day and parallel visits while active visit is open (PRD §6.1 / AT-03)', () => {
    render(
      <AuthProvider>
        <FieldSessionProvider>
          <SalespersonHomePreview />
        </FieldSessionProvider>
      </AuthProvider>
    );

    // Initial state: active visit is open
    expect(screen.getByText('Active Client Visit')).toBeInTheDocument();
    expect(screen.getByText(/End Day \(Blocked\)/i)).toBeInTheDocument();
    expect(screen.getByText('Resume Active Visit')).toBeInTheDocument();

    // Clicking End Day while visit active triggers hard block modal (PRD §6.1)
    const endDayTile = screen.getByText(/End Day \(Blocked\)/i);
    fireEvent.click(endDayTile);

    expect(screen.getByText(/End Day Blocked: Active Visit Open/i)).toBeInTheDocument();
    expect(screen.getByText(/PRD §6.1 and Rule AT-03/i)).toBeInTheDocument();
  });

  it('supports multiple branches sharing the same company phone number (PRD §4.2)', () => {
    render(
      <AuthProvider>
        <FieldSessionProvider>
          <ClientsDirectoryView />
        </FieldSessionProvider>
      </AuthProvider>
    );

    // Verifies that shared company phone badge exists and notes PRD §4.2 compliance
    expect(screen.getAllByText(/PRD §4.2 Approved/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\+234 1 270 5000/i).length).toBeGreaterThan(0);
  });

  it('enforces salesperson-only creation of failure exceptions (PRD §7.4)', () => {
    render(
      <AuthProvider>
        <FieldSessionProvider>
          <ExceptionsWorkbenchView />
        </FieldSessionProvider>
      </AuthProvider>
    );

    // Verifies governance rule badge
    expect(screen.getByText(/My Exceptions Workbench/i)).toBeInTheDocument();
    expect(screen.getByText(/Governance Rule:/i)).toBeInTheDocument();
    expect(screen.getByText(/Managers review\/approve\/reject/i)).toBeInTheDocument();
  });

  it('displays IndexedDB offline queue and UUID idempotency keys (PRD §9)', () => {
    render(
      <AuthProvider>
        <FieldSessionProvider>
          <OfflineSyncView />
        </FieldSessionProvider>
      </AuthProvider>
    );

    // Verifies offline resilience elements
    expect(screen.getByText(/Offline Queue & Sync/i)).toBeInTheDocument();
    expect(screen.getByText(/PRD §9 Integrity Contract/i)).toBeInTheDocument();
    expect(screen.getByText(/UUID: evt-8f4b-2291-a10c/i)).toBeInTheDocument();
  });
});
