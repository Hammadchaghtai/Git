import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Sun, Moon, Lock, ArrowLeft, ShieldAlert, Zap, History } from 'lucide-react';
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
      setError('Validation Failure: A 6-digit cryptographic token is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await API.post('auth/verify-login-totp/', {
        username: pending.username,
        code,
      });

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
      setError(err.response?.data?.error || 'Authentication Failed: Invalid token signature.');
    }
    setLoading(false);
  };

  if (!pending) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isDarkMode ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
        <div className="text-center">
          <History className="w-16 h-16 mx-auto mb-6 text-slate-200 dark:text-slate-800" />
          <p className="text-sm font-black uppercase tracking-widest mb-6">No pending synchronization found.</p>
          <Link to="/login" className="btn-primary px-8 py-3 inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> RETURN TO TERMINAL
          </Link>
        </div>
      </div>
    );
  }

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
                 <Lock className="h-10 w-10" />
               </div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase text-center">Identity Multi-Factor</h2>
            <p className="mt-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] text-center">Verify Cryptographic Token</p>
          </div>

          {error && (
            <div className="mb-8 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-5 flex items-start gap-4 animate-in slide-in-from-top-2">
              <ShieldAlert className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] font-black uppercase tracking-widest text-red-700 dark:text-red-400 leading-normal">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="mb-4 block text-[10px] font-black uppercase tracking-widest text-slate-400 text-center ml-1">Authentication Pulse (6-Digits)</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000 000"
                maxLength={6}
                autoFocus
                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl px-6 py-6 text-center text-4xl font-black tracking-[12px] text-brand-600 dark:text-brand-400 placeholder-slate-200 dark:placeholder-slate-800 outline-none focus:border-brand-600 transition-all duration-300"
              />
              <p className="mt-4 text-[10px] text-center font-medium text-slate-400 leading-relaxed italic">
                Synchronized via Microsoft Authenticator app.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 flex items-center justify-center gap-3 shadow-2xl shadow-brand-600/30"
            >
              {loading ? (
                <><div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> VALIDATING...</>
              ) : (
                <><ShieldCheck className="h-5 w-5" /> VERIFY IDENTITY</>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-600 transition-colors">
              <ArrowLeft className="w-3 h-3" /> Abort Synchronization
            </Link>
          </div>

          <div className="mt-12 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex items-start gap-4">
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
               <Zap className="w-4 h-4 text-brand-600" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Time-Sensitive</p>
               <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">Cryptographic tokens expire every 30 seconds. Ensure your device time is synchronized.</p>
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
