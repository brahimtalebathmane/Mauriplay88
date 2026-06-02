import type { Platform } from '../types';

export interface PlatformStorefrontStats {
  total_stock: number;
  has_products: boolean;
}

type Props = {
  platform: Platform & PlatformStorefrontStats;
  onSelect: (platformId: string) => void;
};

export function PlatformStorefrontCard({ platform, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(platform.id)}
      className="platform-card-rtl group flex w-full min-w-0 flex-col cursor-pointer active:scale-95 transition-colors text-right"
    >
      <div className="relative aspect-[3/4] w-full rounded-card overflow-hidden border border-white/10 bg-gradient-to-b from-gray-900 to-black group-hover:border-cyan-500/30 transition-all shadow-card group-hover:shadow-card-hover">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />

        <img
          src={platform.logo_url}
          alt={platform.name}
          className="w-full h-full object-contain p-6 group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/icon-72.png';
          }}
        />

        {platform.total_stock > 0 && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-green-500/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-white uppercase tracking-wide">متوفر</span>
          </div>
        )}

        {platform.total_stock === 0 && platform.has_products && (
          <div className="absolute top-3 left-3 z-20 bg-red-500/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <span className="text-[10px] font-black text-white uppercase tracking-wide">نفذت الكمية</span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
          <div className="text-center">
            <h3 className="text-white font-black text-base drop-shadow-lg">{platform.name}</h3>
          </div>
        </div>
      </div>
    </button>
  );
}
