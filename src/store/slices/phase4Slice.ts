import { StateCreator } from "zustand";
import { Store } from "../types";
import type { Flight, FlightSegment, FlightType } from "@/types/shared/flight";
import type { Answer } from "@/types/shared/wizard";
import type { Location } from "@/types/shared/location";

// Define the contract structure based on API response
export interface EvaluationContract {
  amount: number;
  provision: number;
  guid?: string;
}

// Phase 4 specific types
export interface Phase4State {
  // Flight selection state
  selectedType: "direct" | "multi";
  directFlight: Phase4FlightSegment;
  flightSegments: Phase4FlightSegment[];
  currentSegmentIndex: number;
  fromLocation: Location | null;
  toLocation: Location | null;
  selectedDate: Date | null;
  selectedFlight: Flight | null;
  selectedFlights: Flight[];
  originalFlights: Flight[];
  isTransitioningPhases: boolean;
  isInitializing: boolean;
  isSearchModalOpen: boolean;
  searchTerm: string;
  displayedFlights: Flight[];
  allFlights: Flight[];
  loading: boolean;
  errorMessage: string | null;
  errorMessages: Record<string, string>;

  // Travel Status QA state
  travelStatusAnswers: Answer[];
  travelStatusCurrentStep: number;
  travelStatusShowingSuccess: boolean;
  travelStatusIsValid: boolean;
  travelStatusStepValidation: Record<string, boolean>;
  travelStatusStepInteraction: Record<string, boolean>;

  // Informed Date QA state
  informedDateAnswers: Answer[];
  informedDateCurrentStep: number;
  informedDateShowingSuccess: boolean;
  informedDateIsValid: boolean;
  informedDateStepValidation: Record<string, boolean>;
  informedDateStepInteraction: Record<string, boolean>;

  // Evaluation Result
  evaluationResultContract: EvaluationContract | null;

  // Shared state
  lastAnsweredQuestion: string | null;
  fieldErrors: Record<string, string[]>;
  _lastUpdate: number;
  _silentUpdate: boolean;
}

export interface Phase4FlightSegment {
  fromLocation: Location | null;
  toLocation: Location | null;
  date: string | null;
  selectedFlight: Flight | null;
}

export interface Phase4Actions {
  // Flight selection actions
  setSelectedType: (type: "direct" | "multi") => void;
  setDirectFlight: (flight: Phase4FlightSegment) => void;
  setFlightSegments: (segments: Phase4FlightSegment[]) => void;
  setCurrentSegmentIndex: (index: number) => void;
  setFromLocation: (location: Location | null) => void;
  setToLocation: (location: Location | null) => void;
  setSelectedDate: (date: Date | null) => void;
  setSelectedFlight: (flight: Flight | null) => void;
  setSelectedFlights: (flights: Flight[]) => void;
  setSearchModalOpen: (isOpen: boolean) => void;
  setSearchTerm: (term: string) => void;
  setDisplayedFlights: (flights: Flight[]) => void;
  setAllFlights: (flights: Flight[]) => void;
  setFlightSearchLoading: (isLoading: boolean) => void;
  setFlightErrorMessage: (message: string | null) => void;
  setFlightErrorMessages: (messages: Record<string, string>) => void;
  clearFlightErrors: () => void;

  // Wizard actions
  setWizardAnswer: (answer: Answer) => void;
  resetTravelStatusState: () => void;
  resetInformedDateState: () => void;
  completeInformedDateWizard: () => void;

  // Evaluation actions
  setEvaluationResultContract: (contract: EvaluationContract | null) => void;

  // General actions
  resetStore: (preserveAnswers?: boolean) => void;
  updateValidationState: (state: Partial<Phase4State>) => void;
  batchUpdate: (updates: Partial<Phase4State>) => void;

  // Helper methods
  getOriginalFlights: () => Flight[];

  // Date persistence methods
  setDirectFlightDate: (date: Date | string | null) => void;
  setSegmentDate: (segmentIndex: number, date: Date | string | null) => void;
  restoreFromLocalStorage: () => void;
  saveToLocalStorage: () => void;

  // Segment update methods (simplified for modern Zustand)
  updateSegment: (index: number, updates: Partial<Phase4FlightSegment>) => void;
  addSegment: () => void;
  removeSegment: (index: number) => void;
}

const initialState: Phase4State = {
  // Flight selection initial state
  selectedType: "direct",
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
  selectedDate: null,
  selectedFlight: null,
  selectedFlights: [],
  originalFlights: [],
  isTransitioningPhases: false,
  isInitializing: true,
  isSearchModalOpen: false,
  searchTerm: "",
  displayedFlights: [],
  allFlights: [],
  loading: false,
  errorMessage: null,
  errorMessages: {},

  // Travel Status QA initial state
  travelStatusAnswers: [],
  travelStatusCurrentStep: 0,
  travelStatusShowingSuccess: false,
  travelStatusIsValid: false,
  travelStatusStepValidation: {},
  travelStatusStepInteraction: {},

  // Informed Date QA initial state
  informedDateAnswers: [],
  informedDateCurrentStep: 0,
  informedDateShowingSuccess: false,
  informedDateIsValid: false,
  informedDateStepValidation: {},
  informedDateStepInteraction: {},

  // Evaluation Result initial state
  evaluationResultContract: null,

  // Shared initial state
  lastAnsweredQuestion: null,
  fieldErrors: {},
  _lastUpdate: Date.now(),
  _silentUpdate: false,
};

export const createPhase4Slice: StateCreator<
  Store,
  [],
  [],
  { phase4: Phase4State; actions: { phase4: Phase4Actions } }
> = (set, get) => {
  const phase4Actions: Phase4Actions = {
    setSelectedType: (type) => {
      console.log("[Phase4Slice] Setting selected type:", type);
      set((state) => {
        const currentState = state.phase4 || initialState;

        // Don't change anything if the type is already set to the same value
        if (
          currentState.selectedType === type &&
          !currentState.isInitializing
        ) {
          console.log("[Phase4Slice] Type already set, skipping update");
          return state;
        }

        const newState = {
          ...state,
          phase4: {
            ...currentState,
            selectedType: type,
            isInitializing: false, // Mark as initialized when type is set
            _lastUpdate: Date.now(),
          },
        };

        // Only initialize segments if we don't have valid data already
        const hasValidDirectFlight =
          currentState.directFlight.fromLocation ||
          currentState.directFlight.toLocation ||
          currentState.directFlight.date;
        const hasValidSegments = currentState.flightSegments.some(
          (s) => s.fromLocation || s.toLocation || s.date
        );

        if (type === "direct") {
          // Only update direct flight if we don't have valid data or if switching from multi
          if (!hasValidDirectFlight || currentState.selectedType === "multi") {
            const firstSegment = currentState.flightSegments[0];
            newState.phase4.directFlight = {
              fromLocation:
                firstSegment?.fromLocation ||
                currentState.directFlight.fromLocation,
              toLocation:
                firstSegment?.toLocation ||
                currentState.directFlight.toLocation,
              date: firstSegment?.date || currentState.directFlight.date,
              selectedFlight:
                firstSegment?.selectedFlight ||
                currentState.directFlight.selectedFlight,
            };
            newState.phase4.selectedFlight =
              newState.phase4.directFlight.selectedFlight;
            newState.phase4.selectedFlights = newState.phase4.directFlight
              .selectedFlight
              ? [newState.phase4.directFlight.selectedFlight]
              : [];

            // Update first segment to match direct flight
            newState.phase4.flightSegments = [
              {
                fromLocation: newState.phase4.directFlight.fromLocation,
                toLocation: newState.phase4.directFlight.toLocation,
                date: newState.phase4.directFlight.date,
                selectedFlight: newState.phase4.directFlight.selectedFlight,
              },
              ...currentState.flightSegments.slice(1),
            ];
          }
        } else {
          // Multi mode - only initialize if we don't have valid segments
          if (!hasValidSegments || currentState.selectedType === "direct") {
            const firstSegment = currentState.directFlight.selectedFlight
              ? {
                  fromLocation: currentState.directFlight.fromLocation,
                  toLocation: currentState.directFlight.toLocation,
                  date: currentState.directFlight.date,
                  selectedFlight: currentState.directFlight.selectedFlight,
                }
              : currentState.flightSegments[0] || {
                  fromLocation: null,
                  toLocation: null,
                  date: null,
                  selectedFlight: null,
                };

            // Ensure we have at least two segments for multi-city
            const segments = [firstSegment];
            if (currentState.flightSegments.length > 1) {
              segments.push(...currentState.flightSegments.slice(1));
            } else {
              segments.push({
                fromLocation: firstSegment.toLocation || null,
                toLocation: null,
                date: null,
                selectedFlight: null,
              });
            }

            newState.phase4.flightSegments = segments;
            newState.phase4.currentSegmentIndex = 0;
            newState.phase4.selectedFlight = firstSegment.selectedFlight;
            newState.phase4.selectedFlights = firstSegment.selectedFlight
              ? [firstSegment.selectedFlight]
              : [];
          }
        }

        return newState;
      });
    },

    setDirectFlight: (flight) => {
      console.log("[Phase4Slice] Setting direct flight:", {
        hasSelectedFlight: !!flight.selectedFlight,
        selectedFlightId: flight.selectedFlight?.id,
        selectedFlightNumber: flight.selectedFlight?.flightNumber,
        fromLocation: flight.fromLocation?.code,
        toLocation: flight.toLocation?.code,
        date: flight.date,
        timestamp: new Date().toISOString(),
      });
      set((state) => {
        const currentState = state.phase4 || initialState;
        const currentFlight = currentState.directFlight;

        // CRITICAL FIX: Clear selectedFlight when locations change
        let updatedFlight = { ...flight };

        // If we have a selected flight, check if locations still match
        if (updatedFlight.selectedFlight) {
          const flightFromCode =
            updatedFlight.selectedFlight.from?.code ||
            updatedFlight.selectedFlight.from?.iata;
          const flightToCode =
            updatedFlight.selectedFlight.to?.code ||
            updatedFlight.selectedFlight.to?.iata;
          const newFromCode = updatedFlight.fromLocation?.code;
          const newToCode = updatedFlight.toLocation?.code;

          // Clear selected flight if locations don't match
          if (
            (newFromCode && newFromCode !== flightFromCode) ||
            (newToCode && newToCode !== flightToCode)
          ) {
            console.log(
              "[Phase4Slice] Clearing selected flight due to location mismatch:",
              { flightFromCode, flightToCode, newFromCode, newToCode }
            );
            updatedFlight.selectedFlight = null;
          }
        }

        // Also clear if we're updating locations without a flight (e.g., just changing from/to)
        if (!flight.selectedFlight && currentFlight.selectedFlight) {
          console.log(
            "[Phase4Slice] Clearing selected flight - no flight in update"
          );
          updatedFlight.selectedFlight = null;
        }

        // Update the first segment to match direct flight
        const updatedSegments = [...currentState.flightSegments];
        if (updatedSegments.length > 0) {
          updatedSegments[0] = {
            fromLocation: updatedFlight.fromLocation,
            toLocation: updatedFlight.toLocation,
            date: updatedFlight.date,
            selectedFlight: updatedFlight.selectedFlight,
          };
        }

        return {
          phase4: {
            ...currentState,
            directFlight: updatedFlight,
            flightSegments: updatedSegments,
            selectedFlight: updatedFlight.selectedFlight,
            selectedFlights: updatedFlight.selectedFlight
              ? [updatedFlight.selectedFlight]
              : [],
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    setFlightSegments: (segments) => {
      console.log("[Phase4Slice] Setting flight segments:", segments);
      // Enhanced debugging for segment dates
      segments.forEach((segment, index) => {
        console.log(`🔍 [Phase4Slice] Segment ${index} being saved:`, {
          fromLocation: segment.fromLocation?.code,
          toLocation: segment.toLocation?.code,
          date: segment.date,
          dateType: typeof segment.date,
          dateValue: segment.date,
          hasSelectedFlight: !!segment.selectedFlight,
          selectedFlightId: segment.selectedFlight?.id,
          selectedFlightNumber: segment.selectedFlight?.flightNumber,
        });
      });

      set((state) => {
        const currentState = state.phase4 || initialState;

        // Log current state before update
        console.log(
          `🔍 [Phase4Slice] Current segments before setFlightSegments:`,
          {
            currentSegments: currentState.flightSegments.map((s, i) => ({
              index: i,
              hasSelectedFlight: !!s.selectedFlight,
              flightId: s.selectedFlight?.id,
              flightNumber: s.selectedFlight?.flightNumber,
              fromLocation: s.fromLocation?.code,
              toLocation: s.toLocation?.code,
            })),
          }
        );

        // Ensure at least two segments for multi-type flights
        let updatedSegments = [...segments];
        if (currentState.selectedType === "multi" && segments.length < 2) {
          console.log(
            "[Phase4Slice] Adding second segment for multi-type flight"
          );
          updatedSegments.push({
            fromLocation: segments.length > 0 ? segments[0].toLocation : null,
            toLocation: null,
            date: null,
            selectedFlight: null,
          });
        }

        // Log final segments being saved
        console.log(`🔍 [Phase4Slice] Final segments being saved:`, {
          finalSegments: updatedSegments.map((s, i) => ({
            index: i,
            hasSelectedFlight: !!s.selectedFlight,
            flightId: s.selectedFlight?.id,
            flightNumber: s.selectedFlight?.flightNumber,
            fromLocation: s.fromLocation?.code,
            toLocation: s.toLocation?.code,
          })),
        });

        return {
          ...state,
          phase4: {
            ...currentState,
            flightSegments: updatedSegments,
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    setCurrentSegmentIndex: (index) => {
      set((state) => ({
        phase4: {
          ...state.phase4,
          currentSegmentIndex: index,
          _lastUpdate: Date.now(),
        },
      }));
    },

    setFromLocation: (location) => {
      set((state) => {
        const currentState = state.phase4 || initialState;
        return {
          phase4: {
            ...currentState,
            fromLocation: location,
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    setToLocation: (location) => {
      set((state) => {
        const currentState = state.phase4 || initialState;
        return {
          phase4: {
            ...currentState,
            toLocation: location,
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    setSelectedDate: (date) => {
      set((state) => {
        const currentState = state.phase4 || initialState;
        return {
          phase4: {
            ...currentState,
            selectedDate: date,
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    setSelectedFlight: (flight) => {
      set((state) => {
        const currentState = state.phase4 || initialState;
        return {
          phase4: {
            ...currentState,
            selectedFlight: flight,
            selectedFlights: flight ? [flight] : [],
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    setSelectedFlights: (flights) => {
      set((state) => {
        const currentState = state.phase4 || initialState;
        return {
          phase4: {
            ...currentState,
            selectedFlights: flights,
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    setSearchModalOpen: (isOpen) => {
      set((state) => {
        const currentState = state.phase4 || initialState;
        return {
          phase4: {
            ...currentState,
            isSearchModalOpen: isOpen,
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    setSearchTerm: (term) => {
      set((state) => {
        const currentState = state.phase4 || initialState;
        return {
          phase4: {
            ...currentState,
            searchTerm: term,
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    setDisplayedFlights: (flights) => {
      set((state) => {
        const currentState = state.phase4 || initialState;
        return {
          phase4: {
            ...currentState,
            displayedFlights: flights,
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    setAllFlights: (flights) => {
      set((state) => {
        const currentState = state.phase4 || initialState;
        return {
          phase4: {
            ...currentState,
            allFlights: flights,
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    setFlightSearchLoading: (isLoading) => {
      set((state) => {
        const currentState = state.phase4 || initialState;
        return {
          phase4: {
            ...currentState,
            loading: isLoading,
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    setFlightErrorMessage: (message) => {
      set((state) => {
        const currentState = state.phase4 || initialState;
        return {
          phase4: {
            ...currentState,
            errorMessage: message,
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    setFlightErrorMessages: (messages) => {
      set((state) => {
        const currentState = state.phase4 || initialState;
        return {
          phase4: {
            ...currentState,
            errorMessages: messages,
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    clearFlightErrors: () => {
      set((state) => {
        const currentState = state.phase4 || initialState;
        return {
          phase4: {
            ...currentState,
            errorMessage: null,
            errorMessages: {},
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    setWizardAnswer: (answer) => {
      set((state) => {
        const currentState = state.phase4 || initialState;

        // Determine which QA type this answer belongs to
        if (
          answer.questionId === "travel_status" ||
          answer.questionId.startsWith("travel_status_")
        ) {
          // Update travel status answers
          const travelStatusAnswers = [...currentState.travelStatusAnswers];
          const existingIndex = travelStatusAnswers.findIndex(
            (a) => a.questionId === answer.questionId
          );

          if (existingIndex >= 0) {
            travelStatusAnswers[existingIndex] = answer;
          } else {
            travelStatusAnswers.push(answer);
          }

          // Validate travel status - consider valid if main travel_status question is answered
          const hasTravelStatus = travelStatusAnswers.some(
            (a) => a.questionId === "travel_status" && a.value
          );

          console.log("[Phase4Slice] Travel status validation:", {
            questionId: answer.questionId,
            value: answer.value,
            hasTravelStatus,
            totalAnswers: travelStatusAnswers.length,
          });

          return {
            phase4: {
              ...currentState,
              travelStatusAnswers,
              travelStatusIsValid: hasTravelStatus,
              lastAnsweredQuestion: answer.questionId,
              _lastUpdate: Date.now(),
            },
          };
        } else if (
          answer.questionId === "informed_date" ||
          answer.questionId.startsWith("informed_date_") ||
          answer.questionId === "specific_informed_date"
        ) {
          // Update informed date answers
          const informedDateAnswers = [...currentState.informedDateAnswers];
          const existingIndex = informedDateAnswers.findIndex(
            (a) => a.questionId === answer.questionId
          );

          if (existingIndex >= 0) {
            informedDateAnswers[existingIndex] = answer;
          } else {
            informedDateAnswers.push(answer);
          }

          // Store answers but DO NOT automatically validate
          // Validation should only happen when wizard is explicitly completed/submitted
          console.log(
            "[Phase4Slice] Storing informed date answer (no auto-validation):",
            {
              questionId: answer.questionId,
              value: answer.value,
              totalAnswers: informedDateAnswers.length,
            }
          );

          return {
            phase4: {
              ...currentState,
              informedDateAnswers,
              // Keep current validation state - don't change it here
              lastAnsweredQuestion: answer.questionId,
              _lastUpdate: Date.now(),
            },
          };
        }

        // Default case, shouldn't happen often
        return {
          phase4: {
            ...currentState,
            lastAnsweredQuestion: answer.questionId,
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    resetTravelStatusState: () => {
      console.log("[Phase4Slice] Resetting travel status state");
      set((state) => {
        const currentState = state.phase4 || initialState;
        return {
          phase4: {
            ...currentState,
            travelStatusAnswers: [],
            travelStatusCurrentStep: 0,
            travelStatusShowingSuccess: false,
            travelStatusIsValid: false,
            travelStatusStepValidation: {},
            travelStatusStepInteraction: {},
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    resetInformedDateState: () => {
      console.log("[Phase4Slice] Resetting informed date state");
      set((state) => {
        const currentState = state.phase4 || initialState;
        return {
          phase4: {
            ...currentState,
            informedDateAnswers: [],
            informedDateCurrentStep: 0,
            informedDateShowingSuccess: false,
            informedDateIsValid: false,
            informedDateStepValidation: {},
            informedDateStepInteraction: {},
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    completeInformedDateWizard: () => {
      console.log(
        "[Phase4Slice] Completing informed date wizard with validation"
      );
      set((state) => {
        const currentState = state.phase4 || initialState;
        const informedDateAnswers = currentState.informedDateAnswers;

        // Now perform the validation when explicitly completing the wizard
        const hasInformedDate = informedDateAnswers.some(
          (a) => a.questionId === "informed_date" && a.value
        );
        const hasSpecificDate = informedDateAnswers.some(
          (a) => a.questionId === "specific_informed_date" && a.value
        );

        const informedDateOption = informedDateAnswers.find(
          (a) => a.questionId === "informed_date"
        )?.value;

        // Validate:
        // 1. "on_departure" is selected (no additional date needed), OR
        // 2. "specific_date" is selected AND a specific date is provided
        const isInformedDateValid =
          (hasInformedDate && informedDateOption === "on_departure") ||
          (hasInformedDate &&
            informedDateOption === "specific_date" &&
            hasSpecificDate);

        console.log(
          "[Phase4Slice] Informed date wizard completion validation:",
          {
            hasInformedDate,
            hasSpecificDate,
            informedDateOption,
            isInformedDateValid,
            totalAnswers: informedDateAnswers.length,
          }
        );

        return {
          phase4: {
            ...currentState,
            informedDateIsValid: isInformedDateValid,
            informedDateShowingSuccess: isInformedDateValid,
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    setEvaluationResultContract: (contract) => {
      set((state) => ({
        ...state,
        phase4: {
          ...(state.phase4 || initialState),
          evaluationResultContract: contract,
          _lastUpdate: Date.now(),
        },
      }));
    },

    resetStore: (preserveAnswers = false) => {
      console.log("[Phase4Slice] Resetting store", { preserveAnswers });
      set((state) => {
        const currentState = state.phase4 || initialState;
        const newState = {
          ...initialState,
          _lastUpdate: Date.now(),
        };

        if (preserveAnswers) {
          newState.travelStatusAnswers = currentState.travelStatusAnswers;
          newState.informedDateAnswers = currentState.informedDateAnswers;
        }

        return { phase4: newState };
      });
    },

    updateValidationState: (updates) => {
      set((state) => {
        const currentState = state.phase4 || initialState;
        return {
          phase4: {
            ...currentState,
            ...updates,
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    batchUpdate: (updates) => {
      set((state) => {
        const currentState = state.phase4 || initialState;
        return {
          phase4: {
            ...currentState,
            ...updates,
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    // Helper method to get original flights from main store
    getOriginalFlights: () => {
      const mainStoreState = get();
      const originalFlights = mainStoreState.flight?.originalFlights?.[0] || [];
      console.log(
        "[Phase4Slice] Getting original flights from main store:",
        originalFlights.map((f) => ({ id: f.id, flightNumber: f.flightNumber }))
      );
      return originalFlights;
    },

    // Date persistence methods
    setDirectFlightDate: (date) => {
      console.log("[Phase4Slice] Setting direct flight date:", date);

      // Convert Date object to string format for storage
      let dateString: string | null = null;
      if (date) {
        if (date instanceof Date) {
          // Convert to YYYY-MM-DD format for consistency with validation logic
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          dateString = `${year}-${month}-${day}`;
        } else if (typeof date === "string") {
          // If it's already a string, check if it needs conversion
          if (/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
            // Convert DD.MM.YYYY to YYYY-MM-DD
            const [day, month, year] = date.split(".");
            dateString = `${year}-${month}-${day}`;
          } else {
            // Assume it's already in correct format or handle as-is
            dateString = date;
          }
        }
      }

      set((state) => {
        const currentState = state.phase4 || initialState;
        const updatedDirectFlight = {
          ...currentState.directFlight,
          date: dateString,
        };

        // Also update the first segment if we're in direct mode
        let updatedSegments = currentState.flightSegments;
        if (
          currentState.selectedType === "direct" &&
          updatedSegments.length > 0
        ) {
          updatedSegments = [...currentState.flightSegments];
          updatedSegments[0] = {
            ...updatedSegments[0],
            date: dateString,
          };
        }

        return {
          phase4: {
            ...currentState,
            directFlight: updatedDirectFlight,
            flightSegments: updatedSegments,
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    setSegmentDate: (segmentIndex, date) => {
      console.log("🔥 [Phase4Slice] setSegmentDate called:", {
        segmentIndex,
        date,
        dateType: typeof date,
        isDateObject: date instanceof Date,
      });

      // Convert Date object to string format for storage
      let dateString: string | null = null;
      if (date) {
        if (date instanceof Date) {
          // Convert to YYYY-MM-DD format for consistency with validation logic
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          dateString = `${year}-${month}-${day}`;
          console.log("🔥 [Phase4Slice] Converted Date to string:", {
            originalDate: date,
            convertedString: dateString,
          });
        } else if (typeof date === "string") {
          // If it's already a string, check if it needs conversion
          if (/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
            // Convert DD.MM.YYYY to YYYY-MM-DD
            const [day, month, year] = date.split(".");
            dateString = `${year}-${month}-${day}`;
            console.log(
              "🔥 [Phase4Slice] Converted DD.MM.YYYY to YYYY-MM-DD:",
              {
                original: date,
                converted: dateString,
              }
            );
          } else {
            dateString = date;
            console.log(
              "🔥 [Phase4Slice] Using string date as-is:",
              dateString
            );
          }
        }
      }

      set((state) => {
        const currentState = state.phase4 || initialState;
        const currentSegments = [...currentState.flightSegments];

        // Ensure we have enough segments
        while (currentSegments.length <= segmentIndex) {
          currentSegments.push({
            fromLocation: null,
            toLocation: null,
            date: null,
            selectedFlight: null,
          });
        }

        // Update the specific segment's date
        currentSegments[segmentIndex] = {
          ...currentSegments[segmentIndex],
          date: dateString,
        };

        console.log("🔥 [Phase4Slice] Updated segment with date:", {
          segmentIndex,
          updatedSegment: currentSegments[segmentIndex],
          allSegments: currentSegments,
        });

        return {
          ...state,
          phase4: {
            ...currentState,
            flightSegments: currentSegments,
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    restoreFromLocalStorage: () => {
      console.log(
        "[Phase4Slice] Marking as initialized (Zustand persist handles restoration)"
      );
      // Simplified: Zustand persist middleware handles localStorage automatically
      set((state) => ({
        phase4: {
          ...(state.phase4 || initialState),
          isInitializing: false,
          _lastUpdate: Date.now(),
        },
      }));
    },

    saveToLocalStorage: () => {
      console.log(
        "[Phase4Slice] Save triggered (Zustand persist handles this automatically)"
      );
      // Simplified: Zustand persist middleware handles localStorage automatically
    },

    // Modern simplified segment update methods
    updateSegment: (index, updates) => {
      console.log(`[Phase4Slice] Updating segment ${index}:`, updates);
      set((state) => {
        const currentState = state.phase4 || initialState;
        const currentSegments = [...currentState.flightSegments];

        // Log current state before update
        console.log(`🔍 [Phase4Slice] Before updating segment ${index}:`, {
          currentSegment: currentSegments[index],
          hasSelectedFlight: !!currentSegments[index]?.selectedFlight,
          selectedFlightId: currentSegments[index]?.selectedFlight?.id,
          updatesHasSelectedFlight: !!updates.selectedFlight,
          updatesSelectedFlightId: updates.selectedFlight?.id,
          allSegments: currentSegments.map((s, i) => ({
            index: i,
            hasSelectedFlight: !!s.selectedFlight,
            flightNumber: s.selectedFlight?.flightNumber,
          })),
        });

        // Ensure we have enough segments
        while (currentSegments.length <= index) {
          currentSegments.push({
            fromLocation: null,
            toLocation: null,
            date: null,
            selectedFlight: null,
          });
        }

        // CRITICAL FIX: Only preserve selectedFlight when it's NOT being explicitly updated
        // We need to distinguish between undefined (explicit clear) and missing (no update)
        const existingSegment = currentSegments[index];
        const updatedSegment = {
          ...existingSegment,
          ...updates,
        };

        // FIXED: Only preserve selectedFlight if the updates object doesn't contain the selectedFlight key at all
        // If selectedFlight is explicitly set to undefined/null, that means clear it (don't preserve)
        if (!("selectedFlight" in updates) && existingSegment?.selectedFlight) {
          console.log(
            `🔍 [Phase4Slice] Preserving existing selectedFlight for segment ${index} (not in updates):`,
            {
              existingFlightId: existingSegment.selectedFlight.id,
              existingFlightNumber: existingSegment.selectedFlight.flightNumber,
            }
          );
          updatedSegment.selectedFlight = existingSegment.selectedFlight;
        } else if ("selectedFlight" in updates) {
          console.log(
            `🔍 [Phase4Slice] Explicitly updating selectedFlight for segment ${index}:`,
            {
              oldFlightId: existingSegment?.selectedFlight?.id,
              newFlightId: updates.selectedFlight?.id,
              isClearing:
                updates.selectedFlight === undefined ||
                updates.selectedFlight === null,
            }
          );
        }

        // Update the specific segment
        currentSegments[index] = updatedSegment;

        // Log after update
        console.log(`🔍 [Phase4Slice] After updating segment ${index}:`, {
          updatedSegment: currentSegments[index],
          hasSelectedFlight: !!currentSegments[index]?.selectedFlight,
          selectedFlightId: currentSegments[index]?.selectedFlight?.id,
          allSegments: currentSegments.map((s, i) => ({
            index: i,
            hasSelectedFlight: !!s.selectedFlight,
            flightNumber: s.selectedFlight?.flightNumber,
          })),
        });

        // Update direct flight if we're updating the first segment and in direct mode
        let updatedDirectFlight = currentState.directFlight;
        if (index === 0 && currentState.selectedType === "direct") {
          // FIXED: Apply same logic for direct flight preservation
          updatedDirectFlight = {
            ...currentState.directFlight,
            ...updates,
          };

          // FIXED: Only preserve selectedFlight if the updates object doesn't contain the selectedFlight key at all
          if (
            !("selectedFlight" in updates) &&
            currentState.directFlight?.selectedFlight
          ) {
            updatedDirectFlight.selectedFlight =
              currentState.directFlight.selectedFlight;
          }
        }

        return {
          phase4: {
            ...currentState,
            flightSegments: currentSegments,
            directFlight: updatedDirectFlight,
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    addSegment: () => {
      console.log("[Phase4Slice] Adding new segment");
      set((state) => {
        const currentState = state.phase4 || initialState;
        const currentSegments = [...currentState.flightSegments];

        // Add a new empty segment
        const newSegment: Phase4FlightSegment = {
          fromLocation: null,
          toLocation: null,
          date: null,
          selectedFlight: null,
        };

        // Try to connect segments (new segment's from = previous segment's to)
        if (currentSegments.length > 0) {
          const lastSegment = currentSegments[currentSegments.length - 1];
          if (lastSegment.toLocation) {
            newSegment.fromLocation = lastSegment.toLocation;
          }
        }

        currentSegments.push(newSegment);

        return {
          phase4: {
            ...currentState,
            flightSegments: currentSegments,
            selectedType: "multi", // Ensure we're in multi mode when adding segments
            _lastUpdate: Date.now(),
          },
        };
      });
    },

    removeSegment: (index) => {
      console.log(`[Phase4Slice] Removing segment ${index}`);
      set((state) => {
        const currentState = state.phase4 || initialState;
        const currentSegments = [...currentState.flightSegments];

        // Don't allow removing if we only have 2 segments or if index is invalid
        if (
          currentSegments.length <= 2 ||
          index < 0 ||
          index >= currentSegments.length
        ) {
          console.warn(
            `[Phase4Slice] Cannot remove segment ${index}, min 2 segments required`
          );
          return state;
        }

        // Remove the segment
        currentSegments.splice(index, 1);

        return {
          phase4: {
            ...currentState,
            flightSegments: currentSegments,
            _lastUpdate: Date.now(),
          },
        };
      });
    },
  };

  return {
    phase4: initialState,
    actions: {
      phase4: phase4Actions,
    },
  };
};
