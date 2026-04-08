import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import DashboardLayout from './layouts/DashboardLayout';
import Login          from './pages/Login';
import VerifyOTP      from './pages/VerifyOTP';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard      from './pages/Dashboard';
import Scans          from './pages/Scans';
import Frameworks     from './pages/Frameworks';
import Policies       from './pages/Policies';
import ComplianceChecks from './pages/ComplianceChecks';
import Reports        from './pages/Reports';
import Settings       from './pages/Settings';
import ManageAdmins   from './pages/ManageAdmins';

/* ── Route guard: redirect to /login if not authenticated ── */
function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && role !== requiredRole) return <Navigate to="/" replace />;
  return children;
}

/* ── Redirect authenticated users away from auth pages ────── */
function GuestRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public / Auth routes */}
          <Route path="/login"           element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/verify-otp"      element={<VerifyOTP />} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />

          {/* Protected routes inside DashboardLayout */}
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index           element={<Dashboard />} />
            <Route path="scans"    element={<Scans />} />
            <Route path="frameworks" element={<Frameworks />} />
            <Route path="policies" element={<Policies />} />
            <Route path="checks"   element={<ComplianceChecks />} />
            <Route path="reports"  element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="manage-admins" element={
              <ProtectedRoute requiredRole="super_admin"><ManageAdmins /></ProtectedRoute>
            } />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
