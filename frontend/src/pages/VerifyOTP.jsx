import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

export default function VerifyOTP() {
  const navigate = useNavigate();
  const { completeLogin } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pending = JSON.parse(sessionStorage.getItem('pending_login') || 'null');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await API.post('auth/verify-login-totp/', {
        username: pending.username,
        code,
      });

      // Store the real JWT tokens
      localStorage.setItem('grc_access_token', res.data.access);
      localStorage.setItem('grc_refresh_token', res.data.refresh);

      completeLogin({
        username: res.data.username, 
        role: res.data.role, 
        needs_setup: pending.needs_setup
      });
      sessionStorage.removeItem('pending_login');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid Authenticator Code!');
    }
    setLoading(false);
  };

  if (!pending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f1f5f9]">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No pending login session.</p>
          <Link to="/login" className="text-[#38bdf8] font-semibold no-underline">← Back to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f1f5f9]">
      <div className="w-full max-w-[400px] rounded-2xl bg-white p-10 shadow-xl text-center">
        {/* Icon */}
        <div className="mx-auto mb-5 flex h-[70px] w-[70px] items-center justify-center rounded-full bg-sky-50">
          <ShieldCheck className="h-8 w-8 text-sky-600" />
        </div>

        <h3 className="text-lg font-bold text-[#0f172a]">Two-Factor Authentication</h3>
        <p className="mt-2 text-sm text-gray-400">
          Enter the 6-digit code from your<br />Microsoft Authenticator app to continue.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            autoFocus
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5 text-center text-2xl font-bold tracking-[8px] text-[#334155] focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/20"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-lg bg-[#0f172a] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1e293b] cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Verifying...' : 'Verify & Login →'}
          </button>
        </form>

        <div className="mt-5">
          <Link to="/login" className="text-sm text-gray-400 no-underline hover:text-gray-600">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
