import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '../Input';
import { AutocompleteInput } from '../AutocompleteInput';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { RootState } from '@/store';
import { completeStep, markStepIncomplete } from '@/store/slices/progressSlice';
import type { PassengerDetails } from '@/types/store';
import { setPersonalDetails } from '@/store/slices/bookingSlice';

interface FormPersonalDetails {
  firstName: string;
  lastName: string;
  email: string;
  salutation: 'Mr' | 'Mrs' | 'Ms' | '';
  phone: string;
  address: string;
  zipCode: string;
  city: string;
  country: string;
}

type SalutationOption = {
  value: 'Mr' | 'Mrs' | 'Ms';
  label: string;
  description: string;
};

const SALUTATION_OPTIONS: SalutationOption[] = [
  { value: 'Mr', label: 'Mr.', description: 'Mister' },
  { value: 'Mrs', label: 'Mrs.', description: 'Misses' },
  { value: 'Ms', label: 'Ms.', description: 'Miss' },
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
  const dispatch = useAppDispatch();
  const reduxState = useAppSelector(
    (state: RootState) => state.booking?.personalDetails ?? null
  );

  const [values, setValues] = useState<FormPersonalDetails>({
    firstName: reduxState?.firstName || '',
    lastName: reduxState?.lastName || '',
    email: reduxState?.email || '',
    salutation: (reduxState?.salutation as 'Mr' | 'Mrs' | 'Ms' | '') || '',
    phone: reduxState?.phone || '',
    address: reduxState?.address || '',
    zipCode: reduxState?.zipCode || '',
    city: reduxState?.city || '',
    country: reduxState?.country || '',
  });

  const [focusedField, setFocusedField] = useState<
    keyof FormPersonalDetails | null
  >(null);
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<keyof FormPersonalDetails, boolean>>
  >({});
  const [hasInteracted, setHasInteracted] = useState(false);
  const [dirtyFields, setDirtyFields] = useState<
    Partial<Record<keyof FormPersonalDetails, boolean>>
  >({});

  // Handle interaction tracking
  const handleInteraction = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
      onInteract?.();
    }
  }, [hasInteracted, onInteract]);

  // Handle field changes
  const handleInputChange = useCallback(
    (field: keyof FormPersonalDetails, value: string) => {
      const newValues = { ...values, [field]: value };
      setValues(newValues);
      setDirtyFields((prev) => ({ ...prev, [field]: true }));
      setHasInteracted(true);

      const hasValidEmail =
        newValues.email &&
        /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(newValues.email);

      const hasRequiredFields = !!(
        newValues.firstName?.trim() &&
        newValues.lastName?.trim() &&
        hasValidEmail &&
        newValues.salutation?.trim() &&
        (!isClaimSuccess ||
          (newValues.phone?.trim() &&
            newValues.address?.trim() &&
            newValues.zipCode?.trim() &&
            newValues.city?.trim() &&
            newValues.country?.trim()))
      );

      console.log('\n=== Form Validation (handleInputChange) ===');
      console.log('isClaimSuccess:', isClaimSuccess);
      console.log('hasValidEmail:', hasValidEmail);
      console.log('Values:', {
        firstName: newValues.firstName?.trim(),
        lastName: newValues.lastName?.trim(),
        email: newValues.email?.trim(),
        salutation: newValues.salutation?.trim(),
        phone: newValues.phone?.trim(),
        address: newValues.address?.trim(),
        zipCode: newValues.zipCode?.trim(),
        city: newValues.city?.trim(),
        country: newValues.country?.trim(),
      });
      console.log('hasRequiredFields:', hasRequiredFields);

      const passengerDetails: PassengerDetails = {
        firstName: newValues.firstName,
        lastName: newValues.lastName,
        email: newValues.email,
        salutation: newValues.salutation,
        phone: newValues.phone || '',
        address: newValues.address || '',
        zipCode: newValues.zipCode || '',
        city: newValues.city || '',
        country: newValues.country || '',
      };

      // Update Redux and localStorage if valid
      if (hasRequiredFields) {
        console.log('Form is valid, completing step:', isClaimSuccess ? 1 : 3);
        dispatch(setPersonalDetails(passengerDetails));
        dispatch(completeStep(isClaimSuccess ? 1 : 3));
        localStorage.setItem(
          'personalDetails',
          JSON.stringify(passengerDetails)
        );
        onComplete?.(passengerDetails);
      } else {
        console.log(
          'Form is invalid, marking step incomplete:',
          isClaimSuccess ? 1 : 3
        );
        // If any required field is empty, clear localStorage and mark step incomplete
        const hasEmptyRequiredFields =
          !newValues.firstName?.trim() ||
          !newValues.lastName?.trim() ||
          !newValues.email?.trim() ||
          !newValues.salutation?.trim() ||
          (isClaimSuccess &&
            (!newValues.phone?.trim() ||
              !newValues.address?.trim() ||
              !newValues.zipCode?.trim() ||
              !newValues.city?.trim() ||
              !newValues.country?.trim()));

        console.log('hasEmptyRequiredFields:', hasEmptyRequiredFields);
        console.log('Empty fields:', {
          firstName: !newValues.firstName?.trim(),
          lastName: !newValues.lastName?.trim(),
          email: !newValues.email?.trim(),
          salutation: !newValues.salutation?.trim(),
          phone: isClaimSuccess && !newValues.phone?.trim(),
          address: isClaimSuccess && !newValues.address?.trim(),
          zipCode: isClaimSuccess && !newValues.zipCode?.trim(),
          city: isClaimSuccess && !newValues.city?.trim(),
          country: isClaimSuccess && !newValues.country?.trim(),
        });

        if (hasEmptyRequiredFields) {
          localStorage.removeItem('personalDetails');
        }
        dispatch(setPersonalDetails(passengerDetails));
        dispatch(markStepIncomplete(isClaimSuccess ? 1 : 3));
        onComplete?.(null);
      }
      console.log('=== End Form Validation ===\n');

      handleInteraction();
    },
    [values, handleInteraction, onComplete, dispatch, isClaimSuccess]
  );

  // Update values when reduxState changes
  useEffect(() => {
    if (reduxState) {
      setValues({
        firstName: reduxState.firstName || '',
        lastName: reduxState.lastName || '',
        email: reduxState.email || '',
        salutation: (reduxState.salutation as 'Mr' | 'Mrs' | 'Ms' | '') || '',
        phone: reduxState.phone || '',
        address: reduxState.address || '',
        zipCode: reduxState.zipCode || '',
        city: reduxState.city || '',
        country: reduxState.country || '',
      });

      // Mark all fields as touched and dirty
      const touchedState = Object.keys(reduxState).reduce(
        (acc, key) => {
          acc[key as keyof FormPersonalDetails] = true;
          return acc;
        },
        {} as Record<keyof FormPersonalDetails, boolean>
      );

      setTouchedFields(touchedState);
      setDirtyFields(touchedState);

      // Validate and notify parent
      const hasValidEmail =
        reduxState.email &&
        /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(reduxState.email);
      const isValid = !!(
        reduxState.firstName?.trim() &&
        reduxState.lastName?.trim() &&
        hasValidEmail &&
        reduxState.salutation?.trim() &&
        (!isClaimSuccess ||
          (reduxState.phone?.trim() &&
            reduxState.address?.trim() &&
            reduxState.zipCode?.trim() &&
            reduxState.city?.trim() &&
            reduxState.country?.trim()))
      );

      if (isValid) {
        dispatch(completeStep(isClaimSuccess ? 1 : 3));
        onComplete?.(reduxState);
      }
    }
  }, [reduxState, dispatch, isClaimSuccess, onComplete]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const passengerDetails: PassengerDetails = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      salutation: values.salutation,
      phone: values.phone,
      address: values.address,
      zipCode: values.zipCode,
      city: values.city,
      country: values.country,
    };
    onComplete?.(passengerDetails);
  };

  const handleSalutationSearch = useCallback((term: string) => {
    if (!term) {
      return SALUTATION_OPTIONS;
    }
    return SALUTATION_OPTIONS.filter((option) =>
      option.label.toLowerCase().includes(term.toLowerCase())
    );
  }, []);

  const handleBlur = useCallback(
    (field: keyof FormPersonalDetails) => {
      setFocusedField(null);
      setTouchedFields((prev) => ({ ...prev, [field]: true }));
      setDirtyFields((prev) => ({ ...prev, [field]: true }));
      setHasInteracted(true);

      const hasValidEmail =
        values.email &&
        /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email);

      const hasRequiredFields = !!(
        values.firstName?.trim() &&
        values.lastName?.trim() &&
        hasValidEmail &&
        values.salutation?.trim() &&
        (!isClaimSuccess ||
          (values.phone?.trim() &&
            values.address?.trim() &&
            values.zipCode?.trim() &&
            values.city?.trim() &&
            values.country?.trim()))
      );

      const passengerDetails: PassengerDetails = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        salutation: values.salutation,
        phone: values.phone || '',
        address: values.address || '',
        zipCode: values.zipCode || '',
        city: values.city || '',
        country: values.country || '',
      };

      // Update Redux and localStorage if valid
      if (hasRequiredFields) {
        dispatch(setPersonalDetails(passengerDetails));
        dispatch(completeStep(isClaimSuccess ? 1 : 3));
        localStorage.setItem(
          'personalDetails',
          JSON.stringify(passengerDetails)
        );
        onComplete?.(passengerDetails);
      } else {
        dispatch(markStepIncomplete(isClaimSuccess ? 1 : 3));
        onComplete?.(null);
      }

      handleInteraction();
    },
    [values, handleInteraction, onComplete, dispatch, isClaimSuccess]
  );

  const handleFocus = useCallback(
    (field: keyof FormPersonalDetails) => {
      setFocusedField(field);
      setTouchedFields((prev) => ({ ...prev, [field]: true }));
      setHasInteracted(true);
      handleInteraction();
    },
    [handleInteraction]
  );

  const getError = useCallback(
    (field: keyof FormPersonalDetails): string | null => {
      if (!touchedFields[field] && !dirtyFields[field]) return null;

      const value = values[field]?.trim();

      // Check for required fields
      if (!value && isClaimSuccess) {
        switch (field) {
          case 'phone':
            return 'Phone number is required';
          case 'address':
            return 'Address is required';
          case 'zipCode':
            return 'ZIP code is required';
          case 'city':
            return 'City is required';
          case 'country':
            return 'Country is required';
        }
      }

      // Check for main required fields
      if (!value) {
        switch (field) {
          case 'firstName':
            return 'First Name is required';
          case 'lastName':
            return 'Last Name is required';
          case 'salutation':
            return 'Salutation is required';
          case 'email':
            return 'Email is required';
        }
      }

      // Special validation for email format
      if (
        field === 'email' &&
        value &&
        !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)
      ) {
        return 'Invalid email address';
      }

      return null;
    },
    [values, touchedFields, dirtyFields, isClaimSuccess]
  );

  return (
    <div
      className="w-full max-w-4xl mx-0 sm:mx-auto px-0 sm:px-6 py-2 sm:py-6"
      onClick={(e) => e.stopPropagation()}
      data-step="3"
    >
      <form
        className="flex flex-col gap-4 sm:gap-8 px-0 sm:px-0"
        onSubmit={handleSubmit}
      >
        {/* Salutation */}
        <div onClick={(e) => e.stopPropagation()}>
          <AutocompleteInput
            label="Salutation"
            value={values.salutation}
            options={SALUTATION_OPTIONS}
            onChange={(value: string) => {
              handleInputChange('salutation', value as 'Mr' | 'Mrs' | 'Ms');
            }}
            onSearch={handleSalutationSearch}
            onFocus={() => handleFocus('salutation')}
            onBlur={() => handleBlur('salutation')}
            isFocused={focusedField === 'salutation'}
            required={true}
            error={getError('salutation')}
            iconType={undefined}
            className="w-full"
          />
        </div>

        {/* Names Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
          {/* First Name */}
          <div onClick={(e) => e.stopPropagation()}>
            <Input
              label="First Name"
              value={values.firstName}
              onChange={(value) => handleInputChange('firstName', value)}
              onFocus={() => handleFocus('firstName')}
              onBlur={() => handleBlur('firstName')}
              isFocused={focusedField === 'firstName'}
              required={true}
              error={getError('firstName')}
              autocomplete="given-name"
              className="text-[#4B616D]"
            />
          </div>

          {/* Last Name */}
          <div onClick={(e) => e.stopPropagation()}>
            <Input
              label="Last Name"
              value={values.lastName}
              onChange={(value) => handleInputChange('lastName', value)}
              onFocus={() => handleFocus('lastName')}
              onBlur={() => handleBlur('lastName')}
              isFocused={focusedField === 'lastName'}
              required={true}
              error={getError('lastName')}
              autocomplete="family-name"
              className="text-[#4B616D]"
            />
          </div>
        </div>

        {/* Email */}
        <div onClick={(e) => e.stopPropagation()}>
          <Input
            type="email"
            label="Email Address"
            value={values.email}
            onChange={(value) => handleInputChange('email', value)}
            onFocus={() => handleFocus('email')}
            onBlur={() => handleBlur('email')}
            isFocused={focusedField === 'email'}
            required={true}
            error={getError('email')}
            autocomplete="email"
            className="text-[#4B616D]"
          />
        </div>

        {/* Additional fields for claim success page */}
        {isClaimSuccess && (
          <div className="flex flex-col gap-8">
            {/* Phone */}
            <div onClick={(e) => e.stopPropagation()}>
              <Input
                type="tel"
                label="Phone Number"
                value={values.phone}
                onChange={(value) => handleInputChange('phone', value)}
                onFocus={() => handleFocus('phone')}
                onBlur={() => handleBlur('phone')}
                isFocused={focusedField === 'phone'}
                required={true}
                error={getError('phone')}
                autocomplete="tel"
                className="text-[#4B616D]"
              />
            </div>

            {/* Address */}
            <div onClick={(e) => e.stopPropagation()}>
              <Input
                label="Address"
                value={values.address}
                onChange={(value) => handleInputChange('address', value)}
                onFocus={() => handleFocus('address')}
                onBlur={() => handleBlur('address')}
                isFocused={focusedField === 'address'}
                required={true}
                error={getError('address')}
                autocomplete="street-address"
                className="text-[#4B616D]"
              />
            </div>

            {/* ZIP Code and Location Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
              <div onClick={(e) => e.stopPropagation()}>
                <Input
                  label="ZIP Code"
                  value={values.zipCode}
                  onChange={(value) => handleInputChange('zipCode', value)}
                  onFocus={() => handleFocus('zipCode')}
                  onBlur={() => handleBlur('zipCode')}
                  isFocused={focusedField === 'zipCode'}
                  required={true}
                  error={getError('zipCode')}
                  autocomplete="postal-code"
                  className="text-[#4B616D]"
                />
              </div>

              <div onClick={(e) => e.stopPropagation()}>
                <Input
                  label="City"
                  value={values.city}
                  onChange={(value) => handleInputChange('city', value)}
                  onFocus={() => handleFocus('city')}
                  onBlur={() => handleBlur('city')}
                  isFocused={focusedField === 'city'}
                  required={true}
                  error={getError('city')}
                  autocomplete="address-level2"
                  className="text-[#4B616D]"
                />
              </div>
            </div>

            {/* Country */}
            <div onClick={(e) => e.stopPropagation()}>
              <Input
                label="Country"
                value={values.country}
                onChange={(value) => handleInputChange('country', value)}
                onFocus={() => handleFocus('country')}
                onBlur={() => handleBlur('country')}
                isFocused={focusedField === 'country'}
                required={true}
                error={getError('country')}
                autocomplete="country-name"
                className="text-[#4B616D]"
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
