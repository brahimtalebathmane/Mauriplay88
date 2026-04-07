import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { PhoneInput } from '../components/PhoneInput';
import { Input } from '../components/Input';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';
import { sanitizePhoneNumber, validateMauritanianPhone, formatPhoneForDisplay } from '../utils/phoneNumber';
import { MessageSquare, RefreshCcw, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';

type Step = 'phone' | 'otp' | 'pin';

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [resetSessionId, setResetSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const fullPhone = phone ? sanitizePhoneNumber(phone) : '';

  const sendOtp = async () => {
    if (!fullPhone || !validateMauritanianPhone(fullPhone)) {
      showToast('رقم الهاتف غير صحيح', 'error');
      return;
    }

    setSendingCode(true);
    try {
      const { data: elig, error: eligErr } = await supabase.rpc('check_pin_reset_phone', {
        p_phone_number: fullPhone,
      });
      if (eligErr) throw eligErr;
      if (!elig?.success || !elig?.eligible) {
        showToast(elig?.message || 'لا يمكن إرسال رمز التحقق', 'error');
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone_number: fullPhone },
      });
      if (error) throw error;
      if (!data?.success) {
        showToast(data?.message || 'فشل إرسال رمز التحقق', 'error');
        return;
      }
      showToast('تم إرسال رمز التحقق إلى WhatsApp', 'success');
      setCountdown(60);
      setStep('otp');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'حدث خطأ أثناء إرسال الرمز', 'error');
    } finally {
      setSendingCode(false);
    }
  };

  const resendOtp = async () => {
    if (countdown > 0 || sendingCode || !fullPhone) return;
    setSendingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone_number: fullPhone },
      });
      if (error) throw error;
      if (data?.success) {
        showToast('تم إعادة إرسال الرمز إلى WhatsApp', 'success');
        setCountdown(60);
      } else {
        showToast(data?.message || 'فشل إعادة الإرسال', 'error');
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'حدث خطأ', 'error');
    } finally {
      setSendingCode(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 4) {
      showToast('يرجى إدخال رمز مكون من 4 أرقام', 'error');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('verify_otp_for_pin_reset', {
        p_phone_number: fullPhone,
        p_code: otp,
      });
      if (error) throw error;
      if (!data?.success || !data?.reset_session_id) {
        showToast(data?.message || 'فشل التحقق', 'error');
        return;
      }
      setResetSessionId(data.reset_session_id as string);
      showToast('تم التحقق بنجاح', 'success');
      setStep('pin');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'حدث خطأ أثناء التحقق', 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetSessionId) {
      showToast('انتهت الجلسة. يرجى البدء من جديد', 'error');
      navigate('/forgot-password', { replace: true });
      return;
    }
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      showToast('الرمز السري يجب أن يكون 6 أرقام', 'error');
      return;
    }
    if (newPin !== confirmPin) {
      showToast('الرمز السري غير متطابق', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('complete_pin_reset_after_otp', {
        p_reset_session_id: resetSessionId,
        p_new_pin: newPin,
      });
      if (error) throw error;
      if (!data?.success) {
        showToast(data?.message || 'فشل حفظ الرمز', 'error');
        return;
      }
      showToast('تم تغيير الرمز السري بنجاح', 'success');
      setTimeout(() => navigate('/login', { replace: true }), 600);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'حدث خطأ', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-cyan-500/5 blur-[120px] rounded-full" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <img
            src="https://i.postimg.cc/VJ87tfYs/image.png"
            alt="MauriPlay"
            className="h-16 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          />
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-4">
            <ShieldCheck className="w-4 h-4 text-cyan-500" />
            <span className="text-cyan-500 text-[10px] font-black uppercase tracking-widest">
              استعادة الرمز
            </span>
          </div>
          <h1 className="text-white text-2xl sm:text-3xl font-black italic tracking-tighter mb-2">
            {step === 'phone' && 'نسيت الرمز السري؟'}
            {step === 'otp' && 'رمز التحقق'}
            {step === 'pin' && 'رمز سري جديد'}
          </h1>
          <p className="text-gray-500 text-sm font-medium">
            {step === 'phone' && 'أدخل رقم هاتفك المسجّل لإرسال رمز عبر واتساب'}
            {step === 'otp' && (
              <>
                أدخل الرمز المكون من 4 أرقام المرسل إلى{' '}
                <span className="text-white font-mono dir-ltr inline-block mt-1 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  {formatPhoneForDisplay(fullPhone)}
                </span>
              </>
            )}
            {step === 'pin' && 'اختر رمزاً سرياً جديداً مكوناً من 6 أرقام'}
          </p>
        </div>

        {step === 'phone' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendOtp();
            }}
            className="space-y-6 bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl"
          >
            <PhoneInput label="رقم الهاتف" value={phone} onChange={setPhone} required autoComplete="tel" />
            <Button
              type="submit"
              loading={sendingCode}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 font-black"
            >
              إرسال رمز التحقق عبر WhatsApp
            </Button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-2 py-3 text-gray-500 hover:text-white text-sm font-bold"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              العودة لتسجيل الدخول
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={verifyOtp} className="space-y-6 bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
            <div className="space-y-2">
              <label className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mr-1 block text-right">
                رمز OTP
              </label>
              <Input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="0 0 0 0"
                required
                maxLength={4}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="text-center text-4xl tracking-[0.5em] font-black py-6 bg-black/50 border-white/10 focus:border-cyan-500/50 rounded-2xl text-cyan-400"
              />
            </div>
            <Button
              type="submit"
              loading={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 font-black text-lg"
            >
              التحقق من الرمز
            </Button>
            <button
              type="button"
              disabled={countdown > 0 || sendingCode}
              onClick={() => void resendOtp()}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl border font-bold text-sm ${
                countdown > 0
                  ? 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed'
                  : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              }`}
            >
              {sendingCode ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
              {countdown > 0 ? `إعادة الإرسال خلال ${countdown} ثانية` : 'إعادة إرسال الرمز عبر WhatsApp'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setOtp('');
              }}
              className="w-full text-center text-gray-500 hover:text-white text-xs font-bold py-2"
            >
              تغيير رقم الهاتف
            </button>
          </form>
        )}

        {step === 'pin' && (
          <form onSubmit={submitNewPin} className="space-y-6 bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
            <div className="flex justify-center mb-2">
              <KeyRound className="w-10 h-10 text-cyan-500/80" />
            </div>
            <Input
              label="الرمز السري الجديد"
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              required
              maxLength={6}
              inputMode="numeric"
              autoComplete="new-password"
            />
            <Input
              label="تأكيد الرمز السري"
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              required
              maxLength={6}
              inputMode="numeric"
              autoComplete="new-password"
            />
            <Button
              type="submit"
              loading={loading}
              disabled={newPin.length !== 6 || newPin !== confirmPin}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 font-black"
            >
              حفظ الرمز السري
            </Button>
          </form>
        )}

        <div className="mt-8 flex justify-center items-center gap-4 opacity-30 grayscale">
          <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="" className="h-6" />
          <div className="h-4 w-[1px] bg-white/20" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white">WhatsApp OTP</p>
        </div>
      </div>
    </div>
  );
};
