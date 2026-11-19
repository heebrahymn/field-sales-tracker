import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthContext, UserProfile } from '@/context/AuthContext';
import { FieldSessionContext } from '@/context/FieldSessionContext';
import { MarketConfigContext } from '@/context/MarketConfigContext';
import { DeviceReplacementContext } from '@/context/DeviceReplacementContext';
import { SalespersonHomePreview } from '@/features/field/SalespersonHomePreview';
import { ProfileView } from '@/features/field/ProfileView';
import { ReportDeviceIssueModal } from '@/features/field/ReportDeviceIssueModal';
import { PersistentStatusStrip } from '@/components/field/PersistentStatusStrip';
import { StartDayModal } from '@/features/field/StartDayModal';
import { attendanceService } from '@/services/attendanceService';
import { adminService } from '@/services/adminService';
import { supabase } from '@/lib/supabase';

const UNASSIGNED_ZM_REP: UserProfile = {
  id: '057b1e6a-3a64-41b9-805e-cf12255c2183',
  name: 'Cobus Wagenaar',
  email: 'cobus.wagenaar@carbon365.com',
  role: 'salesperson',
  marketCode: 'ZM',
  marketName: 'Zambia (Africa/Lusaka)',
  timezone: 'Africa/Lusaka',
  employeeId: 'CC-ZM-057B',
  isActive: true,
  assignedDevice: undefined,
};

const ASSIGNED_ZM_REP: UserProfile = {
  ...UNASSIGNED_ZM_REP,
  assignedDevice: {
    deviceId: 'b84ba734-823e-40ad-92fd-3d35ffbedfce',
    assetTag: 'CAR-ZM-002',
    model: 'Samsung Galaxy A15',
    make: 'Samsung',
    status: 'approved',
    securityAuthorization: 'authorized',
    batteryHealth: 96,
  },
};

const mockMarketConfig: any = {
  getActiveMarketRules: () => ({
    defaultGeofenceRadiusMeters: 200,
    maxVisitGpsAccuracyMeters: 100,
    maxProposedPinGpsAccuracyMeters: 50,
    minVisitDurationMinutes: 5,
  }),
};

const mockFieldSession: any = {
  workdayStatus: 'not_started',
  startDayTime: null,
  isAttendanceProvisional: false,
  activeVisit: null,
  completedVisits: [],
  pendingMeetingLogs: [],
  exceptions: [],
  branches: [],
  pendingBranches: [],
  registerBranch: vi.fn(),
  isOnline: true,
  syncState: 'synced',
  triggerSyncNow: vi.fn(),
  sessionNotice: null,
  setSessionNotice: vi.fn(),
  checkOutVisit: vi.fn(),
  submitMeetingLog: vi.fn(),
  latestNonVisitRequest: null,
  cancelNonVisitDayRequest: vi.fn(),
  liveGpsCoordinate: null,
  attendanceRecord: null,
  syncQueue: [],
  queueTelemetry: {
    totalEvents: 0,
    pendingCount: 0,
    syncingCount: 0,
    failedCount: 0,
    needsReviewCount: 0,
    blockedDependencyCount: 0,
  },
  onAttendanceStarted: vi.fn(),
  enqueueOfflineStartDay: vi.fn(),
  setLiveGpsCoordinate: vi.fn(),
};

const mockDeviceReplacement: any = {
  devices: [],
  refreshDevices: vi.fn(),
  replacementRequests: [],
  refreshRequests: vi.fn(),
  submitReplacementRequest: vi.fn(),
};

describe('Unassigned Salesperson Device Integrity (No Auto-Assigned / Fallback Devices)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('SalespersonHomePreview shows Unassigned Handset instead of hardcoded CC-DEV-LAG-019 when no device is assigned', () => {
    render(
      <AuthContext.Provider value={{ currentUser: UNASSIGNED_ZM_REP, attendanceStatus: 'scheduled' } as any}>
        <MarketConfigContext.Provider value={mockMarketConfig}>
          <FieldSessionContext.Provider value={mockFieldSession}>
            <SalespersonHomePreview />
          </FieldSessionContext.Provider>
        </MarketConfigContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Unassigned Handset')).toBeInTheDocument();
    expect(screen.queryByText(/CC-DEV-LAG-019/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Samsung Galaxy A15 Enterprise/i)).not.toBeInTheDocument();
  });

  it('ProfileView and PersistentStatusStrip display Unassigned Handset instead of CC-DEV-LOS-001 or Active Custody, and disable replacement reporting', () => {
    render(
      <AuthContext.Provider
        value={{
          currentUser: UNASSIGNED_ZM_REP,
          attendanceStatus: 'scheduled',
          refreshProfile: vi.fn(),
        } as any}
      >
        <FieldSessionContext.Provider value={mockFieldSession}>
          <DeviceReplacementContext.Provider value={mockDeviceReplacement}>
            <PersistentStatusStrip />
            <ProfileView />
          </DeviceReplacementContext.Provider>
        </FieldSessionContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getAllByText('Unassigned Handset').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/CC-DEV-LOS-001/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Samsung Galaxy A15 Enterprise/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Active Custody/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/HQ Database Assigned/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Company Phone/i)).not.toBeInTheDocument();

    const reportBtn = screen.getByRole('button', { name: /Report Device Issue/i });
    expect(reportBtn).toBeDisabled();
  });

  it('ReportDeviceIssueModal blocks submission and shows Unassigned Handset when no device is assigned', () => {
    const submitSpy = vi.fn();
    render(
      <AuthContext.Provider value={{ currentUser: UNASSIGNED_ZM_REP } as any}>
        <DeviceReplacementContext.Provider value={{ ...mockDeviceReplacement, submitReplacementRequest: submitSpy }}>
          <ReportDeviceIssueModal isOpen={true} onClose={vi.fn()} />
        </DeviceReplacementContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Unassigned Handset')).toBeInTheDocument();
    expect(screen.queryByText(/CC-DEV-LOS-001/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Directly to HQ Admin/i })).toBeDisabled();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('shows real assigned device CAR-ZM-002 across Home, Profile, and Status Strip once HQ Admin assigns one', () => {
    render(
      <AuthContext.Provider
        value={{
          currentUser: ASSIGNED_ZM_REP,
          attendanceStatus: 'scheduled',
          refreshProfile: vi.fn(),
        } as any}
      >
        <MarketConfigContext.Provider value={mockMarketConfig}>
          <FieldSessionContext.Provider value={mockFieldSession}>
            <DeviceReplacementContext.Provider value={mockDeviceReplacement}>
              <PersistentStatusStrip />
              <SalespersonHomePreview />
              <ProfileView />
            </DeviceReplacementContext.Provider>
          </FieldSessionContext.Provider>
        </MarketConfigContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getAllByText('CAR-ZM-002').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/Active Custody/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Report Device Issue/i })).toBeEnabled();
  });

  it('StartDayModal warns and blocks starting workday when salesperson has no assigned device', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new Error('No camera in JSDOM')),
      },
    });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn(),
      },
    });

    render(
      <AuthContext.Provider value={{ currentUser: UNASSIGNED_ZM_REP, setAttendanceStatus: vi.fn() } as any}>
        <MarketConfigContext.Provider value={mockMarketConfig}>
          <FieldSessionContext.Provider value={mockFieldSession}>
            <StartDayModal isOpen={true} onClose={vi.fn()} />
          </FieldSessionContext.Provider>
        </MarketConfigContext.Provider>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('No Company Handset Assigned')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Confirm & Start Workday/i })).toBeDisabled();
  });

  it('attendanceService.startDayAttendance refuses to auto-pick a market device when salesperson has no active assignment', async () => {
    const queriedTables: string[] = [];
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      queriedTables.push(table);
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        is: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: () => {
          if (table === 'market_rules') {
            return Promise.resolve({ data: { max_visit_gps_accuracy_m: 100 }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
      };
      return builder;
    });

    const res = await attendanceService.startDayAttendance({
      userId: UNASSIGNED_ZM_REP.id,
      marketCode: 'ZM',
      deviceId: '',
      latitude: -15.4167,
      longitude: 28.2833,
      accuracy: 15,
      selfieBlob: new Blob(['selfie'], { type: 'image/jpeg' }),
    });

    expect(res.data).toBeNull();
    expect(res.error?.message).toMatch(/No company handset is assigned to your account/i);
    expect(queriedTables).toContain('device_assignments');
    expect(queriedTables).not.toContain('devices');
  });

  it('adminService.getHqUsers and getHqDevices ignore returned/historical assignments so unassigned users and depot phones stay accurate', async () => {
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        order: () => {
          if (table === 'profiles') {
            return Promise.resolve({
              data: [
                {
                  id: 'rep-returned',
                  full_name: 'Former Holder',
                  email: 'former@carbon365.com',
                  phone_number: '',
                  role: 'salesperson',
                  market_code: 'ZM',
                  is_active: true,
                  created_at: '2026-11-19T14:00:00Z',
                  device_assignments: [
                    {
                      id: 'old-a1',
                      device_id: 'dev-old',
                      assigned_at: '2026-11-01T10:00:00Z',
                      returned_at: '2026-11-10T10:00:00Z',
                      is_current: false,
                      devices: {
                        id: 'dev-old',
                        asset_tag: 'CAR-ZM-002',
                        make: 'Samsung',
                        model: 'Galaxy A15',
                        inventory_status: 'available',
                      },
                    },
                  ],
                },
              ],
              error: null,
            });
          }
          if (table === 'devices') {
            return Promise.resolve({
              data: [
                {
                  id: 'dev-old',
                  asset_tag: 'CAR-ZM-002',
                  serial_number: 'SN-ZM-002',
                  make: 'Samsung',
                  model: 'Galaxy A15',
                  market_code: 'ZM',
                  inventory_status: 'available',
                  created_at: '2026-10-28T00:00:00Z',
                  device_assignments: [
                    {
                      id: 'old-a1',
                      salesperson_id: 'rep-returned',
                      assigned_at: '2026-11-01T10:00:00Z',
                      returned_at: null,
                      is_current: false,
                      profiles: { id: 'rep-returned', full_name: 'Former Holder', email: 'former@carbon365.com' },
                    },
                  ],
                },
              ],
              error: null,
            });
          }
          return Promise.resolve({ data: [], error: null });
        },
      };
      return builder;
    });

    const usersRes = await adminService.getHqUsers();
    expect(usersRes.data[0].assignedDevice).toBeNull();

    const devsRes = await adminService.getHqDevices();
    expect(devsRes.data[0].assignedTo).toBeNull();
  });
});
