import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClientVisitVerification } from '@/features/review/ClientVisitVerification';
import { HqMarketConfiguration } from '@/features/admin/HqMarketConfiguration';
import { SalesHeadDashboardPreview } from '@/features/review/SalesHeadDashboardPreview';
import { MeetingLogModal } from '@/features/field/MeetingLogModal';
import { MarketConfigProvider, INITIAL_MARKET_RULES } from '@/context/MarketConfigContext';
import { AuthContext } from '@/context/AuthContext';
import { managementService } from '@/services/managementService';
import { adminService } from '@/services/adminService';
import { supabase } from '@/lib/supabase';

const mockCshUser: any = {
  id: 'csh-ng-01',
  name: 'Babajide Adeleke',
  email: 'csh.ng@carbon.test',
  role: 'country_sales_head',
  marketCode: 'NG',
  marketName: 'Nigeria (Africa/Lagos)',
  timezone: 'Africa/Lagos',
  employeeId: 'CC-CSH-01',
  isActive: true,
};

function makeVisit(id: string, hoursSinceCheckout: number, overrides: Partial<any> = {}) {
  const checkOutAt = new Date(Date.now() - hoursSinceCheckout * 3600 * 1000).toISOString();
  const checkInAt = new Date(Date.now() - (hoursSinceCheckout + 0.5) * 3600 * 1000).toISOString();
  return {
    id,
    repId: 'rep-1',
    repName: 'Tunde Adebayo',
    organisationName: 'Delta Perkins Ltd',
    branchName: `Branch ${id}`,
    branchAddress: 'Plot 14 Apapa Road',
    category: 'fleet_operator',
    marketCode: 'NG',
    workDate: checkInAt.slice(0, 10),
    checkInAt,
    checkOutAt,
    durationMinutes: 30,
    verificationStatus: 'location_verified',
    checkInLatitude: 6.45,
    checkInLongitude: 3.38,
    checkInAccuracyM: 88,
    checkOutLatitude: 6.45,
    checkOutLongitude: 3.38,
    checkOutAccuracyM: 88,
    pinLatitude: 6.45,
    pinLongitude: 3.38,
    geofenceRadiusM: 0,
    distanceMeters: 220,
    withinGeofence: false,
    capturedOffline: false,
    premisesPhotoPath: null,
    meetingLog: null,
    clientAuditStatus: null,
    ...overrides,
  };
}

describe('Dynamic Market Rules for Geofence Limit, GPS Uncertainty, and Log SLA', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminService, 'getMarketRules').mockResolvedValue({ data: [], error: null });
    vi.spyOn(adminService, 'commitMarketRuleVersion').mockResolvedValue({
      data: null,
      newVersion: 'v1.2.06',
      error: null,
    });
  });

  it('dynamically updates ClientVisitVerification banner, filter pill, cards, and Missing >Xh SLA filtering when HQ Admin edits rules', async () => {
    const visitThreeHoursAgo = makeVisit('visit-3h', 3);
    const visitFiveHoursAgo = makeVisit('visit-5h', 5);

    vi.spyOn(managementService, 'getCountryVisits').mockResolvedValue({
      data: [visitThreeHoursAgo, visitFiveHoursAgo] as any,
      error: null,
    });

    render(
      <AuthContext.Provider value={{ currentUser: mockCshUser, isAuthenticated: true } as any}>
        <MarketConfigProvider>
          <HqMarketConfiguration />
          <ClientVisitVerification />
        </MarketConfigProvider>
      </AuthContext.Provider>
    );

    // Wait for initial 200m / 100m / 2h rules
    expect(await screen.findByText('Geofence Limit: 200m')).toBeInTheDocument();
    expect(screen.getByText('Log SLA: 2 Hours')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Missing >2h' })).toBeInTheDocument();
    expect(
      screen.getByText(
        /Location verification requires GPS ≤100m within 200m geofence and live photo; meeting logs require narrative and free-text next steps within 2 hours\./i
      )
    ).toBeInTheDocument();

    // Both 3h and 5h unlogged visits are overdue under 2h SLA
    expect(screen.getAllByText('Log Overdue (>2h)')).toHaveLength(2);
    expect(screen.getByText(/matching visit/i).closest('div')).toHaveTextContent('Showing 2 matching visits');

    // Switch HQ Admin configuration to Edit mode and update Geofence = 350m and Meeting Log SLA = 4h
    fireEvent.click(screen.getByRole('button', { name: /Edit Operational Rules/i }));

    const geofenceInput = document.getElementById('input-default-geofence-radius') as HTMLInputElement;
    const slaInput = document.getElementById('input-meeting-log-sla-hours') as HTMLInputElement;
    expect(geofenceInput).toBeTruthy();
    expect(slaInput).toBeTruthy();

    fireEvent.change(geofenceInput, { target: { value: '350' } });
    fireEvent.change(slaInput, { target: { value: '4' } });

    fireEvent.click(screen.getByRole('button', { name: /Commit Rule Version/i }));

    // ClientVisitVerification banner, pills, and filter update dynamically to 350m and 4 Hours
    await waitFor(() => {
      expect(screen.getByText('Geofence Limit: 350m')).toBeInTheDocument();
      expect(screen.getByText('Log SLA: 4 Hours')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Missing >4h' })).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        /Location verification requires GPS ≤100m within 350m geofence and live photo; meeting logs require narrative and free-text next steps within 4 hours\./i
      )
    ).toBeInTheDocument();

    // Check SLA evaluation: 5h visit stays overdue (>4h), while 3h visit moves into within-SLA pending state
    expect(screen.getAllByText('Log Overdue (>4h)')).toHaveLength(1);
    expect(screen.getByText('Pending Log (≤4h)')).toBeInTheDocument();

    // Filtering by "Missing >4h" excludes the 3h visit and shows only the 5h overdue visit
    fireEvent.click(screen.getByRole('button', { name: 'Missing >4h' }));
    expect(screen.getByText(/matching visit/i).closest('div')).toHaveTextContent('Showing 1 matching visit');
    expect(screen.getByText('Branch visit-5h')).toBeInTheDocument();
    expect(screen.queryByText('Branch visit-3h')).toBeNull();
  });

  it('reflects admin-configured GPS uncertainty and Meeting Log SLA across MeetingLogModal and SalesHeadDashboardPreview', async () => {
    vi.spyOn(adminService, 'getMarketRules').mockResolvedValue({
      data: [
        {
          id: 'rule-ng-custom',
          marketCode: 'NG',
          versionTag: 'v1.2.09',
          isActive: true,
          workingHoursStart: '08:00:00',
          workingHoursEnd: '17:00:00',
          shiftGraceMinutes: 15,
          geofenceRadiusM: 350,
          maxVisitGpsAccuracyM: 150,
          maxPinGpsAccuracyM: 50,
          minVisitDurationSeconds: 300,
          maxIdleGapMinutes: 150,
          maxClockDriftMinutes: 5,
          dailyVisitTarget: 6,
          meetingLogSlaHours: 4,
          effectiveFrom: '2026-11-19T12:00:00Z',
          effectiveTo: null,
        },
      ],
      error: null,
    });

    vi.spyOn(managementService, 'getCountryVisits').mockResolvedValue({ data: [], error: null });
    vi.spyOn(managementService, 'getBranchLocationPins').mockResolvedValue({ data: [], error: null });
    vi.spyOn(managementService, 'getCountryExceptions').mockResolvedValue({ data: [], error: null });
    vi.spyOn(managementService, 'getCountryVerificationFlags').mockResolvedValue({ data: [], error: null });
    vi.spyOn(managementService, 'getClientAuditRecords').mockResolvedValue({ data: [], error: null });

    render(
      <AuthContext.Provider value={{ currentUser: mockCshUser, isAuthenticated: true } as any}>
        <MarketConfigProvider>
          <SalesHeadDashboardPreview />
          <MeetingLogModal
            isOpen={true}
            onClose={vi.fn()}
            branchName="Apapa Hub"
            onSubmitted={vi.fn()}
          />
        </MarketConfigProvider>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('>4h SLA Overdue')).toBeInTheDocument();
      expect(screen.getByText(/4-Hour Submission Window:/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/Defer completion \(Complete within permitted 4-hour window\)/i)
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByLabelText(/Defer completion \(Complete within permitted 4-hour window\)/i)
    );
    expect(screen.getByRole('button', { name: /Check Out & Defer Log \(4h SLA\)/i })).toBeInTheDocument();
  });

  it('commits meetingLogSlaHours safely even when pre-Migration 00030 schema lacks meeting_log_sla_hours column', async () => {
    vi.restoreAllMocks();
    const insertPayloads: any[] = [];
    const auditPayloads: any[] = [];

    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: 'admin-uuid-1' } },
      error: null,
    } as any);

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'market_rules') {
        return {
          select: (_cols: string, opts?: any) => {
            if (opts?.head) {
              return { eq: () => Promise.resolve({ count: 5, error: null }) };
            }
            return {
              eq: () => ({
                eq: () => ({
                  is: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: () =>
                          Promise.resolve({ data: { id: 'old-rule-id', version_tag: 'v1.2.05' }, error: null }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          },
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
          insert: (payload: any) => {
            insertPayloads.push(payload);
            return {
              select: () => ({
                single: () => {
                  if (payload.meeting_log_sla_hours !== undefined) {
                    return Promise.resolve({
                      data: null,
                      error: { message: "Could not find the 'meeting_log_sla_hours' column of 'market_rules'" },
                    });
                  }
                  return Promise.resolve({
                    data: {
                      id: 'new-rule-id',
                      market_code: 'NG',
                      version_tag: 'v1.2.06',
                      is_active: true,
                      working_hours_start: '08:00:00',
                      working_hours_end: '17:00:00',
                      shift_grace_minutes: 15,
                      geofence_radius_m: 350,
                      max_visit_gps_accuracy_m: 150,
                      max_pin_gps_accuracy_m: 50,
                      min_visit_duration_seconds: 300,
                      max_idle_gap_minutes: 150,
                      max_clock_drift_minutes: 5,
                      daily_visit_target: 6,
                      effective_from: '2026-11-19T12:00:00Z',
                      effective_to: null,
                    },
                    error: null,
                  });
                },
              }),
            };
          },
        } as any;
      }

      if (table === 'approval_audit') {
        return {
          insert: (payload: any) => {
            auditPayloads.push(payload);
            return Promise.resolve({ error: null });
          },
        } as any;
      }

      return {} as any;
    });

    const base = INITIAL_MARKET_RULES.NG;
    const res = await adminService.commitMarketRuleVersion({
      marketCode: 'NG',
      geofenceRadiusM: 350,
      maxVisitGpsAccuracyM: 150,
      maxPinGpsAccuracyM: base.maxProposedPinGpsAccuracyMeters,
      minVisitDurationSeconds: base.minVisitDurationMinutes * 60,
      maxIdleGapMinutes: base.idleGapThresholdMinutes,
      dailyVisitTarget: base.dailyVisitTarget,
      meetingLogSlaHours: 4,
      shiftGraceMinutes: base.attendanceGraceMinutes,
      workingHoursStart: base.workingHoursStart,
      workingHoursEnd: base.workingHoursEnd,
      reason: 'Expanded geofence and Log SLA for pilot.',
    });

    expect(res.error).toBeNull();
    expect(res.data?.meetingLogSlaHours).toBe(4);
    expect(insertPayloads).toHaveLength(2);
    expect(insertPayloads[0].meeting_log_sla_hours).toBe(4);
    expect(insertPayloads[1].meeting_log_sla_hours).toBeUndefined();
    expect(auditPayloads).toHaveLength(1);
    expect(auditPayloads[0].new_state.length).toBeLessThanOrEqual(64);
    expect(auditPayloads[0].new_state).toContain('|sla:4h');
  });
});
