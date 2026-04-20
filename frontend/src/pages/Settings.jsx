import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sliders, Bell, User, Lock, ShieldAlert, Mail, Camera, FileText, Eye, EyeOff, Check, X as XIcon } from 'lucide-react';
import API from '../api/axios';
import Toast from '../components/Toast';

export default function SettingsPage() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="mb-6 border-b border-gray-200 dark:border-navy-700">
        <nav className="-mb-px flex gap-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'border-sky-500 text-sky-500'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            My Identity & Security
          </button>
          
          {role === 'super_admin' && (
            <button
              onClick={() => setActiveTab('system')}
              className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'system'
                  ? 'border-sky-500 text-sky-500'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Global Thresholds
            </button>
          )}

          {role === 'super_admin' && (
            <button
              onClick={() => setActiveTab('smtp')}
              className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'smtp'
                  ? 'border-sky-500 text-sky-500'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Email Integrations (Sudo)
            </button>
          )}
        </nav>
      </div>

      {activeTab === 'profile' && <MyProfileTab />}
      {activeTab === 'system' && role === 'super_admin' && <SystemSettingsTab />}
      {activeTab === 'smtp' && role === 'super_admin' && <SMTPConfigurationTab />}
    </div>
  );
}

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
        <li key={i} className={`flex items-center gap-1.5 ${r.test ? 'text-emerald-500' : 'text-gray-400 dark:text-slate-500'}`}>
          {r.test ? <Check className="h-3 w-3" /> : <XIcon className="h-3 w-3" />}
          {r.label}
        </li>
      ))}
    </ul>
  );
}

function MyProfileTab() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({
    displayName: '',
    phone: '',
    designation: '',
    timezone: 'UTC',
    profilePic: null,
    previewUrl: null,
    deletePic: false
  });

  const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  useEffect(() => {
    API.get('auth/me/').then(res => {
      setProfile({
        displayName: res.data.display_name || '',
        phone: res.data.phone_number || '',
        designation: res.data.designation || '',
        timezone: res.data.timezone || 'UTC',
        profilePic: null,
        previewUrl: res.data.profile_picture || null
      });
    });
    // Revoke any object URL on unmount
    return () => {
      setProfile(prev => {
        if (prev.previewUrl && prev.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(prev.previewUrl);
        }
        return prev;
      });
    };
  }, []);

  const handlePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Revoke previous blob URL to prevent memory leak
      if (profile.previewUrl && profile.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(profile.previewUrl);
      }
      setProfile(prev => ({
        ...prev, 
        profilePic: file, 
        previewUrl: URL.createObjectURL(file),
        deletePic: false
      }));
    }
  };

  const handleRemovePic = () => {
    if (profile.previewUrl && profile.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(profile.previewUrl);
    }
    setProfile(prev => ({
      ...prev,
      profilePic: null,
      previewUrl: null,
      deletePic: true
    }));
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (pwd.oldPassword || pwd.newPassword) {
        if (pwd.newPassword !== pwd.confirmPassword) {
           setToast({ msg: 'New passwords do not match!', type: 'error' });
           setLoading(false);
           return;
        }
      }

      // 1. Save Profile Text & Pic
      const formData = new FormData();
      formData.append('display_name', profile.displayName);
      formData.append('phone_number', profile.phone);
      formData.append('designation', profile.designation);
      formData.append('timezone', profile.timezone);
      if (profile.profilePic) {
        formData.append('profile_picture', profile.profilePic);
      }
      if (profile.deletePic) {
        formData.append('delete_picture', 'true');
      }
      
      await API.patch('auth/update-profile/', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      updateUser({ display_name: profile.displayName });

      // 2. Save Password if entered
      if (pwd.oldPassword || pwd.newPassword) {
        await API.post('auth/change-password/', {
          old_password: pwd.oldPassword,
          new_password: pwd.newPassword,
          confirm_password: pwd.confirmPassword
        });
        setPwd({ oldPassword: '', newPassword: '', confirmPassword: '' });
      }

      setToast({ msg: 'All changes saved successfully!', type: 'success' });
    } catch (err) {
      setToast({ msg: typeof err.response?.data === 'object' ? JSON.stringify(err.response.data) : (err.response?.data?.error || 'Failed to update settings.'), type: 'error' });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSaveAll} className="max-w-3xl rounded-2xl border border-gray-100 dark:border-navy-700 bg-white dark:bg-navy-800 p-8 shadow-sm">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* ── Avatar Upload ── */}
      <div className="mb-10 flex flex-col items-center sm:flex-row sm:justify-start gap-6">
        <div className="relative h-24 w-24 rounded-full border-4 border-slate-50 dark:border-navy-900 bg-slate-100 dark:bg-navy-700 shadow-md flex items-center justify-center overflow-hidden">
          {profile.previewUrl ? (
            <img src={profile.previewUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
             <User className="h-10 w-10 text-slate-300" />
          )}
          <div className="absolute inset-x-0 bottom-0 flex h-8 cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100" onClick={() => fileInputRef.current.click()}>
            <Camera className="h-4 w-4 text-white" />
          </div>
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Profile Picture</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Upload a new avatar. JPG or PNG allowed.</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fileInputRef.current.click()} className="rounded-lg bg-slate-100 dark:bg-navy-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-navy-600 transition-colors">
              Choose Image
            </button>
            {profile.previewUrl && (
              <button type="button" onClick={handleRemovePic} className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                Remove
              </button>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePicChange} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        {/* left col: Personal Info */}
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-sky-600 border-b border-gray-100 dark:border-navy-700 pb-2">
            <User className="h-4 w-4" /> Personal Information
          </h4>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Display Name</label>
            <input required value={profile.displayName} onChange={e => setProfile({...profile, displayName: e.target.value})} className="w-full input-field" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Phone Number</label>
            <input
              required
              value={profile.phone}
              onChange={e => {
                // Only allow digits, +, -, spaces, parentheses
                const val = e.target.value.replace(/[^0-9+\-\s()]/g, '');
                setProfile({...profile, phone: val});
              }}
              minLength={7}
              maxLength={20}
              placeholder="e.g. +92 300 1234567"
              className="w-full input-field"
            />
            <p className="mt-1 text-[10px] text-gray-400">Digits, +, -, spaces only. Min 7 characters.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Designation</label>
            <input
              value={profile.designation}
              onChange={e => {
                // Only allow letters, spaces and hyphens — no numbers or special chars
                const val = e.target.value.replace(/[^a-zA-Z\s\-]/g, '');
                setProfile({...profile, designation: val});
              }}
              maxLength={60}
              placeholder="e.g. Senior Auditor"
              className="w-full input-field"
            />
            <p className="mt-1 text-[10px] text-gray-400">Letters and spaces only.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Timezone</label>
            <select value={profile.timezone} onChange={e => setProfile({...profile, timezone: e.target.value})} className="w-full input-field cursor-pointer">
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Asia/Dubai">Asia/Dubai</option>
              <option value="Asia/Karachi">Asia/Karachi</option>
            </select>
          </div>
        </div>

        {/* right col: Security */}
        <div className="space-y-4">
           <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-rose-500 border-b border-gray-100 dark:border-navy-700 pb-2">
            <Lock className="h-4 w-4" /> Password Reset
          </h4>
          <div className="relative">
            <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Current Password</label>
            <input type={showOldPwd ? "text" : "password"} value={pwd.oldPassword} onChange={e => setPwd({...pwd, oldPassword: e.target.value})} className="w-full input-field pr-10" placeholder="Required if changing password" />
            <button type="button" onClick={() => setShowOldPwd(!showOldPwd)} className="absolute right-3 top-[26px] text-gray-400 hover:text-gray-600">
               {showOldPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="relative">
            <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">New Password</label>
            <input type={showNewPwd ? "text" : "password"} value={pwd.newPassword} onChange={e => setPwd({...pwd, newPassword: e.target.value})} className="w-full input-field pr-10" placeholder="New string password" />
            <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-[26px] text-gray-400 hover:text-gray-600">
               {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <PasswordChecklist password={pwd.newPassword} />
          </div>
          <div className="relative">
            <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Confirm New Password</label>
            <input type={showConfirmPwd ? "text" : "password"} value={pwd.confirmPassword} onChange={e => setPwd({...pwd, confirmPassword: e.target.value})} className="w-full input-field pr-10" placeholder="Re-type new password" />
            <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)} className="absolute right-3 top-[26px] text-gray-400 hover:text-gray-600">
               {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-10 border-t border-gray-100 dark:border-navy-700 pt-6 flex justify-end">
        <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto px-8 rounded-full shadow-lg shadow-sky-500/30">
          Save All Changes
        </button>
      </div>
    </form>
  );
}

function SystemSettingsTab() {
  const [toast, setToast] = useState(null);
  const [settings, setSettings] = useState({
    passing_score_threshold: 80,
    scan_frequency: 'weekly',
    audit_log_retention: '1year',
    critical_email_alerts: true,
    weekly_report: false
  });

  useEffect(() => {
    API.get('settings/').then((res) => {
      setSettings(res.data);
    });
  }, []);

  const handleChange = useCallback(async (key, value) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      API.patch('settings/', { [key]: value })
        .then(() => setToast({ msg: 'Configuration auto-saved.', type: 'success' }))
        .catch(() => {
          setToast({ msg: 'Failed to auto-save.', type: 'error' });
          setSettings(prev); // revert
        });
      return updated;
    });
  }, []);

  const Toggle = ({ checked, onChange }) => (
    <div 
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-5 shadow-sm' : 'translate-x-1'}`} />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="rounded-2xl border border-gray-100 dark:border-navy-700 bg-white dark:bg-navy-800 shadow-sm overflow-hidden">
        
        <div className="bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-5">
           <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <Sliders className="h-5 w-5" /> Global Automation Thresholds
          </h3>
          <p className="text-sky-100 text-xs mt-1">Changes are saved automatically and applied globally to all scans.</p>
        </div>

        <div className="p-6 space-y-8">
          
          <div className="rounded-xl border border-sky-100 dark:border-sky-900/30 bg-sky-50 dark:bg-sky-900/10 p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <label className="block text-sm font-bold text-sky-900 dark:text-sky-100">Critical Score Threshold</label>
                <p className="text-xs text-sky-700 dark:text-sky-300 mt-1">If compliance drops below this %, dashboards flag Critical.</p>
              </div>
              <span className="rounded-lg bg-sky-600 px-4 py-1.5 text-lg font-black text-white shadow-md">
                {settings.passing_score_threshold}%
              </span>
            </div>
            <input type="range" min="50" max="100" value={settings.passing_score_threshold} 
              onChange={(e) => setSettings({...settings, passing_score_threshold: Number(e.target.value)})}
              onMouseUp={(e) => handleChange('passing_score_threshold', Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none bg-sky-200 dark:bg-sky-800 accent-sky-500 cursor-pointer" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Default Scan Frequency</label>
              <select value={settings.scan_frequency} onChange={(e) => handleChange('scan_frequency', e.target.value)}
                className="w-full input-field border-slate-300 dark:border-navy-600 cursor-pointer">
                <option value="daily">Daily (High Risk)</option>
                <option value="weekly">Weekly (Standard)</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Log Retention Policy</label>
              <select value={settings.audit_log_retention} onChange={(e) => handleChange('audit_log_retention', e.target.value)}
                className="w-full input-field border-slate-300 dark:border-navy-600 cursor-pointer">
                <option value="6months">Keep for 6 Months</option>
                <option value="1year">Keep for 1 Year (ISO Req)</option>
                <option value="3years">Keep for 3 Years</option>
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-navy-700">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" /> Administrative Alerts
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-navy-900 transition-colors">
                <div className="pr-4">
                  <span className="block text-sm font-bold text-slate-700 dark:text-slate-300">Critical Failure Alerts</span>
                  <span className="block text-xs text-slate-500">Instantly notify all Super Admins if a mapped system drops below threshold.</span>
                </div>
                <Toggle checked={settings.critical_email_alerts} onChange={(chk) => handleChange('critical_email_alerts', chk)} />
              </div>

              <div className="flex items-center justify-between rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-navy-900 transition-colors">
                <div className="pr-4">
                  <span className="block text-sm font-bold text-slate-700 dark:text-slate-300">Weekly PDF Summary</span>
                  <span className="block text-xs text-slate-500">Email an executive PDF summary to admins every Monday morning.</span>
                </div>
                <Toggle checked={settings.weekly_report} onChange={(chk) => handleChange('weekly_report', chk)} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function SMTPConfigurationTab() {
  const [sudoUnlocked, setSudoUnlocked] = useState(false);
  const [sudoPassword, setSudoPassword] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState({
    host: 'smtp.gmail.com',
    port: 587,
    username: '',
    password: '',
    use_tls: true,
  });
  const [passwordConfigured, setPasswordConfigured] = useState(false);

  const fetchSMTP = async () => {
    try {
      const res = await API.get('smtp-settings/');
      setSmtpConfig({
        host: res.data.host || '',
        port: res.data.port || 587,
        username: res.data.username || '',
        password: '',
        use_tls: res.data.use_tls ?? true,
      });
      setPasswordConfigured(res.data.password_configured || false);
    } catch {}
  };

  const handleSudo = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await API.post('auth/sudo-verify/', { password: sudoPassword });
      if (res.data.valid) {
        setSudoUnlocked(true);
        fetchSMTP();
      }
    } catch {
      setError('Invalid password. Access denied.');
    }
  };

  const handleSaveSMTP = async () => {
    setSaving(true);
    try {
      const payload = { ...smtpConfig };
      // Only send password if user typed a new one
      if (!payload.password) delete payload.password;
      await API.patch('smtp-settings/', payload);
      setToast({ msg: 'SMTP configuration saved successfully.', type: 'success' });
      setPasswordConfigured(true);
    } catch {
      setToast({ msg: 'Failed to save SMTP configuration.', type: 'error' });
    }
    setSaving(false);
  };

  if (!sudoUnlocked) {
    return (
      <div className="max-w-md rounded-2xl border border-rose-100 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-900/10 p-8 shadow-sm">
        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/50 mb-4">
          <ShieldAlert className="h-7 w-7 text-rose-600 dark:text-rose-400" />
        </div>
        <h3 className="mb-2 text-center text-xl font-bold text-rose-700 dark:text-rose-400">
          Sudo Mode Required
        </h3>
        <p className="text-center text-sm text-rose-600 dark:text-rose-300/80 mb-6 font-medium">
          Modifying live integrational SMTP routing requires you to re-verify your identity.
        </p>
        <form onSubmit={handleSudo} className="space-y-4">
          <input type="password" required value={sudoPassword} onChange={e => setSudoPassword(e.target.value)} placeholder="Confirm your super admin password" className="w-full input-field py-3 text-center tracking-widest font-mono" />
          {error && <p className="text-xs text-center font-bold text-red-500">{error}</p>}
          <button type="submit" className="w-full btn-primary py-3 bg-rose-600 hover:bg-rose-700 border-none shadow-lg shadow-rose-600/30">
            Unlock Configuration
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-2xl rounded-2xl border border-gray-100 dark:border-navy-700 bg-white dark:bg-navy-800 p-8 shadow-sm">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <h3 className="mb-6 flex items-center gap-3 text-xl font-bold text-[#0f172a] dark:text-white">
        <Mail className="h-6 w-6 text-indigo-500" /> SMTP Server Pipeline
      </h3>
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">SMTP Host</label>
            <input className="w-full input-field" value={smtpConfig.host} onChange={e => setSmtpConfig({...smtpConfig, host: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">SMTP Port</label>
            <input className="w-full input-field" type="number" value={smtpConfig.port} onChange={e => setSmtpConfig({...smtpConfig, port: Number(e.target.value)})} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">SMTP User Address</label>
          <input className="w-full input-field" value={smtpConfig.username} onChange={e => setSmtpConfig({...smtpConfig, username: e.target.value})} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">App / Secret Password</label>
          <input type="password" className="w-full input-field" value={smtpConfig.password} onChange={e => setSmtpConfig({...smtpConfig, password: e.target.value})} placeholder={passwordConfigured ? '••••••••••  (leave blank to keep current)' : 'Enter SMTP password'} />
        </div>
        <div className="flex items-center gap-3 rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-navy-900 transition-colors">
          <div className="pr-4">
            <span className="block text-sm font-bold text-slate-700 dark:text-slate-300">Use TLS (STARTTLS)</span>
            <span className="block text-xs text-slate-500">Required for most providers (Gmail, Outlook, etc.)</span>
          </div>
          <div 
            onClick={() => setSmtpConfig({...smtpConfig, use_tls: !smtpConfig.use_tls})}
            className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors ${smtpConfig.use_tls ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${smtpConfig.use_tls ? 'translate-x-5 shadow-sm' : 'translate-x-1'}`} />
          </div>
        </div>
        <div className="pt-4 flex justify-end">
          <button disabled={saving} onClick={handleSaveSMTP} className="btn-primary px-8 rounded-full shadow-lg shadow-sky-500/30 flex items-center gap-2 disabled:opacity-60">
            {saving ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : null}
            {saving ? 'Saving...' : 'Apply Configuration Pipeline'}
          </button>
        </div>
      </div>
    </div>
  );
}
