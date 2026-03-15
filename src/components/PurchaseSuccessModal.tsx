import { Copy, CheckCircle, ExternalLink, PlayCircle, X } from 'lucide-react';
import { useState } from 'react';
import { showToast } from './Toast';
import { Button } from './Button';

interface PurchaseSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  productName: string;
  platformName: string;
  platformLogoUrl?: string;
  platformWebsiteUrl?: string;
  platformTutorialVideoUrl?: string;
}

export const PurchaseSuccessModal = ({
  isOpen,
  onClose,
  code,
  productName,
  platformName,
  platformLogoUrl,
  platformWebsiteUrl,
  platformTutorialVideoUrl,
}: PurchaseSuccessModalProps) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    showToast('تم نسخ الكود بنجاح', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 left-6 z-10 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="p-8 md:p-12">
          <div className="text-center mb-10">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full" />
              <CheckCircle className="w-24 h-24 text-green-500 mx-auto relative" />
            </div>

            <h1 className="text-4xl font-black mb-3 text-white">
              تم الشراء بنجاح!
            </h1>
            <p className="text-gray-400 text-lg font-medium">
              مبروك! كود التفعيل الخاص بك جاهز للاستخدام
            </p>
          </div>

          <div className="bg-black border border-white/5 rounded-[2rem] p-8 mb-8">
            <div className="flex items-center gap-6 mb-8 pb-6 border-b border-white/5">
              {platformLogoUrl ? (
                <div className="w-20 h-20 bg-black border border-white/10 rounded-2xl p-3 shadow-inner flex-shrink-0">
                  <img
                    src={platformLogoUrl}
                    alt={platformName}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl border border-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl font-black text-cyan-400">
                    {platformName.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <h2 className="text-2xl font-black text-white">{productName}</h2>
                <p className="text-cyan-500 font-bold uppercase tracking-widest text-sm">
                  {platformName}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-cyan-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
                <div className="relative bg-black rounded-[1.5rem] border border-white/10 p-6 flex flex-col items-center gap-4">
                  <span className="text-[10px] text-gray-500 uppercase font-black tracking-[0.3em]">
                    Digital Key
                  </span>
                  <p className="text-3xl font-mono font-bold text-white break-all text-center tracking-wider">
                    {code}
                  </p>
                  <button
                    onClick={copyCode}
                    className={`mt-2 w-full flex items-center justify-center gap-3 py-4 rounded-xl font-black transition-all duration-300 ${
                      copied
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-black hover:bg-cyan-400'
                    }`}
                  >
                    {copied ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                    {copied ? 'تم النسخ!' : 'نسخ الكود'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {platformTutorialVideoUrl && (
                  <button
                    onClick={() => window.open(platformTutorialVideoUrl, '_blank')}
                    className="flex items-center justify-center gap-3 bg-red-600/10 text-red-500 border border-red-600/20 py-4 rounded-2xl hover:bg-red-600/20 transition-all font-bold"
                  >
                    <PlayCircle className="w-5 h-5" />
                    مشاهدة الشرح
                  </button>
                )}
                {platformWebsiteUrl && (
                  <button
                    onClick={() => window.open(platformWebsiteUrl, '_blank')}
                    className="flex items-center justify-center gap-3 bg-white/5 text-white border border-white/10 py-4 rounded-2xl hover:bg-white/10 transition-all font-bold"
                  >
                    <ExternalLink className="w-5 h-5 text-cyan-400" />
                    موقع المنصة
                  </button>
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={onClose}
            className="w-full py-5 rounded-2xl text-lg font-black"
          >
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
};
