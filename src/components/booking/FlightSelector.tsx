/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { useStore } from '@/lib/state/store';
import type { Flight, LocationData, FlightSegmentData } from '@/types/store';
import type { StoreState, FlightSlice, StoreActions } from '@/lib/state/store';
import { AutocompleteInput } from '@/components/shared/AutocompleteInput';
import {
  CustomDateInput,
  type CustomDateInputProps,
} from '@/components/shared/CustomDateInput';
import { FlightTypeSelector } from '@/components/shared/FlightTypeSelector';
import { BottomSheet } from '@/components/shared/Sheet';
import {
  format,
  addMonths,
  getMonth,
  getYear,
  parseISO,
  isValid,
} from 'date-fns';
import { PiAirplaneTakeoff } from 'react-icons/pi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Squares2X2Icon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

// Custom styles for the calendar
import './FlightSelector.css';

import type { ReactDatePickerProps } from 'react-datepicker';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface RawFlight {
  id: number;
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

interface Location {
  value: string;
  label: string;
  description?: string;
  city?: string;
}

interface Airport {
  iata_code: string;
  name: string;
  city?: string;
}

interface FlightSelectorProps {
  onSelect: (flights: Flight | Flight[] | null) => void;
  showResults?: boolean;
  showFlightSearch?: boolean;
  showFlightDetails?: boolean;
  onInteract?: () => void;
  initialSelectedFlight?: Flight | null;
  initialFlightType?: 'direct' | 'multi';
  currentPhase?: number;
  disabled?: boolean;
  stepNumber: number;
}

type FlightType = 'direct' | 'multi';

// Add this type definition at the top of the file
type CustomDatePickerProps = Omit<ReactDatePickerProps, 'selected'> & {
  selected: Date | null;
};

// Helper functions
const formatTime = (timeStr: string | null | undefined): string => {
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
    console.error('Error formatting time:', error, timeStr);
    return '';
  }
};

const calculateDuration = (
  depTime: string | null | undefined,
  arrTime: string | null | undefined
): string => {
  if (!depTime || !arrTime) return 'N/A';
  try {
    const depFormatted = formatTime(depTime);
    const arrFormatted = formatTime(arrTime);

    if (!depFormatted || !arrFormatted) return 'N/A';

    const [depHours, depMinutes] = depFormatted.split(':').map(Number);
    const [arrHours, arrMinutes] = arrFormatted.split(':').map(Number);

    if (
      isNaN(depHours) ||
      isNaN(depMinutes) ||
      isNaN(arrHours) ||
      isNaN(arrMinutes)
    ) {
      return 'N/A';
    }

    let diffMinutes = arrHours * 60 + arrMinutes - (depHours * 60 + depMinutes);

    if (diffMinutes < 0) {
      diffMinutes += 24 * 60;
    }

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  } catch (error) {
    console.error('Error calculating duration:', error, { depTime, arrTime });
    return 'N/A';
  }
};

const formatSafeDate = (date: Date | string | null): string => {
  if (!date) return '';
  try {
    // If date is a string, try to parse it
    const safeDate = date instanceof Date ? date : new Date(date);
    if (isNaN(safeDate.getTime())) return '';

    // Format as DD.MM.YYYY
    const day = String(safeDate.getDate()).padStart(2, '0');
    const month = String(safeDate.getMonth() + 1).padStart(2, '0');
    const year = safeDate.getFullYear();
    return `${day}.${month}.${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const years = Array.from(
  { length: 10 },
  (_, i) => new Date().getFullYear() - i
);

// Filter flights that have all required fields
const isValidFlight = (flight: unknown): flight is Flight => {
  try {
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
      typeof f.stops === 'number' &&
      typeof f.date === 'string'
    );
  } catch (error) {
    console.error('Error validating flight:', error);
    return false;
  }
};

export const FlightSelector: React.FC<FlightSelectorProps> = ({
  onSelect = () => {},
  showResults = true,
  showFlightSearch = true,
  showFlightDetails = true,
  onInteract = () => {},
  initialSelectedFlight = null,
  initialFlightType = 'direct',
  currentPhase = 3,
  disabled = false,
  stepNumber,
}): React.ReactElement => {
  // Get store state and actions first
  const {
    fromLocation,
    toLocation,
    selectedDate,
    selectedType,
    directFlight,
    flightSegments,
    selectedFlight,
    currentSegmentIndex,
    currentPhase: storeCurrentPhase,
    isTransitioningPhases,
    isInitializing,
    setDirectFlight,
    setFlightSegments,
    setSelectedFlights,
    setSelectedFlight,
    setSelectedType,
    setFromLocation,
    setToLocation,
    setSelectedDate,
    setCurrentSegmentIndex,
    validateFlightSelection,
    setFlightState,
    validationState,
    completedSteps,
  } = useStore();

  // Component state
  const [mounted, setMounted] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [displayedFlights, setDisplayedFlights] = useState<Flight[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [allFlights, setAllFlights] = useState<Flight[]>([]);
  const [view, setView] = useState<'list' | 'card'>('card');
  const [errorMessages, setErrorMessages] = useState<{
    from?: string;
    to?: string;
    date?: string;
  }>({});
  const [selectedFlightNumber, setSelectedFlightNumber] = useState<
    string | null
  >(null);

  // Flight selection handler
  const handleFlightSelection = useCallback(
    (flight: Flight | null) => {
      if (!flight) {
        setSelectedFlights([]);
        return;
      }

      // Batch the state updates
      const flightData = {
        ...flight,
        id: flight.id || Math.random().toString(),
      };

      if (selectedType === 'direct') {
        setSelectedFlights([flightData]);
      } else {
        const updatedFlights = Array(currentSegmentIndex + 1).fill(null);
        updatedFlights[currentSegmentIndex] = flightData;
        setSelectedFlights(updatedFlights);
      }

      onInteract();
    },
    [selectedType, currentSegmentIndex, setSelectedFlights, onInteract]
  );

  // Use handleFlightSelection in your component
  const onFlightClick = (flight: Flight) => {
    handleFlightSelection(flight);
  };

  // Mount effect
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  console.log('\n=== FlightSelector State ===');
  console.log('Zustand State:', {
    fromLocation,
    toLocation,
    selectedDate,
    selectedType,
    directFlight,
    flightSegments,
    selectedFlight,
    currentSegmentIndex,
  });

  // Debug logging effect - all dependencies included as this is just for logging
  useEffect(() => {
    console.log('\n=== State Debug ===');
    console.log('Local flightSegments:', flightSegments);
    console.log('Store flightSegments:', flightSegments);
    console.log('Selected Type:', selectedType);
    console.log('Store Locations:', { fromLocation, toLocation });
  }, [flightSegments, selectedType, fromLocation, toLocation]);

  // Update initialization effect
  useEffect(() => {
    if (isInitializing) return;

    try {
      // Parse stored locations
      let storedFromLocation = null;
      let storedToLocation = null;

      try {
        if (fromLocation && fromLocation !== '{}') {
          storedFromLocation = JSON.parse(fromLocation);
        }
        if (toLocation && toLocation !== '{}') {
          storedToLocation = JSON.parse(toLocation);
        }
      } catch (error) {
        console.error('Error parsing stored locations:', error);
        return;
      }

      // Only update if values have changed
      const shouldUpdateDirectFlight =
        JSON.stringify(directFlight.fromLocation) !==
          JSON.stringify(storedFromLocation) ||
        JSON.stringify(directFlight.toLocation) !==
          JSON.stringify(storedToLocation);

      if (shouldUpdateDirectFlight) {
        // Update direct flight state
        setDirectFlight({
          ...directFlight,
          fromLocation: storedFromLocation,
          toLocation: storedToLocation,
        });

        // Sync with flightSegments if in direct mode
        if (selectedType === 'direct' && directFlight.selectedFlight) {
          const newSegments = [
            {
              fromLocation: storedFromLocation,
              toLocation: storedToLocation,
              selectedFlight: directFlight.selectedFlight,
              date: directFlight.date,
            },
          ];
          setFlightSegments(newSegments);
        }

        // Validate after state updates
        validateFlightSelection();
      }
    } catch (error) {
      console.error('Error in initialization effect:', error);
    }
  }, [
    fromLocation,
    toLocation,
    directFlight,
    isInitializing,
    setDirectFlight,
    selectedType,
    setFlightSegments,
    validateFlightSelection,
  ]);

  // Remove cleanup effect and only keep initialization
  useEffect(() => {
    if (selectedType !== 'multi') return;

    // Only initialize on mount
    if (flightSegments.length === 0) {
      const initialSegments = [
        {
          fromLocation: null,
          toLocation: null,
          selectedFlight: null,
          date: null,
        },
        {
          fromLocation: null,
          toLocation: null,
          selectedFlight: null,
          date: null,
        },
      ];
      setFlightSegments(initialSegments);
    }
  }, [selectedType, flightSegments.length, setFlightSegments]);

  const handleDateClear = () => {
    if (selectedType === 'direct') {
      setDirectFlight({
        ...directFlight,
        date: null,
        selectedFlight: null,
      });
    } else {
      const newSegments = [...flightSegments];
      newSegments[currentSegmentIndex] = {
        ...newSegments[currentSegmentIndex],
        date: null,
        selectedFlight: null,
      };
      setFlightSegments(newSegments);
    }
    setSelectedDate(null);
  };

  // Helper function to safely parse ISO date string
  const parseDateString = (dateString: string | null): Date | null => {
    if (!dateString) return null;
    try {
      const parsed = parseISO(dateString);
      return isValid(parsed) ? parsed : null;
    } catch (error) {
      console.error('Error parsing date:', error);
      return null;
    }
  };

  // Update the formatStoreDate helper function
  const formatStoreDate = (date: Date | null): string | null => {
    if (!date) return null;
    try {
      return format(date, 'yyyy-MM-dd');
    } catch (error) {
      console.error('Error formatting store date:', error);
      return null;
    }
  };

  const handleDateChange = (newDate: Date | null) => {
    console.log('=== handleDateChange called ===');
    console.log('Input date:', newDate);

    if (!newDate) {
      console.log('No date provided, clearing date');
      handleDateClear();
      return;
    }

    try {
      // Create a new date object to avoid modifying the input
      const safeDate = new Date(newDate.getTime());
      safeDate.setHours(12, 0, 0, 0);

      // Format the date for storage
      const formattedDate = format(safeDate, 'yyyy-MM-dd');
      console.log('Processing date:', {
        originalDate: newDate,
        safeDate,
        formattedDate,
        selectedType,
        currentDirectFlight: directFlight,
        currentSegments: flightSegments,
      });

      // Update the store first
      setSelectedDate(formattedDate);

      // Then update the component state
      if (selectedType === 'direct') {
        const newDirectFlight = {
          ...directFlight,
          date: safeDate,
          selectedFlight: null,
        };
        setDirectFlight(newDirectFlight);
      } else {
        const newSegments = [...flightSegments];
        newSegments[currentSegmentIndex] = {
          ...newSegments[currentSegmentIndex],
          date: safeDate,
          selectedFlight: null,
        };
        setFlightSegments(newSegments);
      }
    } catch (error) {
      console.error('Error in handleDateChange:', error);
    }
  };

  const CustomInput = React.forwardRef<HTMLInputElement, CustomDateInputProps>(
    ({ value = '', onClear, onClick }, ref) => {
      console.log('CustomInput render:', {
        value,
        hasOnClear: !!onClear,
        hasOnClick: !!onClick,
      });

      // Format the date for display if it exists
      const displayValue = value ? format(new Date(value), 'dd.MM.yyyy') : '';
      console.log('CustomInput displayValue:', displayValue);

      return (
        <CustomDateInput
          value={displayValue}
          ref={ref}
          onClear={onClear}
          onClick={onClick}
        />
      );
    }
  );

  CustomInput.displayName = 'CustomInput';

  const handleSearchFlights = async (segmentIndex: number = 0) => {
    try {
      setLoading(true);
      setErrorMessage(null);

      // Get the current segment based on flight type
      const currentSegment =
        selectedType === 'multi' ? flightSegments[segmentIndex] : directFlight;

      console.log('Searching flights for segment:', {
        segmentIndex,
        currentSegment,
        selectedType,
        date: currentSegment.date,
      });

      if (
        !currentSegment.fromLocation ||
        !currentSegment.toLocation ||
        !currentSegment.date
      ) {
        setErrorMessage('Please select origin, destination, and date');
        setLoading(false);
        return;
      }

      // Format the date consistently
      const segmentDate =
        currentSegment.date instanceof Date
          ? currentSegment.date
          : new Date(currentSegment.date);

      if (isNaN(segmentDate.getTime())) {
        setErrorMessage('Invalid date selected');
        setLoading(false);
        return;
      }

      // Normalize the date to noon UTC to avoid timezone issues
      segmentDate.setHours(12, 0, 0, 0);
      const formattedDate = format(segmentDate, 'yyyy-MM-dd');

      // Extract IATA codes from locations
      const fromIata = currentSegment.fromLocation.value;
      const toIata = currentSegment.toLocation.value;

      console.log('Search parameters:', {
        fromIata,
        toIata,
        formattedDate,
        segmentIndex,
      });

      // Make the API call
      const params = new URLSearchParams({
        from_iata: fromIata,
        to_iata: toIata,
        date: formattedDate,
      });

      const response = await fetch(
        `/.netlify/functions/searchFlights?${params}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch flights');
      }

      const data = await response.json();
      const flights = data.data || [];

      // Transform and validate the flights
      const validFlights = flights
        .map((flight: RawFlight) => ({
          id: flight.id?.toString() || Math.random().toString(),
          flightNumber: flight.flightnumber_iata || '',
          airline: flight.flightnumber_iata?.substring(0, 2) || '',
          departureCity: flight.dep_city || flight.dep_iata || '',
          arrivalCity: flight.arr_city || flight.arr_iata || '',
          departureTime: formatTime(flight.dep_time_sched),
          arrivalTime: formatTime(flight.arr_time_sched),
          departure: flight.dep_iata || '',
          arrival: flight.arr_iata || '',
          duration: calculateDuration(
            formatTime(flight.dep_time_sched),
            formatTime(flight.arr_time_sched)
          ),
          stops: 0,
          date: formattedDate,
          status: flight.status || 'Unknown',
          aircraft: flight.aircraft_type || 'Unknown',
          class: 'economy',
          price: 0,
          departureAirport: flight.dep_iata || '',
          arrivalAirport: flight.arr_iata || '',
          scheduledDepartureTime: formatTime(flight.dep_time_sched),
          actualDeparture: flight.dep_time_fact
            ? formatTime(flight.dep_time_fact)
            : null,
          actualArrival: flight.arr_time_fact
            ? formatTime(flight.arr_time_fact)
            : null,
          arrivalDelay: flight.arr_delay_min || null,
        }))
        .filter(isValidFlight);

      console.log('Valid flights:', validFlights);
      setDisplayedFlights(validFlights);
      setAllFlights(validFlights);
      setLoading(false);

      // Open the search modal if we have flights
      if (validFlights.length > 0) {
        setIsSearchModalOpen(true);
      } else {
        setErrorMessage('No flights found for the selected route and date.');
      }
    } catch (error) {
      console.error('Error searching flights:', error);
      setErrorMessage('Failed to search flights. Please try again.');
      setLoading(false);
    }
  };

  const handleFlightSelect = React.useCallback(
    (flight: Flight, segmentIndex: number) => {
      try {
        // Close the search modal first
        setIsSearchModalOpen(false);

        // Update local state immediately
        setSelectedFlightNumber(flight.flightNumber);

        // Prepare flight-specific updates
        const flightUpdates: Partial<StoreState> = {
          selectedFlight: flight,
          _lastUpdate: Date.now(), // Force immediate update
        };

        // For direct flights, update both selected flights array and direct flight
        if (selectedType === 'direct') {
          flightUpdates.selectedFlights = [flight];
          flightUpdates.directFlight = {
            ...directFlight,
            selectedFlight: flight,
          };

          // Update validation state immediately
          flightUpdates.validationState = {
            ...validationState,
            isFlightValid: true,
            stepValidation: {
              ...validationState.stepValidation,
              1: true,
            },
            1: true,
            _timestamp: Date.now(),
          };

          // Update completed steps immediately
          flightUpdates.completedSteps = Array.from(
            new Set([...completedSteps, 1])
          ).sort((a, b) => a - b);
        } else {
          // For multi-segment flights
          const newSegments = [...flightSegments];
          newSegments[currentSegmentIndex] = {
            ...newSegments[currentSegmentIndex],
            selectedFlight: flight,
          };
          flightUpdates.flightSegments = newSegments;
          flightUpdates.selectedFlights = newSegments
            .map((segment) => segment.selectedFlight)
            .filter((f): f is Flight => f !== null);

          // Update validation state for multi-segment
          const hasAllSegments = newSegments.every(
            (segment) => segment.selectedFlight !== null
          );
          flightUpdates.validationState = {
            ...validationState,
            isFlightValid: hasAllSegments,
            stepValidation: {
              ...validationState.stepValidation,
              1: hasAllSegments,
            },
            1: hasAllSegments,
            _timestamp: Date.now(),
          };

          // Update completed steps for multi-segment
          if (hasAllSegments) {
            flightUpdates.completedSteps = Array.from(
              new Set([...completedSteps, 1])
            ).sort((a, b) => a - b);
          }
        }

        // Update flight state in a single batch
        setFlightState(flightUpdates);

        // Force component update
        setDisplayedFlights((prev) => [...prev]);

        // Notify parent components
        onSelect(flight);
        onInteract();
      } catch (error) {
        console.error('Error in handleFlightSelect:', error);
        setErrorMessage('Error selecting flight');
      }
    },
    [
      selectedType,
      currentSegmentIndex,
      flightSegments,
      directFlight,
      validationState,
      completedSteps,
      setFlightState,
      onSelect,
      onInteract,
    ]
  );

  // Helper function to generate a booking reference
  const generateBookingReference = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleFocus = async () => {
    // Return empty array on initial focus
    return [];
  };

  const searchAirports = async (query: string): Promise<LocationData[]> => {
    try {
      if (!query.trim()) {
        return [];
      }

      // If query is less than 3 characters, return empty results
      // but don't show an error since the user is still typing
      if (query.trim().length < 3) {
        return [
          {
            value: '',
            label: '',
            description: 'Please enter at least 3 characters to search',
            city: '',
            dropdownLabel: 'Please enter at least 3 characters to search',
          },
        ];
      }

      const params = new URLSearchParams();
      params.append('term', query);
      params.append('lang', 'en');

      const response = await fetch(
        `/.netlify/functions/searchAirports?${params.toString()}`
      );

      if (!response.ok) {
        console.error('Failed to fetch airports:', response.statusText);
        return [];
      }

      const data = await response.json();
      console.log('Airport search results:', data);

      const airports = Array.isArray(data) ? data : data.data || [];

      return airports.map((airport: Airport) => ({
        value: airport.iata_code,
        label: airport.iata_code,
        description: airport.city || '',
        city: airport.city || '',
        dropdownLabel: `${airport.name} (${airport.iata_code})`,
      }));
    } catch (error) {
      console.error('Error searching airports:', error);
      return [];
    }
  };

  const handleFlightDelete = (index?: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('Delete button clicked for flight preview card, index:', index);

    if (selectedType === 'direct') {
      // Only clear the selected flight, preserve all other fields
      setDirectFlight({
        ...directFlight,
        selectedFlight: null,
      });

      // Update selected flights in store
      setSelectedFlights([]);
      setSelectedFlight(null);

      // Notify parent component
      onSelect(null);
    } else if (typeof index === 'number') {
      // Remove the segment at the specified index
      const newSegments = flightSegments.filter((_, i) => i !== index);

      // Ensure we have at least two segments
      while (newSegments.length < 2) {
        newSegments.push({
          fromLocation: null,
          toLocation: null,
          selectedFlight: null,
          date: null,
        });
      }

      // Update the segments in the store
      setFlightSegments(newSegments);

      // Update selected flights in store while maintaining order
      const updatedSelectedFlights = newSegments
        .map((segment) => segment.selectedFlight)
        .filter((flight): flight is Flight => flight !== null);

      // Update the store's selected flights
      setSelectedFlights(updatedSelectedFlights);

      // Update selected flight in store if it was the deleted one
      if (selectedFlight && index === currentSegmentIndex) {
        setSelectedFlight(null);
      }

      // Update current segment index if needed
      if (currentSegmentIndex >= newSegments.length) {
        setCurrentSegmentIndex(Math.max(0, newSegments.length - 1));
      }

      // Notify parent component
      if (updatedSelectedFlights.length === 0) {
        onSelect(null);
      } else {
        onSelect(updatedSelectedFlights);
      }
    }

    onInteract();
  };

  const handleClearField = (
    index: number,
    field: 'fromLocation' | 'toLocation'
  ) => {
    const newSegments = [...flightSegments];

    if (field === 'fromLocation') {
      // When clearing fromLocation, only clear that field and its flight
      newSegments[index] = {
        ...newSegments[index],
        fromLocation: null,
        selectedFlight: null,
      };

      // If this is not the first segment, break the link with the previous segment
      if (index > 0) {
        newSegments[index - 1] = {
          ...newSegments[index - 1],
          toLocation: null,
          selectedFlight: null,
        };
      }
    } else if (field === 'toLocation') {
      // When clearing toLocation, only clear that field and its flight
      newSegments[index] = {
        ...newSegments[index],
        toLocation: null,
        selectedFlight: null,
      };

      // If there's a next segment, clear its fromLocation
      if (index < newSegments.length - 1) {
        newSegments[index + 1] = {
          ...newSegments[index + 1],
          fromLocation: null,
          selectedFlight: null,
        };
      }
    }

    console.log('Clearing field:', field, 'at index:', index);
    console.log('Updated segments:', newSegments);

    setFlightSegments(newSegments);

    // Update Redux store if this is the first segment
    if (index === 0) {
      if (field === 'fromLocation') {
        setFromLocation(null);
      } else if (field === 'toLocation') {
        setToLocation(null);
      }
    }

    // Update Redux store with remaining flights
    const remainingFlights = newSegments
      .map((segment) => segment.selectedFlight)
      .filter((flight): flight is Flight => flight !== null);

    if (remainingFlights.length > 0) {
      setSelectedFlights(remainingFlights);
    } else {
      setSelectedFlights([]);
    }
  };

  const handleFlightEdit = async (index: number) => {
    console.log('\n=== handleFlightEdit Debug ===');
    console.log('Editing segment at index:', index);

    // Set the current segment index first
    setCurrentSegmentIndex(index);

    // Open search modal first
    setIsSearchModalOpen(true);

    // Get the current segment
    const segment =
      selectedType === 'direct' ? directFlight : flightSegments[index];
    console.log('Current segment:', segment);

    // Wait for modal to open
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Trigger search with the segment's locations
    if (segment.fromLocation && segment.toLocation) {
      console.log('Searching with segment locations:', {
        from: segment.fromLocation,
        to: segment.toLocation,
        date: segment.date,
      });
      await handleSearchFlights(index);
    }

    console.log('=== End handleFlightEdit ===\n');
  };

  const filteredFlights = React.useMemo(() => {
    if (!Array.isArray(displayedFlights)) {
      console.error('displayedFlights is not an array:', displayedFlights);
      return [];
    }
    if (!searchTerm) return displayedFlights;
    const term = searchTerm.toLowerCase();
    return displayedFlights.filter((flight) => {
      if (!flight) return false;
      return (
        flight.flightNumber?.toLowerCase().includes(term) ||
        flight.airline?.toLowerCase().includes(term) ||
        flight.departureCity?.toLowerCase().includes(term) ||
        flight.arrivalCity?.toLowerCase().includes(term) ||
        flight.departure?.toLowerCase().includes(term) ||
        flight.arrival?.toLowerCase().includes(term) ||
        flight.date?.includes(term)
      );
    });
  }, [displayedFlights, searchTerm]);

  // Update handleSheetSearch to properly search flights
  const handleSheetSearch = async (term: string) => {
    setSearchTerm(term);
    if (!term) {
      setDisplayedFlights(allFlights);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append('term', term);
      params.append('lang', 'en');

      const response = await fetch(
        `/.netlify/functions/searchFlights?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch flights');
      }

      const data = await response.json();
      const flights = data.data || [];

      // Transform the flights data
      const transformedFlights = flights.map((flight: RawFlight) => ({
        id: flight.id?.toString() || Math.random().toString(),
        flightNumber: flight.flightnumber_iata || '',
        airline: flight.flightnumber_iata?.substring(0, 2) || '',
        departureCity: flight.dep_city || flight.dep_iata || '',
        arrivalCity: flight.arr_city || flight.arr_iata || '',
        departureTime: formatTime(flight.dep_time_sched),
        arrivalTime: formatTime(flight.arr_time_sched),
        departure: flight.dep_iata || '',
        arrival: flight.arr_iata || '',
        duration: calculateDuration(
          formatTime(flight.dep_time_sched),
          formatTime(flight.arr_time_sched)
        ),
        stops: 0,
        date: format(new Date(), 'yyyy-MM-dd'),
        status: flight.status || 'Unknown',
        aircraft: 'Unknown',
        class: 'economy',
        dep_iata: flight.dep_iata,
        arr_iata: flight.arr_iata,
        dep_time_sched: flight.dep_time_sched,
        arr_time_sched: flight.arr_time_sched,
        departureAirport: flight.dep_iata || '',
        arrivalAirport: flight.arr_iata || '',
        price: 0,
      }));

      setDisplayedFlights(transformedFlights);
    } catch (error) {
      console.error('Error searching flights:', error);
      setDisplayedFlights([]);
    }
  };

  // Update the effect to only switch to multi-city when adding different flights
  useEffect(() => {
    const uniqueFlights = new Set(
      flightSegments
        .map((segment) => segment.selectedFlight)
        .filter(isValidFlight)
        .map((flight) => flight.flightNumber)
    );
    if (uniqueFlights.size > 1) {
      setSelectedType('multi');
    }
  }, [flightSegments, setSelectedType]);

  // Add a computed value for visible segments
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const visibleSegments = useMemo(() => {
    if (selectedType === 'multi') {
      if (flightSegments.length < 2) {
        const currentSegments = [...flightSegments];
        while (currentSegments.length < 2) {
          const lastSegment = currentSegments[currentSegments.length - 1];
          currentSegments.push({
            fromLocation: lastSegment?.toLocation || null,
            toLocation: null,
            selectedFlight: null,
            date: new Date(),
          });
        }
        return currentSegments;
      }
      return flightSegments;
    }
    return [flightSegments[0]];
  }, [selectedType, flightSegments]);

  // Add a helper function to get current locations
  const getCurrentLocations = () => {
    let fromLoc = null;
    let toLoc = null;

    // First try from current segments
    if (flightSegments.length > 0) {
      fromLoc = flightSegments[0].fromLocation;
      toLoc = flightSegments[flightSegments.length - 1].toLocation;
    }

    // Then try direct flight state
    if (!fromLoc && directFlight.fromLocation) {
      fromLoc = directFlight.fromLocation;
    }
    if (!toLoc && directFlight.toLocation) {
      toLoc = directFlight.toLocation;
    }

    // Finally try Redux store
    if (!fromLoc && fromLocation) {
      try {
        fromLoc = JSON.parse(fromLocation);
      } catch (error) {
        console.error('Error parsing from location:', error);
      }
    }
    if (!toLoc && toLocation) {
      try {
        toLoc = JSON.parse(toLocation);
      } catch (error) {
        console.error('Error parsing to location:', error);
      }
    }

    return { fromLoc, toLoc };
  };

  const handleFlightTypeChange = useCallback(
    (newType: 'direct' | 'multi') => {
      console.log('\n=== Flight Type Change ===');
      console.log('Current state:', {
        fromLocation,
        toLocation,
        directFlight,
        flightSegments,
      });

      // Get current locations from either direct flight or first segment
      let currentFromLocation = null;
      let currentToLocation = null;
      let currentDate = null;
      let currentSelectedFlight = null;

      if (selectedType === 'direct') {
        currentFromLocation = directFlight.fromLocation;
        currentToLocation = directFlight.toLocation;
        currentDate = directFlight.date;
        currentSelectedFlight = directFlight.selectedFlight;
      } else if (flightSegments.length > 0) {
        currentFromLocation = flightSegments[0].fromLocation;
        currentToLocation = flightSegments[0].toLocation;
        currentDate = flightSegments[0].date;
        currentSelectedFlight = flightSegments[0].selectedFlight;
      }

      // If switching to multi, preserve current locations and flight
      if (newType === 'multi') {
        // If we're coming from direct mode, create new segments
        if (selectedType === 'direct') {
          const newSegments = [
            {
              // Preserve first segment data from direct flight
              fromLocation: currentFromLocation,
              toLocation: currentToLocation,
              selectedFlight: currentSelectedFlight,
              date: currentDate,
            },
            {
              // Link second segment's from location to first segment's to location
              fromLocation: currentToLocation ? { ...currentToLocation } : null,
              toLocation: null,
              selectedFlight: null,
              date: null,
            },
          ];
          setFlightSegments(newSegments);
        }

        // Preserve the selected flight in both segments and selectedFlights array
        if (currentSelectedFlight) {
          setSelectedFlights([currentSelectedFlight]);
          setSelectedFlight(currentSelectedFlight);
        }
      } else {
        // If switching to direct, preserve first segment's data
        setDirectFlight({
          fromLocation: currentFromLocation,
          toLocation: currentToLocation,
          date: currentDate,
          selectedFlight: currentSelectedFlight,
        });
        // In direct mode, preserve the selected flight
        if (currentSelectedFlight) {
          setSelectedFlights([currentSelectedFlight]);
          setSelectedFlight(currentSelectedFlight);
        }
      }

      // Update store state
      if (currentFromLocation) {
        setFromLocation(JSON.stringify(currentFromLocation));
      }
      if (currentToLocation) {
        setToLocation(JSON.stringify(currentToLocation));
      }
      if (currentDate) {
        try {
          // Ensure currentDate is a valid Date object
          const safeDate =
            currentDate instanceof Date ? currentDate : new Date(currentDate);
          if (!isNaN(safeDate.getTime())) {
            setSelectedDate(format(safeDate, 'yyyy-MM-dd'));
          }
        } catch (error) {
          console.error('Error formatting date:', error);
        }
      }

      // Update type after state is set
      setSelectedType(newType);

      console.log('=== End Flight Type Change ===\n');
    },
    [
      directFlight,
      flightSegments,
      selectedType,
      setDirectFlight,
      setFlightSegments,
      setFromLocation,
      setSelectedDate,
      setSelectedFlight,
      setSelectedFlights,
      setSelectedType,
      setToLocation,
      fromLocation,
      toLocation,
    ]
  );

  // Update addFlightSegment to properly manage segments
  const addFlightSegment = () => {
    console.log('=== Adding Flight Segment ===');
    console.log('Current segments:', flightSegments);

    // Get the last segment
    const lastSegment = flightSegments[flightSegments.length - 1];

    // Create new segment with the last segment's toLocation as fromLocation
    const newSegment = {
      fromLocation: lastSegment?.toLocation || null,
      toLocation: null,
      selectedFlight: null,
      date: null,
    };

    // Create new segments array with the new segment
    const newSegments = [...flightSegments, newSegment];
    console.log('New segments:', newSegments);

    // Update state
    setFlightSegments(newSegments);
    setCurrentSegmentIndex(newSegments.length - 1);

    // Switch to multi-city mode if not already
    if (selectedType !== 'multi') {
      setSelectedType('multi');
    }

    console.log('=== End Adding Flight Segment ===');
  };

  // Update the cleanup effect to not remove empty segments that were just added
  useEffect(() => {
    if (selectedType !== 'multi') return;

    // Only initialize on mount
    if (flightSegments.length === 0) {
      const initialSegments = [
        {
          fromLocation: null,
          toLocation: null,
          selectedFlight: null,
          date: null,
        },
        {
          fromLocation: null,
          toLocation: null,
          selectedFlight: null,
          date: null,
        },
      ];
      setFlightSegments(initialSegments);
    }
  }, [selectedType, flightSegments.length, setFlightSegments]);

  // Update updateFlightSegment to maintain segment linking
  const updateFlightSegment = (
    index: number,
    updates: Partial<Omit<FlightSegmentData, 'date'> & { date?: Date }>
  ) => {
    console.log('=== updateFlightSegment Debug ===');
    console.log('Updating segment at index:', index);
    console.log('Old segment:', flightSegments[index]);
    console.log('Updates:', updates);

    const newSegments = [...flightSegments];

    // Update the current segment without affecting the selected flight
    newSegments[index] = {
      ...newSegments[index],
      ...updates,
    };

    // If toLocation changed, update the next segment's fromLocation
    if (updates.toLocation && index < newSegments.length - 1) {
      newSegments[index + 1] = {
        ...newSegments[index + 1],
        fromLocation: { ...updates.toLocation },
      };
    }

    console.log('New segments after update:', newSegments);

    setFlightSegments(newSegments);

    // Update store with the first segment's locations
    if (index === 0) {
      if (updates.fromLocation) {
        const stringifiedFrom = JSON.stringify(updates.fromLocation);
        setFromLocation(stringifiedFrom);
      }
      if (updates.toLocation) {
        const stringifiedTo = JSON.stringify(updates.toLocation);
        setToLocation(stringifiedTo);
      }
    }
  };

  // Update the search filtering logic
  useEffect(() => {
    if (!searchTerm) {
      setDisplayedFlights(allFlights);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = allFlights.filter((flight) => {
      return (
        flight.flightNumber?.toLowerCase().includes(searchTermLower) ||
        flight.airline?.toLowerCase().includes(searchTermLower) ||
        flight.departureCity?.toLowerCase().includes(searchTermLower) ||
        flight.arrivalCity?.toLowerCase().includes(searchTermLower) ||
        flight.departure?.toLowerCase().includes(searchTermLower) ||
        flight.arrival?.toLowerCase().includes(searchTermLower)
      );
    });
    setDisplayedFlights(filtered);
  }, [searchTerm, allFlights]);

  // Ensure currentSegmentIndex stays valid when segments change
  useEffect(() => {
    if (currentSegmentIndex >= flightSegments.length) {
      setCurrentSegmentIndex(Math.max(0, flightSegments.length - 1));
    }
  }, [currentSegmentIndex, flightSegments.length, setCurrentSegmentIndex]);

  // Update Redux when flight type changes
  useEffect(() => {
    setSelectedType(selectedType);
  }, [selectedType, setSelectedType, setFlightSegments]);

  const handleModalLocationChange = (
    location: Location | null,
    field: 'fromLocation' | 'toLocation'
  ) => {
    console.log('\n=== Modal Location Change ===');
    console.log('Field:', field);
    console.log('New location:', location);
    console.log('Current phase:', storeCurrentPhase);

    // Clear error message when user starts interacting
    setErrorMessage(null);

    // Update the appropriate location based on flight type
    if (selectedType === 'direct') {
      setDirectFlight({
        ...directFlight,
        [field]: location,
        selectedFlight: null,
      });

      // Update store
      if (
        location &&
        location.value &&
        location.value !== 'null' &&
        location.label?.trim()
      ) {
        console.log('Dispatching location to store:', location);
        const stringifiedLocation = JSON.stringify(location);
        if (field === 'fromLocation') {
          setFromLocation(stringifiedLocation);
        } else {
          setToLocation(stringifiedLocation);
        }
      } else {
        console.log('Clearing location in store');
        if (field === 'fromLocation') {
          setFromLocation(null);
        } else {
          setToLocation(null);
        }
      }
    } else {
      const newSegments = [...flightSegments];
      newSegments[currentSegmentIndex] = {
        ...newSegments[currentSegmentIndex],
        [field]: location,
        selectedFlight: null,
      };
      setFlightSegments(newSegments);
    }

    // Clear any error messages for this field
    setErrorMessages((prev) => ({
      ...prev,
      [field === 'fromLocation' ? 'from' : 'to']: '',
    }));

    // Trigger onSelect callback
    onSelect(null);
    onInteract();

    console.log('=== End Modal Location Change ===\n');
  };

  const handleDirectFromLocationChange = (location: LocationData | null) => {
    console.log('\n=== Direct From Location Change ===');
    console.log('New location:', location);
    console.log('Current phase:', currentPhase);

    // Update direct flight state
    const newDirectFlight = {
      ...directFlight,
      fromLocation: location,
      selectedFlight: null,
    };
    setDirectFlight(newDirectFlight);

    // Update store location immediately
    if (
      location &&
      location.value &&
      location.value !== 'null' &&
      location.label?.trim()
    ) {
      const stringifiedLocation = JSON.stringify(location);
      setFromLocation(stringifiedLocation);
    } else {
      setFromLocation(null);
    }

    // Clear any selected flights
    setSelectedFlights([]);

    // Clear any error messages
    setErrorMessages((prev) => ({
      ...prev,
      from: '',
    }));

    // Notify parent component
    onSelect(null);
    onInteract();

    console.log('=== End Direct From Location Change ===\n');
  };

  const handleDirectToLocationChange = (location: LocationData | null) => {
    console.log('\n=== Direct To Location Change ===');
    console.log('New location:', location);
    console.log('Current phase:', currentPhase);

    // Update direct flight state
    const newDirectFlight = {
      ...directFlight,
      toLocation: location,
      selectedFlight: null,
    };
    setDirectFlight(newDirectFlight);

    // Update store location immediately
    if (
      location &&
      location.value &&
      location.value !== 'null' &&
      location.label?.trim()
    ) {
      const stringifiedLocation = JSON.stringify(location);
      setToLocation(stringifiedLocation);
    } else {
      setToLocation(null);
    }

    // Clear any selected flights
    setSelectedFlights([]);

    // Clear any error messages
    setErrorMessages((prev) => ({
      ...prev,
      to: '',
    }));

    // Notify parent component
    onSelect(null);
    onInteract();

    console.log('=== End Direct To Location Change ===\n');
  };

  // Update the date handling
  const handleDirectDateChange = (newDate: Date | null) => {
    if (newDate) {
      // Set the time to noon to avoid timezone issues
      const normalizedDate = new Date(
        newDate.getFullYear(),
        newDate.getMonth(),
        newDate.getDate(),
        12
      );

      // Update direct flight state with proper typing
      setDirectFlight({
        fromLocation: directFlight.fromLocation,
        toLocation: directFlight.toLocation,
        date: normalizedDate,
        selectedFlight: null,
      });

      // Update store state with formatted date string
      const formattedDate = format(normalizedDate, 'yyyy-MM-dd');
      setSelectedDate(formattedDate);

      // Clear any selected flights since date changed
      setSelectedFlights([]);
    } else {
      // Handle date clear
      setDirectFlight({
        fromLocation: directFlight.fromLocation,
        toLocation: directFlight.toLocation,
        date: null,
        selectedFlight: null,
      });
      setSelectedDate(null);
      setSelectedFlights([]);
    }
  };

  const handleMultiLocationChange = (
    location: LocationData | null,
    field: 'fromLocation' | 'toLocation',
    index: number
  ) => {
    try {
      const newSegments = [...flightSegments];

      // Update the current segment
      newSegments[index] = {
        ...newSegments[index],
        [field]: location,
        selectedFlight: null,
      };

      // If we're changing toLocation and we're not on the last segment
      // update the next segment's fromLocation to match
      if (field === 'toLocation' && index < newSegments.length - 1) {
        newSegments[index + 1] = {
          ...newSegments[index + 1],
          fromLocation: location ? { ...location } : null,
        };
      }

      setFlightSegments(newSegments);

      // Update store locations if this is the first segment
      if (index === 0) {
        if (field === 'fromLocation') {
          setFromLocation(location ? JSON.stringify(location) : null);
        } else {
          setToLocation(location ? JSON.stringify(location) : null);
        }
      }
    } catch (error) {
      console.error('Error in handleMultiLocationChange:', error);
      setErrorMessage('Error updating flight locations');
    }
  };

  const handleMultiDateChange = (date: Date | null, index: number) => {
    console.log('=== Multi Date Change ===');
    console.log('Index:', index);
    console.log('New date:', date);

    try {
      if (!date) {
        const newSegments = [...flightSegments];
        newSegments[index] = {
          ...newSegments[index],
          date: null,
          selectedFlight: null,
        };
        setFlightSegments(newSegments);
        if (index === 0) {
          setSelectedDate(null);
        }
        return;
      }

      // Create a safe copy of the date
      const safeDate = new Date(date.getTime());
      safeDate.setHours(12, 0, 0, 0);

      const newSegments = [...flightSegments];
      newSegments[index] = {
        ...newSegments[index],
        date: safeDate,
        selectedFlight: null,
      };

      setFlightSegments(newSegments);

      // Update store's selectedDate with the first segment's date
      if (index === 0) {
        setSelectedDate(formatStoreDate(safeDate));
      }

      // Clear any error messages
      setErrorMessage(null);

      // Update selected flights in store
      const selectedFlights = newSegments
        .map((segment) => segment.selectedFlight)
        .filter((flight): flight is Flight => flight !== null);
      setSelectedFlights(selectedFlights);

      console.log('=== End Multi Date Change ===');
    } catch (error) {
      console.error('Error in handleMultiDateChange:', error);
      setErrorMessage('Invalid date selection');
    }
  };

  const handleLocationChange = (
    location: Location | null,
    type: 'from' | 'to'
  ) => {
    const currentSegment = flightSegments[currentSegmentIndex];
    const { date, ...rest } = currentSegment;
    updateFlightSegment(currentSegmentIndex, {
      ...rest,
      [type === 'from' ? 'fromLocation' : 'toLocation']: location,
    });
  };

  // Calculate duration for selected flight
  useEffect(() => {
    if (selectedFlight) {
      // Duration calculation logic
    }
  }, [selectedFlight]);

  // Update flight data changes effect - remove mountedRef from dependencies
  useEffect(() => {
    if (isInitializing || isTransitioningPhases) return;

    // Update flight segments
    if (selectedType === 'multi' && flightSegments.length > 0) {
      const currentSegment = flightSegments[currentSegmentIndex];
      if (currentSegment && selectedFlight) {
        const shouldUpdate =
          JSON.stringify(currentSegment.selectedFlight) !==
          JSON.stringify(selectedFlight);

        if (shouldUpdate) {
          const newSegments = [...flightSegments];
          newSegments[currentSegmentIndex] = {
            ...currentSegment,
            selectedFlight,
          };
          setFlightSegments(newSegments);
        }
      }
    }
  }, [
    selectedFlight,
    currentSegmentIndex,
    isInitializing,
    isTransitioningPhases,
    selectedType,
    flightSegments,
    setFlightSegments,
  ]);

  // Update cleanup effect - remove mountedRef from dependencies
  useEffect(() => {
    if (isTransitioningPhases) return;

    // Only initialize on mount
    if (selectedType === 'multi' && flightSegments.length === 0) {
      setFlightSegments([
        {
          fromLocation: null,
          toLocation: null,
          date: null,
          selectedFlight: null,
        },
        {
          fromLocation: null,
          toLocation: null,
          date: null,
          selectedFlight: null,
        },
      ]);
    }
  }, [
    selectedType,
    isTransitioningPhases,
    flightSegments.length,
    setFlightSegments,
  ]);

  // Update segment cleanup effect - remove mountedRef from dependencies
  useEffect(() => {
    if (selectedType !== 'multi') return;

    // Only initialize if we have no segments
    if (flightSegments.length === 0) {
      setFlightSegments([
        {
          fromLocation: null,
          toLocation: null,
          selectedFlight: null,
          date: null,
        },
        {
          fromLocation: null,
          toLocation: null,
          selectedFlight: null,
          date: null,
        },
      ]);
    }
  }, [selectedType, flightSegments.length, setFlightSegments]);

  const handleClearDates = () => {
    flightSegments.forEach((_, index) => {
      updateFlightSegment(index, {
        fromLocation: flightSegments[index].fromLocation,
        toLocation: flightSegments[index].toLocation,
        selectedFlight: flightSegments[index].selectedFlight,
        date: undefined,
      });
    });
  };

  // Update the effect to handle multi-city state restoration
  useEffect(() => {
    if (selectedType === 'multi') {
      // Ensure we have at least two segments
      if (flightSegments.length < 2) {
        const currentSegments = [...flightSegments];
        while (currentSegments.length < 2) {
          const lastSegment = currentSegments[currentSegments.length - 1];
          currentSegments.push({
            fromLocation: lastSegment?.toLocation || null,
            toLocation: null,
            selectedFlight: null,
            date: new Date(),
          });
        }
        setFlightSegments(currentSegments);
      }
    }
  }, [selectedType, flightSegments, setFlightSegments]);

  // Helper function to safely convert string to Date for DatePicker
  const getSelectedDate = (dateString: string | null): Date | null => {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return null;
      // Set time to noon to avoid timezone issues
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
    } catch (error) {
      console.error('Error converting date:', error);
      return null;
    }
  };

  // Flight selection notification effect - onSelect callback intentionally included
  // as it's provided by the parent and should trigger updates
  useEffect(() => {
    if (directFlight && directFlight.selectedFlight) {
      onSelect(directFlight.selectedFlight);
    }
  }, [directFlight, onSelect]);

  // Update segment initialization effect
  useEffect(() => {
    if (isInitializing) return;

    try {
      // Parse stored locations
      let storedFromLocation = null;
      let storedToLocation = null;

      try {
        if (fromLocation && fromLocation !== '{}') {
          storedFromLocation = JSON.parse(fromLocation);
        }
        if (toLocation && toLocation !== '{}') {
          storedToLocation = JSON.parse(toLocation);
        }
      } catch (error) {
        console.error('Error parsing locations:', error);
        return;
      }

      // Only update if values have changed
      const shouldUpdateDirectFlight =
        JSON.stringify(directFlight.fromLocation) !==
          JSON.stringify(storedFromLocation) ||
        JSON.stringify(directFlight.toLocation) !==
          JSON.stringify(storedToLocation);

      if (shouldUpdateDirectFlight) {
        setDirectFlight({
          ...directFlight,
          fromLocation: storedFromLocation,
          toLocation: storedToLocation,
        });
      }
    } catch (error) {
      console.error('Error in initialization effect:', error);
    }
  }, [fromLocation, toLocation, directFlight, isInitializing, setDirectFlight]);

  // Update effect to handle segment index
  useEffect(() => {
    if (currentSegmentIndex >= flightSegments.length) {
      setCurrentSegmentIndex(Math.max(0, flightSegments.length - 1));
    }
  }, [currentSegmentIndex, flightSegments.length, setCurrentSegmentIndex]);

  // Update effect to handle flight data changes
  useEffect(() => {
    if (isInitializing || isTransitioningPhases) return;

    // Update flight segments
    if (selectedType === 'multi' && flightSegments.length > 0) {
      const currentSegment = flightSegments[currentSegmentIndex];
      if (currentSegment && selectedFlight) {
        const shouldUpdate =
          JSON.stringify(currentSegment.selectedFlight) !==
          JSON.stringify(selectedFlight);

        if (shouldUpdate) {
          const newSegments = [...flightSegments];
          newSegments[currentSegmentIndex] = {
            ...currentSegment,
            selectedFlight,
          };
          setFlightSegments(newSegments);
        }
      }
    }
  }, [
    selectedFlight,
    currentSegmentIndex,
    isInitializing,
    isTransitioningPhases,
    selectedType,
    flightSegments,
    setFlightSegments,
  ]);

  // Update cleanup effect
  useEffect(() => {
    if (isTransitioningPhases) return;

    // Only initialize on mount
    if (selectedType === 'multi' && flightSegments.length === 0) {
      setFlightSegments([
        {
          fromLocation: null,
          toLocation: null,
          date: null,
          selectedFlight: null,
        },
        {
          fromLocation: null,
          toLocation: null,
          date: null,
          selectedFlight: null,
        },
      ]);
    }
  }, [
    selectedType,
    isTransitioningPhases,
    flightSegments.length,
    setFlightSegments,
  ]);

  // Flight type switch effect - setSelectedType intentionally included as it's
  // important for UI state updates
  useEffect(() => {
    const uniqueFlights = new Set(
      flightSegments
        .map((segment) => segment.selectedFlight)
        .filter(isValidFlight)
        .map((flight) => flight.flightNumber)
    );
    if (uniqueFlights.size > 1) {
      setSelectedType('multi');
    }
  }, [flightSegments, setSelectedType]);

  // Update selected flight effect
  useEffect(() => {
    if (
      selectedFlight &&
      directFlight.fromLocation &&
      directFlight.toLocation
    ) {
      const shouldUpdate =
        JSON.stringify(directFlight.selectedFlight) !==
        JSON.stringify(selectedFlight);

      if (shouldUpdate) {
        setDirectFlight({
          ...directFlight,
          selectedFlight,
        });
      }
    }
  }, [selectedFlight, directFlight, setDirectFlight]);

  // Update flight segments effect
  useEffect(() => {
    if (selectedType === 'multi' && flightSegments.length > 0) {
      const currentSegment = flightSegments[currentSegmentIndex];
      if (currentSegment) {
        const shouldUpdate =
          JSON.stringify(currentSegment.selectedFlight) !==
          JSON.stringify(selectedFlight);

        if (shouldUpdate) {
          const newSegments = [...flightSegments];
          newSegments[currentSegmentIndex] = {
            ...currentSegment,
            selectedFlight,
          };
          setFlightSegments(newSegments);
        }
      }
    }
  }, [
    selectedFlight,
    currentSegmentIndex,
    selectedType,
    flightSegments,
    setFlightSegments,
  ]);

  // Add effect to maintain segment linking
  useEffect(() => {
    if (selectedType === 'multi' && flightSegments.length >= 2) {
      const firstSegment = flightSegments[0];
      const secondSegment = flightSegments[1];

      // If first segment has a toLocation but second segment's fromLocation doesn't match
      if (
        firstSegment?.toLocation &&
        (!secondSegment?.fromLocation ||
          JSON.stringify(secondSegment.fromLocation) !==
            JSON.stringify(firstSegment.toLocation))
      ) {
        const newSegments = [...flightSegments];
        newSegments[1] = {
          ...newSegments[1],
          fromLocation: firstSegment.toLocation,
        };
        setFlightSegments(newSegments);
      }
    }
  }, [selectedType, flightSegments, setFlightSegments]);

  // Update loading check
  if (isInitializing && (storeCurrentPhase === 3 || storeCurrentPhase === 4)) {
    // Only show loading in phase 3 or 4
    return (
      <div className="flex items-center justify-center p-4">
        <LoadingSpinner />
      </div>
    );
  }

  // Render flight preview card
  const renderFlightPreviewCard = (flight: Flight, index: number) => (
    <div
      key={`flight-preview-${index}`}
      className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-[#F54538] hover:shadow-lg transition-all"
    >
      {/* Mobile View */}
      <div className="flex flex-col sm:hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative w-8 h-8">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                <PiAirplaneTakeoff className="w-4 h-4 text-[#F54538]" />
              </div>
              {selectedType === 'multi' && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#F54538] flex items-center justify-center">
                  <span className="text-[10px] font-medium text-white">
                    {index + 1}
                  </span>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{flight.airline}</p>
              <p className="text-xs text-gray-500">{flight.flightNumber}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFlightEdit(index);
              }}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(
                  'Delete button clicked for flight preview card, index:',
                  index
                );
                handleFlightDelete(index, e);
              }}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <div>
            <p className="text-sm font-medium">{flight.departureCity}</p>
            <p className="text-xs text-gray-500">{flight.departureTime}</p>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="w-12 h-[1px] bg-gray-200 mt-1"></div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{flight.arrivalCity}</p>
            <p className="text-xs text-gray-500">{flight.arrivalTime}</p>
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative w-10 h-10">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <PiAirplaneTakeoff className="w-5 h-5 text-[#F54538]" />
              </div>
              {selectedType === 'multi' && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#F54538] flex items-center justify-center">
                  <span className="text-xs font-medium text-white">
                    {index + 1}
                  </span>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <p className="font-medium">{flight.airline}</p>
                <span className="text-gray-400">•</span>
                <p className="text-gray-600">{flight.flightNumber}</p>
              </div>
              <p className="text-sm text-gray-500">
                {flight.departure} → {flight.arrival}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end space-x-2">
              <p className="font-medium">{formatSafeDate(flight.date)}</p>
              <span className="text-gray-500">•</span>
              <p className="font-medium">{flight.departureTime}</p>
              <span className="text-gray-500">→</span>
              <p className="font-medium">{flight.arrivalTime}</p>
            </div>
            <p className="text-sm text-gray-500 mt-1">{flight.duration}</p>
          </div>
        </div>
        <div className="flex justify-end mt-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFlightEdit(index);
              }}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(
                  'Delete button clicked for flight preview card, index:',
                  index
                );
                handleFlightDelete(index, e);
              }}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <FlightTypeSelector
        types={[
          { id: 'direct', label: 'Direct Flight' },
          { id: 'multi', label: 'Multi City' },
        ]}
        selectedType={selectedType}
        onTypeSelect={handleFlightTypeChange}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
      />

      <div className="space-y-4">
        {selectedType === 'multi' ? (
          <div className="space-y-8">
            {flightSegments.map((segment, index) => (
              <div key={index} className="relative">
                <div className="relative">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <AutocompleteInput
                        value={segment.fromLocation as LocationData | null}
                        onChange={(location) =>
                          handleMultiLocationChange(
                            location,
                            'fromLocation',
                            index
                          )
                        }
                        onSearch={searchAirports}
                        onFocus={handleFocus}
                        label="From"
                        leftIcon="departure"
                        error={errorMessages.from}
                        disabled={disabled}
                      />
                    </div>
                    <div className="relative">
                      <AutocompleteInput
                        value={segment.toLocation as LocationData | null}
                        onChange={(location) =>
                          handleMultiLocationChange(
                            location,
                            'toLocation',
                            index
                          )
                        }
                        onSearch={searchAirports}
                        onFocus={handleFocus}
                        label="To"
                        leftIcon="arrival"
                        error={errorMessages.to}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                  {/* Add delete button in a circle for segments after the first two */}
                  {index > 1 && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-12">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFlightDelete(index, e);
                        }}
                        className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
                      >
                        <TrashIcon className="h-5 w-5 text-gray-500" />
                      </button>
                    </div>
                  )}
                </div>
                {showFlightSearch &&
                  (currentPhase === 3 || currentPhase === 4) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                      <div className="relative date-picker-input w-full">
                        <DatePicker
                          selected={
                            segment.date instanceof Date
                              ? segment.date
                              : segment.date
                                ? new Date(segment.date)
                                : null
                          }
                          onChange={(date: Date | null) =>
                            handleMultiDateChange(date, index)
                          }
                          customInput={
                            <CustomDateInput
                              value={
                                segment.date
                                  ? format(
                                      segment.date instanceof Date
                                        ? segment.date
                                        : new Date(segment.date),
                                      'dd.MM.yyyy'
                                    )
                                  : ''
                              }
                              onClear={() => {
                                handleMultiDateChange(null, index);
                                setErrorMessage(null);
                              }}
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
                              new Date().setFullYear(
                                new Date().getFullYear() - 3
                              )
                            )
                          }
                          popperProps={{
                            strategy: 'fixed',
                            placement: 'top-start',
                          }}
                          className="react-datepicker-popper"
                          calendarClassName="custom-calendar"
                        />
                      </div>

                      <button
                        onClick={() => {
                          setCurrentSegmentIndex(index);
                          setIsSearchModalOpen(true);
                          handleSearchFlights(index);
                        }}
                        disabled={!segment.date}
                        className="h-14 w-full text-white bg-[#F54538] rounded-xl hover:bg-[#F54538]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F54538] disabled:opacity-50 disabled:cursor-not-allowed font-sans font-medium text-base"
                      >
                        Search Flights
                      </button>
                    </div>
                  )}
              </div>
            ))}

            {flightSegments.length < 4 && (
              <div className="flex flex-col gap-4">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addFlightSegment();
                  }}
                  className="w-full h-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#F54538] hover:text-[#F54538] transition-colors flex items-center justify-center px-4"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Add Another Flight
                </button>

                {showFlightSearch &&
                  (currentPhase === 3 || currentPhase === 4) && (
                    <button
                      onClick={() => {}}
                      className="w-full h-12 bg-red-50 text-[#F54538] rounded-lg font-medium hover:bg-red-100 transition-colors text-sm"
                    >
                      Flight Not Listed?
                    </button>
                  )}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <AutocompleteInput
                  value={directFlight.fromLocation as LocationData | null}
                  onChange={handleDirectFromLocationChange}
                  onSearch={searchAirports}
                  onFocus={handleFocus}
                  label="From"
                  leftIcon="departure"
                  error={errorMessages.from}
                  disabled={disabled}
                />
              </div>
              <div className="relative">
                <AutocompleteInput
                  value={directFlight.toLocation as LocationData | null}
                  onChange={handleDirectToLocationChange}
                  onSearch={searchAirports}
                  onFocus={handleFocus}
                  label="To"
                  leftIcon="arrival"
                  error={errorMessages.to}
                  disabled={disabled}
                />
              </div>
            </div>

            {showResults &&
              showFlightSearch &&
              (currentPhase === 3 || currentPhase === 4) && (
                <>
                  <div
                    className="relative date-picker-input mt-6"
                    style={{ marginBottom: '40px' }}
                  >
                    <DatePicker
                      selected={selectedDate ? new Date(selectedDate) : null}
                      onChange={(date: Date | null) => {
                        console.log('DatePicker onChange:', { date });
                        handleDateChange(date);
                      }}
                      customInput={
                        <CustomDateInput
                          value={selectedDate || ''}
                          onClear={() => {
                            console.log('DatePicker onClear');
                            handleDateClear();
                          }}
                          onClick={() => {
                            console.log('DatePicker onClick');
                          }}
                          label="Departure Date"
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
                      popperProps={{
                        strategy: 'fixed',
                        placement: 'top-start',
                      }}
                      className="react-datepicker-popper"
                      calendarClassName="custom-calendar"
                      onSelect={(date: Date | null) => {
                        console.log('DatePicker onSelect:', { date });
                        if (date) {
                          const formattedDate = format(date, 'yyyy-MM-dd');
                          setSelectedDate(formattedDate);
                        }
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => {
                        setIsSearchModalOpen(true);
                        handleSearchFlights();
                      }}
                      disabled={!directFlight.date}
                      className="w-full h-12 px-4 py-2 text-white bg-[#F54538] rounded-xl hover:bg-[#F54538]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F54538] disabled:opacity-50 disabled:cursor-not-allowed font-sans font-medium text-base"
                    >
                      Search Flights
                    </button>
                    <button
                      onClick={() => {}}
                      className="w-full h-12 bg-red-50 text-[#F54538] rounded-lg font-medium hover:bg-red-100 transition-colors text-sm"
                    >
                      Flight Not Listed?
                    </button>
                  </div>
                </>
              )}
          </>
        )}

        {/* Flight Details Section */}
        {((selectedType === 'direct' && directFlight.selectedFlight) ||
          (selectedType === 'multi' &&
            flightSegments.some((segment) => segment.selectedFlight))) &&
          showFlightDetails &&
          (currentPhase === 3 || currentPhase === 4) && (
            <div className="pt-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Your flight details
                </h3>
                {showFlightDetails &&
                  (selectedType === 'direct'
                    ? directFlight.selectedFlight &&
                      renderFlightPreviewCard(directFlight.selectedFlight, 0)
                    : flightSegments.map(
                        (segment, index) =>
                          segment.selectedFlight &&
                          renderFlightPreviewCard(segment.selectedFlight, index)
                      ))}
              </div>
            </div>
          )}

        {showResults &&
          showFlightSearch &&
          (currentPhase === 3 || currentPhase === 4) && (
            <BottomSheet
              isOpen={isSearchModalOpen}
              onClose={() => setIsSearchModalOpen(false)}
              title="Select Flight"
            >
              <div className="flex flex-col h-full">
                <div className="flex-shrink-0 border-b border-gray-200">
                  <div className="px-6 py-6">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
                      <div className="hidden">
                        <h2 className="text-2xl font-semibold text-gray-900">
                          Available Flights
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          Select your preferred flight
                        </p>
                      </div>
                      <div className="w-full">
                        <div className="relative w-full">
                          <input
                            type="text"
                            placeholder="Search by flight number"
                            value={searchTerm}
                            onChange={(e) => handleSheetSearch(e.target.value)}
                            className="w-full h-12 px-3 pl-10 pr-10 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F54538] focus:border-transparent transition-colors"
                          />
                          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-auto">
                  {loading ? (
                    <div className="flex flex-col justify-center items-center py-8">
                      <div className="w-12 h-12 border-4 border-[#F54538] border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="text-gray-600 font-medium">
                        Searching for flights...
                      </p>
                    </div>
                  ) : errorMessage ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                        <PiAirplaneTakeoff className="w-8 h-8 text-[#F54538]" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {errorMessage}
                      </h3>
                      <p className="text-gray-500 mb-6">
                        Please try adjusting your search criteria.
                      </p>
                      <div className="mt-8 flex justify-center w-full">
                        <button
                          onClick={() => setIsSearchModalOpen(false)}
                          className="px-8 h-12 bg-red-50 text-[#F54538] rounded-lg font-medium hover:bg-red-100 transition-colors text-sm"
                        >
                          Flight Not Listed?
                        </button>
                      </div>
                    </div>
                  ) : filteredFlights.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                        <PiAirplaneTakeoff className="w-8 h-8 text-[#F54538]" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {displayedFlights.length === 0
                          ? 'No flights found'
                          : 'No matching flights'}
                      </h3>
                      <p className="text-gray-500 mb-6">
                        {displayedFlights.length === 0
                          ? "We couldn't find any flights matching your criteria."
                          : 'Try adjusting your search terms.'}
                      </p>
                      <div className="mt-8 flex justify-center w-full">
                        <button
                          onClick={() => setIsSearchModalOpen(false)}
                          className="px-8 h-12 bg-red-50 text-[#F54538] rounded-lg font-medium hover:bg-red-100 transition-colors text-sm"
                        >
                          Flight Not Listed?
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Remove duplicate Mobile Search */}
                      <div className="px-6 py-2 border-b border-gray-200 bg-white">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-medium text-gray-900">
                            {filteredFlights.length}{' '}
                            {filteredFlights.length === 1
                              ? 'flight'
                              : 'flights'}{' '}
                            found
                          </h3>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setView('card')}
                              className={`p-2 rounded-lg ${
                                view === 'card'
                                  ? 'bg-gray-100 text-gray-900'
                                  : 'text-gray-500 hover:text-gray-900'
                              }`}
                            >
                              <Squares2X2Icon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setView('list')}
                              className={`p-2 rounded-lg ${
                                view === 'list'
                                  ? 'bg-gray-100 text-gray-900'
                                  : 'text-gray-500 hover:text-gray-900'
                              }`}
                            >
                              <ListBulletIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div
                        className={
                          view === 'list'
                            ? 'flex-1'
                            : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-6 pt-6'
                        }
                      >
                        {view === 'list' ? (
                          <div className="relative overflow-x-auto">
                            <table className="w-full table-fixed">
                              <thead className="bg-[#F54538]/5">
                                <tr>
                                  <th
                                    scope="col"
                                    className="w-[200px] py-3 pl-6 pr-3 text-left text-xs font-semibold text-[#F54538] uppercase tracking-wider"
                                  >
                                    <div className="flex items-center space-x-3">
                                      <span>Flight</span>
                                    </div>
                                  </th>
                                  <th
                                    scope="col"
                                    className="w-[120px] px-3 py-3 text-left text-xs font-semibold text-[#F54538] uppercase tracking-wider"
                                  >
                                    Date
                                  </th>
                                  <th
                                    scope="col"
                                    className="w-[160px] px-3 py-3 text-left text-xs font-semibold text-[#F54538] uppercase tracking-wider"
                                  >
                                    Departure
                                  </th>
                                  <th
                                    scope="col"
                                    className="w-[160px] px-3 py-3 text-left text-xs font-semibold text-[#F54538] uppercase tracking-wider"
                                  >
                                    Arrival
                                  </th>
                                  <th
                                    scope="col"
                                    className="w-[120px] px-3 py-3 text-left text-xs font-semibold text-[#F54538] uppercase tracking-wider"
                                  >
                                    Duration
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {filteredFlights.map((flight, index) => (
                                  <tr
                                    key={flight.id}
                                    onClick={() =>
                                      handleFlightSelect(flight, index)
                                    }
                                    className={`cursor-pointer hover:bg-gray-100 ${
                                      index % 2 === 0
                                        ? 'bg-white'
                                        : 'bg-gray-50'
                                    }`}
                                  >
                                    <td className="py-3 pl-6 pr-3">
                                      <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                                          <PiAirplaneTakeoff className="w-5 h-5 text-[#F54538]" />
                                        </div>
                                        <div>
                                          <p className="font-medium text-sm">
                                            {flight.flightNumber}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {flight.airline}
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-3 py-3">
                                      <p className="font-medium text-sm">
                                        {formatSafeDate(flight.date)}
                                      </p>
                                    </td>
                                    <td className="px-3 py-3">
                                      <p className="text-xs text-gray-500">
                                        {flight.departure}
                                      </p>
                                      <p className="font-medium text-sm">
                                        {flight.departureTime}
                                      </p>
                                    </td>
                                    <td className="px-3 py-3">
                                      <p className="text-xs text-gray-500">
                                        {flight.arrival}
                                      </p>
                                      <p className="font-medium text-sm">
                                        {flight.arrivalTime}
                                      </p>
                                    </td>
                                    <td className="px-3 py-3">
                                      <p className="font-medium text-sm">
                                        {flight.duration}
                                      </p>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          // Card View with added top padding
                          filteredFlights.map((flight) => (
                            <button
                              key={flight.id}
                              onClick={() => handleFlightSelect(flight, 0)}
                              className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-[#F54538] hover:shadow-lg transition-all"
                            >
                              <div className="flex flex-col space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                                      <PiAirplaneTakeoff className="w-5 h-5 text-[#F54538]" />
                                    </div>
                                    <div>
                                      <p className="font-medium">
                                        {flight.flightNumber}
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        {flight.airline}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-sm font-medium text-gray-500">
                                    {flight.duration}
                                  </p>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                  <div>
                                    <p className="text-sm text-gray-500">
                                      {flight.departure}
                                    </p>
                                    <p className="font-medium">
                                      {flight.departureTime}
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xs text-gray-500 mb-1">
                                      {formatSafeDate(flight.date)}
                                    </p>
                                    <div className="w-16 h-[1px] bg-gray-300"></div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-gray-500">
                                      {flight.arrival}
                                    </p>
                                    <p className="font-medium">
                                      {flight.arrivalTime}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </BottomSheet>
          )}
      </div>
    </div>
  );
};
export default FlightSelector;
