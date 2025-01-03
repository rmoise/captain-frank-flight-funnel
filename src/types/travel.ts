export type TravelStatus = 'none' | 'self' | 'provided';

export interface TravelDetails {
  journey_fact_type: TravelStatus;
  journey_booked_flightids: string[];
  journey_fact_flightids: string[];
  information_received_at: string;
}

export type JourneyFactType = TravelStatus;

export interface TravelStatusState {
  travel_status: TravelStatus;
  journey_fact_type: JourneyFactType;
}
