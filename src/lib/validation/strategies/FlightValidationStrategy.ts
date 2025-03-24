import { validateFlightSelection } from '@/lib/state/validationHelpers';
import { BaseValidationStrategy } from './ValidationStrategy';
import type {
  StoreStateValues,
  ValidationState,
  ValidationStep,
} from '@/lib/state/types';
import type { ValidationResult } from './ValidationStrategy';
import { ensureValidationState } from '@/lib/state/slices/validationSlice';

export class FlightValidationStrategy extends BaseValidationStrategy {
  constructor(private currentPhase: ValidationStep) {
    super();
  }

  protected async validateImpl(
    state: StoreStateValues
  ): Promise<ValidationResult> {
    // Ensure we have a valid validation state
    const validationState = ensureValidationState(state.validationState);

    // Add the required properties to make the state compatible with ValidationStore & FlightSlice
    const validationStoreState = {
      ...state,
      hasValidLocations: !!state.fromLocation && !!state.toLocation,
      hasValidFlights: state.selectedFlights.length > 0,
      stepValidation: validationState.stepValidation,
      stepInteraction: validationState.stepInteraction,
      errors: validationState.errors,
      stepCompleted: validationState.stepCompleted,
      completedSteps: validationState.completedSteps,
      isPersonalValid: validationState.isPersonalValid,
      isFlightValid: validationState.isFlightValid,
      isBookingValid: validationState.isBookingValid,
      isWizardValid: validationState.isWizardValid,
      isTermsValid: validationState.isTermsValid,
      isSignatureValid: validationState.isSignatureValid,
      isWizardSubmitted: validationState.isWizardSubmitted,
      questionValidation: validationState.questionValidation,
      fieldErrors: validationState.fieldErrors,
      transitionInProgress: validationState.transitionInProgress,
      _timestamp: validationState._timestamp,
      selectedDate: state.selectedDate instanceof Date ? state.selectedDate : null,
    };

    const isValid = validateFlightSelection(validationStoreState);
    return {
      isValid,
      errors: isValid ? [] : ['Please complete flight selection'],
      metadata: {
        phase: this.currentPhase,
        type: 'flight_validation',
      },
    };
  }

  protected updateValidationState(
    result: ValidationResult,
    currentState: ValidationState
  ): ValidationState {
    const newState = {
      ...currentState,
      isFlightValid: result.isValid,
      stepValidation: {
        ...currentState.stepValidation,
        [this.currentPhase]: result.isValid,
      },
      stepInteraction: {
        ...currentState.stepInteraction,
        [this.currentPhase]: true,
      },
      errors: {
        ...currentState.errors,
        [this.currentPhase]: result.errors,
      },
      [this.currentPhase]: result.isValid,
      _timestamp: Date.now(),
    };

    console.log('FlightValidationStrategy - Updating validation state:', {
      phase: this.currentPhase,
      result,
      currentState,
      newState,
    });

    return newState;
  }
}
