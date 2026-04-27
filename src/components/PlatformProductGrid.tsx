import { useNavigate } from 'react-router-dom';
import type { ProductWithStock } from '../types';
import { ProductLogo } from './ProductLogo';
import { ProductRegionBadge } from './ProductRegionBadge';

type Props = {
  products: ProductWithStock[];
  loading: boolean;
  emptyMessage?: string;
};

export function PlatformProductGrid({
  products,
  loading,
  emptyMessage = 'لا توجد منتجات متاحة حالياً لهذه المنصة.',
}: Props) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-4">
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-card animate-pulse border border-white/10" />
          ))}
        </div>
      ) : products.length > 0 ? (
        products.map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => product.stock_count > 0 && navigate(`/purchase/${product.id}`)}
            disabled={product.stock_count === 0}
            className={`group relative overflow-hidden rounded-card border transition-all duration-300 ${
              product.stock_count > 0
                ? 'bg-card border-white/10 hover:border-cyan-500/30 hover:bg-cardHover active:scale-[0.99]'
                : 'bg-black/40 border-red-900/20 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="relative p-5 flex items-center justify-between gap-4">
              <div className="flex-shrink-0 text-left">
                <div className="text-2xl font-black text-white group-hover:text-cyan-400 transition-colors">
                  {product.price_mru}
                </div>
                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">MRU</div>
              </div>

              <div className="flex-1 text-center">
                <div className="text-lg font-bold text-gray-200 group-hover:text-white transition-colors mb-1">
                  {product.name}
                </div>
                <div className="flex justify-center mb-1.5">
                  <ProductRegionBadge region={product.product_region} />
                </div>
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold ${
                    product.stock_count > 0
                      ? 'bg-green-500/10 text-green-400 border border-green-500/25'
                      : 'bg-red-500/10 text-red-400 border border-red-500/25'
                  }`}
                >
                  {product.stock_count > 0 ? 'Available' : 'Out of Stock'}
                </div>
              </div>

              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-gray-900 rounded-xl border border-white/5 flex items-center justify-center overflow-hidden p-2">
                  <ProductLogo
                    logoUrl={product.product_logo_url ?? product.logo_url}
                    name={product.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>
          </button>
        ))
      ) : (
        <div className="text-center py-16 sm:py-20 bg-white/5 rounded-card-lg border border-dashed border-white/10">
          <p className="text-caption text-gray-500">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
