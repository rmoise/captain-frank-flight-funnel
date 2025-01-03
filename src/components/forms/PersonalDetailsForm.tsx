'use client';

import React, { useCallback, useEffect } from 'react';
import { Input } from '../Input';
import { Select } from '../shared/Select';
import { useStore } from '@/lib/state/store';
import type { PassengerDetails } from '@/types/store';

const COUNTRY_OPTIONS = [
  { value: 'DEU', label: 'Germany' },
  { value: 'USA', label: 'United States' },
  { value: 'GBR', label: 'United Kingdom' },
  { value: 'FRA', label: 'France' },
  { value: 'ESP', label: 'Spain' },
  { value: 'ITA', label: 'Italy' },
  { value: 'NLD', label: 'Netherlands' },
  { value: 'BEL', label: 'Belgium' },
  { value: 'CHE', label: 'Switzerland' },
  { value: 'AUT', label: 'Austria' },
];

interface PersonalDetailsFormProps {
  onComplete: (details: PassengerDetails | null) => void;
  onInteract?: () => void;
  isClaimSuccess?: boolean;
}

export const PersonalDetailsForm: React.FC<PersonalDetailsFormProps> = ({
  onComplete,
  onInteract,
  isClaimSuccess = false,
}) => {
  const {
    personalDetails: storedDetails,
    setPersonalDetails,
    validationState,
    currentPhase,
  } = useStore();

  const stepId = currentPhase === 5 || currentPhase === 6 ? 1 : 3;
  const hasInteracted = validationState.stepInteraction[stepId];

  const handleInputChange = useCallback(
    (field: keyof PassengerDetails, value: string) => {
      if (onInteract) onInteract();

      // Create new details object and let store handle validation
      const newDetails = {
        ...storedDetails,
        [field]: value,
      } as PassengerDetails;

      setPersonalDetails(newDetails);
    },
    [storedDetails, setPersonalDetails, onInteract]
  );

  // Call onComplete whenever details change
  useEffect(() => {
    // Don't call onComplete with null on initial mount
    if (storedDetails === null && !hasInteracted) {
      return;
    }
    onComplete(storedDetails);
  }, [storedDetails, onComplete, hasInteracted]);

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <Select
            label="Salutation"
            value={storedDetails?.salutation || ''}
            onChange={(value) => handleInputChange('salutation', value)}
            error={
              hasInteracted ? validationState.fieldErrors.salutation : undefined
            }
            options={[
              { value: 'herr', label: 'Mr.' },
              { value: 'frau', label: 'Mrs./Ms.' },
            ]}
            required={isClaimSuccess}
          />
        </div>
        <div>
          <Input
            label="First Name"
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
            label="Last Name"
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
            label="Email"
            type="email"
            value={storedDetails?.email || ''}
            onChange={(value) => handleInputChange('email', value)}
            error={
              hasInteracted ? validationState.fieldErrors.email : undefined
            }
            required={isClaimSuccess}
          />
        </div>
        {isClaimSuccess && (
          <>
            <div>
              <Input
                label="Phone"
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
                label="Street Address"
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
                label="ZIP Code"
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
                label="City"
                value={storedDetails?.city || ''}
                onChange={(value) => handleInputChange('city', value)}
                error={
                  hasInteracted ? validationState.fieldErrors.city : undefined
                }
                required={isClaimSuccess}
              />
            </div>
            <div className="col-span-2">
              <Select
                label="Country"
                value={storedDetails?.country || ''}
                onChange={(value) => handleInputChange('country', value)}
                error={
                  hasInteracted
                    ? validationState.fieldErrors.country
                    : undefined
                }
                options={COUNTRY_OPTIONS}
                required={true}
              />
            </div>
          </>
        )}
      </div>
    </form>
  );
};
