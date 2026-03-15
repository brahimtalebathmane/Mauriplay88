import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { showToast } from '../components/Toast';

export default function VerifyRecoveryOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const phoneNumber = location.state?.phone_number;
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  useEffect(() => {
    if (!phoneNumber) {
      navigate('/account-recovery');
      return;
    }

    inputRefs[0].current?.focus();
  }, [phoneNumber, navigate]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 4);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split('').concat(['', '', '', '']).slice(0, 4);
    setOtp(newOtp);

    const nextEmptyIndex = newOtp.findIndex(val => !val);
    if (nextEmptyIndex !== -1) {
      inputRefs[nextEmptyIndex].current?.focus();
    } else {
      inputRefs[3].current?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    const otpCode = otp.join('');
    if (otpCode.length !== 4) {
      showToast('يرجى إدخال الكود المكون من 4 أرقام', 'error');
      return;
    }

    if (failedAttempts >= 5) {
      showToast('لقد تجاوزت الحد الأقصى للمحاولات. يرجى طلب كود جديد', 'error');
      navigate('/account-recovery', { state: { phone_number: phoneNumber } });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('verify_recovery_otp', {
        p_phone_number: phoneNumber,
        p_code: otpCode
      });

      if (error) throw error;

      if (data?.success) {
        showToast('تم التحقق بنجاح', 'success');
        navigate('/reset-pin', {
          state: {
            phone_number: phoneNumber,
            from_recovery: true
          }
        });
      } else {
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);

        if (newFailedAttempts >= 5) {
          showToast('لقد تجاوزت الحد الأقصى للمحاولات. يرجى طلب كود جديد', 'error');
          setTimeout(() => {
            navigate('/account-recovery', { state: { phone_number: phoneNumber } });
          }, 2000);
        } else {
          showToast(
            `الكود غير صحيح. المحاولات المتبقية: ${5 - newFailedAttempts}`,
            'error'
          );
          setOtp(['', '', '', '']);
          inputRefs[0].current?.focus();
        }
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      showToast(error.message || 'حدث خطأ أثناء التحقق من الكود', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResendCode = () => {
    navigate('/account-recovery', { state: { phone_number: phoneNumber } });
  };

  if (timeLeft === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-red-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">انتهت صلاحية الكود</h2>
          <p className="text-gray-600 mb-6">الكود صالح لمدة 5 دقائق فقط</p>
          <Button onClick={handleResendCode} className="w-full">
            طلب كود جديد
            <ArrowRight className="mr-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          التحقق من كود الاسترجاع
        </h1>
        <p className="text-center text-gray-600 mb-2">
          تم إرسال كود مكون من 4 أرقام إلى واتساب
        </p>
        <p className="text-center text-sm text-gray-500 mb-8" dir="ltr">
          {phoneNumber}
        </p>

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
              أدخل كود التحقق
            </label>
            <div className="flex gap-3 justify-center" dir="ltr">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  disabled={loading}
                  className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-gray-100"
                />
              ))}
            </div>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
              <span className="text-sm text-gray-600">الوقت المتبقي:</span>
              <span className="text-lg font-bold text-blue-600" dir="ltr">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {failedAttempts > 0 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800 text-center">
                المحاولات الفاشلة: {failedAttempts} من 5
              </p>
            </div>
          )}

          <Button
            type="submit"
            loading={loading}
            disabled={otp.join('').length !== 4}
            className="w-full"
          >
            تأكيد الكود
            <ArrowRight className="mr-2 h-5 w-5" />
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={handleResendCode}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            طلب كود جديد
          </button>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm text-gray-700 text-right">
            <span className="font-semibold">تحذير:</span> بعد 5 محاولات فاشلة سيتم طلب كود جديد تلقائياً
          </p>
        </div>
      </div>
    </div>
  );
}
