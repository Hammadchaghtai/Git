import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff, Sun, Moon, Lock, User, ShieldCheck, Zap } from 'lucide-react';
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
      sessionStorage.setItem('pending_login', JSON.stringify({
        username: result.username,
        role: result.role || null,
        needs_setup: result.needs_setup || false,
        requires_2fa: result.requires_2fa ?? true,
      }));
      navigate('/verify-otp');
    } else {
      setError(result.message || 'Access Denied: Invalid credentials detected.');
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

      <div className="w-full max-w-[440px] relative">
        <div className="cyber-card p-10 md:p-14 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-800/50 shadow-2xl">
          
          <div className="flex flex-col items-center text-center mb-10">
            <div className="relative mb-6">
               <div className="absolute inset-0 bg-brand-600 blur-2xl opacity-20 animate-pulse"></div>
               <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 shadow-xl shadow-brand-600/10">
                 <Shield className="h-10 w-10" />
               </div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">ICMS</h2>
            <p className="mt-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Access Security Terminal</p>
          </div>

          {error && (
            <div className="mb-8 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-5 flex items-start gap-4 animate-in slide-in-from-top-2">
              <ShieldCheck className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400 leading-normal">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Identity Identifier</label>
              <div className="relative group">
                <User className="absolute left-4 top-3.5 h-4 w-4 text-slate-300 group-focus-within:text-brand-600 transition-colors" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="input-field pl-12"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Access Key</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-300 group-focus-within:text-brand-600 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Passphrase"
                  className="input-field pl-12 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-300 hover:text-brand-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link to="/forgot-password" size="sm" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-600 transition-colors">
                Recover Access Key?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 flex items-center justify-center gap-3 shadow-2xl shadow-brand-600/30"
            >
              {loading ? (
                <><div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> VERIFYING...</>
              ) : (
                <><Zap className="h-5 w-5" /> INITIALIZE SESSION</>
              )}
            </button>
          </form>

          <div className="mt-12 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex items-start gap-4">
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
               <ShieldCheck className="w-4 h-4 text-brand-600" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Secure Gateway</p>
               <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">System protected by RSA encryption and biometric multi-factor authentication requirements.</p>
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
