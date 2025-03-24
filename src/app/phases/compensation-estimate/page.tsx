"use client";

import React, { useEffect, useState } from "react";
import { PhaseNavigation } from "@/components/PhaseNavigation";
import { SpeechBubble } from "@/components/SpeechBubble";
import { BackButton } from "@/components/shared/BackButton";
import { ContinueButton } from "@/components/shared/ContinueButton";
import { PhaseGuard } from "@/components/shared/PhaseGuard";
import { useTranslation } from "@/hooks/useTranslation";
import { useFlightStore } from "@/lib/state/flightStore";
import useStore, { getLanguageAwareUrl } from "@/lib/state/store";
import { useRouter } from "next/navigation";
import type { ValidationStep } from "@/lib/state/types";
import type { Flight } from "@/types/store";
import type { LocationLike } from "@/types/location";
import { Card } from "@/components/shared/Card";
import { formatCurrency } from "@/utils/currency";
import { formatDate } from "@/utils/date";
import { getLocationCity } from "@/utils/airport";
import { FlightSegmentData } from "@/types/store";

type LocationData = {
  value: string;
  label: string;
  city: string;
  description?: string;
  dropdownLabel?: string;
};

type LocationType = LocationData | string | null;

export default function CompensationEstimatePage() {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const [isClient, setIsClient] = useState(false);
  const store = useStore();
  const flightStore = useFlightStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [cityData, setCityData] = useState<
    Array<{ departureCity: string; arrivalCity: string }>
  >([]);
  const initializationRef = React.useRef(false);

  const {
    fromLocation,
    toLocation,
    setCurrentPhase,
    completePhase,
    selectedType,
    flightSegments,
    currentPhase,
    completedPhases,
    personalDetails,
    setCompensationError,
    compensationAmount,
    compensationLoading,
    compensationError,
  } = store as {
    fromLocation: LocationType;
    toLocation: LocationType;
    setCurrentPhase: (phase: number) => void;
    completePhase: (phase: number) => void;
    selectedType: "direct" | "multi";
    flightSegments: any[];
    currentPhase: number;
    completedPhases: number[];
    personalDetails?: {
      firstName: string;
      lastName: string;
    };
    setCompensationError: (error: string | null) => void;
    compensationAmount: number | null;
    compensationLoading: boolean;
    compensationError: string | null;
  };

  // Set isClient to true on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Helper function to extract location value
  const getLocationValue = (location: LocationType): string | null => {
    if (!location) return null;
    if (typeof location === "string") return location;
    return location.value || null;
  };

  // Helper function to get city name from location
  const getLocationCity = (
    location: LocationType,
    lang: string
  ): string | null => {
    if (!location) return null;

    // If it's a location object with a city property, use that
    if (typeof location === "object" && location.city) {
      return location.city;
    }

    // If it's a string (airport code) or location object without city,
    // try to extract a readable name
    const code =
      typeof location === "string" ? location : location.value || null;

    // Map of common airport codes to city names
    const airportCityMap: Record<string, string> = {
      BER: "Berlin",
      FRA: "Frankfurt",
      MUC: "Munich",
      HAM: "Hamburg",
      DUS: "Düsseldorf",
      STR: "Stuttgart",
      CGN: "Cologne",
      LHR: "London",
      CDG: "Paris",
      FCO: "Rome",
      MAD: "Madrid",
      AMS: "Amsterdam",
      BCN: "Barcelona",
      VIE: "Vienna",
      ZRH: "Zurich",
      BRU: "Brussels",
      ATH: "Athens",
      LIS: "Lisbon",
      OSL: "Oslo",
      ARN: "Stockholm",
      CPH: "Copenhagen",
      HEL: "Helsinki",
      JFK: "New York",
      LAX: "Los Angeles",
      ORD: "Chicago",
      DFW: "Dallas",
      DXB: "Dubai",
      SIN: "Singapore",
      HKG: "Hong Kong",
      NRT: "Tokyo",
      SYD: "Sydney",
    };

    // Return the city name if we have it in our map, otherwise return the code
    return code && airportCityMap[code] ? airportCityMap[code] : code;
  };

  // Subscribe to store changes to maintain phase 2
  useEffect(() => {
    let lastPhase = currentPhase;

    const checkPhase = () => {
      const state = store.getState();
      if (isInitialized && state.currentPhase !== 2 && lastPhase === 2) {
        console.log("=== Phase Reversion Detected ===", {
          previousPhase: lastPhase,
          currentPhase: state.currentPhase,
          completedPhases: state.completedPhases,
          timestamp: new Date().toISOString(),
        });

        // Force phase back to 2 with all required state
        store.setState({
          currentPhase: 2,
          _preventPhaseChange: false,
          _lastUpdate: Date.now(),
        });
      }
      lastPhase = state.currentPhase;
    };

    // Check more frequently initially, then slow down
    const immediateInterval = setInterval(checkPhase, 100);
    const slowInterval = setInterval(checkPhase, 1000);

    // Initial check
    checkPhase();

    return () => {
      clearInterval(immediateInterval);
      clearInterval(slowInterval);
    };
  }, [store, isInitialized, currentPhase]);

  // Initialize phase and calculate compensation
  useEffect(() => {
    const initializePhase = async () => {
      // Prevent multiple initializations
      if (initializationRef.current) return;
      initializationRef.current = true;

      console.log("=== Starting Phase 2 Initialization ===", {
        isInitialized,
        currentPhase,
        completedPhases,
        phasesCompletedViaContinue: store.phasesCompletedViaContinue,
        fromLocation,
        toLocation,
        timestamp: new Date().toISOString(),
      });

      try {
        // Verify phase 1 was properly completed - But don't redirect, let PhaseGuard handle it
        const storedCompletedViaContinue = localStorage.getItem(
          "phasesCompletedViaContinue"
        );
        const storedCompletedPhases = storedCompletedViaContinue
          ? JSON.parse(storedCompletedViaContinue)
          : [];
        const isPhase1Completed = storedCompletedPhases.includes(1);

        // Check flight data from phase 1
        const flightStoreData = flightStore.flightData[1];

        console.log("=== Phase 2 Verification ===", {
          isPhase1Completed,
          phasesCompletedViaContinue: store.phasesCompletedViaContinue,
          storedCompletedPhases,
          hasFlightData: !!flightStoreData,
          timestamp: new Date().toISOString(),
        });

        // We no longer redirect here - PhaseGuard will handle unauthorized access
        // by showing the error message

        // Force phase 2 state immediately
        localStorage.setItem("currentPhase", "2");
        localStorage.setItem("completedPhases", JSON.stringify([1]));
        localStorage.setItem("phasesCompletedViaContinue", JSON.stringify([1]));

        // Force immediate state update
        await store.setState({
          currentPhase: 2 as ValidationStep,
          completedPhases: [1] as ValidationStep[],
          phasesCompletedViaContinue: [1] as ValidationStep[],
          _preventPhaseChange: true,
        });

        // Add a small delay to ensure state is updated
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Save all state at once to prevent multiple updates
        const savedState =
          localStorage.getItem("phase2State") ||
          localStorage.getItem("phase1State");
        let segments = flightSegments;
        let fromValue: string | null = null;
        let toValue: string | null = null;
        let selectedType = "direct";

        // Attempt to recover location data from multiple sources
        const attemptToRecoverLocationData = () => {
          console.log("=== Attempting to recover location data ===", {
            timestamp: new Date().toISOString(),
          });

          // Try all possible sources to recover location data
          const sources = [
            "phase1State",
            "phase2State",
            "flightData_phase1",
            "flightData_phase2",
            "phase1FlightData",
            "phase2FlightData",
            "currentFlightState",
          ];

          // Track the most recent data by timestamp
          let bestFromLocation = null;
          let bestToLocation = null;
          let bestSegments = null;
          let bestTimestamp = 0;
          let bestSelectedType = "direct";

          for (const sourceKey of sources) {
            try {
              const sourceData = localStorage.getItem(sourceKey);
              if (!sourceData) continue;

              const parsedData = JSON.parse(sourceData);
              const timestamp =
                parsedData._timestamp || parsedData.timestamp || 0;

              // Skip if this is older data than what we've already found
              if (timestamp < bestTimestamp) continue;

              // Try to extract locations from different possible paths
              let foundFromLocation = null;
              let foundToLocation = null;
              let foundSegments = null;
              let foundSelectedType = parsedData.selectedType || "direct";

              // Check for direct fromLocation/toLocation properties
              if (parsedData.fromLocation) {
                foundFromLocation = getLocationValue(parsedData.fromLocation);
              }

              if (parsedData.toLocation) {
                foundToLocation = getLocationValue(parsedData.toLocation);
              }

              // Check flight segments
              if (parsedData.flightSegments?.length > 0) {
                foundSegments = parsedData.flightSegments;

                // If we don't have from/to from direct properties, get from segments
                if (!foundFromLocation && foundSegments[0]?.fromLocation) {
                  foundFromLocation = getLocationValue(
                    foundSegments[0].fromLocation
                  );
                }

                if (
                  !foundToLocation &&
                  foundSegments[foundSegments.length - 1]?.toLocation
                ) {
                  foundToLocation = getLocationValue(
                    foundSegments[foundSegments.length - 1].toLocation
                  );
                }
              }

              // If this source has valid data and is newer, use it
              if (
                (foundFromLocation || foundToLocation) &&
                timestamp > bestTimestamp
              ) {
                bestFromLocation = foundFromLocation;
                bestToLocation = foundToLocation;
                bestSegments = foundSegments;
                bestTimestamp = timestamp;
                bestSelectedType = foundSelectedType;

                console.log(
                  `=== Found better location data in ${sourceKey} ===`,
                  {
                    fromLocation: bestFromLocation,
                    toLocation: bestToLocation,
                    segmentCount: bestSegments?.length || 0,
                    timestamp: new Date().toISOString(),
                  }
                );
              }
            } catch (error) {
              console.error(`Error parsing data from ${sourceKey}:`, error);
            }
          }

          return {
            fromValue: bestFromLocation,
            toValue: bestToLocation,
            segments: bestSegments || segments,
            selectedType: bestSelectedType,
          };
        };

        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
            if (parsedState.flightSegments?.length > 0) {
              segments = parsedState.flightSegments;
              fromValue = getLocationValue(segments[0].fromLocation);
              toValue = getLocationValue(
                segments[segments.length - 1].toLocation
              );
              selectedType = parsedState.selectedType || "direct";

              console.log("=== Using saved state for location data ===", {
                fromValue,
                toValue,
                segmentCount: segments.length,
                source:
                  savedState === localStorage.getItem("phase2State")
                    ? "phase2State"
                    : "phase1State",
                timestamp: new Date().toISOString(),
              });
            }
          } catch (error) {
            console.error("Error parsing localStorage state:", error);
          }
        }

        // If no location data in saved state, try store state
        if (!fromValue || !toValue) {
          fromValue = getLocationValue(fromLocation);
          toValue = getLocationValue(toLocation);

          if (fromValue || toValue) {
            console.log("=== Using store state for location data ===", {
              fromValue,
              toValue,
              timestamp: new Date().toISOString(),
            });
          }
        }

        // If still no location data, try flight store
        if (!fromValue || !toValue) {
          // First try phase 1 flight data
          const phase1Data = flightStore.getFlightData(1);
          if (phase1Data?.fromLocation && phase1Data?.toLocation) {
            fromValue = getLocationValue(phase1Data.fromLocation);
            toValue = getLocationValue(phase1Data.toLocation);
            selectedType = phase1Data.selectedType || "direct";
            segments = phase1Data.flightSegments || segments;

            console.log(
              "=== Using phase 1 flight store for location data ===",
              {
                fromValue,
                toValue,
                segmentCount: segments?.length || 0,
                timestamp: new Date().toISOString(),
              }
            );
          }

          // If still no data, try phase 2 flight data
          if ((!fromValue || !toValue) && flightStore.getFlightData(2)) {
            const phase2Data = flightStore.getFlightData(2);
            if (phase2Data) {
              fromValue = getLocationValue(phase2Data.fromLocation);
              toValue = getLocationValue(phase2Data.toLocation);
              selectedType = phase2Data.selectedType || "direct";
              segments = phase2Data.flightSegments || segments;

              console.log(
                "=== Using phase 2 flight store for location data ===",
                {
                  fromValue,
                  toValue,
                  segmentCount: segments?.length || 0,
                  timestamp: new Date().toISOString(),
                }
              );
            }
          }
        }

        // If we still don't have valid data, try to recover from all possible sources
        if (!fromValue || !toValue) {
          const recoveredData = attemptToRecoverLocationData();
          fromValue = recoveredData.fromValue || fromValue;
          toValue = recoveredData.toValue || toValue;
          segments = recoveredData.segments || segments;
          selectedType = recoveredData.selectedType || selectedType;
        }

        // Ensure we have valid flight data - if not, show error or redirect
        if (!fromValue || !toValue) {
          console.log("=== No valid location data found, showing error ===", {
            timestamp: new Date().toISOString(),
          });

          // Instead of using hardcoded defaults, set a flag to show an error
          // and let the user go back to phase 1
          setCompensationError(
            "No valid flight information found. Please go back and complete the initial assessment."
          );

          // Set empty values to prevent type errors
          fromValue = "";
          toValue = "";
          segments = segments || [
            {
              fromLocation: null,
              toLocation: null,
              date: null,
              selectedFlight: null,
            },
          ];

          // Don't create a fake flight data object
          // Let PhaseGuard handle the authorization
        }

        // Save to flight store first
        await flightStore.saveFlightData(2, {
          fromLocation:
            typeof fromLocation === "string"
              ? (fromLocation as string & LocationLike)
              : fromLocation && "value" in fromLocation
              ? (fromLocation.value as string & LocationLike)
              : null,
          toLocation:
            typeof toLocation === "string"
              ? (toLocation as string & LocationLike)
              : toLocation && "value" in toLocation
              ? (toLocation.value as string & LocationLike)
              : null,
          selectedType: selectedType as "direct" | "multi",
          flightSegments: segments,
          selectedFlights: segments
            .map((segment) => segment.selectedFlight)
            .filter((flight): flight is Flight => flight !== null),
          timestamp: Date.now(),
        });

        // Prepare all state updates in one batch
        const stateUpdates = {
          currentPhase: 2 as ValidationStep,
          completedPhases: [1] as ValidationStep[],
          phasesCompletedViaContinue: [1] as ValidationStep[],
          flightSegments: segments,
          fromLocation: segments[0]?.fromLocation || fromLocation,
          toLocation: segments[segments.length - 1]?.toLocation || toLocation,
          validationState: {
            stepValidation: {
              1: true,
              2: true,
              3: false,
              4: false,
              5: false,
              6: false,
              7: false,
            },
            stepInteraction: {
              1: true,
              2: true,
              3: false,
              4: false,
              5: false,
              6: false,
              7: false,
            },
            errors: {
              1: [],
              2: [],
              3: [],
              4: [],
              5: [],
              6: [],
              7: [],
            },
            stepCompleted: {
              1: true,
              2: false,
              3: false,
              4: false,
              5: false,
              6: false,
              7: false,
            },
            completedSteps: [1] as ValidationStep[],
            isFlightValid: true,
            isWizardValid: true,
            isPersonalValid: true,
            isTermsValid: false,
            isSignatureValid: false,
            isBookingValid: false,
            isWizardSubmitted: true,
            isCompensationValid: true,
            questionValidation: {},
            fieldErrors: {},
            transitionInProgress: false,
            _timestamp: Date.now(),
          },
          _lastUpdate: Date.now(),
          _preventPhaseChange: true,
        };

        // Single batch update to store
        await store.batchUpdateWizardState(stateUpdates);

        // Add another small delay to ensure state is updated
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify phase was set correctly
        const currentState = store.getState();
        console.log("=== Phase 2 State Verification ===", {
          currentPhase: currentState.currentPhase,
          completedPhases: currentState.completedPhases,
          timestamp: new Date().toISOString(),
        });

        // If phase is still not 2, force it one more time
        if (currentState.currentPhase !== 2) {
          console.log("=== Forcing Phase 2 Again ===", {
            timestamp: new Date().toISOString(),
          });
          await store.setState({
            currentPhase: 2 as ValidationStep,
            completedPhases: [1] as ValidationStep[],
            phasesCompletedViaContinue: [1] as ValidationStep[],
            _preventPhaseChange: true,
          });

          // Final delay to ensure state is updated
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Allow phase change after initialization is complete
        await store.setState({
          _preventPhaseChange: false,
          _lastUpdate: Date.now(),
          _silentUpdate: true,
        });

        console.log("=== Phase 2 Initialization Complete ===", {
          _preventPhaseChange: false,
          timestamp: new Date().toISOString(),
        });

        // Process city data if needed
        if (segments?.length > 0) {
          const processedCityData = segments.map((segment) => ({
            departureCity:
              segment.fromLocation?.city ||
              getLocationCity(segment.fromLocation, lang) ||
              t.phases.compensationEstimate.flightSummary.noFlightDetails,
            arrivalCity:
              segment.toLocation?.city ||
              getLocationCity(segment.toLocation, lang) ||
              t.phases.compensationEstimate.flightSummary.noFlightDetails,
          }));
          setCityData(processedCityData);
        }

        // Calculate compensation if needed
        if (
          fromValue &&
          toValue &&
          !compensationAmount &&
          !compensationLoading
        ) {
          const fromIata = fromValue.toUpperCase().trim();
          const toIata = toValue.toUpperCase().trim();

          if (fromIata.length === 3 && toIata.length === 3) {
            try {
              await store.calculateCompensation(fromIata, toIata);
            } catch (error) {
              console.error("Error calculating compensation:", error);
              setCompensationError(
                error instanceof Error
                  ? error.message
                  : "Failed to calculate compensation"
              );
            }
          }
        }

        // Set initialized after all operations are complete
        setIsInitialized(true);
        console.log("=== Phase 2 Initialization Complete ===", {
          currentPhase: store.getState().currentPhase,
          completedPhases: store.getState().completedPhases,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error initializing phase:", error);
        router.push(getLanguageAwareUrl("/phases/initial-assessment", lang));
      }
    };

    if (!isInitialized && !initializationRef.current) {
      initializePhase();
    }
  }, [
    isInitialized,
    store,
    flightStore,
    router,
    lang,
    fromLocation,
    toLocation,
    flightSegments,
    compensationAmount,
    compensationLoading,
    setCompensationError,
    t.phases.compensationEstimate.flightSummary.noFlightDetails,
  ]);

  // Effect to monitor compensation calculation status
  useEffect(() => {
    if (compensationLoading) {
      console.log("=== Compensation Calculation in Progress ===", {
        timestamp: new Date().toISOString(),
      });
    } else if (compensationError) {
      console.error("=== Compensation Calculation Error ===", {
        error: compensationError,
        fromLocation,
        toLocation,
        timestamp: new Date().toISOString(),
      });
    } else if (compensationAmount !== null) {
      console.log("=== Compensation Calculation Complete ===", {
        amount: compensationAmount,
        fromLocation,
        toLocation,
        timestamp: new Date().toISOString(),
      });
    }
  }, [
    compensationLoading,
    compensationError,
    compensationAmount,
    fromLocation,
    toLocation,
  ]);

  // Effect to recalculate compensation when locations change
  useEffect(() => {
    if (!isInitialized || compensationLoading) return;

    const recalculateCompensation = async () => {
      // Get location values
      const fromValue = getLocationValue(fromLocation);
      const toValue = getLocationValue(toLocation);

      console.log("=== Location Change Detected ===", {
        fromValue,
        toValue,
        timestamp: new Date().toISOString(),
      });

      if (!fromValue || !toValue) return;

      // Clear any existing error
      if (compensationError) {
        setCompensationError(null);
      }

      // Ensure we have valid IATA codes (3 uppercase letters)
      const fromIata = fromValue.toUpperCase().trim();
      const toIata = toValue.toUpperCase().trim();

      if (fromIata.length === 3 && toIata.length === 3) {
        console.log("=== Recalculating Compensation ===", {
          fromIata,
          toIata,
          timestamp: new Date().toISOString(),
        });

        try {
          await store.calculateCompensation(fromIata, toIata);
        } catch (error) {
          console.error("Error calculating compensation:", error);
          setCompensationError(
            error instanceof Error
              ? error.message
              : "Failed to calculate compensation - please try again"
          );
        }
      } else {
        console.error("Invalid IATA codes:", { fromValue, toValue });
        setCompensationError("Invalid airport codes provided");
      }
    };

    recalculateCompensation();
  }, [isInitialized, fromLocation, toLocation]);

  // Phase reversion detection - handle navigating from higher phases back to phase 2
  React.useEffect(() => {
    if (!isClient) return;

    // Get the attempt counter from localStorage
    let attempts = 0;
    try {
      const storedAttempts = localStorage.getItem("phase2_reversion_attempts");
      attempts = storedAttempts ? parseInt(storedAttempts, 10) : 0;
    } catch (e) {
      // Ignore storage errors
    }

    // Check if we're on phase 2 URL but the store thinks we're in a higher phase
    // Only try to fix this a limited number of times to prevent infinite loops
    if (currentPhase > 2 && attempts < 3) {
      // Increment attempt counter
      attempts += 1;
      localStorage.setItem("phase2_reversion_attempts", attempts.toString());

      // Log that we detected a phase reversion
      console.log("=== Phase Reversion Detected ===", {
        previousPhase: 2,
        currentPhase,
        completedPhases,
        revertAttempts: attempts,
        timestamp: new Date().toISOString(),
      });

      // Force the correct phase in the store immediately
      store.setState({
        currentPhase: 2,
        _preventPhaseChange: false,
        _lastUpdate: Date.now(),
      });

      // If this is the first attempt, reload the page to clear all state
      if (attempts === 1) {
        // Allow the state update to complete before refreshing
        setTimeout(() => {
          console.log("=== Forcing page reload to reset state ===", {
            timestamp: new Date().toISOString(),
          });
          window.location.reload();
        }, 100);
      } else {
        // For subsequent attempts, try to force initialization
        setTimeout(() => {
          // Force initialization to true to break any loops
          console.log(
            "=== Forcing initialization to break potential loops ===",
            {
              attempts,
              timestamp: new Date().toISOString(),
            }
          );
          setIsInitialized(true);
        }, 100);
      }
    } else if (attempts >= 3) {
      // If we've reached max attempts, always force initialization
      console.log(
        "=== Max reversion attempts reached, forcing initialization ===",
        {
          attempts,
          timestamp: new Date().toISOString(),
        }
      );

      // Force initialization regardless of other conditions
      setIsInitialized(true);

      // Reset counter after some time to allow future attempts if needed
      setTimeout(() => {
        localStorage.setItem("phase2_reversion_attempts", "0");
      }, 5000);
    }
  }, [isClient, currentPhase, completedPhases, store]);

  // Back navigation detection - handle explicit back navigation from phase 3
  useEffect(() => {
    if (!isClient) return;

    // Check for the back navigation flag
    const isBackNavigation =
      localStorage.getItem("navigating_back_to_phase2") === "true";

    if (isBackNavigation) {
      console.log("=== Back Navigation Detected ===", {
        from: "phase 3",
        to: "phase 2",
        timestamp: new Date().toISOString(),
      });

      // Clear the flag so we don't process it again
      localStorage.removeItem("navigating_back_to_phase2");

      // Force the correct phase state
      store.setState({
        currentPhase: 2,
        _preventPhaseChange: false,
        _lastUpdate: Date.now(),
      });

      // Reset initialization state after a brief delay
      setTimeout(() => {
        setIsInitialized(false);
      }, 50);
    }
  }, [isClient, store]);

  // Clean up session storage navigation flags
  React.useEffect(() => {
    if (!isClient) return;

    // Clear any phase reversion detection flags for phase 2
    try {
      sessionStorage.removeItem("detected_phase_reversion_2");
      sessionStorage.removeItem("phase_state_updated_2");

      console.log("=== Cleaned up navigation detection flags ===", {
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      // Ignore storage errors
    }
  }, [isClient]);

  // Add initialization success logging
  React.useEffect(() => {
    if (isClient && isInitialized) {
      console.log("=== Phase 2 Successfully Initialized ===", {
        currentPhase: store.currentPhase,
        timestamp: new Date().toISOString(),
      });
    }
  }, [isClient, isInitialized, store.currentPhase]);

  // Reset all navigation override flags when the component unmounts
  React.useEffect(() => {
    // Only run the cleanup on unmount
    return () => {
      if (typeof window !== "undefined") {
        // Clear all the special handling flags
        try {
          localStorage.removeItem("phase2_reversion_attempts");
          localStorage.removeItem("navigating_back_to_phase2");
          sessionStorage.removeItem("detected_phase_reversion_2");
          sessionStorage.removeItem("phase_state_updated_2");

          console.log("=== Cleaned up all navigation flags on unmount ===", {
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          // Ignore storage errors
        }
      }
    };
  }, []);

  const handleContinue = async () => {
    if (compensationLoading || !compensationAmount) return;

    try {
      // Set a flag in localStorage to indicate a forward navigation to phase 3
      localStorage.setItem("navigating_to_phase3", "true");

      // Also set a flag to ensure the accordion is opened
      localStorage.setItem("openFlightSelectionAccordion", "true");

      // Save the current state to localStorage
      const currentState = {
        fromLocation: store.fromLocation,
        toLocation: store.toLocation,
        selectedType: store.selectedType,
        directFlight: store.directFlight,
        flightSegments: store.flightSegments,
        validationState: store.validationState,
        _timestamp: Date.now(),
      };
      localStorage.setItem("phase2State", JSON.stringify(currentState));

      // Also save to flight store to ensure data is available immediately
      try {
        // Save to flight store for phase 3
        await flightStore.saveFlightData(3, {
          fromLocation: store.fromLocation,
          toLocation: store.toLocation,
          selectedType: store.selectedType,
          flightSegments: store.flightSegments.map((segment) => ({
            fromLocation: segment.fromLocation,
            toLocation: segment.toLocation,
            date: segment.date,
            selectedFlight: segment.selectedFlight,
          })),
          _preserveFlightSegments: true,
          _isMultiSegment: store.selectedType === "multi",
          timestamp: Date.now(),
        });

        console.log("=== Forward Navigation - Saved to FlightStore ===", {
          phase: 3,
          fromLocation: store.fromLocation?.value,
          toLocation: store.toLocation?.value,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error saving to flight store:", error);
      }

      // Mark phase 2 as completed
      const currentCompletedPhases = [...store.completedPhases];
      const currentPhasesCompletedViaContinue = [
        ...store.phasesCompletedViaContinue,
      ];

      // Add phase 2 to completed phases if not already there
      if (!currentCompletedPhases.includes(2)) {
        currentCompletedPhases.push(2);
      }

      // Add phase 2 to phases completed via continue if not already there
      if (!currentPhasesCompletedViaContinue.includes(2)) {
        currentPhasesCompletedViaContinue.push(2);
      }

      // Update the store with the completed phases
      store.setState({
        completedPhases: currentCompletedPhases,
        phasesCompletedViaContinue: currentPhasesCompletedViaContinue,
        currentPhase: 3,
        _lastUpdate: Date.now(),
      });

      // Also update localStorage directly
      localStorage.setItem(
        "completedPhases",
        JSON.stringify(currentCompletedPhases)
      );
      localStorage.setItem(
        "phasesCompletedViaContinue",
        JSON.stringify(currentPhasesCompletedViaContinue)
      );
      localStorage.setItem("currentPhase", "3");

      // Save state for next phase with all necessary location data
      const nextPhaseState = {
        fromLocation:
          typeof fromLocation === "string"
            ? { value: fromLocation, city: fromLocation }
            : {
                value: fromLocation?.value || "",
                city: fromLocation?.city || "",
                ...fromLocation,
              },
        toLocation:
          typeof toLocation === "string"
            ? { value: toLocation, city: toLocation }
            : {
                value: toLocation?.value || "",
                city: toLocation?.city || "",
                ...toLocation,
              },
        selectedType,
        flightSegments: flightSegments.map((segment) => ({
          ...segment,
          fromLocation:
            typeof segment.fromLocation === "string"
              ? { value: segment.fromLocation, city: segment.fromLocation }
              : {
                  value: segment.fromLocation?.value || "",
                  city: segment.fromLocation?.city || "",
                  ...segment.fromLocation,
                },
          toLocation:
            typeof segment.toLocation === "string"
              ? { value: segment.toLocation, city: segment.toLocation }
              : {
                  value: segment.toLocation?.value || "",
                  city: segment.toLocation?.city || "",
                  ...segment.toLocation,
                },
          selectedFlight: segment.selectedFlight,
          date: segment.date,
        })),
        compensationAmount,
        cityData,
        _explicitlyCompleted: true,
        _completedTimestamp: Date.now(),
        _forcedByHandleContinue: true,
        phase: 3,
      };

      // CRITICAL: Also update phase2State with the _explicitlyCompleted flag
      const phase2StateStr = localStorage.getItem("phase2State");
      const phase2StateObj = phase2StateStr ? JSON.parse(phase2StateStr) : {};
      phase2StateObj._explicitlyCompleted = true;
      phase2StateObj._completedTimestamp = Date.now();
      localStorage.setItem("phase2State", JSON.stringify(phase2StateObj));

      // Add a standalone flag that's easier to check in case JSON parsing fails
      localStorage.setItem("phase2_explicitlyCompleted", "true");

      // Also add a simple state object that's guaranteed to work
      localStorage.setItem(
        "phase2_simple",
        JSON.stringify({
          _explicitlyCompleted: true,
          _timestamp: Date.now(),
        })
      );

      // Log verification
      console.log("=== Phase 2 Explicitly Completed ===", {
        phase2StateStr:
          JSON.stringify(phase2StateObj).substring(0, 100) + "...",
        containsFlag: JSON.stringify(phase2StateObj).includes(
          '"_explicitlyCompleted":true'
        ),
        alternativeFlag: localStorage.getItem("phase2_explicitlyCompleted"),
        timestamp: new Date().toISOString(),
      });

      // Log the state being saved
      console.log("=== Saving Phase 3 State ===", {
        segments: nextPhaseState.flightSegments.map((s) => ({
          from: s.fromLocation,
          to: s.toLocation,
        })),
        timestamp: new Date().toISOString(),
      });

      localStorage.setItem("phase3State", JSON.stringify(nextPhaseState));

      // Ensure store has the correct segments
      store.setFlightSegments(nextPhaseState.flightSegments);

      // CRITICAL: Add a small delay to ensure all state updates are complete before navigation
      console.log("=== Preparing to navigate to flight-details ===", {
        timestamp: new Date().toISOString(),
      });

      // Add final verification logging for phase changes
      console.log("=== Final Phase Verification Before Navigation ===", {
        completedPhases: JSON.parse(
          localStorage.getItem("completedPhases") || "[]"
        ),
        phasesCompletedViaContinue: JSON.parse(
          localStorage.getItem("phasesCompletedViaContinue") || "[]"
        ),
        currentPhase: localStorage.getItem("currentPhase"),
        phase2ExplicitlyCompleted: localStorage.getItem(
          "phase2_explicitlyCompleted"
        ),
        phase2StateHasExplicitlyCompletedFlag: JSON.parse(
          localStorage.getItem("phase2State") || "{}"
        ),
        timestamp: new Date().toISOString(),
      });

      // Use a promise with setTimeout to ensure all state updates are complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Force a direct navigation to phase 3 using window.location instead of router
      const phase3Url = getLanguageAwareUrl("/phases/flight-details", lang);
      console.log("=== Navigating to flight-details ===", {
        url: phase3Url,
        timestamp: new Date().toISOString(),
      });

      window.location.href = phase3Url;

      // As a fallback, also use the router (though this likely won't execute due to the redirect)
      router.push(phase3Url);
    } catch (error) {
      console.error("Error during transition:", error);
    }
  };

  const handleBack = () => {
    console.log("=== HandleBack - Initial State ===", {
      selectedType,
      flightSegments: flightSegments.map((s) => ({
        from:
          typeof s.fromLocation === "string"
            ? s.fromLocation
            : s.fromLocation?.value,
        to:
          typeof s.toLocation === "string" ? s.toLocation : s.toLocation?.value,
      })),
      timestamp: new Date().toISOString(),
    });

    // Create a deep copy of the segments to preserve their exact order and connections
    const segmentsToSave = flightSegments.map((segment, index) => {
      // For each segment, ensure we maintain its exact fromLocation and toLocation
      const segmentCopy = {
        fromLocation: segment.fromLocation,
        toLocation: segment.toLocation,
        selectedFlight: segment.selectedFlight,
        date: segment.date,
      };

      // For multi-segment flights, ensure connections are preserved
      if (selectedType === "multi" && index < flightSegments.length - 1) {
        // Each segment's toLocation should connect to the next segment's fromLocation
        const nextSegment = flightSegments[index + 1];
        if (nextSegment) {
          segmentCopy.toLocation = nextSegment.fromLocation;
        }
      }

      return segmentCopy;
    });

    console.log("=== HandleBack - Segments to Save ===", {
      segments: segmentsToSave.map((s) => ({
        from:
          typeof s.fromLocation === "string"
            ? s.fromLocation
            : s.fromLocation?.value,
        to:
          typeof s.toLocation === "string" ? s.toLocation : s.toLocation?.value,
      })),
      timestamp: new Date().toISOString(),
    });

    // Save the current state to localStorage with proper segment connections
    const phase1State = {
      selectedType,
      flightSegments: segmentsToSave,
      fromLocation: segmentsToSave[0]?.fromLocation,
      toLocation: segmentsToSave[segmentsToSave.length - 1]?.toLocation,
      validationState: {
        ...store.validationState,
        isTermsValid: true,
        stepValidation: {
          ...store.validationState.stepValidation,
          4: true, // Terms step
        },
        stepInteraction: {
          ...store.validationState.stepInteraction,
          4: true, // Terms step
        },
        _timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    console.log("=== HandleBack - Phase1 State ===", {
      selectedType: phase1State.selectedType,
      fromLocation:
        typeof phase1State.fromLocation === "string"
          ? phase1State.fromLocation
          : phase1State.fromLocation?.value,
      toLocation:
        typeof phase1State.toLocation === "string"
          ? phase1State.toLocation
          : phase1State.toLocation?.value,
      segments: phase1State.flightSegments.map((s) => ({
        from:
          typeof s.fromLocation === "string"
            ? s.fromLocation
            : s.fromLocation?.value,
        to:
          typeof s.toLocation === "string" ? s.toLocation : s.toLocation?.value,
      })),
      timestamp: new Date().toISOString(),
    });

    localStorage.setItem("phase1State", JSON.stringify(phase1State));
    localStorage.setItem("phase1FlightData", JSON.stringify(phase1State));

    // Update the store with the preserved segments
    const storeUpdate = {
      selectedType,
      flightSegments: segmentsToSave,
      fromLocation: segmentsToSave[0]?.fromLocation,
      toLocation: segmentsToSave[segmentsToSave.length - 1]?.toLocation,
      validationState: phase1State.validationState,
      _lastUpdate: Date.now(),
    };

    console.log("=== HandleBack - Store Update ===", {
      selectedType: storeUpdate.selectedType,
      fromLocation:
        typeof storeUpdate.fromLocation === "string"
          ? storeUpdate.fromLocation
          : storeUpdate.fromLocation?.value,
      toLocation:
        typeof storeUpdate.toLocation === "string"
          ? storeUpdate.toLocation
          : storeUpdate.toLocation?.value,
      segments: storeUpdate.flightSegments.map((s) => ({
        from:
          typeof s.fromLocation === "string"
            ? s.fromLocation
            : s.fromLocation?.value,
        to:
          typeof s.toLocation === "string" ? s.toLocation : s.toLocation?.value,
      })),
      timestamp: new Date().toISOString(),
    });

    store.batchUpdateWizardState(storeUpdate);

    // Navigate back
    router.push("/phases/initial-assessment");
  };

  // Don't render until properly initialized and phase requirements are met
  if (
    !isClient ||
    !isInitialized ||
    (currentPhase !== 2 &&
      initializationRef.current &&
      !store.getState()._preventPhaseChange)
  ) {
    console.log("=== Showing Loading State ===", {
      isClient,
      isInitialized,
      currentPhase,
      completedPhases,
      hasInitStarted: initializationRef.current,
      preventPhaseChange: store.getState()._preventPhaseChange,
      timestamp: new Date().toISOString(),
    });

    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F54538] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
          <p className="text-sm text-gray-500 mt-2">
            {!isInitialized
              ? "Initializing..."
              : currentPhase !== 2
              ? `Ensuring Phase 2 is active (current: ${currentPhase})...`
              : !completedPhases.includes(1)
              ? "Verifying Phase 1 completion..."
              : "Finalizing..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PhaseGuard phase={2}>
      <div className="min-h-screen bg-[#f5f7fa]">
        <PhaseNavigation
          currentPhase={currentPhase}
          completedPhases={completedPhases}
        />
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <div className="space-y-6">
            <SpeechBubble message={t.phases.compensationEstimate.description} />

            {/* Flight Summary Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t.phases.compensationEstimate.flightSummary.title}
              </h2>
              <div className="space-y-4">
                {/* Passenger Details */}
                {personalDetails && (
                  <div className="pb-4 border-b border-gray-100">
                    <p className="text-gray-600">
                      {t.phases.compensationEstimate.flightSummary.passenger}
                    </p>
                    <p className="font-medium">
                      {personalDetails.firstName} {personalDetails.lastName}
                    </p>
                  </div>
                )}

                {/* Flight Route */}
                <div className="space-y-4">
                  {(() => {
                    console.log("=== Rendering Flight Segments ===", {
                      segmentCount: flightSegments?.length,
                      segments: flightSegments?.map((s) => ({
                        from:
                          typeof s.fromLocation === "string"
                            ? s.fromLocation
                            : s.fromLocation?.value,
                        to:
                          typeof s.toLocation === "string"
                            ? s.toLocation
                            : s.toLocation?.value,
                      })),
                    });

                    // For multi-segment flights, ensure we show the correct connections
                    if (flightSegments?.length > 1) {
                      // Create an array of connected segments
                      const connectedSegments = flightSegments.reduce(
                        (
                          acc: Array<{ from: string; to: string }>,
                          segment,
                          index
                        ) => {
                          const fromValue =
                            typeof segment.fromLocation === "string"
                              ? getLocationCity(segment.fromLocation, lang)
                              : getLocationCity(segment.fromLocation, lang);

                          // For the first segment, connect to the next segment's from location
                          if (index === 0) {
                            const nextSegment = flightSegments[1];
                            const nextFrom =
                              typeof nextSegment.fromLocation === "string"
                                ? getLocationCity(
                                    nextSegment.fromLocation,
                                    lang
                                  )
                                : getLocationCity(
                                    nextSegment.fromLocation,
                                    lang
                                  );

                            acc.push({
                              from: fromValue || "",
                              to: nextFrom || "",
                            });
                          }
                          // For the last segment, use its actual to location
                          if (index === flightSegments.length - 1) {
                            const toValue =
                              typeof segment.toLocation === "string"
                                ? getLocationCity(segment.toLocation, lang)
                                : getLocationCity(segment.toLocation, lang);

                            acc.push({
                              from: fromValue || "",
                              to: toValue || "",
                            });
                          }
                          return acc;
                        },
                        []
                      );

                      return connectedSegments.map((segment, segmentIndex) => {
                        if (!segment) return null;

                        return (
                          <div
                            key={segmentIndex}
                            className="pb-4 border-b border-gray-100 last:border-b-0"
                          >
                            <p className="text-gray-600 font-medium mb-2">
                              {
                                t.phases.compensationEstimate.flightSummary
                                  .flight
                              }{" "}
                              {segmentIndex + 1}
                            </p>
                            <div className="space-y-2">
                              <div>
                                <p className="text-gray-600">
                                  {
                                    t.phases.compensationEstimate.flightSummary
                                      .from
                                  }
                                </p>
                                <p className="font-medium">{segment.from}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">
                                  {
                                    t.phases.compensationEstimate.flightSummary
                                      .to
                                  }
                                </p>
                                <p className="font-medium">{segment.to}</p>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    }

                    // Direct flight display
                    return (
                      <>
                        <div>
                          <p className="text-gray-600">
                            {t.phases.compensationEstimate.flightSummary.from}
                          </p>
                          <p className="font-medium">
                            {typeof fromLocation === "string"
                              ? getLocationCity(fromLocation, lang)
                              : fromLocation?.city ||
                                getLocationCity(fromLocation, lang) ||
                                t.phases.compensationEstimate.flightSummary
                                  .noFlightDetails}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">
                            {t.phases.compensationEstimate.flightSummary.to}
                          </p>
                          <p className="font-medium">
                            {typeof toLocation === "string"
                              ? getLocationCity(toLocation, lang)
                              : toLocation?.city ||
                                getLocationCity(toLocation, lang) ||
                                t.phases.compensationEstimate.flightSummary
                                  .noFlightDetails}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Compensation Amount Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t.phases.compensationEstimate.estimatedCompensation.title}
              </h2>
              <div className="text-2xl font-bold text-[#F54538]">
                {compensationLoading
                  ? t.phases.compensationEstimate.estimatedCompensation
                      .calculating
                  : compensationError
                  ? compensationError
                  : typeof compensationAmount === "number"
                  ? `€${compensationAmount}`
                  : t.phases.compensationEstimate.flightSummary.noFlightDetails}
              </div>
              <p className="text-gray-600 mt-2">
                {t.phases.compensationEstimate.estimatedCompensation.disclaimer}
              </p>
            </div>

            {/* Next Steps Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t.phases.compensationEstimate.nextSteps.title}
              </h2>
              <div className="space-y-4">
                {[1, 2, 3].map((step) => {
                  type NextStepsType =
                    typeof t.phases.compensationEstimate.nextSteps;
                  type StepKey = keyof Omit<NextStepsType, "title">;
                  const stepKey = `step${step}` as StepKey;

                  return (
                    <div key={step} className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-[#F54538] text-white flex items-center justify-center flex-shrink-0">
                        {step}
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">
                          {
                            t.phases.compensationEstimate.nextSteps[stepKey]
                              .title
                          }
                        </h3>
                        <p className="text-gray-600">
                          {
                            t.phases.compensationEstimate.nextSteps[stepKey]
                              .description
                          }
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <BackButton
                onClick={handleBack}
                text={t.phases.compensationEstimate.navigation.back}
              />
              <ContinueButton
                onClick={handleContinue}
                isLoading={compensationLoading}
                text={t.phases.compensationEstimate.navigation.continue}
              />
            </div>
          </div>
        </main>
      </div>
    </PhaseGuard>
  );
}
