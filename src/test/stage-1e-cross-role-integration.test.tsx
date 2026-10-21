import { describe, it, expect } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider } from '@/context/AuthContext';
import { FieldSessionProvider, useFieldSession } from '@/context/FieldSessionContext';
import { DeviceReplacementProvider, useDeviceReplacement } from '@/context/DeviceReplacementContext';
import { AuditProvider, useAudit } from '@/context/AuditContext';
import { MarketConfigProvider, useMarketConfig } from '@/context/MarketConfigContext';

import { BranchApprovalsQueue } from '@/features/review/BranchApprovalsQueue';
import { ClientsDirectoryView } from '@/features/field/ClientsDirectoryView';
import { ExceptionReviewWorkbench } from '@/features/review/ExceptionReviewWorkbench';
import { ExceptionsWorkbenchView } from '@/features/field/ExceptionsWorkbenchView';
import { HqClientAuditOversight } from '@/features/admin/HqClientAuditOversight';
import { HqMarketConfiguration } from '@/features/admin/HqMarketConfiguration';
import { VisitWorkflowView } from '@/features/field/VisitWorkflowView';

const TestAppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <MarketConfigProvider>
      <AuditProvider>
        <DeviceReplacementProvider>
          <FieldSessionProvider>
            {children}
          </FieldSessionProvider>
        </DeviceReplacementProvider>
      </AuditProvider>
    </MarketConfigProvider>
  </AuthProvider>
);

describe('Stage 1E — Cross-Role State & Workflow Integration', () => {
  // =========================================================================
  // WORKFLOW A: Client Registration
  // =========================================================================
  describe('Workflow A: Client Branch Registration & Country Sales Head Review', () => {
    it('allows rep to register a new branch which appears in manager review queue, then reflects manager approval', () => {
      const WorkflowATestHarness = () => {
        const { registerBranch } = useFieldSession();
        const [view, setView] = useState<'manager' | 'rep'>('manager');

        return (
          <div>
            <button
              onClick={() =>
                registerBranch({
                  companyName: 'Sahara Cold Chain Logistics',
                  branchName: 'Oregun Refrigerated Depot',
                  branchCode: 'BR-LAG-099',
                  category: 'Cold Storage / Haulage',
                  address: 'Plot 14 Kudirat Abiola Way, Oregun, Lagos',
                  landmark: 'Opposite Total Filling Station',
                  contacts: [{ name: 'Engr. Segun Arinze', role: 'Fleet Manager', phone: '+234 802 333 9999' }],
                  hasSharedPhone: false,
                  approvedGpsLat: 6.601,
                  approvedGpsLng: 3.351,
                })
              }
            >
              Trigger Rep Registration
            </button>
            <button onClick={() => setView('manager')}>Show Manager Queue</button>
            <button onClick={() => setView('rep')}>Show Rep Directory</button>

            {view === 'manager' && <BranchApprovalsQueue />}
            {view === 'rep' && <ClientsDirectoryView />}
          </div>
        );
      };

      render(
        <TestAppProviders>
          <WorkflowATestHarness />
        </TestAppProviders>
      );

      // 1. Rep registers branch
      fireEvent.click(screen.getByText('Trigger Rep Registration'));

      // 2. Manager queue displays the pending branch
      expect(screen.getAllByText(/Oregun Refrigerated Depot/i).length).toBeGreaterThan(0);

      // 3. Manager approves proposed pin
      const approveButtons = screen.getAllByRole('button', { name: /approve pin/i });
      fireEvent.click(approveButtons[0]);

      // 4. Switch to Rep Directory view
      fireEvent.click(screen.getByText('Show Rep Directory'));

      // 5. Rep sees Approved Pin status
      expect(screen.getAllByText(/Approved Pin/i).length).toBeGreaterThan(0);
    });

    it('displays manager rejection rationale when a proposed pin is rejected', () => {
      const WorkflowARejectHarness = () => {
        const { registerBranch, rejectBranchPin, branches } = useFieldSession();
        const [view, setView] = useState<'manager' | 'rep'>('manager');

        return (
          <div>
            <button
              onClick={() =>
                registerBranch({
                  companyName: 'Maritime Transit Hub',
                  branchName: 'Tin Can Gate 5 Container Yard',
                  branchCode: 'BR-LAG-088',
                  category: 'Terminal',
                  address: 'Tin Can Island Port Corridor, Apapa',
                  landmark: 'Gate 5 Customs Checkpoint',
                  contacts: [{ name: 'Capt. Jude', role: 'Superintendent', phone: '+234 803 111 2222' }],
                  hasSharedPhone: false,
                  approvedGpsLat: 6.435,
                  approvedGpsLng: 3.332,
                })
              }
            >
              Register Invalid Branch
            </button>
            <button
              onClick={() => {
                const target = branches.find((b) => b.branchName === 'Tin Can Gate 5 Container Yard');
                if (target) {
                  rejectBranchPin(
                    target.id,
                    'GPS coordinate was captured outside perimeter fence (>120m discrepancy).'
                  );
                }
              }}
            >
              Reject Branch Pin
            </button>
            <button onClick={() => setView('rep')}>Switch to Rep View</button>

            {view === 'rep' && <ClientsDirectoryView />}
          </div>
        );
      };

      render(
        <TestAppProviders>
          <WorkflowARejectHarness />
        </TestAppProviders>
      );

      fireEvent.click(screen.getByText('Register Invalid Branch'));
      fireEvent.click(screen.getByText('Reject Branch Pin'));
      fireEvent.click(screen.getByText('Switch to Rep View'));

      expect(screen.getAllByText(/Pin Rejected/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/outside perimeter fence/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // WORKFLOW B: Missed Visit & Operational Exceptions
  // =========================================================================
  describe('Workflow B: Missed Visit Exception Submission & Manager Approval/Rejection', () => {
    it('salesperson submits exception which Country Sales Head approves as unverified visit', () => {
      const WorkflowBHarness = () => {
        const { submitException, approveException, exceptions } = useFieldSession();
        const [view, setView] = useState<'manager' | 'rep'>('manager');

        return (
          <div>
            <button
              onClick={() =>
                submitException({
                  type: 'gps_failure',
                  title: 'Dangote Sugar Refined Depot GPS Attenuation',
                  branchName: 'Apapa Sugar Logistics Terminal',
                  claimedDate: 'Today 21 Oct 2026',
                  claimedTime: '11:00 - 11:45 WAT',
                  reason: 'Heavy overhead metallic storage silos caused satellite shielding.',
                  evidenceNote: 'Gate pass stamped by Terminal Dispatcher #4 and warehouse photo attached.',
                })
              }
            >
              Rep Submit Exception
            </button>
            <button
              onClick={() => {
                const target = exceptions.find((e) => e.title.includes('Dangote Sugar'));
                if (target) {
                  approveException(
                    target.id,
                    'Verified warehouse loading bay photo. Authorised as Location Unverified.'
                  );
                }
              }}
            >
              Manager Approve Exception
            </button>
            <button onClick={() => setView('rep')}>Switch to Rep View</button>

            {view === 'manager' && <ExceptionReviewWorkbench />}
            {view === 'rep' && <ExceptionsWorkbenchView />}
          </div>
        );
      };

      render(
        <TestAppProviders>
          <WorkflowBHarness />
        </TestAppProviders>
      );

      // Rep submits exception
      fireEvent.click(screen.getByText('Rep Submit Exception'));

      // Manager reviews and approves
      fireEvent.click(screen.getByText('Manager Approve Exception'));

      // Switch to rep view
      fireEvent.click(screen.getByText('Switch to Rep View'));

      expect(screen.getByText(/Dangote Sugar Refined Depot GPS Attenuation/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Manager Approved \(Unverified\)/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Verified warehouse loading bay photo/i)).toBeInTheDocument();
    });

    it('supports Country Sales Head escalating exception to HQ Admin', () => {
      const WorkflowBEscalateHarness = () => {
        const { escalateException } = useFieldSession();
        const [view, setView] = useState<'manager' | 'rep'>('manager');

        return (
          <div>
            <button
              onClick={() =>
                escalateException(
                  'exc-002',
                  'Device battery depletion claim has 3h submission lag; escalating to HQ Admin for hardware diagnostic audit.'
                )
              }
            >
              Escalate Claim
            </button>
            <button onClick={() => setView('rep')}>Switch to Rep View</button>

            {view === 'rep' && <ExceptionsWorkbenchView />}
          </div>
        );
      };

      render(
        <TestAppProviders>
          <WorkflowBEscalateHarness />
        </TestAppProviders>
      );

      fireEvent.click(screen.getByText('Escalate Claim'));
      fireEvent.click(screen.getByText('Switch to Rep View'));

      expect(screen.getAllByText(/Escalated to HQ/i).length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // WORKFLOW C: Company Device Replacement (Direct Rep -> HQ Admin)
  // =========================================================================
  describe('Workflow C: Direct Salesperson to HQ Admin Device Replacement', () => {
    it('rep submits faulty device request directly to HQ Admin, HQ approves, allocates spare, dispatches, and activates', () => {
      const WorkflowCHarness = () => {
        const {
          replacementRequests,
          submitReplacementRequest,
          approveRequest,
          assignSpareDevice,
          recordDispatch,
          confirmDeviceActivation,
        } = useDeviceReplacement();

        const latest = replacementRequests[0];

        return (
          <div>
            <div data-testid="req-status">{latest?.status}</div>
            <button
              onClick={() =>
                submitReplacementRequest({
                  salespersonId: 'CC-REP-042',
                  salespersonName: 'Tunde Adebayo',
                  marketCode: 'NG',
                  marketName: 'Nigeria (Lagos)',
                  companyDeviceAssetId: 'CC-DEV-LAG-014',
                  deviceModel: 'Samsung Galaxy A15',
                  issueCategory: 'camera_defect',
                  issueDescription:
                    'Rear camera sensor shattered during field inspection; autofocus failure prevents mandatory premises verification photo capture.',
                })
              }
            >
              Submit Camera Defect
            </button>
            {latest && (
              <>
                <button onClick={() => approveRequest(latest.id, 'Hardware defect confirmed by HQ Depot. Approved for immediate swap.')}>
                  HQ Approve Swap
                </button>
                <button onClick={() => assignSpareDevice(latest.id, 'CC-DEV-LAG-003')}>
                  HQ Allocate Spare
                </button>
                <button onClick={() => recordDispatch(latest.id, 'TRACK-CCC-9921 via DHL Express Transit')}>
                  HQ Dispatch
                </button>
                <button onClick={() => confirmDeviceActivation(latest.id, 'returned_to_depot')}>
                  HQ Confirm Activation
                </button>
              </>
            )}
          </div>
        );
      };

      render(
        <TestAppProviders>
          <WorkflowCHarness />
        </TestAppProviders>
      );

      // 1. Rep submits issue
      fireEvent.click(screen.getByText('Submit Camera Defect'));
      expect(screen.getByTestId('req-status').textContent).toBe('Pending Review');

      // 2. HQ approves replacement
      fireEvent.click(screen.getByText('HQ Approve Swap'));
      expect(screen.getByTestId('req-status').textContent).toBe('Approved');

      // 3. HQ allocates spare device from depot
      fireEvent.click(screen.getByText('HQ Allocate Spare'));
      expect(screen.getByTestId('req-status').textContent).toBe('Awaiting Spare');

      // 4. HQ dispatches replacement device
      fireEvent.click(screen.getByText('HQ Dispatch'));
      expect(screen.getByTestId('req-status').textContent).toBe('Dispatched');

      // 5. Handset arrives and is activated
      fireEvent.click(screen.getByText('HQ Confirm Activation'));
      expect(screen.getByTestId('req-status').textContent).toBe('Completed');
    });
  });

  // =========================================================================
  // WORKFLOW D: Client Audit Telephone Workbench & HQ Oversight
  // =========================================================================
  describe('Workflow D: Client Audit Telephone Workbench & Cross-Country HQ Oversight', () => {
    it('recording an audit outcome in Country Sales Head workbench synchronises immediately to HQ Admin oversight', () => {
      const WorkflowDHarness = () => {
        const { recordAuditCall } = useAudit();
        return (
          <div>
            <button
              onClick={() =>
                recordAuditCall(
                  'AUD-001',
                  'confirmed',
                  'Spoke directly with Engr. Babatunde Jinadu. Confirmed Tunde Adebayo visited depot at 09:45 and demonstrated radiator coolant formulation.',
                  true,
                  'HQ Administrator (Country Head)'
                )
              }
            >
              Manager Confirm Audit Call
            </button>
            <HqClientAuditOversight />
          </div>
        );
      };

      render(
        <TestAppProviders>
          <WorkflowDHarness />
        </TestAppProviders>
      );

      // Manager confirms the call
      fireEvent.click(screen.getByText('Manager Confirm Audit Call'));

      // HQ Admin oversight table reflects the confirmed status
      expect(screen.getAllByText(/Confirmed Meeting/i).length).toBeGreaterThan(0);

      // Clicking Audit Record opens the details drawer containing notes
      const auditRecordBtns = screen.getAllByRole('button', { name: /audit record/i });
      fireEvent.click(auditRecordBtns[0]);
      expect(screen.getByText(/In-person meeting confirmed/i)).toBeInTheDocument();
    });

    it('client denial initiates Disputed — Pending Review visible in HQ Admin oversight queue', () => {
      const WorkflowDDisputeHarness = () => {
        const { recordAuditCall } = useAudit();
        return (
          <div>
            <button
              onClick={() =>
                recordAuditCall(
                  'AUD-002',
                  'disputed',
                  'Contact stated no salesperson visited depot on 19 Oct. Initiated disciplinary investigation dispute.',
                  false,
                  'HQ Administrator (Country Head)'
                )
              }
            >
              Manager Record Dispute
            </button>
            <HqClientAuditOversight />
          </div>
        );
      };

      render(
        <TestAppProviders>
          <WorkflowDDisputeHarness />
        </TestAppProviders>
      );

      fireEvent.click(screen.getByText('Manager Record Dispute'));

      expect(screen.getAllByText(/Disputed \(Denied\)/i).length).toBeGreaterThan(0);

      const auditRecordBtns = screen.getAllByRole('button', { name: /audit record/i });
      fireEvent.click(auditRecordBtns[1]);
      expect(screen.getByText(/Client denied in-person meeting/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // WORKFLOW E: Market Configuration & Non-Retroactivity Immutability
  // =========================================================================
  describe('Workflow E: Market Configuration Updates & Rule Immutability', () => {
    it('HQ Admin modifies geofence rule, version increments, and field simulator reflects new threshold without corrupting historical logs', () => {
      const WorkflowEHarness = () => {
        const { updateMarketRules } = useMarketConfig();
        return (
          <div>
            <button
              onClick={() =>
                updateMarketRules(
                  'NG',
                  { defaultGeofenceRadiusMeters: 250, maxVisitGpsAccuracyMeters: 120 },
                  'Expanded Apapa port corridor geofence buffer for large industrial yards'
                )
              }
            >
              Update Geofence to 250m
            </button>
            <VisitWorkflowView />
            <HqMarketConfiguration />
          </div>
        );
      };

      render(
        <TestAppProviders>
          <WorkflowEHarness />
        </TestAppProviders>
      );

      // Check initial geofence rule is rendered in VisitWorkflowView
      expect(screen.getByText(/Max: 200m/i)).toBeInTheDocument();

      // HQ Admin updates rule to 250m
      fireEvent.click(screen.getByText('Update Geofence to 250m'));

      // VisitWorkflowView dynamically reflects the newly configured geofence threshold
      expect(screen.getByText(/Max: 250m/i)).toBeInTheDocument();

      // Rule version history displays the change log with prospective note
      expect(screen.getByText(/Expanded Apapa port corridor geofence buffer/i)).toBeInTheDocument();
    });
  });
});
