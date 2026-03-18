import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Menu, User, LogOut, Home, ShoppingBag, Wallet, X, MessageCircle } from 'lucide-react';
import { useState } from 'react';

export const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-white p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>

        <img
          src="https://i.postimg.cc/VJ87tfYs/Logo.png"
          alt="MauriPlay"
          className="h-10 cursor-pointer"
          onClick={() => navigate('/')}
        />

        <div className="w-10" />
      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-80 bg-gray-900 z-50 shadow-xl animate-slide-in-right">
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <button
                  onClick={() => setMenuOpen(false)}
                  className="text-white hover:text-gray-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                <img
                  src="https://i.postimg.cc/VJ87tfYs/Logo.png"
                  alt="MauriPlay"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    navigate('/');
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-end gap-3 px-4 py-3 text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <span>الرئيسية</span>
                  <Home className="w-5 h-5" />
                </button>

                <button
                  onClick={() => {
                    navigate('/my-purchases');
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-end gap-3 px-4 py-3 text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <span>مشترياتي</span>
                  <ShoppingBag className="w-5 h-5" />
                </button>

                {user?.wallet_active && (
                  <button
                    onClick={() => {
                      navigate('/wallet');
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-end gap-3 px-4 py-3 text-white hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <span>المحفظة</span>
                    <Wallet className="w-5 h-5" />
                  </button>
                )}

                <button
                  onClick={() => {
                    window.open('https://wa.me/22249827331', '_blank');
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-end gap-3 px-4 py-3 text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <span>الدعم</span>
                  <MessageCircle className="w-5 h-5" />
                </button>

                <button
                  onClick={() => {
                    navigate('/profile');
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-end gap-3 px-4 py-3 text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <span>الملف الشخصي</span>
                  <User className="w-5 h-5" />
                </button>

                {user?.role === 'admin' && (
                  <button
                    onClick={() => {
                      navigate('/admin');
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-end gap-3 px-4 py-3 bg-white text-black hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    <span>لوحة الإدارة</span>
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-end gap-3 px-4 py-3 text-red-500 hover:bg-gray-800 rounded-lg transition-colors mt-4"
                >
                  <span>تسجيل الخروج</span>
                  <LogOut className="w-5 h-5" />
                </button>
              </div>

              {user && (
                <div className="mt-8 pt-6 border-t border-gray-800">
                  <p className="text-gray-400 text-sm text-right mb-1">رقم الهاتف</p>
                  <p className="text-white text-right">{user.phone_number}</p>
                  {user.wallet_active && (
                    <>
                      <p className="text-gray-400 text-sm text-right mt-4 mb-1">رصيد المحفظة</p>
                      <p className="text-white text-right font-medium">{user.wallet_balance} MRU</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
};
