'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/state/store';
import { useTranslation } from '@/hooks/useTranslation';
import { PhaseGuard } from '@/components/shared/PhaseGuard';
import { SpeechBubble } from '@/components/SpeechBubble';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { Translations } from '@/translations/types';
import Image from 'next/image';

declare module '@/hooks/useTranslation' {
  interface TranslationType extends Translations {}
}

interface DocumentUploadState {
  bookingConfirmation: File | null;
  cancellationNotification: File | null;
  sharingLink: string | null;
  error: string | null;
  draggedFiles: {
    bookingConfirmation: File | null;
    cancellationNotification: File | null;
  };
  previews: {
    bookingConfirmation: string | null;
    cancellationNotification: string | null;
  };
}

const CLAIM_SUBMITTED_PHASE = 7;

export default function ClaimSubmittedPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const lang = params?.lang?.toString() || 'de';
  const { t } = useTranslation();
  const personalDetails = useStore((state) => state.personalDetails);
  const claimId = searchParams?.get('claim_id');

  const [state, setState] = useState<DocumentUploadState>({
    bookingConfirmation: null,
    cancellationNotification: null,
    sharingLink: null,
    error: null,
    draggedFiles: {
      bookingConfirmation: null,
      cancellationNotification: null,
    },
    previews: {
      bookingConfirmation: null,
      cancellationNotification: null,
    },
  });

  useEffect(() => {
    // Generate sharing link based on claim ID and email
    console.log('Debug sharing:', {
      claimId,
      email: personalDetails?.email,
      origin: window?.location?.origin,
      lang,
    });
    if (claimId && personalDetails?.email) {
      const sharingLink = `${window.location.origin}/${lang}/share/${claimId}?email=${encodeURIComponent(personalDetails.email)}`;
      console.log('Generated sharing link:', sharingLink);
      setState((prev) => ({ ...prev, sharingLink }));
    }
  }, [claimId, personalDetails?.email, lang]);

  // Add debug output for state
  useEffect(() => {
    console.log('Current state:', state);
  }, [state]);

  // Function to generate preview
  const generatePreview = useCallback(async (file: File) => {
    if (file.type === 'application/pdf') {
      return URL.createObjectURL(file);
    } else {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }
  }, []);

  const handleFileUpload = useCallback(
    async (
      type: 'bookingConfirmation' | 'cancellationNotification',
      file: File | null
    ) => {
      if (file) {
        const preview = await generatePreview(file);
        setState((prev) => ({
          ...prev,
          [type]: file,
          previews: {
            ...prev.previews,
            [type]: preview,
          },
          draggedFiles: {
            ...prev.draggedFiles,
            [type]: null,
          },
        }));
      } else {
        setState((prev) => ({
          ...prev,
          [type]: null,
          previews: {
            ...prev.previews,
            [type]: null,
          },
        }));
      }
    },
    [generatePreview]
  );

  // Add drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = useCallback(
    (
      type: 'bookingConfirmation' | 'cancellationNotification',
      e: React.DragEvent
    ) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.dataTransfer.items && e.dataTransfer.items[0]) {
        const file = e.dataTransfer.items[0].getAsFile();
        if (file && file.type.match(/^(application\/pdf|image\/(jpeg|png))$/)) {
          setState((prev) => ({
            ...prev,
            draggedFiles: {
              ...prev.draggedFiles,
              [type]: file,
            },
          }));
        }
      }
    },
    []
  );

  const handleDragLeave = useCallback(
    (
      type: 'bookingConfirmation' | 'cancellationNotification',
      e: React.DragEvent
    ) => {
      e.preventDefault();
      e.stopPropagation();

      setState((prev) => ({
        ...prev,
        draggedFiles: {
          ...prev.draggedFiles,
          [type]: null,
        },
      }));
    },
    []
  );

  const handleDrop = useCallback(
    async (
      e: React.DragEvent,
      type: 'bookingConfirmation' | 'cancellationNotification'
    ) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.type.match(/^(application\/pdf|image\/(jpeg|png))$/)) {
          await handleFileUpload(type, file);
        }
      }

      setState((prev) => ({
        ...prev,
        draggedFiles: {
          ...prev.draggedFiles,
          [type]: null,
        },
      }));
    },
    [handleFileUpload]
  );

  const handleSubmit = async () => {
    try {
      if (!state.bookingConfirmation) {
        setState((prev) => ({
          ...prev,
          error: t.phases.documentUpload.errors.noBookingConfirmation,
        }));
        return;
      }

      const formData = new FormData();
      formData.append('bookingConfirmation', state.bookingConfirmation);
      if (state.cancellationNotification) {
        formData.append(
          'cancellationNotification',
          state.cancellationNotification
        );
      }
      formData.append('claimId', claimId || '');

      const response = await fetch('/api/upload-documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload documents');
      }

      // Clear the error if upload was successful
      setState((prev) => ({ ...prev, error: null }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: t.phases.documentUpload.errors.uploadFailed,
      }));
    }
  };

  // Add client-side check
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Add this function for testing
  const setTestPersonalDetails = useCallback(() => {
    useStore.setState({
      personalDetails: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        salutation: 'herr',
        address: '123 Test St',
        postalCode: '12345',
        city: 'Test City',
        country: 'Test Country',
        phone: '',
      },
    });
  }, []);

  const handleCheckAnotherFlight = useCallback(() => {
    // Clear all state except personal details and terms acceptance
    useStore.setState((state) => ({
      ...state,
      selectedFlights: [],
      bookingNumber: undefined,
      signature: undefined,
      hasSignature: false,
      validationState: {
        ...state.validationState,
        isSignatureValid: false,
      },
      currentPhase: 1,
    }));

    // Clear localStorage except personal details and terms
    const personalDetails = localStorage.getItem('personalDetails');
    const termsAcceptance = localStorage.getItem('termsAcceptance');
    localStorage.clear();
    if (personalDetails) {
      localStorage.setItem('personalDetails', personalDetails);
    }
    if (termsAcceptance) {
      localStorage.setItem('termsAcceptance', termsAcceptance);
    }

    // Navigate to home page
    router.push(`/${lang}`);
  }, [lang, router]);

  const renderUploadArea = (
    type: 'bookingConfirmation' | 'cancellationNotification'
  ) => {
    const file = state[type];
    const preview = state.previews[type];
    const draggedFile = state.draggedFiles[type];

    return (
      <div
        className="border-2 border-dashed rounded-lg p-10 text-center transition-colors duration-200 ease-in-out hover:bg-gray-50"
        onDragOver={handleDragOver}
        onDragEnter={(e) => handleDragEnter(type, e)}
        onDragLeave={(e) => handleDragLeave(type, e)}
        onDrop={(e) => handleDrop(e, type)}
      >
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => handleFileUpload(type, e.target.files?.[0] || null)}
          className="hidden"
          id={type}
        />
        <label htmlFor={type} className="cursor-pointer block">
          {file ? (
            <div className="text-center">
              {preview && (
                <>
                  <div className="mb-4 flex flex-col items-center">
                    {file.type === 'application/pdf' ? (
                      <div className="w-[200px] h-[160px]">
                        <iframe
                          src={preview}
                          className="w-full h-full border border-gray-200 rounded-lg"
                          title="PDF preview"
                        />
                      </div>
                    ) : (
                      <Image
                        src={preview}
                        alt="Preview"
                        className="max-h-32 rounded-lg object-contain"
                        width={200}
                        height={160}
                      />
                    )}
                  </div>
                  <p className="text-[#4B626D] mb-3">{file.name}</p>
                  <div className="flex justify-center items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleFileUpload(type, null);
                      }}
                      className="text-red-500"
                    >
                      {t.phases.documentUpload.remove}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleSubmit();
                      }}
                      className="px-4 py-2 bg-[#F54538] text-white rounded-lg hover:bg-[#D03C32]"
                    >
                      {t.phases.documentUpload.submit}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {draggedFile ? (
                <>
                  <div className="text-green-500 mb-4">
                    <svg
                      className="w-12 h-12"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-500 mb-2">{draggedFile.name}</p>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleFileUpload(type, draggedFile);
                    }}
                    className="px-4 py-2 bg-[#F54538] text-white rounded-lg hover:bg-[#D03C32]"
                  >
                    Upload Now
                  </button>
                </>
              ) : (
                <>
                  <svg
                    className="w-12 h-12 text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-gray-500 mb-2">
                    {type === 'bookingConfirmation'
                      ? t.phases.documentUpload.bookingConfirmation.description
                      : t.phases.documentUpload.cancellationNotification
                          .description}
                  </p>
                  <p className="text-sm text-gray-400 mb-2">
                    Drag and drop your file here or
                  </p>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(type)?.click();
                    }}
                    className="px-4 py-2 bg-[#F54538] text-white rounded-lg hover:bg-[#D03C32] mb-2"
                  >
                    {t.phases.documentUpload.upload}
                  </button>
                  <p className="text-xs text-gray-400">
                    Accepted files: PDF, JPEG, PNG
                  </p>
                </>
              )}
            </div>
          )}
        </label>
      </div>
    );
  };

  if (!isClient) {
    return null;
  }

  return (
    <PhaseGuard phase={CLAIM_SUBMITTED_PHASE}>
      <div className="max-w-3xl mx-auto px-4">
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={setTestPersonalDetails}
            className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Set Test Personal Details
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-5xl mb-4 block">🎉</span>
          <h1 className="text-3xl font-bold mb-8">
            {t.phases.claimSubmitted.title}
          </h1>
        </div>

        {/* Speech bubble with Captain Frank avatar */}
        <SpeechBubble
          message={
            t.phases.claimSubmitted.thankYou.replace(
              '{firstName}',
              personalDetails?.firstName || ''
            ) +
            '\n\n' +
            t.phases.claimSubmitted.description +
            '\n\n' +
            t.phases.claimSubmitted.emailConfirmation.replace(
              '{email}',
              personalDetails?.email || ''
            ) +
            '\n\n' +
            t.phases.claimSubmitted.support
          }
        />

        {/* Document Upload Section */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {t.phases.documentUpload.title}
            </h2>
            <p className="text-gray-600 mb-8">
              {t.phases.documentUpload.description}
            </p>

            {/* Booking Confirmation Upload */}
            <div className="mb-8">
              <h3 className="font-medium mb-3">
                {t.phases.documentUpload.bookingConfirmation.title}
              </h3>
              {renderUploadArea('bookingConfirmation')}
            </div>

            {/* Cancellation Notification Upload */}
            <div className="mb-6">
              <h3 className="font-medium mb-3">
                {t.phases.documentUpload.cancellationNotification.title}
              </h3>
              {renderUploadArea('cancellationNotification')}
            </div>
          </div>
        )}

        {/* Error Message */}
        {state.error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
            {state.error}
          </div>
        )}

        {/* Sharing Section */}
        {process.env.NODE_ENV === 'development' && state.sharingLink && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {t.phases.documentUpload.sharing.title}
            </h2>
            <p className="text-gray-600 mb-4">
              {t.phases.documentUpload.sharing.description}
            </p>
            <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
              <input
                type="text"
                value={state.sharingLink}
                readOnly
                className="flex-grow bg-transparent border-none focus:outline-none text-gray-600"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(state.sharingLink || '');
                }}
                className="px-4 py-2 bg-[#F54538] text-white rounded-lg hover:bg-[#D03C32] whitespace-nowrap"
              >
                {t.phases.documentUpload.sharing.copy}
              </button>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {t.phases.claimSubmitted.nextSteps.title}
          </h2>
          <ul className="list-disc list-inside text-gray-700 space-y-3">
            <li>{t.phases.claimSubmitted.nextSteps.review}</li>
            <li>{t.phases.claimSubmitted.nextSteps.contact}</li>
            <li>{t.phases.claimSubmitted.nextSteps.updates}</li>
          </ul>
        </div>

        {/* Navigation Buttons */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
            <div /> {/* Empty div for spacing */}
            <ContinueButton
              onClick={handleCheckAnotherFlight}
              text={t.phases.documentUpload.navigation.checkAnotherFlight}
            />
          </div>
        )}
      </div>
    </PhaseGuard>
  );
}
