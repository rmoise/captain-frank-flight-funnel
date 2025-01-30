import React from 'react';
import { AutocompleteInput } from '@/components/shared/AutocompleteInput';
import { CustomDateInput } from '@/components/shared/CustomDateInput';
import { useTranslation } from '@/hooks/useTranslation';
import type { LocationData } from '@/types/store';

interface FlightSegmentFormProps {
  fromLocation: LocationData | null;
  toLocation: LocationData | null;
  date: string | null;
  onFromLocationChange: (location: LocationData | null) => void;
  onToLocationChange: (location: LocationData | null) => void;
  onDateChange: (date: string | null) => void;
  onSearch: () => void;
  disabled?: boolean;
  searchDisabled?: boolean;
}

export const FlightSegmentForm: React.FC<FlightSegmentFormProps> = ({
  fromLocation,
  toLocation,
  date,
  onFromLocationChange,
  onToLocationChange,
  onDateChange,
  onSearch,
  disabled = false,
  searchDisabled = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <AutocompleteInput
            value={fromLocation}
            onChange={onFromLocationChange}
            onSearch={async () => {
              // This will be implemented in the store
              return [];
            }}
            label={t.flightSelector.labels.from}
            leftIcon="departure"
            disabled={disabled}
          />
        </div>
        <div className="relative">
          <AutocompleteInput
            value={toLocation}
            onChange={onToLocationChange}
            onSearch={async () => {
              // This will be implemented in the store
              return [];
            }}
            label={t.flightSelector.labels.to}
            leftIcon="arrival"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative">
          <CustomDateInput
            value={date || ''}
            onChange={(e) => onDateChange(e.target.value || null)}
            onClear={() => onDateChange(null)}
            label={t.flightSelector.labels.departureDate}
            disabled={disabled}
          />
        </div>
        <button
          onClick={onSearch}
          disabled={disabled || searchDisabled}
          className="h-14 w-full text-white bg-[#F54538] rounded-xl hover:bg-[#F54538]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F54538] disabled:opacity-50 disabled:cursor-not-allowed font-sans font-medium text-base"
        >
          {t.flightSelector.labels.searchFlights}
        </button>
      </div>
    </div>
  );
};
