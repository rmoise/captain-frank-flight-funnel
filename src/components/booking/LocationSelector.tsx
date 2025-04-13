"use client";

import React from "react";
import { AutocompleteInput } from "@/components/shared/AutocompleteInput";
import type { LocationData } from "@/types/store";
import { getAirportCitySync } from "@/utils/locationUtils";

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
          lang: "en",
        })}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch airports");
      }

      const data = await response.json();
      const airports = data.data || [];

      // Use the airport data directly from the API without modifications
      // This preserves all original properties including city names
      const mappedAirports = airports.map((airport: Airport) => {
        // Also populate the global cache with each airport code
        if (airport.iata_code && /^[A-Z]{3}$/.test(airport.iata_code)) {
          // Call getAirportCitySync to populate the cache (don't need to await the result)
          getAirportCitySync(airport.iata_code, "en");
        }

        return {
          value: airport.iata_code,
          label: airport.iata_code,
          description: airport.city || airport.name,
          city: airport.city || "",
          name: airport.name || "",
          dropdownLabel: `${airport.name || airport.city || ""} (${
            airport.iata_code
          })`,
        };
      });

      // If we have an exact IATA code match and it's in the results,
      // we can still prioritize it without modifying the data
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
      console.error("Error searching airports:", error);
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
