import React from 'react';
import { AutocompleteInput } from '@/components/AutocompleteInput';

export interface LocationOption {
  value: string;
  label: string;
}

interface LocationSelectorProps {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  label,
  value,
  onChange,
  onFocus = () => {},
  onBlur = () => {},
  placeholder = 'Select location',
  error,
}) => {
  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
          error ? 'border-red-300' : ''
        }`}
      />
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};