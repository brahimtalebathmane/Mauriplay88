import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import type { Platform } from '../types';
import { showToast } from '../components/Toast';
import { Wallet, ShoppingBag, TrendingUp } from 'lucide-react';

interface PlatformWithStats extends Platform {
  product_count: number;
  total_stock: number;
}

export const Home = () => {
  const navigate = useNavigate();
  const { user } = useStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [platforms, setPlatforms] = useState<PlatformWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  const slides = [
    "https://i.postimg.cc/jSh9KszX/kl-mathtj.png",
    "https://i.postimg.cc/Jzgs3Xy0/kl-mathtj.png"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    loadPlatforms();
  }, []);

  const loadPlatforms = async () => {
    try {
      const { data: platformsData, error: platformsError } = await supabase
        .from('platforms')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (platformsError) throw platformsError;

      if (!platformsData || platformsData.length === 0) {
        setPlatforms([]);
        setLoading(false);
        return;
      }

      const platformIds = platformsData.map((p) => p.id);

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, platform_id')
        .in('platform_id', platformIds)
        .eq('is_deleted', false);

      if (productsError) throw productsError;

      const productsByPlatform = new Map<string, string[]>();
      productsData?.forEach((product) => {
        if (!productsByPlatform.has(product.platform_id)) {
          productsByPlatform.set(product.platform_id, []);
        }
        productsByPlatform.get(product.platform_id)!.push(product.id);
      });

      const allProductIds = productsData?.map((p) => p.id) || [];
      let stockByProduct = new Map<string, number>();

      if (allProductIds.length > 0) {
        const { data: stockData } = await supabase.rpc('get_product_stock_count', {
          p_product_ids: allProductIds,
        });

        stockData?.forEach((item: any) => {
          stockByProduct.set(item.product_id, item.stock_count);
        });
      }

      const platformsWithStats: PlatformWithStats[] = platformsData.map((platform) => {
        const productIds = productsByPlatform.get(platform.id) || [];
        const totalStock = productIds.reduce((sum, productId) => {
          return sum + (stockByProduct.get(productId) || 0);
        }, 0);

        return {
          ...platform,
          product_count: productIds.length,
          total_stock: totalStock,
        };
      });

      setPlatforms(platformsWithStats);
    } catch (error: any) {
      showToast('فشل تحميل المنصات', 'error');
      console.error('Error loading platforms:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header />

      <div className="pt-20 px-4 max-w-6xl mx-auto pb-10">
        <div className="relative w-full h-48 overflow-hidden rounded-2xl mb-8 border border-white/5">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={slide}
                alt={`Slide ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentSlide ? 'w-4 bg-white' : 'w-1.5 bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {user && user.wallet_active && (
          <div
            onClick={() => navigate('/wallet')}
            className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-cyan-950/40 via-cyan-900/20 to-black border border-cyan-500/20 hover:border-cyan-500/40 transition-all cursor-pointer active:scale-[0.99] group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
                  <Wallet className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1">رصيد المحفظة</div>
                  <div className="text-3xl font-black text-white group-hover:text-cyan-400 transition-colors">
                    {user.wallet_balance.toFixed(2)} <span className="text-lg font-bold text-gray-400">MRU</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-cyan-500" />
            المنصات المتاحة
          </h2>
          {!loading && platforms.length > 0 && (
            <div className="bg-white/5 px-3 py-1 rounded-lg text-xs font-bold text-gray-400 uppercase">
              {platforms.length} {platforms.length === 1 ? 'Platform' : 'Platforms'}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse border border-white/5"
              />
            ))}
          </div>
        ) : platforms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <ShoppingBag className="w-12 h-12 text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-300 mb-3">لا توجد منصات متاحة حالياً</h3>
            <p className="text-gray-500 max-w-md">
              سيتم إضافة المنصات والمنتجات قريباً. تابعنا للحصول على آخر التحديثات.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {platforms.map((platform) => (
              <div
                key={platform.id}
                onClick={() => navigate(`/platform/${platform.id}`)}
                className="group flex flex-col cursor-pointer active:scale-95 transition-all"
              >
                <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-gray-900 to-black group-hover:border-cyan-500/30 transition-all shadow-lg group-hover:shadow-cyan-500/10">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />

                  <img
                    src={platform.logo_url}
                    alt={platform.name}
                    className="w-full h-full object-contain p-6 group-hover:scale-110 transition-transform duration-500"
                  />

                  {platform.total_stock > 0 && (
                    <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-green-500/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      <span className="text-[10px] font-black text-white uppercase tracking-wide">متوفر</span>
                    </div>
                  )}

                  {platform.total_stock === 0 && platform.product_count > 0 && (
                    <div className="absolute top-3 left-3 z-20 bg-red-500/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
                      <span className="text-[10px] font-black text-white uppercase tracking-wide">نفذت الكمية</span>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
                    <div className="text-center">
                      <h3 className="text-white font-black text-base mb-1 drop-shadow-lg">
                        {platform.name}
                      </h3>
                      {platform.product_count > 0 && (
                        <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                          {platform.product_count} {platform.product_count === 1 ? 'منتج' : 'منتجات'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
