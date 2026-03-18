import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useStore } from '../store/useStore';
import { User, FileText, MessageCircle, LogOut, LayoutDashboard, ArrowRight } from 'lucide-react';

export const Menu = () => {
  const navigate = useNavigate();
  const { user, logout } = useStore();

  const isAdmin = user?.role === 'admin';

  const handleSupport = () => {
    window.open('https://wa.me/22249827331', '_blank');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-20">
      <Header />

      <div className="pt-24 px-4 pb-12">
        <div className="max-w-xl mx-auto space-y-8">
          {/* Back button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
            <span>العودة للرئيسية</span>
          </button>

          <div className="space-y-4">
            {/* Profile */}
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-white/10">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">الملف الشخصي</p>
                  <p className="text-xs text-gray-400">تحديث معلومات حسابك</p>
                </div>
              </div>
            </button>

            {/* Admin Dashboard - only for admins */}
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 hover:bg-cyan-500/20 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-cyan-500/20">
                    <LayoutDashboard className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">لوحة الإدارة</p>
                    <p className="text-xs text-cyan-300/80">إدارة الطلبات والمخزون والمنصات</p>
                  </div>
                </div>
              </button>
            )}

            {/* Terms & Conditions */}
            <button
              onClick={() => navigate('/terms-and-conditions')}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-white/10">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">الشروط والأحكام</p>
                  <p className="text-xs text-gray-400">اطلع على سياسة الاستخدام</p>
                </div>
              </div>
            </button>

            {/* Support */}
            <button
              onClick={handleSupport}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-white/10">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">الدعم</p>
                  <p className="text-xs text-gray-400">تواصل معنا عبر واتساب</p>
                </div>
              </div>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-red-500/20">
                  <LogOut className="w-5 h-5 text-red-400" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-400">تسجيل الخروج</p>
                  <p className="text-xs text-red-300/70">إنهاء الجلسة بأمان</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

