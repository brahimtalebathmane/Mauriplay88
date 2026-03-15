import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { showToast } from '../components/Toast';

export default function ResetPin() {
  const navigate = useNavigate();
  const location = useLocation();
  const phoneNumber = location.state?.phone_number;
  const fromRecovery = location.state?.from_recovery;
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!phoneNumber || !fromRecovery) {
    navigate('/login');
    return null;
  }

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPin || !confirmPin) {
      showToast('يرجى إدخال الرمز السري الجديد', 'error');
      return;
    }

    if (newPin.length !== 6) {
      showToast('الرمز السري يجب أن يكون 6 أرقام', 'error');
      return;
    }

    if (!/^\d{6}$/.test(newPin)) {
      showToast('الرمز السري يجب أن يحتوي على أرقام فقط', 'error');
      return;
    }

    if (newPin !== confirmPin) {
      showToast('الرمز السري غير متطابق', 'error');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('reset_pin_after_recovery', {
        p_phone_number: phoneNumber,
        p_new_pin: newPin
      });

      if (error) throw error;

      if (data?.success) {
        showToast('تم استرجاع حسابك بنجاح', 'success');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1500);
      } else {
        showToast(data?.message || 'حدث خطأ أثناء تغيير الرمز السري', 'error');
      }
    } catch (error: any) {
      console.error('Reset PIN error:', error);
      showToast(error.message || 'حدث خطأ أثناء تغيير الرمز السري', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          إعادة تعيين الرمز السري
        </h1>
        <p className="text-center text-gray-600 mb-8">
          اختر رمز سري جديد لحسابك
        </p>

        <form onSubmit={handleResetPin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              الرمز السري الجديد
            </label>
            <div className="relative">
              <Input
                type={showNewPin ? 'text' : 'password'}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                maxLength={6}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowNewPin(!showNewPin)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPin ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1 text-right">
              6 أرقام فقط
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              تأكيد الرمز السري
            </label>
            <div className="relative">
              <Input
                type={showConfirmPin ? 'text' : 'password'}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                maxLength={6}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPin ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {newPin && confirmPin && newPin !== confirmPin && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 text-right">
                الرمز السري غير متطابق
              </p>
            </div>
          )}

          {newPin && confirmPin && newPin === confirmPin && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 text-right">
                الرمز السري متطابق
              </p>
            </div>
          )}

          <Button
            type="submit"
            loading={loading}
            disabled={!newPin || !confirmPin || newPin !== confirmPin || newPin.length !== 6}
            className="w-full"
          >
            تأكيد وحفظ الرمز السري
            <ArrowRight className="mr-2 h-5 w-5" />
          </Button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700 text-right">
            <span className="font-semibold">نصيحة:</span> اختر رمز سري قوي وسهل التذكر. لا تشاركه مع أي شخص.
          </p>
        </div>
      </div>
    </div>
  );
}
