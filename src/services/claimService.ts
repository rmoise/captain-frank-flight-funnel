import type { Flight, UserDetails } from "@/store/types";
import type { WizardState, Answer } from "@/types/shared/wizard";
import api from "@/services/api";
import useStore from "@/store";
import { getContactId } from "@/utils/contactId";
import { create } from "zustand";
import type { Store } from "@/store/types";

// Create a mini store just for claim status
interface ClaimStatusStore {
  _isClaimSuccess: boolean;
  _isClaimRejected: boolean;
  setClaimStatus: (success: boolean, rejected: boolean) => void;
}

const useClaimStatusStore = create<ClaimStatusStore>((set: any) => ({
  _isClaimSuccess: false,
  _isClaimRejected: false,
  setClaimStatus: (success: boolean, rejected: boolean) =>
    set({ _isClaimSuccess: success, _isClaimRejected: rejected }),
}));

export interface EvaluateClaimRequest {
  journey_booked_flightids: string[];
  journey_fact_flightids: string[];
  information_received_at: string;
  travel_status?: string;
  delay_duration?: string;
  journey_fact_type: "none" | "self" | "provided";
}

export interface OrderClaimRequest {
  journey_booked_flightids: string[];
  journey_fact_flightids: string[];
  information_received_at: string;
  journey_booked_pnr: string;
  journey_fact_type: "none" | "self" | "provided";
  owner_salutation: "herr" | "frau";
  owner_firstname: string;
  owner_lastname: string;
  owner_street: string;
  owner_place: string;
  owner_city: string;
  owner_country: string;
  owner_email: string;
  owner_phone: string;
  owner_marketable_status: boolean;
  arbeitsrecht_marketing_status?: boolean;
  contract_signature: string;
  contract_tac: boolean;
  contract_dp: boolean;
  guid?: string;
  recommendation_guid?: string;
  travel_status?: string;
  lang?: string;
}

export interface EvaluateClaimResponse {
  status: "accept" | "reject";
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
  journey_fact_type: "none" | "self" | "provided";
}

export interface OrderClaimResponse {
  data?: {
    guid: string;
    recommendation_guid: string;
  };
  message?: string;
  error?: string;
}

export class ClaimService {
  private static mapSalutationToBackend(salutation: string): "herr" | "frau" {
    return salutation.toLowerCase() as "herr" | "frau";
  }

  private static getJourneyFactType(
    travelStatusAnswers: Answer[]
  ): "none" | "self" | "provided" {
    const travelStatus = travelStatusAnswers.find(
      (a) => a.id === "travel_status"
    )?.value;

    switch (travelStatus) {
      case "none":
        return "none";
      case "self":
        return "self";
      case "provided":
        return "provided";
      default:
        return "none";
    }
  }

  private static getInformedDate(
    informedDateAnswers: Answer[]
  ): string | undefined {
    const informedDateOption = informedDateAnswers.find(
      (a) => a.id === "informed_date"
    )?.value;

    if (informedDateOption === "specific_date") {
      return informedDateAnswers.find((a) => a.id === "specific_informed_date")
        ?.value as string;
    }

    // If 'on_departure' or not found, return undefined (or handle as needed)
    return undefined;
  }

  private static getBookingPNR(answers: Answer[]): string {
    const pnrAnswer = answers.find((a) => a.id === "booking_number");
    const pnrValue = pnrAnswer?.value;
    if (typeof pnrValue !== "string") {
      console.error("Booking PNR not found or not a string:", pnrValue);
      throw new Error("Valid Booking PNR not found in answers");
    }
    return pnrValue;
  }

  private static getInformationReceivedDate(
    informedDateAnswers: Answer[],
    originalFlights: Flight[]
  ): string {
    const specificDateAnswer = informedDateAnswers.find(
      (a) => a.id === "specific_informed_date"
    );
    const specificDate = specificDateAnswer?.value;

    if (specificDate && typeof specificDate === "string") {
      // Basic validation or formatting if needed
      // For now, assume it's a valid date string
      return specificDate;
    }

    const informedDateOption = informedDateAnswers.find(
      (a) => a.id === "informed_date"
    )?.value;

    // If informed on departure or no specific date given, use flight date
    if (informedDateOption === "on_departure" || !specificDate) {
      if (originalFlights?.[0]?.departureTime) {
        // Use departureTime instead of flightDate
        return originalFlights[0].departureTime.split("T")[0];
      } else if (originalFlights?.[0]?.departureTime) {
        // Use departureTime instead of scheduledDeparture
        return originalFlights[0].departureTime.split("T")[0];
      }
    }

    throw new Error(
      "No valid date found for information_received_at. Must have either specific informed date or flight date."
    );
  }

  private static buildEvaluateRequest(
    originalFlights: Flight[],
    selectedFlights: Flight[],
    travelStatusAnswers: Answer[],
    informedDateAnswers: Answer[]
  ): EvaluateClaimRequest {
    // Log input data for debugging
    console.log("=== Building Evaluate Request - Input ===", {
      originalFlights: originalFlights.map((f) => ({
        id: f.id,
        flightNumber: f.flightNumber,
        date: f.departureTime,
      })),
      selectedFlights: selectedFlights.map((f) => ({
        id: f.id,
        flightNumber: f.flightNumber,
      })),
    });

    const journeyFactType = this.getJourneyFactType(travelStatusAnswers);
    const travelStatus = travelStatusAnswers.find(
      (a) => a.id === "travel_status"
    )?.value;

    // Ensure all flights have valid IDs and flight numbers
    const validOriginalFlights = originalFlights.filter(
      (f): f is Flight => f !== null && Boolean(f.id) && Boolean(f.flightNumber)
    );

    const validSelectedFlights = selectedFlights.filter(
      (f): f is Flight => f !== null && Boolean(f.id) && Boolean(f.flightNumber)
    );

    // For multi-city trips, we need to include all booked flights
    const journey_booked_flightids = validOriginalFlights.map((f) =>
      String(f.id)
    );

    // For multi-city trips, ensure we maintain the correct order of flight IDs
    const journey_fact_flightids =
      journeyFactType === "provided" || travelStatus === "took_alternative_own"
        ? validSelectedFlights.map((f) => String(f.id))
        : journeyFactType === "self"
        ? validOriginalFlights.map((f) => String(f.id))
        : [];

    // Log the request details for debugging
    console.log("=== Building Evaluate Request - Output ===", {
      journey_booked_flightids,
      journey_fact_flightids,
      journeyFactType,
      travelStatus,
      validOriginalFlights: validOriginalFlights.map((f) => ({
        flightNumber: f.flightNumber,
        date: f.departureTime,
      })),
      validSelectedFlights: validSelectedFlights.map((f) => f.flightNumber),
    });

    // Validate that we have all required flight IDs
    if (journey_booked_flightids.length === 0) {
      console.error(
        "No valid flight IDs found in original flights",
        originalFlights
      );
      throw new Error("No valid flight IDs found in original flights");
    }

    if (journeyFactType === "provided" && journey_fact_flightids.length === 0) {
      console.error(
        "No valid flight IDs found in selected flights",
        selectedFlights
      );
      throw new Error("No valid flight IDs found in selected flights");
    }

    return {
      journey_booked_flightids,
      journey_fact_flightids,
      information_received_at: this.getInformationReceivedDate(
        informedDateAnswers,
        validOriginalFlights
      ),
      travel_status: travelStatus ? String(travelStatus) : undefined,
      journey_fact_type: journeyFactType,
    };
  }

  // Static memory cache (consider moving to Zustand store if appropriate)
  private static lastEvaluateResponse: EvaluateClaimResponse | null = null;
  private static lastPersonalDetails: UserDetails | null = null;

  private static updateClaimStatus(success: boolean, rejected: boolean): void {
    useClaimStatusStore.getState().setClaimStatus(success, rejected);
  }

  private static getStoredEvaluationResponse(): EvaluateClaimResponse | null {
    const stored = sessionStorage.getItem("evaluateResponse");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Basic type check
        if (parsed && typeof parsed === "object" && "status" in parsed) {
          this.lastEvaluateResponse = parsed;
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse stored evaluation response", e);
        sessionStorage.removeItem("evaluateResponse");
      }
    }
    return this.lastEvaluateResponse; // Return from memory if session fails
  }

  public static setStoredEvaluationResponse(
    response: EvaluateClaimResponse
  ): void {
    this.lastEvaluateResponse = response;
    try {
      sessionStorage.setItem("evaluateResponse", JSON.stringify(response));
    } catch (e) {
      console.error("Failed to save evaluation response to sessionStorage", e);
    }
  }

  public static getLastEvaluationResponse(): EvaluateClaimResponse | null {
    // Prioritize retrieving from storage
    const storedResponse = this.getStoredEvaluationResponse();
    if (storedResponse) {
      return storedResponse;
    }
    // Fallback to memory if storage fails or is empty
    return this.lastEvaluateResponse;
  }

  private static getStoredPersonalDetails(): UserDetails | null {
    const stored = sessionStorage.getItem("personalDetails");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Basic type check for UserDetails might be needed here
        if (
          parsed &&
          typeof parsed === "object" &&
          "firstName" in parsed &&
          "email" in parsed
        ) {
          this.lastPersonalDetails = parsed;
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse stored personal details", e);
        sessionStorage.removeItem("personalDetails");
      }
    }
    return this.lastPersonalDetails;
  }

  public static setStoredPersonalDetails(details: UserDetails): void {
    console.log("Storing personal details:", details);
    this.lastPersonalDetails = details;
    try {
      sessionStorage.setItem("personalDetails", JSON.stringify(details));
    } catch (e) {
      console.error("Failed to save personal details to sessionStorage", e);
    }
  }

  public static getLastPersonalDetails(): UserDetails | null {
    const storedDetails = this.getStoredPersonalDetails();
    if (storedDetails) {
      return storedDetails;
    }
    return this.lastPersonalDetails;
  }

  private static buildOrderRequest(
    originalFlights: Flight[],
    selectedFlights: Flight[],
    travelStatusAnswers: Answer[],
    informedDateAnswers: Answer[],
    personalDetails: UserDetails,
    bookingNumber: string,
    signature: string,
    termsAccepted: boolean,
    privacyAccepted: boolean,
    marketingAccepted: boolean
  ): OrderClaimRequest {
    const evaluationResponse = this.getLastEvaluationResponse();
    if (!evaluationResponse) {
      throw new Error("Evaluation must be completed before ordering claim.");
    }

    if (!evaluationResponse.information_received_at) {
      throw new Error(
        "Information received date missing from evaluation response."
      );
    }

    let finalBookingNumber = bookingNumber;
    if (!finalBookingNumber) {
      console.warn(
        "Booking number not provided directly, attempting to retrieve from wizard state..."
      );
      const state = useStore.getState();
      try {
        const pnrAnswer = state.wizard.answers.find(
          (a: Answer) => a.id === "booking_number"
        );
        if (pnrAnswer && typeof pnrAnswer.value === "string") {
          finalBookingNumber = pnrAnswer.value;
          console.log(
            "Retrieved booking number from state:",
            finalBookingNumber
          );
        }
      } catch (error) {
        console.error("Error getting booking number from wizard state:", error);
      }
    }

    if (!finalBookingNumber) {
      throw new Error("No booking number available");
    }

    // Validate personal details
    if (!personalDetails) {
      throw new Error("Personal details are required");
    }

    if (
      !personalDetails.firstName ||
      !personalDetails.lastName ||
      !personalDetails.email ||
      !personalDetails.country ||
      !personalDetails.city ||
      !personalDetails.address ||
      !personalDetails.postalCode
    ) {
      throw new Error("Missing required personal details");
    }

    // Get journey fact type from travel status
    const travelStatus = travelStatusAnswers.find(
      (a) => a.id === "travel_status"
    )?.value;

    // Use the journey fact type from the evaluation response
    let journeyFactType = evaluationResponse.journey_fact_type;

    // Ensure all flights have valid IDs
    const validOriginalFlights = originalFlights.filter(
      (f): f is Flight => f !== null && Boolean(f.id) && Boolean(f.flightNumber)
    );

    const validSelectedFlights = selectedFlights.filter(
      (f): f is Flight => f !== null && Boolean(f.id) && Boolean(f.flightNumber)
    );

    // Get flight IDs based on journey fact type
    // Use the journey_booked_flightids from the evaluation response if available
    let journey_booked_flightids: string[] = [];
    if (
      evaluationResponse.journey_booked_flightids &&
      evaluationResponse.journey_booked_flightids.length > 0
    ) {
      journey_booked_flightids = evaluationResponse.journey_booked_flightids;
    } else {
      journey_booked_flightids = validOriginalFlights.map((f) => String(f.id));
    }

    // Validate that we have booked flight IDs
    if (journey_booked_flightids.length === 0) {
      throw new Error("No valid flight IDs found in original flights");
    }

    // Use the journey_fact_flightids from the evaluation response if available
    let journey_fact_flightids: string[] = [];
    if (
      evaluationResponse.journey_fact_flightids &&
      evaluationResponse.journey_fact_flightids.length > 0
    ) {
      journey_fact_flightids = evaluationResponse.journey_fact_flightids;
    } else if (
      journeyFactType === "provided" ||
      travelStatus === "took_alternative_own"
    ) {
      journey_fact_flightids = validSelectedFlights.map((f) => String(f.id));
    } else if (journeyFactType === "self") {
      journey_fact_flightids = validOriginalFlights.map((f) => String(f.id));
    }

    // Log complete request details before sending
    console.log("=== Building Order Request ===", {
      personalDetails,
      journeyFactType,
      travelStatus,
      journey_booked_flightids,
      journey_fact_flightids,
      evaluationResponse: {
        journey_fact_type: evaluationResponse.journey_fact_type,
        journey_fact_flightids: evaluationResponse.journey_fact_flightids,
        journey_booked_flightids: evaluationResponse.journey_booked_flightids,
      },
      marketingAccepted,
      timestamp: new Date().toISOString(),
    });

    // Build the order request with all required fields properly formatted
    const address =
      typeof personalDetails.address === "object" &&
      personalDetails.address !== null
        ? (personalDetails.address as any).street || ""
        : personalDetails.address;

    return {
      journey_booked_flightids,
      journey_fact_flightids,
      information_received_at: evaluationResponse.information_received_at,
      journey_booked_pnr: finalBookingNumber,
      journey_fact_type: journeyFactType,
      travel_status: travelStatus ? String(travelStatus) : undefined,
      guid: evaluationResponse.guid,
      recommendation_guid: evaluationResponse.recommendation_guid,
      owner_salutation: this.mapSalutationToBackend(
        personalDetails.salutation || "herr"
      ),
      owner_firstname: personalDetails.firstName,
      owner_lastname: personalDetails.lastName,
      owner_street: address,
      owner_place: personalDetails.postalCode,
      owner_city: personalDetails.city,
      owner_country: personalDetails.country,
      owner_email: personalDetails.email,
      owner_phone: personalDetails.phone || "",
      owner_marketable_status: Boolean(marketingAccepted),
      arbeitsrecht_marketing_status: marketingAccepted,
      contract_signature: signature,
      contract_tac: termsAccepted,
      contract_dp: privacyAccepted,
      lang: "en",
    };
  }

  /**
   * Gets the HubSpot Contact ID from storage with localStorage fallback
   * This ensures we can recover the Contact ID even if sessionStorage is cleared
   */
  public static getHubspotContactId(): string | null {
    const result = getContactId();
    if (result === null) {
      return null;
    } else if (typeof result === "string") {
      return result;
    } else if (typeof result === "object" && "contactId" in result) {
      // Handle the detailed object format
      return result.contactId;
    }
    return null;
  }

  public static async evaluateClaim(
    originalFlights: Flight[],
    selectedFlights: Flight[],
    travelStatusAnswers: Answer[],
    informedDateAnswers: Answer[],
    marketingAccepted?: boolean
  ): Promise<EvaluateClaimResponse> {
    console.log("=== Evaluating Claim ===", {
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
      marketingAccepted,
    });

    const request = this.buildEvaluateRequest(
      originalFlights,
      selectedFlights,
      travelStatusAnswers,
      informedDateAnswers
    );

    try {
      const response = await api.evaluateEuflightClaim(request);
      console.log("Evaluate claim response:", response);
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

        // Update HubSpot deal with evaluation results
        const dealId = sessionStorage.getItem("hubspot_deal_id");
        if (dealId) {
          try {
            const hubspotResponse = await fetch(
              "/.netlify/functions/hubspot-integration/deal",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  contactId: this.getHubspotContactId(),
                  dealId,
                  originalFlights,
                  selectedFlights,
                  evaluationResponse: evaluateResponse,
                  stage:
                    evaluateResponse.status === "accept"
                      ? "appointmentscheduled"
                      : "1173731568",
                  status:
                    evaluateResponse.status === "accept"
                      ? "qualified"
                      : "rejected",
                }),
              }
            );

            if (!hubspotResponse.ok) {
              console.error(
                "Failed to update HubSpot deal:",
                await hubspotResponse.text()
              );
            }

            // Update contact with marketing status if provided
            if (marketingAccepted !== undefined) {
              const contactId = this.getHubspotContactId();

              // Skip update if no contact ID is available
              if (!contactId) {
                console.warn(
                  "Skipping HubSpot contact marketing status update: No contact ID available"
                );
                return evaluateResponse;
              }

              try {
                // Get email from the last personal details if available
                const personalDetails = this.getLastPersonalDetails();

                // Build payload with contactId definitely
                const payload: Record<string, any> = {
                  contactId,
                  arbeitsrecht_marketing_status: Boolean(marketingAccepted),
                };

                // Add personal details data to payload to help the API
                if (personalDetails) {
                  if (personalDetails.email) {
                    payload.email = personalDetails.email;
                  }
                  if (personalDetails.firstName) {
                    payload.firstname = personalDetails.firstName;
                  }
                  if (personalDetails.lastName) {
                    payload.lastname = personalDetails.lastName;
                  }
                }

                // Also try to find email in other possible locations
                if (!payload.email) {
                  // Try looking in localStorage directly for email
                  try {
                    const emailFromStorage = localStorage.getItem("user_email");
                    if (emailFromStorage) {
                      payload.email = emailFromStorage;
                    }
                  } catch (e) {
                    console.error("Error getting email from localStorage:", e);
                  }
                }

                console.log(
                  "HubSpot contact marketing status update payload:",
                  payload
                );

                const contactResponse = await fetch(
                  "/.netlify/functions/hubspot-integration/contact",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                  }
                );

                if (!contactResponse.ok) {
                  console.error(
                    "Failed to update HubSpot contact marketing status:",
                    await contactResponse.text()
                  );
                }
              } catch (error) {
                console.error("Error updating HubSpot:", error);
              }
            }
          } catch (error) {
            console.error("Error updating HubSpot:", error);
          }
        }

        return evaluateResponse;
      }
      throw new Error("Invalid response format from API");
    } catch (error) {
      console.error("Error evaluating claim:", error);
      throw error;
    }
  }

  public static async orderClaim(
    originalFlights: Flight[],
    selectedFlights: Flight[],
    travelStatusAnswers: Answer[],
    informedDateAnswers: Answer[],
    personalDetails: UserDetails,
    bookingNumber: string,
    signature: string,
    termsAccepted: boolean,
    privacyAccepted: boolean,
    marketingAccepted = false
  ): Promise<OrderClaimResponse> {
    console.log("=== ORDER CLAIM METHOD CALLED ===", {
      timestamp: new Date().toISOString(),
      originalFlights: originalFlights.length,
      selectedFlights: selectedFlights.length,
      personalDetails: {
        firstName: personalDetails.firstName,
        lastName: personalDetails.lastName,
        email: personalDetails.email,
      },
      bookingNumber,
      termsAccepted,
      privacyAccepted,
      marketingAccepted,
    });

    try {
      // Build the request payload for Captain Frank API
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

      // Get the stored evaluation response
      const evaluationResponse = this.getLastEvaluationResponse();

      // Submit to Captain Frank API
      const response = await api.orderEuflightClaim(request);

      console.log("=== ORDER CLAIM RESPONSE FROM API ===");
      console.log(JSON.stringify(response, null, 2));
      console.log("=====================================");

      // If Captain Frank API call is successful, update HubSpot
      if (response.data) {
        const dealId = sessionStorage.getItem("hubspot_deal_id");
        if (dealId) {
          try {
            // First update the contact
            const contactResponse = await fetch(
              "/.netlify/functions/hubspot-integration/contact",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  contactId: this.getHubspotContactId(),
                  email: personalDetails.email,
                  firstname: personalDetails.firstName,
                  lastname: personalDetails.lastName,
                  salutation: personalDetails.salutation,
                  phone: personalDetails.phone || "",
                  mobilephone: personalDetails.phone || "",
                  address: personalDetails.address || "",
                  city: personalDetails.city || "",
                  postalCode: personalDetails.postalCode || "",
                  country: personalDetails.country || "",
                  arbeitsrecht_marketing_status: Boolean(marketingAccepted),
                }),
              }
            );

            if (!contactResponse.ok) {
              console.error(
                "Failed to update HubSpot contact:",
                await contactResponse.text()
              );
              // Continue despite the error
              console.warn("Continuing despite HubSpot contact update failure");
            } else {
              console.log("Successfully updated HubSpot contact");
            }

            // Then update the deal
            try {
              const hubspotResponse = await fetch(
                "/.netlify/functions/hubspot-integration/deal",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    contactId: this.getHubspotContactId(),
                    dealId,
                    personalDetails,
                    bookingNumber,
                    originalFlights,
                    selectedFlights,
                    evaluationResponse,
                    stage:
                      evaluationResponse?.status === "accept"
                        ? "closedwon"
                        : "1173731568",
                    status:
                      evaluationResponse?.status === "accept"
                        ? "submitted"
                        : "rejected",
                    arbeitsrecht_marketing_status: Boolean(marketingAccepted),
                  }),
                }
              );

              if (!hubspotResponse.ok) {
                console.error(
                  "Failed to update HubSpot deal:",
                  await hubspotResponse.text()
                );
                // Continue despite the error
                console.warn("Continuing despite HubSpot deal update failure");
              } else {
                console.log("Successfully updated HubSpot deal");
              }
            } catch (hubspotError) {
              // Log but don't rethrow to allow Captain Frank claim to succeed
              console.error("Error updating HubSpot deal:", hubspotError);
            }
          } catch (error) {
            console.error("Error updating HubSpot deal:", error);
          }
        }
      }

      return response;
    } catch (error) {
      console.error("Error submitting claim:", error);
      throw error;
    }
  }

  // Static selectors for convenience
  static getWizardAnswers = (state: Store): Answer[] =>
    state.wizard?.answers || [];

  static getTravelStatusAnswers = (state: Store): Answer[] =>
    state.wizard?.answers?.filter((a: Answer) =>
      ["travel_status", "refund_status", "ticket_cost"].includes(a.id)
    ) || [];
}
