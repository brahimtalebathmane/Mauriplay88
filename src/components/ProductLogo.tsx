import { FALLBACK_IMAGE } from '../constants';

export interface ProductLogoProps {
  /** Product logo URL (or legacy logo_url). When missing or on error, shows default placeholder. */
  logoUrl?: string | null;
  /** Product name for alt text and accessibility */
  name?: string;
  /** Class for the img element (e.g. object-contain, p-2, w-full h-full) */
  className?: string;
}

/**
 * Displays a product logo with a default placeholder when URL is missing or fails to load.
 * Use everywhere products are shown so no numeric/letter placeholders appear.
 */
export function ProductLogo({ logoUrl, name = '', className = 'w-full h-full object-contain' }: ProductLogoProps) {
  const src = logoUrl && logoUrl.trim() !== '' ? logoUrl : FALLBACK_IMAGE;

  return (
    <img
      src={src}
      alt={name ? `شعار ${name}` : 'شعار المنتج'}
      className={className}
      onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
      loading="lazy"
      decoding="async"
    />
  );
}
