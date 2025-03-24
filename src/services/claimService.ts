import type { Flight, PassengerDetails } from "@/types/store";
import type { Answer } from "@/types/wizard";
import api from "@/services/api";
import useStore from "@/lib/state/store";
import { getContactId } from "@/utils/contactId";

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
      (a) => a.questionId === "travel_status"
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

  private static getInformationReceivedDate(
    informedDateAnswers: Answer[],
    originalFlights: Flight[]
  ): string {
    // First try to get specific date from answers
    const specificDate = informedDateAnswers.find(
      (a) => a.questionId === "specific_informed_date"
    )?.value;

    if (specificDate) {
      return String(specificDate);
    }

    // Try to get date from the first flight
    if (originalFlights?.[0]?.date) {
      return originalFlights[0].date.split("T")[0];
    }

    if (originalFlights?.[0]?.departureTime) {
      return originalFlights[0].departureTime.split(" ")[0];
    }

    // If we can't get a valid date, throw an error
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
        date: f.date || f.departureTime,
      })),
      selectedFlights: selectedFlights.map((f) => ({
        id: f.id,
        flightNumber: f.flightNumber,
      })),
    });

    const journeyFactType = this.getJourneyFactType(travelStatusAnswers);
    const travelStatus = travelStatusAnswers.find(
      (a) => a.questionId === "travel_status"
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
        date: f.date || f.departureTime,
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

  private static lastEvaluateResponse: EvaluateClaimResponse | null = null;
  private static lastPersonalDetails: PassengerDetails | null = null;

  private static getStoredEvaluationResponse(): EvaluateClaimResponse | null {
    const stored = sessionStorage.getItem("claim_evaluation_response");
    console.log("Getting stored evaluation response:", stored);
    if (!stored) return null;
    try {
      const response = JSON.parse(stored) as EvaluateClaimResponse;
      console.log("Successfully parsed stored evaluation response:", response);
      return response;
    } catch (error) {
      console.error("Error parsing stored evaluation response:", error);
      return null;
    }
  }

  public static setStoredEvaluationResponse(
    response: EvaluateClaimResponse
  ): void {
    console.log("Storing evaluation response:", response);
    sessionStorage.setItem(
      "claim_evaluation_response",
      JSON.stringify(response)
    );
    this.lastEvaluateResponse = response;

    // Update store flags based on evaluation status
    useStore.setState({
      _isClaimSuccess: response.status === "accept",
      _isClaimRejected: response.status === "reject",
    });
  }

  public static getLastEvaluationResponse(): EvaluateClaimResponse | null {
    try {
      // If we already have the response in memory, return it without logging
      if (this.lastEvaluateResponse) {
        return this.lastEvaluateResponse;
      }

      // Try to get from sessionStorage
      console.log("Getting last evaluation response...");
      console.log("In-memory response:", this.lastEvaluateResponse);
      const storedResponse = this.getStoredEvaluationResponse();

      if (storedResponse) {
        // Validate the response structure
        if (!storedResponse.status) {
          console.error("Invalid evaluation response: missing status field");
          return null;
        }

        // Validate that status is one of the expected values
        if (
          storedResponse.status !== "accept" &&
          storedResponse.status !== "reject"
        ) {
          console.error(`Invalid evaluation status: ${storedResponse.status}`);
          return null;
        }

        // For 'accept' status, ensure contract exists
        if (storedResponse.status === "accept" && !storedResponse.contract) {
          console.error("Invalid accept response: missing contract details");
          return null;
        }

        // Cache the response in memory to avoid repeated storage access
        this.lastEvaluateResponse = storedResponse;
        console.log("Final response:", storedResponse);

        // Update store flags based on evaluation status
        useStore.setState({
          _isClaimSuccess: storedResponse.status === "accept",
          _isClaimRejected: storedResponse.status === "reject",
        });

        return storedResponse;
      }

      return null;
    } catch (error) {
      console.error("Error retrieving evaluation response:", error);
      return null;
    }
  }

  private static getStoredPersonalDetails(): PassengerDetails | null {
    const stored = sessionStorage.getItem("claim_personal_details");
    console.log("Getting stored personal details:", stored);
    if (!stored) return null;
    try {
      const details = JSON.parse(stored) as PassengerDetails;
      console.log("Successfully parsed stored personal details:", details);
      return details;
    } catch (error) {
      console.error("Error parsing stored personal details:", error);
      return null;
    }
  }

  public static setStoredPersonalDetails(details: PassengerDetails): void {
    console.log("Storing personal details:", details);
    sessionStorage.setItem("claim_personal_details", JSON.stringify(details));
    this.lastPersonalDetails = details;
  }

  public static getLastPersonalDetails(): PassengerDetails | null {
    console.log("Getting last personal details...");
    console.log("In-memory details:", this.lastPersonalDetails);

    // First try using the in-memory cached details
    if (this.lastPersonalDetails) {
      return this.lastPersonalDetails;
    }

    // Then try getting from session storage
    const storedDetails = this.getStoredPersonalDetails();
    if (storedDetails) {
      // Cache for future use
      this.lastPersonalDetails = storedDetails;
      return storedDetails;
    }

    // Try getting from localStorage as a fallback
    try {
      // Try to get from various phase states that might contain personal details
      const sources = [
        "phase1State",
        "phase2State",
        "phase3State",
        "phase4State",
        "personalDetails",
      ];

      for (const source of sources) {
        const stateStr = localStorage.getItem(source);
        if (stateStr) {
          try {
            const state = JSON.parse(stateStr);

            // Check if it contains personal details
            if (state.personalDetails) {
              console.log(
                `Found personal details in ${source}:`,
                state.personalDetails
              );
              const details = state.personalDetails;

              // Only consider it valid if it has at least email
              if (details.email) {
                // Store it in sessionStorage for future use
                this.setStoredPersonalDetails(details);
                return details;
              }
            }

            // Check direct personal fields at root level
            if (state.firstName && state.lastName && state.email) {
              console.log(`Found personal details fields in ${source}`);
              const details = {
                firstName: state.firstName,
                lastName: state.lastName,
                email: state.email,
                salutation: state.salutation || "",
                phone: state.phone || "",
                address: state.address || "",
                city: state.city || "",
                postalCode: state.postalCode || "",
                country: state.country || "",
              };

              // Store it in sessionStorage for future use
              this.setStoredPersonalDetails(details);
              return details;
            }
          } catch (error) {
            console.error(`Error parsing ${source}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(
        "Error looking for personal details in localStorage:",
        error
      );
    }

    console.log("No personal details found");
    return null;
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
    // Get the stored evaluation response
    const evaluationResponse = this.getLastEvaluationResponse();
    if (!evaluationResponse) {
      throw new Error(
        "No evaluation response available. Please complete the trip experience phase first."
      );
    }

    // Try to get booking number from phase 3 state if not provided
    let finalBookingNumber = bookingNumber;
    try {
      if (!finalBookingNumber) {
        const phase3State = localStorage.getItem("phase3State");
        if (phase3State) {
          const parsedState = JSON.parse(phase3State);
          finalBookingNumber = parsedState.bookingNumber;
        }
      }
    } catch (error) {
      console.error("Error getting booking number from phase 3 state:", error);
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
      !personalDetails.address
    ) {
      throw new Error("Missing required personal details");
    }

    // Get journey fact type from travel status
    const travelStatus = travelStatusAnswers.find(
      (a) => a.questionId === "travel_status"
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
    return {
      journey_booked_flightids,
      journey_fact_flightids,
      information_received_at: evaluationResponse.information_received_at,
      journey_booked_pnr: finalBookingNumber,
      journey_fact_type: journeyFactType,
      travel_status: travelStatus ? String(travelStatus) : undefined,
      guid: evaluationResponse.guid,
      recommendation_guid: evaluationResponse.recommendation_guid,
      owner_salutation: this.mapSalutationToBackend(personalDetails.salutation),
      owner_firstname: personalDetails.firstName,
      owner_lastname: personalDetails.lastName,
      owner_street: personalDetails.address || "",
      owner_place: personalDetails.postalCode || "",
      owner_city: personalDetails.city || "",
      owner_country: personalDetails.country || "",
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
    personalDetails: PassengerDetails,
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

      // If the response has an error message but no data, log it but don't throw
      if (response.message && !response.data) {
        console.warn(
          "API returned an error but we'll continue:",
          response.message
        );

        // Create a minimal valid response object so the UI can continue
        if (!response.data) {
          response.data = {
            guid: `temp-${Date.now()}`,
            recommendation_guid: `rec-${Date.now()}`,
          };
        }
      }

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

      // Return a response object instead of throwing so the app doesn't crash
      return {
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
