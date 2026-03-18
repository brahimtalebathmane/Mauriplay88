import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { showToast } from '../components/Toast';
import { User, Lock, Phone, LogOut, ShieldCheck, ChevronLeft, KeyRound, ArrowRight } from 'lucide-react';

export const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useStore();
  const [loading, setLoading] = useState(false);
  const [showChangePIN, setShowChangePIN] = useState(false);
  const [pinData, setPinData] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: '',
  });

  const handleChangePIN = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pinData.newPin !== pinData.confirmPin) {
      showToast('الرمز السري الجديد غير متطابق', 'error');
      return;
    }

    if (pinData.newPin.length < 4 || !/^\d+$/.test(pinData.newPin)) {
      showToast('الرمز السري يجب أن يكون 4 أرقام على الأقل', 'error');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('change_user_pin', {
        p_phone_number: user?.phone_number,
        p_current_pin: pinData.currentPin,
        p_new_pin: pinData.newPin,
      });

      if (error) throw error;

      if (data?.success) {
        showToast(data.message, 'success');
        setShowChangePIN(false);
        setPinData({ currentPin: '', newPin: '', confirmPin: '' });
      } else {
        showToast(data?.message || 'فشل تغيير الرمز السري', 'error');
      }
    } catch (error: any) {
      showToast('فشل تغيير الرمز السري', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-20">
      <Header />

      <div className="pt-24 px-4 pb-12">
        <div className="max-w-xl mx-auto space-y-6">

          {/* Back button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
            <span>العودة للرئيسية</span>
          </button>
          
          {/* بطاقة الهوية الرقمية */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-[#111] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
            
            <div className="flex items-center gap-6 mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
                <div className="relative bg-black border-2 border-cyan-500/30 p-5 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                  <User className="w-10 h-10 text-cyan-400" />
                </div>
                {user?.role === 'admin' && (
                  <div className="absolute -bottom-1 -right-1 bg-cyan-500 p-1.5 rounded-full shadow-lg border-2 border-black">
                    <ShieldCheck className="w-3 h-3 text-black font-bold" />
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tight italic">الملف الشخصي</h1>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">
                    {user?.role === 'admin' ? 'System Administrator' : 'Verified Member'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* حقل رقم الهاتف */}
              <div className="group flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-xl group-hover:bg-cyan-500/10 transition-colors">
                    <Phone className="w-5 h-5 text-gray-400 group-hover:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-0.5">رقم الهاتف</p>
                    <p className="text-white font-mono text-lg" dir="ltr">+{user?.phone_number}</p>
                  </div>
                </div>
              </div>

              {/* حقل الرمز السري */}
              <div className="group flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-xl group-hover:bg-cyan-500/10 transition-colors">
                    <Lock className="w-5 h-5 text-gray-400 group-hover:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-0.5">كلمة المرور (PIN)</p>
                    <p className="text-white tracking-[0.5em] font-black">••••</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChangePIN(!showChangePIN)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10 transition-all active:scale-95"
                >
                   {showChangePIN ? 'إغلاق' : 'تغيير'}
                </button>
              </div>
            </div>
          </div>

          {/* نموذج تغيير الـ PIN */}
          {showChangePIN && (
            <form 
              onSubmit={handleChangePIN} 
              className="bg-[#0a0a0a] border border-cyan-500/20 rounded-[2rem] p-8 animate-in slide-in-from-top duration-300 shadow-[0_0_30px_rgba(6,182,212,0.05)]"
            >
              <div className="flex items-center gap-3 mb-6">
                <KeyRound className="w-6 h-6 text-cyan-500" />
                <h2 className="text-xl font-black">تحديث الرمز السري</h2>
              </div>

              <div className="space-y-5">
                <Input
                  label="الرمز السري الحالي"
                  type="password"
                  inputMode="numeric"
                  placeholder="••••"
                  maxLength={6}
                  value={pinData.currentPin}
                  onChange={(e) => setPinData({ ...pinData, currentPin: e.target.value })}
                  required
                  className="bg-black/60 border-white/10 focus:border-cyan-500/50 text-center tracking-[0.5em] text-xl py-4"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="الرمز الجديد"
                    type="password"
                    inputMode="numeric"
                    placeholder="••••"
                    maxLength={6}
                    value={pinData.newPin}
                    onChange={(e) => setPinData({ ...pinData, newPin: e.target.value })}
                    required
                    className="bg-black/60 border-white/10 focus:border-cyan-500/50 text-center tracking-[0.5em] text-xl py-4"
                  />
                  <Input
                    label="تأكيد الرمز"
                    type="password"
                    inputMode="numeric"
                    placeholder="••••"
                    maxLength={6}
                    value={pinData.confirmPin}
                    onChange={(e) => setPinData({ ...pinData, confirmPin: e.target.value })}
                    required
                    className="bg-black/60 border-white/10 focus:border-cyan-500/50 text-center tracking-[0.5em] text-xl py-4"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button 
                    type="submit" 
                    loading={loading} 
                    className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-700 py-4 rounded-xl font-black"
                  >
                    تأكيد التغيير
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowChangePIN(false);
                      setPinData({ currentPin: '', newPin: '', confirmPin: '' });
                    }}
                    className="flex-1 bg-white/5 border-white/10 py-4 rounded-xl font-black text-gray-400"
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* زر تسجيل الخروج */}
          <button
            onClick={handleLogout}
            className="group w-full flex items-center justify-between p-6 bg-red-500/5 border border-red-500/10 rounded-[1.5rem] hover:bg-red-500/10 transition-all duration-300 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-xl group-hover:scale-110 transition-transform">
                <LogOut className="w-6 h-6 text-red-500" />
              </div>
              <div className="text-right">
                <p className="text-red-500 font-black text-lg">تسجيل الخروج</p>
                <p className="text-red-500/50 text-[10px] uppercase font-bold tracking-widest">End Session Safely</p>
              </div>
            </div>
            <ChevronLeft className="w-6 h-6 text-red-500/30 group-hover:translate-x-[-4px] transition-transform" />
          </button>
          
          <div className="text-center">
            <p className="text-gray-600 text-[10px] font-medium tracking-[0.3em] uppercase">
              MauriPlay Digital Security v2.0
            </p>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};