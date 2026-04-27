import { getProductRegionFlag, isProductRegionCode } from '../constants/productRegions';

type Props = {
  region: string | null | undefined;
  className?: string;
};

export function ProductRegionBadge({ region, className = '' }: Props) {
  if (!region || !isProductRegionCode(region)) return null;
  const flag = getProductRegionFlag(region);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-200 ${className}`}
      title={region}
    >
      {flag ? <span className="text-sm leading-none" aria-hidden>{flag}</span> : null}
      <span>{region}</span>
    </span>
  );
}
