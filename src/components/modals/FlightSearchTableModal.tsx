import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Flight } from '@/types';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface FlightSearchTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  flights: Flight[];
  onFlightSelect: (flight: Flight) => void;
}

export default function FlightSearchTableModal({
  isOpen,
  onClose,
  flights,
  onFlightSelect,
}: FlightSearchTableModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <Dialog.Content className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[80vh] overflow-hidden">
              <Dialog.Title className="text-2xl font-semibold text-gray-800 p-6 border-b">
                Select Your Flight
              </Dialog.Title>
              <Dialog.Description className="sr-only">
                A table of available flights matching your search criteria. Each
                row shows flight number, departure, arrival, and status details.
              </Dialog.Description>
              <Dialog.Close
                className="absolute top-6 right-6 text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <XMarkIcon className="w-6 h-6" />
              </Dialog.Close>

              <div className="overflow-x-auto">
                <table
                  className="min-w-full divide-y divide-gray-200"
                  role="grid"
                >
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Flight Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Departure
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Arrival
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      {flights.some((flight) => flight.price !== undefined) && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {flights.map((flight) => (
                      <tr
                        key={flight.id}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {flight.flightNumber}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {flight.departureTime}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {flight.arrivalTime}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {flight.status || 'Scheduled'}
                          </div>
                        </td>
                        {flight.price !== undefined && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              ${flight.price}
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => {
                              onFlightSelect(flight);
                              onClose();
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Dialog.Content>
          </div>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
