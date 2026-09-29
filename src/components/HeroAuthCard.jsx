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

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const HeroAuthCard = () => {
  const { user, login, logout, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    const result = await login(email, password);
    setSubmitting(false);

    if (result.success && result.user) {
      const role = result.user.role;
      const defaultPath = role === 'admin' ? '/admin' : role === 'staff' ? '/staff' : '/dashboard';
      navigate(defaultPath);
    } else {
      setError(result.message || 'Invalid email or password.');
    }
  };

  // Handle Google Auth Simulation
  const handleGoogleAuth = async () => {
    setError(null);
    setSubmitting(true);
    // Simulate Google SSO by logging in as test reader account or demo session
    const result = await login('ana@bookswap.test', 'Password123!');
    setSubmitting(false);

    if (result.success && result.user) {
      navigate('/dashboard');
    } else {
      setError('Google Sign-In failed. Please try again.');
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
      <div className="w-full bg-[#faf6ee] border border-amber-900/20 rounded-none p-6 sm:p-8 shadow-xl space-y-6 text-stone-900 text-left relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-none bg-emerald-800 text-amber-50 flex items-center justify-center font-bold text-xl shadow-md shrink-0">
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none text-[10px] font-bold tracking-wider uppercase bg-emerald-900/10 text-emerald-900 border border-emerald-900/20">
              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
              Logged In
            </span>
            <h3 className="text-xl font-bold text-stone-900 leading-snug">{user.name}</h3>
            <p className="text-xs text-stone-600 truncate max-w-[200px] sm:max-w-[260px]">{user.email}</p>
          </div>
        </div>

        <div className="p-4 bg-amber-900/5 rounded-none border border-amber-900/15 space-y-2 text-xs">
          <div className="flex justify-between items-center text-stone-600">
            <span>Account Role</span>
            <span className="font-semibold text-emerald-800 capitalize">{user.role || 'Reader'}</span>
          </div>
          <div className="flex justify-between items-center text-stone-600">
            <span>Verification Status</span>
            <span className="font-semibold text-stone-900 capitalize">{user.status || 'Active'}</span>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <button
            onClick={() => navigate(dashboardPath)}
            className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-700 text-amber-50 font-semibold text-sm rounded-none shadow-md transition-all flex items-center justify-center gap-2 group"
          >
            <span>Go to My Dashboard</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={logout}
            className="w-full py-2.5 px-4 bg-stone-200/80 hover:bg-stone-300/80 text-stone-800 font-medium text-xs rounded-none border border-stone-300 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#faf6ee] border border-amber-900/20 rounded-none p-6 sm:p-8 shadow-xl text-left relative overflow-hidden text-stone-900 space-y-5">
      {/* Background Subtle Accent */}
      <div className="absolute -top-10 -right-10 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Mode Switch Header */}
      <div className="flex items-center justify-between border-b border-amber-900/15 pb-4">
        <div>
          <h3 className="text-xl font-serif font-bold text-stone-900">
            {mode === 'login' ? 'Sign In to BookSwap' : 'Create Reader Account'}
          </h3>
          <p className="text-xs text-stone-600 mt-0.5">
            {mode === 'login'
              ? 'Welcome back! Exchange physical books with verified readers.'
              : 'Join your local peer-to-peer book swapping community.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-stone-200/70 p-1 rounded-none border border-stone-300 flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-none transition-all ${
              mode === 'login'
                ? 'bg-emerald-800 text-amber-50 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-none transition-all ${
              mode === 'register'
                ? 'bg-emerald-800 text-amber-50 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Sign Up
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-900/10 border border-emerald-900/20 text-emerald-900 text-xs rounded-none flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p>{successMsg}</p>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-none flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* 1. CONTINUE WITH GOOGLE BUTTON */}
      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={submitting}
        className="w-full py-3 px-4 bg-white hover:bg-stone-50 text-stone-800 font-semibold text-xs sm:text-sm rounded-none shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 border border-stone-300 active:scale-[0.99] disabled:opacity-50"
      >
        <GoogleIcon />
        <span>Continue with Google</span>
      </button>

      {/* 2. OR DIVIDER */}
      <div className="relative flex items-center justify-center my-2">
        <div className="border-t border-amber-900/15 w-full" />
        <span className="bg-[#faf6ee] px-3 text-[10px] font-bold tracking-wider text-stone-500 uppercase shrink-0">
          Or {mode === 'login' ? 'sign in' : 'sign up'} with email
        </span>
        <div className="border-t border-amber-900/15 w-full" />
      </div>

      {/* 3. EMAIL FORM */}
      {mode === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-800" />
              Email Address
            </label>
            <input
              type="email"
              placeholder="e.g. ana@bookswap.test"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-none text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-800" />
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-none text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-700 text-amber-50 font-semibold text-xs sm:text-sm rounded-none shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {submitting ? 'Signing In...' : 'Sign In with Email'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-3.5" noValidate>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-800" />
              Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Ana Reader"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-none text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-800" />
              Email Address
            </label>
            <input
              type="email"
              placeholder="reader@bookswap.test"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-none text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-800" />
              Password
            </label>
            <input
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-none text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-800" />
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-none text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-700 text-amber-50 font-semibold text-xs sm:text-sm rounded-none shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {submitting ? 'Creating Account...' : 'Sign Up with Email'}
          </button>
        </form>
      )}

      {/* SIGN UP WITH EMAIL / SIGN IN SWITCHER BUTTON */}
      <div className="text-center pt-1 border-t border-amber-900/15">
        {mode === 'login' ? (
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className="text-xs text-stone-600 hover:text-emerald-800 font-medium inline-flex items-center gap-1.5 transition-colors"
          >
            <span>Don't have an account?</span>
            <span className="text-emerald-800 font-semibold underline underline-offset-2">
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
            className="text-xs text-stone-600 hover:text-emerald-800 font-medium inline-flex items-center gap-1.5 transition-colors"
          >
            <span>Already have an account?</span>
            <span className="text-emerald-800 font-semibold underline underline-offset-2">
              Sign in with email
            </span>
          </button>
        )}
      </div>

      {/* QUICK SEED PREFILL HELPERS */}
      <div className="pt-2 bg-amber-900/5 p-3 rounded-none border border-amber-900/15 text-left space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600">
          <span className="flex items-center gap-1 text-emerald-800">
            <KeyRound className="w-3 h-3" /> Demo Quick Fill
          </span>
          <span className="text-[10px] text-stone-500">(Password: Password123!)</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={() => fillSeedAccount('ana@bookswap.test')}
            className="p-1.5 bg-white hover:bg-stone-50 border border-stone-300 rounded-none text-left transition-colors"
          >
            <p className="font-bold text-stone-800">Reader</p>
            <p className="text-[9px] text-stone-500 truncate">ana@...</p>
          </button>
          <button
            type="button"
            onClick={() => fillSeedAccount('moderator@bookswap.test')}
            className="p-1.5 bg-white hover:bg-stone-50 border border-stone-300 rounded-none text-left transition-colors"
          >
            <p className="font-bold text-indigo-700">Staff</p>
            <p className="text-[9px] text-stone-500 truncate">moderator@...</p>
          </button>
          <button
            type="button"
            onClick={() => fillSeedAccount('admin@bookswap.test')}
            className="p-1.5 bg-white hover:bg-stone-50 border border-stone-300 rounded-none text-left transition-colors"
          >
            <p className="font-bold text-purple-700">Admin</p>
            <p className="text-[9px] text-stone-500 truncate">admin@...</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroAuthCard;
