import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore } from './store/useStore';
import { ToastContainer } from './components/Toast';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { VerifyOTP } from './pages/VerifyOTP';
import { Home } from './pages/Home';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, user } = useStore();
  
  // إذا كان isLoggedIn صحيحًا ولكن بيانات المستخدم لم تصل بعد (حالة نادرة عند التحديث)
  if (isLoggedIn && !user) return <div className="bg-black min-h-screen"></div>;

  if (!isLoggedIn || !user) {
    return <Navigate to="/login" replace />;
  }

  // استخدام الحقل الصحيح مع حماية ضد الـ undefined
  const verified = user.is_verified === true;
  if (!verified) {
    return <Navigate to="/verify-otp" replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, user } = useStore();
  const location = useLocation();

  if (isLoggedIn && user) {
    const verified = user.is_verified === true;
    if (verified) return <Navigate to="/" replace />;
    // إذا كان مسجلاً وغير مفعل، نمنعه من رؤية صفحة الدخول ونرسله لـ OTP فقط إذا لم يكن هناك
    if (location.pathname !== '/verify-otp') return <Navigate to="/verify-otp" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        {/* أضف بقية المسارات هنا بنفس نمط ProtectedRoute */}
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;