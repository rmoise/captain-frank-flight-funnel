'use client';

import React from 'react';
import { AutocompleteInput } from '@/components/shared/AutocompleteInput';
import type { LocationData } from '@/types/store';

interface Airport {
  iata_code: string;
  name: string;
  city?: string;
}

interface LocationSelectorProps {
  fromLocation: LocationData | null;
  toLocation: LocationData | null;
  onFromLocationSelect: (location: LocationData | null) => void;
  onToLocationSelect: (location: LocationData | null) => void;
  disabled?: boolean;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  fromLocation,
  toLocation,
  onFromLocationSelect,
  onToLocationSelect,
  disabled = false,
}) => {
  const searchAirports = async (term: string): Promise<LocationData[]> => {
    if (!term || term.length < 3) {
      return [];
    }

    try {
      const response = await fetch(
        `/api/searchairports?${new URLSearchParams({
          term,
          lang: 'en',
        })}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch airports');
      }

      const data = await response.json();
      const airports = data.data || [];

      return airports.map((airport: Airport) => ({
        value: airport.iata_code,
        label: airport.iata_code,
        description: airport.city || '',
        city: airport.city || '',
        dropdownLabel: `${airport.name} (${airport.iata_code})`,
      }));
    } catch (error) {
      console.error('Error searching airports:', error);
      return [];
    }
  };

  const handleFromLocationSelect = (location: LocationData | null) => {
    onFromLocationSelect(location);
  };

  const handleToLocationSelect = (location: LocationData | null) => {
    onToLocationSelect(location);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="relative">
        <AutocompleteInput
          value={fromLocation}
          label="From"
          onChange={handleFromLocationSelect}
          onSearch={searchAirports}
          leftIcon="departure"
          disabled={disabled}
        />
      </div>
      <div className="relative">
        <AutocompleteInput
          value={toLocation}
          label="To"
          onChange={handleToLocationSelect}
          onSearch={searchAirports}
          leftIcon="arrival"
          disabled={disabled}
        />
      </div>
    </div>
  );
};
