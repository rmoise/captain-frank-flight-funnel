import React, { useState } from 'react';
import { BottomSheet } from '@/components/shared/Sheet';
import { useTranslation } from '@/hooks/useTranslation';
import type { Flight } from '@/types/store';
import {
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { PiAirplaneTakeoff } from 'react-icons/pi';
import { format, parseISO } from 'date-fns';
import { SecondaryButton } from '@/components/shared/SecondaryButton';

export interface FlightSearchBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (flight: Flight) => void;
  searchResults: Flight[];
  isSearching?: boolean;
  errorMessage?: string | null;
  setIsFlightNotListedOpen: (isOpen: boolean) => void;
  currentPhase?: number;
}

// Helper function to safely format date for display
const formatSafeDate = (date: string | Date | null): string => {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'dd.MM.yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

export const FlightSearchBottomSheet: React.FC<
  FlightSearchBottomSheetProps
> = ({
  isOpen,
  onClose,
  onSelect,
  searchResults,
  isSearching = false,
  errorMessage = null,
  setIsFlightNotListedOpen,
  currentPhase,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'list' | 'card'>('card');

  const filteredFlights = React.useMemo(() => {
    if (!searchTerm) return searchResults;
    const term = searchTerm.toLowerCase();
    return searchResults.filter((flight) => {
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
  }, [searchResults, searchTerm]);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
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
                    placeholder={t.flightSelector.labels.searchByFlightNumber}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-12 px-3 pl-10 pr-10 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                  <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isSearching ? (
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
                {t.flightSelector.labels.tryAdjusting}
              </p>
              {currentPhase !== 1 &&
                process.env.NEXT_PUBLIC_ENV === 'development' && (
                  <SecondaryButton
                    onClick={() => {
                      onClose();
                      setIsFlightNotListedOpen(true);
                    }}
                  >
                    {t.flightSelector.flightNotListed.button}
                  </SecondaryButton>
                )}
            </div>
          ) : filteredFlights.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                <PiAirplaneTakeoff className="w-8 h-8 text-[#F54538]" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchResults.length === 0
                  ? t.flightSelector.labels.noFlightsFound
                  : t.flightSelector.labels.noMatchingFlights}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchResults.length === 0
                  ? t.flightSelector.labels.noFlightsFoundCriteria
                  : t.flightSelector.labels.tryAdjusting}
              </p>
              {currentPhase !== 1 &&
                process.env.NEXT_PUBLIC_ENV === 'development' && (
                  <SecondaryButton
                    onClick={() => {
                      onClose();
                      setIsFlightNotListedOpen(true);
                    }}
                  >
                    {t.flightSelector.flightNotListed.button}
                  </SecondaryButton>
                )}
            </div>
          ) : (
            <>
              <div className="px-6 py-2 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium text-gray-900">
                    {`${filteredFlights.length} ${
                      t.flightSelector.labels.flightsFound.includes('Flight')
                        ? filteredFlights.length === 1
                          ? 'Flight'
                          : 'Flights'
                        : filteredFlights.length === 1
                          ? 'Flug'
                          : 'Flüge'
                    } ${t.flightSelector.labels.flightsFound.includes('found') ? 'found' : 'gefunden'}`}
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
                              <span>{t.flightSelector.table.flight}</span>
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
                            onClick={() => onSelect(flight)}
                            className={`cursor-pointer hover:bg-gray-100 ${
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }`}
                          >
                            <td className="py-4 pl-6 pr-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                                  <PiAirplaneTakeoff className="w-4 h-4 text-[#F54538]" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {flight.airline}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {flight.flightNumber}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-500">
                              {formatSafeDate(flight.date)}
                            </td>
                            <td className="px-3 py-4">
                              <p className="text-sm font-medium text-gray-900">
                                {flight.departureTime}
                              </p>
                              <p className="text-sm text-gray-500">
                                {flight.departureCity} ({flight.departure})
                              </p>
                            </td>
                            <td className="px-3 py-4">
                              <p className="text-sm font-medium text-gray-900">
                                {flight.arrivalTime}
                              </p>
                              <p className="text-sm text-gray-500">
                                {flight.arrivalCity} ({flight.arrival})
                              </p>
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-500">
                              {flight.duration}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  filteredFlights.map((flight) => (
                    <button
                      key={flight.id}
                      onClick={() => onSelect(flight)}
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
                            <p className="font-medium">{flight.arrivalTime}</p>
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
  );
};
