import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { LoadingScreen } from '../components/LoadingScreen';
import { supabase } from '../lib/supabase';
import type { OrderWithDetails, InventoryStatus } from '../types';
import { showToast } from '../components/Toast';
import { Copy, CheckCircle, ExternalLink, Clock, Home, ShoppingBag, PlayCircle, ArrowRight } from 'lucide-react';
import { FALLBACK_IMAGE } from '../constants';

export const OrderSuccess = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          product:products(*, platform:platforms(*)),
          inventory:inventory(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        showToast('الطلب غير موجود', 'error');
        navigate('/my-purchases');
        return;
      }

      const orderWithDetails: OrderWithDetails = {
        ...data,
        product: data.product || {
          id: '',
          platform_id: '',
          name: 'منتج محذ;وف',
          price_mru: 0,
          is_deleted: true,
          created_at: '',
          updated_at: ''
        },
        inventory: data.inventory || {
          id: '',
          product_id: '',
          code: '',
          status: 'available' as InventoryStatus,
          is_deleted: false,
          created_at: '',
          updated_at: ''
        },
        platform: data.product?.platform || {
          id: '',
          name: 'منصة محذوفة',
          logo_url: '',
          is_deleted: true,
          created_at: '',
          updated_at: ''
        },
      };

      setOrder(orderWithDetails);
    } catch (error: any) {
      showToast('فشل تحميل الطلب', 'error');
      navigate('/my-purchases');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (order?.inventory?.code) {
      navigator.clipboard.writeText(order.inventory.code);
      setCopied(true);
      showToast('تم نسخ الكود بنجاح', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!order) return null;

  const isPending = order.status === 'pending';
  const isApproved = order.status === 'approved';

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header />

      <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="self-start flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowRight className="w-5 h-5" />
          <span>العودة</span>
        </button>
        
        {/* الحالة والأيقونة */}
        <div className="text-center mb-10 animate-in zoom-in duration-500">
          <div className="relative mb-6">
            {isPending ? (
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full animate-pulse" />
                <Clock className="w-24 h-24 text-yellow-500 mx-auto relative animate-bounce" />
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full" />
                <CheckCircle className="w-24 h-24 text-green-500 mx-auto relative shadow-2xl" />
              </div>
            )}
          </div>
          
          <h1 className="text-4xl font-black mb-3">
            {isPending ? 'طلبك قيد الانتظار' : 'تم الشراء بنجاح!'}
          </h1>
          <p className="text-gray-400 text-lg font-medium">
            {isPending
              ? 'نقوم بمراجعة عملية الدفع حالياً، ترقب التحديث'
              : 'مبروك! كود التفعيل الخاص بك جاهز للاستخدام'
            }
          </p>
        </div>

        {/* تفاصيل المنتج */}
        <div className="w-full bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 mb-8 shadow-2xl">
          <div className="flex items-center gap-6 mb-8 border-b border-white/5 pb-6">
            <div className="w-20 h-20 bg-black border border-white/10 rounded-2xl p-3 shadow-inner">
               <img
                src={order.platform?.logo_url || FALLBACK_IMAGE}
                alt=""
                className="w-full h-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
              />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">{order.product?.name}</h2>
              <p className="text-cyan-500 font-bold uppercase tracking-widest text-sm">{order.platform?.name}</p>
            </div>
          </div>

          {/* الكود الرقمي في حال الموافقة */}
          {isApproved && order.inventory?.code ? (
            <div className="space-y-6">
              <div className="relative group">
                <div className={`absolute -inset-1 bg-gradient-to-r from-green-500 to-cyan-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500`}></div>
                <div className="relative bg-black rounded-[1.5rem] border border-white/10 p-6 flex flex-col items-center gap-4">
                  <span className="text-[10px] text-gray-500 uppercase font-black tracking-[0.3em]">Digital Key</span>
                  <p className="text-3xl font-mono font-bold text-white break-all text-center tracking-wider">
                    {order.inventory.code}
                  </p>
                  <button
                    onClick={copyCode}
                    className={`mt-2 w-full flex items-center justify-center gap-3 py-4 rounded-xl font-black transition-all duration-300 ${
                      copied ? 'bg-green-600 text-white' : 'bg-white text-black hover:bg-cyan-400'
                    }`}
                  >
                    {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    {copied ? 'تم النسخ!' : 'نسخ الكود'}
                  </button>
                </div>
              </div>

              {/* روابط المساعدة */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {order.platform?.tutorial_video_url && (
                  <button
                    onClick={() => window.open(order.platform?.tutorial_video_url, '_blank')}
                    className="flex items-center justify-center gap-3 bg-red-600/10 text-red-500 border border-red-600/20 py-4 rounded-2xl hover:bg-red-600/20 transition-all font-bold"
                  >
                    <PlayCircle className="w-5 h-5" />
                    مشاهدة الشرح
                  </button>
                )}
                {order.platform?.website_url && (
                  <button
                    onClick={() => window.open(order.platform?.website_url, '_blank')}
                    className="flex items-center justify-center gap-3 bg-white/5 text-white border border-white/10 py-4 rounded-2xl hover:bg-white/10 transition-all font-bold"
                  >
                    <ExternalLink className="w-5 h-5 text-cyan-400" />
                    موقع المنصة
                  </button>
                )}
              </div>
            </div>
          ) : isPending ? (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-3xl p-8 text-center">
              <p className="text-yellow-500 font-bold text-lg mb-2 italic">الطلب في مرحلة التأكيد</p>
              <p className="text-gray-500 text-sm leading-relaxed">
                بمجرد تأكيد الدفع من قبل فريقنا، سيتم تفعيل الكود تلقائياً في هذه الصفحة وفي سجل مشترياتك.
              </p>
            </div>
          ) : null}
        </div>

        {/* أزرار التحكم السفلية */}
        <div className="w-full grid grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/my-purchases')}
            className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-4 rounded-2xl font-bold hover:bg-white/10 transition-all"
          >
            <ShoppingBag className="w-5 h-5" />
            مشترياتي
          </button>
          <button 
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 py-4 rounded-2xl font-bold hover:opacity-90 transition-all"
          >
            <Home className="w-5 h-5" />
            الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
};