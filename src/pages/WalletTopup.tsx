import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { useWalletNotice } from '../hooks/useWalletNotice';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { PhoneInput } from '../components/PhoneInput';
import { showToast } from '../components/Toast';
import { notifyAdminNewTopup } from '../utils/notifications';
import { BottomNav } from '../components/BottomNav';
import { ArrowRight, Upload, X, CheckCircle, Clock, XCircle } from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  account_number: string;
  logo_url: string;
  is_active: boolean;
}

interface WalletTopup {
  id: string;
  amount: number;
  depositor_name: string;
  phone_number: string;
  receipt_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at: string | null;
  payment_method_id?: string;
  payment_method_name?: string;
  account_number?: string;
  payment_method_logo?: string;
}

export const WalletTopup = () => {
  const navigate = useNavigate();
  const { user } = useStore();
  const { data: notice, isLoading: noticeLoading } = useWalletNotice();
  const [loading, setLoading] = useState(false);
  const [topups, setTopups] = useState<WalletTopup[]>([]);
  const [loadingTopups, setLoadingTopups] = useState(true);

  // Payment methods
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');

  // Form state
  const [amount, setAmount] = useState('');
  const [depositorName, setDepositorName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentMethods();
    loadTopups();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const methods = Array.isArray(data) ? data : [];
      setPaymentMethods(methods);

      if (methods.length > 0) {
        setSelectedPaymentMethod(methods[0].id);
      } else {
        setSelectedPaymentMethod('');
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
      showToast('فشل تحميل طرق الدفع', 'error');
      setPaymentMethods([]);
      setSelectedPaymentMethod('');
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const loadTopups = async () => {
    if (!user?.id) {
      setLoadingTopups(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('get_user_wallet_topups', { p_user_id: user.id });

      if (error) throw error;
      setTopups(data || []);
    } catch (error) {
      console.error('Failed to load topups:', error);
    } finally {
      setLoadingTopups(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('يرجى رفع صورة بصيغة JPG أو PNG أو WEBP', 'error');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('حجم الملف يجب أن يكون أقل من 5 ميجابايت', 'error');
      return;
    }

    setReceiptFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPaymentMethod) {
      showToast('يرجى اختيار طريقة الدفع', 'error');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      showToast('يرجى إدخال مبلغ صحيح', 'error');
      return;
    }

    if (!depositorName.trim()) {
      showToast('يرجى إدخال اسم الدافع', 'error');
      return;
    }

    if (!phoneNumber.trim()) {
      showToast('يرجى إدخال رقم الهاتف', 'error');
      return;
    }

    if (!receiptFile) {
      showToast('يرجى رفع إيصال الدفع', 'error');
      return;
    }

    if (!user?.id) {
      showToast('يرجى تسجيل الدخول مرة أخرى', 'error');
      return;
    }

    setLoading(true);

    try {
      // Upload receipt to storage
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('wallet-receipts')
        .upload(fileName, receiptFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('wallet-receipts')
        .getPublicUrl(fileName);

      // Create wallet top-up request using RPC function
      const { data, error: rpcError } = await supabase
        .rpc('create_wallet_topup', {
          p_user_id: user.id,
          p_amount: parseFloat(amount),
          p_depositor_name: depositorName,
          p_phone_number: phoneNumber,
          p_receipt_url: publicUrl,
          p_payment_method_id: selectedPaymentMethod,
        });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        throw rpcError;
      }

      if (!data?.success) {
        showToast(data?.message || 'فشل إرسال طلب الشحن', 'error');
        return;
      }

      const topupId = (data as { topup?: { id?: string } })?.topup?.id;
      if (topupId) notifyAdminNewTopup(topupId);

      showToast('تم إرسال طلب الشحن بنجاح. سيتم مراجعته من قبل الإدارة.', 'success');

      // Reset form
      setAmount('');
      setDepositorName('');
      setPhoneNumber('');
      setReceiptFile(null);
      setReceiptPreview(null);

      // Reload topups
      loadTopups();
    } catch (error: any) {
      console.error('Error submitting topup:', error);
      if (error.message?.includes('5 طلبات')) {
        showToast('لديك 5 طلبات شحن معلقة. يرجى الانتظار حتى تتم معالجتها.', 'error');
      } else {
        showToast('فشل إرسال طلب الشحن', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'تمت الموافقة';
      case 'rejected':
        return 'مرفوض';
      default:
        return 'قيد الانتظار';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-500';
      case 'rejected':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  };

  const pendingCount = topups.filter(t => t.status === 'pending').length;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate('/wallet')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowRight className="w-5 h-5" />
          <span>العودة للمحفظة</span>
        </button>

        <h1 className="text-2xl font-bold mb-2">شحن المحفظة</h1>
        <p className="text-gray-400 mb-6">قم بشحن محفظتك لشراء المنتجات</p>

        {!noticeLoading && notice && (
          <div className="bg-blue-900/20 border border-blue-900 rounded-lg p-4 mb-6">
            <p className="text-blue-400 text-sm">{notice}</p>
          </div>
        )}

        {pendingCount >= 5 && (
          <div className="bg-yellow-900/20 border border-yellow-900 rounded-lg p-4 mb-6">
            <p className="text-yellow-400 text-sm">
              لديك 5 طلبات شحن معلقة. لا يمكنك إنشاء طلبات جديدة حتى تتم معالجة الطلبات الحالية.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-3">
                اختر طريقة الدفع
              </label>
              {loadingPaymentMethods ? (
                <div className="text-center text-gray-400 py-4">جاري التحميل...</div>
              ) : paymentMethods.length === 0 ? (
                <div className="text-center text-red-400 py-4">
                  لا توجد طرق دفع متاحة حالياً
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedPaymentMethod(method.id)}
                      disabled={loading || pendingCount >= 5}
                      className={`relative flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                        selectedPaymentMethod === method.id
                          ? 'border-white bg-gray-800'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                    >
                      {method.logo_url && (
                        <img
                          src={method.logo_url}
                          alt={method.name}
                          className="w-12 h-12 object-contain rounded"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/icon-72.png'; }}
                        />
                      )}
                      <div className="flex-1 text-right">
                        <p className="font-semibold text-white">{method.name}</p>
                        <p className="text-sm text-gray-400">{method.account_number}</p>
                      </div>
                      {selectedPaymentMethod === method.id && (
                        <CheckCircle className="w-6 h-6 text-white flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                المبلغ (MRU)
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                required
                min="1"
                step="0.01"
                disabled={loading || pendingCount >= 5}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                اسم الدافع
              </label>
              <Input
                type="text"
                value={depositorName}
                onChange={(e) => setDepositorName(e.target.value)}
                placeholder="الاسم الكامل"
                required
                disabled={loading || pendingCount >= 5}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                رقم الهاتف
              </label>
              <PhoneInput
                value={phoneNumber}
                onChange={setPhoneNumber}
                disabled={loading || pendingCount >= 5}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                إيصال الدفع
              </label>
              {!receiptPreview ? (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer hover:border-gray-600 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 text-gray-400 mb-3" />
                    <p className="mb-2 text-sm text-gray-400">
                      <span className="font-semibold">انقر لرفع الإيصال</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      JPG, PNG, WEBP (حد أقصى 5MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileChange}
                    disabled={loading || pendingCount >= 5}
                  />
                </label>
              ) : (
                <div className="relative">
                  <img
                    src={receiptPreview}
                    alt="Receipt Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveReceipt}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors"
                    disabled={loading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full mt-6"
            disabled={
              loading ||
              pendingCount >= 5 ||
              !selectedPaymentMethod ||
              paymentMethods.length === 0
            }
          >
            {loading ? 'جاري الإرسال...' : 'إرسال طلب الشحن'}
          </Button>
        </form>

        <div>
          <h2 className="text-xl font-bold mb-4">طلبات الشحن السابقة</h2>
          {loadingTopups ? (
            <div className="text-center text-gray-400 py-8">جاري التحميل...</div>
          ) : topups.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              لا توجد طلبات شحن سابقة
            </div>
          ) : (
            <div className="space-y-4">
              {topups.map((topup) => (
                <div
                  key={topup.id}
                  className="bg-gray-900 rounded-lg p-4 border border-gray-800"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xl font-bold text-white">
                        {topup.amount} MRU
                      </p>
                      <p className="text-sm text-gray-400">
                        {new Date(topup.created_at).toLocaleDateString('ar-MR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(topup.status)}
                      <span className={`text-sm font-medium ${getStatusColor(topup.status)}`}>
                        {getStatusText(topup.status)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    {topup.payment_method_name && (
                      <div className="flex items-center gap-3 pb-3 border-b border-gray-800">
                        {topup.payment_method_logo && (
                          <img
                            src={topup.payment_method_logo}
                            alt={topup.payment_method_name}
                            className="w-10 h-10 object-contain rounded"
                          />
                        )}
                        <div className="flex-1">
                          <p className="text-gray-500">طريقة الدفع</p>
                          <p className="text-white font-medium">{topup.payment_method_name}</p>
                          {topup.account_number && (
                            <p className="text-xs text-gray-400">{topup.account_number}</p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-gray-500">اسم الدافع</p>
                        <p className="text-white">{topup.depositor_name}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">رقم الهاتف</p>
                        <p className="text-white">{topup.phone_number}</p>
                      </div>
                    </div>
                  </div>
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
        </div>
      </div>
      <BottomNav />
    </div>
  );
};
