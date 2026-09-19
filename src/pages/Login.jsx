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
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-brand-200">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900">Sign In to BookSwap</h2>
          <p className="text-xs text-slate-500">
            Access your reader dashboard, listings, and exchange requests.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2.5">
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
            <Button type="submit" variant="primary" className="w-full" isLoading={submitting}>
              Sign In
            </Button>
          </div>
        </form>

        {/* Demo Credentials Helper Box */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <KeyRound className="w-3.5 h-3.5 text-brand-600" />
            <span>Seed Test Accounts (Password: Password123!)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <button
              onClick={() => {
                setEmail('ana@bookswap.test');
                setPassword('Password123!');
              }}
              className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-100 text-left"
            >
              <p className="font-bold text-slate-800">Reader</p>
              <p className="text-slate-500 truncate">ana@bookswap.test</p>
            </button>
            <button
              onClick={() => {
                setEmail('moderator@bookswap.test');
                setPassword('Password123!');
              }}
              className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-100 text-left"
            >
              <p className="font-bold text-indigo-700">Staff</p>
              <p className="text-slate-500 truncate">moderator@...</p>
            </button>
            <button
              onClick={() => {
                setEmail('admin@bookswap.test');
                setPassword('Password123!');
              }}
              className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-100 text-left"
            >
              <p className="font-bold text-purple-700">Admin</p>
              <p className="text-slate-500 truncate">admin@...</p>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            Register Here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
