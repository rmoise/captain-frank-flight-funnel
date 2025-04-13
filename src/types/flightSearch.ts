import type { Flight } from "./store";
import type { LocationLike } from "./location";

export interface FlightSearchRequest {
  from_iata: string;
  to_iata: string;
  flight_date?: string;
  flight_number?: string;
}

export interface FlightSegment {
  fromLocation: LocationLike | null;
  toLocation: LocationLike | null;
  date: Date | null;
  selectedFlight: Flight | null;
}

// Helper function to format flight search request
export const formatFlightSearchRequest = (
  params: Partial<FlightSearchRequest>
): FlightSearchRequest => {
  return {
    from_iata: params.from_iata || "",
    to_iata: params.to_iata || "",
    flight_date: params.flight_date,
    flight_number: params.flight_number,
  };
};

// Helper function to format API response to match our store's Flight type
export const formatFlightSearchResponse = (data: any): Flight => {
  const flightNumber = data.flightnumber_iata || "";
  const airline = flightNumber.substring(0, 2);
  const departureCity = data.dep_iata || "";
  const arrivalCity = data.arr_iata || "";
  const departureTime = data.dep_time_sched || "";
  const arrivalTime = data.arr_time_sched || "";
  const date = data.flight_date || "";
  const status = data.status || "scheduled";

  return {
    id: data.id?.toString() || "",
    flightNumber,
    airline,
    departureCity,
    arrivalCity,
    departureTime,
    arrivalTime,
    departure: departureCity,
    arrival: arrivalCity,
    duration: "",
    stops: 0,
    aircraft: data.aircraft_type || "Unknown",
    class: "economy",
    date,
    price: 0,
    status,
    actualDeparture: data.dep_time_fact || null,
    actualArrival: data.arr_time_fact || null,
    arrivalDelay: data.arr_delay_min || null,
    departureAirport: departureCity,
    arrivalAirport: arrivalCity,
    scheduledDepartureTime: departureTime,
    scheduledArrivalTime: arrivalTime,
  };
};

// Helper function to validate flight segments
export const validateFlightSegments = (segments: FlightSegment[]): boolean => {
  // Must have between 2-4 segments
  if (segments.length < 2 || segments.length > 4) return false;

  // All segments must have locations and flights
  return segments.every((segment, index) => {
    const hasLocations = segment.fromLocation && segment.toLocation;
    const hasSelectedFlight = !!segment.selectedFlight;
    const hasDate = !!segment.date;

    // Base validation
    let isValid = hasLocations && hasSelectedFlight && hasDate;

    // Check connection with previous segment
    if (index > 0) {
      const prevSegment = segments[index - 1];
      if (!prevSegment.selectedFlight || !segment.selectedFlight) return false;

      // Check city connections
      const prevCity = prevSegment.selectedFlight.arrivalCity;
      const currentCity = segment.selectedFlight.departureCity;
      isValid =
        isValid && prevCity?.toLowerCase() === currentCity?.toLowerCase();
    }

    return isValid;
  });
};
