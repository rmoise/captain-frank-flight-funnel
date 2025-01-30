import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Flight } from '@/types';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface FlightSearchCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  flights: Flight[];
  onFlightSelect: (flight: Flight) => void;
}

export default function FlightSearchCardModal({
  isOpen,
  onClose,
  flights,
  onFlightSelect,
}: FlightSearchCardModalProps) {
  const dialogTitleId = React.useId();
  const dialogDescriptionId = React.useId();

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <Dialog.Content
              className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              aria-labelledby={dialogTitleId}
              aria-describedby={dialogDescriptionId}
            >
              <Dialog.Title
                id={dialogTitleId}
                className="text-2xl font-semibold text-gray-900 p-6"
              >
                Available Flights
              </Dialog.Title>
              <Dialog.Description id={dialogDescriptionId}>
                A list of available flights matching your search criteria. Each
                flight shows airline, flight number, departure and arrival
                details.
              </Dialog.Description>
              <Dialog.Close
                className="absolute top-6 right-6 text-gray-500 hover:text-gray-700"
                aria-label="Close dialog"
              >
                <XMarkIcon className="w-6 h-6" />
              </Dialog.Close>

              <div className="px-6 pb-6 space-y-4" role="list">
                {flights.map((flight) => (
                  <div
                    key={flight.id}
                    className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
                    role="listitem"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {flight.airline}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Flight {flight.flightNumber}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">
                          {flight.arrival}
                        </p>
                        <p className="text-xs text-gray-500">
                          {flight.arrivalCity} ({flight.arrival})
                        </p>
                        <p className="text-xs text-gray-500">
                          {flight.arrivalTime}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">
                          {flight.departure}
                        </p>
                        <p className="text-xs text-gray-500">
                          {flight.departureCity} ({flight.departure})
                        </p>
                        <p className="text-xs text-gray-500">
                          {flight.departureTime}
                        </p>
                      </div>
                      <div className="flex-1 mx-4">
                        <div className="h-0.5 bg-gray-300 relative">
                          <div className="absolute inset-y-0 -mt-1">
                            <svg
                              className="h-3 w-3 text-gray-400"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M3.64 14.26l2.86.95 4.02-4.02-8-4.59 1.16-1.16c.1-.1.26-.14.41-.1l9.3 2.98c1.58-1.58 3.15-3.2 4.77-4.75.31-.33.7-.58 1.16-.73.45-.16.94-.2 1.42-.13.48.07.94.26 1.34.53.4.27.73.64.97 1.07.24.42.37.89.37 1.37 0 .49-.13.96-.37 1.39-.24.42-.57.79-.97 1.06L13.65 13l2.98 9.3c.05.15 0 .31-.1.41l-1.17 1.16-4.57-8.02L6.8 19.8l.95 2.84-.94.94-2.99-5.62-5.6-2.99.94-.94z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                        Duration: {flight.duration}
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-500">
                          Status: {flight.status || 'Scheduled'}
                        </p>
                        {flight.price !== undefined && (
                          <p className="text-sm font-medium text-gray-900">
                            ${flight.price}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onFlightSelect(flight);
                        onClose();
                      }}
                      className="px-4 py-2 bg-[#F54538] text-white rounded-lg hover:bg-[#F54538]/90 transition-colors"
                    >
                      Select Flight
                    </button>
                  </div>
                ))}
              </div>
            </Dialog.Content>
          </div>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
