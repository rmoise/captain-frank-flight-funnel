interface BookingNumberTranslations {
  title: string;
  eyebrow: string;
  placeholder: string;
  label: string;
  validation: {
    required: string;
    format: string;
  };
}

export interface Translations {
  bookingNumber: BookingNumberTranslations;
}
