import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { showToast } from '../../components/Toast';
import { useStore } from '../../store/useStore';
import type { Product } from '../../types';
import { Plus, Upload, CreditCard as Edit2, Trash2, X, Check } from 'lucide-react';

interface InventoryItem {
  id: string;
  product_id: string;
  product_name: string;
  platform_name: string;
  code: string;
  status: string;
  created_at: string;
}

export const Inventory = () => {
  const { user } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ code: '', status: '' });
  const [formData, setFormData] = useState({
    product_id: '',
    codes: '',
  });

  useEffect(() => {
    loadProducts();
    loadInventory();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_deleted', false)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      showToast('فشل تحميل المنتجات', 'error');
    }
  };

  const loadInventory = async () => {
    if (!user?.phone_number) return;

    try {
      const { data, error } = await supabase
        .rpc('admin_get_inventory', { p_admin_phone: user.phone_number });

      if (error) throw error;
      setInventory(data || []);
    } catch (error: any) {
      showToast('فشل تحميل المخزون', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.phone_number) {
      showToast('غير مصرح', 'error');
      return;
    }

    const codeList = formData.codes
      .split('\n')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (codeList.length === 0) {
      showToast('يرجى إدخال أكواد صحيحة', 'error');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('admin_add_inventory_bulk', {
        p_admin_phone: user.phone_number,
        p_product_id: formData.product_id,
        p_codes: codeList,
      });

      if (error) throw error;

      if (data?.success) {
        showToast(data.message, 'success');
        setShowForm(false);
        setFormData({ product_id: '', codes: '' });
        loadInventory();
      } else {
        showToast(data?.message || 'فشلت الإضافة', 'error');
      }
    } catch (error: any) {
      showToast('فشلت الإضافة', 'error');
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditData({ code: item.code, status: item.status });
  };

  const handleSaveEdit = async (itemId: string) => {
    if (!user?.phone_number) return;

    try {
      const { data, error } = await supabase.rpc('admin_update_inventory', {
        p_admin_phone: user.phone_number,
        p_inventory_id: itemId,
        p_code: editData.code,
        p_status: editData.status,
      });

      if (error) throw error;

      if (data?.success) {
        showToast(data.message, 'success');
        setEditingId(null);
        loadInventory();
      } else {
        showToast(data?.message || 'فشل التحديث', 'error');
      }
    } catch (error: any) {
      showToast('فشل التحديث', 'error');
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
        showToast(data.message, 'success');
        loadInventory();
      } else {
        showToast(data?.message || 'فشل الحذف', 'error');
      }
    } catch (error: any) {
      showToast('فشل الحذف', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500/20 text-green-400';
      case 'reserved':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'sold':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'متاح';
      case 'reserved':
        return 'محجوز';
      case 'sold':
        return 'مباع';
      case 'pending_approval':
        return 'قيد المراجعة';
      case 'returned':
        return 'مُرجع';
      case 'compromised':
        return 'معطوب';
      default:
        return status;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-white text-2xl font-bold">إدارة المخزون</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>إضافة أكواد</span>
          </div>
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-white text-sm mb-2 text-right">المنتج</label>
              <select
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-white"
                required
              >
                <option value="">اختر المنتج</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white text-sm mb-2 text-right">
                الأكواد (كود في كل سطر)
              </label>
              <textarea
                value={formData.codes}
                onChange={(e) => setFormData({ ...formData, codes: e.target.value })}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-white min-h-[200px] font-mono"
                placeholder="ABC123&#10;DEF456&#10;GHI789"
                required
                dir="ltr"
              />
              <p className="text-gray-400 text-sm mt-1 text-right">
                أدخل كل كود في سطر منفصل
              </p>
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1">
                <div className="flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>إضافة الأكواد</span>
                </div>
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowForm(false)}
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-gray-900 rounded-lg overflow-hidden">
        {inventory.length === 0 ? (
          <div className="p-6">
            <p className="text-gray-400 text-center">
              لا توجد أكواد في المخزون. استخدم النموذج أعلاه لإضافة أكواد جديدة
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">المنصة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">المنتج</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">الكود</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">التاريخ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {item.platform_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {item.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white">
                      {editingId === item.id ? (
                        <input
                          type="text"
                          value={editData.code}
                          onChange={(e) => setEditData({ ...editData, code: e.target.value })}
                          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:border-white"
                          dir="ltr"
                        />
                      ) : (
                        item.code
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {editingId === item.id ? (
                        <select
                          value={editData.status}
                          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:border-white"
                        >
                          <option value="available">متاح</option>
                          <option value="reserved">محجوز</option>
                          <option value="sold">مباع</option>
                          <option value="compromised">معطوب</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(item.status)}`}>
                          {getStatusText(item.status)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(item.created_at).toLocaleDateString('ar-MR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {editingId === item.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            className="text-green-400 hover:text-green-300"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-400 hover:text-gray-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-400 hover:text-blue-300"
                            disabled={item.status === 'sold'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-400 hover:text-red-300"
                            disabled={item.status === 'sold' || item.status === 'reserved'}
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
          </div>
        )}
      </div>
    </div>
  );
};
