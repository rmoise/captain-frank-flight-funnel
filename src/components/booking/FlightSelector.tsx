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
import { Flight as FlightData } from '@/types/flight';

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
        const [year, month, day] = date.split('-').map(Number);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          return `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year}`;
        }
      }
    }

    // If it's a Date object or needs to be converted to one
    const dateObj = date instanceof Date ? date : new Date(date);
    if (!isNaN(dateObj.getTime())) {
      const day = dateObj.getUTCDate().toString().padStart(2, '0');
      const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getUTCFullYear();
      return `${day}.${month}.${year}`;
    }

    return '';
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
  // Get store state and actions first
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
    batchUpdateWizardState,
    // Add new store state and actions
    isSearchModalOpen,
    searchTerm,
    displayedFlights,
    allFlights,
    loading,
    errorMessage,
    errorMessages,
    setSearchModalOpen,
    setSearchTerm,
    setDisplayedFlights,
    setAllFlights,
    setFlightSearchLoading,
    setFlightErrorMessage,
    setFlightErrorMessages,
    clearFlightErrors,
  } = useStore();

  // Component state
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<'list' | 'card'>('card');
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
    [selectedType, currentSegmentIndex, onInteract, setSelectedFlights]
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

  // Debug logging effect - all dependencies included as this is just for logging
  useEffect(() => {}, [flightSegments, selectedType, fromLocation, toLocation]);

  // Update initialization effect
  useEffect(() => {
    if (isInitializing) return;

    try {
      // Handle direct flight date initialization
      if (selectedType === 'direct') {
        console.log('Initializing direct flight dates:', {
          selectedDate,
          directFlightDate: directFlight.date,
        });

        // Only update if we have a selectedDate but no directFlight.date
        if (selectedDate && !directFlight.date) {
          console.log('Found selectedDate:', selectedDate);
          const parsedDate = parseISO(selectedDate);
          if (isValid(parsedDate)) {
            console.log('Parsed selectedDate is valid');
            // Set the time to noon to avoid timezone issues
            const normalizedDate = new Date(
              parsedDate.getFullYear(),
              parsedDate.getMonth(),
              parsedDate.getDate(),
              12
            );

            console.log('Setting directFlight date to:', normalizedDate);
            // Update directFlight with the normalized date
            setDirectFlight({
              ...directFlight,
              date: normalizedDate,
            });
          }
        }
        // If we have a directFlight.date but no selectedDate
        else if (directFlight.date && !selectedDate) {
          console.log('Found directFlight.date:', directFlight.date);
          const formattedDate = format(
            directFlight.date instanceof Date
              ? directFlight.date
              : new Date(directFlight.date),
            'yyyy-MM-dd'
          );
          console.log('Setting selectedDate to:', formattedDate);
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
      return (
        <CustomDateInput
          value={value}
          ref={ref}
          onClear={onClear}
          onClick={onClick}
          label="Departure Date"
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
              `Departure city (${currentDepartureCity}) must match previous flight's arrival city (${prevArrivalCity})`
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

      try {
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
              return {
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
                scheduledArrivalTime: formatTime(flight.arr_time_sched),
                actualDeparture: flight.dep_time_fact
                  ? formatTime(flight.dep_time_fact)
                  : null,
                actualArrival: flight.arr_time_fact
                  ? formatTime(flight.arr_time_fact)
                  : null,
                arrivalDelay: flight.arr_delay_min || null,
              };
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
            const previousArrivalTime = new Date(
              `${previousSegment.selectedFlight.date}T${previousSegment.selectedFlight.arrivalTime}:00.000Z`
            );

            // Filter flights that depart at least 30 minutes after previous flight arrives
            validFlights = validFlights.filter((flight: Flight) => {
              const departureTime = new Date(
                `${flight.date}T${flight.departureTime}:00.000Z`
              );
              const timeDiff =
                (departureTime.getTime() - previousArrivalTime.getTime()) /
                60000; // in minutes
              return timeDiff >= 30;
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
              ? 'No valid connecting flights found. Please try a different date or route.'
              : 'No flights found for the selected route and date.'
          );
        }
      } catch (error) {
        console.error('Search flights error:', error);
        setFlightErrorMessage('Failed to search flights. Please try again.');
        setFlightSearchLoading(false);
      }
    } catch (error) {
      console.error('Error handling search flights:', error);
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

  // Add new helper function for connection time validation
  const getConnectionTimeInfo = (
    prevFlight: Flight,
    nextFlight: Flight
  ): { isValid: boolean; message: string; timeDiff: number } => {
    try {
      const prevArrivalTime = new Date(
        `${prevFlight.date}T${prevFlight.arrivalTime}:00.000Z`
      );
      const nextDepartureTime = new Date(
        `${nextFlight.date}T${nextFlight.departureTime}:00.000Z`
      );

      const timeDiff =
        (nextDepartureTime.getTime() - prevArrivalTime.getTime()) / (1000 * 60); // in minutes

      if (timeDiff < 0) {
        return {
          isValid: false,
          message: 'Next flight cannot depart before previous flight arrives',
          timeDiff,
        };
      }

      if (timeDiff < 30) {
        return {
          isValid: false,
          message: 'Umsteigezeit muss mindestens 30 Minuten betragen',
          timeDiff,
        };
      }

      if (timeDiff > 48 * 60) {
        return {
          isValid: false,
          message: 'Umsteigezeit darf 48 Stunden nicht überschreiten',
          timeDiff,
        };
      }

      return {
        isValid: true,
        message: `Umsteigezeit: ${Math.floor(timeDiff / 60)}h ${Math.floor(timeDiff % 60)}m`,
        timeDiff,
      };
    } catch (error) {
      return {
        isValid: false,
        message: 'Invalid flight times',
        timeDiff: 0,
      };
    }
  };

  // Add this helper function at the top level of the component
  const getUniqueFlightKey = (flight: Flight): string => {
    return `${flight.flightNumber}-${flight.date}-${flight.departureTime}-${flight.arrivalTime}`;
  };

  // Update handleFlightSelect to prevent duplicate selections
  const handleFlightSelect = (data: {
    flight: FlightData;
    segmentIndex: number;
    selectedType: 'direct' | 'multi';
  }) => {
    const { flight, segmentIndex } = data;

    // Format flight for store with required fields
    const storeFormatFlight: Flight = {
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
      scheduledDepartureTime:
        flight.scheduledDepartureTime || flight.departureTime,
      scheduledArrivalTime: flight.scheduledArrivalTime || flight.arrivalTime,
      actualDeparture: flight.actualDeparture || null,
      actualArrival: flight.actualArrival || null,
      arrivalDelay: flight.arrivalDelay || null,
    };

    if (selectedType === 'direct') {
      // For direct flights, batch update state
      batchUpdateWizardState({
        selectedFlight: storeFormatFlight,
        selectedFlights: [storeFormatFlight],
        directFlight: {
          ...directFlight,
          fromLocation: {
            value: storeFormatFlight.departureCity,
            label: storeFormatFlight.departureCity,
            description: storeFormatFlight.departureAirport,
            dropdownLabel: `${storeFormatFlight.departureAirport} (${storeFormatFlight.departureCity})`,
          },
          toLocation: {
            value: storeFormatFlight.arrivalCity,
            label: storeFormatFlight.arrivalCity,
            description: storeFormatFlight.arrivalAirport,
            dropdownLabel: `${storeFormatFlight.arrivalAirport} (${storeFormatFlight.arrivalCity})`,
          },
          selectedFlight: storeFormatFlight,
        },
      });

      // Update store locations
      setFromLocation(
        JSON.stringify({
          value: storeFormatFlight.departureCity,
          label: storeFormatFlight.departureCity,
          description: storeFormatFlight.departureAirport,
          dropdownLabel: `${storeFormatFlight.departureAirport} (${storeFormatFlight.departureCity})`,
        })
      );
      setToLocation(
        JSON.stringify({
          value: storeFormatFlight.arrivalCity,
          label: storeFormatFlight.arrivalCity,
          description: storeFormatFlight.arrivalAirport,
          dropdownLabel: `${storeFormatFlight.arrivalAirport} (${storeFormatFlight.arrivalCity})`,
        })
      );
    } else {
      // For multi-segment flights
      // Check if this flight is already selected in another segment
      const flightKey = getUniqueFlightKey(storeFormatFlight);
      const isDuplicate = flightSegments.some((segment, idx) => {
        if (idx === segmentIndex) return false; // Skip current segment
        if (!segment.selectedFlight) return false;
        return getUniqueFlightKey(segment.selectedFlight) === flightKey;
      });

      if (isDuplicate) {
        setFlightErrorMessage(
          'This flight is already selected in another segment'
        );
        return;
      }

      // Validate flight times if this is not the first segment
      if (segmentIndex > 0) {
        const previousFlight = flightSegments[segmentIndex - 1].selectedFlight;
        if (previousFlight) {
          const connectionInfo = getConnectionTimeInfo(
            previousFlight,
            storeFormatFlight
          );
          if (!connectionInfo.isValid) {
            setFlightErrorMessage(connectionInfo.message);
            return;
          }
          storeFormatFlight.connectionInfo = connectionInfo.message;
        }
      }

      // Create new segments array with the updated segment
      const newSegments = [...flightSegments];
      newSegments[segmentIndex] = {
        ...newSegments[segmentIndex],
        selectedFlight: storeFormatFlight,
      };

      // Clear any subsequent segments' flights if they exist
      for (let i = segmentIndex + 1; i < newSegments.length; i++) {
        newSegments[i] = {
          ...newSegments[i],
          selectedFlight: null,
        };
      }

      // Get all selected flights from segments, filtering out nulls
      const updatedSelectedFlights = newSegments
        .map((segment) => segment.selectedFlight)
        .filter((flight): flight is Flight => flight !== null);

      // Validate city connections
      for (let i = 0; i < updatedSelectedFlights.length - 1; i++) {
        const currentFlight = updatedSelectedFlights[i];
        const nextFlight = updatedSelectedFlights[i + 1];

        if (currentFlight.arrivalCity !== nextFlight.departureCity) {
          setFlightErrorMessage(
            `Flight segments must connect: ${currentFlight.arrivalCity} ≠ ${nextFlight.departureCity}`
          );
          return;
        }
      }

      // Update store state in a single batch
      batchUpdateWizardState({
        flightSegments: newSegments,
        selectedFlight: storeFormatFlight,
        selectedFlights: updatedSelectedFlights,
        currentSegmentIndex:
          segmentIndex < newSegments.length - 1
            ? segmentIndex + 1
            : segmentIndex,
      });
    }

    // Close the search modal
    setSearchModalOpen(false);

    // Update validation state if needed
    if (setValidationState) {
      setValidationState((prev: Record<number, boolean>) => ({
        ...prev,
        [stepNumber || 1]: true,
      }));
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
            description: 'Bitte geben Sie mindestens 3 Zeichen ein',
            dropdownLabel: 'Bitte geben Sie mindestens 3 Zeichen ein',
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
    // Set the current segment index first
    setCurrentSegmentIndex(index);

    // Open search modal first
    setSearchModalOpen(true);

    // Get the current segment
    const segment =
      selectedType === 'direct' ? directFlight : flightSegments[index];

    // Wait for modal to open
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Trigger search with the segment's locations
    if (segment.fromLocation && segment.toLocation) {
      await handleSearchFlights(index);
    }
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
  const handleFlightTypeChange = useCallback(
    (newType: 'direct' | 'multi') => {
      if (newType === selectedType) return;

      console.log('=== handleFlightTypeChange START ===');
      console.log('Current state:', {
        newType,
        selectedType,
        directFlight: JSON.parse(JSON.stringify(directFlight)),
        flightSegments: JSON.parse(JSON.stringify(flightSegments)),
      });

      // Helper function to safely parse dates
      const safeParseDateToUTC = (date: Date | string | null): Date | null => {
        if (!date) return null;
        try {
          const parsed = typeof date === 'string' ? parseISO(date) : date;
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
        } catch (error) {
          console.error('Error parsing date:', error);
          return null;
        }
      };

      if (newType === 'direct') {
        // When switching to direct, use the first segment's data
        const firstSegment = flightSegments[0];
        if (firstSegment) {
          const parsedDate = safeParseDateToUTC(firstSegment.date);
          const formattedDate = parsedDate
            ? format(parsedDate, 'yyyy-MM-dd')
            : null;

          // Create updates object
          const updates = {
            selectedType: newType,
            directFlight: {
              fromLocation: firstSegment.fromLocation,
              toLocation: firstSegment.toLocation,
              date: parsedDate,
              selectedFlight: firstSegment.selectedFlight,
            },
            selectedFlight: firstSegment.selectedFlight,
            selectedFlights: firstSegment.selectedFlight
              ? [firstSegment.selectedFlight]
              : [],
            currentSegmentIndex: 0,
            flightSegments: [firstSegment], // Only keep first segment in direct mode
          };

          // Update state in a single batch
          batchUpdateWizardState(updates);

          // Update store state
          if (firstSegment.fromLocation) {
            setFromLocation(JSON.stringify(firstSegment.fromLocation));
          }
          if (firstSegment.toLocation) {
            setToLocation(JSON.stringify(firstSegment.toLocation));
          }
          if (formattedDate) {
            setSelectedDate(formattedDate);
          }
        }
      } else {
        // When switching to multi-city, create completely fresh segments
        const newSegments = [
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
        ];

        const updates = {
          selectedType: newType,
          flightSegments: newSegments,
          selectedFlight: null,
          selectedFlights: [],
          currentSegmentIndex: 0,
          directFlight: {
            fromLocation: null,
            toLocation: null,
            date: null,
            selectedFlight: null,
          },
        };

        // Update state in a single batch
        batchUpdateWizardState(updates);

        // Clear store state
        setFromLocation(null);
        setToLocation(null);
        setSelectedDate(null);
      }

      console.log('=== handleFlightTypeChange END ===');
    },
    [
      selectedType,
      directFlight,
      flightSegments,
      setFromLocation,
      setToLocation,
      setSelectedDate,
      batchUpdateWizardState,
    ]
  );

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
    if (setValidationState && stepNumber) {
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
      setFromLocation(stringifiedLocation);
    } else {
      setFromLocation(null);
    }

    // Clear any selected flights
    setSelectedFlights([]);

    // Clear any error messages
    setFlightErrorMessages({
      ...errorMessages,
      from: '',
    });

    // Update validation state if both locations are filled
    if (setValidationState && location && directFlight.toLocation) {
      setValidationState((prev: Record<number, boolean>) => ({
        ...prev,
        [stepNumber || 1]: true,
      }));
    } else if (setValidationState) {
      setValidationState((prev: Record<number, boolean>) => ({
        ...prev,
        [stepNumber || 1]: false,
      }));
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
      setToLocation(stringifiedLocation);
    } else {
      setToLocation(null);
    }

    // Clear any selected flights
    setSelectedFlights([]);

    // Clear any error messages
    setFlightErrorMessages({
      ...errorMessages,
      to: '',
    });

    // Update validation state if both locations are filled
    if (setValidationState && location && directFlight.fromLocation) {
      setValidationState((prev: Record<number, boolean>) => ({
        ...prev,
        [stepNumber || 1]: true,
      }));
    } else if (setValidationState) {
      setValidationState((prev: Record<number, boolean>) => ({
        ...prev,
        [stepNumber || 1]: false,
      }));
    }

    // Notify parent component
    onSelect(null);
    onInteract();
  };

  // Update the date handling
  const handleDirectDateChange = (newDate: Date | null) => {
    try {
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

      // Clear any error messages
      setFlightErrorMessage(null);
    } catch (error) {
      console.error('Error handling date change:', error);
      setFlightErrorMessage('Invalid date selection');
    }
  };

  const handleMultiLocationChange = (
    location: LocationData | null,
    field: 'fromLocation' | 'toLocation',
    index: number
  ) => {
    try {
      const newSegments = [...flightSegments];

      // Clear selected flights for affected segments
      if (field === 'fromLocation') {
        // When changing fromLocation, clear current segment's flight
        newSegments[index] = {
          ...newSegments[index],
          fromLocation: location,
          selectedFlight: null,
        };
      } else if (field === 'toLocation') {
        // When changing toLocation:
        // 1. Clear current segment's flight
        newSegments[index] = {
          ...newSegments[index],
          toLocation: location,
          selectedFlight: null,
        };

        // 2. Update next segment's fromLocation and clear its flight if it exists
        if (index < newSegments.length - 1) {
          newSegments[index + 1] = {
            ...newSegments[index + 1],
            fromLocation: location,
            selectedFlight: null,
          };
        }
      }

      // Update store state in a single batch to trigger validation
      batchUpdateWizardState({
        flightSegments: newSegments,
        selectedFlights: newSegments
          .map((segment) => segment.selectedFlight)
          .filter((flight): flight is Flight => flight !== null),
        selectedFlight: null,
        currentSegmentIndex: index,
      });

      // Update store locations if this is the first segment
      if (index === 0) {
        if (field === 'fromLocation') {
          setFromLocation(location ? JSON.stringify(location) : null);
        } else {
          setToLocation(location ? JSON.stringify(location) : null);
        }
      }

      // Clear error message
      setFlightErrorMessage(null);

      // Update validation state based on current phase
      if (setValidationState && stepNumber) {
        if (currentPhase === 3) {
          // For phase 3, validate that all segments have flights and are properly connected
          const allSegmentsValid = newSegments.every((segment, segIndex) => {
            // Check if segment has a selected flight
            const hasSelectedFlight = !!segment.selectedFlight;

            // For segments after first, check if cities connect properly
            if (segIndex > 0) {
              const prevSegment = newSegments[segIndex - 1];
              if (!prevSegment.selectedFlight || !segment.selectedFlight)
                return false;

              const prevCity = prevSegment.selectedFlight.arrivalCity;
              const currentCity = segment.selectedFlight.departureCity;

              if (
                !prevCity ||
                !currentCity ||
                prevCity.toLowerCase() !== currentCity.toLowerCase()
              ) {
                return false;
              }

              // Validate flight times
              return validateFlightTimes(
                prevSegment.selectedFlight,
                segment.selectedFlight
              );
            }

            return hasSelectedFlight;
          });

          setValidationState((prev: Record<number, boolean>) => ({
            ...prev,
            [stepNumber]: allSegmentsValid,
          }));
        } else {
          // For phase 1, validate all segments have locations and are properly connected
          const allSegmentsValid = newSegments.every((segment, segIndex) => {
            // Check if segment has both locations
            const hasLocations = segment.fromLocation && segment.toLocation;

            // For segments after first, check if cities connect properly
            if (segIndex > 0) {
              const prevSegment = newSegments[segIndex - 1];
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

              if (
                !prevCity ||
                !currentCity ||
                prevCity.toLowerCase() !== currentCity.toLowerCase()
              ) {
                return false;
              }
            }

            return hasLocations;
          });

          setValidationState((prev: Record<number, boolean>) => ({
            ...prev,
            [stepNumber]: allSegmentsValid,
          }));
        }

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
      };

      setFlightSegments(newSegments);

      // Update store's selectedDate with the first segment's date
      if (index === 0) {
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
  }, [selectedType, flightSegments, setFlightSegments]);

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
                const newSegments = [...flightSegments];
                newSegments[index] = {
                  ...newSegments[index],
                  selectedFlight: null,
                };
                setFlightSegments(newSegments);
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
        {flight.connectionInfo && index > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-sm text-gray-500">{flight.connectionInfo}</p>
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
                const newSegments = [...flightSegments];
                newSegments[index] = {
                  ...newSegments[index],
                  selectedFlight: null,
                };
                setFlightSegments(newSegments);
              }}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        {flight.connectionInfo && index > 0 && (
          <div className="mb-4 pb-2 border-b border-gray-100">
            <p className="text-sm text-gray-500 flex items-center">
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
              {flight.connectionInfo}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <FlightTypeSelector
        types={[
          { id: 'direct', label: 'Direktflug' },
          { id: 'multi', label: 'Multi-Stopp' },
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
                  <div className="relative flex items-start">
                    <div className="flex-1">
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
                            label="Von"
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
                            label="Nach"
                            leftIcon="arrival"
                            error={errorMessages.to}
                            disabled={disabled}
                          />
                        </div>
                      </div>
                    </div>
                    {/* Show delete button for segments after the first two on both mobile and desktop */}
                    {index > 1 && (
                      <>
                        {/* Mobile delete button */}
                        <div className="md:hidden absolute -right-6 top-1/2 -translate-y-1/2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();

                              // Remove the segment if it's beyond the minimum required
                              const newSegments = flightSegments.filter(
                                (_, i) => i !== index
                              );

                              // Ensure we maintain connections between segments
                              if (
                                index > 0 &&
                                index < flightSegments.length - 1
                              ) {
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
                                .filter(
                                  (flight): flight is Flight => flight !== null
                                );
                              setSelectedFlights(remainingFlights);

                              // Reset current segment index if needed
                              if (currentSegmentIndex >= newSegments.length) {
                                setCurrentSegmentIndex(
                                  Math.max(0, newSegments.length - 1)
                                );
                              }
                            }}
                            className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
                          >
                            <TrashIcon className="h-3.5 w-3.5 text-gray-500" />
                          </button>
                        </div>
                        {/* Desktop delete button */}
                        <div className="hidden md:block absolute -right-12 top-1/2 -translate-y-1/2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();

                              // Remove the segment if it's beyond the minimum required
                              const newSegments = flightSegments.filter(
                                (_, i) => i !== index
                              );

                              // Ensure we maintain connections between segments
                              if (
                                index > 0 &&
                                index < flightSegments.length - 1
                              ) {
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
                                .filter(
                                  (flight): flight is Flight => flight !== null
                                );
                              setSelectedFlights(remainingFlights);

                              // Reset current segment index if needed
                              if (currentSegmentIndex >= newSegments.length) {
                                setCurrentSegmentIndex(
                                  Math.max(0, newSegments.length - 1)
                                );
                              }
                            }}
                            className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
                          >
                            <TrashIcon className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
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
                        Flüge suchen
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
                    Einen weiteren Flug hinzufügen
                  </span>
                </button>

                {showFlightSearch &&
                  (currentPhase === 3 || currentPhase === 4) && (
                    <button
                      onClick={() => {}}
                      className="hidden w-full h-12 bg-red-50 text-[#F54538] rounded-lg font-medium hover:bg-red-100 transition-colors text-sm"
                    >
                      Flug nicht gefunden?
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
                  label="Von"
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
                  label="Nach"
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
                        directFlight.date ? new Date(directFlight.date) : null
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
                      openToDate={directFlight.date || new Date()}
                      disabledKeyboardNavigation
                      preventOpenOnFocus
                      onCalendarClose={() => {
                        // Ensure we're not in a loop when the calendar closes
                        if (directFlight.date) {
                          const formattedDate = format(
                            directFlight.date,
                            'yyyy-MM-dd'
                          );
                          if (formattedDate !== selectedDate) {
                            setSelectedDate(formattedDate);
                          }
                        }
                      }}
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
                      Flüge suchen
                    </button>
                    <button
                      onClick={() => {}}
                      className="hidden w-full h-12 bg-red-50 text-[#F54538] rounded-lg font-medium hover:bg-red-100 transition-colors text-sm"
                    >
                      Flug nicht gefunden?
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
                  Ihre Flugdaten
                </h3>
                {selectedType === 'direct' ? (
                  directFlight.selectedFlight &&
                  renderFlightPreviewCard(directFlight.selectedFlight, 0)
                ) : (
                  <div className="space-y-4">
                    {/* Use a Set to track rendered flights */}
                    {(() => {
                      const renderedFlightKeys = new Set<string>();
                      return flightSegments
                        .map((segment, index) => {
                          if (!segment?.selectedFlight) return null;

                          const flightKey = getUniqueFlightKey(
                            segment.selectedFlight
                          );
                          if (renderedFlightKeys.has(flightKey)) return null;

                          renderedFlightKeys.add(flightKey);
                          return (
                            <div key={`flight-${flightKey}`}>
                              {renderFlightPreviewCard(
                                segment.selectedFlight,
                                index
                              )}
                            </div>
                          );
                        })
                        .filter(Boolean);
                    })()}
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
                            placeholder="Nach Flugnummer suchen"
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
                          onClick={() => setSearchModalOpen(false)}
                          className="hidden px-8 h-12 bg-red-50 text-[#F54538] rounded-lg font-medium hover:bg-red-100 transition-colors text-sm"
                        >
                          Flug nicht gefunden?
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
                          onClick={() => setSearchModalOpen(false)}
                          className="hidden px-8 h-12 bg-red-50 text-[#F54538] rounded-lg font-medium hover:bg-red-100 transition-colors text-sm"
                        >
                          Flug nicht gefunden?
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
                            {filteredFlights.length === 1 ? 'Flug' : 'Flüge'}{' '}
                            gefunden
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
                                      handleFlightSelect({
                                        flight,
                                        segmentIndex: currentSegmentIndex,
                                        selectedType: selectedType,
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
                                  selectedType: selectedType,
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
