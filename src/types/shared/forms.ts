export type ConsentType = "terms" | "privacy" | "marketing";

export interface PassengerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  place: string; // postal code
  city: string;
  country: string;
}

export interface FormField {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "date" | "select";
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: {
    pattern?: RegExp;
    message?: string;
    min?: string;
    max?: string;
  };
}

export interface FormSection {
  title?: string;
  description?: string;
  fields: FormField[];
}

export interface FormConfig {
  sections: FormSection[];
  submitLabel?: string;
  cancelLabel?: string;
}

export interface Consents {
  terms: boolean;
  privacy: boolean;
  marketing: boolean;
}
