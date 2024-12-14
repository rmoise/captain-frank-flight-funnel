import React, { useState, useEffect } from 'react';
import { Input } from '../Input';

interface PersonalDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface PersonalDetailsFormProps {
  onComplete: (details: PersonalDetails) => void;
  shouldStayOpen?: boolean;
  onInteract?: () => void;
}

export const PersonalDetailsForm: React.FC<PersonalDetailsFormProps> = ({
  onComplete,
  shouldStayOpen = true,
  onInteract,
}) => {
  const [values, setValues] = useState<PersonalDetails>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [focusedField, setFocusedField] = useState<keyof PersonalDetails | null>(null);
  const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof PersonalDetails, boolean>>>({});
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleInputChange = (field: keyof PersonalDetails, value: string) => {
    const newValues = { ...values, [field]: value };
    setValues(newValues);

    // Check if all fields are filled and valid
    const isValid = Object.values(newValues).every(val => val.trim() !== '') &&
      !getError('email') && !getError('phone');
    if (isValid) {
      onComplete(newValues);
    }
  };

  const handleFocus = (field: keyof PersonalDetails) => {
    setFocusedField(field);
  };

  const handleBlur = (field: keyof PersonalDetails) => {
    setFocusedField(null);
    setTouchedFields(prev => ({ ...prev, [field]: true }));

    // Mark as interacted if the field is empty after leaving it
    if (!values[field]?.trim()) {
      if (!hasInteracted) {
        setHasInteracted(true);
        onInteract?.();
      }
    }
  };

  const getError = (field: keyof PersonalDetails): string | null => {
    if (!touchedFields[field]) return null;

    if (!values[field]?.trim()) {
      const fieldName = field === 'firstName' ? 'First Name' :
                       field === 'lastName' ? 'Last Name' :
                       field.charAt(0).toUpperCase() + field.slice(1);
      return `${fieldName} is required`;
    }

    if (field === 'email' && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
      return 'Invalid email address';
    }

    if (field === 'phone' && !/^[0-9+\-\s()]*$/.test(values.phone)) {
      return 'Invalid phone number';
    }

    return null;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="space-y-6">
        {/* Names Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name */}
          <div>
            <Input
              label="First Name"
              value={values.firstName}
              onChange={(value) => handleInputChange('firstName', value)}
              onFocus={() => handleFocus('firstName')}
              onBlur={() => handleBlur('firstName')}
              isFocused={focusedField === 'firstName'}
              required={true}
            />
            {getError('firstName') && (
              <p className="mt-1 text-sm text-[#F54538]">{getError('firstName')}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <Input
              label="Last Name"
              value={values.lastName}
              onChange={(value) => handleInputChange('lastName', value)}
              onFocus={() => handleFocus('lastName')}
              onBlur={() => handleBlur('lastName')}
              isFocused={focusedField === 'lastName'}
              required={true}
            />
            {getError('lastName') && (
              <p className="mt-1 text-sm text-[#F54538]">{getError('lastName')}</p>
            )}
          </div>
        </div>

        {/* Contact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email */}
          <div>
            <Input
              type="email"
              label="Email Address"
              value={values.email}
              onChange={(value) => handleInputChange('email', value)}
              onFocus={() => handleFocus('email')}
              onBlur={() => handleBlur('email')}
              isFocused={focusedField === 'email'}
              required={true}
            />
            {getError('email') && (
              <p className="mt-1 text-sm text-[#F54538]">{getError('email')}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <Input
              type="tel"
              label="Phone Number"
              value={values.phone}
              onChange={(value) => handleInputChange('phone', value)}
              onFocus={() => handleFocus('phone')}
              onBlur={() => handleBlur('phone')}
              isFocused={focusedField === 'phone'}
              required={true}
            />
            {getError('phone') && (
              <p className="mt-1 text-sm text-[#F54538]">{getError('phone')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};