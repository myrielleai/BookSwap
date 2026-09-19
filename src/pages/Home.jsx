import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listingService } from '../services/api';
import BookCard from '../components/BookCard';
import { LoadingState } from '../components/LoadingState';
import {
  BookOpen,
  ArrowRightLeft,
  ShieldCheck,
  Users,
  Sparkles,
  Search,
  CheckCircle2,
  TrendingUp,
  Heart,
} from 'lucide-react';

const Home = () => {
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listingService
      .getListings({ per_page: 6, sort: 'created_at_desc' })
      .then((res) => {
        if (res.success && res.data) {
          const list = res.data.listings || res.data || [];
          setFeaturedBooks(list.slice(0, 6));
        }
      })
      .catch((err) => console.error('Failed to load featured books:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Banner Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white py-20 px-4 sm:px-6 lg:px-8 rounded-3xl shadow-xl mt-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-600/20 via-transparent to-transparent"></div>
        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-4 h-4" />
            <span>Centralized Peer-to-Peer Book Exchange Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-serif font-bold tracking-tight leading-tight">
            Exchange Books with Nearby <span className="text-brand-400">Bookworms</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Discover verified books from local readers, propose 1-to-1 swaps, and meet safely at supervised community handover locations. Zero costs, endless reading.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/browse"
              className="w-full sm:w-auto px-7 py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-600/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Browse Available Books
            </Link>
            <Link
              to="/register"
              className="w-full sm:w-auto px-7 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl backdrop-blur-md border border-white/20 transition-all flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Join BookSwap
            </Link>
          </div>
        </div>
      </section>

      {/* Core Platform Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
            How BookSwap Works
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            A simple, safe, and community-moderated peer-to-peer exchange process.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative group hover:border-brand-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-2">1. List Your Verified Copy</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Post books you have already read. Upload actual photos, set physical condition grades, and state your preferred return genres.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative group hover:border-brand-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-110 transition-transform">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-2">2. Propose a 1-to-1 Swap</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Browse verified catalog offerings. Send a swap proposal offering one of your verified books. Owners retain full accept/decline rights.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative group hover:border-brand-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-2">3. Supervised Handover</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Exchange Moderators assign official meetup venues and time slots. Meet safely, inspect condition, confirm receipt, and update your library.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Books Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-serif font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-brand-600" />
              Recently Verified Books
            </h2>
            <p className="text-xs text-slate-500 mt-1">Explore latest verified catalog additions ready for exchange</p>
          </div>
          <Link
            to="/browse"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            View All Catalog &rarr;
          </Link>
        </div>

        {loading ? (
          <LoadingState message="Loading latest verified listings..." />
        ) : featuredBooks.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
            No public listings available right now. Be the first to list a book!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {featuredBooks.map((book) => (
              <BookCard key={book.id} listing={book} />
            ))}
          </div>
        )}
      </section>

      {/* Community Callout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-book-900 to-book-700 rounded-3xl p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="space-y-3 text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-serif font-bold">
              Ready to Swap Your First Book?
            </h3>
            <p className="text-sm text-book-100 max-w-xl">
              Registration is quick. All new reader accounts undergo administrator identity verification to keep the community safe and scam-free.
            </p>
          </div>
          <Link
            to="/register"
            className="px-8 py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl shadow-lg transition-all hover:scale-105 shrink-0"
          >
            Create Reader Account
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
