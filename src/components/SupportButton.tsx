import { Headset } from 'lucide-react';

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
      className="support-fab bg-[#25D366] hover:bg-[#20ba5a] text-black rounded-full shadow-lg flex items-center justify-center w-14 h-14 md:w-16 md:h-16 border border-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#25D366] focus:ring-offset-black"
    >
      <Headset className="w-7 h-7 md:w-8 md:h-8" />
    </button>
  );
};

