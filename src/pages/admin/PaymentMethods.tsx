import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { showToast } from '../../components/Toast';
import { useStore } from '../../store/useStore';
import type { PaymentMethod } from '../../types';
import { Plus, Power, Trash2, Pencil } from 'lucide-react';

export const PaymentMethods = () => {
  const { user } = useStore();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    account_number: '',
    logo_url: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    account_number: '',
    logo_url: '',
  });

  const startEdit = (method: PaymentMethod) => {
    setEditingId(method.id);
    setEditForm({
      name: method.name,
      account_number: method.account_number,
      logo_url: method.logo_url || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', account_number: '', logo_url: '' });
  };

  const saveEdit = async (id: string) => {
    if (!user || user.role !== 'admin') {
      showToast('غير مصرح', 'error');
      return;
    }
    try {
      const { data, error } = await supabase.rpc('admin_update_payment_method', {
        p_admin_phone: user.phone_number,
        p_method_id: id,
        p_name: editForm.name.trim(),
        p_account_number: editForm.account_number.trim(),
        p_logo_url: editForm.logo_url.trim() || null,
      });
      if (error) throw error;
      const result = data as { success?: boolean; message?: string };
      if (result?.success) {
        showToast(result.message || 'تم حفظ التعديلات', 'success');
        cancelEdit();
        await loadMethods();
      } else {
        showToast(result?.message || 'فشل الحفظ', 'error');
      }
    } catch (error: any) {
      showToast('فشل الحفظ', 'error');
    }
  };

  useEffect(() => {
    if (user?.phone_number) {
      loadMethods();
    } else {
      setLoading(false);
    }
  }, [user?.phone_number]);

  const loadMethods = async () => {
    if (!user?.phone_number) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_payment_methods_for_admin', {
        p_admin_phone: user.phone_number,
      });

      if (error) throw error;
      setMethods((data as PaymentMethod[]) || []);
    } catch (error: any) {
      showToast('فشل تحميل وسائل الدفع', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role !== 'admin') {
      showToast('غير مصرح - صلاحيات الأدمن مطلوبة', 'error');
      return;
    }
    try {
      const { data, error } = await supabase.rpc('admin_insert_payment_method', {
        p_admin_phone: user.phone_number,
        p_name: formData.name.trim(),
        p_account_number: formData.account_number.trim(),
        p_logo_url: formData.logo_url.trim() || null,
      });

      if (error) throw error;
      const result = data as { success?: boolean; message?: string };
      if (result?.success) {
        showToast(result.message || 'تمت إضافة وسيلة الدفع', 'success');
        setShowForm(false);
        setFormData({ name: '', account_number: '', logo_url: '' });
        await loadMethods();
      } else {
        showToast(result?.message || 'فشلت الإضافة', 'error');
      }
    } catch (error: any) {
      showToast('فشلت الإضافة', 'error');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    if (!user || user.role !== 'admin') {
      showToast('غير مصرح', 'error');
      return;
    }
    try {
      const { data, error } = await supabase.rpc('admin_update_payment_method', {
        p_admin_phone: user.phone_number,
        p_method_id: id,
        p_is_active: !currentStatus,
      });

      if (error) throw error;
      const result = data as { success?: boolean; message?: string };
      if (result?.success) {
        showToast(result.message || (!currentStatus ? 'تم تفعيل وسيلة الدفع' : 'تم تعطيل وسيلة الدفع'), 'success');
        await loadMethods();
      } else {
        showToast(result?.message || 'فشل تحديث الحالة', 'error');
      }
    } catch (error: any) {
      showToast('فشل تحديث الحالة', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || user.role !== 'admin') {
      showToast('غير مصرح', 'error');
      return;
    }
    if (!confirm('هل أنت متأكد من حذف وسيلة الدفع هذه؟')) return;
    try {
      const { data, error } = await supabase.rpc('admin_delete_payment_method', {
        p_admin_phone: user.phone_number,
        p_method_id: id,
      });
      if (error) throw error;
      const result = data as { success?: boolean; message?: string };
      if (result?.success) {
        showToast(result.message || 'تم الحذف', 'success');
        await loadMethods();
      } else {
        showToast(result?.message || 'فشل الحذف', 'error');
      }
    } catch (error: any) {
      showToast('فشل الحذف', 'error');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-white text-2xl font-bold">وسائل الدفع</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>إضافة وسيلة</span>
          </div>
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <Input
              label="اسم وسيلة الدفع"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="رقم الحساب الموحد"
              value={formData.account_number}
              onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              required
              dir="ltr"
            />
            <Input
              label="رابط الشعار (اختياري)"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
            />
            <div className="flex gap-3">
              <Button type="submit" className="flex-1">حفظ</Button>
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

      {loading ? (
        <div className="text-gray-400 py-8 text-center">جاري التحميل...</div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {methods.map((method) => (
          <div key={method.id} className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            {editingId === method.id ? (
              <div className="space-y-4">
                <Input
                  label="اسم وسيلة الدفع"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
                <Input
                  label="رقم الحساب الموحد"
                  value={editForm.account_number}
                  onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })}
                  dir="ltr"
                />
                <Input
                  label="رابط الشعار (اختياري)"
                  value={editForm.logo_url}
                  onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button type="button" onClick={() => void saveEdit(method.id)} className="flex-1">
                    حفظ التعديل
                  </Button>
                  <Button type="button" variant="secondary" onClick={cancelEdit} className="flex-1">
                    إلغاء
                  </Button>
                </div>
              </div>
            ) : (
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-white text-xl font-bold mb-2">{method.name}</h3>
                  <p className="text-gray-400 font-mono">{method.account_number}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={() => startEdit(method)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-900/20 text-cyan-400 hover:bg-cyan-900/30 transition-colors"
                    title="تعديل"
                  >
                    <Pencil className="w-4 h-4" />
                    <span className="text-sm">تعديل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(method.id, method.is_active)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      method.is_active
                        ? 'bg-green-900/20 text-green-400 hover:bg-green-900/30'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                    title={method.is_active ? 'تعطيل' : 'تفعيل'}
                  >
                    <Power className="w-4 h-4" />
                    <span className="text-sm">
                      {method.is_active ? 'نشط' : 'معطل'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(method.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900/30 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {method.logo_url && (
                <img
                  src={method.logo_url}
                  alt={method.name}
                  className="w-16 h-16 object-contain mx-auto mt-3"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/icon-72.png'; }}
                />
              )}
            </div>
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  );
};
