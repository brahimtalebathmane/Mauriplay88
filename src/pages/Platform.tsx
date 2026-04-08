import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { supabase } from '../lib/supabase';
import type { Platform, ProductWithStock } from '../types';
import { showToast } from '../components/Toast';
import { ProductLogo } from '../components/ProductLogo';
import { ArrowRight } from 'lucide-react';

export const PlatformPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPlatformAndProducts();
    }
  }, [id]);

  const loadPlatformAndProducts = async () => {
    try {
      setLoading(true);

      // 1. جلب بيانات المنصة
      const { data: platformData, error: platformError } = await supabase
        .from('platforms')
        .select('*')
        .eq('id', id)
        .single();

      if (platformError) throw platformError;
      setPlatform(platformData);

      // 2. جلب المنتجات (بدون مخزون - RLS يمنع المستخدمين من رؤية inventory مباشرة)
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('platform_id', id)
        .eq('is_deleted', false)
        .order('name');

      if (productsError) throw productsError;

      const productList = productsData || [];
      if (productList.length === 0) {
        setProducts([]);
        return;
      }

      // 3. جلب عدد الأكواد المتاحة عبر RPC (SECURITY DEFINER) لتفادي RLS
      const { data: stockData, error: stockError } = await supabase.rpc('get_product_stock_count', {
        p_product_ids: productList.map((p: { id: string }) => p.id),
      });

      if (stockError) {
        console.warn('Stock count RPC failed, showing 0 stock', stockError);
      }

      const stockMap = new Map<string, number>();
      (stockData || []).forEach((row: { product_id: string; stock_count: number }) => {
        stockMap.set(row.product_id, Number(row.stock_count) || 0);
      });

      const formattedProducts = productList.map((product: any) => ({
        ...product,
        stock_count: stockMap.get(product.id) ?? 0,
      }));

      setProducts(formattedProducts);
    } catch (error: any) {
      console.error('Platform Load Error:', error);
      showToast('فشل تحميل بيانات المتجر', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!platform && !loading) {
    return (
      <div className="page-wrap">
        <Header />
        <div className="page-content-wide flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <p className="text-gray-400 text-body font-medium animate-pulse">المنصة غير موجودة</p>
          <button onClick={() => navigate('/')} className="text-cyan-500 hover:underline font-medium">العودة للرئيسية</button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="page-wrap font-sans selection:bg-cyan-500/30">
      <Header />
      <div className="page-content-wide">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-section group"
        >
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          <span>العودة للرئيسية</span>
        </button>

      {/* Hero — center-aligned */}
      <div className="relative w-full pb-8 sm:pb-10 overflow-hidden">
        {platform && (
          <>
            <div
              className="absolute top-0 right-0 w-[min(130vw,48rem)] sm:w-[min(120vw,56rem)] h-[min(55vh,28rem)] sm:h-[500px] max-h-[500px] bg-gradient-to-b from-cyan-900/10 via-transparent to-transparent blur-[120px] rounded-full pointer-events-none translate-x-[15%] -translate-y-[8%]"
              aria-hidden
            />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full flex flex-col items-center text-center gap-4 sm:gap-5 md:gap-6">
              <div className="relative group">
                <div className="absolute -inset-4 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition duration-1000" />
                <div className="relative w-36 h-36 sm:w-40 sm:h-40 md:w-48 md:h-48 flex items-center justify-center mx-auto">
                  <img
                    src={platform.logo_url}
                    alt={platform.name}
                    className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(6,182,212,0.3)] transform group-hover:scale-105 transition duration-500"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/icon-72.png'; }}
                  />
                </div>
              </div>

              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white uppercase max-w-full leading-tight">
                {platform.name}
              </h1>

              {platform.description?.trim() ? (
                <p className="text-base sm:text-lg text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed whitespace-pre-wrap">
                  {platform.description.trim()}
                </p>
              ) : null}

              <div className="flex items-center gap-3 sm:gap-4 opacity-70 justify-center flex-wrap">
                <div className="h-px w-10 sm:w-12 bg-gradient-to-r from-transparent to-cyan-500 shrink-0" />
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.5em]">Premium Selection</span>
                <div className="h-px w-10 sm:w-12 bg-gradient-to-l from-transparent to-cyan-500 shrink-0" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* قسم المنتجات */}
      <div className="max-w-4xl mx-auto relative z-20 pt-2">
        <div className="flex items-center justify-center mb-section border-b border-white/10 pb-4">
          <h2 className="text-section-title font-bold flex items-center justify-center gap-3 text-center">
            <span className="flex h-2 w-2 relative flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            العروض المتوفرة
          </h2>
        </div>

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
                onClick={() => product.stock_count > 0 && navigate(`/purchase/${product.id}`)}
                disabled={product.stock_count === 0}
                className={`group relative overflow-hidden rounded-card border transition-all duration-300 ${
                  product.stock_count > 0
                    ? 'bg-card border-white/10 hover:border-cyan-500/30 hover:bg-cardHover active:scale-[0.99]'
                    : 'bg-black/40 border-red-900/20 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="relative p-5 flex items-center justify-between gap-4">
                  
                  {/* السعر */}
                  <div className="flex-shrink-0 text-left">
                    <div className="text-2xl font-black text-white group-hover:text-cyan-400 transition-colors">
                      {product.price_mru}
                    </div>
                    <div className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">
                      MRU
                    </div>
                  </div>

                  {/* معلومات المنتج */}
                  <div className="flex-1 text-center">
                    <div className="text-lg font-bold text-gray-200 group-hover:text-white transition-colors mb-1">
                      {product.name}
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

                  {/* شعار المنتج أو صورة افتراضية */}
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
              <p className="text-caption text-gray-500">لا توجد منتجات متاحة حالياً لهذه المنصة.</p>
            </div>
          )}
        </div>
      </div>
      </div>
      <BottomNav />
    </div>
  );
};