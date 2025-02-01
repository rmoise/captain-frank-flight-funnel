import React, { useState } from 'react';
import { FlightSearchBottomSheet } from './FlightSearchBottomSheet';
import { FlightPreviewCard } from './FlightPreviewCard';
import { AutocompleteInput } from '@/components/shared/AutocompleteInput';
import { CustomDateInput } from '@/components/shared/CustomDateInput';
import { useTranslation } from '@/hooks/useTranslation';
import { TrashIcon } from '@heroicons/react/24/outline';
import type { Flight, LocationData } from '@/types/store';

interface FlightSegment {
  fromLocation: LocationData | null;
  toLocation: LocationData | null;
  date: string | null;
  selectedFlight: Flight | null;
}

interface MultiCityFlightProps {
  segments: FlightSegment[];
  onSegmentChange: (index: number, segment: FlightSegment) => void;
  onSegmentDelete: (index: number) => void;
  onSegmentAdd: () => void;
  onSearch: (
    params: {
      from: LocationData | null;
      to: LocationData | null;
      date: string | null;
    },
    index: number
  ) => Promise<void>;
  searchResults: Flight[];
  isSearching?: boolean;
  disabled?: boolean;
  setIsFlightNotListedOpen: (isOpen: boolean) => void;
  currentPhase?: number;
}

export const MultiCityFlight: React.FC<MultiCityFlightProps> = ({
  segments,
  onSegmentChange,
  onSegmentDelete,
  onSegmentAdd,
  onSearch,
  searchResults,
  isSearching = false,
  disabled = false,
  setIsFlightNotListedOpen,
  currentPhase,
}) => {
  const { t } = useTranslation();
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(
    null
  );
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = (index: number) => {
    const segment = segments[index];
    setActiveSearchIndex(index);
    setIsBottomSheetOpen(true);
    onSearch(
      {
        from: segment.fromLocation,
        to: segment.toLocation,
        date: segment.date,
      },
      index
    ).catch((error) => {
      console.error('Search error:', error);
      setSearchError('Failed to search flights. Please try again.');
    });
  };

  const handleFlightSelect = (flight: Flight) => {
    if (activeSearchIndex !== null) {
      onSegmentChange(activeSearchIndex, {
        ...segments[activeSearchIndex],
        selectedFlight: flight,
      });
      setActiveSearchIndex(null);
      setIsBottomSheetOpen(false);
      setSearchError(null);
    }
  };

  const handleDateChange =
    (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      onSegmentChange(index, {
        ...segments[index],
        date: e.target.value || null,
      });
    };

  return (
    <div className="space-y-8">
      {segments.map((segment, index) => (
        <div key={index} className="relative space-y-6 pt-8 first:pt-0">
          {index > 0 && (
            <div className="absolute -right-6 top-0">
              <button
                onClick={() => onSegmentDelete(index)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AutocompleteInput
              value={segment.fromLocation}
              onChange={(location) =>
                onSegmentChange(index, { ...segment, fromLocation: location })
              }
              onSearch={async () => []} // Will be implemented in store
              label={t.flightSelector.labels.from}
              leftIcon="departure"
              disabled={disabled}
            />
            <AutocompleteInput
              value={segment.toLocation}
              onChange={(location) =>
                onSegmentChange(index, { ...segment, toLocation: location })
              }
              onSearch={async () => []} // Will be implemented in store
              label={t.flightSelector.labels.to}
              leftIcon="arrival"
              disabled={disabled}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomDateInput
              value={segment.date || ''}
              onChange={handleDateChange(index)}
              onClear={() => onSegmentChange(index, { ...segment, date: null })}
              label={t.flightSelector.labels.departureDate}
              disabled={disabled}
            />
            <button
              onClick={() => handleSearch(index)}
              disabled={
                !segment.fromLocation ||
                !segment.toLocation ||
                !segment.date ||
                disabled
              }
              className="h-14 w-full text-white bg-[#F54538] rounded-xl hover:bg-[#F54538]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F54538] disabled:opacity-50 disabled:cursor-not-allowed font-sans font-medium text-base"
            >
              {t.flightSelector.labels.searchFlights}
            </button>
          </div>

          {segment.selectedFlight && (
            <div className="mt-4">
              <FlightPreviewCard
                flight={segment.selectedFlight}
                index={index}
                onEdit={() => handleSearch(index)}
                onDelete={() =>
                  onSegmentChange(index, { ...segment, selectedFlight: null })
                }
                isMultiCity={true}
                showConnectionInfo={index > 0}
              />
            </div>
          )}
        </div>
      ))}

      {segments.length < 4 && (
        <div className="flex flex-col gap-4">
          <button
            onClick={onSegmentAdd}
            className="w-full min-h-[3rem] border-2 border-dashed border-gray-300 rounded-lg hover:border-[#F54538] hover:text-[#F54538] transition-colors flex items-center justify-center px-4 py-2 text-sm sm:text-base"
          >
            <svg
              className="w-5 h-5 mr-2 flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="whitespace-normal text-center">
              {t.flightSelector.labels.addFlight}
            </span>
          </button>
        </div>
      )}

      <FlightSearchBottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        onSelect={handleFlightSelect}
        searchResults={searchResults}
        isSearching={isSearching}
        errorMessage={searchError}
        setIsFlightNotListedOpen={setIsFlightNotListedOpen}
        currentPhase={currentPhase}
      />
    </div>
  );
};
