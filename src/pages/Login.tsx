import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { PhoneInput } from '../components/PhoneInput';
import { Input } from '../components/Input';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { showToast } from '../components/Toast';
import { sanitizePhoneNumber, validateMauritanianPhone } from '../utils/phoneNumber';

export const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useStore();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPhone = sanitizePhoneNumber(phone);

    if (!validateMauritanianPhone(fullPhone)) {
      showToast('رقم الهاتف غير صحيح', 'error');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('verify_user_login', {
        p_phone_number: fullPhone,
        p_pin: pin,
      });

      if (error) throw error;

      if (data.success) {
        setUser(data.user);
        showToast('تم تسجيل الدخول بنجاح', 'success');

        if (data.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else if (data.account_locked) {
        showToast(data.message || 'تم إيقاف حسابك مؤقتاً', 'error');
        navigate('/account-recovery', {
          state: { phone_number: fullPhone }
        });
      } else if (data.require_verification) {
        localStorage.setItem('pending_phone', fullPhone);
        localStorage.setItem('temp_pin', pin);
        showToast('يرجى التحقق من رقم الهاتف أولاً', 'error');

        try {
          await supabase.functions.invoke('send-otp', {
            body: { phone_number: fullPhone },
          });
          navigate('/verify-otp');
        } catch (otpError) {
          showToast('فشل إرسال رمز التحقق. يرجى المحاولة مرة أخرى', 'error');
        }
      } else if (data.require_otp) {
        localStorage.setItem('pending_phone', fullPhone);
        localStorage.setItem('temp_pin', pin);
        showToast('يرجى التحقق من هويتك عبر رمز OTP', 'error');

        try {
          await supabase.functions.invoke('send-otp', {
            body: { phone_number: fullPhone },
          });
          navigate('/verify-otp');
        } catch (otpError) {
          showToast('فشل إرسال رمز التحقق. يرجى المحاولة مرة أخرى', 'error');
        }
      } else {
        const message = data.remaining_attempts
          ? `رمز PIN غير صحيح. ${data.remaining_attempts} محاول${data.remaining_attempts === 1 ? 'ة' : 'ات'} متبقية`
          : data.message;
        showToast(message, 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء تسجيل الدخول', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      {/* الشعار بخلفية سوداء نقية */}
      <img
        src="https://i.postimg.cc/VJ87tfYs/image.png"
        alt="MauriPlay"
        className="h-20 mb-12"
      />

      <div className="w-full max-w-md">
        <h1 className="text-white text-3xl font-bold text-center mb-8">
          تسجيل الدخول
        </h1>

        <form onSubmit={handleLogin} className="space-y-6">
          <PhoneInput
            label="رقم الهاتف"
            value={phone}
            onChange={setPhone}
            required
            autoComplete="tel"
          />

          <Input
            label="الرمز السري (PIN)"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="****"
            required
            maxLength={6}
            inputMode="numeric"
            autoComplete="current-password"
          />

          <Button type="submit" loading={loading}>
            تسجيل الدخول
          </Button>

          <p className="text-center text-gray-400 text-sm">
            ليس لديك حساب؟{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-white hover:underline"
            >
              إنشاء حساب جديد
            </button>
          </p>

          <p className="text-center text-gray-500 text-xs mt-4">
            بتسجيل الدخول، أنت توافق على{' '}
            <button
              type="button"
              onClick={() => navigate('/privacy-policy')}
              className="text-cyan-400 hover:text-cyan-300 transition-colors underline"
            >
              سياسة الخصوصية
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};