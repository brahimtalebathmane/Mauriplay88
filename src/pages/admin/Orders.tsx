import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { Button } from '../../components/Button';
import { SkeletonList } from '../../components/LoadingScreen';
import { showToast } from '../../components/Toast';
import { notifyUserOrderApproved } from '../../utils/notifications';
import { CheckCircle, XCircle, Eye } from 'lucide-react';

export const Orders = () => {
  const { user } = useStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  const loadOrdersRef = useRef<() => Promise<void>>(async () => {});

  const loadOrders = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_orders', {
        p_admin_id: user.id,
        p_status: filter !== 'all' ? filter : null,
      });

      if (error) throw error;
      const rows = (data || []) as Array<{
        id: string;
        user_id: string | null;
        product_id: string | null;
        inventory_id: string | null;
        price_at_purchase: number;
        payment_type: string;
        payment_method_name: string | null;
        user_payment_number: string | null;
        user_name: string | null;
        receipt_url: string | null;
        transaction_reference: string | null;
        status: string;
        admin_note: string | null;
        created_at: string;
        updated_at: string;
        user_phone_number: string | null;
        product_name: string | null;
        inventory_code: string | null;
      }>;
      setOrders(
        rows.map((o) => ({
          ...o,
          user: { phone_number: o.user_phone_number ?? '' },
          product: { name: o.product_name ?? 'منتج محذوف' },
          inventory: { code: o.inventory_code ?? '' },
        }))
      );
    } catch (error: any) {
      showToast('فشل تحميل الطلبات', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id, filter]);

  loadOrdersRef.current = loadOrders;

  useEffect(() => {
    if (!user?.id) return;

    void loadOrders();

    const channel = supabase
      .channel(`admin-orders-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          void loadOrdersRef.current();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
        },
        () => {
          void loadOrdersRef.current();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void loadOrdersRef.current();
        }
        if (status === 'CHANNEL_ERROR') {
          void loadOrdersRef.current();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, filter, loadOrders]);

  const handleApprove = async (orderId: string) => {
    try {
      const { data, error } = await supabase.rpc('approve_manual_order', {
        p_order_id: orderId,
        p_admin_id: user?.id,
      });

      if (error) throw error;

      const result = data as { success?: boolean; message?: string } | null;
      if (result?.success) {
        const orderRow = orders.find((o) => o.id === orderId);
        if (orderRow?.user_id) notifyUserOrderApproved(orderRow.user_id);
        showToast('تمت الموافقة على الطلب', 'success');
        loadOrders();
      } else {
        showToast(result?.message || 'فشلت الموافقة', 'error');
      }
    } catch (error: any) {
      showToast(error?.message || 'فشلت الموافقة', 'error');
    }
  };

  const handleReject = async (orderId: string) => {
    const note = prompt('سبب الرفض:');
    if (!note) return;

    try {
      const { data, error } = await supabase.rpc('reject_manual_order', {
        p_order_id: orderId,
        p_admin_id: user?.id,
        p_admin_note: note,
      });

      if (error) throw error;

      const result = data as { success?: boolean; message?: string } | null;
      if (result?.success) {
        showToast('تم رفض الطلب', 'success');
        loadOrders();
      } else {
        showToast(result?.message || 'فشل الرفض', 'error');
      }
    } catch (error: any) {
      showToast(error?.message || 'فشل الرفض', 'error');
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { value: 'pending', label: 'قيد الانتظار' },
          { value: 'approved', label: 'مكتملة' },
          { value: 'rejected', label: 'مرفوضة' },
          { value: 'all', label: 'الكل' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as any)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              filter === f.value
                ? 'bg-white text-black'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList count={5} />
      ) : orders.length === 0 ? (
        <div className="text-center text-gray-400 py-12">لا توجد طلبات</div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-gray-900 rounded-lg p-6 border border-gray-800"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">المنتج</p>
                  <p className="text-white">{order.product?.name || 'منتج محذوف'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">رقم الهاتف</p>
                  <p className="text-white">{order.user?.phone_number || 'غير متوفر'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">السعر</p>
                  <p className="text-white">{order.price_at_purchase} MRU</p>
                </div>
              </div>

              {order.payment_type === 'manual' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-800 rounded">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">وسيلة الدفع</p>
                    <p className="text-white">{order.payment_method_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">رقم الدفع</p>
                    <p className="text-white font-mono">{order.user_payment_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">اسم الدافع</p>
                    <p className="text-white">{order.user_name}</p>
                  </div>
                  {order.receipt_url && (
                    <div>
                      <p className="text-gray-400 text-sm mb-2">إيصال الدفع</p>
                      <button
                        onClick={() => setSelectedReceipt(order.receipt_url)}
                        className="relative group"
                      >
                        <img
                          src={order.receipt_url}
                          alt="Payment Receipt"
                          className="w-full h-32 object-cover rounded-lg border-2 border-gray-700 group-hover:border-white transition-colors"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <Eye className="w-8 h-8 text-white" />
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {order.status === 'pending' && (
                <div className="flex gap-3 mt-4">
                  <Button
                    onClick={() => handleApprove(order.id)}
                    className="flex-1"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>موافقة</span>
                    </div>
                  </Button>
                  <Button
                    onClick={() => handleReject(order.id)}
                    variant="danger"
                    className="flex-1"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <XCircle className="w-4 h-4" />
                      <span>رفض</span>
                    </div>
                  </Button>
                </div>
              )}

              {order.status === 'rejected' && order.admin_note && (
                <div className="mt-4 p-4 bg-red-900/20 border border-red-900 rounded">
                  <p className="text-red-400 text-sm">{order.admin_note}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedReceipt && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedReceipt(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <XCircle className="w-8 h-8" />
            </button>
            <img
              src={selectedReceipt}
              alt="Receipt Full View"
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
