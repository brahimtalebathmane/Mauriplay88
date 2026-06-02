/**
 * Subscribes to server-emitted low-stock events (inventory → 1 unit left).
 * Shows an in-app toast for admins; push is sent server-side via pg_net.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { showToast } from './Toast';
import { logger } from '../utils/logger';

export function LowStockAlertListener() {
  const { user } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id || user.role !== 'admin') return;

    const channel = supabase
      .channel(`admin-low-stock-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inventory_low_stock_events',
        },
        (payload) => {
          const row = payload.new as { product_name?: string; product_id?: string } | null;
          const name =
            typeof row?.product_name === 'string' && row.product_name.trim() !== ''
              ? row.product_name
              : 'منتج';
          logger.info('LowStockAlert', 'realtime low stock event', row);
          showToast(`تنبيه مخزون: تبقى وحدة واحدة فقط من «${name}»`, 'info');
          if (row?.product_id) {
            navigate(`/admin/products`);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.warn('LowStockAlert', `realtime ${status}`, err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role, navigate]);

  return null;
}
