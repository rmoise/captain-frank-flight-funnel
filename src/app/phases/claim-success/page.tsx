"use client";

import React, { Suspense, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import useStore, { Store } from "@/lib/state/store";
import type { PassengerDetails } from "@/types/store";
import type {
  ValidationStep,
  ValidationState,
  StoreState,
} from "@/lib/state/types";
import { SpeechBubble } from "@/components/SpeechBubble";
import { PhaseNavigation } from "@/components/PhaseNavigation";
import { PhaseGuard } from "@/components/shared/PhaseGuard";
import { AccordionCard } from "@/components/shared/AccordionCard";
import { PersonalDetailsForm } from "@/components/forms/PersonalDetailsForm";
import { accordionConfig } from "@/config/accordion";
import { pushToDataLayer } from "@/utils/gtm";
import { BackButton } from "@/components/shared/BackButton";
import { ContinueButton } from "@/components/shared/ContinueButton";
import { useTranslation } from "@/hooks/useTranslation";
import { ClaimService } from "@/services/claimService";

const CLAIM_SUCCESS_PHASE = 5 as ValidationStep;

// Update store type to include new fields
type ExtendedStore = Store &
  StoreState & {
    provisionPercentage?: number;
    isStepValid?: boolean;
    personalDetails: PassengerDetails | null;
    compensationAmount: number | null;
    marketingAccepted: boolean;
    phasesCompletedViaContinue: number[];
    currentPhase: number;
    completedPhases: number[];
    completedSteps: number[];
    openSteps: number[];
    validationState: ValidationState;
    selectedDate: Date | null;
    _isClaimSuccess: boolean;
    _preventPhaseChange: boolean;
    _lastUpdate?: number;
    _lastPersist?: number;
    _lastPersistedState?: string;
    isLoading: boolean;
    _isRestoring: boolean;
    _isClaimRejected: boolean;
    bookingNumber: string;
    isTransitioningPhases: boolean;
    isInitializing: boolean;
    completedWizards: Record<string, boolean>;
    signature: string;
    hasSignature: boolean;
    phase?: number;
    wizardAnswers?: any[];
    activeAccordion: number | null;
    initialAccordion: number | null;
  };

// Helper function to check step validity
function checkStepValidity(
  store: ExtendedStore,
  step: ValidationStep
): boolean {
  return store.validationState?.stepValidation?.[step] ?? false;
}

// Helper function to cast numbers to ValidationStep
function asValidationStep(num: number): ValidationStep {
  return num as ValidationStep;
}

// Helper function to cast arrays to ValidationStep arrays
function asValidationSteps(nums: number[]): ValidationStep[] {
  return nums.map(asValidationStep);
}

function ClaimSuccessContent() {
  const router = useRouter();
  const params = useParams();
  const lang = params?.lang?.toString() || "";
  const storeBase = useStore();
  const store = {
    ...storeBase,
    activeAccordion: null,
    initialAccordion: null,
  } as ExtendedStore;
  const mountedRef = React.useRef(true);
  const initializedRef = React.useRef(false);
  const isUpdatingRef = React.useRef(false);

  const { completedPhases, compensationAmount, wizardAnswers } = store;

  const { t } = useTranslation();
  const [claimDetails, setClaimDetails] = React.useState({
    amount: 0,
    currency: "EUR",
    provision: "",
    bookingReference: "",
    departureAirport: "",
    arrivalAirport: "",
    scheduledDepartureTime: "",
  });
  const [error, setError] = React.useState<string | null>(null);
  const [openSteps, setOpenSteps] = React.useState<number[]>([1]);
  const [interactedSteps, setInteractedSteps] = React.useState<number[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Initialize answers from wizard answers
  useEffect(() => {
    if (wizardAnswers) {
    }
  }, [wizardAnswers]);

  // Initialize phase and claim details
  React.useEffect(() => {
    if (!mountedRef.current || initializedRef.current) {
      return;
    }

    const initializeState = async () => {
      try {
        // Try to load personal details from localStorage first
        let existingPersonalDetails = store.personalDetails;
        try {
          const savedState = localStorage.getItem("captain-frank-state");
          if (savedState) {
            const parsedState = JSON.parse(savedState);
            if (parsedState.state?.personalDetails) {
              existingPersonalDetails = parsedState.state.personalDetails;
              console.log(
                "Loaded personal details from localStorage:",
                existingPersonalDetails
              );
            }
          }
        } catch (error) {
          console.error(
            "Error loading personal details from localStorage:",
            error
          );
        }

        // Get evaluation result from ClaimService
        let evaluationResult;
        try {
          evaluationResult = ClaimService.getLastEvaluationResponse();
          console.log("Retrieved evaluation result:", evaluationResult);
        } catch (error) {
          console.error("Error getting evaluation response:", error);
          // Don't set error state, just set loading to false to let PhaseGuard handle unauthorized access
          if (mountedRef.current) {
            setIsLoading(false);
            initializedRef.current = true;
          }
          return;
        }

        // Check for null evaluation result first
        if (!evaluationResult) {
          console.log(
            "No evaluation result available - redirecting to trip experience"
          );
          if (mountedRef.current) {
            setIsLoading(false);
            initializedRef.current = true;
          }
          return;
        }

        // Now check for invalid evaluation result
        if (
          !evaluationResult.contract ||
          evaluationResult.status !== "accept"
        ) {
          console.log("Evaluation result is invalid or not accepted:", {
            hasContract: !!evaluationResult.contract,
            status: evaluationResult.status,
          });
          if (mountedRef.current) {
            setIsLoading(false);
            initializedRef.current = true;
          }
          return;
        }

        const { amount, provision } = evaluationResult.contract;

        // Check existing personal details validation
        const requiredFields = [
          "salutation",
          "firstName",
          "lastName",
          "email",
          "phone",
          "address",
          "postalCode",
          "city",
          "country",
        ];

        // Type guard to ensure existingPersonalDetails is not null
        const hasValidDetails = (
          details: PassengerDetails | null
        ): details is PassengerDetails => {
          return details !== null;
        };

        // Get typed details
        const details = hasValidDetails(existingPersonalDetails)
          ? existingPersonalDetails
          : null;

        // Validate all required fields are present and not empty
        const hasAllRequiredFields = details
          ? requiredFields.every((field) => {
              const value = details[field as keyof PassengerDetails];
              return typeof value === "string" && value.trim().length > 0;
            })
          : false;

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmailValid = details
          ? typeof details.email === "string" && emailRegex.test(details.email)
          : false;

        // Overall validation state
        const isPersonalValid = hasAllRequiredFields && isEmailValid;

        // Set initial state with proper validation
        const initialValidationState = {
          ...store.validationState,
          isFlightValid: true,
          isWizardValid: true,
          isTermsValid: store.validationState?.isTermsValid || false,
          isSignatureValid: store.validationState?.isSignatureValid || false,
          isPersonalValid: isPersonalValid,
          stepValidation: {
            ...store.validationState?.stepValidation,
            1: isPersonalValid,
            2: true,
            3: true,
            4: true,
            5: true,
          },
          stepInteraction: {
            ...store.validationState?.stepInteraction,
            1: details !== null,
          },
          fieldErrors: (() => {
            if (!isPersonalValid && details) {
              return requiredFields.reduce((errors, field) => {
                const value = details[field as keyof PassengerDetails];
                if (typeof value !== "string" || !value.trim()) {
                  errors[field] = `${field} is required`;
                }
                return errors;
              }, {} as Record<string, string>);
            }
            return {};
          })(),
          _timestamp: Date.now(),
        };

        // Set initial state
        useStore.setState({
          phase: CLAIM_SUCCESS_PHASE,
          currentPhase: CLAIM_SUCCESS_PHASE,
          _preventPhaseChange: true,
          _isClaimSuccess: true,
          compensationAmount: amount,
          provisionPercentage: provision,
          bookingReference:
            evaluationResult.journey_booked_flightids?.[0] || "",
          completedPhases: Array.from(
            new Set([...store.completedPhases, 1, 2, 3, 4, CLAIM_SUCCESS_PHASE])
          ),
          phasesCompletedViaContinue: Array.from(
            new Set([...store.phasesCompletedViaContinue, 1, 2, 3, 4])
          ),
          validationState: initialValidationState,
          personalDetails: details,
        } as Partial<ExtendedStore>);

        // Subscribe to store changes with update guard
        const unsubscribe = useStore.subscribe((state, prevState) => {
          // Cast state to ExtendedStore to access the properties we need
          const extendedState = state as unknown as ExtendedStore;

          if (
            !isUpdatingRef.current &&
            extendedState._isClaimSuccess &&
            extendedState.currentPhase !== CLAIM_SUCCESS_PHASE &&
            !extendedState._preventPhaseChange
          ) {
            try {
              isUpdatingRef.current = true;
              useStore.setState({
                phase: CLAIM_SUCCESS_PHASE,
                currentPhase: CLAIM_SUCCESS_PHASE,
                _preventPhaseChange: true,
                validationState: {
                  ...extendedState.validationState,
                  isPersonalValid:
                    extendedState.validationState?.isPersonalValid || false,
                  stepValidation: {
                    ...extendedState.validationState?.stepValidation,
                    1: extendedState.validationState?.isPersonalValid || false,
                  },
                  _timestamp: Date.now(),
                },
              } as Partial<ExtendedStore>);
            } finally {
              isUpdatingRef.current = false;
            }
          }
        });

        // Then update local state if component is still mounted
        if (mountedRef.current) {
          setClaimDetails({
            amount,
            currency: "EUR",
            provision: provision?.toString() || "",
            bookingReference:
              evaluationResult.journey_booked_flightids?.[0] || "",
            departureAirport: "",
            arrivalAirport: "",
            scheduledDepartureTime: "",
          });
          setIsLoading(false);
          initializedRef.current = true;
        }

        return () => {
          unsubscribe();
          if (mountedRef.current) {
            useStore.setState({
              _isClaimSuccess: false,
              _preventPhaseChange: false,
            } as Partial<ExtendedStore>);
          }
        };
      } catch (error) {
        console.error("Error initializing claim success page:", error);
        if (mountedRef.current) {
          setError(
            "Failed to initialize claim success page. Please try again."
          );
          setIsLoading(false);
          initializedRef.current = true;
        }
      }
    };

    // Initialize state immediately
    initializeState();

    return () => {
      mountedRef.current = false;
    };
  }, [lang, store.completedPhases, store.phasesCompletedViaContinue]);

  // Add debug logging
  React.useEffect(() => {
    console.log("Claim Success Page State:", {
      isLoading,
      error,
      claimDetails,
      storeState: {
        currentPhase: store.currentPhase,
        completedPhases: store.completedPhases,
        compensationAmount: store.compensationAmount,
        isStepValid: checkStepValidity(store, 1),
      },
    });
  }, [isLoading, error, claimDetails, store]);

  // Handle personal details updates
  const handlePersonalDetailsComplete = useCallback(
    (details: PassengerDetails | null) => {
      if (!details || isUpdatingRef.current) {
        return;
      }

      try {
        isUpdatingRef.current = true;

        // Get current state
        const currentState = useStore.getState() as ExtendedStore;
        const currentValidationState = (currentState.validationState ||
          {}) as ValidationState;

        // Debug log current state
        console.log("=== Personal Details Validation Start ===");
        console.log("Current details:", details);
        console.log("Current validation state:", currentValidationState);

        // Only update if the details have actually changed
        const currentDetails = currentState.personalDetails;
        if (JSON.stringify(currentDetails) === JSON.stringify(details)) {
          console.log("No changes detected in details, skipping update");
          return;
        }

        // Validate all required fields for claim success
        const requiredFields = [
          "salutation",
          "firstName",
          "lastName",
          "email",
          "phone",
          "address",
          "postalCode",
          "city",
          "country",
        ] as const;

        // Check each field individually and log its state
        const fieldValidation = requiredFields.map((field) => {
          const value = details[field]?.trim();
          const isValid = !!value;
          console.log(`Field ${field}: value="${value}", isValid=${isValid}`);
          return isValid;
        });

        // Check if all required fields are present and not empty
        const isValid = fieldValidation.every(Boolean);
        console.log("All fields valid:", isValid);

        // Email validation
        const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
        const isEmailValid = emailRegex.test(details.email?.trim() || "");
        console.log("Email validation:", {
          email: details.email,
          isEmailValid,
        });

        // Generate field errors
        const fieldErrors: Record<string, string> = {};
        requiredFields.forEach((field) => {
          if (!details[field]?.trim()) {
            fieldErrors[field] = "This field is required";
          }
        });

        if (!isEmailValid && details.email?.trim()) {
          fieldErrors.email = "Please enter a valid email address";
        }

        console.log("Field errors:", fieldErrors);

        // Final validation state
        const finalValidationState = {
          ...currentValidationState,
          isPersonalValid: isValid && isEmailValid,
          stepValidation: {
            ...currentValidationState.stepValidation,
            1: isValid && isEmailValid,
          },
          stepInteraction: {
            ...currentValidationState.stepInteraction,
            1: true,
          },
          1: isValid && isEmailValid,
          fieldErrors,
          _timestamp: Date.now(),
        };

        console.log("Final validation state:", finalValidationState);

        // Force validation state update
        useStore.setState({
          personalDetails: details,
          validationState: finalValidationState,
          _lastUpdate: Date.now(),
        });

        // Track step completion
        if (!interactedSteps.includes(1)) {
          setInteractedSteps([...interactedSteps, 1]);
        }

        console.log("=== Personal Details Validation End ===");

        // Update HubSpot contact if details are valid
        if (isValid && isEmailValid) {
          const contactId = sessionStorage.getItem("hubspot_contact_id");

          console.log("=== HubSpot Personal Details Update ===", {
            contactId,
            details,
            timestamp: new Date().toISOString(),
          });

          if (contactId) {
            fetch("/.netlify/functions/hubspot-integration/contact", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contactId,
                email: details.email,
                firstName: details.firstName,
                lastName: details.lastName,
                salutation: details.salutation,
                phone: details.phone || "",
                mobilephone: details.phone || "",
                address: details.address || "",
                city: details.city || "",
                postalCode: details.postalCode || "",
                country: details.country || "",
                arbeitsrecht_marketing_status: false,
              }),
            })
              .then((response) => response.json())
              .then((data) => {
                console.log("HubSpot update response:", data);
              })
              .catch((error) => {
                console.error("Error updating HubSpot contact:", error);
              });
          }
        }
      } finally {
        isUpdatingRef.current = false;
      }
    },
    [interactedSteps]
  );

  const formatAmount = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch (err) {
      return `${amount} ${currency}`;
    }
  };

  // Handle continue button click
  const handleContinue = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Ensure we have a valid evaluation response
      let evaluationResponse = ClaimService.getLastEvaluationResponse();

      // If no valid evaluation response exists, create a minimal valid one
      if (!evaluationResponse) {
        console.log(
          "No valid evaluation response found, creating a minimal one"
        );
        const minimalResponse = {
          status: "accept" as const,
          contract: {
            amount: compensationAmount || 0,
            provision: compensationAmount || 0,
          },
          journey_booked_flightids: [],
          journey_fact_flightids: [],
          information_received_at: new Date().toISOString(),
          journey_fact_type: "none" as const,
        };

        // Store the minimal response
        ClaimService.setStoredEvaluationResponse(minimalResponse);
        console.log(
          "Created and stored minimal evaluation response:",
          minimalResponse
        );
      }

      // Mark all previous phases as completed
      const completedPhases = useStore.getState().completedPhases || [];
      console.log("Current completed phases:", completedPhases);

      // Complete all phases up to 5
      for (let i = 1; i <= 5; i++) {
        const phase = asValidationStep(i);
        if (!completedPhases.includes(phase)) {
          useStore.getState().completePhase(phase);
        }
      }

      // After completing all phases, set currentPhase to 6 and ensure _isClaimSuccess is true
      console.log(
        "Setting currentPhase to 6 and ensuring _isClaimSuccess is true"
      );
      useStore.setState({
        currentPhase: asValidationStep(6),
        _isClaimSuccess: true,
      });

      // Update localStorage with completed phases
      const updatedCompletedPhases = [...completedPhases, 1, 2, 3, 4, 5];
      console.log("Updating completed phases:", updatedCompletedPhases);
      localStorage.setItem(
        "completedPhases",
        JSON.stringify(updatedCompletedPhases)
      );
      localStorage.setItem("currentPhase", "6");

      // Create URL with all necessary parameters
      const searchParams = new URLSearchParams();
      searchParams.set("bypass_phase_check", "true");
      searchParams.set("redirected", "true");
      searchParams.set("completed_phases", "1,2,3,4,5");
      searchParams.set("current_phase", "6");

      const nextUrl = `/${lang}/phases/agreement?${searchParams.toString()}`;
      console.log("Navigating to:", nextUrl);

      // Use replace instead of push to prevent history stack issues
      router.replace(nextUrl);
    } catch (err) {
      console.error("Error in continue handler:", err);
      setError(
        "An error occurred while navigating to the agreement page. Please try again."
      );
      setIsLoading(false);
    }
  };

  useEffect(() => {
    pushToDataLayer({
      step_position: 4,
      dlv_provision: compensationAmount,
    });
  }, [compensationAmount]);

  return (
    <PhaseGuard phase={5}>
      <PhaseNavigation currentPhase={5} completedPhases={completedPhases} />
      <main className="flex-grow max-w-3xl mx-auto px-4 pt-8 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F54538]"></div>
          </div>
        ) : error ? (
          <div className="mt-4 sm:mt-8 mb-8">
            <div className="w-full max-w-2xl mx-auto p-6 bg-[#FEF2F2] rounded-lg border border-[#F54538] text-center">
              <h1 className="text-2xl font-bold text-[#F54538] mb-6">
                {t.phases.claimSuccess.title}
              </h1>
              <p className="text-[#991B1B] mb-8">{error}</p>
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    useStore.setState({
                      currentPhase: asValidationStep(4),
                      _isClaimSuccess: false,
                      _preventPhaseChange: false,
                    } as Partial<ExtendedStore>);
                    router.push(`/${lang}/phases/trip-experience`);
                  }}
                  className="bg-[#F54538] text-white py-3 px-8 rounded hover:bg-[#E03F33] transition-colors"
                >
                  {t.phases.claimSuccess.navigation.back}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 sm:mt-8 mb-8">
              <SpeechBubble message={t.phases.claimSuccess.speechBubble} />
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">
                  {t.phases.claimSuccess.summary.estimatedCompensation}
                </h2>
                <div className="text-2xl font-bold text-[#F54538]">
                  {formatAmount(claimDetails.amount, claimDetails.currency)}
                </div>
                <p className="text-gray-600 mt-2">
                  {t.phases.claimSuccess.description}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">
                  {t.phases.claimSuccess.nextSteps.title}
                </h2>
                <div className="text-left space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F54538] text-white flex items-center justify-center text-sm">
                      1
                    </div>
                    <p className="text-gray-700">
                      {t.phases.claimSuccess.nextSteps.steps.review.description}
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F54538] text-white flex items-center justify-center text-sm">
                      2
                    </div>
                    <p className="text-gray-700">
                      {
                        t.phases.claimSuccess.nextSteps.steps.airline
                          .description
                      }
                    </p>
                  </div>
                </div>
              </div>

              <AccordionCard
                title={t.phases.claimSuccess.nextSteps.steps.review.title}
                eyebrow={t.phases.initialAssessment.step.replace(
                  "{number}",
                  "1"
                )}
                summary={
                  t.phases.claimSuccess.nextSteps.steps.review.description
                }
                isCompleted={checkStepValidity(store, 1)}
                hasInteracted={interactedSteps.includes(1)}
                className={accordionConfig?.padding?.wrapper || "p-4"}
                shouldStayOpen={false}
                isOpenByDefault={true}
                isOpen={openSteps.includes(1)}
                stepId="personal-details"
                onToggle={() => {
                  const isCurrentlyOpen = openSteps.includes(1);
                  if (!isCurrentlyOpen) {
                    setOpenSteps((prev) => [...prev, 1]);
                  } else {
                    setOpenSteps((prev) => prev.filter((id) => id !== 1));
                  }
                }}
              >
                <div
                  className={accordionConfig?.padding?.content || "px-4 py-4"}
                >
                  <PersonalDetailsForm
                    onComplete={handlePersonalDetailsComplete}
                    onInteract={() => {
                      if (!interactedSteps.includes(1)) {
                        setInteractedSteps((prev) => [...prev, 1]);
                      }
                    }}
                    isClaimSuccess={true}
                    showAdditionalFields={true}
                  />
                </div>
              </AccordionCard>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
              <BackButton
                onClick={() => {
                  // Make sure we save the phase 4 completion status before navigating back
                  try {
                    // Mark phase 4 as explicitly completed in localStorage
                    localStorage.setItem("phase4_explicitlyCompleted", "true");

                    // Ensure phase 4 is included in completed phases
                    const completedPhases = store.completedPhases || [];
                    if (!completedPhases.includes(4)) {
                      completedPhases.push(4);
                      localStorage.setItem(
                        "completedPhases",
                        JSON.stringify(completedPhases)
                      );
                    }

                    // Ensure phase 4 is included in phasesCompletedViaContinue
                    const phasesCompletedViaContinue =
                      store.phasesCompletedViaContinue || [];
                    if (!phasesCompletedViaContinue.includes(4)) {
                      phasesCompletedViaContinue.push(4);
                      localStorage.setItem(
                        "phasesCompletedViaContinue",
                        JSON.stringify(phasesCompletedViaContinue)
                      );
                    }

                    console.log(
                      "=== Claim Success - Back to Trip Experience ===",
                      {
                        completedPhases,
                        phasesCompletedViaContinue,
                        timestamp: new Date().toISOString(),
                      }
                    );
                  } catch (e) {
                    console.error("Error saving phase completion state", e);
                  }

                  // Update store state
                  useStore.setState({
                    currentPhase: asValidationStep(4),
                    _isClaimSuccess: false,
                    _preventPhaseChange: false,
                    completedPhases: store.completedPhases.includes(4)
                      ? store.completedPhases
                      : [...store.completedPhases, 4],
                    phasesCompletedViaContinue:
                      store.phasesCompletedViaContinue.includes(4)
                        ? store.phasesCompletedViaContinue
                        : [...store.phasesCompletedViaContinue, 4],
                  } as Partial<ExtendedStore>);

                  router.push(`/${lang}/phases/trip-experience`);
                }}
                text={t.phases.claimSuccess.navigation.back}
              />
              <ContinueButton
                onClick={handleContinue}
                disabled={!checkStepValidity(store, 1)}
                text={t.phases.claimSuccess.navigation.viewStatus}
              />
            </div>
          </>
        )}
      </main>
    </PhaseGuard>
  );
}

export default function ClaimSuccessPage() {
  return (
    <PhaseGuard phase={5}>
      <div className="min-h-screen bg-[#f5f7fa]">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F54538]"></div>
            </div>
          }
        >
          <ClaimSuccessContent />
        </Suspense>
      </div>
    </PhaseGuard>
  );
}
