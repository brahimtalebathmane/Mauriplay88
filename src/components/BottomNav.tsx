import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ShoppingBag, Wallet, Menu, User, FileText, MessageCircle, LogOut } from 'lucide-react';
import { useStore } from '../store/useStore';

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

  const handleSupport = () => {
    window.open('https://wa.me/22249827331', '_blank');
    setMenuOpen(false);
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:z-50">
      {/* Blur background */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/80 to-transparent" />

      <div className="relative max-w-3xl mx-auto px-4 pb-4">
        <div className="bg-[#050505]/95 border border-white/10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          <div className="grid grid-cols-4 gap-1 px-2 py-2">
            {/* Home */}
            <button
              onClick={() => {
                setMenuOpen(false);
                navigate('/');
              }}
              className={`flex flex-col items-center justify-center gap-1 py-2 rounded-2xl text-xs font-medium transition-all ${
                isActive('/') ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>الرئيسية</span>
            </button>

            {/* My Purchases */}
            <button
              onClick={() => {
                setMenuOpen(false);
                navigate('/my-purchases');
              }}
              className={`flex flex-col items-center justify-center gap-1 py-2 rounded-2xl text-xs font-medium transition-all ${
                isActive('/my-purchases') ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              <span>مشترياتي</span>
            </button>

            {/* Wallet */}
            {user?.wallet_active ? (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/wallet');
                }}
                className={`flex flex-col items-center justify-center gap-1 py-2 rounded-2xl text-xs font-medium transition-all ${
                  isActive('/wallet') ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Wallet className="w-5 h-5" />
                <span>المحفظة</span>
              </button>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 py-2 rounded-2xl text-xs font-medium text-gray-600">
                <Wallet className="w-5 h-5 opacity-60" />
                <span>المحفظة</span>
              </div>
            )}

            {/* Menu with submenu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((open) => !open)}
                className={`w-full flex flex-col items-center justify-center gap-1 py-2 rounded-2xl text-xs font-medium transition-all ${
                  menuOpen ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Menu className="w-5 h-5" />
                <span>القائمة</span>
              </button>

              {menuOpen && (
                <div className="absolute bottom-14 left-0 right-0">
                  <div className="bg-[#050505]/98 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in slide-in-from-bottom duration-200">
                    <div className="flex flex-col text-right">
                      <button
                        onClick={() => {
                          navigate('/profile');
                          setMenuOpen(false);
                        }}
                        className="flex items-center justify-end gap-3 px-4 py-2 text-sm text-white hover:bg-white/5"
                      >
                        <span>الملف الشخصي</span>
                        <User className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          navigate('/terms-and-conditions');
                          setMenuOpen(false);
                        }}
                        className="flex items-center justify-end gap-3 px-4 py-2 text-sm text-white hover:bg-white/5"
                      >
                        <span>الشروط والأحكام</span>
                        <FileText className="w-4 h-4" />
                      </button>

                      <button
                        onClick={handleSupport}
                        className="flex items-center justify-end gap-3 px-4 py-2 text-sm text-white hover:bg-white/5"
                      >
                        <span>الدعم</span>
                        <MessageCircle className="w-4 h-4" />
                      </button>

                      <button
                        onClick={handleLogout}
                        className="flex items-center justify-end gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 border-t border-white/5"
                      >
                        <span>تسجيل الخروج</span>
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

