'use client';

import React, { useCallback, useEffect } from 'react';
import { Input } from '../Input';
import { Select } from '../shared/Select';
import { useStore } from '@/lib/state/store';
import type { PassengerDetails } from '@/types/store';
import { CountryAutocomplete } from '../shared/CountryAutocomplete';

// Add debounce utility
const useDebounce = <T extends unknown[]>(
  callback: (...args: T) => void,
  delay: number
) => {
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
};

const COUNTRY_OPTIONS = [
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
  const {
    personalDetails: storedDetails,
    setPersonalDetails,
    validationState,
    currentPhase,
  } = useStore();

  const stepId = currentPhase === 5 || currentPhase === 6 ? 1 : 3;
  const hasInteracted = validationState.stepInteraction[stepId];
  const interactionRef = React.useRef(false);

  // Debounce the validation update
  const debouncedUpdateValidation = useDebounce((isValid: boolean) => {
    useStore.getState().updateValidationState({
      stepValidation: {
        ...validationState.stepValidation,
        [stepId]: isValid,
      },
      [stepId]: isValid,
    });
  }, 500);

  // Handle initial interaction
  useEffect(() => {
    if (!interactionRef.current && hasInteracted && onInteract) {
      interactionRef.current = true;
      onInteract();
    }
  }, [hasInteracted, onInteract]);

  // Validate on mount for claim success page
  useEffect(() => {
    if (isClaimSuccess && storedDetails) {
      setPersonalDetails(storedDetails);
    }
  }, [isClaimSuccess, storedDetails, setPersonalDetails]);

  // Memoize the input change handler
  const handleInputChange = useCallback(
    (field: keyof PassengerDetails, value: string) => {
      if (!interactionRef.current && onInteract) {
        onInteract();
        interactionRef.current = true;
      }

      const newDetails = {
        ...storedDetails,
        [field]: value,
      } as PassengerDetails;

      const isValid = Boolean(
        isClaimSuccess
          ? newDetails.salutation &&
              newDetails.firstName &&
              newDetails.lastName &&
              newDetails.email &&
              (!showAdditionalFields ||
                (newDetails.phone &&
                  newDetails.address &&
                  newDetails.zipCode &&
                  newDetails.city &&
                  newDetails.country))
          : newDetails.firstName && newDetails.lastName && newDetails.email
      );

      if (isClaimSuccess || storedDetails?.[field] !== value) {
        setPersonalDetails(newDetails);
        debouncedUpdateValidation(isValid);
      }
    },
    [
      storedDetails,
      setPersonalDetails,
      onInteract,
      isClaimSuccess,
      showAdditionalFields,
      debouncedUpdateValidation,
    ]
  );

  // Call onComplete when details change
  const lastDetailsRef = React.useRef(storedDetails);
  useEffect(() => {
    // Skip if details haven't changed (deep comparison)
    if (
      JSON.stringify(storedDetails) === JSON.stringify(lastDetailsRef.current)
    )
      return;

    // Skip if both are null
    if (!storedDetails && !lastDetailsRef.current) return;

    // Update ref and call onComplete
    lastDetailsRef.current = storedDetails;
    onComplete(storedDetails);
  }, [storedDetails, onComplete]);

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
            label="Anrede"
            value={storedDetails?.salutation || ''}
            onChange={(value) => handleInputChange('salutation', value)}
            error={
              hasInteracted ? validationState.fieldErrors.salutation : undefined
            }
            options={[
              { value: 'herr', label: 'Herr' },
              { value: 'frau', label: 'Frau' },
            ]}
            required={isClaimSuccess}
          />
        </div>
        <div>
          <Input
            label="Vorname"
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
            label="Nachname"
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
            label="E-Mail-Adresse"
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
                label="Telefonnummer"
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
                label="Adresse"
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
                label="Postleitzahl"
                value={storedDetails?.zipCode || ''}
                onChange={(value) => handleInputChange('zipCode', value)}
                error={
                  hasInteracted
                    ? validationState.fieldErrors.zipCode
                    : undefined
                }
                required={isClaimSuccess}
              />
            </div>
            <div>
              <Input
                label="Stadt"
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
                label="Land"
                value={storedDetails?.country}
                onChange={(value) => handleInputChange('country', value)}
                options={COUNTRY_OPTIONS}
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
