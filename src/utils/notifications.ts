/**
 * Triggers OneSignal push notifications via Supabase Edge Function.
 * Call this after successful backend actions (order created, top-up approved, etc.).
 */

import { supabase } from '../lib/supabase';

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
 * Fire-and-forget: invoke Edge Function to send OneSignal notification.
 * Does not throw; failures are logged only.
 */
export async function triggerNotification(payload: NotificationPayload): Promise<void> {
  const baseUrl = payload.base_url ?? getBaseUrl();
  try {
    await supabase.functions.invoke('send-notification', {
      body: { ...payload, base_url: baseUrl },
    });
  } catch (e) {
    console.warn('[Notifications] Failed to trigger:', payload.type, e);
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
