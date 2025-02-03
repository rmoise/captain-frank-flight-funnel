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
        fieldErrors: {}, // Start with no field errors
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailValue = storedDetails.email?.trim();
    const isEmailValid = !emailValue || emailRegex.test(emailValue);

    const isValid = hasAllRequiredFields && (emailValue ? isEmailValid : true);

    // Get current validation state once
    const store = useStore.getState();
    const currentValidation = store.validationState;

    // Prepare field errors
    const fieldErrors: Record<string, string> = {};
    if (!emailValue && hasAllRequiredFields) {
      fieldErrors.email = `${t.personalDetails.email} ${t.validation.required}`;
    } else if (emailValue && !isEmailValid) {
      fieldErrors.email = t.validation.invalidBookingNumber;
    }

    // Update validation state
    store.updateValidationState({
      ...currentValidation,
      stepValidation: {
        ...currentValidation.stepValidation,
        [stepId]: isValid,
      },
      stepInteraction: {
        ...currentValidation.stepInteraction,
        [stepId]: false, // Reset interaction state on mount
      },
      isPersonalValid: isValid,
      [stepId]: isValid,
      fieldErrors: isValid ? {} : fieldErrors, // Clear all errors if form is valid
      _timestamp: Date.now(),
    });

    // Call onComplete if all fields are valid
    if (isValid) {
      onComplete(storedDetails);
    }
  }, [
    storedDetails,
    isClaimSuccess,
    onComplete,
    onInteract,
    stepId,
    validationState._timestamp,
    t,
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
        const fieldErrors = { ...currentValidation.fieldErrors };

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
          },
          isPersonalValid: isValid,
          [stepId]: isValid,
          _timestamp: Date.now(),
        };

        store.updateValidationState(newValidationState);

        // Call onComplete if all fields are valid and there are no errors
        if (isValid) {
          onComplete(newDetails);
        }
      }
    },
    [
      storedDetails,
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
            value={storedDetails?.salutation || ''}
            onChange={(value) => handleInputChange('salutation', value)}
            error={validationState.fieldErrors.salutation}
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
            error={validationState.fieldErrors.firstName}
            required={true}
          />
        </div>
        <div>
          <Input
            label={t.personalDetails.lastName}
            value={storedDetails?.lastName || ''}
            onChange={(value) => handleInputChange('lastName', value)}
            error={validationState.fieldErrors.lastName}
            required={true}
          />
        </div>
        <div>
          <Input
            label={t.personalDetails.email}
            type="email"
            value={storedDetails?.email || ''}
            onChange={(value) => handleInputChange('email', value)}
            error={validationState.fieldErrors.email}
            required={true}
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
                error={validationState.fieldErrors.phone}
                required={isClaimSuccess}
              />
            </div>
            <div>
              <Input
                label={t.personalDetails.address}
                value={storedDetails?.address || ''}
                onChange={(value) => handleInputChange('address', value)}
                error={validationState.fieldErrors.address}
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
                error={validationState.fieldErrors.city}
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
                error={validationState.fieldErrors.country}
                required={isClaimSuccess}
              />
            </div>
          </>
        )}
      </div>
    </form>
  );
};
