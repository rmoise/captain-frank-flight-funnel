'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { validateForm } from '@/utils/validation';
import FormError from '@/components/shared/FormError';
import { useLoading } from '@/providers/LoadingProvider';
import { PhaseGuard } from '@/components/shared/PhaseGuard';
import SignaturePad, {
  SignaturePadRef,
} from '@/components/shared/SignaturePad';
import { ConsentCheckbox } from '@/components/ConsentCheckbox';
import { SpeechBubble } from '@/components/SpeechBubble';
import api from '@/services/api';
import type { Flight } from '@/types/store';
import type { OrderClaimRequest } from '@/services/api';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { AccordionCard } from '@/components/shared/AccordionCard';
import { accordionConfig } from '@/config/accordion';
import {
  setPersonalDetails,
  setSelectedFlight,
  setBookingNumber,
  setWizardAnswers,
} from '@/store/slices/bookingSlice';
import { setCurrentPhase } from '@/store/slices/progressSlice';

interface FormData {
  hasAcceptedTerms: boolean;
  hasAcceptedPrivacy: boolean;
  hasAcceptedMarketing: boolean;
  signature: string;
}

interface FormErrors {
  [key: string]: string[];
}

export default function AgreementPage() {
  const router = useRouter();
  const { showLoading, hideLoading } = useLoading();
  const dispatch = useAppDispatch();
  const flightDetails = useAppSelector((state) => state.booking.selectedFlight);
  const personalDetails = useAppSelector(
    (state) => state.booking.personalDetails
  );
  const bookingNumber = useAppSelector((state) => state.booking.bookingNumber);
  const completedPhases = useAppSelector(
    (state) => state.progress.completedPhases
  );
  const signatureRef = useRef<SignaturePadRef>(null);
  const [mounted, setMounted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validationRules = {
    hasAcceptedTerms: [
      {
        test: (value: unknown) => value === true,
        message: 'You must accept the terms and conditions',
      },
    ],
    hasAcceptedPrivacy: [
      {
        test: (value: unknown) => value === true,
        message: 'You must accept the privacy policy',
      },
    ],
    signature: [
      {
        test: (value: unknown) =>
          typeof value === 'string' && value.trim().length > 0,
        message: 'Please provide your signature',
      },
    ],
  };

  useEffect(() => {
    if (!mounted) {
      const initializeState = () => {
        try {
          // Check if we have all required data before proceeding
          const savedBookingState = localStorage.getItem('bookingState');
          const savedWizardAnswers = localStorage.getItem('wizardAnswers');
          const savedPersonalDetails = localStorage.getItem('personalDetails');
          const savedSelectedFlights = localStorage.getItem('selectedFlights');
          const savedBookingNumber = localStorage.getItem('bookingNumber');
          const savedCompletedPhases = localStorage.getItem('completedPhases');

          // Validate booking number length
          const isValidBookingNumber = (num: string) => {
            const trimmed = num.trim();
            return trimmed.length === 6 || trimmed.length === 13;
          };

          // Only set valid booking numbers
          if (savedBookingNumber && isValidBookingNumber(savedBookingNumber)) {
            console.log('Setting initial booking number:', savedBookingNumber);
            const trimmedNumber = savedBookingNumber.trim();
            dispatch(setBookingNumber(trimmedNumber));
            localStorage.setItem('bookingNumber', trimmedNumber);
          } else if (savedBookingNumber) {
            // Remove invalid booking number
            console.log('Removing invalid booking number:', savedBookingNumber);
            localStorage.removeItem('bookingNumber');
            dispatch(setBookingNumber(null));
          }

          // Parse completed phases
          const completedPhases = savedCompletedPhases
            ? JSON.parse(savedCompletedPhases)
            : [];

          // Verify all previous phases are completed
          const requiredPhases = [1, 2, 3, 4, 5];
          const hasAllRequiredPhases = requiredPhases.every((phase) =>
            completedPhases.includes(phase)
          );

          if (!hasAllRequiredPhases) {
            console.error(
              'Missing required phases:',
              requiredPhases.filter((phase) => !completedPhases.includes(phase))
            );
            router.push('/phases/initial-assessment');
            return;
          }

          // Set current phase to 6
          dispatch(setCurrentPhase(6));
          localStorage.setItem('currentPhase', '6');

          // Restore booking state
          if (savedBookingState) {
            const bookingState = JSON.parse(savedBookingState);
            if (bookingState.wizardAnswers) {
              dispatch(setWizardAnswers(bookingState.wizardAnswers));
            }
            if (bookingState.personalDetails) {
              dispatch(setPersonalDetails(bookingState.personalDetails));
            }
            if (bookingState.selectedFlight) {
              dispatch(setSelectedFlight(bookingState.selectedFlight));
            }
            if (bookingState.bookingNumber) {
              dispatch(setBookingNumber(bookingState.bookingNumber));
            }
          }

          // Restore individual states if not in booking state
          if (savedWizardAnswers) {
            dispatch(setWizardAnswers(JSON.parse(savedWizardAnswers)));
          }
          if (savedPersonalDetails) {
            dispatch(setPersonalDetails(JSON.parse(savedPersonalDetails)));
          }
          if (savedSelectedFlights) {
            dispatch(setSelectedFlight(JSON.parse(savedSelectedFlights)));
          }
          if (savedBookingNumber) {
            dispatch(setBookingNumber(savedBookingNumber));
          }

          setMounted(true);
        } catch (error) {
          console.error('Error initializing agreement page:', error);
          router.push('/phases/initial-assessment');
        }
      };

      initializeState();
    }
  }, [dispatch, mounted, router]);

  useEffect(() => {
    const loadPersonalDetails = () => {
      const savedPersonalDetails = localStorage.getItem('personalDetails');
      console.log('Raw saved personal details:', savedPersonalDetails);

      if (!savedPersonalDetails || savedPersonalDetails === 'null') {
        console.error('No valid personal details found in localStorage');
        setErrors({
          submit: [
            'Error loading personal details. Please go back and check your information.',
          ],
        });
        return;
      }

      try {
        const details = JSON.parse(savedPersonalDetails);
        console.log('Parsed personal details:', details);

        if (!details) {
          setErrors({
            submit: [
              'Invalid personal details format. Please go back and fill in your information.',
            ],
          });
          return;
        }

        // Format the fields before setting
        const formattedDetails = {
          salutation: details.salutation?.toString().trim() || '',
          firstName: details.firstName?.toString().trim() || '',
          lastName: details.lastName?.toString().trim() || '',
          email: details.email?.toString().trim() || '',
          phone: details.phone?.toString().trim() || '',
          address: details.address?.toString().trim() || '',
          zipCode: details.zipCode?.toString().trim() || '',
          city: details.city?.toString().trim() || '',
          country: details.country?.toString().trim() || '',
        };

        // Check for required fields
        const missingFields = Object.entries(formattedDetails)
          .filter(([key, value]) => !value && key !== 'phone') // phone is optional
          .map(([key]) => key);

        if (missingFields.length > 0) {
          console.error('Missing required fields:', missingFields);
          setErrors({
            submit: [
              `Missing required fields: ${missingFields.join(
                ', '
              )}. Please go back and fill in all required information.`,
            ],
          });
          return;
        }

        // Set in Redux and localStorage
        dispatch(setPersonalDetails(formattedDetails));
        localStorage.setItem(
          'personalDetails',
          JSON.stringify(formattedDetails)
        );
        console.log('Personal details saved successfully');
      } catch (error) {
        console.error('Error parsing personal details:', error);
        console.error(
          'Raw personal details that failed:',
          savedPersonalDetails
        );
        setErrors({
          submit: [
            'Error loading personal details. Please go back and check your information.',
          ],
        });
      }
    };

    loadPersonalDetails();
  }, [dispatch]);

  useEffect(() => {
    const savedPersonalDetails = localStorage.getItem('personalDetails');
    console.log('Raw saved personal details:', savedPersonalDetails);

    if (savedPersonalDetails) {
      try {
        const details = JSON.parse(savedPersonalDetails);
        console.log('Parsed personal details:', details);

        // Ensure all required fields are present and not empty
        const requiredFields = [
          'salutation',
          'firstName',
          'lastName',
          'email',
          'phone',
          'address',
          'zipCode',
          'city',
          'country',
        ];

        // Check each field individually and log any missing ones
        const missingFields = requiredFields.filter(
          (field) => !details[field] || !details[field].toString().trim()
        );

        if (missingFields.length > 0) {
          console.error('Missing required fields:', missingFields);
          setErrors({
            submit: [
              `Missing required fields: ${missingFields.join(
                ', '
              )}. Please go back and fill in all required information.`,
            ],
          });
          return;
        }

        // Format the fields before setting
        const formattedDetails = {
          ...details,
          city: details.city.toString().trim(),
          address: details.address.toString().trim(),
          zipCode: details.zipCode.toString().trim(),
          country: details.country.toString().trim(),
          phone: details.phone?.toString().trim() || '',
        };

        // Log the formatted details before setting
        console.log('Formatted personal details:', formattedDetails);

        // Set in Redux and localStorage
        dispatch(setPersonalDetails(formattedDetails));
        localStorage.setItem(
          'personalDetails',
          JSON.stringify(formattedDetails)
        );

        // Log success message
        console.log('Personal details saved successfully');
      } catch (error) {
        console.error('Error parsing personal details:', error);
        console.error(
          'Raw personal details that failed:',
          savedPersonalDetails
        );
        setErrors({
          submit: [
            'Error loading personal details. Please go back and check your information.',
          ],
        });
      }
    } else {
      console.error('No personal details found in localStorage');
      setErrors({
        submit: [
          'No personal details found. Please go back and fill in your information.',
        ],
      });
    }

    // Load flight details from flightDetails
    const flightDetailsStr = localStorage.getItem('flightDetails');
    console.log('Flight Details from localStorage:', flightDetailsStr);
    if (flightDetailsStr) {
      try {
        const details = JSON.parse(flightDetailsStr);
        console.log('Parsed Flight Details:', details);

        // Only set booking number if we don't already have one
        const currentBookingNumber = localStorage.getItem('bookingNumber');

        // Only extract and use booking number if it's valid (6 or 13 characters)
        const isValidBookingNumber = (num: string) => {
          const trimmed = num.trim();
          return trimmed.length === 6 || trimmed.length === 13;
        };

        // Don't extract or use invalid booking numbers
        const extractedBookingNumber = !currentBookingNumber
          ? (() => {
              const possibleNumber =
                details.bookingNumber ||
                details.flight?.bookingReference ||
                details.flight?.bookingNumber ||
                details.bookingReference;
              return possibleNumber && isValidBookingNumber(possibleNumber)
                ? possibleNumber.trim()
                : null;
            })()
          : null;

        console.log('Extracted Booking Number:', extractedBookingNumber);

        // Only set if we don't have a booking number and found a valid one
        if (!currentBookingNumber && extractedBookingNumber) {
          dispatch(setBookingNumber(extractedBookingNumber));
          localStorage.setItem('bookingNumber', extractedBookingNumber);
        }

        // Set flight details in Redux
        if (details.flight) {
          // Handle flight details with nested flight object
          const flight = {
            ...details.flight,
            // Only use booking references that are valid
            bookingReference:
              (currentBookingNumber &&
              isValidBookingNumber(currentBookingNumber)
                ? currentBookingNumber
                : null) ||
              (extractedBookingNumber &&
              isValidBookingNumber(extractedBookingNumber)
                ? extractedBookingNumber
                : null),
          } as Flight;
          dispatch(setSelectedFlight(flight));
        } else if (Array.isArray(details)) {
          // Handle array of flights
          const flight = {
            ...details[0],
            bookingReference:
              (currentBookingNumber &&
              isValidBookingNumber(currentBookingNumber)
                ? currentBookingNumber
                : null) ||
              (extractedBookingNumber &&
              isValidBookingNumber(extractedBookingNumber)
                ? extractedBookingNumber
                : null) ||
              (details[0].bookingReference &&
              isValidBookingNumber(details[0].bookingReference)
                ? details[0].bookingReference
                : null) ||
              (details[0].bookingNumber &&
              isValidBookingNumber(details[0].bookingNumber)
                ? details[0].bookingNumber
                : null),
          } as Flight;
          dispatch(setSelectedFlight(flight));
        } else {
          // Handle single flight object
          const flight = {
            ...details,
            bookingReference:
              (currentBookingNumber &&
              isValidBookingNumber(currentBookingNumber)
                ? currentBookingNumber
                : null) ||
              (extractedBookingNumber &&
              isValidBookingNumber(extractedBookingNumber)
                ? extractedBookingNumber
                : null) ||
              (details.bookingReference &&
              isValidBookingNumber(details.bookingReference)
                ? details.bookingReference
                : null) ||
              (details.bookingNumber &&
              isValidBookingNumber(details.bookingNumber)
                ? details.bookingNumber
                : null),
          } as Flight;
          dispatch(setSelectedFlight(flight));
        }
      } catch (error) {
        console.error('Error loading flight details:', error);
      }
    }

    // If no booking number from flight details, try loading from localStorage directly
    const savedBookingNumber = localStorage.getItem('bookingNumber');
    console.log('Saved Booking Number:', savedBookingNumber);
    if (savedBookingNumber) {
      dispatch(setBookingNumber(savedBookingNumber));
    }

    // If still no booking number, try to get it from the selected flights
    const selectedFlightsStr = localStorage.getItem('selectedFlights');
    if (selectedFlightsStr) {
      try {
        const flights = JSON.parse(selectedFlightsStr);
        console.log('Selected Flights:', flights);
        if (Array.isArray(flights) && flights.length > 0) {
          const flightBookingNumber =
            flights[0].bookingReference || flights[0].bookingNumber;
          if (flightBookingNumber) {
            dispatch(setBookingNumber(flightBookingNumber));
            localStorage.setItem('bookingNumber', flightBookingNumber);
          }
        }
      } catch (error) {
        console.error('Error loading selected flights:', error);
      }
    }
  }, [dispatch]);

  // Add a separate effect to handle booking number updates
  useEffect(() => {
    if (bookingNumber) {
      localStorage.setItem('bookingNumber', bookingNumber);
    }
  }, [bookingNumber]);

  // Debug current state
  useEffect(() => {
    console.log('Current Flight Details:', flightDetails);
    console.log('Current Booking Number:', bookingNumber);
  }, [flightDetails, bookingNumber]);

  const [formData, setFormData] = useState<FormData>({
    hasAcceptedTerms: false,
    hasAcceptedPrivacy: false,
    hasAcceptedMarketing: false,
    signature: '',
  });

  const [hasSignature, setHasSignature] = useState(false);
  const [hasInteractedWithSignature, setHasInteractedWithSignature] =
    useState(false);

  const isSignatureEmpty = () => {
    if (!signatureRef.current) return true;
    return signatureRef.current.isEmpty();
  };

  // Load saved state on mount
  useEffect(() => {
    const savedFormData = localStorage.getItem('agreementFormData');
    const savedSignature = localStorage.getItem('agreementSignature');

    if (savedFormData) {
      try {
        const parsedFormData = JSON.parse(savedFormData);
        setFormData(parsedFormData);
      } catch (error) {
        console.error('Error loading form data:', error);
      }
    }

    // Create a function to load the signature
    const loadSignature = () => {
      if (savedSignature && signatureRef.current) {
        try {
          signatureRef.current.fromDataURL(savedSignature);
          setFormData((prev) => ({
            ...prev,
            signature: savedSignature,
          }));
          setHasSignature(true);
        } catch (error) {
          console.error('Error loading signature:', error);
        }
      }
    };

    // Try to load immediately
    loadSignature();

    // Also try again after a short delay to ensure canvas is ready
    const retryTimeout = setTimeout(loadSignature, 500);

    return () => clearTimeout(retryTimeout);
  }, []);

  const handleSignatureStart = () => {
    setHasInteractedWithSignature(true);
  };

  const handleSignatureEnd = () => {
    if (signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL();
      const isEmpty = isSignatureEmpty();

      if (!isEmpty) {
        localStorage.setItem('agreementSignature', signatureData);
        setFormData((prev) => ({
          ...prev,
          signature: signatureData,
        }));
        setHasSignature(true);
        setErrors((prev) => ({ ...prev, signature: [] }));
      } else {
        setHasSignature(false);
        if (hasInteractedWithSignature) {
          setErrors((prev) => ({
            ...prev,
            signature: ['Please provide your signature'],
          }));
        }
      }
    }
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      localStorage.removeItem('agreementSignature');
      setFormData((prev) => ({
        ...prev,
        signature: '',
      }));
      setHasSignature(false);
      setHasInteractedWithSignature(false);
      setErrors((prev) => ({
        ...prev,
        signature: [],
      }));
    }
  };

  const handleTermsChange = (field: keyof FormData) => (checked: boolean) => {
    const updatedFormData = {
      ...formData,
      [field]: checked,
    };
    setFormData(updatedFormData);
    localStorage.setItem('agreementFormData', JSON.stringify(updatedFormData));
    setErrors((prev) => ({ ...prev, [field]: [] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const signatureData = signatureRef.current?.toDataURL() || '';
    const updatedFormData = {
      ...formData,
      signature: signatureData,
    };

    const validationErrors = validateForm(updatedFormData, validationRules);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    showLoading('Evaluating and submitting your claim...');

    try {
      // Get flight ID from either array or single flight object
      const flightId = Array.isArray(flightDetails)
        ? flightDetails[0]?.id
        : flightDetails?.id;

      if (!flightId) {
        setErrors({
          submit: [
            'Missing flight details. Please go back and select a flight.',
          ],
        });
        hideLoading();
        return;
      }

      if (!personalDetails) {
        setErrors({
          submit: [
            'Missing personal details. Please go back and fill in your information.',
          ],
        });
        hideLoading();
        return;
      }

      const {
        salutation,
        firstName,
        lastName,
        email,
        phone,
        address,
        zipCode,
        city,
        country,
      } = personalDetails;

      // Log personal details for debugging
      console.log('Personal details before validation:', {
        salutation,
        firstName,
        lastName,
        email,
        phone,
        address,
        zipCode,
        city,
        country,
      });

      // Validate all required personal details
      const requiredFields = {
        salutation,
        firstName,
        lastName,
        email,
        phone,
        address,
        zipCode,
        city,
        country,
      };

      // Check each field individually and log any missing ones
      Object.entries(requiredFields).forEach(([field, value]) => {
        if (!value || (typeof value === 'string' && !value.trim())) {
          console.error(`Missing or empty field: ${field}, value:`, value);
        }
      });

      const missingFields = Object.entries(requiredFields)
        .filter(([field, value]) => {
          const isEmpty =
            !value || (typeof value === 'string' && !value.trim());
          if (isEmpty) {
            console.error(`Missing required field: ${field}, value:`, value);
          }
          return isEmpty;
        })
        .map(([field]) => field);

      if (missingFields.length > 0) {
        console.error('Missing fields:', missingFields);
        setErrors({
          submit: [
            `Missing required fields: ${missingFields.join(
              ', '
            )}. Please go back and fill in all required information.`,
          ],
        });
        hideLoading();
        return;
      }

      // Validate city before making the API call
      if (!city || !city.trim()) {
        console.error('City is empty or whitespace');
        setErrors({
          submit: ['City is required. Please go back and provide your city.'],
        });
        hideLoading();
        return;
      }

      // Ensure city is properly formatted
      const formattedCity = city.trim();
      console.log('City value before API call:', formattedCity);
      console.log('City value length:', formattedCity.length);
      console.log('City value type:', typeof formattedCity);

      if (formattedCity.length < 2) {
        console.error('City name too short:', formattedCity);
        setErrors({
          submit: ['City name must be at least 2 characters long.'],
        });
        hideLoading();
        return;
      }

      // Validate booking number before making the API call
      const currentBookingNumber =
        bookingNumber || localStorage.getItem('bookingNumber') || '';

      // Ensure booking number is properly formatted
      const formattedBookingNumber = currentBookingNumber.trim();

      // Debug logs
      console.log('Debug - Booking Number Validation:', {
        bookingNumberFromRedux: bookingNumber,
        bookingNumberFromLocalStorage: localStorage.getItem('bookingNumber'),
        currentBookingNumber: formattedBookingNumber,
        length: formattedBookingNumber.length,
        value: formattedBookingNumber,
      });

      if (
        !formattedBookingNumber ||
        (formattedBookingNumber.length !== 6 &&
          formattedBookingNumber.length !== 13)
      ) {
        console.error('Invalid booking number:', {
          value: formattedBookingNumber,
          length: formattedBookingNumber.length,
        });
        setErrors({
          submit: ['Invalid booking reference. Must be 6 or 13 characters.'],
        });
        hideLoading();
        return;
      }

      // First, get the stored evaluation result
      const storedEvaluation = localStorage.getItem('evaluationResult');
      if (!storedEvaluation) {
        setErrors({
          submit: [
            'No evaluation result found. Please go back and evaluate your claim first.',
          ],
        });
        hideLoading();
        return;
      }

      try {
        const evaluationResponse = JSON.parse(storedEvaluation);
        console.log('Using stored evaluation result:', evaluationResponse);

        // Format date as YYYY-MM-DD
        const formattedDate = new Date().toISOString().split('T')[0];

        // Add evaluation data to request
        const orderRequestData: OrderClaimRequest = {
          journey_booked_flightids: [flightId],
          journey_fact_flightids: [flightId],
          information_received_at: formattedDate,
          journey_booked_pnr: currentBookingNumber,
          journey_fact_type: 'self',
          owner_salutation: salutation === 'Mr' ? 'herr' : 'frau',
          owner_firstname: firstName,
          owner_lastname: lastName,
          owner_street: address,
          owner_place: formattedCity,
          owner_city: formattedCity,
          owner_zip: zipCode,
          owner_country: country,
          owner_email: email,
          owner_phone: phone || '',
          owner_marketable_status: formData.hasAcceptedMarketing,
          contract_signature: signatureData,
          contract_tac: formData.hasAcceptedTerms,
          contract_dp: formData.hasAcceptedPrivacy,
        };

        console.log('Full request data:', orderRequestData);

        // Immediately submit the order with the same data
        await api.orderClaim(orderRequestData);

        // Only redirect on successful submission
        router.push('/claim-submitted');
      } catch (error) {
        console.error('API Error:', error);
        hideLoading();

        // Handle API errors
        if (error instanceof Error) {
          const apiError = error as {
            data?: {
              errors?: Record<string, string[]>;
              message?: string;
              error?: string;
              body?: string;
            };
            message?: string;
          };

          // Handle error with specific field errors
          if (apiError.data?.errors) {
            const fieldErrors = apiError.data.errors;

            // Handle specific field errors
            if (fieldErrors.owner_place) {
              setErrors({
                submit: [
                  'City is required. Please check your city information.',
                ],
              });
              return;
            }

            if (fieldErrors.journey_booked_pnr) {
              setErrors({
                submit: [
                  'Booking reference is required. Please check your booking number.',
                ],
              });
              return;
            }

            // Handle other field errors
            const errorMessages = Object.entries(fieldErrors)
              .map(([field, messages]) => {
                const fieldName = field.replace(/_/g, ' ');
                const message = Array.isArray(messages)
                  ? messages[0]
                  : messages;
                return `${fieldName}: ${message}`;
              })
              .join('\n');

            setErrors({
              submit: [`Validation failed:\n${errorMessages}`],
            });
            return;
          }

          // Try to parse error from response body
          if (apiError.data?.body) {
            try {
              const originalError = JSON.parse(apiError.data.body);
              if (originalError.errors) {
                const fieldErrors = originalError.errors;
                const errorMessages = Object.entries(fieldErrors)
                  .map(([field, messages]) => {
                    const fieldName = field.replace(/_/g, ' ');
                    const message = Array.isArray(messages)
                      ? messages[0]
                      : messages;
                    return `${fieldName}: ${message}`;
                  })
                  .join('\n');

                setErrors({
                  submit: [`Validation failed:\n${errorMessages}`],
                });
                return;
              }
            } catch (parseError) {
              console.error('Could not parse original error:', parseError);
            }
          }

          // Handle error message from API
          const errorMessage =
            apiError.data?.message ||
            apiError.data?.error ||
            apiError.message ||
            'An unknown error occurred';

          // Translate common German error messages
          if (errorMessage === 'Diese Angabe ist ein Pflichtfeld.') {
            setErrors({
              submit: [
                'This field is required. Please check all required fields.',
              ],
            });
          } else {
            setErrors({
              submit: [errorMessage],
            });
          }
          return;
        }

        // Handle generic errors
        setErrors({
          submit: [
            'Failed to submit claim. Please try again or contact support if the problem persists.',
          ],
        });
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({
        submit: ['An unexpected error occurred. Please try again.'],
      });
      hideLoading();
    }
  };

  const canSubmit = () => {
    const signatureValid =
      hasSignature && formData.signature.length > 0 && !isSignatureEmpty();
    const termsValid = formData.hasAcceptedTerms && formData.hasAcceptedPrivacy;
    console.log('Submit validation:', {
      signatureValid,
      hasSignature,
      signatureLength: formData.signature.length,
      isEmpty: isSignatureEmpty(),
      termsValid,
      hasAcceptedTerms: formData.hasAcceptedTerms,
      hasAcceptedPrivacy: formData.hasAcceptedPrivacy,
    });
    return signatureValid && termsValid;
  };

  // Add state for handling back navigation
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);

  // Add effect for handling back navigation
  useEffect(() => {
    if (!isNavigatingBack) return;

    const handleBackNavigation = async () => {
      try {
        // Set phase information before navigation
        localStorage.setItem('currentPhase', '5');
        localStorage.setItem(
          'completedPhases',
          JSON.stringify([1, 2, 3, 4, 5])
        );

        // Get evaluation result and selected flight for URL parameters
        const searchParams = new URLSearchParams();
        const evaluationResult = localStorage.getItem('evaluationResult');

        if (evaluationResult) {
          const result = JSON.parse(evaluationResult);
          searchParams.set(
            'amount',
            (result.contract?.amount || 600).toString()
          );
          searchParams.set('currency', 'EUR');
          searchParams.set(
            'provision',
            (result.contract?.provision || '30%').toString()
          );
        } else {
          searchParams.set('amount', '600');
          searchParams.set('currency', 'EUR');
          searchParams.set('provision', '30%');
        }

        // Add flight details to URL parameters
        const flight = Array.isArray(flightDetails)
          ? flightDetails[0]
          : flightDetails;
        if (flight) {
          if (flight.departureAirport || flight.departure) {
            searchParams.set(
              'depAirport',
              flight.departureAirport || flight.departure
            );
          }
          if (flight.arrivalAirport || flight.arrival) {
            searchParams.set(
              'arrAirport',
              flight.arrivalAirport || flight.arrival
            );
          }
          if (flight.scheduledDepartureTime || flight.dep_time_sched) {
            searchParams.set(
              'depTime',
              flight.scheduledDepartureTime || flight.dep_time_sched
            );
          }
          if (flight.bookingReference || bookingNumber) {
            searchParams.set(
              'bookingRef',
              flight.bookingReference || bookingNumber
            );
          }
        }

        // Navigate to claim success page
        await router.push(`/claim-success?${searchParams.toString()}`);
      } catch (error) {
        console.error('Error during back navigation:', error);
      } finally {
        // Reset navigation state
        setIsNavigatingBack(false);
      }
    };

    handleBackNavigation();

    // Cleanup function
    return () => {
      setIsNavigatingBack(false);
    };
  }, [isNavigatingBack, router, flightDetails, bookingNumber]);

  return (
    <PhaseGuard phase={6}>
      <div className="min-h-screen bg-[#f5f7fa]">
        <PhaseNavigation currentPhase={6} completedPhases={completedPhases} />
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <form onSubmit={handleSubmit} className="space-y-6">
            <SpeechBubble message="Great! Let's finalize your claim. Please review and sign the agreement below." />
            <AccordionCard
              title="Digital Signature"
              subtitle="Please sign to confirm your agreement"
              eyebrow="Step 1"
              isCompleted={hasSignature}
              hasInteracted={hasInteractedWithSignature && !hasSignature}
              className={accordionConfig.padding.wrapper}
              stepId="digital-signature"
              isOpenByDefault={true}
            >
              <div className={accordionConfig.padding.content}>
                <div>
                  <SignaturePad
                    ref={signatureRef}
                    onBegin={handleSignatureStart}
                    onChange={(data) => {
                      setFormData((prev) => ({
                        ...prev,
                        signature: data,
                      }));
                      setHasSignature(true);
                      setErrors((prev) => ({ ...prev, signature: [] }));
                    }}
                    onEnd={handleSignatureEnd}
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-sm text-[#F54538] hover:text-[#E03F33] transition-colors"
                    >
                      Clear Signature
                    </button>
                  </div>
                  {errors.signature && (
                    <p className="mt-2 text-sm text-[#F54538]">
                      {errors.signature[0]}
                    </p>
                  )}
                </div>
              </div>
            </AccordionCard>

            <AccordionCard
              title="Terms and Conditions"
              subtitle="Please review and accept the terms to proceed."
              eyebrow="Step 2"
              isCompleted={
                formData.hasAcceptedTerms && formData.hasAcceptedPrivacy
              }
              hasInteracted={Object.keys(errors).length > 0}
              className={accordionConfig.padding.wrapper}
              stepId="terms-and-conditions"
              isOpenByDefault={true}
            >
              <div className={accordionConfig.padding.content}>
                <div className="space-y-4">
                  <ConsentCheckbox
                    id="terms"
                    label="I have read and agree to the terms and conditions."
                    checked={formData.hasAcceptedTerms}
                    onChange={handleTermsChange('hasAcceptedTerms')}
                    required
                    error={errors.hasAcceptedTerms?.length > 0}
                  />
                  <ConsentCheckbox
                    id="privacy"
                    label="I have read and agree to the privacy policy."
                    checked={formData.hasAcceptedPrivacy}
                    onChange={handleTermsChange('hasAcceptedPrivacy')}
                    required
                    error={errors.hasAcceptedPrivacy?.length > 0}
                  />
                  <ConsentCheckbox
                    id="marketing"
                    label="I agree that Captain Frank may send me advertising about Captain Frank's services, promotions and satisfaction surveys by email. Captain Frank will process my personal data for this purpose (see privacy policy). I can revoke this consent at any time."
                    checked={formData.hasAcceptedMarketing}
                    onChange={handleTermsChange('hasAcceptedMarketing')}
                    details="Stay updated with our latest services and travel tips. You can unsubscribe at any time."
                  />
                </div>
              </div>
            </AccordionCard>

            <FormError errors={errors.submit} />

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => {
                  if (!isNavigatingBack) {
                    setIsNavigatingBack(true);
                  }
                }}
                className="px-6 py-3 text-[#F54538] hover:bg-[#FEF2F2] rounded-lg transition-colors"
                disabled={isNavigatingBack}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!canSubmit()}
                className={`px-6 py-3 rounded-lg transition-colors ${
                  canSubmit()
                    ? 'bg-[#F54538] text-white hover:bg-[#E03F33]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Submit Claim
              </button>
            </div>
          </form>
        </main>
      </div>
    </PhaseGuard>
  );
}
