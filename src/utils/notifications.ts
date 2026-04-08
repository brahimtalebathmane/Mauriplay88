/**
 * Triggers OneSignal push notifications via Supabase Edge Function.
 * Call this after successful backend actions (order created, top-up approved, etc.).
 */

import { supabase } from '../lib/supabase';
import { logger } from './logger';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
};

export type NotificationType =
  | 'new_order_admin'
  | 'new_topup_admin'
  | 'purchase_success_user'
  | 'topup_approved_user'
  | 'order_approved_user'
  | 'wallet_activated_user';

export interface NotificationPayload {
  type: NotificationType;
  base_url?: string;
  order_id?: string;
  topup_id?: string;
  user_id?: string;
  product_name?: string;
  amount?: number;
}

/**
 * Wait for service worker to be ready so background push can be displayed (Android/iOS PWA).
 * Resolves after ready or after a short timeout so we don't block forever.
 */
async function waitForServiceWorkerReady(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker?.ready) return;
  try {
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((r) => setTimeout(r, 3000)),
    ]);
  } catch {
    // ignore
  }
}

function isInvokeFailure(
  data: unknown,
  error: { message?: string } | null
): boolean {
  if (error) return true;
  if (data && typeof data === 'object' && 'success' in data && (data as { success?: boolean }).success === false) {
    return true;
  }
  return false;
}

const RETRY_DELAYS_MS = [0, 400, 1200, 2800];

/**
 * Fire-and-forget: invoke Edge Function to send OneSignal notification.
 * Waits for service worker ready before sending so push can show in background.
 * Retries on transport errors or JSON { success: false }. Does not throw.
 */
export async function triggerNotification(payload: NotificationPayload): Promise<void> {
  const baseUrl = payload.base_url ?? getBaseUrl();
  const body = { ...payload, base_url: baseUrl };
  try {
    await waitForServiceWorkerReady();
    let lastError: unknown;
    let lastData: unknown;
    for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
      if (RETRY_DELAYS_MS[i] > 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[i]));
      }
      const { data, error } = await supabase.functions.invoke('send-notification', { body });
      lastData = data;
      lastError = error;
      if (!isInvokeFailure(data, error)) {
        logger.debug('Notifications', 'send-notification ok', { type: payload.type, attempt: i + 1 });
        return;
      }
      const errCtx =
        error && typeof error === 'object' && 'context' in error
          ? (error as { context?: { status?: number } }).context
          : undefined;
      logger.warn('Notifications', 'send-notification attempt failed', {
        type: payload.type,
        attempt: i + 1,
        error,
        httpStatus: errCtx?.status,
        data,
      });
    }
    logger.error('Notifications', `send-notification exhausted retries (${payload.type})`, {
      lastError,
      lastData,
    });
  } catch (e) {
    logger.error('Notifications', `send-notification threw (${payload.type})`, e);
  }
}

/** Notify admin: new order (direct or wallet). */
export function notifyAdminNewOrder(orderId: string): void {
  triggerNotification({ type: 'new_order_admin', order_id: orderId });
}

/** Notify admin: new wallet top-up request. */
export function notifyAdminNewTopup(topupId: string): void {
  triggerNotification({ type: 'new_topup_admin', topup_id: topupId });
}

/** Notify user: wallet purchase succeeded. */
export function notifyUserPurchaseSuccess(userId: string, orderId?: string, productName?: string): void {
  triggerNotification({
    type: 'purchase_success_user',
    user_id: userId,
    order_id: orderId,
    product_name: productName,
  });
}

/** Notify user: wallet top-up approved. */
export function notifyUserTopupApproved(userId: string, amount?: number): void {
  triggerNotification({ type: 'topup_approved_user', user_id: userId, amount });
}

/** Notify user: direct (manual) order approved. */
export function notifyUserOrderApproved(userId: string): void {
  triggerNotification({ type: 'order_approved_user', user_id: userId });
}

/** Notify user: wallet was activated by admin. */
export function notifyUserWalletActivated(userId: string): void {
  triggerNotification({ type: 'wallet_activated_user', user_id: userId });
}
