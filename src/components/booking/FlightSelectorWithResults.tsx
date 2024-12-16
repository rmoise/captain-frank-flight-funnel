import React from 'react';
import type { Flight } from '@/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedFlight } from '@/store/slices/bookingSlice';
import { FlightTypeSelector } from '../shared/FlightTypeSelector';
import { LocationSelector } from '../shared/LocationSelector';
import { FlightResultsList } from '../shared/FlightResultsList';
import { PageHeader } from '../shared/PageHeader';
import type { FlightType } from '@/types/flight';

const flightTypes = [
  { id: 'direct' as const, label: 'Direct Flight' },
  { id: 'multi' as const, label: 'Multi City' },
] as const;

const locationOptions = [
  { value: 'NYC', label: 'New York City' },
  { value: 'LAX', label: 'Los Angeles' },
  { value: 'CHI', label: 'Chicago' },
];

export function FlightSelectorWithResults() {
  const dispatch = useAppDispatch();
  const { selectedFlight } = useAppSelector((state) => state.booking);
  const [focusedInput, setFocusedInput] = React.useState<'from' | 'to' | null>(null);
  const [selectedType, setSelectedType] = React.useState<'direct' | 'multi'>('direct');

  const handleFlightSelect = (flight: Flight) => {
    dispatch(setSelectedFlight(flight));
  };

  const handleTypeSelect = (type: 'direct' | 'multi') => {
    setSelectedType(type);
    if (selectedFlight) {
      const updatedFlight: Flight = {
        ...selectedFlight,
        id: selectedFlight.id || '1',
        airline: selectedFlight.airline || '',
        flightNumber: selectedFlight.flightNumber || '',
        departureTime: selectedFlight.departureTime || '',
        arrivalTime: selectedFlight.arrivalTime || '',
        departureCity: selectedFlight.departureCity || '',
        arrivalCity: selectedFlight.arrivalCity || '',
        departure: selectedFlight.departure || '',
        arrival: selectedFlight.arrival || '',
        price: selectedFlight.price || 0,
      };
      handleFlightSelect(updatedFlight);
    }
  };

  return (
    <div className="max-w-[644px] mx-auto px-4">
      <PageHeader
        title="Flight Details"
        subtitle="Please provide your flight information."
      />
      <div className="space-y-6">
        <FlightTypeSelector
          types={flightTypes}
          selectedType={selectedType}
          onTypeSelect={handleTypeSelect}
        />
        <LocationSelector
          fromLocation={selectedFlight?.departureCity || ''}
          toLocation={selectedFlight?.arrivalCity || ''}
          locationOptions={locationOptions}
          onFromLocationChange={(value) => {
            if (selectedFlight) {
              handleFlightSelect({ ...selectedFlight, departureCity: value });
            }
          }}
          onToLocationChange={(value) => {
            if (selectedFlight) {
              handleFlightSelect({ ...selectedFlight, arrivalCity: value });
            }
          }}
          onFocusInput={setFocusedInput}
          onBlurInput={() => setFocusedInput(null)}
          focusedInput={focusedInput}
          className="w-full"
        />
        {selectedFlight?.departureCity && selectedFlight?.arrivalCity && (
          <FlightResultsList
            flights={[]}
            onFlightSelect={handleFlightSelect}
            onNotListedClick={() => {/* Handle not listed click */}}
            className="w-full"
          />
        )}
      </div>
    </div>
  );
}