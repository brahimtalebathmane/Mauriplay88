import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore } from './store/useStore';
import { ToastContainer } from './components/Toast';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { VerifyOTP } from './pages/VerifyOTP';
import { Home } from './pages/Home';
import { PlatformPage } from './pages/Platform';
import { Purchase } from './pages/Purchase';
import { OrderSuccess } from './pages/OrderSuccess';
import { MyPurchases } from './pages/MyPurchases';
import { Profile } from './pages/Profile';
import { Wallet } from './pages/Wallet';
import { WalletTopup } from './pages/WalletTopup';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { AdminDashboard } from './pages/admin/Dashboard';
import AccountRecovery from './pages/AccountRecovery';
import VerifyRecoveryOTP from './pages/VerifyRecoveryOTP';
import ResetPin from './pages/ResetPin';

const LoadingScreen = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, user, isHydrated } = useStore();
  
  if (!isHydrated) return <LoadingScreen />;

  // التأكد من وجود المستخدم والحقل الصحيح
  const isVerified = user?.is_verified === true;

  if (!isLoggedIn || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!isVerified) {
    return <Navigate to="/verify-otp" replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, user, isHydrated } = useStore();
  const location = useLocation();

  if (!isHydrated) return <LoadingScreen />;

  // تجنب الحلقة المفرغة: إذا كنت في صفحة تسجيل الدخول بالفعل لا تقم بالتحويل
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isVerified = user?.is_verified === true;

  if (isLoggedIn && user && isAuthPage) {
    if (isVerified) return <Navigate to="/" replace />;
    return <Navigate to="/verify-otp" replace />;
  }

  return <>{children}</>;
};

const OTPRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, user, isHydrated } = useStore();

  if (!isHydrated) return <LoadingScreen />;

  const isVerified = user?.is_verified === true;

  if (!isLoggedIn || !user) return <Navigate to="/login" replace />;
  if (isVerified) return <Navigate to="/" replace />;

  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, user, isHydrated } = useStore();

  if (!isHydrated) return <LoadingScreen />;

  const isVerified = user?.is_verified === true;

  if (!isLoggedIn || !user) return <Navigate to="/login" replace />;
  if (!isVerified) return <Navigate to="/verify-otp" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        
        <Route 
          path="/verify-otp" 
          element={
            <OTPRoute>
              <VerifyOTP />
            </OTPRoute>
          } 
        />
        
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/account-recovery" element={<AccountRecovery />} />
        <Route path="/verify-recovery" element={<VerifyRecoveryOTP />} />
        <Route path="/reset-pin" element={<ResetPin />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/platform/:id"
          element={
            <ProtectedRoute>
              <PlatformPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase/:id"
          element={
            <ProtectedRoute>
              <Purchase />
            </ProtectedRoute>
          }
        />
        <Route
          path="/order-success/:id"
          element={
            <ProtectedRoute>
              <OrderSuccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-purchases"
          element={
            <ProtectedRoute>
              <MyPurchases />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wallet"
          element={
            <ProtectedRoute>
              <Wallet />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wallet-topup"
          element={
            <ProtectedRoute>
              <WalletTopup />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;