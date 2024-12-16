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
} from '@/store/bookingSlice';
import { FlightTypeSelector } from '../shared/FlightTypeSelector';
import { LocationSelector } from '../shared/LocationSelector';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

const flightTypes = [
  { id: 'direct' as const, label: 'Direct Flight' },
  { id: 'multi' as const, label: 'Multi City' },
] as const;

const airportOptions = [
  { value: 'LHR', label: 'London Heathrow' },
  { value: 'CDG', label: 'Paris Charles de Gaulle' },
  { value: 'JFK', label: 'New York JFK' },
  { value: 'SIN', label: 'Singapore Changi' },
];

export default function FlightSelector({ onSelect, onInteract }: FlightSelectorProps) {
  const [flightType, setFlightType] = useState<'direct' | 'multi'>('direct');
  const [hasInteracted, setHasInteracted] = useState(false);

  const dispatch = useAppDispatch();
  const { selectedFlight, fromLocation, toLocation, focusedInput } = useAppSelector(
    (state) => state.booking
  );

  // Initialize segments from Redux state and localStorage
  const [segments, setSegments] = useState<FlightSegment[]>(() => {
    // First try to get from localStorage
    if (typeof window !== 'undefined') {
      const savedSegments = localStorage.getItem('flightSelector_segments');
      if (savedSegments) {
        return JSON.parse(savedSegments);
      }
    }

    // If not in localStorage, use Redux state
    if (selectedFlight) {
      return [{
        id: '1',
        fromLocation: selectedFlight.departureCity || null,
        toLocation: selectedFlight.arrivalCity || null
      }];
    }
    // If we have fromLocation or toLocation in Redux but no selected flight,
    // initialize with those values
    if (fromLocation || toLocation) {
      return [{
        id: '1',
        fromLocation: fromLocation || null,
        toLocation: toLocation || null
      }];
    }
    return [{ id: '1', fromLocation: null, toLocation: null }];
  });

  // Save segments to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('flightSelector_segments', JSON.stringify(segments));
    }
  }, [segments]);

  // Restore flight type based on selected flight
  useEffect(() => {
    if (selectedFlight) {
      setFlightType('direct'); // For now, we only support direct flights in persistence
    }
  }, [selectedFlight]);

  // Check if we need to mark the step as complete based on existing data
  useEffect(() => {
    if (selectedFlight && fromLocation && toLocation) {
      dispatch(completeStep(1));
    }
  }, [selectedFlight, fromLocation, toLocation, dispatch]);

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
        onSelect?.(mockFlight);
        dispatch(completeStep(1));
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
        onSelect?.(mockFlights[0]);
        dispatch(completeStep(1));
      }
    } else {
      // Clear selected flight and mark step as incomplete
      dispatch(markStepIncomplete(1));
      dispatch(setSelectedFlight(null));
    }
  };

  const handleSegmentChange = (
    segmentId: string,
    field: 'fromLocation' | 'toLocation',
    value: string | null
  ) => {
    handleInteraction();

    // Update segments state
    const newSegments = segments.map((segment) => {
      if (segment.id === segmentId) {
        return { ...segment, [field]: value };
      }
      return segment;
    });
    setSegments(newSegments);

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('flightSelector_segments', JSON.stringify(newSegments));
    }

    // Always update Redux state for location fields, even if incomplete
    if (segmentId === '1') {
      if (field === 'fromLocation') {
        dispatch(setFromLocation(value));
      } else {
        dispatch(setToLocation(value));
      }
    }

    // Only update flight selection if both fields are filled
    const segment = newSegments.find(s => s.id === segmentId);
    if (segment?.fromLocation && segment?.toLocation) {
      updateFlightSelection(newSegments);
    } else {
      // Clear selected flight but keep the locations
      dispatch(markStepIncomplete(1));
      dispatch(setSelectedFlight(null));
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

  const handleFlightTypeChange = (type: 'direct' | 'multi') => {
    setFlightType(type);
    if (type === 'direct') {
      // When switching to direct, keep only the first segment
      const firstSegment = segments[0];
      setSegments([firstSegment]);
      // Update flight selection with the single segment
      updateFlightSelection([firstSegment]);
    }
  };

  return (
    <div className="space-y-8" onClick={(e) => e.stopPropagation()} data-step="1">
      {/* Flight Type Selection */}
      <FlightTypeSelector
        types={flightTypes}
        selectedType={flightType}
        onTypeSelect={handleFlightTypeChange}
      />

      {/* Flight Search */}
      <div className="space-y-4">
        {segments.map((segment) => (
          <div key={segment.id} className="flex items-start gap-4">
            <LocationSelector
              fromLocation={segment.fromLocation || ''}
              toLocation={segment.toLocation || ''}
              locationOptions={airportOptions}
              onFromLocationChange={(value: string) =>
                handleSegmentChange(segment.id, 'fromLocation', value || null)
              }
              onToLocationChange={(value: string) =>
                handleSegmentChange(segment.id, 'toLocation', value || null)
              }
              onFocusInput={handleFocusInput}
              onBlurInput={handleBlurInput}
              focusedInput={focusedInput as 'from' | 'to' | null}
              className="flex-1"
            />
            {flightType === 'multi' && segments.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeSegment(segment.id);
                }}
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
            onClick={(e) => {
              e.stopPropagation();
              addSegment();
            }}
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
