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

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, user } = useStore();
  const location = useLocation();

  console.log('ProtectedRoute:', { isLoggedIn, user: user?.phone_number, path: location.pathname });

  if (!isLoggedIn || !user) {
    console.log('ProtectedRoute: No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (!user.is_verified) {
    console.log('ProtectedRoute: User not verified, redirecting to OTP');
    return <Navigate to="/verify-otp" replace />;
  }

  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, user } = useStore();

  console.log('AdminRoute:', { isLoggedIn, user: user?.phone_number, role: user?.role });

  if (!isLoggedIn || !user) {
    console.log('AdminRoute: No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (!user.is_verified) {
    console.log('AdminRoute: User not verified, redirecting to OTP');
    return <Navigate to="/verify-otp" replace />;
  }

  if (user.role !== 'admin') {
    console.log('AdminRoute: User not admin, redirecting to home');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, user } = useStore();

  console.log('PublicRoute:', { isLoggedIn, user: user?.phone_number, verified: user?.is_verified });

  if (isLoggedIn && user?.is_verified) {
    console.log('PublicRoute: User verified, redirecting to home');
    return <Navigate to="/" replace />;
  }

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
        <Route path="/verify-otp" element={<VerifyOTP />} />
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