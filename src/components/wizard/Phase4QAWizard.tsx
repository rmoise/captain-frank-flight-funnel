"use client";

import React, {
  useCallback,
  useMemo,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Answer } from "@/types/wizard";
import { Question } from "@/types/experience";
import { QuestionAnswer } from "@/components/shared/QuestionAnswer";
import type { Flight } from "@/types/store";
import { usePhase4Store } from "@/lib/state/phase4Store";
import { useFlightStore } from "@/lib/state/flightStore";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { qaWizardConfig } from "@/config/qaWizard";
import { useTranslation } from "@/hooks/useTranslation";
import type { Phase4State } from "@/lib/state/phase4Store";

interface Phase4QAWizardProps {
  questions: Question[];
  onComplete?: (answers: Answer[]) => void;
  initialAnswers?: Answer[];
  selectedFlight?: Flight | null;
  wizardType: "travel_status" | "informed_date";
}

export const Phase4QAWizard: React.FC<Phase4QAWizardProps> = ({
  questions = [],
  onComplete,
  initialAnswers = [],
  selectedFlight,
  wizardType,
}) => {
  console.log("Phase4QAWizard rendered:", { wizardType, questions });

  const { t } = useTranslation();
  const phase4Store = usePhase4Store();
  const [currentStep, setCurrentStep] = useState(0);
  const wizardTypeRef = useRef(wizardType);
  const isInitialMount = useRef(true);
  const prevAnswersRef = useRef<Answer[]>([]);

  // Handle wizard type changes with layout effect to ensure synchronous update
  useLayoutEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    console.log("=== Phase4QAWizard - useLayoutEffect ===", {
      wizardType,
      wizardTypeRef: wizardTypeRef.current,
      informedDateAnswers: phase4Store.informedDateAnswers,
      travelStatusAnswers: phase4Store.travelStatusAnswers,
      timestamp: new Date().toISOString(),
    });

    if (wizardTypeRef.current !== wizardType) {
      // Only update the wizard type reference and reset step
      // without resetting the state
      wizardTypeRef.current = wizardType;
      setCurrentStep(0);

      // Preserve existing answers based on wizard type
      const currentAnswers =
        wizardType === "informed_date"
          ? phase4Store.informedDateAnswers
          : phase4Store.travelStatusAnswers;

      console.log("=== Phase4QAWizard - Switching Wizard Type ===", {
        wizardType,
        currentAnswers,
        informedDateAnswers: phase4Store.informedDateAnswers,
        travelStatusAnswers: phase4Store.travelStatusAnswers,
        timestamp: new Date().toISOString(),
      });

      if (currentAnswers.length > 0) {
        // If we have answers, don't reset the step to 0
        const lastAnsweredStep = questions.findIndex(
          (q) => q.id === currentAnswers[currentAnswers.length - 1].questionId
        );
        if (lastAnsweredStep >= 0) {
          setCurrentStep(lastAnsweredStep);
        }
      }
    }
  }, [wizardType, phase4Store, questions]);

  // Get current answers - memoize to prevent unnecessary recalculations
  const wizardAnswers = useMemo(() => {
    const answers =
      wizardType === "informed_date"
        ? phase4Store.informedDateAnswers
        : initialAnswers?.length > 0
        ? initialAnswers
        : phase4Store.travelStatusAnswers;

    console.log("=== Phase4QAWizard - wizardAnswers ===", {
      wizardType,
      answers,
      informedDateAnswers: phase4Store.informedDateAnswers,
      travelStatusAnswers: phase4Store.travelStatusAnswers,
      initialAnswers,
      timestamp: new Date().toISOString(),
    });

    // Only update if answers have changed
    if (JSON.stringify(answers) !== JSON.stringify(prevAnswersRef.current)) {
      prevAnswersRef.current = answers;
    }
    return prevAnswersRef.current;
  }, [
    wizardType,
    initialAnswers,
    phase4Store.informedDateAnswers,
    phase4Store.travelStatusAnswers,
  ]);

  // Get visible questions
  const visibleQuestions = useMemo(() => {
    if (!questions?.length) return [];

    return [
      questions[0],
      ...questions.slice(1).filter((question) => {
        if (!question.showIf) return true;
        try {
          return question.showIf(wizardAnswers);
        } catch {
          return false;
        }
      }),
    ];
  }, [questions, wizardAnswers]);

  // Get current question
  const currentQuestion = useMemo(() => {
    return visibleQuestions.length
      ? currentStep < visibleQuestions.length
        ? visibleQuestions[currentStep]
        : visibleQuestions[0]
      : null;
  }, [visibleQuestions, currentStep]);

  // Check if current question is answered
  const isCurrentQuestionAnswered = useMemo(() => {
    if (!currentQuestion) return false;

    if (currentQuestion.type === "flight_selector") {
      const hasSelectedFlight = Boolean(selectedFlight?.id);
      const hasStoredFlights = phase4Store.selectedFlights?.length > 0;
      return hasSelectedFlight || hasStoredFlights;
    }

    // For date selection questions, consider them answered if they have any value
    if (currentQuestion.id === "specific_informed_date") {
      return wizardAnswers.some(
        (a) => a.questionId === currentQuestion.id && a.value
      );
    }

    // For money input questions, check if there's a valid numeric value
    if (currentQuestion.type === "money") {
      const answer = wizardAnswers.find(
        (a) => a.questionId === currentQuestion.id
      );
      if (!answer || !answer.value) return false;
      const numericValue = parseFloat(answer.value.toString());
      return !isNaN(numericValue) && numericValue > 0;
    }

    return wizardAnswers.some((a) => a.questionId === currentQuestion.id);
  }, [
    currentQuestion,
    selectedFlight?.id,
    wizardAnswers,
    phase4Store.selectedFlights,
  ]);

  // Handle selection of an answer
  const handleSelect = useCallback(
    (questionId: string, value: string | number | boolean) => {
      console.log("=== Phase4QAWizard - handleSelect ENTRY ===", {
        wizardType,
        questionId,
        value,
        currentAnswers:
          wizardType === "informed_date"
            ? phase4Store.informedDateAnswers
            : phase4Store.travelStatusAnswers,
        timestamp: new Date().toISOString(),
      });

      // Get current answers based on wizard type
      const currentAnswers =
        wizardType === "informed_date"
          ? [...phase4Store.informedDateAnswers]
          : [...phase4Store.travelStatusAnswers];

      // Update or add the answer
      const answerIndex = currentAnswers.findIndex(
        (a) => a.questionId === questionId
      );
      if (answerIndex >= 0) {
        currentAnswers[answerIndex] = { questionId, value };
      } else {
        currentAnswers.push({ questionId, value });
      }

      // Only update answers and last answered question, without validation
      const updates: Partial<Phase4State> = {
        lastAnsweredQuestion: questionId,
        _lastUpdate: Date.now(),
      };

      if (wizardType === "informed_date") {
        phase4Store.batchUpdate({
          ...updates,
          informedDateAnswers: currentAnswers,
        });

        console.log("=== Phase4QAWizard - Updated informedDateAnswers ===", {
          informedDateAnswers: currentAnswers,
          storeAnswers: phase4Store.informedDateAnswers,
          timestamp: new Date().toISOString(),
        });

        // Save to localStorage directly to ensure persistence
        if (typeof window !== "undefined") {
          const validationState = {
            ...JSON.parse(
              localStorage.getItem("phase4ValidationState") || "{}"
            ),
            informedDateAnswers: currentAnswers,
            _timestamp: Date.now(),
          };

          console.log(
            "=== Phase4QAWizard - Saving informedDateAnswers to localStorage ===",
            {
              validationState,
              timestamp: new Date().toISOString(),
            }
          );

          localStorage.setItem(
            "phase4ValidationState",
            JSON.stringify(validationState)
          );

          // Also save to phase4Store in localStorage directly
          try {
            const phase4StoreData = localStorage.getItem("phase4Store");
            if (phase4StoreData) {
              const parsedData = JSON.parse(phase4StoreData);
              if (parsedData.state) {
                parsedData.state.informedDateAnswers = currentAnswers;
                parsedData.state._lastUpdate = Date.now();

                localStorage.setItem("phase4Store", JSON.stringify(parsedData));

                console.log(
                  "=== Phase4QAWizard - Updated phase4Store in localStorage ===",
                  {
                    informedDateAnswers: currentAnswers,
                    timestamp: new Date().toISOString(),
                  }
                );
              }
            }
          } catch (error) {
            console.error("Error updating phase4Store in localStorage:", error);
          }
        }
      } else {
        phase4Store.batchUpdate({
          ...updates,
          travelStatusAnswers: currentAnswers,
        });

        console.log("=== Phase4QAWizard - Updated travelStatusAnswers ===", {
          travelStatusAnswers: currentAnswers,
          storeAnswers: phase4Store.travelStatusAnswers,
          timestamp: new Date().toISOString(),
        });

        // Save to localStorage directly to ensure persistence
        if (typeof window !== "undefined") {
          const validationState = {
            ...JSON.parse(
              localStorage.getItem("phase4ValidationState") || "{}"
            ),
            travelStatusAnswers: currentAnswers,
            _timestamp: Date.now(),
          };

          console.log(
            "=== Phase4QAWizard - Saving travelStatusAnswers to localStorage ===",
            {
              validationState,
              timestamp: new Date().toISOString(),
            }
          );

          localStorage.setItem(
            "phase4ValidationState",
            JSON.stringify(validationState)
          );

          // Also save to phase4Store in localStorage directly
          try {
            const phase4StoreData = localStorage.getItem("phase4Store");
            if (phase4StoreData) {
              const parsedData = JSON.parse(phase4StoreData);
              if (parsedData.state) {
                parsedData.state.travelStatusAnswers = currentAnswers;
                parsedData.state._lastUpdate = Date.now();

                localStorage.setItem("phase4Store", JSON.stringify(parsedData));

                console.log(
                  "=== Phase4QAWizard - Updated phase4Store in localStorage ===",
                  {
                    travelStatusAnswers: currentAnswers,
                    timestamp: new Date().toISOString(),
                  }
                );
              }
            }
          } catch (error) {
            console.error("Error updating phase4Store in localStorage:", error);
          }
        }
      }

      console.log("=== Phase4QAWizard - handleSelect EXIT ===", {
        questionId,
        value,
        currentAnswers,
        wizardType,
        timestamp: new Date().toISOString(),
      });
    },
    [phase4Store, wizardType]
  );

  // Get current answer for a question
  const getCurrentAnswer = useCallback(
    (questionId: string): string => {
      return (
        wizardAnswers
          .find((a) => a.questionId === questionId)
          ?.value?.toString() || ""
      );
    },
    [wizardAnswers]
  );

  // Handle completion of the wizard
  const handleComplete = useCallback(
    (answers: Answer[]) => {
      console.log("=== Phase4QAWizard - handleComplete START ===", {
        answers,
        wizardType,
        currentStep,
        visibleQuestions,
        currentAnswers:
          wizardType === "travel_status"
            ? phase4Store.travelStatusAnswers
            : phase4Store.informedDateAnswers,
        showingSuccess:
          wizardType === "travel_status"
            ? phase4Store.travelStatusShowingSuccess
            : phase4Store.informedDateShowingSuccess,
        isValid:
          wizardType === "travel_status"
            ? phase4Store.travelStatusIsValid
            : phase4Store.informedDateIsValid,
        timestamp: new Date().toISOString(),
      });

      // Only update validation state when explicitly completing the wizard
      if (currentStep === visibleQuestions.length - 1) {
        // Get current validation states
        const currentStepValidation =
          wizardType === "travel_status"
            ? { ...phase4Store.travelStatusStepValidation }
            : { ...phase4Store.informedDateStepValidation };
        const currentStepInteraction =
          wizardType === "travel_status"
            ? { ...phase4Store.travelStatusStepInteraction }
            : { ...phase4Store.informedDateStepInteraction };

        // Update validation state for current wizard type
        const updates: Partial<Phase4State> = {
          _lastUpdate: Date.now(),
        };

        if (wizardType === "travel_status") {
          updates.travelStatusShowingSuccess = true;
          updates.travelStatusIsValid = true;
          updates.travelStatusStepValidation = {
            ...currentStepValidation,
            2: true,
          };
          updates.travelStatusStepInteraction = {
            ...currentStepInteraction,
            2: true,
          };
        } else {
          updates.informedDateShowingSuccess = true;
          updates.informedDateIsValid = true;
          updates.informedDateStepValidation = {
            ...currentStepValidation,
            3: true,
          };
          updates.informedDateStepInteraction = {
            ...currentStepInteraction,
            3: true,
          };
        }

        // Update store state
        phase4Store.updateValidationState(updates);

        // Call onComplete with current wizard's answers
        if (onComplete) {
          const currentAnswers =
            wizardType === "travel_status"
              ? phase4Store.travelStatusAnswers
              : phase4Store.informedDateAnswers;

          console.log("Calling onComplete with answers:", {
            wizardType,
            answers: currentAnswers,
          });
          onComplete(currentAnswers);
        }

        // Save validation state to localStorage
        if (typeof window !== "undefined") {
          const validationState = {
            travelStatusStepValidation: phase4Store.travelStatusStepValidation,
            travelStatusStepInteraction:
              phase4Store.travelStatusStepInteraction,
            informedDateStepValidation: phase4Store.informedDateStepValidation,
            informedDateStepInteraction:
              phase4Store.informedDateStepInteraction,
            travelStatusShowingSuccess: phase4Store.travelStatusShowingSuccess,
            travelStatusIsValid: phase4Store.travelStatusIsValid,
            informedDateShowingSuccess: phase4Store.informedDateShowingSuccess,
            informedDateIsValid: phase4Store.informedDateIsValid,
            travelStatusAnswers: phase4Store.travelStatusAnswers,
            informedDateAnswers: phase4Store.informedDateAnswers,
            _timestamp: Date.now(),
          };

          console.log(
            "=== Phase4QAWizard - handleComplete - Saving to localStorage ===",
            {
              wizardType,
              validationState,
              timestamp: new Date().toISOString(),
            }
          );

          localStorage.setItem(
            "phase4ValidationState",
            JSON.stringify(validationState)
          );

          // Also save to phase4Store in localStorage directly
          try {
            const phase4StoreData = localStorage.getItem("phase4Store");
            if (phase4StoreData) {
              const parsedData = JSON.parse(phase4StoreData);
              if (parsedData.state) {
                // Update the appropriate answers based on wizard type
                if (wizardType === "travel_status") {
                  parsedData.state.travelStatusAnswers =
                    phase4Store.travelStatusAnswers;
                  parsedData.state.travelStatusShowingSuccess = true;
                  parsedData.state.travelStatusIsValid = true;
                  parsedData.state.travelStatusStepValidation =
                    phase4Store.travelStatusStepValidation;
                  parsedData.state.travelStatusStepInteraction =
                    phase4Store.travelStatusStepInteraction;
                } else {
                  parsedData.state.informedDateAnswers =
                    phase4Store.informedDateAnswers;
                  parsedData.state.informedDateShowingSuccess = true;
                  parsedData.state.informedDateIsValid = true;
                  parsedData.state.informedDateStepValidation =
                    phase4Store.informedDateStepValidation;
                  parsedData.state.informedDateStepInteraction =
                    phase4Store.informedDateStepInteraction;
                }

                parsedData.state._lastUpdate = Date.now();

                localStorage.setItem("phase4Store", JSON.stringify(parsedData));

                console.log(
                  "=== Phase4QAWizard - handleComplete - Updated phase4Store ===",
                  {
                    wizardType,
                    travelStatusAnswers: phase4Store.travelStatusAnswers,
                    informedDateAnswers: phase4Store.informedDateAnswers,
                    timestamp: new Date().toISOString(),
                  }
                );
              }
            }
          } catch (error) {
            console.error("Error updating phase4Store in localStorage:", error);
          }
        }
      }

      console.log("=== Phase4QAWizard - handleComplete END ===", {
        wizardType,
        currentStep,
        timestamp: new Date().toISOString(),
      });
    },
    [currentStep, visibleQuestions.length, phase4Store, wizardType, onComplete]
  );

  // Handle going to next step
  const goToNext = useCallback(() => {
    console.log("=== Phase4QAWizard - goToNext ENTRY ===", {
      currentStep,
      visibleQuestionsLength: visibleQuestions.length,
      isCurrentQuestionAnswered,
      wizardType,
      timestamp: new Date().toISOString(),
    });

    if (!isCurrentQuestionAnswered) {
      console.log("❌ Current question not answered, cannot proceed");
      return;
    }

    const nextStep = currentStep + 1;
    const isLastStep = nextStep >= visibleQuestions.length;

    if (!isLastStep) {
      // Just move to next question
      console.log("Moving to next question:", { nextStep });
      setCurrentStep(nextStep);
    } else {
      console.log("Completing wizard section:", { wizardType });

      // Get current answers for completion
      const currentAnswers =
        wizardType === "travel_status"
          ? phase4Store.travelStatusAnswers
          : phase4Store.informedDateAnswers;

      // Call handleComplete with current answers
      handleComplete(currentAnswers);
    }

    console.log("=== Phase4QAWizard - goToNext EXIT ===", {
      nextStep,
      isLastStep,
      wizardType,
      timestamp: new Date().toISOString(),
    });
  }, [
    currentStep,
    visibleQuestions.length,
    isCurrentQuestionAnswered,
    phase4Store,
    wizardType,
    handleComplete,
  ]);

  // Handle going back
  const goToPrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Handle going back to questions
  const handleBackToQuestions = useCallback(() => {
    console.log("=== Phase4QAWizard - handleBackToQuestions ENTRY ===", {
      wizardType,
      currentStep,
      validationStates: {
        travelStatus: {
          showingSuccess: phase4Store.travelStatusShowingSuccess,
          isValid: phase4Store.travelStatusIsValid,
          stepValidation: phase4Store.travelStatusStepValidation,
        },
        informedDate: {
          showingSuccess: phase4Store.informedDateShowingSuccess,
          isValid: phase4Store.informedDateIsValid,
          stepValidation: phase4Store.informedDateStepValidation,
        },
      },
    });

    // Reset current step first
    setCurrentStep(0);

    // Preserve existing flight type or default to 'direct'
    const currentFlightType = phase4Store.selectedType || "direct";
    const currentSelectedFlights = phase4Store.selectedFlights;

    // Reset state based on wizard type and ensure UI cleanup
    if (wizardType === "travel_status") {
      phase4Store.batchUpdate({
        travelStatusAnswers: [],
        travelStatusCurrentStep: 0,
        travelStatusShowingSuccess: false,
        travelStatusIsValid: false,
        travelStatusStepValidation: {},
        travelStatusStepInteraction: {},
        lastAnsweredQuestion: null,
        selectedType: currentFlightType,
        // Preserve selected flights and related data
        selectedFlights: currentSelectedFlights,
        _lastUpdate: Date.now(),
      });

      // Update localStorage to reflect the reset
      try {
        // Update phase4ValidationState
        const validationState = JSON.parse(
          localStorage.getItem("phase4ValidationState") || "{}"
        );
        validationState.travelStatusAnswers = [];
        validationState.travelStatusShowingSuccess = false;
        validationState.travelStatusIsValid = false;
        validationState.travelStatusStepValidation = {};
        validationState.travelStatusStepInteraction = {};
        validationState._timestamp = Date.now();

        localStorage.setItem(
          "phase4ValidationState",
          JSON.stringify(validationState)
        );

        // Update phase4Store in localStorage
        const phase4StoreData = localStorage.getItem("phase4Store");
        if (phase4StoreData) {
          const parsedData = JSON.parse(phase4StoreData);
          if (parsedData.state) {
            parsedData.state.travelStatusAnswers = [];
            parsedData.state.travelStatusCurrentStep = 0;
            parsedData.state.travelStatusShowingSuccess = false;
            parsedData.state.travelStatusIsValid = false;
            parsedData.state.travelStatusStepValidation = {};
            parsedData.state.travelStatusStepInteraction = {};
            parsedData.state.lastAnsweredQuestion = null;
            parsedData.state._lastUpdate = Date.now();

            localStorage.setItem("phase4Store", JSON.stringify(parsedData));
          }
        }

        console.log(
          "=== Phase4QAWizard - Reset travel_status in localStorage ===",
          {
            timestamp: new Date().toISOString(),
          }
        );
      } catch (error) {
        console.error("Error updating localStorage:", error);
      }
    } else {
      phase4Store.batchUpdate({
        informedDateAnswers: [],
        informedDateCurrentStep: 0,
        informedDateShowingSuccess: false,
        informedDateIsValid: false,
        informedDateStepValidation: {},
        informedDateStepInteraction: {},
        lastAnsweredQuestion: null,
        selectedType: currentFlightType,
        // Preserve selected flights and related data
        selectedFlights: currentSelectedFlights,
        _lastUpdate: Date.now(),
      });

      // Update localStorage to reflect the reset
      try {
        // Update phase4ValidationState
        const validationState = JSON.parse(
          localStorage.getItem("phase4ValidationState") || "{}"
        );
        validationState.informedDateAnswers = [];
        validationState.informedDateShowingSuccess = false;
        validationState.informedDateIsValid = false;
        validationState.informedDateStepValidation = {};
        validationState.informedDateStepInteraction = {};
        validationState._timestamp = Date.now();

        localStorage.setItem(
          "phase4ValidationState",
          JSON.stringify(validationState)
        );

        // Update phase4Store in localStorage
        const phase4StoreData = localStorage.getItem("phase4Store");
        if (phase4StoreData) {
          const parsedData = JSON.parse(phase4StoreData);
          if (parsedData.state) {
            parsedData.state.informedDateAnswers = [];
            parsedData.state.informedDateCurrentStep = 0;
            parsedData.state.informedDateShowingSuccess = false;
            parsedData.state.informedDateIsValid = false;
            parsedData.state.informedDateStepValidation = {};
            parsedData.state.informedDateStepInteraction = {};
            parsedData.state.lastAnsweredQuestion = null;
            parsedData.state._lastUpdate = Date.now();

            localStorage.setItem("phase4Store", JSON.stringify(parsedData));
          }
        }

        console.log(
          "=== Phase4QAWizard - Reset informed_date in localStorage ===",
          {
            timestamp: new Date().toISOString(),
          }
        );
      } catch (error) {
        console.error("Error updating localStorage:", error);
      }
    }

    console.log("=== Phase4QAWizard - handleBackToQuestions EXIT ===", {
      wizardType,
      currentStep,
      validationStates: {
        travelStatus: {
          showingSuccess: phase4Store.travelStatusShowingSuccess,
          isValid: phase4Store.travelStatusIsValid,
          stepValidation: phase4Store.travelStatusStepValidation,
        },
        informedDate: {
          showingSuccess: phase4Store.informedDateShowingSuccess,
          isValid: phase4Store.informedDateIsValid,
          stepValidation: phase4Store.informedDateStepValidation,
        },
      },
    });
  }, [currentStep, phase4Store, wizardType]);

  // Get success state
  const successState = useMemo(() => {
    console.log("=== Phase4QAWizard - Success State Check ===", {
      wizardType,
      answers: wizardAnswers,
      isShowingSuccess:
        wizardType === "travel_status"
          ? phase4Store.travelStatusShowingSuccess
          : phase4Store.informedDateShowingSuccess,
      travelStatusShowingSuccess: phase4Store.travelStatusShowingSuccess,
      informedDateShowingSuccess: phase4Store.informedDateShowingSuccess,
      travelStatusIsValid: phase4Store.travelStatusIsValid,
      informedDateIsValid: phase4Store.informedDateIsValid,
      travelStatusAnswers: phase4Store.travelStatusAnswers,
      informedDateAnswers: phase4Store.informedDateAnswers,
    });

    // Get the showing success state based on wizard type
    const isShowingSuccess =
      wizardType === "travel_status"
        ? phase4Store.travelStatusShowingSuccess
        : phase4Store.informedDateShowingSuccess;

    // Get the answers based on wizard type
    const answers =
      wizardType === "travel_status"
        ? phase4Store.travelStatusAnswers
        : phase4Store.informedDateAnswers;

    // If we don't have success state or answers, return not showing
    if (!isShowingSuccess || !answers || answers.length === 0) {
      return { showing: false, message: "" };
    }

    // For travel_status, we need to ensure we have a valid travel_status answer
    if (wizardType === "travel_status") {
      const hasTravelStatusAnswer = answers.some(
        (a) => a.questionId === "travel_status"
      );
      if (!hasTravelStatusAnswer) {
        return { showing: false, message: "" };
      }
    }

    // For informed_date, we need to ensure we have either informed_date or specific_informed_date
    if (wizardType === "informed_date") {
      const hasInformedDateAnswer = answers.some(
        (a) =>
          a.questionId === "informed_date" ||
          a.questionId === "specific_informed_date"
      );
      if (!hasInformedDateAnswer) {
        return { showing: false, message: "" };
      }
    }

    // Find the last answer and determine success message
    const lastAnswer = answers[answers.length - 1];
    if (!lastAnswer) return { showing: false, message: "" };

    // Find the question and option for the last answer
    const question = questions.find((q) => q.id === lastAnswer.questionId);
    const option = question?.options?.find((o) => o.value === lastAnswer.value);

    return {
      showing: isShowingSuccess,
      message: option?.showConfetti
        ? t.wizard.success.goodChance
        : t.wizard.success.answersSaved,
    };
  }, [
    phase4Store.travelStatusAnswers,
    phase4Store.informedDateAnswers,
    phase4Store.travelStatusShowingSuccess,
    phase4Store.informedDateShowingSuccess,
    phase4Store.travelStatusIsValid,
    phase4Store.informedDateIsValid,
    wizardType,
    questions,
    t.wizard.success,
    wizardAnswers,
  ]);

  // Get success icon based on last answer
  const getSuccessIcon = useMemo(() => {
    const answers =
      wizardType === "travel_status"
        ? phase4Store.travelStatusAnswers
        : phase4Store.informedDateAnswers;
    const lastAnswer = answers[answers.length - 1];
    if (!lastAnswer) return null;

    // Find the question and selected option
    const question = questions.find((q) => q.id === lastAnswer.questionId);
    const option = question?.options?.find((o) => o.value === lastAnswer.value);

    if (option?.showConfetti) {
      return <span className={qaWizardConfig.success.icon.emoji}>🎉</span>;
    }

    return <CheckCircleIcon className={qaWizardConfig.success.icon.check} />;
  }, [
    phase4Store.travelStatusAnswers,
    phase4Store.informedDateAnswers,
    questions,
    wizardType,
  ]);

  // Early return for no questions
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-center">
        <p className="text-gray-500">No questions available</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        {successState.showing ? (
          <div className="min-h-[300px] flex flex-col justify-center">
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="w-16 h-16 flex items-center justify-center text-[64px]">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                  >
                    {getSuccessIcon}
                  </motion.div>
                </div>
                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.2, duration: 0.2 }}
                  >
                    <h2 className="text-2xl font-bold text-gray-900">
                      {successState.message}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {t.wizard.success.processing}
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={handleBackToQuestions}
                        className="px-6 py-2 text-[#F54538] border border-[#F54538] rounded-md hover:bg-red-50"
                      >
                        {t.wizard.success.backToQuestions}
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          visibleQuestions.length > 0 &&
          currentQuestion && (
            <motion.div
              key={`question-${currentQuestion.id}-${currentStep}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <QuestionAnswer
                question={currentQuestion}
                selectedOption={getCurrentAnswer(currentQuestion.id)}
                onSelect={handleSelect}
                currentStep={currentStep + 1}
                totalSteps={visibleQuestions.length}
              />
              <div className="flex justify-between mt-6">
                <div>
                  {currentStep > 0 && (
                    <button
                      onClick={() => {
                        console.log("Back button clicked");
                        goToPrevious();
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      {t.wizard.navigation.back}
                    </button>
                  )}
                </div>
                <div>
                  <button
                    onClick={() => {
                      console.log("Next/Submit button clicked");
                      goToNext();
                    }}
                    disabled={!isCurrentQuestionAnswered}
                    className={`px-4 py-2 rounded-md ${
                      isCurrentQuestionAnswered
                        ? "bg-[#F54538] text-white hover:bg-[#E03F33]"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {currentStep < visibleQuestions.length - 1
                      ? t.wizard.navigation.next
                      : t.common.submit}
                  </button>
                </div>
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
};

export default Phase4QAWizard;
