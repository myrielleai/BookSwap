import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listingService, categoryService } from '../services/api';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import BookCard from '../components/BookCard';
import { LoadingState, ErrorMessage, EmptyState } from '../components/LoadingState';
import { BookOpen, Sparkles } from 'lucide-react';

const BrowseBooks = () => {
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [genres, setGenres] = useState([]);
  const [ageCategories, setAgeCategories] = useState([]);
  const [conditions, setConditions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    keyword: '',
    genre_id: '',
    age_category_id: '',
    condition_id: '',
    sort: 'created_at_desc',
    page: 1,
    per_page: 12,
  });

  const [meta, setMeta] = useState({ page: 1, per_page: 12, total: 0, total_pages: 1 });

  // Load Taxonomies once
  useEffect(() => {
    Promise.all([
      categoryService.getGenres(),
      categoryService.getAgeCategories(),
      categoryService.getConditions(),
    ])
      .then(([genresRes, ageRes, condRes]) => {
        if (genresRes.success) setGenres(genresRes.data.genres || genresRes.data || []);
        if (ageRes.success) setAgeCategories(ageRes.data.age_categories || ageRes.data || []);
        if (condRes.success) setConditions(condRes.data.conditions || condRes.data || []);
      })
      .catch((err) => console.error('Failed loading taxonomies:', err));
  }, []);

  // Fetch listings on filter change
  const fetchListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listingService.getListings(filters);
      if (res.success && res.data) {
        setListings(res.data.listings || res.data || []);
        if (res.meta) {
          setMeta(res.meta);
        } else {
          setMeta({ page: 1, per_page: 12, total: res.data.length, total_pages: 1 });
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve catalog listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [filters]);

  const handleSearch = (keyword) => {
    setFilters((prev) => ({ ...prev, keyword, page: 1 }));
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      keyword: '',
      genre_id: '',
      age_category_id: '',
      condition_id: '',
      sort: 'created_at_desc',
      page: 1,
      per_page: 12,
    });
  };

  const handleQuickSwap = (listing) => {
    navigate(`/listings/${listing.id}`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Verified Catalog
            </div>
            <h1 className="text-3xl font-serif font-bold text-slate-900">Browse Available Books</h1>
            <p className="text-xs text-slate-500 mt-1">
              Find verified books offered by community readers across all genres
            </p>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{meta.total}</span> active listings
          </div>
        </div>

        {/* Search Bar */}
        <SearchBar onSearch={handleSearch} initialValue={filters.keyword} />
      </div>

      {/* Filter Controls */}
      <FilterPanel
        genres={genres}
        ageCategories={ageCategories}
        conditions={conditions}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Listings Grid / State Displays */}
      {loading ? (
        <LoadingState message="Searching verified catalog..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchListings} />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No verified listings found"
          description="We couldn't find any active listings matching your current search or filter criteria."
          action={
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-brand-600 text-white font-semibold text-xs rounded-xl shadow-sm hover:bg-brand-700 transition-colors"
            >
              Reset Search Filters
            </button>
          }
        />
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((item) => (
              <BookCard key={item.id} listing={item} onQuickSwap={handleQuickSwap} />
            ))}
          </div>

          {/* Pagination Controls */}
          {meta.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:pointer-events-none"
              >
                &larr; Previous
              </button>

              <span className="text-xs font-medium text-slate-600 px-3">
                Page {meta.page} of {meta.total_pages}
              </span>

              <button
                disabled={filters.page >= meta.total_pages}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:pointer-events-none"
              >
                Next &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BrowseBooks;
