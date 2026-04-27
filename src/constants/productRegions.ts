/** Stored DB / API values (must match CHECK constraint and admin RPC whitelist). */
export const PRODUCT_REGION_CODES = [
  'USA',
  'KSA',
  'UAE',
  'Kuwait',
  'UK',
  'Qatar',
  'Oman',
  'Bahrain',
  'Canada',
  'Australia',
  'Turkey',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Japan',
  'India',
] as const;

export type ProductRegionCode = (typeof PRODUCT_REGION_CODES)[number];

const FLAG_BY_CODE: Record<ProductRegionCode, string> = {
  USA: '🇺🇸',
  KSA: '🇸🇦',
  UAE: '🇦🇪',
  Kuwait: '🇰🇼',
  UK: '🇬🇧',
  Qatar: '🇶🇦',
  Oman: '🇴🇲',
  Bahrain: '🇧🇭',
  Canada: '🇨🇦',
  Australia: '🇦🇺',
  Turkey: '🇹🇷',
  Germany: '🇩🇪',
  France: '🇫🇷',
  Spain: '🇪🇸',
  Italy: '🇮🇹',
  Japan: '🇯🇵',
  India: '🇮🇳',
};

export function isProductRegionCode(value: string | null | undefined): value is ProductRegionCode {
  return value != null && (PRODUCT_REGION_CODES as readonly string[]).includes(value);
}

export function getProductRegionFlag(code: string | null | undefined): string | null {
  if (!code || !isProductRegionCode(code)) return null;
  return FLAG_BY_CODE[code] ?? null;
}
