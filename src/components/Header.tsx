import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';

export const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="bg-card border-b border-white/10 sticky top-0 z-40">
      <div className="max-w-content-max mx-auto px-page-x h-14 flex items-center justify-between">
        <div className="w-10" />

        <img
          src="https://i.postimg.cc/VJ87tfYs/Logo.png"
          alt="MauriPlay"
          className="h-9 cursor-pointer"
          onClick={() => navigate('/')}
        />

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
