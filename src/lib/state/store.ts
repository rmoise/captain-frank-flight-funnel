import type { LocationLike } from "@/types/location";
import type { Answer, Flight, PassengerDetails } from "@/types/store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  ValidationStep,
  StoreState,
  StoreStateValues,
  ValidationState,
  StoreActions,
  FlightSlice,
  WizardSlice,
  UserSlice,
  NavigationSlice,
  CompensationSlice,
  FlightSearchSlice,
  LanguageSlice,
  FlightSelectionSlice,
  FlightSegment,
} from "./types";
import type {
  PersonalDetailsSlice,
  PersonalDetailsActions,
} from "./slices/personalDetailsSlice";
import { PATH_TO_PHASE } from "@/hooks/useNavigation";
import { isValidLanguage, DEFAULT_LANGUAGE } from "@/config/language";
import { InitializeActions } from "./slices/initializeSlice";
import { CompensationCache } from "./slices/compensationSlice";
import type { WizardActions, WizardStepKey } from "./slices/wizardSlice";
import { useFlightStore } from "./flightStore";
import { isValidLocation } from "../validation/locationValidation";

// Add this outside of any functions to maintain state between calls without triggering renders
let lastNextPhaseCheckTime = 0;

// Define the store type
type Store = StoreState &
  StoreActions &
  FlightSlice &
  WizardSlice &
  UserSlice &
  NavigationSlice &
  CompensationSlice &
  FlightSearchSlice &
  LanguageSlice &
  FlightSelectionSlice &
  PersonalDetailsSlice &
  Omit<PersonalDetailsActions, "validatePersonalDetails"> &
  InitializeActions &
  WizardActions & {
    validatePersonalDetails: () => Promise<boolean>;
    _lastUpdate?: number;
    _lastPersist?: number;
    _lastPersistedState?: string;
    _isCheckingNextPhase?: boolean;
    _lastNextPhaseCheck?: number;
    validationState: ValidationState;
    isFirstVisit: boolean;
    isInitialized: boolean;
    setIsFirstVisit: (value: boolean) => void;
    setIsInitialized: (value: boolean) => void;
    setWizardAnswers: (answers: Answer[]) => void;
    updateValidationState: (newState: Partial<ValidationState>) => void;
    resetStore: () => void;
    hideLoading: () => void;
    setTermsAccepted: (accepted: boolean) => void;
    setPrivacyAccepted: (accepted: boolean) => void;
    setMarketingAccepted: (accepted: boolean) => void;
    setSignature: (signature: string) => void;
    setHasSignature: (hasSignature: boolean) => void;
    validateSignature: () => boolean;
    setOriginalFlights: (flights: Flight[]) => void;
    setCurrentPhase: (phase: number) => void;
    validateAndUpdateStep: (step: ValidationStep) => boolean;
    batchUpdateWizardState: (updates: Partial<StoreStateValues>) => void;
    setBookingNumber: (number: string) => void;
    validateQAWizard: () => {
      isValid: boolean;
      answers: Answer[];
      bookingNumber: string;
    };
    notifyInteraction: () => void;
    setOnInteract: (callback: () => void) => void;
    initializeNavigationFromUrl: (url: string) => void;
    completePhase: (phase: ValidationStep) => void;
    setCompensationAmount: (amount: number | null) => void;
    setCompensationLoading: (loading: boolean) => void;
    setCompensationError: (error: string | null) => void;
    shouldRecalculateCompensation: () => boolean;
    setSelectedFlights: (flights: Flight[]) => void;
    setSelectedType: (type: "direct" | "multi") => void;
    setDirectFlight: (flight: FlightSegment) => void;
    setFlightSegments: (segments: FlightSegment[]) => void;
    setFromLocation: (location: LocationLike | null) => void;
    setToLocation: (location: LocationLike | null) => void;
    setCompensationCache: (cache: CompensationCache) => void;
    setState: (state: Partial<StoreState>) => void;
    getState: () => StoreState;
    currentPhase: ValidationStep;
    canProceedToNextPhase: () => boolean;
    startInitializing: () => void;
    finishInitializing: () => void;
    startLoading: () => void;
    finishLoading: () => void;
    setInitStarted: () => void;
    setIsMounted: () => void;
    setLocationError: (error: string | null) => void;
    initializeStore: () => void;
    setWizardShowingSuccess: (showing: boolean) => void;
    setWizardValidationState: (
      validationState: Record<string, boolean>
    ) => void;
    markWizardComplete: (wizardId: string) => void;
    isWizardCompleted: (wizardId: string) => boolean;
    handleWizardComplete: (
      wizardId: string,
      answers: Answer[],
      successMessage: string
    ) => boolean;
    handleTripExperienceComplete: () => void;
    handleInformedDateComplete: () => void;
    setLastAnsweredQuestion: (questionId: string | null) => void;
    updateWizardAnswer: (questionId: string, answer: string) => void;
    setWizardLastActiveStep: (step: number) => void;
    setWizardIsValid: (isValid: boolean) => void;
    setWizardIsCompleted: (isCompleted: boolean) => void;
    calculateCompensation: (
      fromIata?: string,
      toIata?: string
    ) => Promise<void>;
    isClaimAccepted: boolean;
    isClaimRejected: boolean;
  };

// Add initialization state tracking
const isInitializingStore = {
  value: false,
  isSettingPhase: false,
};

// Create the store instance
const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...createInitialState(),
      setState: (state: Partial<StoreState>) => {
        // Preserve compensation amount during state updates
        const currentState = get();
        const compensationAmount =
          state.compensationAmount ?? currentState.compensationAmount;

        set({
          ...state,
          compensationAmount,
          _lastUpdate: Date.now(),
        });
      },
      getState: () => get(),
      setSelectedDate: (date: Date | null) =>
        set((state: Store) => ({
          ...state,
          selectedDate: date,
          _lastUpdate: Date.now(),
        })),

      // Add PersonalDetailsActions
      setPersonalDetails: (details: PassengerDetails | null) => {
        const state = get();
        const hasChanged =
          JSON.stringify(state.personalDetails) !== JSON.stringify(details);

        if (!hasChanged) {
          return;
        }

        const now = Date.now();

        // Update details immediately with type coercion
        set((state: Store) => ({
          ...state,
          personalDetails: details
            ? {
                salutation: details.salutation || "",
                firstName: details.firstName || "",
                lastName: details.lastName || "",
                email: details.email || "",
                phone: details.phone || "",
                address: details.address || "",
                postalCode: details.postalCode || "",
                city: details.city || "",
                country: details.country || "",
              }
            : null,
          _lastUpdate: now,
        }));
      },

      validatePersonalDetails: async () => {
        const state = get();
        const details = state.personalDetails;
        const now = Date.now();

        if (
          !details ||
          Object.values(details).every((value) => !value || value.trim() === "")
        ) {
          return false;
        }

        const requiredFields = ["firstName", "lastName", "email"];
        if (
          requiredFields.some(
            (field) => !details[field as keyof PassengerDetails]?.trim()
          )
        ) {
          return false;
        }

        // Basic validation for now
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;
        const isValid = !!(
          details.firstName?.trim() &&
          details.lastName?.trim() &&
          details.email?.trim() &&
          emailRegex.test(details.email)
        );

        set((state: Store) => ({
          ...state,
          validationState: {
            ...state.validationState,
            isPersonalValid: isValid,
            stepValidation: {
              ...state.validationState.stepValidation,
              [state.currentPhase]: isValid,
              3: isValid,
            },
            stepInteraction: {
              ...state.validationState.stepInteraction,
              [state.currentPhase]: details !== null,
              3: details !== null,
            },
          },
          _lastUpdate: now,
        }));

        return isValid;
      },

      updateValidationState: (newState: Partial<ValidationState>) =>
        set((state: Store) => ({
          ...state,
          validationState: {
            ...state.validationState,
            ...newState,
            _timestamp: Date.now(),
          },
          _lastUpdate: Date.now(),
        })),

      hideLoading: () =>
        set((state: Store) => ({
          ...state,
          isLoading: false,
          _lastUpdate: Date.now(),
        })),

      setTermsAccepted: (accepted: boolean) =>
        set((state: Store) => {
          const now = Date.now();
          const isValid = accepted && state.privacyAccepted;

          // Update completedPhases but NOT phasesCompletedViaContinue - this should only happen when user clicks "Continue"
          const currentPhase = state.currentPhase as ValidationStep;
          const completedPhases = isValid
            ? Array.from(
                new Set([...state.completedPhases, 1 as ValidationStep])
              )
            : state.completedPhases;
          // Keep phasesCompletedViaContinue unchanged
          const phasesCompletedViaContinue = state.phasesCompletedViaContinue;

          // Mark step as completed in validation state
          const stepCompleted = {
            ...state.validationState.stepCompleted,
            1: isValid,
          };

          // Log state update
          console.log("=== Terms Acceptance State Update ===", {
            isValid,
            currentPhase,
            completedPhases,
            phasesCompletedViaContinue,
            timestamp: new Date().toISOString(),
          });

          return {
            ...state,
            termsAccepted: accepted,
            completedPhases,
            phasesCompletedViaContinue,
            validationState: {
              ...state.validationState,
              isTermsValid: isValid,
              stepValidation: {
                ...state.validationState.stepValidation,
                [state.currentPhase]: isValid,
                1: isValid, // Always update phase 1 validation
              },
              stepInteraction: {
                ...state.validationState.stepInteraction,
                [state.currentPhase]: true,
                1: true, // Always update phase 1 interaction
              },
              stepCompleted,
              _timestamp: now,
            },
            _lastUpdate: now,
          };
        }),

      setPrivacyAccepted: (accepted: boolean) =>
        set((state: Store) => {
          const now = Date.now();
          const isValid = accepted && state.termsAccepted;

          // Update completedPhases but NOT phasesCompletedViaContinue - this should only happen when user clicks "Continue"
          const currentPhase = state.currentPhase as ValidationStep;
          const completedPhases = isValid
            ? Array.from(
                new Set([...state.completedPhases, 1 as ValidationStep])
              )
            : state.completedPhases;
          // Keep phasesCompletedViaContinue unchanged
          const phasesCompletedViaContinue = state.phasesCompletedViaContinue;

          // Mark step as completed in validation state
          const stepCompleted = {
            ...state.validationState.stepCompleted,
            1: isValid,
          };

          // Log state update
          console.log("=== Privacy Acceptance State Update ===", {
            isValid,
            currentPhase,
            completedPhases,
            phasesCompletedViaContinue,
            timestamp: new Date().toISOString(),
          });

          return {
            ...state,
            privacyAccepted: accepted,
            completedPhases,
            phasesCompletedViaContinue,
            validationState: {
              ...state.validationState,
              isTermsValid: isValid,
              stepValidation: {
                ...state.validationState.stepValidation,
                [state.currentPhase]: isValid,
                1: isValid, // Always update phase 1 validation
              },
              stepInteraction: {
                ...state.validationState.stepInteraction,
                [state.currentPhase]: true,
                1: true, // Always update phase 1 interaction
              },
              stepCompleted,
              _timestamp: now,
            },
            _lastUpdate: now,
          };
        }),

      setMarketingAccepted: (accepted: boolean) =>
        set((state: Store) => ({
          ...state,
          marketingAccepted: accepted,
          _lastUpdate: Date.now(),
        })),

      setSignature: (signature: string) =>
        set((state: Store) => ({
          ...state,
          signature,
          _lastUpdate: Date.now(),
        })),

      setHasSignature: (hasSignature: boolean) =>
        set((state: Store) => ({
          ...state,
          hasSignature,
          _lastUpdate: Date.now(),
        })),

      validateSignature: () => {
        const state = get();
        return !!(state.signature && state.hasSignature);
      },

      setOriginalFlights: (flights: Flight[]) =>
        set((state: Store) => ({
          ...state,
          originalFlights: flights,
          _lastUpdate: Date.now(),
        })),

      setCurrentPhase: (phase: number) => {
        // Prevent recursive updates during initialization
        if (isInitializingStore.isSettingPhase) {
          return;
        }

        try {
          isInitializingStore.isSettingPhase = true;
          const currentState = get();

          // Only update if the phase has actually changed
          if (currentState.currentPhase === phase) {
            return;
          }

          // Save current phase state before transition
          try {
            const currentPhaseState = {
              fromLocation: currentState.fromLocation,
              toLocation: currentState.toLocation,
              directFlight: currentState.directFlight,
              flightSegments: currentState.flightSegments,
              selectedFlights: currentState.selectedFlights,
              selectedType: currentState.selectedType,
              validationState: currentState.validationState,
              _timestamp: Date.now(),
            };
            localStorage.setItem(
              `phase${currentState.currentPhase}State`,
              JSON.stringify(currentPhaseState)
            );

            // Also ensure phase 1 state is always kept up to date
            if (currentState.currentPhase !== 1) {
              localStorage.setItem(
                "phase1State",
                JSON.stringify(currentPhaseState)
              );
            }
          } catch (error) {
            console.error("Error saving current phase state:", error);
          }

          // Get the best location data by checking multiple sources
          const getBestLocationData = () => {
            // Get current phase from localStorage or default to 1
            let currentPhase = 1;
            try {
              // Try to get the current phase from localStorage
              const storedPhase = localStorage.getItem("currentPhase");
              if (storedPhase) {
                const parsedPhase = parseInt(storedPhase, 10);
                if (!isNaN(parsedPhase)) {
                  currentPhase = parsedPhase;
                }
              }
            } catch (e) {
              console.error("Error getting current phase:", e);
            }

            // For phase 4, we should ONLY use phase 4 data, never phases 1-3
            if (currentPhase === 4) {
              console.log("=== Store - Phase 4 Data Isolation ===", {
                message: "Using only phase 4 data, ignoring phases 1-3",
                timestamp: new Date().toISOString(),
              });

              // Get phase 4 data from flightStore
              const phase4Data = useFlightStore.getState().flightData[4];

              if (phase4Data) {
                return {
                  fromLocation: phase4Data.fromLocation,
                  toLocation: phase4Data.toLocation,
                  selectedType: phase4Data.selectedType || "direct",
                  flightSegments: phase4Data.flightSegments || [
                    {
                      fromLocation: phase4Data.fromLocation,
                      toLocation: phase4Data.toLocation,
                      date: null,
                      selectedFlight: null,
                    },
                  ],
                  source: "phase4Data",
                };
              }

              // If no phase 4 data, return empty data
              return {
                fromLocation: null,
                toLocation: null,
                selectedType: "direct",
                flightSegments: [
                  {
                    fromLocation: null,
                    toLocation: null,
                    date: null,
                    selectedFlight: null,
                  },
                ],
                source: "default",
              };
            }

            // For phases 1-3, use existing logic
            // Get data from all possible sources
            const phase3Data = localStorage.getItem("phase3FlightData");
            const phase2State = localStorage.getItem("phase2State");
            const phase1State = localStorage.getItem("phase1State");
            const flightStoreData =
              useFlightStore.getState().flightData[3] ||
              useFlightStore.getState().flightData[2] ||
              useFlightStore.getState().flightData[1];

            let restoredData: Phase1State | null = null;
            let phase2Data: Phase1State | null = null;
            let phase1Data: Phase1State | null = null;

            try {
              if (phase3Data) {
                const parsed = JSON.parse(phase3Data) as Phase1State;
                if (parsed && typeof parsed === "object") restoredData = parsed;
              }
              if (phase2State) {
                const parsed = JSON.parse(phase2State) as Phase1State;
                if (parsed && typeof parsed === "object") phase2Data = parsed;
              }
              if (phase1State) {
                const parsed = JSON.parse(phase1State) as Phase1State;
                if (parsed && typeof parsed === "object") phase1Data = parsed;
              }
            } catch (e) {
              console.error("Error parsing stored state:", e);
            }

            // Define an interface for the source objects
            interface LocationSource {
              fromLocation: any;
              toLocation: any;
              selectedType: "direct" | "multi";
              flightSegments: any[];
              timestamp: number;
              source: string;
            }

            // Get all possible sources for locations and sort by timestamp
            const sources = [
              phase1Data && {
                fromLocation: phase1Data.fromLocation,
                toLocation: phase1Data.toLocation,
                selectedType: phase1Data.selectedType || "direct",
                flightSegments: phase1Data.flightSegments || [],
                timestamp: phase1Data._timestamp || 0,
                source: "phase1Data",
              },
              phase2Data && {
                fromLocation: phase2Data.fromLocation,
                toLocation: phase2Data.toLocation,
                selectedType: phase2Data.selectedType || "direct",
                flightSegments: phase2Data.flightSegments || [],
                timestamp: phase2Data._timestamp || 0,
                source: "phase2Data",
              },
              restoredData && {
                fromLocation: restoredData.fromLocation,
                toLocation: restoredData.toLocation,
                selectedType: restoredData.selectedType || "direct",
                flightSegments: restoredData.flightSegments || [],
                timestamp: restoredData._timestamp || 0,
                source: "phase3Data",
              },
              flightStoreData && {
                fromLocation: flightStoreData.fromLocation,
                toLocation: flightStoreData.toLocation,
                selectedType: flightStoreData.selectedType || "direct",
                flightSegments: flightStoreData.flightSegments || [],
                timestamp: flightStoreData.timestamp || 0,
                source: "flightStore",
              },
            ].filter(Boolean) as LocationSource[];

            // Log all available sources
            console.log("=== Store - Location Resolution Sources ===", {
              sources: sources.map(
                (s) =>
                  s && {
                    source: s.source,
                    hasValidFrom: isValidLocation(s.fromLocation),
                    hasValidTo: isValidLocation(s.toLocation),
                    selectedType: s.selectedType,
                    flightSegments: s.flightSegments?.length,
                    timestamp: new Date(s.timestamp).toISOString(),
                  }
              ),
              timestamp: new Date().toISOString(),
            });

            // Get the most recent source
            const mostRecentSource = sources[0];
            if (!mostRecentSource) {
              return {
                fromLocation: null,
                toLocation: null,
                selectedType: "direct",
                flightSegments: [
                  {
                    fromLocation: null,
                    toLocation: null,
                    date: null,
                    selectedFlight: null,
                  },
                ],
                source: "default",
              };
            }

            // Use the most recent source's flight type and segments
            const selectedType = mostRecentSource.selectedType || "direct";
            const flightSegments = mostRecentSource.flightSegments || [];

            // For direct flights, ensure we have exactly one segment
            if (selectedType === "direct") {
              return {
                fromLocation: mostRecentSource.fromLocation,
                toLocation: mostRecentSource.toLocation,
                selectedType: "direct",
                flightSegments: [
                  {
                    fromLocation: mostRecentSource.fromLocation,
                    toLocation: mostRecentSource.toLocation,
                    date: null,
                    selectedFlight: null,
                  },
                ],
                source: mostRecentSource.source,
              };
            }

            // For multi-segment flights, validate and restore all segments
            if (selectedType === "multi" && flightSegments.length > 1) {
              const validSegments = flightSegments.every(
                (segment: FlightSegment) =>
                  isValidLocation(segment.fromLocation) &&
                  isValidLocation(segment.toLocation)
              );

              if (validSegments) {
                // Create an array of all segment locations
                const allSegmentLocations = flightSegments.map(
                  (segment: FlightSegment, index: number) => ({
                    fromLocation: segment.fromLocation,
                    toLocation: segment.toLocation,
                    isFirst: index === 0,
                    isLast: index === flightSegments.length - 1,
                  })
                );

                console.log("=== Multi-segment Locations ===", {
                  allSegmentLocations: allSegmentLocations.map(
                    (loc: {
                      fromLocation: LocationLike | null;
                      toLocation: LocationLike | null;
                    }) => ({
                      from: loc.fromLocation?.value,
                      to: loc.toLocation?.value,
                    })
                  ),
                  timestamp: new Date().toISOString(),
                });

                return {
                  fromLocation: flightSegments[0].fromLocation,
                  toLocation:
                    flightSegments[flightSegments.length - 1].toLocation,
                  selectedType: "multi",
                  flightSegments: flightSegments.map(
                    (segment: FlightSegment, index: number) => ({
                      ...segment,
                      fromLocation: allSegmentLocations[index].fromLocation,
                      toLocation: allSegmentLocations[index].toLocation,
                    })
                  ),
                  source: mostRecentSource.source,
                };
              }
            }

            // Fallback to direct flight if multi-segment validation fails
            return {
              fromLocation: mostRecentSource.fromLocation,
              toLocation: mostRecentSource.toLocation,
              selectedType: "direct",
              flightSegments: [
                {
                  fromLocation: mostRecentSource.fromLocation,
                  toLocation: mostRecentSource.toLocation,
                  date: null,
                  selectedFlight: null,
                },
              ],
              source: mostRecentSource.source,
            };
          };

          // Get the best available location data
          const { fromLocation, toLocation } = getBestLocationData();
          const hasValidLocations = !!(fromLocation && toLocation);

          // Create updated state with proper location data
          const updatedState = {
            ...currentState,
            fromLocation,
            toLocation,
            hasValidLocations,
            flightSegments: currentState.flightSegments || [],
            selectedFlights: currentState.selectedFlights || [],
            _lastUpdate: Date.now(),
          };

          // Log the restored state
          console.log("=== Store - State Restored ===", {
            hasValidLocations: updatedState.hasValidLocations,
            fromLocation,
            toLocation,
            flightSegments: updatedState.flightSegments.length,
            selectedFlights: updatedState.selectedFlights.length,
            timestamp: new Date().toISOString(),
          });

          // Update store state
          set(updatedState);

          // Save the new state to localStorage for both the target phase and phase 1
          try {
            const stateToSave = {
              ...updatedState,
              _timestamp: Date.now(),
            };
            localStorage.setItem(
              `phase${phase}State`,
              JSON.stringify(stateToSave)
            );
            localStorage.setItem("phase1State", JSON.stringify(stateToSave));

            // Also update flight store
            if (fromLocation && toLocation) {
              useFlightStore.getState().saveFlightData(phase, {
                fromLocation,
                toLocation,
                selectedType: updatedState.selectedType,
                timestamp: Date.now(),
              });
            }
          } catch (error) {
            console.error("Error saving new phase state:", error);
          }
        } finally {
          isInitializingStore.isSettingPhase = false;
        }
      },

      validateQAWizard: () => {
        const state = get();
        const { wizardAnswers, bookingNumber } = state;

        // Immediate validation
        const isValid =
          wizardAnswers.length > 0 &&
          wizardAnswers.every((a) => a.value) &&
          !!bookingNumber;

        // Update validation state synchronously
        set((state) => ({
          ...state,
          validationState: {
            ...state.validationState,
            isWizardValid: isValid,
            isWizardSubmitted: true,
            stepValidation: {
              ...state.validationState.stepValidation,
              2: isValid,
            },
            stepInteraction: {
              ...state.validationState.stepInteraction,
              2: true,
            },
            2: isValid,
            _timestamp: Date.now(),
          },
          _lastUpdate: Date.now(),
        }));

        return {
          isValid,
          answers: wizardAnswers,
          bookingNumber: bookingNumber || "",
        };
      },

      notifyInteraction: () => {
        const state = get();
        if (state.onInteract) {
          state.onInteract();
        }
      },

      setOnInteract: (callback: () => void) =>
        set((state: Store) => ({
          ...state,
          onInteract: callback,
          _lastUpdate: Date.now(),
        })),

      resetStore: () =>
        set((state: Store) => ({
          ...state,
          _lastUpdate: Date.now(),
        })),

      initializeNavigationFromUrl: (url: string) => {
        const basePath = url.replace(/^\/de/, "");
        const phase = PATH_TO_PHASE[basePath] || PATH_TO_PHASE[url];

        if (phase && typeof phase === "number") {
          set((state: Store) => ({
            ...state,
            currentPhase: phase as ValidationStep,
            _lastUpdate: Date.now(),
          }));
        }
      },

      validateAndUpdateStep: (step: ValidationStep) => {
        // Skip validation during initialization or phase setting
        if (isInitializingStore.value || isInitializingStore.isSettingPhase) {
          return false;
        }

        const state = get();
        let isValid = false;

        switch (step) {
          case 1:
            isValid = validateFlightSelection(state);
            break;
          case 2:
            // For phase 2, we need to check both flight selection and wizard
            isValid =
              validateFlightSelection(state) &&
              (state.validationState.isWizardValid ?? false);
            break;
          case 3:
            isValid = state.validationState.isPersonalValid ?? false;
            break;
          case 4:
            isValid = state.validationState.isTermsValid ?? false;
            break;
          case 5:
            isValid =
              (state.validationState.stepValidation[1] ?? false) &&
              (state.validationState.stepValidation[2] ?? false) &&
              (state.validationState.stepValidation[3] ?? false) &&
              (state.validationState.stepValidation[4] ?? false);
            break;
          default:
            isValid = false;
            break;
        }

        // Only update if the validation state has actually changed
        const currentValidation = state.validationState.stepValidation[step];
        if (currentValidation !== isValid) {
          const now = Date.now();
          set((state) => ({
            ...state,
            validationState: {
              ...state.validationState,
              stepValidation: {
                ...state.validationState.stepValidation,
                [step]: isValid,
              },
              stepInteraction: {
                ...state.validationState.stepInteraction,
                [step]: true,
              },
              completedSteps: isValid
                ? Array.from(
                    new Set([...state.validationState.completedSteps, step])
                  ).sort((a, b) => a - b)
                : state.validationState.completedSteps,
              _timestamp: now,
            },
            _lastUpdate: now,
          }));
        }

        return isValid;
      },

      batchUpdateWizardState: (updates: Partial<StoreStateValues>) => {
        const state = get();
        // Deep compare the relevant parts of the state
        const hasChanged = Object.entries(updates).some(([key, value]) => {
          const stateKey = key as keyof typeof state;
          const currentValue = state[stateKey];
          if (typeof value === "object" && value !== null) {
            return JSON.stringify(currentValue) !== JSON.stringify(value);
          }
          return currentValue !== value;
        });

        if (hasChanged) {
          const timestamp = Date.now();

          // If we're resetting the wizard state, also clear localStorage
          if (updates.wizardIsCompleted === false) {
            if (typeof window !== "undefined") {
              localStorage.removeItem("initialAssessmentValidation");
              localStorage.removeItem("wizardState");
              localStorage.removeItem("phase1ValidationState");
              sessionStorage.removeItem("activeAccordion");
            }

            // Ensure all related states are reset
            updates = {
              ...updates,
              wizardShowingSuccess: false,
              wizardIsValid: false,
              wizardAnswers: [],
              lastAnsweredQuestion: null,
              wizardSuccessMessage: "",
              completedWizards: {},
              validationState: {
                ...state.validationState,
                isWizardValid: false,
                isWizardSubmitted: false,
                stepValidation: {
                  ...state.validationState.stepValidation,
                  1: true, // Keep step 1 valid
                  2: false,
                  3: false,
                  4: false,
                },
                stepInteraction: {
                  ...state.validationState.stepInteraction,
                  2: false,
                },
                stepCompleted: {
                  ...state.validationState.stepCompleted,
                  2: false,
                },
                completedSteps: [],
                questionValidation: {},
                fieldErrors: {},
                errors: {
                  ...state.validationState.errors,
                  2: [],
                },
                _timestamp: timestamp,
              },
              wizardSuccessStates: {
                travel_status: { showing: false, message: "" },
                informed_date: { showing: false, message: "" },
                issue: { showing: false, message: "" },
                phase1: { showing: false, message: "" },
                default: { showing: false, message: "" },
              },
              _lastUpdate: timestamp,
            };
          }

          set((state: Store) => ({
            ...state,
            ...updates,
            _lastUpdate: timestamp,
          }));
        }
      },

      completePhase: (phase: ValidationStep) => {
        const state = get();
        const validationStep = phase as ValidationStep;

        // Only complete the phase if:
        // 1. All validation checks pass
        // 2. User has interacted with the phase
        // 3. Phase is marked as completed
        const isValid =
          state.validationState?.stepValidation?.[validationStep] &&
          state.validationState?.stepInteraction?.[validationStep] &&
          state.validationState?.stepCompleted?.[validationStep];

        if (!isValid) {
          console.log("=== Phase Completion Blocked ===", {
            phase: validationStep,
            validation: state.validationState?.stepValidation?.[validationStep],
            interaction:
              state.validationState?.stepInteraction?.[validationStep],
            completed: state.validationState?.stepCompleted?.[validationStep],
            preventPhaseChange: state._preventPhaseChange,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Only add the phase if it's not already in completedPhases
        const newCompletedPhases = state.completedPhases.includes(
          validationStep
        )
          ? state.completedPhases
          : [...state.completedPhases, validationStep].sort((a, b) => a - b);

        // Only add to phasesCompletedViaContinue if the phase is valid and completed
        const newPhasesCompletedViaContinue =
          state.phasesCompletedViaContinue.includes(validationStep)
            ? state.phasesCompletedViaContinue
            : [...state.phasesCompletedViaContinue, validationStep].sort(
                (a, b) => a - b
              );

        set({
          completedPhases: newCompletedPhases,
          phasesCompletedViaContinue: newPhasesCompletedViaContinue,
          currentPhase: (validationStep + 1) as ValidationStep,
          _preventPhaseChange: false, // Reset the flag when completing a phase
          _lastUpdate: Date.now(),
        });

        // Also persist to localStorage to ensure phase state is tracked even on refresh
        localStorage.setItem(
          "completedPhases",
          JSON.stringify(newCompletedPhases)
        );
        localStorage.setItem(
          "phasesCompletedViaContinue",
          JSON.stringify(newPhasesCompletedViaContinue)
        );
        localStorage.setItem("currentPhase", String(validationStep + 1));

        // SPECIAL HANDLING FOR PHASE 1: Immediately force update localStorage phase1State
        if (validationStep === 1) {
          // Directly get and update phase1State with the _explicitlyCompleted flag
          try {
            console.log("=== completePhase - Starting phase1State update ===", {
              validationStep,
              timestamp: new Date().toISOString(),
            });

            const phase1StateStr = localStorage.getItem("phase1State");
            console.log(
              "=== completePhase - Raw phase1State from localStorage ===",
              {
                phase1StateStr,
                timestamp: new Date().toISOString(),
              }
            );

            let phase1StateObj: Phase1State = {};

            if (phase1StateStr) {
              try {
                phase1StateObj = JSON.parse(phase1StateStr);
                console.log("=== completePhase - Parsed phase1State ===", {
                  phase1StateObj,
                  hasExplicitlyCompletedFlag:
                    "_explicitlyCompleted" in phase1StateObj,
                  explicitlyCompletedValue: phase1StateObj._explicitlyCompleted,
                  timestamp: new Date().toISOString(),
                });
              } catch (e) {
                console.error("Error parsing existing phase1State:", e);
              }
            }

            // Create an updated state with the _explicitlyCompleted flag forcefully set
            const updatedPhase1State: Phase1State = {
              ...phase1StateObj,
              _explicitlyCompleted: true,
              _completedTimestamp: Date.now(),
              _forcefullySetByCompletePhase: true, // Add a marker to track this update
            };

            // Use Object.defineProperty to ensure the flag is definitely set
            Object.defineProperty(updatedPhase1State, "_explicitlyCompleted", {
              value: true,
              writable: true,
              enumerable: true,
              configurable: true,
            });

            // Create an independent JSON string to verify serialization
            const jsonStr = JSON.stringify(updatedPhase1State);
            const parsed = JSON.parse(jsonStr);
            console.log("=== completePhase - Serialization Test ===", {
              hasExplicitlyCompletedFlag: "_explicitlyCompleted" in parsed,
              explicitlyCompletedValue: parsed._explicitlyCompleted,
              timestamp: new Date().toISOString(),
            });

            // Now actually set it in localStorage
            localStorage.setItem("phase1State", jsonStr);

            // Also set alternative flags like in handleContinue
            localStorage.setItem("phase1_explicitlyCompleted", "true");

            // Save a simplified object as well
            const simplifiedState = {
              _explicitlyCompleted: true,
              phase: 1,
              timestamp: Date.now(),
            };
            localStorage.setItem(
              "phase1_simple",
              JSON.stringify(simplifiedState)
            );

            // Verify what was actually stored
            const verifyStr = localStorage.getItem("phase1State");
            const verifyObj = verifyStr ? JSON.parse(verifyStr) : {};
            console.log(
              "=== completePhase - VERIFICATION after localStorage.setItem ===",
              {
                verifyStr: verifyStr
                  ? verifyStr.substring(0, 100) + "..."
                  : null,
                hasExplicitlyCompletedFlag: "_explicitlyCompleted" in verifyObj,
                explicitlyCompletedValue: verifyObj._explicitlyCompleted,
                timestamp: new Date().toISOString(),
              }
            );

            console.log("=== CRITICAL: Phase 1 Explicitly Completed ===", {
              updatedPhase1State,
              _explicitlyCompleted: updatedPhase1State._explicitlyCompleted,
              timestamp: new Date().toISOString(),
            });
          } catch (e) {
            console.error(
              "Error updating phase1State with _explicitlyCompleted flag:",
              e
            );
          }
        }

        // Also mark the phase state as explicitly completed (general case for any phase)
        try {
          const phaseStateKey = `phase${validationStep}State`;
          const phaseStateStr = localStorage.getItem(phaseStateKey);
          let phaseState = phaseStateStr ? JSON.parse(phaseStateStr) : {};

          // If the phase state doesn't exist or is empty, initialize it with basic fields
          if (!phaseState || Object.keys(phaseState).length === 0) {
            console.log(
              `=== Creating new ${phaseStateKey} in localStorage ===`
            );
            phaseState = {
              phase: validationStep,
              _timestamp: Date.now(),
            };
          }

          // Mark as explicitly completed with a timestamp
          const updatedPhaseState = {
            ...phaseState,
            _explicitlyCompleted: true,
            _completedTimestamp: Date.now(),
          };

          localStorage.setItem(
            phaseStateKey,
            JSON.stringify(updatedPhaseState)
          );

          console.log(
            `=== Phase ${validationStep} Explicitly Marked as Completed ===`,
            {
              updatedPhaseState,
              timestamp: new Date().toISOString(),
            }
          );
        } catch (e) {
          console.error(
            `Error updating ${validationStep} state in localStorage:`,
            e
          );
        }

        console.log("=== Phase Completed ===", {
          phase: validationStep,
          completedPhases: newCompletedPhases,
          phasesCompletedViaContinue: newPhasesCompletedViaContinue,
          preventPhaseChange: false, // Logging that we've reset this flag
          timestamp: new Date().toISOString(),
        });
      },

      setCompensationAmount: (amount: number | null) =>
        set((state: Store) => ({
          ...state,
          compensationAmount: amount,
          _lastUpdate: Date.now(),
        })),

      calculateCompensation: async (fromIata?: string, toIata?: string) => {
        const state = get();

        console.log("=== Calculate Compensation Called ===", {
          fromIata,
          toIata,
          isLoading: state.compensationLoading,
          hasCache: Boolean(state.compensationAmount),
          timestamp: new Date().toISOString(),
        });

        // Skip if already loading
        if (state.compensationLoading) {
          console.log("Skipping calculation - already loading");
          return;
        }

        // Skip if missing IATA codes
        if (!fromIata || !toIata) {
          console.log("Skipping calculation - missing IATA codes");
          set((state) => ({
            ...state,
            compensationError: "Missing airport codes",
            compensationLoading: false,
            _lastUpdate: Date.now(),
          }));
          return;
        }

        // Validate IATA codes (must be 3 uppercase letters)
        const validIata = /^[A-Z]{3}$/;
        if (!validIata.test(fromIata) || !validIata.test(toIata)) {
          console.log("Skipping calculation - invalid IATA codes");
          set((state) => ({
            ...state,
            compensationError: "Invalid airport codes",
            compensationLoading: false,
            _lastUpdate: Date.now(),
          }));
          return;
        }

        // Check cache first
        const cachedRoute = localStorage.getItem("lastCalculatedRoute");
        if (cachedRoute) {
          try {
            const cache = JSON.parse(cachedRoute);
            const cacheAge = Date.now() - cache.timestamp;
            const isValidCache = cacheAge < 1000 * 60 * 60; // 1 hour cache

            if (
              isValidCache &&
              cache.from === fromIata &&
              cache.to === toIata &&
              typeof cache.amount === "number"
            ) {
              console.log("Using cached compensation amount:", cache);
              set((state) => ({
                ...state,
                compensationAmount: cache.amount,
                compensationLoading: false,
                compensationError: null,
                _lastUpdate: Date.now(),
              }));
              return;
            }
          } catch (error) {
            console.error("Error parsing cache:", error);
          }
        }

        // Check if this is a duplicate call
        const cacheKey = `${fromIata}-${toIata}`;
        const calculationInProgress = sessionStorage.getItem(
          "calculationInProgress"
        );
        if (calculationInProgress === cacheKey) {
          console.log(
            "Skipping calculation - calculation already in progress for these locations"
          );
          return;
        }

        try {
          // Mark calculation as in progress
          sessionStorage.setItem("calculationInProgress", cacheKey);
          set((state) => ({
            ...state,
            compensationLoading: true,
            compensationError: null,
            _lastUpdate: Date.now(),
          }));

          console.log("Making API call for compensation calculation");
          const response = await fetch(
            `/.netlify/functions/calculateCompensation?from_iata=${fromIata}&to_iata=${toIata}`
          );

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to calculate compensation: ${errorText}`);
          }

          const data = await response.json();
          console.log("Received compensation calculation result:", data);

          // Update cache and state
          const newCache = {
            from: fromIata,
            to: toIata,
            amount: data.amount,
            timestamp: Date.now(),
          };

          localStorage.setItem("lastCalculatedRoute", JSON.stringify(newCache));

          set((state) => ({
            ...state,
            compensationAmount: data.amount,
            compensationLoading: false,
            compensationError: null,
            _lastUpdate: Date.now(),
          }));
        } catch (error) {
          console.error("Error calculating compensation:", error);
          set((state) => ({
            ...state,
            compensationError:
              error instanceof Error
                ? error.message
                : "Failed to calculate compensation",
            compensationAmount: null,
            compensationLoading: false,
            _lastUpdate: Date.now(),
          }));
        } finally {
          sessionStorage.removeItem("calculationInProgress");
        }
      },

      setCompensationLoading: (loading: boolean) =>
        set((state: Store) => ({
          ...state,
          compensationLoading: loading,
          _lastUpdate: Date.now(),
        })),

      setCompensationError: (error: string | null) =>
        set((state: Store) => ({
          ...state,
          compensationError: error,
          _lastUpdate: Date.now(),
        })),

      shouldRecalculateCompensation: () => false,

      setSelectedFlights: (flights: Flight[]) =>
        set((state: Store) => ({
          ...state,
          selectedFlights: flights,
          _lastUpdate: Date.now(),
        })),

      setSelectedType: (type: "direct" | "multi") =>
        set((state: Store) => ({
          ...state,
          selectedType: type,
          _lastUpdate: Date.now(),
        })),

      setDirectFlight: (flight: FlightSegment) =>
        set((state: Store) => ({
          ...state,
          directFlight: flight,
          _lastUpdate: Date.now(),
        })),

      setFlightSegments: (segments: FlightSegment[]) =>
        set((state: Store) => ({
          ...state,
          flightSegments: segments,
          _lastUpdate: Date.now(),
        })),

      setFromLocation: (location: LocationLike | null) =>
        set((state: Store) => {
          const now = Date.now();
          const typedLocation = location as (string & LocationLike) | null;

          // Save to phase1State immediately
          try {
            const phase1State = localStorage.getItem("phase1State");
            const updatedPhase1State = phase1State
              ? {
                  ...JSON.parse(phase1State),
                  fromLocation: typedLocation,
                  _timestamp: now,
                }
              : {
                  fromLocation: typedLocation,
                  toLocation: state.toLocation,
                  _timestamp: now,
                };
            localStorage.setItem(
              "phase1State",
              JSON.stringify(updatedPhase1State)
            );
          } catch (error) {
            console.error("Error updating phase1State:", error);
          }

          // Update flight store
          useFlightStore.getState().saveFlightData(state.currentPhase, {
            fromLocation: typedLocation,
            toLocation: state.toLocation,
            selectedType: state.selectedType,
            timestamp: now,
          });

          // Clear validation state for flight selection if location is removed
          let updatedValidationState = { ...state.validationState };
          if (!typedLocation) {
            console.log(
              "=== Store - Clearing Flight Validation (fromLocation removed) ===",
              {
                timestamp: new Date().toISOString(),
              }
            );

            // Clear validation for the current phase
            updatedValidationState = {
              ...updatedValidationState,
              isFlightValid: false,
              stepValidation: {
                ...updatedValidationState.stepValidation,
                [state.currentPhase]: false,
              },
              _timestamp: now,
            };
          }

          const newState = {
            ...state,
            fromLocation: typedLocation,
            directFlight: {
              ...state.directFlight,
              fromLocation: typedLocation,
            },
            validationState: updatedValidationState,
          };

          console.log("=== Store - Updated From Location ===", {
            fromLocation: typedLocation,
            isValid: !!typedLocation,
            timestamp: new Date().toISOString(),
          });

          return newState;
        }),

      setToLocation: (location: LocationLike | null) =>
        set((state: Store) => {
          const now = Date.now();
          const typedLocation = location as (string & LocationLike) | null;

          // Save to phase1State immediately
          try {
            const phase1State = localStorage.getItem("phase1State");
            const updatedPhase1State = phase1State
              ? {
                  ...JSON.parse(phase1State),
                  toLocation: typedLocation,
                  _timestamp: now,
                }
              : {
                  fromLocation: state.fromLocation,
                  toLocation: typedLocation,
                  _timestamp: now,
                };
            localStorage.setItem(
              "phase1State",
              JSON.stringify(updatedPhase1State)
            );
          } catch (error) {
            console.error("Error updating phase1State:", error);
          }

          // Update flight store
          useFlightStore.getState().saveFlightData(state.currentPhase, {
            fromLocation: state.fromLocation,
            toLocation: typedLocation,
            selectedType: state.selectedType,
            timestamp: now,
          });

          // Clear validation state for flight selection if location is removed
          let updatedValidationState = { ...state.validationState };
          if (!typedLocation) {
            console.log(
              "=== Store - Clearing Flight Validation (toLocation removed) ===",
              {
                timestamp: new Date().toISOString(),
              }
            );

            // Clear validation for the current phase
            updatedValidationState = {
              ...updatedValidationState,
              isFlightValid: false,
              stepValidation: {
                ...updatedValidationState.stepValidation,
                [state.currentPhase]: false,
              },
              _timestamp: now,
            };
          }

          const newState = {
            ...state,
            toLocation: typedLocation,
            directFlight: {
              ...state.directFlight,
              toLocation: typedLocation,
            },
            validationState: updatedValidationState,
          };

          console.log("=== Store - Updated To Location ===", {
            toLocation: typedLocation,
            isValid: !!typedLocation,
            timestamp: new Date().toISOString(),
          });

          return newState;
        }),

      setCompensationCache: (cache: CompensationCache) =>
        set((state: Store) => ({
          ...state,
          compensationCache: cache,
          _lastUpdate: Date.now(),
        })),

      startInitializing: () => {},
      finishInitializing: () => {},
      startLoading: () => {},
      finishLoading: () => {},
      setInitStarted: () => {},
      setIsMounted: () => {},
      setLocationError: () => {},
      initializeStore: async () => {},
      setIsFirstVisit: (value: boolean) =>
        set((state: Store) => ({
          ...state,
          isFirstVisit: value,
          _lastUpdate: Date.now(),
        })),
      canProceedToNextPhase: () => {
        const state = get();
        const currentPhase = state.currentPhase;

        // Use module-level variable for debouncing - no state updates at all
        const now = Date.now();
        if (now - lastNextPhaseCheckTime < 200) {
          return false;
        }

        // Update our module-level variable without touching store state
        lastNextPhaseCheckTime = now;

        // Log for debugging but don't update any state
        console.log("=== Phase Guard - Entry ===", {
          currentPhase,
          compensationAmount: state.compensationAmount,
          validationState: state.validationState,
          timestamp: new Date().toISOString(),
        });

        // For initial assessment (phase 1), check all steps
        if (currentPhase === 1) {
          // Individual step checks for better logging
          const isStep1Valid =
            state.validationState?.stepValidation?.[1] || false;
          const isStep2Valid =
            state.validationState?.stepValidation?.[2] || false;
          const isStep3Valid =
            state.validationState?.stepValidation?.[3] || false;
          const isStep4Valid =
            state.validationState?.stepValidation?.[4] || false;

          const hasStep1Interaction =
            state.validationState?.stepInteraction?.[1] || false;

          // All required steps must be valid AND interacted with
          const isRequiredStepsValid =
            isStep1Valid &&
            isStep2Valid &&
            isStep3Valid &&
            isStep4Valid &&
            hasStep1Interaction &&
            state.validationState?.stepInteraction?.[2] &&
            state.validationState?.stepInteraction?.[3] &&
            state.validationState?.stepInteraction?.[4];

          // Log validation state
          console.log("=== Phase Guard - Phase 1 Check ===", {
            validationState: state.validationState,
            steps: {
              step1: { valid: isStep1Valid, interacted: hasStep1Interaction },
              step2: {
                valid: isStep2Valid,
                interacted: state.validationState?.stepInteraction?.[2],
              },
              step3: {
                valid: isStep3Valid,
                interacted: state.validationState?.stepInteraction?.[3],
              },
              step4: {
                valid: isStep4Valid,
                interacted: state.validationState?.stepInteraction?.[4],
              },
            },
            isRequiredStepsValid,
            timestamp: new Date().toISOString(),
          });

          // Ensure personal details validation state is synchronized across phases
          if (isStep1Valid && isStep3Valid) {
            if (!state.validationState) {
              state.validationState = createEmptyValidationRecords();
            }

            // If personal details are valid, ensure it's reflected
            state.validationState.isPersonalValid = true;

            // Ensure both step 1 and step 3 validation states are updated
            // since personal details can appear in either depending on the phase
            if (!state.validationState.stepValidation) {
              state.validationState.stepValidation = {} as Record<
                ValidationStep,
                boolean
              >;
            }

            if (!state.validationState.stepInteraction) {
              state.validationState.stepInteraction = {} as Record<
                ValidationStep,
                boolean
              >;
            }

            // Set validation for steps 1 and 3 (personal details can be in either)
            state.validationState.stepValidation[1] = true;
            state.validationState.stepValidation[3] = true;
            state.validationState.stepInteraction[1] = true;
            state.validationState.stepInteraction[3] = true;

            // Set timestamp to ensure reactivity
            state.validationState._timestamp = Date.now();

            console.log("=== Personal Details Validation Synchronized ===", {
              isPersonalValid: state.validationState.isPersonalValid,
              step1Valid: state.validationState.stepValidation[1],
              step3Valid: state.validationState.stepValidation[3],
              timestamp: new Date().toISOString(),
            });
          }

          return isRequiredStepsValid;
        }

        // For phase 2, check compensation amount and validation state
        if (currentPhase === 2) {
          const compensationAmount = state.compensationAmount ?? 0;
          const isCompensationValid =
            state.validationState?.isCompensationValid || false;
          const hasCompensationInteraction =
            state.validationState?.stepInteraction?.[2] || false;
          const hasStepValidation =
            state.validationState?.stepValidation?.[2] || false;
          const isValid =
            compensationAmount > 0 &&
            isCompensationValid &&
            hasCompensationInteraction &&
            hasStepValidation;

          console.log("=== Phase Guard - Phase 2 Check ===", {
            hasValidCompensation: compensationAmount > 0,
            isCompensationValid,
            hasCompensationInteraction,
            hasStepValidation,
            compensationAmount,
            validationState: {
              isCompensationValid: state.validationState?.isCompensationValid,
              stepValidation: state.validationState?.stepValidation?.[2],
              stepInteraction: state.validationState?.stepInteraction?.[2],
              stepCompleted: state.validationState?.stepCompleted?.[2],
              completedSteps: state.validationState?.completedSteps,
            },
            isValid,
            timestamp: new Date().toISOString(),
          });

          return isValid;
        }

        // For other phases, check current phase validation
        const isCurrentPhaseValid =
          state.validationState?.stepValidation?.[currentPhase] || false;
        const hasInteractedWithPhase =
          state.validationState?.stepInteraction?.[currentPhase] || false;
        const isValid = isCurrentPhaseValid && hasInteractedWithPhase;

        console.log("=== Phase Guard - Other Phase Check ===", {
          phase: currentPhase,
          isCurrentPhaseValid,
          hasInteractedWithPhase,
          isValid,
          timestamp: new Date().toISOString(),
        });

        return isValid;
      },
      setWizardAnswers: (answers: Answer[]) => {
        const state = get();
        const hasChanged =
          JSON.stringify(state.wizardAnswers) !== JSON.stringify(answers);

        if (hasChanged) {
          set((state: Store) => ({
            ...state,
            wizardAnswers: answers,
            _lastUpdate: Date.now(),
          }));
        }
      },
      setIsInitialized: (value: boolean) => {
        const state = get();
        if (state.isInitialized !== value) {
          set((state: Store) => ({
            ...state,
            isInitialized: value,
            _lastUpdate: Date.now(),
          }));
        }
      },
      setWizardShowingSuccess: (showing: boolean) =>
        set((state) => ({
          ...state,
          wizardShowingSuccess: showing,
          _lastUpdate: Date.now(),
        })),
      setWizardValidationState: (validationState: Record<string, boolean>) =>
        set((state) => ({
          ...state,
          wizardValidationState: validationState,
          _lastUpdate: Date.now(),
        })),
      markWizardComplete: (wizardId: string) =>
        set((state) => ({
          ...state,
          completedWizards: {
            ...state.completedWizards,
            [wizardId]: true,
          },
          _lastUpdate: Date.now(),
        })),
      isWizardCompleted: (wizardId: string) => {
        const state = get();
        return state.completedWizards[wizardId] || false;
      },
      handleWizardComplete: (
        wizardId: string,
        answers: Answer[],
        successMessage: string
      ) => {
        const state = get();
        let wizardType = wizardId.split("_")[0] as WizardStepKey;

        if (wizardId.startsWith("travel_status")) {
          wizardType = "travel_status";
        } else if (wizardId.startsWith("informed")) {
          wizardType = "informed_date";
        }

        // Validate answers immediately
        const isValid = answers.length > 0 && answers.every((a) => a.value);

        // Create all new state objects before the update
        const newValidationState = {
          ...state.validationState,
          isWizardValid: isValid,
          isWizardSubmitted: true,
          stepValidation: {
            ...state.validationState.stepValidation,
            2: isValid,
          },
          stepInteraction: {
            ...state.validationState.stepInteraction,
            2: true,
          },
          2: isValid,
          _timestamp: Date.now(),
        };

        const newWizardSuccessStates = {
          ...state.wizardSuccessStates,
          [wizardType]: { showing: true, message: successMessage },
        };

        const completeWizardId =
          wizardType === "informed_date" ? "informed_date" : wizardId;
        const newCompletedWizards = {
          ...state.completedWizards,
          [completeWizardId]: true,
        };

        const newCompletedSteps = Array.from(
          new Set([...state.completedSteps, 2 as ValidationStep])
        ).sort((a, b) => a - b);

        // Update all state in a single atomic operation
        set((state) => ({
          ...state,
          validationState: newValidationState,
          lastAnsweredQuestion: wizardId,
          wizardAnswers: answers,
          wizardSuccessStates: newWizardSuccessStates,
          wizardIsCompleted: true,
          wizardIsValid: isValid,
          completedWizards: newCompletedWizards,
          completedSteps: newCompletedSteps,
          _lastUpdate: Date.now(),
        }));

        return isValid;
      },
      handleTripExperienceComplete: () =>
        set((state) => ({
          ...state,
          wizardIsCompleted: true,
          wizardIsValid: true,
          _lastUpdate: Date.now(),
        })),
      handleInformedDateComplete: () =>
        set((state) => ({
          ...state,
          wizardIsCompleted: true,
          wizardIsValid: true,
          _lastUpdate: Date.now(),
        })),
      setLastAnsweredQuestion: (questionId: string | null) =>
        set((state) => ({
          ...state,
          lastAnsweredQuestion: questionId,
          _lastUpdate: Date.now(),
        })),
      updateWizardAnswer: (questionId: string, answer: string) => {
        const state = get();
        const answers = [...state.wizardAnswers];
        const index = answers.findIndex((a) => a.questionId === questionId);
        if (index >= 0) {
          answers[index] = { ...answers[index], value: answer };
        } else {
          answers.push({ questionId, value: answer });
        }
        set((state) => ({
          ...state,
          wizardAnswers: answers,
          _lastUpdate: Date.now(),
        }));
      },
      setWizardLastActiveStep: () => {},
      setWizardIsValid: () => {},
      setWizardIsCompleted: () => {},
      setBookingNumber: (number: string) => {
        // Save to sessionStorage
        if (typeof window !== "undefined") {
          sessionStorage.setItem("booking_number", number);
        }

        useStore.setState((state) => ({
          ...state,
          bookingNumber: number,
          validationState: {
            ...state.validationState,
            isBookingValid: number.length >= 6,
            stepValidation: {
              ...state.validationState.stepValidation,
              [state.currentPhase]: number.length >= 6,
            },
            stepInteraction: {
              ...state.validationState.stepInteraction,
              [state.currentPhase]: true,
            },
            _timestamp: Date.now(),
          },
        }));
      },
      isClaimAccepted: false,
      isClaimRejected: false,
    }),
    {
      name: "captain-frank-state",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        console.log("=== Store - Rehydrating State ===", {
          timestamp: new Date().toISOString(),
          state,
        });

        if (!state) return createInitialState();

        // Get current phase from localStorage or default to 1
        let currentPhase = 1;
        try {
          // Try to get the current phase from localStorage
          const storedPhase = localStorage.getItem("currentPhase");
          if (storedPhase) {
            const parsedPhase = parseInt(storedPhase, 10);
            if (!isNaN(parsedPhase)) {
              currentPhase = parsedPhase;
            }
          }
        } catch (e) {
          console.error("Error getting current phase:", e);
        }

        // For phase 4, ensure complete isolation from phases 1-3
        if (currentPhase === 4) {
          console.log("=== Store - Phase 4 Isolation During Rehydration ===", {
            message:
              "Ensuring phase 4 data is completely isolated from phases 1-3",
            timestamp: new Date().toISOString(),
          });

          // Create a fresh state for phase 4
          const freshState = createInitialState();

          // Preserve only essential data from the existing state
          freshState.currentPhase = 4;
          freshState.termsAccepted = state.termsAccepted;
          freshState.privacyAccepted = state.privacyAccepted;
          freshState.completedPhases = state.completedPhases;
          freshState.phasesCompletedViaContinue =
            state.phasesCompletedViaContinue;

          // Get phase 4 data from flightStore
          const phase4Data = useFlightStore.getState().flightData[4];

          // If we have phase 4 data, use it
          if (phase4Data) {
            console.log("=== Store - Using Phase 4 Data ===", {
              hasPhase4Data: true,
              timestamp: new Date().toISOString(),
            });

            freshState.fromLocation = phase4Data.fromLocation;
            freshState.toLocation = phase4Data.toLocation;
            freshState.selectedType = phase4Data.selectedType || "direct";

            // Set selected flights from phase 4
            if (
              phase4Data.selectedFlights &&
              phase4Data.selectedFlights.length > 0
            ) {
              freshState.selectedFlights = [...phase4Data.selectedFlights];
            }

            // Set flight segments from phase 4
            if (
              phase4Data.flightSegments &&
              phase4Data.flightSegments.length > 0
            ) {
              freshState.flightSegments = [...phase4Data.flightSegments];
            } else {
              freshState.flightSegments = [
                {
                  fromLocation: phase4Data.fromLocation,
                  toLocation: phase4Data.toLocation,
                  date: null,
                  selectedFlight: null,
                },
              ];
            }
          }

          // Use the fresh state instead of the existing state
          return freshState;
        }

        // Restore terms and privacy acceptance state from localStorage first
        try {
          const termsAccepted =
            localStorage.getItem("termsAccepted") === "true";
          const privacyAccepted =
            localStorage.getItem("privacyAccepted") === "true";
          const isTermsValid = termsAccepted && privacyAccepted;

          // Log terms restoration
          console.log("=== Terms and Privacy Acceptance Restored ===", {
            isTermsValid,
            termsAccepted,
            privacyAccepted,
            timestamp: new Date().toISOString(),
          });

          // Update state with the restored values
          if (state) {
            state.termsAccepted = termsAccepted;
            state.privacyAccepted = privacyAccepted;

            // If terms are valid, ensure phase 1 is marked as completed
            if (isTermsValid) {
              // Ensure phase 1 is in completedPhases and phasesCompletedViaContinue
              state.completedPhases = Array.from(
                new Set([...state.completedPhases, 1 as ValidationStep])
              );
              state.phasesCompletedViaContinue = Array.from(
                new Set([
                  ...state.phasesCompletedViaContinue,
                  1 as ValidationStep,
                ])
              );

              // Update validation state
              if (state.validationState) {
                state.validationState.isTermsValid = true;
                state.validationState.stepValidation[1] = true;
                state.validationState.stepInteraction[1] = true;
                state.validationState.stepCompleted[1] = true;
              }
            }
          }
        } catch (e) {
          console.error("Error restoring terms and privacy state:", e);
        }

        // Get the best location data from all available sources
        const getBestLocationData = () => {
          // For phase 4, we should ONLY use phase 4 data, never phases 1-3
          if (currentPhase === 4) {
            console.log("=== Store - Phase 4 Data Isolation ===", {
              message: "Using only phase 4 data, ignoring phases 1-3",
              timestamp: new Date().toISOString(),
            });

            // Get phase 4 data from flightStore
            const phase4Data = useFlightStore.getState().flightData[4];

            if (phase4Data) {
              return {
                fromLocation: phase4Data.fromLocation,
                toLocation: phase4Data.toLocation,
                selectedType: phase4Data.selectedType || "direct",
                flightSegments: phase4Data.flightSegments || [
                  {
                    fromLocation: phase4Data.fromLocation,
                    toLocation: phase4Data.toLocation,
                    date: null,
                    selectedFlight: null,
                  },
                ],
                source: "phase4Data",
              };
            }

            // If no phase 4 data, return empty data
            return {
              fromLocation: null,
              toLocation: null,
              selectedType: "direct",
              flightSegments: [
                {
                  fromLocation: null,
                  toLocation: null,
                  date: null,
                  selectedFlight: null,
                },
              ],
              source: "default",
            };
          }

          // For phases 1-3, use existing logic
          // Get data from all possible sources
          const phase3Data = localStorage.getItem("phase3FlightData");
          const phase2State = localStorage.getItem("phase2State");
          const phase1State = localStorage.getItem("phase1State");
          const flightStoreData =
            useFlightStore.getState().flightData[3] ||
            useFlightStore.getState().flightData[2] ||
            useFlightStore.getState().flightData[1];

          let restoredData: Phase1State | null = null;
          let phase2Data: Phase1State | null = null;
          let phase1Data: Phase1State | null = null;

          try {
            if (phase3Data) {
              const parsed = JSON.parse(phase3Data) as Phase1State;
              if (parsed && typeof parsed === "object") restoredData = parsed;
            }
            if (phase2State) {
              const parsed = JSON.parse(phase2State) as Phase1State;
              if (parsed && typeof parsed === "object") phase2Data = parsed;
            }
            if (phase1State) {
              const parsed = JSON.parse(phase1State) as Phase1State;
              if (parsed && typeof parsed === "object") phase1Data = parsed;
            }
          } catch (e) {
            console.error("Error parsing stored state:", e);
          }

          // Define an interface for the source objects
          interface LocationSource {
            fromLocation: any;
            toLocation: any;
            selectedType: "direct" | "multi";
            flightSegments: any[];
            timestamp: number;
            source: string;
          }

          // Get all possible sources for locations and sort by timestamp
          const sources = [
            phase1Data && {
              fromLocation: phase1Data.fromLocation,
              toLocation: phase1Data.toLocation,
              selectedType: phase1Data.selectedType || "direct",
              flightSegments: phase1Data.flightSegments || [],
              timestamp: phase1Data._timestamp || 0,
              source: "phase1Data",
            },
            phase2Data && {
              fromLocation: phase2Data.fromLocation,
              toLocation: phase2Data.toLocation,
              selectedType: phase2Data.selectedType || "direct",
              flightSegments: phase2Data.flightSegments || [],
              timestamp: phase2Data._timestamp || 0,
              source: "phase2Data",
            },
            restoredData && {
              fromLocation: restoredData.fromLocation,
              toLocation: restoredData.toLocation,
              selectedType: restoredData.selectedType || "direct",
              flightSegments: restoredData.flightSegments || [],
              timestamp: restoredData._timestamp || 0,
              source: "phase3Data",
            },
            flightStoreData && {
              fromLocation: flightStoreData.fromLocation,
              toLocation: flightStoreData.toLocation,
              selectedType: flightStoreData.selectedType || "direct",
              flightSegments: flightStoreData.flightSegments || [],
              timestamp: flightStoreData.timestamp || 0,
              source: "flightStore",
            },
          ].filter(Boolean) as LocationSource[];

          // Log all available sources
          console.log("=== Store - Location Resolution Sources ===", {
            sources: sources.map(
              (s) =>
                s && {
                  source: s.source,
                  hasValidFrom: isValidLocation(s.fromLocation),
                  hasValidTo: isValidLocation(s.toLocation),
                  selectedType: s.selectedType,
                  flightSegments: s.flightSegments?.length,
                  timestamp: new Date(s.timestamp).toISOString(),
                }
            ),
            timestamp: new Date().toISOString(),
          });

          // Get the most recent source
          const mostRecentSource = sources[0];
          if (!mostRecentSource) {
            return {
              fromLocation: null,
              toLocation: null,
              selectedType: "direct",
              flightSegments: [
                {
                  fromLocation: null,
                  toLocation: null,
                  date: null,
                  selectedFlight: null,
                },
              ],
              source: "default",
            };
          }

          // Use the most recent source's flight type and segments
          const selectedType = mostRecentSource.selectedType || "direct";
          const flightSegments = mostRecentSource.flightSegments || [];

          // For direct flights, ensure we have exactly one segment
          if (selectedType === "direct") {
            return {
              fromLocation: mostRecentSource.fromLocation,
              toLocation: mostRecentSource.toLocation,
              selectedType: "direct",
              flightSegments: [
                {
                  fromLocation: mostRecentSource.fromLocation,
                  toLocation: mostRecentSource.toLocation,
                  date: null,
                  selectedFlight: null,
                },
              ],
              source: mostRecentSource.source,
            };
          }

          // For multi-segment flights, validate and restore all segments
          if (selectedType === "multi" && flightSegments.length > 1) {
            const validSegments = flightSegments.every(
              (segment: FlightSegment) =>
                isValidLocation(segment.fromLocation) &&
                isValidLocation(segment.toLocation)
            );

            if (validSegments) {
              // Create an array of all segment locations
              const allSegmentLocations = flightSegments.map(
                (segment: FlightSegment, index: number) => ({
                  fromLocation: segment.fromLocation,
                  toLocation: segment.toLocation,
                  isFirst: index === 0,
                  isLast: index === flightSegments.length - 1,
                })
              );

              console.log("=== Multi-segment Locations ===", {
                allSegmentLocations: allSegmentLocations.map(
                  (loc: {
                    fromLocation: LocationLike | null;
                    toLocation: LocationLike | null;
                  }) => ({
                    from: loc.fromLocation?.value,
                    to: loc.toLocation?.value,
                  })
                ),
                timestamp: new Date().toISOString(),
              });

              return {
                fromLocation: flightSegments[0].fromLocation,
                toLocation:
                  flightSegments[flightSegments.length - 1].toLocation,
                selectedType: "multi",
                flightSegments: flightSegments.map(
                  (segment: FlightSegment, index: number) => ({
                    ...segment,
                    fromLocation: allSegmentLocations[index].fromLocation,
                    toLocation: allSegmentLocations[index].toLocation,
                  })
                ),
                source: mostRecentSource.source,
              };
            }
          }

          // Fallback to direct flight if multi-segment validation fails
          return {
            fromLocation: mostRecentSource.fromLocation,
            toLocation: mostRecentSource.toLocation,
            selectedType: "direct",
            flightSegments: [
              {
                fromLocation: mostRecentSource.fromLocation,
                toLocation: mostRecentSource.toLocation,
                date: null,
                selectedFlight: null,
              },
            ],
            source: mostRecentSource.source,
          };
        };

        // Get the best location data
        const { fromLocation, toLocation } = getBestLocationData();

        // Create updated state with proper location data
        const updatedState = {
          ...state,
          fromLocation,
          toLocation,
          hasValidLocations: !!(fromLocation && toLocation),
          _lastUpdate: Date.now(),
        };

        // Log the restored state
        console.log("=== Store - State Restored ===", {
          hasValidLocations: updatedState.hasValidLocations,
          fromLocation,
          toLocation,
          flightSegments: updatedState.flightSegments.length,
          selectedFlights: updatedState.selectedFlights.length,
          timestamp: new Date().toISOString(),
        });

        // Ensure flight store is updated with the locations
        if (fromLocation && toLocation) {
          useFlightStore.getState().saveFlightData(state.currentPhase || 1, {
            fromLocation,
            toLocation,
            selectedType: state.selectedType || "direct",
            timestamp: Date.now(),
          });
        }

        // Restore validation state
        if (state.validationState) {
          updatedState.validationState = {
            ...state.validationState,
            isFlightValid: state.selectedFlights?.length > 0,
            stepValidation: {
              ...state.validationState.stepValidation,
              1: state.selectedFlights?.length > 0,
            },
          };
        }

        // After all rehydration is done, do a final check to ensure phase 4 isolation
        if (currentPhase === 4) {
          // Get phase 4 data from flightStore
          const phase4Data = useFlightStore.getState().flightData[4];

          // If we have phase 4 data, use it exclusively
          if (phase4Data) {
            console.log("=== Store - Final Phase 4 Isolation Check ===", {
              message: "Ensuring final state uses only phase 4 data",
              hasPhase4Data: !!phase4Data,
              timestamp: new Date().toISOString(),
            });

            // Override any state data with phase 4 data
            state.fromLocation = phase4Data.fromLocation;
            state.toLocation = phase4Data.toLocation;
            state.selectedType = phase4Data.selectedType || "direct";

            // Set selected flights from phase 4
            if (
              phase4Data.selectedFlights &&
              phase4Data.selectedFlights.length > 0
            ) {
              state.selectedFlights = [...phase4Data.selectedFlights];
            } else {
              state.selectedFlights = [];
            }

            // Set flight segments from phase 4
            if (
              phase4Data.flightSegments &&
              phase4Data.flightSegments.length > 0
            ) {
              state.flightSegments = [...phase4Data.flightSegments];
            } else {
              state.flightSegments = [
                {
                  fromLocation: phase4Data.fromLocation,
                  toLocation: phase4Data.toLocation,
                  date: null,
                  selectedFlight: null,
                },
              ];
            }
          } else {
            // If no phase 4 data, ensure we don't have any flight data
            state.fromLocation = null;
            state.toLocation = null;
            state.selectedFlights = [];
            state.flightSegments = [];
            state.selectedType = "direct";
          }
        }

        return updatedState;
      },
    }
  )
);

// Export the store instance
export type { Store };
const typedUseStore = useStore as typeof useStore;
export default typedUseStore;

// Move createEmptyValidationRecords into this file
function createEmptyValidationRecords(): ValidationState {
  const steps: ValidationStep[] = [1, 2, 3, 4, 5, 6, 7];
  const validationRecord = {} as Record<ValidationStep, boolean>;
  const errorsRecord = {} as Record<ValidationStep, string[]>;
  const interactionRecord = {} as Record<ValidationStep, boolean>;
  const completedRecord = {} as Record<ValidationStep, boolean>;

  steps.forEach((step) => {
    validationRecord[step] = false;
    errorsRecord[step] = [];
    interactionRecord[step] = false;
    completedRecord[step] = false;
  });

  return {
    stepValidation: validationRecord,
    stepInteraction: interactionRecord,
    errors: errorsRecord,
    stepCompleted: completedRecord,
    completedSteps: [],
    isPersonalValid: false,
    isFlightValid: false,
    isBookingValid: false,
    isWizardValid: false,
    isTermsValid: false,
    isSignatureValid: false,
    isWizardSubmitted: false,
    isCompensationValid: false,
    questionValidation: {},
    fieldErrors: {},
    transitionInProgress: false,
    _timestamp: Date.now(),
  };
}

// Add validation helper functions
export const validateFlightSelection = (state: StoreStateValues): boolean => {
  // Skip validation during initialization
  if (isInitializingStore.value) {
    return false;
  }

  try {
    let isValid = false;
    console.log("=== Flight Selection Validation ===");
    console.log("Current phase:", state.currentPhase);
    console.log("Selected type:", state.selectedType);

    const isLocationValid = (loc: LocationLike | null | string): boolean => {
      if (!loc) return false;
      if (typeof loc === "string") {
        return loc.trim().length > 0;
      }
      return typeof loc.value === "string" && loc.value.trim().length > 0;
    };

    if (state.selectedType === "multi") {
      // For multi-city flights
      const segments = state.flightSegments;
      console.log("Multi-city segments:", segments);

      if (state.currentPhase <= 2) {
        // For phase 1 and 2, validate if all segments have both locations
        isValid = !!(
          segments.length >= 2 &&
          segments.every(
            (segment) => segment.fromLocation && segment.toLocation
          ) &&
          // Validate city connections
          segments.every((segment, index) => {
            if (index === 0) return true;
            const prevSegment = segments[index - 1];
            if (!prevSegment.toLocation || !segment.fromLocation) return false;

            const prevCity =
              prevSegment.toLocation.city ||
              prevSegment.toLocation.description ||
              prevSegment.toLocation.label;
            const currentCity =
              segment.fromLocation.city ||
              segment.fromLocation.description ||
              segment.fromLocation.label;

            return prevCity?.toLowerCase() === currentCity?.toLowerCase();
          })
        );
      } else {
        // For phase 3 and above, check if we have all segments and flights
        isValid = !!(
          segments.length >= 2 &&
          segments.length <= 4 &&
          segments.every((segment) => {
            const hasLocations = !!(segment.fromLocation && segment.toLocation);
            return hasLocations && segment.selectedFlight;
          })
        );
      }
      console.log("Multi-city validation result:", isValid);
    } else {
      // For direct flights
      const segment = state.flightSegments[0] || state.directFlight;
      const fromLoc = segment?.fromLocation || state.fromLocation;
      const toLoc = segment?.toLocation || state.toLocation;

      // For phase 1 and 2, only validate locations
      if (state.currentPhase <= 2) {
        isValid = !!(isLocationValid(fromLoc) && isLocationValid(toLoc));
      } else {
        // For phase 3 and above, validate locations and selected flight
        isValid = !!(
          isLocationValid(fromLoc) &&
          isLocationValid(toLoc) &&
          segment?.selectedFlight
        );
      }
      console.log("Direct flight validation result:", isValid);
    }

    // Create a new validation state object
    const newValidationState = {
      ...state.validationState,
      isFlightValid: isValid,
      stepValidation: {
        ...state.validationState.stepValidation,
        [state.currentPhase]: isValid,
      },
      stepInteraction: {
        ...state.validationState.stepInteraction,
        [state.currentPhase]: true,
      },
      [state.currentPhase]: isValid,
      _timestamp: Date.now(),
    };

    // Update the state immutably
    state.validationState = newValidationState;
    state._lastUpdate = Date.now();

    console.log("Final validation state:", newValidationState);
    console.log("=== End Flight Selection Validation ===");

    return isValid;
  } catch (error) {
    console.error("Error in validateFlightSelection:", error);
    return false;
  }
};

// Validation function for QA wizard
function validateQAWizardImpl(state: StoreStateValues): {
  isValid: boolean;
  answers: Answer[];
  bookingNumber: string;
} {
  const { wizardAnswers } = state;
  if (!wizardAnswers || wizardAnswers.length === 0)
    return {
      isValid: false,
      answers: [],
      bookingNumber: state.bookingNumber || "",
    };

  // Don't validate if not submitted
  if (!state.validationState.isWizardSubmitted) {
    console.log("Skipping QA validation - not yet submitted");
    return {
      isValid: false,
      answers: wizardAnswers,
      bookingNumber: state.bookingNumber || "",
    };
  }

  // Check if all required questions are answered
  const issueType = wizardAnswers.find(
    (a) => a.questionId === "issue_type"
  )?.value;

  if (!issueType)
    return {
      isValid: false,
      answers: wizardAnswers,
      bookingNumber: state.bookingNumber || "",
    };

  let isValid = false;

  // Additional validation based on issue type
  switch (issueType) {
    case "delay":
      // Need delay duration
      isValid = wizardAnswers.some((a) => a.questionId === "delay_duration");
      break;

    case "cancel":
      // Need cancellation notice and alternative flight info
      const hasCancellationNotice = wizardAnswers.some(
        (a) => a.questionId === "cancellation_notice"
      );
      const hasAirlineAlternative = wizardAnswers.some(
        (a) => a.questionId === "alternative_flight_airline_expense"
      );
      const hasRefundStatus = wizardAnswers.some(
        (a) => a.questionId === "refund_status"
      );

      if (
        !hasCancellationNotice ||
        !hasAirlineAlternative ||
        !hasRefundStatus
      ) {
        isValid = false;
        break;
      }

      // If airline didn't provide alternative, need own alternative info
      const airlineProvidedAlternative =
        wizardAnswers.find(
          (a) => a.questionId === "alternative_flight_airline_expense"
        )?.value === "yes";

      if (!airlineProvidedAlternative) {
        isValid = wizardAnswers.some(
          (a) => a.questionId === "alternative_flight_own_expense"
        );
      } else {
        isValid = true;
      }
      break;

    case "missed":
      // Need missed costs info
      const hasMissedCosts = wizardAnswers.some(
        (a) => a.questionId === "missed_costs"
      );
      if (!hasMissedCosts) {
        isValid = false;
        break;
      }

      // If they had costs, need amount
      const hadCosts =
        wizardAnswers.find((a) => a.questionId === "missed_costs")?.value ===
        "yes";

      if (hadCosts) {
        isValid = wizardAnswers.some(
          (a) => a.questionId === "missed_costs_amount"
        );
      } else {
        isValid = true;
      }
      break;

    case "other":
      // No additional questions needed for 'other'
      isValid = true;
      break;

    default:
      isValid = false;
  }

  return {
    isValid,
    answers: wizardAnswers,
    bookingNumber: state.bookingNumber || "",
  };
}

export const validateQAWizard = validateQAWizardImpl;

export const validatePersonalDetails = (state: StoreStateValues): boolean => {
  const { currentPhase, personalDetails } = state;
  if (!personalDetails) return false;

  // Basic required fields for all phases
  const hasBasicFields = !!(
    personalDetails.salutation?.trim() &&
    personalDetails.firstName?.trim() &&
    personalDetails.lastName?.trim() &&
    personalDetails.email?.trim() &&
    personalDetails.postalCode?.trim()
  );

  // Email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;
  const hasValidEmail = !!(
    personalDetails.email && emailRegex.test(personalDetails.email)
  );

  // Additional fields required for claim success and agreement phases
  const isClaimSuccessPhase =
    currentPhase === PATH_TO_PHASE["/phases/claim-success"] ||
    currentPhase === PATH_TO_PHASE["/phases/agreement"];

  const hasClaimSuccessFields = isClaimSuccessPhase
    ? !!(
        personalDetails.phone?.trim() &&
        personalDetails.address?.trim() &&
        personalDetails.postalCode?.trim() &&
        personalDetails.city?.trim() &&
        personalDetails.country?.trim()
      )
    : true;

  return !!(hasBasicFields && hasValidEmail && hasClaimSuccessFields);
};

export const validateTerms = (
  state: StoreStateValues,
  set: (fn: (state: StoreStateValues) => Partial<StoreStateValues>) => void
): boolean => {
  const isValid = !!(state.termsAccepted && state.privacyAccepted);

  // Use set to update validation state
  set((state) => ({
    ...state,
    validationState: {
      ...state.validationState,
      isTermsValid: isValid,
      stepValidation: {
        ...state.validationState.stepValidation,
        2: isValid,
      },
      stepInteraction: {
        ...state.validationState.stepInteraction,
        2: true,
      },
      2: isValid,
    },
    completedPhases: isValid
      ? Array.from(
          new Set([...state.completedPhases, 2 as ValidationStep])
        ).sort((a, b) => a - b)
      : state.completedPhases,
  }));

  return isValid;
};

export const validateSignature = (state: StoreStateValues): boolean => {
  try {
    // Check if signature exists and hasSignature flag is true
    if (!state.signature || !state.hasSignature) {
      return false;
    }

    // Basic validation to ensure the signature is a valid data URL
    if (!state.signature.startsWith("data:image/")) {
      console.warn("Invalid signature format: not a data URL");
      return false;
    }

    // Check minimum length to ensure it's not empty
    if (state.signature.length < 100) {
      console.warn("Signature appears to be too short/empty");
      return false;
    }

    // Limit validation frequency to prevent excessive checks
    const now = Date.now();
    const lastValidationTime = state._lastSignatureValidation || 0;

    // Only validate once per second at most
    if (now - lastValidationTime < 1000) {
      // Return the last validation result if available
      return state._lastSignatureValidationResult || false;
    }

    // Store the validation time and result
    state._lastSignatureValidation = now;
    state._lastSignatureValidationResult = true;

    return true;
  } catch (error) {
    console.error("Error validating signature:", error);
    return false;
  }
};

// Single implementation of step validation
export const checkStepValidity =
  (state: StoreStateValues) =>
  (step: ValidationStep): boolean => {
    // For any phase, check if the step has been validated and interacted with
    return !!(
      state.validationState?.stepValidation?.[step] &&
      state.validationState?.stepInteraction?.[step]
    );
  };

// Add helper function to check if compensation needs recalculation
export const shouldRecalculateCompensation = (
  state: StoreStateValues
): boolean => {
  const {
    compensationCache,
    selectedType,
    directFlight,
    flightSegments,
    selectedFlights,
  } = state;

  // If we have a cached amount and flight data, check if anything has changed
  if (compensationCache.amount !== null && compensationCache.flightData) {
    // Check if flight type changed
    if (selectedType !== compensationCache.flightData.selectedType) return true;

    // For direct flights
    if (selectedType === "direct") {
      return (
        JSON.stringify(directFlight) !==
        JSON.stringify(compensationCache.flightData.directFlight)
      );
    }

    // For multi-segment flights
    return (
      JSON.stringify(flightSegments) !==
        JSON.stringify(compensationCache.flightData.flightSegments) ||
      JSON.stringify(selectedFlights) !==
        JSON.stringify(compensationCache.flightData.selectedFlights)
    );
  }

  // If no cache exists or amount is null, we need to calculate
  return true;
};

// Add type declaration for window extension
declare global {
  interface Window {
    __wizardSuccessTimeout?: NodeJS.Timeout;
    __accordionContext?: {
      setActiveAccordion: (step: string) => void;
    };
  }
}

// Add near the top of the file with other type definitions
interface Phase1State {
  fromLocation?: any;
  toLocation?: any;
  selectedType?: "direct" | "multi";
  directFlight?: any;
  flightSegments?: any[];
  phase?: number;
  _timestamp?: number;
  _explicitlyCompleted?: boolean;
  _completedTimestamp?: number;
  _forcefullySetByCompletePhase?: boolean;
  validationState?: any;
  [key: string]: any; // Allow for other properties
}

function createInitialState(): Store {
  // Add browser environment check
  const isBrowser = typeof window !== "undefined";

  // Try to get initial compensation data from localStorage
  let initialCompensationAmount = null;
  try {
    if (isBrowser) {
      const storedAmount = localStorage.getItem("compensationAmount");
      if (storedAmount) {
        initialCompensationAmount = JSON.parse(storedAmount);
      }
    }
  } catch (error) {
    console.error("Error parsing stored compensation amount:", error);
  }

  // Try to get evaluation status from sessionStorage
  let initialClaimSuccess = false;
  let initialClaimRejected = false;
  try {
    if (isBrowser) {
      const storedResponse = sessionStorage.getItem(
        "claim_evaluation_response"
      );
      if (storedResponse) {
        const parsed = JSON.parse(storedResponse);
        initialClaimSuccess = parsed.status === "accept";
        initialClaimRejected = parsed.status === "reject";
      }
    }
  } catch (error) {
    console.error("Error parsing stored evaluation response:", error);
  }

  // Get initial validation state
  const initialValidationState = createEmptyValidationRecords();
  if (initialCompensationAmount) {
    initialValidationState.isCompensationValid = true;
    initialValidationState.stepValidation[2] = true;
    initialValidationState.stepInteraction[2] = true;
    initialValidationState.stepCompleted[2] = true;
  }

  const initialState: Store = {
    locationError: null,
    bookingNumber: "",
    isTransitioningPhases: false,
    isInitializing: false,
    isInitialized: false,
    isFirstVisit: true,
    isClaimAccepted: initialClaimSuccess,
    isClaimRejected: initialClaimRejected,
    _lastUpdate: Date.now(),
    _lastPersist: Date.now(),
    _isCheckingNextPhase: false,
    isLoading: false,
    _isRestoring: false,
    _isClaimSuccess: initialClaimSuccess,
    _isClaimRejected: initialClaimRejected,
    completedWizards: {},
    signature: "",
    hasSignature: false,
    _preventPhaseChange: false,
    // Add calculateCompensation function to match the Store type
    calculateCompensation: async (fromIata?: string, toIata?: string) => {
      console.log("=== Initial calculateCompensation stub called ===", {
        fromIata,
        toIata,
      });
      // This is just a stub that will be replaced by the real implementation when the store is created
    },
    currentPhase: 1 as ValidationStep,
    currentStep: 1,
    completedPhases: [],
    validationState: initialValidationState,
    selectedDate: null,
    phasesCompletedViaContinue: [],
    completedSteps: [],
    openSteps: [],
    selectedType: "direct" as const,
    directFlight: {
      fromLocation: null,
      toLocation: null,
      date: null,
      selectedFlight: null,
    },
    flightSegments: [
      {
        fromLocation: null,
        toLocation: null,
        date: null,
        selectedFlight: null,
      },
    ],
    currentSegmentIndex: 0,
    fromLocation: null,
    toLocation: null,
    selectedFlights: [],
    originalFlights: [],
    selectedFlight: null,
    flightDetails: null,
    delayDuration: null,
    isFlightValid: false,
    wizardAnswers: [],
    wizardCurrentSteps: {
      travel_status: 0,
      informed_date: 0,
      issue: 0,
      phase1: 0,
      default: 0,
    },
    wizardShowingSuccess: false,
    wizardSuccessMessage: "",
    wizardIsCompleted: false,
    wizardIsValid: false,
    wizardIsValidating: false,
    lastAnsweredQuestion: null,
    lastValidAnswers: [],
    lastValidStep: 0,
    wizardIsEditingMoney: false,
    wizardLastActiveStep: null,
    wizardValidationState: {},
    wizardSuccessStates: {
      travel_status: { showing: false, message: "" },
      informed_date: { showing: false, message: "" },
      issue: { showing: false, message: "" },
      phase1: { showing: false, message: "" },
      default: { showing: false, message: "" },
    },
    tripExperienceAnswers: [],
    wizardQuestions: [],
    personalDetails: null,
    termsAccepted: false,
    privacyAccepted: false,
    marketingAccepted: false,
    isSearchModalOpen: false,
    searchTerm: "",
    displayedFlights: [],
    allFlights: [],
    loading: false,
    errorMessage: null,
    errorMessages: {},
    currentLanguage: "de",
    supportedLanguages: ["de", "en"],
    defaultLanguage: "de",
    compensationAmount: initialCompensationAmount,
    compensationLoading: false,
    compensationError: null,
    compensationCache: {
      amount: initialCompensationAmount,
      flightData: null,
    },
    evaluationResult: {
      status: null,
      guid: undefined,
      recommendation_guid: undefined,
      contract: undefined,
      rejection_reasons: undefined,
      journey_booked_flightids: undefined,
      journey_fact_flightids: undefined,
      information_received_at: undefined,
      travel_status: undefined,
      delay_duration: undefined,
    },
    isClaimSuccess: false,
    showAdditionalFields: false,
    hasValidLocations: false,
    isComponentReady: false,
    initState: "idle" as const,
    isSearchLoading: false,
    hasValidFlights: false,
    previousValidationState: {
      1: false,
      2: false,
      3: false,
      4: false,
      5: false,
      6: false,
      7: false,
    },
    isMounted: false,
    isInitStarted: false,
    onInteract: null,
    // Action methods
    setSelectedDate: () => {},
    updateValidationState: () => {},
    initializeNavigationFromUrl: () => {},
    validateQAWizard: () => ({
      isValid: false,
      answers: [],
      bookingNumber: "",
    }),
    notifyInteraction: () => {},
    setOnInteract: () => {},
    resetStore: () => {},
    hideLoading: () => {},
    setTermsAccepted: () => {},
    setPrivacyAccepted: () => {},
    setMarketingAccepted: () => {},
    setSignature: () => {},
    setHasSignature: () => {},
    validateSignature: () => false,
    setOriginalFlights: () => {},
    setCurrentPhase: () => {},
    validateAndUpdateStep: () => false,
    batchUpdateWizardState: () => {},
    setState: () => {},
    getState: () => ({} as StoreState),
    completePhase: () => {},
    setCompensationAmount: () => {},
    setCompensationLoading: () => {},
    setCompensationError: () => {},
    shouldRecalculateCompensation: () => false,
    setSelectedFlights: () => {},
    setSelectedType: () => {},
    setDirectFlight: () => {},
    setFlightSegments: () => {},
    setFromLocation: () => {},
    setToLocation: () => {},
    setCompensationCache: () => {},
    startInitializing: () => {},
    finishInitializing: () => {},
    startLoading: () => {},
    finishLoading: () => {},
    setInitStarted: () => {},
    setIsMounted: () => {},
    setLocationError: () => {},
    initializeStore: async () => {},
    setPersonalDetails: () => {},
    validatePersonalDetails: async () => false,
    setIsFirstVisit: () => {},
    canProceedToNextPhase: () => false,
    setWizardAnswers: () => {},
    setIsInitialized: () => {},
    setWizardShowingSuccess: () => {},
    setWizardValidationState: () => {},
    markWizardComplete: () => {},
    isWizardCompleted: () => false,
    handleWizardComplete: () => false,
    handleTripExperienceComplete: () => {},
    handleInformedDateComplete: () => {},
    setLastAnsweredQuestion: () => {},
    updateWizardAnswer: () => {},
    setWizardLastActiveStep: () => {},
    setWizardIsValid: () => {},
    setWizardIsCompleted: () => {},
    setBookingNumber: () => {},
  };

  return initialState;
}

// Add getLanguageAwareUrl function
export function getLanguageAwareUrl(url: string, lang?: string): string {
  const validLang = lang && isValidLanguage(lang) ? lang : DEFAULT_LANGUAGE;

  // Handle URL parameters
  let path = url;
  let query = "";

  // Check if URL contains parameters
  if (url.includes("?")) {
    const parts = url.split("?");
    path = parts[0];
    query = `?${parts[1]}`;
  }

  // Add search params from current URL if on client side
  if (typeof window !== "undefined" && !query) {
    const currentParams = new URLSearchParams(
      window.location.search
    ).toString();
    if (currentParams) {
      query = `?${currentParams}`;
    }
  }

  return `/${validLang}${path.startsWith("/") ? path : `/${path}`}${query}`;
}

export const canProceedToNextPhase = (state: StoreStateValues): boolean => {
  // For any phase, check if it can proceed to the next phase
  if (isInitializingStore.value) return false;

  try {
    switch (state.currentPhase) {
      case 1: {
        // Phase 1 specifically needs steps 1-4 completed
        const requiredSteps = [1, 2, 3, 4];

        // Always do a thorough check of personal details based on the actual data
        const personalDetailsValid = !!(
          state.personalDetails &&
          state.personalDetails.firstName?.trim() &&
          state.personalDetails.lastName?.trim() &&
          state.personalDetails.email?.trim()
        );

        // Check personal details valid (step 1 in phases 5-6, step 3 in phase 1)
        const isPersonalValid =
          state.validationState?.isPersonalValid ||
          (state.validationState?.stepValidation?.[1] &&
            state.validationState?.stepValidation?.[3]) ||
          personalDetailsValid ||
          false;

        // Check if all required steps are valid
        const isRequiredStepsValid = requiredSteps.every(
          (step) =>
            state.validationState?.stepValidation?.[step as ValidationStep] ||
            false
        );

        // Log for debugging
        console.log("=== Phase 1 Check - Before Updates ===", {
          validationState: state.validationState,
          personalDetailsValid,
          isPersonalValid,
          isStep1Valid: state.validationState?.stepValidation?.[1] || false,
          isStep2Valid: state.validationState?.stepValidation?.[2] || false,
          isStep3Valid: state.validationState?.stepValidation?.[3] || false,
          isStep4Valid: state.validationState?.stepValidation?.[4] || false,
          isRequiredStepsValid,
          personalDetails: {
            firstName: state.personalDetails?.firstName,
            lastName: state.personalDetails?.lastName,
            email: state.personalDetails?.email,
          },
          // Debug stepValidation object
          stepValidation: state.validationState?.stepValidation,
          timestamp: new Date().toISOString(),
        });

        // DEBUG: Directly check individual form validations
        const hasValidFlightSelection =
          state.validationState?.stepValidation?.[1] || false;
        const hasCompletedWizard =
          state.validationState?.isWizardValid &&
          state.validationState?.isWizardSubmitted;
        const hasValidPersonalDetails =
          state.validationState?.isPersonalValid ||
          state.validationState?.stepValidation?.[3] ||
          personalDetailsValid ||
          false;
        const hasAcceptedTerms =
          state.validationState?.stepValidation?.[4] ||
          (state.termsAccepted && state.privacyAccepted);

        // Log for better debugging
        console.log("=== Phase 1 Check - Validation Details ===", {
          hasValidFlightSelection,
          hasCompletedWizard,
          hasValidPersonalDetails,
          hasAcceptedTerms,
          allStepsValid:
            hasValidFlightSelection &&
            hasCompletedWizard &&
            hasValidPersonalDetails &&
            hasAcceptedTerms,
          timestamp: new Date().toISOString(),
        });

        // Create a consistent validation state update function
        const updateValidationStateForPersonalDetails = () => {
          // Only update if we have access to the store and if personal details are valid
          if (
            (isPersonalValid || personalDetailsValid) &&
            state.updateValidationState
          ) {
            const updatedValidationState = {
              ...state.validationState,
              isPersonalValid: true,
              stepValidation: {
                ...state.validationState?.stepValidation,
                1: true, // Ensure step 1 is valid
                3: true, // Ensure step 3 is valid
              },
              stepInteraction: {
                ...state.validationState?.stepInteraction,
                1: true, // Ensure step 1 is interacted
                3: true, // Ensure step 3 is interacted
              },
              stepCompleted: {
                ...state.validationState?.stepCompleted,
                1: true, // Mark step 1 as completed
                3: true, // Mark step 3 as completed
              },
              _timestamp: Date.now(), // Add timestamp for reactivity
            };

            // Update the state in the store
            state.updateValidationState(updatedValidationState);

            // Also save to localStorage in multiple places for maximum persistence
            try {
              localStorage.setItem(
                "validationState",
                JSON.stringify(updatedValidationState)
              );
              localStorage.setItem(
                "phase1ValidationState",
                JSON.stringify({ validationState: updatedValidationState })
              );

              // Update the current phase state if it exists
              const phase1StateStr = localStorage.getItem("phase1State");
              if (phase1StateStr) {
                try {
                  const phase1State = JSON.parse(phase1StateStr);
                  localStorage.setItem(
                    "phase1State",
                    JSON.stringify({
                      ...phase1State,
                      validationState: updatedValidationState,
                    })
                  );
                } catch (e) {
                  console.error(
                    "Error updating phase1State with validation info:",
                    e
                  );
                }
              } else {
                // If phase1State doesn't exist, create it with validation state
                localStorage.setItem(
                  "phase1State",
                  JSON.stringify({
                    validationState: updatedValidationState,
                    _timestamp: Date.now(),
                  })
                );
              }

              console.log("=== Phase 1 Check - Updated Validation State ===", {
                validationState: updatedValidationState,
                hasPersonalDetails: !!state.personalDetails,
                firstName: state.personalDetails?.firstName,
                lastName: state.personalDetails?.lastName,
                email: state.personalDetails?.email,
                timestamp: new Date().toISOString(),
              });
            } catch (e) {
              console.error(
                "Error saving validation state to localStorage:",
                e
              );
            }
          }
        };

        // Always update validation state for personal details if it's valid but not reflected in the state
        // This ensures the check mark stays visible when navigating between phases
        if (
          (isPersonalValid || personalDetailsValid) &&
          (!state.validationState?.isPersonalValid ||
            !state.validationState?.stepValidation?.[3])
        ) {
          // Use immediate update for validation state
          updateValidationStateForPersonalDetails();
        }

        // Return whether all required steps are valid
        // This takes into account both the validation state and the direct checks
        return (
          isRequiredStepsValid ||
          (hasValidFlightSelection &&
            hasCompletedWizard &&
            hasValidPersonalDetails &&
            hasAcceptedTerms)
        );
      }
      case 2: {
        // Phase 2 requires wizard to be valid
        const isWizardValid = state.validationState?.isWizardValid || false;
        const isWizardSubmitted =
          state.validationState?.isWizardSubmitted || false;

        return isWizardValid && isWizardSubmitted;
      }
      case 3: {
        // Phase 3 requires compensation to be calculated
        return state.validationState?.isCompensationValid || false;
      }
      case 4: {
        // Phase 4 requires travel status wizard to be completed
        return state.completedWizards?.["travel_status"] || false;
      }
      case 5: {
        // Phase 5 requires terms acceptance and signature
        return (
          (state.validationState?.isTermsValid &&
            state.validationState?.isSignatureValid) ||
          false
        );
      }
      case 6: {
        // Phase 6 is claim submission - already at the end
        return true;
      }
      default:
        // Default case - not a valid phase or no specific requirements
        return false;
    }
  } catch (error) {
    console.error("Error checking canProceedToNextPhase:", error);
    return false;
  }
};
