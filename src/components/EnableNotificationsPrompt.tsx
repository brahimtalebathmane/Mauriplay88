import { useEffect, useMemo, useState } from 'react';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: OneSignalApi) => void>;
    __oneSignalInitOk?: boolean;
  }
}

interface OneSignalApi {
  Slidedown?: {
    promptPush?: () => void;
  };
}

const STORAGE_KEY = 'mauriplay.notificationsPrompt.dismissedAt';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function getIsDismissedRecently(): boolean {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);
    if (!rawValue) return false;
    const dismissedAtMs = Number(rawValue);
    if (!Number.isFinite(dismissedAtMs)) return false;
    return Date.now() - dismissedAtMs < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function setDismissedNow(): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function EnableNotificationsPrompt() {
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);

  const canUseNotifications = useMemo(() => {
    return typeof window !== 'undefined' && typeof Notification !== 'undefined';
  }, []);

  useEffect(() => {
    if (!canUseNotifications) return;
    if (getIsDismissedRecently()) return;

    if (Notification.permission === 'default') {
      setShouldShowPrompt(true);
      // On Android & iOS PWA (standalone), auto-trigger OneSignal slidedown after a short delay
      const isStandalone =
        (window.matchMedia('(display-mode: standalone)').matches) ||
        (navigator as any).standalone === true;
      if (isStandalone && window.OneSignalDeferred) {
        const t = setTimeout(() => {
          window.OneSignalDeferred!.push(async (OneSignal: OneSignalApi) => {
            try {
              if (window.__oneSignalInitOk !== true) return;
              if (OneSignal?.Slidedown?.promptPush) OneSignal.Slidedown.promptPush();
            } catch {
              // ignore
            }
          });
        }, 1500);
        return () => clearTimeout(t);
      }
      return;
    }

    if (Notification.permission === 'denied') {
      setIsPermissionDenied(true);
      setShouldShowPrompt(true);
    }
  }, [canUseNotifications]);

  const requestPermission = async () => {
    const deferredQueue = window.OneSignalDeferred;
    if (deferredQueue) {
      deferredQueue.push(async (OneSignal: OneSignalApi) => {
        try {
          if (window.__oneSignalInitOk !== true) return;
          if (OneSignal?.Slidedown?.promptPush) {
            OneSignal.Slidedown.promptPush();
            return;
          }
        } catch {
          // ignore and fallback
        }

        try {
          await Notification.requestPermission();
        } catch {
          // ignore
        }
      });
    } else {
      try {
        await Notification.requestPermission();
      } catch {
        // ignore
      }
    }

    setDismissedNow();
    setShouldShowPrompt(false);
  };

  const dismiss = () => {
    setDismissedNow();
    setShouldShowPrompt(false);
  };

  if (!shouldShowPrompt) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 px-4">
      <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-black/85 backdrop-blur p-4 shadow-card">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="text-sm font-black text-white mb-1">فعّل إشعارات MauriPlay</div>
            {isPermissionDenied ? (
              <div className="text-xs text-gray-400 leading-relaxed">
                الإشعارات محظورة من المتصفح. فعّلها من إعدادات Safari/Chrome ثم أعد المحاولة.
              </div>
            ) : (
              <div className="text-xs text-gray-400 leading-relaxed">
                احصل على إشعارات فورية عند الموافقة على طلباتك وعمليات الشراء.
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-black text-gray-400 hover:text-white transition-colors px-2 py-1"
          >
            إغلاق
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={requestPermission}
            className="flex-1 rounded-xl bg-white text-black font-black py-2.5"
          >
            تفعيل الآن
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-xl bg-white/5 border border-white/10 text-white font-bold py-2.5 px-4"
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
}

