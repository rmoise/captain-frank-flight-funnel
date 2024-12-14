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
  price: number;
}

export interface FlightSegment {
  id: string;
  fromLocation: string | null;
  toLocation: string | null;
}

export interface PassengerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface BookingDetails {
  experienceType?: string;
  passengers: PassengerDetails[];
}

export interface FlightSelectorProps {
  onSelect: (flight: Flight | Flight[]) => void;
  onViewModeChange?: () => void;
  onNotListedClick?: () => void;
}

export interface ExperienceSelectionProps {
  selectedExperience?: string;
  onSelect: (experienceId: string) => void;
}

export interface PersonalDetailsFormProps {
  onSubmit: (data: PassengerDetails) => void;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  flights: Flight[];
  onFlightSelect: (flight: Flight) => void;
}

export interface FlightNotListedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FlightNotListedData) => Promise<void>;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface FlightNotListedData {
  flightNumber: string;
  departureCity: string;
  arrivalCity: string;
  date: string;
}

export interface SocialLink {
  id: string;
  icon: string;
  alt: string;
  url: string;
}

export interface FlightOption {
  id: string;
  label: string;
  image: string;
  title: string;
  description: string;
  icon: string;
}

export interface ConsentItem {
  id: string;
  text: string;
  link: string;
  linkText: string;
}

export interface ProgressStep {
  id: number;
  label: string;
  completed: boolean;
}
