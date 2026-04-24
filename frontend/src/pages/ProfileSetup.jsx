import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, CheckCircle2, Sun, Moon, Eye, EyeOff, Check, X as XIcon, User, Phone, Briefcase, Globe, Lock, ShieldCheck, LogOut, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../api/axios';

/* ── Password Complexity Checklist ─────────────── */
function PasswordChecklist({ password }) {
  const rules = useMemo(() => [
    { label: 'Minimum 8 characters', test: password.length >= 8 },
    { label: 'Uppercase & Lowercase mix', test: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: 'Numerical identifier (0-9)', test: /[0-9]/.test(password) },
    { label: 'Special character (!@#$...)', test: /[^A-Za-z0-9]/.test(password) },
  ], [password]);

  if (!password) return null;

  return (
    <ul className="mt-4 space-y-2">
      {rules.map((r, i) => (
        <li key={i} className="flex items-center gap-2 transition-all duration-300">
          <div className={`p-0.5 rounded-full ${r.test ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`}>
            {r.test ? <Check className="h-2.5 w-2.5 text-white" /> : <XIcon className="h-2.5 w-2.5 text-slate-400" />}
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${r.test ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-600'}`}>
            {r.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { updateUser, logout } = useAuth();
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
      return setError('Account synchronization failed: Passwords do not match.');
    }
    if (!validatePassword(formData.password)) {
      return setError('Security policy violation: Password does not meet complexity requirements.');
    }
    if (!formData.phone || !formData.displayName) {
       return setError('Validation Error: Display Name and Phone are required for identity provisioning.');
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
      updateUser({ needs_setup: false });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Provisioning failed. Please contact your system administrator.');
    }
    setLoading(false);
  };

  return (
    <div className={`relative min-h-screen flex items-center justify-center p-6 selection:bg-brand-500/30 selection:text-brand-900 transition-colors duration-700 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-500/5 blur-[120px] rounded-full"></div>
         <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full"></div>
      </div>

      {/* ── Dark Mode Toggle ── */}
      <button
        onClick={toggleTheme}
        className="absolute top-8 right-8 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 z-50 group"
      >
        {isDarkMode ? <Sun className="h-5 w-5 text-amber-500 group-hover:rotate-45 transition-transform" /> : <Moon className="h-5 w-5 text-brand-600 group-hover:-rotate-12 transition-transform" />}
      </button>

      <div className="w-full max-w-2xl relative">
        <div className="cyber-card p-10 md:p-14 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-800/50 shadow-2xl">
          
          <div className="flex flex-col items-center text-center mb-12">
            <div className="relative mb-6">
               <div className="absolute inset-0 bg-brand-600 blur-2xl opacity-20 animate-pulse"></div>
               <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 shadow-xl shadow-brand-600/10">
                 <ShieldAlert className="h-10 w-10" />
               </div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Identity Provisioning</h2>
            <p className="mt-3 text-sm text-slate-500 font-medium max-w-md leading-relaxed">
              Security Protocol v2.4: You must finalize your identity profile and establish high-entropy credentials before accessing the ICMS registry.
            </p>
          </div>

          {error && (
            <div className="mb-8 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-5 flex items-start gap-4 animate-in slide-in-from-top-2">
              <ShieldAlert className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] font-black uppercase tracking-widest text-red-700 dark:text-red-400 leading-normal">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Identity Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-3.5 h-4 w-4 text-slate-300 group-focus-within:text-brand-600 transition-colors" />
                  <input
                    required
                    value={formData.displayName}
                    onChange={e => setFormData({...formData, displayName: e.target.value})}
                    className="input-field pl-12"
                    placeholder="Full Name"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Secure Contact</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-3.5 h-4 w-4 text-slate-300 group-focus-within:text-brand-600 transition-colors" />
                  <input
                    required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="input-field pl-12"
                    placeholder="+X XXX XXX XXXX"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Organization Role</label>
                <div className="relative group">
                  <Briefcase className="absolute left-4 top-3.5 h-4 w-4 text-slate-300 group-focus-within:text-brand-600 transition-colors" />
                  <input
                    value={formData.designation}
                    onChange={e => setFormData({...formData, designation: e.target.value})}
                    className="input-field pl-12"
                    placeholder="e.g. Lead Security Architect"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Temporal Registry</label>
                <div className="relative group">
                  <Globe className="absolute left-4 top-3.5 h-4 w-4 text-slate-300 group-focus-within:text-brand-600 transition-colors" />
                  <select
                    value={formData.timezone}
                    onChange={e => setFormData({...formData, timezone: e.target.value})}
                    className="input-field pl-12 appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em]"
                  >
                    <option value="UTC">Universal Time Coordinated</option>
                    <option value="America/New_York">New York (EST)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Asia/Dubai">Dubai (GST)</option>
                    <option value="Asia/Karachi">Karachi (PKT)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-10 border-t border-slate-100 dark:border-slate-800">
               <div className="flex items-center gap-3 mb-8">
                  <div className="p-2.5 rounded-2xl bg-brand-50 dark:bg-brand-900/20 text-brand-600">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Credential Vault</h3>
               </div>
              
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">New Access Key</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-300 group-focus-within:text-brand-600 transition-colors" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        className="input-field pl-12 pr-12"
                        placeholder="Establish passphrase"
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-4 top-3.5 text-slate-300 hover:text-brand-600 transition-colors">
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <PasswordChecklist password={formData.password} />
                 </div>

                 <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Validate Key</label>
                    <div className="relative group">
                      <ShieldCheck className="absolute left-4 top-3.5 h-4 w-4 text-slate-300 group-focus-within:text-brand-600 transition-colors" />
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        required
                        value={formData.confirmPassword}
                        onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                        className="input-field pl-12 pr-12"
                        placeholder="Re-type for validation"
                      />
                      <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-4 top-3.5 text-slate-300 hover:text-brand-600 transition-colors">
                        {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {formData.confirmPassword && (
                      <div className={`mt-4 flex items-center gap-2 p-2 px-3 rounded-xl border ${formData.password === formData.confirmPassword ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/10 dark:border-emerald-900/20' : 'bg-red-50 border-red-100 text-red-600 dark:bg-red-950/10 dark:border-red-900/20'}`}>
                         {formData.password === formData.confirmPassword ? <CheckCircle2 className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
                         <span className="text-[10px] font-black uppercase tracking-widest">
                           {formData.password === formData.confirmPassword ? 'Synchronization Verified' : 'Mismatched Credentials'}
                         </span>
                      </div>
                    )}
                 </div>
               </div>
            </div>

            <div className="pt-8 flex flex-col sm:flex-row items-center gap-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 py-4 flex items-center justify-center gap-3 shadow-2xl shadow-brand-600/30"
              >
                {loading ? (
                  <><div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> PROVISIONING...</>
                ) : (
                  <><ShieldCheck className="h-5 w-5" /> AUTHORIZE & ACCESS REGISTRY</>
                )}
              </button>
              <button
                type="button"
                onClick={() => { logout(); navigate('/login', { replace: true }); }}
                className="p-4 px-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-red-500 hover:border-red-100 dark:hover:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-300 flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </form>

          <div className="mt-12 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex items-start gap-4">
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
               <Zap className="w-4 h-4 text-brand-600" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Security Advisory</p>
               <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">Identity provisioning is logged. Ensure your contact details are accurate for multi-factor recovery and critical system alerts.</p>
            </div>
          </div>
        </div>
        
        <p className="mt-10 text-center text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">
          &copy; 2026 ICMS PLATFORM · ALL SYSTEMS OPERATIONAL
        </p>
      </div>
    </div>
  );
}
