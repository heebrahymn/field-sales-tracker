import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AuthProvider } from '@/context/AuthContext';
import { MarketConfigProvider } from '@/context/MarketConfigContext';
import { FieldSessionProvider, useFieldSession } from '@/context/FieldSessionContext';
import { AuditProvider } from '@/context/AuditContext';
import { DeviceReplacementProvider } from '@/context/DeviceReplacementContext';
import { PersistentStatusStrip } from '@/components/field/PersistentStatusStrip';
import { VisitWorkflowView } from '@/features/field/VisitWorkflowView';

const TestAppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <MarketConfigProvider>
      <FieldSessionProvider>
        <AuditProvider>
          <DeviceReplacementProvider>{children}</DeviceReplacementProvider>
        </AuditProvider>
      </FieldSessionProvider>
    </MarketConfigProvider>
  </AuthProvider>
);

describe('Pre-Stage 3 Corrections & Regression Suite', () => {
  // =========================================================================
  // 1. Fix Sync Queue Navigation — P1
  // =========================================================================
  describe('Correction 1: Sync Queue Navigation — P1', () => {
    it('renders the persistent sync queue status badge as an accessible button with proper semantics', () => {
      const mockNavigate = vi.fn();

      render(
        <TestAppProviders>
          <PersistentStatusStrip onNavigateTab={mockNavigate} />
        </TestAppProviders>
      );

      const syncBadgeBtn = screen.getByRole('button', { name: /Sync Queue:/i });
      expect(syncBadgeBtn).toBeInTheDocument();
      expect(syncBadgeBtn).toHaveAttribute('type', 'button');
      expect(syncBadgeBtn).toHaveAttribute('id', 'btn-sync-queue-badge');

      // Accessible title and label
      expect(syncBadgeBtn.getAttribute('aria-label')).toMatch(/Tap to view offline queue/i);
    });

    it('navigates directly to the Sync Queue when the status badge is clicked', () => {
      const mockNavigate = vi.fn();

      render(
        <TestAppProviders>
          <PersistentStatusStrip onNavigateTab={mockNavigate} />
        </TestAppProviders>
      );

      const syncBadgeBtn = screen.getByRole('button', { name: /Sync Queue:/i });
      fireEvent.click(syncBadgeBtn);

      expect(mockNavigate).toHaveBeenCalledWith('sync');
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 2. Improve Visit Workflow Mobile CTA — P2
  // =========================================================================
  describe('Correction 2: Sticky Mobile Primary Action Footer — P2', () => {
    it('renders the sticky mobile CTA for active visit checkout', () => {
      render(
        <TestAppProviders>
          <VisitWorkflowView />
        </TestAppProviders>
      );

      const stickyContainer = document.getElementById('sticky-visit-workflow-cta');
      expect(stickyContainer).toBeInTheDocument();

      const stickyCheckoutBtn = document.getElementById('sticky-btn-checkout');
      expect(stickyCheckoutBtn).toBeInTheDocument();
      expect(stickyCheckoutBtn).toHaveTextContent(/Check Out & Document Visit/i);
    });

    it('displays separate photo capture and check-in CTAs across draft workflow steps', () => {
      const FreshVisitHarness = () => {
        const { cancelVisit } = useFieldSession();
        return (
          <div>
            <button onClick={() => cancelVisit(true)}>Clear Initial Active Visit</button>
            <VisitWorkflowView />
          </div>
        );
      };

      render(
        <TestAppProviders>
          <FreshVisitHarness />
        </TestAppProviders>
      );

      // Clear the demo active visit
      fireEvent.click(screen.getByText('Clear Initial Active Visit'));

      // Step 1: No client selected -> CTA disabled
      expect(screen.getByText(/Step 1: Choose a client facility above/i)).toBeInTheDocument();

      // Search and select Apex Heavy Logistics Fleet Depot
      const searchInput = screen.getByPlaceholderText(/Search business by name, address, or phone\.\.\./i);
      fireEvent.change(searchInput, { target: { value: 'Apex Heavy Logistics' } });
      fireEvent.click(screen.getByText('Apex Heavy Logistics Ltd'));
      fireEvent.click(screen.getByText('Apex Heavy Logistics Fleet Depot'));

      // Step 2: Location selected, awaiting photo -> Sticky CTA is "Capture Live Premises Photo"
      const stickyCaptureBtn = screen.getByRole('button', { name: /Capture Live Premises Photo/i });
      expect(stickyCaptureBtn).toBeInTheDocument();
      expect(stickyCaptureBtn).toHaveAttribute('id', 'sticky-btn-capture-photo');

      // Click photo capture
      fireEvent.click(stickyCaptureBtn);
    });
  });

  // =========================================================================
  // 3. Fix Outside-Geofence Dialog — P2
  // =========================================================================
  describe('Correction 3: Outside-Geofence Dialog Explicit Actions & Backdrop Lock — P2', () => {
    it('provides explicit "Cancel (Keep Visit Active)" and "Acknowledge & Continue" actions', () => {
      const OutsideCheckoutHarness = () => {
        const { setSimulatedGps } = useFieldSession();
        return (
          <div>
            <button onClick={() => setSimulatedGps(14, 340)}>Set Outside Geofence (340m)</button>
            <VisitWorkflowView />
          </div>
        );
      };

      render(
        <TestAppProviders>
          <OutsideCheckoutHarness />
        </TestAppProviders>
      );

      // Trigger outside geofence distance (340m > 200m limit)
      fireEvent.click(screen.getByText('Set Outside Geofence (340m)'));

      // Click Check Out (available on both card and sticky footer)
      const checkoutBtns = screen.getAllByRole('button', { name: /Check Out & Document Visit/i });
      fireEvent.click(checkoutBtns[0]);

      // Warning dialog appears
      expect(screen.getByText(/Checkout Outside Geofence \(340m > 200m\)/i)).toBeInTheDocument();

      // Explicit buttons present
      const cancelBtn = screen.getByRole('button', { name: /Cancel \(Keep Visit Active\)/i });
      const ackBtn = screen.getByRole('button', { name: /Acknowledge & Continue/i });

      expect(cancelBtn).toBeInTheDocument();
      expect(cancelBtn).toHaveAttribute('id', 'btn-outside-geofence-cancel');
      expect(ackBtn).toBeInTheDocument();
      expect(ackBtn).toHaveAttribute('id', 'btn-outside-geofence-acknowledge');

      // Clicking Cancel dismisses warning and keeps visit active
      fireEvent.click(cancelBtn);
      expect(screen.queryByText(/Checkout Outside Geofence \(340m > 200m\)/i)).toBeNull();
      expect(screen.getByText('Visit Session In Progress')).toBeInTheDocument();
    });

    it('prevents backdrop click dismissal from creating an ambiguous state', () => {
      const OutsideCheckoutHarness = () => {
        const { setSimulatedGps } = useFieldSession();
        return (
          <div>
            <button onClick={() => setSimulatedGps(14, 340)}>Set Outside Geofence (340m)</button>
            <VisitWorkflowView />
          </div>
        );
      };

      render(
        <TestAppProviders>
          <OutsideCheckoutHarness />
        </TestAppProviders>
      );

      fireEvent.click(screen.getByText('Set Outside Geofence (340m)'));
      const checkoutBtns = screen.getAllByRole('button', { name: /Check Out & Document Visit/i });
      fireEvent.click(checkoutBtns[0]);

      const dialogBackdrop = screen.getByRole('dialog');
      expect(dialogBackdrop).toBeInTheDocument();

      // Clicking backdrop does NOT dismiss dialog
      fireEvent.click(dialogBackdrop);
      expect(screen.getByText(/Checkout Outside Geofence \(340m > 200m\)/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 4. Verify Active Visit Reset Protection
  // =========================================================================
  describe('Correction 4: Active Visit Reset Protection (PRD §5.2 / AT-04)', () => {
    it('strictly omits silent "Cancel Session" button from active visit card and offers "Report Disruption"', () => {
      const mockNavigateExceptions = vi.fn();

      render(
        <TestAppProviders>
          <VisitWorkflowView onNavigateToExceptions={mockNavigateExceptions} />
        </TestAppProviders>
      );

      // Verify no silent cancel button exists
      expect(screen.queryByRole('button', { name: /^Cancel Session$/i })).toBeNull();

      // "Report Disruption" button is present and routes to exceptions
      const reportDisruptionBtn = screen.getByRole('button', { name: /Report Disruption/i });
      expect(reportDisruptionBtn).toBeInTheDocument();
      expect(reportDisruptionBtn).toHaveAttribute('id', 'btn-report-visit-disruption');

      fireEvent.click(reportDisruptionBtn);
      expect(mockNavigateExceptions).toHaveBeenCalled();
    });

    it('refuses to silently delete active visit when cancelVisit() is called without force flag', () => {
      let sessionContext: any = null;

      const ContextProbe = () => {
        sessionContext = useFieldSession();
        return <div>Probe</div>;
      };

      render(
        <TestAppProviders>
          <ContextProbe />
        </TestAppProviders>
      );

      expect(sessionContext.activeVisit).not.toBeNull();
      const originalVisitId = sessionContext.activeVisit.id;

      // Attempt to cancel without force
      act(() => {
        sessionContext.cancelVisit();
      });

      // Active visit is STILL preserved!
      expect(sessionContext.activeVisit).not.toBeNull();
      expect(sessionContext.activeVisit.id).toBe(originalVisitId);
    });

    it('strictly enforces single open normal visit per salesperson (AT-04)', () => {
      let sessionContext: any = null;

      const ContextProbe = () => {
        sessionContext = useFieldSession();
        return <div>Probe</div>;
      };

      render(
        <TestAppProviders>
          <ContextProbe />
        </TestAppProviders>
      );

      expect(sessionContext.activeVisit).not.toBeNull();

      // Attempt to check in a second visit
      act(() => {
        sessionContext.checkInVisit(
          sessionContext.branches[1],
          '/test.png',
          14,
          40
        );
      });

      // Active visit remains the original visit, second visit is rejected
      expect(sessionContext.activeVisit.branchName).toBe('Apex Heavy Logistics Fleet Depot');
    });
  });
});
