/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setSelectedFlights,
  setSelectedDate,
  setFlightType,
} from '@/store/slices/flightSlice';
import { setFromLocation, setToLocation } from '@/store/slices/locationSlice';
import { completeStep, markStepIncomplete } from '@/store/slices/progressSlice';
import { selectCurrentPhase } from '@/store/selectors/progressSelectors';
import {
  selectFromLocation,
  selectToLocation,
} from '@/store/selectors/locationSelectors';
import {
  AutocompleteInput,
  type Location,
} from '@/components/shared/AutocompleteInput';
import {
  CustomDateInput,
  type CustomDateInputProps,
} from '@/components/shared/CustomDateInput';
import { FlightTypeSelector } from '@/components/shared/FlightTypeSelector';
import { BottomSheet } from '@/components/shared/Sheet';
import { format, addMonths, getMonth, getYear } from 'date-fns';
import type { Flight } from '@/types/store';
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

// Add after imports
import { RootState } from '@/store';
import { useStepValidation } from '@/hooks/useStepValidation';
import { LocationData } from '@/types/store';
import { LocationLike } from '@/types/location';

interface FlightSegmentData {
  fromLocation: LocationLike | null;
  toLocation: LocationLike | null;
  date: Date | null;
  selectedFlight: Flight | null;
}

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

interface FlightSelectorProps {
  onSelect: (flights: Flight | Flight[] | null) => void;
  showResults?: boolean;
  showFlightSearch?: boolean;
  showFlightDetails?: boolean;
  onInteract?: () => void;
  selectedFlight?: Flight | null;
  initialFlightType?: 'direct' | 'multi';
  currentPhase?: number; // Add this prop
  disabled?: boolean;
}

type FlightType = 'direct' | 'multi';

interface Airport {
  iata_code: string;
  name: string;
  city?: string;
}

// Move calculateDuration function to the top of the file, after imports
// Update the calculateDuration helper function to better handle time calculations
const calculateDuration = (
  depTime: string | null | undefined,
  arrTime: string | null | undefined
): string => {
  if (!depTime || !arrTime) return 'N/A';
  try {
    // Format times to ensure consistent format
    const depFormatted = formatTime(depTime);
    const arrFormatted = formatTime(arrTime);

    if (!depFormatted || !arrFormatted) return 'N/A';

    // Extract hours and minutes
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

    // Calculate total minutes
    let diffMinutes = arrHours * 60 + arrMinutes - (depHours * 60 + depMinutes);

    // Handle overnight flights
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60;
    }

    // Convert to hours and minutes
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    // Format the duration string
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

// Update the formatTime helper function to better handle time formats
const formatTime = (timeStr: string | null | undefined): string => {
  if (!timeStr) return '';
  try {
    // Handle different time formats
    let timePart = timeStr;

    // If time includes date (e.g., "2024-01-01 14:30:00"), extract only the time part
    if (timeStr.includes(' ')) {
      timePart = timeStr.split(' ')[1];
    }

    // If time includes seconds, remove them
    if (timePart.includes(':')) {
      const [hours, minutes] = timePart.split(':').slice(0, 2);
      if (hours && minutes) {
        const hour = parseInt(hours, 10);
        if (isNaN(hour)) return '';
        return `${hour.toString().padStart(2, '0')}:${minutes.padStart(
          2,
          '0'
        )}`;
      }
    }

    // If time is in 24-hour format without colons (e.g., "1430")
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

// Add formatSafeDate function back
const formatSafeDate = (date: Date | string | null | undefined): string => {
  if (!date) return format(new Date(), 'dd.MM.yyyy');
  try {
    let dateObj: Date;
    if (typeof date === 'string') {
      if (date.includes('T')) {
        dateObj = new Date(date);
      } else {
        // Handle date-only format (YYYY-MM-DD)
        const [year, month, day] = date.split('-').map(Number);
        dateObj = new Date(year, month - 1, day, 12); // Set to noon to avoid timezone issues
      }
    } else {
      dateObj = date;
    }

    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date detected:', date);
      return format(new Date(), 'dd.MM.yyyy');
    }
    return format(dateObj, 'dd.MM.yyyy');
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return format(new Date(), 'dd.MM.yyyy');
  }
};

// Add at the top of the file, after imports
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

export const FlightSelector: React.FC<FlightSelectorProps> = ({
  onSelect = () => {},
  showResults = true,
  showFlightSearch = false,
  showFlightDetails = false,
  onInteract = () => {},
  selectedFlight = null,
  initialFlightType = 'direct',
  currentPhase = 3,
  disabled = false,
}): React.ReactElement => {
  const [isInitializing, setIsInitializing] = useState(false); // Changed to false by default
  console.log('\n=== FlightSelector Mount ===');
  console.log('Props:', {
    showResults,
    showFlightSearch,
    showFlightDetails,
    selectedFlight,
    initialFlightType,
    currentPhase,
    disabled,
  });

  const dispatch = useAppDispatch();
  const fromLocation = useAppSelector(selectFromLocation);
  const toLocation = useAppSelector(selectToLocation);
  const reduxCurrentPhase = useAppSelector(selectCurrentPhase);
  const { validationRules, validateStep } = useStepValidation();

  console.log('\n=== FlightSelector State ===');
  console.log('Redux State:', {
    fromLocation,
    toLocation,
    reduxCurrentPhase,
  });

  // Update the initialization of directFlight state to restore flight data
  const [directFlight, setDirectFlight] = useState<FlightSegmentData>(() => {
    if (typeof window === 'undefined')
      return {
        fromLocation: null,
        toLocation: null,
        date: new Date(),
        selectedFlight: null,
      };

    try {
      const savedFromLocation = localStorage.getItem('fromLocation');
      const savedToLocation = localStorage.getItem('toLocation');
      const savedDate = localStorage.getItem('selectedDate');
      const savedFlight = localStorage.getItem('selectedFlight');

      return {
        fromLocation: savedFromLocation ? JSON.parse(savedFromLocation) : null,
        toLocation: savedToLocation ? JSON.parse(savedToLocation) : null,
        date: savedDate ? new Date(savedDate) : new Date(),
        selectedFlight: savedFlight ? JSON.parse(savedFlight) : null,
      };
    } catch (error) {
      console.error('Error parsing saved flight data:', error);
      return {
        fromLocation: null,
        toLocation: null,
        date: new Date(),
        selectedFlight: null,
      };
    }
  });

  // Initialize flightSegments with saved data
  const [flightSegments, setFlightSegments] = useState<FlightSegmentData[]>(
    () => {
      if (typeof window === 'undefined') {
        return [
          {
            fromLocation: null,
            toLocation: null,
            selectedFlight: null,
            date: new Date(),
          },
        ];
      }

      try {
        const savedSegments = localStorage.getItem('flightSegments');
        if (savedSegments) {
          const parsed = JSON.parse(savedSegments);
          // Ensure dates are properly converted back to Date objects
          return parsed.map((segment: FlightSegmentData) => ({
            ...segment,
            date: segment.date ? new Date(segment.date) : new Date(),
            selectedFlight: segment.selectedFlight
              ? {
                  ...segment.selectedFlight,
                  // Keep date as ISO string in selectedFlight
                  date: segment.selectedFlight.date || new Date().toISOString(),
                }
              : null,
          }));
        }
      } catch (error) {
        console.error('Error parsing saved segments:', error);
      }

      return [
        {
          fromLocation: null,
          toLocation: null,
          selectedFlight: null,
          date: new Date(),
        },
      ];
    }
  );

  const [date, setDate] = useState<Date>(() => {
    if (typeof window === 'undefined') return new Date();
    const savedDate = localStorage.getItem('selectedDate');
    if (savedDate) {
      try {
        return new Date(savedDate);
      } catch (error) {
        console.error('Error parsing saved date:', error);
        return new Date();
      }
    }
    return new Date();
  });

  // Update the state declaration
  const [selectedType, setSelectedType] =
    useState<FlightType>(initialFlightType);

  // Initialize Redux store with the correct type on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set initial type in Redux store
    dispatch(setFlightType(initialFlightType));
  }, [dispatch, initialFlightType]); // Add initialFlightType to dependency array

  // Handle type changes after initial mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Update Redux and localStorage when type changes
    dispatch(setFlightType(selectedType));
    localStorage.setItem('selectedType', selectedType);
  }, [selectedType, dispatch]);

  const [displayedFlights, setDisplayedFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [view, setView] = useState<'list' | 'card'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [allFlights, setAllFlights] = useState<Flight[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(() => {
    // If we have flight segments, use the first empty one or the last one
    if (typeof window !== 'undefined') {
      const savedSegments = localStorage.getItem('flightSegments');
      if (savedSegments) {
        try {
          const segments = JSON.parse(savedSegments);
          const emptySegmentIndex = segments.findIndex(
            (s: FlightSegmentData) => !s.selectedFlight
          );
          return emptySegmentIndex >= 0
            ? emptySegmentIndex
            : segments.length - 1;
        } catch (error) {
          console.error('Error parsing saved segments:', error);
        }
      }
    }
    return 0;
  });
  const [errorMessages, setErrorMessages] = useState<{
    from?: string;
    to?: string;
  }>({});
  const [selectedFlightNumber, setSelectedFlightNumber] = useState<
    string | null
  >(null);

  const handleDateClear = useCallback(() => {
    // Only clear the date, not the flight
    if (selectedType === 'direct') {
      setDirectFlight((prev) => ({
        ...prev,
        date: new Date(),
      }));
    } else {
      setFlightSegments((prev) =>
        prev.map((segment, idx) =>
          idx === currentSegmentIndex
            ? { ...segment, date: new Date() }
            : segment
        )
      );
    }
    setDate(new Date());
    localStorage.removeItem('selectedDate');
    dispatch(setSelectedDate('')); // Empty string instead of null
  }, [selectedType, currentSegmentIndex, dispatch]);

  const handleDateChange = useCallback(
    (date: Date | null) => {
      if (!date) {
        handleDateClear();
        return;
      }

      if (selectedType === 'direct') {
        setDirectFlight((prev) => ({
          ...prev,
          date,
        }));
      } else {
        setFlightSegments((prev) =>
          prev.map((segment, idx) =>
            idx === currentSegmentIndex ? { ...segment, date } : segment
          )
        );
      }
      setDate(date);
      localStorage.setItem('selectedDate', date.toISOString());
      dispatch(setSelectedDate(format(date, 'yyyy-MM-dd')));
    },
    [selectedType, currentSegmentIndex, dispatch, handleDateClear]
  );

  // Update the effect that handles saving state to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const saveState = () => {
      // Save location data
      if (directFlight.fromLocation) {
        const stringifiedFrom = JSON.stringify(directFlight.fromLocation);
        localStorage.setItem('fromLocation', stringifiedFrom);
        if (selectedType === 'direct') {
          dispatch(setFromLocation(stringifiedFrom));
        }
      } else {
        localStorage.removeItem('fromLocation');
        if (selectedType === 'direct') {
          dispatch(setFromLocation(null));
        }
      }

      if (directFlight.toLocation) {
        const stringifiedTo = JSON.stringify(directFlight.toLocation);
        localStorage.setItem('toLocation', stringifiedTo);
        if (selectedType === 'direct') {
          dispatch(setToLocation(stringifiedTo));
        }
      } else {
        localStorage.removeItem('toLocation');
        if (selectedType === 'direct') {
          dispatch(setToLocation(null));
        }
      }

      // Save date if it exists
      if (directFlight.date) {
        localStorage.setItem('selectedDate', directFlight.date.toISOString());
        if (selectedType === 'direct') {
          dispatch(setSelectedDate(format(directFlight.date, 'yyyy-MM-dd')));
        }
      }

      // Save flight data - never clear automatically
      if (directFlight.selectedFlight) {
        localStorage.setItem(
          'selectedFlight',
          JSON.stringify(directFlight.selectedFlight)
        );
      }

      // Save flight segments
      localStorage.setItem('flightSegments', JSON.stringify(flightSegments));
      localStorage.setItem('selectedType', selectedType);
    };

    // Debounce the save operation
    const timeoutId = setTimeout(saveState, 100);
    return () => clearTimeout(timeoutId);
  }, [directFlight, flightSegments, selectedType, dispatch]);

  // Add an effect to restore flight data on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const restoreState = () => {
      try {
        // Restore flight data from localStorage
        const savedFlight = localStorage.getItem('selectedFlight');
        const savedSegments = localStorage.getItem('flightSegments');
        const savedType = localStorage.getItem('selectedType') as FlightType;

        if (savedType === 'direct' && savedFlight) {
          const parsedFlight = JSON.parse(savedFlight);
          dispatch(setSelectedFlights(parsedFlight));
        } else if (savedType === 'multi' && savedSegments) {
          const parsedSegments = JSON.parse(savedSegments);
          const selectedFlights = parsedSegments
            .map((segment: FlightSegmentData) => segment.selectedFlight)
            .filter(
              (flight: Flight | null): flight is Flight => flight !== null
            );
          if (selectedFlights.length > 0) {
            dispatch(setSelectedFlights(selectedFlights));
          }
        }
      } catch (error) {
        console.error('Error restoring flight data:', error);
      }
    };

    restoreState();
  }, [dispatch]); // Add dispatch to dependencies

  // Update selected flight effect
  useEffect(() => {
    if (!selectedFlight) {
      // If there's no selected flight and we're in phase 3, ensure it's incomplete
      if (reduxCurrentPhase === 3) {
        dispatch(markStepIncomplete(3));
      }
      return;
    }

    // Clear any auto-created segments
    if (selectedType === 'direct') {
      setFlightSegments([
        {
          fromLocation: null,
          toLocation: null,
          selectedFlight: null,
          date: new Date(),
        },
      ]);
    }
  }, [selectedFlight, selectedType, reduxCurrentPhase, dispatch]); // Remove calculateDuration

  // Update the useEffect that handles initialization
  useEffect(() => {
    if (reduxCurrentPhase === 3) {
      setIsInitializing(true);
      console.log('\n=== Phase 3 Initialization ===');

      // Try to restore flight data from localStorage
      const savedFlights = localStorage.getItem('selectedFlights');
      const savedSegments = localStorage.getItem('flightSegments');
      const savedType = localStorage.getItem('selectedType') as FlightType;
      const savedFromLocation = localStorage.getItem('fromLocation');
      const savedToLocation = localStorage.getItem('toLocation');
      const savedDate = localStorage.getItem('selectedDate');
      const savedValidationState = localStorage.getItem('validationState');
      const savedPhase = localStorage.getItem('currentPhase');

      console.log('Saved data:', {
        savedFlights,
        savedSegments,
        savedType,
        savedFromLocation,
        savedToLocation,
        savedDate,
        savedValidationState,
        savedPhase,
      });

      try {
        // Always ensure we're in phase 3 if that's what's saved
        if (savedPhase === '3') {
          localStorage.setItem('currentPhase', '3');
          dispatch({ type: 'progress/setCurrentPhase', payload: 3 });
        }

        // Restore flight type first
        if (savedType) {
          setSelectedType(savedType as FlightType);
          dispatch(setFlightType(savedType as 'direct' | 'multi'));
        }

        // Restore locations if available
        if (savedFromLocation) {
          try {
            const parsedFromLocation = JSON.parse(savedFromLocation);
            if (parsedFromLocation && parsedFromLocation.value) {
              dispatch(setFromLocation(savedFromLocation));
            }
          } catch (error) {
            console.error('Error parsing from location:', error);
          }
        }

        if (savedToLocation) {
          try {
            const parsedToLocation = JSON.parse(savedToLocation);
            if (parsedToLocation && parsedToLocation.value) {
              dispatch(setToLocation(savedToLocation));
            }
          } catch (error) {
            console.error('Error parsing to location:', error);
          }
        }

        // Restore date if available
        if (savedDate) {
          try {
            const parsedDate = new Date(savedDate);
            if (!isNaN(parsedDate.getTime())) {
              setDate(parsedDate);
              dispatch(setSelectedDate(format(parsedDate, 'yyyy-MM-dd')));
            }
          } catch (error) {
            console.error('Error parsing date:', error);
            // Use current date as fallback
            const currentDate = new Date();
            setDate(currentDate);
            dispatch(setSelectedDate(format(currentDate, 'yyyy-MM-dd')));
          }
        }

        // Restore flight segments if available
        if (savedSegments) {
          try {
            const parsedSegments = JSON.parse(savedSegments);
            if (Array.isArray(parsedSegments)) {
              setFlightSegments(parsedSegments);
            }
          } catch (error) {
            console.error('Error parsing flight segments:', error);
            // Initialize with empty segments as fallback
            setFlightSegments([
              {
                fromLocation: null,
                toLocation: null,
                date: new Date(),
                selectedFlight: null,
              },
            ]);
          }
        }

        // Restore selected flights if available
        if (savedFlights) {
          try {
            const parsedFlights = JSON.parse(savedFlights);
            if (parsedFlights) {
              if (Array.isArray(parsedFlights)) {
                dispatch(setSelectedFlights(parsedFlights));
              } else {
                dispatch(setSelectedFlights([parsedFlights]));
              }
            }
          } catch (error) {
            console.error('Error parsing saved flights:', error);
            // Initialize with empty array as fallback
            dispatch(setSelectedFlights([]));
          }
        }

        console.log('Restored saved flight data');
        console.log('=== End Phase 3 Initialization ===');
      } catch (error) {
        console.error('Error restoring saved data:', error);
        // Initialize with default values
        dispatch(setSelectedFlights([]));
        dispatch(markStepIncomplete(1));
        setFlightSegments([
          {
            fromLocation: null,
            toLocation: null,
            date: new Date(),
            selectedFlight: null,
          },
        ]);
        setDate(new Date());
        dispatch(setSelectedDate(format(new Date(), 'yyyy-MM-dd')));
      }

      // Set initializing to false after everything is done
      setIsInitializing(false);
    }
  }, [reduxCurrentPhase, dispatch]);

  // Add validation effect
  useEffect(() => {
    console.log('\n=== Location Validation Effect ===');
    console.log('Current phase:', reduxCurrentPhase);
    console.log('From location:', fromLocation);
    console.log('To location:', toLocation);

    if (reduxCurrentPhase === 1) {
      try {
        // Check if both locations are valid
        const isValid = validationRules.locations(fromLocation, toLocation);
        validateStep(1, isValid);

        // Save to localStorage if valid and locations exist
        if (isValid && fromLocation && toLocation) {
          console.log('Both locations are valid, saving to localStorage');
          localStorage.setItem('fromLocation', fromLocation);
          localStorage.setItem('toLocation', toLocation);
        }
      } catch (error) {
        console.error('Error in location validation effect:', error);
        validateStep(1, false);
      }
    }

    console.log('=== End Location Validation Effect ===\n');
  }, [
    fromLocation,
    toLocation,
    reduxCurrentPhase,
    validationRules,
    validateStep,
  ]);

  const CustomInput = React.forwardRef<HTMLInputElement, CustomDateInputProps>(
    ({ value = '', onClear }, ref) => (
      <CustomDateInput value={value} ref={ref} onClear={onClear} />
    )
  );

  CustomInput.displayName = 'CustomInput';

  const handleSearchFlights = async (segmentIndex: number = 0) => {
    // Use the appropriate data source based on mode
    const searchData =
      selectedType === 'direct' ? directFlight : flightSegments[segmentIndex];

    console.log('=== Search Flights Debug ===');
    console.log('Selected Type:', selectedType);
    console.log('Current Segment Index:', segmentIndex);
    console.log('Search Data:', searchData);

    // Update the current segment index first
    setCurrentSegmentIndex(segmentIndex);

    const newErrorMessages: { from?: string; to?: string } = {};

    if (!searchData?.fromLocation?.value) {
      newErrorMessages.from = 'Please select departure airport';
    }

    if (!searchData?.toLocation?.value) {
      newErrorMessages.to = 'Please select arrival airport';
    }

    setErrorMessages(newErrorMessages);

    if (Object.keys(newErrorMessages).length > 0) {
      return;
    }

    // Use the segment's date or current date
    const searchDate = searchData.date || new Date();
    const formattedDate = format(searchDate, 'yyyy-MM-dd');

    // Don't search for flights more than 6 months in the future
    const maxDate = addMonths(new Date(), 6);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - 365); // Allow searching up to 1 year in the past

    if (searchDate > maxDate) {
      setErrorMessage('Please select a date within the next 6 months.');
      setLoading(false);
      return;
    }

    if (searchDate < minDate) {
      setErrorMessage('Please select a date within the last year.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (!searchData.fromLocation || !searchData.toLocation) {
        setAllFlights([]);
        setDisplayedFlights([]);
        setLoading(false);
        return;
      }

      // Update Redux store with current segment's locations
      if (selectedType === 'direct') {
        if (searchData.fromLocation) {
          const stringifiedFrom = JSON.stringify(searchData.fromLocation);
          dispatch(setFromLocation(stringifiedFrom));
        }
        if (searchData.toLocation) {
          const stringifiedTo = JSON.stringify(searchData.toLocation);
          dispatch(setToLocation(stringifiedTo));
        }
      }

      const params = new URLSearchParams();
      params.append('from_iata', searchData.fromLocation.value);
      params.append('to_iata', searchData.toLocation.value);
      params.append('lang', 'en');

      params.append('date', formattedDate);

      console.log('Searching flights with params:', {
        from: searchData.fromLocation.value,
        to: searchData.toLocation.value,
        date: formattedDate,
        url: `/api/searchflightsbyfromiatatoiatadatenumber?${params.toString()}`,
      });

      const response = await fetch(
        `/api/searchflightsbyfromiatatoiatadatenumber?${params.toString()}`
      );

      const contentType = response.headers.get('content-type');
      console.log('Response Content-Type:', contentType);
      console.log('Response Status:', response.status);

      const data = await response.json();
      console.log('API Response:', data);

      if (!response.ok) {
        console.error('Invalid response:', { status: response.status, data });
        setAllFlights([]);
        setDisplayedFlights([]);
        setLoading(false);
        setErrorMessage('Failed to fetch flights. Please try again.');
        return;
      }

      // Extract flights array, handling both direct array and data.data formats
      const flights = Array.isArray(data) ? data : data.data || [];
      console.log('Received flights:', flights);

      if (flights.length === 0) {
        setAllFlights([]);
        setDisplayedFlights([]);
        setLoading(false);
        setErrorMessage(
          'No flights found for the selected date. Please try a different date.'
        );
        return;
      }

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
        date: formattedDate,
        status: flight.status || '',
        aircraft: flight.aircraft_type || 'Unknown',
        class: 'economy',
        dep_iata: flight.dep_iata,
        arr_iata: flight.arr_iata,
        dep_time_sched: flight.dep_time_sched,
        arr_time_sched: flight.arr_time_sched,
        departureAirport: flight.dep_iata || '',
        arrivalAirport: flight.arr_iata || '',
        price: 0,
      }));

      console.log('Transformed Flights:', transformedFlights);

      setAllFlights(transformedFlights);
      setDisplayedFlights(transformedFlights);
      setLoading(false);
      setErrorMessage(null);
    } catch (error) {
      console.error('Error searching flights:', error);
      setAllFlights([]);
      setDisplayedFlights([]);
      setLoading(false);
    }
  };

  const handleFlightSelect = async (flight: Flight | null) => {
    if (!flight) return;

    try {
      // Calculate duration if not present
      const duration =
        flight.duration ||
        calculateDuration(flight.departureTime, flight.arrivalTime);

      // Create a normalized flight object with proper date handling
      const flightWithDefaults = {
        ...flight,
        date: flight.date
          ? new Date(flight.date).toISOString()
          : new Date().toISOString(),
        departureTime: formatTime(flight.departureTime),
        arrivalTime: formatTime(flight.arrivalTime),
        duration: duration,
        stops: flight.stops || 0,
        aircraft: flight.aircraft || 'Unknown',
        class: flight.class || 'economy',
        price: flight.price || 0,
      };

      // Update the flight data
      if (selectedType === 'multi') {
        // Handle multi-city flight selection
        const newSegments = [...flightSegments];
        newSegments[currentSegmentIndex] = {
          fromLocation: {
            value: flightWithDefaults.departure,
            label: `${flightWithDefaults.departureCity} (${flightWithDefaults.departure})`,
            description: flightWithDefaults.departureCity,
            city: flightWithDefaults.departureCity,
          },
          toLocation: {
            value: flightWithDefaults.arrival,
            label: `${flightWithDefaults.arrivalCity} (${flightWithDefaults.arrival})`,
            description: flightWithDefaults.arrivalCity,
            city: flightWithDefaults.arrivalCity,
          },
          date: new Date(flightWithDefaults.date),
          selectedFlight: flightWithDefaults,
        };
        setFlightSegments(newSegments);
        localStorage.setItem('flightSegments', JSON.stringify(newSegments));
      } else {
        // Handle direct flight selection
        setDirectFlight({
          fromLocation: {
            value: flightWithDefaults.departure,
            label: `${flightWithDefaults.departureCity} (${flightWithDefaults.departure})`,
            description: flightWithDefaults.departureCity,
            city: flightWithDefaults.departureCity,
          },
          toLocation: {
            value: flightWithDefaults.arrival,
            label: `${flightWithDefaults.arrivalCity} (${flightWithDefaults.arrival})`,
            description: flightWithDefaults.arrivalCity,
            city: flightWithDefaults.arrivalCity,
          },
          date: new Date(flightWithDefaults.date),
          selectedFlight: flightWithDefaults,
        });
        localStorage.setItem(
          'selectedFlight',
          JSON.stringify(flightWithDefaults)
        );
      }

      // Update Redux store
      dispatch(setSelectedFlights([flightWithDefaults]));
      dispatch(completeStep(1));

      // Close the search modal
      setIsSearchModalOpen(false);
      onSelect([flightWithDefaults]);
    } catch (error) {
      console.error('Error selecting flight:', error);
      setErrorMessage('Failed to select flight. Please try again.');
    }
  };

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
    return searchAirports('');
  };

  const searchAirports = async (term: string): Promise<Location[]> => {
    try {
      if (!term || term.length < 3) {
        return [];
      }

      const params = new URLSearchParams({
        term: term.trim(),
        lang: 'en',
      });

      const response = await fetch(
        `/.netlify/functions/searchAirports?${params}`
      );

      if (!response.ok) {
        console.error('API request failed:', response.status);
        return [];
      }

      const airports = await response.json();
      console.log('Parsed airports:', airports);

      if (!Array.isArray(airports)) {
        console.error('Invalid response format, expected array:', airports);
        return [];
      }

      // Transform the airports into Location objects
      const transformedResults = airports
        .filter((airport) => airport.iata_code) // Only include airports with IATA codes
        .map((airport) => ({
          value: airport.iata_code,
          label: airport.iata_code,
          description: airport.name,
          city: airport.name,
        }));

      console.log('Transformed results:', transformedResults);
      return transformedResults;
    } catch (error) {
      console.error('Error fetching airports:', error);
      return [];
    }
  };

  const handleFlightDelete = (index: number) => {
    const newSegments = flightSegments.filter((_, i) => i !== index);
    setFlightSegments(newSegments);

    // Update Redux store with remaining flights
    const remainingFlights = newSegments
      .map((segment: FlightSegmentData) => segment.selectedFlight)
      .filter((flight: Flight | null): flight is Flight => flight !== null);

    if (remainingFlights.length > 0) {
      dispatch(setSelectedFlights(remainingFlights));
      localStorage.setItem('selectedFlights', JSON.stringify(remainingFlights));
    } else {
      dispatch(setSelectedFlights([]));
      localStorage.removeItem('selectedFlights');
    }
  };

  // Handle flight deletion
  const handleDirectFlightDelete = () => {
    setDirectFlight((prev) => ({
      ...prev,
      selectedFlight: null,
      // Preserve fromLocation, toLocation, and date
    }));

    // Clear Redux store but don't mark steps as incomplete in phase 3
    dispatch(setSelectedFlights([]));
    dispatch(markStepIncomplete(1));
    if (currentPhase === 3) {
      localStorage.setItem('currentPhase', '3');
    }

    // Clear only flight-related data from localStorage
    localStorage.removeItem('selectedFlights');
    localStorage.removeItem('selectedFlight');

    // Trigger onSelect callback with null to update parent state
    onSelect(null);
  };

  // Handle multi-flight deletion
  const handleMultiFlightDelete = useCallback(
    async (index: number, e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      console.log('=== Deleting Multi Flight ===');
      console.log('Deleting segment at index:', index);

      // Remove the segment entirely instead of just clearing the flight
      const newSegments = flightSegments.filter((_, i) => i !== index);

      console.log('New segments after deletion:', newSegments);

      // Update flight segments state
      setFlightSegments(newSegments);

      // Get all selected flights from remaining segments
      const remainingFlights = newSegments
        .map((segment) => segment.selectedFlight)
        .filter((flight): flight is Flight => flight !== null);

      console.log('Remaining flights:', remainingFlights);

      // Update Redux store and localStorage
      if (remainingFlights.length > 0) {
        dispatch(setSelectedFlights(remainingFlights));
        localStorage.setItem(
          'selectedFlights',
          JSON.stringify(remainingFlights)
        );
        localStorage.setItem('flightSegments', JSON.stringify(newSegments));
        onSelect(remainingFlights);
      } else {
        // If no flights remain, clear flight selections
        dispatch(setSelectedFlights([]));
        if (currentPhase !== 3) {
          dispatch(markStepIncomplete(3));
          dispatch(markStepIncomplete(1));
        } else {
          // If in phase 3, ensure we persist the phase
          localStorage.setItem('currentPhase', '3');
        }
        localStorage.removeItem('selectedFlights');
        // Update flightSegments in localStorage
        localStorage.setItem('flightSegments', JSON.stringify(newSegments));
        onSelect(null);

        // Switch back to direct flight mode if only one segment remains
        if (newSegments.length === 1) {
          setSelectedType('direct');
          dispatch(setFlightType('direct'));
          localStorage.setItem('selectedType', 'direct');
        }
      }

      console.log('=== End Multi Flight Delete ===');
    },
    [currentPhase, dispatch, flightSegments, onSelect, setSelectedType]
  );

  // Use handleFlightDelete directly as removeFlightSegment
  const removeFlightSegment = handleFlightDelete;

  // Add a new function to handle clearing individual fields
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
    localStorage.setItem('flightSegments', JSON.stringify(newSegments));

    // Update Redux store if this is the first segment
    if (index === 0) {
      if (field === 'fromLocation') {
        dispatch(setFromLocation(null));
        localStorage.removeItem('fromLocation');
      } else if (field === 'toLocation') {
        dispatch(setToLocation(null));
        localStorage.removeItem('toLocation');
      }
    }

    // Update Redux store with remaining flights
    const remainingFlights = newSegments
      .map((segment) => segment.selectedFlight)
      .filter((flight): flight is Flight => flight !== null);

    if (remainingFlights.length > 0) {
      dispatch(setSelectedFlights(remainingFlights));
      localStorage.setItem('selectedFlights', JSON.stringify(remainingFlights));
    } else {
      dispatch(setSelectedFlights([]));
      localStorage.removeItem('selectedFlights');
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
        `/api/searchflightsbyterm?${params.toString()}`
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
        status: flight.status || '',
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
        .map((segment) => segment.selectedFlight?.flightNumber)
        .filter(Boolean)
    );
    if (uniqueFlights.size > 1) {
      setSelectedType('multi');
    }
  }, [flightSegments]);

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

  // Handle flight type change
  const handleFlightTypeChange = useCallback(
    (newType: 'direct' | 'multi') => {
      console.log('=== Flight Type Change ===');
      console.log('Current type:', selectedType);
      console.log('New type:', newType);
      console.log('Current segments:', flightSegments);

      if (newType === 'multi') {
        // Ensure we have at least two segments when switching to multi
        const currentFromLocation =
          directFlight.fromLocation || flightSegments[0]?.fromLocation;
        const currentToLocation =
          directFlight.toLocation || flightSegments[0]?.toLocation;

        const newSegments = [
          {
            fromLocation: currentFromLocation,
            toLocation: currentToLocation,
            selectedFlight: null,
            date: new Date(),
          },
          {
            fromLocation: currentToLocation,
            toLocation: null,
            selectedFlight: null,
            date: new Date(),
          },
        ];

        setFlightSegments(newSegments);
        localStorage.setItem('flightSegments', JSON.stringify(newSegments));
      }

      setSelectedType(newType);
      localStorage.setItem('selectedType', newType);
      dispatch(setFlightType(newType));

      console.log('=== End Flight Type Change ===');
    },
    [
      selectedType,
      flightSegments,
      directFlight.fromLocation,
      directFlight.toLocation,
      dispatch,
    ]
  );

  // Update addFlightSegment to properly link segments
  const addFlightSegment = () => {
    console.log('=== Adding Flight Segment ===');
    console.log('Current segments:', flightSegments);

    if (flightSegments.length >= 4) {
      console.log('Maximum segments reached');
      return; // Maximum 4 segments
    }

    // Get the last segment
    const lastSegment = flightSegments[flightSegments.length - 1];
    console.log('Last segment:', lastSegment);

    // Create new segment with the last segment's arrival location as the departure
    const newSegment: FlightSegmentData = {
      fromLocation: lastSegment?.toLocation || null,
      toLocation: null,
      selectedFlight: null,
      date: new Date(),
    };

    const newSegments = [...flightSegments, newSegment];
    console.log('New segments:', newSegments);

    // Update state and storage
    setFlightSegments(newSegments);
    localStorage.setItem('flightSegments', JSON.stringify(newSegments));

    // Set current segment to the new one
    setCurrentSegmentIndex(newSegments.length - 1);

    // Switch to multi-city mode if not already
    if (selectedType !== 'multi') {
      setSelectedType('multi');
      localStorage.setItem('selectedType', 'multi');
      dispatch(setFlightType('multi'));
    }

    console.log('=== End Adding Flight Segment ===');
  };

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
    localStorage.setItem('flightSegments', JSON.stringify(newSegments));

    // Update Redux store with the first segment's locations
    if (index === 0) {
      if (updates.fromLocation) {
        const stringifiedFrom = JSON.stringify(updates.fromLocation);
        dispatch(setFromLocation(stringifiedFrom));
        localStorage.setItem('fromLocation', stringifiedFrom);
      }
      if (updates.toLocation) {
        const stringifiedTo = JSON.stringify(updates.toLocation);
        dispatch(setToLocation(stringifiedTo));
        localStorage.setItem('toLocation', stringifiedTo);
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
  }, [flightSegments.length, currentSegmentIndex]);

  // Update Redux when flight type changes
  useEffect(() => {
    dispatch(setFlightType(selectedType));
  }, [selectedType, dispatch]);

  // Add a computed value for visible segments
  const visibleSegments = useMemo(() => {
    if (selectedType === 'multi') {
      // In multi mode, ensure we always have at least two segments
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
        // Update the actual segments if needed
        if (flightSegments.length !== currentSegments.length) {
          setFlightSegments(currentSegments);
        }
        return currentSegments;
      }
      return flightSegments;
    }

    // In direct mode, show only the first segment
    return [flightSegments[0]];
  }, [selectedType, flightSegments]);

  // Update the modal's location change handlers
  const handleModalLocationChange = (
    location: Location | null,
    field: 'fromLocation' | 'toLocation'
  ) => {
    console.log('\n=== Modal Location Change ===');
    console.log('Field:', field);
    console.log('New location:', location);
    console.log('Current phase:', reduxCurrentPhase);

    // Clear error message when user starts interacting
    setErrorMessage(null);

    // Update the appropriate location based on flight type
    if (selectedType === 'direct') {
      setDirectFlight((prev) => ({
        ...prev,
        [field]: location,
        selectedFlight: null,
      }));

      // Update Redux store
      if (
        location &&
        location.value &&
        location.value !== 'null' &&
        location.label?.trim()
      ) {
        console.log('Dispatching location to Redux:', location);
        const stringifiedLocation = JSON.stringify(location);
        if (field === 'fromLocation') {
          dispatch(setFromLocation(stringifiedLocation));
          localStorage.setItem('fromLocation', stringifiedLocation);
        } else {
          dispatch(setToLocation(stringifiedLocation));
          localStorage.setItem('toLocation', stringifiedLocation);
        }
      } else {
        console.log('Clearing location in Redux');
        if (field === 'fromLocation') {
          dispatch(setFromLocation(null));
          localStorage.removeItem('fromLocation');
        } else {
          dispatch(setToLocation(null));
          localStorage.removeItem('toLocation');
        }
        if (reduxCurrentPhase === 1) {
          dispatch(markStepIncomplete(1));
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

      // Update Redux store for first segment only
      if (currentSegmentIndex === 0) {
        if (
          location &&
          location.value &&
          location.value !== 'null' &&
          location.label?.trim()
        ) {
          console.log('Dispatching from location:', location);
          const stringifiedLocation = JSON.stringify(location);
          dispatch(setFromLocation(stringifiedLocation));
          localStorage.setItem('fromLocation', stringifiedLocation);
        } else {
          console.log('Clearing from location');
          dispatch(setFromLocation(null));
          localStorage.removeItem('fromLocation');
          if (reduxCurrentPhase === 1) {
            dispatch(markStepIncomplete(1));
          }
        }
      }
    }

    // Clear any error messages for this field
    setErrorMessages((prev) => ({
      ...prev,
      [field === 'fromLocation' ? 'from' : 'to']: '',
    }));

    // Trigger onSelect callback
    onSelect(null);

    console.log('=== End Modal Location Change ===\n');
  };

  const handleDirectFromLocationChange = (location: Location | null) => {
    console.log('\n=== Direct From Location Change ===');
    console.log('New location:', location);
    console.log('Current phase:', reduxCurrentPhase);

    setDirectFlight((prev) => ({
      ...prev,
      fromLocation: location,
      selectedFlight: null,
    }));

    if (
      location &&
      location.value &&
      location.value !== 'null' &&
      location.label?.trim()
    ) {
      const stringifiedLocation = JSON.stringify(location);
      console.log('Dispatching from location to Redux:', stringifiedLocation);
      dispatch(setFromLocation(stringifiedLocation));
      localStorage.setItem('fromLocation', stringifiedLocation);
    } else {
      console.log('Clearing from location in Redux');
      dispatch(setFromLocation(null));
      localStorage.removeItem('fromLocation');
    }

    // Clear any selected flights from storage
    dispatch(setSelectedFlights([]));
    localStorage.removeItem('selectedFlights');
    localStorage.removeItem('flightSegments');

    console.log('=== End Direct From Location Change ===\n');
  };

  const handleDirectToLocationChange = (location: Location | null) => {
    console.log('\n=== Direct To Location Change ===');
    console.log('New location:', location);
    console.log('Current phase:', reduxCurrentPhase);

    setDirectFlight((prev) => ({
      ...prev,
      toLocation: location,
      selectedFlight: null,
    }));

    if (
      location &&
      location.value &&
      location.value !== 'null' &&
      location.label?.trim()
    ) {
      const stringifiedLocation = JSON.stringify(location);
      console.log('Dispatching to location to Redux:', stringifiedLocation);
      dispatch(setToLocation(stringifiedLocation));
      localStorage.setItem('toLocation', stringifiedLocation);
    } else {
      console.log('Clearing to location in Redux');
      dispatch(setToLocation(null));
      localStorage.removeItem('toLocation');
    }

    // Clear any selected flights from storage
    dispatch(setSelectedFlights([]));
    localStorage.removeItem('selectedFlights');
    localStorage.removeItem('flightSegments');

    console.log('=== End Direct To Location Change ===\n');
  };

  const handleDirectDateChange = (newDate: Date | null) => {
    if (newDate) {
      // Set the time to noon to avoid timezone issues
      const normalizedDate = new Date(
        newDate.getFullYear(),
        newDate.getMonth(),
        newDate.getDate(),
        12
      );
      setDirectFlight((prev) => ({
        ...prev,
        date: normalizedDate,
        selectedFlight: null,
      }));
      dispatch(setSelectedDate(format(normalizedDate, 'yyyy-MM-dd')));
      localStorage.setItem('selectedDate', normalizedDate.toISOString());
    } else {
      const defaultDate = new Date();
      setDirectFlight((prev) => ({
        ...prev,
        date: defaultDate,
        selectedFlight: null,
      }));
      dispatch(setSelectedDate('')); // Empty string instead of null
      localStorage.removeItem('selectedDate');
    }
  };

  // Add validation for multi-city segments
  const validateMultiCitySegments = useCallback((): boolean => {
    if (selectedType !== 'multi') return true;

    for (let i = 0; i < flightSegments.length; i++) {
      const segment = flightSegments[i];
      if (
        !segment.selectedFlight ||
        !segment.fromLocation ||
        !segment.toLocation
      ) {
        setErrorMessage(`Please complete flight segment ${i + 1}`);
        return false;
      }
    }

    return true;
  }, [flightSegments, selectedType, setErrorMessage]);

  const handleMultiLocationChange = (
    location: Location | null,
    field: 'fromLocation' | 'toLocation',
    index: number
  ) => {
    console.log('=== Multi Location Change ===');
    console.log('Index:', index);
    console.log('Field:', field);
    console.log('New location:', location);
    console.log('Current phase:', reduxCurrentPhase);

    const newSegments = [...flightSegments];

    // Update the current segment
    newSegments[index] = {
      ...newSegments[index],
      [field]: location,
      selectedFlight: null, // Clear selected flight when location changes
    };

    // Handle linking between segments
    if (field === 'toLocation' && location && index < newSegments.length - 1) {
      // Update next segment's fromLocation
      newSegments[index + 1] = {
        ...newSegments[index + 1],
        fromLocation: location,
        selectedFlight: null,
      };
    } else if (field === 'fromLocation' && location && index > 0) {
      // Update previous segment's toLocation
      newSegments[index - 1] = {
        ...newSegments[index - 1],
        toLocation: location,
        selectedFlight: null,
      };
    }

    // Update Redux store if this is the first segment
    if (index === 0) {
      if (field === 'fromLocation') {
        if (
          location &&
          location.value &&
          location.value !== 'null' &&
          location.label?.trim()
        ) {
          console.log('Dispatching from location:', location);
          const stringifiedLocation = JSON.stringify(location);
          dispatch(setFromLocation(stringifiedLocation));
          localStorage.setItem('fromLocation', stringifiedLocation);
        } else {
          console.log('Clearing from location');
          dispatch(setFromLocation(null));
          localStorage.removeItem('fromLocation');
          if (reduxCurrentPhase === 1) {
            dispatch(markStepIncomplete(1));
          }
        }
      }
    }

    // Update last segment's toLocation in Redux store
    if (index === newSegments.length - 1 && field === 'toLocation') {
      if (
        location &&
        location.value &&
        location.value !== 'null' &&
        location.label?.trim()
      ) {
        console.log('Dispatching to location:', location);
        const stringifiedLocation = JSON.stringify(location);
        dispatch(setToLocation(stringifiedLocation));
        localStorage.setItem('toLocation', stringifiedLocation);
      } else {
        console.log('Clearing to location');
        dispatch(setToLocation(null));
        localStorage.removeItem('toLocation');
        if (reduxCurrentPhase === 1) {
          dispatch(markStepIncomplete(1));
        }
      }
    }

    setFlightSegments(newSegments);
    localStorage.setItem('flightSegments', JSON.stringify(newSegments));

    // Clear any error messages
    setErrorMessages((prev) => ({
      ...prev,
      [field === 'fromLocation' ? 'from' : 'to']: undefined,
    }));

    // Trigger onSelect callback
    onSelect(null);

    console.log('=== End Multi Location Change ===');
  };

  const handleMultiDateChange = (date: Date | null, index: number) => {
    console.log('=== Multi Date Change ===');
    console.log('Index:', index);
    console.log('New date:', date);

    if (!date) {
      date = new Date();
    }

    // Set the time to noon to avoid timezone issues
    const normalizedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      12
    );

    const newSegments = [...flightSegments];
    newSegments[index] = {
      ...newSegments[index],
      date,
      selectedFlight: null, // Clear selected flight when date changes
    };
    setFlightSegments(newSegments);
    localStorage.setItem('flightSegments', JSON.stringify(newSegments));

    // Update Redux store if this is the first segment
    if (index === 0) {
      dispatch(setSelectedDate(format(normalizedDate, 'yyyy-MM-dd')));
      localStorage.setItem('selectedDate', normalizedDate.toISOString());
    }

    console.log('=== End Multi Date Change ===');
  };

  const handleLocationChange = (
    location: Location | null,
    type: 'from' | 'to',
    segmentIndex?: number
  ) => {
    if (selectedType === 'direct') {
      if (type === 'from') {
        setDirectFlight((prev) => ({ ...prev, fromLocation: location }));
        dispatch(setFromLocation(JSON.stringify(location)));
      } else {
        setDirectFlight((prev) => ({ ...prev, toLocation: location }));
        dispatch(setToLocation(JSON.stringify(location)));
      }
    } else if (segmentIndex !== undefined) {
      setFlightSegments((prev) => {
        const newSegments = [...prev];
        if (type === 'from') {
          newSegments[segmentIndex] = {
            ...newSegments[segmentIndex],
            fromLocation: location,
          };
        } else {
          newSegments[segmentIndex] = {
            ...newSegments[segmentIndex],
            toLocation: location,
          };
        }
        return newSegments;
      });
    }
  };

  useEffect(() => {
    // Update progress based on flight selection
    if (fromLocation && toLocation) {
      dispatch(completeStep(1));
    } else {
      dispatch(markStepIncomplete(1));
    }
  }, [fromLocation, toLocation, dispatch]);

  // Calculate duration for selected flight
  useEffect(() => {
    if (selectedFlight) {
      // Duration calculation logic
    }
  }, [selectedFlight]);

  // Update flight segments
  useEffect(() => {
    if (selectedFlight) {
      // Flight segment update logic
    }
  }, [selectedFlight]);

  const handleClearDates = () => {
    if (selectedType === 'direct') {
      setSelectedDate('');
      dispatch(setSelectedDate(''));
      localStorage.removeItem('selectedDate');
    } else {
      // Clear dates for all segments
      const newSegments = flightSegments.map((segment) => ({
        ...segment,
        date: new Date(),
        selectedFlight: null,
      }));
      setFlightSegments(newSegments);
      dispatch(setSelectedDate(''));
      localStorage.removeItem('selectedDate');
    }
  };

  // Update the effect to handle multi-city state restoration
  useEffect(() => {
    const savedFlightSegments = localStorage.getItem('flightSegments');
    const savedFlights = localStorage.getItem('selectedFlights');
    const savedType = localStorage.getItem('selectedType');

    if (savedType === 'multi') {
      setSelectedType('multi');
    }

    if (savedFlightSegments && savedFlights) {
      try {
        const parsedSegments = JSON.parse(savedFlightSegments);
        const parsedFlights = JSON.parse(savedFlights);

        // Validate and restore segments
        if (Array.isArray(parsedSegments) && parsedSegments.length > 0) {
          // Convert dates back to Date objects
          const restoredSegments = parsedSegments.map((segment) => ({
            ...segment,
            date: segment.date ? new Date(segment.date) : new Date(),
            fromLocation: segment.fromLocation,
            toLocation: segment.toLocation,
            selectedFlight: segment.selectedFlight,
          }));

          setFlightSegments(restoredSegments);

          // If we have multiple segments, switch to multi-city mode
          if (restoredSegments.length > 1) {
            setSelectedType('multi');
            localStorage.setItem('selectedType', 'multi');
          }
        }

        // Restore flights in Redux store
        if (Array.isArray(parsedFlights) && parsedFlights.length > 0) {
          dispatch(setSelectedFlights(parsedFlights));
        }
      } catch (error) {
        console.error('Error restoring multi-city state:', error);
      }
    }
  }, [dispatch]);

  // Add validation effect for multi-city segments
  useEffect(() => {
    if (selectedType === 'multi' && flightSegments.length > 0) {
      // Save segments to localStorage
      localStorage.setItem('flightSegments', JSON.stringify(flightSegments));

      // Update Redux store with first and last locations
      const firstSegment = flightSegments[0];
      const lastSegment = flightSegments[flightSegments.length - 1];

      if (firstSegment?.fromLocation) {
        dispatch(setFromLocation(JSON.stringify(firstSegment.fromLocation)));
      }
      if (lastSegment?.toLocation) {
        dispatch(setToLocation(JSON.stringify(lastSegment.toLocation)));
      }
    }
  }, [selectedType, flightSegments, dispatch]);

  if (isInitializing && reduxCurrentPhase === 3) {
    // Only show loading in phase 3
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-[#F54538] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Loading flight details...</p>
      </div>
    );
  }

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
                {index > 1 && (
                  <div className="absolute -right-6 sm:-right-10 top-1/2 -translate-y-1/2">
                    <button
                      onClick={(e) => handleMultiFlightDelete(index, e)}
                      className="p-1 text-gray-500 hover:text-red-500"
                    >
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                )}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <AutocompleteInput
                        label="From"
                        value={segment.fromLocation}
                        onChange={(location) =>
                          handleMultiLocationChange(
                            location,
                            'fromLocation',
                            index
                          )
                        }
                        onSearch={searchAirports}
                        leftIcon="plane-departure"
                        error={errorMessages.from}
                        showError={isSearchModalOpen}
                      />
                      {errorMessages.from && (
                        <p className="text-red-500 text-sm mt-1">
                          {errorMessages.from}
                        </p>
                      )}
                    </div>

                    <div className="relative">
                      <AutocompleteInput
                        label="To"
                        value={segment.toLocation}
                        onChange={(location) =>
                          handleMultiLocationChange(
                            location,
                            'toLocation',
                            index
                          )
                        }
                        onSearch={searchAirports}
                        rightIcon="plane-arrival"
                        error={errorMessages.to}
                        showError={isSearchModalOpen}
                      />
                      {errorMessages.to && (
                        <p className="text-red-500 text-sm mt-1">
                          {errorMessages.to}
                        </p>
                      )}
                    </div>
                  </div>

                  {showFlightSearch && currentPhase !== 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="relative date-picker-input w-full">
                        <DatePicker
                          selected={segment.date}
                          onChange={(date) =>
                            handleMultiDateChange(date, index)
                          }
                          customInput={
                            <CustomDateInput
                              value={formatSafeDate(segment.date)}
                              onClear={() => {
                                handleMultiDateChange(new Date(), index);
                                setErrorMessage(null);
                              }}
                            />
                          }
                          dateFormat="dd.MM.yyyy"
                          maxDate={new Date()}
                          showMonthDropdown
                          showYearDropdown
                          dropdownMode="select"
                          isClearable={false}
                          placeholderText="DD.MM.YYYY"
                          shouldCloseOnSelect={true}
                          popperProps={{
                            strategy: 'fixed',
                            placement: 'top-start',
                          }}
                          className="react-datepicker-popper"
                          calendarClassName="custom-calendar"
                          renderCustomHeader={({
                            date,
                            changeYear,
                            changeMonth,
                            decreaseMonth,
                            increaseMonth,
                            prevMonthButtonDisabled,
                            nextMonthButtonDisabled,
                          }) => (
                            <div className="flex items-center justify-between px-2 py-2">
                              <button
                                onClick={decreaseMonth}
                                disabled={prevMonthButtonDisabled}
                                type="button"
                                className="p-1 hover:bg-gray-100 rounded-full disabled:opacity-50"
                              >
                                <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                              </button>
                              <div className="flex items-center gap-2">
                                <select
                                  value={getMonth(date)}
                                  onChange={({ target: { value } }) =>
                                    changeMonth(parseInt(value))
                                  }
                                  className="text-sm bg-transparent hover:bg-gray-100 rounded px-4 py-1 appearance-none cursor-pointer min-w-[120px] text-center"
                                >
                                  {months.map((option, i) => (
                                    <option key={option} value={i}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={getYear(date)}
                                  onChange={({ target: { value } }) =>
                                    changeYear(parseInt(value))
                                  }
                                  className="text-sm bg-transparent hover:bg-gray-100 rounded px-4 py-1 appearance-none cursor-pointer min-w-[100px] text-center"
                                >
                                  {years.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <button
                                onClick={increaseMonth}
                                disabled={nextMonthButtonDisabled}
                                type="button"
                                className="p-1 hover:bg-gray-100 rounded-full disabled:opacity-50"
                              >
                                <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                              </button>
                            </div>
                          )}
                        />
                      </div>

                      <button
                        onClick={() => {
                          setCurrentSegmentIndex(index);
                          setIsSearchModalOpen(true);
                          handleSearchFlights(index);
                        }}
                        className="h-14 w-full text-white bg-[#F54538] rounded-xl hover:bg-[#F54538]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F54538] disabled:opacity-50 font-sans font-medium text-base"
                      >
                        Search Flights
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {flightSegments.length < 4 && (
              <div className="flex flex-col gap-4">
                <button
                  onClick={addFlightSegment}
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

                {showFlightSearch && currentPhase !== 1 && (
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
          // Direct flight view
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <AutocompleteInput
                  label="From"
                  value={directFlight.fromLocation}
                  onChange={handleDirectFromLocationChange}
                  onSearch={searchAirports}
                  leftIcon="plane-departure"
                  error={errorMessages.from}
                  showError={isSearchModalOpen}
                />
              </div>

              <div className="relative">
                <AutocompleteInput
                  label="To"
                  value={directFlight.toLocation}
                  onChange={handleDirectToLocationChange}
                  onSearch={searchAirports}
                  rightIcon="plane-arrival"
                  error={errorMessages.to}
                  showError={isSearchModalOpen}
                />
              </div>
            </div>

            {showResults && showFlightSearch && currentPhase !== 1 && (
              <>
                <div
                  className="relative date-picker-input"
                  style={{ marginBottom: '40px' }}
                >
                  <DatePicker
                    selected={date}
                    onChange={handleDateChange}
                    customInput={
                      <CustomDateInput
                        value={formatSafeDate(date)}
                        onClear={handleDateClear}
                      />
                    }
                    dateFormat="dd.MM.yyyy"
                    maxDate={new Date()}
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    isClearable={false}
                    placeholderText="DD.MM.YYYY"
                    shouldCloseOnSelect={true}
                    popperProps={{
                      strategy: 'fixed',
                      placement: 'top-start',
                    }}
                    className="react-datepicker-popper"
                    calendarClassName="custom-calendar"
                    renderCustomHeader={({
                      date,
                      changeYear,
                      changeMonth,
                      decreaseMonth,
                      increaseMonth,
                      prevMonthButtonDisabled,
                      nextMonthButtonDisabled,
                    }) => (
                      <div className="flex items-center justify-between px-2 py-2">
                        <button
                          onClick={decreaseMonth}
                          disabled={prevMonthButtonDisabled}
                          type="button"
                          className="p-1 hover:bg-gray-100 rounded-full disabled:opacity-50"
                        >
                          <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="flex items-center gap-2">
                          <select
                            value={getMonth(date)}
                            onChange={({ target: { value } }) =>
                              changeMonth(parseInt(value))
                            }
                            className="text-sm bg-transparent hover:bg-gray-100 rounded px-4 py-1 appearance-none cursor-pointer min-w-[120px] text-center"
                          >
                            {months.map((option, i) => (
                              <option key={option} value={i}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <select
                            value={getYear(date)}
                            onChange={({ target: { value } }) =>
                              changeYear(parseInt(value))
                            }
                            className="text-sm bg-transparent hover:bg-gray-100 rounded px-4 py-1 appearance-none cursor-pointer min-w-[100px] text-center"
                          >
                            {years.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={increaseMonth}
                          disabled={nextMonthButtonDisabled}
                          type="button"
                          className="p-1 hover:bg-gray-100 rounded-full disabled:opacity-50"
                        >
                          <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <button
                    onClick={() => {
                      setIsSearchModalOpen(showResults ?? true);
                      handleSearchFlights();
                    }}
                    className="w-full h-12 px-4 py-2 text-white bg-[#F54538] rounded-xl hover:bg-[#F54538]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F54538] disabled:opacity-50 font-sans font-medium text-base"
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
          currentPhase !== 1 && (
            <div className="pt-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Your flight details
                </h3>
                {selectedType === 'direct'
                  ? directFlight.selectedFlight && (
                      <div className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-[#F54538] hover:shadow-lg transition-all">
                        {/* Mobile View */}
                        <div className="flex flex-col sm:hidden">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                                <PiAirplaneTakeoff className="w-4 h-4 text-[#F54538]" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {directFlight.selectedFlight.airline}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {directFlight.selectedFlight.flightNumber}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFlightEdit(0);
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={handleDirectFlightDelete}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                            <div>
                              <p className="text-sm font-medium">
                                {directFlight.selectedFlight.departureCity}
                              </p>
                              <p className="text-xs text-gray-500">
                                {directFlight.selectedFlight.departureTime}
                              </p>
                            </div>
                            <div className="flex-1 flex justify-center">
                              <div className="w-12 h-[1px] bg-gray-200 mt-1"></div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {directFlight.selectedFlight.arrivalCity}
                              </p>
                              <p className="text-xs text-gray-500">
                                {directFlight.selectedFlight.arrivalTime}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Desktop View - Keep existing desktop view */}
                        <div className="hidden sm:block">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                                <PiAirplaneTakeoff className="w-5 h-5 text-[#F54538]" />
                              </div>
                              <div>
                                <p className="font-medium">
                                  {directFlight.selectedFlight.flightNumber}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {directFlight.selectedFlight.departure} →{' '}
                                  {directFlight.selectedFlight.arrival}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <p className="font-medium">
                                  {formatSafeDate(
                                    directFlight.selectedFlight.date
                                  )}
                                </p>
                                <span className="text-gray-500">•</span>
                                <p className="font-medium">
                                  {directFlight.selectedFlight.departureTime}
                                </p>
                                <span className="text-gray-500">→</span>
                                <p className="font-medium">
                                  {directFlight.selectedFlight.arrivalTime}
                                </p>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                {directFlight.selectedFlight.duration}
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-end mt-2">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFlightEdit(0);
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={handleDirectFlightDelete}
                                className="p-2 text-gray-400 hover:text-gray-600"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  : flightSegments.map(
                      (segment, index) =>
                        segment.selectedFlight && (
                          <div
                            key={index}
                            className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-[#F54538] hover:shadow-lg transition-all"
                          >
                            {/* Mobile View */}
                            <div className="flex flex-col sm:hidden">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center relative">
                                    <PiAirplaneTakeoff className="w-4 h-4 text-[#F54538]" />
                                    <span className="absolute -top-2 -right-2 bg-[#F54538] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                      {index + 1}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">
                                      {segment.selectedFlight.airline}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {segment.selectedFlight.flightNumber}
                                    </p>
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
                                    onClick={(e) =>
                                      handleMultiFlightDelete(index, e)
                                    }
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                                <div>
                                  <p className="text-sm font-medium">
                                    {segment.selectedFlight.departureCity}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {segment.selectedFlight.departureTime}
                                  </p>
                                </div>
                                <div className="flex-1 flex justify-center">
                                  <div className="w-12 h-[1px] bg-gray-200 mt-1"></div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium">
                                    {segment.selectedFlight.arrivalCity}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {segment.selectedFlight.arrivalTime}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Desktop View - Keep existing desktop view */}
                            <div className="hidden sm:block">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center relative">
                                    <PiAirplaneTakeoff className="w-5 h-5 text-[#F54538]" />
                                    <span className="absolute -top-2 -right-2 bg-[#F54538] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                      {index + 1}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <p className="font-medium">
                                        Flight {index + 1}
                                      </p>
                                      <span className="text-gray-400">•</span>
                                      <p className="text-gray-600">
                                        {segment.selectedFlight.flightNumber}
                                      </p>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                      {segment.selectedFlight.departure} →{' '}
                                      {segment.selectedFlight.arrival}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center justify-end space-x-2">
                                    <p className="font-medium">
                                      {formatSafeDate(
                                        segment.selectedFlight.date
                                      )}
                                    </p>
                                    <span className="text-gray-500">•</span>
                                    <p className="font-medium">
                                      {segment.selectedFlight.departureTime}
                                    </p>
                                    <span className="text-gray-500">→</span>
                                    <p className="font-medium">
                                      {segment.selectedFlight.arrivalTime}
                                    </p>
                                  </div>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {segment.selectedFlight.duration}
                                  </p>
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
                                    onClick={(e) =>
                                      handleMultiFlightDelete(index, e)
                                    }
                                    className="p-2 text-gray-400 hover:text-gray-600"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                    )}
              </div>
            </div>
          )}

        {showResults && showFlightSearch && currentPhase !== 1 && (
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
                          {filteredFlights.length === 1 ? 'flight' : 'flights'}{' '}
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
                                  onClick={() => handleFlightSelect(flight)}
                                  className={`cursor-pointer hover:bg-gray-100 ${
                                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
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
                            onClick={() => handleFlightSelect(flight)}
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
