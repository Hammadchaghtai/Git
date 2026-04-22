import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, ShieldCheck, Smartphone, Sun, Moon, Eye, EyeOff, Check, X as XIcon, ShieldAlert, Zap, History, Lock, Key } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import API from '../api/axios';

// Steps: 1=email, 2=select-method, 3a=email-otp, 3b=totp, 4=new-password, 5=done

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

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState('');
  const [otp, setOtp] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  // --- Timer for email OTP (2 minutes) ---
  const [timeLeft, setTimeLeft] = useState(120);
  const timerRef = useRef(null);

  const startTimer = () => {
    setTimeLeft(120);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await API.post('auth/forgot-password/', { email });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Account not found: Identify record missing in the sovereign registry.');
    }
    setLoading(false);
  };

  const handleSelectMethod = async (selectedMethod) => {
    setMethod(selectedMethod);
    setLoading(true); setError('');
    try {
      await API.post('auth/select-method/', { email, method: selectedMethod });
      if (selectedMethod === 'email') {
        startTimer();
        setStep('3a');
      } else {
        setStep('3b');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verification error: Method selection failed.');
    }
    setLoading(false);
  };

  const handleVerifyEmailOTP = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await API.post('auth/verify-email-otp/', { email, otp });
      clearInterval(timerRef.current);
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid Token: Signature mismatch or expired.');
    }
    setLoading(false);
  };

  const handleResendOTP = async () => {
    setLoading(true); setError('');
    try {
      await API.post('auth/resend-email-otp/', { email });
      startTimer();
      setOtp('');
    } catch (err) {
      setError(err.response?.data?.error || 'Dispatch error: Failed to relay new token.');
    }
    setLoading(false);
  };

  const handleVerifyTOTP = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await API.post('auth/verify-totp/', { email, code: totpCode });
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failure: Invalid authenticator sequence.');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (pass1 !== pass2) { setError('Synchronization failed: Passwords do not match.'); return; }
    if (pass1.length < 8) { setError('Security policy violation: Minimum length requirement not met.'); return; }
    setLoading(true); setError('');
    try {
      await API.post('auth/reset-password/', { email, password: pass1, password2: pass2 });
      setStep(5);
    } catch (err) {
      setError(err.response?.data?.error || 'Provisioning error: Failed to update access key.');
    }
    setLoading(false);
  };

  const backLink = (
    <div className="mt-8 text-center">
      <Link to="/login" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-600 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Terminal
      </Link>
    </div>
  );

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
        <div className="cyber-card p-10 md:p-14 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-800/50 shadow-2xl overflow-hidden">
          
          {/* STEP 1: Email */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center text-center mb-10">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-brand-600 blur-2xl opacity-20 animate-pulse"></div>
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 shadow-xl shadow-brand-600/10">
                    <Mail className="h-10 w-10" />
                  </div>
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Key Recovery</h2>
                <p className="mt-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Initialize Identity Restoration</p>
              </div>

              {error && (
                <div className="mb-8 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-5 flex items-start gap-4">
                  <ShieldAlert className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400 leading-normal">{error}</p>
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Registered Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-300 group-focus-within:text-brand-600 transition-colors" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="Identify record email" required className="input-field pl-12" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-4 flex items-center justify-center gap-3 shadow-2xl shadow-brand-600/30">
                  {loading ? (
                    <><div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> SCANNING...</>
                  ) : (
                    <><Zap className="h-5 w-5" /> DISPATCH RESTORATION</>
                  )}
                </button>
              </form>
              {backLink}
            </div>
          )}

          {/* STEP 2: Select Method */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center text-center mb-10">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Verification</h2>
                <p className="mt-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Select Recovery Protocol</p>
              </div>

              {error && (
                <div className="mb-8 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-5 flex items-start gap-4">
                  <ShieldAlert className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400 leading-normal">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <button onClick={() => handleSelectMethod('email')} disabled={loading}
                  className="w-full flex items-center gap-5 p-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-all duration-300 group">
                  <div className="p-3 rounded-2xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 group-hover:scale-110 transition-transform">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Email Dispatch</p>
                    <p className="text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-widest">Relay OTP to mailbox</p>
                  </div>
                </button>

                <button onClick={() => handleSelectMethod('app')} disabled={loading}
                  className="w-full flex items-center gap-5 p-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/10 transition-all duration-300 group">
                  <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-900/30 text-sky-600 group-hover:scale-110 transition-transform">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">App Authenticator</p>
                    <p className="text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-widest">Microsoft / Google TOTP</p>
                  </div>
                </button>
              </div>
              {backLink}
            </div>
          )}

          {/* STEP 3a: Verify Email OTP */}
          {step === '3a' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center text-center mb-10">
                <div className="relative mb-6">
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 shadow-xl shadow-brand-600/10">
                    <History className="h-10 w-10 animate-pulse" />
                  </div>
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Mail Delivery</h2>
                <p className="mt-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Validation Sequence Pending</p>
              </div>

              {error && (
                <div className="mb-8 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-5 flex items-start gap-4">
                  <ShieldAlert className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400 leading-normal">{error}</p>
                </div>
              )}

              <form onSubmit={handleVerifyEmailOTP} className="space-y-8">
                <input type="text" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000 000" maxLength={6} autoFocus
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl px-6 py-6 text-center text-4xl font-black tracking-[12px] text-brand-600 dark:text-brand-400 placeholder-slate-200 dark:placeholder-slate-800 outline-none focus:border-brand-600 transition-all duration-300" />
                
                <button type="submit" disabled={loading} className="btn-primary w-full py-4 flex items-center justify-center gap-3 shadow-2xl shadow-brand-600/30">
                  {loading ? (
                    <><div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> VALIDATING...</>
                  ) : (
                    <><ShieldCheck className="h-5 w-5" /> AUTHORIZE TOKEN</>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                {timeLeft > 0 ? (
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Token Expiration: <span className="text-brand-600">{formatTime(timeLeft)}</span>
                  </p>
                ) : (
                  <button onClick={handleResendOTP} disabled={loading}
                    className="text-[10px] font-black uppercase tracking-widest text-brand-600 hover:text-brand-700 underline decoration-2 underline-offset-4">
                    DISPATCH NEW TOKEN
                  </button>
                )}
              </div>
              {backLink}
            </div>
          )}

          {/* STEP 3b: Verify TOTP */}
          {step === '3b' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center text-center mb-10">
                <div className="relative mb-6">
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-sky-50 dark:bg-sky-900/30 text-sky-600 shadow-xl shadow-sky-600/10">
                    <ShieldCheck className="h-10 w-10" />
                  </div>
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Multi-Factor</h2>
                <p className="mt-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Authenticator App Sync</p>
              </div>

              {error && (
                <div className="mb-8 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-5 flex items-start gap-4">
                  <ShieldAlert className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400 leading-normal">{error}</p>
                </div>
              )}

              <form onSubmit={handleVerifyTOTP} className="space-y-8">
                <input type="text" value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000 000" maxLength={6} autoFocus
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl px-6 py-6 text-center text-4xl font-black tracking-[12px] text-sky-600 dark:text-sky-400 placeholder-slate-200 dark:placeholder-slate-800 outline-none focus:border-sky-600 transition-all duration-300" />
                
                <button type="submit" disabled={loading} className="btn-primary w-full py-4 flex items-center justify-center gap-3 bg-sky-600 hover:bg-sky-700 shadow-sky-600/30">
                  {loading ? (
                    <><div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> VALIDATING...</>
                  ) : (
                    <><ShieldCheck className="h-5 w-5" /> VERIFY IDENTITY</>
                  )}
                </button>
              </form>
              {backLink}
            </div>
          )}

          {/* STEP 4: Reset Password */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center text-center mb-10">
                <div className="relative mb-6">
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 shadow-xl shadow-brand-600/10">
                    <Lock className="h-10 w-10" />
                  </div>
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Provision Key</h2>
                <p className="mt-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Establish New Passphrase</p>
              </div>

              {error && (
                <div className="mb-8 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-5 flex items-start gap-4">
                  <ShieldAlert className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400 leading-normal">{error}</p>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">New Access Key</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-300 group-focus-within:text-brand-600 transition-colors" />
                    <input type={showPass1 ? 'text' : 'password'} value={pass1} onChange={(e) => setPass1(e.target.value)}
                      placeholder="Establish passphrase" required className="input-field pl-12 pr-12" />
                    <button type="button" onClick={() => setShowPass1(!showPass1)}
                      className="absolute right-4 top-3.5 text-slate-300 hover:text-brand-600 transition-colors">
                      {showPass1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordChecklist password={pass1} />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm Identity Key</label>
                  <div className="relative group">
                    <ShieldCheck className="absolute left-4 top-3.5 h-4 w-4 text-slate-300 group-focus-within:text-brand-600 transition-colors" />
                    <input type={showPass2 ? 'text' : 'password'} value={pass2} onChange={(e) => setPass2(e.target.value)}
                      placeholder="Re-type for validation" required className="input-field pl-12 pr-12" />
                    <button type="button" onClick={() => setShowPass2(!showPass2)}
                      className="absolute right-4 top-3.5 text-slate-300 hover:text-brand-600 transition-colors">
                      {showPass2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {pass2 && (
                    <div className={`mt-4 flex items-center gap-2 p-2 px-3 rounded-xl border ${pass1 === pass2 ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/10 dark:border-emerald-900/20' : 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/10 dark:border-rose-900/20'}`}>
                      {pass1 === pass2 ? <Check className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {pass1 === pass2 ? 'Synchronization Verified' : 'Mismatched Credentials'}
                      </span>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full py-4 flex items-center justify-center gap-3 shadow-2xl shadow-brand-600/30">
                  {loading ? (
                    <><div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> UPDATING...</>
                  ) : (
                    <><Key className="h-5 w-5" /> RE-PROVISION ACCESS</>
                  )}
                </button>
              </form>
              {backLink}
            </div>
          )}

          {/* STEP 5: Success */}
          {step === 5 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 shadow-xl shadow-emerald-500/10">
                <CheckCircle className="h-12 w-12" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Restored</h2>
              <p className="mt-3 text-sm text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
                Credential synchronization complete. Your identity access key has been successfully re-provisioned.
              </p>
              <Link to="/login" className="btn-primary mt-10 w-full py-4 flex items-center justify-center gap-3 shadow-2xl shadow-brand-600/30">
                RETURN TO TERMINAL
              </Link>
            </div>
          )}

          <div className="mt-12 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex items-start gap-4">
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
               <ShieldCheck className="w-4 h-4 text-brand-600" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Secure Gateway</p>
               <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">Recovery operations are monitored. Multi-step verification is required to restore administrative access.</p>
            </div>
          </div>
        </div>
        
        <p className="mt-10 text-center text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">
          &copy; 2026 SOVEREIGN GRC ECOSYSTEM · ALL SYSTEMS OPERATIONAL
        </p>
      </div>
    </div>
  );
}
