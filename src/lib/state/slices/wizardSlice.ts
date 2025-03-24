import type { Answer } from '@/types/wizard';
import type { Question } from '@/types/experience';
import { StoreStateValues, ValidationStep } from '../types';
import { validateInformedDate } from '../validationHelpers';

export type WizardStepKey =
  | 'travel_status'
  | 'informed_date'
  | 'issue'
  | 'phase1'
  | 'default';

export interface WizardSlice {
  wizardAnswers: Answer[];
  wizardCurrentSteps: Record<string, number>;
  wizardShowingSuccess: boolean;
  wizardSuccessMessage: string;
  wizardIsCompleted: boolean;
  wizardIsValid: boolean;
  wizardIsValidating: boolean;
  lastAnsweredQuestion: string | null;
  completedWizards: Record<string, boolean>;
  lastValidAnswers: Answer[];
  lastValidStep: number;
  wizardIsEditingMoney: boolean;
  wizardLastActiveStep: number | null;
  wizardValidationState: Record<string, boolean>;
  wizardSuccessStates: Record<WizardStepKey, { showing: boolean; message: string }>;
  tripExperienceAnswers: Answer[];
  wizardQuestions: Question[];
}

export const initialWizardState: WizardSlice = {
  wizardAnswers: [],
  wizardCurrentSteps: {
    travel_status: 0,
    informed_date: 0,
    issue: 0,
    phase1: 0,
    default: 0,
  },
  wizardShowingSuccess: false,
  wizardSuccessMessage: '',
  wizardIsCompleted: false,
  wizardIsValid: false,
  wizardIsValidating: false,
  lastAnsweredQuestion: null,
  completedWizards: {},
  lastValidAnswers: [],
  lastValidStep: 0,
  wizardIsEditingMoney: false,
  wizardLastActiveStep: null,
  wizardValidationState: {},
  wizardSuccessStates: {
    travel_status: { showing: false, message: '' },
    informed_date: { showing: false, message: '' },
    issue: { showing: false, message: '' },
    phase1: { showing: false, message: '' },
    default: { showing: false, message: '' },
  },
  tripExperienceAnswers: [],
  wizardQuestions: [],
};

export interface WizardActions {
  setWizardAnswers: (answers: Answer[]) => void;
  setWizardShowingSuccess: (showing: boolean) => void;
  setWizardValidationState: (state: Record<string, boolean>) => void;
  markWizardComplete: (wizardId: string) => void;
  isWizardCompleted: (wizardId: string) => boolean;
  validateQAWizard: () => {
    isValid: boolean;
    answers: Answer[];
    bookingNumber: string;
  };
  handleWizardComplete: (
    wizardId: string,
    answers: Answer[],
    successMessage: string
  ) => boolean;
  handleTripExperienceComplete: () => void;
  handleInformedDateComplete: () => void;
  setLastAnsweredQuestion: (questionId: string | null) => void;
  batchUpdateWizardState: (updates: Partial<StoreStateValues>) => void;
  updateWizardAnswer: (questionId: string, answer: string) => void;
  setWizardLastActiveStep: (step: number) => void;
  setWizardIsValid: (isValid: boolean) => void;
  setWizardIsCompleted: (isCompleted: boolean) => void;
}

export const createWizardSlice = (
  set: (fn: (state: StoreStateValues) => Partial<StoreStateValues>) => void,
  get: () => StoreStateValues
): WizardActions => ({
  setWizardAnswers: (answers) => {
    set((state) => {
      const formattedAnswers = answers.map((answer) => {
        if (answer.questionId === 'specific_informed_date') {
          if (!answer.value) return answer;
          return {
            ...answer,
            value: answer.value,
          };
        }
        return answer;
      });

      // Get the current travel status answer if it exists
      const travelStatusAnswer = formattedAnswers.find(
        (a) => a.questionId === 'travel_status'
      );

      // Get existing answers that we might want to keep
      const existingAnswers = state.wizardAnswers;

      // Determine which answers to keep based on the travel status
      let newAnswers = formattedAnswers;

      if (travelStatusAnswer) {
        const status = travelStatusAnswer.value;

        // Keep related answers based on travel status
        const relatedAnswers = existingAnswers.filter((a) => {
          // For 'none' status, keep refund_status and ticket_cost if refund_status is 'no'
          if (status === 'none') {
            if (a.questionId === 'refund_status') return true;
            if (a.questionId === 'ticket_cost') {
              const hasNoRefund = existingAnswers.some(
                (r) => r.questionId === 'refund_status' && r.value === 'no'
              );
              return hasNoRefund;
            }
          }

          // For 'provided' status, keep alternative_flight_airline_expense
          if (
            status === 'provided' &&
            a.questionId === 'alternative_flight_airline_expense'
          ) {
            return true;
          }

          // For 'took_alternative_own' status, keep alternative_flight_own_expense and trip_costs
          if (status === 'took_alternative_own') {
            return ['alternative_flight_own_expense', 'trip_costs'].includes(
              a.questionId
            );
          }

          return false;
        });

        // Combine new answers with related existing answers
        newAnswers = [...formattedAnswers, ...relatedAnswers];
      }

      return {
        ...state,
        wizardAnswers: newAnswers,
        _lastUpdate: Date.now(),
      };
    });
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

  isWizardCompleted: (wizardId) => {
    const state = get();
    return state.completedWizards[wizardId] || false;
  },

  validateQAWizard: () => {
    const state = get();
    const { wizardAnswers, bookingNumber } = state;
    const isValid = wizardAnswers.length > 0 && !!bookingNumber;
    return {
      isValid,
      answers: wizardAnswers,
      bookingNumber: bookingNumber || '',
    };
  },

  handleWizardComplete: (wizardId, answers, successMessage) => {
    const state = get();
    let wizardType = wizardId.split('_')[0] as WizardStepKey;

    if (wizardId.startsWith('travel_status')) {
      wizardType = 'travel_status';
    } else if (wizardId.startsWith('informed')) {
      wizardType = 'informed_date';
    }

    const wizardSuccessStates = {
      ...state.wizardSuccessStates,
      [wizardType]: { showing: true, message: successMessage },
    };

    const completeWizardId =
      wizardType === 'informed_date' ? 'informed_date' : wizardId;

    // Validate answers immediately
    const isValid = answers.length > 0 && answers.every(a => a.value);

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
      lastAnsweredQuestion: wizardId,
      wizardAnswers: answers,
      wizardSuccessStates,
      wizardIsCompleted: true,
      wizardIsValid: isValid,
      completedWizards: {
        ...state.completedWizards,
        [completeWizardId]: true,
      },
      completedSteps: Array.from(
        new Set([...state.completedSteps, 2 as ValidationStep])
      ).sort((a, b) => a - b),
      _lastUpdate: Date.now(),
    }));

    return isValid;
  },

  handleTripExperienceComplete: () => {
    const state = get();
    const answers = state.wizardAnswers.filter(
      (a) =>
        a.questionId === 'travel_status' ||
        a.questionId === 'refund_status' ||
        a.questionId === 'ticket_cost'
    );

    const hasTravelStatus = answers.some(
      (a) =>
        a.questionId === 'travel_status' &&
        ['none', 'self', 'provided'].includes(String(a.value))
    );

    const travelStatusAnswer = answers.find(
      (a) => a.questionId === 'travel_status'
    );
    const travelStatus = travelStatusAnswer?.value;

    const refundStatus = answers.find(
      (a) => a.questionId === 'refund_status'
    )?.value;

    const needsTicketCost = travelStatus === 'none' && refundStatus === 'no';
    const hasTicketCost = needsTicketCost
      ? answers.some((a) => a.questionId === 'ticket_cost' && a.value)
      : true;

    const isValid = hasTravelStatus && (!needsTicketCost || hasTicketCost);

    set((state) => {
      const otherAnswers = state.wizardAnswers.filter(
        (a) =>
          a.questionId !== 'travel_status' &&
          a.questionId !== 'refund_status' &&
          a.questionId !== 'ticket_cost'
      );

      const travelAnswers = answers.map((a) => {
        const shouldShow =
          a.questionId === 'travel_status' ||
          (a.questionId === 'refund_status' && travelStatus === 'none') ||
          (a.questionId === 'ticket_cost' && needsTicketCost);

        const value =
          a.questionId === 'travel_status' && a.value === 'none'
            ? 'no_travel'
            : a.value;

        return {
          ...a,
          shouldShow,
          value,
        };
      });

      return {
        validationState: {
          ...state.validationState,
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
        completedSteps: state.validationState.stepValidation[2]
          ? Array.from(new Set([...state.completedSteps, 2])).sort(
              (a, b) => a - b
            ).filter((step): step is ValidationStep => step >= 1 && step <= 7)
          : state.completedSteps.filter((step): step is ValidationStep => step >= 1 && step <= 7),
        completedWizards: {
          ...state.completedWizards,
          travel_status: isValid,
        },
        wizardAnswers: [...otherAnswers, ...travelAnswers],
        _lastUpdate: Date.now(),
      };
    });
  },

  handleInformedDateComplete: () => {
    const state = get();
    const isValid = validateInformedDate(state);

    set((state) => ({
      validationState: {
        ...state.validationState,
        stepValidation: {
          ...state.validationState.stepValidation,
          3: isValid,
        },
        stepInteraction: {
          ...state.validationState.stepInteraction,
          3: true,
        },
        3: isValid,
        _timestamp: Date.now(),
      },
      completedSteps: state.validationState.stepValidation[3]
        ? Array.from(new Set([...state.completedSteps, 3])).sort(
            (a, b) => a - b
          ).filter((step): step is ValidationStep => step >= 1 && step <= 7)
        : state.completedSteps.filter((step): step is ValidationStep => step >= 1 && step <= 7),
      completedWizards: {
        ...state.completedWizards,
        informed_date: isValid,
      },
      wizardAnswers: state.wizardAnswers
        .filter((a) => !a.questionId.startsWith('informed_date'))
        .concat(
          state.wizardAnswers.filter((a) =>
            a.questionId.startsWith('informed_date')
          )
        ),
      _lastUpdate: Date.now(),
    }));
  },

  setLastAnsweredQuestion: (questionId) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    set((state) => ({
      lastAnsweredQuestion: questionId,
      _lastUpdate: Date.now(),
    }));
  },

  batchUpdateWizardState: (updates) => {
    set((state) => ({
      ...state,
      ...updates,
      _lastUpdate: Date.now(),
    }));
  },

  updateWizardAnswer: (questionId, answer) => {
    set((state) => ({
      ...state,
      wizardAnswers: [
        ...state.wizardAnswers,
        {
          questionId,
          value: answer,
          timestamp: Date.now(),
        },
      ],
      lastAnsweredQuestion: questionId,
      _lastUpdate: Date.now(),
    }));
  },

  setWizardLastActiveStep: (step: number) =>
    set((state) => ({
      ...state,
      wizardLastActiveStep: step,
      _lastUpdate: Date.now(),
    })),

  setWizardIsValid: (isValid: boolean) =>
    set((state) => ({
      ...state,
      wizardIsValid: isValid,
      _lastUpdate: Date.now(),
    })),

  setWizardIsCompleted: (isCompleted: boolean) =>
    set((state) => ({
      ...state,
      wizardIsCompleted: isCompleted,
      _lastUpdate: Date.now(),
    })),
});
