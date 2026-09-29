import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, MapPin, User, Sparkles, ArrowRightLeft } from 'lucide-react';
import StatusBadge from './StatusBadge';

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
  } = listing;

  const photoUrl = cover_photo_path
    ? (cover_photo_path.startsWith('http') ? cover_photo_path : `/${cover_photo_path}`)
    : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600';

  const conditionText = condition_label || condition_name || 'Good';

  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-800/30 transition-all duration-300 flex flex-col group">
      {/* Cover Image Header */}
      <div className="relative aspect-[3/4] bg-stone-100 overflow-hidden">
        <img
          src={photoUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600';
          }}
        />

        {/* Status Badge */}
        <div className="absolute top-3 right-3 z-10">
          <StatusBadge status={status} />
        </div>

        {/* Open Offer Tag */}
        {is_open_offer === 1 && (
          <div className="absolute top-3 left-3 bg-emerald-800 text-amber-50 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
            <Sparkles className="w-3 h-3 text-amber-200" />
            <span>Open Offer</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
          <p className="text-amber-50 text-xs line-clamp-2">
            {preferred_return ? `Wants: ${preferred_return}` : 'Open to any book swap'}
          </p>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Genre & Condition */}
          <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
            <span className="font-semibold text-emerald-900 bg-emerald-900/10 px-2 py-0.5 rounded-md border border-emerald-900/20">
              {genre_name || 'General'}
            </span>
            <span className="text-stone-500 font-medium">{conditionText}</span>
          </div>

          {/* Book Title & Author */}
          <h3 className="font-bold text-stone-900 text-base leading-snug line-clamp-1 group-hover:text-emerald-800 transition-colors">
            {title}
          </h3>
          <p className="text-xs text-stone-500 font-medium mb-3">by {author}</p>
        </div>

        {/* Owner Info & Footer */}
        <div className="pt-3 border-t border-stone-100 space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-500">
            {owner_name && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-stone-400" />
                <span className="truncate max-w-[100px]">{owner_name}</span>
              </span>
            )}
            {city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                <span>{city}</span>
              </span>
            )}
          </div>

          {showActions && (
            <div className="grid grid-cols-2 gap-2">
              <Link
                to={`/listings/${id}`}
                className="w-full py-2 px-3 bg-stone-100 hover:bg-stone-200/80 text-stone-700 font-semibold text-xs rounded-lg text-center transition-colors flex items-center justify-center gap-1"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Details
              </Link>
              {status === 'available' && onQuickSwap ? (
                <button
                  onClick={() => onQuickSwap(listing)}
                  className="w-full py-2 px-3 bg-emerald-800 hover:bg-emerald-700 text-amber-50 font-semibold text-xs rounded-lg text-center transition-colors flex items-center justify-center gap-1 shadow-sm"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-200" />
                  Swap
                </button>
              ) : (
                <Link
                  to={`/listings/${id}`}
                  className="w-full py-2 px-3 bg-stone-800 hover:bg-stone-900 text-amber-50 font-semibold text-xs rounded-lg text-center transition-colors flex items-center justify-center gap-1"
                >
                  View
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookCard;
