export interface Translations {
  lang: 'en' | 'de';
  common: {
    required: string;
    error: string;
    noResults: string;
    enterAmount: string;
  };
  validation: {
    required: string;
    invalidDate: string;
    invalidBookingNumber: string;
    invalidSignature: string;
  };
  wizard: {
    success: Record<string, { message: string }>;
    error: string;
    loading: string;
  };
  personalDetails: {
    title: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
    salutation: string;
  };
  errors: {
    general: string;
    [key: string]: string;
  };
  phases: {
    [key: string]: {
      title: string;
      description: string;
      reasons?: {
        title: string;
        description: string;
        items: Record<string, string>;
      };
    };
  };
  flightSelector: {
    labels: {
      from: string;
      to: string;
      departureDate: string;
      searchFlights: string;
      availableFlights: string;
      selectPreferred: string;
      searchByFlightNumber: string;
      searching: string;
      tryAdjusting: string;
      noFlightsFound: string;
      noMatchingFlights: string;
      noFlightsFoundCriteria: string;
      flightsFound: string;
    };
    errors: {
      departBeforeArrival: string;
      minConnectionTime: string;
      maxConnectionTime: string;
      connectionTime: string;
      invalidConnectionTime: string;
    };
    table: {
      flight: string;
      date: string;
      departure: string;
      arrival: string;
      duration: string;
    };
  };
}
