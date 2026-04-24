import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sliders, Bell, User, Lock, ShieldAlert, Mail, Camera, FileText, Eye, EyeOff, Check, X as XIcon, Globe, MapPin, Phone, ShieldCheck, Zap, ArrowRight, Shield, Database, LockKeyhole, RefreshCw, ChevronDown } from 'lucide-react';
import API from '../api/axios';
import Toast from '../components/Toast';

export default function SettingsPage() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [toast, setToast] = useState(null);

  const tabs = [
    { id: 'profile', label: 'Identity & Privacy', icon: User },
    { id: 'system', label: 'Core Thresholds', icon: Sliders, restricted: role !== 'super_admin' },
    { id: 'smtp', label: 'Email Pipeline', icon: Mail, restricted: role !== 'super_admin' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">System Preferences</h1>
        <p className="text-slate-500 font-medium mt-1">Configure your professional identity and global platform heuristics.</p>
      </div>

      <div className="mb-10 flex gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl w-fit border border-slate-200 dark:border-slate-800">
        {tabs.filter(t => !t.restricted).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer uppercase tracking-widest ${
                isActive 
                  ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'profile' && <MyProfileTab setToast={setToast} />}
        {activeTab === 'system' && role === 'super_admin' && <SystemSettingsTab setToast={setToast} />}
        {activeTab === 'smtp' && role === 'super_admin' && <SMTPConfigurationTab setToast={setToast} />}
      </div>
    </div>
  );
}

/* ── Password Complexity Checklist ─────────────── */
function PasswordChecklist({ password }) {
  const rules = useMemo(() => [
    { label: '8+ Characters', test: password.length >= 8 },
    { label: 'Uppercase', test: /[A-Z]/.test(password) },
    { label: 'Lowercase', test: /[a-z]/.test(password) },
    { label: 'Numeric', test: /[0-9]/.test(password) },
    { label: 'Special Symbol', test: /[^A-Za-z0-9]/.test(password) },
  ], [password]);

  if (!password) return null;

  return (
    <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Cryptographic Strength</p>
      <ul className="grid grid-cols-2 gap-2">
        {rules.map((r, i) => (
          <li key={i} className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter transition-colors ${r.test ? 'text-emerald-500' : 'text-slate-400'}`}>
            <div className={`p-0.5 rounded-full ${r.test ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-200 dark:bg-slate-800'}`}>
              {r.test ? <Check className="h-2.5 w-2.5" /> : <XIcon className="h-2.5 w-2.5" />}
            </div>
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MyProfileTab({ setToast }) {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
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
  const [isTzOpen, setIsTzOpen] = useState(false);

  const timezones = [
    { value: 'UTC', label: 'Universal Time (UTC)' },
    { value: 'America/New_York', label: 'New York (EST)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Asia/Karachi', label: 'Karachi (PKT)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' }
  ];

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
    setProfile(prev => ({ ...prev, profilePic: null, previewUrl: null, deletePic: true }));
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
      const formData = new FormData();
      formData.append('display_name', profile.displayName);
      formData.append('phone_number', profile.phone);
      formData.append('designation', profile.designation);
      formData.append('timezone', profile.timezone);
      if (profile.profilePic) formData.append('profile_picture', profile.profilePic);
      if (profile.deletePic) formData.append('delete_picture', 'true');
      
      await API.patch('auth/update-profile/', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      updateUser({ display_name: profile.displayName });

      if (pwd.oldPassword || pwd.newPassword) {
        await API.post('auth/change-password/', {
          old_password: pwd.oldPassword,
          new_password: pwd.newPassword,
          confirm_password: pwd.confirmPassword
        });
        setPwd({ oldPassword: '', newPassword: '', confirmPassword: '' });
      }
      setToast({ msg: 'Profile updated successfully.', type: 'success' });
    } catch (err) {
      const errorData = err.response?.data;
      let errorMsg = 'Update failed.';
      
      if (typeof errorData === 'object' && errorData !== null) {
        // If it's a simple { error: "msg" }
        if (errorData.error) errorMsg = errorData.error;
        // If it's a validation error { detail: "msg" }
        else if (errorData.detail) errorMsg = errorData.detail;
        // If it's a field error { field_name: ["msg"] }
        else {
          const firstKey = Object.keys(errorData)[0];
          const val = errorData[firstKey];
          errorMsg = Array.isArray(val) ? val[0] : JSON.stringify(val);
        }
      } else if (typeof errorData === 'string') {
        errorMsg = errorData;
      }
      
      setToast({ msg: errorMsg, type: 'error' });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSaveAll} className="cyber-card p-10">
      
      <div className="mb-12 flex flex-col items-center sm:flex-row sm:justify-start gap-10 border-b border-slate-100 dark:border-slate-800 pb-12">
        <div className="relative h-32 w-32 rounded-3xl border-4 border-white dark:border-slate-900 shadow-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden group">
          {profile.previewUrl ? (
            <img src={profile.previewUrl} alt="Avatar" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
          ) : (
             <User className="h-12 w-12 text-slate-300" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-brand-600/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current.click()}>
            <Camera className="h-8 w-8 text-white" />
          </div>
        </div>
        <div className="text-center sm:text-left">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Identity Token</h3>
          <p className="text-sm text-slate-500 font-medium mb-5">Your profile image is used for audit trails and session visibility.</p>
          <div className="flex flex-wrap justify-center sm:justify-start gap-3">
            <button type="button" onClick={() => fileInputRef.current.click()} className="btn-primary py-2 px-4 text-xs">
              Replace Avatar
            </button>
            {profile.previewUrl && (
              <button type="button" onClick={handleRemovePic} className="py-2 px-4 text-xs font-black text-red-500 uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                Remove
              </button>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePicChange} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-6 max-w-md">
          <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-600 mb-6">
            <User className="h-4 w-4" /> Professional Metadata
          </h4>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">Full Display Name</label>
              <div className="relative group">
                 <User className="absolute left-4 top-3.5 h-4 w-4 text-slate-300 group-focus-within:text-brand-600 transition-colors" />
                 <input required value={profile.displayName} onChange={e => setProfile({...profile, displayName: e.target.value})} className="input-field pl-12 w-full" placeholder="John Doe" />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">Phone Connectivity</label>
              <div className="relative group">
                 <Phone className="absolute left-4 top-3.5 h-4 w-4 text-slate-300 group-focus-within:text-brand-600 transition-colors" />
                 <input
                  required
                  value={profile.phone}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9+\-\s()]/g, '');
                    setProfile({...profile, phone: val});
                  }}
                  minLength={7}
                  maxLength={20}
                  placeholder="+92 300 1234567"
                  className="input-field pl-12 w-full"
                 />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">System Designation</label>
              <div className="relative group">
                 <Globe className="absolute left-4 top-3.5 h-4 w-4 text-slate-300 group-focus-within:text-brand-600 transition-colors" />
                 <input
                  value={profile.designation}
                  onChange={e => {
                    const val = e.target.value.replace(/[^a-zA-Z\s\-]/g, '');
                    setProfile({...profile, designation: val});
                  }}
                  maxLength={60}
                  placeholder="Senior Security Architect"
                  className="input-field pl-12 w-full"
                 />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">Operational Timezone</label>
              <div className="relative">
                <div 
                  onClick={() => setIsTzOpen(!isTzOpen)}
                  className="input-field flex items-center justify-between cursor-pointer hover:border-brand-600/50 transition-all group px-5"
                >
                   <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-slate-300 group-hover:text-brand-600 transition-colors" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                         {timezones.find(t => t.value === profile.timezone)?.label || 'UTC'}
                      </span>
                   </div>
                   <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isTzOpen ? 'rotate-180' : ''}`} />
                </div>

                {isTzOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsTzOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 max-h-60 overflow-y-auto custom-scrollbar">
                      <div className="space-y-0.5">
                        {timezones.map((tz) => (
                          <div 
                            key={tz.value}
                            onClick={() => {
                              setProfile({...profile, timezone: tz.value});
                              setIsTzOpen(false);
                            }}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all flex items-center justify-between ${
                              profile.timezone === tz.value 
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' 
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {tz.label}
                            {profile.timezone === tz.value && <Check className="w-3 h-3" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
           <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500 mb-6">
            <LockKeyhole className="h-4 w-4" /> Cryptographic Secrets
          </h4>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">Legacy Password</label>
              <div className="relative">
                <input type={showOldPwd ? "text" : "password"} value={pwd.oldPassword} onChange={e => setPwd({...pwd, oldPassword: e.target.value})} className="input-field w-full pr-12" placeholder="Verify current secret" />
                <button type="button" onClick={() => setShowOldPwd(!showOldPwd)} className="absolute right-4 top-3 text-slate-300 hover:text-slate-500 transition-colors">
                   {showOldPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">New Secret Key</label>
              <div className="relative">
                <input type={showNewPwd ? "text" : "password"} value={pwd.newPassword} onChange={e => setPwd({...pwd, newPassword: e.target.value})} className="input-field w-full pr-12" placeholder="Entropy-heavy string" />
                <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-4 top-3 text-slate-300 hover:text-slate-500 transition-colors">
                   {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordChecklist password={pwd.newPassword} />
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">Confirm Rotation</label>
              <div className="relative">
                <input type={showConfirmPwd ? "text" : "password"} value={pwd.confirmPassword} onChange={e => setPwd({...pwd, confirmPassword: e.target.value})} className="input-field w-full pr-12" placeholder="Re-verify rotation" />
                <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)} className="absolute right-4 top-3 text-slate-300 hover:text-slate-500 transition-colors">
                   {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-end">
        <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto px-10 py-3 rounded-2xl shadow-xl shadow-brand-600/20 group">
          <span className="flex items-center gap-2">
             {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
             SAVE
          </span>
        </button>
      </div>
    </form>
  );
}

function CustomSelect({ label, value, options, onChange, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
      <div className="relative">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="input-field flex items-center justify-between cursor-pointer hover:border-brand-600/50 transition-all group px-5"
        >
          <div className="flex items-center gap-3">
            {Icon && <Icon className="h-4 w-4 text-slate-300 group-hover:text-brand-600 transition-colors" />}
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">
              {selectedOption?.label || 'Select...'}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full left-0 right-0 mt-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
              <div className="space-y-0.5">
                {options.map((opt) => (
                  <div 
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all flex items-center justify-between ${
                      value === opt.value 
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                    {value === opt.value && <Check className="w-3 h-3" />}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SystemSettingsTab({ setToast }) {
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
        .then(() => setToast({ msg: 'Settings updated successfully.', type: 'success' }))
        .catch(() => {
          setToast({ msg: 'Auto-save failed.', type: 'error' });
          setSettings(prev);
        });
      return updated;
    });
  }, [setToast]);

  const Toggle = ({ checked, onChange }) => (
    <div 
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 cursor-pointer items-center rounded-full transition-all duration-300 ${checked ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-800'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 shadow-lg ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </div>
  );

  const scanOptions = [
    { value: 'daily', label: 'High Velocity (Daily)' },
    { value: 'weekly', label: 'Standard (Weekly)' },
    { value: 'monthly', label: 'Aggregated (Monthly)' },
  ];

  const archiveOptions = [
    { value: '6months', label: 'Short-Term (6M)' },
    { value: '1year', label: 'Enterprise Std (1Y)' },
    { value: '3years', label: 'Regulatory Hold (3Y)' },
  ];

  return (
    <div className="max-w-3xl space-y-8">
      
      <div className="cyber-card overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600 to-indigo-700 px-8 py-8 relative overflow-hidden">
           <div className="relative z-10">
              <h3 className="flex items-center gap-3 text-2xl font-black text-white tracking-tight">
                <Sliders className="h-6 w-6" /> Platform Heuristics
              </h3>
              <p className="text-brand-100 text-sm mt-1 font-medium">Global thresholds and automation governance policies.</p>
           </div>
           <Zap className="absolute -right-4 -bottom-4 h-32 w-32 text-white/10" />
        </div>

        <div className="p-8 space-y-10">
          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <div>
                <label className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Compliance Score Threshold</label>
                <p className="text-xs text-slate-500 font-medium mt-1">Defines the boundary for CRITICAL vs WARNING status flags.</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-3xl font-black text-brand-600 tracking-tighter">
                  {settings.passing_score_threshold}%
                </span>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">MINIMUM PASS</span>
              </div>
            </div>
            <input type="range" min="50" max="100" value={settings.passing_score_threshold} 
              onChange={(e) => setSettings({...settings, passing_score_threshold: Number(e.target.value)})}
              onMouseUp={(e) => handleChange('passing_score_threshold', Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none bg-slate-200 dark:bg-slate-800 accent-brand-600 cursor-pointer" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <CustomSelect 
              label="Default Scan Cadence" 
              value={settings.scan_frequency} 
              options={scanOptions} 
              onChange={(val) => handleChange('scan_frequency', val)} 
              icon={Zap}
            />
            <CustomSelect 
              label="Archive Lifecycle" 
              value={settings.audit_log_retention} 
              options={archiveOptions} 
              onChange={(val) => handleChange('audit_log_retention', val)} 
              icon={Database}
            />
          </div>

          <div className="pt-10 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <Bell className="h-4 w-4 text-brand-600" /> Dispatcher Configurations
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-brand-600/30 transition-all">
                <div className="pr-6">
                  <span className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Instant Breach Alerts</span>
                  <span className="block text-xs text-slate-500 font-medium mt-1">Real-time SMTP dispatch if compliance heuristics fail during scan.</span>
                </div>
                <Toggle checked={settings.critical_email_alerts} onChange={(chk) => handleChange('critical_email_alerts', chk)} />
              </div>

              <div className="flex items-center justify-between p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-brand-600/30 transition-all">
                <div className="pr-6">
                  <span className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Executive PDF Pulse</span>
                  <span className="block text-xs text-slate-500 font-medium mt-1">Automated Monday morning posture analysis dispatched to stakeholders.</span>
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

function SMTPConfigurationTab({ setToast }) {
  const [sudoUnlocked, setSudoUnlocked] = useState(false);
  const [sudoPassword, setSudoPassword] = useState('');
  const [error, setError] = useState('');
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
      setError('Identity verification failure. Access restricted.');
    }
  };

  const handleSaveSMTP = async () => {
    setSaving(true);
    try {
      const payload = { ...smtpConfig };
      if (!payload.password) delete payload.password;
      await API.patch('smtp-settings/', payload);
      setToast({ msg: 'SMTP pipeline encrypted & saved.', type: 'success' });
      setPasswordConfigured(true);
    } catch {
      setToast({ msg: 'Pipeline configuration failure.', type: 'error' });
    }
    setSaving(false);
  };

  if (!sudoUnlocked) {
    return (
      <div className="max-w-md mx-auto p-10 rounded-[2.5rem] bg-red-50 dark:bg-red-950/20 border-2 border-red-100 dark:border-red-900/30 shadow-2xl animate-in zoom-in-95 duration-500">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white dark:bg-slate-900 border-2 border-red-200 dark:border-red-900 shadow-lg mb-8">
          <ShieldAlert className="h-10 w-10 text-red-600" />
        </div>
        <h3 className="text-2xl font-black text-red-900 dark:text-red-400 text-center tracking-tight mb-2">
          Sudo Mode Required
        </h3>
        <p className="text-center text-sm text-red-600 dark:text-red-300 font-bold uppercase tracking-tighter mb-8 leading-tight">
          Verifying master identity for integration configuration access.
        </p>
        <form onSubmit={handleSudo} className="space-y-6">
          <div className="relative group">
             <Lock className="absolute left-4 top-4 h-5 w-5 text-red-300 group-focus-within:text-red-600 transition-colors" />
             <input type="password" required value={sudoPassword} onChange={e => setSudoPassword(e.target.value)} placeholder="••••••••••••" className="w-full pl-12 pr-6 py-4 rounded-2xl border-2 border-red-100 dark:border-red-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-white dark:bg-slate-900 text-center tracking-widest font-mono transition-all outline-none" />
          </div>
          {error && <p className="text-xs text-center font-black text-red-600 uppercase animate-bounce">{error}</p>}
          <button type="submit" className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest shadow-xl shadow-red-600/30 transition-all active:scale-95">
            Verify Identity
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-3xl cyber-card p-10">
      <div className="flex items-center gap-4 mb-10 pb-8 border-b border-slate-100 dark:border-slate-800">
        <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
          <Mail className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">SMTP Communication Pipeline</h3>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">Integration Relay Hub</p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Relay Host</label>
            <input className="input-field w-full" value={smtpConfig.host} onChange={e => setSmtpConfig({...smtpConfig, host: e.target.value})} placeholder="smtp.provider.com" />
          </div>
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Port</label>
            <input className="input-field w-full" type="number" value={smtpConfig.port} onChange={e => setSmtpConfig({...smtpConfig, port: Number(e.target.value)})} placeholder="587" />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Authentication Identity</label>
          <div className="relative group">
             <User className="absolute left-4 top-3.5 h-4 w-4 text-slate-300 group-focus-within:text-brand-600 transition-colors" />
             <input className="input-field pl-12 w-full" value={smtpConfig.username} onChange={e => setSmtpConfig({...smtpConfig, username: e.target.value})} placeholder="admin@security.io" />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Secret Key / Pass</label>
          <div className="relative group">
             <Database className="absolute left-4 top-3.5 h-4 w-4 text-slate-300 group-focus-within:text-brand-600 transition-colors" />
             <input type="password" class="input-field pl-12 w-full" value={smtpConfig.password} onChange={e => setSmtpConfig({...smtpConfig, password: e.target.value})} placeholder={passwordConfigured ? '••••••••••••••••' : 'Secret Key'} />
          </div>
        </div>

        <div className="flex items-center justify-between p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
          <div>
            <span className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">TLS Encryption (STARTTLS)</span>
            <span className="block text-xs text-slate-500 font-medium mt-1">Required for modern secure relay protocols.</span>
          </div>
          <div 
            onClick={() => setSmtpConfig({...smtpConfig, use_tls: !smtpConfig.use_tls})}
            className={`relative inline-flex h-7 w-12 cursor-pointer items-center rounded-full transition-all duration-300 ${smtpConfig.use_tls ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 shadow-md ${smtpConfig.use_tls ? 'translate-x-6' : 'translate-x-1'}`} />
          </div>
        </div>

        <div className="pt-6 flex justify-end">
          <button disabled={saving} onClick={handleSaveSMTP} className="btn-primary w-full sm:w-auto px-10 py-3 rounded-2xl shadow-xl shadow-brand-600/20 group flex items-center justify-center gap-2">
            {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
            {saving ? 'ENCRYPTING...' : 'AUTHORIZE PIPELINE'}
          </button>
        </div>
      </div>
    </div>
  );
}
