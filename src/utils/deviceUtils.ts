import { MarketCode } from '@/context/AuthContext';

export interface MinimalDeviceTag {
  assetId?: string;
  assetTag?: string;
}

/**
 * Country identifiers mapped to market codes:
 * - NG (Nigeria) -> CP-DEV-NG-##
 * - ZM (Zambia)  -> CP-DEV-ZM-##
 * - MW (Malawi)  -> CP-DEV-MW-##
 */
export const MARKET_COUNTRY_CODES: Record<MarketCode, string> = {
  NG: 'NG',
  ZM: 'ZM',
  MW: 'MW',
};

/**
 * Generates the next sequential unique Company Asset ID based on country market code and existing device inventory.
 * Guarantees zero duplicates across the fleet.
 *
 * Format: CP-DEV-NG-01, CP-DEV-ZM-01, CP-DEV-MW-01
 *
 * @param marketCode Country market code ('NG' | 'ZM' | 'MW')
 * @param existingDevices Array of existing devices to detect sequence and prevent duplicates
 * @param offset Optional offset for regenerating subsequent alternatives
 * @returns Formatted asset ID, e.g. "CP-DEV-NG-01"
 */
export function generateCompanyAssetId(
  marketCode: MarketCode,
  existingDevices: MinimalDeviceTag[] = [],
  offset: number = 0
): string {
  const countryCode = MARKET_COUNTRY_CODES[marketCode] || marketCode || 'NG';
  const prefix = `CP-DEV-${countryCode}-`;

  const existingUpper = new Set<string>();
  for (const d of existingDevices) {
    if (d.assetId) existingUpper.add(d.assetId.trim().toUpperCase());
    if (d.assetTag) existingUpper.add(d.assetTag.trim().toUpperCase());
  }

  // Scan existing tags with matching prefix to locate highest sequence number
  let maxSeq = 0;
  for (const tag of existingUpper) {
    if (tag.startsWith(prefix)) {
      const remainder = tag.slice(prefix.length);
      // Match leading numeric digits (e.g. "01", "02", "12")
      const match = remainder.match(/^(\d+)/);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed) && parsed > maxSeq) {
          maxSeq = parsed;
        }
      }
    }
  }

  // Calculate candidate number (starts at 01)
  let candidateNum = Math.max(1, maxSeq + 1 + Math.max(0, offset));
  let candidate = `${prefix}${String(candidateNum).padStart(2, '0')}`;

  // Advance sequence until a non-colliding ID is found
  while (existingUpper.has(candidate)) {
    candidateNum++;
    candidate = `${prefix}${String(candidateNum).padStart(2, '0')}`;
  }

  return candidate;
}
