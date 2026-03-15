import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Header } from '../components/Header';
import { showToast } from '../components/Toast';
import { Wallet as WalletIcon, ArrowDownRight, ArrowUpLeft, MessageCircle, Clock, ShieldCheck, Plus, ArrowRight } from 'lucide-react';
import { Button } from '../components/Button';

interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  created_at: string;
}

export const Wallet = () => {
  const navigate = useNavigate();
  const { user } = useStore();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.wallet_active) {
      loadTransactions();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadTransactions = async () => {
    if (!user?.phone_number) return;
    try {
      const { data, error } = await supabase.rpc('get_wallet_transactions', {
        p_phone_number: user.phone_number,
      });
      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      showToast('فشل تحميل سجل المعاملات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppContact = () => {
    window.open('https://wa.me/22230459388', '_blank');
  };

  if (!user?.wallet_active) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header />
        <div className="pt-24 px-4 pb-8 flex items-center justify-center min-h-[80vh]">
          <div className="max-w-md w-full text-center">
            <div className="relative mb-8 flex justify-center">
              <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full" />
              <div className="relative bg-gradient-to-b from-[#111] to-black border border-white/10 w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl">
                <WalletIcon className="w-12 h-12 text-gray-600" />
                <div className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full border-2 border-black" />
              </div>
            </div>
            <h2 className="text-white text-3xl font-black mb-4 tracking-tighter italic">المحفظة غير مفعلة</h2>
            <p className="text-gray-500 mb-8 leading-relaxed font-medium">
              حسابك يحتاج إلى تفعيل ميزة المحفظة لتتمكن من الشحن والشراء السريع. تواصل مع الدعم الفني لتفعيلها الآن.
            </p>
            <Button 
              onClick={handleWhatsAppContact} 
              className="w-full py-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-black font-black flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(37,211,102,0.2)]"
            >
              <MessageCircle className="w-6 h-6 fill-current" />
              <span>تفعيل عبر واتساب</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header />
      <div className="pt-24 px-4 pb-12">
        <div className="max-w-2xl mx-auto">

          {/* Back button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowRight className="w-5 h-5" />
            <span>العودة للرئيسية</span>
          </button>
          
          {/* بطاقة الرصيد الرئيسية */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#111] via-[#0a0a0a] to-black border border-white/10 rounded-[2.5rem] p-10 mb-8 shadow-2xl group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <WalletIcon className="w-32 h-32" />
            </div>
            
            <div className="relative z-10 text-center">
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mb-4">Current Balance</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">
                  {user.wallet_balance}
                </span>
                <span className="text-xl font-bold text-gray-600 self-end mb-2">MRU</span>
              </div>
              
              <div className="mt-8 flex justify-center gap-3">
                 <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3 text-cyan-500" />
                    <span className="text-[10px] font-black text-gray-400 uppercase">Secure Account</span>
                 </div>
              </div>

              <div className="mt-6">
                <Button
                  onClick={() => navigate('/wallet-topup')}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>شحن المحفظة</span>
                </Button>
              </div>
            </div>
          </div>

          {/* سجل المعاملات */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
               <span className="bg-white/5 px-3 py-1 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-widest">History</span>
               <h2 className="text-white font-black italic">سجل المعاملات</h2>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="py-12 flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 text-xs font-bold">جاري تحديث البيانات...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-16 text-center">
                    <Clock className="w-12 h-12 text-gray-800 mx-auto mb-4" />
                    <p className="text-gray-600 font-bold">لا توجد عمليات مسجلة حتى الآن</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 p-4 rounded-2xl flex items-center gap-4 transition-all"
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${
                        transaction.type === 'credit' ? 'bg-green-500/10' : 'bg-red-500/10'
                      }`}>
                        {transaction.type === 'credit' ? (
                          <ArrowDownRight className={`w-6 h-6 ${transaction.type === 'credit' ? 'text-green-500' : 'text-red-500'}`} />
                        ) : (
                          <ArrowUpLeft className="w-6 h-6 text-red-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-white font-black text-sm truncate text-right">
                          {transaction.description}
                        </p>
                        <p className="text-gray-600 text-[10px] font-bold text-right mt-1">
                          {new Date(transaction.created_at).toLocaleDateString('ar-MR', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>

                      <div className="text-left border-r border-white/5 pr-4 mr-1">
                        <p className={`text-lg font-black tracking-tighter ${
                          transaction.type === 'credit' ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {transaction.type === 'credit' ? '+' : '-'}{transaction.amount}
                        </p>
                        <p className="text-gray-600 text-[9px] font-black uppercase mt-1">
                          Balance: {transaction.balance_after}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-gray-600 text-[10px] mt-8 font-black uppercase tracking-[0.2em]">
            MauriPlay Financial Services • 2026
          </p>
        </div>
      </div>
    </div>
  );
};