import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  calculateAttendanceBattery,
  getBatteryStatus,
  getLiveDeviceBattery,
} from '@/utils/battery';

describe('Battery Telemetry & Calculation Utility', () => {
  describe('getBatteryStatus', () => {
    it('returns Normal when charging regardless of percentage', () => {
      const status = getBatteryStatus(15, true);
      expect(status.statusLabel).toBe('Normal');
      expect(status.statusColor).toBe('text-blue-600');
    });

    it('returns Healthy for >= 75%', () => {
      const status = getBatteryStatus(88);
      expect(status.statusLabel).toBe('Healthy');
      expect(status.statusColor).toBe('text-emerald-700');
    });

    it('returns Normal for 45% - 74%', () => {
      const status = getBatteryStatus(60);
      expect(status.statusLabel).toBe('Normal');
      expect(status.statusColor).toBe('text-blue-700');
    });

    it('returns Moderate for 20% - 44%', () => {
      const status = getBatteryStatus(35);
      expect(status.statusLabel).toBe('Moderate');
      expect(status.statusColor).toBe('text-amber-700');
    });

    it('returns Low / Charge Required for < 20%', () => {
      const status = getBatteryStatus(12);
      expect(status.statusLabel).toBe('Low / Charge Required');
      expect(status.statusColor).toBe('text-rose-700');
    });
  });

  describe('calculateAttendanceBattery', () => {
    it('returns device rated health when workday has not started', () => {
      const battery = calculateAttendanceBattery({
        startedAt: null,
        deviceBatteryHealth: 92,
      });
      expect(battery).toBe(92);
    });

    it('defaults to 96 when deviceBatteryHealth is omitted', () => {
      const battery = calculateAttendanceBattery({
        startedAt: null,
      });
      expect(battery).toBe(96);
    });

    it('calculates realistic discharge based on elapsed time and visits', () => {
      const startedAt = '2026-11-02T08:00:00.000Z';
      const endedAt = '2026-11-02T13:00:00.000Z'; // 5 hours later
      const visitsCount = 4; // 4 visits

      // Base health 95 -> initial morning calibrated charge 93%
      // 5 hours * 4.5% = 22.5%
      // 4 visits * 2.0% = 8.0%
      // Total drain = 30.5% => 93 - 30.5 = 62.5 => 63%
      const battery = calculateAttendanceBattery({
        startedAt,
        endedAt,
        visitsCount,
        deviceBatteryHealth: 95,
      });

      expect(battery).toBe(63);
    });

    it('never drops below 15% reserve floor in simulated calculation', () => {
      const startedAt = '2026-11-01T00:00:00.000Z';
      const endedAt = '2026-11-02T23:59:59.000Z'; // 48 hours later
      const battery = calculateAttendanceBattery({
        startedAt,
        endedAt,
        visitsCount: 50,
        deviceBatteryHealth: 50,
      });
      expect(battery).toBe(15);
    });
  });

  describe('getLiveDeviceBattery', () => {
    const originalNavigator = globalThis.navigator;

    afterEach(() => {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        writable: true,
      });
    });

    it('uses navigator.getBattery when available on physical handset', async () => {
      const mockGetBattery = vi.fn().mockResolvedValue({
        level: 0.72,
        charging: false,
      });

      Object.defineProperty(globalThis, 'navigator', {
        value: {
          getBattery: mockGetBattery,
        },
        writable: true,
      });

      const result = await getLiveDeviceBattery(90);
      expect(result.level).toBe(72);
      expect(result.charging).toBe(false);
      expect(result.statusLabel).toBe('Normal');
      expect(result.isSupported).toBe(true);
    });

    it('falls back gracefully to device rated health when Battery API is absent', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
      });

      const result = await getLiveDeviceBattery(89);
      expect(result.level).toBe(89);
      expect(result.charging).toBe(false);
      expect(result.statusLabel).toBe('Healthy');
      expect(result.isSupported).toBe(false);
    });
  });
});
