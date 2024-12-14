import React from 'react';
import { AutocompleteInput } from '@/components/AutocompleteInput';

export interface LocationOption {
  value: string;
  label: string;
}

interface LocationSelectorProps {
  fromLocation: string;
  toLocation: string;
  locationOptions: LocationOption[];
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onFocusInput: (input: 'from' | 'to') => void;
  onBlurInput: () => void;
  focusedInput: 'from' | 'to' | null;
  className?: string;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  fromLocation,
  toLocation,
  locationOptions,
  onFromLocationChange,
  onToLocationChange,
  onFocusInput,
  onBlurInput,
  focusedInput,
  className = '',
}) => {
  return (
    <div className={`flex space-x-4 ${className}`}>
      <AutocompleteInput
        label="From *"
        value={fromLocation}
        options={locationOptions}
        onChange={onFromLocationChange}
        onFocus={() => onFocusInput('from')}
        onBlur={onBlurInput}
        isFocused={focusedInput === 'from'}
        className="flex-1"
        iconType="from"
      />
      <AutocompleteInput
        label="To *"
        value={toLocation}
        options={locationOptions}
        onChange={onToLocationChange}
        onFocus={() => onFocusInput('to')}
        onBlur={onBlurInput}
        isFocused={focusedInput === 'to'}
        className="flex-1"
        iconType="to"
      />
    </div>
  );
};