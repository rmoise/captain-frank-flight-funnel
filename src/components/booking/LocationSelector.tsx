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
      // If the term is exactly 3 characters and matches an IATA code format,
      // we want to prioritize exact matches
      const isExactIataCode = term.length === 3 && /^[A-Z]{3}$/.test(term);

      const response = await fetch(
        `/api/searchairportsbyterm?${new URLSearchParams({
          term,
          lang: 'en',
        })}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch airports');
      }

      const data = await response.json();
      const airports = data.data || [];

      // Map the airports to LocationData format
      const mappedAirports = airports.map((airport: Airport) => ({
        value: airport.iata_code,
        label: airport.iata_code,
        description: airport.city || '',
        city: airport.city || '',
        dropdownLabel: `${airport.name} (${airport.iata_code})`,
      }));

      // If we have an exact IATA code match and it's in the results,
      // select it automatically
      if (isExactIataCode) {
        const exactMatch = mappedAirports.find(
          (airport: { value: string }) => airport.value === term
        );
        if (exactMatch) {
          return [exactMatch];
        }
      }

      return mappedAirports;
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
