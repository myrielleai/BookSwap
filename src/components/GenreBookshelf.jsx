import React from 'react';
import GenreBookCard from './GenreBookCard';

export const GenreBookshelf = ({ genres }) => {
  return (
    <div className="w-full">
      {/* Books standing on light maple shelves — each cell carries its own plank piece so rows join seamlessly */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-y-10">
        {genres.map((genre) => (
          <div key={genre.name} className="flex flex-col">
            <div className="px-3 sm:px-4 pb-0 relative z-10">
              <GenreBookCard genre={genre} />
            </div>
            <div className="wood-plank -mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default GenreBookshelf;
