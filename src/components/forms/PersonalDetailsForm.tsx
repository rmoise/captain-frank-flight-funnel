import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '../Input';
import { AutocompleteInput } from '../AutocompleteInput';
import { useAppDispatch } from '@/store/hooks';
import { setPersonalDetails, completeStep, markStepIncomplete } from '@/store/bookingSlice';
import type { PassengerDetails } from '@/types';

interface FormPersonalDetails {
  firstName: string;
  lastName: string;
  email: string;
  salutation: string;
  phone: string;
}

const SALUTATION_OPTIONS = [
  { value: 'Mr.', label: 'Mr.' },
  { value: 'Mrs.', label: 'Mrs.' },
  { value: 'Ms.', label: 'Ms.' },
  { value: 'Dr.', label: 'Dr.' },
];

interface PersonalDetailsFormProps {
  onComplete: (details: PassengerDetails | null) => void;
  onInteract?: () => void;
}

export const PersonalDetailsForm: React.FC<PersonalDetailsFormProps> = ({
  onComplete,
  onInteract,
}) => {
  const dispatch = useAppDispatch();
  const [values, setValues] = useState<FormPersonalDetails>({
    firstName: '',
    lastName: '',
    email: '',
    salutation: '',
    phone: '',
  });

  const [focusedField, setFocusedField] = useState<keyof FormPersonalDetails | null>(null);
  const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof FormPersonalDetails, boolean>>>({});
  const [hasInteracted, setHasInteracted] = useState(false);
  const [dirtyFields, setDirtyFields] = useState<Partial<Record<keyof FormPersonalDetails, boolean>>>({});

  // Validation functions
  const isFormValid = useCallback(() => {
    const hasValidEmail = values.email && /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email);
    const hasRequiredFields = values.salutation?.trim() && values.firstName?.trim() && values.lastName?.trim() && hasValidEmail;
    return hasRequiredFields;
  }, [values]);

  // Update parent and Redux state
  const updateState = useCallback(() => {
    const isValid = isFormValid();
    // Add a default phone value when sending to parent/Redux
    const detailsWithPhone = isValid ? { ...values, phone: '' } : null;
    onComplete?.(detailsWithPhone);
    dispatch(setPersonalDetails(detailsWithPhone));

    // Update step completion status
    if (isValid) {
      dispatch(completeStep(3));
    } else {
      dispatch(markStepIncomplete(3));
    }
  }, [isFormValid, values, onComplete, dispatch]);

  // Handle initial load
  useEffect(() => {
    const savedDetailsStr = localStorage.getItem('personalDetails');
    if (savedDetailsStr) {
      try {
        const savedDetails = JSON.parse(savedDetailsStr);
        if (
          savedDetails &&
          savedDetails.firstName?.trim() &&
          savedDetails.lastName?.trim() &&
          savedDetails.email?.trim()
        ) {
          setValues({
            firstName: savedDetails.firstName,
            lastName: savedDetails.lastName,
            email: savedDetails.email,
            salutation: savedDetails.salutation || '',
            phone: savedDetails.phone || '',
          });
        }
      } catch (error) {
        console.error('Failed to parse localStorage values:', error);
      }
    }
  }, []);

  // Handle form changes
  useEffect(() => {
    updateState();
  }, [values, updateState]);

  // Handle interaction
  const handleInteraction = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
      onInteract?.();
    }
    updateState();
  }, [hasInteracted, onInteract, updateState]);

  const handleInputChange = useCallback((field: keyof FormPersonalDetails, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setTouchedFields(prev => ({ ...prev, [field]: true }));

    if (value.trim() === '') {
      setDirtyFields(prev => ({ ...prev, [field]: true }));
    }

    handleInteraction();
  }, [handleInteraction]);

  const handleBlur = useCallback((field: keyof FormPersonalDetails) => {
    setFocusedField(null);
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    handleInteraction();
  }, [handleInteraction]);

  const getError = useCallback((field: keyof FormPersonalDetails): string | null => {
    if (!touchedFields[field] && !dirtyFields[field]) return null;

    const value = values[field]?.trim();
    if (!value) {
      const fieldName = field === 'firstName' ? 'First Name' :
                       field === 'lastName' ? 'Last Name' :
                       field === 'salutation' ? 'Salutation' :
                       'Email';
      return `${fieldName} is required`;
    }

    if (field === 'email' && value && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
      return 'Invalid email address';
    }

    return null;
  }, [values, touchedFields, dirtyFields]);

  const handleFocus = useCallback((field: keyof FormPersonalDetails) => {
    setFocusedField(field);
    handleInteraction();
  }, [handleInteraction]);

  // Save form values to localStorage
  useEffect(() => {
    localStorage.setItem('personalDetails', JSON.stringify(values));
  }, [values]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const passengerDetails = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email
    };
    onComplete?.(passengerDetails);
    dispatch(setPersonalDetails(passengerDetails));
    localStorage.setItem('personalDetails', JSON.stringify(values));
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6" onClick={(e) => e.stopPropagation()} data-step="3">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Salutation */}
        <div onClick={(e) => e.stopPropagation()}>
          <AutocompleteInput
            label="Salutation"
            value={values.salutation}
            options={SALUTATION_OPTIONS}
            onChange={(value) => {
              handleInputChange('salutation', value);
            }}
            onFocus={() => {
              handleFocus('salutation');
            }}
            onBlur={() => {
              handleBlur('salutation');
            }}
            isFocused={focusedField === 'salutation'}
            required={true}
            error={getError('salutation')}
          />
          {getError('salutation') && (
            <p className="mt-1 text-sm text-[#F54538]">{getError('salutation')}</p>
          )}
        </div>

        {/* Names Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name */}
          <div onClick={(e) => e.stopPropagation()}>
            <Input
              label="First Name"
              value={values.firstName}
              onChange={(value) => {
                handleInputChange('firstName', value);
              }}
              onFocus={() => {
                handleFocus('firstName');
              }}
              onBlur={() => {
                handleBlur('firstName');
              }}
              isFocused={focusedField === 'firstName'}
              required={true}
              error={getError('firstName')}
              autocomplete="given-name"
            />
            {getError('firstName') && (
              <p className="mt-1 text-sm text-[#F54538]">{getError('firstName')}</p>
            )}
          </div>

          {/* Last Name */}
          <div onClick={(e) => e.stopPropagation()}>
            <Input
              label="Last Name"
              value={values.lastName}
              onChange={(value) => {
                handleInputChange('lastName', value);
              }}
              onFocus={() => {
                handleFocus('lastName');
              }}
              onBlur={() => {
                handleBlur('lastName');
              }}
              isFocused={focusedField === 'lastName'}
              required={true}
              error={getError('lastName')}
              autocomplete="family-name"
            />
            {getError('lastName') && (
              <p className="mt-1 text-sm text-[#F54538]">{getError('lastName')}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div onClick={(e) => e.stopPropagation()}>
          <Input
            type="email"
            label="Email Address"
            value={values.email}
            onChange={(value) => {
              handleInputChange('email', value);
            }}
            onFocus={() => {
              handleFocus('email');
            }}
            onBlur={() => {
              handleBlur('email');
            }}
            isFocused={focusedField === 'email'}
            required={true}
            error={getError('email')}
            autocomplete="email"
          />
          {getError('email') && (
            <p className="mt-1 text-sm text-[#F54538]">{getError('email')}</p>
          )}
        </div>
      </form>
    </div>
  );
};