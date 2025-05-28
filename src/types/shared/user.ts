export interface UserDetails {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  salutation?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PassengerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  dateOfBirth?: string;
  nationality?: string;
  passportNumber?: string;
}

export interface UserConsent {
  marketing: boolean;
  terms: boolean;
  privacy: boolean;
  timestamp: string;
}

export interface UserPreferences {
  language: string;
  currency: string;
  notifications: boolean;
}

export interface UserState {
  details: UserDetails | null;
  preferences: UserPreferences;
  isAuthenticated: boolean;
  lastUpdate: number;
}
