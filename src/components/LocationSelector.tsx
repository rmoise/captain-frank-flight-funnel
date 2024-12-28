'use client';

import React from 'react';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';

interface Location {
  value: string;
  label: string;
  description?: string;
  city?: string;
  name?: string;
}

interface LocationSelectorProps {
  fromLocation: Location | null;
  toLocation: Location | null;
  onFromLocationChange: (location: Location | null) => void;
  onToLocationChange: (location: Location | null) => void;
  error?: string;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  fromLocation,
  toLocation,
  onFromLocationChange,
  onToLocationChange,
  error,
}) => {
  return (
    <div className="space-y-4">
      <AutocompleteInput
        label="From"
        placeholder="Enter departure city or airport"
        value={fromLocation}
        onChange={onFromLocationChange}
        error={error}
      />
      <AutocompleteInput
        label="To"
        placeholder="Enter arrival city or airport"
        value={toLocation}
        onChange={onToLocationChange}
        error={error}
      />
    </div>
  );
};
