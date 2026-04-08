import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { showToast } from '../components/Toast';
import { formatPhoneForDisplay } from '../utils/phoneNumber';
import { MessageSquare, RefreshCcw, ArrowRight, ShieldCheck } from 'lucide-react';
import { establishSupabaseAuthSession } from '../lib/session';
import { getPostAuthRedirectPath } from '../utils/navigation';

export const VerifyOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const authReturn = (location.state as { from?: Location } | null)?.from;
  const { user, isLoggedIn, setUser } = useStore();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    // If already logged in (which implies verified for non-admin users),
    // send straight to the appropriate home.
    if (isLoggedIn && user) {
      navigate(getPostAuthRedirectPath(user, authReturn), { replace: true });
      return;
    }

    const pendingPhone = localStorage.getItem('pending_phone');
    if (pendingPhone) {
      setPhone(pendingPhone);
      return;
    }

    navigate('/login', { replace: true, state: location.state });
  }, [isLoggedIn, navigate, user, authReturn, location.state]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendOTP = async () => {
    if (!phone) return;

    setSendingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone_number: phone },
      });

      if (error) throw error;

      if (data?.success) {
        showToast('تم إرسال رمز التحقق إلى WhatsApp', 'success');
        setCountdown(60);
      } else {
        showToast(data?.message || 'فشل إرسال رمز التحقق', 'error');
      }
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'حدث خطأ أثناء إرسال رمز التحقق', 'error');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 4) {
      showToast('يرجى إدخال رمز مكون من 4 أرقام', 'error');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('verify_otp_code', {
        p_phone_number: phone,
        p_code: otp,
      });

      if (error) throw error;

      if (data.success) {
        showToast('تم التحقق بنجاح', 'success');
        localStorage.removeItem('pending_phone');

        if (data.user) {
          setUser(data.user);
          const tempPin = localStorage.getItem('temp_pin');
          if (tempPin) {
            await establishSupabaseAuthSession(phone, tempPin);
          }
          localStorage.removeItem('temp_pin');

          setTimeout(() => {
            navigate(getPostAuthRedirectPath(data.user, authReturn));
          }, 500);
        } else {
          const tempPin = localStorage.getItem('temp_pin');
          if (tempPin) {
            const { data: loginData } = await supabase.rpc('verify_user_login', {
              p_phone_number: phone,
              p_pin: tempPin,
            });

            if (loginData?.success) {
              setUser(loginData.user);
              await establishSupabaseAuthSession(phone, tempPin);
              localStorage.removeItem('temp_pin');

              setTimeout(() => {
                navigate(getPostAuthRedirectPath(loginData.user, authReturn));
              }, 500);
            } else {
              localStorage.removeItem('temp_pin');
              navigate('/login', { state: location.state });
            }
          } else {
            navigate('/login', { state: location.state });
          }
        }
      } else {
        showToast(data.message || 'فشل التحقق', 'error');
      }
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'حدث خطأ أثناء التحقق', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!phone) return null;

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* عناصر جمالية في الخلفية */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-cyan-500/5 blur-[120px] rounded-full" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <img
            src="https://i.postimg.cc/VJ87tfYs/image.png"
            alt="MauriPlay"
            className="h-16 mx-auto mb-8 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          />
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-4">
             <ShieldCheck className="w-4 h-4 text-cyan-500" />
             <span className="text-cyan-500 text-[10px] font-black uppercase tracking-widest">تحقق أمني</span>
          </div>
          <h1 className="text-white text-3xl font-black italic tracking-tighter mb-3">
            رمز التحقق
          </h1>
          <p className="text-gray-500 text-sm font-medium">
            أدخل الرمز المكون من 4 أرقام المرسل إلى <br />
            <span className="text-white font-mono text-base dir-ltr inline-block mt-2 bg-white/5 px-3 py-1 rounded-lg border border-white/5">
              {formatPhoneForDisplay(phone)}
            </span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6 bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="space-y-2">
            <label className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mr-1 block text-right">
              الرمز السري المؤقت (OTP)
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
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 font-black text-lg shadow-lg hover:shadow-cyan-500/20 transition-all"
          >
            تأكيد الرمز
          </Button>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={countdown > 0 || sendingCode}
              onClick={sendOTP}
              className={`flex items-center justify-center gap-2 py-4 rounded-2xl border transition-all font-bold text-sm ${
                countdown > 0 
                ? 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed' 
                : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              }`}
            >
              {sendingCode ? (
                <RefreshCcw className="w-4 h-4 animate-spin" />
              ) : (
                <MessageSquare className="w-4 h-4" />
              )}
              {countdown > 0 ? `إعادة الإرسال خلال ${countdown} ثانية` : 'إعادة إرسال الرمز عبر WhatsApp'}
            </button>

            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('pending_phone');
                navigate('/register', { state: location.state });
              }}
              className="group flex items-center justify-center gap-2 py-2 text-gray-500 hover:text-white transition-colors text-xs font-bold"
            >
              تغيير رقم الهاتف
              <ArrowRight className="w-3 h-3 group-hover:translate-x-[-4px] transition-transform" />
            </button>
          </div>
        </form>

        <div className="mt-8 flex justify-center items-center gap-4 opacity-30 grayscale">
            <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="h-6" />
            <div className="h-4 w-[1px] bg-white/20"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white">Secure WhatsApp Gateway</p>
        </div>
      </div>
    </div>
  );
};