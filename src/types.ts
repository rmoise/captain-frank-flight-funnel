export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  departureCity: string;
  arrivalCity: string;
  departureTime: string;
  arrivalTime: string;
  departure: string;
  arrival: string;
  price?: number;
  duration: string;
  stops: number;
  aircraft: string;
  class: string;
  connection?: string;
  date: string;
  // API properties
  flightnumber_iata?: string;
  dep_iata?: string;
  arr_iata?: string;
  dep_time_sched?: string;
  arr_time_sched?: string;
  dep_time_fact?: string;
  arr_time_fact?: string;
  arr_delay_min?: number;
  status?: string;
  // Extended properties
  arrivalDelay?: number | null;
  departureAirport?: string;
  arrivalAirport?: string;
  scheduledDepartureTime?: string;
  bookingReference?: string;
  flightDate?: string;
  actualDeparture?: string | null;
  actualArrival?: string | null;
  dep_city?: string;
  arr_city?: string;
}
// ... existing code ...