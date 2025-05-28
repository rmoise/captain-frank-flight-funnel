import type { Flight, FlightStatus } from "@/store/types";
import api from "@/services/api";
import type {
  RawFlight,
  FlightResponse,
  SearchFlightParams,
} from "@/types/shared/api";

/**
 * Converts raw flight data from API to Flight object
 */
function convertRawFlightToFlight(rawFlight: RawFlight): Flight {
  // Create default placeholder locations
  const createPlaceholderLocation = (iataCode: string) => ({
    id: iataCode,
    name: iataCode, // We'll use IATA code as name until we get real data
    code: iataCode,
    iata: iataCode,
    city: "Unknown",
    country: "Unknown",
    timezone: "Unknown",
    type: "airport" as const,
  });

  // Map status from API to our app's status
  const mapStatus = (status: string): FlightStatus => {
    const statusMap: Record<string, FlightStatus> = {
      scheduled: "scheduled",
      delayed: "delayed",
      cancelled: "cancelled",
      landed: "completed",
      // Add more mappings as needed
    };
    return statusMap[status?.toLowerCase()] || "scheduled";
  };

  return {
    id: String(rawFlight.id),
    flightNumber: rawFlight.flightnumber_iata,
    from: {
      ...createPlaceholderLocation(rawFlight.dep_iata),
      iata: rawFlight.dep_iata,
    },
    to: {
      ...createPlaceholderLocation(rawFlight.arr_iata),
      iata: rawFlight.arr_iata,
    },
    departureTime: rawFlight.dep_time_sched || new Date().toISOString(),
    arrivalTime: rawFlight.arr_time_sched || new Date().toISOString(),
    status: mapStatus(rawFlight.status),
    price: {
      amount: 0,
      currency: "EUR",
    },
    duration: "00:00", // Calculate from dep/arr times if needed
    stops: 0,
    type: "direct",
    airline: {
      name: rawFlight.flightnumber_iata.substring(0, 2),
      code: rawFlight.flightnumber_iata.substring(0, 2),
    },
  };
}

/**
 * Fetches flights based on search parameters
 */
async function fetchFlights(params: SearchFlightParams): Promise<Flight[]> {
  try {
    console.log("Searching flights with params:", params);

    // Validate required fields
    if (!params.fromLocation || !params.toLocation || !params.date) {
      console.error("Missing required parameters for flight search", params);
      throw new Error(
        "Missing required parameters: fromLocation, toLocation, and date are required"
      );
    }

    const flightResponse = await api.searchFlights(params);

    if (flightResponse.status === "error") {
      console.error("API request failed:", flightResponse.message);
      throw new Error(flightResponse.message || "Failed to fetch flights");
    }

    // Log the raw response for debugging
    console.log("API response:", flightResponse);

    // Convert raw flights to Flight objects
    const flights = Array.isArray(flightResponse.data)
      ? flightResponse.data.map(convertRawFlightToFlight)
      : [];

    console.log("Processed flights:", flights);
    return flights;
  } catch (error) {
    console.error("Error fetching flights:", error);
    throw error;
  }
}

export default fetchFlights;
