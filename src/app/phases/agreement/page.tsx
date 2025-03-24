"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import useStore from "@/lib/state/store";
import { usePhase4Store } from "@/lib/state/phase4Store";
import { useFlightStore } from "@/lib/state/flightStore";
import FormError from "@/components/shared/FormError";
import { useLoading } from "@/providers/LoadingProvider";
import { PhaseGuard } from "@/components/shared/PhaseGuard";
import SignaturePad, {
  SignaturePadRef,
} from "@/components/shared/SignaturePad";
import { ConsentCheckbox } from "@/components/ConsentCheckbox";
import { SpeechBubble } from "@/components/SpeechBubble";
import { PhaseNavigation } from "@/components/PhaseNavigation";
import { AccordionCard } from "@/components/shared/AccordionCard";
import { accordionConfig } from "@/config/accordion";
import { BackButton } from "@/components/shared/BackButton";
import { ContinueButton } from "@/components/shared/ContinueButton";
import { useTranslation } from "@/hooks/useTranslation";
import { Flight } from "@/types/store";
import { ClaimService } from "@/services/claimService";
import type { Answer } from "@/types/wizard";
import useScrollToTop from "@/hooks/useScrollToTop";
import {
  saveSignatureToLocalStorage,
  loadSignatureFromLocalStorage,
  createSimpleSignatureDataUrl,
  updateStoreValidationState,
} from "@/lib/signature-utils";

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

// Add type for state setters at the top of the file
type SetStateAction<T> = T | ((prevState: T) => T);
/* eslint-disable @typescript-eslint/no-unused-vars */
type SetStateFunction<T> = (action: SetStateAction<T>) => void;
/* eslint-enable @typescript-eslint/no-unused-vars */

export default function AgreementPage() {
  const router = useRouter();
  const { hideLoading } = useLoading();
  const store = useStore();
  const phase4Store = usePhase4Store();
  const [isClient, setIsClient] = useState(false);
  const { t, lang } = useTranslation();

  const {
    selectedFlights,
    personalDetails,
    bookingNumber,
    completedPhases,
    setTermsAccepted,
    setPrivacyAccepted,
    setMarketingAccepted,
    termsAccepted,
    privacyAccepted,
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    marketingAccepted,
    validationState,
    setSignature,
    setHasSignature,
    originalFlights,
    setOriginalFlights,
    updateValidationState,
  } = store;

  const {
    travelStatusAnswers,
    selectedFlights: phase4SelectedFlights,
    informedDateAnswers,
  } = phase4Store;

  const signatureRef = useRef<SignaturePadRef>(null);
  const restorationFlagRef = useRef(false);
  const mounted = useRef(true);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [openSteps, setOpenSteps] = React.useState<Array<number | string>>([
    "digital-signature",
  ]);
  // Kept for consistency with other pages
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
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignatureRestored, setIsSignatureRestored] = useState(false);

  // Ensure page is scrolled to top on mount
  useScrollToTop();

  // Set isClient to true on mount
  useEffect(() => {
    console.log("=== Client Mount Effect ===", { isClient });
    setIsClient(true);
    mounted.current = true;
  }, []);

  // Initialize state only on client side
  useEffect(() => {
    if (!isClient || !mounted.current) return;

    const initializeState = async () => {
      try {
        // Get the stored evaluation response - this will throw if not available
        const evaluationResponse = ClaimService.getLastEvaluationResponse();

        // Only proceed if we have an accepted evaluation
        if (evaluationResponse && evaluationResponse.status !== "accept") {
          throw new Error("Claim was not accepted during evaluation");
        }

        // Set current phase to 6 and prevent changes
        const store = useStore.getState();
        store.setCurrentPhase(6);

        // Initialize flight data if needed
        if (!originalFlights?.length) {
          const mainStoreFlights = store.selectedFlights as Flight[];
          if (mainStoreFlights?.length) {
            setOriginalFlights(mainStoreFlights);
          }
        }

        // Try to restore validation state from phase 1
        let phase1ValidationState;
        let phase1TermsValid = false;

        try {
          phase1ValidationState = localStorage.getItem(
            "initialAssessmentValidation"
          );
          if (phase1ValidationState) {
            const parsedValidation = JSON.parse(phase1ValidationState);
            phase1TermsValid =
              parsedValidation.validationState?.isTermsValid || false;

            // Restore marketing status from phase 1
            if (parsedValidation.marketingAccepted !== undefined) {
              setMarketingAccepted(parsedValidation.marketingAccepted);
              // Update HubSpot contact with initial marketing status
              const contactId = sessionStorage.getItem("hubspot_contact_id");
              if (contactId) {
                fetch("/.netlify/functions/hubspot-integration", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    path: "contact",
                    contactId,
                    arbeitsrecht_marketing_status:
                      parsedValidation.marketingAccepted,
                  }),
                }).catch((error) => {
                  console.error(
                    "Error updating HubSpot marketing status:",
                    error
                  );
                });
              }
            }
          }
        } catch (error) {
          console.error("Error accessing/parsing localStorage:", error);
        }

        // Check if we have a stored signature
        const storedSignatureData = loadSignatureFromLocalStorage();
        const storedSignature =
          store.signature || storedSignatureData.signature;
        const hasStoredSignature = !!storedSignature;

        // Validate terms if previously accepted
        if ((termsAccepted && privacyAccepted) || phase1TermsValid) {
          const updatedValidationState = {
            ...store.validationState,
            isTermsValid: true,
            stepValidation: {
              ...store.validationState.stepValidation,
              2: true,
            },
            stepInteraction: {
              ...store.validationState.stepInteraction,
              2: true,
            },
            2: true,
            _timestamp: Date.now(),
          };

          if (phase1TermsValid) {
            setTermsAccepted(true);
            setPrivacyAccepted(true);
          }

          store.updateValidationState(updatedValidationState);
        }

        // Initialize form data based on store state
        setFormData({
          hasAcceptedTerms: termsAccepted,
          hasAcceptedPrivacy: privacyAccepted,
          hasAcceptedMarketing: marketingAccepted,
          travelStatusAnswers: travelStatusAnswers || [],
          informedDateAnswers: informedDateAnswers || [],
        });

        // If we have a signature, mark it as valid in the validation state
        if (hasStoredSignature) {
          store.setSignature(storedSignature);
          store.setHasSignature(true);
          setHasInteractedWithSignature(true);
          setHasSignature(true);

          // Update validation state for signature
          store.updateValidationState({
            ...store.validationState,
            isSignatureValid: true,
            stepValidation: {
              ...store.validationState.stepValidation,
              6: true,
            },
            stepInteraction: {
              ...store.validationState.stepInteraction,
              6: true,
            },
            _timestamp: Date.now(),
          });
        }

        // If terms and privacy are accepted, update validation state
        if (termsAccepted && privacyAccepted) {
          store.updateValidationState({
            ...store.validationState,
            isTermsValid: true,
            stepValidation: {
              ...store.validationState.stepValidation,
              7: true,
            },
            stepInteraction: {
              ...store.validationState.stepInteraction,
              7: true,
            },
            _timestamp: Date.now(),
          });
        }

        // Log the validation state for debugging
        console.log("=== Agreement Page Validation State ===", {
          validationState: store.validationState,
          termsAccepted,
          privacyAccepted,
          hasSignature: store.hasSignature,
          canSubmit:
            store.validationState.isSignatureValid &&
            store.validationState.isTermsValid &&
            termsAccepted &&
            privacyAccepted,
          timestamp: new Date().toISOString(),
        });

        mounted.current = true;
      } catch (error) {
        console.error("Error initializing agreement page:", error);
        // Redirect to trip experience page if evaluation not found or rejected
        router.push("/trip-experience");
      }
    };

    initializeState();
  }, [isClient]);

  // Separate useEffect for signature restoration to ensure SignaturePad is mounted
  useEffect(() => {
    console.log("=== Signature Restoration Effect ===", {
      isClient,
      mounted: mounted.current,
      hasSignatureRef: !!signatureRef.current,
      storedSignature: !!store.signature,
      lang,
      hasRestorationFlag: restorationFlagRef.current,
    });

    // Wait for next tick to ensure SignaturePad is fully mounted
    const timer = setTimeout(() => {
      if (
        !isClient ||
        !mounted.current ||
        !signatureRef.current ||
        restorationFlagRef.current
      ) {
        console.log("Early return conditions:", {
          noClient: !isClient,
          notMounted: !mounted.current,
          noSignatureRef: !signatureRef.current,
          alreadyRestored: restorationFlagRef.current,
        });
        return;
      }

      try {
        const storedSignature = store.signature;
        console.log("Attempting signature restoration:", {
          hasStoredSignature: !!storedSignature,
          signaturePadReady: !!signatureRef.current,
          currentTime: new Date().toISOString(),
        });

        if (storedSignature && signatureRef.current) {
          // Set flag before restoration
          restorationFlagRef.current = true;

          // Force a clean slate before restoring
          signatureRef.current.clear();

          // Restore the signature to the pad
          signatureRef.current.fromDataURL(storedSignature);
          setHasSignature(true);
          setHasInteractedWithSignature(true);

          // Update validation state
          const updatedValidationState = {
            ...store.validationState,
            isSignatureValid: true,
            stepValidation: {
              ...store.validationState.stepValidation,
              6: true,
            },
            stepInteraction: {
              ...store.validationState.stepInteraction,
              6: true,
            },
            _timestamp: Date.now(),
          };

          store.updateValidationState(updatedValidationState);

          // Force a check of the canSubmit condition to update button state
          setTimeout(() => {
            const canSubmitNow = canSubmit();
            console.log(
              "After signature restoration, canSubmit:",
              canSubmitNow
            );
          }, 100);

          console.log("Signature successfully restored");
        }
      } catch (error) {
        console.error("Error restoring signature:", error);
        restorationFlagRef.current = false;
      }
    }, 100); // Small delay to ensure component is ready

    return () => clearTimeout(timer);
  }, [isClient, signatureRef.current, store.signature, lang]); // Add signatureRef.current and store.signature to dependencies

  // Add effect to handle SignaturePad initialization
  useEffect(() => {
    if (signatureRef.current) {
      console.log("=== SignaturePad Reference Updated ===", {
        hasRef: !!signatureRef.current,
        currentTime: new Date().toISOString(),
      });
    }
  }, [signatureRef.current]);

  // Add cleanup effect
  useEffect(() => {
    return () => {
      restorationFlagRef.current = false;
    };
  }, []);

  // Remove redundant effects
  useEffect(() => {
    hideLoading();
  }, [hideLoading]);

  // Effect to check canSubmit on every render
  useEffect(() => {
    if (isClient && mounted.current) {
      const canSubmitNow = canSubmit();
      console.log("=== Agreement Page CanSubmit Check ===", {
        canSubmit: canSubmitNow,
        hasSignature: !isSignatureEmpty(),
        termsAccepted,
        privacyAccepted,
        validationState: {
          isSignatureValid: validationState.isSignatureValid,
          isTermsValid: validationState.isTermsValid,
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  const handleSignatureStart = () => {
    console.log("=== Signature Start ===", {
      hasRef: !!signatureRef.current,
      currentTime: new Date().toISOString(),
    });

    // Mark that the user has interacted with the signature
    setHasInteractedWithSignature(true);

    // Update store validation state to track interaction
    store.updateValidationState({
      ...store.validationState,
      stepInteraction: {
        ...store.validationState.stepInteraction,
        6: true,
      },
      _timestamp: Date.now(),
    });
  };

  const handleSignatureEnd = () => {
    console.log("=== Signature End ===");
    if (signatureRef.current) {
      const dataUrl = signatureRef.current.toDataURL();
      const isEmpty = isSignatureEmpty();
      console.log("Signature state:", {
        isEmpty,
        hasSignatureRef: !!signatureRef.current,
      });

      if (!isEmpty) {
        setSignature(dataUrl);
        setHasSignature(true);

        // Call our validateSignature function
        validateSignature();

        setFormErrors(
          (prev: FormErrors): FormErrors => ({ ...prev, signature: [] })
        );
      }
    }
  };

  const clearSignature = () => {
    console.log("=== Clear Signature ===");
    if (signatureRef.current) {
      signatureRef.current.clear();
      setSignature("");
      setHasSignature(false);
      setHasInteractedWithSignature(false);
      restorationFlagRef.current = false;

      // Update validation state directly in the store
      store.updateValidationState({
        ...store.validationState,
        isSignatureValid: false,
        stepValidation: {
          ...store.validationState.stepValidation,
          6: false, // Update step 6 (agreement)
        },
        stepCompleted: {
          ...store.validationState.stepCompleted,
          6: false,
        },
        _timestamp: Date.now(),
      });

      // Update the store state directly as well to ensure persistence
      store.setSignature("");
      store.setHasSignature(false);

      // Clear from localStorage
      try {
        localStorage.removeItem("signature");
        localStorage.setItem("hasSignature", "false");
      } catch (e) {
        console.error("Error removing signature from localStorage:", e);
      }

      setFormErrors(
        (prev: FormErrors): FormErrors => ({
          ...prev,
          signature: [],
        })
      );
      console.log(
        "Signature cleared successfully and validation state updated"
      );
    }
  };

  const handleTermsChange = (field: string) => (checked: boolean) => {
    let newTermsAccepted = termsAccepted;
    let newPrivacyAccepted = privacyAccepted;

    switch (field) {
      case "hasAcceptedTerms":
        setTermsAccepted(checked);
        newTermsAccepted = checked;
        break;
      case "hasAcceptedPrivacy":
        setPrivacyAccepted(checked);
        newPrivacyAccepted = checked;
        break;
      case "hasAcceptedMarketing":
        setMarketingAccepted(checked);
        // Update HubSpot contact with marketing status
        const contactId = sessionStorage.getItem("hubspot_contact_id");
        if (contactId) {
          fetch("/.netlify/functions/hubspot-integration", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              path: "contact",
              contactId,
              arbeitsrecht_marketing_status: checked,
            }),
          }).catch((error) => {
            console.error("Error updating HubSpot marketing status:", error);
          });
        }
        break;
    }

    const validationResult = {
      isValid: newTermsAccepted && newPrivacyAccepted,
    };

    // Update validation state for step 2 (agreement page uses step 2 instead of 4)
    const updatedValidationState = {
      ...validationState,
      stepValidation: {
        ...validationState.stepValidation,
        2: validationResult.isValid,
      },
      stepInteraction: {
        ...validationState.stepInteraction,
        2: true,
      },
      isTermsValid: validationResult.isValid,
      _timestamp: Date.now(),
    };

    // Set interacted steps
    setInteractedSteps((prev) => [...new Set([...prev, 2])]);

    // Update validation state
    store.updateValidationState(updatedValidationState);
  };

  const isSignatureEmpty = () => {
    const isEmpty = !signatureRef.current || signatureRef.current.isEmpty();
    console.log("Checking if signature is empty:", { isEmpty });
    return isEmpty;
  };

  const canSubmit = () => {
    // Check if signature is actually present
    const signaturePresent = !isSignatureEmpty();

    // Check if terms are accepted
    const termsValid = termsAccepted && privacyAccepted;

    // If we have a signature and terms are accepted, update validation state if needed
    if (
      signaturePresent &&
      termsValid &&
      (!validationState.isSignatureValid || !validationState.isTermsValid)
    ) {
      // Update validation state to match actual state
      store.updateValidationState({
        ...validationState,
        isSignatureValid: true,
        isTermsValid: true,
        stepValidation: {
          ...validationState.stepValidation,
          6: true,
        },
        stepInteraction: {
          ...validationState.stepInteraction,
          6: true,
        },
        _timestamp: Date.now(),
      });
    }

    return signaturePresent && termsValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Get personal details from store
      const storeState = useStore.getState();
      const personalDetails = storeState.personalDetails;

      // Try to get booking number from phase 3 state if not provided
      let finalBookingNumber = bookingNumber;
      try {
        if (!finalBookingNumber) {
          const phase3State = localStorage.getItem("phase3State");
          if (phase3State) {
            const parsedState = JSON.parse(phase3State);
            finalBookingNumber = parsedState.bookingNumber;
          }
        }
      } catch (error) {
        console.error(
          "Error getting booking number from phase 3 state:",
          error
        );
      }

      // Validate booking number
      if (
        !finalBookingNumber ||
        finalBookingNumber.trim().length < 6 ||
        !/^[A-Z0-9]+$/i.test(finalBookingNumber.trim())
      ) {
        setFormErrors((prev) => ({
          ...prev,
          submit: ["Please enter a valid booking number"],
        }));
        return;
      }

      // Submit the order
      if (!personalDetails) {
        console.error("Personal details are required");
        throw new Error("Personal details are required");
      }

      const orderResult = await ClaimService.orderClaim(
        originalFlights,
        phase4SelectedFlights,
        travelStatusAnswers,
        informedDateAnswers,
        personalDetails,
        finalBookingNumber,
        signatureRef.current?.toDataURL() || "",
        termsAccepted,
        privacyAccepted
      );

      // Log the order result for debugging
      console.log("=== Order Result ===", {
        orderResult,
        timestamp: new Date().toISOString(),
      });

      if (orderResult.data?.guid) {
        // Navigate to success page with claim ID
        router.push(
          `/${lang}/phases/claim-submitted?claim_id=${orderResult.data.guid}&scrollTop=true`
        );
      } else if (orderResult.error?.includes("evaluated as reject")) {
        // If the claim was rejected, redirect to rejection page
        router.push(`/${lang}/phases/claim-rejected?scrollTop=true`);
      } else {
        // For other errors, show the error message
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

  // Add back navigation handler
  const handleBack = () => {
    if (isSubmitting) return;

    // Get URL parameters to preserve them
    const searchParams = new URLSearchParams(window.location.search);
    const amount = searchParams.get("amount");
    const provision = searchParams.get("provision");

    // Construct URL parameters
    const params = new URLSearchParams();
    params.set("redirected", "true");
    if (amount) params.set("amount", amount);
    if (provision) params.set("provision", provision);

    // Navigate to claim success page
    router.push(`/${lang}/phases/claim-success?${params.toString()}`);
  };

  const handleSignatureChange = (dataUrl: string) => {
    if (!mounted.current) return;

    try {
      console.log("Signature changed", {
        dataUrlLength: dataUrl?.length || 0,
        hasSignature: !!dataUrl,
        currentTime: new Date().toISOString(),
      });

      // Only update validation if the user has interacted with the signature
      if (hasInteractedWithSignature) {
        // Save to local state
        setSignature(dataUrl);

        // Save to localStorage
        saveSignatureToLocalStorage(dataUrl);

        // Update store directly
        store.setSignature(dataUrl);
        store.setHasSignature(true);

        // Update form errors
        setFormErrors((prev) => ({
          ...prev,
          signature: [],
        }));

        // Update validation state
        updateStoreValidationState(store);
      }
    } catch (error) {
      console.error("Error in handleSignatureChange:", error);
    }
  };

  const toggleStep = (step: number | string) => {
    setOpenSteps((prev: Array<number | string>): Array<number | string> => {
      if (prev.includes(step)) {
        return prev.filter((s: number | string): boolean => s !== step);
      }
      return [...prev, step];
    });
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

  // Add effect to handle step opening behavior
  useEffect(() => {
    if (validationState.isSignatureValid) {
      setOpenSteps((prev) => {
        if (!prev.includes("terms-and-conditions")) {
          return [...prev, "terms-and-conditions"];
        }
        return prev;
      });
    }
  }, [validationState.isSignatureValid]);

  const handleContinue = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Get personal details from store
      const storeState = useStore.getState();
      const personalDetails = storeState.personalDetails;

      // Get flights from store or session storage
      const originalFlights = storeState.selectedFlights || [];

      // Try to get phase4 data from session storage
      let phase4SelectedFlights = originalFlights;
      let travelStatusAnswers: Answer[] = [];
      let informedDateAnswers: Answer[] = [];

      try {
        const phase4State = sessionStorage.getItem("phase4State");
        if (phase4State) {
          const parsedState = JSON.parse(phase4State);
          phase4SelectedFlights =
            parsedState.selectedFlights || originalFlights;
          travelStatusAnswers = parsedState.travelStatus?.answers || [];
          informedDateAnswers = parsedState.informedDate?.answers || [];
        }
      } catch (error) {
        console.error("Error getting phase4 data from session storage:", error);
      }

      // Get booking number from multiple sources to ensure we have it
      let finalBookingNumber = storeState.bookingNumber || "";

      // Try to get from localStorage phase3State
      try {
        if (!finalBookingNumber) {
          const phase3State = localStorage.getItem("phase3State");
          if (phase3State) {
            const parsedState = JSON.parse(phase3State);
            finalBookingNumber = parsedState.bookingNumber;
            console.log(
              "Got booking number from phase3State:",
              finalBookingNumber
            );
          }
        }
      } catch (error) {
        console.error("Error getting booking number from phase3State:", error);
      }

      // Try to get from localStorage phase3FlightData
      try {
        if (!finalBookingNumber) {
          const phase3FlightData = localStorage.getItem("phase3FlightData");
          if (phase3FlightData) {
            const parsedData = JSON.parse(phase3FlightData);
            finalBookingNumber = parsedData.bookingNumber;
            console.log(
              "Got booking number from phase3FlightData:",
              finalBookingNumber
            );
          }
        }
      } catch (error) {
        console.error(
          "Error getting booking number from phase3FlightData:",
          error
        );
      }

      // Try to get from sessionStorage
      try {
        if (!finalBookingNumber) {
          const bookingNumber = sessionStorage.getItem("booking_number");
          if (bookingNumber) {
            finalBookingNumber = bookingNumber;
            console.log(
              "Got booking number from sessionStorage:",
              finalBookingNumber
            );
          }
        }
      } catch (error) {
        console.error(
          "Error getting booking number from sessionStorage:",
          error
        );
      }

      // If still no booking number, create a fallback one
      if (!finalBookingNumber) {
        finalBookingNumber = `CF-${Date.now()}`;
        console.log("Created fallback booking number:", finalBookingNumber);

        // Save it to localStorage and sessionStorage for future use
        try {
          localStorage.setItem("booking_number", finalBookingNumber);
          sessionStorage.setItem("booking_number", finalBookingNumber);

          // Also update phase3State if it exists
          const phase3State = localStorage.getItem("phase3State");
          if (phase3State) {
            const parsedState = JSON.parse(phase3State);
            parsedState.bookingNumber = finalBookingNumber;
            localStorage.setItem("phase3State", JSON.stringify(parsedState));
          }
        } catch (error) {
          console.error("Error saving fallback booking number:", error);
        }
      }

      // Check if we already have a claim ID
      const claimId = sessionStorage.getItem("claim_id");
      if (claimId) {
        // Instead of redirecting, we'll log that it's a resubmission and continue
        console.log("Resubmitting claim. Previous claim ID:", claimId);
        // We'll keep the existing claim ID in session storage for reference
      }

      // Ensure we have personal details
      if (!personalDetails) {
        console.error("Personal details are required");
        throw new Error("Personal details are required");
      }

      console.log("=== CALLING ORDER CLAIM SERVICE ===", {
        timestamp: new Date().toISOString(),
        personalDetails,
        originalFlights: originalFlights.length,
        phase4SelectedFlights: phase4SelectedFlights.length,
        travelStatusAnswers: travelStatusAnswers.length,
        informedDateAnswers: informedDateAnswers.length,
        finalBookingNumber,
        signatureRef: !!signatureRef.current,
        termsAccepted,
        privacyAccepted,
        marketingAccepted,
        isResubmission: !!claimId,
      });

      // Call the ClaimService.orderClaim method
      const orderResult = await ClaimService.orderClaim(
        originalFlights,
        phase4SelectedFlights,
        travelStatusAnswers,
        informedDateAnswers,
        personalDetails,
        finalBookingNumber,
        signatureRef.current?.toDataURL() || "",
        termsAccepted,
        privacyAccepted,
        marketingAccepted
      );

      console.log("=== ORDER CLAIM RESULT ===", {
        orderResult,
        timestamp: new Date().toISOString(),
        isResubmission: !!claimId,
      });

      if (orderResult.data?.guid) {
        // Store the new claim ID, overwriting the previous one if it exists
        sessionStorage.setItem("claim_id", orderResult.data.guid);

        // Mark the claim as submitted
        sessionStorage.setItem("claim_submitted", "true");

        // Navigate to the claim submitted page with language prefix
        const langPrefix = lang ? `/${lang}` : "";
        router.push(
          `${langPrefix}/phases/claim-submitted?claim_id=${orderResult.data.guid}&scrollTop=true`
        );
      } else {
        console.warn("No claim ID returned from orderClaim:", orderResult);
        // Fall back to the old method of updating HubSpot directly
        try {
          await updateHubSpotDirectly();
        } catch (hubspotError) {
          console.error("HubSpot update failed, but continuing:", hubspotError);
        }

        // Generate a temporary claim ID so we can still proceed
        const tempClaimId = `temp-${Date.now()}`;
        sessionStorage.setItem("claim_id", tempClaimId);
        sessionStorage.setItem("claim_submitted", "true");

        // Navigate to the claim submitted page even without a real claim ID
        const langPrefix = lang ? `/${lang}` : "";
        router.push(
          `${langPrefix}/phases/claim-submitted?claim_id=${tempClaimId}&scrollTop=true`
        );
      }
    } catch (error) {
      console.error("Error submitting claim:", error);

      // Try to update HubSpot directly even if the API call failed
      try {
        await updateHubSpotDirectly();
      } catch (hubspotError) {
        console.error("HubSpot update also failed:", hubspotError);
      }

      // Generate a temporary claim ID and continue anyway
      const tempClaimId = `temp-${Date.now()}`;
      sessionStorage.setItem("claim_id", tempClaimId);
      sessionStorage.setItem("claim_submitted", "true");

      // Show the error but still proceed to the success page
      setFormErrors((prev) => ({
        ...prev,
        submit: [
          "Your claim information has been saved, but there was an issue with the final submission: " +
            (error instanceof Error ? error.message : String(error)),
        ],
      }));

      // Navigate to success page despite error
      const langPrefix = lang ? `/${lang}` : "";
      router.push(
        `${langPrefix}/phases/claim-submitted?claim_id=${tempClaimId}&scrollTop=true`
      );
      setIsSubmitting(false);
    }
  };

  // Move the old HubSpot update logic to a separate function
  const updateHubSpotDirectly = async () => {
    try {
      const contactId = sessionStorage.getItem("hubspot_contact_id");
      const dealId = sessionStorage.getItem("hubspot_deal_id");
      const storeState = useStore.getState();
      const personalDetails = storeState.personalDetails;
      const compensationAmount =
        sessionStorage.getItem("compensation_amount") || "250";

      // First update the contact information
      console.log("Updating HubSpot contact directly:", {
        contactId,
        personalDetails,
        marketingAccepted,
        timestamp: new Date().toISOString(),
      });

      if (!contactId) {
        console.warn("No HubSpot contact ID available, skipping update");
        return;
      }

      const contactResponse = await fetch(
        "/.netlify/functions/hubspot-integration",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: "contact",
            contactId,
            email: personalDetails?.email || "",
            firstname: personalDetails?.firstName || "",
            lastname: personalDetails?.lastName || "",
            salutation: personalDetails?.salutation || "",
            phone: personalDetails?.phone || "",
            mobilephone: personalDetails?.phone || "",
            address: personalDetails?.address || "",
            city: personalDetails?.city || "",
            zip: personalDetails?.postalCode || "",
            country: personalDetails?.country || "",
            arbeitsrecht_marketing_status: Boolean(marketingAccepted),
            owner_marketable_status: Boolean(marketingAccepted),
          }),
        }
      );

      if (!contactResponse.ok) {
        const errorText = await contactResponse.text();
        console.error("Failed to update HubSpot contact:", errorText);
        // Log but don't throw to allow continuing
        console.warn("Continuing despite HubSpot contact update failure");
      } else {
        console.log("Successfully updated HubSpot contact");
      }

      // Then update the deal if we have a deal ID
      if (dealId) {
        console.log("Updating HubSpot deal directly:", {
          dealId,
          contactId,
          amount: compensationAmount,
          stage: "closedwon",
        });

        const dealResponse = await fetch(
          "/.netlify/functions/hubspot-integration",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              path: "deal",
              dealId,
              contactId,
              amount: compensationAmount,
              stage: "closedwon",
            }),
          }
        );

        if (!dealResponse.ok) {
          const errorText = await dealResponse.text();
          console.error("Failed to update deal:", errorText);
          // Log but don't throw to allow continuing
          console.warn("Continuing despite HubSpot deal update failure");
        } else {
          const updateResult = await dealResponse.json();
          console.log("Successfully updated HubSpot deal:", updateResult);
        }
      } else {
        console.warn("No HubSpot deal ID available, skipping deal update");
      }
    } catch (error) {
      // Log the error but don't throw, so the app can continue
      console.error("Error in HubSpot update (non-fatal):", error);
    }
  };

  // Add our validateSignature function
  const validateSignature = () => {
    if (!signatureRef.current) return false;

    try {
      // Check if signature is empty
      const isEmpty = signatureRef.current.isEmpty();
      if (isEmpty) {
        console.log("Signature is empty");
        return false;
      }

      // Get the signature data
      const signatureData = signatureRef.current.toDataURL();
      if (!signatureData || signatureData.length < 100) {
        console.log("Signature data is invalid or too short");
        return false;
      }

      // Update the store with the signature data
      store.setSignature(signatureData);
      store.setHasSignature(true);

      // Update validation state
      store.updateValidationState({
        ...store.validationState,
        isSignatureValid: true,
        stepValidation: {
          ...store.validationState.stepValidation,
          6: true,
        },
        stepInteraction: {
          ...store.validationState.stepInteraction,
          6: true,
        },
        _timestamp: Date.now(),
      });

      console.log("Signature validated successfully");
      return true;
    } catch (error) {
      console.error("Error validating signature:", error);
      return false;
    }
  };

  // Add compensationAmount declaration
  const compensationAmount = 250; // Default value

  if (!isClient) {
    return null; // or a loading state
  }

  return (
    <PhaseGuard phase={5}>
      <div className="min-h-screen bg-[#f5f7fa]">
        <PhaseNavigation currentPhase={6} completedPhases={completedPhases} />
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <div className="mt-4 sm:mt-8 mb-8">
            <SpeechBubble
              message={t.phases.agreement.message
                .replace(
                  "{salutation}",
                  personalDetails?.salutation === "herr"
                    ? t.salutation.mr
                    : t.salutation.mrs
                )
                .replace("{firstName}", personalDetails?.firstName ?? "")
                .replace("{lastName}", personalDetails?.lastName ?? "")
                .replace("{address}", personalDetails?.address ?? "")
                .replace("{postalCode}", personalDetails?.postalCode ?? "")
                .replace("{city}", personalDetails?.city ?? "")
                .replace("{country}", personalDetails?.country ?? "")
                .replace("{bookingNumber}", bookingNumber ?? "")
                .replace(
                  "{departure}",
                  selectedFlights[0]?.departure ||
                    selectedFlights[0]?.departureAirport ||
                    selectedFlights[0]?.departureCity ||
                    ""
                )
                .replace(
                  "{connection}",
                  selectedFlights.length > 1
                    ? ` via ${
                        selectedFlights[1]?.departure ||
                        selectedFlights[1]?.departureAirport ||
                        selectedFlights[1]?.departureCity ||
                        ""
                      }`
                    : ""
                )
                .replace(
                  "{arrival}",
                  selectedFlights[selectedFlights.length - 1]?.arrival ||
                    selectedFlights[selectedFlights.length - 1]
                      ?.arrivalAirport ||
                    selectedFlights[selectedFlights.length - 1]?.arrivalCity ||
                    ""
                )
                .replace(
                  "{date}",
                  selectedFlights[0]?.date
                    ? new Date(
                        selectedFlights[0].date.split("T")[0]
                      ).toLocaleDateString(
                        t.lang === "en" ? "en-US" : "de-DE",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )
                    : selectedFlights[0]?.departureTime
                    ? new Date(
                        selectedFlights[0].departureTime.split(" ")[0]
                      ).toLocaleDateString(
                        t.lang === "en" ? "en-US" : "de-DE",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )
                    : ""
                )}
            />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleContinue();
            }}
            className="space-y-6"
          >
            <AccordionCard
              title={t.phases.agreement.digitalSignature.title}
              subtitle={t.phases.agreement.digitalSignature.subtitle}
              eyebrow={t.phases.agreement.step.replace("{number}", "1")}
              isCompleted={validationState.isSignatureValid}
              hasInteracted={hasInteractedWithSignature}
              className={accordionConfig.padding.wrapper}
              stepId="digital-signature"
              isOpenByDefault={!validationState.isSignatureValid}
              shouldStayOpen={false}
              summary={t.phases.agreement.digitalSignature.summary}
              isOpen={openSteps.includes("digital-signature")}
              onToggle={() => {
                setOpenSteps((prev) =>
                  prev.includes("digital-signature")
                    ? prev.filter((step) => step !== "digital-signature")
                    : [...prev, "digital-signature"]
                );
              }}
            >
              <div className={accordionConfig.padding.content}>
                <div>
                  <SignaturePad
                    ref={signatureRef}
                    onBegin={handleSignatureStart}
                    onChange={(data: string): void => {
                      handleSignatureChange(data);
                      setFormErrors(
                        (prev: FormErrors): FormErrors => ({
                          ...prev,
                          signature: [],
                        })
                      );
                    }}
                    onEnd={handleSignatureEnd}
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      className="text-sm text-gray-500 hover:text-gray-700"
                      onClick={clearSignature}
                    >
                      {t.phases.agreement.digitalSignature.clearSignature}
                    </button>
                  </div>
                  {formErrors.signature && formErrors.signature.length > 0 && (
                    <p className="mt-2 text-sm text-red-600">
                      {formErrors.signature[0]}
                    </p>
                  )}
                </div>
              </div>
            </AccordionCard>

            <AccordionCard
              title={t.phases.agreement.termsAndConditions.title}
              subtitle={t.phases.agreement.termsAndConditions.subtitle}
              eyebrow={t.phases.agreement.step.replace("{number}", "2")}
              isCompleted={validationState.stepValidation[2] || false}
              hasInteracted={Object.keys(formErrors).length > 0}
              className={accordionConfig.padding.wrapper}
              stepId="terms-and-conditions"
              isOpenByDefault={!validationState.stepValidation[2]}
              shouldStayOpen={false}
              summary={t.phases.agreement.termsAndConditions.summary}
              isOpen={openSteps.includes("terms-and-conditions")}
              onToggle={() => {
                setOpenSteps((prev) =>
                  prev.includes("terms-and-conditions")
                    ? prev.filter((step) => step !== "terms-and-conditions")
                    : [...prev, "terms-and-conditions"]
                );
              }}
            >
              <div className={accordionConfig.padding.content}>
                <div className="space-y-4">
                  <ConsentCheckbox
                    id="terms"
                    type="terms"
                    label={t.phases.agreement.termsAndConditions.terms}
                    checked={formData.hasAcceptedTerms}
                    onChange={handleTermsChange("hasAcceptedTerms")}
                    required
                  />
                  <ConsentCheckbox
                    id="privacy"
                    type="privacy"
                    label={t.phases.agreement.termsAndConditions.privacy}
                    checked={formData.hasAcceptedPrivacy}
                    onChange={handleTermsChange("hasAcceptedPrivacy")}
                    required
                  />
                  <ConsentCheckbox
                    id="marketing"
                    type="marketing"
                    label={t.phases.agreement.termsAndConditions.marketing}
                    checked={formData.hasAcceptedMarketing}
                    onChange={handleTermsChange("hasAcceptedMarketing")}
                    details={
                      t.phases.agreement.termsAndConditions.marketingDetails
                    }
                    required={false}
                  />
                </div>
              </div>
            </AccordionCard>

            <FormError errors={formErrors.submit} />
          </form>

          <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
            <BackButton
              onClick={handleBack}
              text={t.phases.agreement.navigation.back}
            />
            <ContinueButton
              onClick={handleContinue}
              disabled={!canSubmit() || isSubmitting}
              isLoading={isSubmitting}
              text={t.phases.agreement.submit}
            />
          </div>
        </main>
      </div>
    </PhaseGuard>
  );
}
