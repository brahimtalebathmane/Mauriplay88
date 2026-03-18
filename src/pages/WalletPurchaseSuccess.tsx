import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from '../components/Header';
import { Copy, CheckCircle, ExternalLink, PlayCircle, Check } from 'lucide-react';
import { showToast } from '../components/Toast';

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
  const [hasState, setHasState] = useState(!!state?.code);

  useEffect(() => {
    document.title = 'تم الشراء بنجاح | MauriPlay';
    setHasState(!!state?.code);
    return () => { document.title = 'MauriPlay'; };
  }, [state]);

  const copyCode = () => {
    if (state?.code) {
      navigator.clipboard.writeText(state.code);
      setCopied(true);
      showToast('تم نسخ الكود بنجاح', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header />

      <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center">
        {hasState ? (
          <>
            <div className="text-center mb-10 animate-in zoom-in duration-500">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full" />
                <CheckCircle className="w-24 h-24 text-green-500 mx-auto relative shadow-2xl" />
              </div>
              <h1 className="text-4xl font-black mb-3">Purchase completed successfully</h1>
            </div>

            <div className="w-full bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 mb-6 shadow-2xl">
              <div className="relative group mb-6">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-cyan-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
                <div className="relative bg-black rounded-[1.5rem] border border-white/10 p-6 flex flex-col items-center gap-4">
                  <span className="text-[10px] text-gray-500 uppercase font-black tracking-[0.3em]">
                    Recharge Code
                  </span>
                  <p className="text-3xl font-mono font-bold text-white break-all text-center tracking-wider select-all" title={state?.code}>
                    {state?.code}
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
                {state?.platformWebsiteUrl && (
                  <button
                    onClick={() => window.open(state.platformWebsiteUrl, '_blank')}
                    className="flex items-center justify-center gap-3 bg-white/5 text-white border border-white/10 py-4 rounded-2xl hover:bg-white/10 transition-all font-bold"
                  >
                    <ExternalLink className="w-5 h-5 text-cyan-400" />
                    Usage Link
                  </button>
                )}
                {state?.platformTutorialVideoUrl && (
                  <button
                    onClick={() => window.open(state.platformTutorialVideoUrl, '_blank')}
                    className="flex items-center justify-center gap-3 bg-red-600/10 text-red-500 border border-red-600/20 py-4 rounded-2xl hover:bg-red-600/20 transition-all font-bold"
                  >
                    <PlayCircle className="w-5 h-5" />
                    Watch Tutorial
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="w-full bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 mb-6 shadow-2xl text-center">
            <h1 className="text-2xl font-black mb-4">لا توجد بيانات للطلب</h1>
            <p className="text-gray-400 mb-6">
              تعذر العثور على تفاصيل عملية الشراء. يمكنك العودة للمنتجات وإعادة المحاولة.
            </p>
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 py-4 rounded-2xl font-bold hover:opacity-90 transition-all"
        >
          <Check className="w-5 h-5" />
          Done
        </button>
      </div>
    </div>
  );
};
