import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../api/axios';

export default function VerifyOTP() {
  const navigate = useNavigate();
  const { completeLogin } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
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
      <div
        className="flex min-h-screen items-center justify-center p-4 transition-colors duration-500"
        style={{
          background: isDarkMode
            ? 'linear-gradient(to bottom, #0f172a 50%, #1e293b 50%)'
            : 'linear-gradient(to bottom, #0f172a 50%, #f4f6f9 50%)'
        }}
      >
        <div className="text-center">
          <p className={`mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>No pending login session.</p>
          <Link to="/login" className="text-[#38bdf8] font-semibold no-underline">← Back to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center p-4 transition-colors duration-500"
      style={{
        background: isDarkMode
          ? 'linear-gradient(to bottom, #0f172a 50%, #1e293b 50%)'
          : 'linear-gradient(to bottom, #0f172a 50%, #f4f6f9 50%)'
      }}
    >
      {/* ── Dark Mode Toggle ── */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/20 hover:text-white transition-all duration-300 cursor-pointer"
        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        <span className="hidden sm:inline">{isDarkMode ? 'Light' : 'Dark'}</span>
      </button>

      <div className={`w-full max-w-[400px] rounded-xl p-10 shadow-xl text-center transition-colors duration-500 ${
        isDarkMode
          ? 'bg-slate-800 border border-slate-700'
          : 'bg-white'
      }`}>
        {/* Icon */}
        <div className="mx-auto mb-5 flex h-[70px] w-[70px] items-center justify-center rounded-full bg-sky-50 dark:bg-sky-900/30">
          <ShieldCheck className={`h-8 w-8 ${isDarkMode ? 'text-sky-400' : 'text-sky-600'}`} />
        </div>

        <h3 className={`text-lg font-bold transition-colors duration-500 ${isDarkMode ? 'text-slate-100' : 'text-[#0f172a]'}`}>Two-Factor Authentication</h3>
        <p className={`mt-2 text-sm transition-colors duration-500 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
          Enter the 6-digit code from your<br />Microsoft Authenticator app to continue.
        </p>

        {error && (
          <div className={`mt-4 rounded-lg px-4 py-2 text-sm font-semibold ${
            isDarkMode ? 'bg-red-900/30 text-red-400 border border-red-900/50' : 'bg-red-50 text-red-600'
          }`}>
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
            className={`w-full rounded-lg border px-4 py-3.5 text-center text-2xl font-bold tracking-[8px] focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/20 transition-colors duration-300 ${
              isDarkMode
                ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder-slate-500'
                : 'border-gray-200 bg-gray-50 text-[#334155] placeholder-gray-400'
            }`}
          />

          <button
            type="submit"
            disabled={loading}
            className={`mt-5 w-full rounded-lg py-3 text-sm font-semibold text-white transition-all duration-300 cursor-pointer disabled:opacity-60 ${
              isDarkMode
                ? 'bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-900/30'
                : 'bg-[#0f172a] hover:bg-[#1e293b]'
            }`}
          >
            {loading ? 'Verifying...' : 'Verify & Login →'}
          </button>
        </form>

        <div className="mt-5">
          <Link to="/login" className={`text-sm no-underline transition-colors ${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}>
            ← Back to Login
          </Link>
        </div>
      </div>

      <p className={`mt-8 text-sm transition-colors ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
        &copy; 2026 GRC Compliance Management System
      </p>
    </div>
  );
}
