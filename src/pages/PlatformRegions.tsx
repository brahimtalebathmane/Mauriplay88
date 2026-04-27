import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { PlatformHero } from '../components/PlatformHero';
import { supabase } from '../lib/supabase';
import type { Platform } from '../types';
import { showToast } from '../components/Toast';
import { ArrowRight, Globe2, MapPin } from 'lucide-react';
import { getProductRegionFlag, isProductRegionCode } from '../constants/productRegions';
import {
  PLATFORM_SHOP_GENERAL,
  shopUrlForRegion,
  sortAssignedRegionCodes,
} from '../utils/platformRegionRoutes';

export const PlatformRegionsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [loading, setLoading] = useState(true);
  const [regionRows, setRegionRows] = useState<{ region: string; count: number }[]>([]);
  const [generalCount, setGeneralCount] = useState(0);

  useEffect(() => {
    if (!id) return;

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

        const { data: prodRows, error: prodError } = await supabase
          .from('products')
          .select('product_region')
          .eq('platform_id', id)
          .eq('is_deleted', false);

        if (prodError) throw prodError;

        const assigned = new Map<string, number>();
        let nullCount = 0;
        for (const row of prodRows || []) {
          const r = row.product_region as string | null;
          if (r == null || String(r).trim() === '') {
            nullCount += 1;
          } else {
            const key = String(r).trim();
            assigned.set(key, (assigned.get(key) || 0) + 1);
          }
        }

        const sortedKeys = sortAssignedRegionCodes([...assigned.keys()]);
        setRegionRows(sortedKeys.map((region) => ({ region, count: assigned.get(region) || 0 })));
        setGeneralCount(nullCount);

        const hasAssigned = sortedKeys.length > 0;
        if (!hasAssigned) {
          navigate(`/platform/${id}`, { replace: true });
          return;
        }
      } catch (error: unknown) {
        console.error('Platform regions load:', error);
        showToast('فشل تحميل البيانات', 'error');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, navigate]);

  if (!id) {
    return null;
  }

  if (!loading && !platform) {
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
            <h2 className="text-section-title font-bold flex items-center justify-center gap-3 text-center text-white">
              <MapPin className="w-6 h-6 text-cyan-500 flex-shrink-0" />
              اختر المنطقة
            </h2>
          </div>

          <p className="text-center text-caption text-gray-500 mb-8 max-w-lg mx-auto">
            تظهر فقط المناطق المرتبطة بمنتجات فعلية على هذه المنصة.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {regionRows.map(({ region, count }) => {
              const flag = isProductRegionCode(region) ? getProductRegionFlag(region) : null;
              return (
                <Link
                  key={region}
                  to={shopUrlForRegion(id, region)}
                  className="group relative overflow-hidden rounded-card border border-white/10 bg-card hover:border-cyan-500/35 hover:bg-cardHover transition-all duration-300 p-5 flex items-center justify-between gap-4 text-right"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
                    <div className="min-w-0">
                      <div className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                        {region}
                      </div>
                      <div className="text-[11px] font-semibold text-gray-500 mt-1">
                        {count} {count === 1 ? 'منتج' : 'منتجات'}
                      </div>
                    </div>
                    {flag ? (
                      <span className="text-2xl shrink-0" aria-hidden>
                        {flag}
                      </span>
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-lg font-black text-gray-400">
                        R
                      </span>
                    )}
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-cyan-400 transition-colors rotate-180 shrink-0" />
                </Link>
              );
            })}

            {generalCount > 0 ? (
              <Link
                to={`/platform/${id}/shop/${PLATFORM_SHOP_GENERAL}`}
                className="group relative overflow-hidden rounded-card border border-white/10 bg-card hover:border-cyan-500/35 hover:bg-cardHover transition-all duration-300 p-5 flex items-center justify-between gap-4 text-right sm:col-span-2"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
                  <div className="min-w-0">
                    <div className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                      عام · بدون منطقة محددة
                    </div>
                    <div className="text-[11px] font-semibold text-gray-500 mt-1">
                      {generalCount} {generalCount === 1 ? 'منتج' : 'منتجات'}
                    </div>
                  </div>
                  <Globe2 className="w-10 h-10 shrink-0 text-cyan-500/80" aria-hidden />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-cyan-400 transition-colors rotate-180 shrink-0" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};
