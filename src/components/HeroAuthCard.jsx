import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  LogOut,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import {
  validateFullName,
  validateEmailAddress,
  validateNewPassword,
  onlyErrors,
} from '../utils/validation';
import TurnstileWidget from './TurnstileWidget';

export const HeroAuthCard = () => {
  const { user, login, logout, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Handle Login submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    const result = await login(email, password, turnstileToken);
    setSubmitting(false);

    if (result.success && result.user) {
      const role = result.user.role;
      const defaultPath = role === 'admin' ? '/admin' : role === 'staff' ? '/staff' : '/dashboard';
      navigate(defaultPath);
    } else {
      setError(result.message || 'Invalid email or password.');
    }
  };

  // Handle Register submission
  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Client-side validation (the backend repeats every check). This card has
    // one message area, so the first problem is shown.
    const newErrors = onlyErrors({
      name: validateFullName(name),
      email: validateEmailAddress(email),
      password: validateNewPassword(password),
      confirm_password: !confirmPassword
        ? 'Please confirm your password.'
        : password !== confirmPassword
        ? 'Passwords do not match.'
        : null,
    });
    if (Object.keys(newErrors).length > 0) {
      setError(Object.values(newErrors)[0]);
      return;
    }

    setSubmitting(true);
    const result = await register({
      name: name.trim(),
      email: email.trim(),
      password,
      confirm_password: confirmPassword,
      turnstile_token: turnstileToken,
    });
    setSubmitting(false);

    if (result.success) {
      setSuccessMsg('Registration submitted! Pending administrator verification before sign in.');
      setMode('login');
      setPassword('');
      setConfirmPassword('');
    } else if (result.errors) {
      setError(Object.values(result.errors)[0]);
    } else {
      setError(result.message || 'Registration failed.');
    }
  };

  // Quick seed loader
  const fillSeedAccount = (seedEmail) => {
    setEmail(seedEmail);
    setPassword('Password123!');
    setMode('login');
  };

  // If user is already logged in, display Welcome Hero Card
  if (user) {
    const dashboardPath = user.role === 'admin' ? '/admin' : user.role === 'staff' ? '/staff' : '/dashboard';

    return (
      <div className="leather-tan stitched rounded-2xl p-3 sm:p-4 shadow-[0_18px_40px_-16px_rgba(70,40,15,0.55)]">
        <div className="paper relative z-[2] rounded-xl p-6 sm:p-7 space-y-6 text-stone-900 text-left">
          <div className="flex items-center gap-4">
            <div className="leather-caramel stitched stitched-sm w-14 h-14 rounded-xl emboss-light flex items-center justify-center font-display font-extrabold text-2xl shadow-md shrink-0">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="space-y-1">
              <span className="well inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase text-leather-700">
                <CheckCircle2 className="w-3 h-3 text-leather-600" />
                Logged In
              </span>
              <h3 className="text-xl font-display font-extrabold text-stone-900 leading-snug">{user.name}</h3>
              <p className="text-xs text-stone-600 truncate max-w-[200px] sm:max-w-[260px]">{user.email}</p>
            </div>
          </div>

          <div className="field-group text-xs">
            <div className="flex justify-between items-center px-4 py-3 text-stone-600">
              <span className="font-semibold text-stone-700">Account Role</span>
              <span className="font-semibold text-leather-700 capitalize">{user.role || 'Reader'}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 text-stone-600">
              <span className="font-semibold text-stone-700">Verification Status</span>
              <span className="font-semibold text-stone-900 capitalize">{user.status || 'Active'}</span>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <button
              onClick={() => navigate(dashboardPath)}
              className="btn-moss w-full py-3 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 group"
            >
              <span>Go to My Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={logout}
              className="btn-pillow w-full py-2.5 px-4 font-semibold text-xs rounded-xl flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fieldRow = 'flex items-center gap-3 px-4 py-3 cursor-text';
  const fieldLabel = 'w-[92px] shrink-0 text-xs font-bold text-stone-800';
  const fieldInput = 'flex-1 min-w-0 text-sm text-stone-900 placeholder-stone-400';

  return (
    <div className="leather-tan stitched rounded-2xl p-3 sm:p-4 shadow-[0_18px_40px_-16px_rgba(70,40,15,0.55)]">
      {/* Embossed folio label */}
      <div className="relative z-[2] flex items-center justify-center gap-2 pt-1 pb-3">
        <BookOpen className="w-4 h-4 text-leather-800/70" />
        <span className="deboss font-display font-extrabold tracking-wide text-sm">Reader's Pass</span>
      </div>

      {/* Paper sheet tucked into the leather folio */}
      <div className="paper relative z-[2] rounded-xl p-5 sm:p-6 text-left text-stone-900 space-y-5">
        {/* Mode Switch Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-display font-extrabold text-stone-900 emboss">
              {mode === 'login' ? 'Sign In to BookSwap' : 'Create Reader Account'}
            </h3>
            <p className="text-xs text-stone-600 mt-0.5">
              {mode === 'login'
                ? 'Welcome back! Exchange physical books with verified readers.'
                : 'Join your local peer-to-peer book swapping community.'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="segmented shrink-0">
            <button
              type="button"
              aria-pressed={mode === 'login'}
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className="px-3 py-1.5 text-xs font-bold transition-all"
            >
              Sign In
            </button>
            <button
              type="button"
              aria-pressed={mode === 'register'}
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className="px-3 py-1.5 text-xs font-bold transition-all"
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Success Notification */}
        {successMsg && (
          <div className="well p-3.5 text-leather-800 text-xs rounded-xl flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-leather-600 shrink-0 mt-0.5" />
            <p>{successMsg}</p>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2.5 shadow-inner">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* EMAIL FORM */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="field-group">
              <label className={fieldRow}>
                <span className={fieldLabel}>Email</span>
                <input
                  type="email"
                  placeholder="e.g. ana@bookswap.test"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={fieldInput}
                />
              </label>
              <label className={fieldRow}>
                <span className={fieldLabel}>Password</span>
                <input
                  type="password"
                  placeholder="Required"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={fieldInput}
                />
              </label>
            </div>

            {/* Cloudflare Turnstile Human Verification */}
            <TurnstileWidget
              onVerify={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken(null)}
            />

            <button
              type="submit"
              disabled={submitting}
              className="btn-moss w-full py-3 px-4 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2"
            >
              {submitting ? 'Signing In...' : 'Sign In with Email'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4" noValidate>
            <div className="field-group">
              <label className={fieldRow}>
                <span className={fieldLabel}>Full Name</span>
                <input
                  type="text"
                  placeholder="e.g. Ana Reader"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={fieldInput}
                />
              </label>
              <label className={fieldRow}>
                <span className={fieldLabel}>Email</span>
                <input
                  type="email"
                  placeholder="reader@bookswap.test"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={fieldInput}
                />
              </label>
              <label className={fieldRow}>
                <span className={fieldLabel}>Password</span>
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={fieldInput}
                />
              </label>
              <label className={fieldRow}>
                <span className={fieldLabel}>Confirm</span>
                <input
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={fieldInput}
                />
              </label>
            </div>
            <p className="text-[10px] text-stone-500 -mt-2 px-1">
              Password verified against data breaches via HaveIBeenPwned API (k-Anonymity)
            </p>

            {/* Cloudflare Turnstile Human Verification */}
            <TurnstileWidget
              onVerify={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken(null)}
            />

            <button
              type="submit"
              disabled={submitting}
              className="btn-moss w-full py-3 px-4 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2"
            >
              {submitting ? 'Creating Account...' : 'Sign Up with Email'}
            </button>
          </form>
        )}

        {/* SIGN UP WITH EMAIL / SIGN IN SWITCHER BUTTON */}
        <div className="text-center">
          {mode === 'login' ? (
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className="text-xs text-stone-600 hover:text-leather-700 font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Don't have an account?</span>
              <span className="text-leather-700 font-semibold underline underline-offset-2">
                Sign up with email
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className="text-xs text-stone-600 hover:text-leather-700 font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Already have an account?</span>
              <span className="text-leather-700 font-semibold underline underline-offset-2">
                Sign in with email
              </span>
            </button>
          )}
        </div>

        {/* QUICK SEED PREFILL HELPERS */}
        <div className="well p-3 rounded-xl text-left space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600">
            <span className="flex items-center gap-1 text-leather-700">
              <KeyRound className="w-3 h-3" /> Demo Quick Fill
            </span>
            <span className="text-[10px] text-stone-500">(Password: Password123!)</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => fillSeedAccount('ana@bookswap.test')}
              className="btn-pillow p-1.5 rounded-lg text-left"
            >
              <p className="font-bold text-stone-800">Reader</p>
              <p className="text-[9px] text-stone-500 truncate">ana@...</p>
            </button>
            <button
              type="button"
              onClick={() => fillSeedAccount('moderator@bookswap.test')}
              className="btn-pillow p-1.5 rounded-lg text-left"
            >
              <p className="font-bold text-indigo-700">Staff</p>
              <p className="text-[9px] text-stone-500 truncate">moderator@...</p>
            </button>
            <button
              type="button"
              onClick={() => fillSeedAccount('admin@bookswap.test')}
              className="btn-pillow p-1.5 rounded-lg text-left"
            >
              <p className="font-bold text-purple-700">Admin</p>
              <p className="text-[9px] text-stone-500 truncate">admin@...</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroAuthCard;
