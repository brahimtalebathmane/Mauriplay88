import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { showToast } from '../../components/Toast';
import { notifyUserTopupApproved } from '../../utils/notifications';
import { logger } from '../../utils/logger';
import { CheckCircle, XCircle, Eye, Search, CreditCard as Edit2, Save, X } from 'lucide-react';

interface WalletTopup {
  id: string;
  user_id: string;
  amount: number;
  depositor_name: string;
  phone_number: string;
  receipt_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  payment_method_id?: string;
  payment_method_name?: string;
  account_number?: string;
  payment_method_logo?: string;
  user?: {
    phone_number: string;
  };
}

export const WalletTopups = () => {
  const { user } = useStore();
  const [topups, setTopups] = useState<WalletTopup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [searchPhone, setSearchPhone] = useState('');
  const [editingNotice, setEditingNotice] = useState(false);
  const [notice, setNotice] = useState('');
  const [originalNotice, setOriginalNotice] = useState('');

  const loadTopupsRef = useRef<() => Promise<void>>(async () => {});

  const loadNotice = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'wallet_notice')
        .maybeSingle();

      if (error) throw error;
      const noticeValue = data?.value || 'يرجى التأكد من رفع إيصال الدفع الصحيح. سيتم مراجعة طلبك من قبل الإدارة.';
      setNotice(noticeValue);
      setOriginalNotice(noticeValue);
    } catch (error) {
      console.error('Failed to load notice:', error);
    }
  };

  const saveNotice = async () => {
    try {
      // استخدام RPC لتجاوز قيود الـ RLS المباشرة على الجدول
      const { data, error } = await supabase.rpc('save_app_setting', { 
        p_admin_phone: user?.phone_number,
        p_key: 'wallet_notice', 
        p_value: notice 
      });

      if (error) throw error;

      if (data?.success) {
        showToast('تم حفظ الإشعار بنجاح', 'success');
        setOriginalNotice(notice);
        setEditingNotice(false);
      } else {
        showToast(data?.message || 'فشل حفظ الإشعار', 'error');
      }
    } catch (error: any) {
      console.error('Failed to save notice:', error);
      showToast('فشل حفظ الإشعار - تأكد من صلاحيات الأدمن', 'error');
    }
  };

  const cancelEditNotice = () => {
    setNotice(originalNotice);
    setEditingNotice(false);
  };

  const loadTopups = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // RPC expects: p_admin_id (uuid), p_status (text | null), p_search_phone (text | null)
      const params: {
        p_admin_id: string;
        p_status: string | null;
        p_search_phone: string | null;
      } = {
        p_admin_id: user.id,
        p_status: filter === 'all' ? null : filter,
        p_search_phone: searchPhone?.trim() ? searchPhone.trim() : null,
      };
      const { data, error } = await supabase.rpc('get_all_wallet_topups', params);

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      const transformedData = (data || []).map((item: any) => ({
        ...item,
        user: {
          phone_number: item.user_phone_number
        }
      }));

      setTopups(transformedData);
    } catch (error: any) {
      console.error('Failed to load topups:', error);
      showToast('فشل تحميل طلبات الشحن', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id, filter, searchPhone]);

  loadTopupsRef.current = loadTopups;

  useEffect(() => {
    void loadNotice();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    void loadTopups();

    const channel = supabase
      .channel(`admin-wallet-topups-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_topups',
        },
        () => {
          void loadTopupsRef.current();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          logger.debug('AdminWalletTopups', 'realtime subscribed');
          void loadTopupsRef.current();
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.warn('AdminWalletTopups', `realtime ${status}`, err);
          void loadTopupsRef.current();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, filter, searchPhone, loadTopups]);

  const handleApprove = async (topupId: string) => {
    try {
      const { data, error } = await supabase.rpc('approve_wallet_topup', {
        p_topup_id: topupId,
        p_admin_id: user?.id,
      });

      if (error) throw error;

      const result = data as { success?: boolean; message?: string } | null;
      if (result?.success) {
        const topup = topups.find((t) => t.id === topupId);
        if (topup?.user_id) notifyUserTopupApproved(topup.user_id, topup.amount);
        showToast('تمت الموافقة على طلب الشحن', 'success');
        loadTopups();
      } else {
        showToast(result?.message || 'فشلت الموافقة', 'error');
      }
    } catch (error: any) {
      showToast(error?.message || 'فشلت الموافقة', 'error');
    }
  };

  const handleReject = async (topupId: string) => {
    const reason = prompt('سبب الرفض (اختياري):');

    try {
      const { data, error } = await supabase.rpc('reject_wallet_topup', {
        p_topup_id: topupId,
        p_admin_id: user?.id,
        p_reason: reason || null,
      });

      if (error) throw error;

      const result = data as { success?: boolean; message?: string } | null;
      if (result?.success) {
        showToast('تم رفض طلب الشحن', 'success');
        loadTopups();
      } else {
        showToast(result?.message || 'فشل الرفض', 'error');
      }
    } catch (error: any) {
      showToast(error?.message || 'فشل الرفض', 'error');
    }
  };

  const pendingCount = topups.filter(t => t.status === 'pending').length;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">إشعار شحن المحفظة</h2>
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          {editingNotice ? (
            <div className="space-y-3">
              <textarea
                value={notice}
                onChange={(e) => setNotice(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-white focus:outline-none min-h-[100px]"
                placeholder="أدخل نص الإشعار"
              />
              <div className="flex gap-2">
                <Button onClick={saveNotice} className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  <span>حفظ</span>
                </Button>
                <Button onClick={cancelEditNotice} variant="danger" className="flex items-center gap-2">
                  <X className="w-4 h-4" />
                  <span>إلغاء</span>
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-300 mb-3">{notice}</p>
              <Button onClick={() => setEditingNotice(true)} className="flex items-center gap-2">
                <Edit2 className="w-4 h-4" />
                <span>تعديل الإشعار</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            placeholder="بحث برقم الهاتف..."
            className="pr-12"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { value: 'pending', label: `قيد الانتظار (${pendingCount})` },
          { value: 'approved', label: 'موافق عليها' },
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
        <div className="text-center text-gray-400 py-12">جاري التحميل...</div>
      ) : topups.length === 0 ? (
        <div className="text-center text-gray-400 py-12">لا توجد طلبات شحن</div>
      ) : (
        <div className="space-y-4">
          {topups.map((topup) => (
            <div
              key={topup.id}
              className="bg-gray-900 rounded-lg p-6 border border-gray-800"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">المبلغ</p>
                  <p className="text-white text-xl font-bold">{topup.amount} MRU</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">رقم هاتف المستخدم</p>
                  <p className="text-white">{topup.user?.phone_number || 'غير متوفر'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">اسم الدافع</p>
                  <p className="text-white">{topup.depositor_name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">رقم هاتف الدافع</p>
                  <p className="text-white">{topup.phone_number}</p>
                </div>
              </div>

              {topup.payment_method_name && (
                <div className="mb-4 pb-4 border-b border-gray-800">
                  <p className="text-gray-400 text-sm mb-2">طريقة الدفع المستخدمة</p>
                  <div className="flex items-center gap-3">
                    {topup.payment_method_logo && (
                      <img
                        src={topup.payment_method_logo}
                        alt={topup.payment_method_name}
                        className="w-12 h-12 object-contain rounded bg-gray-800 p-1"
                      />
                    )}
                    <div>
                      <p className="text-white font-semibold">{topup.payment_method_name}</p>
                      {topup.account_number && (
                        <p className="text-sm text-gray-400">{topup.account_number}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-2">تاريخ الطلب</p>
                <p className="text-white">
                  {new Date(topup.created_at).toLocaleDateString('ar-MR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {topup.receipt_url && (
                <div className="mb-4">
                  <p className="text-gray-400 text-sm mb-2">إيصال الدفع</p>
                  <button
                    onClick={() => setSelectedReceipt(topup.receipt_url)}
                    className="relative group"
                  >
                    <img
                      src={topup.receipt_url}
                      alt="Payment Receipt"
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-700 group-hover:border-white transition-colors"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <Eye className="w-8 h-8 text-white" />
                    </div>
                  </button>
                </div>
              )}

              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-1">الحالة</p>
                <p className={`font-medium ${
                  topup.status === 'approved' ? 'text-green-500' :
                  topup.status === 'rejected' ? 'text-red-500' :
                  'text-yellow-500'
                }`}>
                  {topup.status === 'approved' ? 'تمت الموافقة' :
                   topup.status === 'rejected' ? 'مرفوض' :
                   'قيد الانتظار'}
                </p>
              </div>

              {topup.status === 'pending' && (
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleApprove(topup.id)}
                    className="flex-1"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>موافقة</span>
                    </div>
                  </Button>
                  <Button
                    onClick={() => handleReject(topup.id)}
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

              {topup.approved_at && (
                <p className="text-xs text-gray-500 mt-3">
                  تمت المعالجة في:{' '}
                  {new Date(topup.approved_at).toLocaleDateString('ar-MR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
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