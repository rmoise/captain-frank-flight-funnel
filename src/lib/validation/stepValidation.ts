import type { StoreState, ValidationStep } from '../state/types';
import { validateFlightSelection } from '../state/validationHelpers';
import { initialValidationState } from '../state/slices/validationSlice';

export function validateStep(step: ValidationStep, state: StoreState): boolean {
  let isValid = false;

  // Add the required properties to make the state compatible with ValidationStore & FlightSlice
  const validationState = {
    ...state,
    ...initialValidationState,
    hasValidLocations: !!state.fromLocation && !!state.toLocation,
    hasValidFlights: state.selectedFlights.length > 0,
    stepValidation: state.validationState?.stepValidation || initialValidationState.stepValidation,
    stepInteraction: state.validationState?.stepInteraction || initialValidationState.stepInteraction,
    errors: state.validationState?.errors || initialValidationState.errors,
    stepCompleted: state.validationState?.stepCompleted || initialValidationState.stepCompleted,
    _timestamp: state.validationState?._timestamp || Date.now(),
    _lastUpdate: Date.now()
  };

  switch (step) {
    case 1:
      isValid = validateFlightSelection(validationState);
      break;
    case 2:
      isValid = validateFlightSelection(validationState);
      break;
    case 3:
      isValid = validateFlightSelection(validationState);
      break;
    case 4:
      isValid = validateFlightSelection(validationState);
      break;
    case 5:
      isValid = validateFlightSelection(validationState);
      break;
    default:
      isValid = false;
  }

  return isValid;
}
