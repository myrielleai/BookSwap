import React from 'react';
import GenreBookCard from './GenreBookCard';

export const GenreBookshelf = ({ genres }) => {
  return (
    <div className="w-full">
      {/* Clean Grid of Simple Book Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {genres.map((genre) => (
          <GenreBookCard key={genre.name} genre={genre} />
        ))}
      </div>
    </div>
  );
};

export default GenreBookshelf;
