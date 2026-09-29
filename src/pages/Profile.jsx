import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService, categoryService } from '../services/api';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { User, MapPin, Phone, Mail, Award, CheckCircle, Heart, AlertCircle } from 'lucide-react';

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
        favorite_genres: user.favorite_genres || '',
      });
      if (user.favorite_genres) {
        setSelectedGenres(user.favorite_genres.split(',').map((id) => parseInt(id.trim())));
      }
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
    setSubmitting(true);

    try {
      const res = await userService.updateProfile({
        name: formData.name,
        phone: formData.phone || null,
        city: formData.city || null,
        favorite_genres: selectedGenres.join(','),
      });

      if (res.success) {
        setMessage('Profile updated successfully!');
        await refreshProfile();
      } else {
        setError(res.message || 'Failed to update profile.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while updating profile.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Loading profile settings..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/90 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-800 text-amber-50 font-bold text-2xl flex items-center justify-center shadow-md">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-serif font-bold text-stone-900">{user?.name}</h1>
              <StatusBadge status={user?.status} />
            </div>
            <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5" />
              {user?.email}
            </p>
          </div>
        </div>

        {/* Completed Swaps Reliability Indicator */}
        <div className="bg-emerald-900/10 border border-emerald-900/20 p-3.5 rounded-2xl flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-800 text-amber-50 flex items-center justify-center shadow-sm">
            <Award className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-900">Reliability Indicator</p>
            <p className="text-sm font-extrabold text-emerald-800">
              {user?.exchange_count ?? 0} Completed Swaps
            </p>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Full Name"
              icon={User}
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />

            <FormInput
              label="Contact Phone Number"
              icon={Phone}
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              helperText="Shared with counterparty after swap acceptance"
            />
          </div>

          <FormInput
            label="City / Location"
            icon={MapPin}
            value={formData.city}
            onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
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
