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

    if (!user?.phone_number) {
      showToast('غير مصرح', 'error');
      return;
    }

    try {
      if (editingId) {
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
        const { error } = await supabase.from('platforms').insert([formData]);
        if (error) throw error;
        showToast('تمت إضافة المنصة', 'success');
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', logo_url: '', website_url: '', tutorial_video_url: '' });
      loadPlatforms();
    } catch (error: any) {
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
            <span>إضافة منصة</span>
          </div>
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <Input
              label="اسم المنصة"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="رابط الشعار"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              required
            />
            <Input
              label="رابط الموقع"
              value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
            />
            <Input
              label="رابط فيديو الشرح"
              value={formData.tutorial_video_url}
              onChange={(e) => setFormData({ ...formData, tutorial_video_url: e.target.value })}
            />
            <div className="flex gap-3">
              <Button type="submit" className="flex-1">حفظ</Button>
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
          <div key={platform.id} className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <img
              src={platform.logo_url}
              alt={platform.name}
              className="w-20 h-20 object-contain mx-auto mb-4"
            />
            <h3 className="text-white text-center font-bold mb-2">{platform.name}</h3>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => handleEdit(platform)}
                className="flex-1"
              >
                <div className="flex items-center justify-center gap-2">
                  <Edit2 className="w-4 h-4" />
                  <span>تعديل</span>
                </div>
              </Button>
              <Button
                onClick={() => handleDelete(platform.id)}
                variant="danger"
                className="flex-1"
              >
                <div className="flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  <span>حذف</span>
                </div>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
