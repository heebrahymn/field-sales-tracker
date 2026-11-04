import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClientVisitVerification } from '../features/review/ClientVisitVerification';
import { SalespersonHomePreview } from '../features/field/SalespersonHomePreview';
import { AuthContext } from '../context/AuthContext';
import { FieldSessionContext } from '../context/FieldSessionContext';
import { MarketConfigContext } from '../context/MarketConfigContext';

describe('Live GPS Geofence Display & Today Activity Metrics', () => {
  const mockMarketConfig: any = {
    getActiveMarketRules: vi.fn().mockReturnValue({
      defaultGeofenceRadiusMeters: 200,
      maxGpsAccuracyMeters: 100,
      minVisitDurationMinutes: 5,
    }),
  };

  describe('ClientVisitVerification - Live GPS outside geofence', () => {
    const mockSalesHead = {
      id: 'sh-001',
      name: 'Babatunde Fashola',
      role: 'country_sales_head',
      marketCode: 'NG',
      marketName: 'Nigeria',
    };

    it('renders actual distance in Outside Geofence badge instead of "No Geofence (Exception)" when distance exceeds threshold', async () => {
      // Mock visit with coordinates outside 200m limit (e.g., 7,370m)
      const mockVisits = [
        {
          id: '4588079c-1234-4567-8901-123456789012',
          repId: 'rep-001',
          repName: 'Tunde Adebayo',
          organisationName: 'Apex Industrial Transit',
          branchName: 'Apapa Port Gate ac55bc',
          branchAddress: 'Apapa Corridor',
          category: 'fleet_operator',
          marketCode: 'NG',
          workDate: '2026-11-03',
          checkInAt: '2026-11-03T17:50:00Z',
          checkOutAt: '2026-11-03T17:54:00Z',
          durationMinutes: 5,
          verificationStatus: 'location_unverified',
          checkInLatitude: 6.4316,
          checkInLongitude: 3.4239,
          checkInAccuracyM: 100,
          checkOutLatitude: 6.4316,
          checkOutLongitude: 3.4239,
          checkOutAccuracyM: 100,
          pinLatitude: 6.4474,
          pinLongitude: 3.3591,
          geofenceRadiusM: 200,
          distanceMeters: 7370,
          withinGeofence: false,
          premisesPhotoPath: 'photos/premises.jpg',
          meetingLog: {
            id: 'log-01',
            contactName: 'Client Contact',
            contactRole: 'Staff',
            visitPurpose: 'routine_visit',
            productsDiscussed: ['Lubricants'],
            fleetSizeOrVolume: '24',
            outcomeNarrative: 'Meeting conducted on site',
            nextStepText: 'Send technical quote',
            submittedAt: '2026-11-03T17:54:00Z',
            businessCardPhotoPath: null,
          },
        },
      ];

      const { managementService } = await import('../services/managementService');
      vi.spyOn(managementService, 'getCountryVisits').mockResolvedValue({
        data: mockVisits as any,
        error: null,
      });

      render(
        <MarketConfigContext.Provider value={mockMarketConfig}>
          <AuthContext.Provider value={{ currentUser: mockSalesHead as any, isAuthenticated: true } as any}>
            <ClientVisitVerification />
          </AuthContext.Provider>
        </MarketConfigContext.Provider>
      );

      // Verify the badge displays Outside Geofence with the actual live distance
      await waitFor(() => {
        expect(screen.getByText(/Outside Geofence \(7,370m > 200m\)/i)).toBeInTheDocument();
      });

      // Verify "No Geofence (Exception)" is NOT displayed
      expect(screen.queryByText(/No Geofence \(Exception\)/i)).toBeNull();

      // Verify live distance row is rendered
      expect(screen.getByText(/Live GPS Distance:/i)).toBeInTheDocument();
      const distanceElements = screen.getAllByText(/7,370m/i);
      expect(distanceElements.length).toBeGreaterThanOrEqual(1);

      // Open inspection modal
      const inspectBtn = screen.getByRole('button', { name: /Inspect Full Audit Record/i });
      fireEvent.click(inspectBtn);

      // Modal should show Outside Geofence and PostGIS Geofence Audit details
      expect(screen.getByText(/Authoritative PostGIS Geofence Audit/i)).toBeInTheDocument();
      expect(screen.getByText(/Location Unverified \(Outside Geofence\)/i)).toBeInTheDocument();
    });
  });

  describe('SalespersonHomePreview - Today Field Activity Records', () => {
    const mockRepUser = {
      id: 'rep-001',
      name: 'Tunde Adebayo',
      role: 'salesperson',
      marketCode: 'NG',
      marketName: 'Nigeria (Lagos Hub)',
    };

    it('accurately counts unverified visits (location_unverified) and filters today exceptions', () => {
      // 2 verified visits and 2 unverified visits
      const mockCompletedVisits: any[] = [
        {
          id: 'v-1',
          branchName: 'Apapa Terminal Depot',
          verificationStatus: 'location_verified',
          checkInTime: '13:45 WAT',
          checkOutTime: '13:45 WAT',
          durationMinutes: 1,
        },
        {
          id: 'v-2',
          branchName: 'Apapa Port Gate ac55bc',
          verificationStatus: 'location_unverified',
          checkInTime: '17:50 WAT',
          checkOutTime: '17:54 WAT',
          durationMinutes: 5,
        },
        {
          id: 'v-3',
          branchName: 'Apapa Port Gate 89d697',
          verificationStatus: 'location_unverified',
          checkInTime: '13:30 WAT',
          checkOutTime: '13:34 WAT',
          durationMinutes: 3,
        },
        {
          id: 'v-4',
          branchName: 'Atan, Ota',
          verificationStatus: 'location_verified',
          checkInTime: '13:21 WAT',
          checkOutTime: '13:25 WAT',
          durationMinutes: 4,
        },
      ];

      // 1 exception today and 62 exceptions on previous days (total 63)
      const todayIso = new Date().toISOString();
      const mockExceptions: any[] = [
        {
          id: 'exc-today-1',
          branchName: 'Apapa Port Gate ac55bc',
          submittedAt: new Date().toLocaleString(),
          submittedAtIso: todayIso,
          status: 'pending_review',
        },
        ...Array.from({ length: 62 }, (_, i) => ({
          id: `exc-past-${i}`,
          branchName: 'Past Depot',
          submittedAt: '2026-10-15, 10:00:00',
          submittedAtIso: '2026-10-15T10:00:00Z',
          claimedDate: '15/10/2026',
          status: 'approved_unverified',
        })),
      ];

      const mockSession: any = {
        workdayStatus: 'started',
        startDayTime: '08:00 WAT',
        isAttendanceProvisional: false,
        activeVisit: null,
        completedVisits: mockCompletedVisits,
        pendingMeetingLogs: [],
        exceptions: mockExceptions,
        branches: [],
        isOnline: true,
        syncState: 'idle',
        triggerSyncNow: vi.fn(),
        sessionNotice: null,
        setSessionNotice: vi.fn(),
        checkOutVisit: vi.fn(),
        submitMeetingLog: vi.fn(),
        latestNonVisitRequest: null,
        cancelNonVisitDayRequest: vi.fn(),
      };

      render(
        <MarketConfigContext.Provider value={mockMarketConfig}>
          <AuthContext.Provider value={{ currentUser: mockRepUser as any, isAuthenticated: true } as any}>
            <FieldSessionContext.Provider value={mockSession}>
              <SalespersonHomePreview />
            </FieldSessionContext.Provider>
          </AuthContext.Provider>
        </MarketConfigContext.Provider>
      );

      // Both Verified and Unverified must be 2 (not 0!)
      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.getByText('Unverified')).toBeInTheDocument();
      const twoCounts = screen.getAllByText('2');
      expect(twoCounts).toHaveLength(2); // One for Verified (2), one for Unverified (2)

      // Exceptions: must be 1 (today's exception, not 63!)
      expect(screen.getByText('Exceptions')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();

      // Context tile 4 still shows total historical exceptions count
      expect(screen.getByText(/63 filed/i)).toBeInTheDocument();
    });
  });
});
