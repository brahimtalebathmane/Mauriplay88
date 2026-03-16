import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { showToast } from '../../components/Toast';
import { useStore } from '../../store/useStore';
import type { Platform } from '../../types';
import { Plus, Trash2, Edit2, Loader2 } from 'lucide-react';

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
  });

  useEffect(() => {
    loadPlatforms();
  }, []);

  const loadPlatforms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .eq('is_deleted', false)
        .order('name');

      if (error) throw error;
      setPlatforms(data || []);
    } catch (error: any) {
      console.error('Load Error:', error);
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
      setSubmitting(true);
      
      // تجهيز البيانات وتنظيف الروابط
      const platformData = {
        name: formData.name.trim(),
        logo_url: formData.logo_url.trim(),
        website_url: formData.website_url.trim() || null,
        tutorial_video_url: formData.tutorial_video_url.trim() || null,
        is_deleted: false,
      };

      if (editingId) {
        // عملية التعديل
        const { error } = await supabase
          .from('platforms')
          .update(platformData)
          .eq('id', editingId);

        if (error) throw error;
        showToast('تم تحديث المنصة بنجاح', 'success');
      } else {
        // عملية الإضافة
        const { error } = await supabase
          .from('platforms')
          .insert([platformData]);

        if (error) throw error;
        showToast('تمت إضافة المنصة بنجاح', 'success');
      }

      // إعادة ضبط النموذج وتحديث القائمة
      handleCancelEdit();
      await loadPlatforms();
    } catch (error: any) {
      console.error('Submit error:', error);
      // عرض تفاصيل الخطأ إذا كان بسبب RLS (42501)
      const msg = error.code === '42501' ? 'خطأ في الصلاحيات: تأكد أنك مسجل كأدمن' : error.message;
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
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المنصة؟')) return;

    try {
      // الحذف الناعم (Soft Delete)
      const { error } = await supabase
        .from('platforms')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) throw error;

      showToast('تم الحذف بنجاح', 'success');
      // تحديث الحالة محلياً فوراً
      setPlatforms(prev => prev.filter(p => p.id !== id));
    } catch (error: any) {
      console.error('Delete Error:', error);
      showToast('فشل الحذف - تحقق من الصلاحيات', 'error');
    }
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', logo_url: '', website_url: '', tutorial_video_url: '' });
  };

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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-cyan-500" />
          <p className="italic">جاري تحميل المنصات من القاعدة...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((platform) => (
            <div key={platform.id} className="bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-cyan-500/50 transition-all duration-300 shadow-sm">
              <div className="h-24 flex items-center justify-center mb-4 bg-black/40 rounded-lg p-4">
                <img
                  src={platform.logo_url}
                  alt={platform.name}
                  className="max-w-full max-h-full object-contain drop-shadow-md"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Image'; }}
                />
              </div>
              <h3 className="text-white text-center font-bold mb-4 text-lg">{platform.name}</h3>
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
          
          {platforms.length === 0 && !loading && (
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