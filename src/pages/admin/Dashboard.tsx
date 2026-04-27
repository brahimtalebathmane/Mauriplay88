import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Orders } from './Orders';
import { Platforms } from './Platforms';
import { Products } from './Products';
import { InventoryLayout } from './inventory/InventoryLayout';
import { InventoryPlatformList } from './inventory/InventoryPlatformList';
import { InventoryPlatformProductsPage } from './inventory/InventoryPlatformProductsPage';
import { InventoryProductCodesPage } from './inventory/InventoryProductCodesPage';
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
    <div className="min-h-screen bg-page">
      <div className="bg-card border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-content-max mx-auto px-page-x py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/')}
              className="text-white p-2 hover:bg-white/10 rounded-btn transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="العودة"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-white text-section-title font-bold">لوحة الإدارة</h1>
            <div className="w-10" />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname.startsWith(tab.path);
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-btn whitespace-nowrap transition-colors text-sm font-medium ${
                    isActive
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-content-max mx-auto px-page-x py-6 sm:py-8">
        <Routes>
          <Route index element={<Orders />} />
          <Route path="orders" element={<Orders />} />
          <Route path="wallet-topups" element={<WalletTopups />} />
          <Route path="inventory" element={<InventoryLayout />}>
            <Route index element={<InventoryPlatformList />} />
            <Route path="platform/:platformId" element={<InventoryPlatformProductsPage />} />
            <Route path="product/:productId/codes" element={<InventoryProductCodesPage />} />
          </Route>
          <Route path="platforms" element={<Platforms />} />
          <Route path="products" element={<Products />} />
          <Route path="payment-methods" element={<PaymentMethods />} />
          <Route path="users" element={<Users />} />
        </Routes>
      </div>
    </div>
  );
};
