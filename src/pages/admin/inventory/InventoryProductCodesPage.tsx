import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../../components/Button';
import { showToast } from '../../../components/Toast';
import { useStore } from '../../../store/useStore';
import type { Product } from '../../../types';
import { Plus, Upload, CreditCard as Edit2, Trash2, X, Check, ChevronLeft, Loader2 } from 'lucide-react';
import type { InventoryStatus } from '../../../types';
import {
  parseCodesFromInput,
  findCodesAlreadyInProduct,
  getStatusColor,
  getStatusText,
  INVENTORY_STATUS_OPTIONS,
  type AdminInventoryRow,
} from './inventoryHelpers';

type LocationState = { platformName?: string; platformId?: string };

export const InventoryProductCodesPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState | null) ?? {};
  const { user } = useStore();

  const [product, setProduct] = useState<
    (Product & { platform?: { name: string; id?: string } }) | null
  >(null);
  const [rows, setRows] = useState<AdminInventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [codesInput, setCodesInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ code: '', status: '' as string });

  const platformId = product?.platform_id ?? state.platformId;
  const platformName = product?.platform?.name ?? state.platformName;

  useEffect(() => {
    void load();
  }, [user?.phone_number, productId]);

  const load = async () => {
    if (!productId || !user?.phone_number) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [prodRes, invRes] = await Promise.all([
        supabase
          .from('products')
          .select('*, platform:platforms(name, id)')
          .eq('id', productId)
          .eq('is_deleted', false)
          .maybeSingle(),
        supabase.rpc('admin_get_inventory', { p_admin_phone: user.phone_number }),
      ]);

      if (prodRes.error) throw prodRes.error;
      if (!prodRes.data) {
        showToast('المنتج غير موجود', 'error');
        navigate('/admin/inventory', { replace: true });
        return;
      }
      setProduct(prodRes.data as Product & { platform?: { name: string; id?: string } });

      if (invRes.error) throw invRes.error;
      const all = (invRes.data as AdminInventoryRow[]) || [];
      setRows(
        all
          .filter((r) => r.product_id === productId)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      );
    } catch (error: unknown) {
      const raw = error instanceof Error ? error.message : String(error);
      const msg = /schema cache|could not find the function|404/i.test(raw)
        ? 'الخادم لم يحدّث بعد. تأكد من تطبيق migrations (admin_get_inventory).'
        : raw || 'فشل التحميل';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const existingCodeStrings = useMemo(() => rows.map((r) => r.code), [rows]);

  const handleAddCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.phone_number || !productId) return;

    const parsed = parseCodesFromInput(codesInput);
    if (parsed.length === 0) {
      showToast('يرجى إدخال أكواد صحيحة (سطر لكل كود)', 'error');
      return;
    }

    const already = findCodesAlreadyInProduct(parsed, existingCodeStrings);
    if (already.length > 0) {
      showToast(
        `توجد ${already.length} أكواد مكررة بالفعل لهذا المنتج في المخزون. أزلها من القائمة أو عدّل الإدخال.`,
        'error'
      );
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('admin_add_inventory_bulk', {
        p_admin_phone: user.phone_number,
        p_product_id: productId,
        p_codes: parsed,
      });

      if (error) throw error;

      if (data?.success) {
        showToast(data.message as string, 'success');
        setCodesInput('');
        setShowAddForm(false);
        await load();
      } else {
        showToast((data?.message as string) || 'فشلت الإضافة', 'error');
      }
    } catch (error: unknown) {
      const raw = error instanceof Error ? error.message : String(error);
      const msg = /schema cache|could not find the function|404/i.test(raw)
        ? 'الخادم لم يحدّث بعد. تأكد من تطبيق migrations (admin_add_inventory_bulk).'
        : raw || 'فشلت الإضافة';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (itemId: string) => {
    if (!user?.phone_number) return;
    try {
      const { data, error } = await supabase.rpc('admin_update_inventory', {
        p_admin_phone: user.phone_number,
        p_inventory_id: itemId,
        p_code: editData.code.trim(),
        p_status: editData.status as InventoryStatus,
      });

      if (error) throw error;
      if (data?.success) {
        showToast(data.message as string, 'success');
        setEditingId(null);
        await load();
      } else {
        showToast((data?.message as string) || 'فشل التحديث', 'error');
      }
    } catch (error: unknown) {
      const raw = error instanceof Error ? error.message : String(error);
      showToast(raw || 'فشل التحديث', 'error');
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!user?.phone_number) return;
    if (!confirm('هل أنت متأكد من حذف هذا الكود؟')) return;

    try {
      const { data, error } = await supabase.rpc('admin_delete_inventory', {
        p_admin_phone: user.phone_number,
        p_inventory_id: itemId,
      });

      if (error) throw error;
      if (data?.success) {
        showToast(data.message as string, 'success');
        await load();
      } else {
        showToast((data?.message as string) || 'فشل الحذف', 'error');
      }
    } catch (error: unknown) {
      const raw = error instanceof Error ? error.message : String(error);
      showToast(raw || 'فشل الحذف', 'error');
    }
  };

  const backToProductsHref =
    platformId != null && platformId !== '' ? `../platform/${platformId}` : '..';

  if (loading && !product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div>
      <nav
        className="text-sm text-gray-400 mb-4 flex flex-wrap items-center gap-2 justify-end"
        aria-label="مسار التنقل"
      >
        <Link to="/admin/inventory" className="hover:text-white transition-colors">
          المخزون
        </Link>
        <span className="opacity-50">/</span>
        {platformId ? (
          <Link to={backToProductsHref} className="hover:text-white transition-colors truncate max-w-[140px]">
            {platformName ?? 'المنصة'}
          </Link>
        ) : (
          <span className="truncate max-w-[140px]">{platformName ?? '—'}</span>
        )}
        <span className="opacity-50">/</span>
        <span className="truncate max-w-[160px]">{product?.name ?? '…'}</span>
        <span className="opacity-50">/</span>
        <span className="text-white font-medium">الأكواد</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
        <Link
          to={backToProductsHref}
          className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center self-start"
          aria-label="العودة إلى منتجات المنصة"
        >
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1 min-w-0 text-right">
          <h2 className="text-white text-2xl font-bold break-words">{product?.name}</h2>
          <p className="text-gray-400 text-sm mt-1">
            {platformName ? `المنصة: ${platformName}` : null}
            {platformName ? ' · ' : ''}
            {rows.length} كود في المخزون
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="shrink-0 self-start w-full sm:w-auto"
        >
          <span className="inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            إضافة أكواد
          </span>
        </Button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddCodes}
          className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800 space-y-4"
        >
          <div>
            <label className="block text-white text-sm mb-2 text-right">الأكواد (سطر لكل كود)</label>
            <textarea
              value={codesInput}
              onChange={(e) => setCodesInput(e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500/60 min-h-[200px] font-mono text-sm"
              placeholder={'ABC123\nDEF456'}
              dir="ltr"
              disabled={submitting}
            />
            <p className="text-gray-500 text-xs mt-2 text-right">
              يُزال التكرار داخل النص تلقائياً. لن تُقبل أكواد موجودة مسبقاً لهذا المنتج قبل الإرسال.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" className="flex-1" disabled={submitting}>
              <span className="inline-flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                إضافة إلى المخزون
              </span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              disabled={submitting}
              onClick={() => {
                setShowAddForm(false);
                setCodesInput('');
              }}
            >
              إلغاء
            </Button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900/80">
        <table className="w-full min-w-[720px]">
          <thead className="bg-gray-800/90">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">الكود</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">الحالة</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">التاريخ</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {rows.map((item) => (
              <tr key={item.id} className="hover:bg-gray-800/40">
                <td className="px-4 py-3 text-sm font-mono text-white whitespace-nowrap">
                  {editingId === item.id ? (
                    <input
                      type="text"
                      value={editData.code}
                      onChange={(e) => setEditData({ ...editData, code: e.target.value })}
                      className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white focus:outline-none focus:border-cyan-500/50 w-full max-w-xs"
                      dir="ltr"
                    />
                  ) : (
                    item.code
                  )}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  {editingId === item.id ? (
                    <select
                      value={editData.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white focus:outline-none focus:border-cyan-500/50"
                    >
                      {INVENTORY_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(item.status)}`}>
                      {getStatusText(item.status)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                  {new Date(item.created_at).toLocaleDateString('ar-MR')}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  {editingId === item.id ? (
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(item.id)}
                        className="text-green-400 hover:text-green-300 p-1"
                        aria-label="حفظ"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-gray-400 hover:text-gray-300 p-1"
                        aria-label="إلغاء التعديل"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(item.id);
                          setEditData({ code: item.code, status: item.status });
                        }}
                        className="text-blue-400 hover:text-blue-300 disabled:opacity-40 p-1"
                        disabled={item.status === 'sold'}
                        aria-label="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="text-red-400 hover:text-red-300 disabled:opacity-40 p-1"
                        disabled={item.status === 'sold' || item.status === 'reserved'}
                        aria-label="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !loading && (
          <p className="text-center text-gray-500 py-12 px-4">لا توجد أكواد لهذا المنتج بعد. استخدم «إضافة أكواد».</p>
        )}
      </div>
    </div>
  );
};
