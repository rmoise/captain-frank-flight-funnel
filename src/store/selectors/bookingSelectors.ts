import type { RootState } from '@/store';

export const selectFromLocation = (state: RootState) =>
  state.booking.fromLocation;

export const selectToLocation = (state: RootState) => state.booking.toLocation;

export const selectSelectedFlight = (state: RootState) =>
  state.booking.selectedFlight;

export const selectWizardAnswers = (state: RootState) =>
  state.booking.wizardAnswers;

export const selectPersonalDetails = (state: RootState) =>
  state.booking.personalDetails;

export const selectTermsAccepted = (state: RootState) =>
  state.booking.termsAccepted;

export const selectPrivacyAccepted = (state: RootState) =>
  state.booking.privacyAccepted;

export const selectMarketingAccepted = (state: RootState) =>
  state.booking.marketingAccepted;
