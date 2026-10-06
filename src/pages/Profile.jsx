import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService, categoryService } from '../services/api';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { User, MapPin, Phone, Mail, Award, CheckCircle, Heart, AlertCircle } from 'lucide-react';
import { validateFullName, validatePhoneNumber, validateCity, onlyErrors } from '../utils/validation';

// The API returns favorite_genres as a list of IDs; older data may be a CSV string.
const toGenreIds = (value) =>
  (Array.isArray(value) ? value : String(value || '').split(','))
    .map((id) => parseInt(id, 10))
    .filter((id) => id > 0);

const Profile = () => {
  const { user, refreshProfile } = useAuth();
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    favorite_genres: '',
  });

  const [selectedGenres, setSelectedGenres] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    categoryService
      .getGenres()
      .then((res) => {
        if (res.success) setGenres(res.data.genres || res.data || []);
      })
      .catch((err) => console.error('Genres error:', err))
      .finally(() => setLoading(false));

    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        city: user.city || '',
        favorite_genres: toGenreIds(user.favorite_genres).join(','),
      });
      setSelectedGenres(toGenreIds(user.favorite_genres));
    }
  }, [user]);

  const handleGenreToggle = (genreId) => {
    let updated;
    if (selectedGenres.includes(genreId)) {
      updated = selectedGenres.filter((id) => id !== genreId);
    } else {
      updated = [...selectedGenres, genreId];
    }
    setSelectedGenres(updated);
    setFormData((prev) => ({ ...prev, favorite_genres: updated.join(',') }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    // Client-side validation (the backend repeats every check).
    const newErrors = onlyErrors({
      name: validateFullName(formData.name),
      phone: validatePhoneNumber(formData.phone),
      city: validateCity(formData.city),
    });
    setFieldErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setError('Please correct the highlighted fields.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await userService.updateProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        city: formData.city.trim() || null,
        favorite_genres: selectedGenres,
      });

      if (res.success) {
        setMessage('Profile updated successfully!');
        await refreshProfile();
      } else {
        setError(res.message || 'Failed to update profile.');
      }
    } catch (err) {
      if (err.errors) {
        setFieldErrors(err.errors);
        setError(err.errors.favorite_genres || 'Please correct the highlighted fields.');
      } else {
        setError(err.message || 'An error occurred while updating profile.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Loading profile settings..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header Banner — the reader's pass */}
      <div className="leather-tan stitched rounded-xl px-6 py-6 sm:px-8 shadow-[0_18px_40px_-16px_rgba(70,40,15,0.55)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6" style={{ '--stitch-radius': '8px' }}>
        <div className="relative z-[2] flex items-center gap-5">
          {/* Profile photo placeholder */}
          <div className="well w-20 h-20 rounded-full overflow-hidden ring-4 ring-leather-300/70 shadow-[0_4px_10px_-2px_rgba(70,40,15,0.45)] flex items-end justify-center shrink-0" aria-hidden="true">
            <svg viewBox="0 0 32 32" className="w-[70px] h-[70px] text-leather-300">
              <circle cx="16" cy="12.5" r="6" fill="currentColor" />
              <path d="M4 32c0-7 5.4-11.5 12-11.5S28 25 28 32z" fill="currentColor" />
            </svg>
          </div>
          <div>
            <span className="font-hand text-xl text-moss-800">reader's pass</span>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-display font-extrabold emboss-light leading-tight">{user?.name}</h1>
              <StatusBadge status={user?.status} />
            </div>
            <p className="text-xs font-semibold deboss flex items-center gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5" />
              {user?.email}
            </p>
          </div>
        </div>

        {/* Completed Swaps Reliability Indicator — green leather medallion */}
        <div className="relative z-[2] flex items-center gap-3 shrink-0">
          <div className="btn-moss w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center shadow-md">
            <Award className="w-4 h-4 text-moss-100" />
            <span className="font-display font-extrabold text-2xl leading-none">{user?.exchange_count ?? 0}</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] deboss">Reliability</p>
            <p className="font-display font-extrabold text-base text-leather-900 leading-tight">Completed<br />Swaps</p>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/90 shadow-md">
        <h2 className="text-lg font-bold text-stone-800 pb-4 border-b border-stone-100 mb-6">
          Account & Handover Coordination Profile
        </h2>

        {message && (
          <div className="p-3 mb-6 bg-emerald-900/10 border border-emerald-900/20 text-emerald-900 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-700" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-3 mb-6 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Full Name"
              icon={User}
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              error={fieldErrors.name}
              required
            />

            <FormInput
              label="Contact Phone Number"
              icon={Phone}
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              error={fieldErrors.phone}
              helperText="Shared with counterparty after swap acceptance"
            />
          </div>

          <FormInput
            label="City / Location"
            icon={MapPin}
            value={formData.city}
            onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
            error={fieldErrors.city}
            helperText="Used for meetup venue recommendations"
          />

          {/* Favorite Reading Genres Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-stone-700 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Favorite Reading Genres</span>
            </label>
            <p className="text-xs text-stone-500 mb-2">
              Select your favorite genres to receive personalized catalog sorting and recommendations.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {genres.map((g) => {
                const isSelected = selectedGenres.includes(g.id);
                return (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => handleGenreToggle(g.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-emerald-800 text-amber-50 border-emerald-800 shadow-sm'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 flex justify-end">
            <Button type="submit" variant="primary" isLoading={submitting}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
