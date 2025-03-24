import type { StoreStateValues, ValidationStep } from '@/lib/state/types';
import {
  IValidationStrategy,
  ValidationResult,
} from './strategies/ValidationStrategy';
import { FlightValidationStrategy } from './strategies/FlightValidationStrategy';

type ValidationEventType = 'start' | 'complete' | 'error';

interface ValidationEvent {
  type: ValidationEventType;
  validationId: number;
  phase: ValidationStep;
  result?: ValidationResult;
  error?: Error;
}

type ValidationEventListener = (event: ValidationEvent) => void;

export class ValidationManager {
  private currentValidationId: number | null = null;
  private isValidating = false;
  private validationQueue: Array<() => Promise<void>> = [];
  private eventListeners: ValidationEventListener[] = [];
  private validationCache = new Map<string, ValidationResult>();

  constructor() {
    // Clear cache periodically
    setInterval(() => this.validationCache.clear(), 5 * 60 * 1000); // Clear every 5 minutes
  }

  addEventListener(listener: ValidationEventListener) {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: ValidationEventListener) {
    this.eventListeners = this.eventListeners.filter((l) => l !== listener);
  }

  private emitEvent(event: ValidationEvent) {
    this.eventListeners.forEach((listener) => listener(event));
  }

  private getCacheKey(state: StoreStateValues, phase: ValidationStep): string {
    // Create a cache key based on relevant state properties
    const relevantState = {
      selectedType: state.selectedType,
      fromLocation: state.fromLocation,
      toLocation: state.toLocation,
      directFlight: state.directFlight,
      flightSegments: state.flightSegments,
      selectedFlights: state.selectedFlights,
      phase,
    };
    return JSON.stringify(relevantState);
  }

  async validate(
    state: StoreStateValues,
    phase: ValidationStep
  ): Promise<ValidationResult> {
    const validationId = Date.now();
    const cacheKey = this.getCacheKey(state, phase);

    // Check cache first
    const cachedResult = this.validationCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Queue validation if one is in progress
    if (this.isValidating) {
      return new Promise((resolve) => {
        this.validationQueue.push(async () => {
          const result = await this.executeValidation(
            state,
            phase,
            validationId
          );
          resolve(result);
        });
      });
    }

    return this.executeValidation(state, phase, validationId);
  }

  private async executeValidation(
    state: StoreStateValues,
    phase: ValidationStep,
    validationId: number
  ): Promise<ValidationResult> {
    this.isValidating = true;
    this.currentValidationId = validationId;

    this.emitEvent({
      type: 'start',
      validationId,
      phase,
    });

    try {
      const strategy = this.getValidationStrategy(phase);
      const result = await strategy.validate(state);

      // Cache the result
      const cacheKey = this.getCacheKey(state, phase);
      this.validationCache.set(cacheKey, result);

      this.emitEvent({
        type: 'complete',
        validationId,
        phase,
        result,
      });

      return result;
    } catch (error) {
      this.emitEvent({
        type: 'error',
        validationId,
        phase,
        error: error as Error,
      });
      throw error;
    } finally {
      this.isValidating = false;
      this.currentValidationId = null;

      // Process next validation in queue
      const nextValidation = this.validationQueue.shift();
      if (nextValidation) {
        nextValidation();
      }
    }
  }

  private getValidationStrategy(phase: ValidationStep): IValidationStrategy {
    // For now, we only have flight validation
    // In the future, we can add more strategies based on the phase
    return new FlightValidationStrategy(phase);
  }

  getCurrentValidationId(): number | null {
    return this.currentValidationId;
  }

  isCurrentlyValidating(): boolean {
    return this.isValidating;
  }

  clearValidationCache() {
    this.validationCache.clear();
  }
}
