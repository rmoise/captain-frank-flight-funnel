'use client';

import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

interface Location {
  value: string;
  label: string;
  description?: string;
  city?: string;
  name?: string;
}

interface AutocompleteInputProps {
  label: string;
  value: Location | null;
  onChange: (location: Location | null) => void;
  placeholder?: string;
  error?: string;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Location[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = async () => {
    try {
      const response = await fetch(
        `/api/searchairportsbyterm?term=${searchTerm}`
      );
      const data = await response.json();
      setResults(data);
      setIsOpen(true);
    } catch (error) {
      console.error('Error searching airports:', error);
    }
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1">
        <input
          ref={inputRef}
          type="text"
          value={value?.label || searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onChange(null);
          }}
          onFocus={() => {
            setIsOpen(true);
            handleSearch();
          }}
          placeholder={placeholder}
          className={clsx(
            'block w-full rounded-md border-gray-300 shadow-sm focus:border-[#F54538] focus:ring-[#F54538] sm:text-sm',
            error && 'border-red-500'
          )}
        />
      </div>
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg"
        >
          <ul className="max-h-60 overflow-auto rounded-md py-1 text-base">
            {results.map((result) => (
              <li
                key={result.value}
                className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                onClick={() => {
                  onChange(result);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              >
                <div className="font-medium">{result.label}</div>
                {result.description && (
                  <div className="text-sm text-gray-500">
                    {result.description}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};
