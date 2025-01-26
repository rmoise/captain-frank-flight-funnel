import type { Flight, PassengerDetails } from '@/types/store';
import type { Answer } from '@/types/wizard';
import api from '@/services/api';

export interface EvaluateClaimRequest {
  journey_booked_flightids: string[];
  journey_fact_flightids: string[];
  information_received_at: string;
  travel_status?: string;
  delay_duration?: string;
  journey_fact_type: 'none' | 'self' | 'provided';
}

export interface OrderClaimRequest extends EvaluateClaimRequest {
  journey_booked_pnr: string;
  journey_fact_type: 'none' | 'self' | 'provided';
  owner_salutation: 'herr' | 'frau';
  owner_firstname: string;
  owner_lastname: string;
  owner_street: string;
  owner_place: string;
  owner_city: string;
  owner_zip: string;
  owner_country: string;
  owner_email: string;
  owner_phone: string;
  owner_marketable_status: boolean;
  contract_signature: string;
  contract_tac: boolean;
  contract_dp: boolean;
  guid?: string;
  recommendation_guid?: string;
}

export interface EvaluateClaimResponse {
  status: 'accept' | 'reject';
  guid?: string;
  recommendation_guid?: string;
  contract?: {
    amount: number;
    provision: number;
  };
  rejection_reasons?: string[];
  journey_booked_flightids: string[];
  journey_fact_flightids: string[];
  information_received_at: string;
  travel_status?: string;
  journey_fact_type: 'none' | 'self' | 'provided';
}

export interface OrderClaimResponse {
  data?: {
    guid: string;
    recommendation_guid: string;
  };
  message?: string;
}

export class ClaimService {
  private static mapSalutationToBackend(salutation: string): 'herr' | 'frau' {
    return salutation.toLowerCase() as 'herr' | 'frau';
  }

  private static getJourneyFactType(
    travelStatusAnswers: Answer[]
  ): 'none' | 'self' | 'provided' {
    const travelStatus = travelStatusAnswers.find(
      (a) => a.questionId === 'travel_status'
    )?.value;

    switch (travelStatus) {
      case 'none':
        return 'none';
      case 'self':
        return 'self';
      case 'provided':
        return 'provided';
      default:
        return 'none';
    }
  }

  private static getInformationReceivedDate(
    informedDateAnswers: Answer[]
  ): string {
    const specificDate = informedDateAnswers.find(
      (a) => a.questionId === 'specific_informed_date'
    )?.value;

    if (specificDate) {
      return String(specificDate);
    }

    // Default to current date if no specific date provided
    return new Date().toISOString().split('T')[0];
  }

  private static buildEvaluateRequest(
    originalFlights: Flight[],
    selectedFlights: Flight[],
    travelStatusAnswers: Answer[],
    informedDateAnswers: Answer[]
  ): EvaluateClaimRequest {
    // Log input data for debugging
    console.log('=== Building Evaluate Request - Input ===', {
      originalFlights: originalFlights.map((f) => ({
        id: f.id,
        flightNumber: f.flightNumber,
        departureCity: f.departureCity,
        arrivalCity: f.arrivalCity,
      })),
      selectedFlights: selectedFlights.map((f) => ({
        id: f.id,
        flightNumber: f.flightNumber,
        departureCity: f.departureCity,
        arrivalCity: f.arrivalCity,
      })),
    });

    const journeyFactType = this.getJourneyFactType(travelStatusAnswers);
    const travelStatus = travelStatusAnswers.find(
      (a) => a.questionId === 'travel_status'
    )?.value;

    // For multi-city trips, we need to include all booked flights
    const journey_booked_flightids = selectedFlights
      .filter(
        (f): f is Flight =>
          f !== null && (typeof f.id === 'string' || typeof f.id === 'number')
      )
      .map((f) => String(f.id));

    // For multi-city trips, ensure we maintain the correct order of flight IDs
    const journey_fact_flightids =
      journeyFactType === 'provided'
        ? selectedFlights
            .filter(
              (f): f is Flight =>
                f !== null &&
                (typeof f.id === 'string' || typeof f.id === 'number')
            )
            .map((f) => String(f.id))
        : [];

    // Validate that we have all required flight IDs
    if (journey_booked_flightids.length === 0) {
      throw new Error('No valid flight IDs found in selected flights');
    }

    if (journeyFactType === 'provided' && journey_fact_flightids.length === 0) {
      throw new Error('No valid flight IDs found in selected flights');
    }

    // Log the request details for debugging
    console.log('=== Building Evaluate Request - Output ===', {
      journey_booked_flightids,
      journey_fact_flightids,
      journeyFactType,
      travelStatus,
    });

    return {
      journey_booked_flightids,
      journey_fact_flightids,
      information_received_at:
        this.getInformationReceivedDate(informedDateAnswers),
      travel_status: travelStatus ? String(travelStatus) : undefined,
      journey_fact_type: journeyFactType,
    };
  }

  private static lastEvaluateResponse: EvaluateClaimResponse | null = null;

  private static getStoredEvaluationResponse(): EvaluateClaimResponse | null {
    const stored = sessionStorage.getItem('claim_evaluation_response');
    console.log('Getting stored evaluation response:', stored);
    if (!stored) return null;
    try {
      const response = JSON.parse(stored) as EvaluateClaimResponse;
      console.log('Successfully parsed stored evaluation response:', response);
      return response;
    } catch (error) {
      console.error('Error parsing stored evaluation response:', error);
      return null;
    }
  }

  private static setStoredEvaluationResponse(
    response: EvaluateClaimResponse
  ): void {
    console.log('Storing evaluation response:', response);
    sessionStorage.setItem(
      'claim_evaluation_response',
      JSON.stringify(response)
    );
    this.lastEvaluateResponse = response;
  }

  public static getLastEvaluationResponse(): EvaluateClaimResponse {
    // Try to get from memory first, then sessionStorage
    console.log('Getting last evaluation response...');
    console.log('In-memory response:', this.lastEvaluateResponse);
    const response =
      this.lastEvaluateResponse || this.getStoredEvaluationResponse();
    console.log('Final response:', response);
    if (!response) {
      throw new Error(
        'No evaluation response available. Please complete the trip experience phase first.'
      );
    }
    return response;
  }

  private static buildOrderRequest(
    originalFlights: Flight[],
    selectedFlights: Flight[],
    travelStatusAnswers: Answer[],
    informedDateAnswers: Answer[],
    personalDetails: PassengerDetails,
    bookingNumber: string,
    signature: string,
    termsAccepted: boolean,
    privacyAccepted: boolean,
    marketingAccepted: boolean
  ): OrderClaimRequest {
    // Log input data for debugging
    console.log('=== Building Order Request - Input ===', {
      originalFlights: originalFlights.map((f) => ({
        id: f.id,
        flightNumber: f.flightNumber,
        departureCity: f.departureCity,
        arrivalCity: f.arrivalCity,
      })),
      selectedFlights: selectedFlights.map((f) => ({
        id: f.id,
        flightNumber: f.flightNumber,
        departureCity: f.departureCity,
        arrivalCity: f.arrivalCity,
      })),
    });

    // Use the stored evaluation response
    const evaluateResponse = this.getLastEvaluationResponse();

    // Log the flight IDs being used
    console.log(
      '=== Building Order Request - Using Flight IDs from Evaluation ===',
      {
        journey_booked_flightids: evaluateResponse.journey_booked_flightids,
        journey_fact_flightids: evaluateResponse.journey_fact_flightids,
        journey_fact_type: evaluateResponse.journey_fact_type,
        travel_status: evaluateResponse.travel_status,
      }
    );

    // Build the order request using the stored evaluation response
    return {
      journey_booked_flightids: evaluateResponse.journey_booked_flightids,
      journey_fact_flightids: evaluateResponse.journey_fact_flightids,
      journey_fact_type: evaluateResponse.journey_fact_type,
      travel_status: evaluateResponse.travel_status,
      information_received_at: evaluateResponse.information_received_at,
      journey_booked_pnr: bookingNumber,
      owner_salutation: this.mapSalutationToBackend(personalDetails.salutation),
      owner_firstname: personalDetails.firstName,
      owner_lastname: personalDetails.lastName,
      owner_street: personalDetails.address || '',
      owner_place: personalDetails.postalCode || '',
      owner_city: personalDetails.city || '',
      owner_zip: personalDetails.postalCode || '',
      owner_country: personalDetails.country || '',
      owner_email: personalDetails.email,
      owner_phone: personalDetails.phone || '',
      owner_marketable_status: marketingAccepted,
      contract_signature: signature,
      contract_tac: termsAccepted,
      contract_dp: privacyAccepted,
    };
  }

  public static async evaluateClaim(
    originalFlights: Flight[],
    selectedFlights: Flight[],
    travelStatusAnswers: Answer[],
    informedDateAnswers: Answer[]
  ): Promise<EvaluateClaimResponse> {
    console.log('=== Evaluating Claim ===', {
      originalFlights: originalFlights.map((f) => ({
        id: f.id,
        flightNumber: f.flightNumber,
      })),
      selectedFlights: selectedFlights.map((f) => ({
        id: f.id,
        flightNumber: f.flightNumber,
      })),
      travelStatusAnswers,
      informedDateAnswers,
    });

    const request = this.buildEvaluateRequest(
      originalFlights,
      selectedFlights,
      travelStatusAnswers,
      informedDateAnswers
    );

    try {
      const response = await api.evaluateEuflightClaim(request);
      console.log('Evaluate claim response:', response);
      if (response.data) {
        const evaluateResponse = {
          status: response.data.status,
          contract: response.data.contract,
          rejection_reasons: response.data.rejection_reasons
            ? Object.values(response.data.rejection_reasons)
            : undefined,
          journey_booked_flightids: request.journey_booked_flightids,
          journey_fact_flightids: request.journey_fact_flightids,
          information_received_at: request.information_received_at,
          travel_status: request.travel_status,
          journey_fact_type: request.journey_fact_type,
        };
        // Store the response in both memory and sessionStorage
        this.setStoredEvaluationResponse(evaluateResponse);
        return evaluateResponse;
      }
      throw new Error('Invalid response format from API');
    } catch (error) {
      console.error('Error evaluating claim:', error);
      throw error;
    }
  }

  public static async orderClaim(
    originalFlights: Flight[],
    selectedFlights: Flight[],
    travelStatusAnswers: Answer[],
    informedDateAnswers: Answer[],
    personalDetails: PassengerDetails,
    bookingNumber: string,
    signature: string,
    termsAccepted: boolean,
    privacyAccepted: boolean,
    marketingAccepted: boolean
  ): Promise<OrderClaimResponse> {
    console.log('=== Ordering Claim ===', {
      originalFlights: originalFlights.map((f) => ({
        id: f.id,
        flightNumber: f.flightNumber,
      })),
      selectedFlights: selectedFlights.map((f) => ({
        id: f.id,
        flightNumber: f.flightNumber,
      })),
      travelStatusAnswers,
      informedDateAnswers,
      personalDetails,
      bookingNumber,
      termsAccepted,
      privacyAccepted,
      marketingAccepted,
    });

    const request = this.buildOrderRequest(
      originalFlights,
      selectedFlights,
      travelStatusAnswers,
      informedDateAnswers,
      personalDetails,
      bookingNumber,
      signature,
      termsAccepted,
      privacyAccepted,
      marketingAccepted
    );

    try {
      const response = await api.orderEuflightClaim(request);
      console.log('Order claim response:', response);
      return response;
    } catch (error) {
      console.error('Error ordering claim:', error);
      throw error;
    }
  }
}
