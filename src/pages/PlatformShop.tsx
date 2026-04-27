import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { PlatformHero } from '../components/PlatformHero';
import { PlatformProductGrid } from '../components/PlatformProductGrid';
import { supabase } from '../lib/supabase';
import type { Platform, ProductWithStock } from '../types';
import { showToast } from '../components/Toast';
import { ArrowRight } from 'lucide-react';
import { fetchPlatformProductsWithStock } from '../utils/fetchPlatformProducts';
import {
  PLATFORM_SHOP_GENERAL,
  parseShopRegionKey,
  sortAssignedRegionCodes,
} from '../utils/platformRegionRoutes';

export const PlatformShopPage = () => {
  const { id, regionKey } = useParams<{ id: string; regionKey: string }>();
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);

  const filter = useMemo(() => parseShopRegionKey(regionKey), [regionKey]);

  useEffect(() => {
    if (!id || filter == null) return;

    const load = async () => {
      try {
        setLoading(true);

        const { data: platformData, error: platformError } = await supabase
          .from('platforms')
          .select('*')
          .eq('id', id)
          .single();

        if (platformError) throw platformError;
        setPlatform(platformData);

        const all = await fetchPlatformProductsWithStock(id);

        const metaRows = all.map((p) => ({
          id: p.id,
          region: p.product_region != null && String(p.product_region).trim() !== '' ? String(p.product_region).trim() : null,
        }));
        const assignedKeys = sortAssignedRegionCodes(
          [...new Set(metaRows.map((m) => m.region).filter((r): r is string => r != null))]
        );
        const hasNull = metaRows.some((m) => m.region === null);
        const platformUsesRegions = assignedKeys.length > 0;

        if (!platformUsesRegions) {
          navigate(`/platform/${id}`, { replace: true });
          return;
        }

        const validKeys = new Set<string>([...assignedKeys, ...(hasNull ? [PLATFORM_SHOP_GENERAL] : [])]);
        const activeKey = filter.kind === 'general' ? PLATFORM_SHOP_GENERAL : filter.region;
        if (!validKeys.has(activeKey)) {
          navigate(`/platform/${id}/regions`, { replace: true });
          return;
        }

        let list = all;
        if (filter.kind === 'general') {
          list = all.filter((p) => p.product_region == null || String(p.product_region).trim() === '');
        } else {
          list = all.filter((p) => String(p.product_region ?? '').trim() === filter.region);
        }

        setProducts(list);
      } catch (error: unknown) {
        console.error('Platform shop load:', error);
        showToast('فشل تحميل المنتجات', 'error');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, filter, navigate, regionKey]);

  const regionHeading = useMemo(() => {
    if (!filter) return '';
    if (filter.kind === 'general') return 'عام · بدون منطقة محددة';
    return filter.region;
  }, [filter]);

  if (!id) return null;

  if (!loading && !platform && filter) {
    return (
      <div className="page-wrap">
        <Header />
        <div className="page-content-wide flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <p className="text-gray-400 text-body font-medium">المنصة غير موجودة</p>
          <button type="button" onClick={() => navigate('/')} className="text-cyan-500 hover:underline font-medium">
            العودة للرئيسية
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (filter == null) {
    return (
      <div className="page-wrap">
        <Header />
        <div className="page-content-wide flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <p className="text-gray-400 text-body font-medium">رابط غير صالح</p>
          <button type="button" onClick={() => navigate(id ? `/platform/${id}/regions` : '/')} className="text-cyan-500 hover:underline font-medium">
            العودة
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="page-wrap font-sans selection:bg-cyan-500/30">
      <Header />
      <div className="page-content-wide">
        <button
          type="button"
          onClick={() => navigate(`/platform/${id}/regions`)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-section group"
        >
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          <span>اختيار المنطقة</span>
        </button>

        {loading ? (
          <div className="relative w-full pb-10 overflow-hidden animate-pulse">
            <div className="h-48 bg-white/5 rounded-3xl mx-auto max-w-sm mb-8" />
            <div className="h-10 bg-white/5 rounded-lg max-w-md mx-auto mb-4" />
          </div>
        ) : (
          <PlatformHero platform={platform} />
        )}

        <div className="max-w-4xl mx-auto relative z-20 pt-2">
          <div className="flex flex-col items-center justify-center mb-section border-b border-white/10 pb-4 gap-2">
            <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-[0.35em]">المنطقة المختارة</p>
            <h2 className="text-section-title font-bold text-center text-white">{regionHeading}</h2>
          </div>

          <PlatformProductGrid
            products={products}
            loading={loading}
            emptyMessage="لا توجد منتجات لهذه المنطقة على هذه المنصة."
          />
        </div>
      </div>
      <BottomNav />
    </div>
  );
};
