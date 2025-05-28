"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input/Input";
import { Select } from "@/components/ui/input/Select";
import useStore from "@/store";
import type { Store, ValidationState, ValidationActions } from "@/store/types";
import type { PassengerDetails } from "@/types/shared/user";
import { CountryAutocomplete } from "@/components/shared/CountryAutocomplete";
import { useTranslation } from "@/hooks/useTranslation";
import { shallow } from "zustand/shallow";
import { ValidationPhase } from "@/types/shared/validation";

// Add the missing fields to PassengerDetails for this form
interface ExtendedPassengerDetails extends PassengerDetails {
  salutation: string;
}

const COUNTRY_OPTIONS_DE = [
  // EU Countries
  { value: "Deutschland", label: "Deutschland", germanName: "Deutschland" },
  { value: "BEL", label: "Belgien", germanName: "Belgien" },
  { value: "BGR", label: "Bulgarien", germanName: "Bulgarien" },
  { value: "DNK", label: "Dänemark", germanName: "Dänemark" },
  { value: "EST", label: "Estland", germanName: "Estland" },
  { value: "FIN", label: "Finnland", germanName: "Finnland" },
  { value: "FRA", label: "Frankreich", germanName: "Frankreich" },
  { value: "GRC", label: "Griechenland", germanName: "Griechenland" },
  { value: "IRL", label: "Irland", germanName: "Irland" },
  { value: "ITA", label: "Italien", germanName: "Italien" },
  { value: "HRV", label: "Kroatien", germanName: "Kroatien" },
  { value: "LVA", label: "Lettland", germanName: "Lettland" },
  { value: "LTU", label: "Litauen", germanName: "Litauen" },
  { value: "LUX", label: "Luxemburg", germanName: "Luxemburg" },
  { value: "MLT", label: "Malta", germanName: "Malta" },
  { value: "NLD", label: "Niederlande", germanName: "Niederlande" },
  { value: "AUT", label: "Österreich", germanName: "Österreich" },
  { value: "POL", label: "Polen", germanName: "Polen" },
  { value: "PRT", label: "Portugal", germanName: "Portugal" },
  { value: "ROU", label: "Rumänien", germanName: "Rumänien" },
  { value: "SWE", label: "Schweden", germanName: "Schweden" },
  { value: "SVK", label: "Slowakei", germanName: "Slowakei" },
  { value: "SVN", label: "Slowenien", germanName: "Slowenien" },
  { value: "ESP", label: "Spanien", germanName: "Spanien" },
  { value: "CZE", label: "Tschechien", germanName: "Tschechien" },
  { value: "HUN", label: "Ungarn", germanName: "Ungarn" },
  { value: "CYP", label: "Zypern", germanName: "Zypern" },
  // Non-EU European countries
  { value: "GBR", label: "Großbritannien", germanName: "Großbritannien" },
  { value: "CHE", label: "Schweiz", germanName: "Schweiz" },
  { value: "NOR", label: "Norwegen", germanName: "Norwegen" },
  { value: "ISL", label: "Island", germanName: "Island" },
  { value: "LIE", label: "Liechtenstein", germanName: "Liechtenstein" },
  // Rest of the World (in German)
  { value: "EGY", label: "Ägypten", germanName: "Ägypten" },
  { value: "ARG", label: "Argentinien", germanName: "Argentinien" },
  { value: "AUS", label: "Australien", germanName: "Australien" },
  { value: "BRA", label: "Brasilien", germanName: "Brasilien" },
  { value: "CHL", label: "Chile", germanName: "Chile" },
  { value: "CHN", label: "China", germanName: "China" },
  { value: "IND", label: "Indien", germanName: "Indien" },
  { value: "IDN", label: "Indonesien", germanName: "Indonesien" },
  { value: "ISR", label: "Israel", germanName: "Israel" },
  { value: "JPN", label: "Japan", germanName: "Japan" },
  { value: "CAN", label: "Kanada", germanName: "Kanada" },
  { value: "COL", label: "Kolumbien", germanName: "Kolumbien" },
  { value: "KOR", label: "Korea, Republik", germanName: "Korea, Republik" },
  { value: "MYS", label: "Malaysia", germanName: "Malaysia" },
  { value: "MEX", label: "Mexiko", germanName: "Mexiko" },
  { value: "NZL", label: "Neuseeland", germanName: "Neuseeland" },
  { value: "PAK", label: "Pakistan", germanName: "Pakistan" },
  { value: "PHL", label: "Philippinen", germanName: "Philippinen" },
  { value: "RUS", label: "Russland", germanName: "Russland" },
  { value: "SAU", label: "Saudi-Arabien", germanName: "Saudi-Arabien" },
  { value: "SGP", label: "Singapur", germanName: "Singapur" },
  { value: "ZAF", label: "Südafrika", germanName: "Südafrika" },
  { value: "THA", label: "Thailand", germanName: "Thailand" },
  { value: "TUR", label: "Türkei", germanName: "Türkei" },
  {
    value: "ARE",
    label: "Vereinigte Arabische Emirate",
    germanName: "Vereinigte Arabische Emirate",
  },
  {
    value: "USA",
    label: "Vereinigte Staaten",
    germanName: "Vereinigte Staaten",
  },
  { value: "VNM", label: "Vietnam", germanName: "Vietnam" },
];

const COUNTRY_OPTIONS_EN = [
  // EU Countries
  { value: "Deutschland", label: "Germany", germanName: "Deutschland" },
  { value: "BEL", label: "Belgium", germanName: "Belgien" },
  { value: "BGR", label: "Bulgaria", germanName: "Bulgarien" },
  { value: "DNK", label: "Denmark", germanName: "Dänemark" },
  { value: "EST", label: "Estonia", germanName: "Estland" },
  { value: "FIN", label: "Finland", germanName: "Finnland" },
  { value: "FRA", label: "France", germanName: "Frankreich" },
  { value: "GRC", label: "Greece", germanName: "Griechenland" },
  { value: "IRL", label: "Ireland", germanName: "Irland" },
  { value: "ITA", label: "Italy", germanName: "Italien" },
  { value: "HRV", label: "Croatia", germanName: "Kroatien" },
  { value: "LVA", label: "Latvia", germanName: "Lettland" },
  { value: "LTU", label: "Lithuania", germanName: "Litauen" },
  { value: "LUX", label: "Luxembourg", germanName: "Luxemburg" },
  { value: "MLT", label: "Malta", germanName: "Malta" },
  { value: "NLD", label: "Netherlands", germanName: "Niederlande" },
  { value: "AUT", label: "Austria", germanName: "Österreich" },
  { value: "POL", label: "Poland", germanName: "Polen" },
  { value: "PRT", label: "Portugal", germanName: "Portugal" },
  { value: "ROU", label: "Romania", germanName: "Rumänien" },
  { value: "SWE", label: "Sweden", germanName: "Schweden" },
  { value: "SVK", label: "Slovakia", germanName: "Slowakei" },
  { value: "SVN", label: "Slovenia", germanName: "Slowenien" },
  { value: "ESP", label: "Spain", germanName: "Spanien" },
  { value: "CZE", label: "Czech Republic", germanName: "Tschechien" },
  { value: "HUN", label: "Hungary", germanName: "Ungarn" },
  { value: "CYP", label: "Cyprus", germanName: "Zypern" },
  // Non-EU European countries
  { value: "GBR", label: "United Kingdom", germanName: "Großbritannien" },
  { value: "CHE", label: "Switzerland", germanName: "Schweiz" },
  { value: "NOR", label: "Norway", germanName: "Norwegen" },
  { value: "ISL", label: "Iceland", germanName: "Island" },
  { value: "LIE", label: "Liechtenstein", germanName: "Liechtenstein" },
  // Rest of the World (in English)
  { value: "EGY", label: "Egypt", germanName: "Ägypten" },
  { value: "ARG", label: "Argentina", germanName: "Argentinien" },
  { value: "AUS", label: "Australia", germanName: "Australien" },
  { value: "BRA", label: "Brazil", germanName: "Brasilien" },
  { value: "CHL", label: "Chile", germanName: "Chile" },
  { value: "CHN", label: "China", germanName: "China" },
  { value: "IND", label: "India", germanName: "Indien" },
  { value: "IDN", label: "Indonesia", germanName: "Indonesien" },
  { value: "ISR", label: "Israel", germanName: "Israel" },
  { value: "JPN", label: "Japan", germanName: "Japan" },
  { value: "CAN", label: "Canada", germanName: "Kanada" },
  { value: "COL", label: "Colombia", germanName: "Kolumbien" },
  { value: "KOR", label: "Republic of Korea", germanName: "Korea, Republik" },
  { value: "MYS", label: "Malaysia", germanName: "Malaysia" },
  { value: "MEX", label: "Mexico", germanName: "Mexiko" },
  { value: "NZL", label: "New Zealand", germanName: "Neuseeland" },
  { value: "PAK", label: "Pakistan", germanName: "Pakistan" },
  { value: "PHL", label: "Philippines", germanName: "Philippinen" },
  { value: "RUS", label: "Russia", germanName: "Russland" },
  { value: "SAU", label: "Saudi Arabia", germanName: "Saudi-Arabien" },
  { value: "SGP", label: "Singapore", germanName: "Singapur" },
  { value: "ZAF", label: "South Africa", germanName: "Südafrika" },
  { value: "THA", label: "Thailand", germanName: "Thailand" },
  { value: "TUR", label: "Turkey", germanName: "Türkei" },
  {
    value: "ARE",
    label: "United Arab Emirates",
    germanName: "Vereinigte Arabische Emirate",
  },
  { value: "USA", label: "United States", germanName: "Vereinigte Staaten" },
  { value: "VNM", label: "Vietnam", germanName: "Vietnam" },
];

interface PersonalDetailsFormProps {
  onComplete: (details: ExtendedPassengerDetails | null) => void;
  onInteract?: () => void;
  isClaimSuccess?: boolean;
  showAdditionalFields?: boolean;
  formRef?: React.RefObject<{
    validate: () => boolean;
  }>;
}

// Helper to map numeric stepId to ValidationPhase
const mapStepIdToPhase = (stepId: 1 | 3): ValidationPhase => {
  return stepId === 1
    ? ValidationPhase.AGREEMENT
    : ValidationPhase.PERSONAL_DETAILS;
};

// Define the type for the selected state and actions
interface SelectedStoreState {
  personalDetails: ExtendedPassengerDetails | null;
  setPersonalDetails: (details: ExtendedPassengerDetails) => void;
  validationState: ValidationState;
  // Select specific validation actions needed
  setStepValidation: ValidationActions["setStepValidation"];
  setStepInteraction: ValidationActions["setStepInteraction"];
  setStepCompleted: ValidationActions["setStepCompleted"];
  addFieldError: ValidationActions["addFieldError"];
  clearFieldErrors: ValidationActions["clearFieldErrors"];
  currentPhase: ValidationPhase | null;
}

// Helper function to safely access nested properties
const getNestedValue = (
  obj: ExtendedPassengerDetails | null,
  path: string
): string => {
  if (!obj) return "";

  const parts = path.split(".");
  let current: any = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return "";
    current = current[part];
  }

  return current || "";
};

// Helper function to set nested properties
const setNestedValue = (
  obj: ExtendedPassengerDetails,
  path: string,
  value: string
): ExtendedPassengerDetails => {
  const result = { ...obj };
  const parts = path.split(".");

  let current: any = result;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    current[part] = current[part] ? { ...current[part] } : {};
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
  return result;
};

// Remove validation control interface and global state

export const PersonalDetailsForm: React.FC<PersonalDetailsFormProps> = ({
  onComplete,
  onInteract,
  isClaimSuccess = false,
  showAdditionalFields = false,
  formRef,
}) => {
  const { t, lang } = useTranslation();
  const [shouldValidate, setShouldValidate] = useState(false);
  const [requiredFieldsFilled, setRequiredFieldsFilled] = useState(false);
  const hasAppliedSalutationAutofill = useRef(false);
  const [stableValidationState, setStableValidationState] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const isValidationLocked = useRef(false);
  const isUpdatingFields = useRef(false);
  const mountTimeRef = useRef(Date.now());

  const personalDetails = useStore(
    useCallback(
      (state) => state.user.details as ExtendedPassengerDetails | null,
      []
    )
  );
  const setPersonalDetails = useStore(
    useCallback((state) => state.actions.user.setUserDetails, [])
  );
  const validationState = useStore(
    useCallback((state) => state.validation, [])
  );
  const setStepValidation = useStore(
    useCallback((state) => state.actions.validation.setStepValidation, [])
  );
  const setStepInteraction = useStore(
    useCallback((state) => state.actions.validation.setStepInteraction, [])
  );
  const setStepCompleted = useStore(
    useCallback((state) => state.actions.validation.setStepCompleted, [])
  );
  const addFieldError = useStore(
    useCallback((state) => state.actions.validation.addFieldError, [])
  );
  const clearFieldErrors = useStore(
    useCallback((state) => state.actions.validation.clearFieldErrors, [])
  );
  const currentPhase = useStore(
    useCallback((state) => state.navigation.currentPhase, [])
  );

  const stepId =
    currentPhase === ValidationPhase.AGREEMENT ||
    currentPhase === ValidationPhase.CLAIM_SUBMITTED
      ? 1
      : 3;
  const currentValidationPhase = mapStepIdToPhase(stepId);
  const otherValidationPhase = mapStepIdToPhase(stepId === 1 ? 3 : 1);

  const interactionRef = React.useRef(false);
  const onCompleteCalledRef = useRef(false);
  const updatingRef = useRef(false);

  // Add debounce logic for email validation
  const emailDebounceRef = useRef<NodeJS.Timeout | null>(null);
  // Add debounce for validation updates
  const validationUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Add a ref for autofillable input elements to monitor for autofill
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  // Add refs for name fields
  const firstNameInputRef = useRef<HTMLInputElement | null>(null);
  const lastNameInputRef = useRef<HTMLInputElement | null>(null);
  // Add ref for salutation
  const salutationSelectRef = useRef<HTMLSelectElement | null>(null);
  // Add ref to track if we've detected a stable salutation value
  const stableSalutationRef = useRef<string | null>(null);
  // Add debounce timer for salutation changes
  const salutationDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Store last form data to check if anything changed
  const lastFormDataRef = useRef<ExtendedPassengerDetails | null>(null);

  const getRequiredFields = useCallback(() => {
    return isClaimSuccess
      ? [
          "salutation",
          "firstName",
          "lastName",
          "email",
          "phone",
          "address.street",
          "address.postalCode",
          "address.city",
          "address.country",
        ]
      : ["salutation", "firstName", "lastName", "email"];
  }, [isClaimSuccess]);

  const validateFormWithDetails = useCallback(
    (isStrict: boolean, detailsToValidate: ExtendedPassengerDetails | null) => {
      console.log(
        `[validateFormWithDetails] Starting validation, isStrict: ${isStrict}`
      );

      if (!detailsToValidate) return false;

      // Check each required field individually and log which ones are missing
      const requiredFields = getRequiredFields();
      const fieldValidations = requiredFields.map((field) => {
        const value = getNestedValue(detailsToValidate, field);
        const isValid =
          value && typeof value === "string"
            ? value.trim().length > 0
            : !!value;

        if (!isValid) {
          console.log(`Field '${field}' validation failed: value=${value}`);
        }
        return { field, isValid };
      });

      // Check if all required fields are valid
      const hasAllRequiredFields = fieldValidations.every(
        ({ isValid }) => isValid
      );

      // Validate email format if present
      let isEmailValid = true;
      const emailValue = detailsToValidate.email || "";
      if (emailValue.trim() !== "") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        isEmailValid = emailRegex.test(emailValue);
        console.log(
          `[validateFormWithDetails] Email validation: ${isEmailValid} for "${emailValue}"`
        );
      } else if (requiredFields.includes("email")) {
        isEmailValid = false;
      }

      // Check address fields only when isClaimSuccess is true
      let hasRequiredAddressFields = true;
      if (isClaimSuccess) {
        const street = getNestedValue(
          detailsToValidate,
          "address.street"
        )?.trim();
        const postalCode = getNestedValue(
          detailsToValidate,
          "address.postalCode"
        )?.trim();
        const city = getNestedValue(detailsToValidate, "address.city")?.trim();
        const country = getNestedValue(
          detailsToValidate,
          "address.country"
        )?.trim();

        hasRequiredAddressFields =
          !!street && !!postalCode && !!city && !!country;
      }

      // The form is valid if all conditions are met
      const isValid =
        hasAllRequiredFields &&
        isEmailValid &&
        (!isClaimSuccess || hasRequiredAddressFields);

      console.log(
        `[validateFormWithDetails] Final validation result: ${isValid}`
      );
      return isValid;
    },
    [getRequiredFields, isClaimSuccess]
  );

  const validateForm = useCallback(() => {
    // If validation is locked, always return true
    if (isValidationLocked.current) {
      return true;
    }

    // This now respects shouldValidate to prevent premature validation
    return validateFormWithDetails(shouldValidate, personalDetails);
  }, [shouldValidate, personalDetails, validateFormWithDetails]);

  // Create a debounced validation updater
  const debouncedUpdateValidation = useCallback((isValid: boolean) => {
    if (validationUpdateTimerRef.current) {
      clearTimeout(validationUpdateTimerRef.current);
    }
    validationUpdateTimerRef.current = setTimeout(() => {
      console.log(
        `[debouncedUpdateValidation] setTimeout fired. isValid: ${isValid}. Current isValidationLocked.current (at timeout): ${isValidationLocked.current}`
      );
      // The primary decision to update the store should be based on `isValid`.
      // The lock state (isValidationLocked.current) is managed by handleInputChange and updateStoreValidation itself.
      updateStoreValidation(isValid);
    }, 300);
  }, []);

  // Separate function to update store validation
  const updateStoreValidation = useCallback(
    (isValid: boolean) => {
      console.log(
        `🔴🔴🔴 [updateStoreValidation] isValid: ${isValid}, currentPhase: ${currentValidationPhase}`
      );

      // SIMPLIFIED: Always update the store validation states directly
      if (setStepValidation) {
        setStepValidation(currentValidationPhase, isValid);
        setStepValidation(otherValidationPhase, isValid);
        setStepValidation(ValidationPhase.PERSONAL_DETAILS, isValid);
        setStepValidation(`STEP_${stepId}` as ValidationPhase, isValid);
      }

      // Always set step interaction regardless of validity
      if (setStepInteraction) {
        setStepInteraction(currentValidationPhase, true);
        setStepInteraction(otherValidationPhase, true);
        setStepInteraction(ValidationPhase.PERSONAL_DETAILS, true);
        setStepInteraction(`STEP_${stepId}` as ValidationPhase, true);
      }

      // Always set step completed based on validity
      if (setStepCompleted) {
        console.log(
          `[updateStoreValidation] Setting completed to ${isValid} for all phases`
        );
        // IMPORTANT: isCompleted must always match isValid to prevent UI inconsistencies
        setStepCompleted(currentValidationPhase, isValid);
        setStepCompleted(otherValidationPhase, isValid);
        setStepCompleted(ValidationPhase.PERSONAL_DETAILS, isValid);
        setStepCompleted(`STEP_${stepId}` as ValidationPhase, isValid);
      }

      // Update local state
      isValidationLocked.current = isValid;
      setStableValidationState(isValid);
    },
    [
      currentValidationPhase,
      otherValidationPhase,
      setStepCompleted,
      setStepInteraction,
      setStepValidation,
      stepId,
    ]
  );

  /**
   * Updates the validation state, triggering a debounced update to the store
   */
  const updateValidationState = useCallback(
    (
      isValid: boolean,
      detailsToCompleteWith?: ExtendedPassengerDetails | null
    ): void => {
      console.log(
        `[updateValidationState] Called with isValid=${isValid}, isValidationLocked.current=${isValidationLocked.current}`
      );

      // If validation is locked and we're trying to set it as valid, don't do anything
      // This prevents flickering when field receives focus then immediately loses it
      if (isValidationLocked.current && isValid) {
        console.log(
          "[updateValidationState] Validation locked, only updating state for valid form"
        );
        return;
      }

      // If validation is locked but the form is now INVALID, we should unlock
      // This is critical for handling cases where a previously valid form becomes invalid
      if (isValidationLocked.current && !isValid) {
        console.log(
          "[updateValidationState] Form is now invalid, unlocking validation to allow updates"
        );
        isValidationLocked.current = false;
      }

      // Update local validation state
      if (detailsToCompleteWith) {
        if (isValid) {
          console.log(
            "[updateValidationState] Form is valid, calling onComplete with:",
            JSON.stringify(detailsToCompleteWith, null, 2)
          );
          onComplete && onComplete(detailsToCompleteWith);
        } else {
          console.log(
            "[updateValidationState] Form is invalid, not calling onComplete"
          );
        }
      }

      // Clear any existing timeout for validation update
      if (validationUpdateTimerRef.current) {
        clearTimeout(validationUpdateTimerRef.current);
      }

      // Immediately update the store for invalid state
      if (!isValid) {
        console.log(
          "[updateValidationState] Form is invalid, immediately updating store with false"
        );
        updateStoreValidation(false);
        return;
      }

      // For valid state, use debounce to prevent flickering during rapid changes
      validationUpdateTimerRef.current = setTimeout(() => {
        console.log(
          `[debouncedUpdateValidation] setTimeout fired. isValid: ${isValid}. Current isValidationLocked.current (at timeout): ${isValidationLocked.current}`
        );
        updateStoreValidation(isValid);
      }, 300);
    },
    [onComplete, updateStoreValidation]
  );

  // Function to handle autofill detection for any field
  const handleFieldAutofill = useCallback(
    (fieldName: string, newValue: string) => {
      // Skip events that happen too soon after mount
      if (Date.now() - mountTimeRef.current < 100) {
        return;
      }

      // Set updating flag to prevent validation during changes
      isUpdatingFields.current = true;

      // Special handling for salutation to prevent flickering
      if (fieldName === "salutation") {
        // Always store the latest non-empty salutation value as stable
        if (
          newValue &&
          (!stableSalutationRef.current ||
            stableSalutationRef.current !== newValue)
        ) {
          console.log(
            `[PersonalDetailsForm] New stable salutation value: "${newValue}"`
          );
          stableSalutationRef.current = newValue;

          // Clear any existing timer
          if (salutationDebounceRef.current) {
            clearTimeout(salutationDebounceRef.current);
          }

          // Immediately update the state to prevent flickering
          const updatedDetails = personalDetails
            ? setNestedValue({ ...personalDetails }, fieldName, newValue)
            : setNestedValue(
                {
                  salutation: "",
                  firstName: "",
                  lastName: "",
                  email: "",
                  phone: "",
                  address: {
                    street: "",
                    postalCode: "",
                    city: "",
                    country: "",
                    state: "",
                  },
                } as ExtendedPassengerDetails,
                fieldName,
                newValue
              );

          updatingRef.current = true;
          setPersonalDetails(updatedDetails);
          updatingRef.current = false;

          // Update last form data
          lastFormDataRef.current = updatedDetails;

          // Clear the updating flag
          isUpdatingFields.current = false;
          return;
        }
      }

      // Skip if value is empty or unchanged
      if (
        !newValue ||
        (personalDetails &&
          getNestedValue(personalDetails, fieldName) === newValue)
      ) {
        isUpdatingFields.current = false;
        return;
      }

      console.log(
        `[PersonalDetailsForm] Detected autofill for ${fieldName}: "${newValue}"`
      );

      // Update our state with the autofilled value
      const newDetails = personalDetails
        ? setNestedValue({ ...personalDetails }, fieldName, newValue)
        : setNestedValue(
            {
              salutation: "",
              firstName: "",
              lastName: "",
              email: "",
              phone: "",
              address: {
                street: "",
                postalCode: "",
                city: "",
                country: "",
                state: "",
              },
            } as ExtendedPassengerDetails,
            fieldName,
            newValue
          );

      // Use updatingRef to prevent other effects from interfering
      updatingRef.current = true;
      setPersonalDetails(newDetails);
      updatingRef.current = false;

      // Update last form data
      lastFormDataRef.current = newDetails;

      // Clear the updating flag before validation
      isUpdatingFields.current = false;

      // Only perform validation after the React update cycle
      setTimeout(() => {
        // Force validation check if the form is now complete
        const isValid = validateFormWithDetails(true, newDetails);
        if (isValid) {
          updateValidationState(isValid, newDetails);
        }
      }, 100);
    },
    [
      personalDetails,
      setPersonalDetails,
      validateFormWithDetails,
      updateValidationState,
    ]
  );

  // Effect specifically for monitoring autofill on all personal details fields
  React.useEffect(() => {
    // Find all input elements in the personal details form
    const emailInput = document.querySelector('input[type="email"]');
    const firstNameInput = document.querySelector('input[name="firstName"]');
    const lastNameInput = document.querySelector('input[name="lastName"]');
    const salutationSelect = document.querySelector(
      'select[name="salutation"]'
    );

    // Store in refs for later use
    if (emailInput) emailInputRef.current = emailInput as HTMLInputElement;
    if (firstNameInput)
      firstNameInputRef.current = firstNameInput as HTMLInputElement;
    if (lastNameInput)
      lastNameInputRef.current = lastNameInput as HTMLInputElement;
    if (salutationSelect)
      salutationSelectRef.current = salutationSelect as HTMLSelectElement;

    console.log(
      "[PersonalDetailsForm] Setting up autofill detection for all fields"
    );

    // Check all form fields at once for a more comprehensive validation
    const checkFormCompletion = () => {
      // Skip the check if validation is already locked
      if (isValidationLocked.current) {
        return;
      }

      // Mark fields as updating
      isUpdatingFields.current = true;

      // Check all fields together
      const currentValues = {
        salutation:
          salutationSelectRef.current?.value ||
          stableSalutationRef.current ||
          "",
        firstName: firstNameInputRef.current?.value || "",
        lastName: lastNameInputRef.current?.value || "",
        email: emailInputRef.current?.value || "",
      };

      // Only proceed if we have at least one value
      if (Object.values(currentValues).some((v) => v)) {
        console.log(
          "[checkFormCompletion] Checking form with values:",
          currentValues
        );

        // Create a new details object with all current values
        const newDetails = personalDetails
          ? {
              ...personalDetails,
              ...currentValues,
            }
          : ({
              ...currentValues,
              phone: "",
              address: {
                street: "",
                postalCode: "",
                city: "",
                country: "",
                state: "",
              },
            } as ExtendedPassengerDetails);

        // Update the state if needed
        const needsUpdate =
          !personalDetails ||
          Object.entries(currentValues).some(
            ([key, value]) =>
              value && getNestedValue(personalDetails, key) !== value
          );

        if (needsUpdate) {
          console.log("[checkFormCompletion] Updating state with new values");
          updatingRef.current = true;
          setPersonalDetails(newDetails);
          updatingRef.current = false;

          if (currentValues.salutation) {
            stableSalutationRef.current = currentValues.salutation;
          }
        }

        // Done updating fields
        isUpdatingFields.current = false;

        // Check if form is now valid
        const isValid = validateFormWithDetails(true, newDetails);
        if (isValid) {
          console.log("[checkFormCompletion] Form is now valid");
          updateValidationState(isValid, newDetails);
        }
      } else {
        isUpdatingFields.current = false;
      }
    };

    // The main polling function to detect autofilled values
    const checkForAutofill = () => {
      // Skip if validation is already locked
      if (isValidationLocked.current) {
        return;
      }

      // Flag that we're updating fields
      isUpdatingFields.current = true;

      // Check salutation field first as it's most problematic
      if (salutationSelectRef.current && salutationSelectRef.current.value) {
        stableSalutationRef.current = salutationSelectRef.current.value;
        handleFieldAutofill("salutation", salutationSelectRef.current.value);
      }

      // Check email field
      if (emailInputRef.current && emailInputRef.current.value) {
        handleFieldAutofill("email", emailInputRef.current.value);
      }

      // Check first name field
      if (firstNameInputRef.current && firstNameInputRef.current.value) {
        handleFieldAutofill("firstName", firstNameInputRef.current.value);
      }

      // Check last name field
      if (lastNameInputRef.current && lastNameInputRef.current.value) {
        handleFieldAutofill("lastName", lastNameInputRef.current.value);
      }

      // Done updating fields
      isUpdatingFields.current = false;

      // Do a complete form validation after checking individual fields
      setTimeout(checkFormCompletion, 200);
    };

    // Different browsers handle autofill differently, so we need multiple approaches

    // 1. One-time checks after the page loads
    setTimeout(checkForAutofill, 500); // Short initial delay
    setTimeout(checkForAutofill, 1000); // Try again after 1 second
    setTimeout(checkForAutofill, 2000); // And again after 2 seconds

    // 2. Create a mutation observer to watch for autofill-related DOM changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          (mutation.attributeName === "value" ||
            mutation.attributeName === "style")
        ) {
          checkForAutofill();
        }
      });
    });

    // Watch for attribute changes on all input fields that might indicate autofill
    [
      emailInputRef.current,
      firstNameInputRef.current,
      lastNameInputRef.current,
      salutationSelectRef.current,
    ].forEach((input) => {
      if (input) {
        observer.observe(input, {
          attributes: true,
          attributeFilter: ["value", "style"],
        });
      }
    });

    // 3. Direct event listeners for input events
    const handleInputChange = () => checkForAutofill();

    // Experimental: detect webkit autofill animation
    const handleAnimation = (e: AnimationEvent) => {
      if (e.animationName.includes("webkit-autofill")) {
        console.log("[PersonalDetailsForm] Detected webkit-autofill animation");
        checkForAutofill();
      }
    };

    // Add listeners to all inputs
    [
      emailInputRef.current,
      firstNameInputRef.current,
      lastNameInputRef.current,
      salutationSelectRef.current,
    ].forEach((input) => {
      if (input) {
        input.addEventListener("input", handleInputChange);
        input.addEventListener("change", handleInputChange);
        input.addEventListener("animationstart", handleAnimation as any);
      }
    });

    // Clean up all listeners when component unmounts
    return () => {
      observer.disconnect();

      [
        emailInputRef.current,
        firstNameInputRef.current,
        lastNameInputRef.current,
        salutationSelectRef.current,
      ].forEach((input) => {
        if (input) {
          input.removeEventListener("input", handleInputChange);
          input.removeEventListener("change", handleInputChange);
          input.removeEventListener("animationstart", handleAnimation as any);
        }
      });
    };
  }, [
    handleFieldAutofill,
    personalDetails,
    validateFormWithDetails,
    updateValidationState,
  ]);

  // Special effect to enforce stable salutation value
  React.useEffect(() => {
    // If we have a stable salutation value but the DOM or React state doesn't reflect it, enforce it
    const enforceSalutation = () => {
      // Skip if no stable value
      if (!stableSalutationRef.current) return;

      // Check DOM first
      if (
        salutationSelectRef.current &&
        salutationSelectRef.current.value !== stableSalutationRef.current
      ) {
        salutationSelectRef.current.value = stableSalutationRef.current;
      }

      // Then check React state
      if (
        !personalDetails?.salutation ||
        personalDetails.salutation !== stableSalutationRef.current
      ) {
        const updatedDetails = personalDetails
          ? { ...personalDetails, salutation: stableSalutationRef.current }
          : ({
              salutation: stableSalutationRef.current,
              firstName: "",
              lastName: "",
              email: "",
              phone: "",
              address: {
                street: "",
                postalCode: "",
                city: "",
                country: "",
                state: "",
              },
            } as ExtendedPassengerDetails);

        // Update state without triggering validation
        updatingRef.current = true;
        setPersonalDetails(updatedDetails);
        updatingRef.current = false;
      }
    };

    // Run immediately
    enforceSalutation();

    // And also on a timer to catch any changes after autocomplete
    const intervalId = setInterval(enforceSalutation, 500);

    return () => clearInterval(intervalId);
  }, [personalDetails, setPersonalDetails]);

  // Initialize the form on mount
  React.useEffect(() => {
    // Store mount timestamp
    mountTimeRef.current = Date.now();

    // Check if form is already valid
    if (personalDetails) {
      const isFullyFilledAndStrictlyValid = validateFormWithDetails(
        true,
        personalDetails
      );
      if (isFullyFilledAndStrictlyValid) {
        setShouldValidate(true);
        isValidationLocked.current = true;
        setStableValidationState(true);

        // Update the validation state in the store
        updateStoreValidation(true);
      }
      if (!interactionRef.current) {
        interactionRef.current = true;
        onInteract?.();
      }
    }

    return () => {
      // Clean up debounce timers on unmount
      if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
      if (salutationDebounceRef.current)
        clearTimeout(salutationDebounceRef.current);
      if (validationUpdateTimerRef.current)
        clearTimeout(validationUpdateTimerRef.current);
    };
  }, []); // Run once on mount

  // Trigger validation when explicitly requested
  const triggerValidation = useCallback(() => {
    setShouldValidate(true);
    const isValid = validateFormWithDetails(true, personalDetails);
    updateValidationState(isValid, personalDetails);
    return isValid;
  }, [personalDetails, validateFormWithDetails, updateValidationState]);

  // Expose validation function to parent
  React.useImperativeHandle(formRef, () => ({ validate: triggerValidation }), [
    triggerValidation,
  ]);

  // Ensure form fields don't get cleared on autofill by intercepting React's value prop
  const getFieldValue = useCallback(
    (
      fieldName: string
      // ref: React.RefObject<HTMLInputElement | HTMLSelectElement | null> // Ref parameter no longer needed for value retrieval
    ) => {
      // Always return the state value normally
      return personalDetails ? getNestedValue(personalDetails, fieldName) : "";
    },
    [personalDetails]
  );

  const getEmailValue = useCallback(() => {
    return getFieldValue("email");
  }, [getFieldValue]);

  const getFirstNameValue = useCallback(() => {
    return getFieldValue("firstName");
  }, [getFieldValue]);

  const getLastNameValue = useCallback(() => {
    return getFieldValue("lastName");
  }, [getFieldValue]);

  // Enhanced version to prioritize stable salutation values
  const getSalutationValue = useCallback(() => {
    // First priority: Stable ref if it has a value (often set by autofill or direct interaction)
    if (stableSalutationRef.current) {
      return stableSalutationRef.current;
    }
    // Second priority: Value from Zustand store
    if (personalDetails?.salutation) {
      return personalDetails.salutation;
    }
    // Fallback if neither stableRef nor store has a value
    return "";
  }, [personalDetails?.salutation]); // Dependency on personalDetails.salutation

  const ensureInteractionTracked = useCallback(() => {
    if (!interactionRef.current && onInteract) {
      onInteract();
      interactionRef.current = true;
    }
  }, [onInteract]);

  // Replace the complex handleInputChange with a simpler version
  const handleInputChange = useCallback(
    (field: string, value: string) => {
      console.log(
        `[handleInputChange] Field '${field}' changing to '${value}'`
      );

      // Ensure interaction is tracked
      ensureInteractionTracked();

      // Create a new details object with the updated field
      const newDetails = setNestedValue(
        {
          ...personalDetails,
          salutation: personalDetails?.salutation || "",
          firstName: personalDetails?.firstName || "",
          lastName: personalDetails?.lastName || "",
          email: personalDetails?.email || "",
          phone: personalDetails?.phone || "",
          address: personalDetails?.address || {
            street: "",
            city: "",
            state: "",
            postalCode: "",
            country: "",
          },
        } as ExtendedPassengerDetails,
        field,
        value
      );

      // Always update the store with the new details
      setPersonalDetails(newDetails);

      // Validate the form with the new details immediately
      const isValid = validateFormWithDetails(true, newDetails);
      console.log(
        `[handleInputChange] Validation result after ${field} change: ${isValid}`
      );

      // Always update the store validation state
      updateStoreValidation(isValid);

      // Call onComplete with the appropriate value
      if (onComplete) {
        onComplete(isValid ? newDetails : null);
      }
    },
    [
      personalDetails,
      setPersonalDetails,
      ensureInteractionTracked,
      validateFormWithDetails,
      updateStoreValidation,
      onComplete,
    ]
  );

  // Initialize formData with store data or default, only once or if store changes significantly
  useEffect(() => {
    // if (personalDetails) {
    //   // Only set formData if it's different or not initialized yet to prevent loops
    //   // if (
    //   //   !hasInitialized ||
    //   //   JSON.stringify(personalDetails) !== JSON.stringify(personalDetails) // This comparison is problematic
    //   // ) {
    //   //   // setPersonalDetails(personalDetails); // This would cause a loop if personalDetails is from the store itself
    //   //   if (personalDetails.salutation) {
    //   //     // setLocalSalutation(personalDetails.salutation); // Remove localSalutation update
    //   //   }
    //   // }
    // } else {
    //   // Reset if personalDetails becomes null (e.g. user logs out or resets data)
    //   // setPersonalDetails(null); // This should be handled by the store action, not directly here if it causes issues
    //   // setLocalSalutation(""); // Remove localSalutation update
    // }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalDetails]); // Removed personalDetails from deps, hasInitialized handles loop prevention

  // Effect to mark as initialized after first mount and setup
  useEffect(() => {
    setHasInitialized(true);
  }, []);

  // Effect to call onInteract when the component has initialized and data might be ready
  useEffect(() => {
    if (hasInitialized && !stableValidationState && onInteract) {
      onInteract();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitialized, stableValidationState, onInteract]); // personalDetails removed to prevent loops on every keystroke

  // Function to check if all required fields are filled
  const checkFormCompletion = useCallback(
    (currentData: ExtendedPassengerDetails, isInitialCheck = false) => {
      if (!hasInitialized && isInitialCheck) {
        // If it's the initial check and we are not initialized, don't proceed to call onComplete(null)
        // as the form is not ready for such a determination yet.
        return;
      }

      // If we don't have data to validate, skip completely
      if (!currentData) {
        return;
      }

      console.log(
        "[checkFormCompletion] Checking form with values:",
        currentData
      );

      // First pass: Check if we have all the basic required fields
      const requiredFields = getRequiredFields();

      // Validate each required field
      let hasAllRequiredFields = true;
      requiredFields.forEach((field) => {
        const value = getNestedValue(currentData, field);
        const isFieldValid =
          value && typeof value === "string"
            ? value.trim().length > 0
            : !!value;

        if (!isFieldValid) {
          console.log(`Field '${field}' validation failed: value=${value}`);
          hasAllRequiredFields = false;
        }
      });

      // Validate email separately for format
      const emailValue = currentData.email || "";
      let isEmailValid = true;

      if (emailValue) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        isEmailValid = emailRegex.test(emailValue);
        console.log(
          "[validateFormWithDetails] Email validation:",
          isEmailValid,
          "for",
          emailValue,
          "(isStrict:",
          true,
          ", looksComplete:",
          true,
          ")"
        );
      } else {
        isEmailValid = false;
      }

      // Validate address fields separately when in claim success mode
      let hasRequiredAddressFields = true;
      if (isClaimSuccess) {
        hasRequiredAddressFields =
          !!getNestedValue(currentData, "address.street")?.trim() &&
          !!getNestedValue(currentData, "address.postalCode")?.trim() &&
          !!getNestedValue(currentData, "address.city")?.trim() &&
          !!getNestedValue(currentData, "address.country")?.trim();

        if (!hasRequiredAddressFields) {
          console.log(
            "[checkFormCompletion] Address fields validation failed:",
            {
              street: getNestedValue(currentData, "address.street"),
              postalCode: getNestedValue(currentData, "address.postalCode"),
              city: getNestedValue(currentData, "address.city"),
              country: getNestedValue(currentData, "address.country"),
            }
          );
        }
      }

      // The form is valid if all required fields are filled and the email is valid
      // AND address fields are valid when in claim success mode
      const isValid =
        hasAllRequiredFields &&
        isEmailValid &&
        (!isClaimSuccess || hasRequiredAddressFields);

      // Only update validation state and call onComplete if the form is valid
      if (isValid) {
        updateValidationState(true, currentData);
      } else {
        // Make sure we update validation state to false when invalid
        updateValidationState(false, null);
      }
    },
    [
      getRequiredFields,
      onComplete,
      updateValidationState,
      hasInitialized,
      isClaimSuccess,
    ]
  );

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => e.preventDefault()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Select
            label={t("personalDetails.salutation")}
            value={getSalutationValue()}
            onChange={(value) => handleInputChange("salutation", value)}
            error={validationState?.fieldErrors?.salutation?.[0]}
            options={[
              { value: "herr", label: t("salutation.mr") },
              { value: "frau", label: t("salutation.mrs") },
            ]}
            required={isClaimSuccess}
            name="salutation"
            id="salutation"
          />
        </div>
        <div>
          <Input
            label={t("personalDetails.firstName")}
            value={getFirstNameValue()}
            onChange={(value) => handleInputChange("firstName", value)}
            error={validationState?.fieldErrors?.firstName?.[0]}
            required={true}
            name="firstName"
            autocomplete="given-name"
          />
        </div>
        <div>
          <Input
            label={t("personalDetails.lastName")}
            value={getLastNameValue()}
            onChange={(value) => handleInputChange("lastName", value)}
            error={validationState?.fieldErrors?.lastName?.[0]}
            required={true}
            name="lastName"
            autocomplete="family-name"
          />
        </div>
        <div>
          <Input
            label={t("personalDetails.email")}
            type="email"
            value={getEmailValue()}
            onChange={(value) => handleInputChange("email", value)}
            error={validationState?.fieldErrors?.email?.[0]}
            required={true}
            autocomplete="email"
            name="email"
          />
        </div>
        {showAdditionalFields && (
          <>
            <div>
              <Input
                label={t("personalDetails.phone")}
                type="tel"
                value={personalDetails?.phone || ""}
                onChange={(value) => handleInputChange("phone", value)}
                error={validationState?.fieldErrors?.phone?.[0]}
                required={isClaimSuccess}
              />
            </div>
            <div>
              <Input
                label={t("personalDetails.address")}
                value={getNestedValue(personalDetails, "address.street")}
                onChange={(value) => handleInputChange("address.street", value)}
                error={validationState?.fieldErrors?.street?.[0]}
                required={isClaimSuccess}
              />
            </div>
            <div>
              <Input
                label={t("personalDetails.postalCode")}
                value={getNestedValue(personalDetails, "address.postalCode")}
                onChange={(value) =>
                  handleInputChange("address.postalCode", value)
                }
                error={validationState?.fieldErrors?.postalCode?.[0]}
                required={isClaimSuccess}
              />
            </div>
            <div>
              <Input
                label={t("personalDetails.city")}
                value={getNestedValue(personalDetails, "address.city")}
                onChange={(value) => handleInputChange("address.city", value)}
                error={validationState?.fieldErrors?.city?.[0]}
                required={isClaimSuccess}
              />
            </div>
            <div>
              <CountryAutocomplete
                label={t("personalDetails.country")}
                value={getNestedValue(personalDetails, "address.country")}
                onChange={(value: string) => {
                  if (!value || value.trim() === "") {
                    // Clear the country field
                    handleInputChange("address.country", "");
                    return;
                  }

                  // If we have a valid value, store it properly
                  const countryOptions =
                    lang === "en" ? COUNTRY_OPTIONS_EN : COUNTRY_OPTIONS_DE;
                  const selectedOption = countryOptions.find(
                    (opt) =>
                      opt.value === value ||
                      opt.label === value ||
                      opt.germanName === value
                  );

                  if (selectedOption) {
                    // Store the actual country name for display and API submission
                    console.log(
                      `[CountryAutocomplete] Selected country: ${selectedOption.label} (${value})`
                    );

                    // Use the appropriate value based on language
                    const countryValue =
                      lang === "en"
                        ? selectedOption.label
                        : selectedOption.germanName || selectedOption.label;

                    handleInputChange("address.country", countryValue);
                  } else {
                    // If not found in options but we have a value, use it as-is
                    console.log(
                      `[CountryAutocomplete] Using raw country value: ${value}`
                    );
                    handleInputChange("address.country", value);
                  }
                }}
                options={
                  lang === "en" ? COUNTRY_OPTIONS_EN : COUNTRY_OPTIONS_DE
                }
                error={validationState?.fieldErrors?.country?.[0]}
                required={isClaimSuccess}
              />
            </div>
          </>
        )}
      </div>
    </form>
  );
};
