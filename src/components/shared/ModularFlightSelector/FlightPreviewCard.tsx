import React from "react";
import { PiAirplaneTakeoff } from "react-icons/pi";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useFlight } from "@/store";
import { formatSafeDate } from "@/utils/dateUtils";
import { useTranslation } from "@/hooks/useTranslation";
import { type FlightPreviewCardProps } from "@/types/shared/components";
import { getConnectionTimeInfo } from "@/utils/flightUtils";
import { type Flight, type SelectedFlight } from "@/store/types";
import { format, parseISO } from "date-fns";

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
    const { selectedFlights } = useFlight();

    // Add debugging to check flight props
    console.log("=== FlightPreviewCard - Rendering with props ===", {
      hasFlightData: !!flight,
      flightInfo: flight
        ? {
            id: flight.id,
            flightNumber: flight.flightNumber,
            airline: flight.airline,
            departure: flight.from,
            arrival: flight.to,
            departureCity: flight.from,
            arrivalCity: flight.to,
          }
        : null,
      index,
      isMultiCity,
      showConnectionInfo,
      currentPhase,
      timestamp: new Date().toISOString(),
    });

    // Get the previous flight from the selected flights
    const prevFlightArray =
      showConnectionInfo && selectedFlights[index - 1]
        ? selectedFlights[index - 1]
        : [];

    const prevFlight: Flight | null =
      prevFlightArray.length > 0 ? prevFlightArray[0] : null;

    // Create copies of the flights with their correct dates
    const validationFlights = {
      prev: prevFlight
        ? {
            id: prevFlight.id,
            flightNumber: prevFlight.flightNumber,
            arrivalTime: prevFlight.arrivalTime,
            arrivalCity: prevFlight.to,
          }
        : null,
      next: {
        id: flight.id,
        flightNumber: flight.flightNumber,
        departureTime: flight.departureTime,
        departureCity: flight.from,
      },
    };

    console.log("=== FlightPreviewCard - Connection Info Input ===", {
      prevFlight: validationFlights.prev
        ? {
            id: validationFlights.prev.id,
            flightNumber: validationFlights.prev.flightNumber,
            arrivalTime: validationFlights.prev.arrivalTime,
            arrivalCity: validationFlights.prev.arrivalCity,
          }
        : null,
      nextFlight: {
        id: validationFlights.next.id,
        flightNumber: validationFlights.next.flightNumber,
        departureTime: validationFlights.next.departureTime,
        departureCity: validationFlights.next.departureCity,
      },
      showConnectionInfo,
      currentPhase,
      selectedFlights,
      originalFlightData: flight,
      originalPrevFlightData: prevFlight,
    });

    // Enhanced connection validation with proper error handling
    const connectionInfo = (() => {
      if (
        !showConnectionInfo ||
        !validationFlights.prev ||
        !validationFlights.next
      ) {
        return null;
      }

      // Check if flight times are valid (not just dates) before validating connections
      const prevArrivalTime = validationFlights.prev.arrivalTime;
      const nextDepartureTime = validationFlights.next.departureTime;

      // Skip connection validation if times are just dates (incomplete flight data)
      const isPrevTimeJustDate =
        prevArrivalTime?.match(/^\d{4}-\d{2}-\d{2}$/) ||
        prevArrivalTime?.match(/^\d{2}\.\d{2}\.\d{4}$/);
      const isNextTimeJustDate =
        nextDepartureTime?.match(/^\d{4}-\d{2}-\d{2}$/) ||
        nextDepartureTime?.match(/^\d{2}\.\d{2}\.\d{4}$/);

      if (isPrevTimeJustDate || isNextTimeJustDate) {
        console.log(
          "=== FlightPreviewCard - Skipping connection validation (incomplete times) ===",
          {
            prevArrivalTime,
            nextDepartureTime,
            isPrevTimeJustDate,
            isNextTimeJustDate,
            flightNumbers: {
              prev: validationFlights.prev.flightNumber,
              next: validationFlights.next.flightNumber,
            },
          }
        );

        return {
          isValid: true,
          message: "Flight times pending - connection check skipped",
        };
      }

      // Only perform connection validation if we have proper datetime strings
      try {
        return getConnectionTimeInfo(
          validationFlights.prev as any,
          validationFlights.next as any,
          t as any
        );
      } catch (error) {
        console.error("Connection validation error:", error, {
          prevFlight: validationFlights.prev,
          nextFlight: validationFlights.next,
        });

        return {
          isValid: true,
          message: "Connection validation unavailable",
        };
      }
    })();

    console.log("=== FlightPreviewCard - Connection Info Result ===", {
      connectionInfo,
      timestamp: new Date().toISOString(),
    });

    // Format flight date for display
    const formatFlightDate = (dateString: string) => {
      try {
        const date = parseISO(dateString);
        return format(date, "dd MMM yyyy");
      } catch (error) {
        return dateString;
      }
    };

    // Extract time part from date string for display
    const formatFlightTime = (dateString: string) => {
      try {
        const date = parseISO(dateString);
        return format(date, "HH:mm");
      } catch (error) {
        return dateString;
      }
    };

    // Extract date only for desktop display
    const flightDate = formatFlightDate(flight.departureTime);

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
                <p className="text-sm font-medium">{flight.airline.name}</p>
                <p className="text-xs text-gray-900 font-medium">
                  {flight.flightNumber}
                </p>
                <p className="text-xs text-gray-500">
                  {flight.from?.iata || flight.from?.code || "N/A"}-
                  {flight.to?.iata || flight.to?.code || "N/A"}
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
              <p className="text-sm font-medium">
                {flight.from?.iata || flight.from?.code || "N/A"}
              </p>
              <p className="text-xs text-gray-500">
                {formatFlightTime(flight.departureTime)}
              </p>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="w-12 h-[1px] bg-gray-200 mt-1"></div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {flight.to?.iata || flight.to?.code || "N/A"}
              </p>
              <p className="text-xs text-gray-500">
                {formatFlightTime(flight.arrivalTime)}
              </p>
            </div>
          </div>
          {showConnectionInfo && connectionInfo && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p
                className={`text-sm ${
                  connectionInfo.isValid ? "text-gray-500" : "text-red-500"
                }`}
              >
                {connectionInfo.message}
              </p>
            </div>
          )}
        </div>

        {/* Desktop View - Updated to match the design */}
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
                  <p className="font-medium">{flight.airline.name}</p>
                  <span className="text-gray-400">•</span>
                  <p className="text-gray-900 font-medium">
                    {flight.flightNumber}
                  </p>
                </div>
                <p className="text-sm text-gray-500">
                  {flight.from?.iata || flight.from?.code || "N/A"} →{" "}
                  {flight.to?.iata || flight.to?.code || "N/A"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end space-x-2">
                <p className="font-medium">{flightDate}</p>
                <span className="text-gray-500">•</span>
                <p className="font-medium">
                  {formatFlightTime(flight.departureTime)}
                </p>
                <span className="text-gray-500">→</span>
                <p className="font-medium">
                  {formatFlightTime(flight.arrivalTime)}
                </p>
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
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p
                className={`text-sm ${
                  connectionInfo.isValid ? "text-gray-500" : "text-red-500"
                }`}
              >
                {connectionInfo.message}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
);

FlightPreviewCard.displayName = "FlightPreviewCard";
