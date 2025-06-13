"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { useUniversalNavigation } from "@/utils/navigation";
import { ClaimService } from "@/services/claimService";
import { useStore } from "@/hooks/useStore";
import { ErrorMessage } from "@/components/ui/feedback/ErrorMessage";
import { PhaseGuard } from "@/components/shared/PhaseGuard";
import SignaturePad, {
  SignaturePadRef,
} from "@/components/shared/forms/SignaturePad";
import { ConsentCheckbox } from "@/components/shared/forms/ConsentCheckbox";
import { SpeechBubble } from "@/components/ui/display/SpeechBubble";
import { PhaseNavigation } from "@/components/shared/navigation/PhaseNavigation";
import { ValidationPhase } from "@/types/shared/validation";
import { BackButton } from "@/components/ui/button/BackButton";
import { ContinueButton } from "@/components/ui/button/ContinueButton";
import type { Flight, Store } from "@/store/types";
import type { Answer } from "@/types/shared/wizard";
import { useLoading, LoadingProvider } from "@/providers/LoadingProvider";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import FormError from "@/components/ui/feedback/FormError";
import { AccordionCardClient } from "@/components/shared/accordion/AccordionCardClient";
import { AccordionProvider } from "@/components/shared/accordion/AccordionContext";
import { useClaim } from "@/store";

// TypeScript declarations for missing global objects
declare global {
  interface Window {
    // Use any type to be compatible with the declaration in ExternalScriptsProvider.tsx
    Cookiebot?: any;
  }
}

interface FormData {
  hasAcceptedTerms: boolean;
  hasAcceptedPrivacy: boolean;
  hasAcceptedMarketing: boolean;
  travelStatusAnswers: Answer[];
  informedDateAnswers: Answer[];
  [key: string]: unknown;
}

interface FormErrors {
  [key: string]: string[];
}

type SetStateAction<T> = T | ((prevState: T) => T);

/* eslint-disable @typescript-eslint/no-unused-vars */
type SetStateFunction<T> = (action: SetStateAction<T>) => void;
/* eslint-enable @typescript-eslint/no-unused-vars */

const MIN_SIGNATURE_DATA_URL_LENGTH = 5000;

// Define the actual component with the implementation
function AgreementPageContent() {
  const router = useRouter();
  const params = useParams();
  const lang = params?.lang?.toString() || "";
  const { t } = useTranslation();
  const { navigateToPhase } = useUniversalNavigation();
  const { hideLoading } = useLoading();
  const store = useStore();
  const [isClient, setIsClient] = useState(false);

  // Directly select the setSignature action
  const setStoreSignature = useStore((s) => s.actions.user.setSignature);

  // Determine if we're in development mode
  const isDevelopment =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.port === "8888");

  // Create a safe API call function that won't make actual calls in dev
  const safeApiCall = async (url: string, options: RequestInit) => {
    if (isDevelopment) {
      console.log(
        "Development environment detected, skipping API call to:",
        url
      );
      return {
        ok: true,
        json: () => Promise.resolve({ success: true }),
        text: () => Promise.resolve("Mocked response text for development"),
      };
    }

    try {
      return await fetch(url, options);
    } catch (error) {
      console.log("API call failed, but continuing:", error);
      return {
        ok: false,
        json: () => Promise.resolve({ success: false }),
        text: () => Promise.resolve("Error response text"),
      };
    }
  };

  const { setClaimId, setClaimSubmitted } = useClaim();

  const {
    user: {
      details: personalDetails,
      consents: { terms, privacy, marketing },
      signature,
      hubspotContactId,
      hubspotDealId,
      compensationAmount: userCompensationAmount,
    },
    flight: {
      selectedFlights: storeSelectedFlights,
      bookingNumber,
      originalFlights: storeOriginalFlights,
    },
    navigation: { completedPhases },
    validation: validationState,
    actions: {
      user: {
        updateConsents: updateStoreConsents,
        setHubspotContactId,
        setHubspotDealId,
        setCompensationAmount,
      },
      flight: {
        setOriginalFlights: setStoreOriginalFlights,
        setSelectedFlights: setStoreSelectedFlights,
      },
      validation: { setStepValidation, setStepCompleted, setStepInteraction },
    },
  } = store;

  const travelStatusAnswers = useStore((s) => s.phase4.travelStatusAnswers);
  const phase4SelectedFlights = useStore((s) => s.phase4.selectedFlights);
  const informedDateAnswers = useStore((s) => s.phase4.informedDateAnswers);

  const signatureRef = useRef<SignaturePadRef>(null);
  const restorationFlagRef = useRef(false);
  const mounted = useRef(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [initialActiveAccordion, setInitialActiveAccordion] = useState<
    string | null
  >("digital-signature");
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const [interactedSteps, setInteractedSteps] = React.useState<number[]>([]);
  const [formData, setFormData] = React.useState<FormData>({
    hasAcceptedTerms: false,
    hasAcceptedPrivacy: false,
    hasAcceptedMarketing: false,
    travelStatusAnswers: [],
    informedDateAnswers: [],
  });
  const [hasInteractedWithSignature, setHasInteractedWithSignature] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRestoredSignature, setHasRestoredSignature] = useState(false);
  const [isSignatureAccordionOpen, setIsSignatureAccordionOpen] =
    useState(false);

  useScrollToTop();

  useEffect(() => {
    console.log("=== Client Mount Effect ===", { isClient: true });
    setIsClient(true);
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isClient || !mounted.current) return;
    console.log("=== formData Initialization Effect ===", {
      terms,
      privacy,
      marketing,
      travelStatusAnswers,
      informedDateAnswers,
    });
    setFormData({
      hasAcceptedTerms: terms,
      hasAcceptedPrivacy: privacy,
      hasAcceptedMarketing: marketing,
      travelStatusAnswers: travelStatusAnswers || [],
      informedDateAnswers: informedDateAnswers || [],
    });
  }, [
    isClient,
    terms,
    privacy,
    marketing,
    travelStatusAnswers,
    informedDateAnswers,
  ]);

  // Add a ref to prevent infinite loops in HubSpot calls
  const hubspotUpdateRef = useRef<{
    lastMarketing?: boolean;
    timestamp?: number;
  }>({});

  useEffect(() => {
    if (!isClient || !mounted.current) return;

    const initializeState = async () => {
      try {
        const evaluationResponse = ClaimService.getLastEvaluationResponse();
        if (evaluationResponse && evaluationResponse.status !== "accept") {
          throw new Error("Claim was not accepted during evaluation");
        }

        if (
          !storeOriginalFlights ||
          Object.keys(storeOriginalFlights).length === 0
        ) {
          const mainStoreFlightSegments: Record<string, Flight[]> =
            storeSelectedFlights && Object.keys(storeSelectedFlights).length > 0
              ? storeSelectedFlights
              : {};

          const firstSegmentKey = Object.keys(mainStoreFlightSegments)[0];
          if (
            firstSegmentKey &&
            mainStoreFlightSegments[firstSegmentKey] &&
            mainStoreFlightSegments[firstSegmentKey].length > 0
          ) {
            const flightsToSetAsOriginal =
              mainStoreFlightSegments[firstSegmentKey];
            if (setStoreOriginalFlights && flightsToSetAsOriginal) {
              setStoreOriginalFlights(flightsToSetAsOriginal);
            }
          } else {
            console.warn(
              "No valid original flights to set from selected store flights."
            );
          }
        }

        // Prevent infinite loop by checking if we've already updated this marketing status recently
        const now = Date.now();
        const shouldUpdateHubSpot =
          hubspotContactId &&
          marketing !== undefined &&
          (hubspotUpdateRef.current.lastMarketing !== marketing ||
            !hubspotUpdateRef.current.timestamp ||
            now - hubspotUpdateRef.current.timestamp > 30000); // 30 second throttle

        if (shouldUpdateHubSpot) {
          try {
            console.log("Updating HubSpot marketing status:", {
              contactId: hubspotContactId,
              marketing,
              lastMarketing: hubspotUpdateRef.current.lastMarketing,
              timeSinceLastUpdate: hubspotUpdateRef.current.timestamp
                ? now - hubspotUpdateRef.current.timestamp
                : "never",
            });

            hubspotUpdateRef.current = {
              lastMarketing: marketing,
              timestamp: now,
            };

            const response = await safeApiCall(
              "/.netlify/functions/hubspot-integration/contact",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contactId: hubspotContactId,
                  arbeitsrecht_marketing_status: marketing,
                }),
              }
            );

            if (!response.ok) {
              console.log(
                "HubSpot marketing status update failed but continuing"
              );
            } else {
              console.log("HubSpot marketing status updated successfully");
            }
          } catch (error) {
            console.log(
              "Error updating HubSpot marketing status, but continuing:",
              error
            );
          }
        } else if (hubspotContactId && marketing !== undefined) {
          console.log(
            "Skipping HubSpot update - already updated recently or unchanged"
          );
        }

        const storedSignature = signature;
        const hasStoredSignature = !!storedSignature;

        if (terms && privacy) {
          if (setStepValidation)
            setStepValidation(ValidationPhase.TERMS_AND_CONDITIONS, true);
          if (setStepInteraction)
            setStepInteraction(ValidationPhase.TERMS_AND_CONDITIONS, true);
        }

        if (hasStoredSignature && storedSignature) {
          if (setStoreSignature) setStoreSignature(storedSignature);
          setHasInteractedWithSignature(true);

          if (setStepValidation)
            setStepValidation(ValidationPhase.STEP_1, true);
          if (setStepInteraction)
            setStepInteraction(ValidationPhase.STEP_1, true);
        }

        console.log(
          "=== Agreement Page Validation State (after main init) ===",
          {
            validationState,
            terms,
            privacy,
            hasSignature: !!signature,
            canSubmit:
              validationState.stepValidation[ValidationPhase.STEP_1] &&
              validationState.stepValidation[
                ValidationPhase.TERMS_AND_CONDITIONS
              ] &&
              terms &&
              privacy,
            timestamp: new Date().toISOString(),
          }
        );
      } catch (error) {
        console.error("Error initializing agreement page:", error);
      }
    };

    initializeState();
  }, [
    isClient,
    signature,
    storeOriginalFlights,
    storeSelectedFlights,
    setStoreOriginalFlights,
    setStoreSignature,
    setStepValidation,
    setStepInteraction,
    router,
    hubspotContactId,
    marketing,
  ]);

  useEffect(() => {
    if (!isClient || !mounted.current) return;

    // Don't do anything if we've already restored the signature
    if (restorationFlagRef.current) {
      console.log("Signature already restored, skipping restoration");
      return;
    }

    console.log("=== Signature Restoration Check ===", {
      hasSignatureRef: !!signatureRef.current,
      signatureExists: !!signature && signature.length > 1000,
      signatureLength: signature?.length || 0,
    });

    // Quickly exit if we have no signature to restore
    if (!signature || signature.length < 1000) {
      console.log("No valid signature in store to restore");
      return;
    }

    // Set a "mounted" flag to avoid multiple restoration attempts
    restorationFlagRef.current = true;

    // Setup a more robust retry mechanism for restoration
    const attemptRestoration = (attempt = 1, maxAttempts = 10) => {
      console.log(
        `Attempting signature restoration (attempt ${attempt}/${maxAttempts})`
      );

      // If we have a signature reference, immediately restore
      if (signatureRef.current) {
        console.log("Signature ref available, restoring immediately");
        const success = restoreSignature();
        if (success) {
          console.log("Restoration initiated successfully");
          return true;
        }
      }

      // If max attempts reached, give up
      if (attempt >= maxAttempts) {
        console.warn("Max restoration attempts reached, giving up");
        // Even if visual restoration failed, we should still mark it as valid
        // if we have signature data in the store
        if (signature && signature.length > MIN_SIGNATURE_DATA_URL_LENGTH) {
          console.log(
            "Forcing validation state although visual restoration failed"
          );
          if (setStepValidation)
            setStepValidation(ValidationPhase.STEP_1, true);
          if (setStepCompleted) setStepCompleted(ValidationPhase.STEP_1, true);
          if (setStepInteraction)
            setStepInteraction(ValidationPhase.STEP_1, true);
          setHasRestoredSignature(true);
        }
        restorationFlagRef.current = false; // Reset flag to allow future attempts
        return false;
      }

      // Try again with increasing delay
      const delay = Math.min(100 * attempt, 1000);
      console.log(`Signature ref not available, retrying in ${delay}ms`);

      setTimeout(() => {
        if (!mounted.current) return;
        attemptRestoration(attempt + 1, maxAttempts);
      }, delay);

      return false;
    };

    // Start the restoration process
    attemptRestoration();
  }, [
    isClient,
    signature,
    setStepValidation,
    setStepCompleted,
    setStepInteraction,
  ]);

  // Streamline the restoreSignature function
  const restoreSignature = useCallback(() => {
    if (!signature || signature.length < 1000) {
      console.log("Cannot restore: missing signature data");
      return false;
    }

    try {
      console.log("Restoring signature from store data");

      // Set a flag to indicate we're loading a signature
      setHasRestoredSignature(true);

      // IMPORTANT: Set validation state immediately BEFORE visual restoration
      // This prevents flashing of invalid state during the restoration process
      if (setStepValidation) setStepValidation(ValidationPhase.STEP_1, true);
      if (setStepCompleted) setStepCompleted(ValidationPhase.STEP_1, true);
      if (setStepInteraction) setStepInteraction(ValidationPhase.STEP_1, true);

      // Only attempt to restore to canvas if the reference exists
      if (signatureRef.current) {
        // Use a short timeout to ensure the canvas is ready before loading
        setTimeout(() => {
          if (signatureRef.current) {
            signatureRef.current.fromDataURL(signature);
            setHasInteractedWithSignature(true);
            console.log("Signature restoration completed with timeout");
          }
        }, 100);
      } else {
        console.log(
          "SignatureRef not available for visual restoration, but validation state set"
        );
      }

      console.log("Signature restoration initiated");
      return true;
    } catch (error) {
      console.error("Error restoring signature:", error);
      restorationFlagRef.current = false;
      // Important: DON'T reset hasRestoredSignature here to avoid validation state loss
      // We still have the signature in the store, just visual restoration failed
      return false;
    }
  }, [
    signatureRef,
    signature,
    setHasRestoredSignature,
    setHasInteractedWithSignature,
    setStepValidation,
    setStepCompleted,
    setStepInteraction,
  ]);

  useEffect(() => {
    if (signatureRef.current) {
      console.log("=== SignaturePad Reference Updated ===", {
        hasRef: !!signatureRef.current,
        currentTime: new Date().toISOString(),
      });
    }
  }, [signatureRef.current]);

  useEffect(() => {
    return () => {
      restorationFlagRef.current = false;
    };
  }, []);

  useEffect(() => {
    hideLoading();
  }, [hideLoading]);

  const validateSignature = useCallback(
    (currentSignatureDataUrl?: string): boolean => {
      let signatureToTestDataUrl = currentSignatureDataUrl;
      if (!isClient && !signatureToTestDataUrl) {
        console.log(
          "validateSignature: Not client or no dataUrl, returning false early."
        );
        return false;
      }

      if (!signatureToTestDataUrl && isClient) {
        const storeUserSignature = useStore.getState().user.signature;
        signatureToTestDataUrl =
          storeUserSignature === null ? undefined : storeUserSignature;
      }

      const signatureDataUrlLength = signatureToTestDataUrl?.length || 0;

      // If we have restored a signature and have a signature in the store, prioritize that knowledge
      if (
        hasRestoredSignature &&
        signatureDataUrlLength > MIN_SIGNATURE_DATA_URL_LENGTH
      ) {
        console.log(
          "Signature validated based on hasRestoredSignature flag and length check"
        );
        return true;
      }

      let isPadConsideredEmptyByPadItself = true;
      if (signatureRef.current) {
        try {
          isPadConsideredEmptyByPadItself = signatureRef.current.isEmpty();
        } catch (error) {
          console.error(
            "Error calling signaturePadRef.current.isEmpty():",
            error
          );
          isPadConsideredEmptyByPadItself = true; // Assume empty on error
        }
      } else {
        // Fallback if ref is not available
        isPadConsideredEmptyByPadItself = signatureDataUrlLength < 500; // Threshold for definitely empty data
      }

      const isNonTrivialDrawingOnPad = !isPadConsideredEmptyByPadItself;
      const hasSufficientDataUrlLengthForQuality =
        signatureDataUrlLength > MIN_SIGNATURE_DATA_URL_LENGTH;

      let isSignatureEffectivelyPresent = false;
      if (isNonTrivialDrawingOnPad) {
        // If the pad says it's a real drawing, then also check if it meets a basic length for quality.
        isSignatureEffectivelyPresent = hasSufficientDataUrlLengthForQuality;
      }

      // As a last resort, if we have a substantial signature data URL but the pad thinks it's empty
      // This can happen during restoration when the pad's internal state isn't matching the visual state
      if (
        !isSignatureEffectivelyPresent &&
        hasSufficientDataUrlLengthForQuality &&
        hasRestoredSignature
      ) {
        isSignatureEffectivelyPresent = true;
        console.log(
          "Forcing signature validation based on data URL length for restored signature"
        );
      }

      console.log("validateSignature results (v3 logic):", {
        signatureDataUrlLength,
        isPadConsideredEmptyByPadItself,
        isNonTrivialDrawingOnPad,
        minQualityLength: MIN_SIGNATURE_DATA_URL_LENGTH,
        hasSufficientDataUrlLengthForQuality,
        hasRestoredSignature,
        isSignatureEffectivelyPresent,
      });
      return isSignatureEffectivelyPresent;
    },
    [isClient, hasRestoredSignature]
  );

  const handleSignatureChange = useCallback(
    (dataUrl: string) => {
      if (!mounted.current) return;
      console.log("Signature changed, data length:", dataUrl.length);

      if (typeof setStoreSignature === "function") {
        console.log("Updating store signature from handleSignatureChange");
        setStoreSignature(dataUrl);
      } else {
        console.error(
          "setStoreSignature is not a function in handleSignatureChange. Current value:",
          setStoreSignature
        );
      }
      const isValidSignature = validateSignature(dataUrl);
      console.log(
        "Setting step validation from handleSignatureChange, isValidSignature:",
        isValidSignature
      );
      setStepValidation(
        ValidationPhase.STEP_1, // Assuming STEP_1 corresponds to signature
        isValidSignature
      );
      setStepCompleted(ValidationPhase.STEP_1, isValidSignature);
    },
    [
      setStoreSignature,
      setStepValidation,
      setStepCompleted,
      mounted,
      validateSignature,
    ]
  );

  const canSubmit = useCallback(() => {
    if (!isClient || !signatureRef.current) return false;
    const currentSignatureFromStore = useStore.getState().user.signature;
    const currentTerms = useStore.getState().user.consents.terms;
    const currentPrivacy = useStore.getState().user.consents.privacy;

    // If we have a restored signature, trust that for validation
    let isSignatureValid = false;

    if (
      hasRestoredSignature &&
      currentSignatureFromStore &&
      currentSignatureFromStore.length > MIN_SIGNATURE_DATA_URL_LENGTH
    ) {
      isSignatureValid = true;
      console.log(
        "Signature valid based on hasRestoredSignature flag in canSubmit"
      );
    } else {
      // Otherwise use the validateSignature function
      const signatureForValidation =
        currentSignatureFromStore === null
          ? undefined
          : currentSignatureFromStore;
      isSignatureValid = validateSignature(signatureForValidation);
    }

    const areConsentsValid = currentTerms && currentPrivacy;
    const overallValidity = isSignatureValid && areConsentsValid;

    console.log("canSubmit check (inside useCallback):", {
      isSignatureValid,
      areConsentsValid,
      hasRestoredSignature,
      signatureLength: currentSignatureFromStore?.length,
      overallValidity,
    });

    return overallValidity;
  }, [isClient, signatureRef, validateSignature, hasRestoredSignature]);

  useEffect(() => {
    if (isClient && mounted.current) {
      const canSubmitNow = canSubmit();
      console.log(
        "=== Agreement Page CanSubmit Check (Button State via useEffect) ===",
        {
          canSubmit: canSubmitNow,
          s_sig: signature?.length, // s_ for store
          s_terms: terms,
          s_privacy: privacy,
          val_sig: validateSignature(
            signature === null ? undefined : signature
          ), // Re-validate for logging consistency
          timestamp: new Date().toISOString(),
        }
      );
    }
  }, [
    isClient,
    mounted,
    signature,
    terms,
    privacy,
    canSubmit,
    validateSignature,
  ]); // Added validateSignature here too

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const storeState = useStore.getState();
      const currentPersonalDetails = storeState.user.details;
      const currentBookingNumber = storeState.flight.bookingNumber;
      const currentOriginalFlightsData = storeState.flight.originalFlights;
      const currentPhase4SelectedFlights = storeState.phase4.selectedFlights;
      const currentTravelStatusAnswers = storeState.phase4.travelStatusAnswers;
      const currentInformedDateAnswers = storeState.phase4.informedDateAnswers;
      const currentSignature = storeState.user.signature;
      const currentTerms = storeState.user.consents.terms;
      const currentPrivacy = storeState.user.consents.privacy;

      let finalBookingNumber = currentBookingNumber;

      if (
        !finalBookingNumber ||
        finalBookingNumber.trim().length < 6 ||
        !/^[A-Z0-9]+$/i.test(finalBookingNumber.trim())
      ) {
        setFormErrors((prev) => ({
          ...prev,
          submit: ["Please enter a valid booking number"],
        }));
        setIsSubmitting(false);
        return;
      }

      if (!currentPersonalDetails) {
        console.error("Personal details are required");
        setIsSubmitting(false);
        throw new Error("Personal details are required");
      }

      const originalFlightKeys = currentOriginalFlightsData
        ? Object.keys(currentOriginalFlightsData)
        : [];
      const originalFlightsArray: Flight[] =
        originalFlightKeys.length > 0 &&
        currentOriginalFlightsData[parseInt(originalFlightKeys[0], 10)]
          ? currentOriginalFlightsData[parseInt(originalFlightKeys[0], 10)]
          : [];

      const orderResult = await ClaimService.orderClaim(
        originalFlightsArray,
        currentPhase4SelectedFlights,
        currentTravelStatusAnswers,
        currentInformedDateAnswers,
        currentPersonalDetails,
        finalBookingNumber,
        currentSignature || "",
        currentTerms,
        currentPrivacy
      );

      console.log("=== Order Result ===", {
        orderResult,
        timestamp: new Date().toISOString(),
      });

      if (orderResult.data?.guid) {
        // Use manual navigation with query parameters since navigateToPhase doesn't support them yet
        router.push(
          `/${lang}/phases/claim-submitted?claim_id=${orderResult.data.guid}&scrollTop=true`
        );
      } else if (orderResult.error?.includes("evaluated as reject")) {
        navigateToPhase(ValidationPhase.CLAIM_REJECTED);
      } else {
        setFormErrors((prev) => ({
          ...prev,
          submit: [
            orderResult.message ||
              orderResult.error ||
              "Failed to submit claim",
          ],
        }));
      }
    } catch (error) {
      console.error("Error submitting claim:", error);
      setFormErrors((prev) => ({
        ...prev,
        submit: [error instanceof Error ? error.message : "An error occurred"],
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (isSubmitting) return;
    navigateToPhase(ValidationPhase.CLAIM_SUCCESS);
  };

  const handleStepInteraction = (step: number) => {
    setInteractedSteps((prev: number[]) => {
      if (!prev.includes(step)) {
        return [...prev, step];
      }
      return prev;
    });
  };

  const handleFormDataChange = (data: Partial<FormData>) => {
    setFormData((prev: FormData) => ({
      ...prev,
      ...data,
    }));
  };

  const handleContinue = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const storeState = useStore.getState();
      const currentPersonalDetails = storeState.user.details;
      const currentOriginalFlightsData = storeState.flight.originalFlights;
      const currentPhase4SelectedFlights = storeState.phase4.selectedFlights;
      const currentTravelStatusAnswers = storeState.phase4.travelStatusAnswers;
      const currentInformedDateAnswers = storeState.phase4.informedDateAnswers;
      const currentSignature = storeState.user.signature;
      const currentTerms = storeState.user.consents.terms;
      const currentPrivacy = storeState.user.consents.privacy;
      const currentMarketing = storeState.user.consents.marketing;
      let currentBookingNumber = storeState.flight.bookingNumber;
      const currentClaimId = storeState.claimData?.claimId;

      if (!currentBookingNumber) {
        currentBookingNumber = `CF-${Date.now()}`;
        console.log("Created fallback booking number:", currentBookingNumber);
      }

      if (currentClaimId) {
        console.log("Resubmitting claim. Previous claim ID:", currentClaimId);
      }

      if (!currentPersonalDetails) {
        console.error("Personal details are required");
        throw new Error("Personal details are required");
      }

      // Add detailed logging to track data flow
      console.log("=== PERSONAL DETAILS DEBUG ===");
      console.log("Store state user details:", currentPersonalDetails);
      console.log("Address object:", currentPersonalDetails?.address);
      console.log("Postal code:", currentPersonalDetails?.postalCode);
      console.log("City:", currentPersonalDetails?.city);
      console.log("================================");

      // Enhance personal details with required fields if they're missing
      const enhancedPersonalDetails = {
        ...currentPersonalDetails,
        country:
          currentPersonalDetails.country ||
          currentPersonalDetails.address?.country ||
          "Deutschland",
        city:
          currentPersonalDetails.city || currentPersonalDetails.address?.city,
        address:
          typeof currentPersonalDetails.address === "object"
            ? (currentPersonalDetails.address as any)?.street
            : currentPersonalDetails.address,
        postalCode:
          currentPersonalDetails.postalCode ||
          currentPersonalDetails.address?.postalCode,
        salutation: currentPersonalDetails.salutation || "herr",
      };

      // Validate that required fields are present
      if (
        !enhancedPersonalDetails.city ||
        !enhancedPersonalDetails.postalCode
      ) {
        console.error("Missing required address fields:", {
          city: enhancedPersonalDetails.city,
          postalCode: enhancedPersonalDetails.postalCode,
        });
        throw new Error(
          "City and postal code are required. Please go back and complete your address information."
        );
      }
      console.log("Enhanced personal details:", enhancedPersonalDetails);

      const originalFlightKeys = currentOriginalFlightsData
        ? Object.keys(currentOriginalFlightsData)
        : [];
      const originalFlightsArray: Flight[] =
        originalFlightKeys.length > 0 &&
        currentOriginalFlightsData[parseInt(originalFlightKeys[0], 10)]
          ? currentOriginalFlightsData[parseInt(originalFlightKeys[0], 10)]
          : [];

      console.log("=== CALLING ORDER CLAIM SERVICE ===", {
        timestamp: new Date().toISOString(),
        personalDetails: enhancedPersonalDetails,
        originalFlights: originalFlightsArray.length,
        phase4SelectedFlights: currentPhase4SelectedFlights.length,
        travelStatusAnswers: currentTravelStatusAnswers.length,
        informedDateAnswers: currentInformedDateAnswers.length,
        finalBookingNumber: currentBookingNumber,
        signatureRef: !!signatureRef.current,
        termsAccepted: currentTerms,
        privacyAccepted: currentPrivacy,
        marketingAccepted: currentMarketing,
        isResubmission: !!currentClaimId,
      });

      const orderResult = await ClaimService.orderClaim(
        originalFlightsArray,
        currentPhase4SelectedFlights,
        currentTravelStatusAnswers,
        currentInformedDateAnswers,
        enhancedPersonalDetails,
        currentBookingNumber,
        currentSignature || "",
        currentTerms,
        currentPrivacy,
        currentMarketing
      );

      console.log("=== ORDER CLAIM RESULT ===", {
        orderResult,
        timestamp: new Date().toISOString(),
        isResubmission: !!currentClaimId,
      });

      if (orderResult.data?.guid) {
        safeSetClaimId(orderResult.data.guid);
        safeSetClaimSubmitted(true);

        // Update store navigation state BEFORE navigation to prevent PhaseGuard unauthorized flash
        const storeActions = useStore.getState().actions;
        if (storeActions?.navigation?.setCurrentPhase) {
          storeActions.navigation.setCurrentPhase(
            ValidationPhase.CLAIM_SUBMITTED
          );
        }
        if (storeActions?.navigation?.addCompletedPhase) {
          storeActions.navigation.addCompletedPhase(ValidationPhase.AGREEMENT);
        }

        const langPrefix = lang ? `/${lang}` : "";
        router.push(
          `${langPrefix}/phases/claim-submitted?claim_id=${orderResult.data.guid}&scrollTop=true`
        );
      } else {
        console.warn("No claim ID returned from orderClaim:", orderResult);
        try {
          await updateHubSpotDirectly();
        } catch (hubspotError) {
          console.error("HubSpot update failed, but continuing:", hubspotError);
        }

        const tempClaimId = `temp-${Date.now()}`;
        safeSetClaimId(tempClaimId);
        safeSetClaimSubmitted(true);

        // Update store navigation state BEFORE navigation to prevent PhaseGuard unauthorized flash
        const storeActions = useStore.getState().actions;
        if (storeActions?.navigation?.setCurrentPhase) {
          storeActions.navigation.setCurrentPhase(
            ValidationPhase.CLAIM_SUBMITTED
          );
        }
        if (storeActions?.navigation?.addCompletedPhase) {
          storeActions.navigation.addCompletedPhase(ValidationPhase.AGREEMENT);
        }

        const langPrefix = lang ? `/${lang}` : "";
        router.push(
          `${langPrefix}/phases/claim-submitted?claim_id=${tempClaimId}&scrollTop=true`
        );
      }
    } catch (error) {
      console.error("Error submitting claim:", error);

      try {
        await updateHubSpotDirectly();
      } catch (hubspotError) {
        console.error("HubSpot update also failed:", hubspotError);
      }

      const tempClaimId = `temp-${Date.now()}`;
      safeSetClaimId(tempClaimId);
      safeSetClaimSubmitted(true);

      setFormErrors((prev) => ({
        ...prev,
        submit: [
          "Your claim information has been saved, but there was an issue with the final submission: " +
            (error instanceof Error ? error.message : String(error)),
        ],
      }));

      const langPrefix = lang ? `/${lang}` : "";
      router.push(
        `${langPrefix}/phases/claim-submitted?claim_id=${tempClaimId}&scrollTop=true`
      );
      setIsSubmitting(false);
    }
  };

  // Add a ref to prevent duplicate HubSpot direct updates
  const directUpdateRef = useRef<{ lastCall?: number; inProgress?: boolean }>(
    {}
  );

  const updateHubSpotDirectly = async () => {
    // Prevent multiple simultaneous calls
    if (directUpdateRef.current.inProgress) {
      console.log("HubSpot direct update already in progress, skipping");
      return;
    }

    // Throttle calls to prevent spam
    const now = Date.now();
    if (
      directUpdateRef.current.lastCall &&
      now - directUpdateRef.current.lastCall < 5000
    ) {
      console.log("HubSpot direct update called too recently, skipping");
      return;
    }

    directUpdateRef.current.inProgress = true;
    directUpdateRef.current.lastCall = now;

    try {
      const storeState = useStore.getState();
      const currentPersonalDetails = storeState.user.details;
      const currentMarketing = storeState.user.consents.marketing;
      const currentContactId = storeState.user.hubspotContactId;
      const currentDealId = storeState.user.hubspotDealId;
      const currentCompAmount = storeState.user.compensationAmount || "250";

      console.log("Updating HubSpot contact directly:", {
        contactId: currentContactId,
        dealId: currentDealId,
        personalDetails: currentPersonalDetails,
        marketingConsent: currentMarketing,
        compensation: currentCompAmount,
        timestamp: new Date().toISOString(),
      });

      if (!currentContactId) {
        console.warn("No HubSpot contact ID available, skipping update");
        return;
      }

      const contactResponse = await safeApiCall(
        "/.netlify/functions/hubspot-integration/contact",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contactId: currentContactId,
            email: currentPersonalDetails?.email || "",
            firstname: currentPersonalDetails?.firstName || "",
            lastname: currentPersonalDetails?.lastName || "",
            salutation: currentPersonalDetails?.salutation || "",
            phone: currentPersonalDetails?.phone || "",
            mobilephone: currentPersonalDetails?.phone || "",
            address: currentPersonalDetails?.address || "",
            city: currentPersonalDetails?.city || "",
            zip: currentPersonalDetails?.postalCode || "",
            country: currentPersonalDetails?.country || "",
            arbeitsrecht_marketing_status: Boolean(currentMarketing),
            owner_marketable_status: Boolean(currentMarketing),
          }),
        }
      );

      if (!contactResponse.ok) {
        const errorText = await contactResponse.text();
        console.error("Failed to update HubSpot contact:", errorText);
        console.warn("Continuing despite HubSpot contact update failure");
      } else {
        console.log("Successfully updated HubSpot contact");
      }

      if (currentDealId) {
        console.log("Updating HubSpot deal directly:", {
          dealId: currentDealId,
          contactId: currentContactId,
          amount: currentCompAmount,
          stage: "closedwon",
        });

        const dealResponse = await safeApiCall(
          "/.netlify/functions/hubspot-integration/deal",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              dealId: currentDealId,
              contactId: currentContactId,
              amount: currentCompAmount,
              stage: "closedwon",
            }),
          }
        );

        if (!dealResponse.ok) {
          const errorText = await dealResponse.text();
          console.error("Failed to update deal:", errorText);
          console.warn("Continuing despite HubSpot deal update failure");
        } else {
          const updateResult = await dealResponse.json();
          console.log("Successfully updated HubSpot deal:", updateResult);
        }
      } else {
        console.warn("No HubSpot deal ID available, skipping deal update");
      }
    } catch (error) {
      console.error("Error in HubSpot update (non-fatal):", error);
    } finally {
      directUpdateRef.current.inProgress = false;
    }
  };

  const compensationAmount = 250;

  const firstSegmentKeyFlight = useMemo(() => {
    if (
      !storeSelectedFlights ||
      typeof storeSelectedFlights !== "object" ||
      Object.keys(storeSelectedFlights).length === 0
    )
      return undefined;
    return Object.keys(storeSelectedFlights)[0];
  }, [storeSelectedFlights]);

  const firstFlightOfFirstSegment = useMemo(() => {
    if (
      !firstSegmentKeyFlight ||
      !storeSelectedFlights ||
      typeof storeSelectedFlights !== "object"
    )
      return undefined;
    const segmentKeyNumber = parseInt(firstSegmentKeyFlight, 10);
    if (isNaN(segmentKeyNumber)) return undefined;
    const segment: Flight[] | undefined =
      storeSelectedFlights[segmentKeyNumber];
    if (Array.isArray(segment) && segment.length > 0) {
      return segment[0] as Flight; // Explicit cast after checks
    }
    return undefined;
  }, [storeSelectedFlights, firstSegmentKeyFlight]);

  const lastSegmentKeyFlight = useMemo(() => {
    if (
      !storeSelectedFlights ||
      typeof storeSelectedFlights !== "object" ||
      Object.keys(storeSelectedFlights).length === 0
    )
      return undefined;
    const keys = Object.keys(storeSelectedFlights);
    return keys[keys.length - 1];
  }, [storeSelectedFlights]);

  const lastFlightOfLastSegment = useMemo(() => {
    if (
      !lastSegmentKeyFlight ||
      !storeSelectedFlights ||
      typeof storeSelectedFlights !== "object"
    )
      return undefined;
    const segmentKeyNumber = parseInt(lastSegmentKeyFlight, 10);
    if (isNaN(segmentKeyNumber)) return undefined;
    const segment: Flight[] | undefined =
      storeSelectedFlights[segmentKeyNumber];
    if (Array.isArray(segment) && segment.length > 0) {
      return segment[segment.length - 1] as Flight; // Explicit cast
    }
    return undefined;
  }, [storeSelectedFlights, lastSegmentKeyFlight]);

  const secondSegmentKeyFlight = useMemo(() => {
    if (
      !storeSelectedFlights ||
      typeof storeSelectedFlights !== "object" ||
      Object.keys(storeSelectedFlights).length < 2
    )
      return undefined;
    const sortedKeys = Object.keys(storeSelectedFlights).sort();
    return sortedKeys[1];
  }, [storeSelectedFlights]);

  const firstFlightOfSecondSegment = useMemo(() => {
    if (
      !secondSegmentKeyFlight ||
      !storeSelectedFlights ||
      typeof storeSelectedFlights !== "object"
    )
      return undefined;
    const segmentKeyNumber = parseInt(secondSegmentKeyFlight, 10);
    if (isNaN(segmentKeyNumber)) return undefined;
    const segment: Flight[] | undefined =
      storeSelectedFlights[segmentKeyNumber];
    if (Array.isArray(segment) && segment.length > 0) {
      return segment[0] as Flight; // Explicit cast
    }
    return undefined;
  }, [storeSelectedFlights, secondSegmentKeyFlight]);

  const departureDate = firstFlightOfFirstSegment?.departureTime;
  const formattedDate = departureDate
    ? new Date(departureDate).toLocaleDateString(lang, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "";

  // Create a mock Cookiebot object for development to prevent 404 errors
  useEffect(() => {
    if (isDevelopment && typeof window !== "undefined" && !window.Cookiebot) {
      // Create a mock Cookiebot to prevent errors
      window.Cookiebot = {
        consent: {
          marketing: true,
          necessary: true,
          preferences: true,
          statistics: true,
        },
        consented: true,
        hasResponse: true,
        show: () => console.log("Mock Cookiebot show called"),
        hide: () => console.log("Mock Cookiebot hide called"),
        renew: () => console.log("Mock Cookiebot renew called"),
      };

      console.log("Added mock Cookiebot object for development");
    }
  }, [isDevelopment]);

  // Create safe wrapper functions
  const safeSetClaimId = (id: string) => {
    if (typeof setClaimId === "function") {
      setClaimId(id);
    } else {
      console.warn("setClaimId function not available");
    }
  };

  const safeSetClaimSubmitted = (submitted: boolean) => {
    if (typeof setClaimSubmitted === "function") {
      setClaimSubmitted(submitted);
    } else {
      console.warn("setClaimSubmitted function not available");
    }
  };

  // Add a new useEffect to sync validation state with signature state
  useEffect(() => {
    if (!isClient || !mounted.current) return;

    console.log("=== Signature Validation Sync Effect ===", {
      hasSignature: !!signature,
      signatureLength: signature?.length || 0,
      hasSignatureRef: !!signatureRef.current,
      hasRestoredSignature,
      stepValidation: validationState.stepValidation[ValidationPhase.STEP_1],
      stepCompleted: validationState.stepCompleted[ValidationPhase.STEP_1],
    });

    // IMPORTANT: If signature exists in store, ALWAYS prioritize that over visual state
    // This prevents validation flashing when the accordion is toggled
    if (signature && signature.length > MIN_SIGNATURE_DATA_URL_LENGTH) {
      if (
        !validationState.stepValidation[ValidationPhase.STEP_1] ||
        !validationState.stepCompleted[ValidationPhase.STEP_1]
      ) {
        console.log(
          "Setting validation state based on signature existence in store"
        );
        if (setStepValidation) setStepValidation(ValidationPhase.STEP_1, true);
        if (setStepCompleted) setStepCompleted(ValidationPhase.STEP_1, true);
        if (setStepInteraction)
          setStepInteraction(ValidationPhase.STEP_1, true);
      }
      return;
    }

    // If we've restored the signature (or attempted to), trust our hasRestoredSignature flag as a backup
    if (hasRestoredSignature) {
      if (
        !validationState.stepValidation[ValidationPhase.STEP_1] ||
        !validationState.stepCompleted[ValidationPhase.STEP_1]
      ) {
        console.log(
          "Setting validation state based on hasRestoredSignature flag"
        );
        if (setStepValidation) setStepValidation(ValidationPhase.STEP_1, true);
        if (setStepCompleted) setStepCompleted(ValidationPhase.STEP_1, true);
        if (setStepInteraction)
          setStepInteraction(ValidationPhase.STEP_1, true);
      }
      return;
    }

    // Only use validateSignature if we don't have clear evidence from store or restoration flags
    const isSignatureActuallyValid = validateSignature(
      signature === null ? undefined : signature
    );

    const currentValidationState =
      validationState.stepValidation[ValidationPhase.STEP_1];
    const currentCompletionState =
      validationState.stepCompleted[ValidationPhase.STEP_1];

    // If the signature is actually valid and the step is not marked as valid/completed, update it.
    if (
      isSignatureActuallyValid &&
      (!currentValidationState || !currentCompletionState)
    ) {
      console.log("Updating validation state: signature is valid.");
      if (setStepValidation) setStepValidation(ValidationPhase.STEP_1, true);
      if (setStepCompleted) setStepCompleted(ValidationPhase.STEP_1, true);
      if (setStepInteraction) setStepInteraction(ValidationPhase.STEP_1, true);
    }
    // If the signature is NOT actually valid, but the step IS marked as valid/completed, correct it.
    // IMPORTANT: Only do this correction if we're not relying on store data or restoration flags
    else if (
      !isSignatureActuallyValid &&
      (currentValidationState || currentCompletionState) &&
      (!signature || signature.length <= MIN_SIGNATURE_DATA_URL_LENGTH) &&
      !hasRestoredSignature
    ) {
      console.log(
        "Correcting validation state: signature is NOT valid but step was marked valid."
      );
      if (setStepValidation) setStepValidation(ValidationPhase.STEP_1, false);
      if (setStepCompleted) setStepCompleted(ValidationPhase.STEP_1, false);
    }
  }, [
    isClient,
    signature,
    validationState.stepValidation[ValidationPhase.STEP_1],
    validationState.stepCompleted[ValidationPhase.STEP_1],
    setStepValidation,
    setStepCompleted,
    setStepInteraction,
    validateSignature,
    hasRestoredSignature,
  ]);

  const handleSignatureStart = useCallback(() => {
    console.log("=== Signature Start ===", {
      hasRef: !!signatureRef.current,
      currentTime: new Date().toISOString(),
    });
    setHasInteractedWithSignature(true);
    if (setStepInteraction) setStepInteraction(ValidationPhase.STEP_1, true);
  }, [setStepInteraction, setHasInteractedWithSignature]);

  const handleSignatureEnd = useCallback(() => {
    console.log("=== Signature End ===");
    if (signatureRef.current) {
      // No need to call toDataURL() here if onChange already does it.
      // The primary role here is to trigger final validation if needed,
      // or if onChange doesn't cover all cases (e.g. if it's debounced).
      // Current setup: SignaturePad.onChange calls handleSignatureChange, which calls validateSignature.
      // So, this might be redundant unless specific end-of-stroke logic is needed beyond what onChange provides.
      // For now, let's re-validate to be safe, but this could be optimized.
      const currentDataUrlFromPad = signatureRef.current.toDataURL();
      const isValid = validateSignature(currentDataUrlFromPad);
      setStepValidation(ValidationPhase.STEP_1, isValid);

      if (isValid) {
        setFormErrors(
          (prev: FormErrors): FormErrors => ({ ...prev, signature: [] })
        );
      }
      console.log("handleSignatureEnd: re-validated, isValid:", isValid);
    }
  }, [signatureRef, validateSignature, setStepValidation]);

  const clearSignature = useCallback(() => {
    console.log("=== Clear Signature ===");
    if (signatureRef.current) {
      signatureRef.current.clear(); // This will trigger SignaturePad's onChange with ""
      // handleSignatureChange will then update the store and re-validate.
      setHasInteractedWithSignature(false); // Reset interaction state
      restorationFlagRef.current = false; // Allow re-restoration if needed
      setHasRestoredSignature(false); // Reset restored signature flag
      // Form errors related to signature should be cleared by validation flow
      // Ensure step validation is set to false
      setStepValidation(ValidationPhase.STEP_1, false);
      setStepCompleted(ValidationPhase.STEP_1, false); // Also mark as not completed
    }
  }, [
    signatureRef,
    setHasInteractedWithSignature,
    setHasRestoredSignature,
    setStepValidation,
    setStepCompleted,
  ]);

  const handleTermsChange = useCallback(
    (field: string) => async (checked: boolean) => {
      let newTermsAccepted = terms;
      let newPrivacyAccepted = privacy;
      let newMarketingAccepted = marketing;

      switch (field) {
        case "hasAcceptedTerms":
          newTermsAccepted = checked;
          break;
        case "hasAcceptedPrivacy":
          newPrivacyAccepted = checked;
          break;
        case "hasAcceptedMarketing":
          newMarketingAccepted = checked;
          // HubSpot update logic (ensure safeApiCall is defined and stable, or add to deps)
          if (hubspotContactId) {
            /* ... HubSpot API call ... */
          }
          break;
      }

      updateStoreConsents({
        terms: newTermsAccepted,
        privacy: newPrivacyAccepted,
        marketing: newMarketingAccepted,
      });
      const termsAreValid = newTermsAccepted && newPrivacyAccepted;
      setStepValidation(ValidationPhase.TERMS_AND_CONDITIONS, termsAreValid);
      setStepInteraction(ValidationPhase.TERMS_AND_CONDITIONS, true);
      setStepCompleted(ValidationPhase.TERMS_AND_CONDITIONS, termsAreValid);
    },
    [
      terms,
      privacy,
      marketing,
      hubspotContactId,
      updateStoreConsents,
      setStepValidation,
      setStepInteraction,
      setStepCompleted,
      safeApiCall,
    ]
  );

  // Function to handle content interaction
  const activeContentInteraction = useCallback(() => {
    if (setStepInteraction) {
      setStepInteraction(ValidationPhase.STEP_1, true);
    }
  }, [setStepInteraction]);

  // Function to handle accordion state change for signature panel
  const handleAccordionChange = useCallback(
    (stepId: string, isOpen: boolean) => {
      console.log(
        `Accordion state change: ${stepId} is now ${isOpen ? "open" : "closed"}`
      );
      if (stepId === "digital-signature") {
        setIsSignatureAccordionOpen(isOpen);

        // Important: When we have a signature in store, ensure validation state
        // is immediately maintained even if the accordion is closing or opening
        if (signature && signature.length > MIN_SIGNATURE_DATA_URL_LENGTH) {
          // Immediately ensure validation state is maintained
          if (setStepValidation)
            setStepValidation(ValidationPhase.STEP_1, true);
          if (setStepCompleted) setStepCompleted(ValidationPhase.STEP_1, true);
          if (setStepInteraction)
            setStepInteraction(ValidationPhase.STEP_1, true);
        }

        if (isOpen) {
          // When the signature accordion is opened, attempt to restore the signature
          // Use a small delay to ensure the canvas is properly mounted
          setTimeout(() => {
            if (
              signatureRef.current &&
              signature &&
              !restorationFlagRef.current
            ) {
              console.log("Accordion opened - attempting to restore signature");
              restorationFlagRef.current = false; // Reset flag to allow restoration
              restoreSignature();
            }
          }, 100);
        }
      }
    },
    [
      signature,
      signatureRef,
      restoreSignature,
      restorationFlagRef,
      setStepValidation,
      setStepCompleted,
      setStepInteraction,
    ]
  );

  // Effect to respond to accordion open state changes
  useEffect(() => {
    if (isSignatureAccordionOpen) {
      // First, always ensure validation state is correct based on store data
      // This ensures the UI checkmark is immediately correct when accordion opens
      if (signature && signature.length > MIN_SIGNATURE_DATA_URL_LENGTH) {
        if (setStepValidation) setStepValidation(ValidationPhase.STEP_1, true);
        if (setStepCompleted) setStepCompleted(ValidationPhase.STEP_1, true);
        if (setStepInteraction)
          setStepInteraction(ValidationPhase.STEP_1, true);
      }

      // Then attempt canvas restoration if conditions are right
      if (
        signatureRef.current &&
        signature &&
        signature.length > MIN_SIGNATURE_DATA_URL_LENGTH
      ) {
        console.log(
          "Responding to signature accordion open state - attempting restoration"
        );
        restoreSignature();
      }
    }
  }, [
    isSignatureAccordionOpen,
    signatureRef,
    signature,
    restoreSignature,
    setStepValidation,
    setStepCompleted,
    setStepInteraction,
  ]);

  if (!isClient) {
    return null;
  }

  return (
    <PhaseGuard phase={6}>
      <div className="min-h-screen bg-[#f5f7fa]">
        <PhaseNavigation
          phase={ValidationPhase.AGREEMENT}
          translations={{
            title: "Agreement",
            description: "Please review and sign.",
          }}
        />
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <div className="mt-4 sm:mt-8 mb-8">
            <SpeechBubble
              message={t("phases.agreement.message")
                .replace(
                  "{salutation}",
                  personalDetails?.salutation === "herr"
                    ? t("salutation.mr")
                    : t("salutation.mrs")
                )
                .replace("{firstName}", personalDetails?.firstName ?? "")
                .replace("{lastName}", personalDetails?.lastName ?? "")
                .replace("{address}", personalDetails?.address?.street ?? "")
                .replace(
                  "{postalCode}",
                  personalDetails?.address?.postalCode ?? ""
                )
                .replace("{city}", personalDetails?.address?.city ?? "")
                .replace("{country}", personalDetails?.address?.country ?? "")
                .replace("{bookingNumber}", bookingNumber ?? "")
                .replace(
                  "{departure}",
                  firstFlightOfFirstSegment?.from?.name ||
                    firstFlightOfFirstSegment?.from?.iata ||
                    ""
                )
                .replace(
                  "{connection}",
                  Object.keys(storeSelectedFlights || {}).length > 1 &&
                    firstFlightOfSecondSegment
                    ? ` ${t("common.via")} ${
                        firstFlightOfSecondSegment?.from?.name ||
                        firstFlightOfSecondSegment?.from?.iata ||
                        ""
                      }`
                    : ""
                )
                .replace(
                  "{arrival}",
                  lastFlightOfLastSegment?.to?.name ||
                    lastFlightOfLastSegment?.to?.iata ||
                    ""
                )
                .replace("{date}", formattedDate)
                .replace(
                  "{compensationAmount}",
                  userCompensationAmount?.toString() ?? ""
                )}
            />
          </div>

          <AccordionProvider initialActiveStepId={initialActiveAccordion}>
            <form onSubmit={handleSubmit} className="space-y-8">
              <AccordionCardClient
                title={t("phases.agreement.digitalSignature.title")}
                subtitle={t("phases.agreement.digitalSignature.subtitle")}
                isCompleted={
                  validationState.stepValidation[ValidationPhase.STEP_1] ===
                  true
                }
                stepId="digital-signature"
                isValid={
                  validationState.stepValidation[ValidationPhase.STEP_1] ===
                  true
                }
                isQA={false}
                onInteraction={activeContentInteraction}
                onToggle={handleAccordionChange}
                isOpenByDefault={true}
              >
                <div className="p-4">
                  <div className="h-48 bg-gray-50 rounded-md overflow-hidden">
                    <SignaturePad
                      ref={signatureRef}
                      onBegin={handleSignatureStart}
                      onEnd={handleSignatureEnd}
                      onChange={handleSignatureChange}
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                      aria-label={t(
                        "phases.agreement.digitalSignature.clearSignature"
                      )}
                    >
                      {t("phases.agreement.digitalSignature.clearSignature")}
                    </button>
                  </div>
                  {formErrors.signature &&
                    formErrors.signature.map((error, index) => (
                      <FormError key={index} errors={[error]} />
                    ))}
                </div>
              </AccordionCardClient>

              <AccordionCardClient
                title={t("phases.agreement.termsAndConditions.title")}
                subtitle={t("phases.agreement.termsAndConditions.subtitle")}
                isCompleted={
                  validationState.stepValidation[
                    ValidationPhase.TERMS_AND_CONDITIONS
                  ] ?? false
                }
                stepId="terms-and-conditions"
                isValid={
                  validationState.stepValidation[
                    ValidationPhase.TERMS_AND_CONDITIONS
                  ] ?? false
                }
                onInteraction={() => {
                  if (setStepInteraction) {
                    setStepInteraction(
                      ValidationPhase.TERMS_AND_CONDITIONS,
                      true
                    );
                  }
                }}
                onToggle={handleAccordionChange}
              >
                <div className="space-y-4 p-4">
                  <ConsentCheckbox
                    id="terms"
                    type="terms"
                    checked={terms}
                    onChange={handleTermsChange("hasAcceptedTerms")}
                    label={t("common.termsAndConditions")}
                  />
                  <ConsentCheckbox
                    id="privacy"
                    type="privacy"
                    checked={privacy}
                    onChange={handleTermsChange("hasAcceptedPrivacy")}
                    label={t("common.privacyPolicy")}
                  />
                  <ConsentCheckbox
                    id="marketing"
                    type="marketing"
                    checked={marketing}
                    onChange={handleTermsChange("hasAcceptedMarketing")}
                    label={t("common.marketingConsent")}
                  />
                </div>
              </AccordionCardClient>

              {formErrors.submit &&
                formErrors.submit.map((error, index) => (
                  <ErrorMessage
                    key={index}
                    title={
                      t("errors.submissionFailedTitle") || "Submission Error"
                    }
                    message={error}
                    buttonText={t("common.ok") || "OK"}
                    onButtonClick={() =>
                      setFormErrors((prev) => ({ ...prev, submit: [] }))
                    }
                  />
                ))}

              <div className="flex flex-col sm:flex-row justify-between gap-4 mt-12 pt-8">
                <ContinueButton
                  onClick={handleContinue}
                  text={t("phases.agreement.submit")}
                  isLoading={isSubmitting}
                  disabled={!canSubmit() || isSubmitting}
                />
                <BackButton
                  onClick={handleBack}
                  disabled={isSubmitting}
                  text={t("common.back")}
                />
              </div>
            </form>
          </AccordionProvider>
        </main>
      </div>
    </PhaseGuard>
  );
}

// Export the wrapped component with LoadingProvider
export default function AgreementPage() {
  return (
    <LoadingProvider>
      <AccordionProvider>
        <AgreementPageContent />
      </AccordionProvider>
    </LoadingProvider>
  );
}
