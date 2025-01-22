import { validateFlightSelection } from '../../state/validationHelpers';
import { BaseValidationStrategy } from './ValidationStrategy';
import type {
  StoreStateValues,
  ValidationState,
  ValidationStep,
} from '../../state/types';
import type { ValidationResult } from './ValidationStrategy';

export class FlightValidationStrategy extends BaseValidationStrategy {
  constructor(private currentPhase: ValidationStep) {
    super();
  }

  protected async validateImpl(
    state: StoreStateValues
  ): Promise<ValidationResult> {
    // Add the required properties to make the state compatible with ValidationStore & FlightSlice
    const validationState = {
      ...state,
      hasValidLocations: !!state.fromLocation && !!state.toLocation,
      hasValidFlights: state.selectedFlights.length > 0,
    };

    const isValid = validateFlightSelection(validationState);
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
