/**
 * OneSignal provider: sets external user id and role tag on login,
 * clears on logout, and handles notification click to navigate.
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: OneSignalApi) => void>;
    __oneSignalInitOk?: boolean;
  }
}

interface OneSignalApi {
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
  User: {
    addTags: (tags: Record<string, string>) => Promise<void>;
  };
  Notifications: {
    addEventListener: (event: 'click', handler: (event: { notification: { data?: Record<string, string> } }) => void) => void;
  };
}

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn } = useStore();
  const navigate = useNavigate();
  const clickHandlerRef = useRef<((event: { notification: { data?: Record<string, string> } }) => void) | null>(null);
  const wasLoggedInRef = useRef<boolean>(false);

  // OneSignal identity: set external id and role tag when user logs in, clear when they log out
  useEffect(() => {
    const deferred = window.OneSignalDeferred;
    if (!deferred) return;
    if (window.__oneSignalInitOk !== true) return;

    if (isLoggedIn && user?.id) {
      deferred.push(async (OneSignal: OneSignalApi) => {
        try {
          if (window.__oneSignalInitOk !== true) return;
          await OneSignal.login(user.id);
          await OneSignal.User.addTags({ role: user.role });
        } catch (e) {
          console.warn('[OneSignal] Login/tag failed:', e);
        }
      });
      wasLoggedInRef.current = true;
    } else {
      // Avoid calling logout on initial page load (common when OneSignal init fails due to
      // browser storage restrictions like IndexedDB being unavailable).
      if (wasLoggedInRef.current) {
        deferred.push(async (OneSignal: OneSignalApi) => {
          try {
            if (window.__oneSignalInitOk !== true) return;
            await OneSignal.logout();
          } catch (e) {
            console.warn('[OneSignal] Logout failed:', e);
          }
        });
      }
      wasLoggedInRef.current = false;
    }
  }, [isLoggedIn, user?.id, user?.role]);

  // Notification click: navigate to url from notification data (only register once)
  useEffect(() => {
    const deferred = window.OneSignalDeferred;
    if (!deferred || clickHandlerRef.current) return;

    const handler = (event: { notification: { data?: Record<string, string> } }) => {
      const url = event?.notification?.data?.url;
      if (url) {
        try {
          const path = new URL(url, window.location.origin).pathname + (new URL(url).search || '');
          navigate(path);
        } catch {
          window.location.href = url;
        }
      }
    };

    clickHandlerRef.current = handler;
    deferred.push((OneSignal: OneSignalApi) => {
      OneSignal.Notifications.addEventListener('click', handler);
    });
  }, [navigate]);

  return <>{children}</>;
}
