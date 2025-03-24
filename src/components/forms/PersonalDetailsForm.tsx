'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { Input } from '../Input';
import { Select } from '../shared/Select';
import useStore from '@/lib/state/store';
import type { PassengerDetails } from '@/types/store';
import type { ValidationState, ValidationStep } from '@/lib/state/types';
import { CountryAutocomplete } from '../shared/CountryAutocomplete';
import { useTranslation } from '@/hooks/useTranslation';

const COUNTRY_OPTIONS_DE = [
  // EU Countries
  { value: 'Deutschland', label: 'Deutschland', germanName: 'Deutschland' },
  { value: 'BEL', label: 'Belgien', germanName: 'Belgien' },
  { value: 'BGR', label: 'Bulgarien', germanName: 'Bulgarien' },
  { value: 'DNK', label: 'Dänemark', germanName: 'Dänemark' },
  { value: 'EST', label: 'Estland', germanName: 'Estland' },
  { value: 'FIN', label: 'Finnland', germanName: 'Finnland' },
  { value: 'FRA', label: 'Frankreich', germanName: 'Frankreich' },
  { value: 'GRC', label: 'Griechenland', germanName: 'Griechenland' },
  { value: 'IRL', label: 'Irland', germanName: 'Irland' },
  { value: 'ITA', label: 'Italien', germanName: 'Italien' },
  { value: 'HRV', label: 'Kroatien', germanName: 'Kroatien' },
  { value: 'LVA', label: 'Lettland', germanName: 'Lettland' },
  { value: 'LTU', label: 'Litauen', germanName: 'Litauen' },
  { value: 'LUX', label: 'Luxemburg', germanName: 'Luxemburg' },
  { value: 'MLT', label: 'Malta', germanName: 'Malta' },
  { value: 'NLD', label: 'Niederlande', germanName: 'Niederlande' },
  { value: 'AUT', label: 'Österreich', germanName: 'Österreich' },
  { value: 'POL', label: 'Polen', germanName: 'Polen' },
  { value: 'PRT', label: 'Portugal', germanName: 'Portugal' },
  { value: 'ROU', label: 'Rumänien', germanName: 'Rumänien' },
  { value: 'SWE', label: 'Schweden', germanName: 'Schweden' },
  { value: 'SVK', label: 'Slowakei', germanName: 'Slowakei' },
  { value: 'SVN', label: 'Slowenien', germanName: 'Slowenien' },
  { value: 'ESP', label: 'Spanien', germanName: 'Spanien' },
  { value: 'CZE', label: 'Tschechien', germanName: 'Tschechien' },
  { value: 'HUN', label: 'Ungarn', germanName: 'Ungarn' },
  { value: 'CYP', label: 'Zypern', germanName: 'Zypern' },
  // Non-EU European countries
  { value: 'GBR', label: 'Großbritannien', germanName: 'Großbritannien' },
  { value: 'CHE', label: 'Schweiz', germanName: 'Schweiz' },
  { value: 'NOR', label: 'Norwegen', germanName: 'Norwegen' },
  { value: 'ISL', label: 'Island', germanName: 'Island' },
  { value: 'LIE', label: 'Liechtenstein', germanName: 'Liechtenstein' },
  // Rest of the World (in German)
  { value: 'EGY', label: 'Ägypten', germanName: 'Ägypten' },
  { value: 'ARG', label: 'Argentinien', germanName: 'Argentinien' },
  { value: 'AUS', label: 'Australien', germanName: 'Australien' },
  { value: 'BRA', label: 'Brasilien', germanName: 'Brasilien' },
  { value: 'CHL', label: 'Chile', germanName: 'Chile' },
  { value: 'CHN', label: 'China', germanName: 'China' },
  { value: 'IND', label: 'Indien', germanName: 'Indien' },
  { value: 'IDN', label: 'Indonesien', germanName: 'Indonesien' },
  { value: 'ISR', label: 'Israel', germanName: 'Israel' },
  { value: 'JPN', label: 'Japan', germanName: 'Japan' },
  { value: 'CAN', label: 'Kanada', germanName: 'Kanada' },
  { value: 'COL', label: 'Kolumbien', germanName: 'Kolumbien' },
  { value: 'KOR', label: 'Korea, Republik', germanName: 'Korea, Republik' },
  { value: 'MYS', label: 'Malaysia', germanName: 'Malaysia' },
  { value: 'MEX', label: 'Mexiko', germanName: 'Mexiko' },
  { value: 'NZL', label: 'Neuseeland', germanName: 'Neuseeland' },
  { value: 'PAK', label: 'Pakistan', germanName: 'Pakistan' },
  { value: 'PHL', label: 'Philippinen', germanName: 'Philippinen' },
  { value: 'RUS', label: 'Russland', germanName: 'Russland' },
  { value: 'SAU', label: 'Saudi-Arabien', germanName: 'Saudi-Arabien' },
  { value: 'SGP', label: 'Singapur', germanName: 'Singapur' },
  { value: 'ZAF', label: 'Südafrika', germanName: 'Südafrika' },
  { value: 'THA', label: 'Thailand', germanName: 'Thailand' },
  { value: 'TUR', label: 'Türkei', germanName: 'Türkei' },
  {
    value: 'ARE',
    label: 'Vereinigte Arabische Emirate',
    germanName: 'Vereinigte Arabische Emirate',
  },
  {
    value: 'USA',
    label: 'Vereinigte Staaten',
    germanName: 'Vereinigte Staaten',
  },
  { value: 'VNM', label: 'Vietnam', germanName: 'Vietnam' },
];

const COUNTRY_OPTIONS_EN = [
  // EU Countries
  { value: 'Deutschland', label: 'Germany', germanName: 'Deutschland' },
  { value: 'BEL', label: 'Belgium', germanName: 'Belgien' },
  { value: 'BGR', label: 'Bulgaria', germanName: 'Bulgarien' },
  { value: 'DNK', label: 'Denmark', germanName: 'Dänemark' },
  { value: 'EST', label: 'Estonia', germanName: 'Estland' },
  { value: 'FIN', label: 'Finland', germanName: 'Finnland' },
  { value: 'FRA', label: 'France', germanName: 'Frankreich' },
  { value: 'GRC', label: 'Greece', germanName: 'Griechenland' },
  { value: 'IRL', label: 'Ireland', germanName: 'Irland' },
  { value: 'ITA', label: 'Italy', germanName: 'Italien' },
  { value: 'HRV', label: 'Croatia', germanName: 'Kroatien' },
  { value: 'LVA', label: 'Latvia', germanName: 'Lettland' },
  { value: 'LTU', label: 'Lithuania', germanName: 'Litauen' },
  { value: 'LUX', label: 'Luxembourg', germanName: 'Luxemburg' },
  { value: 'MLT', label: 'Malta', germanName: 'Malta' },
  { value: 'NLD', label: 'Netherlands', germanName: 'Niederlande' },
  { value: 'AUT', label: 'Austria', germanName: 'Österreich' },
  { value: 'POL', label: 'Poland', germanName: 'Polen' },
  { value: 'PRT', label: 'Portugal', germanName: 'Portugal' },
  { value: 'ROU', label: 'Romania', germanName: 'Rumänien' },
  { value: 'SWE', label: 'Sweden', germanName: 'Schweden' },
  { value: 'SVK', label: 'Slovakia', germanName: 'Slowakei' },
  { value: 'SVN', label: 'Slovenia', germanName: 'Slowenien' },
  { value: 'ESP', label: 'Spain', germanName: 'Spanien' },
  { value: 'CZE', label: 'Czech Republic', germanName: 'Tschechien' },
  { value: 'HUN', label: 'Hungary', germanName: 'Ungarn' },
  { value: 'CYP', label: 'Cyprus', germanName: 'Zypern' },
  // Non-EU European countries
  { value: 'GBR', label: 'United Kingdom', germanName: 'Großbritannien' },
  { value: 'CHE', label: 'Switzerland', germanName: 'Schweiz' },
  { value: 'NOR', label: 'Norway', germanName: 'Norwegen' },
  { value: 'ISL', label: 'Iceland', germanName: 'Island' },
  { value: 'LIE', label: 'Liechtenstein', germanName: 'Liechtenstein' },
  // Rest of the World (in English)
  { value: 'EGY', label: 'Egypt', germanName: 'Ägypten' },
  { value: 'ARG', label: 'Argentina', germanName: 'Argentinien' },
  { value: 'AUS', label: 'Australia', germanName: 'Australien' },
  { value: 'BRA', label: 'Brazil', germanName: 'Brasilien' },
  { value: 'CHL', label: 'Chile', germanName: 'Chile' },
  { value: 'CHN', label: 'China', germanName: 'China' },
  { value: 'IND', label: 'India', germanName: 'Indien' },
  { value: 'IDN', label: 'Indonesia', germanName: 'Indonesien' },
  { value: 'ISR', label: 'Israel', germanName: 'Israel' },
  { value: 'JPN', label: 'Japan', germanName: 'Japan' },
  { value: 'CAN', label: 'Canada', germanName: 'Kanada' },
  { value: 'COL', label: 'Colombia', germanName: 'Kolumbien' },
  { value: 'KOR', label: 'Republic of Korea', germanName: 'Korea, Republik' },
  { value: 'MYS', label: 'Malaysia', germanName: 'Malaysia' },
  { value: 'MEX', label: 'Mexico', germanName: 'Mexiko' },
  { value: 'NZL', label: 'New Zealand', germanName: 'Neuseeland' },
  { value: 'PAK', label: 'Pakistan', germanName: 'Pakistan' },
  { value: 'PHL', label: 'Philippines', germanName: 'Philippinen' },
  { value: 'RUS', label: 'Russia', germanName: 'Russland' },
  { value: 'SAU', label: 'Saudi Arabia', germanName: 'Saudi-Arabien' },
  { value: 'SGP', label: 'Singapore', germanName: 'Singapur' },
  { value: 'ZAF', label: 'South Africa', germanName: 'Südafrika' },
  { value: 'THA', label: 'Thailand', germanName: 'Thailand' },
  { value: 'TUR', label: 'Turkey', germanName: 'Türkei' },
  {
    value: 'ARE',
    label: 'United Arab Emirates',
    germanName: 'Vereinigte Arabische Emirate',
  },
  { value: 'USA', label: 'United States', germanName: 'Vereinigte Staaten' },
  { value: 'VNM', label: 'Vietnam', germanName: 'Vietnam' },
];

interface PersonalDetailsFormProps {
  onComplete: (details: PassengerDetails | null) => void;
  onInteract?: () => void;
  isClaimSuccess?: boolean;
  showAdditionalFields?: boolean;
}

export const PersonalDetailsForm: React.FC<PersonalDetailsFormProps> = ({
  onComplete,
  onInteract,
  isClaimSuccess = false,
  showAdditionalFields = false,
}) => {
  const { t, lang } = useTranslation();
  const {
    personalDetails,
    setPersonalDetails,
    validationState,
    currentPhase,
  } = useStore();

  const stepId = currentPhase === 5 || currentPhase === 6 ? 1 : 3;
  const interactionRef = React.useRef(false);

  // Call onComplete if valid
  // Use a separate ref to track onComplete calls to prevent infinite loops
  const onCompleteCalledRef = useRef(false);

  // Handle initial load validation
  useEffect(() => {
    // Get current validation state
    const store = useStore.getState();
    const currentValidation = (store.validationState || {}) as ValidationState;

    // Try to load details from localStorage if we don't have them
    if (!personalDetails) {
      try {
        const savedState = localStorage.getItem('captain-frank-state');
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          if (parsedState.state?.personalDetails) {
            setPersonalDetails(parsedState.state.personalDetails);
            return; // Exit early as setPersonalDetails will trigger this effect again
          }
        }
      } catch (error) {
        console.error('Error loading personal details from localStorage:', error);
      }
    }

    // Get required fields based on claim success
    const requiredFields = isClaimSuccess
      ? ['salutation', 'firstName', 'lastName', 'email', 'phone', 'address', 'postalCode', 'city', 'country']
      : ['salutation', 'firstName', 'lastName', 'email'];

    // Check if we have stored values and required fields
    const hasStoredValues = !!personalDetails;
    const hasAllRequiredFields = hasStoredValues &&
      requiredFields.every((field) => {
        return personalDetails[field as keyof PassengerDetails];
      });

    // Check if email is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = !personalDetails?.email || emailRegex.test(personalDetails.email);

    // Determine if form is valid
    const isValid = hasStoredValues && hasAllRequiredFields && isEmailValid;

    // Update validation state
    if (
      currentValidation.stepValidation?.[stepId] !== isValid ||
      currentValidation.isPersonalValid !== isValid
    ) {
      // Update validation state with more thorough approach
      store.updateValidationState({
        stepValidation: {
          ...currentValidation.stepValidation,
          [stepId]: isValid,
          // Always update both step 1 and 3 for personal details to ensure cross-phase consistency
          // since personal details can be in step 3 (phase 1) or step 1 (phases 5-6)
          [currentPhase === 5 || currentPhase === 6 ? 3 : 1]: isValid,
        },
        stepInteraction: {
          ...currentValidation.stepInteraction,
          [stepId]: true,
          [currentPhase === 5 || currentPhase === 6 ? 3 : 1]: true,
        },
        stepCompleted: {
          ...currentValidation.stepCompleted,
          [stepId]: isValid,
          [currentPhase === 5 || currentPhase === 6 ? 3 : 1]: isValid,
        },
        isPersonalValid: isValid,
        _timestamp: Date.now(),
      });

      // Also save to localStorage for maximum persistence
      try {
        const updatedValidationState = {
          ...store.getState().validationState,
          stepValidation: {
            ...store.getState().validationState?.stepValidation,
            [stepId]: isValid,
            [currentPhase === 5 || currentPhase === 6 ? 3 : 1]: isValid,
          },
          stepInteraction: {
            ...store.getState().validationState?.stepInteraction,
            [stepId]: true,
            [currentPhase === 5 || currentPhase === 6 ? 3 : 1]: true,
          },
          stepCompleted: {
            ...store.getState().validationState?.stepCompleted,
            [stepId]: isValid,
            [currentPhase === 5 || currentPhase === 6 ? 3 : 1]: isValid,
          },
          isPersonalValid: isValid,
          _timestamp: Date.now(),
        };
        localStorage.setItem('validationState', JSON.stringify(updatedValidationState));
        localStorage.setItem(`phase${currentPhase}ValidationState`, JSON.stringify({ validationState: updatedValidationState }));
      } catch (e) {
        console.error('Error saving validation state to localStorage:', e);
      }

      console.log('=== PersonalDetailsForm - Validation State Updated ===', {
        hasStoredValues,
        hasAllRequiredFields,
        isEmailValid,
        isValid,
        stepId,
        currentPhase,
        updatedSteps: [stepId, currentPhase === 5 || currentPhase === 6 ? 3 : 1],
        timestamp: new Date().toISOString()
      });
    }

    // Call onComplete if valid and not already called for this validation state
    if (isValid && hasStoredValues && !onCompleteCalledRef.current) {
      onCompleteCalledRef.current = true;
      onComplete(personalDetails);
    }

    // Set interaction ref and notify parent if we have stored values
    if (hasStoredValues && !interactionRef.current) {
      interactionRef.current = true;
      onInteract?.();
    }
  }, [personalDetails, isClaimSuccess, stepId, onComplete, onInteract, setPersonalDetails]);

  // Memoize the input change handler
  const handleInputChange = useCallback(
    (field: keyof PassengerDetails, value: string) => {
      // Track interaction
      if (!interactionRef.current && onInteract) {
        onInteract();
        interactionRef.current = true;
      }

      const newDetails = {
        ...personalDetails,
        [field]: value,
      } as PassengerDetails;

      // Only update if value actually changed
      if (personalDetails?.[field] !== value) {
        setPersonalDetails(newDetails);

        // Get current validation state once
        const store = useStore.getState();
        const currentValidation = (store.validationState || {}) as ValidationState;

        // Email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Determine required fields
        const requiredFields = isClaimSuccess
          ? [
              'salutation',
              'firstName',
              'lastName',
              'email',
              'phone',
              'address',
              'postalCode',
              'city',
              'country',
            ]
          : ['firstName', 'lastName', 'email'];

        // Validate all required fields
        const fieldErrors: Record<string, string> = { ...currentValidation.fieldErrors };

        // First validate the changed field
        if (field === 'email' && value.trim()) {
          if (!emailRegex.test(value.trim())) {
            fieldErrors[field] = t.validation.invalidBookingNumber;
          } else {
            delete fieldErrors[field];
          }
        }

        // Then check required fields
        requiredFields.forEach((reqField) => {
          const fieldValue =
            reqField === field
              ? value
              : newDetails[reqField as keyof PassengerDetails];
          const trimmedValue = fieldValue?.trim();

          if (!trimmedValue) {
            const fieldNames: Record<keyof PassengerDetails, string> = {
              salutation: t.personalDetails.salutation,
              firstName: t.personalDetails.firstName,
              lastName: t.personalDetails.lastName,
              email: t.personalDetails.email,
              phone: t.personalDetails.phone,
              address: t.personalDetails.address,
              postalCode: t.personalDetails.postalCode,
              city: t.personalDetails.city,
              country: t.personalDetails.country,
            };
            fieldErrors[reqField] =
              `${fieldNames[reqField as keyof PassengerDetails]} ${t.validation.required}`;
          } else if (reqField !== 'email') {
            // Skip email as it's handled above
            delete fieldErrors[reqField];
          }
        });

        // Check if all required fields are valid and there are no errors
        const hasAllRequiredFields = requiredFields.every((field) =>
          newDetails[field as keyof PassengerDetails]?.trim()
        );
        const hasNoErrors = Object.keys(fieldErrors).length === 0;
        const isValid = hasAllRequiredFields && hasNoErrors;

        // Update validation state
        const newValidationState = {
          ...currentValidation,
          fieldErrors,
          stepValidation: {
            ...currentValidation.stepValidation,
            [stepId]: isValid,
            // Always update both step 1 and 3 for personal details to ensure cross-phase consistency
            [currentPhase === 5 || currentPhase === 6 ? 3 : 1]: isValid,
          } as Record<ValidationStep, boolean>,
          stepInteraction: {
            ...currentValidation.stepInteraction,
            [stepId]: true,
            [currentPhase === 5 || currentPhase === 6 ? 3 : 1]: true,
          } as Record<ValidationStep, boolean>,
          stepCompleted: {
            ...currentValidation.stepCompleted,
            [stepId]: isValid,
            [currentPhase === 5 || currentPhase === 6 ? 3 : 1]: isValid,
          } as Record<ValidationStep, boolean>,
          isPersonalValid: isValid,
          [stepId]: isValid,
          _timestamp: Date.now(),
        };

        store.updateValidationState(newValidationState);

        // Also save to localStorage for maximum persistence
        try {
          localStorage.setItem('validationState', JSON.stringify(newValidationState));
          localStorage.setItem(`phase${currentPhase}ValidationState`, JSON.stringify({ validationState: newValidationState }));
        } catch (e) {
          console.error('Error saving validation state to localStorage:', e);
        }

        console.log('=== PersonalDetailsForm - Input Change Validation ===', {
          field,
          isValid,
          stepId,
          currentPhase,
          updatedSteps: [stepId, currentPhase === 5 || currentPhase === 6 ? 3 : 1],
          timestamp: new Date().toISOString()
        });

        // Call onComplete if all fields are valid and there are no errors
        if (isValid) {
          onComplete(newDetails);
        }
      }
    },
    [
      personalDetails,
      setPersonalDetails,
      onInteract,
      isClaimSuccess,
      t,
      stepId,
      onComplete,
    ]
  );

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => e.preventDefault()}
      onClick={(e) => {
        // Stop propagation for all form clicks
        e.stopPropagation();
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Select
            label={t.personalDetails.salutation}
            value={personalDetails?.salutation || ''}
            onChange={(value) => handleInputChange('salutation', value)}
            error={validationState?.fieldErrors?.salutation}
            options={[
              { value: 'herr', label: t.salutation.mr },
              { value: 'frau', label: t.salutation.mrs },
            ]}
            required={isClaimSuccess}
          />
        </div>
        <div>
          <Input
            label={t.personalDetails.firstName}
            value={personalDetails?.firstName || ''}
            onChange={(value) => handleInputChange('firstName', value)}
            error={validationState?.fieldErrors?.firstName}
            required={true}
          />
        </div>
        <div>
          <Input
            label={t.personalDetails.lastName}
            value={personalDetails?.lastName || ''}
            onChange={(value) => handleInputChange('lastName', value)}
            error={validationState?.fieldErrors?.lastName}
            required={true}
          />
        </div>
        <div>
          <Input
            label={t.personalDetails.email}
            type="email"
            value={personalDetails?.email || ''}
            onChange={(value) => handleInputChange('email', value)}
            error={validationState?.fieldErrors?.email}
            required={true}
          />
        </div>
        {showAdditionalFields && (
          <>
            <div>
              <Input
                label={t.personalDetails.phone}
                type="tel"
                value={personalDetails?.phone || ''}
                onChange={(value) => handleInputChange('phone', value)}
                error={validationState?.fieldErrors?.phone}
                required={isClaimSuccess}
              />
            </div>
            <div>
              <Input
                label={t.personalDetails.address}
                value={personalDetails?.address || ''}
                onChange={(value) => handleInputChange('address', value)}
                error={validationState?.fieldErrors?.address}
                required={isClaimSuccess}
              />
            </div>
            <div>
              <Input
                type="text"
                label={t.personalDetails.postalCode}
                value={personalDetails?.postalCode || ''}
                onChange={(value) => handleInputChange('postalCode', value)}
                error={validationState?.fieldErrors?.postalCode}
                required={isClaimSuccess}
              />
            </div>
            <div>
              <Input
                label={t.personalDetails.city}
                value={personalDetails?.city || ''}
                onChange={(value) => handleInputChange('city', value)}
                error={validationState?.fieldErrors?.city}
                required={isClaimSuccess}
              />
            </div>
            <div>
              <CountryAutocomplete
                label={t.personalDetails.country}
                value={personalDetails?.country}
                onChange={(value) => {
                  const selectedOption = (
                    lang === 'en' ? COUNTRY_OPTIONS_EN : COUNTRY_OPTIONS_DE
                  ).find((opt) => opt.value === value);
                  if (selectedOption) {
                    // Always store the German name in the backend
                    handleInputChange('country', selectedOption.germanName);
                  } else {
                    handleInputChange('country', value);
                  }
                }}
                options={
                  lang === 'en' ? COUNTRY_OPTIONS_EN : COUNTRY_OPTIONS_DE
                }
                error={validationState?.fieldErrors?.country}
                required={isClaimSuccess}
              />
            </div>
          </>
        )}
      </div>
    </form>
  );
};
