"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import type { ReactElement } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { useUniversalNavigation } from "@/utils/navigation";
import { Answer, Question } from "@/types/shared/wizard";
import {
  Flight,
  FlightState,
  WizardState,
  ValidationState,
  FlightSegment,
  FlightLocation,
} from "@/store/types";
import { Phase4QAWizard } from "@/components/shared/wizard/Phase4QAWizard";
import { PhaseGuard, PhaseGuardProps } from "@/components/shared/PhaseGuard";
import { AccordionCardClient } from "@/components/shared/accordion/AccordionCardClient";
import { SpeechBubble } from "@/components/ui/display/SpeechBubble";
import { ContinueButton } from "@/components/ui/button/ContinueButton";
import { BackButton } from "@/components/ui/button/BackButton";
import { PhaseNavigation } from "@/components/shared/navigation/PhaseNavigation";
import { SlideSheet } from "@/components/ui/layout/SlideSheet";
import { Input } from "@/components/ui/input/Input";
import { Button } from "@/components/ui/button/Button";
import { Select } from "@/components/ui/input/Select";
import { accordionConfig } from "@/config/accordion";
import { isValidYYYYMMDD, formatDateToYYYYMMDD } from "@/utils/dateUtils";
import { AccordionProvider } from "@/components/shared/accordion/AccordionContext";
import { useStore, useFlight, useWizard, useValidation } from "@/store";
import { ValidationPhase } from "@/types/shared/validation";
import { tripExperienceQuestions } from "@/components/shared/wizard/Phase4QAWizard/tripExperienceQuestions";
import { Success } from "@/components/shared/wizard/Success";
import { FlightNotListedForm } from "@/components/shared/ModularFlightSelector/FlightNotListedForm";
import type { FlightNotListedData } from "@/components/shared/ModularFlightSelector/FlightNotListedForm";

// Log to console to verify the questions are loaded
console.log("TripExperiencePage - Questions:", {
  count: tripExperienceQuestions.length,
  ids: tripExperienceQuestions.map((q) => q.id),
});

// Extend Window interface to include _handlingSharedLink
declare global {
  interface Window {
    _handlingSharedLink?: boolean;
    __accordionContext?: { setActiveAccordion: (step: string) => void };
    _sharedLinkProcessed?: boolean;
  }
}

// Add a function to ensure alternative flights are properly synchronized
const syncAlternativeFlights = (
  flights: Flight[],
  flightActions: any,
  wizardActions: any
) => {
  if (!flights || flights.length === 0) {
    console.log("=== Syncing Alternative Flights - No flights to sync ===", {
      timestamp: new Date().toISOString(),
    });
    return;
  }

  console.log("=== Syncing Alternative Flights ===", {
    flights: flights.map((f: any) => ({
      id: f.id,
      flightNumber: f.flightNumber,
      date: f.date,
    })),
    timestamp: new Date().toISOString(),
  });

  // IMPORTANT: Only update the phase4 flights in flightStore
  // but don't override the original flights which are phase3 flights
  flightActions.setSelectedFlights(flights);

  // No need to update localStorage as the store handles persistence
};

// Add helper function to convert Location to FlightLocation
const toFlightLocation = (loc: any | null): FlightLocation | null => {
  if (!loc) return null;
  return {
    id: loc.id || "",
    name: loc.name || "",
    code: loc.code || "",
    city: loc.city || "",
    country: loc.country || "",
    timezone: loc.timezone || "",
    type: loc.type || "airport",
  };
};

export default function TripExperiencePage(): ReactElement {
  const { t } = useTranslation();
  const { navigateToPhase } = useUniversalNavigation();
  const router = useRouter();
  const params = useParams();
  const lang = params?.lang?.toString() || "";
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Add flight not listed modal state
  const [isFlightNotListedOpen, setIsFlightNotListedOpen] = useState(false);

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

  // Access store values directly
  const flight = useFlight();
  const wizard = useWizard();
  const validation = useValidation();
  const store = useStore();

  // Destructure specific values we need
  const originalFlights: Flight[] = useMemo(() => {
    if (!flight.originalFlights) return [];
    return flight.originalFlights[0] || [];
  }, [flight.originalFlights]);
  const selectedFlights: Flight[] = useMemo(() => {
    if (!flight.selectedFlights) return [];
    return Object.values(flight.selectedFlights || {}).flat();
  }, [flight.selectedFlights]);
  const isComplete = wizard.isComplete ?? false;

  const isInitializedRef = useRef(false);
  const sharedFlightProcessedRef = useRef(false);

  // Create state for our wizard phases
  const [travelStatusAnswers, setTravelStatusAnswers] = useState<Answer[]>([]);
  const [informedDateAnswers, setInformedDateAnswers] = useState<Answer[]>([]);
  const [travelStatusStepValidation, setTravelStatusStepValidation] = useState<
    Record<string, boolean>
  >({});
  const [informedDateStepValidation, setInformedDateStepValidation] = useState<
    Record<string, boolean>
  >({});
  const [travelStatusStepInteraction, setTravelStatusStepInteraction] =
    useState<Record<string, boolean>>({});
  const [informedDateStepInteraction, setInformedDateStepInteraction] =
    useState<Record<string, boolean>>({});

  // --- NEW: Local state for Phase 4 alternative flight segments ---
  const [alternativeFlights, setAlternativeFlights] = useState<FlightSegment[]>(
    []
  );

  // Reference to track pending flight selections
  const pendingFlightSelectionRef = useRef<FlightSegment[] | null>(null);

  // Create a stable callback handler for alternative flights changes
  const handleAlternativeFlightsChange = useCallback(
    (segments: FlightSegment[]) => {
      // Store changes in the ref first to avoid state updates during render
      pendingFlightSelectionRef.current = segments;

      // Use setTimeout to defer the state update after render
      setTimeout(() => {
        if (pendingFlightSelectionRef.current) {
          console.log(
            "[TripExperiencePage] Updating alternative flights:",
            pendingFlightSelectionRef.current
          );
          setAlternativeFlights(pendingFlightSelectionRef.current);
          // Clear the ref after using it
          pendingFlightSelectionRef.current = null;
        }
      }, 0);
    },
    []
  );

  // Add an effect to handle initializing alternative flight segments
  useEffect(() => {
    // Don't run if we're still loading
    if (isLoading || !isInitialized) return;

    // Check if we need to synchronize stored alternative flights
    const travelStatus = travelStatusAnswers.find(
      (a: Answer) => a.questionId === "travel_status"
    )?.value;

    // Get phase4 store to check if we have alternate flights but local state is empty
    const phase4 = store.phase4;
    const hasPhase4AlternativeFlights =
      (phase4.selectedType === "direct" &&
        phase4.directFlight?.selectedFlight) ||
      (phase4.selectedType === "multi" &&
        phase4.flightSegments.some((s) => s.selectedFlight));

    const needsAlternativeFlights =
      (travelStatus === "provided" ||
        travelStatus === "took_alternative_own") &&
      alternativeFlights.length === 0 &&
      hasPhase4AlternativeFlights;

    if (needsAlternativeFlights) {
      console.log("=== Initializing alternative flights from phase4 store ===");

      try {
        // Use setTimeout to prevent setState during render
        setTimeout(() => {
          // Map phase4 format to FlightSegment format
          const newSegments: FlightSegment[] = [];

          if (
            phase4.selectedType === "direct" &&
            phase4.directFlight?.selectedFlight
          ) {
            const flight = phase4.directFlight;
            newSegments.push({
              id: `alt-direct-${Date.now()}`,
              origin: toFlightLocation(flight.fromLocation),
              destination: toFlightLocation(flight.toLocation),
              departureTime: flight.date || "",
              arrivalTime: flight.selectedFlight?.arrivalTime || "",
              flightNumber: flight.selectedFlight?.flightNumber || "",
              airline: flight.selectedFlight?.airline || { name: "", code: "" },
              duration: flight.selectedFlight?.duration || "",
              stops: flight.selectedFlight?.stops || 0,
              selectedFlight: flight.selectedFlight,
            } as FlightSegment);
          } else if (phase4.selectedType === "multi") {
            // Map multi-segment flights
            phase4.flightSegments.forEach((flight, index) => {
              if (flight.selectedFlight) {
                newSegments.push({
                  id: `alt-multi-${index}-${Date.now()}`,
                  origin: toFlightLocation(flight.fromLocation),
                  destination: toFlightLocation(flight.toLocation),
                  departureTime: flight.date || "",
                  arrivalTime: flight.selectedFlight?.arrivalTime || "",
                  flightNumber: flight.selectedFlight?.flightNumber || "",
                  airline: flight.selectedFlight?.airline || {
                    name: "",
                    code: "",
                  },
                  duration: flight.selectedFlight?.duration || "",
                  stops: flight.selectedFlight?.stops || 0,
                  selectedFlight: flight.selectedFlight,
                } as FlightSegment);
              }
            });
          }

          if (newSegments.length > 0) {
            console.log(
              `=== Setting ${newSegments.length} alternative flights from store ===`
            );
            setAlternativeFlights(newSegments);
          }
        }, 0);
      } catch (error) {
        console.error("Error initializing alternative flights:", error);
      }
    }
  }, [
    isLoading,
    isInitialized,
    travelStatusAnswers,
    alternativeFlights.length,
    store.phase4,
  ]);

  // Define questions for the informed date wizard
  const informedDateQuestions: Question[] = useMemo(
    () => [
      {
        id: "informed_date",
        text: t(
          "phases.tripExperience.steps.informedDate.questions.informedDate.title"
        ),
        type: "radio",
        options: [
          {
            id: "on_departure",
            value: "on_departure",
            label: t(
              "phases.tripExperience.steps.informedDate.questions.informedDate.options.onDeparture"
            ),
            showCheck: true,
          },
          {
            id: "specific_date",
            value: "specific_date",
            label: t(
              "phases.tripExperience.steps.informedDate.questions.informedDate.options.specificDate"
            ),
            showCheck: true,
          },
        ],
        required: true,
      },
      {
        id: "specific_informed_date",
        text: t(
          "phases.tripExperience.steps.informedDate.questions.specificInformedDate.title"
        ),
        label: t(
          "phases.tripExperience.steps.informedDate.questions.specificInformedDate.label"
        ),
        type: "date",
        options: [],
        required: true,
        showIf: (answers: Record<string, Answer>) =>
          answers["informed_date"]?.value === "specific_date",
      },
    ],
    [t]
  );

  // Helper for updating validation state
  const updateValidationState = (updates: any) => {
    // Update the local state
    if (updates.travelStatusAnswers) {
      setTravelStatusAnswers(updates.travelStatusAnswers);
    }
    if (updates.informedDateAnswers) {
      setInformedDateAnswers(updates.informedDateAnswers);
    }
    if (updates.travelStatusStepValidation) {
      setTravelStatusStepValidation({
        ...travelStatusStepValidation,
        ...updates.travelStatusStepValidation,
      });
    }
    if (updates.informedDateStepValidation) {
      setInformedDateStepValidation({
        ...informedDateStepValidation,
        ...updates.informedDateStepValidation,
      });
    }
    if (updates.travelStatusStepInteraction) {
      setTravelStatusStepInteraction({
        ...travelStatusStepInteraction,
        ...updates.travelStatusStepInteraction,
      });
    }
    if (updates.informedDateStepInteraction) {
      setInformedDateStepInteraction({
        ...informedDateStepInteraction,
        ...updates.informedDateStepInteraction,
      });
    }

    // Update the Zustand store validation state
    if (updates.travelStatusStepValidation) {
      validation.setStepValidation(
        ValidationPhase.TRIP_EXPERIENCE,
        Boolean(updates.travelStatusStepValidation?.["travel_status_step"])
      );
    }
  };

  // Initialize marketing status from store
  React.useEffect(() => {
    const storeState = useStore.getState();
    // Check for user consents in the new store structure
    if (storeState.user?.consents?.marketing !== undefined) {
      console.log(
        "Initializing marketing status from store:",
        storeState.user.consents.marketing
      );
    }
  }, []);

  // Initialize state on mount
  useEffect(() => {
    // Skip if already initialized
    if (isInitialized) return;

    // Track initialization with a ref to prevent repeated effects
    const isInitializing = isInitializedRef.current;
    if (isInitializing) return;

    isInitializedRef.current = true;

    const initialize = async () => {
      try {
        console.log("[TripExperiencePage] Initializing");

        // Check if we're coming from a shared link
        if (typeof window !== "undefined" && window._handlingSharedLink) {
          console.log(
            "[TripExperiencePage] Detected shared link context, deferring initialization"
          );
          isInitializedRef.current = false;
          return;
        }

        // Get initial data from the store
        const state = useStore.getState();

        // Important: Use a synchronous approach to avoid race conditions
        const phase4Data = state.phase4 || {};

        // Initialize local state with data from the store
        setTravelStatusAnswers(phase4Data.travelStatusAnswers || []);
        setInformedDateAnswers(phase4Data.informedDateAnswers || []);
        setTravelStatusStepValidation(
          phase4Data.travelStatusStepValidation || {}
        );
        setInformedDateStepValidation(
          phase4Data.informedDateStepValidation || {}
        );
        setTravelStatusStepInteraction(
          phase4Data.travelStatusStepInteraction || {}
        );
        setInformedDateStepInteraction(
          phase4Data.informedDateStepInteraction || {}
        );

        // CRITICAL FIX: Reset informed date validation if wizard wasn't actually completed
        // This prevents persisted validation state from bypassing our new logic
        if (
          phase4Data.informedDateIsValid &&
          !phase4Data.informedDateShowingSuccess
        ) {
          console.log(
            "[TripExperiencePage] Resetting invalid persisted informed date validation state"
          );
          useStore.getState().actions.phase4.updateValidationState({
            informedDateIsValid: false,
            informedDateShowingSuccess: false,
          });
        }

        // Same check for travel status validation
        if (
          phase4Data.travelStatusIsValid &&
          !phase4Data.travelStatusShowingSuccess
        ) {
          console.log(
            "[TripExperiencePage] Resetting invalid persisted travel status validation state"
          );
          useStore.getState().actions.phase4.updateValidationState({
            travelStatusIsValid: false,
            travelStatusShowingSuccess: false,
          });
        }

        console.log("[TripExperiencePage] Initialization complete with data:", {
          travelStatusAnswersCount: (phase4Data.travelStatusAnswers || [])
            .length,
          informedDateAnswersCount: (phase4Data.informedDateAnswers || [])
            .length,
          travelStatusValid: phase4Data.travelStatusIsValid,
          informedDateValid: phase4Data.informedDateIsValid,
        });

        // Mark as initialized
        setIsInitialized(true);
        setIsLoading(false);
      } catch (error) {
        console.error("[TripExperiencePage] Initialization error:", error);
        setIsLoading(false);
      } finally {
        isInitializedRef.current = false;
      }
    };

    initialize();
  }, [isInitialized]);

  // Storage for validation states as plain React state
  const [validationState, setValidationState] = useState({
    isTravelStatusValid: false,
    isInformedDateValid: false,
  });

  // Update validation state on relevant changes (not on every render)
  React.useEffect(() => {
    // Use a descriptive key or safe access for step validation
    const travelStatusStepKey = "travel_status_step";
    const informedDateStepKey = "informed_date_step";

    const newTravelStatusValid = Boolean(
      travelStatusStepValidation[travelStatusStepKey] ||
        useStore.getState().phase4?.travelStatusIsValid ||
        useStore.getState().phase4?.travelStatusShowingSuccess
    );
    const newInformedDateValid = Boolean(
      informedDateStepValidation[informedDateStepKey] ||
        useStore.getState().phase4?.informedDateIsValid ||
        useStore.getState().phase4?.informedDateShowingSuccess
    );

    console.log("[TripExperiencePage] useEffect for validationState:", {
      travelStatusStepKey,
      informedDateStepKey,
      "travelStatusStepValidation[travelStatusStepKey]":
        travelStatusStepValidation[travelStatusStepKey],
      "informedDateStepValidation[informedDateStepKey]":
        informedDateStepValidation[informedDateStepKey],
      "store.phase4.travelStatusIsValid":
        useStore.getState().phase4?.travelStatusIsValid,
      "store.phase4.travelStatusShowingSuccess":
        useStore.getState().phase4?.travelStatusShowingSuccess,
      "store.phase4.informedDateIsValid":
        useStore.getState().phase4?.informedDateIsValid,
      "store.phase4.informedDateShowingSuccess":
        useStore.getState().phase4?.informedDateShowingSuccess,
      newTravelStatusValid,
      newInformedDateValid,
      currentValidationState: validationState,
    });

    // Only update state if values actually changed
    if (
      newTravelStatusValid !== validationState.isTravelStatusValid ||
      newInformedDateValid !== validationState.isInformedDateValid
    ) {
      console.log("[TripExperiencePage] Updating validationState:", {
        newTravelStatusValid,
        newInformedDateValid,
      });
      setValidationState({
        isTravelStatusValid: newTravelStatusValid,
        isInformedDateValid: newInformedDateValid,
      });
    }
  }, [travelStatusStepValidation, informedDateStepValidation, validationState]);

  // Reference to track if we've already applied validation from store
  const hasAppliedTravelStatusValidation = React.useRef(false);
  const hasAppliedInformedDateValidation = React.useRef(false);

  // Effect to ensure validation state is synchronized from phase4Store
  // This provides an additional reliability layer
  React.useEffect(() => {
    // Skip if not initialized
    if (!isInitialized) return;

    // Get current phase4 state
    const phase4State = useStore.getState().phase4;
    if (!phase4State) return;

    // Check if there's valid state in phase4Store
    if (
      phase4State.travelStatusIsValid ||
      phase4State.travelStatusShowingSuccess
    ) {
      // Skip if we've already applied this validation
      if (hasAppliedTravelStatusValidation.current) return;

      console.log(
        "=== Trip Experience - Syncing validation state from phase4Store ===",
        {
          travelStatusIsValid: phase4State.travelStatusIsValid,
          travelStatusShowingSuccess: phase4State.travelStatusShowingSuccess,
        }
      );

      // Mark that we've applied validation to prevent loops
      hasAppliedTravelStatusValidation.current = true;

      // Use a descriptive key or safe access
      const travelStatusStepKey = "travel_status_step";
      // Only update if current value is false to prevent loops
      if (!travelStatusStepValidation[travelStatusStepKey]) {
        setTravelStatusStepValidation((prev) => ({
          ...prev,
          [travelStatusStepKey]: true,
        }));
      }

      // Update global validation state only if it's currently false
      // Use a simpler approach to avoid TypeScript errors
      if (!travelStatusStepValidation[travelStatusStepKey]) {
        validation.setStepValidation(ValidationPhase.TRIP_EXPERIENCE, true);
      }
    }

    // Similarly for informed date, only update if necessary
    if (
      phase4State.informedDateIsValid ||
      phase4State.informedDateShowingSuccess
    ) {
      // Skip if we've already applied this validation
      if (hasAppliedInformedDateValidation.current) return;

      // Mark that we've applied validation
      hasAppliedInformedDateValidation.current = true;

      // Use a descriptive key or safe access
      const informedDateStepKey = "informed_date_step";
      // Only update if current value is false to prevent loops
      if (!informedDateStepValidation[informedDateStepKey]) {
        setInformedDateStepValidation((prev) => ({
          ...prev,
          [informedDateStepKey]: true,
        }));
      }
    }
  }, [
    isInitialized,
    travelStatusStepValidation,
    informedDateStepValidation,
    validation.setStepValidation,
  ]);

  // Handle trip experience completion
  const handleTripExperienceComplete = (answers: Answer[]) => {
    console.log("Trip Experience Complete:", answers);

    // If answers array is empty, this indicates we should clear validation
    if (answers.length === 0) {
      console.log("Trip Experience: Clearing validation state");

      // Clear local answers
      setTravelStatusAnswers([]);

      // Reset validation state
      updateValidationState({
        travelStatusStepValidation: {
          ...travelStatusStepValidation,
          travel_status_step: false,
        },
        travelStatusStepInteraction: {
          ...travelStatusStepInteraction,
          travel_status_step: false,
        },
      });

      // Update Zustand store validation state
      validation.setStepValidation(ValidationPhase.TRIP_EXPERIENCE, false);

      return;
    }

    // Save answers to local state
    setTravelStatusAnswers(answers);

    // Update validation state
    updateValidationState({
      travelStatusStepValidation: {
        ...travelStatusStepValidation,
        travel_status_step: true,
      },
      travelStatusStepInteraction: {
        ...travelStatusStepInteraction,
        travel_status_step: true,
      },
    });

    // Save answers to wizard store
    answers.forEach((answer) => {
      wizard.setAnswer(answer.questionId, answer.value);
    });
  };

  // Handle informed date completion
  const handleInformedDateComplete = (answers: Answer[]) => {
    console.log("Informed Date Complete:", answers);

    // If answers array is empty, this indicates we should clear validation
    if (answers.length === 0) {
      console.log("Informed Date: Clearing validation state");

      // Clear local answers
      setInformedDateAnswers([]);

      // Reset the phase4 informed date state
      useStore.getState().actions.phase4.resetInformedDateState();

      // Reset validation state
      updateValidationState({
        informedDateStepValidation: {
          ...informedDateStepValidation,
          informed_date_step: false,
        },
        informedDateStepInteraction: {
          ...informedDateStepInteraction,
          informed_date_step: false,
        },
      });

      return;
    }

    // Save answers to local state
    setInformedDateAnswers(answers);

    // Save answers to wizard store (this stores but doesn't validate)
    answers.forEach((answer) => {
      wizard.setAnswer(answer.questionId, answer.value);
    });

    // NOW explicitly complete the wizard with validation
    useStore.getState().actions.phase4.completeInformedDateWizard();

    // Update local validation state to match
    updateValidationState({
      informedDateStepValidation: {
        ...informedDateStepValidation,
        informed_date_step: true,
      },
      informedDateStepInteraction: {
        ...informedDateStepInteraction,
        informed_date_step: true,
      },
    });
  };

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

        // Show a success message
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

  // Handle back button
  const handleBack = () => {
    navigateToPhase(ValidationPhase.FLIGHT_DETAILS);
  };

  // Handle continue button
  const handleContinue = async () => {
    // Check if we can continue *before* setting loading state
    if (!canContinue()) {
      console.warn("handleContinue called when not allowed.");
      // Ensure isLoading is false if we bail early
      if (isLoading) setIsLoading(false);
      return;
    }

    console.log("handleContinue: Setting isLoading = true"); // Log: Start
    setIsLoading(true); // Set loading *after* the check

    try {
      // Get travel status from local state (assuming it's less prone to timing issues for now)
      const travelStatus =
        travelStatusAnswers.find(
          (a: Answer) => a.questionId === "travel_status"
        )?.value || "";

      // --- MODIFIED: Get informed date from local state ---
      const informedDate = (() => {
        const informedDateTypeAnswer = informedDateAnswers.find(
          (a: Answer) => a.questionId === "informed_date"
        );
        const informedDateType = informedDateTypeAnswer?.value as
          | string
          | undefined;

        // --- Add Logging ---
        console.log("handleContinue: Deriving informedDate", {
          informedDateAnswers,
          originalFlights: originalFlights.map((f) => ({
            id: f.id,
            departureTime: f.departureTime,
          })),
          informedDateType,
        });
        // --- End Logging ---

        if (informedDateType === "on_departure") {
          // Ensure originalFlights exists and has elements
          const originalFlight = originalFlights?.[0];

          // --- Add explicit check for originalFlight and departureTime ---
          if (!originalFlight?.departureTime) {
            console.error(
              "handleContinue: Cannot get informed date 'on_departure' because original flight data is missing."
            );
            // Return empty string or handle error appropriately, but ensure the if (!informedDate) check below catches it.
            return "";
          }
          // --- End Check ---

          return originalFlight?.departureTime
            ? formatDateToYYYYMMDD(new Date(originalFlight.departureTime))
            : ""; // Return empty string if no date
        }

        if (informedDateType === "specific_date") {
          const specificDateAnswer = informedDateAnswers.find(
            (a: Answer) => a.questionId === "specific_informed_date"
          );
          const specificDate = specificDateAnswer?.value as string | undefined;

          // --- Add Logging for specific date ---
          console.log("handleContinue: Processing specific_date", {
            specificDateAnswer,
            specificDate,
            type: typeof specificDate,
          });
          // --- End Logging ---

          // Basic validation: ensure it's a non-empty string before processing
          if (!specificDate || specificDate.trim() === "") {
            console.error("handleContinue: Specific date is empty or invalid");
            return "";
          }

          // Convert to proper API format (YYYY-MM-DD) using formatDateToYYYYMMDD
          try {
            // If the specificDate is already in YYYY-MM-DD format, use it directly
            if (
              typeof specificDate === "string" &&
              specificDate.match(/^\d{4}-\d{2}-\d{2}$/)
            ) {
              console.log(
                "handleContinue: specificDate already in YYYY-MM-DD format:",
                specificDate
              );
              return specificDate;
            }

            // Otherwise, try to parse and format it properly
            const dateToFormat = new Date(specificDate);
            if (isNaN(dateToFormat.getTime())) {
              console.error(
                "handleContinue: Cannot parse specific date:",
                specificDate
              );
              return "";
            }

            const formattedDate = formatDateToYYYYMMDD(dateToFormat);
            console.log(
              "handleContinue: Formatted specific date from",
              specificDate,
              "to",
              formattedDate
            );
            return formattedDate || "";
          } catch (error) {
            console.error(
              "handleContinue: Error formatting specific date:",
              error
            );
            return "";
          }
        }

        // Default case: return empty string if no valid type or data
        return "";
      })();
      // --- END MODIFICATION ---

      // --- Add comprehensive informedDate logging ---
      console.log("handleContinue: Final informedDate derived:", {
        informedDate,
        type: typeof informedDate,
        length: informedDate?.length,
        isValidFormat: informedDate
          ? /^\d{4}-\d{2}-\d{2}$/.test(informedDate)
          : false,
        timestamp: new Date().toISOString(),
      });
      // --- End informedDate logging ---

      // Validate data for evaluation
      if (!informedDate) {
        // Ensure loading is false if we throw an error early
        console.error("handleContinue: Missing informed date");
        setIsLoading(false);
        throw new Error("Missing informed date");
      }

      // Determine journey fact type
      const factType =
        travelStatus === "none"
          ? "none"
          : travelStatus === "self"
          ? "self"
          : "provided";

      // --- START: Diagnostic logging for original and selected/alternative flight IDs ---
      if (
        travelStatus === "provided" ||
        travelStatus === "took_alternative_own"
      ) {
        console.log("=== PRE-SUBMISSION FLIGHT ID CHECK (handleContinue) ===");
        console.log(
          "Original Flights IDs for API:",
          originalFlights.map((f) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.departureTime,
          }))
        );
        console.log(
          "Selected (Alternative) Flights IDs for API:",
          selectedFlights.map((f) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.departureTime,
          }))
        );
        if (
          originalFlights.length > 0 &&
          selectedFlights.length > 0 &&
          originalFlights[0].id === selectedFlights[0].id
        ) {
          console.error(
            "CRITICAL WARNING: Original and Alternative flight IDs are THE SAME when an alternative journey was indicated. This will likely lead to an incorrect evaluation."
          );
        } else if (originalFlights.length > 0 && selectedFlights.length > 0) {
          console.log(
            "INFO: Original and Alternative flight IDs appear to be different."
          );
        } else {
          console.warn(
            "WARN: Could not fully compare original and alternative flight IDs (one or both might be empty)."
          );
        }
      }
      // --- END: Diagnostic logging ---

      // Prepare evaluation data
      const evaluationData = {
        journey_booked_flightids: originalFlights.map((f) => f.id),
        information_received_at: informedDate,
        journey_fact_flightids:
          travelStatus === "provided" || travelStatus === "took_alternative_own"
            ? selectedFlights.map((f) => f.id)
            : [],
        journey_fact_type: factType as "none" | "self" | "provided",
        travel_status: travelStatus,
      };

      console.log("Evaluating claim with data:", evaluationData);
      const startTime = performance.now(); // Log: Start timing API call

      // Use API to evaluate the claim
      const response = await fetch("/api/evaluateeuflightclaim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(evaluationData),
      });

      const endTime = performance.now(); // Log: End timing API call
      console.log(`handleContinue: API call took ${endTime - startTime} ms`); // Log: API duration

      if (!response.ok) {
        // Ensure loading is false if we throw an error after fetch
        // This will be caught by the finally block, no need to set here
        throw new Error(`Failed to evaluate claim: ${response.statusText}`);
      }

      const evaluationResult = await response.json();
      console.log("Evaluation result:", evaluationResult);

      // --- START: Log detailed data if rejected ---
      if (evaluationResult.status !== "accept") {
        console.warn(
          "Claim was not accepted. Detailed evaluation data from API:",
          evaluationResult.data || evaluationResult // Log data if present, otherwise the whole result
        );
      }
      // --- END: Log detailed data if rejected ---

      // --- Store evaluation result contract data in the phase4 store ---
      if (
        evaluationResult.data &&
        evaluationResult.data.status === "accept" &&
        evaluationResult.data.contract
      ) {
        const { amount, provision } = evaluationResult.data.contract;
        console.log("Storing evaluation result contract in phase4 store:", {
          amount,
          provision,
        });
        store.actions.phase4.setEvaluationResultContract({ amount, provision });

        // Also store the result using ClaimService to ensure it's available in sessionStorage
        try {
          const evaluateResponse = {
            status: evaluationResult.data.status,
            contract: evaluationResult.data.contract,
            rejection_reasons: evaluationResult.data.rejection_reasons,
            journey_booked_flightids: evaluationData.journey_booked_flightids,
            journey_fact_flightids: evaluationData.journey_fact_flightids,
            information_received_at: evaluationData.information_received_at,
            travel_status:
              typeof evaluationData.travel_status === "string"
                ? evaluationData.travel_status
                : undefined,
            journey_fact_type: evaluationData.journey_fact_type,
          };

          // Import directly from the service to avoid circular dependencies
          const { ClaimService } = await import("@/services/claimService");
          ClaimService.setStoredEvaluationResponse(evaluateResponse);
        } catch (error) {
          console.error("Error storing evaluation response:", error);
        }
      }

      // --- Navigation based on result ---
      if (evaluationResult.data && evaluationResult.data.status === "accept") {
        // Save data to store
        validation.setStepValidation(ValidationPhase.TRIP_EXPERIENCE, true);
        validation.setStepCompleted(ValidationPhase.TRIP_EXPERIENCE, true);

        // Update navigation store before pushing
        store.actions.navigation.addCompletedPhase(
          ValidationPhase.TRIP_EXPERIENCE
        );
        store.actions.navigation.addPhaseCompletedViaContinue(4); // Numeric phase for TRIP_EXPERIENCE
        store.actions.navigation.setCurrentPhase(ValidationPhase.CLAIM_SUCCESS);

        // Navigate to next phase
        console.log("handleContinue (Accept): Navigating to claim-success"); // Log: Before navigation
        navigateToPhase(ValidationPhase.CLAIM_SUCCESS);
      } else {
        // Update navigation store before pushing for rejected claims
        store.actions.navigation.addCompletedPhase(
          ValidationPhase.TRIP_EXPERIENCE
        );
        store.actions.navigation.addPhaseCompletedViaContinue(4); // Numeric phase for TRIP_EXPERIENCE
        store.actions.navigation.setCurrentPhase(
          ValidationPhase.CLAIM_REJECTED
        );

        // Navigate to rejected claim page
        console.log("handleContinue (Reject): Navigating to claim-rejected"); // Log: Before navigation
        navigateToPhase(ValidationPhase.CLAIM_REJECTED);
      }
    } catch (error) {
      // Ensure error is logged properly
      if (error instanceof Error) {
        console.error(`Error during evaluation: ${error.message}`, error);
      } else {
        console.error("An unknown error occurred during evaluation:", error);
      }
      // No need to set isLoading here, finally block handles it
    } finally {
      // GUARANTEE isLoading is set to false after try/catch, before component potentially unmounts
      console.log("handleContinue (finally): Setting isLoading = false");
      setIsLoading(false);
    }
  };

  // Find the canContinue function and fix the property accesses
  const canContinue = () => {
    // Get state snapshot outside of the render cycle
    const state = useStore.getState();
    const phase4State = state.phase4 || {};
    const flightState = state.flight || {};

    // Get current accordion status to check if wizards are currently being edited
    const currentAccordionStatus = accordionStatus;

    // Safe access of properties with proper fallbacks
    const informedDateAnswers = phase4State.informedDateAnswers || [];
    const travelStatusAnswers = phase4State.travelStatusAnswers || [];

    // Use the correct property names from the store structure
    const informedDateType = informedDateAnswers.find(
      (a: Answer) => a.questionId === "informed_date"
    )?.value;

    const currentTravelStatus = travelStatusAnswers.find(
      (a: Answer) => a.questionId === "travel_status"
    )?.value;

    // Safely access flight arrays with proper type checking
    const originalFlights =
      flightState.originalFlights &&
      Array.isArray(flightState.originalFlights[0])
        ? flightState.originalFlights[0]
        : [];

    const selectedFlights =
      flightState.selectedFlights &&
      typeof flightState.selectedFlights === "object"
        ? Object.values(flightState.selectedFlights).flat().filter(Boolean)
        : [];

    const isTravelStatusValid = Boolean(phase4State.travelStatusIsValid);
    const isInformedDateValid = Boolean(phase4State.informedDateIsValid);

    // CRITICAL FIX: Also check that wizards are actually showing success (completed/submitted)
    // This prevents the continue button from being enabled just because answers were selected
    // ADDITIONAL FIX: Use accordion status to ensure wizards are actually completed (not just showing success)
    const isTravelStatusCompleted = Boolean(
      phase4State.travelStatusShowingSuccess &&
        currentAccordionStatus.isTravelStatusCompleted
    );
    const isInformedDateCompleted = Boolean(
      phase4State.informedDateShowingSuccess &&
        currentAccordionStatus.isInformedDateCompleted
    );

    // Use completed state instead of just valid state for final evaluation
    const effectivelyTravelStatusValid =
      isTravelStatusValid && isTravelStatusCompleted;
    const effectivelyInformedDateValid =
      isInformedDateValid && isInformedDateCompleted;

    // Reduce debug logging in production
    if (process.env.NODE_ENV !== "production") {
      console.log("[TripExperiencePage] canContinue invoked. States:", {
        informedDateType,
        currentTravelStatus,
        originalFlightsLength: originalFlights.length,
        selectedFlightsLength: selectedFlights.length,
        isTravelStatusValid,
        isInformedDateValid,
        isTravelStatusCompleted,
        isInformedDateCompleted,
        // Add raw phase4 state for debugging
        rawPhase4State: {
          travelStatusIsValid: phase4State.travelStatusIsValid,
          informedDateIsValid: phase4State.informedDateIsValid,
          travelStatusShowingSuccess: phase4State.travelStatusShowingSuccess,
          informedDateShowingSuccess: phase4State.informedDateShowingSuccess,
        },
        accordionState: {
          isTravelStatusCompleted:
            currentAccordionStatus.isTravelStatusCompleted,
          isInformedDateCompleted:
            currentAccordionStatus.isInformedDateCompleted,
          hasTravelStatusInteracted:
            currentAccordionStatus.hasTravelStatusInteracted,
          hasInformedDateInteracted:
            currentAccordionStatus.hasInformedDateInteracted,
        },
        effectivelyTravelStatusValid,
        effectivelyInformedDateValid,
      });
    }

    // Logic for on_departure selected but no flights
    if (
      informedDateType === "on_departure" &&
      (currentTravelStatus === "provided" ||
        currentTravelStatus === "took_alternative_own") &&
      selectedFlights.length === 0
    ) {
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "[TripExperiencePage] canContinue: Will return FALSE. Reason: on_departure selected, travelStatus indicates alternative, but selectedFlights is empty."
        );
      }
      return false;
    }

    // Evaluate final result - FIXED: Require both sections to be completed
    // Only allow continue when BOTH travel status AND informed date are properly completed
    const finalResult =
      effectivelyTravelStatusValid && effectivelyInformedDateValid;

    // Reduce debug logging in production
    if (process.env.NODE_ENV !== "production") {
      console.log("[TripExperiencePage] canContinue final evaluation:", {
        informedDateType,
        currentTravelStatus,
        isTravelStatusValid,
        isInformedDateValid,
        isTravelStatusCompleted,
        isInformedDateCompleted,
        effectivelyTravelStatusValid,
        effectivelyInformedDateValid,
        finalResult,
        validationBreakdown: {
          travelStatusValid: isTravelStatusValid,
          travelStatusCompleted: isTravelStatusCompleted,
          travelStatusEffective: effectivelyTravelStatusValid,
          informedDateValid: isInformedDateValid,
          informedDateCompleted: isInformedDateCompleted,
          informedDateEffective: effectivelyInformedDateValid,
          bothRequired:
            "Both travel status AND informed date must be completed",
        },
      });
    }

    return finalResult;
  };

  // Get trip experience summary
  const tripExperienceSummary = useMemo(() => {
    // Get the travel status answer
    const travelStatus = travelStatusAnswers.find(
      (a: Answer) => a.questionId === "travel_status"
    )?.value;

    switch (travelStatus) {
      case "none":
        return t("phases.tripExperience.summary.travelStatus.notTraveled");
      case "self":
        return t("phases.tripExperience.summary.travelStatus.traveled");
      case "provided":
      case "took_alternative_own":
        return t("phases.tripExperience.summary.travelStatus.traveled");
      default:
        return "";
    }
  }, [t, travelStatusAnswers]);

  // Get informed date summary
  const informedDateSummary = useMemo(() => {
    if (informedDateAnswers.length === 0) return "";

    const informedDate = informedDateAnswers.find(
      (a: Answer) => a.questionId === "informed_date"
    )?.value;

    if (informedDate === "on_departure") {
      return t(
        "phases.tripExperience.steps.informedDate.questions.informedDate.options.onDeparture"
      );
    }

    const specificDate = informedDateAnswers.find(
      (a: Answer) => a.questionId === "specific_informed_date"
    )?.value;

    if (specificDate && typeof specificDate === "string") {
      try {
        const date = new Date(specificDate);
        if (!isNaN(date.getTime())) {
          return t(
            "phases.tripExperience.summary.travelStatus.informedDate"
          ).replace(
            "{date}",
            date.toLocaleDateString(lang === "de" ? "de-DE" : "en-US")
          );
        }
      } catch (error) {
        console.error("Error formatting date:", error);
      }
    }

    return "";
  }, [t, lang, informedDateAnswers]);

  // Travel Experience QA Wizard - Use imported questions
  const TripExperienceWizard = useMemo(() => {
    // Add a safety check to prevent rendering in claim-rejected context
    if (
      typeof window !== "undefined" &&
      window.location.pathname.includes("/claim-rejected")
    ) {
      console.log(
        "TripExperiencePage: Avoiding wizard rendering in claim-rejected context"
      );
      return <div>Loading...</div>; // Return simple placeholder
    }

    // Prevent re-rendering if store is not initialized
    if (!isInitialized) {
      return null;
    }

    // Get the travel status to determine whether to pass selectedFlight
    const travelStatus = travelStatusAnswers.find(
      (a: Answer) => a.questionId === "travel_status"
    )?.value;

    // IMPORTANT: Only pass original flights when travel status is explicitly 'self'
    // Never pass original flights for alternative flight questions
    const shouldPassOriginalFlight = travelStatus === "self";

    // Use try-catch to prevent any potential errors from causing loops
    try {
      // Don't pass originalFlights if the user is selecting alternative flights
      const selectedFlightToPass =
        shouldPassOriginalFlight && originalFlights.length > 0
          ? originalFlights[0]
          : null;

      // Only pass alternative flights when the status indicates we're dealing with alternative flights
      const alternativeFlightsToPass =
        travelStatus === "provided" || travelStatus === "took_alternative_own"
          ? alternativeFlights
          : [];

      console.log(
        "=== TripExperienceWizard - Deciding on passing original flight ===",
        {
          travelStatus,
          shouldPassOriginalFlight,
          hasOriginalFlights: originalFlights.length > 0,
          alternativeFlightsLength: alternativeFlights.length,
          willPassAlternatives: alternativeFlightsToPass.length,
          selectedFlightToPass: selectedFlightToPass
            ? "originalFlight"
            : "null",
        }
      );

      return (
        <Phase4QAWizard
          questions={tripExperienceQuestions}
          onComplete={handleTripExperienceComplete}
          initialAnswers={travelStatusAnswers}
          selectedFlight={selectedFlightToPass}
          wizardType="travel_status"
          alternativeFlightSegments={alternativeFlightsToPass}
          onAlternativeFlightsChange={handleAlternativeFlightsChange}
          setIsFlightNotListedOpen={setIsFlightNotListedOpen}
        />
      );
    } catch (error) {
      console.error("Error preparing TripExperienceWizard:", error);
      return <div>An error occurred loading the wizard.</div>;
    }
  }, [
    isInitialized,
    handleTripExperienceComplete,
    travelStatusAnswers,
    originalFlights,
    alternativeFlights,
    handleAlternativeFlightsChange,
    // Remove useStore from dependencies to prevent infinite re-renders
    // The real-time state is fetched inside the memo
  ]);

  // Informed Date QA Wizard
  const InformedDateWizard = useMemo(() => {
    // Prevent re-rendering if store is not initialized
    if (!isInitialized) {
      return null;
    }

    // Get travel status to determine which flight data to pass
    const travelStatus = travelStatusAnswers.find(
      (a: Answer) => a.questionId === "travel_status"
    )?.value;

    // Only pass original flights if we don't have alternative flights AND the travel status is 'self'
    // This prevents conflicts between original and alternative flight data
    const shouldPassOriginalFlight =
      alternativeFlights.length === 0 && travelStatus === "self";

    console.log(
      "=== InformedDateWizard - Deciding on passing original flight ===",
      {
        hasAlternativeFlights: alternativeFlights.length > 0,
        shouldPassOriginalFlight,
        hasOriginalFlights: originalFlights.length > 0,
        travelStatus,
      }
    );

    return (
      <Phase4QAWizard
        questions={informedDateQuestions}
        onComplete={handleInformedDateComplete}
        initialAnswers={informedDateAnswers}
        selectedFlight={
          shouldPassOriginalFlight && originalFlights.length > 0
            ? originalFlights[0]
            : null
        }
        wizardType="informed_date"
      />
    );
  }, [
    isInitialized,
    informedDateQuestions,
    handleInformedDateComplete,
    informedDateAnswers,
    originalFlights,
    alternativeFlights,
    travelStatusAnswers,
    // Remove store dependency that could cause infinite updates
  ]);

  // Compute isCompleted and hasInteracted status based on phase4Store
  const accordionStatus = React.useMemo(() => {
    // Get current phase4 state
    const phase4State = useStore.getState().phase4;

    // Use a descriptive key or safe access
    const travelStatusStepKey = "travel_status_step";
    const informedDateStepKey = "informed_date_step";

    // CRITICAL FIX: Only show validation/completion AFTER wizard has been submitted
    // If user goes back to edit (showingSuccess = false), validation should disappear
    const isTravelStatusShowingSuccess = Boolean(
      phase4State?.travelStatusShowingSuccess
    );
    const isInformedDateShowingSuccess = Boolean(
      phase4State?.informedDateShowingSuccess
    );

    return {
      // FIXED: Only show completed state when wizard is actually showing success (submitted)
      isTravelStatusCompleted: isTravelStatusShowingSuccess,
      hasTravelStatusInteracted: Boolean(
        // Local state
        travelStatusStepInteraction[travelStatusStepKey] ||
          // If we have answers, we've interacted
          travelStatusAnswers.length > 0 ||
          // phase4Store state
          phase4State?.travelStatusStepInteraction?.[travelStatusStepKey]
      ),
      // FIXED: Only show completed state when wizard is actually showing success (submitted)
      isInformedDateCompleted: isInformedDateShowingSuccess,
      hasInformedDateInteracted: Boolean(
        // Local state
        informedDateStepInteraction[informedDateStepKey] ||
          // If we have answers, we've interacted
          informedDateAnswers.length > 0 ||
          // phase4Store state
          phase4State?.informedDateStepInteraction?.[informedDateStepKey]
      ),
    };
  }, [
    travelStatusStepInteraction,
    informedDateStepInteraction,
    travelStatusAnswers.length,
    informedDateAnswers.length,
    // FIXED: Depend on showingSuccess flags instead of isValid flags
    // This ensures accordion updates when user goes back to edit
  ]);

  // Memoize content to prevent unnecessary re-renders
  const content = React.useMemo(() => {
    // For shared links, we need a different initial accordion setup to prevent loops
    const initialAccordion =
      typeof window !== "undefined" && window._handlingSharedLink
        ? undefined
        : "2";

    // Log button state just before rendering content
    console.log("--- ContinueButton State Check (in useMemo) ---", {
      canContinue: canContinue(),
      isTravelStatusValid: validationState.isTravelStatusValid,
      isInformedDateValid: validationState.isInformedDateValid,
      isLoading: isLoading,
      disabledPropValue: !canContinue() || isLoading,
    });

    return (
      <AccordionProvider initialActiveStepId={initialAccordion}>
        <div className="min-h-screen bg-[#f5f7fa]">
          <PhaseNavigation
            phase={ValidationPhase.TRIP_EXPERIENCE}
            translations={{
              title: t("phases.tripExperience.title"),
              description: t("phases.tripExperience.description"),
            }}
          />
          <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
            <div className="space-y-6">
              <SpeechBubble message={t("phases.tripExperience.speechBubble")} />

              {/* Trip Experience Wizard */}
              <AccordionCardClient
                title={t("phases.tripExperience.steps.travelStatus.title")}
                stepId="2"
                isCompleted={accordionStatus.isTravelStatusCompleted}
                hasInteracted={accordionStatus.hasTravelStatusInteracted}
                isValid={accordionStatus.isTravelStatusCompleted}
                summary={tripExperienceSummary}
                eyebrow={t("phases.tripExperience.steps.travelStatus.eyebrow")}
                isQA={true}
              >
                <div
                  className={accordionConfig?.padding?.content || "px-4 py-4"}
                >
                  {TripExperienceWizard}
                </div>
              </AccordionCardClient>

              {/* Informed Date Wizard */}
              <AccordionCardClient
                title={t("phases.tripExperience.steps.informedDate.title")}
                stepId="3"
                isCompleted={accordionStatus.isInformedDateCompleted}
                hasInteracted={accordionStatus.hasInformedDateInteracted}
                isValid={accordionStatus.isInformedDateCompleted}
                summary={informedDateSummary}
                eyebrow={t("phases.tripExperience.steps.informedDate.eyebrow")}
                isQA={true}
              >
                <div
                  className={accordionConfig?.padding?.content || "px-4 py-4"}
                >
                  {InformedDateWizard}
                </div>
              </AccordionCardClient>

              {/* Navigation */}
              <div className="mt-12 pt-8 flex flex-col sm:flex-row justify-between gap-4">
                <ContinueButton
                  onClick={handleContinue}
                  disabled={!canContinue() || isLoading}
                  isLoading={isLoading}
                  text={t("phases.tripExperience.navigation.continue")}
                />
                <BackButton
                  onClick={handleBack}
                  text={t("phases.tripExperience.navigation.back")}
                />
              </div>
            </div>
          </main>

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
  }, [
    t,
    travelStatusStepValidation,
    travelStatusStepInteraction,
    informedDateStepValidation,
    informedDateStepInteraction,
    validationState,
    tripExperienceSummary,
    informedDateSummary,
    TripExperienceWizard,
    InformedDateWizard,
    handleBack,
    handleContinue,
    canContinue,
    isLoading,
    accordionStatus,
    isFlightNotListedOpen,
    handleFlightNotListedSubmit,
    prefilledData,
  ]);

  // Custom PhaseGuard component to ensure proper phase history
  const CustomPhaseGuard = useMemo(() => {
    // Get the current validation state
    const state = useStore.getState();
    const phase4State = state.phase4;

    // Log the current state for debugging
    console.log("=== Trip Experience - Creating PhaseGuard ===", {
      phase4State: {
        travelStatusIsValid: phase4State?.travelStatusIsValid,
        travelStatusShowingSuccess: phase4State?.travelStatusShowingSuccess,
        informedDateIsValid: phase4State?.informedDateIsValid,
        timestamp: new Date().toISOString(),
      },
    });

    // Only include the props that PhaseGuard expects
    const guardProps: PhaseGuardProps = {
      phase: 4,
      children: content,
    };

    return <PhaseGuard {...guardProps} />;
  }, [
    content,
    store, // Add store dependency to refresh when store changes
  ]);

  return CustomPhaseGuard;
}
