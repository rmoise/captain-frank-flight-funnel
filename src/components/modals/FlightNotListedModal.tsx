import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';

interface FlightNotListedData {
  flightNumber: string;
  departureDate: string;
  departureAirport: string;
  arrivalAirport: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const FlightNotListedModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState<FlightNotListedData>({
    flightNumber: '',
    departureDate: '',
    departureAirport: '',
    arrivalAirport: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    onClose();
  };

  const dialogTitleId = React.useId();
  const dialogDescriptionId = React.useId();

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby={dialogTitleId}
      aria-describedby={dialogDescriptionId}
    >
      <div className="flex items-center justify-center min-h-screen">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
        <Dialog.Panel className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <Dialog.Title
            id={dialogTitleId}
            className="text-lg font-semibold mb-4"
          >
            Flight Not Listed?
          </Dialog.Title>
          <Dialog.Description
            id={dialogDescriptionId}
            className="text-gray-600 mb-6"
          >
            Please provide your flight details and we&apos;ll help you find it.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="flightNumber"
                className="block text-sm font-medium text-gray-700"
              >
                Flight Number
              </label>
              <input
                type="text"
                id="flightNumber"
                value={formData.flightNumber}
                onChange={(e) =>
                  setFormData((prev: FlightNotListedData) => ({
                    ...prev,
                    flightNumber: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="departureDate"
                className="block text-sm font-medium text-gray-700"
              >
                Departure Date
              </label>
              <input
                type="date"
                id="departureDate"
                value={formData.departureDate}
                onChange={(e) =>
                  setFormData((prev: FlightNotListedData) => ({
                    ...prev,
                    departureDate: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="departureAirport"
                className="block text-sm font-medium text-gray-700"
              >
                Departure Airport
              </label>
              <input
                type="text"
                id="departureAirport"
                value={formData.departureAirport}
                onChange={(e) =>
                  setFormData((prev: FlightNotListedData) => ({
                    ...prev,
                    departureAirport: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="arrivalAirport"
                className="block text-sm font-medium text-gray-700"
              >
                Arrival Airport
              </label>
              <input
                type="text"
                id="arrivalAirport"
                value={formData.arrivalAirport}
                onChange={(e) =>
                  setFormData((prev: FlightNotListedData) => ({
                    ...prev,
                    arrivalAirport: e.target.value,
                  }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Submit
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
