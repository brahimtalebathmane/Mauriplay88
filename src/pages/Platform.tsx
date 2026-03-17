import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import type { Platform, ProductWithStock } from '../types';
import { showToast } from '../components/Toast';
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
      <div className="min-h-screen bg-[#050505]">
        <Header />
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-gray-400 text-xl font-medium animate-pulse">المنصة غير موجودة</div>
          <button onClick={() => navigate('/')} className="text-cyan-500 hover:underline">العودة للرئيسية</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30">
      <Header />

      {/* Back button */}
      <div className="max-w-7xl mx-auto px-4 pt-24">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4 group"
        >
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          <span>العودة للرئيسية</span>
        </button>
      </div>

      {/* Hero Section */}
      <div className="relative w-full pb-10 overflow-hidden">
        {platform && (
          <>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[500px] bg-gradient-to-b from-cyan-900/10 via-transparent to-transparent blur-[120px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 max-w-7xl mx-auto px-4 flex flex-col items-center">
              <div className="relative group mb-8">
                <div className="absolute -inset-4 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition duration-1000"></div>
                <div className="relative w-40 h-40 md:w-48 md:h-48 flex items-center justify-center">
                  <img 
                    src={platform.logo_url} 
                    alt={platform.name} 
                    className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(6,182,212,0.3)] transform group-hover:scale-105 transition duration-500" 
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200?text=No+Logo'; }}
                  />
                </div>
              </div>

              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white text-center mb-4 uppercase">
                {platform.name}
              </h1>
              
              <div className="flex items-center gap-4 opacity-70">
                <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-cyan-500" />
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.5em]">Premium Selection</span>
                <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-cyan-500" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* قسم المنتجات */}
      <div className="max-w-4xl mx-auto px-4 pb-24 relative z-20">
        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
          <h2 className="text-lg font-bold flex items-center gap-3">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            العروض المتوفرة
          </h2>
          <div className="bg-white/5 px-3 py-1 rounded-md text-[9px] font-bold text-gray-500 uppercase tracking-widest">
             {products.length} Products
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
              ))}
            </div>
          ) : products.length > 0 ? (
            products.map((product) => (
              <button
                key={product.id}
                onClick={() => product.stock_count > 0 && navigate(`/purchase/${product.id}`)}
                disabled={product.stock_count === 0}
                className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                  product.stock_count > 0
                    ? 'bg-[#0a0a0a] border-white/5 hover:border-cyan-500/30 hover:bg-[#0f0f0f] active:scale-[0.98]'
                    : 'bg-black/40 border-red-900/5 opacity-50 cursor-not-allowed'
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
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold ${
                      product.stock_count > 0 
                      ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                      : 'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                      {product.stock_count > 0 ? `متوفر: ${product.stock_count}` : 'نفذت الكمية'}
                    </div>
                  </div>

                  {/* أيقونة المنتج أو الحرف الأول */}
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 bg-gray-900 rounded-xl border border-white/5 flex items-center justify-center overflow-hidden">
                      {product.product_logo_url ? (
                        <img src={product.product_logo_url} alt="" className="w-full h-full object-contain p-2" />
                      ) : (
                        <span className="text-xl font-black text-gray-700">{product.name.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
              <p className="text-gray-500">لا توجد منتجات متاحة حالياً لهذه المنصة.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};