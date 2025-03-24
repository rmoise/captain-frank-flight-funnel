import type { ValidationState, StoreStateValues } from '@/lib/state/types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  metadata?: {
    phase: number;
    type: string;
    [key: string]: unknown;
  };
}

export interface IValidationStrategy {
  validate(state: StoreStateValues): Promise<ValidationResult>;
}

export abstract class BaseValidationStrategy implements IValidationStrategy {
  async validate(state: StoreStateValues): Promise<ValidationResult> {
    const result = await this.validateImpl(state);
    return result;
  }

  protected abstract validateImpl(
    state: StoreStateValues
  ): Promise<ValidationResult>;

  protected abstract updateValidationState(
    result: ValidationResult,
    currentState: ValidationState
  ): ValidationState;
}
