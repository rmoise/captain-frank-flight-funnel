/**
 * Generic option type for select inputs and dropdowns
 */
export interface Option {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

/**
 * Props for custom select input components
 */
export interface SelectInputProps {
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}
