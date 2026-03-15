import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Orders } from './Orders';
import { Platforms } from './Platforms';
import { Products } from './Products';
import { Inventory } from './Inventory';
import { PaymentMethods } from './PaymentMethods';
import { Users } from './Users';
import { WalletTopups } from './WalletTopups';
import { ShoppingBag, Package, Grid3x3, CreditCard, Users as UsersIcon, ArrowLeft, Wallet } from 'lucide-react';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: '/admin/orders', label: 'الطلبات', icon: ShoppingBag },
    { path: '/admin/wallet-topups', label: 'شحن المحفظة', icon: Wallet },
    { path: '/admin/inventory', label: 'المخزون', icon: Package },
    { path: '/admin/platforms', label: 'المنصات', icon: Grid3x3 },
    { path: '/admin/products', label: 'المنتجات', icon: Package },
    { path: '/admin/payment-methods', label: 'وسائل الدفع', icon: CreditCard },
    { path: '/admin/users', label: 'المستخدمين', icon: UsersIcon },
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/')}
              className="text-white p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-white text-2xl font-bold">لوحة الإدارة</h1>
            <div className="w-10" />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname.startsWith(tab.path);
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-white text-black'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route index element={<Orders />} />
          <Route path="orders" element={<Orders />} />
          <Route path="wallet-topups" element={<WalletTopups />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="platforms" element={<Platforms />} />
          <Route path="products" element={<Products />} />
          <Route path="payment-methods" element={<PaymentMethods />} />
          <Route path="users" element={<Users />} />
        </Routes>
      </div>
    </div>
  );
};
