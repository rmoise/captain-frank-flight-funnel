"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  Question,
  Answer,
  QuestionOption,
  AnswerValue,
} from "@/types/shared/wizard";
import type { Flight, FlightSegment } from "@/store/types";
import { useTranslation } from "@/hooks/useTranslation";
import {
  usePhase4,
  useTravelStatusWizard,
  useInformedDateWizard,
} from "@/store";
import { MoneyInput } from "@/components/ui/input/MoneyInput";
import { Success } from "../Success";
import { ModularFlightSelector } from "@/components/shared/ModularFlightSelector";
import { DateSelector } from "@/components/ui/date/DateSelector";
import { useStore } from "@/store";

// Add Window interface augmentation to ensure TypeScript recognizes these properties
declare global {
  interface Window {
    __inClaimRejectedContext?: boolean;
    __blockPhase4StoreUpdates?: boolean;
  }
}

// Safety check function to detect if we're in claim-rejected context
const isInClaimRejectedContext = (): boolean => {
  if (typeof window === "undefined") return false;

  // Check for flags set by ClaimRejectedPage
  if (window.__inClaimRejectedContext) return true;
  if (window.__blockPhase4StoreUpdates) return true;

  // Also check pathname as fallback
  return window.location.pathname.includes("/claim-rejected");
};

// Helper function to convert array of answers to a Record for showIf
const answersToRecord = (answers: Answer[]): Record<string, Answer> => {
  return answers.reduce((acc, answer) => {
    acc[answer.questionId] = answer;
    return acc;
  }, {} as Record<string, Answer>);
};

// Helper function to convert ISO date string to Date object
const parseISODate = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  try {
    // Handle different date formats
    if (typeof dateString === "string") {
      // First try as ISO string
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }

      // Try as DD.MM.YYYY format
      if (dateString.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
        const [day, month, year] = dateString.split(".").map(Number);
        const parsedDate = new Date(year, month - 1, day);
        return isNaN(parsedDate.getTime()) ? null : parsedDate;
      }
    }
    return null;
  } catch (e) {
    console.error("Error parsing date:", e);
    return null;
  }
};

interface Phase4QAWizardProps {
  questions: Question[];
  onComplete?: (answers: Answer[]) => void;
  initialAnswers?: Answer[];
  wizardType: "travel_status" | "informed_date";
  selectedFlight?: Flight | null;
  alternativeFlightSegments?: FlightSegment[];
  onAlternativeFlightsChange?: (segments: FlightSegment[]) => void;
  setIsFlightNotListedOpen?: (isOpen: boolean) => void;
}

// Add utility for getting success state from store
const getShowSuccessFromStore = (
  wizardType: string,
  phase4Store: {
    travelStatusShowingSuccess: boolean;
    informedDateShowingSuccess: boolean;
  }
) => {
  return wizardType === "travel_status"
    ? phase4Store.travelStatusShowingSuccess
    : phase4Store.informedDateShowingSuccess;
};

// Create a safe wrapper component that checks context before rendering the real component
export const Phase4QAWizard: React.FC<Phase4QAWizardProps> = (props) => {
  // Safe check that happens before rendering the complex component
  // This runs on every render but doesn't use hooks so it's safe
  if (isInClaimRejectedContext()) {
    console.log(
      "[Phase4QAWizard] Detected claim-rejected context, preventing render"
    );
    return null;
  }

  // Only render the real component if safe
  return <Phase4QAWizardInner {...props} />;
};

// The actual implementation moved to an inner component
const Phase4QAWizardInner: React.FC<Phase4QAWizardProps> = ({
  questions = [],
  onComplete,
  wizardType,
  selectedFlight,
  alternativeFlightSegments,
  onAlternativeFlightsChange,
  setIsFlightNotListedOpen,
}) => {
  const { t } = useTranslation();
  const isInitialMount = useRef(true);

  const phase4Store = usePhase4();

  // Memoize selectors to prevent them from changing on each render
  const travelStatusSelector = useCallback(
    (state: any) => ({
      answers: state.answers,
      currentStep: state.currentStep,
      showingSuccess: state.showingSuccess,
      isValid: state.isValid,
      isComplete: state.isComplete,
      stepValidation: state.stepValidation,
      stepInteraction: state.stepInteraction,
      setAnswer: state.setAnswer,
      completeWizard: state.completeWizard,
      resetWizard: state.resetWizard,
      checkStepValidity: state.checkStepValidity,
    }),
    []
  );

  const informedDateSelector = useCallback(
    (state: any) => ({
      answers: state.answers,
      currentStep: state.currentStep,
      showingSuccess: state.showingSuccess,
      isValid: state.isValid,
      isComplete: state.isComplete,
      stepValidation: state.stepValidation,
      stepInteraction: state.stepInteraction,
      setAnswer: state.setAnswer,
      completeWizard: state.completeWizard,
      resetWizard: state.resetWizard,
      checkStepValidity: state.checkStepValidity,
    }),
    []
  );

  const travelStatusWizardStore = useTravelStatusWizard(
    travelStatusSelector,
    [] // Provide empty array for deps to prevent changing selector
  );

  const informedDateWizardStore = useInformedDateWizard(
    informedDateSelector,
    [] // Provide empty array for deps to prevent changing selector
  );

  // Then select the appropriate store based on wizardType
  const wizardStore = useMemo(
    () =>
      wizardType === "travel_status"
        ? travelStatusWizardStore
        : informedDateWizardStore,
    [wizardType, travelStatusWizardStore, informedDateWizardStore]
  );

  // Add a ref to track when we're in the process of completing the wizard
  const isCompletingWizard = useRef(false);

  // For the pendingFlightSelectionRef, use a proper type definition
  const pendingFlightSelectionRef = useRef<{
    data: FlightSegment | FlightSegment[];
    questionId: string;
    timestamp: number;
  } | null>(null);

  // Add a ref to track if we're in the middle of a sync operation
  const syncInProgress = useRef(false);

  // Add a ref to track previous answers for comparison
  const prevAnswersRef = useRef<Answer[]>([]);

  // Add a ref to track when we've already updated the success state
  const successStateUpdatedRef = useRef(false);

  // State for selected option in the current step (for UI feedback)
  const [selectedOption, setSelectedOption] = useState("");
  const [localValue, setLocalValue] = useState<string | null>(null);
  const [isMoneyInputFocused, setIsMoneyInputFocused] = useState(false);

  // Get showSuccessMessage directly from the store based on wizardType
  const showSuccessMessage = useMemo(
    () => getShowSuccessFromStore(wizardType, phase4Store),
    [wizardType, phase4Store]
  );

  // Destructure specific properties from wizardStore for stable dependencies
  const { isComplete: wizardIsComplete } = wizardStore;

  // Select success flags directly from the store for stable dependencies
  const travelStatusShowingSuccessFromStore = useStore(
    (state) => state.phase4.travelStatusShowingSuccess
  );
  const informedDateShowingSuccessFromStore = useStore(
    (state) => state.phase4.informedDateShowingSuccess
  );

  // Select wizard completion status directly from the appropriate wizard slice for stable dependency
  const wizardIsValidFromStore = useStore((state) =>
    wizardType === "travel_status"
      ? state.travelStatusWizard.isValid
      : state.informedDateWizard.isValid
  );

  // Get stable action references using useCallback and accessing main store actions
  const wizardCompleteWizardAction = useCallback(() => {
    const actions = useStore.getState().actions;
    if (wizardType === "travel_status") {
      actions.travelStatusWizard.completeWizard();
    } else {
      actions.informedDateWizard.completeWizard();
    }
  }, [wizardType]); // Dependency on wizardType and potentially useStore if its reference could change (unlikely for getState)

  const wizardResetWizardAction = useCallback(() => {
    const actions = useStore.getState().actions;
    if (wizardType === "travel_status") {
      actions.travelStatusWizard.resetWizard();
    } else {
      actions.informedDateWizard.resetWizard();
    }
  }, [wizardType]);

  // --- Current visible question tracking ---
  const [currentVisibleQuestionId, setCurrentVisibleQuestionId] =
    useState<string>("");

  // Add the missing state for question interaction status
  const [questionInteractionStatus, setQuestionInteractionStatus] = useState<
    Record<string, boolean>
  >({});

  // --- Dynamic Question Filtering ---
  const visibleQuestions = useMemo(() => {
    if (isInClaimRejectedContext()) return [];

    const answersRecord = answersToRecord(wizardStore.answers || []);

    // Reduce console logging to avoid flooding the console
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "[Phase4QAWizard] Calculating visibleQuestions. Answers Record:",
        JSON.parse(JSON.stringify(answersRecord))
      ); // Log answers used
    }

    // Filter questions based on showIf condition
    return questions.filter((q) => {
      const shouldShow = !q.showIf || q.showIf(answersRecord);
      return shouldShow;
    });
  }, [questions, wizardStore.answers]);

  // Effect to initialize the current visible question ID - with additional safety checks
  useEffect(() => {
    // Skip this effect on the initial mount to prevent conflicts with hydration
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Don't reinitialize if we're in the process of completing
    if (isCompletingWizard.current) return;

    // Skip if there's an active syncing operation
    if (syncInProgress.current) return;

    // Don't reinitialize if we already have a valid visible question ID and it's found in visibleQuestions
    if (
      currentVisibleQuestionId &&
      visibleQuestions.some((q) => q.id === currentVisibleQuestionId)
    ) {
      return;
    }

    // Guard against empty visibleQuestions
    if (!visibleQuestions.length) return;

    // Initialize currentVisibleQuestionId if empty or invalid
    if (
      !currentVisibleQuestionId ||
      !visibleQuestions.some((q) => q.id === currentVisibleQuestionId)
    ) {
      console.log("[Phase4QAWizard] Initializing current visible question ID");

      syncInProgress.current = true;

      try {
        // Get the stored step based on wizard type
        const storedStep =
          wizardType === "travel_status"
            ? phase4Store.travelStatusCurrentStep
            : phase4Store.informedDateCurrentStep;

        if (storedStep > 0 && storedStep < visibleQuestions.length) {
          const targetQuestion = visibleQuestions[storedStep];
          setCurrentVisibleQuestionId(targetQuestion.id);

          // Sync UI state with stored answers
          const existingAnswer = wizardStore.answers?.find(
            (a: Answer) => a.questionId === targetQuestion.id
          );
          if (existingAnswer) {
            if (targetQuestion.type === "money") {
              setLocalValue(String(existingAnswer.value || ""));
            } else if (targetQuestion.type === "date") {
              // For date questions, set selectedOption to the ISO string value
              setSelectedOption(String(existingAnswer.value || ""));
            } else {
              setSelectedOption(String(existingAnswer.value || ""));
            }
          }
        } else {
          // Initialize with the first question if no stored step
          setCurrentVisibleQuestionId(visibleQuestions[0].id);

          // Initialize UI state for the first question
          const firstQuestion = visibleQuestions[0];
          const existingAnswer = wizardStore.answers?.find(
            (a: Answer) => a.questionId === firstQuestion.id
          );
          if (existingAnswer) {
            if (firstQuestion.type === "money") {
              setLocalValue(String(existingAnswer.value || ""));
            } else if (firstQuestion.type === "date") {
              // For date questions, set selectedOption to the ISO string value
              setSelectedOption(String(existingAnswer.value || ""));
            } else {
              setSelectedOption(String(existingAnswer.value || ""));
            }
          }
        }
      } finally {
        syncInProgress.current = false;
      }
    }
  }, [
    visibleQuestions,
    currentVisibleQuestionId,
    wizardType,
    phase4Store.travelStatusCurrentStep,
    phase4Store.informedDateCurrentStep,
    wizardStore.answers,
  ]);

  // Calculate if the current step is complete
  const isStepComplete = useMemo(() => {
    console.log(
      "[Phase4QAWizard] isStepComplete calculation - currentVisibleQuestionId:",
      currentVisibleQuestionId
    );

    if (!currentVisibleQuestionId || !wizardStore.answers) {
      console.log(
        "[Phase4QAWizard] isStepComplete: false - missing question ID or answers"
      );
      return false;
    }

    // Get current question to check its type
    const question = visibleQuestions.find(
      (q) => q.id === currentVisibleQuestionId
    );
    if (!question) {
      console.log(
        "[Phase4QAWizard] isStepComplete: false - question not found"
      );
      return false;
    }

    console.log(
      "[Phase4QAWizard] isStepComplete - question type:",
      question.type
    );

    // Find the current answer for this question
    const currentAnswer = wizardStore.answers.find(
      (a: Answer) => a.questionId === currentVisibleQuestionId
    );

    console.log(
      "[Phase4QAWizard] isStepComplete - currentAnswer:",
      currentAnswer
    );

    // For flight_selector type questions, also check pendingFlightSelectionRef
    if (question.type === "flight_selector") {
      console.log(
        "[Phase4QAWizard] isStepComplete - checking flight_selector type"
      );

      // If there's a pending flight selection for this question, consider it complete
      if (
        pendingFlightSelectionRef.current &&
        pendingFlightSelectionRef.current.questionId ===
          currentVisibleQuestionId &&
        pendingFlightSelectionRef.current.data
      ) {
        console.log(
          "[Phase4QAWizard] isStepComplete: true - pending flight selection found"
        );
        return true;
      }

      // For flight selectors, the value can be complex objects, so check differently
      if (currentAnswer && currentAnswer.value) {
        // Check if it's an array with entries or an object with an id
        const value = currentAnswer.value;
        if (Array.isArray(value)) {
          const isComplete = value.length > 0;
          console.log(
            "[Phase4QAWizard] isStepComplete - array value:",
            isComplete,
            value
          );
          return isComplete;
        } else if (typeof value === "object" && value !== null) {
          console.log(
            "[Phase4QAWizard] isStepComplete: true - object value found:",
            value
          );
          return true; // Any non-null object value is considered complete
        }
      }

      // CRITICAL FIX: Also check if phase4Store has flights selected for this question
      if (
        wizardType === "travel_status" &&
        (currentVisibleQuestionId === "actual_flights_provided" ||
          currentVisibleQuestionId === "actual_flights_alternative_own")
      ) {
        console.log(
          "[Phase4QAWizard] isStepComplete - checking travel_status flight questions"
        );

        // Check if alternative flights are selected in local state
        if (alternativeFlightSegments && alternativeFlightSegments.length > 0) {
          console.log(
            "[Phase4QAWizard] isStepComplete: true - alternativeFlightSegments found:",
            alternativeFlightSegments
          );
          return true;
        }

        // ADDITIONAL FIX: Check phase4Store directly for selected flights
        const phase4State = phase4Store;
        console.log("[Phase4QAWizard] isStepComplete - phase4State:", {
          selectedType: phase4State.selectedType,
          directFlight: phase4State.directFlight,
          flightSegments: phase4State.flightSegments,
        });

        if (
          phase4State.selectedType === "direct" &&
          phase4State.directFlight?.selectedFlight
        ) {
          console.log(
            "[Phase4QAWizard] Found direct flight in phase4Store, marking step as complete"
          );
          return true;
        }

        if (
          phase4State.selectedType === "multi" &&
          phase4State.flightSegments?.some((s) => s.selectedFlight)
        ) {
          console.log(
            "[Phase4QAWizard] Found multi-segment flights in phase4Store, marking step as complete"
          );
          return true;
        }
      }
    }

    // Default check for other question types
    const isComplete = Boolean(
      currentAnswer &&
        currentAnswer.value !== undefined &&
        currentAnswer.value !== null
    );

    console.log("[Phase4QAWizard] isStepComplete - default check:", isComplete);
    return isComplete;
  }, [
    currentVisibleQuestionId,
    wizardStore.answers,
    visibleQuestions,
    wizardType,
    alternativeFlightSegments,
    phase4Store, // Add phase4Store as dependency
  ]);

  // Calculate dynamic success state based on completed wizard answers
  const calculatedSuccessState = useMemo(() => {
    // Only calculate if the wizard is marked complete in the store
    // OR if the local showSuccessMessage is true (covers initial completion)
    const shouldCalculate =
      showSuccessMessage ||
      (wizardType === "travel_status" && travelStatusShowingSuccessFromStore) ||
      (wizardType === "informed_date" && informedDateShowingSuccessFromStore);

    if (!shouldCalculate) {
      // Ensure we have a default state if not showing success
      return { showConfetti: false, message: "" };
    }

    // If we should show success, calculate based on current wizard answers
    const currentAnswersRecord = answersToRecord(wizardStore.answers);
    const travelStatusAnswer = currentAnswersRecord["travel_status"];
    const hasFlights = Object.keys(currentAnswersRecord).some(
      (key) =>
        key === "actual_flights_provided" ||
        key === "actual_flights_alternative_own"
    );
    const confetti =
      hasFlights ||
      travelStatusAnswer?.value === "none" ||
      travelStatusAnswer?.value === "provided";
    const msg = confetti
      ? t(
          "wizard.success.goodChance",
          "Great! You have a good chance of compensation."
        )
      : t(
          "wizard.success.answersSaved",
          "Your answers have been saved successfully."
        );

    return { showConfetti: confetti, message: msg };
    // Depends on answers, store flags, and local success flag
  }, [
    wizardStore.answers,
    t,
    wizardType,
    travelStatusShowingSuccessFromStore,
    informedDateShowingSuccessFromStore,
    showSuccessMessage, // Include local flag as dependency
  ]);

  // Find the 0-based index of the current visible question
  const currentStepIndex = useMemo(() => {
    if (!currentVisibleQuestionId) return 0;
    const idx = visibleQuestions.findIndex(
      (q) => q.id === currentVisibleQuestionId
    );
    return idx >= 0 ? idx : 0;
  }, [visibleQuestions, currentVisibleQuestionId]);

  // Effect to sync showSuccessMessage based *only* on store flags (for hydration/external changes)
  useEffect(() => {
    if (isCompletingWizard.current) return;
    if (successStateUpdatedRef.current) return;
    if (isInitialMount.current) return;

    const relevantSuccessFlag =
      wizardType === "travel_status"
        ? travelStatusShowingSuccessFromStore
        : informedDateShowingSuccessFromStore;

    const wizardComplete = Boolean(wizardIsValidFromStore);

    if (
      (relevantSuccessFlag && wizardComplete) ||
      (!relevantSuccessFlag && !wizardComplete)
    ) {
      return;
    }

    console.log(
      "[Phase4QAWizard] Sync Effect - Wizard Type:",
      wizardType,
      "Relevant Success Flag:",
      relevantSuccessFlag,
      "Wizard Complete:",
      wizardComplete
    );

    // Set the flag to prevent repeated updates
    successStateUpdatedRef.current = true;

    // Use a timeout to break the synchronous update cycle
    setTimeout(() => {
      try {
        if (relevantSuccessFlag && !wizardComplete) {
          console.log(
            `[Phase4QAWizard] Store indicates success for ${wizardType}, but wizard is not complete. Completing wizard.`
          );

          // Careful synchronization of store state
          if (wizardType === "travel_status") {
            phase4Store.batchUpdate({
              travelStatusIsValid: true,
              travelStatusShowingSuccess: true,
            });
            // Use the destructured stable action
            if (wizardCompleteWizardAction) {
              wizardCompleteWizardAction();
            }
          } else if (wizardType === "informed_date") {
            phase4Store.batchUpdate({
              informedDateIsValid: true,
              informedDateShowingSuccess: true,
            });
            // Use the destructured stable action
            if (wizardCompleteWizardAction) {
              wizardCompleteWizardAction();
            }
          }
        } else if (!relevantSuccessFlag && wizardComplete) {
          console.log(
            `[Phase4QAWizard] Store indicates no success for ${wizardType}, but wizard is complete. Resetting wizard.`
          );

          // Careful synchronization of store state
          if (wizardType === "travel_status") {
            phase4Store.batchUpdate({
              travelStatusIsValid: false,
              travelStatusShowingSuccess: false,
            });
            // Use the destructured stable action
            if (wizardResetWizardAction) {
              wizardResetWizardAction();
            }
          } else if (wizardType === "informed_date") {
            phase4Store.batchUpdate({
              informedDateIsValid: false,
              informedDateShowingSuccess: false,
            });
            // Use the destructured stable action
            if (wizardResetWizardAction) {
              wizardResetWizardAction();
            }
          }
        }
      } catch (error) {
        console.error(
          "[Phase4QAWizard] Error synchronizing success state:",
          error
        );
      } finally {
        // Reset flag after all updates are done
        successStateUpdatedRef.current = false;
      }
    }, 0);
  }, [
    wizardType,
    travelStatusShowingSuccessFromStore,
    informedDateShowingSuccessFromStore,
    phase4Store.batchUpdate,
    wizardIsValidFromStore,
    wizardCompleteWizardAction,
    wizardResetWizardAction,
  ]);

  // Handle going back to questions
  const handleBackToQuestions = useCallback(() => {
    console.log("[Phase4QAWizard] Back to questions - clearing all state");

    // First, reset the success flag and detailed state in the phase4 store
    if (wizardType === "travel_status") {
      phase4Store.batchUpdate({
        travelStatusIsValid: false,
        travelStatusShowingSuccess: false,
        travelStatusStepValidation: {}, // Reset step validation map
        travelStatusStepInteraction: {}, // Reset step interaction map
        travelStatusCurrentStep: 0, // Reset current step index
      });
    } else if (wizardType === "informed_date") {
      phase4Store.batchUpdate({
        informedDateIsValid: false,
        informedDateShowingSuccess: false,
        informedDateStepValidation: {}, // Reset step validation map
        informedDateStepInteraction: {}, // Reset step interaction map
        informedDateCurrentStep: 0, // Reset current step index
      });
    }

    // Reset the wizard store (clears answers, completion status etc.)
    wizardStore.resetWizard();

    // Reset flight-related states in the phase4 store
    // This is critical for ensuring flight selector -> money input question sequence works
    if (phase4Store.selectedType === "direct") {
      // Reset the direct flight data but keep the basic structure
      const resetDirectFlight = {
        fromLocation: null,
        toLocation: null,
        date: null,
        selectedFlight: null,
      };
      phase4Store.setDirectFlight(resetDirectFlight);
    } else if (phase4Store.selectedType === "multi") {
      // Reset multi-segment flights to empty array
      phase4Store.setFlightSegments([]);
    }

    // Reset local UI state explicitly
    setSelectedOption("");
    setLocalValue(null);

    // Reset current step
    if (visibleQuestions.length > 0) {
      setCurrentVisibleQuestionId(visibleQuestions[0].id);
    }

    // IMPORTANT: Call onComplete with empty answers
    // This ensures parent components clear their validation state
    if (onComplete) {
      console.log(
        "[Phase4QAWizard] Calling onComplete with empty answers to clear parent validation"
      );
      onComplete([]); // Pass empty array to signify reset
    }
  }, [
    phase4Store,
    setSelectedOption,
    setLocalValue,
    visibleQuestions,
    setCurrentVisibleQuestionId,
    onComplete,
    wizardStore,
    wizardType,
  ]);

  // --- Local Step Management based on Visible Questions ---
  // Get current question data based on visible index
  const currentQuestion = useMemo(() => {
    if (currentStepIndex < 0 || currentStepIndex >= visibleQuestions.length) {
      console.error(`Invalid currentStepIndex: ${currentStepIndex}`);
      return visibleQuestions.length > 0 ? visibleQuestions[0] : null; // Fallback or handle error
    }
    return visibleQuestions[currentStepIndex];
  }, [visibleQuestions, currentStepIndex]);

  const totalSteps = useMemo(() => visibleQuestions.length, [visibleQuestions]);
  const progressPercent = useMemo(
    () => (totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0),
    [currentStepIndex, totalSteps]
  );

  // Special effect to ensure entire state is cleared when navigating from success back to questions
  // This handles the case where going back to questions and reloading causes issues
  useEffect(() => {
    // When returning from success, make sure we actually get a completely clean state
    if (currentVisibleQuestionId && !showSuccessMessage) {
      console.log(
        "[Phase4QAWizard] Re-validating visible questions after success reset"
      );

      // Explicitly recalculate which questions should be visible
      // This will fix issues where conditional questions don't show correctly
      const currentAnswersRecord = answersToRecord(wizardStore.answers);
      const recalculatedVisibleQuestions = questions.filter(
        (q) => !q.showIf || q.showIf(currentAnswersRecord)
      );

      console.log(
        "[Phase4QAWizard] Recalculated questions:",
        recalculatedVisibleQuestions.map((q) => q.id),
        "Current ID:",
        currentVisibleQuestionId
      );

      // If our current question isn't in the recalculated list, reset to the first question
      if (
        !recalculatedVisibleQuestions.some(
          (q) => q.id === currentVisibleQuestionId
        )
      ) {
        console.log(
          "[Phase4QAWizard] Current question not in recalculated list, resetting"
        );
        if (recalculatedVisibleQuestions.length > 0) {
          setCurrentVisibleQuestionId(recalculatedVisibleQuestions[0].id);
        }
      }
    }
  }, [
    currentVisibleQuestionId,
    showSuccessMessage,
    questions,
    wizardStore.answers,
    setCurrentVisibleQuestionId,
  ]);

  // Initialize Phase 4 store with selectedFlight if provided
  useEffect(() => {
    // Skip if not initial mount
    if (!isInitialMount.current) return;

    // Skip if in the middle of another update
    if (syncInProgress.current || successStateUpdatedRef.current) return;

    console.log(
      "[Phase4QAWizard] Running initialization effect. Has Alternative Flights:",
      Boolean(alternativeFlightSegments?.length)
    );

    // Mark no longer initial mount BEFORE any state updates to prevent loops
    isInitialMount.current = false;

    // Set the sync flag to prevent other effects from running during initialization
    syncInProgress.current = true;

    // Run initialization in a timeout to prevent render-time updates
    setTimeout(() => {
      try {
        // Double-check that the context is still valid
        if (isInClaimRejectedContext()) {
          console.log(
            "[Phase4QAWizard] In claim rejected context, aborting initialization"
          );
          syncInProgress.current = false;
          return;
        }

        // Handle alternative flight segments
        if (alternativeFlightSegments && alternativeFlightSegments.length > 0) {
          console.log(
            "[Phase4QAWizard] Initializing with alternative flight segments:",
            alternativeFlightSegments.length
          );

          // Log current phase4Store state before overwriting
          console.log(
            "🔍 [Phase4QAWizard] Current phase4Store state before alternative flight initialization:",
            {
              currentDirectFlight: {
                hasSelectedFlight: !!phase4Store.directFlight?.selectedFlight,
                selectedFlightId: phase4Store.directFlight?.selectedFlight?.id,
                selectedFlightNumber:
                  phase4Store.directFlight?.selectedFlight?.flightNumber,
              },
              currentSegments: phase4Store.flightSegments.map((s, i) => ({
                index: i,
                hasSelectedFlight: !!s.selectedFlight,
                flightId: s.selectedFlight?.id,
                flightNumber: s.selectedFlight?.flightNumber,
              })),
            }
          );

          // Set the flight type if needed
          if (alternativeFlightSegments.length === 1) {
            if (phase4Store.selectedType !== "direct") {
              phase4Store.setSelectedType("direct");
            }

            // Set the direct flight
            const segment = flightToSegment(alternativeFlightSegments[0]);
            console.log(
              "🔍 [Phase4QAWizard] Setting direct flight from alternative segment:",
              {
                hasSelectedFlight: !!segment?.selectedFlight,
                selectedFlightId: segment?.selectedFlight?.id,
              }
            );
            phase4Store.setDirectFlight(segment);
          } else {
            if (phase4Store.selectedType !== "multi") {
              phase4Store.setSelectedType("multi");
            }

            // CRITICAL FIX: Preserve existing selectedFlight data when setting segments
            const segments = alternativeFlightSegments.map((flight, index) => {
              const convertedSegment = flightToSegment(flight);

              // If we're overwriting existing segments, preserve their selectedFlight if the new segment doesn't have one
              const existingSegment = phase4Store.flightSegments[index];
              if (
                existingSegment?.selectedFlight &&
                !convertedSegment?.selectedFlight
              ) {
                console.log(
                  `🔍 [Phase4QAWizard] Preserving existing selectedFlight for segment ${index}:`,
                  {
                    existingFlightId: existingSegment.selectedFlight.id,
                    existingFlightNumber:
                      existingSegment.selectedFlight.flightNumber,
                  }
                );
                convertedSegment.selectedFlight =
                  existingSegment.selectedFlight;
              }

              return convertedSegment;
            });

            console.log(
              "🔍 [Phase4QAWizard] Setting flight segments from alternative segments:",
              {
                segmentCount: segments.length,
                segmentsWithFlights: segments.map((s, i) => ({
                  index: i,
                  hasSelectedFlight: !!s?.selectedFlight,
                  flightId: s?.selectedFlight?.id,
                })),
              }
            );
            phase4Store.setFlightSegments(segments);
          }
        }
        // Handle selected flight
        else if (
          selectedFlight &&
          (!alternativeFlightSegments || alternativeFlightSegments.length === 0)
        ) {
          // Check travel status
          const travelStatusAnswer = wizardStore.answers.find(
            (a: Answer) => a.questionId === "travel_status"
          );
          const phase4TravelStatusAnswer =
            phase4Store.travelStatusAnswers?.find(
              (a: Answer) => a.questionId === "travel_status"
            );
          const travelStatus =
            travelStatusAnswer?.value || phase4TravelStatusAnswer?.value;

          // Skip for alternative flight scenarios
          if (
            travelStatus === "provided" ||
            travelStatus === "took_alternative_own"
          ) {
            console.log(
              "[Phase4QAWizard] Skipping selectedFlight initialization due to travel status:",
              travelStatus
            );
          } else if (
            !phase4Store.directFlight?.selectedFlight ||
            phase4Store.directFlight.selectedFlight.id !== selectedFlight.id
          ) {
            console.log("[Phase4QAWizard] Initializing with selectedFlight");

            // Set flight type if needed
            if (phase4Store.selectedType !== "direct") {
              phase4Store.setSelectedType("direct");
            }

            // Set the direct flight
            const flight = flightToSegment(selectedFlight);
            phase4Store.setDirectFlight(flight);
          }
        }
      } catch (error) {
        console.error("[Phase4QAWizard] Error during initialization:", error);
      } finally {
        // Always reset the sync flag
        syncInProgress.current = false;
      }
    }, 0);
  }, [
    alternativeFlightSegments,
    selectedFlight,
    phase4Store,
    wizardStore.answers,
  ]);

  // Update localValue ONLY when the question type is money
  useEffect(() => {
    if (!currentQuestion) return; // Add null check to prevent linter error

    if (currentQuestion.type === "money") {
      const answer = wizardStore.answers.find(
        (a: Answer) => a.questionId === currentQuestion.id
      );
      const moneyValue = answer?.value ?? "";
      // Ensure the value is a string or null before setting
      setLocalValue(
        typeof moneyValue === "string" ? moneyValue : String(moneyValue ?? "")
      );
      console.log("[Phase4QAWizard] Syncing localValue for money:", {
        answerValue: answer?.value,
        localValue: moneyValue,
      });
    } else if (currentQuestion.type === "date") {
      // CRITICAL FIX: Also sync selectedOption for date questions
      const answer = wizardStore.answers.find(
        (a: Answer) => a.questionId === currentQuestion.id
      );
      const dateValue = answer?.value ?? "";
      setSelectedOption(typeof dateValue === "string" ? dateValue : String(dateValue ?? ""));
      console.log("[Phase4QAWizard] Syncing selectedOption for date:", {
        answerValue: answer?.value,
        selectedOption: dateValue,
      });
      // Reset localValue for non-money questions
      setLocalValue(null);
    } else {
      // For other types, sync selectedOption and reset localValue
      const answer = wizardStore.answers.find(
        (a: Answer) => a.questionId === currentQuestion.id
      );
      const value = answer?.value ?? "";
      setSelectedOption(typeof value === "string" ? value : String(value ?? ""));
      setLocalValue(null);
    }
    // Only run when the currentQuestion changes OR the specific answer for the question changes
  }, [currentQuestion, wizardStore.answers]);

  // Helper function to compare arrays
  const isArrayEqual = (arr1: any[], arr2: any[]): boolean => {
    if (arr1.length !== arr2.length) return false;

    for (let i = 0; i < arr1.length; i++) {
      if (
        arr1[i].questionId !== arr2[i].questionId ||
        arr1[i].value !== arr2[i].value ||
        arr1[i].timestamp !== arr2[i].timestamp
      ) {
        return false;
      }
    }

    return true;
  };

  // Effect to sync wizard answers to Phase 4 store
  useEffect(() => {
    // Skip if we're already in the middle of a sync operation
    if (syncInProgress.current) return;

    // Skip if we're already updating success state
    if (successStateUpdatedRef.current) return;

    // Skip during initialization
    if (isInitialMount.current) return;

    // Compare current answers to previous answers
    const answersChanged = !isArrayEqual(
      prevAnswersRef.current,
      wizardStore.answers
    );

    // If answers haven't changed, skip the update
    if (!answersChanged) return;

    // Update the previous answers ref
    prevAnswersRef.current = [...wizardStore.answers];

    if (wizardType === "travel_status" || wizardType === "informed_date") {
      const relevantAnswers = wizardStore.answers.filter(
        (answer: Answer) =>
          answer.questionId === wizardType ||
          answer.questionId.startsWith(`${wizardType}_`)
      );

      if (relevantAnswers.length > 0) {
        // Determine which set of answers to check based on wizardType
        const existingAnswers =
          wizardType === "travel_status"
            ? phase4Store.travelStatusAnswers
            : phase4Store.informedDateAnswers;

        // Check if any answers actually need updating
        const needsUpdate = relevantAnswers.some((answer: Answer) => {
          const existingAnswer = existingAnswers.find(
            (a: Answer) => a.questionId === answer.questionId
          );
          return (
            !existingAnswer ||
            existingAnswer.value !== answer.value ||
            existingAnswer.timestamp !== answer.timestamp
          );
        });

        if (!needsUpdate) return;

        console.log(
          `[Phase4QAWizard] Syncing ${wizardType} answers with Phase 4 store:`,
          relevantAnswers
        );

        // Set the flag to prevent circular updates
        syncInProgress.current = true;

        // Use setTimeout to break the synchronous update cycle
        setTimeout(() => {
          // Only update answers that have actually changed
          relevantAnswers.forEach((answer: Answer) => {
            const existingAnswer = existingAnswers.find(
              (a: Answer) => a.questionId === answer.questionId
            );
            // Only update if the answer has changed to avoid circular updates
            if (
              !existingAnswer ||
              existingAnswer.value !== answer.value ||
              existingAnswer.timestamp !== answer.timestamp
            ) {
              phase4Store.setWizardAnswer(answer);
            }
          });

          // Reset the flag after a short delay to ensure state updates have processed
          setTimeout(() => {
            syncInProgress.current = false;
          }, 50);
        }, 0);
      }
    }
  }, [wizardType, wizardStore.answers, phase4Store]);

  // Handle answer changes
  const handleAnswerChange = useCallback(
    (
      questionId: string,
      value: AnswerValue,
      option?: QuestionOption | null,
      type?: string
    ) => {
      // Log all answer changes
      console.log("[Phase4QAWizard] handleAnswerChange:", {
        questionId,
        value,
        type: type || "radio/date", // Default to radio/date if type not specified
        optionLabel: option?.label, // Log option label if available
      });

      // Use setTimeout to prevent state updates during render
      setTimeout(() => {
        // Special handling for date type - ensure consistent ISO format
        if (type === "date" || (!type && currentQuestion?.type === "date")) {
          // Ensure date is in proper ISO format
          if (value && typeof value === "string") {
            try {
              // If already ISO format, use as is
              if (value.includes("T")) {
                console.log(
                  "[Phase4QAWizard] Date is already in ISO format:",
                  value
                );
              }
              // Otherwise parse and convert
              else {
                const date = parseISODate(value);
                if (date) {
                  value = date.toISOString() as AnswerValue;
                  console.log(
                    "[Phase4QAWizard] Converted date to ISO format:",
                    value
                  );
                }
              }
            } catch (e) {
              console.error("[Phase4QAWizard] Error formatting date:", e);
            }
          }

          // CRITICAL FIX: Update selectedOption for date type
          setSelectedOption(value ? String(value) : "");
          console.log(
            "[Phase4QAWizard] Updated selectedOption for date:",
            value
          );
        }

        // Update the wizard state
        wizardStore.setAnswer(questionId, value);

        // Special case for money input type
        if (type === "money") {
          setLocalValue(value ? String(value) : "");
        }

        // Special handling for radio/select type
        if (option && option.value) {
          setSelectedOption(String(option.value));
        }
      }, 0);
    },
    [wizardStore, currentQuestion, setLocalValue, setSelectedOption]
  );

  // Fix the dependency array in the handleMoneyInputBlur useCallback
  const handleMoneyInputBlur = useCallback(() => {
    setIsMoneyInputFocused(false);
    // Ensure currentQuestion is available before accessing its id
    if (!currentQuestion) return;

    if (
      localValue === null ||
      localValue === undefined ||
      localValue.trim() === ""
    ) {
      // Clear answer in wizard store if empty
      wizardStore.setAnswer(currentQuestion.id, "");

      // Also clear in Phase4 store
      phase4Store.setWizardAnswer({
        id: currentQuestion.id,
        questionId: currentQuestion.id,
        value: "",
        timestamp: Date.now(),
        isValid: false,
        validationErrors: [],
      });
      return;
    }

    try {
      const numericValue = parseFloat(localValue);
      if (!isNaN(numericValue) && numericValue >= 0) {
        const formattedValue = numericValue.toFixed(2);
        setLocalValue(formattedValue); // Update local state with formatted value

        // Create a proper answer object to ensure it's properly stored
        wizardStore.setAnswer(currentQuestion.id, formattedValue);

        console.log("[Phase4QAWizard] Money input formatted and saved:", {
          question: currentQuestion.id,
          value: formattedValue,
          wizardType,
        });
      } else {
        // Handle invalid input - clear both stores
        console.warn("Invalid money input on blur:", localValue);
        // Clear answer on invalid input
        wizardStore.setAnswer(currentQuestion.id, "");
      }
    } catch (error) {
      console.error("Error parsing money input on blur:", error);
      // Clear on error
      phase4Store.setWizardAnswer({
        id: currentQuestion.id,
        questionId: currentQuestion.id,
        value: "",
        timestamp: Date.now(),
        isValid: false,
        validationErrors: ["Error parsing value"],
      });
    }
  }, [
    localValue,
    phase4Store,
    currentQuestion,
    wizardStore,
    wizardType,
    setLocalValue,
  ]);

  // Add a useEffect to update the validation state in the store AFTER render
  // This prevents the "setState during render" error
  useEffect(() => {
    if (!currentQuestion?.id || !isStepComplete) return;

    // Skip if already updating
    if (successStateUpdatedRef.current) return;

    // Wrap the store update in setTimeout to prevent "setState during render"
    setTimeout(() => {
      // Only update the state if needed
      if (wizardType === "travel_status") {
        const currentValidation =
          phase4Store.travelStatusStepValidation?.[currentQuestion.id];
        if (currentValidation !== true) {
          console.log(
            `[Phase4QAWizard] Updating travel_status validation for ${currentQuestion.id}`
          );

          // Set the flag to prevent repeated updates
          successStateUpdatedRef.current = true;

          phase4Store.batchUpdate({
            travelStatusStepValidation: {
              ...phase4Store.travelStatusStepValidation,
              [currentQuestion.id]: true,
            },
          });

          // Reset flag after update
          setTimeout(() => {
            successStateUpdatedRef.current = false;
          }, 0);
        }
      } else if (wizardType === "informed_date") {
        const currentValidation =
          phase4Store.informedDateStepValidation?.[currentQuestion.id];
        if (currentValidation !== true) {
          console.log(
            `[Phase4QAWizard] Updating informed_date validation for ${currentQuestion.id}`
          );

          // Set the flag to prevent repeated updates
          successStateUpdatedRef.current = true;

          phase4Store.batchUpdate({
            informedDateStepValidation: {
              ...phase4Store.informedDateStepValidation,
              [currentQuestion.id]: true,
            },
          });

          // Reset flag after update
          setTimeout(() => {
            successStateUpdatedRef.current = false;
          }, 0);
        }
      }
    }, 0); // 0ms timeout ensures it runs after render but asap
  }, [isStepComplete, currentQuestion?.id, wizardType, phase4Store]);

  // --- Navigation Handlers ---
  const handleNext = useCallback(() => {
    if (!isStepComplete) {
      console.warn(
        `[Phase4QAWizard] Cannot proceed - current step ${currentStepIndex} is not complete`
      );
      return;
    }

    // Get the next step
    const nextIndex = currentStepIndex + 1;

    // If there are no more questions, complete the wizard
    if (nextIndex >= visibleQuestions.length) {
      // Create a record of the current answers for testing visibility
      const currentAnswersRecord = answersToRecord(wizardStore.answers);
      console.log(
        "[Phase4QAWizard] handleNext - Current answers:",
        currentAnswersRecord
      );

      // Mark wizard as complete in the phase4 store
      if (wizardType === "travel_status") {
        phase4Store.batchUpdate({
          travelStatusIsValid: true,
          travelStatusShowingSuccess: true,
        });

        console.log(
          "[Phase4QAWizard] Completing wizard. Current answers:",
          wizardStore.answers
        );

        // Call completion callback with wizard answers
        onComplete?.(wizardStore.answers);

        // Set success state in the phase4 store
        phase4Store.batchUpdate({
          travelStatusIsValid: true,
          travelStatusShowingSuccess: true,
        });

        wizardStore.completeWizard();
      } else if (wizardType === "informed_date") {
        phase4Store.batchUpdate({
          informedDateIsValid: true,
          informedDateShowingSuccess: true,
        });

        console.log(
          "[Phase4QAWizard] Completing wizard. Current answers:",
          wizardStore.answers
        );

        // Call completion callback with wizard answers
        onComplete?.(wizardStore.answers);

        // Set success state in the phase4 store
        phase4Store.batchUpdate({
          informedDateIsValid: true,
          informedDateShowingSuccess: true,
        });

        wizardStore.completeWizard();
      }
    } else {
      // Move to the next question
      const nextQuestionId = visibleQuestions[nextIndex].id;
      setCurrentVisibleQuestionId(nextQuestionId);

      // Initialize UI state for the next question
      const nextQuestion = visibleQuestions[nextIndex];
      const existingAnswer = wizardStore.answers.find(
        (a: Answer) => a.questionId === nextQuestion.id
      );

      if (existingAnswer) {
        if (nextQuestion.type === "money") {
          setLocalValue(String(existingAnswer.value || ""));
        } else {
          setSelectedOption(String(existingAnswer.value || ""));
        }
      } else {
        // Clear previous selections when moving to a new question
        setSelectedOption("");
        setLocalValue("");
      }
    }
  }, [
    isStepComplete,
    currentStepIndex,
    visibleQuestions,
    onComplete,
    phase4Store,
    wizardStore,
    wizardType,
    setCurrentVisibleQuestionId,
    setLocalValue,
    setSelectedOption,
  ]);

  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      const prevQuestionId = visibleQuestions[prevIndex].id;
      setCurrentVisibleQuestionId(prevQuestionId);
      // Set selected option for the previous step
      const existingAnswer = wizardStore.answers.find(
        (a: Answer) => a.questionId === prevQuestionId
      );

      if (existingAnswer) {
        const prevQuestion = visibleQuestions[prevIndex];
        if (prevQuestion.type === "money") {
          setLocalValue(String(existingAnswer.value || ""));
        } else {
          setSelectedOption(String(existingAnswer.value || ""));
        }
      } else {
        // Clear selections when going back to a question with no answer
        setSelectedOption("");
        setLocalValue("");
      }
    }
  }, [
    currentStepIndex,
    visibleQuestions,
    wizardStore.answers,
    setLocalValue,
    setSelectedOption,
    setCurrentVisibleQuestionId,
  ]);

  // Add a helper function to convert Flight to FlightSegment
  // NOTE: Type safety compromise required due to inconsistent interfaces across the codebase
  // A proper fix would require refactoring the Flight and FlightSegment interfaces to be consistent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flightToSegment = (flight: any): any => {
    if (!flight) {
      console.log("[Phase4QAWizard] flightToSegment: No flight provided");
      return null;
    }

    const segment = {
      fromLocation: flight.origin || flight.fromLocation || null,
      toLocation: flight.destination || flight.toLocation || null,
      date: flight.departureTime || flight.date || null,
      selectedFlight: flight,
    };

    console.log(`🔍 [Phase4QAWizard] flightToSegment conversion:`, {
      input: {
        id: flight.id,
        flightNumber: flight.flightNumber,
        hasOrigin: !!flight.origin,
        hasFromLocation: !!flight.fromLocation,
        hasDepartureTime: !!flight.departureTime,
        hasDate: !!flight.date,
      },
      output: {
        hasFromLocation: !!segment.fromLocation,
        hasToLocation: !!segment.toLocation,
        hasDate: !!segment.date,
        hasSelectedFlight: !!segment.selectedFlight,
        selectedFlightId: segment.selectedFlight?.id,
      },
    });

    return segment;
  };

  // Create a memoized derived value for the flight segments to pass to ModularFlightSelector
  // This prevents unnecessary re-renders and infinite update loops
  const getInitialSegmentsForQuestion = useCallback(
    (questionId: string) => {
      console.log(
        `[Phase4QAWizard] Calculating initial segments for ${questionId}`,
        {
          hasAlternativeFlights: !!(
            alternativeFlightSegments && alternativeFlightSegments.length > 0
          ),
          questionRequiresAlternativeFlights:
            questionId === "actual_flights_provided" ||
            questionId === "actual_flights_alternative_own",
        }
      );

      // For alternative flight questions, prefer alternativeFlightSegments
      if (
        (questionId === "actual_flights_provided" ||
          questionId === "actual_flights_alternative_own") &&
        alternativeFlightSegments &&
        alternativeFlightSegments.length > 0
      ) {
        return alternativeFlightSegments;
      }

      // For other flight questions, or if no alternatives available, use selectedFlight if available
      if (selectedFlight) {
        return [flightToSegment(selectedFlight)];
      }

      // No initial data
      return undefined;
    },
    [alternativeFlightSegments, selectedFlight]
  );

  // Handle flight selection from ModularFlightSelector
  const handleFlightSelection = useCallback(
    (flightData: FlightSegment | FlightSegment[], questionId: string) => {
      // Log the received flightData immediately
      console.log(
        "[Phase4QAWizard] handleFlightSelection received flightData:",
        JSON.stringify(
          flightData,
          (key, value) =>
            key === "selectedFlight" && value && value.segments
              ? { ...value, segments: "[Circular]" }
              : value,
          2
        )
      );
      console.log(
        "[Phase4QAWizard] handleFlightSelection - Selected Flight Details:",
        JSON.stringify(
          !Array.isArray(flightData) && flightData.selectedFlight
            ? {
                id: flightData.selectedFlight.id,
                flightNumber: flightData.selectedFlight.flightNumber,
                departureTime: flightData.selectedFlight.departureTime,
                from: flightData.selectedFlight.from?.code,
                to: flightData.selectedFlight.to?.code,
              }
            : "No selectedFlight in flightData or data is an array"
        )
      );

      // Use a ref to store the pending selection
      pendingFlightSelectionRef.current = {
        data: flightData,
        questionId: questionId,
        timestamp: Date.now(),
      };

      // Use setTimeout to defer state updates
      setTimeout(() => {
        if (pendingFlightSelectionRef.current) {
          console.log(
            "[Phase4QAWizard] Flight selected:",
            pendingFlightSelectionRef.current.data
          );

          // Update alternative flights if applicable
          if (
            pendingFlightSelectionRef.current.questionId ===
              "actual_flights_provided" ||
            pendingFlightSelectionRef.current.questionId ===
              "actual_flights_alternative_own"
          ) {
            const flightValue = pendingFlightSelectionRef.current.data;

            // Handle in parent component via callback
            if (onAlternativeFlightsChange) {
              console.log(
                "[Phase4QAWizard] Calling onAlternativeFlightsChange with new flight data"
              );
              // Ensure we're passing a properly typed array
              const flightSegments = Array.isArray(flightValue)
                ? flightValue
                : [flightValue];
              onAlternativeFlightsChange(flightSegments);
            }

            // CRITICAL FIX: Also update the wizardStore with the selected flight data
            // This will make isStepComplete evaluate to true and show the Next button
            const flightId = Array.isArray(flightValue)
              ? flightValue.map((f) => f.id).join(",")
              : flightValue.id;

            console.log(
              `[Phase4QAWizard] Updating wizardStore answer for ${pendingFlightSelectionRef.current.questionId} with flight ID: ${flightId}`
            );

            // Set the answer in the wizard store to mark the step as complete
            wizardStore.setAnswer(
              pendingFlightSelectionRef.current.questionId,
              flightValue
            );
          }

          // Clear the pending selection
          pendingFlightSelectionRef.current = null;
        }
      }, 0);
    },
    [onAlternativeFlightsChange, setIsFlightNotListedOpen, wizardStore]
  );

  // If showing success message, render the Success component and return early
  if (showSuccessMessage) {
    return (
      <Success
        message={calculatedSuccessState.message}
        showConfetti={calculatedSuccessState.showConfetti}
        onBack={handleBackToQuestions}
      />
    );
  }

  // Render checks --- Handle case where currentQuestion might be undefined/null
  if (!currentQuestion) {
    // Simplified check
    console.warn("Phase4QAWizard: currentQuestion is not available yet.");
    return <div className="p-4">Loading questions...</div>; // Or error
  }

  // Don't render if wizard is marked complete but success isn't ready yet
  if (wizardStore.isComplete) {
    return null;
  }

  // --- Render structure mimicking Phase1QAWizard ---
  return (
    <div className="w-full space-y-6 relative">
      {/* Group Progress Bar and Text (Using visible steps) */}
      {totalSteps > 0 && (
        <div>
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-brand-red h-1.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {/* Step Indicator Text (Using visible steps) */}
          <p className="text-sm text-gray-600 text-right pt-1">
            {t(
              "phases.initialAssessment.counter." +
                (totalSteps === 1 ? "single" : "multiple"),
              totalSteps === 1
                ? "Question {current} of {total}"
                : "Questions {current} of {total}"
            )
              ?.replace("{current}", (currentStepIndex + 1).toString())
              .replace("{total}", totalSteps.toString())}
          </p>
        </div>
      )}

      {/* Animated Question Area (Using visible question data) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`question-${currentQuestion.id}-${currentStepIndex}`} // Key uses visible index
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {/* Question Text and Description */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-gray-900">
              {(() => {
                // Special case for ticket cost question or any question with a translationKey
                if (currentQuestion.translationKey) {
                  console.log(
                    "[Phase4QAWizard] Using translationKey:",
                    currentQuestion.translationKey
                  );

                  // Use the translationKey with the t function
                  const translated = t(currentQuestion.translationKey);

                  // If translation succeeded (result is different from key)
                  if (translated !== currentQuestion.translationKey) {
                    return translated;
                  }

                  // Fallback to direct text if translation fails
                  return currentQuestion.text;
                }

                // Normal handling for other questions
                if (currentQuestion.text.includes(".")) {
                  const translated = t(currentQuestion.text);
                  return translated !== currentQuestion.text
                    ? translated
                    : currentQuestion.text;
                }

                return currentQuestion.text;
              })()}
            </h3>
            {currentQuestion.description && (
              <p className="text-sm text-gray-500">
                {currentQuestion.description}
              </p>
            )}
          </div>

          {/* Options Rendering */}
          <div className="space-y-3 mt-4">
            {currentQuestion.type === "radio" &&
              currentQuestion.options?.map((option) => {
                const isSelected = selectedOption === option.value;
                return (
                  <label
                    key={option.id}
                    className={`w-full py-3 px-4 text-left border rounded-lg transition-all duration-200 cursor-pointer block ${
                      isSelected
                        ? "border-[#F54538] bg-red-50"
                        : "border-gray-200 hover:border-[#F54538] hover:bg-red-50"
                    }`}
                    onClick={() => {
                      handleAnswerChange(
                        currentQuestion.id,
                        option.value,
                        option
                      );
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 relative">
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          value={option.value}
                          checked={isSelected}
                          readOnly
                          className="h-4 w-4 cursor-pointer border-gray-300 text-[#F54538] focus:ring-[#F54538] focus:ring-offset-0 accent-[#F54538]"
                        />
                      </div>
                      <div className="flex-grow">
                        <div className="font-medium text-gray-900 text-sm leading-tight">
                          {(() => {
                            // Handle translation keys for option labels
                            if (option.label && option.label.includes(".")) {
                              const translated = t(option.label);
                              return translated !== option.label
                                ? translated
                                : option.label;
                            }
                            return option.label;
                          })()}
                        </div>
                        {option.description && (
                          <div className="mt-0.5 text-xs text-gray-500 leading-tight">
                            {option.description}
                          </div>
                        )}
                        {option.subLabel && (
                          <div className="mt-0.5 text-xs text-gray-500 leading-tight">
                            {option.subLabel}
                          </div>
                        )}
                      </div>
                      {option.icon && (
                        <div className="flex-shrink-0">
                          <span
                            className="w-5 h-5 block bg-contain bg-center bg-no-repeat"
                            style={{ backgroundImage: `url(${option.icon})` }}
                            role="img"
                            aria-label={`Icon for ${option.label}`}
                          />
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}

            {currentQuestion.type === "date" && (
              <div>
                <DateSelector
                  selected={parseISODate(selectedOption)}
                  onSelect={(date) => {
                    const isoString = date ? date.toISOString() : "";
                    handleAnswerChange(
                      currentQuestion.id,
                      isoString,
                      {} as QuestionOption,
                      "date"
                    );
                  }}
                  label={
                    currentQuestion.label ||
                    t("common.selectDate", "Select date")
                  }
                  disabled={false}
                  error={null}
                  required={currentQuestion.required}
                />
              </div>
            )}

            {/* ADD CASE FOR MONEY INPUT */}
            {currentQuestion.type === "money" && (
              <MoneyInput
                label="" // Label is handled by the question text above
                value={localValue || ""}
                onChange={(value) =>
                  handleAnswerChange(currentQuestion.id, value, null, "money")
                }
                onBlur={handleMoneyInputBlur}
                onFocus={() => setIsMoneyInputFocused(true)}
                isFocused={isMoneyInputFocused}
                placeholder={
                  currentQuestion.placeholder ||
                  t("common.enterAmount", "Enter amount")
                }
                required={currentQuestion.required}
                className="w-full"
                // You might need currency handling here depending on MoneyInput props
              />
            )}

            {/* ADD CASE FOR FLIGHT SELECTOR */}
            {currentQuestion.type === "flight_selector" && (
              <div className="mt-4 space-y-4">
                <ModularFlightSelector
                  phase={4}
                  currentPhase={4}
                  onFlightTypeChange={(type) => {
                    console.log("[Phase4QAWizard] Flight type changed:", type);
                  }}
                  onInteract={() => {
                    // Mark question as interacted
                    if (!questionInteractionStatus[currentQuestion.id]) {
                      setQuestionInteractionStatus({
                        ...questionInteractionStatus,
                        [currentQuestion.id]: true,
                      });
                    }
                  }}
                  onSelect={(segment) => {
                    // Store the segment selection in a ref to prevent state updates during render
                    handleFlightSelection(segment, currentQuestion.id);
                  }}
                  setValidationState={(isValid) => {
                    console.log(
                      `[Phase4QAWizard] Flight selection validation state received: ${isValid}`
                    );
                    // Comment out the usage instead of removing entirely, as it might be needed later
                    // setTimeout(() => {
                    //   setIsFlightSelectionValid(isValid);
                    // }, 0);
                  }}
                  setIsFlightNotListedOpen={(isOpen) => {
                    console.log(
                      `[Phase4QAWizard] Flight not listed sheet: ${
                        isOpen ? "opened" : "closed"
                      }`
                    );
                    // Actually call the function if it exists
                    if (setIsFlightNotListedOpen) {
                      setIsFlightNotListedOpen(isOpen);
                    }
                  }}
                  // Pass initial segments based on the question
                  initialSegments={getInitialSegmentsForQuestion(
                    currentQuestion.id
                  )}
                />
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons (Using visible steps for logic) */}
      <div className="flex justify-between mt-6">
        {/* Back Button */}
        <div>
          <button
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className="px-6 py-2 font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            type="button"
          >
            {t("wizard.navigation.back", "Back")}
          </button>
        </div>
        {/* Next Button - Show Submit text if it's the last visible question */}
        {isStepComplete && (
          <div>
            <button
              onClick={handleNext} // Always calls handleNext
              className="px-6 py-2 font-medium text-white bg-[#F54538] rounded-lg hover:bg-red-600 transition-colors"
              type="button"
            >
              {currentStepIndex === visibleQuestions.length - 1
                ? t("wizard.navigation.submit", "Submit")
                : t("wizard.navigation.next", "Next")}
            </button>
          </div>
        )}
        {!isStepComplete && <div />} {/* Placeholder for alignment */}
      </div>
    </div>
  );
};
