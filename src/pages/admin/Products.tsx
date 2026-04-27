import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { showToast } from '../../components/Toast';
import { useStore } from '../../store/useStore';
import type { Platform } from '../../types';
import { ProductLogo } from '../../components/ProductLogo';
import { ProductRegionBadge } from '../../components/ProductRegionBadge';
import { PRODUCT_REGION_CODES } from '../../constants/productRegions';
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
    product_region: '',
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
          .order('platform_id', { ascending: true })
          .order('price_mru', { ascending: true })
          .order('name', { ascending: true }),
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
      showToast('غير مصرح - يرجى تسجيل الدخول', 'error');
      return;
    }
    if (user.role !== 'admin') {
      showToast('غير مصرح - صلاحيات الأدمن مطلوبة', 'error');
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
          p_logo_url: formData.product_logo_url.trim() || null,
          p_product_region: formData.product_region.trim(),
        });

        if (error) throw error;
        const result = data as { success?: boolean; message?: string };
        if (result?.success) {
          showToast(result.message || 'تم التحديث', 'success');
        } else {
          showToast(result?.message || 'فشل التحديث', 'error');
          return;
        }
      } else {
        const { data, error } = await supabase.rpc('admin_insert_product', {
          p_admin_phone: user.phone_number,
          p_platform_id: formData.platform_id,
          p_name: formData.name,
          p_price_mru: parseFloat(formData.price_mru),
          p_logo_url: formData.product_logo_url.trim() || null,
          p_product_region: formData.product_region.trim() || null,
        });

        if (error) throw error;
        const result = data as { success?: boolean; message?: string };
        if (result?.success) {
          showToast('تمت إضافة المنتج بنجاح', 'success');
        } else {
          showToast(result?.message || 'فشلت الإضافة - تحقق من البيانات', 'error');
          return;
        }
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ platform_id: '', name: '', price_mru: '', product_logo_url: '', product_region: '' });
      loadData();
    } catch (error: any) {
      console.error('Submit error:', error);
      const raw = error?.message || '';
      const msg = /schema cache|could not find the function|404/i.test(raw)
        ? 'الخادم لم يحدّث بعد. تأكد من تطبيق migrations (admin_insert_product/admin_update_product).'
        : raw || (editingId ? 'فشل التحديث' : 'فشلت الإضافة');
      showToast(msg, 'error');
    }
  };

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setFormData({
      platform_id: product.platform_id,
      name: product.name,
      price_mru: product.price_mru.toString(),
      product_logo_url: product.logo_url ?? product.product_logo_url ?? '',
      product_region: product.product_region ?? '',
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
      const result = data as { success?: boolean; message?: string };
      if (result?.success) {
        showToast(result.message || 'تم الحذف بنجاح', 'success');
        await loadData();
      } else {
        showToast(result?.message || 'فشل الحذف', 'error');
      }
    } catch (error: any) {
      const raw = error?.message || '';
      const msg = /schema cache|could not find the function|404/i.test(raw)
        ? 'الخادم لم يحدّث بعد. تأكد من تطبيق migrations (admin_delete_product).'
        : raw || 'فشل الحذف';
      showToast(msg, 'error');
    }
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ platform_id: '', name: '', price_mru: '', product_logo_url: '', product_region: '' });
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
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg p-6 mb-6 border border-gray-800 shadow-xl">
          <div className="space-y-4 text-right">
            <div>
              <label className="block text-white text-sm mb-2">المنصة</label>
              <select
                value={formData.platform_id}
                onChange={(e) => setFormData({ ...formData, platform_id: e.target.value })}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
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
              placeholder="https://example.com/image.png"
            />
            <div>
              <label className="block text-white text-sm mb-2">منطقة المنتج (اختياري)</label>
              <select
                value={formData.product_region}
                onChange={(e) => setFormData({ ...formData, product_region: e.target.value })}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                dir="ltr"
              >
                <option value="">— بدون منطقة —</option>
                {PRODUCT_REGION_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
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
          <div key={product.id} className="bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-blue-500/50 transition-all duration-300">
            <div className="h-16 flex items-center justify-center mb-3 bg-black/20 rounded overflow-hidden">
              <ProductLogo
                logoUrl={product.product_logo_url ?? product.logo_url}
                name={product.name}
                className="max-h-full w-auto object-contain"
              />
            </div>
            <h3 className="text-white text-xl font-bold mb-1 text-center">{product.name}</h3>
            <div className="flex justify-center mb-2">
              <ProductRegionBadge region={product.product_region} />
            </div>
            <p className="text-blue-400 text-center text-sm mb-3 font-medium">{product.platform?.name}</p>
            <p className="text-white text-2xl font-bold text-center mb-5 bg-blue-600/10 py-2 rounded-lg">
              {product.price_mru} <span className="text-xs text-blue-400 font-normal">MRU</span>
            </p>
            <div className="flex gap-2">
              <Button onClick={() => handleEdit(product)} variant="secondary" className="flex-1 py-1 text-sm">
                <div className="flex items-center justify-center gap-2">
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>تعديل</span>
                </div>
              </Button>
              <Button onClick={() => handleDelete(product.id)} variant="danger" className="flex-1 py-1 text-sm">
                <div className="flex items-center justify-center gap-2">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </div>
              </Button>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div className="col-span-full text-center py-20 text-gray-600 border border-dashed border-gray-800 rounded-lg">
            لا توجد منتجات حالياً
          </div>
        )}
      </div>
    </div>
  );
};