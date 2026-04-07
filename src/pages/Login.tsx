import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { PhoneInput } from '../components/PhoneInput';
import { Input } from '../components/Input';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { showToast } from '../components/Toast';
import { sanitizePhoneNumber, validateMauritanianPhone } from '../utils/phoneNumber';
import { logger } from '../utils/logger';
import { establishSupabaseAuthSession } from '../lib/session';

export const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useStore();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPhone = sanitizePhoneNumber(phone);

    logger.info('Login', 'Login attempt started', { phone: fullPhone });

    if (!validateMauritanianPhone(fullPhone)) {
      logger.warn('Login', 'Invalid phone number format', { phone: fullPhone });
      showToast('رقم الهاتف غير صحيح', 'error');
      return;
    }

    setLoading(true);

    try {
      logger.debug('Login', 'Calling verify_user_login RPC');
      const { data, error } = await supabase.rpc('verify_user_login', {
        p_phone_number: fullPhone,
        p_pin: pin,
      });

      if (error) {
        logger.error('Login', 'RPC error', error);
        throw error;
      }

      logger.debug('Login', 'Login response received', data);

      if (data.success) {
        logger.success('Login', 'Login successful', { userId: data.user.id, role: data.user.role });
        setUser(data.user);
        void establishSupabaseAuthSession(fullPhone, pin);
        showToast('تم تسجيل الدخول بنجاح', 'success');

        if (data.user.role === 'admin') {
          logger.info('Login', 'Redirecting to admin dashboard');
          navigate('/admin');
        } else {
          logger.info('Login', 'Redirecting to home');
          navigate('/');
        }
      } else if (data.account_locked) {
        logger.warn('Login', 'Account locked', { phone: fullPhone });
        showToast(data.message || 'تم إيقاف حسابك مؤقتاً', 'error');
        navigate('/account-recovery', {
          state: { phone_number: fullPhone }
        });
      } else if (data.require_verification) {
        logger.info('Login', 'Phone verification required', { phone: fullPhone });
        localStorage.setItem('pending_phone', fullPhone);
        localStorage.setItem('temp_pin', pin);
        showToast('يرجى التحقق من رقم الهاتف أولاً', 'error');

        try {
          logger.debug('Login', 'Sending OTP for verification');
          await supabase.functions.invoke('send-otp', {
            body: { phone_number: fullPhone },
          });
          logger.success('Login', 'OTP sent successfully');
          navigate('/verify-otp');
        } catch (otpError) {
          logger.error('Login', 'Failed to send OTP', otpError);
          showToast('فشل إرسال رمز التحقق. يرجى المحاولة مرة أخرى', 'error');
        }
      } else if (data.require_otp) {
        logger.info('Login', 'OTP verification required (failed login attempts)', { phone: fullPhone });
        localStorage.setItem('pending_phone', fullPhone);
        localStorage.setItem('temp_pin', pin);
        showToast('يرجى التحقق من هويتك عبر رمز OTP', 'error');

        try {
          logger.debug('Login', 'Sending OTP for account unlock');
          await supabase.functions.invoke('send-otp', {
            body: { phone_number: fullPhone },
          });
          logger.success('Login', 'OTP sent successfully');
          navigate('/verify-otp');
        } catch (otpError) {
          logger.error('Login', 'Failed to send OTP', otpError);
          showToast('فشل إرسال رمز التحقق. يرجى المحاولة مرة أخرى', 'error');
        }
      } else {
        logger.warn('Login', 'Login failed', { remainingAttempts: data.remaining_attempts });
        const message = data.remaining_attempts
          ? `رمز PIN غير صحيح. ${data.remaining_attempts} محاول${data.remaining_attempts === 1 ? 'ة' : 'ات'} متبقية`
          : data.message;
        showToast(message, 'error');
      }
    } catch (error: any) {
      logger.error('Login', 'Login error', error);
      showToast(error.message || 'حدث خطأ أثناء تسجيل الدخول', 'error');
    } finally {
      setLoading(false);
      logger.debug('Login', 'Login attempt completed');
    }
  };

  return (
    <div className="min-h-screen bg-page flex flex-col items-center justify-center px-page-x py-12">
      <img
        src="https://i.postimg.cc/VJ87tfYs/image.png"
        alt="MauriPlay"
        className="h-16 sm:h-20 mb-8 sm:mb-12"
      />
      <div className="w-full max-w-content-narrow">
        <h1 className="text-white text-page-title sm:text-3xl font-bold text-center mb-section">
          تسجيل الدخول
        </h1>
        <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
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

          <p className="text-center text-gray-500 text-caption mt-6">
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