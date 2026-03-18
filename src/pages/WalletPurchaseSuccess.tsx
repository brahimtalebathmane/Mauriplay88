import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from '../components/Header';
import { Copy, CheckCircle, ExternalLink, Home, PlayCircle, ShoppingBag } from 'lucide-react';
import { showToast } from '../components/Toast';
import { FALLBACK_IMAGE } from '../constants';

export interface WalletPurchaseSuccessState {
  code: string;
  productName: string;
  platformName: string;
  platformLogoUrl?: string;
  platformWebsiteUrl?: string;
  platformTutorialVideoUrl?: string;
  orderId?: string;
}

export const WalletPurchaseSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as WalletPurchaseSuccessState | null;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!state?.code) {
      navigate('/my-purchases', { replace: true });
      return;
    }
    document.title = 'تم الشراء بنجاح | MauriPlay';
    return () => { document.title = 'MauriPlay'; };
  }, [state, navigate]);

  const copyCode = () => {
    if (state?.code) {
      navigator.clipboard.writeText(state.code);
      setCopied(true);
      showToast('تم نسخ الكود بنجاح', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!state?.code) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header />

      <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center">
        <div className="text-center mb-10 animate-in zoom-in duration-500">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full" />
            <CheckCircle className="w-24 h-24 text-green-500 mx-auto relative shadow-2xl" />
          </div>
          <h1 className="text-4xl font-black mb-3">تم الشراء بنجاح!</h1>
          <p className="text-gray-400 text-lg font-medium">
            مبروك! كود التفعيل الخاص بك جاهز للاستخدام
          </p>
        </div>

        <div className="w-full bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 mb-8 shadow-2xl">
          <div className="flex items-center gap-6 mb-8 border-b border-white/5 pb-6">
            <div className="w-20 h-20 bg-black border border-white/10 rounded-2xl p-3 shadow-inner flex-shrink-0">
              <img
                src={state.platformLogoUrl || FALLBACK_IMAGE}
                alt={state.platformName}
                className="w-full h-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
              />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">{state.productName}</h2>
              <p className="text-cyan-500 font-bold uppercase tracking-widest text-sm">
                {state.platformName}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-cyan-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
              <div className="relative bg-black rounded-[1.5rem] border border-white/10 p-6 flex flex-col items-center gap-4">
                <span className="text-[10px] text-gray-500 uppercase font-black tracking-[0.3em]">
                  كود الشحن / Recharge Code
                </span>
                <p className="text-3xl font-mono font-bold text-white break-all text-center tracking-wider">
                  {state.code}
                </p>
                <button
                  onClick={copyCode}
                  className={`mt-2 w-full flex items-center justify-center gap-3 py-4 rounded-xl font-black transition-all duration-300 ${
                    copied ? 'bg-green-600 text-white' : 'bg-white text-black hover:bg-cyan-400'
                  }`}
                >
                  {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copied ? 'تم النسخ!' : 'نسخ الكود'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {state.platformTutorialVideoUrl && (
                <button
                  onClick={() => window.open(state.platformTutorialVideoUrl, '_blank')}
                  className="flex items-center justify-center gap-3 bg-red-600/10 text-red-500 border border-red-600/20 py-4 rounded-2xl hover:bg-red-600/20 transition-all font-bold"
                >
                  <PlayCircle className="w-5 h-5" />
                  مشاهدة الشرح
                </button>
              )}
              {state.platformWebsiteUrl && (
                <button
                  onClick={() => window.open(state.platformWebsiteUrl, '_blank')}
                  className="flex items-center justify-center gap-3 bg-white/5 text-white border border-white/10 py-4 rounded-2xl hover:bg-white/10 transition-all font-bold"
                >
                  <ExternalLink className="w-5 h-5 text-cyan-400" />
                  رابط المنصة
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/my-purchases')}
            className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-4 rounded-2xl font-bold hover:bg-white/10 transition-all"
          >
            <ShoppingBag className="w-5 h-5" />
            مشترياتي
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 py-4 rounded-2xl font-bold hover:opacity-90 transition-all"
          >
            <Home className="w-5 h-5" />
            الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
};
