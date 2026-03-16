import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { showToast } from '../../components/Toast';
import { useStore } from '../../store/useStore';
import type { Platform } from '../../types';
import { Plus, Trash2, CreditCard as Edit2 } from 'lucide-react';

export const Products = () => {
  const { user } = useStore();
  const [products, setProducts] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [_loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    platform_id: '',
    name: '',
    price_mru: '',
    product_logo_url: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, platformsRes] = await Promise.all([
        supabase
          .from('products')
          .select('*, platform:platforms(name)')
          .eq('is_deleted', false)
          .order('name'),
        supabase.from('platforms').select('*').eq('is_deleted', false),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (platformsRes.error) throw platformsRes.error;

      setProducts(productsRes.data || []);
      setPlatforms(platformsRes.data || []);
    } catch (error: any) {
      showToast('فشل تحميل المنتجات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast('غير مصرح', 'error');
      return;
    }

    try {
      if (editingId) {
        // تحديث المنتج عبر RPC
        const { data, error } = await supabase.rpc('admin_update_product', {
          p_admin_phone: user.phone_number,
          p_product_id: editingId,
          p_name: formData.name,
          p_price_mru: parseFloat(formData.price_mru),
        });

        if (error) throw error;
        if (data?.success) {
          showToast(data.message, 'success');
        } else {
          showToast(data?.message || 'فشل التحديث', 'error');
          return;
        }
      } else {
        // إضافة المنتج عبر RPC (تجاوز خطأ 400 و 401)
        const { data, error } = await supabase.rpc('add_product_v2', {
          p_platform_id: formData.platform_id,
          p_name: formData.name,
          p_price_mru: parseFloat(formData.price_mru),
          p_product_logo_url: formData.product_logo_url || null,
        });

        if (error) throw error;
        if (data?.success) {
          showToast('تمت إضافة المنتج بنجاح', 'success');
        } else {
          showToast(data?.message || 'فشلت الإضافة', 'error');
          return;
        }
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ platform_id: '', name: '', price_mru: '', product_logo_url: '' });
      loadData();
    } catch (error: any) {
      console.error('Submit error:', error);
      showToast(editingId ? 'فشل التحديث' : 'فشلت الإضافة', 'error');
    }
  };

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setFormData({
      platform_id: product.platform_id,
      name: product.name,
      price_mru: product.price_mru.toString(),
      product_logo_url: product.product_logo_url || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!user?.phone_number) {
      showToast('غير مصرح', 'error');
      return;
    }

    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

    try {
      const { data, error } = await supabase.rpc('admin_delete_product', {
        p_admin_phone: user.phone_number,
        p_product_id: id,
      });

      if (error) throw error;
      if (data?.success) {
        showToast(data.message, 'success');
        loadData();
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
    setFormData({ platform_id: '', name: '', price_mru: '', product_logo_url: '' });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-white text-2xl font-bold">المنتجات</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>{showForm ? 'إلغاء' : 'إضافة منتج'}</span>
          </div>
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg p-6 mb-6 border border-gray-800">
          <div className="space-y-4 text-right">
            <div>
              <label className="block text-white text-sm mb-2">المنصة</label>
              <select
                value={formData.platform_id}
                onChange={(e) => setFormData({ ...formData, platform_id: e.target.value })}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                required
                dir="rtl"
              >
                <option value="">اختر المنصة</option>
                {platforms.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="اسم المنتج"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="مثال: 660 UC"
            />
            <Input
              label="السعر (MRU)"
              type="number"
              step="0.01"
              value={formData.price_mru}
              onChange={(e) => setFormData({ ...formData, price_mru: e.target.value })}
              required
              placeholder="0.00"
            />
            <Input
              label="رابط شعار المنتج (اختياري)"
              type="url"
              value={formData.product_logo_url}
              onChange={(e) => setFormData({ ...formData, product_logo_url: e.target.value })}
              placeholder="https://..."
            />
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                {editingId ? 'تحديث المنتج' : 'حفظ المنتج'}
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
        {products.map((product) => (
          <div key={product.id} className="bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-blue-500 transition-all">
            {product.product_logo_url && (
              <img src={product.product_logo_url} alt="" className="w-12 h-12 mx-auto mb-2 object-contain" />
            )}
            <h3 className="text-white text-xl font-bold mb-1 text-center">{product.name}</h3>
            <p className="text-blue-400 text-center text-sm mb-3">{product.platform?.name}</p>
            <p className="text-white text-2xl font-bold text-center mb-4">
              {product.price_mru} <span className="text-xs text-gray-400">MRU</span>
            </p>
            <div className="flex gap-2">
              <Button onClick={() => handleEdit(product)} className="flex-1 py-1">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Edit2 className="w-4 h-4" />
                  <span>تعديل</span>
                </div>
              </Button>
              <Button onClick={() => handleDelete(product.id)} variant="danger" className="flex-1 py-1">
                <div className="flex items-center justify-center gap-2 text-sm">
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