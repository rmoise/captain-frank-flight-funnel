export interface BadgeProps {
  label: string;
  variant: 'step1' | 'step2' | 'step3' | 'step4';
  className?: string;
}

export interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
}

// Add type for debounced function
export type DebouncedFunction<T extends (...args: unknown[]) => unknown> = T & {
  cancel: () => void;
};