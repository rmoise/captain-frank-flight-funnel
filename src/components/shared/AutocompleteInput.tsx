'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import { PiAirplaneTakeoff, PiAirplaneLanding } from 'react-icons/pi';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface Location {
  value: string;
  label: string;
  description?: string;
  city?: string;
}

interface AutocompleteInputProps {
  label?: string;
  value: Location | null;
  onChange: (location: Location | null) => void;
  onSearch: (term: string) => Promise<Location[]>;
  leftIcon?: 'plane-departure';
  rightIcon?: 'plane-arrival';
  disabled?: boolean;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  value,
  onChange,
  onSearch,
  leftIcon,
  rightIcon,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const handleSearch = async (term: string) => {
    try {
      const response = await fetch(
        `/api/searchairportsbyterm?term=${encodeURIComponent(term)}&lang=en`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch airports');
      }

      const data = await response.json();
      console.log('Airport search response:', data);

      // Handle both array and object response formats
      const airports = Array.isArray(data) ? data : data.data || [];

      return airports.map((airport: any) => ({
        value: airport.iata_code,
        label: `${airport.city || airport.name} (${airport.iata_code})`,
        description: airport.name,
        city: airport.city || airport.name,
      }));
    } catch (error) {
      console.error('Error fetching airports:', error);
      return [];
    }
  };

  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (!term.trim()) {
        setOptions([]);
        return;
      }

      setLoading(true);
      try {
        const results = await handleSearch(term);
        setOptions(results);
      } catch (error) {
        console.error('Error searching:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // ... rest of the component code ...
};

export default AutocompleteInput;
