import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { PhoneInput } from '../components/PhoneInput';
import { showToast } from '../components/Toast';

export default function AccountRecovery() {
  const navigate = useNavigate();
  const location = useLocation();
  const [phoneNumber, setPhoneNumber] = useState(location.state?.phone_number || '');
  const [loading, setLoading] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleSendRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      showToast('يرجى إدخال رقم الهاتف', 'error');
      return;
    }

    if (!canResend) {
      showToast(`يرجى الانتظار ${countdown} ثانية`, 'error');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('send_recovery_otp', {
        p_phone_number: phoneNumber
      });

      if (error) throw error;

      if (data?.success) {
        const otpCode = data.code;
        const whatsappNumber = phoneNumber.replace(/^222/, '');
        const message = `كود استرجاع حسابك في MauriPlay هو: ${otpCode}\nالكود صالح لمدة 5 دقائق.`;
        const whatsappUrl = `https://api.ultramsg.com/${import.meta.env.VITE_ULTRAMSG_INSTANCE_ID}/messages/chat`;

        try {
          await fetch(whatsappUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: import.meta.env.VITE_ULTRAMSG_TOKEN,
              to: `222${whatsappNumber}@c.us`,
              body: message
            })
          });
        } catch (whatsappError) {
          console.error('WhatsApp send error:', whatsappError);
        }

        showToast('تم إرسال كود الاسترجاع إلى واتساب', 'success');
        setCanResend(false);
        setCountdown(60);

        navigate('/verify-recovery', {
          state: {
            phone_number: phoneNumber,
            from_recovery: true
          }
        });
      } else {
        showToast(data?.message || 'حدث خطأ أثناء إرسال الكود', 'error');
      }
    } catch (error: any) {
      console.error('Recovery error:', error);
      showToast(error.message || 'حدث خطأ أثناء إرسال كود الاسترجاع', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
            <Shield className="w-10 h-10 text-orange-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          استرجاع الحساب
        </h1>
        <p className="text-center text-gray-600 mb-8">
          تم إيقاف حسابك مؤقتاً بسبب محاولات تسجيل دخول خاطئة
        </p>

        <form onSubmit={handleSendRecoveryCode} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              رقم الهاتف
            </label>
            <PhoneInput
              value={phoneNumber}
              onChange={setPhoneNumber}
              placeholder="22249827331"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            loading={loading}
            disabled={!canResend && countdown > 0}
            className="w-full"
          >
            {canResend ? (
              <>
                إرسال كود الاسترجاع
                <ArrowRight className="mr-2 h-5 w-5" />
              </>
            ) : (
              `إعادة الإرسال بعد ${countdown} ثانية`
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            العودة إلى تسجيل الدخول
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700 text-right">
            <span className="font-semibold">ملاحظة:</span> سيتم إرسال كود مكون من 4 أرقام إلى واتساب. الكود صالح لمدة 5 دقائق فقط.
          </p>
        </div>
      </div>
    </div>
  );
}
