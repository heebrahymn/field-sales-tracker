import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '@/context/AuthContext';
import { FieldSessionProvider, useFieldSession } from '@/context/FieldSessionContext';
import { StartDayModal } from '@/features/field/StartDayModal';
import { EndDayModal } from '@/features/field/EndDayModal';
import { NonVisitDayModal } from '@/features/field/NonVisitDayModal';
import { TeamAttendanceReview } from '@/features/review/TeamAttendanceReview';
import {
  attendanceService,
  getMarketWorkDate,
  getMarketTimezone,
  formatMarketTime,
} from '@/services/attendanceService';
import { supabase } from '@/lib/supabase';

describe('Stage 3B: Real Attendance & Workday Management Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Market Timezone and Canonical Work Date Calculations
  // =========================================================================
  describe('1. Market Timezone & Workday Boundary Calculations', () => {
    it('maps Nigeria, Zambia, and Malawi to authoritative IANA timezones', () => {
      expect(getMarketTimezone('NG')).toBe('Africa/Lagos');
      expect(getMarketTimezone('ZM')).toBe('Africa/Lusaka');
      expect(getMarketTimezone('MW')).toBe('Africa/Blantyre');
    });

    it('derives local calendar workday date in YYYY-MM-DD format without UTC midnight shift', () => {
      const fixedUtcDate = new Date('2026-10-27T23:30:00Z');
      // In Africa/Lagos (UTC+1), this is 2026-10-28 00:30
      const lagosDate = getMarketWorkDate('NG', fixedUtcDate);
      expect(lagosDate).toBe('2026-10-28');

      // In UTC, it is still 2026-10-27
      const utcDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(fixedUtcDate);
      expect(utcDate).toBe('2026-10-27');
    });

    it('formats market timestamps with territory suffix (WAT / CAT)', () => {
      const iso = '2026-10-27T08:15:00Z';
      const formattedNg = formatMarketTime(iso, 'NG');
      expect(formattedNg).toContain('WAT');
      expect(formattedNg).toMatch(/\d{2}:\d{2} WAT/);

      const formattedZm = formatMarketTime(iso, 'ZM');
      expect(formattedZm).toContain('CAT');
    });
  });

  // =========================================================================
  // 2. Attendance Service Database & Storage Operations
  // =========================================================================
  describe('2. Attendance Service Unit & Integrity Logic', () => {
    it('rejects Start Day if GPS accuracy exceeds 100m threshold (PRD §6.1)', async () => {
      const result = await attendanceService.startDayAttendance({
        userId: '11111111-1111-4111-a111-111111111111',
        marketCode: 'NG',
        deviceId: 'd1111111-1111-4111-b111-111111111111',
        latitude: 6.5244,
        longitude: 3.3792,
        accuracy: 125, // > 100m
        selfieBlob: new Blob(['fake_selfie_bytes'], { type: 'image/jpeg' }),
      });

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('exceeds maximum allowable threshold (100m)');
    });

    it('generates secure time-limited signed URLs for private selfie paths', async () => {
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://supabase.co/storage/v1/object/sign/attendance-selfies/rep-01.jpg?token=abc' },
        error: null,
      });

      vi.spyOn(supabase.storage, 'from').mockReturnValue({
        createSignedUrl: mockCreateSignedUrl,
      } as any);

      const signedUrl = await attendanceService.getSelfieSignedUrl(
        '11111111-1111-4111-a111-111111111111/2026-10-27_selfie_123.jpg'
      );

      expect(signedUrl).toContain('https://supabase.co/storage/v1/object/sign');
      expect(signedUrl).toContain('token=abc');
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        '11111111-1111-4111-a111-111111111111/2026-10-27_selfie_123.jpg',
        300
      );
    });

    it('strips public URLs and preserves private storage integrity', async () => {
      // Data URLs or local blobs are returned directly without calling storage signed URL
      const dataUrl = 'data:image/jpeg;base64,12345';
      const result = await attendanceService.getSelfieSignedUrl(dataUrl);
      expect(result).toBe(dataUrl);
    });

    it('rejects endDayAttendance if an active normal visit exists in public.visits (AT-03)', async () => {
      // Mock existing attendance record as started
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'att-123', status: 'started' },
        error: null,
      });

      // Mock open visit check finding 1 active visit
      const mockVisitsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{ id: 'visit-999' }],
          error: null,
        }),
      };

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'attendance_days') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: mockSingle,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'visits') {
          return mockVisitsQuery as any;
        }
        return {} as any;
      });

      const result = await attendanceService.endDayAttendance({
        attendanceId: 'att-123',
        userId: '11111111-1111-4111-a111-111111111111',
      });

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('active client visit is currently in progress (PRD §6.1 / AT-03)');
    });

    it('rejects duplicate endDayAttendance if status is already ended', async () => {
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'att-123', status: 'ended' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await attendanceService.endDayAttendance({
        attendanceId: 'att-123',
        userId: '11111111-1111-4111-a111-111111111111',
      });

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('Workday has already been ended');
    });

    it('reconciles confirmed attendance and prevents overwriting selfie evidence if already started', async () => {
      const mockUpload = vi.fn();
      vi.spyOn(supabase.storage, 'from').mockReturnValue({
        upload: mockUpload,
      } as any);

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'att-already-started',
                  status: 'started',
                  work_date: getMarketWorkDate('NG'),
                  start_selfie_url: 'rep-id/2026-10-27_confirmed.jpg',
                },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await attendanceService.startDayAttendance({
        userId: '11111111-1111-4111-a111-111111111111',
        marketCode: 'NG',
        deviceId: 'dev-1',
        latitude: 6.5244,
        longitude: 3.3792,
        accuracy: 25,
        selfieBlob: new Blob(['bytes'], { type: 'image/jpeg' }),
      });

      expect(result.data).not.toBeNull();
      expect(result.alreadyStarted).toBe(true);
      expect(result.data?.start_selfie_url).toBe('rep-id/2026-10-27_confirmed.jpg');
      // Storage upload must NEVER be called if attendance is already started
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it('prevents uploading selfie if workday has already ended for today', async () => {
      const mockUpload = vi.fn();
      vi.spyOn(supabase.storage, 'from').mockReturnValue({
        upload: mockUpload,
      } as any);

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'att-ended',
                  status: 'ended',
                  work_date: getMarketWorkDate('NG'),
                },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await attendanceService.startDayAttendance({
        userId: '11111111-1111-4111-a111-111111111111',
        marketCode: 'NG',
        deviceId: 'dev-1',
        latitude: 6.5244,
        longitude: 3.3792,
        accuracy: 25,
        selfieBlob: new Blob(['bytes'], { type: 'image/jpeg' }),
      });

      expect(result.data).not.toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('Workday for today');
      expect(result.error?.message).toContain('has already ended');
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it('uses stable submissionId and prevents overwriting confirmed files (upsert: false)', async () => {
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'rep-id/2026-10-27_sub-stable-123.jpg' },
        error: null,
      });

      vi.spyOn(supabase.storage, 'from').mockReturnValue({
        upload: mockUpload,
      } as any);

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'attendance_days') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'att-new',
                    status: 'started',
                    start_selfie_url: '11111111-1111-4111-a111-111111111111/2026-10-27_sub-stable-123.jpg',
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const result = await attendanceService.startDayAttendance({
        userId: '11111111-1111-4111-a111-111111111111',
        marketCode: 'NG',
        deviceId: 'dev-1',
        latitude: 6.5244,
        longitude: 3.3792,
        accuracy: 25,
        selfieBlob: new Blob(['bytes'], { type: 'image/jpeg' }),
        submissionId: 'sub-stable-123',
      });

      expect(result.data).not.toBeNull();
      expect(result.error).toBeNull();
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('sub-stable-123.jpg'),
        expect.any(Blob),
        expect.objectContaining({ upsert: false })
      );
    });

    it('reuses existing uploaded object on retry of identical submissionId', async () => {
      const mockUpload = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'The resource already exists', statusCode: 409 },
      });

      vi.spyOn(supabase.storage, 'from').mockReturnValue({
        upload: mockUpload,
      } as any);

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'attendance_days') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'att-retried',
                    status: 'started',
                    start_selfie_url: '11111111-1111-4111-a111-111111111111/2026-10-27_sub-retry-999.jpg',
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const result = await attendanceService.startDayAttendance({
        userId: '11111111-1111-4111-a111-111111111111',
        marketCode: 'NG',
        deviceId: 'dev-1',
        latitude: 6.5244,
        longitude: 3.3792,
        accuracy: 25,
        selfieBlob: new Blob(['bytes'], { type: 'image/jpeg' }),
        submissionId: 'sub-retry-999',
      });

      expect(result.data).not.toBeNull();
      expect(result.error).toBeNull();
      expect(result.data?.id).toBe('att-retried');
    });

    it('removes uncommitted selfie on database insert failure to prevent orphan files', async () => {
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'rep-id/2026-10-27_sub-fail-orphan.jpg' },
        error: null,
      });
      const mockRemove = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.spyOn(supabase.storage, 'from').mockReturnValue({
        upload: mockUpload,
        remove: mockRemove,
      } as any);

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'attendance_days') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database connection timeout', code: '08006' },
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const result = await attendanceService.startDayAttendance({
        userId: '11111111-1111-4111-a111-111111111111',
        marketCode: 'NG',
        deviceId: 'dev-1',
        latitude: 6.5244,
        longitude: 3.3792,
        accuracy: 25,
        selfieBlob: new Blob(['bytes'], { type: 'image/jpeg' }),
        submissionId: 'sub-fail-orphan',
      });

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('Failed to record attendance in database');
      // Verify uncommitted selfie cleanup
      expect(mockRemove).toHaveBeenCalledWith([expect.stringContaining('sub-fail-orphan.jpg')]);
    });

    it('reconciles concurrent 23505 conflict by cleaning only its own file and returning confirmed winner', async () => {
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'rep-id/2026-10-27_sub-loser.jpg' },
        error: null,
      });
      const mockRemove = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.spyOn(supabase.storage, 'from').mockReturnValue({
        upload: mockUpload,
        remove: mockRemove,
      } as any);

      let getTodayCallCount = 0;
      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'attendance_days') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockImplementation(() => {
                    getTodayCallCount++;
                    if (getTodayCallCount === 1) {
                      return Promise.resolve({ data: null, error: null });
                    }
                    return Promise.resolve({
                      data: {
                        id: 'winner-record',
                        status: 'started',
                        start_selfie_url: 'rep-id/2026-10-27_sub-winner.jpg',
                      },
                      error: null,
                    });
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: '23505', message: 'duplicate key value violates unique constraint uq_user_work_date' },
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const result = await attendanceService.startDayAttendance({
        userId: '11111111-1111-4111-a111-111111111111',
        marketCode: 'NG',
        deviceId: 'dev-1',
        latitude: 6.5244,
        longitude: 3.3792,
        accuracy: 25,
        selfieBlob: new Blob(['bytes'], { type: 'image/jpeg' }),
        submissionId: 'sub-loser',
      });

      expect(result.data).not.toBeNull();
      expect(result.alreadyStarted).toBe(true);
      expect(result.data?.id).toBe('winner-record');
      // Confirmed winner's file is intact, loser's uncommitted file was cleaned up
      expect(mockRemove).toHaveBeenCalledWith([expect.stringContaining('sub-loser.jpg')]);
    });

    it('fails closed on open-visit query error during endDayAttendance without modifying attendance', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'att-123', status: 'started' },
        error: null,
      });

      const mockVisitsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'connection reset by peer', code: '08006' },
        }),
      };

      const mockUpdate = vi.fn();

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'attendance_days') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: mockSingle,
                }),
              }),
            }),
            update: mockUpdate,
          } as any;
        }
        if (table === 'visits') {
          return mockVisitsQuery as any;
        }
        return {} as any;
      });

      const result = await attendanceService.endDayAttendance({
        attendanceId: 'att-123',
        userId: '11111111-1111-4111-a111-111111111111',
      });

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('Unable to verify active visit status');
      expect(result.error?.message).toContain('End Day has been paused');
      // Crucial: attendance_days update must NEVER be executed when visit check fails
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('allows endDayAttendance to proceed when open-visit query succeeds with zero open visits', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'att-123', status: 'started' },
        error: null,
      });

      const mockVisitsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const mockUpdateSingle = vi.fn().mockResolvedValue({
        data: { id: 'att-123', status: 'ended', ended_at: '2026-10-27T17:00:00Z' },
        error: null,
      });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'attendance_days') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: mockSingle,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: mockUpdateSingle,
                    }),
                  }),
                }),
              }),
            }),
          } as any;
        }
        if (table === 'visits') {
          return mockVisitsQuery as any;
        }
        return {} as any;
      });

      const result = await attendanceService.endDayAttendance({
        attendanceId: 'att-123',
        userId: '11111111-1111-4111-a111-111111111111',
        latitude: 6.5244,
        longitude: 3.3792,
        accuracy: 20,
      });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.status).toBe('ended');
    });
  });

  // =========================================================================
  // 3. Start Day Modal Workflows & Hardware Emulation
  // =========================================================================
  describe('3. Start Day Modal GPS & Camera Workflows', () => {
    it('handles camera permission failure gracefully and displays actionable guidance', async () => {
      // Mock getUserMedia rejection
      const originalMediaDevices = navigator.mediaDevices;
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: {
          getUserMedia: vi.fn().mockRejectedValue({
            name: 'NotAllowedError',
            message: 'Permission denied',
          }),
        },
      });

      render(
        <AuthProvider>
          <FieldSessionProvider>
            <StartDayModal isOpen={true} onClose={vi.fn()} />
          </FieldSessionProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Camera Unavailable/i)).toBeInTheDocument();
        expect(screen.getByText(/Camera permission was denied/i)).toBeInTheDocument();
      });

      // Assert retry button is available
      expect(screen.getByRole('button', { name: /Retry Camera Access/i })).toBeInTheDocument();

      // Restore
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: originalMediaDevices,
      });
    });

    it('handles GPS permission denial and renders retry action', async () => {
      const originalGeolocation = navigator.geolocation;
      Object.defineProperty(navigator, 'geolocation', {
        writable: true,
        value: {
          getCurrentPosition: vi.fn().mockImplementation((_success, error) => {
            error({ code: 1, message: 'User denied Geolocation' });
          }),
        },
      });

      render(
        <AuthProvider>
          <FieldSessionProvider>
            <StartDayModal isOpen={true} onClose={vi.fn()} />
          </FieldSessionProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Location permission denied/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Retry GPS Fix/i })).toBeInTheDocument();
      });

      // Restore
      Object.defineProperty(navigator, 'geolocation', {
        writable: true,
        value: originalGeolocation,
      });
    });
  });

  // =========================================================================
  // 4. End Day Modal & Rule AT-03 Hard Block Verification
  // =========================================================================
  describe('4. End Day Modal & Rule AT-03 Hard Block', () => {
    it('blocks End Day when an active physical visit session is in progress (AT-03)', () => {
      render(
        <AuthProvider>
          <FieldSessionProvider>
            <EndDayModal isOpen={true} onClose={vi.fn()} />
          </FieldSessionProvider>
        </AuthProvider>
      );

      // The initial FieldSessionProvider state has activeVisit: Apex Heavy Logistics
      expect(screen.getByText(/End Day Blocked: Active Visit Open/i)).toBeInTheDocument();
      expect(screen.getByText(/Rule AT-03/i)).toBeInTheDocument();
      expect(screen.getByText(/Apex Heavy Logistics Fleet Depot/i)).toBeInTheDocument();

      // Confirm & End Workday button should NOT be rendered while blocked
      expect(screen.queryByRole('button', { name: /Confirm & End Workday/i })).toBeNull();
    });

    it('allows End Day when active visit is closed or cancelled', async () => {
      const TestConsumer = () => {
        const { cancelVisit } = useFieldSession();
        return (
          <div>
            <button onClick={() => cancelVisit(true)}>Force Cancel Active Visit</button>
            <EndDayModal isOpen={true} onClose={vi.fn()} />
          </div>
        );
      };

      render(
        <AuthProvider>
          <FieldSessionProvider>
            <TestConsumer />
          </FieldSessionProvider>
        </AuthProvider>
      );

      // Initially blocked
      expect(screen.getByText(/End Day Blocked/i)).toBeInTheDocument();

      // Cancel visit
      fireEvent.click(screen.getByText('Force Cancel Active Visit'));

      // Now clear to close
      await waitFor(() => {
        expect(screen.getByText(/All visits closed/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Confirm & End Workday/i })).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // 5. Non-Visit Workday Lifecycle & RPC Governance
  // =========================================================================
  describe('5. Non-Visit Workday Authorization Lifecycle (PRD §2 & §6.1)', () => {
    it('submits non-visit workday request with approved PRD category and justification', async () => {
      const submitSpy = vi.spyOn(attendanceService, 'submitNonVisitRequest').mockResolvedValue({
        requestId: '99999999-9999-4999-a999-999999999999',
        error: null,
      });

      render(
        <AuthProvider>
          <FieldSessionProvider>
            <NonVisitDayModal isOpen={true} onClose={vi.fn()} />
          </FieldSessionProvider>
        </AuthProvider>
      );

      expect(screen.getByText(/PRD §2 & §6.1 Non-Visit Workday/i)).toBeInTheDocument();

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /Submit Request/i }));

      await waitFor(() => {
        expect(submitSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            category: 'proposal_preparation_office',
            justification: expect.stringContaining('Office preparation'),
          })
        );
      });

      expect(screen.getByText(/Request Submitted as Pending/i)).toBeInTheDocument();
      expect(screen.getByText(/credit daily attendance/i)).toBeInTheDocument();
      expect(screen.getByText(/physical-visit targets/i)).toBeInTheDocument();
    });

    it('rejects empty justification for non-visit request', async () => {
      render(
        <AuthProvider>
          <FieldSessionProvider>
            <NonVisitDayModal isOpen={true} onClose={vi.fn()} />
          </FieldSessionProvider>
        </AuthProvider>
      );

      // Clear textarea
      const textarea = screen.getByPlaceholderText(/State the specific client/i);
      fireEvent.change(textarea, { target: { value: '   ' } });

      fireEvent.click(screen.getByRole('button', { name: /Submit Request/i }));

      await waitFor(() => {
        expect(screen.getByText(/A detailed activity justification is required/i)).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // 6. Country Sales Head Attendance Review & Signed Selfie Inspection
  // =========================================================================
  describe('6. Country Sales Head Attendance Review & Signed Selfie Inspection', () => {
    it('renders team attendance roster with Started, Completed, and Non-Visit statuses', async () => {
      render(
        <AuthProvider>
          <TeamAttendanceReview />
        </AuthProvider>
      );

      // Team header and policy banner
      expect(screen.getByText(/Team Attendance & Non-Visit Day Governance/i)).toBeInTheDocument();

      // Sales representatives in market
      expect(screen.getByText('Tunde Adebayo')).toBeInTheDocument();
      expect(screen.getByText('Chinyere Nwosu')).toBeInTheDocument();
      expect(screen.getByText('Emeka Nwosu')).toBeInTheDocument();

      // Status badges
      expect(screen.getAllByText(/Active on Field/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Day Completed/i).length).toBeGreaterThan(0);
    });

    it('opens telemetry inspection modal and displays hardware binding and GPS fix', async () => {
      render(
        <AuthProvider>
          <TeamAttendanceReview />
        </AuthProvider>
      );

      // Click "Inspect Telemetry" on first rep
      const inspectButtons = screen.getAllByRole('button', { name: /Inspect Telemetry/i });
      fireEvent.click(inspectButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Start Day Telemetry Audit/i)).toBeInTheDocument();
        expect(screen.getByText(/Company Handset Binding/i)).toBeInTheDocument();
        expect(screen.getByText(/Live Front-Camera Start Day Selfie/i)).toBeInTheDocument();
      });

      // Close modal
      fireEvent.click(screen.getByRole('button', { name: /Close Telemetry Inspection/i }));
    });

    it('processes non-visit approval with attendance credit and zero physical visits note', async () => {
      render(
        <AuthProvider>
          <TeamAttendanceReview />
        </AuthProvider>
      );

      const approveButton = screen.getByRole('button', { name: /Approve Non-Visit Day/i });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Counts toward attendance; does NOT count toward physical visit targets/i)
        ).toBeInTheDocument();
      });
    });
  });
});
