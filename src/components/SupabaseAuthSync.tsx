/**
 * After Zustand rehydrates, verify Supabase has a JWT (issue-session).
 * Without it, Realtime RLS and authenticated Edge Function calls fail silently.
 */

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { logger } from '../utils/logger';
import { showToast } from './Toast';

type StoreWithPersist = typeof useStore & {
  persist: { onFinishHydration: (fn: () => void) => () => void };
};

export function SupabaseAuthSync() {
  useEffect(() => {
    const persist = (useStore as StoreWithPersist).persist;
    if (!persist?.onFinishHydration) return;

    const unsub = persist.onFinishHydration(() => {
      void (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const { isLoggedIn, user } = useStore.getState();
        if (isLoggedIn && user && !session) {
          logger.warn('SupabaseAuthSync', 'UI logged in but no Supabase JWT — realtime/notifications need re-login', {
            userId: user.id,
          });
          if (!sessionStorage.getItem('supabase_jwt_missing_warned')) {
            sessionStorage.setItem('supabase_jwt_missing_warned', '1');
            showToast(
              'انتهت الجلسة الأمنية. أعد تسجيل الدخول للتحديثات الفورية والإشعارات.',
              'error'
            );
          }
        }
      })();
    });

    return () => {
      unsub?.();
    };
  }, []);

  return null;
}
