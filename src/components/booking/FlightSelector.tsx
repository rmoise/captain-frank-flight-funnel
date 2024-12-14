'use client';

import React, { useState, useEffect } from 'react';
import { FlightSelectorProps, Flight, FlightSegment } from '@/types';
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
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

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

export default function FlightSelector({ onSelect, onInteract }: FlightSelectorProps) {
  const [flightType, setFlightType] = useState<'direct' | 'multi'>('direct');
  const [segments, setSegments] = useState<FlightSegment[]>([
    { id: '1', fromLocation: null, toLocation: null },
  ]);
  const [hasInteracted, setHasInteracted] = useState(false);

  const dispatch = useAppDispatch();
  const { fromLocation, toLocation, focusedInput } = useAppSelector(
    (state) => state.booking
  );
  const { registerStep } = useSteps();

  useEffect(() => {
    const STEP_ID = 'FlightSelector';
    const STEP_NUMBER = 1;
    registerStep(STEP_ID, STEP_NUMBER);
  }, [registerStep]);

  const handleInteraction = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      onInteract?.();
    }
  };

  const updateFlightSelection = (segments: FlightSegment[]) => {
    const allSegmentsComplete = segments.every(
      (segment) => segment.fromLocation && segment.toLocation
    );

    if (allSegmentsComplete) {
      if (flightType === 'direct') {
        const mockFlight: Flight = {
          id: '1',
          airline: 'Selected Flight',
          flightNumber: 'SF001',
          departureCity: segments[0].fromLocation!,
          arrivalCity: segments[0].toLocation!,
          departureTime: '',
          arrivalTime: '',
          departure: segments[0].fromLocation!,
          arrival: segments[0].toLocation!,
          price: 0,
        };
        dispatch(setSelectedFlight(mockFlight));
        onSelect(mockFlight);
      } else {
        const mockFlights: Flight[] = segments.map((segment, index) => ({
          id: (index + 1).toString(),
          airline: 'Selected Flight',
          flightNumber: `SF00${index + 1}`,
          departureCity: segment.fromLocation!,
          arrivalCity: segment.toLocation!,
          departureTime: '',
          arrivalTime: '',
          departure: segment.fromLocation!,
          arrival: segment.toLocation!,
          price: 0,
        }));
        dispatch(setSelectedFlight(mockFlights[0])); // Store first flight for now
        onSelect(mockFlights);
      }
      dispatch(completeStep(1));
    } else {
      dispatch(markStepIncomplete(1));
      dispatch(setSelectedFlight(null));
    }
  };

  const handleSegmentChange = (
    segmentId: string,
    field: 'fromLocation' | 'toLocation',
    value: string
  ) => {
    handleInteraction();
    const newSegments = segments.map((segment) => {
      if (segment.id === segmentId) {
        return { ...segment, [field]: value || null };
      }
      return segment;
    });
    setSegments(newSegments);
    updateFlightSelection(newSegments);

    // Update redux state for compatibility with existing code
    if (segmentId === '1') {
      if (field === 'fromLocation') {
        dispatch(setFromLocation(value || null));
      } else {
        dispatch(setToLocation(value || null));
      }
    }
  };

  const handleFocusInput = (input: 'from' | 'to') => {
    dispatch(setFocusedInput(input));
  };

  const handleBlurInput = () => {
    dispatch(setFocusedInput(null));
  };

  const addSegment = () => {
    if (segments.length < 4) {
      setSegments([
        ...segments,
        {
          id: (segments.length + 1).toString(),
          fromLocation: null,
          toLocation: null,
        },
      ]);
    }
  };

  const removeSegment = (segmentId: string) => {
    if (segments.length > 1) {
      const newSegments = segments.filter(
        (segment) => segment.id !== segmentId
      );
      setSegments(newSegments);
      updateFlightSelection(newSegments);
    }
  };

  const handleFlightTypeChange = (type: string) => {
    setFlightType(type as 'direct' | 'multi');
    if (type === 'direct') {
      setSegments([segments[0]]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Flight Type Selection */}
      <FlightTypeSelector
        types={flightTypes}
        selectedType={flightType}
        onTypeSelect={handleFlightTypeChange}
      />

      {/* Flight Search */}
      <div className="space-y-4">
        {segments.map((segment, index) => (
          <div key={segment.id} className="flex items-start gap-4">
            <LocationSelector
              fromLocation={segment.fromLocation || ''}
              toLocation={segment.toLocation || ''}
              locationOptions={airportOptions}
              onFromLocationChange={(value) =>
                handleSegmentChange(segment.id, 'fromLocation', value)
              }
              onToLocationChange={(value) =>
                handleSegmentChange(segment.id, 'toLocation', value)
              }
              onFocusInput={handleFocusInput}
              onBlurInput={handleBlurInput}
              focusedInput={focusedInput as 'from' | 'to' | null}
              className="flex-1"
            />
            {flightType === 'multi' && segments.length > 1 && (
              <button
                onClick={() => removeSegment(segment.id)}
                className="mt-7 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Remove flight segment"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}

        {flightType === 'multi' && segments.length < 4 && (
          <button
            onClick={addSegment}
            className="flex items-center gap-2 text-[#F54538] hover:text-[#E03F33] transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add another flight</span>
          </button>
        )}
      </div>
    </div>
  );
}
