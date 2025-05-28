"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { PhaseNavigation } from "@/components/shared/navigation/PhaseNavigation";
import { SpeechBubble } from "@/components/ui/display/SpeechBubble";
import { BackButton } from "@/components/ui/button/BackButton";
import { AccordionCardClient } from "@/components/shared/accordion/AccordionCardClient";
import { ModularFlightSelector } from "@/components/shared/ModularFlightSelector";
import { SlideSheet } from "@/components/ui/layout/SlideSheet";
import useStore, { useFlight, useNavigation, useValidation } from "@/store";
import { useTranslation } from "@/hooks/useTranslation";
import { useUniversalNavigation } from "@/utils/navigation";
import { ContinueButton } from "@/components/ui/button/ContinueButton";
import { formatDateForDisplay } from "@/utils/dateUtils";
import { ValidationPhase } from "@/types/shared/validation";
import type { Location } from "@/types/shared/location";
import type { Flight, FlightSegment, FlightType } from "@/store/types";
import { Input } from "@/components/ui/input/Input";
import { AccordionProvider } from "@/components/shared/accordion/AccordionContext";
import { FlightNotListedForm } from "@/components/shared/ModularFlightSelector/FlightNotListedForm";
import type { FlightNotListedData } from "@/components/shared/ModularFlightSelector/FlightNotListedForm";

// Helper function to interpolate placeholders in translation strings
const formatTranslation = (
  translation: string,
  values: Record<string, string | number>
) => {
  return Object.entries(values).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`{${key}}`, "g"), String(value));
  }, translation);
};

export default function FlightDetailsPage() {
  const { t } = useTranslation();
  const { navigateToPhase } = useUniversalNavigation();
  const router = useRouter();
  const isInitializedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isFlightSegmentsValid, setIsFlightSegmentsValid] = useState(false);
  const [isFlightNotListedOpen, setIsFlightNotListedOpen] = useState(false);

  // Get store slices
  const flightState = useFlight();
  const navigation = useNavigation();
  const validation = useValidation();

  // Get user details from store for prefilling
  const userDetails = useStore((state) => state.user.details);

  // Create prefilled data from user store
  const prefilledData: FlightNotListedData | null = useMemo(() => {
    if (userDetails) {
      return {
        salutation: userDetails.salutation || "",
        firstName: userDetails.firstName || "",
        lastName: userDetails.lastName || "",
        email: userDetails.email || "",
        description: "",
      };
    }
    return null;
  }, [userDetails]);

  // Use the main store for booking number to ensure persistence
  const bookingNumber = useStore((state) => state.flight.bookingNumber || "");

  // Define the setter function separately to avoid re-renders
  const setBookingNumber = useCallback((value: string) => {
    useStore.setState((state) => ({
      flight: {
        ...state.flight,
        bookingNumber: value,
        lastUpdate: Date.now(),
      },
    }));
  }, []);

  // Check if we need to show the accordion
  const shouldShowAccordion = useRef(true);

  // Handle booking number change
  const handleBookingNumberChange = useCallback(
    (value: string) => {
      setBookingNumber(value);
    },
    [setBookingNumber]
  );

  // Check if current segments are valid
  const validateSegments = useCallback((): boolean => {
    if (flightState.segments.length === 0) {
      return false;
    }

    // For direct flights, we need one segment with origin, destination, and flight details
    if (flightState.type === "direct") {
      const segment = flightState.segments[0];
      return segment &&
        segment.origin &&
        segment.origin.code &&
        segment.destination &&
        segment.destination.code &&
        segment.flightNumber &&
        segment.departureTime &&
        segment.arrivalTime
        ? true
        : false;
    }

    // For multi-segment flights, we need at least 2 segments, and all must have
    // origin, destination, and flight details
    if (flightState.type === "multi") {
      return (
        flightState.segments.length >= 2 &&
        flightState.segments.every(
          (segment) =>
            segment.origin &&
            segment.origin.code &&
            segment.destination &&
            segment.destination.code &&
            segment.flightNumber &&
            segment.departureTime &&
            segment.arrivalTime
        )
      );
    }

    return false;
  }, [flightState.segments, flightState.type]);

  // Initialize component and set initial flight segment validation status
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Clear any navigation locks
    console.log("=== Flight Details - Initializing ===");

    // Initialize the validation state for this phase
    validation.setStepValidation(ValidationPhase.FLIGHT_DETAILS, false);

    // Check if we need to initialize segments
    if (flightState.segments.length === 0) {
      // Create a temporary location to satisfy type requirements
      const emptyLocation = {
        id: "",
        name: "",
        code: "",
        city: "",
        country: "",
        timezone: "",
        type: "airport" as const,
      };

      // No segments, we need to create a default segment
      flightState.setFlightType("direct");
      flightState.addFlightSegment({
        id: `seg-${Date.now()}`,
        origin: emptyLocation,
        destination: emptyLocation,
        departureTime: "",
        arrivalTime: "",
        flightNumber: "",
        airline: { name: "", code: "" },
        duration: "",
        stops: 0,
      });
    }

    // Set initial flight segments validation state based on existing data
    const areFlightSegmentsValid = validateSegments();
    setIsFlightSegmentsValid(areFlightSegmentsValid);
    console.log(
      "[FlightDetailsPage] Initial flight segments validation:",
      areFlightSegmentsValid
    );

    // Save the current flight data for this phase
    flightState.setPhaseData(ValidationPhase.FLIGHT_DETAILS, {
      segments: flightState.segments,
      type: flightState.type,
      selectedFlights: flightState.selectedFlights[0] || [],
    });

    // Clean up on unmount
    return () => {
      console.log("=== Flight Details - Cleanup ===");
    };
  }, [flightState, validation, validateSegments]);

  // Handle back button click
  const handleBack = async () => {
    setIsLoading(true);

    try {
      // Navigate to the previous phase
      navigation.setCurrentPhase(ValidationPhase.COMPENSATION_ESTIMATE);
      navigateToPhase(ValidationPhase.COMPENSATION_ESTIMATE);
    } catch (error) {
      console.error("Error navigating back:", error);
      setIsLoading(false);
    }
  };

  // Handle continue button click
  const handleContinue = async () => {
    setIsLoading(true);

    try {
      // --- Save original flights before navigating ---
      const { segments: finalSegments, selectedFlights: finalSelectedFlights } =
        useStore.getState().flight;
      const flightsToSave: Flight[] = [];

      // Iterate through segments and get selected flights from the selectedFlights record
      finalSegments.forEach((segment, index) => {
        const selectedForSegment = finalSelectedFlights[index];
        if (selectedForSegment && selectedForSegment.length > 0) {
          // Assuming only one flight is selected per segment for original journey
          flightsToSave.push(selectedForSegment[0]);
        }
      });

      if (flightsToSave.length > 0) {
        console.log(
          "[FlightDetailsPage] Saving original flights:",
          flightsToSave.map((f) => ({ id: f.id, flightNumber: f.flightNumber }))
        );
        // Now call the correctly typed action via the main store actions
        useStore.getState().actions.flight.setOriginalFlights(flightsToSave);
      } else {
        console.warn(
          "[FlightDetailsPage] No selected flights found in state to save as originalFlights."
        );
        // Optionally clear originalFlights if none are selected?
        useStore.getState().actions.flight.setOriginalFlights([]); // Or handle as needed
      }
      // -----------------------------------------------

      // Set the validation state
      validation.setStepValidation(ValidationPhase.FLIGHT_DETAILS, true);
      validation.setStepCompleted(ValidationPhase.FLIGHT_DETAILS, true);

      // Mark this phase as completed
      navigation.addCompletedPhase(ValidationPhase.FLIGHT_DETAILS);

      // Navigate to the next phase
      navigation.setCurrentPhase(ValidationPhase.TRIP_EXPERIENCE);
      navigateToPhase(ValidationPhase.TRIP_EXPERIENCE);
    } catch (error) {
      console.error("Error navigating to next phase:", error);
      setIsLoading(false);
      setShowError(true);
    }
  };

  // Check if booking number is valid
  const isBookingNumberValid =
    !!bookingNumber &&
    (bookingNumber.trim().length === 6 || bookingNumber.trim().length === 13) &&
    /^[A-Z0-9]+$/i.test(bookingNumber.trim());

  // Define a custom hook to manage flight selector state
  const useFlightSelectorWithoutInfiniteLoop = () => {
    // Use local state to track if validation has been triggered
    const [hasInteracted, setHasInteracted] = useState(false);

    // Store the initial config once
    const config = useMemo(
      () => ({
        phase: 3,
        currentPhase: 3,
        showFlightSearch: true,
      }),
      []
    );

    // Create handlers with proper memoization to avoid unnecessary updates
    const handleFlightTypeChange = useCallback(
      (type: "direct" | "multi") => {
        console.log("[FlightDetailsPage] Setting flight type:", type);
        flightState.setFlightType(type);
      },
      [flightState]
    );

    const handleInteract = useCallback(() => {
      if (!hasInteracted) {
        console.log("[FlightDetailsPage] Setting flight interaction");
        setHasInteracted(true);
        validation.setStepInteraction(ValidationPhase.FLIGHT_DETAILS, true);
      }
    }, [validation, hasInteracted]);

    // Create a validation handler that captures ModularFlightSelector's validation
    const handleValidationChange = useCallback((isValid: boolean) => {
      console.log(
        `[FlightDetailsPage] ModularFlightSelector validation: ${isValid}`
      );
      setIsFlightSegmentsValid(isValid);
    }, []);

    return {
      ...config,
      onFlightTypeChange: handleFlightTypeChange,
      onInteract: handleInteract,
      // Pass setIsFlightNotListedOpen to the component
      setIsFlightNotListedOpen,
      // Set our validation state handler instead of undefined
      setValidationState: handleValidationChange,
    };
  };

  // Instead, we'll use a useEffect to update the store validation state based on our combined validation
  useEffect(() => {
    if (!isInitializedRef.current) return;

    // Calculate the validation state inside the effect to avoid circular dependencies
    const canContinueValue = isFlightSegmentsValid && isBookingNumberValid;

    // Update store validation state based on our combined validation
    const currentIsValid =
      validation.stepValidation[ValidationPhase.FLIGHT_DETAILS];

    if (canContinueValue !== currentIsValid) {
      console.log(
        `[FlightDetailsPage] Updating store validation for FLIGHT_DETAILS: ${canContinueValue} (flight: ${isFlightSegmentsValid}, booking: ${isBookingNumberValid})`
      );
      validation.setStepValidation(
        ValidationPhase.FLIGHT_DETAILS,
        canContinueValue
      );
    }
  }, [isFlightSegmentsValid, isBookingNumberValid, validation]);

  // Use the custom hook to get config
  const flightSelectorConfig = useFlightSelectorWithoutInfiniteLoop();

  // Calculate if the user can continue based on our validations
  const canContinue = isFlightSegmentsValid && isBookingNumberValid;

  // Handler for flight not listed form submission
  const handleFlightNotListedSubmit = useCallback(
    async (data: FlightNotListedData) => {
      try {
        console.log("Flight not listed data submitted:", data);
        // Here you would normally send this data to your backend
        // For now, we'll just store it in localStorage
        localStorage.setItem(
          "flight_not_found_data_description",
          data.description
        );

        // Close the modal
        setIsFlightNotListedOpen(false);

        // Show a success message or redirect
        alert(
          t(
            "flightSelector.flightNotListed.successMessage",
            "Your flight information has been submitted. We will contact you shortly."
          )
        );
      } catch (error) {
        console.error("Error submitting flight not listed data:", error);
      }
    },
    [t]
  );

  return (
    <AccordionProvider>
      <div className="flex flex-col min-h-screen">
        <div>
          <PhaseNavigation
            phase={ValidationPhase.FLIGHT_DETAILS}
            translations={{
              title: t("phases.flightDetails.title"),
              description: t("phases.flightDetails.description"),
              back: t("common.back"),
              continue: t("common.continue"),
            }}
          />
        </div>

        <div className="container mx-auto py-6 flex-grow">
          <div className="max-w-4xl mx-auto">
            <SpeechBubble message={t("phases.flightDetails.speechBubble")} />

            <AccordionCardClient
              title={t("phases.flightDetails.steps.flightSelection.title")}
              subtitle={t("phases.flightDetails.description")}
              eyebrow={t("phases.flightDetails.steps.flightSelection.eyebrow")}
              summary={
                flightState.type === "direct"
                  ? (() => {
                      const segment = flightState.segments[0] || {};
                      // Create a custom formatted summary with the available data
                      if (segment?.flightNumber || segment?.airline?.name) {
                        const airlineText = segment?.airline?.name || "";
                        const flightText = segment?.flightNumber
                          ? ` ${segment.flightNumber}`
                          : "";
                        const routeText =
                          segment?.origin?.code && segment?.destination?.code
                            ? ` • ${segment.origin.code} → ${segment.destination.code}`
                            : "";

                        return `${airlineText}${flightText}${routeText}`;
                      }
                      // If just route data is available
                      else if (
                        segment?.origin?.code &&
                        segment?.destination?.code
                      ) {
                        return `${segment.origin.code} → ${segment.destination.code}`;
                      }
                      // Fallback
                      else {
                        return t(
                          "phases.flightDetails.steps.flightSelection.title"
                        );
                      }
                    })()
                  : (() => {
                      // For multi-segment flights
                      if (flightState.segments.length === 0) {
                        return t(
                          "phases.flightDetails.steps.flightSelection.title"
                        );
                      }

                      // Filter out segments with incomplete data
                      const validSegments = flightState.segments
                        .filter((s) => s.origin?.code && s.destination?.code)
                        .map((s) => `${s.origin.code} → ${s.destination.code}`);

                      if (validSegments.length === 0) {
                        return t(
                          "phases.flightDetails.steps.flightSelection.title"
                        );
                      }

                      return `${
                        validSegments.length
                      } flights: ${validSegments.join(", ")}`;
                    })()
              }
              isCompleted={validateSegments()}
              isValid={validateSegments()}
              isOpenByDefault={!validateSegments()}
              className="mb-6"
              stepId="1"
              onInteraction={() => {
                validation.setStepInteraction(
                  ValidationPhase.FLIGHT_DETAILS,
                  true
                );
              }}
            >
              <div className="p-4">
                <ModularFlightSelector {...flightSelectorConfig} />
              </div>
            </AccordionCardClient>

            {shouldShowAccordion.current && (
              <AccordionCardClient
                title={t("phases.flightDetails.steps.bookingNumber.title")}
                subtitle={t(
                  "phases.flightDetails.steps.bookingNumber.validation.format"
                )}
                eyebrow={t("phases.flightDetails.steps.bookingNumber.eyebrow")}
                summary={
                  bookingNumber ||
                  t("phases.flightDetails.steps.bookingNumber.placeholder")
                }
                isCompleted={isBookingNumberValid}
                isValid={isBookingNumberValid}
                isOpenByDefault={!isBookingNumberValid}
                className="mb-4"
                stepId="2"
                onInteraction={() => {
                  validation.setStepInteraction(
                    ValidationPhase.FLIGHT_DETAILS,
                    true
                  );
                }}
              >
                <div className="p-4">
                  <Input
                    label={t("phases.flightDetails.steps.bookingNumber.label")}
                    value={bookingNumber}
                    onChange={handleBookingNumberChange}
                    required={false}
                    error={null}
                  />
                </div>
              </AccordionCardClient>
            )}

            {showError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      {t("errors.general")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8">
              <BackButton
                onClick={handleBack}
                disabled={isLoading}
                text={t("common.back")}
              />
              <ContinueButton
                onClick={handleContinue}
                isLoading={isLoading}
                disabled={!canContinue}
              />
            </div>
          </div>
        </div>

        {/* Flight Not Listed Modal */}
        <SlideSheet
          isOpen={isFlightNotListedOpen}
          onClose={() => setIsFlightNotListedOpen(false)}
        >
          <FlightNotListedForm
            onSubmit={handleFlightNotListedSubmit}
            prefilledData={prefilledData}
          />
        </SlideSheet>
      </div>
    </AccordionProvider>
  );
}
