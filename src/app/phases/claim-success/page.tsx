"use client";

import React, { Suspense, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useStore } from "@/store";
import { useUniversalNavigation } from "@/utils/navigation";
import type {
  Store as GlobalAppStore,
  PassengerDetails,
  StoreState as GlobalStoreState,
} from "@/store/types";
import { ValidationPhase, ValidationState } from "@/types/shared/validation";
import { SpeechBubble } from "@/components/ui/display/SpeechBubble";
import { PhaseNavigation } from "@/components/shared/navigation/PhaseNavigation";
import { PhaseGuard } from "@/components/shared/PhaseGuard";
import { AccordionCard } from "@/components/shared/accordion/AccordionCard";
import { PersonalDetailsForm } from "@/components/shared/forms/PersonalDetailsForm";
import { accordionConfig } from "@/config/accordion";
import { pushToDataLayer } from "@/utils/gtm";
import { BackButton } from "@/components/ui/button/BackButton";
import { ContinueButton } from "@/components/ui/button/ContinueButton";
import { useTranslation } from "@/hooks/useTranslation";
import { ClaimService } from "@/services/claimService";
import { AccordionProvider } from "@/components/shared/accordion/AccordionContext";

const CLAIM_SUCCESS_PHASE_ENUM = ValidationPhase.CLAIM_SUCCESS;
// Assuming VALIDATION_PHASE_TO_PHASE is imported or defined in this scope
// For now, let's define it based on the PhaseGuard.tsx structure if not available
const VALIDATION_PHASE_TO_PHASE: Record<string, number | undefined> = {
  [ValidationPhase.INITIAL_ASSESSMENT]: 1,
  [ValidationPhase.COMPENSATION_ESTIMATE]: 2,
  [ValidationPhase.FLIGHT_DETAILS]: 3,
  [ValidationPhase.TRIP_EXPERIENCE]: 4,
  [ValidationPhase.CLAIM_SUCCESS]: 5,
  [ValidationPhase.AGREEMENT]: 6,
  [ValidationPhase.CLAIM_SUBMITTED]: 7,
  [ValidationPhase.CLAIM_REJECTED]: 8,
  [ValidationPhase.PERSONAL_DETAILS]: undefined,
  [ValidationPhase.TERMS_AND_CONDITIONS]: undefined,
  [ValidationPhase.SUMMARY]: undefined,
  [ValidationPhase.CONFIRMATION]: undefined,
  [ValidationPhase.INITIAL]: undefined,
  [ValidationPhase.EXPERIENCE]: undefined,
  [ValidationPhase.JOURNEY]: undefined,
  [ValidationPhase.FINAL]: undefined,
  [ValidationPhase.STEP_1]: undefined,
  [ValidationPhase.STEP_2]: undefined,
  [ValidationPhase.STEP_3]: undefined,
  [ValidationPhase.STEP_4]: undefined,
  [ValidationPhase.STEP_5]: undefined,
};

// Define ValidationStep type if not already available globally
// This should align with the type used in PhaseGuard
type ValidationStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const CLAIM_SUCCESS_PHASE_NUMERIC = VALIDATION_PHASE_TO_PHASE[
  CLAIM_SUCCESS_PHASE_ENUM
] as ValidationStep | undefined;

type ExtendedStore = GlobalAppStore & {
  provisionPercentage?: number;
  isStepValid?: boolean;
  personalDetails: any | null;
  compensationAmount: number | null;
  marketingAccepted: boolean;
  phasesCompletedViaContinue: ValidationPhase[];
  currentPhase: ValidationPhase;
  completedPhases: ValidationPhase[];
  completedSteps: ValidationPhase[];
  openSteps: ValidationPhase[];
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
  phase?: ValidationPhase;
  wizardAnswers?: any[];
  activeAccordion: number | null;
  initialAccordion: number | null;
};

function checkStepValidity(
  store: ExtendedStore,
  step: ValidationPhase
): boolean {
  return store.validationState?.stepValidation?.[step] ?? false;
}

function ClaimSuccessContent() {
  const retryTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const params = useParams();
  const lang = params?.lang?.toString() || "";
  const storeApi = useStore();
  const store = storeApi as unknown as ExtendedStore;

  const mountedRef = React.useRef(true);
  const initializedRef = React.useRef(false);
  const isUpdatingRef = React.useRef(false);

  const { t } = useTranslation();
  const { navigateToPhase } = useUniversalNavigation();

  // Helper function to format step text
  const formatStepText = (current: string, total: string) => {
    const template = t("phases.initialAssessment.stepProgress");
    // Check if the translation includes placeholders
    if (template.includes("{current}") && template.includes("{total}")) {
      return template.replace("{current}", current).replace("{total}", total);
    }
    // Fallback if the translation doesn't have placeholders
    return `${t("phases.initialAssessment.step")} ${current}/${total}`;
  };

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
  const [openSteps, setOpenSteps] = React.useState<ValidationPhase[]>([
    ValidationPhase.STEP_1,
  ]);
  const [interactedSteps, setInteractedSteps] = React.useState<
    ValidationPhase[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [storeReadyForInit, setStoreReadyForInit] = React.useState(false);

  useEffect(() => {
    const currentWizardAnswers = useStore.getState().wizard.answers;
    if (currentWizardAnswers) {
    }
  }, []);

  React.useEffect(() => {
    if (!mountedRef.current) return;

    const unsubscribe = useStore.subscribe((currentState, prevState) => {
      if (!mountedRef.current || initializedRef.current) {
        return;
      }

      const currentCore = currentState.core;
      const currentAllActions = currentState.actions;


      if (currentCore?.isInitialized && currentAllActions?.phase4) {
        setStoreReadyForInit(true);
        unsubscribe(); // Unsubscribe once ready
      }
    });

    // Initial check
    const initialCore = useStore.getState().core;
    const initialActions = useStore.getState().actions;
    if (initialCore?.isInitialized && initialActions?.phase4) {
      setStoreReadyForInit(true);
      unsubscribe(); // Unsubscribe if already ready
    } else if (initialCore?.isInitialized && !initialActions?.phase4) {
    }

    return () => {
      unsubscribe();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  // Second useEffect: Triggers initialization once store is marked as ready
  React.useEffect(() => {
    if (!storeReadyForInit || !mountedRef.current || initializedRef.current) {
      return;
    }


    const initializeState = async () => {
      if (!mountedRef.current) return;
      setIsLoading(true); // Set loading true at the start of actual initialization

      try {
        const {
          actions: { phase4: phase4Actions },
        } = useStore.getState();

        if (!phase4Actions) {
          console.error(
            "ClaimSuccessContent initializeState: phase4Actions critically not available!"
          );
          if (mountedRef.current) {
            setError("Critical store error. Cannot initialize claim details.");
            setIsLoading(false);
            initializedRef.current = true;
          }
          return;
        }

        const existingPersonalDetails = useStore.getState().user.details;

        let evaluationResponse;
        try {
          evaluationResponse = ClaimService.getLastEvaluationResponse();
        } catch (error) {
          console.error("Error getting evaluation response:", error);
          if (mountedRef.current) {
            setIsLoading(false);
            setError("Could not retrieve claim evaluation details.");
            initializedRef.current = true;
          }
          return;
        }

        if (!evaluationResponse) {
          if (mountedRef.current) {
            setIsLoading(false);
            setError("Your claim could not be processed at this time.");
            initializedRef.current = true;
          }
          return;
        }

        if (
          evaluationResponse.status !== "accept" ||
          !evaluationResponse.contract
        ) {
          if (mountedRef.current) {
            setIsLoading(false);
            setError("Your claim could not be processed at this time.");
            initializedRef.current = true;
          }
          return;
        }

        const { amount, provision } = evaluationResponse.contract;


        setClaimDetails((prev) => ({
          ...prev,
          amount: amount,
          provision: String(provision),
        }));

        if (typeof phase4Actions.setEvaluationResultContract === "function") {
          phase4Actions.setEvaluationResultContract(
            evaluationResponse.contract
          );
        } else {
          console.error(
            "setEvaluationResultContract action is not available on phase4Actions (even after checks).",
            { phase4Actions }
          );
          setError(
            "Failed to update claim details in the store. Please refresh or try again."
          );
          // Not setting initializedRef.current = true here as it's a critical store failure
        }

        const currentCoreStore = useStore.getState().core;
        const currentNavStore = useStore.getState().navigation;

        useStore.setState((s) => ({
          core: {
            ...currentCoreStore,
            _isClaimSuccess: true,
            _preventPhaseChange: true,
          },
          navigation: {
            ...currentNavStore,
            currentPhase: CLAIM_SUCCESS_PHASE_ENUM,
            completedPhases: Array.from(
              new Set([
                ...(s.navigation.completedPhases || []),
                ValidationPhase.STEP_1,
                ValidationPhase.STEP_2,
                ValidationPhase.STEP_3,
                ValidationPhase.STEP_4,
                CLAIM_SUCCESS_PHASE_ENUM,
              ])
            ),
            phasesCompletedViaContinue: Array.from(
              new Set([
                ...(s.navigation.phasesCompletedViaContinue || []),
                ValidationPhase.STEP_1,
                ValidationPhase.STEP_2,
                ValidationPhase.STEP_3,
                ValidationPhase.STEP_4,
              ] as ValidationPhase[])
            ) as any,
          },
          user: { ...s.user, details: existingPersonalDetails },
        }));

        if (mountedRef.current) {
          setClaimDetails({
            amount,
            currency: "EUR",
            provision: provision?.toString() || "",
            bookingReference:
              evaluationResponse.journey_booked_flightids?.[0]?.toString() ||
              "",
            departureAirport: "",
            arrivalAirport: "",
            scheduledDepartureTime: "",
          });
          setIsLoading(false);
          initializedRef.current = true;
        }
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

    initializeState();
  }, [storeReadyForInit]); // Runs when storeReadyForInit changes

  React.useEffect(() => {
    const compensationAmountFromStore =
      useStore.getState().phase4?.evaluationResultContract?.amount;

    if (
      compensationAmountFromStore !== undefined &&
      compensationAmountFromStore !== claimDetails.amount
    ) {
      setClaimDetails((prev) => ({
        ...prev,
        amount: compensationAmountFromStore,
      }));
    }
  }, [claimDetails.amount]);

  const lastProcessedDetailsRef = useRef<string>("");
  const lastHubSpotCallRef = useRef<number>(0);

  const handlePersonalDetailsComplete = useCallback(
    (details: any | null) => {
      if (!details || isUpdatingRef.current) {
        return;
      }

      // Prevent redundant calls by checking if details actually changed
      const detailsHash = JSON.stringify(details);
      if (lastProcessedDetailsRef.current === detailsHash) {
        // Skipping - same details already processed
        return;
      }

      try {
        isUpdatingRef.current = true;
        lastProcessedDetailsRef.current = detailsHash;
        const storeActions = useStore.getState().actions;


        const currentDetailsInStore = useStore.getState().user.details;
        if (JSON.stringify(currentDetailsInStore) === JSON.stringify(details)) {
        }

        // For claim success page, ensure address fields are required
        const requiredFields = [
          "salutation",
          "firstName",
          "lastName",
          "email",
          "phone",
        ] as const;

        // Address fields are required in claim success page
        const requiredAddressFields = [
          "address.street",
          "address.postalCode",
          "address.city",
          "address.country",
        ];

        let isValid = true;
        const fieldErrorsUpdate: Record<string, string> = {};

        // Validate basic fields
        requiredFields.forEach((field) => {
          const value = details[field]?.toString().trim();
          if (field === "phone" && (!value || value.length === 0)) {
            // Phone is optional
          } else if (!value || value.length === 0) {
            isValid = false;
            fieldErrorsUpdate[field] = "This field is required";
          }
        });

        // Validate address fields specifically for claim success page
        requiredAddressFields.forEach((fieldPath) => {
          // Extract field name for error reporting (e.g., "address.street" -> "street")
          const fieldName = fieldPath.split(".").pop() || fieldPath;

          // Get nested value from the details object
          const value = fieldPath
            .split(".")
            .reduce((obj, key) => {
              return obj && obj[key] !== undefined ? obj[key] : null;
            }, details as any)
            ?.toString()
            .trim();


          if (!value || value.length === 0) {
            isValid = false;
            fieldErrorsUpdate[fieldName] = "This field is required";
          }
        });

        const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
        const isEmailValid = emailRegex.test(details.email?.trim() || "");
        if (!isEmailValid) {
          isValid = false;
          if (details.email?.trim()) {
            fieldErrorsUpdate.email = "Please enter a valid email address";
          } else if (!fieldErrorsUpdate.email) {
            fieldErrorsUpdate.email = "This field is required";
          }
        }

        // Store the details regardless of validation result
        storeActions.user.setUserDetails(details);

        // Update validation state
        storeActions.validation.resetValidation();
        Object.entries(fieldErrorsUpdate).forEach(([field, error]) => {
          storeActions.validation.addFieldError(field, error);
        });

        storeActions.validation.setStepValidation(
          ValidationPhase.STEP_1,
          isValid && isEmailValid
        );
        storeActions.validation.setStepInteraction(
          ValidationPhase.STEP_1,
          true
        );

        if (!interactedSteps.includes(ValidationPhase.STEP_1)) {
          setInteractedSteps((prev) => [...prev, ValidationPhase.STEP_1]);
        }


        if (isValid && isEmailValid) {
          const contactId = sessionStorage.getItem("hubspot_contact_id");

          if (contactId) {
            // Rate limiting: Only call HubSpot API every 2 seconds
            const now = Date.now();
            const timeSinceLastCall = now - lastHubSpotCallRef.current;
            const MIN_INTERVAL = 2000; // 2 seconds

            if (timeSinceLastCall < MIN_INTERVAL) {
            } else {
              lastHubSpotCallRef.current = now;

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
                  arbeitsrecht_marketing_status:
                    useStore.getState().user.consents.marketing,
                }),
              })
                .then((response) => response.json())
                .then((data) => {
                })
                .catch((error) => {
                  console.error("Error updating HubSpot contact:", error);
                });
            }
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

  const handleContinue = async () => {
    setIsLoading(true);
    setError("");
    const storeActions = useStore.getState().actions;
    const currentStoreState = useStore.getState();

    try {
      let evaluationResponse = ClaimService.getLastEvaluationResponse();
      if (!evaluationResponse) {
        const currentCompensation =
          currentStoreState.phase4?.evaluationResultContract?.amount || 0;
        evaluationResponse = {
          status: "accept" as const,
          contract: { amount: currentCompensation, provision: 0 },
          journey_booked_flightids: [],
          journey_fact_flightids: [],
          information_received_at: new Date().toISOString(),
          journey_fact_type: "none" as const,
        };
        ClaimService.setStoredEvaluationResponse(evaluationResponse);
      }

      const phasesToComplete: ValidationPhase[] = [
        ValidationPhase.INITIAL_ASSESSMENT,
        ValidationPhase.COMPENSATION_ESTIMATE,
        ValidationPhase.FLIGHT_DETAILS,
        ValidationPhase.TRIP_EXPERIENCE,
        ValidationPhase.CLAIM_SUCCESS,
      ];

      phasesToComplete.forEach((phase) => {
        storeActions.navigation.addCompletedPhase(phase);
      });

      storeActions.navigation.setCurrentPhase(ValidationPhase.AGREEMENT);
      useStore.setState((s) => ({ core: { ...s.core, isClaimSuccess: true } }));

      // Use universal navigation for language-aware navigation
      navigateToPhase(ValidationPhase.AGREEMENT);
    } catch (err) {
      console.error("Error in continue handler (Zustand):", err);
      setError(
        "An error occurred while navigating to the agreement page. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const compensationAmountFromStore =
      useStore.getState().phase4?.evaluationResultContract?.amount;
    const provisionForDataLayer =
      typeof compensationAmountFromStore === "number"
        ? compensationAmountFromStore
        : undefined;
    pushToDataLayer({
      step_position: 4,
      dlv_provision: provisionForDataLayer,
    });
  }, []);

  // Set isClaimSuccess for consistent usage in validation
  const isClaimSuccess = true;

  const isPersonalDetailsStepValid = useStore((s) => {
    // For claim success page, we need all fields including address information
    if (s.user.details) {
      const details = s.user.details;

      // Basic required fields
      const hasBasicFields = !!(
        details.firstName?.trim() &&
        details.lastName?.trim() &&
        details.email?.trim() &&
        details.salutation?.trim()
      );

      // Address fields - all required for claim success
      const hasAddressFields = !!(
        details.address?.street?.trim() &&
        details.address?.postalCode?.trim() &&
        details.address?.city?.trim() &&
        details.address?.country?.trim()
      );

      // Phone is also required for claim success
      const hasPhone = !!details.phone?.trim();

      const hasAllRequiredFields =
        hasBasicFields && hasAddressFields && hasPhone;

      return hasAllRequiredFields;
    }

    return false;
  });
  const hasPersonalDetailsInteracted = useStore(
    (s) => s.validation.stepInteraction?.[ValidationPhase.STEP_1] ?? false
  );

  return (
    <main className="flex-grow max-w-3xl mx-auto px-4 pt-8 pb-24">
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F54538]"></div>
        </div>
      ) : error ? (
        <div className="mt-4 sm:mt-8 mb-8">
          <div className="w-full max-w-2xl mx-auto p-6 bg-[#FEF2F2] rounded-lg border border-[#F54538] text-center">
            <h1 className="text-2xl font-bold text-[#F54538] mb-6">
              {t("phases.claimSuccess.title")}
            </h1>
            <p className="text-[#991B1B] mb-8">{error}</p>
            <div className="flex justify-center">
              <button
                onClick={() => {
                  navigateToPhase(ValidationPhase.TRIP_EXPERIENCE);
                }}
                className="bg-[#F54538] text-white py-3 px-8 rounded hover:bg-[#E03F33] transition-colors"
              >
                {t("phases.claimSuccess.navigation.back")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 sm:mt-8 mb-8">
            <SpeechBubble message={t("phases.claimSuccess.speechBubble")} />
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t("phases.claimSuccess.summary.estimatedCompensation")}
              </h2>
              <div className="text-2xl font-bold text-[#F54538]">
                {formatAmount(claimDetails.amount, claimDetails.currency)}
              </div>
              <p className="text-gray-600 mt-2">
                {t("phases.claimSuccess.description")}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t("phases.claimSuccess.nextSteps.title")}
              </h2>
              <div className="text-left space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F54538] text-white flex items-center justify-center text-sm">
                    1
                  </div>
                  <p className="text-gray-700">
                    {t(
                      "phases.claimSuccess.nextSteps.steps.review.description"
                    )}
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F54538] text-white flex items-center justify-center text-sm">
                    2
                  </div>
                  <p className="text-gray-700">
                    {t(
                      "phases.claimSuccess.nextSteps.steps.airline.description"
                    )}
                  </p>
                </div>
              </div>
            </div>

            <AccordionCard
              title={t("phases.claimSuccess.nextSteps.steps.review.title")}
              eyebrow={formatStepText("1", "1")}
              summary={t(
                "phases.claimSuccess.nextSteps.steps.review.description"
              )}
              isCompleted={isPersonalDetailsStepValid}
              isValid={isPersonalDetailsStepValid}
              hasInteracted={hasPersonalDetailsInteracted}
              className={accordionConfig?.padding?.wrapper || "p-4"}
              shouldStayOpen={false}
              isOpenByDefault={true}
              isOpen={openSteps.includes(ValidationPhase.STEP_1)}
              stepId="personal-details"
              onToggle={() => {
                const isCurrentlyOpen = openSteps.includes(
                  ValidationPhase.STEP_1
                );
                if (!isCurrentlyOpen) {
                  setOpenSteps((prev) => [...prev, ValidationPhase.STEP_1]);
                } else {
                  setOpenSteps((prev) =>
                    prev.filter((id) => id !== ValidationPhase.STEP_1)
                  );
                }
              }}
            >
              <div className={accordionConfig?.padding?.content || "px-4 py-4"}>
                <PersonalDetailsForm
                  onComplete={handlePersonalDetailsComplete}
                  onInteract={() => {
                    if (!interactedSteps.includes(ValidationPhase.STEP_1)) {
                      setInteractedSteps((prev) => [
                        ...prev,
                        ValidationPhase.STEP_1,
                      ]);
                    }
                  }}
                  isClaimSuccess={true}
                  showAdditionalFields={true}
                />
              </div>
            </AccordionCard>
          </div>

          <div className="mt-12 pt-8 flex flex-col sm:flex-row justify-between gap-4">
            <ContinueButton
              onClick={handleContinue}
              disabled={!isPersonalDetailsStepValid}
              isLoading={isLoading}
              text={t("phases.claimSuccess.navigation.viewStatus")}
            />
            <BackButton
              useUniversalNav={true}
              navigateToPhase={ValidationPhase.TRIP_EXPERIENCE}
              text={t("phases.claimSuccess.navigation.back")}
            />
          </div>
        </>
      )}
    </main>
  );
}

export default function ClaimSuccessPage() {
  const { t } = useTranslation();

  if (CLAIM_SUCCESS_PHASE_NUMERIC === undefined) {
    console.error("Claim Success phase number is undefined. Check mapping.");
    return <div>Error: Phase configuration issue.</div>;
  }

  return (
    <AccordionProvider>
      <PhaseGuard phase={CLAIM_SUCCESS_PHASE_NUMERIC as ValidationStep}>
        <PhaseNavigation
          phase={CLAIM_SUCCESS_PHASE_ENUM}
          translations={{
            title: t("phases.claimSuccess.title"),
            description: t("phases.claimSuccess.description"),
          }}
        />
        <Suspense
          fallback={
            <div className="flex justify-center items-center h-64">
              <p>{t("common.loading")}</p>
            </div>
          }
        >
          <ClaimSuccessContent />
        </Suspense>
      </PhaseGuard>
    </AccordionProvider>
  );
}
