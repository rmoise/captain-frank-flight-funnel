import React, { useState, useEffect } from 'react';
import { FlightSelectorProps, Flight } from '@/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setSelectedFlight,
  setFromLocation,
  setToLocation,
  setFocusedInput,
  completeStep,
  markStepIncomplete,
} from '@/store/slices/bookingSlice';
import { useSteps } from '@/context/StepsContext';
import { FlightTypeSelector } from '../shared/FlightTypeSelector';
import { LocationSelector } from '../shared/LocationSelector';
import { FlightResultsList } from '../shared/FlightResultsList';
import { PageHeader } from '../shared/PageHeader';

const flightTypes = [
  { id: 'direct', label: 'Direct Flight' },
  { id: 'multi', label: 'Multi City' },
];

const airportOptions = [
  { value: 'LHR', label: 'London Heathrow' },
  { value: 'CDG', label: 'Paris Charles de Gaulle' },
  { value: 'JFK', label: 'New York JFK' },
  { value: 'SIN', label: 'Singapore Changi' },
];

const mockFlights: Flight[] = [
  {
    id: '1',
    airline: 'British Airways',
    flightNumber: 'BA123',
    departureCity: 'London Heathrow',
    arrivalCity: 'Paris Charles de Gaulle',
    departureTime: '10:00',
    arrivalTime: '13:00',
    departure: 'London Heathrow - 10:00',
    arrival: 'Paris Charles de Gaulle - 13:00',
    price: 299,
  },
  {
    id: '2',
    airline: 'Air France',
    flightNumber: 'AF456',
    departureCity: 'London Heathrow',
    arrivalCity: 'Paris Charles de Gaulle',
    departureTime: '14:00',
    arrivalTime: '17:00',
    departure: 'London Heathrow - 14:00',
    arrival: 'Paris Charles de Gaulle - 17:00',
    price: 275,
  },
];

export default function FlightSelectorWithResults({
  onSelect,
  onNotListedClick,
}: FlightSelectorProps) {
  const [flightType, setFlightType] = useState<'direct' | 'multi'>('direct');
  const [showFlights, setShowFlights] = useState(false);
  const dispatch = useAppDispatch();
  const { fromLocation, toLocation, focusedInput } = useAppSelector(
    (state) => state.booking
  );

  const updateFlightVisibility = (newFromLocation: string | null, newToLocation: string | null) => {
    if (newFromLocation && newToLocation) {
      setShowFlights(true);
    } else {
      setShowFlights(false);
      dispatch(markStepIncomplete(3));
      dispatch(setSelectedFlight(null));
    }
  };

  const handleFromLocationChange = (value: string) => {
    const newFromLocation = value || null;
    dispatch(setFromLocation(newFromLocation));
    updateFlightVisibility(newFromLocation, toLocation);
  };

  const handleToLocationChange = (value: string) => {
    const newToLocation = value || null;
    dispatch(setToLocation(newToLocation));
    updateFlightVisibility(fromLocation, newToLocation);
  };

  const handleFocusInput = (input: 'from' | 'to') => {
    dispatch(setFocusedInput(input));
  };

  const handleBlurInput = () => {
    dispatch(setFocusedInput(null));
  };

  const handleFlightSelect = (flight: Flight) => {
    dispatch(setSelectedFlight(flight));
    dispatch(completeStep(3));
    onSelect(flight);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        eyebrow="Step 3"
        title="Select your flight"
      />

      {/* Flight Type Selection */}
      <FlightTypeSelector
        types={flightTypes}
        selectedType={flightType}
        onTypeSelect={(type) => setFlightType(type as 'direct' | 'multi')}
      />

      {/* Flight Search */}
      <LocationSelector
        fromLocation={fromLocation || ''}
        toLocation={toLocation || ''}
        locationOptions={airportOptions}
        onFromLocationChange={handleFromLocationChange}
        onToLocationChange={handleToLocationChange}
        onFocusInput={handleFocusInput}
        onBlurInput={handleBlurInput}
        focusedInput={focusedInput as 'from' | 'to' | null}
      />

      {/* Flight Results */}
      {showFlights && (
        <FlightResultsList
          flights={mockFlights}
          onFlightSelect={handleFlightSelect}
          onNotListedClick={onNotListedClick}
        />
      )}
    </div>
  );
}