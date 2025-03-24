import { useCallback } from 'react';
import useStore from '@/lib/state/store';
import type { Answer } from '@/types/store';

export const useWizardManager = (wizardId = 'default') => {
  const {
    wizardCurrentSteps,
    wizardAnswers,
    wizardIsCompleted,
    wizardSuccessMessage,
    wizardIsEditingMoney,
    wizardLastActiveStep,
    wizardShowingSuccess,
    batchUpdateWizardState,
  } = useStore();

  const wizardCurrentStep = wizardCurrentSteps[wizardId] || 0;

  const handleAnswerSubmit = useCallback(
    (answer: Answer) => {
      const newAnswers = [...wizardAnswers];
      newAnswers[wizardCurrentStep] = answer;

      if (wizardCurrentStep < wizardAnswers.length - 1) {
        batchUpdateWizardState({
          wizardAnswers: newAnswers,
          wizardCurrentSteps: {
            ...wizardCurrentSteps,
            [wizardId]: wizardCurrentStep + 1,
          },
          wizardLastActiveStep: wizardCurrentStep + 1,
        });
      } else {
        batchUpdateWizardState({
          wizardAnswers: newAnswers,
          wizardIsCompleted: true,
          wizardShowingSuccess: true,
        });
      }
    },
    [
      wizardCurrentStep,
      wizardAnswers,
      batchUpdateWizardState,
      wizardCurrentSteps,
      wizardId,
    ]
  );

  const handleMoneyEdit = useCallback(() => {
    batchUpdateWizardState({
      wizardIsEditingMoney: true,
      wizardShowingSuccess: false,
    });
  }, [batchUpdateWizardState]);

  return {
    currentStep: wizardCurrentStep,
    answers: wizardAnswers,
    isCompleted: wizardIsCompleted,
    successMessage: wizardSuccessMessage,
    isEditingMoney: wizardIsEditingMoney,
    lastActiveStep: wizardLastActiveStep,
    showingSuccess: wizardShowingSuccess,
    handleAnswerSubmit,
    handleMoneyEdit,
  };
};
