import type { ReactNode, ComponentType } from "react";
import type { ValidationPhase } from "./validation";

export interface StepState {
  id: string;
  title: string;
  subtitle?: string;
  isValid: boolean;
  isComplete: boolean;
  isSkipped: boolean;
  phase: ValidationPhase;
}

export interface Step {
  id: string;
  title: string;
  subtitle?: string;
  component: ComponentType<any> | ReactNode;
  props?: Record<string, unknown>;
  onComplete?: () => void;
  onSkip?: () => void;
  validate?: () => Promise<boolean>;
}
