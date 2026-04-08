import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Sliders, Bell, User, LogOut } from 'lucide-react';
import API from '../api/axios';
import Toast from '../components/Toast';

export default function SettingsPage() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [threshold, setThreshold] = useState(80);
  const [scanFreq, setScanFreq] = useState('weekly');
  const [retentionPolicy, setRetentionPolicy] = useState('1year');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // Fetch current settings on mount
  useEffect(() => {
    API.get('settings/')
      .then((res) => {
        setThreshold(res.data.passing_score_threshold);
        setScanFreq(res.data.scan_frequency);
        setRetentionPolicy(res.data.audit_log_retention);
        setEmailAlerts(res.data.critical_email_alerts);
        setWeeklyReport(res.data.weekly_report);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.patch('settings/', {
        passing_score_threshold: Number(threshold),
        scan_frequency: scanFreq,
        audit_log_retention: retentionPolicy,
        critical_email_alerts: emailAlerts,
        weekly_report: weeklyReport,
      });
      showToast('Configuration saved successfully!');
    } catch {
      showToast('Failed to save configuration.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const roleLabel = role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Administrator' : 'Auditor';

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#38bdf8]" />
      </div>
    );
  }

  return (
    <div>
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />
      <h1 className="mb-6 text-2xl font-bold text-[#0f172a]">System Configurations</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left — Config Cards */}
        <div className="lg:col-span-3 space-y-5">
          {/* Risk & Compliance */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#0f172a]">
              <Sliders className="h-4 w-4" /> Risk & Compliance Criteria
            </h3>

            <div className="mt-5">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Passing Score Threshold (%)</label>
              <div className="flex items-center gap-3">
                <input type="range" min="50" max="100" value={threshold} onChange={(e) => setThreshold(e.target.value)}
                  className="flex-1 accent-[#38bdf8]" />
                <span className="rounded-lg bg-sky-100 px-3 py-1 text-sm font-bold text-sky-700">{threshold}%</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">If the score drops below this, the system status will turn Critical.</p>
            </div>

            <div className="mt-5">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Automated Scan Frequency</label>
              <select value={scanFreq} onChange={(e) => setScanFreq(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-[#38bdf8] focus:outline-none cursor-pointer">
                <option value="daily">Daily (Recommended for High Risk)</option>
                <option value="weekly">Weekly (Standard)</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="mt-5">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Audit Log Retention Policy</label>
              <select value={retentionPolicy} onChange={(e) => setRetentionPolicy(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-[#38bdf8] focus:outline-none cursor-pointer">
                <option value="6months">Keep logs for 6 Months</option>
                <option value="1year">Keep logs for 1 Year (ISO Requirement)</option>
                <option value="3years">Keep logs for 3 Years</option>
              </select>
            </div>
          </div>

          {/* Alerts */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#0f172a]">
              <Bell className="h-4 w-4" /> Alerts & Notifications
            </h3>

            <div className="mt-5 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded accent-[#38bdf8]" />
                <div>
                  <span className="text-sm font-semibold text-gray-700">Critical Failure Email Alerts</span>
                  <p className="text-xs text-gray-400">Send email to admin when a Critical severity control fails.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={weeklyReport} onChange={(e) => setWeeklyReport(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded accent-[#38bdf8]" />
                <div>
                  <span className="text-sm font-semibold text-gray-700">Weekly Report Summary</span>
                  <p className="text-xs text-gray-400">Email a PDF summary every Monday morning.</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right — Profile Card */}
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <User className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-[#0f172a]">{user?.username || 'Administrator'}</h3>
            <p className="text-sm text-gray-400">{roleLabel} Role</p>
            <p className="mt-1 text-xs text-gray-300">Last login: Today</p>

            <div className="mt-5 space-y-2">
              <button onClick={() => alert('Profile Update Feature Coming Soon!')}
                className="w-full rounded-lg bg-[#0f172a] py-2.5 text-sm font-semibold text-white hover:bg-[#1e293b] cursor-pointer">
                Edit Profile
              </button>
              <button onClick={() => alert('Password Reset Link Sent!')}
                className="w-full rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer">
                Change Password
              </button>
              <hr className="my-2 border-gray-100" />
              <button onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 cursor-pointer">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-white shadow hover:bg-emerald-600 cursor-pointer disabled:opacity-60">
            {saving ? 'Saving...' : '✓ Save All Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
