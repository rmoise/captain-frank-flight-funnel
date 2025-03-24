"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import useStore from "@/lib/state/store";
import { useTranslation } from "@/hooks/useTranslation";
import { PhaseGuard } from "@/components/shared/PhaseGuard";
import { SpeechBubble } from "@/components/SpeechBubble";
import { ContinueButton } from "@/components/shared/ContinueButton";
import { Translations } from "@/translations/types";
import Image from "next/image";
import { StoreState } from "@/lib/state/types";
import { useFlightStore } from "@/lib/state/flightStore";

declare module "@/hooks/useTranslation" {
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
  isLoading: boolean;
  uploadSuccess: boolean;
  uploadMessage: string | null;
  currentUploadType: "bookingConfirmation" | "cancellationNotification" | null;
  lastUploadedType: "bookingConfirmation" | "cancellationNotification" | null;
  showSuccessAnimation: boolean;
}

const CLAIM_SUBMITTED_PHASE = 7;

export default function ClaimSubmittedPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const lang = params?.lang?.toString() || "de";
  const { t } = useTranslation();
  const personalDetails = useStore(
    (state: StoreState) => state.personalDetails
  );

  // Get claim ID from URL or use a default for testing
  const urlClaimId = searchParams?.get("claim_id");
  // Use URL claim ID, or check for the deal_id in hub store
  const hubspotDealId = useStore(
    (state: StoreState) => state.evaluationResult?.guid
  );

  // In development mode, provide a default claim ID for testing
  const usingTestId =
    process.env.NEXT_PUBLIC_ENV === "development" &&
    !urlClaimId &&
    !hubspotDealId;
  const testClaimId = "test-claim-123";
  const claimId =
    urlClaimId || hubspotDealId || (usingTestId ? testClaimId : undefined);

  // Log it for debugging
  useEffect(() => {
    console.log("Claim ID being used:", claimId, {
      fromUrl: urlClaimId,
      fromHubspot: hubspotDealId,
      usingTestId,
    });
  }, [claimId, urlClaimId, hubspotDealId, usingTestId]);

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
    isLoading: false,
    uploadSuccess: false,
    uploadMessage: null,
    currentUploadType: null,
    lastUploadedType: null,
    showSuccessAnimation: false,
  });

  useEffect(() => {
    console.log("Debug sharing:", {
      claimId,
      email: personalDetails?.email,
      origin: window?.location?.origin,
      lang,
    });
    if (claimId && personalDetails?.email) {
      // Create a turbo link that will prefill flight details but exclude personal info
      // Include essential flight data in query parameters or path to be used in phase 1
      const flightStore = useFlightStore.getState();
      const storeState = useStore.getState();

      // Import the phase4Store to get its data
      let phase4Data = null;
      try {
        // Dynamic import for the phase4Store to get trip experience data
        const { usePhase4Store } = require("@/lib/state/phase4Store");
        const phase4State = usePhase4Store.getState();

        // Extract relevant data from phase4Store
        phase4Data = {
          travelStatusAnswers: phase4State.travelStatusAnswers || [],
          informedDateAnswers: phase4State.informedDateAnswers || [],
          selectedFlights: phase4State.selectedFlights || [],
        };

        console.log("Phase 4 data for sharing:", phase4Data);
      } catch (error) {
        console.error("Error getting phase4Store data:", error);
      }

      // Get flight data from both stores
      const flightData = flightStore.flightData[1] || {};

      // Also get Phase 3 data specifically
      const phase3Data = flightStore.flightData[3] || {};
      console.log("Phase 3 data for sharing:", phase3Data);

      // Ensure we have the selected flights from phase 3
      const phase3SelectedFlights = phase3Data.selectedFlights || [];

      // Helper function to format dates in a consistent format for sharing
      const formatDateForSharing = (date: any): string | null => {
        if (!date) return null;

        try {
          // If it's already a string, check if it's in a valid format
          if (typeof date === "string") {
            // If it's in DD.MM.YYYY format, return as is
            if (date.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
              return date;
            }

            // If it's in ISO format, try to convert to DD.MM.YYYY
            if (date.includes("T") || date.includes("-")) {
              const isoDate = new Date(date);
              if (!isNaN(isoDate.getTime())) {
                return `${String(isoDate.getDate()).padStart(2, "0")}.${String(
                  isoDate.getMonth() + 1
                ).padStart(2, "0")}.${isoDate.getFullYear()}`;
              }
            }
          }

          // If it's a Date object, format it as DD.MM.YYYY
          if (date instanceof Date && !isNaN(date.getTime())) {
            return `${String(date.getDate()).padStart(2, "0")}.${String(
              date.getMonth() + 1
            ).padStart(2, "0")}.${date.getFullYear()}`;
          }

          // If all else fails, return null
          return null;
        } catch (error) {
          console.error("Error formatting date for sharing:", error, date);
          return null;
        }
      };

      // Process flight segments to ensure dates are properly formatted
      const processedFlightSegments = (
        flightData.flightSegments ||
        storeState.flightSegments ||
        []
      ).map((segment, index) => {
        // Format date if it exists
        const formattedDate = formatDateForSharing(segment.date);

        // First try to get the selected flight from the segment itself
        let processedSelectedFlight = segment.selectedFlight
          ? {
              ...segment.selectedFlight,
              // Ensure the flight's date is also formatted
              date:
                formatDateForSharing(segment.selectedFlight.date) ||
                formattedDate,
            }
          : null;

        // If no selected flight in the segment, try to get it from phase 3 data
        if (!processedSelectedFlight && phase3SelectedFlights.length > index) {
          const phase3Flight = phase3SelectedFlights[index];
          if (phase3Flight) {
            processedSelectedFlight = {
              ...phase3Flight,
              date: formatDateForSharing(phase3Flight.date) || formattedDate,
            };
            console.log(`Added phase 3 flight to segment ${index}:`, {
              flightNumber: phase3Flight.flightNumber,
              date: formatDateForSharing(phase3Flight.date),
            });
          }
        }

        return {
          ...segment,
          date: formattedDate,
          selectedFlight: processedSelectedFlight,
        };
      });

      // Prepare serializable flight data (only what's needed for prefilling)
      const prefilledData = {
        fromLocation: flightData.fromLocation || storeState.fromLocation,
        toLocation: flightData.toLocation || storeState.toLocation,
        selectedType:
          flightData.selectedType || storeState.selectedType || "direct",
        flightSegments: processedFlightSegments,
        // Add wizard answers data for prefilling QAs
        wizardAnswers: storeState.wizardAnswers || [],
        // Include Phase 4 data if available
        phase4Data: phase4Data,
        // Explicitly include phase 3 data
        phase3Data: {
          selectedFlights: phase3SelectedFlights,
        },
        _sharedClaim: true,
        _sourceClaimId: claimId,
        timestamp: Date.now(),
      };

      console.log("Prepared flight data for sharing:", {
        segments: processedFlightSegments.map((seg) => ({
          from: seg.fromLocation?.value,
          to: seg.toLocation?.value,
          date: seg.date,
          flight: seg.selectedFlight
            ? {
                id: seg.selectedFlight.id,
                flightNumber: seg.selectedFlight.flightNumber,
                date: seg.selectedFlight.date,
              }
            : null,
        })),
      });

      // Encode the data to be included in the URL
      const encodedData = encodeURIComponent(JSON.stringify(prefilledData));

      // Create the sharing link with the encoded data as a parameter
      const sharingLink = `${window.location.origin}/${lang}?shared_flight=${encodedData}`;

      console.log("Generated sharing link:", sharingLink);
      setState((prev) => ({ ...prev, sharingLink }));
    }
  }, [claimId, personalDetails?.email, lang]);

  // Add debug output for state
  useEffect(() => {
    console.log("Current state:", state);
  }, [state]);

  // Function to generate preview
  const generatePreview = useCallback(async (file: File) => {
    if (file.type === "application/pdf") {
      return URL.createObjectURL(file);
    } else {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }
  }, []);

  // Function to properly handle Image generation from file
  const getImageProps = useCallback((preview: string, file: File) => {
    return {
      src: preview,
      alt: file.name || "File preview",
      width: 200,
      height: 160,
    };
  }, []);

  const handleFileUpload = useCallback(
    async (
      type: "bookingConfirmation" | "cancellationNotification",
      file: File | null
    ) => {
      if (file) {
        try {
          console.log(`Generating preview for ${file.name}`, file.type);
          const preview = await generatePreview(file);
          console.log(
            `Preview generated:`,
            typeof preview,
            preview.substring(0, 50) + "..."
          );

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
        } catch (error) {
          console.error("Error generating preview:", error);
          setState((prev) => ({
            ...prev,
            [type]: file,
            previews: {
              ...prev.previews,
              [type]: null,
            },
            draggedFiles: {
              ...prev.draggedFiles,
              [type]: null,
            },
            error: "Failed to generate preview for file.",
          }));
        }
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
      type: "bookingConfirmation" | "cancellationNotification",
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
      type: "bookingConfirmation" | "cancellationNotification",
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
      type: "bookingConfirmation" | "cancellationNotification"
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
          error:
            t.phases.documentUpload.errors.noBookingConfirmation ||
            "Please upload a booking confirmation file",
        }));
        return;
      }

      // Check file size - max 10MB
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (state.bookingConfirmation.size > maxSize) {
        setState((prev) => ({
          ...prev,
          error: "Booking confirmation file is too large (max 10MB)",
        }));
        return;
      }

      if (
        state.cancellationNotification &&
        state.cancellationNotification.size > maxSize
      ) {
        setState((prev) => ({
          ...prev,
          error: "Cancellation notification file is too large (max 10MB)",
        }));
        return;
      }

      const formData = new FormData();
      formData.append("bookingConfirmation", state.bookingConfirmation);
      formData.append("bookingConfirmationProperty", "buchungsbestatigung");

      if (state.cancellationNotification) {
        formData.append(
          "cancellationNotification",
          state.cancellationNotification
        );
        formData.append(
          "cancellationNotificationProperty",
          "annullierungsbestatigung"
        );
      }

      // Add claim ID if available
      if (claimId) {
        console.log("Using claim ID for upload:", claimId);
        formData.append("claimId", claimId);
      } else {
        console.log(
          "No claim ID available, files will be uploaded without association to a deal"
        );
      }

      // Add HubSpot deal ID if available
      if (hubspotDealId) {
        console.log("Using HubSpot deal ID for upload:", hubspotDealId);
        formData.append("hubspotDealId", hubspotDealId);
      }

      // Add user personal details from session storage if available
      try {
        const personalDetailsStr = sessionStorage.getItem("personalDetails");
        let detailsFromSession = null;
        if (personalDetailsStr) {
          detailsFromSession = JSON.parse(personalDetailsStr);
          console.log(
            "Personal details from session storage:",
            detailsFromSession
          );
        }

        // Try to get from store if not in session
        const storeDetails = personalDetails || {};
        console.log("Personal details from store:", storeDetails);

        // Use combined details, preferring session storage
        const combinedDetails = {
          ...storeDetails,
          ...(detailsFromSession || {}),
        };

        console.log("Combined personal details:", combinedDetails);

        if (combinedDetails.email) {
          formData.append("email", combinedDetails.email);
          console.log("Added email to upload:", combinedDetails.email);
        }

        if (combinedDetails.firstName) {
          formData.append("firstName", combinedDetails.firstName);
          console.log("Added firstName to upload:", combinedDetails.firstName);
        }

        if (combinedDetails.lastName) {
          formData.append("lastName", combinedDetails.lastName);
          console.log("Added lastName to upload:", combinedDetails.lastName);
        }
      } catch (error) {
        console.warn("Error retrieving personal details:", error);
      }

      // Set loading state
      setState((prev) => ({ ...prev, error: null, isLoading: true }));

      console.log("Submitting files...");
      const isNetlifyDev = window.location.port === "8888";
      const apiUrl = isNetlifyDev
        ? "/.netlify/functions/upload-documents"
        : "/api/upload-documents";

      console.log("Using API URL:", apiUrl);
      const response = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      console.log("Response status:", response.status);

      let data;
      try {
        const responseText = await response.text();
        console.log(
          "Response text:",
          responseText.substring(0, 100) +
            (responseText.length > 100 ? "..." : "")
        );
        data = JSON.parse(responseText);
        console.log("Response data:", data);
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        throw new Error("Failed to parse server response");
      }

      if (!response.ok) {
        throw new Error(data?.error || "Failed to upload documents");
      }

      // Show success message
      setState((prev) => ({
        ...prev,
        error: null,
        isLoading: false,
        uploadSuccess: true,
        uploadMessage: data.message || "Documents uploaded successfully",
      }));
    } catch (error) {
      console.error("Error during upload:", error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to upload documents",
        isLoading: false,
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
    useStore.setState((state: StoreState) => ({
      ...state,
      personalDetails: {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        salutation: "Mr",
        phone: "+491234567890",
        address: "Test Street 1",
        postalCode: "12345",
        city: "Berlin",
        country: "Germany",
      },
    }));
  }, []);

  const handleCheckAnotherFlight = useCallback(() => {
    // Clear all state except personal details and terms acceptance
    useStore.setState((state: StoreState) => ({
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
    const personalDetails = localStorage.getItem("personalDetails");
    const termsAcceptance = localStorage.getItem("termsAcceptance");
    localStorage.clear();
    if (personalDetails) {
      localStorage.setItem("personalDetails", personalDetails);
    }
    if (termsAcceptance) {
      localStorage.setItem("termsAcceptance", termsAcceptance);
    }

    // Navigate to home page
    router.push(`/${lang}`);
  }, [lang, router]);

  const renderUploadArea = (
    type: "bookingConfirmation" | "cancellationNotification"
  ) => {
    const file = state[type];
    const preview = state.previews[type];
    const draggedFile = state.draggedFiles[type];
    const isLoading = state.isLoading && state.currentUploadType === type;
    const isUploadSuccess =
      state.uploadSuccess && state.lastUploadedType === type;
    const showSuccessAnimation =
      state.showSuccessAnimation && state.lastUploadedType === type;

    return (
      <div
        className="border-2 border-dashed rounded-lg p-10 text-center transition-colors duration-200 ease-in-out hover:bg-gray-50 min-h-[300px] flex flex-col items-center justify-center"
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
        <label htmlFor={type} className="cursor-pointer block w-full">
          {file && !showSuccessAnimation ? (
            <div className="text-center">
              {preview ? (
                <>
                  {file.type === "application/pdf" ? (
                    <div
                      className={`w-[200px] h-[160px] relative mx-auto ${
                        isUploadSuccess ? "animate-fade-out" : ""
                      }`}
                    >
                      {typeof preview === "string" && (
                        <iframe
                          src={preview}
                          className="w-full h-full border border-gray-200 rounded-lg"
                          title="PDF preview"
                        />
                      )}
                    </div>
                  ) : (
                    <div
                      className={`relative w-[200px] h-[160px] mx-auto flex items-center justify-center ${
                        isUploadSuccess ? "animate-fade-out" : ""
                      }`}
                    >
                      {typeof preview === "string" && (
                        <Image
                          src={preview}
                          alt={file.name || "Image preview"}
                          className="max-h-32 rounded-lg object-contain"
                          width={200}
                          height={160}
                        />
                      )}
                    </div>
                  )}
                  <p className="text-[#4B626D] mb-3">{file.name}</p>
                  <div className="flex justify-center items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleFileUpload(type, null);
                      }}
                      className="text-red-500"
                      disabled={isLoading}
                    >
                      {t.phases.documentUpload.remove}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        uploadFile(type);
                      }}
                      className="px-4 py-2 bg-[#F54538] text-white rounded-lg hover:bg-[#D03C32]"
                      disabled={isLoading || isUploadSuccess}
                    >
                      {isLoading ? (
                        <span className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          {"Uploading..."}
                        </span>
                      ) : isUploadSuccess ? (
                        <span className="flex items-center">
                          <svg
                            className="mr-1 h-4 w-4 text-white"
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
                          {"Uploaded"}
                        </span>
                      ) : (
                        t.phases.documentUpload.submit
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div>Loading preview...</div>
              )}
            </div>
          ) : showSuccessAnimation ? (
            <div className="min-h-[300px] flex flex-col justify-center">
              <div className="text-center">
                <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="w-16 h-16 flex items-center justify-center text-[64px]">
                    <div className="text-green-500">
                      <svg
                        className="w-16 h-16"
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
                  </div>
                  <div className="text-center space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {type === "bookingConfirmation"
                        ? t.phases.documentUpload.submit &&
                          t.phases.documentUpload.submit === "Upload"
                          ? "Upload Successful!"
                          : "Erfolgreich hochgeladen!"
                        : t.phases.documentUpload.submit &&
                          t.phases.documentUpload.submit === "Upload"
                        ? "Upload Successful!"
                        : "Erfolgreich hochgeladen!"}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {type === "bookingConfirmation"
                        ? "Your booking confirmation has been successfully uploaded."
                        : "Your cancellation notification has been successfully uploaded."}
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setState((prev) => ({
                            ...prev,
                            uploadSuccess: false,
                            showSuccessAnimation: false,
                            lastUploadedType: null,
                          }));
                        }}
                        className="px-6 py-2 text-[#F54538] border border-[#F54538] rounded-md hover:bg-red-50"
                      >
                        {lang === "de" ? "Zurück zum Upload" : "Back to Upload"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
                    {type === "bookingConfirmation"
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

  // Update the uploadFile function to keep the file after successful upload
  const uploadFile = async (
    type: "bookingConfirmation" | "cancellationNotification"
  ) => {
    try {
      const file = state[type];
      if (!file) {
        setState((prev) => ({
          ...prev,
          error: `Please select a ${
            type === "bookingConfirmation"
              ? "booking confirmation"
              : "cancellation notification"
          } file first`,
        }));
        return;
      }

      // Check file size
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setState((prev) => ({
          ...prev,
          error: `File is too large (max 10MB)`,
        }));
        return;
      }

      // Create form data for just this file
      const formData = new FormData();
      formData.append(type, file);
      formData.append(
        `${type}Property`,
        type === "bookingConfirmation"
          ? "buchungsbestatigung"
          : "annullierungsbestatigung"
      );

      // Add claim ID and HubSpot deal ID if available
      if (claimId) {
        formData.append("claimId", claimId);
      }
      if (hubspotDealId) {
        formData.append("hubspotDealId", hubspotDealId);
      }

      // Add personal details
      try {
        const personalDetailsStr = sessionStorage.getItem("personalDetails");
        let detailsFromSession = null;
        if (personalDetailsStr) {
          detailsFromSession = JSON.parse(personalDetailsStr);
        }
        const storeDetails = personalDetails || {};
        const combinedDetails = {
          ...storeDetails,
          ...(detailsFromSession || {}),
        };

        if (combinedDetails.email) {
          formData.append("email", combinedDetails.email);
        }
        if (combinedDetails.firstName) {
          formData.append("firstName", combinedDetails.firstName);
        }
        if (combinedDetails.lastName) {
          formData.append("lastName", combinedDetails.lastName);
        }
      } catch (error) {
        console.warn("Error retrieving personal details:", error);
      }

      // Set loading state with the current upload type
      setState((prev) => ({
        ...prev,
        error: null,
        isLoading: true,
        currentUploadType: type,
      }));

      // Upload the file
      const isNetlifyDev = window.location.port === "8888";
      const apiUrl = isNetlifyDev
        ? "/.netlify/functions/upload-documents"
        : "/api/upload-documents";

      const response = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Failed to upload ${
              type === "bookingConfirmation"
                ? "booking confirmation"
                : "cancellation notification"
            }`
        );
      }

      // Show success message and complete the upload
      setState((prev) => ({
        ...prev,
        error: null,
        isLoading: false,
        uploadSuccess: true,
        uploadMessage:
          data.message ||
          `${
            type === "bookingConfirmation"
              ? "Booking confirmation"
              : "Cancellation notification"
          } uploaded successfully`,
        currentUploadType: null,
        lastUploadedType: type,
        showSuccessAnimation: true,
      }));
    } catch (error) {
      console.error("Error during upload:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to upload file",
        isLoading: false,
        currentUploadType: null,
      }));
    }
  };

  // Add CSS for the animations
  useEffect(() => {
    // Add the animation classes to the global styles
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes bounce-once {
        0%, 20%, 50%, 80%, 100% {
          transform: translateY(0);
        }
        40% {
          transform: translateY(-20px);
        }
        60% {
          transform: translateY(-10px);
        }
      }
      .animate-bounce-once {
        animation: bounce-once 1s ease forwards;
      }

      @keyframes fade-out {
        0% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }
      .animate-fade-out {
        animation: fade-out 0.5s ease forwards;
      }

      @keyframes fade-in {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
      .animate-fade-in {
        animation: fade-in 0.5s ease forwards;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <PhaseGuard phase={CLAIM_SUBMITTED_PHASE}>
      <div className="max-w-3xl mx-auto px-4">
        {process.env.NEXT_PUBLIC_ENV === "development" && (
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
              "{firstName}",
              personalDetails?.firstName || ""
            ) +
            "\n\n" +
            t.phases.claimSubmitted.description +
            "\n\n" +
            t.phases.claimSubmitted.emailConfirmation.replace(
              "{email}",
              personalDetails?.email || ""
            ) +
            "\n\n" +
            t.phases.claimSubmitted.support
          }
        />

        {/* Document Upload Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {t.phases.documentUpload.title || "Upload Documents"}
          </h2>
          <p className="text-gray-600 mb-8">
            {t.phases.documentUpload.description ||
              "Please upload your booking confirmation and cancellation notification (if available)"}
          </p>

          {/* Booking Confirmation Upload */}
          <div className="mb-8">
            <h3 className="font-medium mb-3">
              {t.phases.documentUpload.bookingConfirmation.title ||
                "Booking Confirmation"}{" "}
              <span className="text-red-500">*</span>
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              Upload your booking confirmation document (PDF, JPEG, PNG, max
              10MB)
            </p>
            {renderUploadArea("bookingConfirmation")}
          </div>

          {/* Cancellation Notification Upload */}
          <div className="mb-6">
            <h3 className="font-medium mb-3">
              {t.phases.documentUpload.cancellationNotification.title ||
                "Cancellation Notification"}{" "}
              <span className="text-gray-400">(optional)</span>
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              Upload your cancellation notification if available (PDF, JPEG,
              PNG, max 10MB)
            </p>
            {renderUploadArea("cancellationNotification")}
          </div>

          {/* Debug section - only shown in development */}
          {process.env.NEXT_PUBLIC_ENV === "development" && (
            <div className="mt-6 p-4 bg-gray-100 rounded-lg">
              <h4 className="font-medium mb-2">Debug Information</h4>
              <p className="text-xs text-gray-600">
                Claim ID: {claimId || "Not provided"}
              </p>
              <p className="text-xs text-gray-600">
                Email: {personalDetails?.email || "Not provided"}
              </p>
              <p className="text-xs text-gray-600">
                API Endpoint: /api/upload-documents
              </p>
              <p className="text-xs text-gray-600">
                HubSpot Property: buchungsbestatigung
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {state.error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
            {state.error}
          </div>
        )}

        {/* Sharing Section */}
        {state.sharingLink && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
            <h2 className="text-xl font-semibold mb-4">{t.share.title}</h2>
            <p className="text-gray-600 mb-4">{t.share.description}</p>
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                <input
                  type="text"
                  value={state.sharingLink}
                  readOnly
                  className="flex-grow bg-transparent border-none focus:outline-none text-gray-600 text-sm"
                />
                <button
                  onClick={async () => {
                    try {
                      // Use the Clipboard API directly
                      await navigator.clipboard.writeText(
                        state.sharingLink || ""
                      );

                      // Visual feedback (optional)
                      const button =
                        document.activeElement as HTMLButtonElement;
                      const originalText = button.textContent;
                      button.textContent = t.share.copied;
                      setTimeout(() => {
                        button.textContent = originalText;
                      }, 2000);
                    } catch (err) {
                      console.error("Failed to copy:", err);
                      // Fallback only if the Clipboard API fails
                      try {
                        const textArea = document.createElement("textarea");
                        textArea.value = state.sharingLink || "";
                        textArea.style.position = "absolute";
                        textArea.style.left = "-9999px";
                        textArea.style.top = "-9999px";
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();

                        // Use the deprecated execCommand as a last resort
                        const success = document.execCommand("copy");
                        if (!success)
                          throw new Error("Copy command was unsuccessful");

                        document.body.removeChild(textArea);

                        // Visual feedback
                        const button =
                          document.activeElement as HTMLButtonElement;
                        const originalText = button.textContent;
                        button.textContent = t.share.copied;
                        setTimeout(() => {
                          button.textContent = originalText;
                        }, 2000);
                      } catch (fallbackErr) {
                        console.error(
                          "Fallback clipboard method failed:",
                          fallbackErr
                        );
                        alert("Failed to copy link");
                      }
                    }
                  }}
                  className="px-4 py-2 bg-[#F54538] text-white rounded-lg hover:bg-[#D03C32] whitespace-nowrap"
                >
                  {t.share.copy}
                </button>
              </div>
              <div className="text-sm text-gray-500 mt-2">
                <p>{t.share.explanation}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </PhaseGuard>
  );
}
