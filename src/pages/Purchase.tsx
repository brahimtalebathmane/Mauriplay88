import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { LoadingScreen } from '../components/LoadingScreen';
import { PurchaseSuccessModal } from '../components/PurchaseSuccessModal';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import type { Product, PaymentMethod } from '../types';
import { showToast } from '../components/Toast';
import { logger } from '../utils/logger';
import { Wallet, CreditCard, Upload, X, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight, MessageCircle } from 'lucide-react';

export const Purchase = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, updateWalletBalance } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [paymentType, setPaymentType] = useState<'wallet' | 'manual'>('wallet');

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [userName, setUserName] = useState('');
  const [userPaymentNumber, setUserPaymentNumber] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [purchaseData, setPurchaseData] = useState<{
    code: string;
    productName: string;
    platformName: string;
    platformLogoUrl?: string;
    platformWebsiteUrl?: string;
    platformTutorialVideoUrl?: string;
  } | null>(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      const [productRes, methodsRes] = await Promise.all([
        supabase.from('products').select('*').eq('id', id).eq('is_deleted', false).single(),
        supabase.from('payment_methods').select('*').eq('is_active', true).order('name'),
      ]);

      if (productRes.error) throw productRes.error;
      setProduct(productRes.data);
      setPaymentMethods(methodsRes.data || []);
      if (methodsRes.data && methodsRes.data.length > 0) setSelectedMethod(methodsRes.data[0]);
    } catch (error: any) {
      showToast('فشل تحميل البيانات', 'error');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleWalletPurchase = async () => {
    if (!user || !product) return;

    logger.info('Purchase', 'Wallet purchase initiated', {
      userId: user.id,
      productId: product.id,
      productName: product.name,
      price: product.price_mru
    });

    setPurchasing(true);
    try {
      logger.debug('Purchase', 'Calling create_wallet_purchase RPC');
      const { data, error } = await supabase.rpc('create_wallet_purchase', {
        p_user_id: user.id,
        p_product_id: product.id,
      });

      if (error) {
        logger.error('Purchase', 'Wallet purchase RPC error', error);
        throw error;
      }

      logger.debug('Purchase', 'Purchase response received', data);

      if (data.success) {
        logger.success('Purchase', 'Wallet purchase successful', {
          code: data.code,
          productName: data.product_name
        });

        updateWalletBalance(user.wallet_balance - product.price_mru);

        setPurchaseData({
          code: data.code,
          productName: data.product_name,
          platformName: data.platform_name,
          platformLogoUrl: data.platform_logo_url,
          platformWebsiteUrl: data.platform_website_url,
          platformTutorialVideoUrl: data.platform_tutorial_video_url,
        });

        setShowSuccessModal(true);
        showToast('تمت عملية الشراء بنجاح', 'success');
      } else {
        logger.warn('Purchase', 'Wallet purchase failed', { message: data.message });
        showToast(data.message, 'error');
      }
    } catch (error: any) {
      logger.error('Purchase', 'Wallet purchase error', error);
      showToast(error.message || 'فشلت عملية الشراء', 'error');
    } finally {
      setPurchasing(false);
      logger.debug('Purchase', 'Wallet purchase attempt completed');
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    navigate('/my-purchases');
  };

  const handleManualPurchase = async () => {
    if (!user || !product || !selectedMethod || !userName || !userPaymentNumber) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    if (!receipt) {
      showToast('يرجى رفع إيصال الدفع', 'error');
      return;
    }

    setPurchasing(true);
    try {
      const transactionReference = `MAN-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      const { data, error } = await supabase.rpc('create_manual_purchase', {
        p_user_id: user.id,
        p_product_id: product.id,
        p_payment_method_name: selectedMethod.name,
        p_user_payment_number: userPaymentNumber,
        p_user_name: userName,
        p_transaction_reference: transactionReference,
      });

      if (error) throw error;

      if (data.success) {
        await uploadReceipt(data.order_id);
        showToast('تم إنشاء الطلب بنجاح. يرجى انتظار الموافقة', 'success');
        navigate('/my-purchases');
      } else {
        showToast(data.message, 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'فشل إنشاء الطلب', 'error');
    } finally {
      setPurchasing(false);
    }
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('حجم الملف كبير جداً (الأقصى 5MB)', 'error');
        return;
      }
      setReceipt(file);
      const reader = new FileReader();
      reader.onloadend = () => setReceiptPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadReceipt = async (orderId: string) => {
    if (!receipt || !user?.id) return;
    try {
      const fileExt = receipt.name.split('.').pop();
      const fileName = `${orderId}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, receipt);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);
      const { data: rpcData, error: rpcError } = await supabase.rpc('update_order_receipt', {
        p_user_id: user.id,
        p_order_id: orderId,
        p_receipt_url: publicUrl,
      });
      if (rpcError) throw rpcError;
      if (rpcData && !(rpcData as { success?: boolean }).success) {
        console.error('Receipt attach failed:', (rpcData as { message?: string }).message);
      }
    } catch (error) {
      console.error('Receipt upload failed', error);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!product) return null;

  const hasBalance = (user?.wallet_balance || 0) >= product.price_mru;

  return (
    <>
      {purchaseData && (
        <PurchaseSuccessModal
          isOpen={showSuccessModal}
          onClose={handleCloseSuccessModal}
          code={purchaseData.code}
          productName={purchaseData.productName}
          platformName={purchaseData.platformName}
          platformLogoUrl={purchaseData.platformLogoUrl}
          platformWebsiteUrl={purchaseData.platformWebsiteUrl}
          platformTutorialVideoUrl={purchaseData.platformTutorialVideoUrl}
        />
      )}

      <div className="min-h-screen bg-[#050505] text-white">
        <Header />
        <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowRight className="w-5 h-5" />
          <span>العودة</span>
        </button>

        {/* ملخص المنتج */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-[#111] border border-white/10 rounded-[2.5rem] p-8 mb-8 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-gray-400 text-sm font-black uppercase tracking-[0.3em] mb-2">Order Summary</h2>
            <h1 className="text-3xl font-black mb-4">{product.name}</h1>
            <div className="px-6 py-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl">
               <span className="text-4xl font-black text-cyan-400">{product.price_mru}</span>
               <span className="text-sm font-bold text-cyan-600 mr-2 uppercase">MRU</span>
            </div>
          </div>
        </div>

        {/* اختيار وسيلة الدفع */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-2 flex mb-8">
          <button
            onClick={() => setPaymentType('wallet')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all ${
              paymentType === 'wallet' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'
            }`}
          >
            <Wallet className="w-5 h-5" /> المحفظة
          </button>
          <button
            onClick={() => setPaymentType('manual')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all ${
              paymentType === 'manual' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'
            }`}
          >
            <CreditCard className="w-5 h-5" /> دفع مباشر
          </button>
        </div>

        {paymentType === 'wallet' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className={`p-8 rounded-[2rem] border-2 text-center transition-all ${
              hasBalance ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
            }`}>
              <div className="mb-4 flex justify-center">
                {hasBalance ? (
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                ) : (
                  <AlertCircle className="w-12 h-12 text-red-500" />
                )}
              </div>
              <p className="text-gray-400 mb-1">رصيدك الحالي</p>
              <p className="text-2xl font-black mb-4">{user?.wallet_balance || 0} MRU</p>

              {!hasBalance && (
                <p className="text-red-500 text-sm font-bold">عذراً، رصيدك لا يكفي لإتمام هذه العملية</p>
              )}
            </div>

            {!user?.wallet_active ? (
              <div className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 text-center">
                  <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                  <p className="text-yellow-500 font-bold mb-2">المحفظة غير مفعلة</p>
                  <p className="text-gray-400 text-sm">
                    يجب تفعيل المحفظة للاستفادة من الشراء السريع
                  </p>
                </div>
                <Button
                  onClick={() => window.open('https://wa.me/22249827331', '_blank')}
                  className="w-full py-6 rounded-2xl text-xl font-black bg-[#25D366] hover:bg-[#20ba5a] text-black shadow-[0_20px_40px_rgba(37,211,102,0.2)]"
                >
                  <div className="flex items-center justify-center gap-3">
                    <MessageCircle className="w-6 h-6 fill-current" />
                    <span>تواصل مع الإدارة للتفعيل</span>
                  </div>
                </Button>
              </div>
            ) : (
              <>
                <Button
                  onClick={handleWalletPurchase}
                  loading={purchasing}
                  disabled={!hasBalance}
                  className="w-full py-6 rounded-2xl text-xl font-black shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
                >
                  تأكيد الدفع الفوري
                </Button>

                <p className="text-center text-gray-500 text-xs flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> دفع آمن ومشفر 100%
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            {/* قائمة الحسابات */}
            {paymentMethods.length === 0 ? (
              <div className="text-center text-red-400 py-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                لا توجد طرق دفع متاحة حالياً
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method)}
                  className={`relative p-5 rounded-2xl border-2 transition-all ${
                    selectedMethod?.id === method.id
                    ? 'border-cyan-500 bg-cyan-500/5'
                    : 'border-white/5 bg-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {method.logo_url ? (
                      <div className="w-16 h-16 bg-black rounded-xl border border-white/10 p-2 flex-shrink-0">
                        <img
                          src={method.logo_url}
                          alt={method.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl font-black text-cyan-400">
                          {method.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 text-right">
                      <p className="text-white font-bold mb-1">{method.name}</p>
                      <p className="text-sm font-mono text-gray-400">{method.account_number}</p>
                    </div>
                  </div>
                  {selectedMethod?.id === method.id && (
                    <div className="absolute top-2 left-2">
                      <CheckCircle2 className="w-5 h-5 text-cyan-500" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            )}

            <div className="space-y-4">
              <Input
                label="اسم المودع (كما في التطبيق)"
                placeholder="أدخل اسمك الكامل"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
              <Input
                label="رقم الهاتف المستخدم للدفع"
                placeholder="0000 00 00"
                value={userPaymentNumber}
                onChange={(e) => setUserPaymentNumber(e.target.value)}
                required
                dir="ltr"
              />
            </div>

            {/* رفع الإيصال */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-400 block px-1 text-right">صورة الإيصال (تأكيد الدفع)</label>
              {receiptPreview ? (
                <div className="relative group rounded-[2rem] overflow-hidden border-2 border-cyan-500/30">
                  <img src={receiptPreview} alt="Receipt" className="w-full h-64 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => { setReceipt(null); setReceiptPreview(null); }}
                      className="bg-red-600 p-3 rounded-full hover:scale-110 transition-transform"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/10 rounded-[2rem] bg-white/5 cursor-pointer hover:bg-white/10 hover:border-cyan-500/40 transition-all group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 text-gray-500 group-hover:text-cyan-500 mb-3 transition-colors" />
                    <p className="text-sm text-gray-400 font-bold">اضغط لرفع صورة الإيصال</p>
                    <p className="text-[10px] text-gray-600 uppercase mt-1">JPG, PNG up to 5MB</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleReceiptChange} />
                </label>
              )}
            </div>

            <Button
              onClick={handleManualPurchase}
              loading={purchasing}
              disabled={
                purchasing ||
                !selectedMethod ||
                !userName.trim() ||
                !userPaymentNumber.trim() ||
                !receipt
              }
              className="w-full py-6 rounded-2xl text-xl font-black"
            >
              إرسال الطلب للمراجعة
            </Button>
          </div>
        )}
        </div>
      </div>
    </>
  );
};