import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, CheckCircle2, Sun, Moon, Eye, EyeOff, Check, X as XIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../api/axios';

/* ── Password Complexity Checklist ─────────────── */
function PasswordChecklist({ password }) {
  const rules = useMemo(() => [
    { label: 'At least 8 characters', test: password.length >= 8 },
    { label: 'One uppercase letter (A-Z)', test: /[A-Z]/.test(password) },
    { label: 'One lowercase letter (a-z)', test: /[a-z]/.test(password) },
    { label: 'One number (0-9)', test: /[0-9]/.test(password) },
    { label: 'One special character (!@#$...)', test: /[^A-Za-z0-9]/.test(password) },
  ], [password]);

  if (!password) return null;

  return (
    <ul className="mt-2 space-y-1 text-xs">
      {rules.map((r, i) => (
        <li key={i} className={`flex items-center gap-1.5 ${r.test ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`}>
          {r.test ? <Check className="h-3 w-3" /> : <XIcon className="h-3 w-3" />}
          {r.label}
        </li>
      ))}
    </ul>
  );
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  
  const [formData, setFormData] = useState({
    displayName: '',
    designation: '',
    phone: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    password: '',
    confirmPassword: ''
  });
  
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePassword = (pass) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(pass);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (!validatePassword(formData.password)) {
      return setError('Password must be 8+ chars and contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character.');
    }
    if (!formData.phone || !formData.displayName) {
       return setError('Display Name and Phone are required.');
    }

    setLoading(true);
    setError('');

    try {
      await API.post('auth/profile-setup/', {
        display_name: formData.displayName,
        designation: formData.designation,
        phone_number: formData.phone,
        timezone: formData.timezone,
        new_password: formData.password
      });

      // Update local state to bypass lock
      updateUser({ needs_setup: false });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete profile setup. Try again.');
    }
    setLoading(false);
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center p-4 transition-colors duration-500"
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

      <div className={`w-full max-w-xl rounded-2xl border p-8 shadow-2xl transition-colors duration-500 ${
        isDarkMode
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-slate-100'
      }`}>
        <div className="mb-6 flex flex-col items-center text-center">
          <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isDarkMode ? 'bg-amber-900/30' : 'bg-amber-100'}`}>
            <ShieldAlert className={`h-8 w-8 ${isDarkMode ? 'text-amber-500' : 'text-amber-600'}`} />
          </div>
          <h2 className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-[#0f172a]'}`}>Complete Your Profile</h2>
          <p className={`mt-2 text-sm transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            For security reasons, you must update your temporary password and complete your profile information before accessing the GRC dashboard.
          </p>
        </div>

        {error && (
          <div className={`mb-6 rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${
            isDarkMode ? 'bg-red-900/20 text-red-400 border border-red-900/50' : 'bg-red-50 text-red-600 border border-red-100'
          }`}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`mb-1 block text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Display Name</label>
              <input
                required
                value={formData.displayName}
                onChange={e => setFormData({...formData, displayName: e.target.value})}
                className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                  isDarkMode ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-gray-900 placeholder-gray-400'
                }`}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className={`mb-1 block text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Phone / Emergency Contact</label>
              <input
                required
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                  isDarkMode ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-gray-900 placeholder-gray-400'
                }`}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`mb-1 block text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Designation / Role</label>
              <input
                value={formData.designation}
                onChange={e => setFormData({...formData, designation: e.target.value})}
                className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                  isDarkMode ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-gray-900 placeholder-gray-400'
                }`}
                placeholder="e.g. Senior AppSec Auditor"
              />
            </div>
            <div>
              <label className={`mb-1 block text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Timezone</label>
              <select
                value={formData.timezone}
                onChange={e => setFormData({...formData, timezone: e.target.value})}
                className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                  isDarkMode ? 'bg-slate-900 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-gray-900'
                }`}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Asia/Dubai">Asia/Dubai</option>
                <option value="Asia/Karachi">Asia/Karachi</option>
              </select>
            </div>
          </div>

          <div className={`pt-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <h3 className={`mb-4 text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Account Security</h3>
            <div className="space-y-4">
              <div>
                <label className={`mb-1 block text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>New Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className={`w-full rounded-lg border px-4 py-2.5 pr-10 text-sm transition-colors ${
                      isDarkMode ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-gray-900 placeholder-gray-400'
                    }`}
                    placeholder="Min 8 chars, 1 Uppercase, 1 Number, 1 Special"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}>
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordChecklist password={formData.password} />
              </div>
              <div>
                <label className={`mb-1 block text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                    className={`w-full rounded-lg border px-4 py-2.5 pr-10 text-sm transition-colors ${
                      isDarkMode ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-gray-900 placeholder-gray-400'
                    }`}
                    placeholder="Re-type new password"
                  />
                  <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}>
                    {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><XIcon className="h-3 w-3" /> Passwords do not match</p>
                )}
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <p className="mt-1 text-xs text-emerald-500 flex items-center gap-1"><Check className="h-3 w-3" /> Passwords match</p>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-all duration-300 disabled:opacity-50 ${
              isDarkMode
                ? 'bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-900/30'
                : 'bg-sky-500 hover:bg-sky-600'
            }`}
          >
            {loading ? 'Saving...' : <><CheckCircle2 className="h-5 w-5" /> Save & Access Dashboard</>}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className={`text-sm font-medium transition ${isDarkMode ? 'text-slate-400 hover:text-sky-400' : 'text-slate-500 hover:text-sky-500'}`}
          >
            Not you? Log out and return to Login
          </button>
        </div>
      </div>

      <p className={`absolute bottom-6 text-sm transition-colors ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
        &copy; 2026 GRC Compliance Management System
      </p>
    </div>
  );
}
