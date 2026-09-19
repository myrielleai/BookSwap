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
    { id: 'created_at_desc', name: 'Newest First' },
    { id: 'created_at_asc', name: 'Oldest First' },
    { id: 'relevance', name: 'Relevance to Favorite Genres' },
    { id: 'title_asc', name: 'Title (A-Z)' },
  ];

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
          <Filter className="w-4 h-4 text-brand-600" />
          <span>Filter & Sort Catalog</span>
        </div>
        <button
          onClick={onReset}
          className="text-xs font-medium text-slate-500 hover:text-brand-600 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset All
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          value={filters.sort || 'created_at_desc'}
          onChange={(e) => handleChange('sort', e.target.value)}
        />
      </div>
    </div>
  );
};

export default FilterPanel;
