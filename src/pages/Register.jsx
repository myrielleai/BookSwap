import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import { BookOpen, CheckCircle, AlertCircle, Mail, Lock, Phone, User, MapPin, ShieldCheck } from 'lucide-react';
import TurnstileWidget from '../components/TurnstileWidget';
import {
  validateFullName,
  validateEmailAddress,
  validatePhoneNumber,
  validateCity,
  validateNewPassword,
  onlyErrors,
} from '../utils/validation';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    password: '',
    confirm_password: '',
  });

  const [turnstileToken, setTurnstileToken] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear the error for the changed field
    setErrors((prev) => ({ ...prev, [name]: null }));
    // If password changes, also clear the confirm_password mismatch error
    if (name === 'password') {
      setErrors((prev) => ({ ...prev, confirm_password: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Client-side validation (the backend repeats every check)
    const newErrors = onlyErrors({
      name: validateFullName(formData.name),
      email: validateEmailAddress(formData.email),
      phone: validatePhoneNumber(formData.phone),
      city: validateCity(formData.city),
      password: validateNewPassword(formData.password),
    });
    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Please confirm your password.';
    } else if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    const result = await register({
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || null,
      city: formData.city.trim() || null,
      password: formData.password,
      confirm_password: formData.confirm_password,
      turnstile_token: turnstileToken,
    });

    setSubmitting(false);

    if (result.success) {
      setRegisteredSuccess(true);
    } else {
      if (result.errors) {
        setErrors({ general: 'Please correct the highlighted fields.', ...result.errors });
      } else {
        setErrors({ general: result.message || 'Registration failed.' });
      }
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-[#faf6ee] p-8 rounded-none border border-amber-900/20 shadow-xl text-stone-900">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-none bg-emerald-800 text-amber-50 flex items-center justify-center mx-auto shadow-md">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-stone-900">Create Reader Account</h2>
          <p className="text-xs text-stone-600">
            Join BookSwap to list books and exchange with fellow bookworms.
          </p>
        </div>

        {registeredSuccess ? (
          <div className="space-y-6 text-center py-4">
            <div className="w-14 h-14 rounded-none bg-emerald-900/10 text-emerald-800 border border-emerald-900/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-stone-900">Registration Submitted!</h3>
              <p className="text-xs text-stone-700 leading-relaxed bg-amber-900/5 border border-amber-900/15 p-4 rounded-none text-left">
                <strong>Proposal Operating Rule:</strong> Your registration has been received and is currently <span className="text-amber-900 font-bold">Pending Administrator Approval</span>. Once verified by an Administrator, you will be able to sign in and post listings.
              </p>
            </div>
            <Button variant="primary" className="w-full" onClick={() => navigate('/login')}>
              Return to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {errors.general && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-none flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errors.general}</span>
              </div>
            )}

            <FormInput
              label="Full Name"
              name="name"
              placeholder="e.g. Myrielle Jerusalem"
              icon={User}
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
            />

            <FormInput
              label="Email Address"
              name="email"
              type="email"
              placeholder="reader@bookswap.test"
              icon={Mail}
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                label="Phone Number (Optional)"
                name="phone"
                placeholder="09170000000"
                icon={Phone}
                value={formData.phone}
                onChange={handleChange}
                error={errors.phone}
                helperText="Shared only after swap acceptance"
              />

              <FormInput
                label="City / Location"
                name="city"
                placeholder="e.g. Manila"
                icon={MapPin}
                value={formData.city}
                onChange={handleChange}
                error={errors.city}
              />
            </div>

            <FormInput
              label="Password"
              name="password"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              helperText="Verified against public data breaches via HaveIBeenPwned API (k-Anonymity)"
              required
            />

            <FormInput
              label="Confirm Password"
              name="confirm_password"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              value={formData.confirm_password}
              onChange={handleChange}
              error={errors.confirm_password}
              required
            />

            {/* Cloudflare Turnstile Human Verification */}
            <TurnstileWidget
              onVerify={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken(null)}
            />

            <div className="pt-1">
              <Button type="submit" variant="primary" className="w-full" isLoading={submitting}>
                Register Account
              </Button>
            </div>

            <p className="text-center text-xs text-stone-600 pt-2">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-emerald-800 hover:text-emerald-700 underline">
                Sign In
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default Register;
