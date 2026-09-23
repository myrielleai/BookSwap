import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Search,
  Bookmark,
  Pause,
  Play,
  CheckCircle2,
} from 'lucide-react';

export const FlipBookHero = () => {
  const [activeSpread, setActiveSpread] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState('next'); // 'next' or 'prev'
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const totalSpreads = 3;
  const autoPlayRef = useRef(null);

  const turnNext = () => {
    if (isFlipping) return;
    setFlipDirection('next');
    setIsFlipping(true);

    setTimeout(() => {
      setActiveSpread((prev) => (prev + 1) % totalSpreads);
      setIsFlipping(false);
    }, 700);
  };

  const turnPrev = () => {
    if (isFlipping) return;
    setFlipDirection('prev');
    setIsFlipping(true);

    setTimeout(() => {
      setActiveSpread((prev) => (prev - 1 + totalSpreads) % totalSpreads);
      setIsFlipping(false);
    }, 700);
  };

  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(() => {
        turnNext();
      }, 4200);
    } else if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying, isFlipping]);

  // Render Left Page Content with classical book typesetting
  const renderLeftPage = (spreadIndex) => {
    switch (spreadIndex) {
      case 0:
        return (
          <div className="h-full flex flex-col justify-between py-1 text-center items-center select-none">
            {/* Running Header */}
            <div className="w-full pb-2 border-b border-amber-900/15 flex items-center justify-between text-[10px] font-serif tracking-widest text-amber-900/60 uppercase">
              <span>BOOKSWAP</span>
              <span>CHAPTER I</span>
            </div>

            {/* Page Body */}
            <div className="space-y-4 max-w-xs mx-auto my-auto px-2">
              <div className="w-10 h-10 rounded-full bg-emerald-900/10 text-emerald-800 flex items-center justify-center mx-auto border border-emerald-800/20">
                <BookOpen className="w-5 h-5 text-emerald-800 stroke-[1.75]" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-serif italic text-stone-900 leading-tight">
                  <span className="float-left text-4xl sm:text-5xl font-serif font-bold text-emerald-900 pr-2 leading-none font-style-normal">
                    P
                  </span>
                  ass the book. Start the story.
                </h2>
                <div className="w-12 h-0.5 bg-amber-800/20 mx-auto my-2" />
                <p className="text-xs text-stone-600 font-serif leading-relaxed">
                  A peer-to-peer physical exchange bringing reader communities together.
                </p>
              </div>
            </div>

            {/* Footer Page Number */}
            <div className="w-full pt-2 border-t border-amber-900/15 flex items-center justify-center text-[10px] font-serif text-amber-950/50">
              <span>- 1 -</span>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="h-full flex flex-col justify-between py-1 text-center items-center select-none">
            {/* Running Header */}
            <div className="w-full pb-2 border-b border-amber-900/15 flex items-center justify-between text-[10px] font-serif tracking-widest text-amber-900/60 uppercase">
              <span>BOOKSWAP GUIDE</span>
              <span>CHAPTER II</span>
            </div>

            {/* Page Body */}
            <div className="space-y-3 max-w-xs mx-auto my-auto px-2">
              <div className="w-9 h-9 rounded-full bg-amber-900/10 text-amber-800 flex items-center justify-center mx-auto border border-amber-800/20">
                <Sparkles className="w-4 h-4 text-amber-800 stroke-[1.75]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                How It Works
              </h3>
              <div className="space-y-2 text-xs text-stone-700 text-left pt-1 font-serif">
                <div className="flex items-center gap-2.5 bg-amber-900/5 p-2 rounded-md border border-amber-900/10">
                  <span className="w-5 h-5 rounded-full bg-emerald-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                  <span>List books from your library</span>
                </div>
                <div className="flex items-center gap-2.5 bg-amber-900/5 p-2 rounded-md border border-amber-900/10">
                  <span className="w-5 h-5 rounded-full bg-emerald-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                  <span>Propose a 1-to-1 book swap</span>
                </div>
                <div className="flex items-center gap-2.5 bg-amber-900/5 p-2 rounded-md border border-amber-900/10">
                  <span className="w-5 h-5 rounded-full bg-emerald-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
                  <span>Meet & exchange safely</span>
                </div>
              </div>
            </div>

            {/* Footer Page Number */}
            <div className="w-full pt-2 border-t border-amber-900/15 flex items-center justify-center text-[10px] font-serif text-amber-950/50">
              <span>- 3 -</span>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="h-full flex flex-col justify-between py-1 text-center items-center select-none">
            {/* Running Header */}
            <div className="w-full pb-2 border-b border-amber-900/15 flex items-center justify-between text-[10px] font-serif tracking-widest text-amber-900/60 uppercase">
              <span>CATALOG</span>
              <span>CHAPTER III</span>
            </div>

            {/* Page Body */}
            <div className="space-y-3 max-w-xs mx-auto my-auto px-2">
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                Popular Genres
              </h3>
              <p className="text-xs text-stone-600 font-serif">Discover active reader exchange threads</p>
              <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                {['Fiction', 'Sci-Fi', 'Mystery', 'Tech', 'History', 'Classics'].map((g) => (
                  <span key={g} className="px-2.5 py-1 bg-stone-200/90 text-stone-800 rounded-md text-[11px] font-serif border border-stone-300/70 shadow-2xs">
                    {g}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer Page Number */}
            <div className="w-full pt-2 border-t border-amber-900/15 flex items-center justify-center text-[10px] font-serif text-amber-950/50">
              <span>- 5 -</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Render Right Page Content with classical book typesetting
  const renderRightPage = (spreadIndex) => {
    switch (spreadIndex) {
      case 0:
        return (
          <div className="h-full flex flex-col justify-between py-1 text-center items-center select-none">
            {/* Running Header */}
            <div className="w-full pb-2 border-b border-amber-900/15 flex items-center justify-between text-[10px] font-serif tracking-widest text-amber-900/60 uppercase">
              <span>VALUES</span>
              <span>PAGE 2</span>
            </div>

            {/* Page Body */}
            <div className="space-y-3 max-w-xs mx-auto my-auto px-2">
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                Read. Swap. Repeat.
              </h3>
              <div className="space-y-2 pt-1">
                <div className="p-2.5 rounded-lg bg-amber-950/5 border border-amber-900/10 text-left flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-700 shrink-0" />
                  <span className="text-xs font-serif text-stone-800 font-semibold">1,200+ Books Swapped</span>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-950/5 border border-amber-900/10 text-left flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-700 shrink-0" />
                  <span className="text-xs font-serif text-stone-800 font-semibold">100% Free Peer Swaps</span>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-950/5 border border-amber-900/10 text-left flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-700 shrink-0" />
                  <span className="text-xs font-serif text-stone-800 font-semibold">Supervised Safe Meetups</span>
                </div>
              </div>
            </div>

            {/* Footer Page Number */}
            <div className="w-full pt-2 border-t border-amber-900/15 flex items-center justify-center text-[10px] font-serif text-amber-950/50">
              <span>- 2 -</span>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="h-full flex flex-col justify-between py-1 text-center items-center select-none">
            {/* Running Header */}
            <div className="w-full pb-2 border-b border-amber-900/15 flex items-center justify-between text-[10px] font-serif tracking-widest text-amber-900/60 uppercase">
              <span>SAFETY</span>
              <span>PAGE 4</span>
            </div>

            {/* Page Body */}
            <div className="space-y-3 max-w-xs mx-auto my-auto px-2">
              <div className="w-9 h-9 rounded-full bg-indigo-900/10 text-indigo-800 flex items-center justify-center mx-auto border border-indigo-800/20">
                <ShieldCheck className="w-4 h-4 text-indigo-800 stroke-[1.75]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                Safe & Supervised
              </h3>
              <p className="text-xs text-stone-600 font-serif leading-relaxed max-w-[210px] mx-auto">
                Verified member profiles & designated public meetup locations.
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-900/10 text-emerald-900 text-[11px] font-serif font-medium rounded-full border border-emerald-900/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Verified Readers Only</span>
              </div>
            </div>

            {/* Footer Page Number */}
            <div className="w-full pt-2 border-t border-amber-900/15 flex items-center justify-center text-[10px] font-serif text-amber-950/50">
              <span>- 4 -</span>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="h-full flex flex-col justify-between py-1 text-center items-center select-none">
            {/* Running Header */}
            <div className="w-full pb-2 border-b border-amber-900/15 flex items-center justify-between text-[10px] font-serif tracking-widest text-amber-900/60 uppercase">
              <span>EXCHANGE</span>
              <span>PAGE 6</span>
            </div>

            {/* Page Body */}
            <div className="space-y-3 max-w-xs mx-auto my-auto w-full px-2">
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                Ready to Swap?
              </h3>
              <p className="text-xs text-stone-600 font-serif">Join local booklovers in your area today.</p>
              <div className="space-y-2 pt-2 w-full max-w-[190px] mx-auto">
                <Link
                  to="/browse"
                  className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-700 text-amber-50 font-serif font-semibold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
                >
                  <Search className="w-3.5 h-3.5" />
                  Browse Books
                </Link>
                <Link
                  to="/register"
                  className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-stone-100 font-serif font-semibold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
                >
                  Join BookSwap
                </Link>
              </div>
            </div>

            {/* Footer Page Number */}
            <div className="w-full pt-2 border-t border-amber-900/15 flex items-center justify-center text-[10px] font-serif text-amber-950/50">
              <span>- 6 -</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const nextSpreadIndex = (activeSpread + 1) % totalSpreads;
  const prevSpreadIndex = (activeSpread - 1 + totalSpreads) % totalSpreads;

  return (
    <div className="w-full flex flex-col items-center justify-center select-none max-w-4xl mx-auto py-2">
      {/* 3D PERSPECTIVE STAGE CONTAINER */}
      <div className="perspective-1200 w-full relative px-2 sm:px-4">
        
        {/* PHYSICAL HARDCOVER BOOK OUTER CASING */}
        <div className="relative w-full p-3 sm:p-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 rounded-2xl hardcover-shadow border border-emerald-800/40 relative">
          
          {/* Hardcover Embossed Gold Corner Accents */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-400/40 rounded-tl-sm pointer-events-none" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-400/40 rounded-tr-sm pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-400/40 rounded-bl-sm pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-400/40 rounded-br-sm pointer-events-none" />

          {/* Top Silk Bookmark Ribbon */}
          <div className="absolute -top-1 right-12 w-5 h-14 bg-gradient-to-b from-amber-600 to-amber-700 shadow-md transform -rotate-1 z-30 flex items-end justify-center pb-1 pointer-events-none rounded-b-sm border-x border-amber-800/50">
            <Bookmark className="w-3 h-3 text-amber-100 fill-amber-100" />
          </div>

          {/* INNER OPEN PAPER BLOCK WITH PAGE STACK EDGES */}
          <div className="relative w-full min-h-[370px] sm:min-h-[410px] realistic-paper-bg rounded-xl border border-amber-900/20 flex flex-col justify-between overflow-hidden shadow-inner">
            
            {/* Center Spine Crease & Shadow Gutter */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-10 bg-gradient-to-r from-black/20 via-black/40 to-black/20 z-20 pointer-events-none hidden sm:block" />
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-amber-950/40 z-25 pointer-events-none hidden sm:block" />

            {/* Left & Right Paper Page Thickness Stack Lines */}
            <div className="absolute left-0 top-0 bottom-0 w-2.5 page-stack-left pointer-events-none border-r border-amber-900/20" />
            <div className="absolute right-0 top-0 bottom-0 w-2.5 page-stack-right pointer-events-none border-l border-amber-900/20" />
            <div className="absolute left-0 right-0 bottom-0 h-2 page-stack-bottom pointer-events-none border-t border-amber-900/20" />

            {/* 2-PAGE SPREAD GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 h-full flex-1 divide-y sm:divide-y-0 sm:divide-x divide-amber-900/15 relative px-2">
              
              {/* LEFT PAGE */}
              <div
                onClick={turnPrev}
                className="p-5 sm:p-7 realistic-paper-bg flex flex-col justify-between relative cursor-pointer hover:brightness-[0.98] transition-all group"
              >
                {isFlipping && flipDirection === 'prev'
                  ? renderLeftPage(prevSpreadIndex)
                  : renderLeftPage(activeSpread)}

                <div className="absolute bottom-3 left-4 text-[10px] font-serif text-amber-900/50 group-hover:text-emerald-900 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <ArrowLeft className="w-3 h-3" />
                  <span>Previous Page</span>
                </div>
              </div>

              {/* RIGHT PAGE */}
              <div
                onClick={turnNext}
                className="p-5 sm:p-7 realistic-paper-bg flex flex-col justify-between relative cursor-pointer hover:brightness-[0.98] transition-all group"
              >
                {isFlipping && flipDirection === 'next'
                  ? renderRightPage(nextSpreadIndex)
                  : renderRightPage(activeSpread)}

                <div className="absolute bottom-3 right-4 text-[10px] font-serif text-amber-900/50 group-hover:text-emerald-900 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <span>Next Page</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              {/* DYNAMIC 3D FLIPPING LEAF (NEXT FLIP - Right to Left) */}
              {isFlipping && flipDirection === 'next' && (
                <div className="hidden sm:block absolute top-0 bottom-0 right-0 w-1/2 origin-left transform-style-3d z-30 flipping-leaf-next">
                  {/* Front face of flipping page */}
                  <div className="absolute inset-0 backface-hidden realistic-paper-bg border-r border-amber-900/30 p-5 sm:p-7 flex flex-col justify-between shadow-2xl">
                    {renderRightPage(activeSpread)}
                  </div>

                  {/* Back face of flipping page */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180 realistic-paper-bg border-l border-amber-900/30 p-5 sm:p-7 flex flex-col justify-between shadow-2xl">
                    {renderLeftPage(nextSpreadIndex)}
                  </div>
                </div>
              )}

              {/* DYNAMIC 3D FLIPPING LEAF (PREV FLIP - Left to Right) */}
              {isFlipping && flipDirection === 'prev' && (
                <div className="hidden sm:block absolute top-0 bottom-0 left-0 w-1/2 origin-right transform-style-3d z-30 flipping-leaf-prev">
                  {/* Front face of flipping page */}
                  <div className="absolute inset-0 backface-hidden realistic-paper-bg border-l border-amber-900/30 p-5 sm:p-7 flex flex-col justify-between shadow-2xl">
                    {renderLeftPage(activeSpread)}
                  </div>

                  {/* Back face of flipping page */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180 realistic-paper-bg border-r border-amber-900/30 p-5 sm:p-7 flex flex-col justify-between shadow-2xl">
                    {renderRightPage(prevSpreadIndex)}
                  </div>
                </div>
              )}
            </div>

            {/* MINIMAL CONTROL BAR AT BOTTOM */}
            <div className="px-4 py-2 bg-stone-900/90 backdrop-blur-md border-t border-stone-800 flex items-center justify-between text-xs text-stone-300 z-40">
              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] font-medium border border-stone-700 transition-all"
                title={isAutoPlaying ? 'Pause page auto-flip' : 'Start page auto-flip'}
              >
                {isAutoPlaying ? (
                  <>
                    <Pause className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                    <span>Auto Flipping</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 text-stone-400 fill-stone-400" />
                    <span>Play Flip</span>
                  </>
                )}
              </button>

              {/* Spread Indicator Dots */}
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isFlipping) return;
                      setFlipDirection(idx > activeSpread ? 'next' : 'prev');
                      setIsFlipping(true);
                      setTimeout(() => {
                        setActiveSpread(idx);
                        setIsFlipping(false);
                      }, 700);
                    }}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      activeSpread === idx ? 'bg-emerald-500 w-5' : 'bg-stone-600 hover:bg-stone-500 w-2'
                    }`}
                    aria-label={`Go to page ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Navigation Arrows */}
              <div className="flex items-center gap-1">
                <button
                  onClick={turnPrev}
                  disabled={isFlipping}
                  className="p-1 rounded hover:bg-stone-800 disabled:opacity-40 transition-colors text-stone-300"
                  aria-label="Previous Page"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[10px] text-stone-400 px-1">
                  {activeSpread + 1} / {totalSpreads}
                </span>
                <button
                  onClick={turnNext}
                  disabled={isFlipping}
                  className="p-1 rounded hover:bg-stone-800 disabled:opacity-40 transition-colors text-stone-300"
                  aria-label="Next Page"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlipBookHero;
