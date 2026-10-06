import React from 'react';
import { Link } from 'react-router-dom';
import BookCover, { PhotoBookCover, COVER_PALETTES } from './BookCover';

// Placeholder listings use stock photos (not real covers) — show them as printed covers instead
const PLACEHOLDER_COVERS = [
  { palette: 'ivory', variant: 'classic' },
  { palette: 'sage', variant: 'arch' },
  { palette: 'terracotta', variant: 'bold' },
  { palette: 'denim', variant: 'minimal' },
  { palette: 'mustard', variant: 'band' },
  { palette: 'plum', variant: 'stripe' },
];

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600';

const placeholderStyle = (id) => {
  const n = parseInt(String(id).replace('dummy-', ''), 10) || 1;
  return PLACEHOLDER_COVERS[(n - 1) % PLACEHOLDER_COVERS.length];
};

/* Front cover for a listing — uploaded photo, or a printed cover for placeholders */
export const ListingCover = ({ listing }) => {
  const { id, title, author, cover_photo_path, cover_photo, cover_photo_id } = listing;

  if (String(id).startsWith('dummy-')) {
    return <BookCover title={title} author={author} {...placeholderStyle(id)} />;
  }

  const rawPhoto = cover_photo_path || cover_photo || (cover_photo_id ? `/api/photos/${cover_photo_id}` : null);
  const photoUrl = rawPhoto
    ? (rawPhoto.startsWith('http') || rawPhoto.startsWith('/') ? rawPhoto : `/${rawPhoto}`)
    : FALLBACK_COVER;

  return <PhotoBookCover src={photoUrl} alt={title} fallback={FALLBACK_COVER} />;
};

/* A closed physical book: back board + page edges + front cover */
export const ClosedBook = ({ backColor = '#8c7458', children, className = '' }) => (
  <div className={`closed-book ${className}`}>
    <div className="closed-book__back" style={{ background: backColor }} />
    <div className="closed-book__edge-b" />
    <div className="closed-book__edge-r" />
    <div className="relative">{children}</div>
  </div>
);

const backFor = (listing) =>
  String(listing.id).startsWith('dummy-')
    ? (COVER_PALETTES[placeholderStyle(listing.id).palette] || {}).bg
    : '#8c7458';

/* ─────────────────────────────────────────────────────────────
   HERO — recently verified books tossed casually on the desk
   ───────────────────────────────────────────────────────────── */
const PILE_LAYOUTS = {
  1: [{ left: '34%', top: '6%', w: '32%', rot: -4, z: 1 }],
  2: [
    { left: '18%', top: '10%', w: '30%', rot: -9, z: 1 },
    { left: '48%', top: '4%', w: '31%', rot: 6, z: 2 },
  ],
  3: [
    { left: '6%', top: '16%', w: '28%', rot: -11, z: 1 },
    { left: '35%', top: '3%', w: '30%', rot: 2, z: 3 },
    { left: '64%', top: '19%', w: '27%', rot: 12, z: 2 },
  ],
  4: [
    { left: '3%', top: '20%', w: '25%', rot: -13, z: 1 },
    { left: '25%', top: '4%', w: '26%', rot: -3, z: 3 },
    { left: '49%', top: '15%', w: '25%', rot: 7, z: 4 },
    { left: '71%', top: '3%', w: '25%', rot: 14, z: 2 },
  ],
  5: [
    { left: '1%', top: '22%', w: '22%', rot: -14, z: 1 },
    { left: '19%', top: '3%', w: '23%', rot: -5, z: 3 },
    { left: '39%', top: '20%', w: '22%', rot: 4, z: 5 },
    { left: '58%', top: '2%', w: '22%', rot: -2, z: 2 },
    { left: '76%', top: '18%', w: '22%', rot: 13, z: 4 },
  ],
  6: [
    { left: '0%', top: '24%', w: '20%', rot: -15, z: 1 },
    { left: '15%', top: '2%', w: '21%', rot: -6, z: 3 },
    { left: '33%', top: '22%', w: '20%', rot: 5, z: 5 },
    { left: '50%', top: '1%', w: '21%', rot: -2, z: 2 },
    { left: '66%', top: '20%', w: '20%', rot: 9, z: 6 },
    { left: '80%', top: '3%', w: '19%', rot: 16, z: 4 },
  ],
};

export const HeroBookPile = ({ books, loading }) => {
  const shown = books.slice(0, 3);
  const layout = PILE_LAYOUTS[shown.length] || [];

  return (
    <div className="relative w-full">
      {/* Leather bookmark label */}
      <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
        <span className="leather-caramel stitched stitched-sm inline-flex items-center gap-2 px-4 py-1.5 rounded-md shadow-sm">
          <span className="relative z-[2] w-1.5 h-1.5 rounded-full bg-moss-300 shadow-[0_0_0_2px_rgba(255,255,255,0.25)]" />
          <span className="relative z-[2] emboss-light text-[11px] font-bold tracking-[0.18em] uppercase">Recently verified</span>
        </span>
        <span className="font-hand text-xl text-moss-700">fresh on the shelf ↓</span>
      </div>

      <div className="relative w-full aspect-[16/9.5] sm:aspect-[16/10]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="paper px-4 py-2 rounded-md font-hand text-xl text-leather-700 rotate-[-2deg]">
              Pulling books off the shelf…
            </span>
          </div>
        ) : shown.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="paper px-4 py-2 rounded-md font-hand text-xl text-leather-700 rotate-[-2deg]">
              The shelf is empty — be the first to list a book!
            </span>
          </div>
        ) : (
          shown.map((book, i) => {
            const pos = layout[i];
            return (
              <Link
                key={book.id}
                to={`/listings/${book.id}`}
                className="pile-book block"
                style={{ left: pos.left, top: pos.top, width: pos.w, zIndex: pos.z, '--rot': `${pos.rot}deg` }}
                aria-label={`${book.title} by ${book.author}`}
              >
                <ClosedBook backColor={backFor(book)}>
                  <ListingCover listing={book} />
                </ClosedBook>

                {/* Paper tag on hover */}
                <span className="pile-tag paper absolute left-1/2 top-[102%] mt-3 w-max max-w-[180px] px-3 py-1.5 rounded-md text-center pointer-events-none">
                  <span className="block font-display font-extrabold text-xs text-stone-900 leading-tight truncate">{book.title}</span>
                  <span className="block text-[10px] text-stone-500 truncate">by {book.author}</span>
                  <span className="pill-moss inline-block mt-1 px-1.5 py-px rounded text-[9px] font-bold">
                    {book.condition_label || book.condition_name || 'Good'}
                  </span>
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

/* Big stitched leather patch — "STEP 1" */
export const StepTag = ({ n }) => (
  <span className="leather-caramel stitched inline-flex flex-col items-center justify-center w-[88px] h-[88px] rounded-xl shadow-[0_8px_18px_-8px_rgba(70,40,15,0.6)]" style={{ '--stitch-radius': '7px' }}>
    <span className="relative z-[2] emboss-light text-[10px] font-bold tracking-[0.3em] uppercase pl-[0.3em]">Step</span>
    <span className="relative z-[2] emboss-light font-display font-extrabold text-5xl leading-none">{n}</span>
  </span>
);

/* Leather card, stitched all the way around, with a paper panel inside */
export const StitchedCard = ({ label, badge, children }) => (
  <div
    className="leather-tan stitched rounded-lg p-2.5 hover-lift shadow-[0_14px_30px_-14px_rgba(70,40,15,0.5)]"
    style={{ '--stitch-radius': '5px', '--stitch-inset': '5px' }}
  >
    <div className="relative z-[2] flex items-center justify-between px-3 pt-2 pb-2.5">
      <span className="text-sm font-bold emboss-light tracking-wide">{label}</span>
      {badge && <span className="pill-moss px-2.5 py-0.5 rounded text-[11px] font-bold">{badge}</span>}
    </div>
    <div className="paper relative z-[2] rounded p-4 sm:p-5">{children}</div>
  </div>
);

/* A listing standing on a maple shelf plank, with a small caption below */
export const ShelfBook = ({ listing }) => {
  const { id, title, author, condition_label, condition_name } = listing;

  return (
    <Link to={`/listings/${id}`} className="group flex flex-col">
      <div className="px-3 sm:px-4 relative z-10">
        <ListingCover listing={listing} />
      </div>
      <div className="wood-plank -mt-1" />
      <div className="px-3 sm:px-4 pt-3 text-center">
        <h3 className="font-display font-extrabold text-sm text-stone-900 leading-snug line-clamp-1 group-hover:text-moss-700 transition-colors">
          {title}
        </h3>
        <p className="text-[11px] text-stone-500 line-clamp-1">by {author}</p>
        <span className="pill-moss inline-block mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold">
          {condition_label || condition_name || 'Good'}
        </span>
      </div>
    </Link>
  );
};
