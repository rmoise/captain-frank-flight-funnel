'use client';

import React from 'react';
import { AutocompleteInput } from './AutocompleteInput';

interface SalutationOption {
  value: string;
  label: string;
  description: string;
}

const SALUTATION_OPTIONS: SalutationOption[] = [
  { value: 'herr', label: 'Mr.', description: 'Mister' },
  { value: 'frau', label: 'Mrs./Ms.', description: 'Misses/Miss' },
];

interface SalutationSelectProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: (value: string) => void;
  error?: string;
}

export const SalutationSelect: React.FC<SalutationSelectProps> = ({
  value,
  onChange,
  onBlur,
  error,
}) => {
  const handleSearch = async (term: string): Promise<SalutationOption[]> => {
    return SALUTATION_OPTIONS.filter((option) =>
      option.label.toLowerCase().includes(term.toLowerCase())
    );
  };

  return (
    <AutocompleteInput
      label="Salutation"
      value={{ value, label: value, description: '' }}
      onSearch={handleSearch}
      onChange={(option) => {
        if (option) {
          onChange(option.value);
        }
      }}
      onBlur={() => onBlur(value)}
      error={error}
      required
    />
  );
};
