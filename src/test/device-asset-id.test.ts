import { describe, it, expect } from 'vitest';
import { generateCompanyAssetId, MARKET_COUNTRY_CODES } from '@/utils/deviceUtils';

describe('generateCompanyAssetId Utility', () => {
  it('correctly maps market codes to country abbreviations', () => {
    expect(MARKET_COUNTRY_CODES.NG).toBe('NG');
    expect(MARKET_COUNTRY_CODES.ZM).toBe('ZM');
    expect(MARKET_COUNTRY_CODES.MW).toBe('MW');
  });

  it('generates CP-DEV-NG-01 when fleet is empty for NG', () => {
    const id = generateCompanyAssetId('NG', []);
    expect(id).toBe('CP-DEV-NG-01');
  });

  it('generates CP-DEV-ZM-01 when fleet is empty for ZM', () => {
    const id = generateCompanyAssetId('ZM', []);
    expect(id).toBe('CP-DEV-ZM-01');
  });

  it('generates CP-DEV-MW-01 when fleet is empty for MW', () => {
    const id = generateCompanyAssetId('MW', []);
    expect(id).toBe('CP-DEV-MW-01');
  });

  it('increments sequence based on existing devices in CP-DEV-NG- format', () => {
    const existing = [
      { assetId: 'CP-DEV-NG-01' },
      { assetId: 'CP-DEV-NG-02' },
      { assetId: 'CP-DEV-NG-09' },
    ];
    const id = generateCompanyAssetId('NG', existing);
    expect(id).toBe('CP-DEV-NG-10');
  });

  it('avoids colliding with existing tags even if sequence has gaps or alternate casings', () => {
    const existing = [
      { assetId: 'cp-dev-ng-01' },
      { assetId: 'CP-DEV-NG-02' },
    ];
    const id = generateCompanyAssetId('NG', existing);
    expect(id).toBe('CP-DEV-NG-03');
  });

  it('supports offset to regenerate alternative asset IDs', () => {
    const existing = [{ assetId: 'CP-DEV-NG-01' }];
    const id1 = generateCompanyAssetId('NG', existing, 0);
    const id2 = generateCompanyAssetId('NG', existing, 1);
    const id3 = generateCompanyAssetId('NG', existing, 2);
    expect(id1).toBe('CP-DEV-NG-02');
    expect(id2).toBe('CP-DEV-NG-03');
    expect(id3).toBe('CP-DEV-NG-04');
  });

  it('does not interfere across markets', () => {
    const existing = [
      { assetId: 'CP-DEV-NG-15' },
      { assetId: 'CP-DEV-ZM-01' },
    ];
    // NG should advance based on 15
    expect(generateCompanyAssetId('NG', existing)).toBe('CP-DEV-NG-16');
    // ZM should advance based on 1
    expect(generateCompanyAssetId('ZM', existing)).toBe('CP-DEV-ZM-02');
    // MW has none, starts at 01
    expect(generateCompanyAssetId('MW', existing)).toBe('CP-DEV-MW-01');
  });
});
