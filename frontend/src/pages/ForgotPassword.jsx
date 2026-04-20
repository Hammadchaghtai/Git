import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, ShieldCheck, Smartphone, Sun, Moon, Eye, EyeOff, Check, X as XIcon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import API from '../api/axios';

// Steps: 1=email, 2=select-method, 3a=email-otp, 3b=totp, 4=new-password, 5=done

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

  // ── Step 1: Email lookup ─────────────────────────
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await API.post('auth/forgot-password/', { email });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Email not found in system.');
    }
    setLoading(false);
  };

  // ── Step 2: Select method ────────────────────────
  const handleSelectMethod = async (selectedMethod) => {
    setMethod(selectedMethod);
    setLoading(true); setError('');
    try {
      await API.post('auth/select-method/', { email, method: selectedMethod });
      if (selectedMethod === 'email') {
        startTimer();
        setStep('3a'); // email OTP
      } else {
        setStep('3b'); // authenticator TOTP
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    }
    setLoading(false);
  };

  // ── Step 3a: Verify email OTP ────────────────────
  const handleVerifyEmailOTP = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await API.post('auth/verify-email-otp/', { email, otp });
      clearInterval(timerRef.current);
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
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
      setError(err.response?.data?.error || 'Failed to resend OTP.');
    }
    setLoading(false);
  };

  // ── Step 3b: Verify Authenticator TOTP ──────────
  const handleVerifyTOTP = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await API.post('auth/verify-totp/', { email, code: totpCode });
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid Authenticator Code!');
    }
    setLoading(false);
  };

  // ── Step 4: New password ─────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (pass1 !== pass2) { setError('Passwords do not match!'); return; }
    if (pass1.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError('');
    try {
      await API.post('auth/reset-password/', { email, password: pass1, password2: pass2 });
      setStep(5);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    }
    setLoading(false);
  };

  // ── Dynamic classes ──────────────────────────────
  const inputCls = `w-full rounded-lg border px-4 py-2.5 text-sm focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/20 transition-colors duration-300 ${
    isDarkMode
      ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder-slate-500'
      : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400'
  }`;
  const btnCls = `mt-4 w-full rounded-lg py-3 text-sm font-semibold text-white cursor-pointer disabled:opacity-60 transition-all duration-300 ${
    isDarkMode
      ? 'bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-900/30'
      : 'bg-[#0f172a] hover:bg-[#1e293b]'
  }`;
  const errCls = `mt-3 rounded-lg px-4 py-2 text-sm font-semibold ${
    isDarkMode ? 'bg-red-900/30 text-red-400 border border-red-900/50' : 'bg-red-50 text-red-600'
  }`;
  const labelCls = `mb-1 block text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`;
  const headingCls = `text-lg font-bold transition-colors duration-500 ${isDarkMode ? 'text-slate-100' : 'text-[#0f172a]'}`;
  const subCls = `mt-2 text-sm transition-colors duration-500 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`;

  const backLink = (
    <div className="mt-5">
      <Link to="/login" className={`inline-flex items-center gap-1 text-sm no-underline transition-colors ${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}>
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
      </Link>
    </div>
  );

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center p-4 transition-colors duration-500"
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

      <div className={`w-full max-w-[420px] rounded-xl p-10 shadow-xl text-center transition-colors duration-500 ${
        isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'
      }`}>

        {/* ── STEP 1: Email ── */}
        {step === 1 && (
          <>
            <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full ${isDarkMode ? 'bg-sky-900/30' : 'bg-sky-50'}`}>
              <Mail className={`h-7 w-7 ${isDarkMode ? 'text-sky-400' : 'text-sky-600'}`} />
            </div>
            <h3 className={headingCls}>Forgot Password</h3>
            <p className={subCls}>Enter your registered email address</p>
            {error && <div className={errCls}>{error}</div>}
            <form onSubmit={handleEmailSubmit} className="mt-5 text-left">
              <label className={labelCls}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com" required className={inputCls} />
              <button type="submit" disabled={loading} className={btnCls}>
                {loading ? 'Checking...' : 'Continue'}
              </button>
            </form>
            {backLink}
          </>
        )}

        {/* ── STEP 2: Select Method ── */}
        {step === 2 && (
          <>
            <h3 className={headingCls}>Verify It's You</h3>
            <p className={`${subCls} mb-6`}>Select a method to receive your security code.</p>
            {error && <div className={errCls}>{error}</div>}

            {/* Email Option */}
            <button onClick={() => handleSelectMethod('email')} disabled={loading}
              className={`w-full flex items-center gap-4 rounded-xl border-2 p-4 mb-3 text-left cursor-pointer transition-all duration-200 disabled:opacity-60 ${
                isDarkMode
                  ? 'border-slate-600 hover:border-violet-400 hover:bg-violet-900/20'
                  : 'border-gray-100 hover:border-violet-400 hover:bg-violet-50'
              }`}>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isDarkMode ? 'bg-violet-900/40' : 'bg-violet-100'}`}>
                <Mail className={`h-6 w-6 ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`} />
              </div>
              <div>
                <div className={`font-bold ${isDarkMode ? 'text-slate-100' : 'text-[#0f172a]'}`}>Email Address</div>
                <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Send OTP to registered email</div>
              </div>
            </button>

            {/* Authenticator Option */}
            <button onClick={() => handleSelectMethod('app')} disabled={loading}
              className={`w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left cursor-pointer transition-all duration-200 disabled:opacity-60 ${
                isDarkMode
                  ? 'border-slate-600 hover:border-sky-400 hover:bg-sky-900/20'
                  : 'border-gray-100 hover:border-sky-400 hover:bg-sky-50'
              }`}>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isDarkMode ? 'bg-sky-900/40' : 'bg-sky-100'}`}>
                <Smartphone className={`h-6 w-6 ${isDarkMode ? 'text-sky-400' : 'text-sky-600'}`} />
              </div>
              <div>
                <div className={`font-bold ${isDarkMode ? 'text-slate-100' : 'text-[#0f172a]'}`}>Authenticator App</div>
                <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Use code from Microsoft Authenticator</div>
              </div>
            </button>

            {backLink}
          </>
        )}

        {/* ── STEP 3a: Verify Email OTP ── */}
        {step === '3a' && (
          <>
            <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full ${isDarkMode ? 'bg-violet-900/30' : 'bg-violet-50'}`}>
              <Mail className={`h-7 w-7 ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`} />
            </div>
            <h3 className={headingCls}>Check Your Email</h3>
            <p className={subCls}>We sent a 6-digit code to<br /><strong>{email}</strong></p>
            {error && <div className={errCls}>{error}</div>}
            <form onSubmit={handleVerifyEmailOTP} className="mt-5">
              <input type="text" value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" maxLength={6} autoFocus
                className={`w-full rounded-lg border px-4 py-3.5 text-center text-2xl font-bold tracking-[8px] focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/20 transition-colors duration-300 ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder-slate-500'
                    : 'border-gray-200 bg-gray-50 text-[#334155] placeholder-gray-400'
                }`} />
              <button type="submit" disabled={loading} className={btnCls}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>

            {/* Timer / Resend */}
            <div className="mt-4">
              {timeLeft > 0 ? (
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                  Resend code in <span className={`font-bold ${isDarkMode ? 'text-slate-100' : 'text-[#0f172a]'}`}>{formatTime(timeLeft)}</span>
                </p>
              ) : (
                <button onClick={handleResendOTP} disabled={loading}
                  className="text-sm font-bold text-sky-600 hover:text-sky-700 cursor-pointer disabled:opacity-60">
                  Resend OTP
                </button>
              )}
            </div>
            {backLink}
          </>
        )}

        {/* ── STEP 3b: Verify Authenticator TOTP ── */}
        {step === '3b' && (
          <>
            <div className={`mx-auto mb-5 flex h-[70px] w-[70px] items-center justify-center rounded-full ${isDarkMode ? 'bg-sky-900/30' : 'bg-sky-50'}`}>
              <ShieldCheck className={`h-8 w-8 ${isDarkMode ? 'text-sky-400' : 'text-sky-600'}`} />
            </div>
            <h3 className={headingCls}>Authenticator Code</h3>
            <p className={subCls}>Enter the 6-digit code from your<br />Microsoft Authenticator app.</p>
            {error && <div className={errCls}>{error}</div>}
            <form onSubmit={handleVerifyTOTP} className="mt-6">
              <input type="text" value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" maxLength={6} autoFocus
                className={`w-full rounded-lg border px-4 py-3.5 text-center text-2xl font-bold tracking-[8px] focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/20 transition-colors duration-300 ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder-slate-500'
                    : 'border-gray-200 bg-gray-50 text-[#334155] placeholder-gray-400'
                }`} />
              <button type="submit" disabled={loading} className={btnCls}>
                {loading ? 'Verifying...' : 'Verify & Continue →'}
              </button>
            </form>
            {backLink}
          </>
        )}

        {/* ── STEP 4: New Password ── */}
        {step === 4 && (
          <>
            <h3 className={headingCls}>Set New Password</h3>
            <p className={subCls}>Enter your new password below</p>
            {error && <div className={errCls}>{error}</div>}
            <form onSubmit={handleResetPassword} className="mt-5 text-left space-y-3">
              <div>
                <label className={labelCls}>New Password</label>
                <div className="relative">
                  <input type={showPass1 ? 'text' : 'password'} value={pass1} onChange={(e) => setPass1(e.target.value)}
                    placeholder="Enter new password" required className={`${inputCls} pr-10`} />
                  <button type="button" onClick={() => setShowPass1(!showPass1)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}>
                    {showPass1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordChecklist password={pass1} />
              </div>
              <div>
                <label className={labelCls}>Confirm Password</label>
                <div className="relative">
                  <input type={showPass2 ? 'text' : 'password'} value={pass2} onChange={(e) => setPass2(e.target.value)}
                    placeholder="Confirm password" required className={`${inputCls} pr-10`} />
                  <button type="button" onClick={() => setShowPass2(!showPass2)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}>
                    {showPass2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {pass2 && pass1 !== pass2 && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <XIcon className="h-3 w-3" /> Passwords do not match
                  </p>
                )}
                {pass2 && pass1 === pass2 && (
                  <p className="mt-1 text-xs text-emerald-500 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Passwords match
                  </p>
                )}
              </div>
              <button type="submit" disabled={loading} className={btnCls}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
            {backLink}
          </>
        )}

        {/* ── STEP 5: Success ── */}
        {step === 5 && (
          <>
            <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full ${isDarkMode ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
              <CheckCircle className={`h-7 w-7 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-500'}`} />
            </div>
            <h3 className={headingCls}>Password Reset Successful</h3>
            <p className={subCls}>You can now login with your new password.</p>
            <Link to="/login"
              className={`mt-5 inline-block w-full rounded-lg py-3 text-sm font-semibold text-white no-underline transition-all duration-300 ${
                isDarkMode
                  ? 'bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-900/30'
                  : 'bg-[#0f172a] hover:bg-[#1e293b]'
              }`}>
              Back to Login
            </Link>
          </>
        )}

      </div>

      <p className={`mt-8 text-sm transition-colors ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
        &copy; 2026 GRC Compliance Management System
      </p>
    </div>
  );
}
