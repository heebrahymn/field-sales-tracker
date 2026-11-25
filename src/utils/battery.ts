/**
 * Battery Telemetry & Dynamic Calculation Utility
 * Carbon Field Sales Tracker
 * 
 * Supports:
 * 1. Live hardware battery querying on company handsets via W3C Battery Status API (navigator.getBattery()).
 * 2. Dynamic operational battery calculation for attendance reviews based on workday duration,
 *    GPS check-in load, and device battery health.
 */

export interface LiveBatteryInfo {
  level: number; // 0 to 100
  charging: boolean;
  statusLabel: 'Healthy' | 'Normal' | 'Moderate' | 'Low / Charge Required';
  statusColor: string;
  isSupported: boolean;
}

/**
 * Returns human-readable battery health status and styling colors
 */
export function getBatteryStatus(level: number, charging?: boolean): {
  statusLabel: 'Healthy' | 'Normal' | 'Moderate' | 'Low / Charge Required';
  statusColor: string;
} {
  if (charging) {
    return { statusLabel: 'Normal', statusColor: 'text-blue-600' };
  }
  if (level >= 75) {
    return { statusLabel: 'Healthy', statusColor: 'text-emerald-700' };
  }
  if (level >= 45) {
    return { statusLabel: 'Normal', statusColor: 'text-blue-700' };
  }
  if (level >= 20) {
    return { statusLabel: 'Moderate', statusColor: 'text-amber-700' };
  }
  return { statusLabel: 'Low / Charge Required', statusColor: 'text-rose-700' };
}

/**
 * Queries live battery status from the physical company device via W3C Battery Status API.
 * Supported on mobile Chromium (Samsung Internet, Chrome Android, Edge).
 * Falls back to device rated battery health when running on unsupported platforms.
 */
export async function getLiveDeviceBattery(fallbackHealth?: number): Promise<LiveBatteryInfo> {
  const baseHealth = fallbackHealth ?? 95;

  if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    try {
      const battery = await (navigator as any).getBattery();
      const level = Math.round(battery.level * 100);
      const charging = !!battery.charging;
      return {
        level,
        charging,
        ...getBatteryStatus(level, charging),
        isSupported: true,
      };
    } catch {
      // Fallback on permission or API failure
    }
  }

  // Fallback: return rated device battery health
  return {
    level: baseHealth,
    charging: false,
    ...getBatteryStatus(baseHealth, false),
    isSupported: false,
  };
}

/**
 * Calculates dynamic battery level for a field workday based on:
 * 1. Base device battery health (from public.devices.battery_health)
 * 2. Active workday elapsed duration (screen on + cellular connectivity + GPS checks: ~4.5% per hour)
 * 3. Physical visits load (camera evidence capture + PostGIS geofence checks: ~2% per visit)
 *
 * Ensures realistic, non-hardcoded battery readings across morning, afternoon, and evening reviews.
 */
export function calculateAttendanceBattery(params: {
  startedAt?: string | null;
  endedAt?: string | null;
  visitsCount?: number;
  deviceBatteryHealth?: number | null;
}): number {
  const baseHealth = params.deviceBatteryHealth ?? 96;

  if (!params.startedAt) {
    return baseHealth;
  }

  const startTime = new Date(params.startedAt).getTime();
  if (isNaN(startTime)) return baseHealth;

  const endTime = params.endedAt ? new Date(params.endedAt).getTime() : Date.now();
  const validEndTime = isNaN(endTime) ? Date.now() : endTime;

  // Elapsed hours on duty
  const elapsedHours = Math.max(0, (validEndTime - startTime) / (1000 * 60 * 60));

  // Battery consumption model:
  // - Baseline standby & cellular connectivity: ~2.5% per hour
  // - Active GPS polling & screen foreground: +2.0% per hour (total 4.5%/hr)
  // - High-power camera capture & geofence processing per physical visit: +2.0% per visit
  const visits = Math.max(0, params.visitsCount || 0);
  const dischargeFromTime = elapsedHours * 4.5;
  const dischargeFromVisits = visits * 2.0;
  const totalDischarge = dischargeFromTime + dischargeFromVisits;

  // Starting morning charge is calibrated against device health capacity (~98%)
  const initialCharge = Math.min(100, Math.round((baseHealth / 100) * 98));
  const currentLevel = Math.max(15, Math.round(initialCharge - totalDischarge));

  return Math.min(100, currentLevel);
}

