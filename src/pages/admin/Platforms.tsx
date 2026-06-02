import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { showToast } from '../../components/Toast';
import { useStore } from '../../store/useStore';
import type { Platform } from '../../types';
import { dedupeById } from '../../utils/dedupeById';
import { Plus, Trash2, Edit2, Loader2, ChevronUp, ChevronDown, Power } from 'lucide-react';

function sortPlatforms(items: Platform[]): Platform[] {
  return [...items].sort((a, b) => {
    const orderA = a.display_order ?? 0;
    const orderB = b.display_order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name, 'ar');
  });
}

function normalizePlatforms(data: Platform[] | null | undefined): Platform[] {
  return sortPlatforms(dedupeById(data ?? []));
}

export const Platforms = () => {
  const { user } = useStore();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    website_url: '',
    tutorial_video_url: '',
    description: '',
  });

  const loadPlatforms = async () => {
    try {
      setLoading(true);
      if (user?.phone_number) {
        const { data, error } = await supabase.rpc('get_admin_platforms', {
          p_admin_phone: user.phone_number,
        });
        if (error) throw error;
        setPlatforms(normalizePlatforms(data as Platform[]));
        return;
      }
      const { data, error } = await supabase.rpc('get_platforms');
      if (error) {
        const fallback = await supabase
          .from('platforms')
          .select('*')
          .eq('is_deleted', false)
          .order('name');
        if (fallback.error) throw fallback.error;
        setPlatforms(normalizePlatforms(fallback.data as Platform[]));
        return;
      }
      setPlatforms(normalizePlatforms(data as Platform[]));
    } catch (error: any) {
      console.error('Load Error:', error);
      showToast(error?.message || 'فشل تحميل المنصات', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPlatforms();
  }, [user?.phone_number]);

  const movePlatform = async (index: number, direction: -1 | 1) => {
    if (!user?.phone_number) {
      showToast('يجب تسجيل الدخول كمسؤول', 'error');
      return;
    }
    const target = index + direction;
    if (target < 0 || target >= platforms.length) return;
    const reordered = [...platforms];
    const tmp = reordered[index];
    reordered[index] = reordered[target];
    reordered[target] = tmp;
    const ids = reordered.map((p) => p.id);
    try {
      setSubmitting(true);
      const { data, error } = await supabase.rpc('admin_reorder_platforms', {
        p_admin_phone: user.phone_number,
        p_ordered_ids: ids,
      });
      if (error) throw error;
      const result = data as { success?: boolean; message?: string };
      if (result?.success === false) {
        showToast(result.message || 'فشل حفظ الترتيب', 'error');
        return;
      }
      setPlatforms(normalizePlatforms(reordered));
      showToast(result?.message || 'تم حفظ الترتيب', 'success');
    } catch (error: any) {
      const raw = error?.message || '';
      const msg = /schema cache|could not find the function|404/i.test(raw)
        ? 'الخادم لم يحدّث بعد. تأكد من تطبيق migrations (admin_reorder_platforms).'
        : raw || 'فشل حفظ الترتيب';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePlatformEnabled = async (platformId: string) => {
    if (!user?.phone_number) {
      showToast('غير مصرح', 'error');
      return;
    }
    try {
      setSubmitting(true);
      const { data, error } = await supabase.rpc('admin_toggle_platform_enabled', {
        p_admin_phone: user.phone_number,
        p_platform_id: platformId,
      });
      if (error) throw error;
      const result = data as { success?: boolean; message?: string };
      if (result?.success === false) {
        showToast(result.message || 'فشل التحديث', 'error');
        return;
      }
      showToast(result?.message || 'تم التحديث', 'success');
      await loadPlatforms();
    } catch (error: any) {
      const raw = error?.message || '';
      const msg = /schema cache|could not find the function|404/i.test(raw)
        ? 'الخادم لم يحدّث بعد. تأكد من تطبيق migrations (admin_toggle_platform_enabled).'
        : raw || 'فشل التحديث';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast('غير مصرح - الرجاء تسجيل الدخول', 'error');
      return;
    }
    const role = (user as { role?: string }).role;
    if (role !== 'admin') {
      showToast(role === undefined ? 'انتهت الجلسة أو لم يتم تحميل الصلاحيات - يرجى تسجيل الدخول مرة أخرى' : 'غير مصرح - صلاحيات الأدمن مطلوبة', 'error');
      return;
    }

    try {
      setSubmitting(true);

      if (editingId) {
        const { data, error } = await supabase.rpc('admin_update_platform', {
          p_admin_phone: user.phone_number,
          p_platform_id: editingId,
          p_name: formData.name.trim(),
          p_logo_url: formData.logo_url.trim(),
          p_website_url: formData.website_url.trim() || null,
          p_tutorial_video_url: formData.tutorial_video_url.trim() || null,
          p_description: formData.description.trim() || null,
        });
        if (error) throw error;
        const result = data as { success?: boolean; message?: string };
        if (result.success === false) {
          showToast(result.message || 'Operation failed. Check permissions.', 'error');
          return;
        }
        showToast('تم تحديث المنصة بنجاح', 'success');
      } else {
        const { data, error } = await supabase.rpc('admin_insert_platform', {
          p_admin_phone: user.phone_number,
          p_name: formData.name.trim(),
          p_logo_url: formData.logo_url.trim(),
          p_website_url: formData.website_url.trim() || null,
          p_tutorial_video_url: formData.tutorial_video_url.trim() || null,
          p_description: formData.description.trim() || null,
        });
        if (error) throw error;
        const result = data as { success?: boolean; message?: string };
        if (result.success === false) {
          showToast(result.message || 'Operation failed. Check permissions.', 'error');
          return;
        }
        showToast('تمت إضافة المنصة بنجاح', 'success');
      }

      handleCancelEdit();
      await loadPlatforms();
    } catch (error: any) {
      console.error('Submit error:', error);
      const raw = error?.message || '';
      const msg =
        error?.code === '42501'
          ? 'خطأ في الصلاحيات: تأكد أن حسابك يمتلك رتبة admin'
          : /schema cache|could not find the function/i.test(raw)
            ? 'الخادم لم يحدّث بعد. تأكد من تطبيق migrations (admin_update_platform).'
            : raw || 'Operation failed. Check permissions or try again.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (platform: Platform) => {
    setEditingId(platform.id);
    setFormData({
      name: platform.name,
      logo_url: platform.logo_url || '',
      website_url: platform.website_url || '',
      tutorial_video_url: platform.tutorial_video_url || '',
      description: platform.description?.trim() ? platform.description : '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!user) {
      showToast('غير مصرح - الرجاء تسجيل الدخول', 'error');
      return;
    }
    const role = (user as { role?: string }).role;
    if (role !== 'admin') {
      showToast(role === undefined ? 'انتهت الجلسة - يرجى تسجيل الدخول مرة أخرى' : 'غير مصرح - صلاحيات الأدمن مطلوبة', 'error');
      return;
    }
    if (!confirm('هل أنت متأكد من حذف هذه المنصة؟')) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('admin_delete_platform', {
        p_admin_phone: user.phone_number,
        p_platform_id: id,
      });
      if (error) throw error;
      const result = data as { success?: boolean; message?: string };
      if (result.success === false) {
        showToast(result.message || 'Operation failed. Check permissions.', 'error');
        return;
      }
      showToast('تم الحذف بنجاح', 'success');
      await loadPlatforms();
    } catch (error: any) {
      console.error('Delete Error:', error);
      const raw = error?.message || '';
      const msg = /schema cache|could not find the function/i.test(raw)
        ? 'الخادم لم يحدّث بعد. تأكد من تطبيق migrations (admin_delete_platform).'
        : raw || 'Operation failed. Check permissions or try again.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', logo_url: '', website_url: '', tutorial_video_url: '', description: '' });
  };

  const displayPlatforms = useMemo(() => normalizePlatforms(platforms), [platforms]);

  return (
    <div className="p-4 md:p-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-white text-2xl font-bold">إدارة المنصات</h2>
        <Button
          disabled={submitting}
          onClick={() => {
            if (showForm) handleCancelEdit();
            else setShowForm(true);
          }}
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>{showForm ? 'إغلاق النموذج' : 'إضافة منصة جديدة'}</span>
          </div>
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg p-6 mb-6 border border-gray-800 shadow-xl animate-in fade-in slide-in-from-top-4">
          <div className="space-y-4">
            <Input
              label="اسم المنصة"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="مثال: PUBG Mobile"
              disabled={submitting}
            />
            <Input
              label="رابط الشعار (Image URL)"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              required
              placeholder="https://example.com/logo.png"
              disabled={submitting}
            />
            <Input
              label="رابط الموقع (اختياري)"
              value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              placeholder="https://..."
              disabled={submitting}
            />
            <Input
              label="رابط فيديو الشرح (اختياري)"
              value={formData.tutorial_video_url}
              onChange={(e) => setFormData({ ...formData, tutorial_video_url: e.target.value })}
              placeholder="https://youtube.com/..."
              disabled={submitting}
            />
            <div className="w-full">
              <label className="block text-gray-300 text-caption font-medium mb-2 text-right">
                وصف المنصة (اختياري)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="نبذة قصيرة تظهر للمستخدمين تحت اسم المنصة"
                disabled={submitting}
                rows={4}
                maxLength={2000}
                className="w-full min-h-[100px] bg-card text-white border border-white/10 rounded-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50 transition-colors text-right resize-y"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={submitting}>
                <div className="flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'تحديث المنصة' : 'حفظ المنصة'}
                </div>
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelEdit}
                className="flex-1"
                disabled={submitting}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </form>
      )}

      {loading && displayPlatforms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-cyan-500" />
          <p className="italic">جاري تحديث البيانات...</p>
        </div>
      ) : (
        <div className="admin-platform-grid">
          {displayPlatforms.map((platform, index) => (
            <div
              key={platform.id}
              className="platform-card-rtl bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-cyan-500/50 transition-colors duration-200 shadow-sm"
            >
              <div className="h-24 flex items-center justify-center mb-4 bg-black/40 rounded-lg p-4">
                <img
                  src={platform.logo_url}
                  alt={platform.name}
                  className="max-w-full max-h-full object-contain drop-shadow-md"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/icon-72.png'; }}
                />
              </div>
              <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
                <h3 className="text-white text-center font-bold text-lg">{platform.name}</h3>
                {platform.is_enabled === false ? (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    معطلة عن العرض
                  </span>
                ) : null}
              </div>
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 py-2 text-xs"
                  disabled={submitting || index === 0}
                  onClick={() => void movePlatform(index, -1)}
                  title="أعلى في القائمة"
                >
                  <ChevronUp className="w-4 h-4 mx-auto" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 py-2 text-xs"
                  disabled={submitting || index === displayPlatforms.length - 1}
                  onClick={() => void movePlatform(index, 1)}
                  title="أسفل في القائمة"
                >
                  <ChevronDown className="w-4 h-4 mx-auto" />
                </Button>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-full mb-3 py-2 text-sm border border-white/10"
                disabled={submitting || !user?.phone_number}
                onClick={() => void togglePlatformEnabled(platform.id)}
              >
                <div className="flex items-center justify-center gap-2">
                  <Power className="w-3.5 h-3.5" />
                  <span>{platform.is_enabled === false ? 'تفعيل العرض' : 'تعطيل العرض'}</span>
                </div>
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleEdit(platform)}
                  variant="secondary"
                  className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 border-none"
                  disabled={submitting}
                >
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>تعديل</span>
                  </div>
                </Button>
                <Button
                  onClick={() => handleDelete(platform.id)}
                  variant="danger"
                  className="flex-1 py-2"
                  disabled={submitting}
                >
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </div>
                </Button>
              </div>
            </div>
          ))}

          {displayPlatforms.length === 0 && !loading && (
            <div className="col-span-full text-center py-20 bg-gray-900/50 rounded-lg border border-dashed border-gray-800">
              <p className="text-gray-500 mb-2">لا توجد منصات متاحة حالياً</p>
              <p className="text-sm text-gray-600">اضغط على "إضافة منصة جديدة" للبدء</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
