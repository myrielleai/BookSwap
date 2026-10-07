import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, MapPin, User, Sparkles, ArrowRightLeft } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { getPhotoUrl } from '../services/api';
import { ListingCoverArt } from './BookCover';

const BookCard = ({ listing, onQuickSwap, showActions = true }) => {
  const {
    id,
    title,
    author,
    genre_name,
    condition_label,
    condition_name,
    status,
    owner_name,
    city,
    is_open_offer,
    preferred_return,
    cover_photo_path,
    cover_photo,
    cover_photo_id,
  } = listing;

  const photoUrl = getPhotoUrl(cover_photo_path || cover_photo, cover_photo_id);

  const conditionText = condition_label || condition_name || 'Good';

  return (
    <div className="shelf-book group flex flex-col h-full">
      {/* The book itself, standing on the shelf */}
      <div className="relative px-[14%] pt-3">
        <div className="book-cover relative z-[1]">
          <ListingCoverArt title={title} author={author} photoUrl={photoUrl} seed={listing.id} />

          {/* Status sticker on the cover */}
          <div className="absolute top-2 right-2 z-[5]">
            <StatusBadge status={status} />
          </div>

          {/* Open Offer sticker */}
          {is_open_offer === 1 && (
            <div className="absolute bottom-2 left-[12%] z-[5] leather-caramel emboss-light text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md -rotate-3">
              <Sparkles className="w-3 h-3 text-moss-200" />
              <span>Open Offer</span>
            </div>
          )}
        </div>
      </div>

      {/* Shelf plank (one plank per row is drawn across the whole shelf — see .shelf-book__plank) */}
      <div className="shelf-book__plank wood-plank relative -mt-1" />

      {/* Details printed straight under the book — no card */}
      <div className="flex-1 flex flex-col items-center text-center px-2 pt-3">
        <p className="w-full h-[15px] text-[10px] font-bold uppercase tracking-[0.14em] text-moss-700 truncate">
          {genre_name || 'General'} <span className="text-leather-400">·</span> {conditionText}
        </p>
        <h3 className="mt-1 h-[40px] flex items-center justify-center font-display font-extrabold text-stone-900 text-[15px] leading-[20px] group-hover:text-moss-700 transition-colors" title={title}>
          <span className="line-clamp-2">
          {title}</span>
        </h3>
        <p className="w-full text-xs text-stone-500 truncate">by {author}</p>
        {/* What the owner wants — full text opens in a paper note on hover / tap */}
        <span tabIndex={0} className="wants-note relative mt-1 w-full outline-none cursor-help">
          <span className="block font-hand text-[17px] leading-tight text-leather-700 truncate">
            {preferred_return ? `Wants: ${preferred_return}` : 'Open to any book swap'}
          </span>
          <span className="wants-note__full paper-lined" role="tooltip">
            {preferred_return ? `Wants: ${preferred_return}` : 'Open to any book swap'}
          </span>
        </span>
        {(owner_name || city) && (
          <p className="mt-1 text-[11px] text-stone-400 flex items-center gap-1">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[110px]">{owner_name}</span>
            {city && (
              <>
                <MapPin className="w-3 h-3 ml-1" />
                <span>{city}</span>
              </>
            )}
          </p>
        )}

        {showActions && (
          <div className="mt-auto pt-3 flex items-center justify-center gap-2">
            <Link
              to={`/listings/${id}`}
              className="btn-pillow py-1.5 px-3 font-semibold text-xs rounded-lg flex items-center gap-1"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Details
            </Link>
            {status === 'available' && onQuickSwap ? (
              <button
                onClick={() => onQuickSwap(listing)}
                className="btn-moss py-1.5 px-3 font-semibold text-xs rounded-lg flex items-center gap-1"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Swap
              </button>
            ) : (
              <Link
                to={`/listings/${id}`}
                className="btn-leather py-1.5 px-3 font-semibold text-xs rounded-lg flex items-center gap-1"
              >
                View
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookCard;
