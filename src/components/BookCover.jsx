import React, { useState } from 'react';

/* ─────────────────────────────────────────────────────────────
   Realistic printed book covers, drawn in CSS.
   Text scales with the cover width (container query units).
   ───────────────────────────────────────────────────────────── */
export const COVER_PALETTES = {
  sage: { bg: '#8fa98a', fg: '#fffaf0', accent: '#f1dfb8' },
  terracotta: { bg: '#c8734f', fg: '#fff4e6', accent: '#f6d6a8' },
  denim: { bg: '#4f6f92', fg: '#f6e7c8', accent: '#e8b86a' },
  mustard: { bg: '#d9a83f', fg: '#3b2a14', accent: '#fff3d6' },
  cream: { bg: '#f1e6d0', fg: '#5a3b22', accent: '#b4573a' },
  rose: { bg: '#cf9a94', fg: '#fff7f0', accent: '#7c3f3a' },
  teal: { bg: '#4f8a8b', fg: '#fdf3e1', accent: '#f2c879' },
  plum: { bg: '#8a6587', fg: '#f9ecdc', accent: '#f0c9a0' },
  olive: { bg: '#a3a061', fg: '#fffbe8', accent: '#5a5228' },
  sky: { bg: '#a7cadb', fg: '#23415a', accent: '#f7f1e3' },
  ivory: { bg: '#faf3e3', fg: '#2d2a26', accent: '#c0392b' },
  forest: { bg: '#5c876a', fg: '#f5ead3', accent: '#e9c46a' },
};

const fs = (n) => ({ fontSize: `${n}cqw` });

// Palette + layout pairs used for generated covers. Every pair keeps the title readable.
const GENERATED_STYLES = [
  { palette: 'ivory', variant: 'classic' },
  { palette: 'sage', variant: 'arch' },
  { palette: 'terracotta', variant: 'bold' },
  { palette: 'denim', variant: 'minimal' },
  { palette: 'mustard', variant: 'band' },
  { palette: 'plum', variant: 'stripe' },
  { palette: 'forest', variant: 'classic' },
  { palette: 'teal', variant: 'bold' },
  { palette: 'rose', variant: 'minimal' },
  { palette: 'cream', variant: 'arch' },
  { palette: 'olive', variant: 'stripe' },
  { palette: 'sky', variant: 'band' },
];

// Same book, same cover: the style is picked from a stable hash of the seed (listing id or title).
export const coverStyleFor = (seed) => {
  const text = String(seed ?? '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return GENERATED_STYLES[hash % GENERATED_STYLES.length];
};

// The printed design alone, filling whatever .book-cover box it is placed in.
export const CoverDesign = ({ title, author, palette = 'cream', variant = 'classic' }) => {
  const p = COVER_PALETTES[palette] || COVER_PALETTES.cream;

  const designs = {
    // Thin inset frame, centred serif title — classic hardback dust jacket
    classic: (
      <div className="absolute inset-[7%] flex flex-col items-center justify-between text-center py-[10%] px-[6%]" style={{ border: `1px solid ${p.accent}`, color: p.fg }}>
        <span className="uppercase tracking-[0.2em] font-sans font-semibold opacity-80" style={fs(5.5)}>A Novel</span>
        <div className="space-y-[6cqw]">
          <h4 className="font-display font-extrabold leading-[1.05]" style={fs(14)}>{title}</h4>
          <div className="mx-auto h-px w-[30%]" style={{ background: p.accent }} />
        </div>
        <span className="font-display italic" style={fs(7.5)}>{author}</span>
      </div>
    ),
    // Wide colour band across the middle
    band: (
      <div className="absolute inset-0 flex flex-col" style={{ color: p.fg }}>
        <div className="flex-1" />
        <div className="px-[10%] py-[9%]" style={{ background: p.accent, color: p.bg }}>
          <h4 className="font-condensed uppercase leading-[0.95] tracking-wide" style={fs(15)}>{title}</h4>
        </div>
        <div className="flex-1 flex items-end px-[10%] pb-[9%]">
          <span className="uppercase tracking-[0.15em] font-sans font-semibold" style={fs(6.5)}>{author}</span>
        </div>
      </div>
    ),
    // Huge stacked type, paperback style
    bold: (
      <div className="absolute inset-0 flex flex-col justify-between p-[11%]" style={{ color: p.fg }}>
        <span className="uppercase font-condensed tracking-wider" style={{ ...fs(7.5), color: p.accent }}>{author}</span>
        <h4 className="font-condensed uppercase leading-[0.9] [overflow-wrap:anywhere]" style={fs(15.5)}>{title}</h4>
        <div className="h-[3cqw] w-[40%]" style={{ background: p.accent }} />
      </div>
    ),
    // Sun/circle motif, light literary cover
    minimal: (
      <div className="absolute inset-0 flex flex-col items-center text-center p-[11%]" style={{ color: p.fg }}>
        <div className="mt-[6%] rounded-full" style={{ width: '46%', aspectRatio: '1', background: p.accent, opacity: 0.9 }} />
        <h4 className="mt-auto font-display italic font-semibold leading-tight" style={fs(13)}>{title}</h4>
        <span className="mt-[5cqw] uppercase tracking-[0.2em] font-sans" style={fs(5.5)}>{author}</span>
      </div>
    ),
    // Diagonal stripes on the top half
    stripe: (
      <div className="absolute inset-0 flex flex-col" style={{ color: p.fg }}>
        <div className="h-[48%]" style={{ background: `repeating-linear-gradient(135deg, ${p.accent} 0 6cqw, transparent 6cqw 12cqw)`, opacity: 0.85 }} />
        <div className="flex-1 flex flex-col justify-between p-[10%]">
          <h4 className="font-display font-extrabold leading-[1.05]" style={fs(13.5)}>{title}</h4>
          <span className="font-sans font-semibold uppercase tracking-[0.15em]" style={fs(6)}>{author}</span>
        </div>
      </div>
    ),
    // Arched window illustration
    arch: (
      <div className="absolute inset-0 flex flex-col items-center text-center p-[10%]" style={{ color: p.fg }}>
        <div className="w-[62%] mt-[2%] rounded-t-full" style={{ aspectRatio: '3 / 3.4', background: `linear-gradient(180deg, ${p.accent} 0%, ${p.accent} 55%, ${p.fg} 55%, ${p.fg} 60%, ${p.accent} 60%)`, opacity: 0.9 }} />
        <h4 className="mt-auto font-display font-extrabold leading-[1.05]" style={fs(12.5)}>{title}</h4>
        <span className="mt-[4cqw] font-display italic" style={fs(7)}>{author}</span>
      </div>
    ),
  };

  return (
    <div className="absolute inset-0" style={{ background: p.bg }}>
      {designs[variant] || designs.classic}
    </div>
  );
};

export const BookCover = ({ title, author, palette = 'cream', variant = 'classic', className = '' }) => (
  <div className={`book-cover ${className}`}>
    <CoverDesign title={title} author={author} palette={palette} variant={variant} />
  </div>
);

/*
 * Cover art for a listing, placed inside a .book-cover box: the uploaded photo
 * when there is one, otherwise (or if it fails to load) a printed cover showing
 * the book's own title and author.
 */
export const ListingCoverArt = ({ title, author, photoUrl, seed }) => {
  const [failedUrl, setFailedUrl] = useState(null);

  if (photoUrl && failedUrl !== photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover"
        onError={() => setFailedUrl(photoUrl)}
      />
    );
  }
  return <CoverDesign title={title} author={author} {...coverStyleFor(seed ?? title)} />;
};

/* A real uploaded photo, dressed as a physical cover (spine hinge + gloss). */
export const PhotoBookCover = ({ src, alt, fallback, className = '' }) => (
  <div className={`book-cover bg-stone-200 ${className}`}>
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 w-full h-full object-cover"
      onError={(e) => {
        if (fallback) e.target.src = fallback;
      }}
    />
  </div>
);

export default BookCover;
