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
      const [platformRes, productsRes] = await Promise.all([
        supabase.from('platforms').select('*').eq('id', id).single(),
        supabase.from('products').select('*').eq('platform_id', id).eq('is_deleted', false),
      ]);

      if (platformRes.error) throw platformRes.error;
      if (productsRes.error) throw productsRes.error;

      setPlatform(platformRes.data);

      const productIds = productsRes.data.map((p) => p.id);
      if (productIds.length > 0) {
        const { data: stockData } = await supabase.rpc('get_product_stock_count', {
          p_product_ids: productIds,
        });

        const productsWithStock = productsRes.data.map((product) => ({
          ...product,
          stock_count: stockData?.find((s: any) => s.product_id === product.id)?.stock_count || 0,
        }));

        setProducts(productsWithStock);
      } else {
        setProducts([]);
      }
    } catch (error: any) {
      showToast('فشل تحميل المنتجات', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!platform && !loading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400 text-xl font-medium animate-pulse">المنصة غير موجودة</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30">
      <Header />

      {/* Back button */}
      <div className="max-w-7xl mx-auto px-4 pt-20">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowRight className="w-5 h-5" />
          <span>العودة للرئيسية</span>
        </button>
      </div>

      {/* Hero Section - الهيدر المطور مع شعار كبير */}
      <div className="relative w-full pb-20 overflow-hidden">
        {platform && (
          <>
            {/* تأثير الإضاءة الخلفية الكبيرة */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[500px] bg-gradient-to-b from-cyan-900/20 via-transparent to-transparent blur-[120px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 max-w-7xl mx-auto px-4 flex flex-col items-center">
              {/* صورة المنصة الكبيرة جداً */}
              <div className="relative group mb-8">
                {/* تأثير الهالة (Glow) خلف الشعار */}
                <div className="absolute -inset-4 bg-cyan-500/20 rounded-full blur-3xl group-hover:bg-cyan-500/30 transition duration-1000"></div>
                
                <div className="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center">
                  <img 
                    src={platform.logo_url} 
                    alt={platform.name} 
                    className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(6,182,212,0.5)] transform group-hover:scale-105 transition duration-500" 
                  />
                </div>
              </div>

              {/* اسم المنصة بتصميم عريض */}
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white text-center mb-4">
                {platform.name}
              </h1>
              
              {/* خط تزييني تكنولوجي */}
              <div className="flex items-center gap-4 opacity-70">
                <div className="h-[2px] w-16 bg-gradient-to-r from-transparent to-cyan-500" />
                <span className="text-sm font-bold text-cyan-400 uppercase tracking-[0.4em]">Official Store</span>
                <div className="h-[2px] w-16 bg-gradient-to-l from-transparent to-cyan-500" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* قسم المنتجات */}
      <div className="max-w-4xl mx-auto px-4 pb-24 relative z-20">
        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
          <h2 className="text-xl font-black flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
            المنتجات المتاحة
          </h2>
          <div className="bg-white/5 px-3 py-1 rounded-md text-[10px] font-bold text-gray-400 uppercase">
             {products.length} Items Found
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
            ))
          ) : (
            products.map((product) => (
              <button
                key={product.id}
                onClick={() => product.stock_count > 0 && navigate(`/purchase/${product.id}`)}
                disabled={product.stock_count === 0}
                className={`group relative overflow-hidden rounded-3xl border transition-all duration-500 ${
                  product.stock_count > 0
                    ? 'bg-[#0f0f0f] border-white/5 hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] active:scale-[0.99]'
                    : 'bg-black/40 border-red-900/10 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="relative p-6 flex items-center justify-between gap-6">
                  
                  {/* السعر - جهة اليسار */}
                  <div className="flex-shrink-0 text-left min-w-[100px]">
                    <div className="text-3xl font-black text-white group-hover:text-cyan-400 transition-colors">
                      {product.price_mru}
                    </div>
                    <div className="text-[10px] font-bold text-cyan-500/60 uppercase tracking-widest">
                      MRU Currency
                    </div>
                  </div>

                  {/* معلومات المنتج - المنتصف */}
                  <div className="flex-1 text-center">
                    <div className="text-xl font-bold text-gray-100 group-hover:text-white transition-colors mb-2">
                      {product.name}
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/50 border border-white/5 group-hover:border-cyan-500/20 transition-all">
                      {product.stock_count > 0 ? (
                        <>
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-xs font-bold text-green-400 italic">متوفر ({product.stock_count})</span>
                        </>
                      ) : (
                        <span className="text-xs font-bold text-red-500 uppercase tracking-tighter">نفذت الكمية</span>
                      )}
                    </div>
                  </div>

                  {/* أيقونة المنتج - جهة اليمين */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-white/10 p-2.5 shadow-xl group-hover:rotate-3 transition-transform duration-500">
                      {product.product_logo_url ? (
                        <img
                          src={product.product_logo_url}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-800 text-3xl font-black">
                          {product.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};