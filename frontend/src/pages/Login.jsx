import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
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
      // Store pending login info for OTP step
      sessionStorage.setItem('pending_login', JSON.stringify({
        username: result.username,
        role: result.role,
        needs_setup: result.needs_setup,
      }));
      navigate('/verify-otp');
    } else {
      setError('Invalid Username or Password!');
    }
    setLoading(false);
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-4 transition-colors"
      style={{ background: 'linear-gradient(to bottom, #0f172a 50%, #f4f6f9 50%)' }}
    >
      <div className="w-full max-w-[400px] rounded-xl bg-white p-10 shadow-xl text-center">
        {/* Shield Icon */}
        <div className="mb-5 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0f172a]">
            <Shield className="h-7 w-7 text-[#38bdf8]" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-[#0f172a]">GRC Platform Login</h2>
        <p className="mt-1 text-sm text-gray-400">Securely access the compliance dashboard.</p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/20"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 pr-10 text-sm focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/20"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

        <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#0f172a] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1e293b] cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4">
          <Link to="/forgot-password" className="text-sm text-gray-400 hover:text-gray-600 no-underline">
            Forgot Password?
          </Link>
        </div>
      </div>

      <p className="mt-8 text-sm text-gray-400">
        &copy; 2026 GRC Compliance Management System
      </p>
    </div>
  );
}
