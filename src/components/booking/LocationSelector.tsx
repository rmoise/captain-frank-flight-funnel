'use client';

import React, { useState } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { setFromLocation, setToLocation } from '@/store/slices/bookingSlice';
import { AutocompleteInput } from '@/components/shared/AutocompleteInput';
import type { Airport } from '@/types/store';
import type { Location } from '@/types/location';

interface LocationSelectorProps {
  onSelect?: () => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  onSelect = () => {},
}) => {
  const dispatch = useAppDispatch();
  const [fromLocation, setFromLoc] = useState<Location | null>(null);
  const [toLocation, setToLoc] = useState<Location | null>(null);

  const handleFromLocationChange = (location: Location | null) => {
    setFromLoc(location);
    dispatch(setFromLocation(location?.value || null));
    if (location) onSelect();
  };

  const handleToLocationChange = (location: Location | null) => {
    setToLoc(location);
    dispatch(setToLocation(location?.value || null));
    if (location) onSelect();
  };

  const handleSearchLocations = async (term: string): Promise<Location[]> => {
    try {
      const response = await fetch(`/api/airports?search=${term}`);
      const airports: Airport[] = await response.json();
      return airports.map((airport) => ({
        value: airport.iata_code,
        label: `${airport.name} (${airport.iata_code})`,
      }));
    } catch (error) {
      console.error('Failed to fetch airports:', error);
      return [];
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">From</label>
        <AutocompleteInput
          label="From"
          value={fromLocation}
          onChange={handleFromLocationChange}
          onSearch={handleSearchLocations}
          placeholder="Search for departure airport"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">To</label>
        <AutocompleteInput
          label="To"
          value={toLocation}
          onChange={handleToLocationChange}
          onSearch={handleSearchLocations}
          placeholder="Search for arrival airport"
        />
      </div>
    </div>
  );
};
