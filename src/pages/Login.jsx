import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import { BookOpen, AlertCircle, Mail, Lock, KeyRound } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.success && result.user) {
      const role = result.user.role;
      // Redirect to the page they were trying to visit, or the role-based dashboard
      const defaultPath = role === 'admin' ? '/admin' : role === 'staff' ? '/staff' : '/dashboard';
      navigate(from !== '/dashboard' ? from : defaultPath);
    } else {
      setError(result.message || 'Invalid email or password.');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-start justify-center pt-6 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-[#faf6ee] p-8 rounded-none border border-amber-900/20 shadow-xl text-stone-900">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-none bg-emerald-800 text-amber-50 flex items-center justify-center mx-auto shadow-md">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-stone-900">Sign In to BookSwap</h2>
          <p className="text-xs text-stone-600">
            Access your reader dashboard, listings, and exchange requests.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-none flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Authentication Error</p>
              <p className="text-rose-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Email Address"
            type="email"
            placeholder="e.g. ana@bookswap.test"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <FormInput
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-700 text-amber-50 font-semibold text-sm rounded-none shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </form>

        {/* Demo Credentials Helper Box */}
        <div className="bg-amber-900/5 p-4 rounded-none border border-amber-900/15 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-stone-700">
            <KeyRound className="w-3.5 h-3.5 text-emerald-800" />
            <span>Seed Test Accounts (Password: Password123!)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <button
              onClick={() => {
                setEmail('ana@bookswap.test');
                setPassword('Password123!');
              }}
              className="p-1.5 bg-white border border-stone-300 rounded-none hover:bg-stone-50 text-left"
            >
              <p className="font-bold text-stone-800">Reader</p>
              <p className="text-stone-500 truncate">ana@bookswap.test</p>
            </button>
            <button
              onClick={() => {
                setEmail('moderator@bookswap.test');
                setPassword('Password123!');
              }}
              className="p-1.5 bg-white border border-stone-300 rounded-none hover:bg-stone-50 text-left"
            >
              <p className="font-bold text-indigo-700">Staff</p>
              <p className="text-stone-500 truncate">moderator@...</p>
            </button>
            <button
              onClick={() => {
                setEmail('admin@bookswap.test');
                setPassword('Password123!');
              }}
              className="p-1.5 bg-white border border-stone-300 rounded-none hover:bg-stone-50 text-left"
            >
              <p className="font-bold text-purple-700">Admin</p>
              <p className="text-stone-500 truncate">admin@...</p>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-stone-600">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-semibold text-emerald-800 hover:text-emerald-700 underline">
            Register Here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
