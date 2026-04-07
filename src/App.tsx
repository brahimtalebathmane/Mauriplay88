import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { ToastContainer } from './components/Toast';
import { SupportButton } from './components/SupportButton';
import { OneSignalProvider } from './components/OneSignalProvider';
import { EnableNotificationsPrompt } from './components/EnableNotificationsPrompt';

import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { Register } from './pages/Register';
import { VerifyOTP } from './pages/VerifyOTP';
import { Home } from './pages/Home';
import { PlatformPage } from './pages/Platform';
import { Purchase } from './pages/Purchase';
import { OrderSuccess } from './pages/OrderSuccess';
import { WalletPurchaseSuccess } from './pages/WalletPurchaseSuccess';
import { MyPurchases } from './pages/MyPurchases';
import { Profile } from './pages/Profile';
import { Wallet } from './pages/Wallet';
import { WalletTopup } from './pages/WalletTopup';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsAndConditions } from './pages/TermsAndConditions';
import { Menu } from './pages/Menu';
import { AdminDashboard } from './pages/admin/Dashboard';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, user } = useStore();

  if (!isLoggedIn || !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, user } = useStore();

  if (isLoggedIn && user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <OneSignalProvider>
        <ToastContainer />
        <SupportButton />
        <EnableNotificationsPrompt />
        <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />

        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/platform/:id" element={<ProtectedRoute><PlatformPage /></ProtectedRoute>} />
        <Route path="/purchase/:id" element={<ProtectedRoute><Purchase /></ProtectedRoute>} />
        <Route path="/order-success/:id" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
        <Route path="/wallet-purchase-success" element={<ProtectedRoute><WalletPurchaseSuccess /></ProtectedRoute>} />
        <Route path="/my-purchases" element={<ProtectedRoute><MyPurchases /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
        <Route path="/wallet-topup" element={<ProtectedRoute><WalletTopup /></ProtectedRoute>} />

        <Route path="/admin/*" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </OneSignalProvider>
    </BrowserRouter>
  );
}

export default App;