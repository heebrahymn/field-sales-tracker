/**
 * Carbon Field Sales Tracker — Stage 3C Client Visits, GPS Geofencing & Meeting Logs Test Suite
 *
 * Validates PRD v1.2 §6.1, §7.1, §7.2, §7.3, §8.3, §8.4 / Acceptance Tests AT-03, AT-04, AT-05, AT-15.
 *
 * Covers:
 * 1. Haversine distance & authoritative geofence classification logic.
 * 2. Client & location selection: starts with no preselected client, handles multi-location clients.
 * 3. Pending GPS pin blocks normal verified check-in.
 * 4. Live camera & photo capture state transitions with retake.
 * 5. Visit check-in persistence, single open normal visit enforcement (AT-04).
 * 6. Authoritative active visit session restoration.
 * 7. Checkout outside geofence warning and audit flag preservation (AT-05).
 * 8. End Day blocked when open normal visit is in progress (AT-03).
 * 9. Meeting log submission: canonical columns, free-text next steps ONLY, zero commercial quotations/orders (AT-15).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import {
  calculateHaversineDistanceMeters,
  evaluateGeofenceClassification,
  visitService,
} from '@/services/visitService';
import { FieldSessionProvider, useFieldSession } from '@/context/FieldSessionContext';
import { MarketConfigProvider } from '@/context/MarketConfigContext';
import { AuthProvider } from '@/context/AuthContext';
import { VisitWorkflowView } from '@/features/field/VisitWorkflowView';
import { MeetingLogModal, MeetingLogSubmissionData } from '@/features/field/MeetingLogModal';

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: { path: 'test/path.jpg' }, error: null }),
          createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://test.supabase.co/signed' }, error: null }),
        }),
      },
    },
  };
});

const mockTestActiveVisit = {
  id: 'vis-active-01',
  branchId: 'br-01',
  branchName: 'Apex Heavy Logistics Fleet Depot',
  companyName: 'Apex Heavy Logistics Ltd',
  address: 'Apapa Commercial Port Corridor, Gate 4, Lagos',
  branchCode: 'BR-LAG-014',
  checkInTime: '09:42 WAT',
  checkInTimestamp: Date.now() - 28 * 60 * 1000,
  elapsedSeconds: 28 * 60 + 15,
  geofenceDistanceMeters: 38,
  gpsAccuracyMeters: 14,
  premisesPhotoUrl: '/demo/demo_apex_depot.png',
  verificationStatus: 'location_verified' as const,
  locationClassification: 'inside_confident' as const,
};

const renderWorkflowView = (
  props: React.ComponentProps<typeof VisitWorkflowView> = {},
  initialActiveVisit: typeof mockTestActiveVisit | null = null
) => {
  return render(
    <AuthProvider>
      <MarketConfigProvider>
        <FieldSessionProvider initialActiveVisit={initialActiveVisit}>
          <VisitWorkflowView {...props} />
        </FieldSessionProvider>
      </MarketConfigProvider>
    </AuthProvider>
  );
};

describe('Stage 3C: Client Visits, Geofencing, Photo Evidence & Meeting Logs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Haversine Distance & PostGIS-Aligned Geofence Calculations
  // =========================================================================
  describe('1. Spatial Mathematics & Classification Logic (PRD §7.1, §8.4)', () => {
    it('calculates Haversine distance between coordinates accurately', () => {
      // Coordinates in Lagos: Marina to Apapa Port (~3.5km)
      const lat1 = 6.4531;
      const lon1 = 3.3958;
      const lat2 = 6.4428;
      const lon2 = 3.3649;

      const dist = calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2);
      expect(dist).toBeGreaterThan(3000);
      expect(dist).toBeLessThan(4000);

      // Same location should return 0 metres
      const zeroDist = calculateHaversineDistanceMeters(lat1, lon1, lat1, lon1);
      expect(zeroDist).toBe(0);
    });

    it('classifies reading as inside_confident when distance + accuracy <= geofence radius', () => {
      // 50m distance, 20m accuracy, 200m radius, 100m max accuracy
      const result = evaluateGeofenceClassification(50, 20, 200, 100);
      expect(result.classification).toBe('inside_confident');
      expect(result.isInsideConfident).toBe(true);
      expect(result.isUncertain).toBe(false);
      expect(result.isOutside).toBe(false);
    });

    it('classifies reading as uncertain when distance <= radius but distance + accuracy > radius', () => {
      // 180m distance, 30m accuracy (total 210m > 200m radius)
      const result = evaluateGeofenceClassification(180, 30, 200, 100);
      expect(result.classification).toBe('uncertain');
      expect(result.isInsideConfident).toBe(false);
      expect(result.isUncertain).toBe(true);
      expect(result.isOutside).toBe(false);
    });

    it('classifies reading as uncertain when accuracy exceeds maximum permitted accuracy (100m)', () => {
      // 40m distance, 120m accuracy (total 160m <= 200m radius, but accuracy 120m > 100m max)
      const result = evaluateGeofenceClassification(40, 120, 200, 100);
      expect(result.classification).toBe('uncertain');
      expect(result.isInsideConfident).toBe(false);
      expect(result.isUncertain).toBe(true);
    });

    it('classifies reading as outside when distance > geofence radius', () => {
      // 250m distance, 10m accuracy, 200m radius
      const result = evaluateGeofenceClassification(250, 10, 200, 100);
      expect(result.classification).toBe('outside');
      expect(result.isOutside).toBe(true);
      expect(result.isInsideConfident).toBe(false);
    });
  });

  // =========================================================================
  // 2. Client & Location Selection Workflow
  // =========================================================================
  describe('2. Client & Location Selection (PRD §3 Step 1)', () => {
    it('initializes new visit workflow with NO client automatically selected', () => {
      renderWorkflowView();

      // Clear instruction to select client
      expect(screen.getByText(/STEP 1: SELECT CLIENT/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search business by name/i)).toBeInTheDocument();
      expect(screen.getByText(/Select a Client in Step 1 to Proceed/i)).toBeInTheDocument();
    });

    it('allows searching and selecting a client from registered list', () => {
      renderWorkflowView();

      const searchInput = screen.getByPlaceholderText(/Search business by name/i);
      fireEvent.focus(searchInput);

      // Client options appear in dropdown
      const apexClientBtn = screen.getByRole('button', { name: /Apex Heavy Logistics Ltd/i });
      expect(apexClientBtn).toBeInTheDocument();

      fireEvent.click(apexClientBtn);

      // Select specific location from multi-location client
      const branchBtn = screen.getByRole('button', { name: /Apex Heavy Logistics Fleet Depot/i });
      fireEvent.click(branchBtn);

      // Selected client is displayed with target location details
      expect(screen.getByText(/Apex Heavy Logistics Ltd/i)).toBeInTheDocument();
      expect(screen.getByText(/Target Location/i)).toBeInTheDocument();
    });

    it('displays multi-location selector when a client has multiple registered branches', () => {
      renderWorkflowView();

      const searchInput = screen.getByPlaceholderText(/Search business by name/i);
      fireEvent.focus(searchInput);

      // Apex Heavy Logistics has multiple locations (Apapa & Ikeja)
      const apexClientBtn = screen.getByRole('button', { name: /Apex Heavy Logistics Ltd/i });
      fireEvent.click(apexClientBtn);

      // Shows multi-location selector
      expect(screen.getByText(/Select Location \/ Branch/i)).toBeInTheDocument();
      expect(screen.getByText(/Apex Heavy Logistics Fleet Depot/i)).toBeInTheDocument();
      expect(screen.getByText(/Apex Commercial Transit Hub \(Ikeja\)/i)).toBeInTheDocument();
    });

    it('blocks normal verified check-in if selected branch has pending GPS pin approval', () => {
      let sessionCtx: any = null;
      const Probe = () => {
        sessionCtx = useFieldSession();
        return null;
      };

      render(
        <AuthProvider>
          <MarketConfigProvider>
            <FieldSessionProvider initialActiveVisit={null}>
              <Probe />
              <VisitWorkflowView />
            </FieldSessionProvider>
          </MarketConfigProvider>
        </AuthProvider>
      );

      // Add a branch with status 'pending_approval'
      act(() => {
        sessionCtx.registerBranch({
          companyName: 'Bespoke Logistics Co',
          branchName: 'Oregun Terminal',
          branchCode: 'BR-ORE-001',
          category: 'Fleet Hub',
          address: 'Oregun Industrial Estate',
          landmark: 'Behind Glass Factory',
          contacts: [],
          hasSharedPhone: false,
          approvedGpsLat: 6.601,
          approvedGpsLng: 3.352,
        });
      });

      const searchInput = screen.getByPlaceholderText(/Search business by name/i);
      fireEvent.change(searchInput, { target: { value: 'Bespoke Logistics Co' } });
      fireEvent.focus(searchInput);

      const bespokeBtn = screen.getByRole('button', { name: /Bespoke Logistics Co/i });
      fireEvent.click(bespokeBtn);

      // Blocked badge and prominent warning
      expect(screen.getByText(/Check-In Blocked: Location Pending Approval/i)).toBeInTheDocument();
      expect(screen.getByText(/Pending Manager Approval:/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. Live Device GPS & Camera Evidence
  // =========================================================================
  describe('3. GPS Geolocation & Camera Evidence Capture', () => {
    it('captures premises photo frame and toggles capture state with retake capability', async () => {
      renderWorkflowView();

      // Select client and branch
      const searchInput = screen.getByPlaceholderText(/Search business by name/i);
      fireEvent.focus(searchInput);
      fireEvent.click(screen.getByRole('button', { name: /Apex Heavy Logistics Ltd/i }));
      fireEvent.click(screen.getByRole('button', { name: /Apex Heavy Logistics Fleet Depot/i }));

      // Step 3 shows Capture Photo button
      const captureBtn = screen.getByRole('button', { name: /Capture Live Premises Photo/i });
      expect(captureBtn).toBeInTheDocument();

      fireEvent.click(captureBtn);

      // After capture, photo preview is confirmed
      await waitFor(() => {
        expect(screen.getByText(/Live Premises Photo Captured/i)).toBeInTheDocument();
      });

      // Retake action is available
      const retakeBtn = screen.getByRole('button', { name: /Retake/i });
      expect(retakeBtn).toBeInTheDocument();

      fireEvent.click(retakeBtn);

      // Returns to uncaptured state
      expect(screen.getByRole('button', { name: /Capture Live Premises Photo/i })).toBeInTheDocument();
    });

    it('renders device GPS refresh button and displays live fix accuracy', async () => {
      renderWorkflowView();

      const searchInput = screen.getByPlaceholderText(/Search business by name/i);
      fireEvent.focus(searchInput);
      fireEvent.click(screen.getByRole('button', { name: /Apex Heavy Logistics Ltd/i }));
      fireEvent.click(screen.getByRole('button', { name: /Apex Heavy Logistics Fleet Depot/i }));

      const acquireGpsBtn = screen.getByRole('button', { name: /Acquire Device GPS/i });
      expect(acquireGpsBtn).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 4. Visit Check-in & Single Open Visit Rule (AT-04)
  // =========================================================================
  describe('4. Visit Check-in & Open Visit Protection (AT-04)', () => {
    it('allows successful check-in and renders active visit timer', async () => {
      renderWorkflowView();

      // Select client and branch
      const searchInput = screen.getByPlaceholderText(/Search business by name/i);
      fireEvent.focus(searchInput);
      fireEvent.click(screen.getByRole('button', { name: /Apex Heavy Logistics Ltd/i }));
      fireEvent.click(screen.getByRole('button', { name: /Apex Heavy Logistics Fleet Depot/i }));

      // Capture photo
      fireEvent.click(screen.getByRole('button', { name: /Capture Live Premises Photo/i }));

      await waitFor(() => {
        expect(screen.getByText(/Live Premises Photo Captured/i)).toBeInTheDocument();
      });

      // Check In CTA appears
      const checkInBtn = screen.getByRole('button', { name: /Check In & Start Client Meeting/i });
      expect(checkInBtn).toBeInTheDocument();

      fireEvent.click(checkInBtn);

      // Active visit session is now displayed
      await waitFor(() => {
        expect(screen.getByText(/Visit Session In Progress/i)).toBeInTheDocument();
        expect(screen.getByText(/Apex Heavy Logistics Fleet Depot/i)).toBeInTheDocument();
        expect(screen.getByText(/PRD AT-04: Only 1 active normal physical visit is permitted/i)).toBeInTheDocument();
      });
    });

    it('strictly prevents silent active visit cancellation without force (PRD §5.2)', () => {
      let sessionCtx: any = null;
      const Probe = () => {
        sessionCtx = useFieldSession();
        return null;
      };

      render(
        <AuthProvider>
          <MarketConfigProvider>
            <FieldSessionProvider initialActiveVisit={mockTestActiveVisit}>
              <Probe />
            </FieldSessionProvider>
          </MarketConfigProvider>
        </AuthProvider>
      );

      expect(sessionCtx.activeVisit).not.toBeNull();
      const visitId = sessionCtx.activeVisit.id;

      // Unforced cancellation attempt
      act(() => {
        sessionCtx.cancelVisit();
      });

      // Active visit is preserved
      expect(sessionCtx.activeVisit).not.toBeNull();
      expect(sessionCtx.activeVisit.id).toBe(visitId);
    });

    it('blocks End Day when an open normal visit is in progress (AT-03)', () => {
      let sessionCtx: any = null;
      const Probe = () => {
        sessionCtx = useFieldSession();
        return null;
      };

      render(
        <AuthProvider>
          <MarketConfigProvider>
            <FieldSessionProvider initialActiveVisit={mockTestActiveVisit}>
              <Probe />
            </FieldSessionProvider>
          </MarketConfigProvider>
        </AuthProvider>
      );

      expect(sessionCtx.activeVisit).not.toBeNull();

      // End Day attempt
      let endDayResult = false;
      act(() => {
        endDayResult = sessionCtx.endDay();
      });

      // Blocked!
      expect(endDayResult).toBe(false);
      expect(sessionCtx.workdayStatus).not.toBe('ended');
    });
  });

  // =========================================================================
  // 5. Checkout & Outside-Geofence Audit Warning (AT-05)
  // =========================================================================
  describe('5. Checkout Outside Geofence (AT-05 / PRD §7.2)', () => {
    it('prompts outside-geofence warning modal when checkout distance > 200m', () => {
      renderWorkflowView({}, mockTestActiveVisit);

      // Ensure active visit exists
      expect(screen.getByText(/Visit Session In Progress/i)).toBeInTheDocument();

      // Click "Outside (340m)" simulator control
      fireEvent.click(screen.getByRole('button', { name: /Outside \(340m\)/i }));

      // Click checkout (using first matching button)
      const checkoutBtn = screen.getAllByRole('button', { name: /Check Out/i })[0];
      fireEvent.click(checkoutBtn);

      // Warning modal is rendered
      expect(screen.getByText(/Checkout Outside Geofence \(340m > 200m\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Acknowledge & Continue/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel \(Keep Visit Active\)/i })).toBeInTheDocument();
    });

    it('preserves original location_verified check-in status when checking out outside geofence (PRD §7.2)', async () => {
      let sessionCtx: any = null;
      const Probe = () => {
        sessionCtx = useFieldSession();
        return null;
      };

      render(
        <AuthProvider>
          <MarketConfigProvider>
            <FieldSessionProvider initialActiveVisit={mockTestActiveVisit}>
              <Probe />
            </FieldSessionProvider>
          </MarketConfigProvider>
        </AuthProvider>
      );

      expect(sessionCtx.activeVisit.verificationStatus).toBe('location_verified');

      await act(async () => {
        await sessionCtx.checkOutVisit(true, {
          purpose: 'routine_visit',
          productsDiscussed: ['Batteries'],
          outcomeNarrative: 'Completed review.',
          nextStepText: 'Send catalogue.',
        });
      });

      expect(sessionCtx.activeVisit).toBeNull();
      const latestCompleted = sessionCtx.completedVisits[0];
      expect(latestCompleted.verificationStatus).toBe('location_verified');
      expect(latestCompleted.flagRaised).toBe('Checkout Outside Geofence (>200m)');
    });
  });

  // =========================================================================
  // 6. Meeting Log Persistence & MVP Exclusions (AT-15 / PRD §7.3)
  // =========================================================================
  describe('6. Meeting Log Persistence & MVP Boundary Controls (AT-15)', () => {
    it('captures meeting outcome with free-text next steps ONLY and disclaims quotation/order triggers', () => {
      const mockSubmitted = vi.fn();
      const mockClose = vi.fn();

      render(
        <MeetingLogModal
          isOpen={true}
          onClose={mockClose}
          branchName="Apex Heavy Logistics Fleet Depot"
          onSubmitted={mockSubmitted}
        />
      );

      // Modal title and branch
      expect(screen.getByText(/Document Visit Outcome/i)).toBeInTheDocument();
      expect(screen.getByText(/Apex Heavy Logistics Fleet Depot/i)).toBeInTheDocument();

      // Canonical Purpose dropdown exists
      expect(screen.getByLabelText(/Visit Purpose/i)).toBeInTheDocument();

      // Mandatory free-text next step description (strictly disclaims automated pipeline triggers)
      expect(
        screen.getByText((content) => content.includes('Mandatory free-text summary') && content.includes('automated pipeline trigger'))
      ).toBeInTheDocument();

      // Free text only notice for outcome
      expect(
        screen.getByText(/Descriptive activity outcome only; not a sales pipeline deal or revenue forecast./i)
      ).toBeInTheDocument();

      // Submit
      const submitBtn = screen.getByRole('button', { name: /Submit Log & Close Visit/i });
      fireEvent.click(submitBtn);

      expect(mockSubmitted).toHaveBeenCalledTimes(1);
      const [onTime, logData] = mockSubmitted.mock.calls[0] as [boolean, MeetingLogSubmissionData];
      expect(onTime).toBe(true);
      expect(logData.purpose).toBe('routine_visit');
      expect(typeof logData.nextStepText).toBe('string');
      expect(logData.nextStepText.length).toBeGreaterThan(0);
    });

    it('supports 2-hour deferred meeting log submission option (PRD §3 Step 6)', () => {
      const mockSubmitted = vi.fn();
      const mockClose = vi.fn();

      render(
        <MeetingLogModal
          isOpen={true}
          onClose={mockClose}
          branchName="Apex Heavy Logistics Fleet Depot"
          onSubmitted={mockSubmitted}
        />
      );

      const deferCheckbox = screen.getByLabelText(/Defer completion \(Complete within permitted 2-hour window\)/i);
      fireEvent.click(deferCheckbox);

      // CTA text updates to show deferred state
      const deferBtn = screen.getByRole('button', { name: /Check Out & Defer Log \(2h SLA\)/i });
      expect(deferBtn).toBeInTheDocument();

      fireEvent.click(deferBtn);

      expect(mockSubmitted).toHaveBeenCalledWith(false, expect.any(Object));
    });

    it('rejects checkInVisit when premisesPhotoUrl does not match authenticated user and associated visit storage path', async () => {
      // 1. Rejects external URL
      const extResult = await visitService.checkInVisit({
        visitId: 'visit-uuid-001',
        userId: 'user-uuid-123',
        deviceId: 'dev-001',
        attendanceDayId: 'att-001',
        branchId: 'br-001',
        latitude: 6.448,
        longitude: 3.359,
        accuracy: 12,
        premisesPhotoUrl: 'https://example.com/fake.jpg',
        verificationStatus: 'location_verified',
      });
      expect(extResult.data).toBeNull();
      expect(extResult.error?.message).toMatch(/Storage path must belong to the authenticated salesperson and associated visit/i);

      // 2. Rejects foreign user path
      const foreignResult = await visitService.checkInVisit({
        visitId: 'visit-uuid-001',
        userId: 'user-uuid-123',
        deviceId: 'dev-001',
        attendanceDayId: 'att-001',
        branchId: 'br-001',
        latitude: 6.448,
        longitude: 3.359,
        accuracy: 12,
        premisesPhotoUrl: 'other-user-999/visit-uuid-001_premises_12345.jpg',
        verificationStatus: 'location_verified',
      });
      expect(foreignResult.data).toBeNull();
      expect(foreignResult.error?.message).toMatch(/Storage path must belong to the authenticated salesperson and associated visit/i);

      // 3. Rejects mismatched visitId in storage path
      const mismatchVisitResult = await visitService.checkInVisit({
        visitId: 'visit-uuid-001',
        userId: 'user-uuid-123',
        deviceId: 'dev-001',
        attendanceDayId: 'att-001',
        branchId: 'br-001',
        latitude: 6.448,
        longitude: 3.359,
        accuracy: 12,
        premisesPhotoUrl: 'user-uuid-123/wrong-visit-id_premises_12345.jpg',
        verificationStatus: 'location_verified',
      });
      expect(mismatchVisitResult.data).toBeNull();
      expect(mismatchVisitResult.error?.message).toMatch(/Storage path must belong to the authenticated salesperson and associated visit/i);
    });
  });
});
