import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';

const mockDeviceUpdates: Array<{ table: string; payload: any; filterCol?: string; filterVal?: any }> = [];

vi.mock('../lib/supabase', () => {
  const createBuilder = (table: string) => {
    let pendingUpdate: any = null;
    const filters: Record<string, any> = {};
    const builder: any = {
      select: () => builder,
      eq: (col: string, val: any) => {
        filters[col] = val;
        if (pendingUpdate) {
          mockDeviceUpdates.push({ table, payload: pendingUpdate, filterCol: col, filterVal: val });
        }
        return builder;
      },
      in: () => builder,
      or: () => builder,
      order: () => builder,
      limit: () => builder,
      insert: () => Promise.resolve({ data: null, error: null }),
      update: (payload: any) => {
        pendingUpdate = payload;
        return builder;
      },
      maybeSingle: () => {
        if (table === 'device_assignments' && filters.salesperson_id === 'rep-with-old-phone') {
          return Promise.resolve({
            data: { id: 'assign-old-1', device_id: 'dev-superseded-old' },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      },
      single: () => {
        if (table === 'profiles') {
          return Promise.resolve({
            data: {
              id: 'rep-with-old-phone',
              full_name: 'Tunde Adebayo',
              role: 'salesperson',
              market_code: 'NG',
              is_active: true,
            },
            error: null,
          });
        }
        if (table === 'devices') {
          if (filters.id === 'dev-returned-uninspected') {
            return Promise.resolve({
              data: {
                id: 'dev-returned-uninspected',
                asset_tag: 'CAR-NG-RET-01',
                make: 'Samsung',
                model: 'Galaxy A15',
                market_code: 'NG',
                inventory_status: 'returned',
              },
              error: null,
            });
          }
          if (filters.id === 'dev-pending-inspection') {
            return Promise.resolve({
              data: {
                id: 'dev-pending-inspection',
                asset_tag: 'CAR-NG-PI-01',
                make: 'Samsung',
                model: 'Galaxy A15',
                market_code: 'NG',
                inventory_status: 'pending_inspection',
              },
              error: null,
            });
          }
          return Promise.resolve({
            data: {
              id: 'dev-new-target',
              asset_tag: 'CAR-NG-NEW-01',
              make: 'Samsung',
              model: 'Galaxy A15',
              market_code: 'NG',
              inventory_status: 'available',
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      },
      then: (resolve: any) => {
        if (table === 'device_assignments' && filters.salesperson_id === 'deactivated-rep-id' && !pendingUpdate) {
          return resolve({
            data: [{ id: 'assign-deact-1', device_id: 'dev-deactivated-rep' }],
            error: null,
          });
        }
        return resolve({ data: [], error: null });
      },
    };
    return builder;
  };

  return {
    supabase: {
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: 'hq-admin-uuid' } }, error: null }),
        getSession: () => Promise.resolve({ data: { session: { user: { id: 'hq-admin-uuid' } } }, error: null }),
      },
      from: (table: string) => createBuilder(table),
      rpc: () => Promise.resolve({ data: null, error: null }),
    },
  };
});

import { adminService } from '../services/adminService';
import { DeviceReplacementProvider, useDeviceReplacement } from '../context/DeviceReplacementContext';

describe('RC 1.0.0 Device Custody & Lifecycle Distinction Verification', () => {
  beforeEach(() => {
    mockDeviceUpdates.length = 0;
  });

  it('marks superseded device as pending_inspection + quarantined (never returned) in adminService.reassignDevice', async () => {
    const res = await adminService.reassignDevice(
      'dev-new-target',
      'rep-with-old-phone',
      'Territory handover superseding prior phone'
    );

    expect(res.success).toBe(true);

    const supersededUpdate = mockDeviceUpdates.find(
      (u) => u.table === 'devices' && u.filterCol === 'id' && u.filterVal === 'dev-superseded-old'
    );
    expect(supersededUpdate).toBeDefined();
    expect(supersededUpdate?.payload.inventory_status).toBe('pending_inspection');
    expect(supersededUpdate?.payload.security_authorization).toBe('quarantined');
    expect(supersededUpdate?.payload.inventory_status).not.toBe('returned');
  });

  it('marks deactivated employee device as pending_inspection + revoked (never available) in adminService.updateUserProfile', async () => {
    const res = await adminService.updateUserProfile('deactivated-rep-id', { is_active: false });
    expect(res.success).toBe(true);

    const deactivatedDevUpdate = mockDeviceUpdates.find(
      (u) => u.table === 'devices' && u.filterCol === 'id' && u.filterVal === 'dev-deactivated-rep'
    );
    expect(deactivatedDevUpdate).toBeDefined();
    expect(deactivatedDevUpdate?.payload.inventory_status).toBe('pending_inspection');
    expect(deactivatedDevUpdate?.payload.security_authorization).toBe('revoked');
    expect(deactivatedDevUpdate?.payload.inventory_status).not.toBe('available');
  });

  it('keeps pending_inspection, returned (actual depot receipt), and available distinct during assignment', async () => {
    const returnedAttempt = await adminService.assignDevice('dev-returned-uninspected', 'unassigned-rep-1');
    expect(returnedAttempt.success).toBe(false);
    expect(returnedAttempt.error?.message).toContain('Status: returned');

    const pendingInspectAttempt = await adminService.assignDevice('dev-pending-inspection', 'unassigned-rep-1');
    expect(pendingInspectAttempt.success).toBe(false);
    expect(pendingInspectAttempt.error?.message).toContain('Status: pending_inspection');
  });

  it('enforces distinct Pending Inspection, Returned, and Available states in DeviceReplacementContext', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DeviceReplacementProvider>{children}</DeviceReplacementProvider>
    );
    const { result } = renderHook(() => useDeviceReplacement(), { wrapper });

    act(() => {
      result.current.registerDevice({
        assetId: 'CC-NG-CUST-A',
        make: 'Samsung',
        model: 'Galaxy A15',
        serialNumber: 'SN-CUST-A',
        marketCode: 'NG',
        initialStatus: 'Available',
      });
      result.current.registerDevice({
        assetId: 'CC-NG-CUST-B',
        make: 'Samsung',
        model: 'Galaxy A15',
        serialNumber: 'SN-CUST-B',
        marketCode: 'NG',
        initialStatus: 'Available',
      });
    });

    // Assign Handset A to rep
    act(() => {
      const assignA = result.current.assignDevice('CC-NG-CUST-A', 'rep-1', 'Tunde Adebayo', 'Initial issue');
      expect(assignA.success).toBe(true);
    });

    // Supersede Handset A by assigning Handset B -> Handset A must be Pending Inspection (not Returned)
    act(() => {
      const assignB = result.current.assignDevice('CC-NG-CUST-B', 'rep-1', 'Tunde Adebayo', 'Upgrade', true);
      expect(assignB.success).toBe(true);
    });

    const devAAfterSupersede = result.current.devices.find((d) => d.assetId === 'CC-NG-CUST-A');
    expect(devAAfterSupersede?.inventoryStatus).toBe('Pending Inspection');
    expect(devAAfterSupersede?.securityAuthorization).toBe('Quarantined');
    expect(result.current.spareInventory.some((s) => s.assetId === 'CC-NG-CUST-A')).toBe(false);

    // Record actual physical depot receipt -> Returned (still distinct from Available; cannot be assigned yet)
    act(() => {
      result.current.updateDeviceLifecycleStatus(
        'CC-NG-CUST-A',
        'Returned',
        'Physically received at Lagos IT Depot'
      );
    });

    const devAAfterReceipt = result.current.devices.find((d) => d.assetId === 'CC-NG-CUST-A');
    expect(devAAfterReceipt?.inventoryStatus).toBe('Returned');
    expect(result.current.spareInventory.some((s) => s.assetId === 'CC-NG-CUST-A')).toBe(false);

    act(() => {
      const prematureAssign = result.current.assignDevice('CC-NG-CUST-A', 'rep-2', 'Kayode Williams');
      expect(prematureAssign.success).toBe(false);
    });

    // IT Depot completes diagnostic & wipe -> transitions to Available -> now assignable
    act(() => {
      result.current.updateDeviceLifecycleStatus(
        'CC-NG-CUST-A',
        'Available',
        'IT hardware diagnostic passed and Knox wipe verified'
      );
    });

    expect(result.current.spareInventory.some((s) => s.assetId === 'CC-NG-CUST-A')).toBe(true);

    act(() => {
      const clearedAssign = result.current.assignDevice('CC-NG-CUST-A', 'rep-2', 'Kayode Williams');
      expect(clearedAssign.success).toBe(true);
    });
  });
});
