import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(username, password);

    if (result.success) {
      // Store pending login info for the OTP verification step
      sessionStorage.setItem('pending_login', JSON.stringify({
        username: result.username,
        role: result.role || null,
        needs_setup: result.needs_setup || false,
        requires_2fa: result.requires_2fa ?? true,
      }));
      navigate('/verify-otp');
    } else {
      setError('Invalid Username or Password!');
    }
    setLoading(false);
  };

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
        {/* Shield Icon */}
        <div className="mb-5 flex justify-center">
          <div className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors duration-500 ${
            isDarkMode ? 'bg-slate-900' : 'bg-[#0f172a]'
          }`}>
            <Shield className="h-7 w-7 text-[#38bdf8]" />
          </div>
        </div>

        <h2 className={`text-xl font-bold transition-colors duration-500 ${isDarkMode ? 'text-slate-100' : 'text-[#0f172a]'}`}>
          GRC Platform Login
        </h2>
        <p className={`mt-1 text-sm transition-colors duration-500 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
          Securely access the compliance dashboard.
        </p>

        {error && (
          <div className={`mt-4 rounded-lg px-4 py-2 text-sm font-semibold ${
            isDarkMode ? 'bg-red-900/30 text-red-400 border border-red-900/50' : 'bg-red-50 text-red-600'
          }`}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
          <div>
            <label className={`mb-1 block text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/20 transition-colors duration-300 ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder-slate-500'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
              }`}
              required
            />
          </div>

          <div>
            <label className={`mb-1 block text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className={`w-full rounded-lg border px-4 py-2.5 pr-10 text-sm focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/20 transition-colors duration-300 ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder-slate-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-lg py-3 text-sm font-semibold text-white transition-all duration-300 cursor-pointer disabled:opacity-60 ${
              isDarkMode
                ? 'bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-900/30'
                : 'bg-[#0f172a] hover:bg-[#1e293b]'
            }`}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4">
          <Link to="/forgot-password" className={`text-sm no-underline transition-colors ${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}>
            Forgot Password?
          </Link>
        </div>
      </div>

      <p className={`mt-8 text-sm transition-colors ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
        &copy; 2026 GRC Compliance Management System
      </p>
    </div>
  );
}
