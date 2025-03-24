import React, { useCallback } from 'react';
import useStore from '@/lib/state/store';
import { validateTerms } from '@/lib/validation/termsValidation';
import type { ValidationStep, ValidationState } from '@/lib/state/types';

interface TermsAndConditionsProps {
  onAcceptChange?: (accepted: boolean) => void;
}

export const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({
  onAcceptChange,
}) => {
  const { validationState, updateValidationState } = useStore();

  const handleTermsChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const isAccepted = event.target.checked;

      // Use the validation system
      const validationResult = validateTerms(isAccepted);

      // Create a consistent validation state update
      const validationUpdate: Partial<ValidationState> = {
        isTermsValid: validationResult.isValid,
        stepValidation: {
          ...validationState.stepValidation,
          [1 as ValidationStep]: validationResult.isValid,
        },
        stepInteraction: {
          ...validationState.stepInteraction,
          [1 as ValidationStep]: true,
        },
        errors: {
          ...validationState.errors,
          [1 as ValidationStep]: validationResult.errors,
        },
        _timestamp: Date.now(),
      };

      // Update the validation state
      updateValidationState(validationUpdate);

      // Save the state to localStorage
      const currentState = {
        ...useStore.getState(),
        validationState: {
          ...validationState,
          ...validationUpdate,
        },
        _timestamp: Date.now(),
      };

      localStorage.setItem('phase1State', JSON.stringify(currentState));

      // Log validation update for debugging
      console.log('=== Terms Validation Update ===', {
        isAccepted,
        validationResult,
        validationState: validationUpdate,
        timestamp: new Date().toISOString(),
      });

      // Call the external handler if provided
      if (onAcceptChange) {
        onAcceptChange(isAccepted);
      }
    },
    [validationState, updateValidationState, onAcceptChange]
  );

  return (
    <div className="flex items-start gap-2">
      <input
        type="checkbox"
        id="terms"
        className="mt-1"
        onChange={handleTermsChange}
        checked={validationState.stepValidation[1 as ValidationStep] ?? false}
      />
      <label htmlFor="terms" className="text-sm text-gray-600">
        I accept the{' '}
        <a
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          terms and conditions
        </a>
      </label>
      {validationState.fieldErrors && Object.keys(validationState.fieldErrors).length > 0 &&
        validationState.stepInteraction[1 as ValidationStep] && (
          <div className="text-red-500 text-sm mt-1">
            {validationState.fieldErrors[Object.keys(validationState.fieldErrors)[0]]}
          </div>
        )}
    </div>
  );
};
