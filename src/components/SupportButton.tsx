import { MessageCircle } from 'lucide-react';

const SUPPORT_WHATSAPP_URL = 'https://wa.me/22249827331';

export const SupportButton = () => {
  const handleClick = () => {
    window.open(SUPPORT_WHATSAPP_URL, '_blank');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="الدعم عبر واتساب"
      className="fixed z-40 bottom-4 right-4 md:bottom-6 md:right-6 bg-[#25D366] hover:bg-[#20ba5a] text-black rounded-full shadow-lg flex items-center justify-center w-14 h-14 md:w-16 md:h-16 border border-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#25D366] focus:ring-offset-black"
    >
      <MessageCircle className="w-7 h-7 md:w-8 md:h-8" />
    </button>
  );
};

