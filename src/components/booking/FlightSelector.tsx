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
import {
  usePhase4Store,
  type Phase4FlightSegment,
} from '@/lib/state/phase4Store';
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
import { Flight as FlightData } from '@/types/flight';
import { useTranslation } from '@/hooks/useTranslation';
import type { Translations } from '../../translations/types';
import { ValidationState, ValidationStateSteps } from '@/types/validation';
import { useFlightStore } from '@/lib/state/flightStore';

interface RawFlight {
  id: number | undefined; // Make it explicitly number | undefined instead of optional
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
  setValidationState: (
    state:
      | Record<number, boolean>
      | ((prev: Record<number, boolean>) => Record<number, boolean>)
  ) => void;
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
    return 'N/A';
  }
};

const formatSafeDate = (date: string | Date | null): string => {
  if (!date) return '';

  try {
    // If it's a string, try to parse it
    if (typeof date === 'string') {
      // If it's already in dd.MM.yyyy format, return as is
      if (date.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
        return date;
      }

      // Try parsing as ISO date (YYYY-MM-DD)
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parsedDate = parseISO(date);
        if (!isValid(parsedDate)) return '';
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
    console.error('Error formatting date:', error, date);
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
    return false;
  }
};

// Helper function to safely format a date
const safeFormatDate = (date: Date | string | null): string | null => {
  if (!date) return null;
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isValid(dateObj)) {
      return format(dateObj, 'dd.MM.yyyy');
    }
    return '';
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

// Create a custom hook for connection time updates
const useConnectionTimeUpdates = (
  mounted: boolean,
  selectedType: string,
  flightSegments: FlightSegmentData[],
  editingSegmentIndex: number,
  t: Translations,
  setFlightSegments: (segments: FlightSegmentData[]) => void
) => {
  const getConnectionTimeInfo = useCallback(
    (
      prevFlight: Flight,
      nextFlight: Flight,
      translations: Translations
    ): { isValid: boolean; message: string; timeDiff: number } | null => {
      try {
        // Create dates in UTC to avoid timezone issues
        const prevArrivalTime = new Date(
          `${prevFlight.date}T${prevFlight.arrivalTime}`
        );
        const nextDepartureTime = new Date(
          `${nextFlight.date}T${nextFlight.departureTime}`
        );

        const timeDiff =
          nextDepartureTime.getTime() - prevArrivalTime.getTime();
        const timeDiffMinutes = Math.floor(timeDiff / (1000 * 60));

        if (timeDiff < 0) {
          return {
            isValid: false,
            message: translations.flightSelector.errors.departBeforeArrival,
            timeDiff: timeDiffMinutes,
          };
        }

        if (timeDiffMinutes < 30) {
          return {
            isValid: false,
            message: translations.flightSelector.errors.minConnectionTime,
            timeDiff: timeDiffMinutes,
          };
        }

        const maxConnectionMinutes = 48 * 60; // 48 hours in minutes
        if (timeDiffMinutes > maxConnectionMinutes) {
          return {
            isValid: false,
            message: translations.flightSelector.errors.maxConnectionTime,
            timeDiff: timeDiffMinutes,
          };
        }

        const hours = Math.floor(timeDiffMinutes / 60);
        const minutes = timeDiffMinutes % 60;

        return {
          isValid: true,
          message: translations.flightSelector.errors.connectionTime
            .replace('{hours}', hours.toString())
            .replace('{minutes}', minutes.toString()),
          timeDiff: timeDiffMinutes,
        };
      } catch (error) {
        return null;
      }
    },
    []
  );

  // Memoize segments using a stable reference check
  const segmentsRef = useRef(flightSegments);
  useEffect(() => {
    segmentsRef.current = flightSegments;
  }, [flightSegments]);

  // Update connection times when language changes or segments change
  useEffect(() => {
    if (!mounted || selectedType !== 'multi' || segmentsRef.current.length <= 1)
      return;

    let hasUpdates = false;
    const newSegments = segmentsRef.current.map((segment, i) => {
      if (
        i === 0 ||
        !segment.selectedFlight ||
        !segmentsRef.current[i - 1]?.selectedFlight
      ) {
        return segment;
      }

      const connectionInfo = getConnectionTimeInfo(
        segmentsRef.current[i - 1].selectedFlight!,
        segment.selectedFlight,
        t
      );

      if (connectionInfo?.message !== segment.selectedFlight.connectionInfo) {
        hasUpdates = true;
        return {
          ...segment,
          selectedFlight: {
            ...segment.selectedFlight,
            connectionInfo: connectionInfo?.message,
          },
        };
      }

      return segment;
    });

    if (hasUpdates) {
      setFlightSegments(newSegments);
    }
  }, [mounted, t, selectedType, getConnectionTimeInfo, setFlightSegments]);

  // Check connection time for editing segment
  useEffect(() => {
    if (
      !mounted ||
      editingSegmentIndex <= 0 ||
      !segmentsRef.current[editingSegmentIndex]?.selectedFlight
    )
      return;

    const currentSegment = segmentsRef.current[editingSegmentIndex];
    const prevSegment = segmentsRef.current[editingSegmentIndex - 1];

    if (!prevSegment?.selectedFlight || !currentSegment.selectedFlight) return;

    const connectionInfo = getConnectionTimeInfo(
      prevSegment.selectedFlight,
      currentSegment.selectedFlight,
      t
    );

    if (
      connectionInfo?.message !== currentSegment.selectedFlight.connectionInfo
    ) {
      const newSegments = [...segmentsRef.current];
      newSegments[editingSegmentIndex] = {
        ...currentSegment,
        selectedFlight: {
          ...currentSegment.selectedFlight,
          connectionInfo: connectionInfo?.message,
        },
      };
      setFlightSegments(newSegments);
    }
  }, [
    mounted,
    editingSegmentIndex,
    t,
    getConnectionTimeInfo,
    setFlightSegments,
  ]);

  return getConnectionTimeInfo;
};

// Add formatFlightForStore function at the top level
const formatFlightForStore = (flight: FlightData): Flight => ({
  id: flight.id,
  flightNumber: flight.flightNumber,
  airline: flight.airline,
  departureCity: flight.departureCity,
  arrivalCity: flight.arrivalCity,
  departureTime: flight.departureTime,
  arrivalTime: flight.arrivalTime,
  date: flight.date,
  price: flight.price,
  departure: flight.departureCity,
  arrival: flight.arrivalCity,
  status: flight.status || 'unknown',
  departureAirport: flight.departureAirport || flight.departureCity,
  arrivalAirport: flight.arrivalAirport || flight.arrivalCity,
  duration: flight.duration || '',
  stops: flight.stops || 0,
  aircraft: flight.aircraft || '',
  class: flight.class || 'economy',
  scheduledDepartureTime: flight.scheduledDepartureTime || flight.departureTime,
  scheduledArrivalTime: flight.scheduledArrivalTime || flight.arrivalTime,
  actualDeparture: flight.actualDeparture || null,
  actualArrival: flight.actualArrival || null,
  arrivalDelay: flight.arrivalDelay || null,
});

// Transform raw flight data into a validated Flight object
function transformRawFlight(
  rawFlight: RawFlight,
  formattedDate: string
): Flight | null {
  // Early return if required fields are missing
  if (!rawFlight || typeof rawFlight.id !== 'number') {
    console.error('Invalid flight data:', rawFlight);
    return null;
  }

  // Create validated flight object with required fields
  const flight: Flight = {
    id: String(rawFlight.id),
    flightNumber: rawFlight.flightnumber_iata || '',
    airline: rawFlight.flightnumber_iata?.substring(0, 2) || '',
    departureCity: rawFlight.dep_city || rawFlight.dep_iata || '',
    arrivalCity: rawFlight.arr_city || rawFlight.arr_iata || '',
    departureTime: formatTime(rawFlight.dep_time_sched),
    arrivalTime: formatTime(rawFlight.arr_time_sched),
    departure: rawFlight.dep_iata || '',
    arrival: rawFlight.arr_iata || '',
    duration: calculateDuration(
      formatTime(rawFlight.dep_time_sched),
      formatTime(rawFlight.arr_time_sched)
    ),
    stops: 0,
    date: formattedDate,
    status: rawFlight.status || 'Unknown',
    aircraft: rawFlight.aircraft_type || 'Unknown',
    class: 'economy',
    price: 0,
    departureAirport: rawFlight.dep_iata || '',
    arrivalAirport: rawFlight.arr_iata || '',
    scheduledDepartureTime: formatTime(rawFlight.dep_time_sched),
    scheduledArrivalTime: formatTime(rawFlight.arr_time_sched),
    actualDeparture: rawFlight.dep_time_fact
      ? formatTime(rawFlight.dep_time_fact)
      : null,
    actualArrival: rawFlight.arr_time_fact
      ? formatTime(rawFlight.arr_time_fact)
      : null,
    arrivalDelay: rawFlight.arr_delay_min || null,
  };

  // Validate the transformed flight
  if (!isValidFlight(flight)) {
    console.error('Transformed flight failed validation:', flight);
    return null;
  }

  return flight;
}

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
  setValidationState,
}): React.ReactElement => {
  const { t } = useTranslation();

  // Always get both stores, but only use the appropriate one
  const mainStore = useStore();
  const phase4Store = usePhase4Store();

  // Use the appropriate store based on currentPhase
  const store = currentPhase === 4 ? phase4Store : mainStore;

  // Local state for UI-specific features that might not be in phase4Store
  const [localValidationState, setLocalValidationState] = useState({});
  const [localCompletedSteps, setLocalCompletedSteps] = useState({});

  // Destructure the store values with fallbacks for phase4Store
  const {
    fromLocation,
    toLocation,
    selectedDate,
    selectedType,
    directFlight,
    flightSegments,
    selectedFlight,
    selectedFlights,
    currentSegmentIndex,
    isTransitioningPhases = false,
    isInitializing = false,
    setDirectFlight,
    setFlightSegments,
    setSelectedFlights,
    setSelectedFlight,
    setSelectedType,
    setFromLocation,
    setToLocation,
    setSelectedDate,
    setCurrentSegmentIndex,
    isSearchModalOpen = false,
    searchTerm = '',
    displayedFlights = [],
    allFlights = [],
    loading = false,
    errorMessage = null,
    errorMessages = {},
    setSearchModalOpen,
    setSearchTerm,
    setDisplayedFlights,
    setAllFlights,
    setFlightSearchLoading,
    setFlightErrorMessage,
    setFlightErrorMessages,
    clearFlightErrors,
  } = store || {};

  // Create wrapper functions for methods that might not exist in phase4Store
  const validateFlightSelection = useCallback(() => {
    // Skip validation in phase 4
    if (currentPhase === 4) {
      return true;
    }

    return mainStore.validateFlightSelection();
  }, [currentPhase, mainStore]);

  const batchUpdateWizardState = useCallback(
    (updates: any) => {
      if (currentPhase === 4) {
        // Handle phase 4 updates individually since we don't have batch update
        Object.entries(updates).forEach(([key, value]) => {
          const setterName = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
          if (setterName in phase4Store) {
            (phase4Store as any)[setterName](value);
          }
        });
      } else {
        mainStore.batchUpdateWizardState(updates);
      }
    },
    [currentPhase, phase4Store, mainStore]
  );

  // Component state
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<'list' | 'card'>('card');
  const [selectedFlightNumber, setSelectedFlightNumber] = useState<
    string | null
  >(null);
  const [editingSegmentIndex, setEditingSegmentIndex] = useState<number>(-1);
  const lastSelectedFlightRef = useRef<string | null>(null);

  const getConnectionTimeInfo = useConnectionTimeUpdates(
    mounted,
    selectedType,
    flightSegments,
    editingSegmentIndex,
    t,
    setFlightSegments
  );

  // Flight selection handler
  const handleFlightSelection = useCallback(
    (flight: Flight | null) => {
      if (!flight) {
        setSelectedFlights([]);
        return;
      }

      // Ensure we preserve the actual flight ID
      const flightData = {
        ...flight,
        // Only use the actual flight ID, never generate a random one
        id: flight.id,
      };

      // Get current flights array and update it
      const currentFlights: (Flight | null)[] = [...(selectedFlights || [])];
      if (currentSegmentIndex < currentFlights.length) {
        currentFlights[currentSegmentIndex] = flightData;
      } else {
        while (currentFlights.length < currentSegmentIndex) {
          currentFlights.push(null);
        }
        currentFlights.push(flightData);
      }

      // Filter out null values
      const newSelectedFlights = currentFlights.filter(
        (f): f is Flight => f !== null
      );

      // Batch updates using the store's batch update mechanism
      if (currentPhase === 4) {
        phase4Store.batchUpdate({
          selectedFlight: flightData,
          selectedFlights: newSelectedFlights,
        });
      } else {
        batchUpdateWizardState({
          selectedFlight: flightData,
          selectedFlights: newSelectedFlights,
        });
      }

      onInteract();
    },
    [
      selectedType,
      currentSegmentIndex,
      onInteract,
      currentPhase,
      phase4Store,
      batchUpdateWizardState,
      selectedFlights,
      setSelectedFlights,
    ]
  );

  // Use handleFlightSelection in your component
  const onFlightClick = useCallback(
    (flight: Flight) => {
      handleFlightSelection(flight);
    },
    [handleFlightSelection]
  );

  // Mount effect
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Debug logging effect - all dependencies included as this is just for logging
  useEffect(() => {}, [flightSegments, selectedType, fromLocation, toLocation]);

  // Update initialization effect
  useEffect(() => {
    if (isInitializing) return;

    try {
      // Handle direct flight date initialization
      if (selectedType === 'direct') {
        // Only update if we have a selectedDate but no directFlight.date
        if (selectedDate && !directFlight.date) {
          const parsedDate = parseISO(selectedDate);
          if (isValid(parsedDate)) {
            // Set the time to noon to avoid timezone issues
            const normalizedDate = new Date(
              parsedDate.getFullYear(),
              parsedDate.getMonth(),
              parsedDate.getDate(),
              12
            );

            // Update directFlight with the normalized date
            setDirectFlight({
              ...directFlight,
              date: normalizedDate,
            });
          }
        }
        // If we have a directFlight.date but no selectedDate
        else if (directFlight.date && !selectedDate) {
          const formattedDate = format(
            directFlight.date instanceof Date
              ? directFlight.date
              : new Date(directFlight.date),
            'yyyy-MM-dd'
          );
          setSelectedDate(formattedDate);
        }
      }
    } catch (error) {
      console.error('Error initializing dates:', error);
    }
  }, [
    isInitializing,
    selectedType,
    selectedDate,
    directFlight,
    setDirectFlight,
    setSelectedDate,
  ]);

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
      return null;
    }
  };

  // Update the formatStoreDate helper function
  const formatStoreDate = (date: Date | null): string | null => {
    if (!date) return null;
    try {
      return format(date, 'yyyy-MM-dd');
    } catch (error) {
      return null;
    }
  };

  const handleDateChange = (newDate: Date | null) => {
    if (!newDate) {
      // Handle date clear in a single update
      setDirectFlight({
        ...directFlight,
        date: null,
        selectedFlight: null,
      });
      setSelectedDate(null);
      return;
    }

    // Create a safe copy of the date and normalize it to noon UTC
    const safeDate = new Date(
      Date.UTC(
        newDate.getFullYear(),
        newDate.getMonth(),
        newDate.getDate(),
        12,
        0,
        0,
        0
      )
    );

    // Format the date for the store
    const formattedDate = format(safeDate, 'yyyy-MM-dd');

    // Update both states in a single render cycle
    setDirectFlight({
      ...directFlight,
      date: safeDate,
    });
    setSelectedDate(formattedDate);
  };

  const CustomInput = React.forwardRef<HTMLInputElement, CustomDateInputProps>(
    ({ value = '', onClear, onClick }, ref) => {
      const { t } = useTranslation();
      return (
        <CustomDateInput
          value={value}
          ref={ref}
          onClear={onClear}
          onClick={onClick}
          label={t.flightSelector.labels.departureDate}
        />
      );
    }
  );

  CustomInput.displayName = 'CustomInput';

  // Update the handleSearchFlights function
  const handleSearchFlights = async (segmentIndex: number = 0) => {
    try {
      setFlightSearchLoading(true);
      setFlightErrorMessage(null);

      const currentSegment =
        selectedType === 'multi' ? flightSegments[segmentIndex] : directFlight;

      if (
        !currentSegment.fromLocation ||
        !currentSegment.toLocation ||
        !currentSegment.date
      ) {
        setFlightErrorMessage('Please select origin, destination, and date');
        setFlightSearchLoading(false);
        return;
      }

      // For multi-city segments after first, validate connection city
      if (selectedType === 'multi' && segmentIndex > 0) {
        const previousSegment = flightSegments[segmentIndex - 1];
        if (previousSegment?.selectedFlight) {
          const prevArrivalCity = previousSegment.selectedFlight.arrivalCity;
          const currentDepartureCity =
            currentSegment.fromLocation.city ||
            currentSegment.fromLocation.description ||
            currentSegment.fromLocation.label;

          // Compare cities case-insensitive
          if (
            prevArrivalCity.toLowerCase() !== currentDepartureCity.toLowerCase()
          ) {
            setFlightErrorMessage(
              t.flightSelector.errors.departureMismatch
                .replace('{city1}', currentDepartureCity)
                .replace('{city2}', prevArrivalCity)
            );
            setFlightSearchLoading(false);
            return;
          }
        }
      }

      // Format date consistently
      let searchDate = currentSegment.date;
      if (searchDate instanceof Date) {
        if (!isValid(searchDate)) {
          setFlightErrorMessage('Invalid date selected');
          setFlightSearchLoading(false);
          return;
        }
      } else if (typeof searchDate === 'string') {
        const dateStr = searchDate as string;
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          searchDate = parseISO(dateStr);
        } else if (dateStr.includes('.')) {
          // Handle German date format (DD.MM.YYYY)
          const [day, month, year] = dateStr.split('.');
          searchDate = new Date(Number(year), Number(month) - 1, Number(day));
        } else {
          searchDate = new Date(dateStr);
        }
      }

      if (!isValid(searchDate)) {
        setFlightErrorMessage('Invalid date selected');
        setFlightSearchLoading(false);
        return;
      }

      // Format date as YYYY-MM-DD for the API
      const formattedDate = format(searchDate, 'yyyy-MM-dd');

      // Extract IATA codes from locations
      const fromIata = currentSegment.fromLocation.value;
      const toIata = currentSegment.toLocation.value;

      // Make the API call
      const params = new URLSearchParams({
        from_iata: fromIata,
        to_iata: toIata,
        date: formattedDate,
        lang: 'en',
      });

      const response = await fetch(
        `/.netlify/functions/searchFlights?${params.toString()}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch flights: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      const flights = data.data || [];

      // Transform and validate the flights
      let validFlights = flights
        .map((flight: RawFlight) => {
          try {
            // Transform raw flight data into validated Flight object
            const transformedFlight = transformRawFlight(flight, formattedDate);
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
      if (selectedType === 'multi' && segmentIndex > 0) {
        const previousSegment = flightSegments[segmentIndex - 1];
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

      setDisplayedFlights(validFlights);
      setAllFlights(validFlights);
      setFlightSearchLoading(false);

      if (validFlights.length > 0) {
        setSearchModalOpen(true);
      } else {
        setFlightErrorMessage(
          segmentIndex > 0
            ? t.flightSelector.errors.noValidConnecting
            : t.flightSelector.errors.noFlightsRoute
        );
      }
    } catch (error) {
      console.error('Search flights error:', error);
      setFlightErrorMessage('Failed to search flights. Please try again.');
      setFlightSearchLoading(false);
    }
  };

  const validateFlightTimes = (
    prevFlight: Flight | null,
    newFlight: Flight
  ): boolean => {
    if (!prevFlight) return true;

    const prevArrivalTime = new Date(
      `${prevFlight.date}T${prevFlight.arrivalTime}:00.000Z`
    );
    const newDepartureTime = new Date(
      `${newFlight.date}T${newFlight.departureTime}:00.000Z`
    );

    const timeDiff =
      (newDepartureTime.getTime() - prevArrivalTime.getTime()) / (1000 * 60);
    console.log('Flight time validation:', {
      prevFlight,
      newFlight,
      timeDiff,
      isValid: timeDiff >= 30,
    });

    return timeDiff >= 30;
  };

  // Add this helper function at the top level of the component
  const getUniqueFlightKey = (flight: Flight): string => {
    return `${flight.flightNumber}-${flight.date}-${flight.departureTime}-${flight.arrivalTime}`;
  };

  // Optimize handleFlightSelect to prevent unnecessary updates
  const handleFlightSelect = useCallback(
    (data: {
      flight: Flight;
      segmentIndex: number;
      selectedType: 'direct' | 'multi';
    }) => {
      const { flight, segmentIndex, selectedType } = data;
      console.log('=== Handling Flight Selection ===', {
        flight,
        segmentIndex,
        selectedType,
        currentPhase,
      });

      // Format flight for store
      const storeFormatFlight = formatFlightForStore(flight);

      if (selectedType === 'direct') {
        // Update direct flight state
        const newDirectFlight = {
          ...directFlight,
          selectedFlight: storeFormatFlight,
          fromLocation: {
            value: flight.departureCity,
            label: flight.departureCity,
            description: flight.departureAirport,
            dropdownLabel: `${flight.departureAirport} (${flight.departureCity})`,
          },
          toLocation: {
            value: flight.arrivalCity,
            label: flight.arrivalCity,
            description: flight.arrivalAirport,
            dropdownLabel: `${flight.arrivalAirport} (${flight.arrivalCity})`,
          },
        };
        setDirectFlight(newDirectFlight);

        // Update store
        batchUpdateWizardState({
          selectedFlight: storeFormatFlight,
          selectedFlights: [storeFormatFlight],
          fromLocation: JSON.stringify(newDirectFlight.fromLocation),
          toLocation: JSON.stringify(newDirectFlight.toLocation),
        });

        // Update validation state for phase 3
        if (currentPhase === 3 && setValidationState && stepNumber) {
          const isValid = !!(
            newDirectFlight.selectedFlight &&
            newDirectFlight.date &&
            newDirectFlight.fromLocation &&
            newDirectFlight.toLocation
          );

          setValidationState((prev: Record<number, boolean>) => ({
            ...prev,
            [stepNumber]: isValid,
          }));

          // Also trigger store validation
          validateFlightSelection();
        }

        // Close modal
        setSearchModalOpen(false);
        return;
      }

      // Create new segments first to ensure consistent state
      const newSegments = [...flightSegments];
      newSegments[segmentIndex] = {
        ...newSegments[segmentIndex],
        selectedFlight: storeFormatFlight,
        fromLocation: {
          value: flight.departureCity,
          label: flight.departureCity,
          description: flight.departureAirport,
          city: flight.departureCity,
          dropdownLabel: `${flight.departureAirport} (${flight.departureCity})`,
        },
        toLocation: {
          value: flight.arrivalCity,
          label: flight.arrivalCity,
          description: flight.arrivalAirport,
          city: flight.arrivalCity,
          dropdownLabel: `${flight.arrivalAirport} (${flight.arrivalCity})`,
        },
      };

      // For multi-city, update the next segment's fromLocation if it exists
      if (selectedType === 'multi' && segmentIndex < newSegments.length - 1) {
        newSegments[segmentIndex + 1] = {
          ...newSegments[segmentIndex + 1],
          fromLocation: {
            value: flight.arrivalCity,
            label: flight.arrivalCity,
            description: flight.arrivalAirport,
            city: flight.arrivalCity,
            dropdownLabel: `${flight.arrivalAirport} (${flight.arrivalCity})`,
          },
          // Clear the selected flight since the connection changed
          selectedFlight: null,
        };
      }

      // Validate segment cities match the selected flight
      if (selectedType === 'multi') {
        // Ensure the selected flight matches the segment's from/to locations
        if (
          flight.departureCity.toLowerCase() !==
            newSegments[segmentIndex].fromLocation?.value?.toLowerCase() ||
          flight.arrivalCity.toLowerCase() !==
            newSegments[segmentIndex].toLocation?.value?.toLowerCase()
        ) {
          console.error('Flight cities do not match segment locations', {
            flight,
            segment: newSegments[segmentIndex],
          });
          return;
        }

        // Validate no same-city segments
        if (
          newSegments[segmentIndex].fromLocation?.value?.toLowerCase() ===
          newSegments[segmentIndex].toLocation?.value?.toLowerCase()
        ) {
          console.error('Cannot select same city for departure and arrival', {
            segment: newSegments[segmentIndex],
          });
          return;
        }
      }

      // Update segments state
      setFlightSegments(newSegments);

      // Create the new flights array for store update, ensuring no duplicates
      const newSelectedFlights = newSegments
        .map((segment) => segment.selectedFlight)
        .filter((flight): flight is Flight => flight !== null)
        .reduce((acc: Flight[], flight) => {
          if (!acc.some((f) => f.id === flight.id)) {
            acc.push(flight);
          }
          return acc;
        }, []);

      // Update main store
      batchUpdateWizardState({
        selectedFlight: storeFormatFlight,
        fromLocation: JSON.stringify(newSegments[0].fromLocation),
        toLocation: JSON.stringify(
          newSegments[newSegments.length - 1].toLocation
        ),
        selectedFlights: newSelectedFlights,
      });

      // If in phase 4, also update phase4Store
      if (currentPhase === 4) {
        // Get the current original flights from flightStore
        const flightStore = useFlightStore.getState();
        const originalFlights = flightStore.originalFlights;

        // Ensure we're not duplicating flights and they match segment cities
        const uniqueFlights = newSelectedFlights.filter(
          (flight) =>
            !originalFlights.some(
              (origFlight) => origFlight.id === flight.id
            ) &&
            newSegments.some(
              (segment) =>
                segment.fromLocation?.value?.toLowerCase() ===
                  flight.departureCity.toLowerCase() &&
                segment.toLocation?.value?.toLowerCase() ===
                  flight.arrivalCity.toLowerCase()
            )
        );

        phase4Store.batchUpdate({
          selectedFlight: storeFormatFlight,
          fromLocation: JSON.stringify(newSegments[0].fromLocation),
          toLocation: JSON.stringify(
            newSegments[newSegments.length - 1].toLocation
          ),
          selectedFlights: uniqueFlights,
        });

        // Update flightStore with both original and selected flights
        flightStore.setOriginalFlights(originalFlights);
        flightStore.setSelectedFlights(uniqueFlights);
      }

      // Update validation state for phase 3
      if (currentPhase === 3 && setValidationState && stepNumber) {
        // Check if all segments have selected flights and valid connections
        const isValid = newSegments.every((segment, index) => {
          if (!segment.selectedFlight) return false;

          // Check connection with previous segment
          if (index > 0) {
            const prevSegment = newSegments[index - 1];
            if (!prevSegment.selectedFlight) return false;

            // Validate city connection
            const prevArrivalCity =
              prevSegment.selectedFlight.arrivalCity.toLowerCase();
            const currentDepartureCity =
              segment.selectedFlight.departureCity.toLowerCase();
            if (prevArrivalCity !== currentDepartureCity) return false;

            // Validate connection time
            const connectionInfo = getConnectionTimeInfo(
              prevSegment.selectedFlight,
              segment.selectedFlight,
              t
            );
            if (!connectionInfo?.isValid) return false;
          }
          return true;
        });

        setValidationState((prev: Record<number, boolean>) => ({
          ...prev,
          [stepNumber]: isValid,
        }));

        // Also trigger store validation
        validateFlightSelection();
      }

      // Close modal and notify parent
      setSearchModalOpen(false);
      onSelect(storeFormatFlight);
      onInteract();
    },
    [
      currentPhase,
      phase4Store,
      batchUpdateWizardState,
      onSelect,
      onInteract,
      flightSegments,
      setFlightSegments,
      setValidationState,
      stepNumber,
      validateFlightSelection,
      getConnectionTimeInfo,
      t,
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
            description: t.common.enterMinChars,
            dropdownLabel: t.common.enterMinChars,
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
        return [];
      }

      const data = await response.json();

      const airports = Array.isArray(data) ? data : data.data || [];

      return airports.map((airport: Airport) => ({
        value: airport.iata_code,
        label: airport.iata_code,
        description: airport.city || '',
        city: airport.city || '',
        dropdownLabel: `${airport.name} (${airport.iata_code})`,
      }));
    } catch (error) {
      return [];
    }
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
    setEditingSegmentIndex(index);
    // Set the current segment index first
    await setCurrentSegmentIndex(index);

    // Get the segment being edited
    const segment = flightSegments[index];
    if (!segment) return;

    // Update from/to locations based on the segment
    if (segment.fromLocation) {
      await setFromLocation(JSON.stringify(segment.fromLocation));
    }
    if (segment.toLocation) {
      await setToLocation(JSON.stringify(segment.toLocation));
    }

    // Update the date if available
    if (segment.selectedFlight?.date) {
      setSelectedDate(segment.selectedFlight.date);
    }

    // Show the flight search
    setSearchModalOpen(true);
  };

  const filteredFlights = React.useMemo(() => {
    if (!Array.isArray(displayedFlights)) {
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

  // Update handleSheetSearch to use main store's search functionality
  const handleSheetSearch = async (term: string) => {
    setSearchTerm(term);
    if (!term) {
      setDisplayedFlights(allFlights);
      return;
    }

    const currentSegment =
      selectedType === 'multi'
        ? flightSegments[currentSegmentIndex]
        : directFlight;
    if (
      !currentSegment.fromLocation ||
      !currentSegment.toLocation ||
      !currentSegment.date
    ) {
      return;
    }

    try {
      setFlightSearchLoading(true);
      const searchDate =
        currentSegment.date instanceof Date
          ? currentSegment.date
          : new Date(currentSegment.date);
      const params = new URLSearchParams({
        from_iata: currentSegment.fromLocation.value,
        to_iata: currentSegment.toLocation.value,
        date: format(searchDate, 'yyyy-MM-dd'),
        flight_number: term,
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

      // Transform the flights data using the same format as handleSearchFlights
      const transformedFlights = flights
        .map((flight: RawFlight) => {
          try {
            // Transform raw flight data into validated Flight object
            const transformedFlight = transformRawFlight(
              flight,
              format(searchDate, 'yyyy-MM-dd')
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

      setDisplayedFlights(transformedFlights);
      setAllFlights(transformedFlights);
    } catch (error) {
      console.error('Error searching flights:', error);
      setDisplayedFlights([]);
    } finally {
      setFlightSearchLoading(false);
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

  // Consolidated effect to handle segment linking and initialization
  useEffect(() => {
    // Skip if transitioning phases
    if (isTransitioningPhases) return;

    // Handle initial state - only run once when component mounts
    if (
      selectedType === 'multi' &&
      flightSegments.length === 0 &&
      !isInitializing
    ) {
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
      return;
    }

    // Skip if initializing, not in multi-city mode, or if we don't have enough segments
    if (
      isInitializing ||
      selectedType !== 'multi' ||
      flightSegments.length < 2
    ) {
      return;
    }

    // Check if any segments need updating
    const needsUpdate = flightSegments.some((segment, index) => {
      if (index === 0) return false;
      const prevSegment = flightSegments[index - 1];
      if (!prevSegment?.selectedFlight) return false;

      return (
        !segment.fromLocation ||
        segment.fromLocation.value !== prevSegment.selectedFlight.arrivalCity ||
        segment.fromLocation.city !== prevSegment.selectedFlight.arrivalCity
      );
    });

    // Only update if necessary
    if (!needsUpdate) {
      return;
    }

    // Update segments that need linking
    const updatedSegments = flightSegments.map((segment, index) => {
      if (index === 0 || !flightSegments[index - 1]?.selectedFlight) {
        return segment;
      }

      const prevSegment = flightSegments[index - 1];
      const prevFlight = prevSegment.selectedFlight;

      if (!prevFlight) {
        return segment;
      }

      if (
        !segment.fromLocation ||
        segment.fromLocation.value !== prevFlight.arrivalCity ||
        segment.fromLocation.city !== prevFlight.arrivalCity
      ) {
        return {
          ...segment,
          fromLocation: {
            value: prevFlight.arrivalCity,
            label: prevFlight.arrivalCity,
            description: prevFlight.arrivalAirport,
            city: prevFlight.arrivalCity,
            dropdownLabel: `${prevFlight.arrivalAirport} (${prevFlight.arrivalCity})`,
          },
        };
      }

      return segment;
    });

    setFlightSegments(updatedSegments);
  }, [
    selectedType,
    flightSegments,
    isInitializing,
    isTransitioningPhases,
    setFlightSegments,
  ]);

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
      } catch (error) {}
    }
    if (!toLoc && toLocation) {
      try {
        toLoc = JSON.parse(toLocation);
      } catch (error) {}
    }

    return { fromLoc, toLoc };
  };

  // Update the handleFlightTypeChange to handle state updates properly
  const handleFlightTypeChange = (type: 'direct' | 'multi') => {
    // If switching to direct mode and we have a first flight, preserve it
    if (type === 'direct' && flightSegments[0]?.selectedFlight) {
      const firstSegment = flightSegments[0];
      setDirectFlight({
        fromLocation: firstSegment.fromLocation,
        toLocation: firstSegment.toLocation,
        selectedFlight: firstSegment.selectedFlight,
        date: firstSegment.date,
      });
    } else {
      // Clear direct flight state when switching to multi
      setDirectFlight({
        fromLocation: null,
        toLocation: null,
        selectedFlight: null,
        date: null,
      });
    }

    // Update selected type
    if (currentPhase === 4) {
      phase4Store.setSelectedType(type);
    } else {
      setSelectedType(type);
    }

    // Clear selected flights array
    if (currentPhase === 4) {
      phase4Store.setSelectedFlights([]);
      phase4Store.setSelectedFlight(null);
    } else {
      setSelectedFlights(type === 'direct' ? [] : []);
      setSelectedFlight(null);
    }

    // Reset validation state if needed
    if (setValidationState && currentPhase !== 4) {
      setValidationState((prev: Record<number, boolean>) => ({
        ...prev,
        [stepNumber || 1]: false,
      }));
    }

    // Notify parent component
    onSelect(null);
    onInteract();
  };

  // Update addFlightSegment to properly manage segments
  const addFlightSegment = () => {
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

    // Update state
    setFlightSegments(newSegments);
    setCurrentSegmentIndex(newSegments.length - 1);

    // Switch to multi-city mode if not already
    if (selectedType !== 'multi') {
      setSelectedType('multi');
    }

    // Clear any selected flights array since we have a new incomplete segment
    setSelectedFlights([]);

    // Update validation state to false since we have a new incomplete segment
    if (setValidationState && stepNumber && currentPhase !== 4) {
      setValidationState((prev: Record<number, boolean>) => ({
        ...prev,
        [stepNumber]: false,
      }));

      // Also update store validation state
      validateFlightSelection();
    }
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
  const updateFlightSegment = useCallback(
    (
      index: number,
      updates: Partial<Omit<FlightSegmentData, 'date'> & { date?: Date }>
    ) => {
      const newSegments = [...flightSegments];
      newSegments[index] = {
        ...newSegments[index],
        ...updates,
      };
      setFlightSegments(newSegments);
    },
    [flightSegments, setFlightSegments]
  );

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
  }, [searchTerm, allFlights, setDisplayedFlights]);

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
    // Clear error message when user starts interacting
    setFlightErrorMessage(null);

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
        const stringifiedLocation = JSON.stringify(location);
        if (field === 'fromLocation') {
          setFromLocation(stringifiedLocation);
        } else {
          setToLocation(stringifiedLocation);
        }
      } else {
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
    setFlightErrorMessages({
      ...errorMessages,
      [field === 'fromLocation' ? 'from' : 'to']: '',
    });

    // Trigger onSelect callback
    onSelect(null);
    onInteract();
  };

  const handleDirectFromLocationChange = (location: LocationData | null) => {
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
      if (currentPhase === 4) {
        phase4Store.setFromLocation(stringifiedLocation);
      } else {
        setFromLocation(stringifiedLocation);
      }
    } else {
      if (currentPhase === 4) {
        phase4Store.setFromLocation(null);
      } else {
        setFromLocation(null);
      }
    }

    // Clear any selected flights
    if (currentPhase === 4) {
      phase4Store.setSelectedFlights([]);
    } else {
      setSelectedFlights([]);
    }

    // Clear any error messages
    setFlightErrorMessages({
      ...errorMessages,
      from: '',
    });

    // Update validation state based on current phase
    if (setValidationState && currentPhase !== 4) {
      if (currentPhase === 1) {
        // For phase 1, only validate locations
        setValidationState((prev: Record<number, boolean>) => ({
          ...prev,
          [stepNumber || 1]: !!(location && directFlight.toLocation),
        }));
      } else if (currentPhase === 3) {
        // For phase 3, only validate if we have a selected flight
        const hasSelectedFlight = !!newDirectFlight.selectedFlight;
        if (hasSelectedFlight) {
          setValidationState((prev: Record<number, boolean>) => ({
            ...prev,
            [stepNumber || 1]: true,
          }));
        }
      }
    }

    // Notify parent component
    onSelect(null);
    onInteract();
  };

  const handleDirectToLocationChange = (location: LocationData | null) => {
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
      if (currentPhase === 4) {
        phase4Store.setToLocation(stringifiedLocation);
      } else {
        setToLocation(stringifiedLocation);
      }
    } else {
      if (currentPhase === 4) {
        phase4Store.setToLocation(null);
      } else {
        setToLocation(null);
      }
    }

    // Clear any selected flights
    if (currentPhase === 4) {
      phase4Store.setSelectedFlights([]);
    } else {
      setSelectedFlights([]);
    }

    // Clear any error messages
    setFlightErrorMessages({
      ...errorMessages,
      to: '',
    });

    // Update validation state based on current phase
    if (setValidationState && currentPhase !== 4) {
      if (currentPhase === 1) {
        // For phase 1, only validate locations
        setValidationState((prev: Record<number, boolean>) => ({
          ...prev,
          [stepNumber || 1]: !!(location && directFlight.fromLocation),
        }));
      } else if (currentPhase === 3) {
        // For phase 3, only validate if we have a selected flight
        const hasSelectedFlight = !!newDirectFlight.selectedFlight;
        if (hasSelectedFlight) {
          setValidationState((prev: Record<number, boolean>) => ({
            ...prev,
            [stepNumber || 1]: true,
          }));
        }
      }
    }

    // Notify parent component
    onSelect(null);
    onInteract();
  };

  // Update the handleDirectDateChange function
  const handleDirectDateChange = (newDate: Date | null) => {
    try {
      if (!newDate) {
        setDirectFlight({
          ...directFlight,
          date: null,
          selectedFlight: null,
        });
        setSelectedDate(null);
        return;
      }

      // Normalize to noon UTC to avoid timezone issues
      const normalizedDate = new Date(
        Date.UTC(
          newDate.getFullYear(),
          newDate.getMonth(),
          newDate.getDate(),
          12,
          0,
          0,
          0
        )
      );

      if (!isValid(normalizedDate)) {
        console.error('Invalid date provided to handleDirectDateChange');
        return;
      }

      // Update both states in a single render cycle
      const formattedDate = format(normalizedDate, 'yyyy-MM-dd');
      setDirectFlight({
        ...directFlight,
        date: normalizedDate,
      });
      setSelectedDate(formattedDate);

      // Clear any error messages
      setFlightErrorMessage(null);
    } catch (error) {
      console.error('Error handling date change:', error);
      setFlightErrorMessage('Invalid date selection');
    }
  };

  // Update the handleMultiDateChange function
  const handleMultiDateChange = (date: Date | null, index: number) => {
    try {
      if (!date) {
        const newSegments = [...flightSegments];
        newSegments[index] = {
          ...newSegments[index],
          date: null,
          selectedFlight: null,
        };
        setFlightSegments(newSegments);
        if (index === 0 && selectedType === 'multi') {
          setSelectedDate(null);
        }
        return;
      }

      // Create a safe copy of the date and normalize to noon UTC
      const safeDate = new Date(
        Date.UTC(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          12,
          0,
          0,
          0
        )
      );

      const newSegments = [...flightSegments];
      newSegments[index] = {
        ...newSegments[index],
        date: safeDate,
      };

      setFlightSegments(newSegments);

      // Update store's selectedDate with the first segment's date only when in multi mode
      if (index === 0 && selectedType === 'multi') {
        setSelectedDate(format(safeDate, 'yyyy-MM-dd'));
      }

      // Clear any error messages
      setFlightErrorMessage(null);
    } catch (error) {
      console.error('Error handling date change:', error);
      setFlightErrorMessage('Invalid date selection');
    }
  };

  const handleLocationChange = useCallback(
    (location: Location | null, type: 'from' | 'to') => {
      const currentSegment = flightSegments[currentSegmentIndex];
      const { date, ...rest } = currentSegment;
      updateFlightSegment(currentSegmentIndex, {
        ...rest,
        [type === 'from' ? 'fromLocation' : 'toLocation']: location,
      });
    },
    [currentSegmentIndex, flightSegments, updateFlightSegment]
  );

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
    if (!mounted && selectedType === 'multi' && flightSegments.length === 0) {
      setMounted(true);
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
    mounted,
    selectedType,
    isTransitioningPhases,
    flightSegments.length,
    setFlightSegments,
  ]);

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
            date: null, // Changed from new Date() to null
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
      return null;
    }
  };

  // Flight selection notification effect - onSelect callback intentionally included
  // as it's provided by the parent and should trigger updates
  useEffect(() => {
    if (directFlight && directFlight.selectedFlight && !isInitializing) {
      // Prevent infinite updates by checking if the flight has actually changed
      const flightKey = getUniqueFlightKey(directFlight.selectedFlight);
      if (flightKey !== lastSelectedFlightRef.current) {
        lastSelectedFlightRef.current = flightKey;
        onSelect(directFlight.selectedFlight);
      }
    }
  }, [directFlight, onSelect, isInitializing]);

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
    } catch (error) {}
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
    if (!mounted && selectedType === 'multi' && flightSegments.length === 0) {
      setMounted(true);
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
    mounted,
    selectedType,
    isTransitioningPhases,
    flightSegments.length,
    setFlightSegments,
  ]);

  // Update the flight type switch effect to prevent loops
  useEffect(() => {
    const uniqueFlights = new Set(
      flightSegments
        .map((segment) => segment.selectedFlight)
        .filter(isValidFlight)
        .map((flight) => flight.flightNumber)
    );
    if (uniqueFlights.size > 1 && selectedType !== 'multi') {
      setSelectedType('multi');
    }
  }, [flightSegments, selectedType, setSelectedType]);

  // Update selected flight effect
  useEffect(() => {
    if (
      selectedFlight &&
      directFlight.fromLocation &&
      directFlight.toLocation &&
      selectedType === 'direct'
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
  }, [selectedFlight, directFlight, setDirectFlight, selectedType]);

  // Update flight segments effect
  useEffect(() => {
    if (
      selectedType === 'multi' &&
      flightSegments.length > 0 &&
      selectedFlight
    ) {
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

  const updateSegmentLinks = useCallback((segments: FlightSegmentData[]) => {
    // Only update segments if there are actual changes needed
    const needsUpdate = segments.some((segment, index) => {
      if (index === 0) return false;
      const prevSegment = segments[index - 1];
      if (!prevSegment.selectedFlight) return false;

      const prevArrivalCity = prevSegment.selectedFlight.arrivalCity;
      const currentFromCity = segment.fromLocation?.value;

      return prevArrivalCity !== currentFromCity;
    });

    if (!needsUpdate) return segments;

    // Update segment linking for existing segments
    return segments.map((segment, index) => {
      if (index === 0 || !segments[index - 1].selectedFlight) {
        return segment;
      }

      const previousFlight = segments[index - 1].selectedFlight;
      if (
        previousFlight &&
        (!segment.fromLocation ||
          segment.fromLocation.value !== previousFlight.arrivalCity)
      ) {
        return {
          ...segment,
          fromLocation: {
            value: previousFlight.arrivalCity,
            label: previousFlight.arrivalCity,
            description: previousFlight.arrivalCity,
            city: previousFlight.arrivalCity,
            dropdownLabel: previousFlight.arrivalCity,
          },
        };
      }

      return segment;
    });
  }, []);

  // Add effect to maintain segment linking
  useEffect(() => {
    if (selectedType !== 'multi') return;

    // Only initialize on mount when there are no segments
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
      return;
    }

    // Skip segment linking during type transitions
    if (selectedType === 'multi' && flightSegments.length === 1) {
      return;
    }

    // Only update segments if there are actual changes needed
    const needsUpdate = flightSegments.some((segment, index) => {
      if (index === 0) return false;
      const prevSegment = flightSegments[index - 1];
      if (!prevSegment.selectedFlight) return false;

      const prevArrivalCity = prevSegment.selectedFlight.arrivalCity;
      const currentFromCity = segment.fromLocation?.value;

      return prevArrivalCity !== currentFromCity;
    });

    if (!needsUpdate) return;

    // Update segment linking for existing segments
    const updatedSegments = flightSegments.map((segment, index) => {
      if (index === 0 || !flightSegments[index - 1].selectedFlight) {
        return segment;
      }

      const previousFlight = flightSegments[index - 1].selectedFlight;
      if (
        previousFlight &&
        (!segment.fromLocation ||
          segment.fromLocation.value !== previousFlight.arrivalCity)
      ) {
        return {
          ...segment,
          fromLocation: {
            value: previousFlight.arrivalCity,
            label: previousFlight.arrivalCity,
            description: previousFlight.arrivalCity,
            city: previousFlight.arrivalCity,
            dropdownLabel: previousFlight.arrivalCity,
          },
        };
      }

      return segment;
    });

    setFlightSegments(updatedSegments);
  }, [selectedType, flightSegments]);

  // Add this effect near the other initialization effects
  useEffect(() => {
    if (isInitializing) return;

    // Initialize date from store on mount
    if (selectedDate && !directFlight.date) {
      try {
        const parsedDate = parseISO(selectedDate);
        if (isValid(parsedDate)) {
          setDirectFlight({
            ...directFlight,
            date: parsedDate,
          });
        }
      } catch (error) {
        console.error('Error parsing date:', error);
      }
    }
  }, [isInitializing, selectedDate, directFlight, setDirectFlight]);

  // Add validation effect to handle initial state
  useEffect(() => {
    if (
      !isInitializing &&
      typeof setValidationState === 'function' &&
      typeof stepNumber === 'number'
    ) {
      // Get data from the appropriate store based on phase
      const storeData =
        currentPhase === 4
          ? {
              selectedType: phase4Store.selectedType,
              directFlight: phase4Store.directFlight,
              flightSegments: phase4Store.flightSegments,
            }
          : useStore.getState();

      const { selectedType, directFlight, flightSegments } = storeData;

      // For phase 1, validate based on stored flight data
      if (currentPhase === 1) {
        const isValid =
          selectedType === 'direct'
            ? !!(directFlight.fromLocation && directFlight.toLocation)
            : flightSegments.every(
                (segment: Phase4FlightSegment, index: number) => {
                  const hasLocations =
                    segment.fromLocation && segment.toLocation;
                  if (index === 0) return hasLocations;

                  const prevSegment = flightSegments[index - 1];
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
                }
              );

        // Update validation state based on phase
        if (Number(currentPhase) === 4 && setValidationState) {
          setValidationState((prev: Record<number, boolean>) => ({
            ...prev,
            [stepNumber]: isValid,
          }));
        } else if ('updateValidationState' in mainStore) {
          mainStore.updateValidationState({
            stepValidation: {
              ...mainStore.validationState.stepValidation,
              [stepNumber as ValidationStateSteps]: isValid,
            },
          });
        }
      }
    }
  }, [
    currentPhase,
    isInitializing,
    setValidationState,
    stepNumber,
    phase4Store,
    mainStore,
  ]);

  const handleFlightDelete = useCallback(
    (index: number) => {
      console.log('=== Deleting Flight ===', { index, currentPhase });

      // Create new segments array with the flight removed
      const newSegments = [...flightSegments];

      // Clear the selected flight and date from the current segment
      newSegments[index] = {
        ...newSegments[index],
        selectedFlight: null,
        date: null,
      };

      // If this is not the last segment, clear the next segment's fromLocation and flight
      if (index < newSegments.length - 1) {
        newSegments[index + 1] = {
          ...newSegments[index + 1],
          fromLocation: null,
          selectedFlight: null,
          date: null,
        };
      }

      // Update store states first
      if (currentPhase === 4) {
        phase4Store.batchUpdate({
          selectedFlight: null,
          selectedFlights: [],
        });

        // Update flightStore
        const flightStore = useFlightStore.getState();
        flightStore.setSelectedFlights([]);
      } else {
        batchUpdateWizardState({
          selectedFlight: null,
          selectedFlights: [],
          fromLocation: newSegments[0]?.fromLocation
            ? JSON.stringify(newSegments[0].fromLocation)
            : null,
          toLocation: newSegments[newSegments.length - 1]?.toLocation
            ? JSON.stringify(newSegments[newSegments.length - 1].toLocation)
            : null,
        });
      }

      // Update validation state
      if (setValidationState && stepNumber) {
        setValidationState((prev: Record<number, boolean>) => ({
          ...prev,
          [stepNumber]: false,
        }));
      }

      // Update local state
      setFlightSegments([...newSegments]);

      // Trigger validation
      validateFlightSelection();

      // Notify parent component
      onInteract();
    },
    [
      currentPhase,
      flightSegments,
      phase4Store,
      batchUpdateWizardState,
      setValidationState,
      stepNumber,
      validateFlightSelection,
      onInteract,
    ]
  );

  // Convert to a proper React component
  const FlightPreviewCard = React.memo(
    ({
      flight,
      index,
      flightSegments,
      onEdit,
      onDelete,
    }: {
      flight: Flight;
      index: number;
      flightSegments: FlightSegmentData[];
      onEdit: (index: number) => void;
      onDelete: (index: number) => void;
    }) => {
      const { t } = useTranslation();
      const [connectionInfo, setConnectionInfo] = useState<{
        isValid: boolean;
        message: string;
        timeDiff: number;
      } | null>(null);

      useEffect(() => {
        if (index > 0 && flight) {
          const prevFlight = flightSegments[index - 1]?.selectedFlight;
          if (prevFlight) {
            const connectionInfo = getConnectionTimeInfo(prevFlight, flight, t);
            if (connectionInfo) {
              setConnectionInfo(connectionInfo);
            }
          }
        }
      }, [flight, index, flightSegments, t]);

      return (
        <div className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-[#F54538] hover:shadow-lg transition-all">
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
                  <p className="text-xs text-gray-900 font-medium">
                    {flight.flightNumber}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(index);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(index);
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
            {connectionInfo && index > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p
                  className={`text-sm ${connectionInfo.isValid ? 'text-gray-500' : 'text-red-500'}`}
                >
                  {connectionInfo.message}
                </p>
              </div>
            )}
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
                    <p className="text-gray-900 font-medium">
                      {flight.flightNumber}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500">
                    {flight.departureCity} → {flight.arrivalCity}
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
                    onEdit(index);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(index);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            {connectionInfo && index > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p
                  className={`text-sm flex items-center ${connectionInfo.isValid ? 'text-gray-500' : 'text-red-500'}`}
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {connectionInfo.message}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }
  );

  FlightPreviewCard.displayName = 'FlightPreviewCard';

  const handleSegmentDelete = useCallback(
    (index: number) => {
      // Only allow deletion of segments after the first two
      if (index <= 1) return;

      // Remove the segment
      const newSegments = flightSegments.filter((_, i) => i !== index);

      // Ensure we maintain connections between segments
      if (index > 0 && index < flightSegments.length - 1) {
        // When removing a middle segment, connect the segments before and after
        const prevSegment = newSegments[index - 1];
        const nextSegment = newSegments[index];

        // Clear the connection points since they need to be re-established
        if (prevSegment && nextSegment) {
          prevSegment.toLocation = null;
          prevSegment.selectedFlight = null;
          nextSegment.fromLocation = null;
          nextSegment.selectedFlight = null;
        }
      }

      // Update the store with the new segments
      setFlightSegments(newSegments);

      // Update selected flights array
      const remainingFlights = newSegments
        .map((segment) => segment.selectedFlight)
        .filter((flight): flight is Flight => flight !== null);

      if (currentPhase === 4) {
        phase4Store.batchUpdate({
          selectedFlight: null,
          selectedFlights: remainingFlights,
        });
      } else {
        batchUpdateWizardState({
          selectedFlight: null,
          selectedFlights: remainingFlights,
        });
      }

      // Reset current segment index if needed
      if (currentSegmentIndex >= newSegments.length) {
        setCurrentSegmentIndex(newSegments.length - 1);
      }

      // Update validation state if needed
      if (setValidationState && currentPhase === 3) {
        const allSegmentsValid = newSegments.every(
          (segment) => segment.selectedFlight !== null
        );
        setValidationState((prev: Record<number, boolean>) => ({
          ...prev,
          [stepNumber || 1]: allSegmentsValid,
        }));
      }

      // Trigger validation
      validateFlightSelection();
    },
    [
      currentPhase,
      flightSegments,
      currentSegmentIndex,
      phase4Store,
      batchUpdateWizardState,
      setValidationState,
      stepNumber,
      validateFlightSelection,
    ]
  );

  // Type guard to validate flight ID
  function hasValidId(flight: RawFlight): flight is RawFlight & { id: number } {
    return flight.id !== undefined && typeof flight.id === 'number';
  }

  // Update the render to use the new component
  const renderFlightPreviewCard = (flight: Flight, index: number) => (
    <FlightPreviewCard
      key={`flight-preview-${index}`}
      flight={flight}
      index={index}
      flightSegments={flightSegments}
      onEdit={handleFlightEdit}
      onDelete={handleFlightDelete}
    />
  );

  const handleMultiLocationChange = (
    location: LocationData | null,
    field: 'fromLocation' | 'toLocation',
    index: number
  ) => {
    try {
      // Clear error message when user starts interacting
      setFlightErrorMessage(null);

      // Update the segment with the new location
      const newSegments = [...flightSegments];
      newSegments[index] = {
        ...newSegments[index],
        [field]: location,
        selectedFlight: null,
      };

      // If this is not the first segment and we're updating fromLocation,
      // ensure it matches the previous segment's toLocation
      if (index > 0 && field === 'fromLocation' && location) {
        const prevSegment = newSegments[index - 1];
        if (prevSegment.toLocation) {
          const prevCity =
            prevSegment.toLocation.city ||
            prevSegment.toLocation.description ||
            prevSegment.toLocation.label;
          const currentCity =
            location.city || location.description || location.label;

          if (prevCity.toLowerCase() !== currentCity.toLowerCase()) {
            setFlightErrorMessage(
              t.flightSelector.errors.departureMismatch
                .replace('{city1}', currentCity)
                .replace('{city2}', prevCity)
            );
            return;
          }
        }
      }

      // Update segments state
      setFlightSegments(newSegments);

      // Clear any selected flights since we changed a location
      setSelectedFlights([]);

      // Clear any error messages for this field
      setFlightErrorMessages({
        ...errorMessages,
        [field === 'fromLocation' ? 'from' : 'to']: '',
      });

      // Update validation state if needed
      if (setValidationState && stepNumber && currentPhase !== 4) {
        // Check if all segments have both locations
        const allSegmentsValid = newSegments.every((segment) => {
          const hasLocations = !!(segment.fromLocation && segment.toLocation);

          // For segments after the first one, validate city connections
          if (index > 0 && hasLocations && segment.fromLocation) {
            const prevSegment = newSegments[index - 1];
            if (!prevSegment.toLocation) {
              return false;
            }

            const prevCity =
              prevSegment.toLocation.city ||
              prevSegment.toLocation.description ||
              prevSegment.toLocation.label;
            const currentCity =
              segment.fromLocation.city ||
              segment.fromLocation.description ||
              segment.fromLocation.label;

            if (prevCity.toLowerCase() !== currentCity.toLowerCase()) {
              return false;
            }
          }

          return hasLocations;
        });

        setValidationState((prev: Record<number, boolean>) => ({
          ...prev,
          [stepNumber]: allSegmentsValid,
        }));

        // Also trigger store validation
        validateFlightSelection();
      }

      // Trigger onInteract callback
      onInteract();
    } catch (error) {
      console.error('Error in handleMultiLocationChange:', error);
      setFlightErrorMessage('An error occurred while updating flight segments');
    }
  };

  // Add a function to render the flight segments
  const renderFlightSegments = () => {
    return flightSegments.map((segment, index) => (
      <div key={`segment-${index}`} className="relative">
        <div className="relative">
          <div className="relative flex items-start">
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <AutocompleteInput
                    value={segment.fromLocation as LocationData | null}
                    onChange={(location) =>
                      handleMultiLocationChange(location, 'fromLocation', index)
                    }
                    onSearch={searchAirports}
                    onFocus={handleFocus}
                    label={t.flightSelector.labels.from}
                    leftIcon="departure"
                    error={errorMessages.from}
                    disabled={disabled}
                  />
                </div>
                <div className="relative">
                  <AutocompleteInput
                    value={segment.toLocation as LocationData | null}
                    onChange={(location) =>
                      handleMultiLocationChange(location, 'toLocation', index)
                    }
                    onSearch={searchAirports}
                    onFocus={handleFocus}
                    label={t.flightSelector.labels.to}
                    leftIcon="arrival"
                    error={errorMessages.to}
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
            {/* Delete button for segments after the first two */}
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

        {/* Selected flight preview */}
        {segment.selectedFlight && (
          <div className="mt-4">
            <FlightPreviewCard
              key={`flight-preview-${segment.selectedFlight.id}-${index}`}
              flight={segment.selectedFlight}
              index={index}
              flightSegments={flightSegments}
              onEdit={handleFlightEdit}
              onDelete={handleFlightDelete}
            />
          </div>
        )}

        {/* Date picker and search button */}
        {showFlightSearch && (currentPhase === 3 || currentPhase === 4) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="relative date-picker-input w-full">
              <DatePicker
                selected={
                  segment.date instanceof Date
                    ? segment.date
                    : segment.date
                      ? parseISO(segment.date)
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
                              : parseISO(segment.date),
                            'dd.MM.yyyy'
                          )
                        : ''
                    }
                    onClear={() => {
                      handleMultiDateChange(null, index);
                      setFlightErrorMessage(null);
                    }}
                    label={t.flightSelector.labels.departureDate}
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
                  new Date(new Date().setFullYear(new Date().getFullYear() - 3))
                }
                openToDate={
                  segment.date instanceof Date
                    ? segment.date
                    : segment.date
                      ? parseISO(segment.date)
                      : new Date()
                }
                disabledKeyboardNavigation
                preventOpenOnFocus
                popperProps={{
                  strategy: 'fixed',
                  placement: 'top-start',
                }}
                className="react-datepicker-popper"
                calendarClassName="custom-calendar"
                onSelect={(date: Date | null) => {
                  if (date) {
                    const formattedDate = format(date, 'yyyy-MM-dd');
                    setSelectedDate(formattedDate);
                  }
                }}
              />
            </div>

            <button
              onClick={() => {
                setCurrentSegmentIndex(index);
                setSearchModalOpen(true);
                handleSearchFlights(index);
              }}
              disabled={
                !segment.date ||
                !isValid(
                  segment.date instanceof Date
                    ? segment.date
                    : new Date(segment.date)
                ) ||
                !segment.toLocation
              }
              className="h-14 w-full text-white bg-[#F54538] rounded-xl hover:bg-[#F54538]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F54538] disabled:opacity-50 disabled:cursor-not-allowed font-sans font-medium text-base"
            >
              {t.flightSelector.labels.searchFlights}
            </button>
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="space-y-4">
      <FlightTypeSelector
        types={[
          { id: 'direct', label: t.flightSelector.types.direct },
          { id: 'multi', label: t.flightSelector.types.multi },
        ]}
        selectedType={selectedType}
        onTypeSelect={handleFlightTypeChange}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
      />

      <div className="space-y-4">
        {selectedType === 'multi' ? (
          <div className="space-y-8">
            {renderFlightSegments()}
            {/* Add flight button */}
            {flightSegments.length < 4 && (
              <div className="flex flex-col gap-4">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addFlightSegment();
                  }}
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
                  label={t.flightSelector.labels.from}
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
                  label={t.flightSelector.labels.to}
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
                      selected={
                        directFlight.date
                          ? (() => {
                              const date =
                                directFlight.date instanceof Date
                                  ? directFlight.date
                                  : parseISO(directFlight.date);
                              return new Date(
                                Date.UTC(
                                  date.getFullYear(),
                                  date.getMonth(),
                                  date.getDate(),
                                  12,
                                  0,
                                  0,
                                  0
                                )
                              );
                            })()
                          : null
                      }
                      onChange={handleDirectDateChange}
                      customInput={
                        <CustomDateInput
                          value={
                            directFlight.date
                              ? formatSafeDate(directFlight.date)
                              : ''
                          }
                          onClear={() => {
                            handleDirectDateChange(null);
                            setFlightErrorMessage(null);
                          }}
                          onClick={() => {}}
                          label={t.flightSelector.labels.departureDate}
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
                      openToDate={
                        directFlight.date
                          ? (() => {
                              const date =
                                directFlight.date instanceof Date
                                  ? directFlight.date
                                  : parseISO(directFlight.date);
                              return new Date(
                                Date.UTC(
                                  date.getFullYear(),
                                  date.getMonth(),
                                  date.getDate(),
                                  12,
                                  0,
                                  0,
                                  0
                                )
                              );
                            })()
                          : undefined
                      }
                      disabledKeyboardNavigation
                      preventOpenOnFocus
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => {
                        setSearchModalOpen(true);
                        handleSearchFlights();
                      }}
                      disabled={
                        !directFlight.date ||
                        !isValid(
                          directFlight.date instanceof Date
                            ? directFlight.date
                            : new Date(directFlight.date)
                        ) ||
                        !directFlight.toLocation
                      }
                      className="w-full h-12 px-4 py-2 text-white bg-[#F54538] rounded-xl hover:bg-[#F54538]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F54538] disabled:opacity-50 disabled:cursor-not-allowed font-sans font-medium text-base"
                    >
                      {t.flightSelector.labels.searchFlights}
                    </button>
                    <button
                      onClick={() => {}}
                      className="hidden w-full h-12 bg-red-50 text-[#F54538] rounded-lg font-medium hover:bg-red-100 transition-colors text-sm"
                    >
                      Flight not found?
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
                  {t.phases.initialAssessment.flightDetails}
                </h3>
                {selectedType === 'direct' ? (
                  directFlight.selectedFlight &&
                  renderFlightPreviewCard(directFlight.selectedFlight, 0)
                ) : (
                  <div className="space-y-4">
                    {flightSegments.map((segment, index) => (
                      <React.Fragment key={`flight-preview-${index}`}>
                        {segment.selectedFlight && (
                          <>
                            {renderFlightPreviewCard(
                              segment.selectedFlight,
                              index
                            )}
                            {index < flightSegments.length - 1 && (
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

        {showResults &&
          showFlightSearch &&
          (currentPhase === 3 || currentPhase === 4) && (
            <BottomSheet
              isOpen={isSearchModalOpen}
              onClose={() => setSearchModalOpen(false)}
              title={t.flightSelector.labels.searchFlights}
            >
              <div className="flex flex-col h-full">
                <div className="flex-shrink-0 border-b border-gray-200">
                  <div className="px-6 py-6">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
                      <div className="hidden">
                        <h2 className="text-2xl font-semibold text-gray-900">
                          {t.flightSelector.labels.availableFlights}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          {t.flightSelector.labels.selectPreferred}
                        </p>
                      </div>
                      <div className="w-full">
                        <div className="relative w-full">
                          <input
                            type="text"
                            placeholder={
                              t.flightSelector.labels.searchByFlightNumber
                            }
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
                        {t.flightSelector.labels.searching}
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
                          onClick={() => setSearchModalOpen(false)}
                          className="hidden px-8 h-12 bg-red-50 text-[#F54538] rounded-lg font-medium hover:bg-red-100 transition-colors text-sm"
                        >
                          {t.flightSelector.labels.flightNotFound}
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
                          ? t.flightSelector.labels.noFlightsFound
                          : t.flightSelector.labels.noMatchingFlights}
                      </h3>
                      <p className="text-gray-500 mb-6">
                        {displayedFlights.length === 0
                          ? t.flightSelector.labels.noFlightsFoundCriteria
                          : t.flightSelector.labels.tryAdjusting}
                      </p>
                      <div className="mt-8 flex justify-center w-full">
                        <button
                          onClick={() => setSearchModalOpen(false)}
                          className="hidden px-8 h-12 bg-red-50 text-[#F54538] rounded-lg font-medium hover:bg-red-100 transition-colors text-sm"
                        >
                          {t.flightSelector.labels.flightNotFound}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="px-6 py-2 border-b border-gray-200 bg-white">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-medium text-gray-900">
                            {t.flightSelector.labels.flightsFound
                              .replace(
                                '{count}',
                                filteredFlights.length.toString()
                              )
                              .replace(
                                '{count, plural, one {Flug} other {Flüge}}',
                                filteredFlights.length === 1 ? 'Flug' : 'Flüge'
                              )}
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
                                      <span>
                                        {t.flightSelector.table.flight}
                                      </span>
                                    </div>
                                  </th>
                                  <th
                                    scope="col"
                                    className="w-[120px] px-3 py-3 text-left text-xs font-semibold text-[#F54538] uppercase tracking-wider"
                                  >
                                    {t.flightSelector.table.date}
                                  </th>
                                  <th
                                    scope="col"
                                    className="w-[160px] px-3 py-3 text-left text-xs font-semibold text-[#F54538] uppercase tracking-wider"
                                  >
                                    {t.flightSelector.table.departure}
                                  </th>
                                  <th
                                    scope="col"
                                    className="w-[160px] px-3 py-3 text-left text-xs font-semibold text-[#F54538] uppercase tracking-wider"
                                  >
                                    {t.flightSelector.table.arrival}
                                  </th>
                                  <th
                                    scope="col"
                                    className="w-[120px] px-3 py-3 text-left text-xs font-semibold text-[#F54538] uppercase tracking-wider"
                                  >
                                    {t.flightSelector.table.duration}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {filteredFlights.map((flight, index) => (
                                  <tr
                                    key={flight.id}
                                    onClick={() =>
                                      handleFlightSelect({
                                        flight,
                                        segmentIndex: currentSegmentIndex,
                                        selectedType,
                                      })
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
                              onClick={() =>
                                handleFlightSelect({
                                  flight,
                                  segmentIndex: currentSegmentIndex,
                                  selectedType,
                                })
                              }
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
