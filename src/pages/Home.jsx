import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { listingService } from '../services/api';
import BookCard from '../components/BookCard';
import { LoadingState } from '../components/LoadingState';
import {
  BookOpen,
  ArrowRightLeft,
  ShieldCheck,
  Search,
  CheckCircle2,
  TrendingUp,
  Camera,
  MapPin,
  Quote,
  ChevronRight,
  BookMarked,
  Users,
  Star,
} from 'lucide-react';

import FlipBookHero from '../components/FlipBookHero';
import HeroAuthCard from '../components/HeroAuthCard';
import GenreBookshelf from '../components/GenreBookshelf';

/* ──────────────────────────────────────────────
   Intersection Observer hook for scroll-reveal
   ────────────────────────────────────────────── */
const useReveal = () => {
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    const elements = ref.current?.querySelectorAll('.reveal');
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return ref;
};

/* ──────────────────────────────────────────────
   Literary Quotes Data
   ────────────────────────────────────────────── */
const LITERARY_QUOTES = [
  {
    text: 'A reader lives a thousand lives before he dies. The man who never reads lives only one.',
    author: 'George R.R. Martin',
    work: 'A Dance with Dragons',
  },
  {
    text: 'So many books, so little time.',
    author: 'Frank Zappa',
  },
  {
    text: 'A room without books is like a body without a soul.',
    author: 'Marcus Tullius Cicero',
  },
];

/* ──────────────────────────────────────────────
   Genre Data
   ────────────────────────────────────────────── */
const GENRES = [
  { name: 'Fiction' },
  { name: 'Science Fiction' },
  { name: 'Mystery' },
  { name: 'Romance' },
  { name: 'Fantasy' },
  { name: 'History' },
  { name: 'Biography' },
  { name: 'Self-Help' },
  { name: 'Technology' },
  { name: 'Classics' },
  { name: 'Poetry' },
  { name: 'Young Adult' },
];

const Home = () => {
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeQuote, setActiveQuote] = useState(0);
  const containerRef = useReveal();

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

  // Auto-rotate quotes
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveQuote((prev) => (prev + 1) % LITERARY_QUOTES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      {/* ═══════════════════════════════════════════
          HERO SECTION — Clean, Warm, Goodreads-Inspired
          ═══════════════════════════════════════════ */}
      <section className="w-full bg-[#f4f1ea] text-stone-900 py-10 sm:pt-16 sm:pb-20 px-4 sm:px-6 lg:px-8 border-b border-stone-300/50">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* LEFT COLUMN: Hero Headline & 3D Flipping Book */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-stone-900">
                BookSwap
              </h1>
              <p className="text-base sm:text-lg text-stone-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                BookSwap is the community for readers who believe great stories deserve to be shared — physically, personally, and freely.
              </p>
            </div>

            {/* 3D Flipping Book Showcase */}
            <div className="w-full py-1">
              <FlipBookHero />
            </div>

            {/* Quick Action Links */}
            <div className="flex items-center justify-center lg:justify-start gap-3 pt-1">
              <Link
                to="/browse"
                className="px-6 py-2.5 bg-stone-800 hover:bg-stone-700 text-white font-semibold text-sm rounded-md shadow-sm transition-all flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Browse Catalog
              </Link>
              <Link
                to="/register"
                className="px-6 py-2.5 bg-transparent hover:bg-stone-200/60 text-stone-800 font-semibold text-sm rounded-md border border-stone-400 transition-all flex items-center gap-2"
              >
                Join BookSwap
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: Login / Register Hero Card */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none">
            <HeroAuthCard />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          MAIN CONTENT — Below Hero
          ═══════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ─── VALUE PROPOSITIONS (Clean 3-Col) ─── */}
        <section className="py-14 sm:py-20 border-b border-stone-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                icon: <BookMarked className="w-6 h-6" />,
                title: 'Deciding what to read next?',
                desc: 'Browse verified books from real readers in your area. Every listing includes condition photos and honest descriptions.',
                color: 'text-emerald-700',
                bg: 'bg-emerald-50',
              },
              {
                icon: <ArrowRightLeft className="w-6 h-6" />,
                title: 'Swap instead of buy.',
                desc: "Trade books 1-for-1 with fellow readers. No money changes hands — just stories finding new homes.",
                color: 'text-amber-700',
                bg: 'bg-amber-50',
              },
              {
                icon: <ShieldCheck className="w-6 h-6" />,
                title: 'Safe & supervised exchanges.',
                desc: 'Every meetup is moderated at verified public venues. Your safety and trust come first.',
                color: 'text-emerald-800',
                bg: 'bg-emerald-100/50',
              },
            ].map((item, i) => (
              <div key={i} className={`reveal reveal-delay-${i + 1} text-center md:text-left space-y-3`}>
                <div className={`w-12 h-12 ${item.bg} ${item.color} rounded-lg flex items-center justify-center mx-auto md:mx-0`}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-serif font-bold text-stone-900">{item.title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── HOW BOOKSWAP WORKS ─── */}
        <section className="py-14 sm:py-20 border-b border-stone-200">
          <div className="text-center max-w-2xl mx-auto mb-12 reveal">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900">
              How BookSwap Works
            </h2>
            <p className="text-sm sm:text-base text-stone-500 mt-3">
              Three simple steps to start swapping physical books with readers near you.
            </p>
          </div>

          <div className="space-y-14 lg:space-y-20">
            {/* STEP 1 */}
            <div className="reveal grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-14 items-center">
              <div className="space-y-4">
                <span className="inline-block text-xs font-bold tracking-wider text-emerald-700 uppercase bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200/80">
                  Step 1
                </span>
                <h3 className="text-2xl font-serif font-bold text-stone-900">
                  List your verified copy
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Post books you've already read. Upload actual photos, set physical condition grades, and state your preferred return genres.
                </p>
                <ul className="space-y-2.5">
                  <li className="flex items-start gap-2.5 text-sm text-stone-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Authentic photo verification of cover, spine & pages</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-stone-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Transparent condition grading from "Like New" to "Well-Loved"</span>
                  </li>
                </ul>
              </div>

              {/* Visual Card */}
              <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm hover-lift">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-stone-700">Listing Draft</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                </div>

                <div className="flex gap-4 items-center bg-stone-50 p-3 rounded-md border border-stone-200/60 mb-3">
                  <div className="w-14 h-18 bg-emerald-900 rounded flex items-center justify-center text-amber-100 shrink-0 font-serif text-center p-1 text-[10px] leading-tight font-bold shadow-sm">
                    The Midnight Library
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <h5 className="font-bold text-stone-800 text-sm truncate">The Midnight Library</h5>
                    <p className="text-xs text-stone-500">by Matt Haig</p>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-800 font-medium rounded border border-amber-200/60">Like New</span>
                      <span className="text-stone-400">• Fiction</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {['Front Cover', 'Spine & Edges', 'Page Spread'].map((label) => (
                    <div key={label} className="bg-stone-50 rounded-md p-2 text-center border border-stone-200/50">
                      <Camera className="w-3.5 h-3.5 text-stone-400 mx-auto mb-0.5" />
                      <span className="text-[10px] text-stone-600 font-medium block">{label}</span>
                      <span className="text-[9px] text-emerald-600 font-bold">Uploaded</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* STEP 2 */}
            <div className="reveal grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-14 items-center">
              {/* Visual Card (Left on desktop) */}
              <div className="order-2 md:order-1 bg-white p-5 rounded-lg border border-stone-200 shadow-sm hover-lift">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center">
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-stone-700">1-to-1 Swap Match</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                    Proposal Sent
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2 items-center bg-amber-50/50 p-4 rounded-md border border-amber-200/40 mb-3">
                  <div className="col-span-2 text-center space-y-1">
                    <div className="w-14 h-18 mx-auto bg-stone-800 rounded text-amber-200 font-serif text-[10px] p-1 flex items-center justify-center shadow-sm">
                      Dune
                    </div>
                    <p className="text-[11px] font-bold text-stone-800">Your Book</p>
                    <p className="text-[10px] text-stone-500">Frank Herbert</p>
                  </div>

                  <div className="col-span-1 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm">
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div className="col-span-2 text-center space-y-1">
                    <div className="w-14 h-18 mx-auto bg-emerald-950 rounded text-amber-100 font-serif text-[10px] p-1 flex items-center justify-center shadow-sm">
                      Project Hail Mary
                    </div>
                    <p className="text-[11px] font-bold text-stone-800">Requested</p>
                    <p className="text-[10px] text-stone-500">Andy Weir</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-stone-600 bg-stone-50 px-3 py-2 rounded-md border border-stone-200/50">
                  <span>Genre Match: <strong>Sci-Fi / Fantasy</strong></span>
                  <span className="text-amber-700 font-semibold">Fair Exchange ★</span>
                </div>
              </div>

              {/* Description (Right) */}
              <div className="order-1 md:order-2 space-y-4">
                <span className="inline-block text-xs font-bold tracking-wider text-amber-700 uppercase bg-amber-50 px-3 py-1 rounded-md border border-amber-200/80">
                  Step 2
                </span>
                <h3 className="text-2xl font-serif font-bold text-stone-900">
                  Propose a 1-to-1 swap
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Browse verified catalog offerings. Send a swap proposal offering one of your verified books. Owners retain full accept/decline rights.
                </p>
                <ul className="space-y-2.5">
                  <li className="flex items-start gap-2.5 text-sm text-stone-700">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>1-for-1 fair book trade — no fees, no point systems</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-stone-700">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>Review partner listing details before accepting any proposal</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* STEP 3 */}
            <div className="reveal grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-14 items-center">
              <div className="space-y-4">
                <span className="inline-block text-xs font-bold tracking-wider text-stone-800 uppercase bg-stone-100 px-3 py-1 rounded-md border border-stone-300">
                  Step 3
                </span>
                <h3 className="text-2xl font-serif font-bold text-stone-900">
                  Supervised handover
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Exchange Moderators assign official meetup venues and time slots. Meet safely, inspect condition, confirm receipt, and update your library.
                </p>
                <ul className="space-y-2.5">
                  <li className="flex items-start gap-2.5 text-sm text-stone-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>Meetups at campus libraries, partner cafes, or official hubs</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-stone-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>Moderator-escorted condition inspection & digital confirmation</span>
                  </li>
                </ul>
              </div>

              {/* Visual Card */}
              <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm hover-lift">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-stone-100 text-stone-800 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-stone-700">Scheduled Handover</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-300 text-[11px] font-semibold flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Campus Hub
                  </span>
                </div>

                <div className="bg-stone-50 p-4 rounded-md border border-stone-200/60 space-y-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-stone-800 text-amber-50 font-bold text-xs flex items-center justify-center">
                        M
                      </div>
                      <div>
                        <p className="text-xs font-bold text-stone-800">Moderator: Sarah M.</p>
                        <p className="text-[10px] text-stone-500">Exchange Supervisor</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      Confirmed
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2 rounded border border-stone-200">
                      <span className="text-[10px] text-stone-400 block">Time Slot</span>
                      <span className="font-semibold text-stone-700">Fri, 3:30 PM</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-stone-200">
                      <span className="text-[10px] text-stone-400 block">Location</span>
                      <span className="font-semibold text-stone-700">Main Library Rm 102</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-stone-800 bg-stone-100/80 px-3 py-2 rounded-md border border-stone-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span className="font-medium">Condition Inspection & Digital Confirmation</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── LITERARY QUOTE SECTION ─── */}
        <section className="py-14 sm:py-20 border-b border-stone-200">
          <div className="reveal max-w-2xl mx-auto text-center">
            <div className="mb-6">
              <Quote className="w-8 h-8 text-emerald-600/40 mx-auto" />
            </div>
            <div className="min-h-[120px] flex flex-col items-center justify-center">
              <p className="literary-quote text-lg sm:text-xl text-stone-700 px-8 sm:px-12 leading-relaxed mb-4 transition-opacity duration-500">
                {LITERARY_QUOTES[activeQuote].text}
              </p>
              <div className="text-sm text-stone-500">
                <span className="font-semibold text-stone-700">{LITERARY_QUOTES[activeQuote].author}</span>
                {LITERARY_QUOTES[activeQuote].work && (
                  <span className="italic"> — {LITERARY_QUOTES[activeQuote].work}</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-6">
              {LITERARY_QUOTES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveQuote(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    activeQuote === i ? 'bg-emerald-600 w-6' : 'bg-stone-300 hover:bg-stone-400'
                  }`}
                  aria-label={`Quote ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ─── BROWSE BY GENRE ─── */}
        <section className="py-14 sm:py-20 border-b border-stone-200">
          <div className="reveal text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
              Browse by genre
            </h2>
            <p className="text-sm text-stone-500 mt-2">
              Discover books available for exchange across popular reading categories.
            </p>
          </div>

          <div className="reveal reveal-delay-1">
            <GenreBookshelf genres={GENRES} />
          </div>
        </section>

        {/* ─── RECENTLY VERIFIED BOOKS ─── */}
        <section className="py-14 sm:py-20 border-b border-stone-200">
          <div className="reveal flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-serif font-bold text-stone-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Recently Verified Books
              </h2>
              <p className="text-xs text-stone-500 mt-1">Latest verified listings ready for exchange</p>
            </div>
            <Link
              to="/browse"
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="reveal reveal-delay-1">
            {loading ? (
              <LoadingState message="Loading latest verified listings..." />
            ) : featuredBooks.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-lg border border-stone-200 text-stone-500 text-sm">
                No public listings available right now. Be the first to list a book!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
                {featuredBooks.map((book) => (
                  <BookCard key={book.id} listing={book} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ─── COMMUNITY STATS ─── */}
        <section className="py-14 sm:py-20 border-b border-stone-200">
          <div className="reveal grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { label: 'Books Listed', value: '1,200+', icon: <BookOpen className="w-5 h-5" /> },
              { label: 'Verified Readers', value: '400+', icon: <Users className="w-5 h-5" /> },
              { label: 'Successful Swaps', value: '850+', icon: <ArrowRightLeft className="w-5 h-5" /> },
              { label: 'Community Rating', value: '4.9', icon: <Star className="w-5 h-5" /> },
            ].map((stat, i) => (
              <div key={i} className={`reveal-delay-${i + 1} space-y-2`}>
                <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center mx-auto">
                  {stat.icon}
                </div>
                <p className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">{stat.value}</p>
                <p className="text-xs text-stone-500 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="py-14 sm:py-20 pb-16">
          <div className="reveal bg-[#f4f1ea] rounded-lg p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 border border-stone-300/50">
            <div className="space-y-3 text-center md:text-left">
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
                Ready to swap your first book?
              </h3>
              <p className="text-sm text-stone-600 max-w-xl leading-relaxed">
                Registration is quick. All new reader accounts undergo administrator identity verification to keep the community safe and scam-free.
              </p>
            </div>
            <Link
              to="/register"
              className="px-8 py-3.5 bg-stone-800 hover:bg-stone-700 text-white font-bold text-sm rounded-md shadow-sm transition-all flex items-center gap-2 shrink-0"
            >
              Create Reader Account
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
