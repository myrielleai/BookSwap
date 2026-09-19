import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listingService, categoryService } from '../services/api';
import FormInput from '../components/FormInput';
import Dropdown from '../components/Dropdown';
import Button from '../components/Button';
import { LoadingState } from '../components/LoadingState';
import { BookOpen, Upload, Image as ImageIcon, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

const AddListing = () => {
  const navigate = useNavigate();

  const [genres, setGenres] = useState([]);
  const [formats, setFormats] = useState([]);
  const [ageCategories, setAgeCategories] = useState([]);
  const [conditions, setConditions] = useState([]);

  const [loadingTaxonomies, setLoadingTaxonomies] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    edition: '',
    publisher: '',
    genre_id: '',
    format_id: '',
    age_category_id: '',
    condition_id: '',
    preferred_return: '',
    is_open_offer: 0,
  });

  // Photo state & preview
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    Promise.all([
      categoryService.getGenres(),
      categoryService.getFormats(),
      categoryService.getAgeCategories(),
      categoryService.getConditions(),
    ])
      .then(([gRes, fRes, aRes, cRes]) => {
        if (gRes.success) setGenres(gRes.data.genres || gRes.data || []);
        if (fRes.success) setFormats(fRes.data.formats || fRes.data || []);
        if (aRes.success) setAgeCategories(aRes.data.age_categories || aRes.data || []);
        if (cRes.success) setConditions(cRes.data.conditions || cRes.data || []);
      })
      .catch((err) => console.error('Taxonomies error:', err))
      .finally(() => setLoadingTaxonomies(false));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value,
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.title || !formData.author || !formData.genre_id || !formData.condition_id) {
      setError('Please fill in all required fields (Title, Author, Genre, Condition).');
      return;
    }

    if (!photoFile) {
      setError('At least one photograph of the actual book copy is required.');
      return;
    }

    setSubmitting(true);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('author', formData.author);
      data.append('genre_id', formData.genre_id);
      data.append('condition_id', formData.condition_id);
      if (formData.edition) data.append('edition', formData.edition);
      if (formData.publisher) data.append('publisher', formData.publisher);
      if (formData.format_id) data.append('format_id', formData.format_id);
      if (formData.age_category_id) data.append('age_category_id', formData.age_category_id);
      if (formData.preferred_return) data.append('preferred_return', formData.preferred_return);
      data.append('is_open_offer', formData.is_open_offer);
      data.append('photo', photoFile);

      const res = await listingService.createListing(data);

      if (res.success) {
        setSuccessMsg(true);
        setTimeout(() => {
          navigate('/dashboard?tab=listings');
        }, 2000);
      } else {
        setError(res.message || 'Failed to submit listing.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while submitting the listing.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTaxonomies) return <LoadingState message="Loading form taxonomy options..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md">
        <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-900">List a Book for Exchange</h1>
            <p className="text-xs text-slate-500">
              Submit details and actual photographs of a book you wish to offer.
            </p>
          </div>
        </div>

        {successMsg ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Book Listing Submitted!</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Your listing has been saved with status <span className="font-bold text-amber-700">unverified</span>. An Exchange Moderator will review its photo and condition before publishing it to the public catalog.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 pt-6">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Book Core Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                label="Book Title"
                name="title"
                placeholder="e.g. The Hobbit"
                value={formData.title}
                onChange={handleChange}
                required
              />

              <FormInput
                label="Author"
                name="author"
                placeholder="e.g. J.R.R. Tolkien"
                value={formData.author}
                onChange={handleChange}
                required
              />

              <FormInput
                label="Edition (Optional)"
                name="edition"
                placeholder="e.g. 75th Anniversary Edition"
                value={formData.edition}
                onChange={handleChange}
              />

              <FormInput
                label="Publisher (Optional)"
                name="publisher"
                placeholder="e.g. HarperCollins"
                value={formData.publisher}
                onChange={handleChange}
              />
            </div>

            {/* Categorization & Taxonomy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Dropdown
                label="Genre"
                name="genre_id"
                options={genres}
                value={formData.genre_id}
                onChange={handleChange}
                required
              />

              <Dropdown
                label="Format"
                name="format_id"
                options={formats}
                value={formData.format_id}
                onChange={handleChange}
              />

              <Dropdown
                label="Age Category"
                name="age_category_id"
                options={ageCategories}
                value={formData.age_category_id}
                onChange={handleChange}
              />

              <Dropdown
                label="Condition Grade"
                name="condition_id"
                options={conditions.map((c) => ({ id: c.id, name: `${c.label}` }))}
                value={formData.condition_id}
                onChange={handleChange}
                required
              />
            </div>

            {/* Swap Return Preferences */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <FormInput
                label="Preferred Return / Desired Swap Book or Genre"
                name="preferred_return"
                placeholder="e.g. Sci-fi novels, Dune, or any fantasy classic"
                value={formData.preferred_return}
                onChange={handleChange}
                helperText="Specify what you'd love to read next in return"
              />

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  name="is_open_offer"
                  checked={formData.is_open_offer === 1}
                  onChange={handleChange}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                  Mark as Open to Any Offer
                </span>
              </label>
            </div>

            {/* Photograph Upload & Interactive Preview */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Photograph of Actual Copy <span className="text-rose-500">*</span>
              </label>

              <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
                {photoPreview ? (
                  <div className="space-y-3">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="max-h-56 mx-auto rounded-xl shadow-md border border-slate-200 object-contain"
                    />
                    <label className="cursor-pointer text-xs font-semibold text-brand-600 hover:text-brand-700 inline-block">
                      Change Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2 py-4">
                    <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">
                        Click to upload book cover photo
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        PNG, JPG, or WEBP up to 5MB
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => navigate('/browse')}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={submitting}>
                Submit Book Listing
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddListing;
