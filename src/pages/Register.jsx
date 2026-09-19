import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import { BookOpen, CheckCircle, AlertCircle, Mail, Lock, Phone, User, MapPin } from 'lucide-react';

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

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Client-side validation
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required.';
    if (!formData.email.trim()) newErrors.email = 'Email address is required.';
    if (!formData.password) newErrors.password = 'Password is required.';
    if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters.';
    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    const result = await register({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
      city: formData.city || null,
      password: formData.password,
    });

    setSubmitting(false);

    if (result.success) {
      setRegisteredSuccess(true);
    } else {
      if (result.errors) {
        setErrors(result.errors);
      } else {
        setErrors({ general: result.message || 'Registration failed.' });
      }
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-brand-200">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900">Create Reader Account</h2>
          <p className="text-xs text-slate-500">
            Join BookSwap to list books and exchange with fellow bookworms.
          </p>
        </div>

        {registeredSuccess ? (
          <div className="space-y-6 text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-800">Registration Submitted!</h3>
              <p className="text-xs text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 p-4 rounded-xl text-left">
                <strong>Proposal Operating Rule:</strong> Your registration has been received and is currently <span className="text-amber-800 font-bold">Pending Administrator Approval</span>. Once verified by an Administrator, you will be able to sign in and post listings.
              </p>
            </div>
            <Button variant="primary" className="w-full" onClick={() => navigate('/login')}>
              Return to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
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

            <div className="pt-2">
              <Button type="submit" variant="primary" className="w-full" isLoading={submitting}>
                Register Account
              </Button>
            </div>

            <p className="text-center text-xs text-slate-500 pt-2">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
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
