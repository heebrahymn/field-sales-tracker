import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { attendanceService } from '@/services/attendanceService';
import { supabase } from '@/lib/supabase';

describe('Non-Visit Workday Cancellation Unit & Integration Tests', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fails with error if requestId is empty', async () => {
    const res = await attendanceService.cancelAbsenceRequest('');
    expect(res.error).toBeDefined();
    expect(res.error?.message).toContain('Request ID is required');
  });

  it('succeeds gracefully for optimistic local non-visit requests (prefixed with nvd-)', async () => {
    const res = await attendanceService.cancelAbsenceRequest('nvd-1730730000000');
    expect(res.error).toBeNull();
  });

  it('fails with error if user is not signed in', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValueOnce({
      data: { session: null },
      error: null,
    } as any);

    const res = await attendanceService.cancelAbsenceRequest('5d77c0f2-0f91-49d3-b271-72a1ecd3f698');
    expect(res.error).toBeDefined();
    expect(res.error?.message).toContain('You must be signed in');
  });

  it('calls /api/attendance/cancel-non-visit with Bearer token and returns error=null on success', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'mock-valid-jwt-token',
        },
      },
      error: null,
    } as any);

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: 'Non-visit workday request cancelled successfully',
      }),
    });
    global.fetch = mockFetch;

    const testId = '5d77c0f2-0f91-49d3-b271-72a1ecd3f698';
    const res = await attendanceService.cancelAbsenceRequest(testId, 'NG');

    expect(res.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/attendance/cancel-non-visit',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-valid-jwt-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ requestId: testId }),
      })
    );
  });

  it('propagates error message if endpoint returns 403 Forbidden', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'mock-valid-jwt-token',
        },
      },
      error: null,
    } as any);

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({
        error: 'Forbidden: You do not have permission to cancel this request.',
      }),
    });

    const res = await attendanceService.cancelAbsenceRequest('other-rep-request-id');
    expect(res.error).toBeDefined();
    expect(res.error?.message).toBe('Forbidden: You do not have permission to cancel this request.');
  });
});

