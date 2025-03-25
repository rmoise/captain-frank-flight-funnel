"use client";

import React, { useRef, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { usePhase4Store } from "@/lib/state/phase4Store";
import type { Phase4State } from "@/lib/state/phase4Store";
import { Answer, Question, Flight } from "@/types/store";
import { QAWizard } from "@/components/wizard/QAWizard";
import { PhaseGuard, PhaseGuardProps } from "@/components/shared/PhaseGuard";
import { AccordionCard } from "@/components/shared/AccordionCard";
import { SpeechBubble } from "@/components/SpeechBubble";
import { ContinueButton } from "@/components/shared/ContinueButton";
import { BackButton } from "@/components/shared/BackButton";
import { PhaseNavigation } from "@/components/PhaseNavigation";
import { accordionConfig } from "@/config/accordion";
import { isValidYYYYMMDD, formatDateToYYYYMMDD } from "@/utils/dateUtils";
import { AccordionProvider } from "@/components/shared/AccordionContext";
import useStore from "@/lib/state/store";
import { useFlightStore } from "@/lib/state/flightStore";
import { ClaimService } from "@/services/claimService";

// Extend Window interface to include _handlingSharedLink
declare global {
  interface Window {
    _handlingSharedLink?: boolean;
    // Use the type that's already defined elsewhere
    __accordionContext?: { setActiveAccordion: (step: string) => void };
    _sharedLinkProcessed?: boolean;
  }
}

// Add a function to ensure alternative flights are properly synchronized
const syncAlternativeFlights = (
  flights: Flight[],
  flightStore: any,
  phase4Store: any
) => {
  if (!flights || flights.length === 0) {
    console.log("=== Syncing Alternative Flights - No flights to sync ===", {
      timestamp: new Date().toISOString(),
    });
    return;
  }

  console.log("=== Syncing Alternative Flights ===", {
    flights: flights.map((f) => ({
      id: f.id,
      flightNumber: f.flightNumber,
      date: f.date,
    })),
    timestamp: new Date().toISOString(),
  });

  // IMPORTANT: Only update the phase4 flights in flightStore
  // but don't override the original flights which are phase3 flights
  flightStore.setSelectedFlights(4, flights);

  // Update phase4Store
  phase4Store.batchUpdate({
    selectedFlights: flights,
    _lastUpdate: Date.now(),
  });

  // Ensure data is persisted to localStorage
  try {
    // Save to phase4FlightData - IMPORTANT: Keep original flights separately from phase4 alternative flights
    localStorage.setItem(
      "phase4FlightData",
      JSON.stringify({
        originalFlights: flightStore.originalFlights, // Keep the original flights from phase3
        selectedFlights: flights, // These are the phase4 alternative flights
        _lastUpdate: Date.now(),
      })
    );

    // Also save to phase4AlternativeFlights for redundancy
    localStorage.setItem("phase4AlternativeFlights", JSON.stringify(flights));

    // Update phase4Store in localStorage directly
    const phase4StoreData = localStorage.getItem("phase4Store");
    if (phase4StoreData) {
      try {
        const parsedData = JSON.parse(phase4StoreData);
        if (parsedData.state) {
          parsedData.state.selectedFlights = flights;
          parsedData.state._lastUpdate = Date.now();
          localStorage.setItem("phase4Store", JSON.stringify(parsedData));
        }
      } catch (e) {
        console.error("Error updating phase4Store in localStorage:", e);
      }
    }

    console.log("=== Saved alternative flights to localStorage ===", {
      selectedFlights: flights.map((f) => ({
        id: f.id,
        flightNumber: f.flightNumber,
        date: f.date,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error saving flights to localStorage:", error);
  }
};

export default function TripExperiencePage(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const lang = params?.lang?.toString() || "";
  const [isLoading, setIsLoading] = React.useState(true);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const phase4Store = usePhase4Store();
  const flightStore = useFlightStore();
  const mainStore = useStore();
  const isInitializedRef = React.useRef(false);
  const sharedFlightProcessedRef = React.useRef(false);

  // Add searchParams to get shared_flight parameter
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const sharedFlightParam = searchParams?.get("shared_flight");

  const {
    travelStatusAnswers,
    informedDateAnswers,
    travelStatusStepValidation,
    informedDateStepValidation,
    travelStatusStepInteraction,
    informedDateStepInteraction,
    updateValidationState,
  } = phase4Store;

  // Safe wrapper for validation state updates to prevent loops
  const safeUpdateValidationState = React.useCallback(
    (updates: Partial<Phase4State>) => {
      // Skip updates during initialization
      if (!isInitialized) {
        console.log("=== Skipping validation update during initialization ===");
        return;
      }

      // Only update if there's an actual change
      let hasChanges = false;

      // Check if any field is different from current state
      Object.entries(updates).forEach(([key, value]) => {
        // @ts-ignore - we're doing dynamic checks
        if (JSON.stringify(phase4Store[key]) !== JSON.stringify(value)) {
          hasChanges = true;
        }
      });

      if (!hasChanges) {
        console.log("=== No validation changes, skipping update ===");
        return;
      }

      console.log("=== Applying validation state update ===", {
        updates,
        timestamp: new Date().toISOString(),
      });

      // Apply the update
      phase4Store.updateValidationState(updates);
    },
    [phase4Store, isInitialized]
  );

  // Initialize marketing status from store
  React.useEffect(() => {
    const storedState = useStore.getState();
    if (storedState.marketingAccepted !== undefined) {
      console.log(
        "Initializing marketing status from store:",
        storedState.marketingAccepted
      );
      mainStore.setMarketingAccepted(storedState.marketingAccepted);
    }
  }, []);

  // Initialize state on mount
  React.useEffect(() => {
    // Skip if we've already initialized from a shared link
    if (isInitializedRef.current || isInitialized || window._handlingSharedLink)
      return;
    isInitializedRef.current = true;

    console.log("=== Trip Experience Page Initialization ===", {
      originalFlights: flightStore.originalFlights.length,
      mainStoreFlights: mainStore.selectedFlights.length,
      hasPersistedData: !!localStorage.getItem("phase4FlightData"),
      phase4StoreFlights: phase4Store.selectedFlights.length,
      marketingAccepted: mainStore.marketingAccepted,
      isFromSharedLink: !!window._handlingSharedLink,
      timestamp: new Date().toISOString(),
    });

    try {
      // First check if we have existing travel status answers before clearing anything
      const existingTravelStatusAnswers = [...phase4Store.travelStatusAnswers];
      const existingInformedDateAnswers = [...phase4Store.informedDateAnswers];

      console.log("=== Trip Experience - Existing Answers Before Reset ===", {
        travelStatusAnswers: existingTravelStatusAnswers,
        informedDateAnswers: existingInformedDateAnswers,
        timestamp: new Date().toISOString(),
      });

      // Skip the reset if we're using shared data
      if (!window._handlingSharedLink) {
        // Clear any data from phases 1-3 in localStorage to ensure complete isolation
        console.log("=== Trip Experience - Clearing Phases 1-3 Data ===", {
          timestamp: new Date().toISOString(),
        });

        // Save essential data that should be preserved
        const termsAccepted = localStorage.getItem("termsAccepted");
        const privacyAccepted = localStorage.getItem("privacyAccepted");
        const currentPhase = "4"; // Force phase 4
        const completedPhases = localStorage.getItem("completedPhases");
        const phasesCompletedViaContinue = localStorage.getItem(
          "phasesCompletedViaContinue"
        );

        // Save phase 4 validation state before clearing
        const phase4ValidationState = localStorage.getItem(
          "phase4ValidationState"
        );
        const phase4StoreData = localStorage.getItem("phase4Store");
        const phase4FlightData = localStorage.getItem("phase4FlightData");
        const phase4AlternativeFlights = localStorage.getItem(
          "phase4AlternativeFlights"
        );

        // Clear all localStorage
        localStorage.clear();

        // Restore essential data
        if (termsAccepted) localStorage.setItem("termsAccepted", termsAccepted);
        if (privacyAccepted)
          localStorage.setItem("privacyAccepted", privacyAccepted);
        localStorage.setItem("currentPhase", currentPhase);
        if (completedPhases)
          localStorage.setItem("completedPhases", completedPhases);
        if (phasesCompletedViaContinue)
          localStorage.setItem(
            "phasesCompletedViaContinue",
            phasesCompletedViaContinue
          );

        // Restore phase 4 data
        if (phase4ValidationState)
          localStorage.setItem("phase4ValidationState", phase4ValidationState);
        if (phase4StoreData)
          localStorage.setItem("phase4Store", phase4StoreData);
        if (phase4FlightData)
          localStorage.setItem("phase4FlightData", phase4FlightData);
        if (phase4AlternativeFlights)
          localStorage.setItem(
            "phase4AlternativeFlights",
            phase4AlternativeFlights
          );

        // Also clear the flightStore for phase 4
        flightStore.clearFlightData(4);

        // Reset the phase4Store but preserve existing answers
        phase4Store.resetStore(true);

        // Explicitly restore answers after reset
        if (existingTravelStatusAnswers.length > 0) {
          console.log(
            "=== Trip Experience - Restoring Travel Status Answers After Reset ===",
            {
              answers: existingTravelStatusAnswers,
              timestamp: new Date().toISOString(),
            }
          );

          phase4Store.batchUpdate({
            travelStatusAnswers: existingTravelStatusAnswers,
            _lastUpdate: Date.now(),
          });
        }

        if (existingInformedDateAnswers.length > 0) {
          console.log(
            "=== Trip Experience - Restoring Informed Date Answers After Reset ===",
            {
              answers: existingInformedDateAnswers,
              timestamp: new Date().toISOString(),
            }
          );

          phase4Store.batchUpdate({
            informedDateAnswers: existingInformedDateAnswers,
            _lastUpdate: Date.now(),
          });
        }

        console.log(
          "=== Trip Experience - Completely Reset Flight Data for Phase 4 ===",
          {
            timestamp: new Date().toISOString(),
          }
        );
      }

      // First restore validation state if it exists
      const persistedValidationState = localStorage.getItem(
        "phase4ValidationState"
      );

      // If persisted validation state is found, restore it
      if (persistedValidationState) {
        try {
          const validationData = JSON.parse(persistedValidationState);
          console.log("Found persisted validation state:", validationData);

          // Restore validation state
          safeUpdateValidationState({
            travelStatusStepValidation:
              validationData.travelStatusStepValidation || {},
            travelStatusStepInteraction:
              validationData.travelStatusStepInteraction || {},
            informedDateStepValidation:
              validationData.informedDateStepValidation || {},
            informedDateStepInteraction:
              validationData.informedDateStepInteraction || {},
            travelStatusShowingSuccess:
              validationData.travelStatusShowingSuccess || false,
            travelStatusIsValid: validationData.travelStatusIsValid || false,
            informedDateShowingSuccess:
              validationData.informedDateShowingSuccess || false,
            informedDateIsValid: validationData.informedDateIsValid || false,
            _lastUpdate: Date.now(),
          });

          // Don't override answers from shared link
          if (!window._handlingSharedLink) {
            // Restore travel status answers if they exist
            if (validationData.travelStatusAnswers?.length > 0) {
              phase4Store.batchUpdate({
                travelStatusAnswers: validationData.travelStatusAnswers,
                _lastUpdate: Date.now(),
              });
            }

            // Restore informed date answers if they exist
            if (validationData.informedDateAnswers?.length > 0) {
              phase4Store.batchUpdate({
                informedDateAnswers: validationData.informedDateAnswers,
                _lastUpdate: Date.now(),
              });
            }
          }
        } catch (error) {
          console.error("Error parsing validation state:", error);
        }
      }

      // Then try to get persisted flight data if not using shared data
      if (!window._handlingSharedLink) {
        const persistedFlightData = localStorage.getItem("phase4FlightData");
        if (persistedFlightData) {
          try {
            const flightData = JSON.parse(persistedFlightData);
            console.log("Found persisted flight data:", {
              originalFlights: flightData.originalFlights?.length,
              selectedFlights: flightData.selectedFlights?.length,
              travelStatusAnswers: flightData.travelStatusAnswers,
              informedDateAnswers: flightData.informedDateAnswers,
              timestamp: new Date().toISOString(),
            });

            // Restore original flights
            if (flightData.originalFlights?.length > 0) {
              flightStore.setOriginalFlights(flightData.originalFlights);
              phase4Store.batchUpdate({
                originalFlights: flightData.originalFlights,
                _lastUpdate: Date.now(),
              });
            }

            // Restore travel status answers if they exist
            if (flightData.travelStatusAnswers?.length > 0) {
              phase4Store.batchUpdate({
                travelStatusAnswers: flightData.travelStatusAnswers,
                travelStatusShowingSuccess: true,
                travelStatusIsValid: true,
                _lastUpdate: Date.now(),
              });
            }

            // Restore informed date answers if they exist
            if (flightData.informedDateAnswers?.length > 0) {
              phase4Store.batchUpdate({
                informedDateAnswers: flightData.informedDateAnswers,
                informedDateShowingSuccess: true,
                informedDateIsValid: true,
                informedDateStepValidation: {
                  1: true,
                  2: true,
                  3: true,
                },
                informedDateStepInteraction: {
                  1: true,
                  2: true,
                  3: true,
                },
                _lastUpdate: Date.now(),
              });

              console.log(
                "=== Trip Experience - Restored informed date answers with validation ===",
                {
                  answers: flightData.informedDateAnswers,
                  validation: {
                    informedDateShowingSuccess: true,
                    informedDateIsValid: true,
                    informedDateStepValidation: { 1: true, 2: true, 3: true },
                    informedDateStepInteraction: { 1: true, 2: true, 3: true },
                  },
                  timestamp: new Date().toISOString(),
                }
              );

              // Also ensure validation state in localStorage is updated
              try {
                const validationStateStr = localStorage.getItem(
                  "phase4ValidationState"
                );
                const validationState = validationStateStr
                  ? JSON.parse(validationStateStr)
                  : {};

                const updatedValidationState = {
                  ...validationState,
                  informedDateAnswers: flightData.informedDateAnswers,
                  informedDateStepValidation: {
                    ...(validationState.informedDateStepValidation || {}),
                    1: true,
                    2: true,
                    3: true,
                  },
                  informedDateStepInteraction: {
                    ...(validationState.informedDateStepInteraction || {}),
                    1: true,
                    2: true,
                    3: true,
                  },
                  informedDateShowingSuccess: true,
                  informedDateIsValid: true,
                  _timestamp: Date.now(),
                };

                localStorage.setItem(
                  "phase4ValidationState",
                  JSON.stringify(updatedValidationState)
                );

                console.log(
                  "=== Trip Experience - Updated validation state during restore ===",
                  {
                    updatedValidationState,
                    timestamp: new Date().toISOString(),
                  }
                );
              } catch (error) {
                console.error(
                  "Error updating validation state during restore:",
                  error
                );
              }
            }

            // First check for separately stored alternative flights (more reliable)
            const alternativeFlights = localStorage.getItem(
              "phase4AlternativeFlights"
            );
            if (alternativeFlights) {
              try {
                const parsedFlights = JSON.parse(alternativeFlights);
                if (Array.isArray(parsedFlights) && parsedFlights.length > 0) {
                  console.log(
                    "=== Trip Experience - Restored alternative flights from dedicated storage ===",
                    {
                      flightCount: parsedFlights.length,
                      flights: parsedFlights.map((f) => ({
                        id: f.id,
                        flightNumber: f.flightNumber,
                        date: f.date,
                      })),
                      timestamp: new Date().toISOString(),
                    }
                  );

                  // Process the dates properly
                  const processedFlights = parsedFlights.map((flight: any) => ({
                    ...flight,
                    date: flight.date ? new Date(flight.date) : null,
                  }));

                  // Update both stores
                  phase4Store.batchUpdate({
                    selectedFlights: processedFlights,
                    _lastUpdate: Date.now(),
                  });
                  flightStore.setSelectedFlights(4, processedFlights);
                }
              } catch (error) {
                console.error(
                  "Error restoring alternative flights from dedicated storage:",
                  error
                );
              }
            }
            // Fallback to phase4FlightData if no dedicated storage
            else if (flightData.selectedFlights?.length > 0) {
              const selectedFlights = flightData.selectedFlights.map(
                (flight: any) => ({
                  ...flight,
                  date: flight.date ? new Date(flight.date) : null,
                })
              );

              phase4Store.batchUpdate({
                selectedFlights,
                _lastUpdate: Date.now(),
              });
              flightStore.setSelectedFlights(4, selectedFlights);
            }
          } catch (error) {
            console.error("Error parsing persisted flight data:", error);
          }
        } else {
          // If no persisted data, handle original flights
          if (flightStore.originalFlights.length === 0) {
            if (phase4Store.originalFlights.length > 0) {
              flightStore.setOriginalFlights(phase4Store.originalFlights);
            }
          } else if (phase4Store.originalFlights.length === 0) {
            phase4Store.batchUpdate({
              originalFlights: flightStore.originalFlights,
              _lastUpdate: Date.now(),
            });
          }
        }
      }

      // Ensure phase 4 data is completely isolated from phases 1-3
      console.log("=== Trip Experience - Ensuring Phase 4 Isolation ===", {
        timestamp: new Date().toISOString(),
      });

      // Make sure flightStore has phase 4 data isolated
      const phase4Data = flightStore.getFlightData(4);
      if (phase4Data) {
        // Ensure this data is only used for phase 4
        localStorage.setItem("flightData_phase4", JSON.stringify(phase4Data));
      }

      // Clear any data from phases 1-3 in the main store
      mainStore.setState({
        currentPhase: 4,
        fromLocation: phase4Store.fromLocation as any,
        toLocation: phase4Store.toLocation as any,
        selectedType: phase4Store.selectedType || "direct",
        flightSegments: phase4Store.flightSegments || [
          {
            fromLocation: phase4Store.fromLocation as any,
            toLocation: phase4Store.toLocation as any,
            date: null,
            selectedFlight: null,
          },
        ],
        selectedFlights: phase4Store.selectedFlights || [],
      });

      // Get travel status after restoration
      const travelStatus = phase4Store.travelStatusAnswers.find(
        (a) => a.questionId === "travel_status"
      )?.value;

      const requiresAlternativeFlights =
        travelStatus === "provided" || travelStatus === "took_alternative_own";

      console.log("=== Trip Experience - Flight Selection ===", {
        travelStatus,
        requiresAlternativeFlights,
        phase4StoreFlights: phase4Store.selectedFlights.length,
        flightStorePhase4: flightStore.getSelectedFlights(4).length,
        timestamp: new Date().toISOString(),
      });

      // If we have a travel status that requires alternative flights, ensure validation state is correct
      if (
        requiresAlternativeFlights &&
        phase4Store.selectedFlights.length > 0
      ) {
        safeUpdateValidationState({
          travelStatusStepValidation: {
            ...phase4Store.travelStatusStepValidation,
            2: true,
          },
          travelStatusStepInteraction: {
            ...phase4Store.travelStatusStepInteraction,
            2: true,
          },
          travelStatusShowingSuccess: true,
          travelStatusIsValid: true,
          _lastUpdate: Date.now(),
        });
      }

      setIsInitialized(true);
      setIsLoading(false);
    } catch (error) {
      console.error("Error during flight initialization:", error);
      setIsInitialized(true);
      setIsLoading(false);
    }
  }, [flightStore, phase4Store, mainStore]); // Add the store dependencies

  // Add effect to persist flight data when it changes
  React.useEffect(() => {
    if (!isInitializedRef.current) return;

    const travelStatus = phase4Store.travelStatusAnswers.find(
      (a) => a.questionId === "travel_status"
    )?.value;

    const requiresAlternativeFlights =
      travelStatus === "provided" || travelStatus === "took_alternative_own";

    // Only persist if we have data to persist
    if (
      flightStore.originalFlights.length > 0 ||
      phase4Store.selectedFlights.length > 0 ||
      phase4Store.travelStatusAnswers.length > 0 ||
      phase4Store.informedDateAnswers.length > 0
    ) {
      console.log("Persisting flight data:", {
        originalFlights: flightStore.originalFlights.length,
        selectedFlights: phase4Store.selectedFlights.length,
        requiresAlternativeFlights,
        hasTravelStatusAnswers: phase4Store.travelStatusAnswers.length > 0,
        hasInformedDateAnswers: phase4Store.informedDateAnswers.length > 0,
        timestamp: new Date().toISOString(),
      });

      // Store original flights and alternative flights separately
      // Original flights come from phase3, alternative flights are selected in phase4
      localStorage.setItem(
        "phase4FlightData",
        JSON.stringify({
          originalFlights: flightStore.originalFlights, // Always preserve original flights
          selectedFlights: requiresAlternativeFlights
            ? phase4Store.selectedFlights
            : [],
          travelStatusAnswers: phase4Store.travelStatusAnswers,
          informedDateAnswers: phase4Store.informedDateAnswers,
          _lastUpdate: Date.now(),
        })
      );

      // Always store alternative flights in their dedicated storage
      if (
        requiresAlternativeFlights &&
        phase4Store.selectedFlights.length > 0
      ) {
        localStorage.setItem(
          "phase4AlternativeFlights",
          JSON.stringify(phase4Store.selectedFlights)
        );
      }
    }
  }, [
    flightStore.originalFlights,
    phase4Store.selectedFlights,
    phase4Store.travelStatusAnswers,
    phase4Store.informedDateAnswers,
  ]);

  // Add cleanup effect
  React.useEffect(() => {
    return () => {
      // Save state before unmounting
      const travelStatus = phase4Store.travelStatusAnswers.find(
        (a) => a.questionId === "travel_status"
      )?.value;

      const requiresAlternativeFlights =
        travelStatus === "provided" || travelStatus === "took_alternative_own";

      localStorage.setItem(
        "phase4FlightData",
        JSON.stringify({
          originalFlights: flightStore.originalFlights,
          selectedFlights: requiresAlternativeFlights
            ? phase4Store.selectedFlights
            : [],
          _lastUpdate: Date.now(),
        })
      );
    };
  }, []);

  // Memoize validation states to prevent unnecessary re-renders
  const validationStates = React.useMemo(
    () => ({
      isTripExperienceValid: Boolean(travelStatusStepValidation[2]) || false,
      isInformedDateValid:
        Boolean(informedDateStepValidation[3]) ||
        Boolean(phase4Store.informedDateIsValid) ||
        (phase4Store.informedDateAnswers?.length > 0 &&
          phase4Store.informedDateShowingSuccess),
      isFullyCompleted:
        (Boolean(travelStatusStepValidation[2]) &&
          (Boolean(informedDateStepValidation[3]) ||
            Boolean(phase4Store.informedDateIsValid))) ||
        false,
    }),
    [
      // Use JSON.stringify to create a stable dependency
      JSON.stringify({
        travelStatus: travelStatusStepValidation[2],
        informedDate: informedDateStepValidation[3],
        travelStatusShowingSuccess: phase4Store.travelStatusShowingSuccess,
        informedDateShowingSuccess: phase4Store.informedDateShowingSuccess,
        travelStatusIsValid: phase4Store.travelStatusIsValid,
        informedDateIsValid: phase4Store.informedDateIsValid,
      }),
    ]
  );

  const questions: Question[] = [
    {
      id: "travel_status",
      text: t.phases.tripExperience.steps.travelStatus.questions.travelStatus
        .title,
      type: "radio",
      options: [
        {
          id: "none",
          value: "none",
          label:
            t.phases.tripExperience.steps.travelStatus.questions.travelStatus
              .options.none,
          showConfetti: true,
        },
        {
          id: "self",
          value: "self",
          label:
            t.phases.tripExperience.steps.travelStatus.questions.travelStatus
              .options.self,
        },
        {
          id: "provided",
          value: "provided",
          label:
            t.phases.tripExperience.steps.travelStatus.questions.travelStatus
              .options.provided,
          showConfetti: true,
        },
        {
          id: "alternative_own",
          value: "took_alternative_own",
          label:
            t.phases.tripExperience.steps.travelStatus.questions.travelStatus
              .options.alternativeOwn,
          showConfetti: true,
        },
      ],
    },
    {
      id: "refund_status",
      text: t.phases.tripExperience.steps.travelStatus.questions.refundStatus
        .title,
      type: "radio",
      options: [
        {
          id: "yes",
          value: "yes",
          label:
            t.phases.tripExperience.steps.travelStatus.questions.refundStatus
              .options.yes,
        },
        {
          id: "no",
          value: "no",
          label:
            t.phases.tripExperience.steps.travelStatus.questions.refundStatus
              .options.no,
        },
      ],
      showIf: (answers: Answer[]) =>
        answers.some(
          (a: Answer) => a.questionId === "travel_status" && a.value === "none"
        ),
    },
    {
      id: "ticket_cost",
      text: t.phases.tripExperience.steps.travelStatus.questions.ticketCost
        .title,
      type: "money",
      showIf: (answers: Answer[]) => {
        const hasNoneTravel = answers.some(
          (a: Answer) => a.questionId === "travel_status" && a.value === "none"
        );
        const hasNoRefund = answers.some(
          (a: Answer) => a.questionId === "refund_status" && a.value === "no"
        );

        return hasNoneTravel && hasNoRefund;
      },
    },
    {
      id: "alternative_flight_airline_expense",
      text: t.phases.tripExperience.steps.travelStatus.questions
        .alternativeFlightAirlineExpense.title,
      label:
        t.phases.tripExperience.steps.travelStatus.questions
          .alternativeFlightAirlineExpense.label,
      type: "flight_selector",
      showIf: (answers: Answer[]) =>
        answers.some(
          (a: Answer) =>
            a.questionId === "travel_status" && a.value === "provided"
        ),
    },
    {
      id: "alternative_flight_own_expense",
      text: t.phases.tripExperience.steps.travelStatus.questions
        .alternativeFlightOwnExpense.title,
      type: "flight_selector",
      showIf: (answers: Answer[]) =>
        answers.some(
          (a: Answer) =>
            a.questionId === "travel_status" &&
            a.value === "took_alternative_own"
        ),
    },
    {
      id: "trip_costs",
      text: t.phases.tripExperience.steps.travelStatus.questions.tripCosts
        .title,
      type: "money",
      showIf: (answers: Answer[]) =>
        answers.some(
          (a: Answer) =>
            a.questionId === "travel_status" &&
            a.value === "took_alternative_own"
        ),
    },
  ];

  const informedDateQuestions: Question[] = [
    {
      id: "informed_date",
      text: t.phases.tripExperience.steps.informedDate.questions.informedDate
        .title,
      type: "radio",
      options: [
        {
          id: "on_departure",
          value: "on_departure",
          label:
            t.phases.tripExperience.steps.informedDate.questions.informedDate
              .options.onDeparture,
          showCheck: true,
        },
        {
          id: "specific_date",
          value: "specific_date",
          label:
            t.phases.tripExperience.steps.informedDate.questions.informedDate
              .options.specificDate,
          showCheck: true,
        },
      ],
    },
    {
      id: "specific_informed_date",
      text: t.phases.tripExperience.steps.informedDate.questions
        .specificInformedDate.title,
      label:
        t.phases.tripExperience.steps.informedDate.questions
          .specificInformedDate.label,
      type: "date",
      options: [],
      showIf: (answers: Answer[]) =>
        answers.some(
          (a: Answer) =>
            a.questionId === "informed_date" && a.value === "specific_date"
        ),
    },
  ];

  // Update validation check to properly validate alternative flights
  const validateAlternativeFlight = React.useCallback(
    (selectedFlight: Flight | null | undefined) => {
      console.log("=== validateAlternativeFlight ENTRY ===", {
        selectedFlight: selectedFlight
          ? {
              id: selectedFlight.id,
              flightNumber: selectedFlight.flightNumber,
              date: selectedFlight.date,
            }
          : null,
        timestamp: new Date().toISOString(),
      });

      // Check if any browser notifications are visible
      if (typeof window !== "undefined") {
        const notifications = document.querySelectorAll(
          '.notification, [role="alert"], .alert, .toast'
        );
        if (notifications.length > 0) {
          console.log("=== Found notification elements during validation ===", {
            count: notifications.length,
            elements: Array.from(notifications).map((el) => ({
              className: el.className,
              text: el.textContent,
            })),
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Log flight store state
      console.log("=== Flight Store State During Validation ===", {
        phase4StoreFlights: phase4Store.selectedFlights.map((f) => ({
          id: f.id,
          flightNumber: f.flightNumber,
          date: f.date,
        })),
        flightStorePhase4: flightStore.getSelectedFlights(4).map((f) => ({
          id: f.id,
          flightNumber: f.flightNumber,
          date: f.date,
        })),
        originalFlights: flightStore.originalFlights.map((f) => ({
          id: f.id,
          flightNumber: f.flightNumber,
          date: f.date,
        })),
        timestamp: new Date().toISOString(),
      });

      // Check if selectedFlight is null or undefined
      if (!selectedFlight) {
        console.warn("Selected flight is null or undefined");
        return false;
      }

      // Get original flight from flightStore
      const originalFlight = flightStore.originalFlights[0];

      // If there's no original flight, we can't validate
      if (!originalFlight) {
        console.warn("No original flight found for validation");
        return false;
      }

      // For alternative flights, we should always validate that it's actually different
      // from the original flight, but we need to be careful with date comparisons

      // Format dates for comparison to ensure consistent comparison
      const formatDateForComparison = (
        dateStr: string | Date | null | undefined
      ): string => {
        if (!dateStr) return "";
        try {
          const date =
            typeof dateStr === "string" ? new Date(dateStr) : dateStr;
          return date.toISOString().split("T")[0]; // Get YYYY-MM-DD part only
        } catch (e) {
          return String(dateStr);
        }
      };

      // Compare flights
      const flightComparison = {
        originalFlight: {
          id: originalFlight.id,
          flightNumber: originalFlight.flightNumber,
          date: formatDateForComparison(originalFlight.date),
        },
        selectedFlight: {
          id: selectedFlight.id,
          flightNumber: selectedFlight.flightNumber,
          date: formatDateForComparison(selectedFlight.date),
        },
      };

      console.log("=== Validating Alternative Flight ===", {
        comparison: flightComparison,
        timestamp: new Date().toISOString(),
      });

      // Check if it's a different flight (by ID or flight number)
      // We don't want to validate date because the alternative flight
      // might be on the same day but a different flight
      const isValid =
        selectedFlight.id !== originalFlight.id ||
        selectedFlight.flightNumber !== originalFlight.flightNumber;

      console.log("=== Alternative Flight Validation Result ===", {
        isValid,
        reason: isValid
          ? "Flight is different from original"
          : "Selected flight appears to be the same as original flight",
        timestamp: new Date().toISOString(),
      });

      return isValid;
    },
    [flightStore.originalFlights, phase4Store.selectedFlights, flightStore]
  );

  // Update handleTripExperienceComplete to properly set validation state
  const handleTripExperienceComplete = React.useCallback(() => {
    // Get the travel status answer
    const travelStatus = travelStatusAnswers.find(
      (a) => a.questionId === "travel_status"
    )?.value;

    const requiresAlternativeFlights =
      travelStatus === "provided" || travelStatus === "took_alternative_own";

    // Get the alternative flight from the QA wizard answers
    const alternativeFlightAnswer = travelStatusAnswers.find(
      (a) =>
        a.questionId === "alternative_flight_airline_expense" ||
        a.questionId === "alternative_flight_own_expense"
    );

    // Log the current state for debugging
    console.log("=== handleTripExperienceComplete - Entry ===", {
      travelStatusAnswers,
      alternativeFlightAnswer,
      flightStoreFlights: flightStore.getSelectedFlights(4).map((f) => ({
        id: f.id,
        flightNumber: f.flightNumber,
        date: f.date,
      })),
      phase4StoreFlights: phase4Store.selectedFlights.map((f) => ({
        id: f.id,
        flightNumber: f.flightNumber,
        date: f.date,
      })),
      originalFlights: flightStore.originalFlights.map((f) => ({
        id: f.id,
        flightNumber: f.flightNumber,
        date: f.date,
      })),
      travelStatus,
      requiresAlternativeFlights,
      isFromSharedLink:
        typeof window !== "undefined" && !!window._handlingSharedLink,
      timestamp: new Date().toISOString(),
    });

    // Check for any browser notifications at the start
    if (typeof window !== "undefined") {
      const notifications = document.querySelectorAll(
        '.notification, [role="alert"], .alert, .toast'
      );
      if (notifications.length > 0) {
        console.log(
          "=== Found notification elements at start of handleTripExperienceComplete ===",
          {
            count: notifications.length,
            elements: Array.from(notifications).map((el) => ({
              className: el.className,
              text: el.textContent,
            })),
            timestamp: new Date().toISOString(),
          }
        );
      }
    }

    // Only validate alternative flights if required
    if (requiresAlternativeFlights) {
      // Get the alternative flight from the answer if available
      let selectedFlights: Flight[] = [];

      if (alternativeFlightAnswer && alternativeFlightAnswer.value) {
        try {
          // If the answer contains a flight object, use it
          if (typeof alternativeFlightAnswer.value === "object") {
            selectedFlights = [alternativeFlightAnswer.value as Flight];
            console.log("=== Using flight from QA wizard answer ===", {
              flight: alternativeFlightAnswer.value,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error("Error parsing alternative flight answer:", error);
        }
      }

      // If no flight in the answer, check both stores
      if (selectedFlights.length === 0) {
        const flightStoreFlights = flightStore.getSelectedFlights(4) || [];
        const phase4StoreFlights = phase4Store.selectedFlights || [];

        console.log("=== Alternative Flight Check ===", {
          flightStoreFlights: flightStoreFlights.map((f) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.date,
          })),
          phase4StoreFlights: phase4StoreFlights.map((f) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.date,
          })),
          originalFlights: flightStore.originalFlights.map((f) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.date,
          })),
          timestamp: new Date().toISOString(),
        });

        // Use flights from either store - prioritize phase4Store since that's where alternative flights are stored
        selectedFlights =
          phase4StoreFlights.length > 0
            ? phase4StoreFlights
            : flightStoreFlights;

        // If we're using a shared link and already have flights, don't prompt user
        if (
          selectedFlights.length === 0 &&
          typeof window !== "undefined" &&
          !window._handlingSharedLink
        ) {
          console.log("No alternative flights selected in either store");
          alert("Please select your alternative flights before continuing.");
          return;
        }
      }

      // Sync flights between stores to ensure consistency, but keep them isolated from original flights
      if (selectedFlights.length > 0) {
        console.log("=== Syncing selected alternative flights ===", {
          flights: selectedFlights.map((f) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.date,
          })),
          timestamp: new Date().toISOString(),
        });

        // Use the syncAlternativeFlights function to ensure data is properly synchronized
        syncAlternativeFlights(selectedFlights, flightStore, phase4Store);
      } else if (typeof window !== "undefined" && window._handlingSharedLink) {
        console.log(
          "=== Shared link without alternative flights, continuing anyway ==="
        );
        // For shared links, we allow continuing even without alternative flights
        // The user can add them later
      } else {
        // If we got here, we likely don't have flights when we need them
        console.log("Alternative flights required but not found");
        alert("Please select your alternative flights before continuing.");
        return;
      }

      if (
        selectedFlights.length > 0 &&
        !validateAlternativeFlight(selectedFlights[0]) &&
        !window._handlingSharedLink
      ) {
        console.log("Alternative flight validation failed");
        alert(
          "The selected alternative flight is not valid. Please select a different flight."
        );
        return;
      }
    } else {
      // For non-alternative flight scenarios, clear any previously stored alternative flights
      phase4Store.batchUpdate({
        selectedFlights: [],
        _lastUpdate: Date.now(),
      });

      // Clear alternative flights from localStorage
      localStorage.removeItem("phase4AlternativeFlights");

      // Update phase4FlightData to not include alternative flights
      localStorage.setItem(
        "phase4FlightData",
        JSON.stringify({
          originalFlights: flightStore.originalFlights,
          selectedFlights: [],
          _lastUpdate: Date.now(),
        })
      );
    }

    // Update validation state
    const newValidationState = {
      travelStatusStepValidation: {
        ...travelStatusStepValidation,
        2: true,
      },
      travelStatusStepInteraction: {
        ...travelStatusStepInteraction,
        2: true,
      },
      travelStatusShowingSuccess: true,
      travelStatusIsValid: true,
      _lastUpdate: Date.now(),
    };

    console.log(
      "=== handleTripExperienceComplete - Setting Validation State ===",
      {
        newState: newValidationState,
        timestamp: new Date().toISOString(),
      }
    );

    // Only update if the state has actually changed
    if (!travelStatusStepValidation[2] || !travelStatusStepInteraction[2]) {
      safeUpdateValidationState(newValidationState);
    }

    // Check for any browser notifications after updating validation state
    if (typeof window !== "undefined") {
      setTimeout(() => {
        const notifications = document.querySelectorAll(
          '.notification, [role="alert"], .alert, .toast'
        );
        if (notifications.length > 0) {
          console.log(
            "=== Found notification elements after updating validation state ===",
            {
              count: notifications.length,
              elements: Array.from(notifications).map((el) => ({
                className: el.className,
                text: el.textContent,
              })),
              timestamp: new Date().toISOString(),
            }
          );
        }
      }, 500);
    }

    // Save to localStorage to persist the state
    localStorage.setItem(
      "phase4ValidationState",
      JSON.stringify({
        travelStatusStepValidation: {
          ...travelStatusStepValidation,
          2: true,
        },
        travelStatusStepInteraction: {
          ...travelStatusStepInteraction,
          2: true,
        },
        informedDateStepValidation,
        informedDateStepInteraction,
        travelStatusAnswers,
        informedDateAnswers,
      })
    );

    // Also save to phase4Store in localStorage directly
    try {
      const phase4StoreData = localStorage.getItem("phase4Store");
      if (phase4StoreData) {
        const parsedData = JSON.parse(phase4StoreData);
        if (parsedData.state) {
          parsedData.state.travelStatusAnswers = travelStatusAnswers;
          parsedData.state.travelStatusShowingSuccess = true;
          parsedData.state.travelStatusIsValid = true;
          parsedData.state.travelStatusStepValidation = {
            ...travelStatusStepValidation,
            2: true,
          };
          parsedData.state.travelStatusStepInteraction = {
            ...travelStatusStepInteraction,
            2: true,
          };
          parsedData.state._lastUpdate = Date.now();

          localStorage.setItem("phase4Store", JSON.stringify(parsedData));

          console.log(
            "=== handleTripExperienceComplete - Updated phase4Store ===",
            {
              travelStatusAnswers,
              timestamp: new Date().toISOString(),
            }
          );
        }
      }
    } catch (error) {
      console.error("Error updating phase4Store in localStorage:", error);
    }

    // Force the transition to step 3
    const accordionContext =
      typeof window !== "undefined"
        ? (window as any).__accordionContext
        : undefined;
    if (accordionContext?.setOpenAccordions) {
      accordionContext.setOpenAccordions(new Set(["1", "2", "3"]));
    }
  }, [
    flightStore,
    phase4Store,
    travelStatusAnswers,
    travelStatusStepValidation,
    travelStatusStepInteraction,
    informedDateStepValidation,
    informedDateStepInteraction,
    safeUpdateValidationState,
    informedDateAnswers,
  ]);

  const handleInformedDateComplete = (answers: Answer[]) => {
    if (isLoading) return;

    console.log("=== handleInformedDateComplete - Entry ===", {
      answers,
      timestamp: new Date().toISOString(),
    });

    // Update the store with the new answers
    phase4Store.batchUpdate({
      informedDateAnswers: answers,
      informedDateShowingSuccess: true,
      informedDateIsValid: true,
      informedDateStepValidation: {
        ...informedDateStepValidation,
        3: true, // Mark step 3 as validated
      },
      informedDateStepInteraction: {
        ...informedDateStepInteraction,
        3: true, // Mark step 3 as interacted with
      },
      _lastUpdate: Date.now(),
    });

    // Update validation state in localStorage
    try {
      // First try to get any existing validation state
      const validationStateStr = localStorage.getItem("phase4ValidationState");
      const validationState = validationStateStr
        ? JSON.parse(validationStateStr)
        : {};

      // Update with the new informed date validation
      const updatedValidationState = {
        ...validationState,
        informedDateAnswers: answers,
        informedDateStepValidation: {
          ...informedDateStepValidation,
          3: true,
        },
        informedDateStepInteraction: {
          ...informedDateStepInteraction,
          3: true,
        },
        informedDateShowingSuccess: true,
        informedDateIsValid: true,
        _timestamp: Date.now(),
      };

      localStorage.setItem(
        "phase4ValidationState",
        JSON.stringify(updatedValidationState)
      );

      console.log(
        "=== handleInformedDateComplete - Updated validation state ===",
        {
          updatedValidationState,
          timestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error("Error updating validation state:", error);
    }

    // Also update the flight data in localStorage to include informed date answers
    try {
      // Get any existing phase4FlightData
      const flightDataStr = localStorage.getItem("phase4FlightData");
      const flightData = flightDataStr ? JSON.parse(flightDataStr) : {};

      // Update with the informed date answers
      const updatedFlightData = {
        ...flightData,
        informedDateAnswers: answers,
        _lastUpdate: Date.now(),
      };

      localStorage.setItem(
        "phase4FlightData",
        JSON.stringify(updatedFlightData)
      );

      console.log("=== handleInformedDateComplete - Updated flight data ===", {
        updatedFlightData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating flight data:", error);
    }
  };

  // Add effect to track when original flights are set
  React.useEffect(() => {
    if (flightStore.originalFlights.length > 0) {
      console.log("Original flights updated:", {
        flights: flightStore.originalFlights.map((f: Flight) => ({
          id: f.id,
          flightNumber: f.flightNumber,
          date: f.date,
          from: f.departureCity,
          to: f.arrivalCity,
        })),
      });
    }
  }, [flightStore.originalFlights]);

  // Add logging to track when validation is checked
  React.useEffect(() => {
    const selectedFlights = flightStore.getSelectedFlights(4);
    console.log("Trip Experience Validation Check:", {
      travelStatusAnswers,
      selectedFlights,
      isValid: validationStates.isTripExperienceValid,
    });
  }, [
    travelStatusAnswers,
    flightStore,
    validationStates.isTripExperienceValid,
  ]);

  // Add logging for when selected flights change
  React.useEffect(() => {
    const selectedFlights = flightStore.getSelectedFlights(4);
    if (selectedFlights && selectedFlights.length > 0) {
      console.log("Selected Flights Updated:", {
        selectedFlights: selectedFlights.map((f: Flight) => ({
          id: f.id,
          flightNumber: f.flightNumber,
          date: f.date,
        })),
      });
    }
  }, [flightStore]);

  // Completely disable auto transitions when loaded from shared link
  const handleAutoTransition = React.useCallback(
    (currentStepId: string) => {
      // CRITICAL: Never auto-transition when working with shared link data
      if (typeof window !== "undefined" && window._handlingSharedLink) {
        return null;
      }

      // Don't transition during loading
      if (isLoading) {
        return null;
      }

      console.log("TripExperience - handleAutoTransition:", {
        currentStepId,
        isSharedLink:
          typeof window !== "undefined" && !!window._handlingSharedLink,
        timestamp: new Date().toISOString(),
      });

      // Only handle the most basic cases
      if (currentStepId === "1") {
        return "2";
      }

      return null;
    },
    [isLoading]
  );

  // Add logging to track validation state updates
  React.useEffect(() => {
    console.log("Validation states updated:", {
      validationStates,
      travelStatusStepValidation,
      travelStatusStepInteraction,
    });
  }, [
    validationStates,
    travelStatusStepValidation,
    travelStatusStepInteraction,
  ]);

  // Check if we can continue
  const canContinue = React.useCallback(() => {
    return (
      validationStates.isTripExperienceValid &&
      validationStates.isInformedDateValid
    );
  }, [validationStates]);

  const handleBack = () => {
    console.log("=== handleBack - Entry ===", {
      travelStatusAnswers,
      selectedFlights: flightStore.getSelectedFlights(4),
      phase4Flights: phase4Store.selectedFlights,
      timestamp: new Date().toISOString(),
    });

    const travelStatus = travelStatusAnswers.find(
      (a) => a.questionId === "travel_status"
    )?.value;

    // Get flights from both stores
    const selectedFlights = flightStore.getSelectedFlights(4);
    const phase4Flights = phase4Store.selectedFlights;

    // Determine which flights to save
    const flightsToSave =
      selectedFlights.length > 0 ? selectedFlights : phase4Flights;

    // Always sync flights if they exist, regardless of travel status
    if (flightsToSave.length > 0) {
      console.log("=== handleBack - Syncing flights before navigation ===", {
        flightsCount: flightsToSave.length,
        travelStatus,
        timestamp: new Date().toISOString(),
      });

      // Use syncAlternativeFlights to ensure data is properly synchronized
      syncAlternativeFlights(flightsToSave, flightStore, phase4Store);
    }

    // Save validation state
    localStorage.setItem(
      "phase4ValidationState",
      JSON.stringify({
        travelStatusStepValidation,
        travelStatusStepInteraction,
        informedDateStepValidation,
        informedDateStepInteraction,
        travelStatusAnswers,
        informedDateAnswers,
      })
    );

    console.log("=== handleBack - Exit ===", {
      savedFlights: flightsToSave.length,
      validationState: {
        travelStatusStepValidation,
        travelStatusStepInteraction,
      },
      timestamp: new Date().toISOString(),
    });

    router.push("/phases/flight-details");
  };

  // Add validation for flight data before evaluation
  const validateFlightData = React.useCallback(
    (originalFlights: Flight[], selectedFlights: Flight[]) => {
      // Don't run validation during loading or before full initialization
      if (isLoading || !isInitialized) {
        console.log("=== validateFlightData - SKIPPED (not initialized) ===");
        return false;
      }

      // Get travel status from answers
      const travelStatus = travelStatusAnswers.find(
        (a) => a.questionId === "travel_status"
      )?.value;

      console.log("=== validateFlightData - Entry ===", {
        travelStatus,
        originalFlights: originalFlights.length,
        selectedFlights: selectedFlights.length,
        timestamp: new Date().toISOString(),
      });

      // Get the alternative flight from the QA wizard answers
      const alternativeFlightAnswer = travelStatusAnswers.find(
        (a) =>
          a.questionId === "alternative_flight_airline_expense" ||
          a.questionId === "alternative_flight_own_expense"
      );

      // For alternative flight scenarios, ensure flights are properly synced
      if (
        travelStatus === "provided" ||
        travelStatus === "took_alternative_own"
      ) {
        // First check if we have a flight in the QA wizard answer
        let alternativeFlights: Flight[] = [];

        if (alternativeFlightAnswer && alternativeFlightAnswer.value) {
          try {
            // If the answer contains a flight object, use it
            if (typeof alternativeFlightAnswer.value === "object") {
              alternativeFlights = [alternativeFlightAnswer.value as Flight];
              console.log(
                "=== Using flight from QA wizard answer for validation ===",
                {
                  flight: alternativeFlightAnswer.value,
                  timestamp: new Date().toISOString(),
                }
              );
            }
          } catch (error) {
            console.error("Error parsing alternative flight answer:", error);
          }
        }

        // If we have alternative flights from the QA wizard, sync those
        if (alternativeFlights.length > 0) {
          // Only sync if there's actually a change needed
          const currentPhase4Flights = JSON.stringify(
            phase4Store.selectedFlights
          );
          const newFlights = JSON.stringify(alternativeFlights);

          if (currentPhase4Flights !== newFlights) {
            // Store alternative flights in phase4 storage
            syncAlternativeFlights(
              alternativeFlights,
              flightStore,
              phase4Store
            );
          } else {
            console.log("=== No need to sync flights - already in sync ===");
          }
        }
        // Otherwise, if we have selected flights passed in, use those
        else if (selectedFlights.length > 0) {
          // Only sync if there's actually a change needed
          const currentPhase4Flights = JSON.stringify(
            phase4Store.selectedFlights
          );
          const newFlights = JSON.stringify(selectedFlights);

          if (currentPhase4Flights !== newFlights) {
            // Store alternative flights in phase4 storage
            syncAlternativeFlights(selectedFlights, flightStore, phase4Store);
          } else {
            console.log("=== No need to sync flights - already in sync ===");
          }
        }

        // Regardless of the above, keep the original flights safe
        if (originalFlights.length > 0) {
          // Only set original flights if they're different from what's already there
          const currentOriginalFlights = JSON.stringify(
            flightStore.originalFlights
          );
          const newOriginalFlights = JSON.stringify(originalFlights);

          if (currentOriginalFlights !== newOriginalFlights) {
            // Ensure original flights are properly set
            flightStore.setOriginalFlights(originalFlights);
          }
        }
      }

      if (!travelStatus) {
        console.error("No travel status found");
        throw new Error("Please complete the travel status questions first");
      }

      // Ensure we have original flights
      if (!originalFlights?.length) {
        console.error("No original flights found");
        throw new Error("No valid flight IDs found in original flights");
      }

      // For other travel statuses that don't require alternative flights,
      // make sure we're using the original flights
      if (
        travelStatus !== "provided" &&
        travelStatus !== "took_alternative_own"
      ) {
        // Only clear if we actually have alternative flights to clear
        if (phase4Store.selectedFlights.length > 0) {
          // Use original flights and clear any alternative flights
          phase4Store.batchUpdate({
            selectedFlights: [], // Clear alternative flights as they're not needed
            _lastUpdate: Date.now(),
          });

          // For non-alternative flight travel statuses, don't store alternative flights
          localStorage.setItem(
            "phase4FlightData",
            JSON.stringify({
              originalFlights: flightStore.originalFlights,
              selectedFlights: [], // No alternative flights needed
              _lastUpdate: Date.now(),
            })
          );

          // Clear any previously stored alternative flights
          localStorage.removeItem("phase4AlternativeFlights");
        }
      }

      console.log("=== validateFlightData EXIT ===", {
        isValid: true,
        originalFlights: originalFlights.map((f) => ({
          id: f.id,
          flightNumber: f.flightNumber,
        })),
        alternativeFlights:
          travelStatus === "provided" || travelStatus === "took_alternative_own"
            ? phase4Store.selectedFlights.map((f) => ({
                id: f.id,
                flightNumber: f.flightNumber,
              }))
            : [],
        timestamp: new Date().toISOString(),
      });

      return true;
    },
    [travelStatusAnswers, phase4Store, flightStore, isLoading, isInitialized]
  );

  const handleContinue = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      console.log("=== Trip Experience - Continue Clicked ===", {
        travelStatusAnswers,
        informedDateAnswers,
        timestamp: new Date().toISOString(),
      });

      const compensationAmount = useStore.getState().compensationAmount || 0;
      const dealId = sessionStorage.getItem("hubspot_deal_id");
      const personalDetails = useStore.getState().personalDetails;
      const marketingAccepted = useStore.getState().marketingAccepted;

      if (dealId) {
        console.log("Updating HubSpot deal with trip experience:", {
          dealId,
          amount: compensationAmount,
          stage: "1173731568",
          personalDetails,
          marketingStatus: marketingAccepted,
          timestamp: new Date().toISOString(),
        });

        try {
          const updateResponse = await fetch(
            "/.netlify/functions/hubspot-integration/deal",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contactId: ClaimService.getHubspotContactId(),
                dealId,
                amount: compensationAmount,
                action: "update",
                stage: "1173731568",
                personalDetails,
                marketingStatus: marketingAccepted,
              }),
            }
          );

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error("Failed to update deal:", errorText);
            throw new Error(`Failed to update deal: ${errorText}`);
          }

          const updateResult = await updateResponse.json();
          console.log("Successfully updated HubSpot deal:", updateResult);
        } catch (error) {
          console.error("Error updating HubSpot deal:", error);
          throw error;
        }
      }

      // Get travel status from answers
      const travelStatusAnswer = travelStatusAnswers.find(
        (a) => a.questionId === "travel_status"
      );

      if (!travelStatusAnswer || typeof travelStatusAnswer.value !== "string") {
        throw new Error("No valid travel status selected");
      }

      const travelStatus = travelStatusAnswer.value;

      // Get informed date
      const informedDate = (() => {
        const specificDate = informedDateAnswers.find(
          (a) => a.questionId === "specific_informed_date"
        )?.value;

        if (specificDate) {
          return String(specificDate);
        }

        // If no specific date, use the flight date
        if (flightStore.originalFlights[0]?.date) {
          return formatDateToYYYYMMDD(
            new Date(flightStore.originalFlights[0].date)
          );
        }

        return formatDateToYYYYMMDD(new Date());
      })();

      // Log the data being used for evaluation
      console.log("=== Trip Experience - Evaluation Data ===", {
        travelStatus,
        informedDate,
        originalFlights: flightStore.originalFlights,
        timestamp: new Date().toISOString(),
      });

      if (!informedDate || !isValidYYYYMMDD(String(informedDate))) {
        console.error("Date validation failed:", {
          informedDate,
          specificDate: informedDateAnswers.find(
            (a) => a.questionId === "specific_informed_date"
          )?.value,
          flightDate: flightStore.originalFlights[0]?.date,
          departureTime: flightStore.originalFlights[0]?.departureTime,
        });
        throw new Error(
          "The date format is invalid. Please use YYYY-MM-DD format"
        );
      }

      // Ensure we have valid flight IDs
      const validOriginalFlights = flightStore.originalFlights.filter(
        (f) =>
          f !== null &&
          typeof f.id === "string" &&
          f.id.length > 0 &&
          typeof f.flightNumber === "string" &&
          f.flightNumber.length > 0
      );

      // Only validate selected flights if alternative travel was chosen
      const requiresAlternativeFlights =
        travelStatus === "provided" || travelStatus === "took_alternative_own";

      // Get alternative flights from QA wizard answers first
      let alternativeFlights: Flight[] = [];

      if (requiresAlternativeFlights) {
        // Get the alternative flight from the QA wizard answers
        const alternativeFlightAnswer = travelStatusAnswers.find(
          (a) =>
            a.questionId === "alternative_flight_airline_expense" ||
            a.questionId === "alternative_flight_own_expense"
        );

        if (alternativeFlightAnswer && alternativeFlightAnswer.value) {
          try {
            // If the answer contains a flight object, use it
            if (typeof alternativeFlightAnswer.value === "object") {
              alternativeFlights = [alternativeFlightAnswer.value as Flight];
              console.log(
                "=== Using flight from QA wizard answer for evaluation ===",
                {
                  flight: alternativeFlightAnswer.value,
                  timestamp: new Date().toISOString(),
                }
              );
            }
          } catch (error) {
            console.error("Error parsing alternative flight answer:", error);
          }
        }

        // If no flight in the answer, check both stores
        if (alternativeFlights.length === 0) {
          const flightStoreFlights = flightStore.getSelectedFlights(4) || [];
          const phase4StoreFlights = phase4Store.selectedFlights || [];

          console.log("=== Alternative Flight Check for Evaluation ===", {
            flightStoreFlights: flightStoreFlights.map((f) => ({
              id: f.id,
              flightNumber: f.flightNumber,
              date: f.date,
            })),
            phase4StoreFlights: phase4StoreFlights.map((f) => ({
              id: f.id,
              flightNumber: f.flightNumber,
              date: f.date,
            })),
            timestamp: new Date().toISOString(),
          });

          // Use flights from either store
          alternativeFlights =
            flightStoreFlights.length > 0
              ? flightStoreFlights
              : phase4StoreFlights;
        }

        // Ensure we have alternative flights
        if (alternativeFlights.length === 0) {
          throw new Error(
            "Please select your alternative flights before continuing"
          );
        }

        // Sync the alternative flights to ensure consistency
        syncAlternativeFlights(alternativeFlights, flightStore, phase4Store);

        // Validate flight data
        validateFlightData(validOriginalFlights, alternativeFlights);
      } else {
        // For non-alternative flight scenarios, just validate with original flights
        validateFlightData(validOriginalFlights, []);
      }

      // Complete phase 4 before evaluation
      await mainStore.completePhase(4);

      // Use the ClaimService to evaluate the claim
      const evaluationResult = await ClaimService.evaluateClaim(
        validOriginalFlights,
        requiresAlternativeFlights ? alternativeFlights : [],
        travelStatusAnswers,
        informedDateAnswers,
        marketingAccepted
      );

      // Validate evaluation result
      if (!evaluationResult || typeof evaluationResult.status === "undefined") {
        throw new Error("Invalid evaluation response received");
      }

      // Store the evaluation result in ClaimService
      ClaimService.setStoredEvaluationResponse({
        status: evaluationResult.status,
        contract: evaluationResult.contract,
        rejection_reasons: evaluationResult.rejection_reasons,
        journey_booked_flightids: validOriginalFlights.map((f) => f.id),
        journey_fact_flightids: requiresAlternativeFlights
          ? alternativeFlights.map((f) => f.id)
          : [],
        information_received_at: informedDate,
        travel_status: travelStatus,
        journey_fact_type: (() => {
          switch (travelStatus) {
            case "none":
              return "none";
            case "self":
              return "self";
            case "provided":
              return "provided";
            case "took_alternative_own":
              return "self";
            default:
              return "none";
          }
        })(),
        guid: evaluationResult.guid,
        recommendation_guid: evaluationResult.recommendation_guid,
      });

      // Update HubSpot deal with evaluation results
      if (dealId) {
        try {
          // First update the contact information
          const contactResponse = await fetch(
            "/.netlify/functions/hubspot-integration/contact",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contactId: ClaimService.getHubspotContactId(),
                ...mainStore.personalDetails,
                arbeitsrecht_marketing_status: marketingAccepted,
              }),
            }
          );

          if (!contactResponse.ok) {
            console.error(
              "Failed to update HubSpot contact:",
              await contactResponse.text()
            );
          }

          // Then update the deal
          const hubspotResponse = await fetch(
            "/.netlify/functions/hubspot-integration/deal",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contactId: ClaimService.getHubspotContactId(),
                dealId,
                originalFlights: validOriginalFlights,
                selectedFlights: alternativeFlights,
                evaluationResponse: evaluationResult,
                stage: "evaluation",
                status:
                  evaluationResult.status === "accept"
                    ? "qualified"
                    : "rejected",
                personalDetails: mainStore.personalDetails,
              }),
            }
          );

          if (!hubspotResponse.ok) {
            console.error(
              "Failed to update HubSpot deal:",
              await hubspotResponse.text()
            );
          }
        } catch (error) {
          console.error("Error updating HubSpot deal:", error);
        }
      }

      // Get the next URL based on evaluation result
      const isAccepted = evaluationResult.status === "accept";
      const nextUrl = isAccepted
        ? `/${lang}/phases/claim-success`
        : `/${lang}/phases/claim-rejected`;

      // Update store flags based on evaluation result
      useStore.setState({
        _isClaimSuccess: isAccepted,
        _isClaimRejected: !isAccepted,
      });

      // Save final validation state
      const finalValidationState = {
        ...validationStates,
        stepValidation: {
          ...travelStatusStepValidation,
          2: true,
          3: true,
        },
        stepInteraction: {
          ...travelStatusStepInteraction,
          2: true,
          3: true,
        },
        2: true,
        3: true,
        _timestamp: Date.now(),
      };

      // Update store with final validation state
      safeUpdateValidationState({
        travelStatusStepValidation: {
          ...travelStatusStepValidation,
          2: true,
        },
        informedDateStepValidation: {
          ...informedDateStepValidation,
          3: true,
        },
        travelStatusStepInteraction: {
          ...travelStatusStepInteraction,
          2: true,
        },
        informedDateStepInteraction: {
          ...informedDateStepInteraction,
          3: true,
        },
        travelStatusShowingSuccess: true,
        travelStatusIsValid: true,
      });

      // Save to localStorage
      localStorage.setItem(
        "phase4ValidationState",
        JSON.stringify(finalValidationState)
      );

      // Explicitly mark phase 4 as completed in localStorage
      localStorage.setItem("phase4_explicitlyCompleted", "true");

      // Navigate to next page
      router.push(nextUrl);
    } catch (error) {
      console.error("=== Trip Experience - Error ===", {
        error,
        travelStatusAnswers,
        informedDateAnswers,
        timestamp: new Date().toISOString(),
      });
      setIsLoading(false);
    }
  };

  const getTripExperienceSummary = React.useMemo(() => {
    if (travelStatusAnswers.length === 0) return "";

    const travelStatus = travelStatusAnswers.find(
      (a: Answer) => a.questionId === "travel_status"
    )?.value;

    switch (travelStatus) {
      case "none":
        return t.phases.tripExperience.summary.travelStatus.notTraveled;
      case "self":
        return t.phases.tripExperience.summary.travelStatus.traveled;
      case "provided":
      case "took_alternative_own":
        return t.phases.tripExperience.summary.travelStatus.traveled;
      default:
        return "";
    }
  }, [travelStatusAnswers, t]);

  const getInformedDateSummary = React.useMemo(() => {
    if (informedDateAnswers.length === 0) return "";

    const informedDate = informedDateAnswers.find(
      (answer: Answer) => answer.questionId === "informed_date"
    )?.value;

    if (informedDate === "on_departure") {
      return t.phases.tripExperience.steps.informedDate.questions.informedDate
        .options.onDeparture;
    }

    const specificDate = informedDateAnswers.find(
      (answer: Answer) => answer.questionId === "specific_informed_date"
    )?.value;

    if (specificDate && typeof specificDate === "string") {
      try {
        // Ensure date is in YYYY-MM-DD format
        const [year, month, day] = specificDate.split("-");
        if (year && month && day) {
          const date = new Date(Number(year), Number(month) - 1, Number(day));
          if (!isNaN(date.getTime())) {
            return t.phases.tripExperience.summary.travelStatus.informedDate.replace(
              "{date}",
              date.toLocaleDateString(t.lang === "de" ? "de-DE" : "en-US")
            );
          }
        }
      } catch (error) {
        console.error("Error formatting date:", error);
      }
    }

    return "";
  }, [informedDateAnswers, t]);

  // Memoize QA Wizards to prevent unnecessary re-renders
  const TripExperienceWizard = React.useMemo(
    () => (
      <QAWizard
        questions={questions}
        onComplete={handleTripExperienceComplete}
        initialAnswers={travelStatusAnswers}
        selectedFlight={flightStore.getSelectedFlights(4)[0] || null}
        phase={4}
      />
    ),
    [
      questions,
      handleTripExperienceComplete,
      travelStatusAnswers,
      flightStore.getSelectedFlights,
      flightStore,
    ]
  );

  const InformedDateWizard = React.useMemo(
    () => (
      <QAWizard
        questions={informedDateQuestions}
        onComplete={handleInformedDateComplete}
        initialAnswers={informedDateAnswers}
        phase={4}
        wizardType="informed_date"
      />
    ),
    [informedDateQuestions, handleInformedDateComplete, informedDateAnswers]
  );

  // Memoize content to prevent unnecessary re-renders
  const content = React.useMemo(() => {
    // For shared links, we need a different initial accordion setup to prevent loops
    const initialAccordion =
      typeof window !== "undefined" && window._handlingSharedLink
        ? undefined
        : "2";

    return (
      <AccordionProvider
        onAutoTransition={handleAutoTransition}
        initialActiveAccordion={initialAccordion}
      >
        <div className="min-h-screen bg-[#f5f7fa]">
          <PhaseNavigation currentPhase={4} completedPhases={[1, 2, 3]} />
          <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
            <div className="space-y-6">
              <SpeechBubble message={t.phases.tripExperience.speechBubble} />

              {/* Trip Experience Wizard */}
              <AccordionCard
                title={t.phases.tripExperience.steps.travelStatus.title}
                stepId="2"
                isCompleted={Boolean(travelStatusStepValidation[2])}
                hasInteracted={Boolean(travelStatusStepInteraction[2])}
                isValid={validationStates.isTripExperienceValid}
                summary={getTripExperienceSummary}
                eyebrow={t.phases.tripExperience.steps.travelStatus.eyebrow}
                isQA={true}
              >
                <div
                  className={accordionConfig?.padding?.content || "px-4 py-4"}
                >
                  {TripExperienceWizard}
                </div>
              </AccordionCard>

              {/* Informed Date Wizard */}
              <AccordionCard
                title={t.phases.tripExperience.steps.informedDate.title}
                stepId="3"
                isCompleted={Boolean(
                  informedDateStepValidation[3] ||
                    phase4Store.informedDateIsValid
                )}
                hasInteracted={Boolean(
                  informedDateStepInteraction[3] ||
                    phase4Store.informedDateAnswers?.length > 0
                )}
                isValid={
                  validationStates.isInformedDateValid ||
                  Boolean(phase4Store.informedDateIsValid)
                }
                summary={getInformedDateSummary}
                eyebrow={t.phases.tripExperience.steps.informedDate.eyebrow}
                isQA={true}
              >
                <div
                  className={accordionConfig?.padding?.content || "px-4 py-4"}
                >
                  {InformedDateWizard}
                </div>
              </AccordionCard>

              {/* Navigation */}
              <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
                <BackButton
                  onClick={handleBack}
                  text={t.phases.tripExperience.navigation.back}
                />
                <ContinueButton
                  onClick={handleContinue}
                  disabled={!canContinue() || isLoading}
                  isLoading={isLoading}
                  text={t.phases.tripExperience.navigation.continue}
                />
              </div>
            </div>
          </main>
        </div>
      </AccordionProvider>
    );
  }, [
    t,
    travelStatusStepValidation,
    travelStatusStepInteraction,
    informedDateStepValidation,
    informedDateStepInteraction,
    handleAutoTransition,
    validationStates,
    getTripExperienceSummary,
    getInformedDateSummary,
    TripExperienceWizard,
    InformedDateWizard,
    handleBack,
    handleContinue,
    canContinue,
    isLoading,
  ]);

  const phaseGuardProps: PhaseGuardProps = {
    phase: 4,
    children: content,
  };

  // Create a ref to track if we've already performed a phase transition check
  const hasCheckedPhaseTransitionRef = React.useRef(false);
  const isRedirectingRef = React.useRef(false);
  const hasFixedPhase3Ref = React.useRef(false);

  // Remove all the useEffects that handle shared links and phase transitions
  // And replace with a single isolated effect
  React.useEffect(() => {
    // Skip all of this if we're already redirecting
    if (isRedirectingRef.current || hasCheckedPhaseTransitionRef.current)
      return;

    // Mark that we've checked to prevent duplicate checks
    hasCheckedPhaseTransitionRef.current = true;

    // Log that we're skipping the phase transition check
    console.log(
      "=== TripExperiencePage - Skipping phase transition check ===",
      {
        timestamp: new Date().toISOString(),
      }
    );
  }, []);

  // Add effect to ensure Phase 3 is properly marked as completed
  React.useEffect(() => {
    if (hasFixedPhase3Ref.current) return;
    hasFixedPhase3Ref.current = true;

    try {
      // First, ensure Phase 3 is marked as completed in the store
      const currentPhase = mainStore.currentPhase;
      const completedPhases = [...mainStore.completedPhases];
      const phasesCompletedViaContinue = [
        ...mainStore.phasesCompletedViaContinue,
      ];

      console.log(
        "=== TripExperiencePage - Ensuring Phase 3 is completed ===",
        {
          currentPhase,
          completedPhases,
          phasesCompletedViaContinue,
          timestamp: new Date().toISOString(),
        }
      );

      let needsUpdate = false;

      // Ensure Phase 3 is in completedPhases
      if (!completedPhases.includes(3)) {
        completedPhases.push(3);
        completedPhases.sort((a, b) => a - b);
        needsUpdate = true;
      }

      // Ensure Phase 3 is in phasesCompletedViaContinue
      if (!phasesCompletedViaContinue.includes(3)) {
        phasesCompletedViaContinue.push(3);
        phasesCompletedViaContinue.sort((a, b) => a - b);
        needsUpdate = true;
      }

      // Also ensure the currentPhase is set to 4
      let updateCurrentPhase = false;
      if (currentPhase !== 4) {
        updateCurrentPhase = true;
      }

      // Update the store if needed
      if (needsUpdate || updateCurrentPhase) {
        mainStore.setState({
          completedPhases,
          phasesCompletedViaContinue,
          currentPhase: 4, // Ensure this is set to phase 4
          _lastUpdate: Date.now(),
        });

        // Also update localStorage directly for maximum compatibility
        localStorage.setItem(
          "completedPhases",
          JSON.stringify(completedPhases)
        );
        localStorage.setItem(
          "phasesCompletedViaContinue",
          JSON.stringify(phasesCompletedViaContinue)
        );
        localStorage.setItem("currentPhase", "4"); // Set current phase to 4

        console.log(
          "=== TripExperiencePage - Updated Phase 3 completion state ===",
          {
            completedPhases,
            phasesCompletedViaContinue,
            currentPhase: 4,
            timestamp: new Date().toISOString(),
          }
        );
      }

      // Ensure phase 3 validation state is properly set in localStorage
      try {
        // Ensure we have a valid phase3State in localStorage with _explicitlyCompleted flag
        const phase3StateStr = localStorage.getItem("phase3State");
        let phase3State = phase3StateStr ? JSON.parse(phase3StateStr) : {};

        if (!phase3State._explicitlyCompleted) {
          phase3State = {
            ...phase3State,
            _explicitlyCompleted: true,
            _completedTimestamp: Date.now(),
            _forcedByTripExperiencePage: true,
          };

          localStorage.setItem("phase3State", JSON.stringify(phase3State));
          localStorage.setItem("phase3_explicitlyCompleted", "true");

          console.log(
            "=== TripExperiencePage - Updated phase3State with _explicitlyCompleted flag ===",
            {
              timestamp: new Date().toISOString(),
            }
          );
        }

        // Also ensure there's a standalone flag in case the JSON parsing fails
        localStorage.setItem("phase3_explicitlyCompleted", "true");

        // Create a simple phase3 state that's guaranteed to work
        const simpleState = {
          _explicitlyCompleted: true,
          _timestamp: Date.now(),
        };
        localStorage.setItem("phase3_simple", JSON.stringify(simpleState));

        // Update validation state for Phase 3 in store
        const validationState = mainStore.validationState || {};
        if (validationState) {
          const updatedValidationState = {
            ...validationState,
            stepValidation: {
              ...(validationState.stepValidation || {}),
              3: true,
            },
            stepInteraction: {
              ...(validationState.stepInteraction || {}),
              3: true,
            },
            stepCompleted: {
              ...(validationState.stepCompleted || {}),
              3: true,
            },
            _timestamp: Date.now(),
          };

          // Update validation state in store
          mainStore.updateValidationState(updatedValidationState);

          console.log(
            "=== TripExperiencePage - Updated Phase 3 validation state ===",
            {
              updatedValidationState,
              timestamp: new Date().toISOString(),
            }
          );
        }
      } catch (e) {
        console.error("Error updating phase3State:", e);
      }
    } catch (e) {
      console.error("Error ensuring Phase 3 is completed:", e);
    }
  }, [mainStore]);

  // Add a cleanup effect to remove shared link flags
  React.useEffect(() => {
    // Return a cleanup function
    return () => {
      // Clean up shared link flags when component unmounts
      if (typeof window !== "undefined") {
        localStorage.removeItem("_sharedFlightData");
        if (window._sharedLinkProcessed !== undefined) {
          window._sharedLinkProcessed = true;
        }
      }
    };
  }, []);

  return (
    <PhaseGuard {...phaseGuardProps}>
      {!isInitialized ? (
        <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa]">
          <div className="animate-pulse text-center">
            <p className="text-lg text-gray-600">Loading...</p>
          </div>
        </div>
      ) : (
        content
      )}
    </PhaseGuard>
  );
}
