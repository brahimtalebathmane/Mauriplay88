import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { showToast } from '../../components/Toast';
import { notifyUserWalletActivated } from '../../utils/notifications';
import { Copy, Wallet, Ban, CreditCard as Edit2, Save, X, Search } from 'lucide-react';

export const Users = () => {
  const { user: currentUser } = useStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [debouncedPhoneSearch, setDebouncedPhoneSearch] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    // Debounce to avoid excessive client-side filtering work while typing.
    const t = window.setTimeout(() => {
      setDebouncedPhoneSearch(phoneSearch);
    }, 200);

    return () => window.clearTimeout(t);
  }, [phoneSearch]);

  const normalizePhone = (value: unknown) => {
    // Compare using digits only so formatting differences don't break matching.
    return String(value ?? '').replace(/\D/g, '');
  };

  const handleClearSearch = () => {
    setPhoneSearch('');
    setDebouncedPhoneSearch('');
  };

  const filteredUsers = useMemo(() => {
    const term = normalizePhone(debouncedPhoneSearch);
    if (!term) return users;

    return users.filter((u) => normalizePhone(u?.phone_number).includes(term));
  }, [debouncedPhoneSearch, users]);

  const loadUsers = async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.rpc('get_admin_users', {
        p_admin_id: currentUser.id,
      });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      showToast('فشل تحميل المستخدمين', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    showToast('تم نسخ رقم الهاتف', 'success');
  };

  const handleAddBalance = async () => {
    if (!selectedUser || !amount) return;

    try {
      const { data, error } = await supabase.rpc('add_wallet_balance', {
        p_user_id: selectedUser.id,
        p_amount: parseFloat(amount),
        p_description: 'إضافة رصيد من الإدارة',
        p_admin_id: currentUser?.id,
      });

      if (error) throw error;

      if (data.success) {
        showToast('تمت إضافة الرصيد', 'success');
        setSelectedUser(null);
        setAmount('');
        loadUsers();
      } else {
        showToast(data.message, 'error');
      }
    } catch (error: any) {
      showToast('فشلت الإضافة', 'error');
    }
  };

  const toggleWalletActive = async (userId: string, _currentStatus: boolean) => {
    if (!currentUser?.phone_number) {
      showToast('غير مصرح', 'error');
      return;
    }
    try {
      const { data, error } = await supabase.rpc('admin_toggle_wallet_active', {
        p_admin_phone: currentUser.phone_number,
        p_user_id: userId,
      });

      if (error) throw error;
      const result = data as { success?: boolean; message?: string };
      if (result?.success) {
        if (!_currentStatus) notifyUserWalletActivated(userId);
        showToast(result.message || 'تم التحديث', 'success');
        await loadUsers();
      } else {
        showToast(result?.message || 'فشل التحديث', 'error');
      }
    } catch (error: any) {
      showToast('فشل التحديث', 'error');
    }
  };

  const toggleUserActive = async (userId: string, _currentStatus: boolean) => {
    if (!currentUser?.phone_number) {
      showToast('غير مصرح', 'error');
      return;
    }
    try {
      const { data, error } = await supabase.rpc('admin_toggle_user_active', {
        p_admin_phone: currentUser.phone_number,
        p_user_id: userId,
      });

      if (error) throw error;
      const result = data as { success?: boolean; message?: string };
      if (result?.success) {
        showToast(result.message || 'تم التحديث', 'success');
        await loadUsers();
      } else {
        showToast(result?.message || 'فشل التحديث', 'error');
      }
    } catch (error: any) {
      showToast('فشل التحديث', 'error');
    }
  };

  const startEditingPhone = (userId: string, currentPhone: string) => {
    setEditingUserId(userId);
    setNewPhoneNumber(currentPhone);
  };

  const cancelEditingPhone = () => {
    setEditingUserId(null);
    setNewPhoneNumber('');
  };

  const handleUpdatePhoneNumber = async (userId: string) => {
    if (!newPhoneNumber || !currentUser?.id) return;

    try {
      const { data, error } = await supabase.rpc('update_user_phone_number', {
        p_user_id: userId,
        p_new_phone_number: newPhoneNumber,
        p_admin_id: currentUser.id,
      });

      if (error) throw error;

      if (data.success) {
        showToast(data.message, 'success');
        setEditingUserId(null);
        setNewPhoneNumber('');
        loadUsers();
      } else {
        showToast(data.message, 'error');
      }
    } catch (error: any) {
      showToast('فشل تحديث رقم الهاتف', 'error');
    }
  };

  return (
    <div>
      <h2 className="text-white text-2xl font-bold mb-6">المستخدمون</h2>

      {loading ? (
        <div className="text-gray-400 py-12 text-center">جاري التحميل...</div>
      ) : null}

      {selectedUser && (
        <div className="bg-gray-900 rounded-lg p-6 mb-6 border border-white">
          <h3 className="text-white text-xl font-bold mb-4 text-center">
            إضافة رصيد - {selectedUser.phone_number}
          </h3>
          <div className="space-y-4">
            <Input
              label="المبلغ (MRU)"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <div className="flex gap-3">
              <Button onClick={handleAddBalance} className="flex-1">
                إضافة الرصيد
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedUser(null);
                  setAmount('');
                }}
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          <div className="mb-2">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="tel"
                inputMode="tel"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                placeholder="بحث برقم الهاتف..."
                className="pr-20"
              />
              {phoneSearch.trim() ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-2 bg-white/5 rounded-lg"
                  title="مسح البحث"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            debouncedPhoneSearch.trim() ? (
              <div className="text-center text-gray-400 py-12">No users found</div>
            ) : (
              <div className="text-center text-gray-400 py-12">لا يوجد مستخدمون</div>
            )
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">رقم الهاتف</p>
                    {editingUserId === user.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="tel"
                          value={newPhoneNumber}
                          onChange={(e) => setNewPhoneNumber(e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                          placeholder="رقم الهاتف الجديد"
                        />
                        <button
                          onClick={() => handleUpdatePhoneNumber(user.id)}
                          className="text-green-400 hover:text-green-300 p-2 bg-green-400/10 rounded-lg transition-colors"
                          title="حفظ"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditingPhone}
                          className="text-red-400 hover:text-red-300 p-2 bg-red-400/10 rounded-lg transition-colors"
                          title="إلغاء"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-white font-mono">{user.phone_number}</p>
                        <button
                          onClick={() => copyPhone(user.phone_number)}
                          className="text-gray-400 hover:text-white transition-colors"
                          title="نسخ"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => startEditingPhone(user.id, user.phone_number)}
                          className="text-cyan-400 hover:text-cyan-300 transition-colors"
                          title="تعديل رقم الهاتف"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">رصيد المحفظة</p>
                    <p className="text-white font-bold">{user.wallet_balance} MRU</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setSelectedUser(user)}
                    variant="secondary"
                    className="flex-1"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Wallet className="w-4 h-4" />
                      <span>إضافة رصيد</span>
                    </div>
                  </Button>
                  <Button
                    onClick={() => toggleWalletActive(user.id, user.wallet_active)}
                    variant={user.wallet_active ? 'danger' : 'primary'}
                    className="flex-1"
                  >
                    {user.wallet_active ? 'إلغاء تفعيل المحفظة' : 'تفعيل المحفظة'}
                  </Button>
                  <Button
                    onClick={() => toggleUserActive(user.id, user.is_active)}
                    variant={user.is_active ? 'danger' : 'primary'}
                    className="flex-1"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Ban className="w-4 h-4" />
                      <span>{user.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}</span>
                    </div>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
