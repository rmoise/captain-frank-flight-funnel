"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import useStore from "@/store";
import { ValidationPhase } from "@/types/shared/validation";
import { AccordionCardClient } from "@/components/shared/accordion/AccordionCardClient";
import { PersonalDetailsForm } from "@/components/shared/forms/PersonalDetailsForm";
import { ConsentCheckbox } from "@/components/shared/forms/ConsentCheckbox";
import type { ConsentType } from "@/types/shared/forms";
import type { PassengerDetails } from "@/types/shared/user";
import { ModularFlightSelector } from "@/components/shared/ModularFlightSelector";
import { BackButton } from "@/components/ui/button/BackButton";
import { ContinueButton } from "@/components/ui/button/ContinueButton";
import { Phase1QAWizard } from "@/components/shared/wizard/Phase1QAWizard";
import { getInitialAssessmentQuestions } from "@/components/shared/wizard/Phase1QAWizard/initialAssessmentQuestions";
import { Success } from "@/components/shared/wizard/Success";
import { Translations } from "@/translations/types";
import { SpeechBubble } from "@/components/ui/display/SpeechBubble";
import { PhaseNavigation } from "@/components/shared/navigation/PhaseNavigation";
import React from "react";
import { heebo } from "@/fonts"; // Import the font
import { AccordionProvider } from "@/components/shared/accordion/AccordionContext";

// Define a compatible type to match the ExtendedPassengerDetails in the form
interface ExtendedPassengerDetails extends PassengerDetails {
  salutation: string;
}

const createTranslationsAdapter = (t: any): Translations =>
  ({
    lang: "de", // Set German as default language
    common: {
      next: t("common.next"),
      back: t("common.back"),
      submit: t("common.submit"),
      cancel: t("common.cancel"),
      continue: t("common.continue"),
      loading: t("common.loading"),
      error: t("common.error"),
      success: t("common.success"),
      dateFormat: t("common.dateFormat"),
      enterAmount: t("common.enterAmount"),
      noResults: t("common.noResults"),
      required: t("common.required"),
      enterMinChars: t("common.enterMinChars"),
      finish: t("common.finish"),
    },
    wizard: {
      questions: {
        issueType: {
          text: t("wizard.questions.issueType.text"),
          options: {
            delay: t("wizard.questions.issueType.options.delay"),
            cancel: t("wizard.questions.issueType.options.cancel"),
            missed: t("wizard.questions.issueType.options.missed"),
            other: t("wizard.questions.issueType.options.other"),
          },
        },
        delayDuration: {
          text: t("wizard.questions.delayDuration.text"),
          options: {
            lessThan2: t("wizard.questions.delayDuration.options.lessThan2"),
            between2And3: t(
              "wizard.questions.delayDuration.options.between2And3"
            ),
            moreThan3: t("wizard.questions.delayDuration.options.moreThan3"),
          },
        },
        cancellationNotice: {
          text: t("wizard.questions.cancellationNotice.text"),
          options: {
            notAtAll: t("wizard.questions.cancellationNotice.options.notAtAll"),
            zeroToSeven: t("wizard.questions.cancellationNotice.options.zeroToSeven"),
            eightToFourteen: t("wizard.questions.cancellationNotice.options.eightToFourteen"),
            moreThanFourteen: t("wizard.questions.cancellationNotice.options.moreThanFourteen"),
          },
        },
        missedCosts: {
          text: t("wizard.questions.missedCosts.text"),
          options: {
            yes: t("wizard.questions.missedCosts.options.yes"),
            no: t("wizard.questions.missedCosts.options.no"),
          },
        },
        missedCostsAmount: {
          text: t("wizard.questions.missedCostsAmount.text"),
        },
        alternativeFlightAirline: {
          text: t("wizard.questions.alternativeFlightAirline.text"),
          options: {
            yes: t("wizard.questions.alternativeFlightAirline.options.yes"),
            no: t("wizard.questions.alternativeFlightAirline.options.no"),
          },
        },
        alternativeFlightOwn: {
          text: t("wizard.questions.alternativeFlightOwn.text"),
          options: {
            yes: t("wizard.questions.alternativeFlightOwn.options.yes"),
            no: t("wizard.questions.alternativeFlightOwn.options.no"),
          },
        },
        refundStatus: {
          text: t("wizard.questions.refundStatus.text"),
          options: {
            yes: t("wizard.questions.refundStatus.options.yes"),
            no: t("wizard.questions.refundStatus.options.no"),
          },
        },
      },
      success: {
        answersSaved: t("wizard.success.answersSaved"),
      },
    },
    // Add other required translation fields as needed
  } as Translations);

// Helper function to format step text
const formatStepText = (t: any, current: string, total: string) => {
  const template = t("phases.initialAssessment.stepProgress");
  if (template.includes("{current}") && template.includes("{total}")) {
    return template.replace("{current}", current).replace("{total}", total);
  }
  // Fallback if the translation doesn't have placeholders
  const step = t("phases.initialAssessment.step");
  return `${step} ${current}/${total}`;
};

const InitialAssessmentPage = () => {
  console.log(
    "[InitialAssessmentPage] Component rendering, Font variable:",
    heebo.variable
  ); // Log font variable
  const { t } = useTranslation();
  const adaptedT = useMemo(() => createTranslationsAdapter(t), [t]);
  const router = useRouter();

  // --- State declarations FIRST ---
  const [isLoading, setIsLoading] = useState(false);
  const [
    hasInteractedWithPersonalDetails,
    setHasInteractedWithPersonalDetails,
  ] = useState(false);
  const [hasInteractedWithTerms, setHasInteractedWithTerms] = useState(false);
  const [hasInteractedWithFlight, setHasInteractedWithFlight] = useState(false);
  const [hasInteractedWithQA, setHasInteractedWithQA] = useState(false);
  // showQASuccess removed - Phase1QAWizard now handles its own completion state
  const [wizardConfettiStatus, setWizardConfettiStatus] = useState(false);
  // Remove redundant local state and use Zustand directly
  // --------------------------------

  // --- Select validation state reactively using useStore ---
  const storeCoreInitialized = useStore((state) => state.core.isInitialized);
  const isStep1Valid = useStore(
    (state) =>
      state.validation.stepValidation?.[ValidationPhase.INITIAL_ASSESSMENT] ===
      true
  );
  const isStep2Complete = useStore((state) => state.wizard.isComplete === true);

  // Use the validation state from the store for Personal Details step completion
  const isStep3Complete = useStore(
    (state) =>
      state.validation.stepValidation?.[ValidationPhase.PERSONAL_DETAILS] ===
        true &&
      // Also ensure that the essential details are actually present,
      // as validation might be true from a previous state with different data.
      !!(
        state.user.details &&
        state.user.details.salutation &&
        state.user.details.firstName &&
        state.user.details.lastName &&
        state.user.details.email
      )
  );

  // Access consent data from Zustand directly
  const {
    terms: termsAccepted,
    privacy: privacyAccepted,
    marketing: marketingAccepted,
  } = useStore((state) => state.user.consents);
  const isStep4Complete = termsAccepted && privacyAccepted;
  // -------------------------------------------------------

  const questionsRef = useRef<any>(null);

  // Memoize the questions for Phase1QAWizard
  const wizardQuestions = useMemo(
    () => getInitialAssessmentQuestions(adaptedT),
    [adaptedT]
  );

  // Add a ref for the PersonalDetailsForm to allow triggering validation
  const personalDetailsFormRef = useRef<{
    validate: () => boolean;
  }>(null!);

  useEffect(() => {
    console.log(
      "[InitialAssessmentPage] Component mounted, Font variable:",
      heebo.variable
    ); // Log font variable

    if (!storeCoreInitialized) {
      console.log(
        "[InitialAssessmentPage] Store core not initialized yet, skipping effect logic."
      );
      return;
    }

    const wizardComplete = useStore.getState().wizard.isComplete;
    if (hasInteractedWithQA && !wizardComplete) {
      console.log(
        "[InitialAssessmentPage] Skipping state restoration during reset"
      );
      return;
    }

    // Remove the duplicate wizard completion check since Phase1QAWizard
    // now handles its own completion state internally
    const storeState = useStore.getState();
    if (storeState?.wizard) {
      const wizardState = storeState.wizard;
      
      if (wizardState.isComplete === true) {
        console.log(
          "[InitialAssessmentPage] Wizard is complete, letting Phase1QAWizard handle completion display"
        );
        setHasInteractedWithQA(true);

        // Access setStepCompleted via store actions
        const storeActions = useStore.getState().actions;
        if (storeActions?.validation?.setStepCompleted) {
          storeActions.validation.setStepCompleted(
            ValidationPhase.INITIAL_ASSESSMENT,
            true
          );
          storeActions.validation.setStepCompleted(
            "STEP_1" as ValidationPhase,
            true
          );
        } else {
          console.warn(
            "setStepCompleted not found on store actions during init"
          );
        }
      } else {
        console.log(
          "[InitialAssessmentPage] Wizard not complete, not updating validation."
        );
      }
    } else {
      console.log(
        "[InitialAssessmentPage] Wizard state not found in store during init."
      );
    }
  }, [adaptedT, hasInteractedWithQA, storeCoreInitialized]);


  useEffect(() => {
    console.log("==========================================");
    console.log("WIZARD DEBUGGING INFO, Font variable:", heebo.variable); // Log font variable
    console.log("Questions:", getInitialAssessmentQuestions(adaptedT));
    const currentStoreState = useStore.getState();
    console.log("Store state:", currentStoreState);

    console.log("VALIDATION STATUS CHECK:");
    console.log("- Flight segments:", currentStoreState.flight?.segments);
    console.log(
      "- ValidationPhase in store:",
      currentStoreState.validation?.stepValidation
    );
    console.log(
      "- Has valid locations:",
      currentStoreState.flight?.segments?.some(
        (segment) => segment.origin?.code && segment.destination?.code
      )
    );
    console.log("==========================================");

    questionsRef.current = getInitialAssessmentQuestions(adaptedT);
  }, [adaptedT]);

  // Add logging to diagnose performance
  useEffect(() => {
    console.log(
      "[InitialAssessmentPage] Component mounted, Font variable:",
      heebo.variable
    ); // Log font variable

    // Cleanup on unmount
    return () => {
      console.log(
        "[InitialAssessmentPage] Component unmounting, Font variable:",
        heebo.variable
      ); // Log font variable
    };
  }, []);

  if (!adaptedT) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const handleSubmit = (details: ExtendedPassengerDetails | null) => {
    if (details) {
      console.log("PARENT DEBUG - handleSubmit called with valid details", {
        details,
        hasAllRequiredFields:
          details.salutation &&
          details.firstName &&
          details.lastName &&
          details.email,
      });

      useStore.getState().actions.user.setUserDetails(details);

      // Force update the local state to trigger UI update
      const isValid =
        !!details.salutation &&
        !!details.firstName &&
        !!details.lastName &&
        !!details.email;
      if (isValid) {
        console.log("PARENT DEBUG - Setting isStep3Complete to true");
        // Verify the state got updated
        setTimeout(() => {
          console.log("PARENT DEBUG - Current store state:", {
            isComplete: !!useStore.getState().user.details,
            validationState: useStore.getState().validation,
          });
        }, 50);
      }
    } else {
      console.log("PARENT DEBUG - handleSubmit called with null details");
    }
  };

  const canContinue = () => {
    return (
      isStep1Valid &&
      isStep2Complete &&
      isStep3Complete &&
      termsAccepted &&
      privacyAccepted
    );
  };

  const handleContinue = async () => {
    // Before proceeding, explicitly validate the personal details form
    if (personalDetailsFormRef.current) {
      console.log("Explicitly triggering validation on personal details form");
      const isValid = personalDetailsFormRef.current.validate();
      if (!isValid) {
        console.log("Personal details form validation failed");

        // Show error feedback - expand the form accordion and scroll to it
        const personalDetailsSection =
          document.querySelector('[data-step="3"]');
        if (personalDetailsSection) {
          // Expand the accordion if not already expanded
          const accordionButton =
            personalDetailsSection.querySelector("button");
          if (
            accordionButton &&
            accordionButton.getAttribute("aria-expanded") === "false"
          ) {
            accordionButton.click();
          }

          // Scroll to the form
          personalDetailsSection.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

          // Set focus to first empty required field
          setTimeout(() => {
            const firstEmptyField =
              personalDetailsSection.querySelector("input:invalid");
            if (firstEmptyField) {
              (firstEmptyField as HTMLElement).focus();
            }
          }, 500);
        }

        return;
      }
    }

    setIsLoading(true);

    try {
      // Update phase completion status using Zustand store
      const storeActions = useStore.getState().actions;

      // If we have navigation actions, update the phase status
      if (storeActions?.navigation) {
        // Mark phase 1 as completed
        if (storeActions.navigation.addCompletedPhase) {
          storeActions.navigation.addCompletedPhase(
            ValidationPhase.INITIAL_ASSESSMENT
          );
          console.log("Added INITIAL_ASSESSMENT to completedPhases");
        }

        // Mark phase 1 as completed via the continue button
        if (storeActions.navigation.addPhaseCompletedViaContinue) {
          storeActions.navigation.addPhaseCompletedViaContinue(1);
          console.log("Added phase 1 to phasesCompletedViaContinue");
        }

        // Set current phase to the next phase
        if (storeActions.navigation.setCurrentPhase) {
          storeActions.navigation.setCurrentPhase(
            ValidationPhase.COMPENSATION_ESTIMATE
          );
          console.log("Set current phase to COMPENSATION_ESTIMATE");
        }
      } else {
        console.warn("Navigation actions not available in store");
      }

      // Get data from the store for HubSpot integration
      const userDetails = useStore.getState().user.details;
      const marketingAccepted = useStore.getState().user.consents.marketing;

      // Create HubSpot contact and deal if we have personal details
      if (userDetails && userDetails.email) {
        try {
          console.log("Creating HubSpot contact:", {
            email: userDetails.email,
            personalDetails: userDetails,
            bookingNumber: sessionStorage.getItem("booking_number") || "",
            timestamp: new Date().toISOString(),
          });

          // Create initial contact in HubSpot
          const hubspotResponse = await fetch(
            "/.netlify/functions/hubspot-integration/contact",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: userDetails.email,
                firstName: userDetails.firstName,
                lastName: userDetails.lastName,
                arbeitsrecht_marketing_status: marketingAccepted,
              }),
            }
          );

          if (!hubspotResponse.ok) {
            const errorText = await hubspotResponse.text();
            console.error("Failed to create HubSpot contact:", errorText);
            throw new Error(`Failed to create HubSpot contact: ${errorText}`);
          }

          const hubspotResult = await hubspotResponse.json();
          console.log("HubSpot contact created:", hubspotResult);
          sessionStorage.setItem(
            "hubspot_contact_id",
            hubspotResult.hubspotContactId
          );

          // Create initial deal in HubSpot
          console.log("Creating HubSpot deal:", {
            contactId: hubspotResult.hubspotContactId,
            selectedFlights: useStore.getState().flight.selectedFlights,
            timestamp: new Date().toISOString(),
          });

          const dealResponse = await fetch(
            "/.netlify/functions/hubspot-integration/deal",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contactId: hubspotResult.hubspotContactId,
                personalDetails: {
                  firstName: userDetails.firstName,
                  lastName: userDetails.lastName,
                  email: userDetails.email,
                },
                stage: "initial_assessment",
                status: "New Submission",
                marketingStatus: marketingAccepted,
              }),
            }
          );

          if (!dealResponse.ok) {
            const errorText = await dealResponse.text();
            console.error("Failed to create HubSpot deal:", errorText);
            throw new Error(`Failed to create HubSpot deal: ${errorText}`);
          }

          const dealResult = await dealResponse.json();
          console.log("HubSpot deal created:", dealResult);
          sessionStorage.setItem("hubspot_deal_id", dealResult.hubspotDealId);
        } catch (error) {
          console.error("Error creating HubSpot records:", error);
          // Continue with the process even if HubSpot integration fails
        }
      }

      // Navigate to the next page after HubSpot integration (or if it fails)
      router.push("/phases/compensation-estimate");
    } catch (error) {
      console.error("Error navigating to next phase:", error);
    } finally {
      setIsLoading(false);
    }
  };


  const handleQAComplete = (shouldShowConfetti: boolean) => {
    console.log("Phase 1 QA Completed! Confetti status:", shouldShowConfetti);
    setHasInteractedWithQA(true);
    setWizardConfettiStatus(shouldShowConfetti);

    try {
      const currentStore = useStore.getState();
      if (
        currentStore.actions?.validation &&
        typeof currentStore.actions.validation.setStepValidation === "function"
      ) {
        // Update validation states for all relevant phase formats
        const phases = [
          ValidationPhase.INITIAL_ASSESSMENT,
          "STEP_1" as ValidationPhase,
          "STEP_2" as ValidationPhase,
        ];

        // Mark all phases as valid and completed
        phases.forEach((phase) => {
          currentStore.actions.validation.setStepValidation(phase, true);

          if (
            typeof currentStore.actions.validation.setStepCompleted ===
            "function"
          ) {
            currentStore.actions.validation.setStepCompleted(phase, true);
          }

          if (
            typeof currentStore.actions.validation.setStepInteraction ===
            "function"
          ) {
            currentStore.actions.validation.setStepInteraction(phase, true);
          }
        });

        console.log(
          "[InitialAssessmentPage] Updated validation state for all phases"
        );

        // Force a local storage update to ensure persistence
        try {
          const localStorageKey = "captain-frank-store";
          const currentStorage = localStorage.getItem(localStorageKey);

          if (currentStorage) {
            const parsedStorage = JSON.parse(currentStorage);

            if (parsedStorage.state && parsedStorage.state.validation) {
              phases.forEach((phase) => {
                // Ensure all validation flags are set
                if (parsedStorage.state.validation.stepValidation) {
                  parsedStorage.state.validation.stepValidation[phase] = true;
                }
                if (parsedStorage.state.validation.stepCompleted) {
                  parsedStorage.state.validation.stepCompleted[phase] = true;
                }
                if (parsedStorage.state.validation.stepInteraction) {
                  parsedStorage.state.validation.stepInteraction[phase] = true;
                }
              });

              parsedStorage.state.validation._timestamp = Date.now();

              localStorage.setItem(
                localStorageKey,
                JSON.stringify(parsedStorage)
              );
              console.log(
                "[InitialAssessmentPage] Forced localStorage update for all validation states"
              );
            }
          }
        } catch (error) {
          console.error(
            "[InitialAssessmentPage] Error updating localStorage",
            error
          );
        }
      } else {
        console.warn(
          "Validation actions not available, step validation not updated"
        );
      }
    } catch (error) {
      console.error("Error updating step validation:", error);
    }
  };

  // Return the component wrapped with the necessary providers
  return (
    <AccordionProvider>
      <PhaseNavigation
        phase={ValidationPhase.INITIAL_ASSESSMENT}
        translations={{
          title: t("phases.initialAssessment.title"),
          description: t("phases.initialAssessment.description"),
        }}
      />
      <SpeechBubble message={t("phases.initialAssessment.welcomeMessage")} />

      <AccordionCardClient
        title={t("phases.initialAssessment.flightDetails")}
        subtitle={t("phases.initialAssessment.flightDetailsDescription")}
        eyebrow={formatStepText(t, "1", "4")}
        stepId="1"
        isCompleted={isStep1Valid}
        isValid={isStep1Valid}
        hasInteracted={hasInteractedWithFlight}
        onInteraction={() => {
          setHasInteractedWithFlight(true);
        }}
      >
        <ModularFlightSelector
          phase={1}
          currentPhase={1}
          showFlightSearch={false}
          onFlightTypeChange={() => {}}
          onInteract={() => {
            setHasInteractedWithFlight(true);
          }}
          setValidationState={(isValid) => {
            console.log(
              "Direct validation update via setValidationState:",
              isValid
            );

            const currentStore = useStore.getState();

            if (currentStore?.actions?.validation) {
              if (
                typeof currentStore.actions.validation.setStepValidation ===
                "function"
              ) {
                try {
                  currentStore.actions.validation.setStepValidation(
                    ValidationPhase.INITIAL_ASSESSMENT,
                    isValid
                  );
                } catch (error) {
                  console.error("Error setting validation:", error);
                }
              }

              if (
                typeof currentStore.actions.validation.setStepInteraction ===
                "function"
              ) {
                try {
                  currentStore.actions.validation.setStepInteraction(
                    ValidationPhase.INITIAL_ASSESSMENT,
                    true
                  );
                } catch (error) {
                  console.error("Error setting interaction:", error);
                }
              }
            }
          }}
        />
      </AccordionCardClient>

      <AccordionCardClient
        title={t("phases.initialAssessment.wizard.title")}
        subtitle={t("phases.initialAssessment.wizard.description")}
        eyebrow={formatStepText(t, "2", "4")}
        stepId="2"
        isCompleted={isStep2Complete}
        isValid={isStep2Complete}
        hasInteracted={hasInteractedWithQA}
        onInteraction={() => setHasInteractedWithQA(true)}
      >
        <Phase1QAWizard
          questions={wizardQuestions}
          onComplete={handleQAComplete}
          store={useStore.getState()}
        />
      </AccordionCardClient>

      <AccordionCardClient
        title={t("phases.initialAssessment.personalDetails.title")}
        subtitle={t("phases.initialAssessment.personalDetails.description")}
        eyebrow={formatStepText(t, "3", "4")}
        stepId="3"
        isCompleted={isStep3Complete}
        isValid={isStep3Complete}
        hasInteracted={hasInteractedWithPersonalDetails}
        onInteraction={() => setHasInteractedWithPersonalDetails(true)}
      >
        <PersonalDetailsForm
          onComplete={handleSubmit}
          onInteract={() => setHasInteractedWithPersonalDetails(true)}
          showAdditionalFields={false}
          formRef={personalDetailsFormRef}
        />
      </AccordionCardClient>

      <AccordionCardClient
        title={t("phases.initialAssessment.consent.title")}
        subtitle={t("phases.initialAssessment.consent.description")}
        eyebrow={formatStepText(t, "4", "4")}
        stepId="4"
        isCompleted={isStep4Complete}
        isValid={isStep4Complete}
        hasInteracted={hasInteractedWithTerms}
        onInteraction={() => setHasInteractedWithTerms(true)}
      >
        <div className="space-y-4">
          <ConsentCheckbox
            type="terms"
            required
            checked={termsAccepted}
            onChange={(checked) => {
              console.log("Terms onChange called with value:", checked);
              // Update Zustand store directly
              useStore
                .getState()
                .actions.user.updateConsents({ terms: checked });
              setHasInteractedWithTerms(true);

              // Update validation state if both checkboxes are checked
              const privacyState = useStore.getState().user.consents.privacy;
              if (checked && privacyState) {
                // Set validation state for step 4
                useStore
                  .getState()
                  .actions.validation.setStepValidation(
                    "STEP_4" as ValidationPhase,
                    true
                  );
                console.log(
                  "Set validation for STEP_4 to true (terms changed)"
                );
              } else {
                useStore
                  .getState()
                  .actions.validation.setStepValidation(
                    "STEP_4" as ValidationPhase,
                    false
                  );
                console.log(
                  "Set validation for STEP_4 to false (terms changed)"
                );
              }
            }}
            label={t("phases.initialAssessment.consent.terms")}
          />
          <ConsentCheckbox
            type="privacy"
            required
            checked={privacyAccepted}
            onChange={(checked) => {
              console.log("Privacy onChange called with value:", checked);
              // Update Zustand store directly
              useStore
                .getState()
                .actions.user.updateConsents({ privacy: checked });
              setHasInteractedWithTerms(true);

              // Update validation state if both checkboxes are checked
              const termsState = useStore.getState().user.consents.terms;
              if (checked && termsState) {
                // Set validation state for step 4
                useStore
                  .getState()
                  .actions.validation.setStepValidation(
                    "STEP_4" as ValidationPhase,
                    true
                  );
                console.log(
                  "Set validation for STEP_4 to true (privacy changed)"
                );
              } else {
                useStore
                  .getState()
                  .actions.validation.setStepValidation(
                    "STEP_4" as ValidationPhase,
                    false
                  );
                console.log(
                  "Set validation for STEP_4 to false (privacy changed)"
                );
              }
            }}
            label={t("phases.initialAssessment.consent.privacy")}
          />
          <ConsentCheckbox
            type="marketing"
            checked={marketingAccepted}
            onChange={(checked) => {
              console.log("Marketing onChange called with value:", checked);
              // Update Zustand store directly
              useStore
                .getState()
                .actions.user.updateConsents({ marketing: checked });
              setHasInteractedWithTerms(true);
            }}
            label={t("phases.initialAssessment.consent.marketing")}
          />
        </div>
      </AccordionCardClient>

      <div className="mt-8 pt-4 flex flex-col sm:flex-row justify-between gap-4">
        <div></div>
        <ContinueButton
          onClick={handleContinue}
          disabled={!canContinue()}
          isLoading={isLoading}
          text={t("common.continue")}
          useUniversalNav={true}
          navigateToPhase={ValidationPhase.COMPENSATION_ESTIMATE}
        />
      </div>
    </AccordionProvider>
  );
};

export default InitialAssessmentPage;
