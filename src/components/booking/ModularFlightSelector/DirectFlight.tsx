import React, { useState } from 'react';
import { FlightSearchBottomSheet } from './FlightSearchBottomSheet';
import { FlightPreviewCard } from './FlightPreviewCard';
import { AutocompleteInput } from '@/components/shared/AutocompleteInput';
import { CustomDateInput } from '@/components/shared/CustomDateInput';
import { useTranslation } from '@/hooks/useTranslation';
import type { Flight, LocationData } from '@/types/store';

interface DirectFlightProps {
  fromLocation: LocationData | null;
  toLocation: LocationData | null;
  date: string | null;
  selectedFlight: Flight | null;
  onFromLocationChange: (location: LocationData | null) => void;
  onToLocationChange: (location: LocationData | null) => void;
  onDateChange: (date: string | null) => void;
  onFlightSelect: (flight: Flight) => void;
  onFlightDelete: () => void;
  onSearch: (params: {
    from: LocationData | null;
    to: LocationData | null;
    date: string | null;
  }) => Promise<void>;
  searchResults: Flight[];
  isSearching?: boolean;
  disabled?: boolean;
}

export const DirectFlight: React.FC<DirectFlightProps> = ({
  fromLocation,
  toLocation,
  date,
  selectedFlight,
  onFromLocationChange,
  onToLocationChange,
  onDateChange,
  onFlightSelect,
  onFlightDelete,
  onSearch,
  searchResults,
  isSearching = false,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const handleSearch = async () => {
    await onSearch({
      from: fromLocation,
      to: toLocation,
      date: date,
    });
    setIsBottomSheetOpen(true);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDateChange(e.target.value || null);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AutocompleteInput
            value={fromLocation}
            onChange={onFromLocationChange}
            onSearch={async () => []} // Will be implemented in store
            label={t.flightSelector.labels.from}
            leftIcon="departure"
            disabled={disabled}
          />
          <AutocompleteInput
            value={toLocation}
            onChange={onToLocationChange}
            onSearch={async () => []} // Will be implemented in store
            label={t.flightSelector.labels.to}
            leftIcon="arrival"
            disabled={disabled}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CustomDateInput
            value={date || ''}
            onChange={handleDateChange}
            onClear={() => onDateChange(null)}
            label={t.flightSelector.labels.departureDate}
            disabled={disabled}
          />
          <button
            onClick={handleSearch}
            disabled={!fromLocation || !toLocation || !date || disabled}
            className="h-14 w-full text-white bg-[#F54538] rounded-xl hover:bg-[#F54538]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F54538] disabled:opacity-50 disabled:cursor-not-allowed font-sans font-medium text-base"
          >
            {t.flightSelector.labels.searchFlights}
          </button>
        </div>
      </div>

      {selectedFlight && (
        <div className="mt-4">
          <FlightPreviewCard
            flight={selectedFlight}
            index={0}
            onEdit={handleSearch}
            onDelete={onFlightDelete}
            isMultiCity={false}
            showConnectionInfo={false}
          />
        </div>
      )}

      <FlightSearchBottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        onSelect={onFlightSelect}
        searchResults={searchResults}
        isSearching={isSearching}
      />
    </div>
  );
};
