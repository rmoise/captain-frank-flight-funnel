import React from 'react';
import type { Flight } from '@/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedFlight } from '@/store/slices/bookingSlice';
import { FlightTypeSelector } from '../shared/FlightTypeSelector';
import { LocationSelector } from '../shared/LocationSelector';
import { FlightResultsList } from '../shared/FlightResultsList';
import { PageHeader } from '../shared/PageHeader';

const flightTypes = [
  { id: 'delayed', label: 'Delayed Flight' },
  { id: 'cancelled', label: 'Cancelled Flight' },
  { id: 'overbooked', label: 'Overbooked Flight' },
];

export function FlightSelectorWithResults() {
  const dispatch = useAppDispatch();
  const { selectedFlight } = useAppSelector((state) => state.booking);

  const handleFlightSelect = (flight: Flight) => {
    dispatch(setSelectedFlight(flight));
  };

  return (
    <div className="max-w-[644px] mx-auto px-4">
      <PageHeader
        title="Flight Details"
        subtitle="Please provide your flight information."
      />
      <div className="space-y-6">
        <FlightTypeSelector
          options={flightTypes}
          selectedOption={selectedFlight?.type}
          onSelect={(type) => handleFlightSelect({ ...selectedFlight, type } as Flight)}
        />
        <LocationSelector
          label="From"
          value={selectedFlight?.from || ''}
          onChange={(from) => handleFlightSelect({ ...selectedFlight, from } as Flight)}
        />
        <LocationSelector
          label="To"
          value={selectedFlight?.to || ''}
          onChange={(to) => handleFlightSelect({ ...selectedFlight, to } as Flight)}
        />
        {selectedFlight?.from && selectedFlight?.to && (
          <FlightResultsList
            flights={[]}
            selectedFlight={selectedFlight}
            onSelect={handleFlightSelect}
          />
        )}
      </div>
    </div>
  );
}