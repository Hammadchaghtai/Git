import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, ShieldCheck, Smartphone } from 'lucide-react';
import API from '../api/axios';

// Steps: 1=email, 2=select-method, 3a=email-otp, 3b=totp, 4=new-password, 5=done

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState('');
  const [otp, setOtp] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    if (pass1.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError('');
    try {
      await API.post('auth/reset-password/', { email, password: pass1, password2: pass2 });
      setStep(5);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    }
    setLoading(false);
  };

  const card = 'w-[420px] rounded-xl bg-white p-10 shadow-xl text-center';
  const inputCls = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/20';
  const btnCls = 'mt-4 w-full rounded-lg bg-[#0f172a] py-3 text-sm font-semibold text-white hover:bg-[#1e293b] cursor-pointer disabled:opacity-60';
  const errCls = 'mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600';
  const backLink = (
    <div className="mt-5">
      <Link to="/login" className="inline-flex items-center gap-1 text-sm text-gray-400 no-underline hover:text-gray-600">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
      </Link>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center"
      style={{ background: 'linear-gradient(to bottom, #0f172a 50%, #f4f6f9 50%)' }}>

      <div className={card}>

        {/* ── STEP 1: Email ── */}
        {step === 1 && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-sky-50">
              <Mail className="h-7 w-7 text-sky-600" />
            </div>
            <h3 className="text-lg font-bold text-[#0f172a]">Forgot Password</h3>
            <p className="mt-2 text-sm text-gray-400">Enter your registered email address</p>
            {error && <div className={errCls}>{error}</div>}
            <form onSubmit={handleEmailSubmit} className="mt-5 text-left">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Email</label>
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
            <h3 className="text-lg font-bold text-[#0f172a]">Verify It's You</h3>
            <p className="mt-2 text-sm text-gray-400 mb-6">Select a method to receive your security code.</p>
            {error && <div className={errCls}>{error}</div>}

            {/* Email Option */}
            <button onClick={() => handleSelectMethod('email')} disabled={loading}
              className="w-full flex items-center gap-4 rounded-xl border-2 border-gray-100 p-4 mb-3 text-left cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-all duration-200 disabled:opacity-60">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100">
                <Mail className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <div className="font-bold text-[#0f172a]">Email Address</div>
                <div className="text-xs text-gray-400">Send OTP to registered email</div>
              </div>
            </button>

            {/* Authenticator Option */}
            <button onClick={() => handleSelectMethod('app')} disabled={loading}
              className="w-full flex items-center gap-4 rounded-xl border-2 border-gray-100 p-4 text-left cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition-all duration-200 disabled:opacity-60">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100">
                <Smartphone className="h-6 w-6 text-sky-600" />
              </div>
              <div>
                <div className="font-bold text-[#0f172a]">Authenticator App</div>
                <div className="text-xs text-gray-400">Use code from Microsoft Authenticator</div>
              </div>
            </button>

            {backLink}
          </>
        )}

        {/* ── STEP 3a: Verify Email OTP ── */}
        {step === '3a' && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-violet-50">
              <Mail className="h-7 w-7 text-violet-600" />
            </div>
            <h3 className="text-lg font-bold text-[#0f172a]">Check Your Email</h3>
            <p className="mt-2 text-sm text-gray-400">We sent a 6-digit code to<br /><strong>{email}</strong></p>
            {error && <div className={errCls}>{error}</div>}
            <form onSubmit={handleVerifyEmailOTP} className="mt-5">
              <input type="text" value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" maxLength={6} autoFocus
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5 text-center text-2xl font-bold tracking-[8px] text-[#334155] focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/20" />
              <button type="submit" disabled={loading} className={btnCls}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>

            {/* Timer / Resend */}
            <div className="mt-4">
              {timeLeft > 0 ? (
                <p className="text-sm text-gray-400">
                  Resend code in <span className="font-bold text-[#0f172a]">{formatTime(timeLeft)}</span>
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
            <div className="mx-auto mb-5 flex h-[70px] w-[70px] items-center justify-center rounded-full bg-sky-50">
              <ShieldCheck className="h-8 w-8 text-sky-600" />
            </div>
            <h3 className="text-lg font-bold text-[#0f172a]">Authenticator Code</h3>
            <p className="mt-2 text-sm text-gray-400">Enter the 6-digit code from your<br />Microsoft Authenticator app.</p>
            {error && <div className={errCls}>{error}</div>}
            <form onSubmit={handleVerifyTOTP} className="mt-6">
              <input type="text" value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" maxLength={6} autoFocus
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5 text-center text-2xl font-bold tracking-[8px] text-[#334155] focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/20" />
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
            <h3 className="text-lg font-bold text-[#0f172a]">Set New Password</h3>
            <p className="mt-2 text-sm text-gray-400">Enter your new password below</p>
            {error && <div className={errCls}>{error}</div>}
            <form onSubmit={handleResetPassword} className="mt-5 text-left space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">New Password</label>
                <input type="password" value={pass1} onChange={(e) => setPass1(e.target.value)}
                  placeholder="Enter new password" required className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Confirm Password</label>
                <input type="password" value={pass2} onChange={(e) => setPass2(e.target.value)}
                  placeholder="Confirm password" required className={inputCls} />
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
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle className="h-7 w-7 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-[#0f172a]">Password Reset Successful</h3>
            <p className="mt-2 text-sm text-gray-400">You can now login with your new password.</p>
            <Link to="/login"
              className="mt-5 inline-block w-full rounded-lg bg-[#0f172a] py-3 text-sm font-semibold text-white no-underline hover:bg-[#1e293b]">
              Back to Login
            </Link>
          </>
        )}

      </div>
    </div>
  );
}
