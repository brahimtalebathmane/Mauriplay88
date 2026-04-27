import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { useStore } from '../../../store/useStore';
import type { Platform } from '../../../types';
import { Loader2, Package } from 'lucide-react';
import type { AdminInventoryRow } from './inventoryHelpers';

export const InventoryPlatformList = () => {
  const { user } = useStore();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [productRows, setProductRows] = useState<{ id: string; platform_id: string }[]>([]);
  const [inventory, setInventory] = useState<AdminInventoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, [user?.phone_number]);

  const load = async () => {
    if (!user?.phone_number) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [platRes, prodRes, invRes] = await Promise.all([
        supabase.rpc('get_platforms'),
        supabase.from('products').select('id, platform_id').eq('is_deleted', false),
        supabase.rpc('admin_get_inventory', { p_admin_phone: user.phone_number }),
      ]);

      if (platRes.error) {
        const fb = await supabase.from('platforms').select('*').eq('is_deleted', false).order('name');
        if (fb.error) throw fb.error;
        setPlatforms((fb.data as Platform[]) || []);
      } else {
        setPlatforms((platRes.data as Platform[]) || []);
      }

      if (prodRes.error) throw prodRes.error;
      setProductRows((prodRes.data as { id: string; platform_id: string }[]) || []);

      if (invRes.error) throw invRes.error;
      setInventory((invRes.data as AdminInventoryRow[]) || []);
    } catch (error: unknown) {
      const raw = error instanceof Error ? error.message : String(error);
      const msg = /schema cache|could not find the function|404/i.test(raw)
        ? 'الخادم لم يحدّث بعد. تأكد من تطبيق migrations (admin_get_inventory).'
        : raw || 'فشل تحميل المخزون';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const productPlatformMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of productRows) m.set(p.id, p.platform_id);
    return m;
  }, [productRows]);

  const statsByPlatform = useMemo(() => {
    const productsPer = new Map<string, number>();
    const codesPer = new Map<string, number>();
    for (const p of productRows) {
      productsPer.set(p.platform_id, (productsPer.get(p.platform_id) || 0) + 1);
    }
    for (const row of inventory) {
      const pid = row.platform_id ?? productPlatformMap.get(row.product_id);
      if (!pid) continue;
      codesPer.set(pid, (codesPer.get(pid) || 0) + 1);
    }
    return { productsPer, codesPer };
  }, [inventory, productRows, productPlatformMap]);

  const sortedPlatforms = useMemo(() => {
    return [...platforms].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [platforms]);

  if (loading && platforms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
        <p>جاري تحميل المنصات...</p>
      </div>
    );
  }

  return (
    <div>
      <nav className="text-sm text-gray-400 mb-4 flex flex-wrap items-center gap-2 justify-end" aria-label="مسار التنقل">
        <span className="text-white font-medium">المخزون</span>
        <span className="opacity-50">/</span>
        <span>المنصات</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-white text-2xl font-bold">إدارة المخزون</h2>
          <p className="text-gray-400 text-sm mt-1 text-right">
            اختر منصة لعرض منتجاتها وإدارة الأكواد لكل منتج على صفحة مستقلة
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedPlatforms.map((platform) => {
          const nProducts = statsByPlatform.productsPer.get(platform.id) ?? 0;
          const nCodes = statsByPlatform.codesPer.get(platform.id) ?? 0;
          return (
            <Link
              key={platform.id}
              to={`platform/${platform.id}`}
              className="group bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-cyan-500/40 transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
            >
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 shrink-0 rounded-lg bg-black/40 flex items-center justify-center p-2 overflow-hidden">
                  <img
                    src={platform.logo_url}
                    alt=""
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/icon-72.png';
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <h3 className="text-white font-bold text-lg truncate group-hover:text-cyan-200 transition-colors">
                    {platform.name}
                  </h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-400 justify-end">
                    <span className="inline-flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" aria-hidden />
                      {nProducts} منتج
                    </span>
                    <span>{nCodes} كود في المخزون</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {sortedPlatforms.length === 0 && !loading && (
        <div className="text-center py-16 rounded-xl border border-dashed border-gray-700 text-gray-500">
          لا توجد منصات. أضف منصات من تبويب «المنصات» أولاً.
        </div>
      )}
    </div>
  );
};
