import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { SkeletonList } from '../components/LoadingScreen';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import type { OrderWithDetails, InventoryStatus } from '../types';
import { showToast } from '../components/Toast';
import { ProductLogo } from '../components/ProductLogo';
import { Copy, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp, ExternalLink, Video, Ticket, ArrowRight } from 'lucide-react';

export const MyPurchases = () => {
  const navigate = useNavigate();
  const { user } = useStore();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadOrders();
      const unsubscribe = subscribeToOrders();
      return unsubscribe;
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_orders_with_inventory', {
        p_user_id: user.id,
      });

      if (error) throw error;

      const rawOrders = Array.isArray(data) ? data : [];
      const ordersWithDetails: OrderWithDetails[] = rawOrders.map((order: any) => ({
        id: order.id,
        user_id: order.user_id,
        product_id: order.product_id,
        inventory_id: order.inventory_id,
        price_at_purchase: order.price_at_purchase,
        payment_type: order.payment_type,
        payment_method_name: order.payment_method_name,
        user_payment_number: order.user_payment_number,
        user_name: order.user_name,
        transaction_reference: order.transaction_reference,
        receipt_url: order.receipt_url,
        status: order.status,
        admin_note: order.admin_note,
        created_at: order.created_at,
        updated_at: order.updated_at,
        product: {
          id: order.product_id || '',
          platform_id: order.platform_id || '',
          name: order.product_name || 'منتج محذوف',
          price_mru: order.product_price || 0,
          product_logo_url: order.product_logo_url ?? undefined,
          logo_url: order.product_logo_url ?? undefined,
          is_deleted: !order.product_name,
          created_at: '',
          updated_at: ''
        },
        inventory: {
          id: order.inventory_id || '',
          product_id: order.product_id || '',
          code: order.inventory_code || '',
          status: order.inventory_status || 'available' as InventoryStatus,
          is_deleted: false,
          created_at: '',
          updated_at: ''
        },
        platform: {
          id: order.platform_id || '',
          name: order.platform_name || 'منصة محذوفة',
          logo_url: order.platform_logo_url || '/icon-72.png',
          website_url: order.platform_website_url || '',
          tutorial_video_url: order.platform_tutorial_video_url || '',
          is_deleted: !order.platform_name,
          created_at: '',
          updated_at: ''
        },
      }));

      setOrders(ordersWithDetails);
    } catch (error: any) {
      console.error('MyPurchases load error:', error);
      showToast('فشل تحميل المشتريات', 'error');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToOrders = () => {
    if (!user?.id) return () => {};
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const copyCode = (code: string) => {
    if (code) {
      navigator.clipboard.writeText(code);
      showToast('تم نسخ الكود بنجاح', 'success');
    }
  };

  const getStatusInfo = (status: string) => {
    const statuses = {
      approved: { text: 'مكتمل', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
      pending: { text: 'قيد المراجعة', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
      rejected: { text: 'مرفوض', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    };
    return statuses[status as keyof typeof statuses] || statuses.pending;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-cyan-500/30 pb-20">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-12">

        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowRight className="w-5 h-5" />
          <span>العودة للرئيسية</span>
        </button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
            سجل المشتريات
          </h1>
          <p className="text-gray-500 uppercase tracking-[0.3em] text-xs font-bold">Your Digital Inventory</p>
        </div>

        {loading ? (
          <SkeletonList count={5} />
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] rounded-[2rem] border border-dashed border-white/10">
            <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Ticket className="w-10 h-10 text-gray-600" />
            </div>
            <p className="text-gray-400 text-lg mb-6">لا توجد مشتريات في سجلّك حالياً</p>
            <Button
              onClick={() => navigate('/')}
              className="bg-white text-black hover:bg-gray-200 px-8 rounded-xl font-bold"
            >
              ابدأ التسوق الآن
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => {
              const status = getStatusInfo(order.status);
              const isExpanded = expandedOrderId === order.id;
              const StatusIcon = status.icon;

              return (
                <div
                  key={order.id}
                  className={`relative group overflow-hidden rounded-[1.5rem] border transition-all duration-500 ${
                    isExpanded ? 'border-cyan-500/30 bg-[#0c0c0c]' : 'border-white/5 bg-[#0a0a0a] hover:border-white/10'
                  }`}
                >
                  <div className="p-5 md:p-7">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div className="relative">
                           <div className="absolute inset-0 bg-cyan-500/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                           <div className="relative w-16 h-16 bg-black border border-white/10 rounded-2xl p-2 flex items-center justify-center overflow-hidden">
                             <ProductLogo
                               logoUrl={order.product?.product_logo_url ?? order.product?.logo_url}
                               name={order.product?.name}
                               className="w-full h-full object-contain"
                             />
                           </div>
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-gray-100 group-hover:text-white transition-colors">
                            {order.product?.name}
                          </h3>
                          <p className="text-cyan-500/70 text-sm font-bold uppercase tracking-wider">
                            {order.platform?.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-8 border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                        <div className="text-right">
                          <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">السعر المدفوع</p>
                          <p className="text-xl font-black text-white">{order.price_at_purchase} <span className="text-xs text-gray-500">MRU</span></p>
                        </div>
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${status.bg} ${status.color} ${status.border}`}>
                          <StatusIcon className="w-4 h-4 shadow-sm" />
                          <span className="text-xs font-black uppercase tracking-tighter">{status.text}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                       <span className="text-xs text-gray-600 font-medium">
                        تاريخ الطلب: {new Date(order.created_at).toLocaleDateString('ar-SA')}
                       </span>
                       <button
                        onClick={() => toggleExpand(order.id)}
                        className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${
                          isExpanded ? 'text-cyan-400' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {isExpanded ? 'إغلاق التفاصيل' : 'تفاصيل الكود'}
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-white/5 bg-black/60 backdrop-blur-md p-6 animate-in slide-in-from-top duration-300">
                      {order.status === 'approved' ? (
                        <div className="space-y-6">
                          {order.inventory?.code ? (
                            <div className="relative group/code">
                              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-10 group-hover/code:opacity-20 transition" />
                              <div className="relative bg-[#050505] border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4">
                                <div className="flex-1 w-full">
                                  <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-2 text-center md:text-right">كود التفعيل الرقمي</p>
                                  <div className="bg-black/50 border border-white/5 rounded-xl py-4 px-6">
                                    <p className="text-white font-mono text-xl text-center break-all selection:bg-cyan-500">
                                      {order.inventory.code}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => copyCode(order.inventory.code)}
                                  className="w-full md:w-auto bg-white text-black font-black px-8 py-4 rounded-xl hover:bg-cyan-400 transition-all flex items-center justify-center gap-3 shadow-xl"
                                >
                                  <Copy className="w-5 h-5" />
                                  <span>نسخ الكود</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 bg-red-500/5 border border-red-500/20 rounded-2xl">
                               <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                               <p className="text-red-400 font-bold">الكود لم يصدر بعد، يرجى التواصل مع الدعم</p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {order.platform?.website_url && (
                              <button
                                onClick={() => window.open(order.platform?.website_url, '_blank')}
                                className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-xl transition-all font-bold"
                              >
                                <ExternalLink className="w-5 h-5 text-cyan-400" />
                                رابط الاستخدام
                              </button>
                            )}
                            {order.platform?.tutorial_video_url && (
                              <button
                                onClick={() => window.open(order.platform?.tutorial_video_url, '_blank')}
                                className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-xl transition-all font-bold"
                              >
                                <Video className="w-5 h-5 text-red-500" />
                                فيديو الشرح
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center py-10">
                          <div className={`p-4 rounded-full mb-4 ${status.bg} ${status.color}`}>
                            <StatusIcon className="w-10 h-10" />
                          </div>
                          <h4 className={`text-xl font-black mb-2 ${status.color}`}>الطلب {status.text}</h4>
                          <p className="text-gray-400 max-w-sm">
                            {order.status === 'rejected' 
                              ? (order.admin_note || 'تم إلغاء طلبك من قبل الإدارة، يرجى مراسلتنا للاستفسار')
                              : 'نحن نقوم بمراجعة طلبك الآن، سيظهر الكود هنا فور الموافقة'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};