import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  
  const [formData, setFormData] = useState({
    displayName: '',
    designation: '',
    phone: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    password: '',
    confirmPassword: ''
  });
  
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
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-900">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-navy-900 border border-slate-100 dark:border-navy-700 p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <ShieldAlert className="h-8 w-8 text-amber-600 dark:text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold dark:text-white">Complete Your Profile</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            For security reasons, you must update your temporary password and complete your profile information before accessing the GRC dashboard.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2 border border-red-100 dark:border-red-900/50">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Display Name</label>
              <input
                required
                value={formData.displayName}
                onChange={e => setFormData({...formData, displayName: e.target.value})}
                className="w-full rounded-lg border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800 px-4 py-2.5 text-sm dark:text-white"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Phone / Emergency Contact</label>
              <input
                required
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full rounded-lg border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800 px-4 py-2.5 text-sm dark:text-white"
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Designation / Role</label>
              <input
                value={formData.designation}
                onChange={e => setFormData({...formData, designation: e.target.value})}
                className="w-full rounded-lg border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800 px-4 py-2.5 text-sm dark:text-white"
                placeholder="e.g. Senior AppSec Auditor"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Timezone</label>
              <select
                value={formData.timezone}
                onChange={e => setFormData({...formData, timezone: e.target.value})}
                className="w-full rounded-lg border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800 px-4 py-2.5 text-sm dark:text-white"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Asia/Dubai">Asia/Dubai</option>
                <option value="Asia/Karachi">Asia/Karachi</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-navy-700">
            <h3 className="mb-4 text-sm font-bold text-slate-800 dark:text-slate-200">Account Security</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">New Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full rounded-lg border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800 px-4 py-2.5 text-sm dark:text-white"
                  placeholder="Min 8 chars, 1 Uppercase, 1 Number, 1 Special"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full rounded-lg border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800 px-4 py-2.5 text-sm dark:text-white"
                  placeholder="Re-type new password"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"
          >
            {loading ? 'Saving...' : <><CheckCircle2 className="h-5 w-5" /> Save & Access Dashboard</>}
          </button>
        </form>
      </div>
    </div>
  );
}
