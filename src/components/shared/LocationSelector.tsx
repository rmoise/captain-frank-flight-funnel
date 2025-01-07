'use client';

import React from 'react';
import { Input } from '@/components/Input';

interface LocationSelectorProps {
  fromLocation: string;
  toLocation: string;
  onFromLocationChange: (value: string | null) => void;
  onToLocationChange: (value: string | null) => void;
  onFocusInput: (input: 'from' | 'to') => void;
  onBlurInput: () => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  fromLocation,
  toLocation,
  onFromLocationChange,
  onToLocationChange,
  onFocusInput,
  onBlurInput,
}) => {
  return (
    <div className="space-y-4">
      <Input
        label="From"
        value={fromLocation}
        onChange={(value) => onFromLocationChange(value)}
        onFocus={() => onFocusInput('from')}
        onBlur={onBlurInput}
        placeholder="Enter departure city or airport"
        required={true}
      />
      <Input
        label="To"
        value={toLocation}
        onChange={(value) => onToLocationChange(value)}
        onFocus={() => onFocusInput('to')}
        onBlur={onBlurInput}
        placeholder="Enter arrival city or airport"
        required={true}
      />
    </div>
  );
};
