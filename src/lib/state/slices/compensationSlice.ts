import { StoreStateValues } from "../types";
import type { FlightSegment } from "../types";
import type { Flight } from "@/types/store";

export interface CompensationCache {
  amount: number | null;
  flightData: {
    selectedType: "direct" | "multi";
    directFlight: FlightSegment | null;
    flightSegments: FlightSegment[];
    selectedFlights: Flight[];
  } | null;
  timestamp: number;
}

export interface CompensationSlice {
  compensationAmount: number | null;
  compensationLoading: boolean;
  compensationError: string | null;
  compensationCache: CompensationCache;
  _lastUpdate: number;
  validationState: {
    stepValidation: {
      1: boolean;
      2: boolean;
      3: boolean;
    };
    stepInteraction: {
      1: boolean;
      2: boolean;
      3: boolean;
    };
    stepCompleted: {
      1: boolean;
      2: boolean;
      3: boolean;
    };
    isCompensationValid: boolean;
    _timestamp: number;
    completedSteps: number[];
  };
}

export interface CompensationActions {
  setCompensationAmount: (amount: number | null) => void;
  setCompensationLoading: (loading: boolean) => void;
  setCompensationError: (error: string | null) => void;
  setCompensationCache: (cache: CompensationCache) => void;
  calculateCompensation: (fromIata?: string, toIata?: string) => Promise<void>;
  shouldRecalculateCompensation: () => boolean;
}

export const initialCompensationState: CompensationSlice = {
  compensationAmount: null,
  compensationLoading: false,
  compensationError: null,
  compensationCache: {
    amount: null,
    flightData: null,
    timestamp: 0,
  },
  _lastUpdate: 0,
  validationState: {
    stepValidation: {
      1: false,
      2: false,
      3: false,
    },
    stepInteraction: {
      1: false,
      2: false,
      3: false,
    },
    stepCompleted: {
      1: false,
      2: false,
      3: false,
    },
    isCompensationValid: false,
    _timestamp: 0,
    completedSteps: [],
  },
};

export const createCompensationSlice = (
  set: (fn: (state: StoreStateValues) => Partial<StoreStateValues>) => void,
  get: () => StoreStateValues
): CompensationActions => ({
  setCompensationAmount: (amount) => {
    set((state: any) => {
      const currentAmount = state.compensationAmount ?? 0;
      if (
        currentAmount === amount ||
        (currentAmount > 0 && (amount === 0 || amount === null))
      ) {
        return state;
      }

      const isValid = Boolean(amount && amount > 0);
      const now = Date.now();

      // Save to localStorage
      try {
        const compensationData = {
          amount,
          isValid,
          timestamp: now,
        };
        localStorage.setItem(
          "phase2CompensationData",
          JSON.stringify(compensationData)
        );
        if (amount !== null && amount > 0) {
          localStorage.setItem("compensationAmount", String(amount));
        }
      } catch (error) {
        console.error("Error saving compensation data:", error);
      }

      console.log("=== Compensation Slice - Setting Amount ===", {
        amount,
        isValid,
        previousAmount: currentAmount,
        timestamp: new Date(now).toISOString(),
      });

      // Create updated validation state
      const updatedValidationState = {
        ...state.validationState,
        isCompensationValid: isValid,
        stepValidation: {
          ...state.validationState.stepValidation,
          2: isValid,
        },
        stepInteraction: {
          ...state.validationState.stepInteraction,
          2: true,
        },
        stepCompleted: {
          ...state.validationState.stepCompleted,
          2: isValid,
        },
        completedSteps: isValid
          ? Array.from(
              new Set([...state.validationState.completedSteps, 2])
            ).sort((a, b) => a - b)
          : state.validationState.completedSteps.filter(
              (step: number) => step !== 2
            ),
        _timestamp: now,
      };

      console.log("=== Compensation Slice - Validation State Update ===", {
        before: {
          isCompensationValid: state.validationState.isCompensationValid,
          stepValidation: state.validationState.stepValidation[2],
          stepInteraction: state.validationState.stepInteraction[2],
          stepCompleted: state.validationState.stepCompleted[2],
          completedSteps: state.validationState.completedSteps,
        },
        after: {
          isCompensationValid: updatedValidationState.isCompensationValid,
          stepValidation: updatedValidationState.stepValidation[2],
          stepInteraction: updatedValidationState.stepInteraction[2],
          stepCompleted: updatedValidationState.stepCompleted[2],
          completedSteps: updatedValidationState.completedSteps,
        },
        timestamp: new Date(now).toISOString(),
      });

      // Force a validation check
      const newState = {
        ...state,
        compensationAmount: amount,
        validationState: updatedValidationState,
        _lastUpdate: now,
      };

      // Log final state
      console.log("=== Compensation Slice - Final State ===", {
        compensationAmount: newState.compensationAmount,
        validationState: {
          isCompensationValid: newState.validationState.isCompensationValid,
          stepValidation: newState.validationState.stepValidation[2],
          stepInteraction: newState.validationState.stepInteraction[2],
          stepCompleted: newState.validationState.stepCompleted[2],
          completedSteps: newState.validationState.completedSteps,
        },
        timestamp: new Date(now).toISOString(),
      });

      return newState;
    });
  },
  setCompensationLoading: (loading) => {
    set((state) => ({
      ...state,
      compensationLoading: loading,
      _lastUpdate: Date.now(),
    }));
  },
  setCompensationError: (error) => {
    set((state) => ({
      ...state,
      compensationError: error,
      compensationLoading: false,
      _lastUpdate: Date.now(),
    }));
  },
  setCompensationCache: (cache) => {
    set((state) => ({
      ...state,
      compensationCache: cache,
      _lastUpdate: Date.now(),
    }));
  },
  calculateCompensation: async (fromIata?: string, toIata?: string) => {
    const state = get();

    console.log("=== Calculate Compensation Called ===", {
      fromIata,
      toIata,
      isLoading: state.compensationLoading,
      hasCache: Boolean(state.compensationCache?.amount),
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
            compensationCache: {
              ...state.compensationCache,
              amount: cache.amount,
              timestamp: cache.timestamp,
            },
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
        `/.netlify/functions/calculateCompensation?from_iata=${fromIata}&to_iata=${toIata}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
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
        compensationCache: {
          ...state.compensationCache,
          amount: data.amount,
          timestamp: newCache.timestamp,
        },
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
  shouldRecalculateCompensation: () => {
    const state = get();
    const {
      compensationCache,
      selectedType,
      directFlight,
      flightSegments,
      selectedFlights,
    } = state;

    // If no cache exists, we need to calculate
    if (!compensationCache.amount || !compensationCache.flightData) {
      return true;
    }

    const cachedData = compensationCache.flightData;

    // Check if flight selection type has changed
    if (selectedType !== cachedData.selectedType) {
      return true;
    }

    // For direct flights
    if (selectedType === "direct") {
      return (
        JSON.stringify(directFlight) !==
          JSON.stringify(cachedData.directFlight) ||
        JSON.stringify(selectedFlights) !==
          JSON.stringify(cachedData.selectedFlights)
      );
    }

    // For multi-segment flights
    return (
      JSON.stringify(flightSegments) !==
        JSON.stringify(cachedData.flightSegments) ||
      JSON.stringify(selectedFlights) !==
        JSON.stringify(cachedData.selectedFlights)
    );
  },
});
