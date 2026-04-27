import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { PlatformHero } from '../components/PlatformHero';
import { PlatformProductGrid } from '../components/PlatformProductGrid';
import { supabase } from '../lib/supabase';
import type { Platform, ProductWithStock } from '../types';
import { showToast } from '../components/Toast';
import { ArrowRight } from 'lucide-react';
import { fetchPlatformProductsWithStock } from '../utils/fetchPlatformProducts';

export const PlatformPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);

        const { data: platformData, error: platformError } = await supabase
          .from('platforms')
          .select('*')
          .eq('id', id)
          .single();

        if (cancelled) return;
        if (platformError) throw platformError;
        setPlatform(platformData);

        const { data: regionProbe, error: regionErr } = await supabase
          .from('products')
          .select('product_region')
          .eq('platform_id', id)
          .eq('is_deleted', false);

        if (cancelled) return;
        if (regionErr) throw regionErr;

        const hasAssignedRegion = (regionProbe || []).some(
          (r: { product_region: unknown }) =>
            r.product_region != null && String(r.product_region).trim() !== ''
        );

        if (hasAssignedRegion) {
          navigate(`/platform/${id}/regions`, { replace: true });
          return;
        }

        const full = await fetchPlatformProductsWithStock(id);
        if (cancelled) return;
        setProducts(full);
      } catch (error: unknown) {
        if (!cancelled) {
          console.error('Platform Load Error:', error);
          showToast('فشل تحميل بيانات المتجر', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  if (!platform && !loading) {
    return (
      <div className="page-wrap">
        <Header />
        <div className="page-content-wide flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <p className="text-gray-400 text-body font-medium animate-pulse">المنصة غير موجودة</p>
          <button type="button" onClick={() => navigate('/')} className="text-cyan-500 hover:underline font-medium">
            العودة للرئيسية
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
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-section group"
        >
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          <span>العودة للرئيسية</span>
        </button>

        {loading ? (
          <div className="relative w-full pb-10 overflow-hidden animate-pulse">
            <div className="h-48 bg-white/5 rounded-3xl mx-auto max-w-sm mb-8" />
            <div className="h-10 bg-white/5 rounded-lg max-w-md mx-auto mb-4" />
            <div className="h-4 bg-white/5 rounded max-w-lg mx-auto" />
          </div>
        ) : (
          <PlatformHero platform={platform} />
        )}

        <div className="max-w-4xl mx-auto relative z-20 pt-2">
          <div className="flex items-center justify-center mb-section border-b border-white/10 pb-4">
            <h2 className="text-section-title font-bold flex items-center justify-center gap-3 text-center">
              <span className="flex h-2 w-2 relative flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              العروض المتوفرة
            </h2>
          </div>

          <PlatformProductGrid products={products} loading={loading} />
        </div>
      </div>
      <BottomNav />
    </div>
  );
};
