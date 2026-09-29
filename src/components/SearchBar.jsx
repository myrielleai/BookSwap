import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

const SearchBar = ({ onSearch, initialValue = '', placeholder = 'Search by title, author, or keyword...' }) => {
  const [query, setQuery] = useState(initialValue);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          maxLength={100}
          className="block w-full pl-10 pr-24 py-3 bg-white border border-stone-300 rounded-xl text-sm placeholder-stone-400 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 shadow-sm transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-20 text-stone-400 hover:text-stone-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="submit"
          className="absolute right-2 px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-amber-50 text-xs font-semibold rounded-lg transition-colors shadow-sm"
        >
          Search
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
