import React from "react";
import { PiAirplaneTakeoff } from "react-icons/pi";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useFlightStore } from "../../../lib/state/flightStore";
import { formatSafeDate } from "../../../utils/dateUtils";
import { useTranslation } from "../../../hooks/useTranslation";
import type { FlightPreviewCardProps } from "./types";
import { validateFlightConnection } from "../../../lib/validation/flightValidation";

export const FlightPreviewCard: React.FC<FlightPreviewCardProps> = React.memo(
  ({
    flight,
    index,
    onEdit,
    onDelete,
    isMultiCity = false,
    showConnectionInfo = false,
    currentPhase = 4,
  }) => {
    const { t } = useTranslation();
    const flightStore = useFlightStore();

    // Add debugging to check flight props
    console.log("=== FlightPreviewCard - Rendering with props ===", {
      hasFlightData: !!flight,
      flightInfo: flight
        ? {
            id: flight.id,
            flightNumber: flight.flightNumber,
            airline: flight.airline,
            departure: flight.departure,
            arrival: flight.arrival,
            departureCity: flight.departureCity,
            arrivalCity: flight.arrivalCity,
            date: flight.date,
            dateType: typeof flight.date,
          }
        : null,
      index,
      isMultiCity,
      showConnectionInfo,
      currentPhase,
      timestamp: new Date().toISOString(),
    });

    // Get the previous flight from the flight store's selected flights
    const prevFlight = showConnectionInfo
      ? flightStore.getSelectedFlights(currentPhase)[index - 1]
      : null;

    // Create copies of the flights with their correct dates
    const validationFlights = {
      prev: prevFlight
        ? {
            ...prevFlight,
            date: prevFlight.date, // Use raw flight date
          }
        : null,
      next: {
        ...flight,
        date: flight.date, // Use raw flight date
      },
    };

    console.log("=== FlightPreviewCard - Connection Info Input ===", {
      prevFlight: validationFlights.prev
        ? {
            id: validationFlights.prev.id,
            flightNumber: validationFlights.prev.flightNumber,
            date: validationFlights.prev.date,
            arrivalTime: validationFlights.prev.arrivalTime,
            arrivalCity: validationFlights.prev.arrivalCity,
          }
        : null,
      nextFlight: {
        id: validationFlights.next.id,
        flightNumber: validationFlights.next.flightNumber,
        date: validationFlights.next.date,
        departureTime: validationFlights.next.departureTime,
        departureCity: validationFlights.next.departureCity,
      },
      showConnectionInfo,
      currentPhase,
      rawFlightDate: flight.date,
      prevRawFlightDate: prevFlight?.date,
      flightStoreFlights: flightStore.getSelectedFlights(currentPhase),
    });

    const connectionInfo =
      validationFlights.prev && validationFlights.next
        ? validateFlightConnection(
            validationFlights.prev,
            validationFlights.next,
            currentPhase
          )
        : null;

    console.log("=== FlightPreviewCard - Connection Info Result ===", {
      connectionInfo,
      timestamp: new Date().toISOString(),
    });

    const formatConnectionTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return t.flightSelector.errors.connectionTime
        .replace("{hours}", hours.toString())
        .replace("{minutes}", remainingMinutes.toString());
    };

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
                {isMultiCity && (
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
                <p className="text-xs text-gray-500">
                  {flight.departure}-{flight.arrival}
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
          {showConnectionInfo && connectionInfo && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p
                className={`text-sm ${
                  connectionInfo.isValid ? "text-gray-500" : "text-red-500"
                }`}
              >
                {connectionInfo.isValid
                  ? formatConnectionTime(
                      connectionInfo.timeDifferenceMinutes || 0
                    )
                  : connectionInfo.error ||
                    t.flightSelector.errors.noValidConnecting}
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
                {isMultiCity && (
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
          {showConnectionInfo && connectionInfo && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p
                className={`text-sm flex items-center ${
                  connectionInfo.isValid ? "text-gray-500" : "text-red-500"
                }`}
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
                {connectionInfo.isValid
                  ? formatConnectionTime(
                      connectionInfo.timeDifferenceMinutes || 0
                    )
                  : connectionInfo.error ||
                    t.flightSelector.errors.noValidConnecting}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
);

FlightPreviewCard.displayName = "FlightPreviewCard";
