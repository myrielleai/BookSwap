import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import Dropdown from './Dropdown';

const FilterPanel = ({
  genres = [],
  ageCategories = [],
  conditions = [],
  filters,
  onFilterChange,
  onReset,
}) => {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value, page: 1 });
  };

  const sortOptions = [
    { id: 'newest',    name: 'Newest First' },
    { id: 'oldest',    name: 'Oldest First' },
    { id: 'relevance', name: 'Relevance to Favorite Genres' },
    { id: 'title',     name: 'Title (A-Z)' },
  ];

  return (
    <div className="leather-tan stitched rounded-lg p-5 space-y-4 shadow-[0_14px_30px_-14px_rgba(70,40,15,0.5)] [&_label]:text-leather-900 [&_label]:[text-shadow:0_1px_0_rgba(255,240,215,0.5)]">
      <div className="relative z-[2] flex items-center justify-between pb-3 border-b border-dashed border-amber-50/60">
        <div className="flex items-center gap-2 font-display font-extrabold text-lg emboss-light">
          <Filter className="w-4 h-4 text-amber-50" />
          <span>Filter & Sort Catalog</span>
        </div>
        <button
          onClick={onReset}
          className="btn-pillow px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset All
        </button>
      </div>

      <div className="relative z-[2] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Dropdown
          label="Genre"
          placeholder="All Genres"
          options={genres}
          value={filters.genre_id || ''}
          onChange={(e) => handleChange('genre_id', e.target.value)}
        />

        <Dropdown
          label="Age Category"
          placeholder="All Age Groups"
          options={ageCategories}
          value={filters.age_category_id || ''}
          onChange={(e) => handleChange('age_category_id', e.target.value)}
        />

        <Dropdown
          label="Condition"
          placeholder="All Conditions"
          options={conditions.map(c => ({ id: c.id, name: c.label }))}
          value={filters.condition_id || ''}
          onChange={(e) => handleChange('condition_id', e.target.value)}
        />

        <Dropdown
          label="Sort By"
          placeholder="Default Sort"
          options={sortOptions}
          value={filters.sort || 'newest'}
          onChange={(e) => handleChange('sort', e.target.value)}
        />
      </div>
    </div>
  );
};

export default FilterPanel;
