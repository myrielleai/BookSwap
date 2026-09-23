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
  Search,
  CheckCircle2,
  TrendingUp,
  Heart,
} from 'lucide-react';

import FlipBookHero from '../components/FlipBookHero';

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
    <div className="pb-16 w-full">
      {/* Full-Width Hero Section centered around the interactive 3D flipping book */}
      <section className="w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-600/15 via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          {/* Minimal Headline */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight text-white">
              BookSwap
            </h1>
            <p className="text-sm sm:text-base text-slate-400 font-light max-w-md mx-auto">
              Pass the book. Start the story.
            </p>
          </div>

          {/* Centered 3D Flipping Book Showcase */}
          <div className="w-full py-2">
            <FlipBookHero />
          </div>

          {/* Minimal Quick Action Links */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <Link
              to="/browse"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all hover:scale-105 flex items-center gap-2"
            >
              <Search className="w-3.5 h-3.5" />
              Browse Books
            </Link>
            <Link
              to="/register"
              className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-xs rounded-xl backdrop-blur-md border border-white/15 transition-all flex items-center gap-2"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Join BookSwap
            </Link>
          </div>
        </div>
      </section>

      {/* Main Page Container for lower content sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 pt-12">
        {/* Core Platform Features */}
        <section>
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
        <section>
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
        <section>
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
    </div>
  );
};

export default Home;
