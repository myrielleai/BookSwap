import React from 'react';
import { Link } from 'react-router-dom';
import BookCover from './BookCover';

/* ─────────────────────────────────────────────────────────────
   Each genre is shown as its own printed book cover on the shelf
   ───────────────────────────────────────────────────────────── */
const GENRE_STYLES = {
  'Fiction': { palette: 'terracotta', variant: 'classic' },
  'Science Fiction': { palette: 'denim', variant: 'bold' },
  'Mystery': { palette: 'ivory', variant: 'minimal' },
  'Romance': { palette: 'rose', variant: 'arch' },
  'Fantasy': { palette: 'plum', variant: 'classic' },
  'History': { palette: 'mustard', variant: 'band' },
  'Biography': { palette: 'cream', variant: 'stripe' },
  'Self-Help': { palette: 'sky', variant: 'minimal' },
  'Technology': { palette: 'teal', variant: 'bold' },
  'Classics': { palette: 'forest', variant: 'classic' },
  'Poetry': { palette: 'sage', variant: 'arch' },
  'Young Adult': { palette: 'olive', variant: 'stripe' },
};

export const GenreBookCard = ({ genre }) => {
  const style = GENRE_STYLES[genre.name] || { palette: 'cream', variant: 'classic' };

  return (
    <Link
      to={`/browse?genre=${encodeURIComponent(genre.name)}`}
      className="group block relative w-full select-none"
      aria-label={`Browse ${genre.name}`}
    >
      <BookCover
        title={genre.name}
        author="BookSwap Shelf"
        palette={style.palette}
        variant={style.variant}
      />
    </Link>
  );
};

export default GenreBookCard;
