import React from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  onToggleFilters?: () => void;
  filtersActive?: boolean;
  activeFilterChips?: { label: string; onRemove: () => void }[];
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch, placeholder = 'Pretraži zapise...', onToggleFilters, filtersActive, activeFilterChips = [],
}) => {
  const [query, setQuery] = React.useState('');

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    if (newQuery.trim() === '') onSearch('');
  };

  return (
    <div className="mb-4">
      <form onSubmit={handleSearch} className="w-full">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder={placeholder}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {onToggleFilters && (
            <button
              type="button"
              onClick={onToggleFilters}
              className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${
                filtersActive
                  ? 'border-brand-200 bg-brand-50 text-brand-600'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filteri
            </button>
          )}
        </div>
      </form>

      {/* Active filter chips */}
      {activeFilterChips.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {activeFilterChips.map((chip, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 py-1 pl-3 pr-1.5 text-xs font-medium text-brand-700 animate-fade-in"
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className="flex h-4 w-4 items-center justify-center rounded-full text-brand-500 transition hover:bg-brand-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
