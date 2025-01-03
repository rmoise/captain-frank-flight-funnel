import { useCallback, useState } from 'react';
import type { Answer, PassengerDetails, LocationData } from '@/types/store';

interface ValidationRules {
  locations: (
    fromLocation: LocationData | string | null,
    toLocation: LocationData | string | null
  ) => boolean;
  wizardAnswers: (answers: Answer[]) => boolean;
  personalDetails: (details: PassengerDetails | null) => boolean;
  terms: (accepted: boolean) => boolean;
  privacy: (accepted: boolean) => boolean;
}

export function useStepValidation() {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const validationRules: ValidationRules = {
    locations: (fromLocation, toLocation) => {
      if (!fromLocation || !toLocation) return false;

      try {
        const from =
          typeof fromLocation === 'string'
            ? JSON.parse(fromLocation)
            : fromLocation;
        const to =
          typeof toLocation === 'string' ? JSON.parse(toLocation) : toLocation;

        return !!(from.value && to.value && from.value !== to.value);
      } catch {
        return false;
      }
    },
    wizardAnswers: (answers) => {
      if (!answers?.length) return false;
      return answers.every((answer) => answer.questionId && answer.value);
    },
    personalDetails: (details) => {
      if (!details) return false;
      const hasValidEmail =
        details.email &&
        /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(details.email);
      return !!(
        details.firstName?.trim() &&
        details.lastName?.trim() &&
        hasValidEmail &&
        details.salutation?.trim()
      );
    },
    terms: (accepted) => accepted,
    privacy: (accepted) => accepted,
  };

  const validateStep = useCallback((step: number, isValid: boolean) => {
    setCompletedSteps((prev) => {
      if (isValid && !prev.includes(step)) {
        return [...prev, step];
      }
      if (!isValid && prev.includes(step)) {
        return prev.filter((s) => s !== step);
      }
      return prev;
    });
  }, []);

  const isStepCompleted = useCallback(
    (step: number) => {
      return completedSteps.includes(step);
    },
    [completedSteps]
  );

  const areStepsCompleted = useCallback(
    (steps: number[]) => {
      return steps.every((step) => completedSteps.includes(step));
    },
    [completedSteps]
  );

  return {
    validationRules,
    validateStep,
    isStepCompleted,
    areStepsCompleted,
  };
}
