import React, { useState, useEffect } from 'react';
import { FlightSelectorProps, Flight } from '@/types';
import { AutocompleteInput } from '@/components/AutocompleteInput';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setSelectedFlight,
  markStepIncomplete,
  setStep,
  setFromLocation,
  setToLocation,
  setFocusedInput
} from '@/store/bookingSlice';
import { useSteps } from '@/context/StepsContext';

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
    price: 299
  },
  // ... update other mock flights with the same structure
];

export default function FlightSelector({
  onViewModeChange,
  onNotListedClick,
  onSelect,
}: FlightSelectorProps) {
  const [flightType, setFlightType] = useState<'direct' | 'multi'>('direct');
  const dispatch = useAppDispatch();
  const { fromLocation, toLocation, focusedInput } = useAppSelector(state => state.booking);
  const { registerStep, unregisterStep } = useSteps();

  useEffect(() => {
    if (fromLocation && toLocation) {
      const flight: Flight = {
        id: '1',
        departureCity: fromLocation,
        arrivalCity: toLocation,
        airline: 'Sample Airline',
        flightNumber: 'FL123',
        departureTime: '10:00',
        arrivalTime: '12:00',
        departure: `${fromLocation} - 10:00`,
        arrival: `${toLocation} - 12:00`,
        price: 299,
      };
      dispatch(setSelectedFlight(flight));
    }
  }, [fromLocation, toLocation, dispatch]);

  useEffect(() => {
    registerStep('FlightSelector', 1);
    return () => {
      unregisterStep('FlightSelector');
    };
  }, []);

  const handleFromLocationChange = (value: string) => {
    dispatch(setFromLocation(value));
  };

  const handleToLocationChange = (value: string) => {
    dispatch(setToLocation(value));
  };

  const handleFocusInput = (input: 'from' | 'to') => {
    dispatch(setFocusedInput(input));
  };

  const handleBlurInput = () => {
    dispatch(setFocusedInput(null));
  };

  const handleClearFlight = () => {
    dispatch(setSelectedFlight(null));
    dispatch(setFromLocation(null));
    dispatch(setToLocation(null));
    dispatch(markStepIncomplete(1));
  };

  return (
    <div className="flex justify-center items-center w-full mb-16">
      <div className="w-full lg:w-[963px] h-auto lg:h-[498px] px-4 lg:px-[47px] py-8 lg:py-[103px] bg-[#eceef1] rounded-2xl flex-col justify-start items-start gap-2.5 inline-flex">
        <div className="flex flex-col lg:flex-row justify-start items-center gap-8 lg:gap-[65px] w-full">
          <div className="block w-full lg:w-[393px] h-[200px] lg:h-[257.88px] relative">
            <img
              src="https://ik.imagekit.io/0adjo0tl4/Group%20140.svg?updatedAt=1733662470241"
              alt="Flight illustration"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="w-full lg:w-[394.96px] relative flex flex-col lg:justify-center h-full">
            <div className="w-full lg:w-[361.16px] relative lg:absolute lg:left-[14px] lg:top-[50%] lg:-translate-y-[40%]">
              {/* Flight Type Selector */}
              <div className="w-full lg:w-[394.96px] h-[40.64px] mb-8 flex justify-start items-center gap-4">
                <button
                  onClick={() => setFlightType('direct')}
                  className={`px-5 py-2.5 rounded-[49px] justify-center items-center gap-2.5 flex
                    ${flightType === 'direct' ? 'bg-[#464646]' : 'bg-white'}`}
                >
                  <div
                    className={`text-base font-['Heebo']
                    ${
                      flightType === 'direct'
                        ? 'text-white font-bold'
                        : 'text-[#121212] font-medium'
                    }`}
                  >
                    Direct Flight
                  </div>
                </button>
                <button
                  onClick={() => setFlightType('multi')}
                  className={`px-5 py-2.5 rounded-[50px] justify-center items-center gap-2.5 flex
                    ${flightType === 'multi' ? 'bg-[#464646]' : 'bg-white'}`}
                >
                  <div
                    className={`text-base font-['Heebo']
                    ${
                      flightType === 'multi'
                        ? 'text-white font-bold'
                        : 'text-[#121212] font-medium'
                    }`}
                  >
                    Multi City
                  </div>
                </button>
              </div>

              <div className="flex flex-col gap-6">
                {/* From Input */}
                <AutocompleteInput
                  label="Select departure"
                  focusedLabel={
                    fromLocation ? 'From' : 'Select departure'
                  }
                  value={fromLocation || ''}
                  options={airportOptions}
                  onChange={handleFromLocationChange}
                  onFocus={() => handleFocusInput('from')}
                  onBlur={handleBlurInput}
                  isFocused={focusedInput === 'from'}
                />

                {/* To Input */}
                <AutocompleteInput
                  label="Select destination"
                  focusedLabel={toLocation ? 'To' : 'Select destination'}
                  value={toLocation || ''}
                  options={airportOptions}
                  onChange={handleToLocationChange}
                  onFocus={() => handleFocusInput('to')}
                  onBlur={handleBlurInput}
                  isFocused={focusedInput === 'to'}
                />
              </div>

              {/* Swap Button */}
              <div className="hidden lg:block absolute -right-4 top-[98px] w-[75.03px] h-[75.03px] pointer-events-none">
                <div className="w-[75.03px] h-[75.03px] bg-white rounded-full shadow" />
                <div className="w-[34.39px] h-[18.76px] absolute left-[20.32px] top-[28.14px]">
                  <img
                    src="/icons/swap-arrows.svg"
                    alt="Swap"
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
