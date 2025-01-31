'use client';

import React, { useCallback, useEffect } from 'react';
import { Input } from '../Input';
import { Select } from '../shared/Select';
import { useStore } from '@/lib/state/store';
import type { PassengerDetails } from '@/types/store';
import { CountryAutocomplete } from '../shared/CountryAutocomplete';
import { useTranslation } from '@/hooks/useTranslation';

const COUNTRY_OPTIONS_DE = [
  // EU Countries
  { value: 'BEL', label: 'Belgien' },
  { value: 'BGR', label: 'Bulgarien' },
  { value: 'DNK', label: 'Dänemark' },
  { value: 'DEU', label: 'Deutschland' },
  { value: 'EST', label: 'Estland' },
  { value: 'FIN', label: 'Finnland' },
  { value: 'FRA', label: 'Frankreich' },
  { value: 'GRC', label: 'Griechenland' },
  { value: 'IRL', label: 'Irland' },
  { value: 'ITA', label: 'Italien' },
  { value: 'HRV', label: 'Kroatien' },
  { value: 'LVA', label: 'Lettland' },
  { value: 'LTU', label: 'Litauen' },
  { value: 'LUX', label: 'Luxemburg' },
  { value: 'MLT', label: 'Malta' },
  { value: 'NLD', label: 'Niederlande' },
  { value: 'AUT', label: 'Österreich' },
  { value: 'POL', label: 'Polen' },
  { value: 'PRT', label: 'Portugal' },
  { value: 'ROU', label: 'Rumänien' },
  { value: 'SWE', label: 'Schweden' },
  { value: 'SVK', label: 'Slowakei' },
  { value: 'SVN', label: 'Slowenien' },
  { value: 'ESP', label: 'Spanien' },
  { value: 'CZE', label: 'Tschechien' },
  { value: 'HUN', label: 'Ungarn' },
  { value: 'CYP', label: 'Zypern' },
  // Non-EU European countries
  { value: 'GBR', label: 'Großbritannien' },
  { value: 'CHE', label: 'Schweiz' },
  { value: 'NOR', label: 'Norwegen' },
  { value: 'ISL', label: 'Island' },
  { value: 'LIE', label: 'Liechtenstein' },
  // Rest of the World (in German)
  { value: 'EGY', label: 'Ägypten' },
  { value: 'ARG', label: 'Argentinien' },
  { value: 'AUS', label: 'Australien' },
  { value: 'BRA', label: 'Brasilien' },
  { value: 'CHL', label: 'Chile' },
  { value: 'CHN', label: 'China' },
  { value: 'IND', label: 'Indien' },
  { value: 'IDN', label: 'Indonesien' },
  { value: 'ISR', label: 'Israel' },
  { value: 'JPN', label: 'Japan' },
  { value: 'CAN', label: 'Kanada' },
  { value: 'COL', label: 'Kolumbien' },
  { value: 'KOR', label: 'Korea, Republik' },
  { value: 'MYS', label: 'Malaysia' },
  { value: 'MEX', label: 'Mexiko' },
  { value: 'NZL', label: 'Neuseeland' },
  { value: 'PAK', label: 'Pakistan' },
  { value: 'PHL', label: 'Philippinen' },
  { value: 'RUS', label: 'Russland' },
  { value: 'SAU', label: 'Saudi-Arabien' },
  { value: 'SGP', label: 'Singapur' },
  { value: 'ZAF', label: 'Südafrika' },
  { value: 'THA', label: 'Thailand' },
  { value: 'TUR', label: 'Türkei' },
  { value: 'ARE', label: 'Vereinigte Arabische Emirate' },
  { value: 'USA', label: 'Vereinigte Staaten' },
  { value: 'VNM', label: 'Vietnam' },
];

const COUNTRY_OPTIONS_EN = [
  // EU Countries
  { value: 'BEL', label: 'Belgium' },
  { value: 'BGR', label: 'Bulgaria' },
  { value: 'DNK', label: 'Denmark' },
  { value: 'DEU', label: 'Germany' },
  { value: 'EST', label: 'Estonia' },
  { value: 'FIN', label: 'Finland' },
  { value: 'FRA', label: 'France' },
  { value: 'GRC', label: 'Greece' },
  { value: 'IRL', label: 'Ireland' },
  { value: 'ITA', label: 'Italy' },
  { value: 'HRV', label: 'Croatia' },
  { value: 'LVA', label: 'Latvia' },
  { value: 'LTU', label: 'Lithuania' },
  { value: 'LUX', label: 'Luxembourg' },
  { value: 'MLT', label: 'Malta' },
  { value: 'NLD', label: 'Netherlands' },
  { value: 'AUT', label: 'Austria' },
  { value: 'POL', label: 'Poland' },
  { value: 'PRT', label: 'Portugal' },
  { value: 'ROU', label: 'Romania' },
  { value: 'SWE', label: 'Sweden' },
  { value: 'SVK', label: 'Slovakia' },
  { value: 'SVN', label: 'Slovenia' },
  { value: 'ESP', label: 'Spain' },
  { value: 'CZE', label: 'Czech Republic' },
  { value: 'HUN', label: 'Hungary' },
  { value: 'CYP', label: 'Cyprus' },
  // Non-EU European countries
  { value: 'GBR', label: 'United Kingdom' },
  { value: 'CHE', label: 'Switzerland' },
  { value: 'NOR', label: 'Norway' },
  { value: 'ISL', label: 'Iceland' },
  { value: 'LIE', label: 'Liechtenstein' },
  // Rest of the World (in English)
  { value: 'EGY', label: 'Egypt' },
  { value: 'ARG', label: 'Argentina' },
  { value: 'AUS', label: 'Australia' },
  { value: 'BRA', label: 'Brazil' },
  { value: 'CHL', label: 'Chile' },
  { value: 'CHN', label: 'China' },
  { value: 'IND', label: 'India' },
  { value: 'IDN', label: 'Indonesia' },
  { value: 'ISR', label: 'Israel' },
  { value: 'JPN', label: 'Japan' },
  { value: 'CAN', label: 'Canada' },
  { value: 'COL', label: 'Colombia' },
  { value: 'KOR', label: 'Republic of Korea' },
  { value: 'MYS', label: 'Malaysia' },
  { value: 'MEX', label: 'Mexico' },
  { value: 'NZL', label: 'New Zealand' },
  { value: 'PAK', label: 'Pakistan' },
  { value: 'PHL', label: 'Philippines' },
  { value: 'RUS', label: 'Russia' },
  { value: 'SAU', label: 'Saudi Arabia' },
  { value: 'SGP', label: 'Singapore' },
  { value: 'ZAF', label: 'South Africa' },
  { value: 'THA', label: 'Thailand' },
  { value: 'TUR', label: 'Turkey' },
  { value: 'ARE', label: 'United Arab Emirates' },
  { value: 'USA', label: 'United States' },
  { value: 'VNM', label: 'Vietnam' },
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
    personalDetails: storedDetails,
    setPersonalDetails,
    validationState,
    currentPhase,
  } = useStore();

  const stepId = currentPhase === 5 || currentPhase === 6 ? 1 : 3;
  const hasInteracted = validationState.stepInteraction[stepId];
  const interactionRef = React.useRef(false);

  // Handle initial load validation
  useEffect(() => {
    // Skip if already validated
    if (validationState._timestamp) return;

    // Skip validation entirely on mount if no stored details or all values are empty
    if (
      !storedDetails ||
      !Object.values(storedDetails).some((value) => value?.trim())
    ) {
      const store = useStore.getState();
      store.updateValidationState({
        ...store.validationState,
        stepValidation: {
          ...store.validationState.stepValidation,
          [stepId]: false,
        },
        stepInteraction: {
          ...store.validationState.stepInteraction,
          [stepId]: false,
        },
        isPersonalValid: false,
        [stepId]: false,
        fieldErrors: {},
        _timestamp: Date.now(),
      });
      return;
    }

    // Only validate if we have stored details with actual values
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

    const hasAllRequiredFields = requiredFields.every((field) =>
      storedDetails[field as keyof PassengerDetails]?.trim()
    );

    // Get current validation state once
    const store = useStore.getState();
    const currentValidation = store.validationState;

    // Only update if validation state has changed
    if (currentValidation.stepValidation[stepId] !== hasAllRequiredFields) {
      // Update validation state to reflect completed state
      const newValidationState = {
        ...currentValidation,
        stepValidation: {
          ...currentValidation.stepValidation,
          [stepId]: hasAllRequiredFields,
        },
        stepInteraction: {
          ...currentValidation.stepInteraction,
          [stepId]: hasAllRequiredFields,
        },
        isPersonalValid: hasAllRequiredFields,
        [stepId]: hasAllRequiredFields,
        fieldErrors: hasAllRequiredFields ? {} : currentValidation.fieldErrors,
        _timestamp: Date.now(),
      };

      store.updateValidationState(newValidationState);

      // If all required fields are present, call onComplete
      if (hasAllRequiredFields) {
        onComplete(storedDetails);
      }

      // Mark as interacted if we have all required fields
      if (!interactionRef.current && onInteract && hasAllRequiredFields) {
        interactionRef.current = true;
        onInteract();
      }
    }
  }, [
    storedDetails,
    isClaimSuccess,
    onComplete,
    onInteract,
    stepId,
    validationState._timestamp,
  ]);

  // Memoize the input change handler
  const handleInputChange = useCallback(
    (field: keyof PassengerDetails, value: string) => {
      // Track interaction
      if (!interactionRef.current && onInteract) {
        onInteract();
        interactionRef.current = true;
      }

      const newDetails = {
        ...storedDetails,
        [field]: value,
      } as PassengerDetails;

      // Only update if value actually changed
      if (storedDetails?.[field] !== value) {
        setPersonalDetails(newDetails);

        // Get current validation state once
        const store = useStore.getState();
        const currentValidation = store.validationState;

        // Only validate if user has interacted with the form
        if (interactionRef.current) {
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

          // Email validation
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          const isEmailValid =
            field === 'email' ? emailRegex.test(value) : true;

          const hasAllRequiredFields = requiredFields.every((field) => {
            const fieldValue =
              newDetails[field as keyof PassengerDetails]?.trim();
            if (field === 'email') {
              return fieldValue && emailRegex.test(fieldValue);
            }
            return !!fieldValue;
          });

          // Call onComplete immediately if all fields are valid
          if (hasAllRequiredFields) {
            onComplete(newDetails);
          }

          // Only update validation state if it has changed
          const shouldUpdate =
            currentValidation.stepValidation[stepId] !== hasAllRequiredFields ||
            currentValidation.fieldErrors[field] !==
              (field === 'email' && value.trim()
                ? !isEmailValid
                  ? 'Please enter a valid email address'
                  : ''
                : value.trim()
                  ? ''
                  : 'This field is required');

          if (shouldUpdate) {
            // Update validation state
            const newValidationState = {
              ...currentValidation,
              stepValidation: {
                ...currentValidation.stepValidation,
                [stepId]: hasAllRequiredFields,
              },
              stepInteraction: {
                ...currentValidation.stepInteraction,
                [stepId]: true,
              },
              [stepId]: hasAllRequiredFields,
              isPersonalValid: hasAllRequiredFields,
              fieldErrors: {
                ...currentValidation.fieldErrors,
                [field]:
                  field === 'email' && value.trim()
                    ? !isEmailValid
                      ? 'Please enter a valid email address'
                      : ''
                    : value.trim()
                      ? ''
                      : 'This field is required',
              },
              _timestamp: Date.now(),
            };

            store.updateValidationState(newValidationState);
          }
        }
      }
    },
    [
      storedDetails,
      setPersonalDetails,
      onInteract,
      stepId,
      isClaimSuccess,
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
            value={storedDetails?.salutation || ''}
            onChange={(value) => handleInputChange('salutation', value)}
            error={
              hasInteracted ? validationState.fieldErrors.salutation : undefined
            }
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
            value={storedDetails?.firstName || ''}
            onChange={(value) => handleInputChange('firstName', value)}
            error={
              hasInteracted ? validationState.fieldErrors.firstName : undefined
            }
            required={isClaimSuccess}
          />
        </div>
        <div>
          <Input
            label={t.personalDetails.lastName}
            value={storedDetails?.lastName || ''}
            onChange={(value) => handleInputChange('lastName', value)}
            error={
              hasInteracted ? validationState.fieldErrors.lastName : undefined
            }
            required={isClaimSuccess}
          />
        </div>
        <div>
          <Input
            label={t.personalDetails.email}
            type="email"
            value={storedDetails?.email || ''}
            onChange={(value) => handleInputChange('email', value)}
            error={
              hasInteracted ? validationState.fieldErrors.email : undefined
            }
            required={isClaimSuccess}
          />
        </div>
        {showAdditionalFields && (
          <>
            <div>
              <Input
                label={t.personalDetails.phone}
                type="tel"
                value={storedDetails?.phone || ''}
                onChange={(value) => handleInputChange('phone', value)}
                error={
                  hasInteracted ? validationState.fieldErrors.phone : undefined
                }
                required={isClaimSuccess}
              />
            </div>
            <div>
              <Input
                label={t.personalDetails.address}
                value={storedDetails?.address || ''}
                onChange={(value) => handleInputChange('address', value)}
                error={
                  hasInteracted
                    ? validationState.fieldErrors.address
                    : undefined
                }
                required={isClaimSuccess}
              />
            </div>
            <div>
              <Input
                type="text"
                label={t.personalDetails.postalCode}
                value={storedDetails?.postalCode || ''}
                onChange={(value) => handleInputChange('postalCode', value)}
                error={validationState.fieldErrors?.postalCode}
                required={isClaimSuccess}
              />
            </div>
            <div>
              <Input
                label={t.personalDetails.city}
                value={storedDetails?.city || ''}
                onChange={(value) => handleInputChange('city', value)}
                error={
                  hasInteracted ? validationState.fieldErrors.city : undefined
                }
                required={isClaimSuccess}
              />
            </div>
            <div>
              <CountryAutocomplete
                label={t.personalDetails.country}
                value={storedDetails?.country}
                onChange={(value) => {
                  const selectedOption = (
                    lang === 'en' ? COUNTRY_OPTIONS_EN : COUNTRY_OPTIONS_DE
                  ).find((opt) => opt.value === value);
                  handleInputChange('country', selectedOption?.label || value);
                }}
                options={
                  lang === 'en' ? COUNTRY_OPTIONS_EN : COUNTRY_OPTIONS_DE
                }
                error={
                  hasInteracted
                    ? validationState.fieldErrors.country
                    : undefined
                }
                required={isClaimSuccess}
              />
            </div>
          </>
        )}
      </div>
    </form>
  );
};
