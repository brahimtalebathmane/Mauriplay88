import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { PhoneInput } from '../components/PhoneInput';
import { Input } from '../components/Input';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';
import { sanitizePhoneNumber, validateMauritanianPhone } from '../utils/phoneNumber';
import { UserPlus, Lock, Smartphone, ArrowRight } from 'lucide-react';

export const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPhone = sanitizePhoneNumber(phone);

    if (!validateMauritanianPhone(fullPhone)) {
      showToast('رقم الهاتف غير صحيح. يجب أن يبدأ بـ 2 أو 3 أو 4', 'error');
      return;
    }

    if (pin.length < 4) {
      showToast('الرمز السري يجب أن يكون 4 أرقام على الأقل', 'error');
      return;
    }

    if (pin !== confirmPin) {
      showToast('الرمز السري غير متطابق', 'error');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('register_user', {
        p_phone_number: fullPhone,
        p_pin: pin,
      });

      if (error) throw error;

      if (data.success) {
        showToast('تم إنشاء الحساب. جاري إرسال رمز التحقق...', 'success');
        localStorage.setItem('pending_phone', fullPhone);
        localStorage.setItem('temp_pin', pin);

        const { data: otpData, error: otpError } = await supabase.functions.invoke('send-otp', {
          body: { phone_number: fullPhone },
        });

        if (otpError) {
          showToast('فشل إرسال رمز التحقق، يرجى المحاولة لاحقاً', 'error');
          return;
        }

        if (otpData?.success) {
          navigate('/verify-otp', { state: location.state });
        } else {
          showToast(otpData?.message || 'فشل إرسال رمز التحقق', 'error');
        }
      } else {
        showToast(data.message, 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء التسجيل', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-page flex flex-col items-center justify-center px-page-x py-12 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-content-narrow relative z-10">
        <div className="text-center mb-8 sm:mb-10">
          <img
            src="https://i.postimg.cc/VJ87tfYs/image.png"
            alt="MauriPlay"
            className="h-16 sm:h-20 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          />
          <h1 className="text-white text-page-title sm:text-3xl font-black italic tracking-tighter">
            انضم إلينا اليوم
          </h1>
          <p className="text-caption text-gray-500 mt-2 font-medium">خطوة واحدة تفصلك عن عالم من المتعة الرقمية</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5 card-base-lg p-6 sm:p-8 shadow-card">
          
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-gray-400 text-xs font-black uppercase tracking-widest mr-1 mb-2">
              <Smartphone className="w-3 h-3 text-cyan-500" /> رقم الهاتف الموريتاني
            </label>
            <PhoneInput
              value={phone}
              onChange={setPhone}
              required
              autoComplete="tel"
              className="bg-black/50 border-white/10 focus:border-cyan-500/50 rounded-2xl py-4"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-gray-400 text-xs font-black uppercase tracking-widest mr-1 mb-2">
                <Lock className="w-3 h-3 text-cyan-500" /> الرمز السري
              </label>
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••"
                required
                minLength={4}
                maxLength={6}
                inputMode="numeric"
                className="bg-black/50 border-white/10 focus:border-cyan-500/50 rounded-2xl text-center tracking-[0.3em] text-lg"
              />
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-2 text-gray-400 text-xs font-black uppercase tracking-widest mr-1 mb-2">
                 تأكيد الرمز
              </label>
              <Input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••"
                required
                minLength={4}
                maxLength={6}
                inputMode="numeric"
                className="bg-black/50 border-white/10 focus:border-cyan-500/50 rounded-2xl text-center tracking-[0.3em] text-lg"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              loading={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 font-black text-lg shadow-[0_10px_20px_rgba(6,182,212,0.2)] hover:shadow-cyan-500/40 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              إنشاء الحساب
            </Button>
          </div>

          <div className="relative py-4 flex items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-gray-600 text-[10px] font-black uppercase tracking-tighter">أو إذا كنت عضواً</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/login', { state: location.state })}
            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 group"
          >
            تسجيل الدخول
            <ArrowRight className="w-4 h-4 group-hover:translate-x-[-4px] transition-transform" />
          </button>
        </form>

        <p className="mt-8 text-center text-gray-600 text-[10px] font-medium leading-relaxed px-10">
          بإنشائك للحساب، أنت توافق على{' '}
          <button
            type="button"
            onClick={() => navigate('/privacy-policy')}
            className="text-cyan-400 hover:text-cyan-300 transition-colors underline"
          >
            سياسة الخصوصية
          </button>
          {' '}الخاصة بـ MauriPlay
        </p>
      </div>
    </div>
  );
};