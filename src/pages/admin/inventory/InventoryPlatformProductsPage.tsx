import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { useStore } from '../../../store/useStore';
import type { Platform, Product } from '../../../types';
import { ProductLogo } from '../../../components/ProductLogo';
import { ProductRegionBadge } from '../../../components/ProductRegionBadge';
import { Loader2, ChevronLeft, Hash } from 'lucide-react';
import type { AdminInventoryRow } from './inventoryHelpers';

type ProductWithPlatform = Product & { platform?: { name: string } };

export const InventoryPlatformProductsPage = () => {
  const { platformId } = useParams<{ platformId: string }>();
  const navigate = useNavigate();
  const { user } = useStore();
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [products, setProducts] = useState<ProductWithPlatform[]>([]);
  const [inventory, setInventory] = useState<AdminInventoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, [user?.phone_number, platformId]);

  const load = async () => {
    if (!platformId || !user?.phone_number) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [platRes, prodRes, invRes] = await Promise.all([
        supabase.from('platforms').select('*').eq('id', platformId).eq('is_deleted', false).maybeSingle(),
        supabase
          .from('products')
          .select('*, platform:platforms(name)')
          .eq('platform_id', platformId)
          .eq('is_deleted', false)
          .order('price_mru', { ascending: true })
          .order('name', { ascending: true }),
        supabase.rpc('admin_get_inventory', { p_admin_phone: user.phone_number }),
      ]);

      if (platRes.error) throw platRes.error;
      if (!platRes.data) {
        showToast('المنصة غير موجودة', 'error');
        navigate('/admin/inventory', { replace: true });
        return;
      }
      setPlatform(platRes.data as Platform);

      if (prodRes.error) throw prodRes.error;
      setProducts((prodRes.data as ProductWithPlatform[]) || []);

      if (invRes.error) throw invRes.error;
      setInventory((invRes.data as AdminInventoryRow[]) || []);
    } catch (error: unknown) {
      const raw = error instanceof Error ? error.message : String(error);
      showToast(raw || 'فشل التحميل', 'error');
    } finally {
      setLoading(false);
    }
  };

  const codeCountByProduct = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of inventory) {
      if (platformId && row.platform_id && row.platform_id !== platformId) continue;
      if (platformId && !row.platform_id) {
        const inList = products.some((p) => p.id === row.product_id);
        if (!inList) continue;
      }
      m.set(row.product_id, (m.get(row.product_id) || 0) + 1);
    }
    return m;
  }, [inventory, platformId, products]);

  if (loading && !platform) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div>
      <nav className="text-sm text-gray-400 mb-4 flex flex-wrap items-center gap-2 justify-end" aria-label="مسار التنقل">
        <Link to="/admin/inventory" className="hover:text-white transition-colors">
          المخزون
        </Link>
        <span className="opacity-50">/</span>
        <span className="text-white font-medium">{platform?.name ?? '…'}</span>
        <span className="opacity-50">/</span>
        <span>المنتجات</span>
      </nav>

      <div className="flex items-start gap-3 mb-8">
        <Link
          to="/admin/inventory"
          className="mt-1 text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="العودة إلى قائمة المنصات"
        >
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="min-w-0 flex-1 text-right">
          <h2 className="text-white text-2xl font-bold truncate">{platform?.name}</h2>
          <p className="text-gray-400 text-sm mt-1">اختر منتجاً لإدارة أكواده على صفحة مخصصة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {products.map((product) => {
          const nCodes = codeCountByProduct.get(product.id) ?? 0;
          return (
            <Link
              key={product.id}
              to={`../product/${product.id}/codes`}
              state={{ platformName: platform?.name, platformId }}
              className="bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-blue-500/45 transition-all text-right block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
            >
              <div className="h-14 flex items-center justify-center mb-3 bg-black/25 rounded-lg overflow-hidden">
                <ProductLogo
                  logoUrl={product.product_logo_url ?? product.logo_url}
                  name={product.name}
                  className="max-h-full w-auto object-contain"
                />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{product.name}</h3>
              <div className="flex justify-center mb-3">
                <ProductRegionBadge region={product.product_region} />
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-800">
                <span className="text-blue-400 font-medium">{product.price_mru} MRU</span>
                <span className="inline-flex items-center gap-1.5 text-gray-400">
                  <Hash className="w-4 h-4" aria-hidden />
                  {nCodes} كود
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {products.length === 0 && !loading && (
        <div className="text-center py-16 rounded-xl border border-dashed border-gray-700 text-gray-500">
          لا توجد منتجات لهذه المنصة. أضف منتجات من تبويب «المنتجات».
        </div>
      )}
    </div>
  );
};
