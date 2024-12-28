import React, { useState, useRef, useEffect, RefObject } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';

interface Location {
  value: string;
  label: string;
  description?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (location: Location) => void;
  onSearch: (term: string) => Promise<Location[]>;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const AutocompleteInput: React.FC<Props> = ({
  value,
  onChange,
  onSelect,
  onSearch,
  placeholder = '',
  label = '',
  error = '',
  disabled = false,
  required = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleSearch = async () => {
      if (!value.trim()) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const results = await onSearch(value);
        setSuggestions(results);
        setIsOpen(true);
      } catch (error) {
        console.error('Search failed:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimeout = setTimeout(handleSearch, 300);
    return () => clearTimeout(debounceTimeout);
  }, [value, onSearch]);

  const handleClickOutside = () => {
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  useClickOutside(containerRef as RefObject<HTMLElement>, handleClickOutside);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  const handleSelect = (location: Location) => {
    onSelect(location);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label
          htmlFor="location-input"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          id="location-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => value.trim() && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            error ? 'border-red-500' : ''
          } ${disabled ? 'bg-gray-100' : ''}`}
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent" />
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {suggestions.map((location, index) => (
            <li
              key={location.value}
              className={`relative cursor-pointer select-none py-2 pl-3 pr-9 ${
                index === selectedIndex
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => handleSelect(location)}
            >
              <div className="flex items-center">
                <span className="font-medium">{location.label}</span>
                {location.description && (
                  <span
                    className={`ml-2 truncate text-sm ${
                      index === selectedIndex
                        ? 'text-blue-200'
                        : 'text-gray-500'
                    }`}
                  >
                    {location.description}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
