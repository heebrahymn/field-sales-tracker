import { describe, it, expect, vi, beforeEach } from 'vitest';
import { managementService } from '@/services/managementService';

// Mock supabase
vi.mock('@/lib/supabaseClient', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-uuid-1' } } }),
      },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  };
});

describe('managementService.exportCountryVisitsCsv filtering', () => {
  const mockVisits = [
    {
      id: 'visit-1',
      marketCode: 'NG',
      repId: 'rep-uuid-1',
      repName: 'Tunde Adebayo',
      organisationName: 'Dangote Flour Mills',
      branchName: 'Apapa Depot',
      branchAddress: '12 Wharf Rd, Lagos',
      workDate: '2026-10-20',
      checkInAt: '2026-10-20T08:30:00Z',
      checkOutAt: '2026-10-20T09:15:00Z',
      durationMinutes: 45,
      verificationStatus: 'location_verified',
      checkInAccuracyM: 12,
      distanceMeters: 40,
      premisesPhotoPath: 'photo1.jpg',
      capturedOffline: false,
      meetingLog: {
        visitPurpose: 'routine_visit',
        contactName: 'Alhaji Musa',
        contactRole: 'Procurement Officer',
        productsDiscussed: ['Heavy Duty Coolant'],
        outcomeNarrative: 'Requested bulk quote',
        nextStepText: 'Deliver samples next week',
      },
      clientAuditStatus: null,
    },
    {
      id: 'visit-2',
      marketCode: 'NG',
      repId: 'rep-uuid-2',
      repName: 'Chinyere Nwosu',
      organisationName: 'Flour Mills of Nigeria',
      branchName: 'Iganmu Terminal',
      branchAddress: 'Old Wharf Rd, Lagos',
      workDate: '2026-10-10',
      checkInAt: '2026-10-10T10:00:00Z',
      checkOutAt: '2026-10-10T10:45:00Z',
      durationMinutes: 45,
      verificationStatus: 'manager_approved_unverified',
      checkInAccuracyM: 25,
      distanceMeters: null,
      premisesPhotoPath: null,
      capturedOffline: true,
      meetingLog: null,
      clientAuditStatus: null,
    },
  ];

  beforeEach(() => {
    vi.spyOn(managementService, 'getCountryVisits').mockResolvedValue({
      data: mockVisits as any,
      error: null,
    });
    // Mock DOM download functions
    vi.spyOn(document, 'createElement').mockReturnValue({
      setAttribute: vi.fn(),
      click: vi.fn(),
    } as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(vi.fn());
    vi.spyOn(document.body, 'removeChild').mockImplementation(vi.fn());
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
  });

  it('filters by repId matching UUID', async () => {
    const result = await managementService.exportCountryVisitsCsv({
      marketCode: 'NG',
      repId: 'rep-uuid-1',
    });

    expect(result.rowCount).toBe(1);
    expect(result.error).toBeNull();
  });

  it('filters by repName when repId is a name or contains salesperson name', async () => {
    const result = await managementService.exportCountryVisitsCsv({
      marketCode: 'NG',
      repId: 'Tunde Adebayo',
    });

    expect(result.rowCount).toBe(1);
    expect(result.error).toBeNull();
  });

  it('filters by custom date range', async () => {
    const result = await managementService.exportCountryVisitsCsv({
      marketCode: 'NG',
      dateRange: 'custom',
      startDate: '2026-10-15',
      endDate: '2026-10-25',
    });

    // Only visit-1 (2026-10-20) falls in 10-15 to 10-25; visit-2 is 2026-10-10
    expect(result.rowCount).toBe(1);
  });

  it('excludes unverified exceptions when includeUnverifiedExceptions is false', async () => {
    const result = await managementService.exportCountryVisitsCsv({
      marketCode: 'NG',
      includeUnverifiedExceptions: false,
    });

    // visit-2 has verificationStatus 'manager_approved_unverified', should be excluded
    expect(result.rowCount).toBe(1);
  });
});

