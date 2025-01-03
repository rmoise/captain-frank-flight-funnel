'use client';

import React from 'react';
import { useStore } from '@/lib/state/store';
import { AutocompleteInput } from '@/components/shared/AutocompleteInput';
import type { Airport } from '@/types/store';
import type { Location } from '@/types/location';

interface LocationSelectorProps {
  onSelect?: () => void;
  disabled?: boolean;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  onSelect = () => {},
  disabled = false,
}) => {
  const {
    fromLocation,
    toLocation,
    setFromLocation,
    setToLocation,
    locationError,
    setLocationError,
    clearLocationError,
  } = useStore();

  const handleFromLocationChange = (location: Location | null) => {
    try {
      setFromLocation(location ? JSON.stringify(location) : null);
      if (location) {
        onSelect();
        clearLocationError?.();
      }
    } catch (error) {
      console.error('Error setting from location:', error);
      setLocationError?.('Failed to set departure location');
    }
  };

  const handleToLocationChange = (location: Location | null) => {
    try {
      setToLocation(location ? JSON.stringify(location) : null);
      if (location) {
        onSelect();
        clearLocationError?.();
      }
    } catch (error) {
      console.error('Error setting to location:', error);
      setLocationError?.('Failed to set arrival location');
    }
  };

  const handleSearchLocations = async (term: string): Promise<Location[]> => {
    if (!term.trim()) return [];

    try {
      const response = await fetch(
        `/api/airports?search=${encodeURIComponent(term)}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch airports');
      }

      const airports: Airport[] = await response.json();
      return airports.map((airport) => ({
        value: airport.iata_code,
        label: `${airport.name} (${airport.iata_code})`,
        description: airport.city,
        city: airport.city,
      }));
    } catch (error) {
      console.error('Failed to fetch airports:', error);
      setLocationError?.('Failed to search airports');
      return [];
    }
  };

  const parseLocation = (locationString: string | null): Location | null => {
    if (!locationString) return null;
    try {
      return JSON.parse(locationString);
    } catch (error) {
      console.error('Error parsing location:', error);
      return null;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">From</label>
        <AutocompleteInput
          value={parseLocation(fromLocation)}
          onChange={handleFromLocationChange}
          onSearch={handleSearchLocations}
          label="From"
          leftIcon="departure"
          disabled={disabled}
          error={locationError || undefined}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">To</label>
        <AutocompleteInput
          value={parseLocation(toLocation)}
          onChange={handleToLocationChange}
          onSearch={handleSearchLocations}
          label="To"
          leftIcon="arrival"
          disabled={disabled}
          error={locationError || undefined}
        />
      </div>
      {locationError && (
        <p className="text-sm text-red-600 mt-1">{locationError}</p>
      )}
    </div>
  );
};
