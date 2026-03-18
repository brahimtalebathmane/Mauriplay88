import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';

export const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="w-10" />

        <img
          src="https://i.postimg.cc/VJ87tfYs/Logo.png"
          alt="MauriPlay"
          className="h-10 cursor-pointer"
          onClick={() => navigate('/')}
        />

        <button
          onClick={() => navigate('/profile')}
          className="text-white p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <User className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
};
