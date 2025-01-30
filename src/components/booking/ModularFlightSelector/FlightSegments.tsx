import React, { useCallback, useState } from 'react';
import { AutocompleteInput } from '@/components/shared/AutocompleteInput';
import { CustomDateInput } from '@/components/shared/CustomDateInput';
import { useTranslation } from '@/hooks/useTranslation';
import { FlightPreviewCard } from './FlightPreviewCard';
import type { FlightSegmentsProps } from './types';
import type { LocationData, Flight } from '@/types/store';
import { TrashIcon } from '@heroicons/react/24/outline';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parseISO, isValid } from 'date-fns';
import './FlightSegments.css';
import { FlightSearchBottomSheet } from './FlightSearchBottomSheet';
import { useStore } from '@/lib/state/store';
import { usePhase4Store } from '@/lib/state/phase4Store';
import { useFlightStore } from '@/lib/state/flightStore';

interface Airport {
  iata_code: string;
  name: string;
  city?: string;
}

interface AirportResult extends LocationData {
  name: string;
}

interface RawFlight {
  id: number | undefined;
  flightnumber_iata: string;
  dep_iata: string;
  arr_iata: string;
  dep_time_sched: string;
  arr_time_sched: string;
  dep_time_fact: string | null;
  arr_time_fact: string | null;
  arr_delay_min: number | null;
  status: string;
  aircraft_type?: string;
  dep_city?: string;
  arr_city?: string;
}

// Helper function to safely format date for display
const formatDateForDisplay = (date: Date | string | null): string => {
  if (!date) return '';

  try {
    // If it's already in dd.MM.yyyy format, return as is
    if (typeof date === 'string' && date.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      return date;
    }

    // If it's a string, try to parse it
    if (typeof date === 'string') {
      // If it's an ISO string, parse it
      const parsedDate = parseISO(date);
      if (isValid(parsedDate)) {
        return format(parsedDate, 'dd.MM.yyyy');
      }
    }

    // If it's a Date object or needs to be converted to one
    const dateObj = date instanceof Date ? date : new Date(date);
    if (!isValid(dateObj)) return '';

    // Normalize to noon UTC to avoid timezone issues
    const normalizedDate = new Date(
      Date.UTC(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate(),
        12,
        0,
        0,
        0
      )
    );

    return format(normalizedDate, 'dd.MM.yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

// Helper function to format time display
const formatTimeDisplay = (timeStr: string | null | undefined): string => {
  if (!timeStr) return '';
  try {
    let timePart = timeStr;

    if (timeStr.includes(' ')) {
      timePart = timeStr.split(' ')[1];
    }

    if (timePart.includes(':')) {
      const [hours, minutes] = timePart.split(':').slice(0, 2);
      if (hours && minutes) {
        const hour = parseInt(hours, 10);
        if (isNaN(hour)) return '';
        return `${hour.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      }
    }

    if (timePart.length === 4) {
      const hours = parseInt(timePart.substring(0, 2), 10);
      const minutes = timePart.substring(2, 4);
      if (isNaN(hours)) return '';
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }

    return '';
  } catch (error) {
    return '';
  }
};

// Helper function to calculate duration between times
const calculateDuration = (
  depTime: string | null | undefined,
  arrTime: string | null | undefined
): string => {
  if (!depTime || !arrTime) return '';

  const depFormatted = formatTimeDisplay(depTime);
  const arrFormatted = formatTimeDisplay(arrTime);

  if (!depFormatted || !arrFormatted) return '';

  try {
    const [depHours, depMinutes] = depFormatted.split(':').map(Number);
    const [arrHours, arrMinutes] = arrFormatted.split(':').map(Number);

    let diffMinutes = arrHours * 60 + arrMinutes - (depHours * 60 + depMinutes);

    // Handle overnight flights
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60;
    }

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    return `${hours}h ${minutes}m`;
  } catch (error) {
    console.error('Error calculating duration:', error);
    return '';
  }
};

// Helper function to transform raw flight data into Flight object
const transformRawFlight = (
  rawFlight: RawFlight,
  formattedDate: string
): Flight | null => {
  if (!rawFlight.id) return null;

  const duration = calculateDuration(
    rawFlight.dep_time_sched,
    rawFlight.arr_time_sched
  );

  // Extract airline code from flight number (first 2 characters)
  const airline = rawFlight.flightnumber_iata?.substring(0, 2) || 'Unknown';

  // Get city information from the API response
  // If city is not provided, use the IATA code
  const departureCity = rawFlight.dep_city || rawFlight.dep_iata;
  const arrivalCity = rawFlight.arr_city || rawFlight.arr_iata;

  return {
    id: rawFlight.id.toString(), // Convert number to string
    flightNumber: rawFlight.flightnumber_iata,
    airline,
    departureCity,
    arrivalCity,
    departureTime: formatTimeDisplay(rawFlight.dep_time_sched),
    arrivalTime: formatTimeDisplay(rawFlight.arr_time_sched),
    departure: rawFlight.dep_iata,
    arrival: rawFlight.arr_iata,
    duration: duration || '0h 0m',
    stops: 0,
    date: formattedDate,
    price: 0,
    aircraft: rawFlight.aircraft_type || 'Unknown',
    class: 'economy',
    status: rawFlight.status,
    departureAirport: rawFlight.dep_iata,
    arrivalAirport: rawFlight.arr_iata,
    scheduledDepartureTime: formatTimeDisplay(rawFlight.dep_time_sched),
    scheduledArrivalTime: formatTimeDisplay(rawFlight.arr_time_sched),
    actualDeparture: rawFlight.dep_time_fact
      ? formatTimeDisplay(rawFlight.dep_time_fact)
      : null,
    actualArrival: rawFlight.arr_time_fact
      ? formatTimeDisplay(rawFlight.arr_time_fact)
      : null,
    arrivalDelay: rawFlight.arr_delay_min,
  };
};

// Helper function to validate flight object
const isValidFlight = (flight: unknown): flight is Flight => {
  if (!flight || typeof flight !== 'object') return false;
  const f = flight as Flight;
  return (
    typeof f.id === 'string' &&
    typeof f.flightNumber === 'string' &&
    typeof f.airline === 'string' &&
    typeof f.departureCity === 'string' &&
    typeof f.arrivalCity === 'string' &&
    typeof f.departureTime === 'string' &&
    typeof f.arrivalTime === 'string' &&
    typeof f.departure === 'string' &&
    typeof f.arrival === 'string' &&
    typeof f.duration === 'string' &&
    typeof f.date === 'string'
  );
};

// Helper function to safely parse date string
const safeParseDateString = (dateStr: string | Date): Date | undefined => {
  try {
    // If it's already a Date object
    if (dateStr instanceof Date) {
      return isValid(dateStr) ? dateStr : undefined;
    }

    // If it's in dd.MM.yyyy format
    if (typeof dateStr === 'string' && dateStr.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      const [day, month, year] = dateStr.split('.').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
      return isValid(date) ? date : undefined;
    }

    // Try parseISO for ISO format
    if (typeof dateStr === 'string') {
      const parsed = parseISO(dateStr);
      if (isValid(parsed)) {
        // Normalize to noon UTC to avoid timezone issues
        return new Date(
          Date.UTC(
            parsed.getFullYear(),
            parsed.getMonth(),
            parsed.getDate(),
            12,
            0,
            0,
            0
          )
        );
      }
    }

    // If all parsing fails, return undefined
    return undefined;
  } catch (error) {
    console.error('Error parsing date:', error);
    return undefined;
  }
};

export const FlightSegments: React.FC<FlightSegmentsProps> = ({
  showFlightSearch,
  currentPhase,
  disabled,
  onInteract = () => {},
}) => {
  const { t } = useTranslation();
  const mainStore = useStore();
  const phase4Store = usePhase4Store();
  const flightStore = useFlightStore();
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // Get the appropriate store based on phase
  const store = currentPhase === 4 ? phase4Store : mainStore;

  const searchAirports = useCallback(
    async (term: string) => {
      try {
        if (!term || term.length < 3) {
          return [
            {
              value: '',
              label: '',
              description: t.common.enterMinChars,
              dropdownLabel: t.common.enterMinChars,
            },
          ];
        }

        const params = new URLSearchParams();
        params.append('term', term.toUpperCase());
        params.append('lang', 'en');

        const response = await fetch(
          `/.netlify/functions/searchAirports?${params.toString()}`
        );

        if (!response.ok) {
          if (response.status === 400 || response.status === 422) {
            return [
              {
                value: '',
                label: '',
                description: t.common.enterMinChars,
                dropdownLabel: t.common.enterMinChars,
              },
            ];
          }
          return [];
        }

        const data = await response.json();
        const airports = Array.isArray(data) ? data : data.data || [];

        // Map airports to the expected format with proper labels
        const mappedAirports = airports.map(
          (airport: Airport): AirportResult => {
            return {
              value: airport.iata_code,
              label: airport.iata_code,
              description: airport.name,
              dropdownLabel: `${airport.name} (${airport.iata_code})`,
              name: airport.name,
            };
          }
        );

        // Sort results by relevance
        const sortedAirports = mappedAirports.sort(
          (a: AirportResult, b: AirportResult) => {
            // Exact IATA code matches first
            const aExactMatch = a.value.toUpperCase() === term.toUpperCase();
            const bExactMatch = b.value.toUpperCase() === term.toUpperCase();
            if (aExactMatch && !bExactMatch) return -1;
            if (!aExactMatch && bExactMatch) return 1;

            // Then IATA codes that start with the term
            const aStartsWithIata = a.value
              .toUpperCase()
              .startsWith(term.toUpperCase());
            const bStartsWithIata = b.value
              .toUpperCase()
              .startsWith(term.toUpperCase());
            if (aStartsWithIata && !bStartsWithIata) return -1;
            if (!aStartsWithIata && bStartsWithIata) return 1;

            // Then sort by whether the name starts with the search term
            const aStartsWithName = a.name
              .toUpperCase()
              .startsWith(term.toUpperCase());
            const bStartsWithName = b.name
              .toUpperCase()
              .startsWith(term.toUpperCase());
            if (aStartsWithName && !bStartsWithName) return -1;
            if (!aStartsWithName && bStartsWithName) return 1;

            // Finally sort alphabetically by IATA code
            return a.value.localeCompare(b.value);
          }
        );

        return sortedAirports;
      } catch (error) {
        console.error('Error searching airports:', error);
        return [];
      }
    },
    [t.common.enterMinChars]
  );

  const updateStores = useCallback(
    (updates: {
      flightSegments: typeof mainStore.flightSegments;
      selectedFlight?: typeof mainStore.selectedFlight;
      selectedFlights?: typeof mainStore.selectedFlights;
    }) => {
      if (currentPhase === 4) {
        if (!phase4Store) return;

        phase4Store.batchUpdate({
          flightSegments: updates.flightSegments,
          selectedFlight: updates.selectedFlight || null,
          selectedFlights: updates.selectedFlights || [],
          fromLocation: updates.flightSegments[0]?.fromLocation
            ? JSON.stringify(updates.flightSegments[0].fromLocation)
            : null,
          toLocation: updates.flightSegments[updates.flightSegments.length - 1]
            ?.toLocation
            ? JSON.stringify(
                updates.flightSegments[updates.flightSegments.length - 1]
                  .toLocation
              )
            : null,
        });
      } else {
        if (!mainStore) return;

        // Get remaining selected flights from segments if not provided
        const selectedFlights =
          updates.selectedFlights ??
          updates.flightSegments
            .map((segment) => segment.selectedFlight)
            .filter((flight): flight is Flight => flight !== null);

        // Update all relevant store states atomically
        mainStore.batchUpdateWizardState({
          flightSegments: updates.flightSegments,
          selectedFlight: updates.selectedFlight ?? null,
          selectedFlights,
          fromLocation: updates.flightSegments[0]?.fromLocation
            ? JSON.stringify(updates.flightSegments[0].fromLocation)
            : null,
          toLocation: updates.flightSegments[updates.flightSegments.length - 1]
            ?.toLocation
            ? JSON.stringify(
                updates.flightSegments[updates.flightSegments.length - 1]
                  .toLocation
              )
            : null,
        });
      }
    },
    [currentPhase, phase4Store, mainStore]
  );

  const handleLocationChange = useCallback(
    (
      location: LocationData | null,
      field: 'fromLocation' | 'toLocation',
      index: number
    ) => {
      if (!store?.flightSegments) return;
      const newSegments = [...store.flightSegments];

      // For multi-city mode, validate that departure city matches previous arrival city
      if (
        store.selectedType === 'multi' &&
        field === 'fromLocation' &&
        index > 0 &&
        location
      ) {
        const previousSegment = newSegments[index - 1];
        if (previousSegment.selectedFlight) {
          const prevArrivalCity = previousSegment.selectedFlight.arrivalCity;
          const newDepartureCity =
            location.city || location.description || location.label;

          if (
            prevArrivalCity.toLowerCase() !== newDepartureCity.toLowerCase()
          ) {
            // Don't update if cities don't match
            return;
          }
        }
      }

      // Setting a new location or clearing it
      newSegments[index] = {
        ...newSegments[index],
        [field]: location,
        ...(currentPhase !== 4 && { selectedFlight: null }), // Only clear selected flight in non-phase-4
        ...(currentPhase !== 4 && { date: null }), // Only clear date in non-phase-4
      };

      // Handle linking in multi-city mode
      if (store.selectedType === 'multi') {
        if (field === 'toLocation') {
          // Forward linking: Set next segment's fromLocation
          if (index < newSegments.length - 1) {
            const nextSegment = newSegments[index + 1];
            newSegments[index + 1] = {
              ...nextSegment, // Preserve all existing data
              fromLocation: location,
              ...(currentPhase !== 4 && { selectedFlight: null }), // Only clear selected flight in non-phase-4
            };
          }
          // Only backward link if we're setting a new location (not clearing)
          if (location && index > 0 && newSegments[index].fromLocation) {
            const prevSegment = newSegments[index - 1];
            newSegments[index - 1] = {
              ...prevSegment, // Preserve all existing data
              toLocation: newSegments[index].fromLocation,
              ...(currentPhase !== 4 && { selectedFlight: null }), // Only clear selected flight in non-phase-4
            };
          }
        } else if (field === 'fromLocation') {
          // Backward linking: Set previous segment's toLocation
          if (index > 0) {
            const prevSegment = newSegments[index - 1];
            newSegments[index - 1] = {
              ...prevSegment, // Preserve all existing data
              toLocation: location,
              ...(currentPhase !== 4 && { selectedFlight: null }), // Only clear selected flight in non-phase-4
            };
          }
          // Only forward link if we're setting a new location (not clearing)
          if (
            location &&
            index < newSegments.length - 1 &&
            newSegments[index].toLocation
          ) {
            const nextSegment = newSegments[index + 1];
            newSegments[index + 1] = {
              ...nextSegment, // Preserve all existing data
              fromLocation: newSegments[index].toLocation,
              ...(currentPhase !== 4 && { selectedFlight: null }), // Only clear selected flight in non-phase-4
            };
          }
        }
      }

      // Update stores
      updateStores({ flightSegments: newSegments });

      // Update validation state
      if (mainStore.updateValidationState) {
        // For phase 1, validate all segments must have both locations and proper city connections
        const isSegmentValid =
          currentPhase === 1
            ? newSegments.every((segment, segmentIndex) => {
                // Each segment must have both locations
                const hasLocations = !!(
                  segment.fromLocation && segment.toLocation
                );

                // Skip connection validation for first segment
                if (segmentIndex === 0) return hasLocations;

                // For subsequent segments, validate city connections
                const prevSegment = newSegments[segmentIndex - 1];
                if (!prevSegment.toLocation || !segment.fromLocation)
                  return false;

                const prevCity =
                  prevSegment.toLocation.city ||
                  prevSegment.toLocation.description ||
                  prevSegment.toLocation.label;
                const currentCity =
                  segment.fromLocation.city ||
                  segment.fromLocation.description ||
                  segment.fromLocation.label;

                return (
                  hasLocations &&
                  prevCity.toLowerCase() === currentCity.toLowerCase()
                );
              })
            : !!(
                newSegments[index].fromLocation && newSegments[index].toLocation
              );

        // Check if all required segments have flights selected for phase 3
        const selectedFlights = newSegments
          .map((segment) => segment.selectedFlight)
          .filter((flight): flight is Flight => flight !== null);

        const isMultiCityValid =
          store.selectedType === 'multi'
            ? selectedFlights.length === newSegments.length // All segments must have flights
            : selectedFlights.length > 0; // Direct flight just needs one selection

        // Preserve existing validation state for other phases
        const existingValidationState =
          mainStore.validationState?.stepValidation || {};
        const existingInteractionState =
          mainStore.validationState?.stepInteraction || {};

        const stepValidation = {
          ...existingValidationState,
          1: isSegmentValid,
          2: existingValidationState[2] ?? false,
          3:
            currentPhase === 3
              ? isMultiCityValid
              : (existingValidationState[3] ?? false),
          4:
            currentPhase === 4
              ? isMultiCityValid
              : (existingValidationState[4] ?? false),
          5: existingValidationState[5] ?? false,
        };

        const stepInteraction = {
          ...existingInteractionState,
          1: true,
          2: existingInteractionState[2] ?? false,
          3: currentPhase === 3 ? true : (existingInteractionState[3] ?? false),
          4: currentPhase === 4 ? true : (existingInteractionState[4] ?? false),
          5: existingInteractionState[5] ?? false,
        };

        // Save validation state to localStorage for all phases
        const stateToSave = {
          flightSegments: newSegments.map((segment) => ({
            ...segment,
            date: segment.date ? formatDateForDisplay(segment.date) : null,
            selectedFlight: segment.selectedFlight,
            fromLocation: segment.fromLocation,
            toLocation: segment.toLocation,
          })),
          selectedType: store.selectedType,
          currentPhase: currentPhase,
          validationState: {
            isFlightValid:
              currentPhase === 3 || currentPhase === 4
                ? isMultiCityValid
                : isSegmentValid,
            stepValidation,
            stepInteraction,
            _timestamp: Date.now(),
          },
        };

        // Save state for current phase
        localStorage.setItem(
          `phase${currentPhase}State`,
          JSON.stringify(stateToSave)
        );

        // Also save state for phase 1 to ensure validation persists
        if (currentPhase !== 1) {
          const phase1State = {
            ...stateToSave,
            currentPhase: 1,
          };
          localStorage.setItem('phase1State', JSON.stringify(phase1State));
        }

        mainStore.updateValidationState({
          isFlightValid:
            currentPhase === 3 || currentPhase === 4
              ? isMultiCityValid
              : isSegmentValid,
          stepValidation,
          stepInteraction,
          _timestamp: Date.now(),
        });
      }

      // Notify parent of interaction
      onInteract();
    },
    [store, updateStores, onInteract, currentPhase, mainStore]
  );

  const handleDateChange = useCallback(
    (date: Date | null, index: number) => {
      if (!store?.flightSegments) return;

      const newSegments = [...store.flightSegments];
      newSegments[index] = {
        ...newSegments[index],
        date: date ? new Date(date.setHours(12, 0, 0, 0)) : null,
        selectedFlight: null, // Clear selected flight when date changes
      };

      // Update stores
      if (currentPhase === 4) {
        phase4Store.batchUpdate({
          flightSegments: newSegments,
          selectedFlight: null,
          selectedFlights: [],
        });
      }

      updateStores({ flightSegments: newSegments });
      onInteract();
    },
    [store?.flightSegments, updateStores, onInteract, currentPhase, phase4Store]
  );

  const addFlightSegment = useCallback(() => {
    if (!store?.flightSegments || store.flightSegments.length >= 4) return;

    const newSegments = [...store.flightSegments];
    const lastSegment = newSegments[newSegments.length - 1];

    newSegments.push({
      fromLocation: lastSegment?.toLocation || null,
      toLocation: null,
      selectedFlight: null,
      date: null,
    });

    if (currentPhase === 4) {
      phase4Store.batchUpdate({
        flightSegments: newSegments,
        selectedFlight: null,
        selectedFlights: [],
        fromLocation: newSegments[0]?.fromLocation
          ? JSON.stringify(newSegments[0].fromLocation)
          : null,
        toLocation: newSegments[newSegments.length - 1]?.toLocation
          ? JSON.stringify(newSegments[newSegments.length - 1].toLocation)
          : null,
      });
    } else {
      updateStores({ flightSegments: newSegments });
    }
    onInteract();
  }, [store, phase4Store, currentPhase, onInteract, updateStores]);

  const handleSegmentDelete = useCallback(
    (index: number) => {
      if (!store?.flightSegments || index <= 1) return;

      const newSegments = store.flightSegments.filter((_, i) => i !== index);

      if (currentPhase === 4) {
        phase4Store.batchUpdate({
          flightSegments: newSegments,
          selectedFlight: null,
          selectedFlights: [],
          fromLocation: newSegments[0]?.fromLocation
            ? JSON.stringify(newSegments[0].fromLocation)
            : null,
          toLocation: newSegments[newSegments.length - 1]?.toLocation
            ? JSON.stringify(newSegments[newSegments.length - 1].toLocation)
            : null,
        });
      } else {
        updateStores({ flightSegments: newSegments });
      }
      onInteract();
    },
    [store, phase4Store, currentPhase, onInteract, updateStores]
  );

  const handleFlightSelect = useCallback(
    (flight: Flight, index: number) => {
      if (!store?.flightSegments) return;

      console.log('=== FlightSegments - handleFlightSelect ENTRY ===', {
        flightDetails: {
          id: flight.id,
          flightNumber: flight.flightNumber,
          date: flight.date,
          departureCity: flight.departureCity,
          arrivalCity: flight.arrivalCity,
        },
        segmentIndex: index,
        currentPhase,
        currentSegments: store.flightSegments.map((s) => ({
          fromLocation: s.fromLocation?.value,
          toLocation: s.toLocation?.value,
          selectedFlight: s.selectedFlight
            ? {
                id: s.selectedFlight.id,
                flightNumber: s.selectedFlight.flightNumber,
                date: s.selectedFlight.date,
              }
            : null,
        })),
      });

      const newSegments = [...store.flightSegments];
      newSegments[index] = {
        ...newSegments[index],
        selectedFlight: {
          ...flight,
          // Ensure city information is properly set
          departureCity: flight.departureCity || flight.departure,
          arrivalCity: flight.arrivalCity || flight.arrival,
        },
        fromLocation: {
          value: flight.departure,
          label: flight.departure,
          description: flight.departureCity,
          city: flight.departureCity,
          dropdownLabel: `${flight.departureCity} (${flight.departure})`,
        },
        toLocation: {
          value: flight.arrival,
          label: flight.arrival,
          description: flight.arrivalCity,
          city: flight.arrivalCity,
          dropdownLabel: `${flight.arrivalCity} (${flight.arrival})`,
        },
      };

      // For multi-city, update linked segments
      if (store.selectedType === 'multi') {
        // Update next segment's fromLocation if it exists
        if (index < newSegments.length - 1) {
          newSegments[index + 1] = {
            ...newSegments[index + 1],
            fromLocation: {
              value: flight.arrival,
              label: flight.arrival,
              description: flight.arrivalCity,
              city: flight.arrivalCity,
              dropdownLabel: flight.arrivalCity,
            },
          };
        }

        // Update previous segment's toLocation if it exists
        if (index > 0) {
          newSegments[index - 1] = {
            ...newSegments[index - 1],
            toLocation: {
              value: flight.departure,
              label: flight.departure,
              description: flight.departureCity,
              city: flight.departureCity,
              dropdownLabel: flight.departureCity,
            },
          };
        }
      }

      // Get all selected flights from the updated segments
      const selectedFlights = newSegments
        .map((segment) => segment.selectedFlight)
        .filter((flight): flight is Flight => flight !== null);

      // Check if all required segments have flights selected
      const isMultiCityValid =
        store.selectedType === 'multi'
          ? selectedFlights.length === newSegments.length // All segments must have flights
          : selectedFlights.length > 0; // Direct flight just needs one selection

      // Update validation state for all phases
      if (mainStore.updateValidationState) {
        const stepValidation = {
          ...mainStore.validationState?.stepValidation,
          1: isMultiCityValid,
          [currentPhase]: isMultiCityValid,
        };

        const stepInteraction = {
          ...mainStore.validationState?.stepInteraction,
          1: true,
          [currentPhase]: true,
        };

        mainStore.updateValidationState({
          isFlightValid: isMultiCityValid,
          stepValidation,
          stepInteraction,
          _timestamp: Date.now(),
        });
      }

      // Update flight store based on phase
      if (currentPhase === 3) {
        console.log('=== FlightSegments - Updating FlightStore (Phase 3) ===', {
          selectedFlights: selectedFlights.map((f) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.date,
            departureCity: f.departureCity,
            arrivalCity: f.arrivalCity,
          })),
          timestamp: new Date().toISOString(),
        });

        // In Phase 3, set both original and selected flights
        flightStore.setOriginalFlights(selectedFlights);
        flightStore.setSelectedFlights(selectedFlights);

        // Save state to localStorage with validation state
        const stateToSave = {
          flightSegments: newSegments.map((segment) => ({
            ...segment,
            date: segment.date ? formatDateForDisplay(segment.date) : null,
            selectedFlight: segment.selectedFlight,
            fromLocation: segment.fromLocation,
            toLocation: segment.toLocation,
          })),
          selectedType: store.selectedType,
          currentPhase: currentPhase,
          validationState: {
            ...mainStore.validationState,
            isFlightValid: isMultiCityValid,
            stepValidation: {
              ...mainStore.validationState?.stepValidation,
              1: isMultiCityValid,
              [currentPhase]: isMultiCityValid,
            },
            stepInteraction: {
              ...mainStore.validationState?.stepInteraction,
              1: true,
              [currentPhase]: true,
            },
            _timestamp: Date.now(),
          },
        };

        console.log(
          '=== FlightSegments - Saving State to LocalStorage (Phase 3) ===',
          {
            selectedType: stateToSave.selectedType,
            currentPhase: stateToSave.currentPhase,
            segmentCount: stateToSave.flightSegments.length,
            validationState: stateToSave.validationState,
            timestamp: new Date().toISOString(),
          }
        );

        localStorage.setItem('phase3State', JSON.stringify(stateToSave));

        // Update main store
        updateStores({
          flightSegments: newSegments,
          selectedFlight: flight,
          selectedFlights: selectedFlights,
        });
      } else if (currentPhase === 4) {
        // Phase 4 logic - update both stores
        phase4Store.batchUpdate({
          flightSegments: newSegments,
          selectedFlight: flight,
          selectedFlights: selectedFlights,
          fromLocation: newSegments[0]?.fromLocation
            ? JSON.stringify(newSegments[0].fromLocation)
            : null,
          toLocation: newSegments[newSegments.length - 1]?.toLocation
            ? JSON.stringify(newSegments[newSegments.length - 1].toLocation)
            : null,
        });

        // Update flightStore with selected flights in Phase 4
        flightStore.setSelectedFlights(selectedFlights);

        // Save state to localStorage with validation state for phase 4
        const phase4State = {
          flightSegments: newSegments.map((segment) => ({
            ...segment,
            date: segment.date ? formatDateForDisplay(segment.date) : null,
            selectedFlight: segment.selectedFlight,
            fromLocation: segment.fromLocation,
            toLocation: segment.toLocation,
          })),
          selectedType: store.selectedType,
          currentPhase: currentPhase,
          validationState: {
            ...mainStore.validationState,
            isFlightValid: isMultiCityValid,
            stepValidation: {
              ...mainStore.validationState?.stepValidation,
              1: isMultiCityValid,
              [currentPhase]: isMultiCityValid,
            },
            stepInteraction: {
              ...mainStore.validationState?.stepInteraction,
              1: true,
              [currentPhase]: true,
            },
            _timestamp: Date.now(),
          },
        };

        localStorage.setItem('phase4State', JSON.stringify(phase4State));

        // Log the sync between stores
        console.log('=== FlightSegments - Syncing Stores (Phase 4) ===', {
          phase4StoreFlights: selectedFlights.map((f) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.date,
          })),
          flightStoreFlights: selectedFlights.map((f) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.date,
          })),
          timestamp: new Date().toISOString(),
        });
      }

      setIsBottomSheetOpen(false);
      onInteract();
    },
    [
      store,
      currentPhase,
      flightStore,
      mainStore,
      phase4Store,
      updateStores,
      onInteract,
    ]
  );

  const handleSearchFlights = useCallback(
    async (index: number) => {
      try {
        setSearchLoading(true);
        setSearchError(null);

        const segment = store.flightSegments[index];
        if (!segment.fromLocation || !segment.toLocation || !segment.date) {
          setSearchError('Please select origin, destination, and date');
          setSearchLoading(false);
          return;
        }

        // For multi-city segments after first, validate connection city
        if (index > 0) {
          const previousSegment = store.flightSegments[index - 1];
          if (previousSegment?.selectedFlight) {
            const prevArrivalCity =
              previousSegment.selectedFlight.arrival || '';
            const currentDepartureCity = segment.fromLocation.value || '';
            console.log('City comparison:', {
              prevArrivalCity,
              currentDepartureCity,
              fromLocation: segment.fromLocation,
              prevFlight: previousSegment.selectedFlight,
              hasValidCities: Boolean(prevArrivalCity && currentDepartureCity),
            });

            // Only compare if we have both cities
            if (!prevArrivalCity || !currentDepartureCity) {
              const error = t.flightSelector.errors.noValidConnecting;
              console.log('Missing city information:', error);
              setSearchError(error);
              setSearchLoading(false);
              return;
            }

            // Compare IATA codes case-insensitive
            if (
              prevArrivalCity.toLowerCase() !==
              currentDepartureCity.toLowerCase()
            ) {
              const error = t.flightSelector.errors.departureMismatch
                .replace('{city1}', currentDepartureCity)
                .replace('{city2}', prevArrivalCity);
              console.log('City mismatch error:', error);
              setSearchError(error);
              setSearchLoading(false);
              return;
            }
          }
        }

        // Ensure we have a valid date
        let searchDate: Date;
        let formattedDate: string;
        try {
          if (segment.date instanceof Date) {
            searchDate = segment.date;
          } else if (segment.date) {
            const dateStr = String(segment.date);
            // Try parsing the date string
            if (dateStr.includes('T')) {
              // If it's an ISO string
              searchDate = parseISO(dateStr);
            } else if (dateStr.includes('.')) {
              // If it's in dd.MM.yyyy format
              const [day, month, year] = dateStr.split('.').map(Number);
              // Create date at noon UTC to avoid timezone issues
              searchDate = new Date(
                Date.UTC(year, month - 1, day, 12, 0, 0, 0)
              );
            } else {
              // Try direct parsing
              searchDate = new Date(dateStr);
            }
          } else {
            throw new Error('Invalid date format');
          }

          if (!isValid(searchDate)) {
            throw new Error('Invalid date');
          }

          // Format date as YYYY-MM-DD for API
          formattedDate = format(searchDate, 'yyyy-MM-dd');
        } catch (error) {
          console.error('Date parsing error:', error, { date: segment.date });
          setSearchError('Invalid date selected');
          setSearchLoading(false);
          return;
        }

        const params = new URLSearchParams({
          from_iata: segment.fromLocation.value,
          to_iata: segment.toLocation.value,
          date: formattedDate,
          lang: 'en',
        });

        const response = await fetch(
          `/.netlify/functions/searchFlights?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch flights');
        }

        const data = await response.json();
        const flights = data.data || [];

        // Transform and validate the flights
        let validFlights = flights
          .map((flight: RawFlight) => {
            try {
              const transformedFlight = transformRawFlight(
                flight,
                formattedDate
              );
              if (!transformedFlight) {
                console.error('Failed to transform flight:', flight);
                return null;
              }
              return transformedFlight;
            } catch (error) {
              console.error('Error transforming flight:', error);
              return null;
            }
          })
          .filter(
            (flight: unknown): flight is Flight =>
              flight !== null && isValidFlight(flight)
          );

        // For multi-segment flights after the first segment, filter based on previous segment's arrival time
        if (index > 0) {
          const previousSegment = store.flightSegments[index - 1];
          if (previousSegment?.selectedFlight) {
            const previousArrivalTime = parseISO(
              `${previousSegment.selectedFlight.date}T${previousSegment.selectedFlight.arrivalTime}:00.000Z`
            );

            // Filter flights that depart at least 30 minutes after previous flight arrives
            // and within 48 hours of the previous flight's arrival
            validFlights = validFlights.filter((flight: Flight) => {
              const departureTime = parseISO(
                `${flight.date}T${flight.departureTime}:00.000Z`
              );
              const timeDiff =
                departureTime.getTime() - previousArrivalTime.getTime();
              const timeDiffMinutes = timeDiff / 60000; // Convert to minutes

              // Allow flights that depart:
              // 1. At least 30 minutes after previous arrival
              // 2. Within 48 hours of previous arrival
              return timeDiffMinutes >= 30 && timeDiffMinutes <= 48 * 60;
            });
          }
        }

        if (validFlights.length === 0) {
          setSearchError(
            index > 0
              ? t.flightSelector.errors.noValidConnecting
              : t.flightSelector.errors.noFlightsRoute
          );
          setSearchLoading(false);
          return;
        }

        setSearchResults(validFlights);
        setActiveIndex(index);
      } catch (error) {
        console.error('Search flights error:', error);
        setSearchError('Failed to search flights. Please try again.');
      } finally {
        setSearchLoading(false);
      }
    },
    [store?.flightSegments, t.flightSelector.errors]
  );

  const handleFlightDelete = useCallback(
    (index: number) => {
      if (!store?.flightSegments) return;

      // Create a new array with the flight cleared but segment retained
      const updatedSegments = store.flightSegments.map((segment, i) =>
        i === index ? { ...segment, selectedFlight: null } : segment
      );

      // Get remaining selected flights, filtering out nulls
      const remainingFlights = updatedSegments
        .map((segment) => segment.selectedFlight)
        .filter((flight): flight is Flight => flight !== null);

      // Update stores with both segment and flight updates
      updateStores({
        flightSegments: updatedSegments,
        selectedFlight: null,
        selectedFlights: remainingFlights,
      });

      // Notify parent of interaction
      onInteract();
    },
    [store, updateStores, onInteract]
  );

  if (!store?.flightSegments) return null;

  return (
    <div className="space-y-8">
      {store.flightSegments.map((segment, index) => (
        <div key={`segment-${index}`} className="relative">
          <div className="relative">
            <div className="relative flex items-start">
              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <AutocompleteInput
                      value={segment.fromLocation}
                      onChange={(location) =>
                        handleLocationChange(location, 'fromLocation', index)
                      }
                      onSearch={searchAirports}
                      label={t.flightSelector.labels.from}
                      leftIcon="departure"
                      disabled={disabled}
                    />
                  </div>
                  <div className="relative">
                    <AutocompleteInput
                      value={segment.toLocation}
                      onChange={(location) =>
                        handleLocationChange(location, 'toLocation', index)
                      }
                      onSearch={searchAirports}
                      label={t.flightSelector.labels.to}
                      leftIcon="arrival"
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
              {index > 1 && (
                <button
                  onClick={() => handleSegmentDelete(index)}
                  className="absolute -right-6 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {showFlightSearch && (currentPhase === 3 || currentPhase === 4) && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="relative date-picker-input w-full">
                  <DatePicker
                    selected={
                      segment.date
                        ? segment.date instanceof Date
                          ? isValid(segment.date)
                            ? segment.date
                            : undefined
                          : safeParseDateString(segment.date)
                        : undefined
                    }
                    onChange={(date: Date | null) =>
                      handleDateChange(date, index)
                    }
                    customInput={
                      <CustomDateInput
                        value={
                          segment.date
                            ? segment.date instanceof Date
                              ? isValid(segment.date)
                                ? format(segment.date, 'dd.MM.yyyy')
                                : ''
                              : (() => {
                                  const parsed = safeParseDateString(
                                    segment.date
                                  );
                                  return parsed
                                    ? format(parsed, 'dd.MM.yyyy')
                                    : '';
                                })()
                            : ''
                        }
                        label={t.flightSelector.labels.departureDate}
                        disabled={disabled}
                      />
                    }
                    dateFormat="dd.MM.yyyy"
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    isClearable={false}
                    placeholderText="DD.MM.YYYY"
                    shouldCloseOnSelect={true}
                    maxDate={new Date()}
                    minDate={
                      new Date(
                        new Date().setFullYear(new Date().getFullYear() - 3)
                      )
                    }
                    openToDate={
                      segment.date
                        ? segment.date instanceof Date
                          ? segment.date
                          : safeParseDateString(segment.date)
                        : undefined
                    }
                    disabledKeyboardNavigation
                    preventOpenOnFocus
                    popperProps={{
                      strategy: 'fixed',
                      placement: 'top-start',
                    }}
                    className="react-datepicker-popper"
                    calendarClassName="custom-calendar"
                    disabled={disabled}
                  />
                </div>
                <button
                  onClick={() => {
                    setIsBottomSheetOpen(true);
                    setActiveIndex(index);
                    handleSearchFlights(index);
                  }}
                  disabled={
                    !segment.date ||
                    !segment.fromLocation ||
                    !segment.toLocation ||
                    disabled
                  }
                  className="h-14 w-full text-white bg-[#F54538] rounded-xl hover:bg-[#F54538]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F54538] disabled:opacity-50 disabled:cursor-not-allowed font-sans font-medium text-base"
                >
                  {t.flightSelector.labels.searchFlights}
                </button>
              </div>

              <FlightSearchBottomSheet
                isOpen={isBottomSheetOpen}
                onClose={() => {
                  setIsBottomSheetOpen(false);
                  setSearchResults([]);
                }}
                onSelect={(flight) => handleFlightSelect(flight, activeIndex)}
                searchResults={searchResults}
                isSearching={searchLoading}
                errorMessage={searchError}
              />
            </>
          )}
        </div>
      ))}

      {store.flightSegments.length < 4 && store.selectedType === 'multi' && (
        <div className="flex flex-col gap-4">
          <button
            onClick={addFlightSegment}
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

      {/* Flight Details Section */}
      {((store.selectedType === 'direct' &&
        store.flightSegments[0]?.selectedFlight) ||
        (store.selectedType === 'multi' &&
          store.flightSegments.some((segment) => segment.selectedFlight))) &&
        (currentPhase === 3 || currentPhase === 4) && (
          <div className="pt-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t.phases.initialAssessment.flightDetails}
              </h3>
              {store.selectedType === 'direct' ? (
                store.flightSegments[0]?.selectedFlight && (
                  <FlightPreviewCard
                    key={`flight-preview-${store.flightSegments[0].selectedFlight.id}-0`}
                    flight={store.flightSegments[0].selectedFlight}
                    index={0}
                    onEdit={() => {}} // Will implement in next iteration
                    onDelete={() => handleFlightDelete(0)}
                    isMultiCity={false}
                    showConnectionInfo={false}
                  />
                )
              ) : (
                <div className="space-y-4">
                  {store.flightSegments.map((segment, index) => (
                    <React.Fragment
                      key={`flight-preview-${segment.selectedFlight?.id}-${index}`}
                    >
                      {segment.selectedFlight && (
                        <>
                          <FlightPreviewCard
                            flight={segment.selectedFlight}
                            index={index}
                            onEdit={() => {}} // Will implement in next iteration
                            onDelete={() => handleFlightDelete(index)}
                            isMultiCity={true}
                            showConnectionInfo={index > 0}
                          />
                          {index < store.flightSegments.length - 1 && (
                            <div className="h-4 border-l-2 border-dashed border-gray-300 ml-6" />
                          )}
                        </>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
};
