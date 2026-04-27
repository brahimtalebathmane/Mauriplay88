import { PRODUCT_REGION_CODES } from '../constants/productRegions';

/** URL segment for products with no `product_region` when the platform uses regional grouping. */
export const PLATFORM_SHOP_GENERAL = 'general';

export function shopUrlForRegion(platformId: string, region: string | null | undefined): string {
  if (region == null || String(region).trim() === '') {
    return `/platform/${platformId}/shop/${PLATFORM_SHOP_GENERAL}`;
  }
  return `/platform/${platformId}/shop/${encodeURIComponent(String(region).trim())}`;
}

export type ShopRegionFilter =
  | { kind: 'general' }
  | { kind: 'assigned'; region: string };

/** Parses `:regionKey` from the shop route into a filter for `product_region`. */
export function parseShopRegionKey(regionKey: string | undefined): ShopRegionFilter | null {
  if (!regionKey || regionKey.trim() === '') return null;
  const decoded = (() => {
    try {
      return decodeURIComponent(regionKey);
    } catch {
      return regionKey;
    }
  })();
  if (decoded === PLATFORM_SHOP_GENERAL) return { kind: 'general' };
  return { kind: 'assigned', region: decoded };
}

export function sortAssignedRegionCodes(regions: string[]): string[] {
  const order = PRODUCT_REGION_CODES as readonly string[];
  return [...new Set(regions)].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, 'ar');
  });
}
