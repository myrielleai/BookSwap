import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listingService } from '../services/api';
import BookCard from '../components/BookCard';
import {
  BookOpen,
  ArrowRightLeft,
  ShieldCheck,
  Search,
  CheckCircle2,
  Camera,
  MapPin,
  Quote,
  ChevronRight,
  BookMarked,
  Users,
  Star,
} from 'lucide-react';

import HeroAuthCard from '../components/HeroAuthCard';
import GenreBookshelf from '../components/GenreBookshelf';
import BookCover, { COVER_PALETTES } from '../components/BookCover';
import { StepTag, StitchedCard, ClosedBook, HeroBookPile } from '../components/LandingUI';
import BrandLogo from '../components/BrandLogo';

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

/* ──────────────────────────────────────────────
   Dummy Books Data
   ────────────────────────────────────────────── */
const DUMMY_BOOKS = [
  {
    id: 'dummy-1',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    genre_name: 'Classic',
    condition_label: 'Good',
    status: 'available',
    owner_name: 'Alex D.',
    city: 'Manila',
    preferred_return: 'Classic Literature',
  },
  {
    id: 'dummy-2',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    genre_name: 'Fiction',
    condition_label: 'Like New',
    status: 'available',
    owner_name: 'Sarah M.',
    city: 'Quezon City',
    preferred_return: 'Fiction, Mystery',
  },
  {
    id: 'dummy-3',
    title: 'Dune',
    author: 'Frank Herbert',
    genre_name: 'Science Fiction',
    condition_label: 'Good',
    status: 'available',
    owner_name: 'Myrielle J.',
    city: 'Makati',
    preferred_return: 'Sci-Fi, Fantasy',
  },
];

const Home = () => {
  const { isAuthenticated, isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeQuote, setActiveQuote] = useState(0);
  const containerRef = useReveal();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(isAdmin ? '/admin' : isStaff ? '/staff' : '/dashboard', { replace: true });
    }
  }, [isAuthenticated, isAdmin, isStaff, navigate]);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await listingService.getListings({ per_page: 6, sort: 'newest' });
        let list = [];
        if (res.success && res.data) {
          list = res.data.listings || res.data || [];
        }
        
        let displayedBooks = list.slice(0, 6);
        
        if (displayedBooks.length < 3) {
          const needed = 3 - displayedBooks.length;
          displayedBooks = [...displayedBooks, ...DUMMY_BOOKS.slice(0, needed)];
        }
        
        setFeaturedBooks(displayedBooks);
      } catch (err) {
        console.error('Failed to load featured books:', err);
        setFeaturedBooks(DUMMY_BOOKS);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  // Auto-rotate quotes
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveQuote((prev) => (prev + 1) % LITERARY_QUOTES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div ref={containerRef} className="w-full bg-[#fdfbf7]">
      {/* ═══════════════════════════════════════════
          LEATHER TOOLBAR — iBooks / Find My Friends style
          ═══════════════════════════════════════════ */}
      <header className="leather-tan relative z-20 shadow-[0_2px_6px_rgba(70,40,15,0.35)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandLogo withTile className="w-10 h-10 drop-shadow-md" />
            <span className="deboss font-display font-extrabold text-xl tracking-tight">BookSwap</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/browse" className="btn-pillow px-3.5 py-1.5 rounded-lg text-xs font-bold">
              Browse
            </Link>
            <Link to="/register" className="btn-leather px-3.5 py-1.5 rounded-lg text-xs font-bold">
              Join
            </Link>
          </nav>
        </div>
        <div className="absolute left-0 right-0 bottom-[5px] seam" />
      </header>

      {/* ═══════════════════════════════════════════
          HERO — light leather desk with a pile of recently verified books
          ═══════════════════════════════════════════ */}
      <section className="leather-sand relative text-stone-900 pt-10 pb-14 sm:pt-14 sm:pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* LEFT COLUMN: Hero Headline & book pile */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight deboss">
                Book<span className="text-moss-700">Swap</span>
              </h1>
              <p className="text-base sm:text-lg text-leather-900/80 max-w-xl mx-auto lg:mx-0 leading-relaxed emboss">
                BookSwap is the community for readers who believe great stories deserve to be shared — physically, personally, and freely.
              </p>
            </div>

            {/* Recently verified books, tossed on the desk */}
            <div className="w-full pt-2 pb-6 sm:pb-2">
              <HeroBookPile books={featuredBooks} loading={loading} />
            </div>

            {/* Quick Action Links */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <Link
                to="/browse"
                className="btn-leather px-4 sm:px-6 py-3 font-semibold text-sm rounded-xl flex items-center gap-2 whitespace-nowrap"
              >
                <Search className="w-4 h-4" />
                Browse Catalog
              </Link>
              <Link
                to="/register"
                className="btn-pillow px-4 sm:px-6 py-3 font-semibold text-sm rounded-xl flex items-center gap-2 whitespace-nowrap"
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

        {/* stitched seam where leather meets the paper below */}
        <div className="absolute left-0 right-0 bottom-2 seam" />
      </section>

      {/* ═══════════════════════════════════════════
          MAIN CONTENT — on clean paper
          ═══════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ─── HOW BOOKSWAP WORKS — a stitched thread runs through the story ─── */}
        <section className="py-16 sm:py-24">
          <div className="text-center max-w-2xl mx-auto mb-14 reveal">
            <span className="font-hand text-2xl text-moss-700">it's simpler than it sounds</span>
            <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-stone-900 emboss mt-1">
              How BookSwap Works
            </h2>
            <p className="text-sm sm:text-base text-stone-500 mt-3">
              Three simple steps to start swapping physical books with readers near you.
            </p>
          </div>

          <div className="relative">
            {/* the thread */}
            <div className="thread-moss absolute top-10 bottom-10 left-[31px] md:left-1/2 md:-translate-x-px pointer-events-none" />

            <div className="space-y-16 lg:space-y-24">
              {/* STEP 1 */}
              <div className="reveal relative grid grid-cols-[64px_1fr] md:grid-cols-[1fr_88px_1fr] gap-x-4 sm:gap-x-6 lg:gap-x-12 gap-y-6 items-center">
                <div className="md:col-start-2 md:row-start-1 self-start md:self-center flex justify-center">
                  <StepTag n={1} />
                </div>
                <div className="md:col-start-1 md:row-start-1 space-y-4 md:text-right">
                  <span className="font-hand text-2xl text-moss-700">snap · grade · post</span>
                  <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-stone-900">
                    List your verified copy
                  </h3>
                  <p className="text-stone-600 text-base leading-relaxed">
                    Post books you've already read. Upload actual photos, set physical condition grades, and state your preferred return genres.
                  </p>
                  <ul className="space-y-1.5 text-sm text-stone-700">
                    <li>Authentic photo verification of cover, spine & pages</li>
                    <li>Transparent condition grading from "Like New" to "Well-Loved"</li>
                  </ul>
                </div>
                <div className="col-span-2 md:col-span-1 md:col-start-3 md:row-start-1">
                  <StitchedCard label="Listing Draft" badge="Ready">
                    <div className="flex gap-5 items-center">
                      <div className="w-28 sm:w-32 shrink-0 pr-2 pb-2">
                        <ClosedBook backColor={COVER_PALETTES.denim.bg}>
                          <BookCover title="The Midnight Library" author="Matt Haig" palette="denim" variant="minimal" />
                        </ClosedBook>
                      </div>
                      <div className="flex-1 min-w-0 space-y-2.5">
                        <div>
                          <h5 className="font-display font-extrabold text-stone-900 text-xl leading-tight">The Midnight Library</h5>
                          <p className="text-sm text-stone-500">by Matt Haig</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="pill-moss px-2 py-0.5 font-bold rounded">Like New</span>
                          <span className="btn-pillow px-2 py-0.5 font-semibold rounded">Fiction</span>
                        </div>
                        <div className="text-xs text-stone-600">
                          <span className="font-bold text-stone-800">Photos:</span> Front cover · Spine & edges · Page spread
                        </div>
                        <div className="text-xs text-stone-600">
                          <span className="font-bold text-stone-800">Wants back:</span> Mystery, Sci-Fi
                        </div>
                      </div>
                    </div>
                  </StitchedCard>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="reveal relative grid grid-cols-[64px_1fr] md:grid-cols-[1fr_88px_1fr] gap-x-4 sm:gap-x-6 lg:gap-x-12 gap-y-6 items-center">
                <div className="md:col-start-2 md:row-start-1 self-start md:self-center flex justify-center">
                  <StepTag n={2} />
                </div>
                <div className="md:col-start-3 md:row-start-1 space-y-4">
                  <span className="font-hand text-2xl text-moss-700">one book for one book</span>
                  <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-stone-900">
                    Propose a 1-to-1 swap
                  </h3>
                  <p className="text-stone-600 text-base leading-relaxed">
                    Browse verified catalog offerings. Send a swap proposal offering one of your verified books. Owners retain full accept/decline rights.
                  </p>
                  <ul className="space-y-1.5 text-sm text-stone-700">
                    <li>1-for-1 fair book trade — no fees, no point systems</li>
                    <li>Review partner listing details before accepting any proposal</li>
                  </ul>
                </div>
                <div className="col-span-2 md:col-span-1 md:col-start-1 md:row-start-1">
                  <StitchedCard label="1-to-1 Swap Match" badge="Proposal Sent">
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 sm:gap-5 items-center">
                      <div className="text-center space-y-2">
                        <div className="w-24 sm:w-28 mx-auto pr-2 pb-2">
                          <ClosedBook backColor={COVER_PALETTES.mustard.bg}>
                            <BookCover title="Dune" author="Frank Herbert" palette="mustard" variant="bold" />
                          </ClosedBook>
                        </div>
                        <p className="text-xs"><span className="font-bold text-stone-800">You offer</span> <span className="text-stone-500">· Herbert</span></p>
                      </div>
                      <div className="btn-leather w-10 h-10 rounded-full flex items-center justify-center -mt-6">
                        <ArrowRightLeft className="w-4 h-4" />
                      </div>
                      <div className="text-center space-y-2">
                        <div className="w-24 sm:w-28 mx-auto pr-2 pb-2">
                          <ClosedBook backColor={COVER_PALETTES.teal.bg}>
                            <BookCover title="Project Hail Mary" author="Andy Weir" palette="teal" variant="stripe" />
                          </ClosedBook>
                        </div>
                        <p className="text-xs"><span className="font-bold text-stone-800">You request</span> <span className="text-stone-500">· Weir</span></p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-dashed border-leather-300 flex items-center justify-between text-xs text-stone-600">
                      <span>Genre match: <strong className="text-stone-800">Sci-Fi / Fantasy</strong></span>
                      <span className="text-moss-700 font-bold">Fair exchange</span>
                    </div>
                  </StitchedCard>
                </div>
              </div>

              {/* STEP 3 */}
              <div className="reveal relative grid grid-cols-[64px_1fr] md:grid-cols-[1fr_88px_1fr] gap-x-4 sm:gap-x-6 lg:gap-x-12 gap-y-6 items-center">
                <div className="md:col-start-2 md:row-start-1 self-start md:self-center flex justify-center">
                  <StepTag n={3} />
                </div>
                <div className="md:col-start-1 md:row-start-1 space-y-4 md:text-right">
                  <span className="font-hand text-2xl text-moss-700">meet at a verified spot</span>
                  <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-stone-900">
                    Supervised handover
                  </h3>
                  <p className="text-stone-600 text-base leading-relaxed">
                    Exchange Moderators assign official meetup venues and time slots. Meet safely, inspect condition, confirm receipt, and update your library.
                  </p>
                  <ul className="space-y-1.5 text-sm text-stone-700">
                    <li>Meetups at campus libraries, partner cafes, or official hubs</li>
                    <li>Moderator-escorted condition inspection & digital confirmation</li>
                  </ul>
                </div>
                <div className="col-span-2 md:col-span-1 md:col-start-3 md:row-start-1">
                  <StitchedCard label="Scheduled Handover" badge="Confirmed">
                    <div className="flex gap-5 items-center">
                      {/* the two books changing hands */}
                      <div className="relative w-32 sm:w-36 h-36 sm:h-40 shrink-0">
                        <div className="absolute left-0 top-1 w-[62%] -rotate-6">
                          <ClosedBook backColor={COVER_PALETTES.mustard.bg}>
                            <BookCover title="Dune" author="Frank Herbert" palette="mustard" variant="bold" />
                          </ClosedBook>
                        </div>
                        <div className="absolute right-1 top-4 w-[62%] rotate-6">
                          <ClosedBook backColor={COVER_PALETTES.teal.bg}>
                            <BookCover title="Project Hail Mary" author="Andy Weir" palette="teal" variant="stripe" />
                          </ClosedBook>
                        </div>
                      </div>
                      <dl className="flex-1 min-w-0 space-y-2.5 text-sm">
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Moderator</dt>
                          <dd className="font-semibold text-stone-800">Sarah M. <span className="font-normal text-stone-500">· Exchange Supervisor</span></dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-wider text-stone-400">When</dt>
                          <dd className="font-semibold text-stone-800">Fri, 3:30 PM</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Where</dt>
                          <dd className="font-semibold text-stone-800">Main Library Rm 102 <span className="font-normal text-stone-500">· Campus Hub</span></dd>
                        </div>
                      </dl>
                    </div>
                  </StitchedCard>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── LITERARY QUOTE — Notes-style legal pad in a leather binder ─── */}
        <section className="py-14 sm:py-20 border-t border-dashed border-moss-200">
          <div className="reveal max-w-2xl mx-auto">
            <div className="leather-tan stitched rounded-2xl p-2.5 shadow-[0_18px_40px_-16px_rgba(70,40,15,0.5)]">
              <div className="relative z-[2] flex items-center justify-between px-4 pt-2 pb-3">
                <Quote className="w-4 h-4 text-leather-800/60" />
                <span className="deboss font-display font-extrabold text-sm">From the Reading Journal</span>
                <span className="w-4" />
              </div>
              <div className="paper-lined relative z-[2] rounded-lg pl-16 pr-5 sm:px-16 pt-9 pb-8 min-h-[220px] flex flex-col justify-center shadow-inner">
                <p className="font-hand text-2xl sm:text-3xl text-stone-800 leading-[36px] transition-opacity duration-500">
                  {LITERARY_QUOTES[activeQuote].text}
                </p>
                <div className="font-hand text-xl text-moss-700 mt-2 leading-[36px]">
                  — {LITERARY_QUOTES[activeQuote].author}
                  {LITERARY_QUOTES[activeQuote].work && (
                    <span className="italic">, {LITERARY_QUOTES[activeQuote].work}</span>
                  )}
                </div>
              </div>
              <div className="relative z-[2] flex items-center justify-center gap-2 py-3">
                {LITERARY_QUOTES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveQuote(i)}
                    className={`h-2.5 rounded-full transition-all duration-300 shadow-[inset_0_1px_2px_rgba(70,40,15,0.45),0_1px_0_rgba(255,240,215,0.5)] ${
                      activeQuote === i ? 'w-7 bg-moss-400' : 'w-2.5 bg-leather-600/50 hover:bg-leather-600/70'
                    }`}
                    aria-label={`Quote ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── BROWSE BY GENRE — bookshelf ─── */}
        <section className="py-14 sm:py-20 border-t border-dashed border-moss-200">
          <div className="reveal text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-stone-900 emboss">
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

        {/* ─── COMMUNITY STATS — stitched leather strip ─── */}
        <section className="py-14 sm:py-20 border-t border-dashed border-moss-200">
          <div className="reveal leather-sand stitched stitched-moss rounded-2xl px-6 py-10 shadow-[0_12px_30px_-14px_rgba(70,40,15,0.4)]">
            <div className="relative z-[2] grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { label: 'Books Listed', value: '1,200+', icon: <BookOpen className="w-5 h-5" /> },
                { label: 'Verified Readers', value: '400+', icon: <Users className="w-5 h-5" /> },
                { label: 'Successful Swaps', value: '850+', icon: <ArrowRightLeft className="w-5 h-5" /> },
                { label: 'Community Rating', value: '4.9', icon: <Star className="w-5 h-5" /> },
              ].map((stat, i) => (
                <div key={i} className={`reveal-delay-${i + 1} space-y-2`}>
                  <div className="well w-12 h-12 rounded-full text-moss-600 flex items-center justify-center mx-auto">
                    {stat.icon}
                  </div>
                  <p className="text-3xl sm:text-4xl font-display font-extrabold deboss">{stat.value}</p>
                  <p className="text-xs text-leather-800 font-semibold emboss">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="pt-4 pb-16 sm:pb-20">
          <div className="reveal leather-tan stitched rounded-2xl p-8 sm:p-12 shadow-[0_18px_40px_-16px_rgba(70,40,15,0.55)]" style={{ '--stitch-inset': '9px', '--stitch-radius': '12px' }}>
            <div className="relative z-[2] flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-3 text-center md:text-left">
                <h3 className="text-2xl sm:text-3xl font-display font-extrabold emboss-light">
                  Ready to swap your first book?
                </h3>
                <p className="text-sm text-leather-900 font-medium max-w-xl leading-relaxed emboss">
                  Registration is quick. All new reader accounts undergo administrator identity verification to keep the community safe and scam-free.
                </p>
              </div>
              <Link
                to="/register"
                className="btn-pillow !text-moss-700 px-8 py-3.5 font-bold text-sm rounded-xl flex items-center gap-2 shrink-0"
              >
                Create Reader Account
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
