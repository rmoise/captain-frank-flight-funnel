'use client';

import React from 'react';
import { AutocompleteInput } from './AutocompleteInput';
import { useTranslation } from '@/hooks/useTranslation';

interface SalutationOption {
  value: string;
  label: string;
  description: string;
}

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
  const { t } = useTranslation();

  const SALUTATION_OPTIONS: SalutationOption[] = [
    {
      value: 'herr',
      label: t.salutation.mr,
      description: t.salutation.mr,
    },
    {
      value: 'frau',
      label: t.salutation.mrs,
      description: t.salutation.mrs,
    },
  ];

  const handleSearch = async (term: string): Promise<SalutationOption[]> => {
    return SALUTATION_OPTIONS.filter((option) =>
      option.label.toLowerCase().includes(term.toLowerCase())
    );
  };

  return (
    <AutocompleteInput
      label={t.salutation.label}
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
