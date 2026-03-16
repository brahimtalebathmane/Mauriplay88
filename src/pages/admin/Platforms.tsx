import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { showToast } from '../../components/Toast';
import { useStore } from '../../store/useStore';
import type { Platform } from '../../types';
import { Plus, Trash2, CreditCard as Edit2 } from 'lucide-react';

export const Platforms = () => {
  const { user } = useStore();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [_loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    website_url: '',
    tutorial_video_url: '',
  });

  useEffect(() => {
    loadPlatforms();
  }, []);

  const loadPlatforms = async () => {
    try {
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .eq('is_deleted', false)
        .order('name');

      if (error) throw error;
      setPlatforms(data || []);
    } catch (error: any) {
      showToast('فشل تحميل المنصات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast('غير مصرح - الرجاء تسجيل الدخول', 'error');
      return;
    }

    try {
      if (editingId) {
        // تحديث منصة موجودة عبر RPC
        const { data, error } = await supabase.rpc('admin_update_platform', {
          p_admin_phone: user.phone_number,
          p_platform_id: editingId,
          p_name: formData.name,
          p_logo_url: formData.logo_url,
          p_website_url: formData.website_url || null,
          p_tutorial_video_url: formData.tutorial_video_url || null,
        });

        if (error) throw error;

        if (data?.success) {
          showToast(data.message, 'success');
        } else {
          showToast(data?.message || 'فشل التحديث', 'error');
          return;
        }
      } else {
        // إضافة منصة جديدة عبر RPC (الحل النهائي لخطأ 401)
        const { data, error } = await supabase.rpc('add_platform_v2', {
          p_name: formData.name,
          p_logo_url: formData.logo_url,
          p_website_url: formData.website_url || null,
          p_tutorial_url: formData.tutorial_video_url || null
        });

        if (error) throw error;

        // الدالة ترجع كائن يحتوي على success
        if (data && (data.success === true || data.success === 'true')) {
          showToast('تمت إضافة المنصة بنجاح', 'success');
        } else {
          showToast(data?.message || data?.error || 'فشلت الإضافة - تحقق من الصلاحيات', 'error');
          return;
        }
      }

      // إعادة ضبط النموذج وتحديث القائمة
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', logo_url: '', website_url: '', tutorial_video_url: '' });
      await loadPlatforms();
    } catch (error: any) {
      console.error('Submit error:', error);
      showToast(editingId ? 'فشل التحديث' : 'فشلت الإضافة', 'error');
    }
  };

  const handleEdit = (platform: Platform) => {
    setEditingId(platform.id);
    setFormData({
      name: platform.name,
      logo_url: platform.logo_url,
      website_url: platform.website_url || '',
      tutorial_video_url: platform.tutorial_video_url || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!user?.phone_number) {
      showToast('غير مصرح', 'error');
      return;
    }

    if (!confirm('هل أنت متأكد من حذف هذه المنصة؟ سيتم حذف جميع المنتجات المرتبطة بها.')) return;

    try {
      const { data, error } = await supabase.rpc('admin_delete_platform', {
        p_admin_phone: user.phone_number,
        p_platform_id: id,
      });

      if (error) throw error;

      if (data?.success) {
        showToast(data.message, 'success');
        loadPlatforms();
      } else {
        showToast(data?.message || 'فشل الحذف', 'error');
      }
    } catch (error: any) {
      showToast('فشل الحذف', 'error');
    }
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', logo_url: '', website_url: '', tutorial_video_url: '' });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-white text-2xl font-bold">المنصات</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>{showForm ? 'إغلاق النموذج' : 'إضافة منصة'}</span>
          </div>
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg p-6 mb-6 border border-gray-800">
          <div className="space-y-4">
            <Input
              label="اسم المنصة"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="مثال: PUBG Mobile"
            />
            <Input
              label="رابط الشعار"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              required
              placeholder="https://example.com/logo.png"
            />
            <Input
              label="رابط الموقع (اختياري)"
              value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              placeholder="https://..."
            />
            <Input
              label="رابط فيديو الشرح (اختياري)"
              value={formData.tutorial_video_url}
              onChange={(e) => setFormData({ ...formData, tutorial_video_url: e.target.value })}
              placeholder="https://youtube.com/..."
            />
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">
                {editingId ? 'تحديث المنصة' : 'حفظ المنصة'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelEdit}
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {platforms.map((platform) => (
          <div key={platform.id} className="bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-blue-500/50 transition-colors">
            <div className="h-24 flex items-center justify-center mb-4 bg-black/20 rounded-lg p-2">
              <img
                src={platform.logo_url}
                alt={platform.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <h3 className="text-white text-center font-bold mb-4 text-lg">{platform.name}</h3>
            <div className="flex gap-2">
              <Button
                onClick={() => handleEdit(platform)}
                variant="secondary"
                className="flex-1 py-2"
              >
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>تعديل</span>
                </div>
              </Button>
              <Button
                onClick={() => handleDelete(platform.id)}
                variant="danger"
                className="flex-1 py-2"
              >
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </div>
              </Button>
            </div>
          </div>
        ))}
        {platforms.length === 0 && (
          <div className="col-span-full text-center py-12 bg-gray-900/50 rounded-lg border border-dashed border-gray-800">
            <p className="text-gray-500">لا توجد منصات مضافة حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
};