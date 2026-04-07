import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';

export const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="bg-card border-b border-white/10 sticky top-0 z-40">
      <div className="max-w-content-max mx-auto px-page-x h-14 flex items-center justify-between gap-3">
        <div className="w-10 shrink-0" aria-hidden />

        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex-1 flex min-w-0 items-center justify-center gap-2.5 group"
        >
          <img
            src="https://i.postimg.cc/VJ87tfYs/Logo.png"
            alt=""
            className="h-9 w-auto shrink-0"
          />
          <span className="text-[1.05rem] sm:text-lg font-black tracking-tight text-white/95 truncate group-hover:text-cyan-100 transition-colors">
            MauriPlay
          </span>
        </button>

        <button
          onClick={() => navigate('/profile')}
          className="text-white p-2 hover:bg-white/10 rounded-btn transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="الملف الشخصي"
        >
          <User className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
};
