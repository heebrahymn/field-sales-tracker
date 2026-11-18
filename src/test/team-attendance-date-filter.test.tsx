import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeamAttendanceReview } from '@/features/review/TeamAttendanceReview';
import { AuthContext } from '@/context/AuthContext';
import { attendanceService, AttendanceRecord, getMarketWorkDate } from '@/services/attendanceService';
import { supabase } from '@/lib/supabase';

const mockSalesHeadUser: any = {
  id: '22222222-2222-4222-a222-222222222222',
  name: 'Babajide Adeleke',
  email: 'babajide@carboncarcare.ng',
  role: 'country_sales_head',
  marketCode: 'NG',
  marketName: 'Nigeria (Africa/Lagos)',
};

function renderWithAuth(ui: React.ReactElement) {
  return render(
    <AuthContext.Provider
      value={{
        currentUser: mockSalesHeadUser,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      } as any}
    >
      {ui}
    </AuthContext.Provider>
  );
}

describe('Team Attendance Date Filter & Non-Visit Workday Scoping', () => {
  const todayStr = getMarketWorkDate('NG');

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attendanceService.getMarketAttendance guards invalid dates, checks approved_absences errors, and enforces exact date matching', async () => {
    const fromSpy = vi.spyOn(supabase, 'from');

    const emptyRes = await attendanceService.getMarketAttendance('NG', '');
    expect(emptyRes).toEqual({ data: [], error: null });
    expect(fromSpy).not.toHaveBeenCalled();

    const makeChain = (resolved: any) => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn().mockResolvedValue(resolved),
      };
      return chain;
    };

    const attChain = makeChain({
      data: [
        {
          id: 'att-1',
          user_id: 'rep-active',
          device_id: 'dev-1',
          market_code: 'NG',
          work_date: '2026-11-17',
          started_at: '2026-11-17T08:15:00Z',
          ended_at: null,
          start_latitude: 6.45,
          start_longitude: 3.42,
          start_accuracy_m: 15,
          start_selfie_url: 'selfie.jpg',
          end_latitude: null,
          end_longitude: null,
          end_accuracy_m: null,
          status: 'started',
          captured_offline: false,
          visits: [],
          profiles: { id: 'rep-active', full_name: 'Funmi Ojo', email: 'f@carbon.ng', role: 'salesperson', market_code: 'NG' },
          devices: { id: 'dev-1', asset_tag: 'CAR-01' },
        },
        {
          id: 'att-wrong-date',
          user_id: 'rep-stale',
          device_id: 'dev-2',
          market_code: 'NG',
          work_date: '2026-11-16',
          started_at: '2026-11-16T08:00:00Z',
          ended_at: null,
          start_latitude: 6.45,
          start_longitude: 3.42,
          start_accuracy_m: 15,
          start_selfie_url: '',
          end_latitude: null,
          end_longitude: null,
          end_accuracy_m: null,
          status: 'started',
          captured_offline: false,
          visits: [],
        },
      ],
      error: null,
    });

    const absChain = makeChain({
      data: [
        {
          id: 'abs-1',
          user_id: 'rep-nv',
          market_code: 'NG',
          absence_date: '2026-11-17',
          category: 'proposal_preparation_office',
          justification: 'Tender documentation at head office',
          approved_at: '2026-11-17T07:30:00Z',
          profiles: { id: 'rep-nv', full_name: 'Tunde Adebayo', email: 't@carbon.ng', role: 'salesperson', market_code: 'NG' },
        },
        {
          id: 'abs-wrong-date',
          user_id: 'rep-other-nv',
          market_code: 'NG',
          absence_date: '2026-11-16',
          category: 'training_development',
          justification: 'Yesterday workshop',
          approved_at: '2026-11-16T07:30:00Z',
        },
      ],
      error: null,
    });

    const assignChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    fromSpy.mockImplementation((table: string) => {
      if (table === 'attendance_days') return attChain;
      if (table === 'approved_absences') return absChain;
      return assignChain as any;
    });

    const res = await attendanceService.getMarketAttendance('NG', '2026-11-17');
    expect(res.error).toBeNull();
    expect(attChain.eq).toHaveBeenCalledWith('work_date', '2026-11-17');
    expect(absChain.eq).toHaveBeenCalledWith('absence_date', '2026-11-17');
    expect(res.data).toHaveLength(2);
    const nv = res.data.find((r) => r.user_id === 'rep-nv');
    expect(nv?.status).toBe('approved_non_visit');
    expect(nv?.absence_date).toBe('2026-11-17');
    expect(nv?.absence_category).toBe('proposal_preparation_office');
    expect(nv?.absence_justification).toBe('Tender documentation at head office');
  });

  it('shows approved Non-Visit Workday strictly on the date it is logged, never on other dates, and renders honest telemetry', async () => {
    const activeTodayRecord: AttendanceRecord = {
      id: 'att-today-1',
      user_id: 'rep-funmi-1111',
      device_id: 'dev-1',
      market_code: 'NG',
      work_date: todayStr,
      started_at: `${todayStr}T09:00:00Z`,
      ended_at: null,
      start_latitude: 6.4531,
      start_longitude: 3.4211,
      start_accuracy_m: 14,
      start_selfie_url: '',
      end_latitude: null,
      end_longitude: null,
      end_accuracy_m: null,
      status: 'started',
      captured_offline: false,
      visits: [],
      profiles: {
        id: 'rep-funmi-1111',
        full_name: 'Funmi Ojo',
        email: 'funmi@carboncarcare.ng',
        role: 'salesperson',
        market_code: 'NG',
      },
      devices: { id: 'dev-1', asset_tag: 'CAR-SPR-117352' },
    };

    const nonVisitPastDate = '2026-11-10';
    const pastNonVisitRecord: AttendanceRecord = {
      id: 'abs-past-1',
      user_id: 'rep-tunde-2222',
      device_id: 'authorized_absence',
      market_code: 'NG',
      work_date: nonVisitPastDate,
      started_at: '2026-11-09T14:00:00Z',
      ended_at: '2026-11-09T14:00:00Z',
      start_latitude: 0,
      start_longitude: 0,
      start_accuracy_m: 0,
      start_selfie_url: '',
      end_latitude: null,
      end_longitude: null,
      end_accuracy_m: null,
      status: 'approved_non_visit',
      captured_offline: false,
      absence_date: nonVisitPastDate,
      absence_category: 'proposal_preparation_office',
      absence_justification: 'Preparing haulage lubricant proposal in office',
      absence_approved_at: '2026-11-09T14:00:00Z',
      visits: [],
      profiles: {
        id: 'rep-tunde-2222',
        full_name: 'Tunde Adebayo',
        email: 'tunde@carboncarcare.ng',
        role: 'salesperson',
        market_code: 'NG',
      },
      devices: {
        id: 'none',
        asset_tag: 'Not Required (Absence)',
        make: 'N/A',
        model: 'Authorized Non-Field',
      },
    };

    const completedTodayRecord: AttendanceRecord = {
      ...activeTodayRecord,
      id: 'att-today-2',
      user_id: 'rep-fasakin-3333',
      status: 'ended',
      ended_at: `${todayStr}T16:30:00Z`,
      profiles: {
        id: 'rep-fasakin-3333',
        full_name: 'Fasakin Peter',
        email: 'fasakin@carboncarcare.ng',
        role: 'salesperson',
        market_code: 'NG',
      },
      devices: { id: 'dev-2', asset_tag: 'CP-DEV-NG-01' },
    };

    const getMarketSpy = vi
      .spyOn(attendanceService, 'getMarketAttendance')
      .mockImplementation(async (_market, dateStr) => {
        if (dateStr === nonVisitPastDate) {
          return { data: [pastNonVisitRecord], error: null };
        }
        return { data: [activeTodayRecord, completedTodayRecord], error: null };
      });

    vi.spyOn(attendanceService, 'getPendingNonVisitRequests').mockResolvedValue({
      data: [],
      error: null,
    });

    renderWithAuth(<TeamAttendanceReview enableLiveSyncInTest />);

    // Current date loads today's active/completed field reps and does NOT show 2026-11-10 non-visit log
    await waitFor(() => {
      expect(screen.getByText('Funmi Ojo')).toBeInTheDocument();
      expect(screen.getByText('Fasakin Peter')).toBeInTheDocument();
    });
    expect(screen.queryByText('Tunde Adebayo')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Active on Field \(2\)/i })).toBeInTheDocument();

    // Switching End Date Filter backward to 2026-11-10 clamps Start Date too, displaying Tunde's non-visit record for that exact date
    const startInput = screen.getByLabelText('Attendance Start Date');
    const endInput = screen.getByLabelText('Attendance End Date');
    fireEvent.change(endInput, { target: { value: nonVisitPastDate } });

    await waitFor(() => {
      expect(getMarketSpy).toHaveBeenCalledWith('NG', nonVisitPastDate);
      expect(screen.getByText('Tunde Adebayo')).toBeInTheDocument();
    });

    expect(screen.queryByText('Funmi Ojo')).not.toBeInTheDocument();
    expect(screen.getByText(/Logged for/i)).toBeInTheDocument();
    expect(screen.getAllByText(nonVisitPastDate).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/No field handset telemetry/i)).toBeInTheDocument();
    expect(screen.queryByText(/94% Battery/i)).not.toBeInTheDocument();

    // Telemetry modal displays authorized absence record instead of fake GPS/selfie fallback
    fireEvent.click(screen.getByRole('button', { name: /Inspect Telemetry/i }));
    expect(screen.getByText(/Authorized Non-Field Record/i)).toBeInTheDocument();
    expect(screen.getByText(`Logged Date: ${nonVisitPastDate}`)).toBeInTheDocument();
    expect(screen.queryByText(/6\.4531/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Close Telemetry Inspection/i }));

    // Clearing a date input clears rows safely without firing invalid date queries
    const callCountBeforeClear = getMarketSpy.mock.calls.length;
    fireEvent.change(startInput, { target: { value: '' } });
    await waitFor(() => {
      expect(screen.getByText(/Please select a valid From and To date/i)).toBeInTheDocument();
    });
    expect(getMarketSpy.mock.calls.length).toBe(callCountBeforeClear);

    // Clicking "Today" resets cleanly back to current date
    fireEvent.click(screen.getByRole('button', { name: /^Today$/i }));
    await waitFor(() => {
      expect(screen.getByText('Funmi Ojo')).toBeInTheDocument();
    });
    expect(screen.queryByText('Tunde Adebayo')).not.toBeInTheDocument();
  });

  it('ignores stale out-of-order date responses when switching attendance dates quickly', async () => {
    let resolveFirst!: (val: { data: AttendanceRecord[]; error: null }) => void;
    const firstPromise = new Promise<{ data: AttendanceRecord[]; error: null }>((res) => {
      resolveFirst = res;
    });

    const staleRep: AttendanceRecord = {
      id: 'att-stale',
      user_id: 'rep-stale-9999',
      device_id: 'dev-9',
      market_code: 'NG',
      work_date: '2026-11-11',
      started_at: '2026-11-11T08:00:00Z',
      ended_at: null,
      start_latitude: 6.45,
      start_longitude: 3.42,
      start_accuracy_m: 12,
      start_selfie_url: '',
      end_latitude: null,
      end_longitude: null,
      end_accuracy_m: null,
      status: 'started',
      captured_offline: false,
      visits: [],
      profiles: {
        id: 'rep-stale-9999',
        full_name: 'Stale Date Rep',
        email: 'stale@carbon.ng',
        role: 'salesperson',
        market_code: 'NG',
      },
      devices: { id: 'dev-9', asset_tag: 'CAR-STALE' },
    };

    const latestRep: AttendanceRecord = {
      ...staleRep,
      id: 'att-latest',
      user_id: 'rep-latest-8888',
      work_date: '2026-11-12',
      profiles: {
        id: 'rep-latest-8888',
        full_name: 'Latest Date Rep',
        email: 'latest@carbon.ng',
        role: 'salesperson',
        market_code: 'NG',
      },
      devices: { id: 'dev-8', asset_tag: 'CAR-LATEST' },
    };

    vi.spyOn(attendanceService, 'getMarketAttendance').mockImplementation((_m, dateStr) => {
      if (dateStr === '2026-11-11') return firstPromise;
      if (dateStr === '2026-11-12') return Promise.resolve({ data: [latestRep], error: null });
      return Promise.resolve({ data: [], error: null });
    });

    vi.spyOn(attendanceService, 'getPendingNonVisitRequests').mockResolvedValue({
      data: [],
      error: null,
    });

    renderWithAuth(<TeamAttendanceReview enableLiveSyncInTest />);
    const startInput = screen.getByLabelText('Attendance Start Date');
    const endInput = screen.getByLabelText('Attendance End Date');

    fireEvent.change(endInput, { target: { value: '2026-11-11' } });
    fireEvent.change(startInput, { target: { value: '2026-11-12' } });

    await waitFor(() => {
      expect(screen.getByText('Latest Date Rep')).toBeInTheDocument();
    });

    // Resolve earlier slow request after newer request already rendered
    resolveFirst({ data: [staleRep], error: null });

    await waitFor(() => {
      expect(screen.getByText('Latest Date Rep')).toBeInTheDocument();
      expect(screen.queryByText('Stale Date Rep')).not.toBeInTheDocument();
    });
  });

  it('supports date range selection to show total and per-salesperson client visits logged across multiple days', async () => {
    const funmiDay1: AttendanceRecord = {
      id: 'att-f1',
      user_id: 'user-funmi-0001',
      device_id: 'dev-f',
      market_code: 'NG',
      work_date: '2026-11-12',
      started_at: '2026-11-12T08:15:00Z',
      ended_at: '2026-11-12T17:00:00Z',
      start_latitude: 6.45,
      start_longitude: 3.42,
      start_accuracy_m: 12,
      start_selfie_url: '',
      end_latitude: null,
      end_longitude: null,
      end_accuracy_m: null,
      status: 'ended',
      captured_offline: false,
      visits: [
        { id: 'v1', verification_status: 'location_verified' },
        { id: 'v2', verification_status: 'location_verified' },
      ],
      profiles: {
        id: 'user-funmi-0001',
        full_name: 'Funmi Ojo',
        email: 'funmi@carbon.ng',
        role: 'salesperson',
        market_code: 'NG',
      },
      devices: { id: 'dev-f', asset_tag: 'CAR-FUNMI' },
    };

    const funmiDay2: AttendanceRecord = {
      ...funmiDay1,
      id: 'att-f2',
      work_date: '2026-11-14',
      started_at: '2026-11-14T08:30:00Z',
      ended_at: null,
      status: 'started',
      visits: [
        { id: 'v3', verification_status: 'location_verified' },
        { id: 'v4', verification_status: 'location_unverified' },
        { id: 'v5', verification_status: 'location_verified' },
      ],
    };

    const peterDay1: AttendanceRecord = {
      ...funmiDay1,
      id: 'att-p1',
      user_id: 'user-peter-0002',
      work_date: '2026-11-14',
      status: 'started',
      visits: [{ id: 'v6', verification_status: 'manager_approved_unverified' }],
      profiles: {
        id: 'user-peter-0002',
        full_name: 'Fasakin Peter',
        email: 'peter@carbon.ng',
        role: 'salesperson',
        market_code: 'NG',
      },
      devices: { id: 'dev-p', asset_tag: 'CAR-PETER' },
    };

    const tundeNonVisit: AttendanceRecord = {
      ...funmiDay1,
      id: 'abs-t1',
      user_id: 'user-tunde-0003',
      device_id: 'authorized_absence',
      work_date: '2026-11-13',
      status: 'approved_non_visit',
      absence_date: '2026-11-13',
      absence_category: 'training_development',
      visits: [],
      profiles: {
        id: 'user-tunde-0003',
        full_name: 'Tunde Adebayo',
        email: 'tunde@carbon.ng',
        role: 'salesperson',
        market_code: 'NG',
      },
      devices: { id: 'none', asset_tag: 'Not Required (Absence)' },
    };

    vi.spyOn(attendanceService, 'getMarketAttendance').mockResolvedValue({
      data: [],
      error: null,
    });
    const rangeSpy = vi
      .spyOn(attendanceService, 'getMarketAttendanceRange')
      .mockResolvedValue({
        data: [funmiDay1, funmiDay2, peterDay1, tundeNonVisit],
        error: null,
      });
    vi.spyOn(attendanceService, 'getPendingNonVisitRequests').mockResolvedValue({
      data: [],
      error: null,
    });

    renderWithAuth(<TeamAttendanceReview enableLiveSyncInTest />);

    const startInput = screen.getByLabelText('Attendance Start Date');
    const endInput = screen.getByLabelText('Attendance End Date');

    fireEvent.change(endInput, { target: { value: '2026-11-15' } });
    fireEvent.change(startInput, { target: { value: '2026-11-12' } });

    await waitFor(() => {
      expect(rangeSpy).toHaveBeenCalledWith('NG', '2026-11-12', '2026-11-15');
      expect(screen.getByText('Funmi Ojo')).toBeInTheDocument();
      expect(screen.getByText('Fasakin Peter')).toBeInTheDocument();
      expect(screen.getByText('Tunde Adebayo')).toBeInTheDocument();
    });

    // Total Team Visits Logged across 2026-11-12..2026-11-15 = 5 + 1 + 0 = 6 (4 location verified)
    expect(screen.getByText(/Total Client Visits Logged:/i)).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText(/\(4 location verified\)/i)).toBeInTheDocument();

    // Per-rep aggregated counts
    expect(screen.getByText(/2 field days • 4 verified/i)).toBeInTheDocument();
    expect(screen.getByText('2 Field Days')).toBeInTheDocument();
    expect(screen.getByText('1 Non-Visit')).toBeInTheDocument();
  });

  it('attendanceService.getMarketAttendanceRange queries date bounds and merges absences per exact (user_id, work_date)', async () => {
    const makeRangeChain = (resolved: any) => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        order: vi.fn().mockResolvedValue(resolved),
      };
      return chain;
    };

    const attChain = makeRangeChain({
      data: [
        {
          id: 'att-day1',
          user_id: 'rep-multi',
          device_id: 'dev-m',
          market_code: 'NG',
          work_date: '2026-11-14',
          started_at: '2026-11-14T08:00:00Z',
          ended_at: null,
          start_latitude: 6.45,
          start_longitude: 3.42,
          start_accuracy_m: 10,
          start_selfie_url: '',
          end_latitude: null,
          end_longitude: null,
          end_accuracy_m: null,
          status: 'started',
          captured_offline: false,
          visits: [{ id: 'v-10', verification_status: 'location_verified' }],
        },
      ],
      error: null,
    });

    const absChain = makeRangeChain({
      data: [
        {
          id: 'abs-day2',
          user_id: 'rep-multi',
          market_code: 'NG',
          absence_date: '2026-11-15',
          category: 'training_development',
          justification: 'HQ workshop',
          approved_at: '2026-11-15T07:30:00Z',
        },
      ],
      error: null,
    });

    const assignChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'attendance_days') return attChain;
      if (table === 'approved_absences') return absChain;
      return assignChain as any;
    });

    const res = await attendanceService.getMarketAttendanceRange('NG', '2026-11-14', '2026-11-15');
    expect(res.error).toBeNull();
    expect(attChain.gte).toHaveBeenCalledWith('work_date', '2026-11-14');
    expect(attChain.lte).toHaveBeenCalledWith('work_date', '2026-11-15');
    expect(absChain.gte).toHaveBeenCalledWith('absence_date', '2026-11-14');
    expect(absChain.lte).toHaveBeenCalledWith('absence_date', '2026-11-15');
    // Both days must remain separate entries (absence on 11-15 must not overwrite attendance on 11-14)
    expect(res.data).toHaveLength(2);
    expect(res.data.find((r) => r.work_date === '2026-11-14')?.status).toBe('started');
    expect(res.data.find((r) => r.work_date === '2026-11-15')?.status).toBe('approved_non_visit');
  });
});
