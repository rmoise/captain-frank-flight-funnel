import React from 'react';
import { useForm } from 'react-hook-form';
import { FlightNotListedData } from '@/types';

interface FlightNotListedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FlightNotListedData) => Promise<void>;
}

export default function FlightNotListedModal({
  isOpen,
  onClose,
  onSubmit,
}: FlightNotListedModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FlightNotListedData>();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-800">
              Submit Flight Details
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label htmlFor="flightNumber" className="block text-sm font-medium text-gray-700">
              Flight Number
            </label>
            <input
              type="text"
              id="flightNumber"
              {...register('flightNumber', { required: 'Flight number is required' })}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                errors.flightNumber ? 'border-red-500' : ''
              }`}
            />
            {errors.flightNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.flightNumber.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="departureCity" className="block text-sm font-medium text-gray-700">
              Departure City
            </label>
            <input
              type="text"
              id="departureCity"
              {...register('departureCity', { required: 'Departure city is required' })}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                errors.departureCity ? 'border-red-500' : ''
              }`}
            />
            {errors.departureCity && (
              <p className="mt-1 text-sm text-red-600">{errors.departureCity.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="arrivalCity" className="block text-sm font-medium text-gray-700">
              Arrival City
            </label>
            <input
              type="text"
              id="arrivalCity"
              {...register('arrivalCity', { required: 'Arrival city is required' })}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                errors.arrivalCity ? 'border-red-500' : ''
              }`}
            />
            {errors.arrivalCity && (
              <p className="mt-1 text-sm text-red-600">{errors.arrivalCity.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
              Date
            </label>
            <input
              type="date"
              id="date"
              {...register('date', { required: 'Date is required' })}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                errors.date ? 'border-red-500' : ''
              }`}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
