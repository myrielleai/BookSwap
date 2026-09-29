import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   SIMPLE GENRE BOOK CONFIGURATION (NO EMOJIS)
   Clean, muted pastels & minimal spine accents for each genre
   ───────────────────────────────────────────────────────────── */
const GENRE_STYLES = {
  'Fiction': {
    coverBg: 'bg-emerald-50/90 hover:bg-emerald-100/90',
    border: 'border-emerald-200/90',
    spine: 'bg-emerald-700',
    text: 'text-emerald-950',
    subtext: 'text-emerald-800/70',
  },
  'Science Fiction': {
    coverBg: 'bg-sky-50/90 hover:bg-sky-100/90',
    border: 'border-sky-200/90',
    spine: 'bg-sky-700',
    text: 'text-sky-950',
    subtext: 'text-sky-800/70',
  },
  'Mystery': {
    coverBg: 'bg-stone-100/90 hover:bg-stone-200/80',
    border: 'border-stone-300/80',
    spine: 'bg-stone-700',
    text: 'text-stone-900',
    subtext: 'text-stone-600',
  },
  'Romance': {
    coverBg: 'bg-rose-50/90 hover:bg-rose-100/90',
    border: 'border-rose-200/90',
    spine: 'bg-rose-600',
    text: 'text-rose-950',
    subtext: 'text-rose-800/70',
  },
  'Fantasy': {
    coverBg: 'bg-purple-50/90 hover:bg-purple-100/90',
    border: 'border-purple-200/90',
    spine: 'bg-purple-700',
    text: 'text-purple-950',
    subtext: 'text-purple-800/70',
  },
  'History': {
    coverBg: 'bg-amber-50/90 hover:bg-amber-100/90',
    border: 'border-amber-200/90',
    spine: 'bg-amber-700',
    text: 'text-amber-950',
    subtext: 'text-amber-800/70',
  },
  'Biography': {
    coverBg: 'bg-blue-50/90 hover:bg-blue-100/90',
    border: 'border-blue-200/90',
    spine: 'bg-blue-700',
    text: 'text-blue-950',
    subtext: 'text-blue-800/70',
  },
  'Self-Help': {
    coverBg: 'bg-teal-50/90 hover:bg-teal-100/90',
    border: 'border-teal-200/90',
    spine: 'bg-teal-700',
    text: 'text-teal-950',
    subtext: 'text-teal-800/70',
  },
  'Technology': {
    coverBg: 'bg-slate-100/90 hover:bg-slate-200/90',
    border: 'border-slate-300/90',
    spine: 'bg-slate-700',
    text: 'text-slate-900',
    subtext: 'text-slate-600',
  },
  'Classics': {
    coverBg: 'bg-orange-50/90 hover:bg-orange-100/90',
    border: 'border-orange-200/90',
    spine: 'bg-orange-700',
    text: 'text-orange-950',
    subtext: 'text-orange-800/70',
  },
  'Poetry': {
    coverBg: 'bg-violet-50/90 hover:bg-violet-100/90',
    border: 'border-violet-200/90',
    spine: 'bg-violet-700',
    text: 'text-violet-950',
    subtext: 'text-violet-800/70',
  },
  'Young Adult': {
    coverBg: 'bg-pink-50/90 hover:bg-pink-100/90',
    border: 'border-pink-200/90',
    spine: 'bg-pink-600',
    text: 'text-pink-950',
    subtext: 'text-pink-800/70',
  },
};

export const GenreBookCard = ({ genre }) => {
  const style = GENRE_STYLES[genre.name] || {
    coverBg: 'bg-stone-50 hover:bg-stone-100',
    border: 'border-stone-200',
    spine: 'bg-stone-600',
    text: 'text-stone-900',
    subtext: 'text-stone-500',
  };

  return (
    <Link
      to={`/browse?genre=${encodeURIComponent(genre.name)}`}
      className="group block relative w-full select-none"
    >
      {/* SIMPLE ELEGANT BOOK COVER */}
      <div className={`relative w-full h-[165px] sm:h-[180px] ${style.coverBg} border ${style.border} rounded-r-lg rounded-l-sm flex flex-col justify-between p-4 transition-all duration-300 shadow-xs hover:shadow-md hover:-translate-y-1`}>
        
        {/* SPINE ACCENT STRIP */}
        <div className={`absolute top-0 bottom-0 left-0 w-3 ${style.spine} rounded-l-sm shadow-inner`} />
        
        {/* Soft spine crease shadow */}
        <div className="absolute top-0 bottom-0 left-3 w-1.5 bg-gradient-to-r from-black/10 to-transparent pointer-events-none" />

        {/* TOP HEADER: Minimal Book Icon & Label */}
        <div className="pl-2 flex items-center justify-between">
          <BookOpen className={`w-3.5 h-3.5 ${style.subtext}`} />
          <span className={`text-[9px] font-serif uppercase tracking-widest ${style.subtext} font-semibold`}>
            Genre
          </span>
        </div>

        {/* CENTER / TITLE SECTION */}
        <div className="pl-2 space-y-1.5 my-auto py-1">
          <div className={`w-5 h-0.5 ${style.spine} opacity-50`} />
          <h3 className={`text-base sm:text-lg font-serif font-bold ${style.text} leading-tight group-hover:underline decoration-1 underline-offset-2`}>
            {genre.name}
          </h3>
        </div>

        {/* BOTTOM FOOTER */}
        <div className="pl-2 flex items-center justify-between border-t border-black/5 pt-2">
          <span className={`text-[10px] font-serif italic ${style.subtext}`}>
            Browse
          </span>
          <ArrowRight className={`w-3 h-3 ${style.subtext} group-hover:translate-x-1 transition-transform`} />
        </div>
      </div>
    </Link>
  );
};

export default GenreBookCard;
