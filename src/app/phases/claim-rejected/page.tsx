"use client";

// Set flag BEFORE component import to block any Phase4QAWizard initialization
// This will be read by the WizardBase and Phase4QAWizard component
if (typeof window !== "undefined") {
  window.__inClaimRejectedContext = true;
  console.log(
    "Set __inClaimRejectedContext flag from claim-rejected page module"
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SpeechBubble } from "@/components/ui/display/SpeechBubble";
import { ContinueButton } from "@/components/ui/button/ContinueButton";
import { pushToDataLayer } from "@/utils/gtm";
import { useTranslation } from "@/hooks/useTranslation";
import { useStore } from "@/hooks/useStore";
import { PhaseGuard } from "@/components/shared/PhaseGuard";
import { ValidationPhase } from "@/types/shared/validation";
import { useUniversalNavigation } from "@/utils/navigation";

// Map API reason codes to translation keys
const REASON_MAP: Record<string, string> = {
  extraordinary_circumstances: "extraordinaryCircumstances",
  short_delay: "shortDelay",
  non_eu_flight: "nonEUFlight",
  time_limit: "timeLimitExceeded",
  has_prerequisites: "shortDelay", // Map to short delay since it's about not meeting the 3h requirement
};

// Translations for specific API responses
const API_TRANSLATIONS: Record<string, Record<string, string>> = {
  has_prerequisites: {
    de: "Nach unseren Informationen sind die Voraussetzungen für eine Entschädigung nicht gegeben (Ziel nicht erreicht oder Verspätung >3h).",
    en: "According to our information, the requirements for compensation are not met (destination not reached or delay >3h).",
  },
};

// Default rejection reasons for development/testing
const DEFAULT_REJECTION_REASONS = {
  has_prerequisites:
    "Nach unseren Informationen sind die Voraussetzungen für eine Entschädigung nicht gegeben (Ziel nicht erreicht oder Verspätung >3h).",
};

// Add this interface to declare the window extensions at the top of the file
declare global {
  interface Window {
    __inClaimRejectedContext?: boolean;
    __blockPhase4StoreUpdates?: boolean;
    __wizardSuccessTimeout?: NodeJS.Timeout;
  }
}

// Global flag to track if we've already reset the store to prevent multiple attempts
let hasResetPhase4Store = false;
let hasAddedPathGuard = false;

export default function ClaimRejectedPage() {
  const router = useRouter();
  const { t, lang, translationsObject } = useTranslation();
  const { navigateToPhase } = useUniversalNavigation();
  // Use a ref to store the store reference - avoids repeatedly accessing it
  const storeRef = useRef<any>(null);

  // Get store reference once but don't set up subscriptions or track changes
  useEffect(() => {
    try {
      if (!storeRef.current) {
        // Only get store once to avoid subscription overhead
        storeRef.current = useStore.getState();
        console.log("Obtained initial store reference");
      }
    } catch (error) {
      console.error("Error getting store reference:", error);
    }
  }, []);

  const [mounted, setMounted] = React.useState(false);
  const [rejectionReasons, setRejectionReasons] = React.useState<
    Record<string, string>
  >({});
  const [finalTranslatedReasons, setFinalTranslatedReasons] = React.useState<
    Record<string, string>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const storeResetAttempted = React.useRef(false);

  // Add a path guard to help Phase4QAWizard detect we're in claim-rejected context
  useEffect(() => {
    if (!hasAddedPathGuard && typeof window !== "undefined") {
      // Set a global flag that Phase4QAWizard can check
      window.__inClaimRejectedContext = true;
      window.__blockPhase4StoreUpdates = true;
      hasAddedPathGuard = true;
      console.log(
        "Added global claim-rejected context and store blocking flags"
      );
    }

    // Clean up any timers that might be causing loops
    if (typeof window !== "undefined" && window.__wizardSuccessTimeout) {
      clearTimeout(window.__wizardSuccessTimeout);
      window.__wizardSuccessTimeout = undefined;
    }
  }, []);

  // Reset phase4 store on mount to prevent infinite loops
  useEffect(() => {
    // Only reset once to prevent infinite loops
    if (!hasResetPhase4Store && !storeResetAttempted.current) {
      storeResetAttempted.current = true;
      console.log(
        "Claim Rejected: Safely resetting phase4 store to prevent loops"
      );

      try {
        // Instead of calling any store actions that might cause loops,
        // just set the global flag to block updates
        if (typeof window !== "undefined") {
          window.__blockPhase4StoreUpdates = true;
        }

        hasResetPhase4Store = true;
      } catch (error) {
        console.error("Error during phase4 store block:", error);
      }
    }
  }, []);

  // Try to get reasons from URL on mount
  useEffect(() => {
    console.log("=== Component Mount Effect ===");

    // First try to get from URL
    const searchParams = new URLSearchParams(window.location.search);
    const reasonsParam = searchParams.get("reasons");
    console.log("URL reasons param:", reasonsParam);

    let foundReasons: Record<string, string> = {};

    if (reasonsParam) {
      try {
        const reasons = JSON.parse(decodeURIComponent(reasonsParam));
        console.log("Found reasons in URL:", reasons);
        foundReasons = reasons?.rejection_reasons || {};
      } catch (error) {
        console.error("Error parsing URL reasons:", error);
      }
    }

    // If we don't have URL reasons, use defaults
    if (Object.keys(foundReasons).length === 0) {
      console.log("Using default reasons");
      foundReasons = DEFAULT_REJECTION_REASONS;
    }

    // Set the rejection reasons directly from the source
    setRejectionReasons(foundReasons);
    pushToDataLayer({ step_position: 4.2 });
  }, []);

  const getTranslatedReason = React.useCallback(
    (key: string, originalValue: string): string => {
      console.log("=== getTranslatedReason called ===");
      console.log("Input:", { key, originalValue, lang });

      // Check if we have a specific translation for this API response
      if (API_TRANSLATIONS[key]?.[lang]) {
        console.log("Found API translation:", API_TRANSLATIONS[key][lang]);
        return API_TRANSLATIONS[key][lang];
      }

      // Check if we have a mapping to our translation keys
      const translationKey = REASON_MAP[key];
      if (translationKey) {
        console.log("Found translation key mapping:", translationKey);
        // Use the mapped key if it exists in the translations
        const items = translationsObject?.phases?.claimRejected?.reasons?.items;
        const translatedValue =
          items && translationKey in items
            ? items[translationKey as keyof typeof items]
            : undefined;

        console.log("Translation value:", translatedValue);
        return translatedValue || originalValue;
      }

      console.log("No translation found, using original value:", originalValue);
      return originalValue;
    },
    [lang, translationsObject]
  );

  // Translation effect
  React.useEffect(() => {
    console.log("=== Translation Effect ===");
    console.log("Current language:", lang);
    console.log("Initial rejection reasons:", rejectionReasons);

    if (Object.keys(rejectionReasons).length === 0) {
      console.log(
        "No initial rejection reasons found, skipping translation and mount"
      );
      // Ensure final reasons are also empty if initial are empty
      setFinalTranslatedReasons({});
      // Don't set mounted to true if there are no reasons to translate
      // It will be set when rejectionReasons updates and the effect runs again
      return;
    }

    // Translate the stored reasons
    const translatedReasons: Record<string, string> = {};
    Object.entries(rejectionReasons).forEach(([key, value]) => {
      console.log("Translating reason:", { key, value });
      translatedReasons[key] = getTranslatedReason(key, String(value));
      console.log("Translated to:", translatedReasons[key]);
    });

    // If no reasons were found after translation, use a default reason
    if (Object.keys(translatedReasons).length === 0) {
      const shortDelay =
        translationsObject?.phases?.claimRejected?.reasons?.items?.shortDelay;
      translatedReasons.default =
        shortDelay || "The flight delay was less than 3 hours";
    }

    console.log("Setting final translated reasons:", translatedReasons);
    setFinalTranslatedReasons(translatedReasons);

    // Set mounted to true AFTER translations are done
    console.log("Setting mounted to true");
    setMounted(true);
  }, [lang, translationsObject, getTranslatedReason, rejectionReasons]);

  const handleContinue = async () => {
    try {
      setIsLoading(true);
      console.log("=== Continue Button Clicked ===");
      // We now use storeRef.current instead of store

      pushToDataLayer({
        step_position: 4.3,
      });

      // Reset all stores to clear any old data
      try {
        // Reset the Zustand store
        if (storeRef.current?.actions?.phase4?.resetStore) {
          storeRef.current.actions.phase4.resetStore();
        }

        // Also reset other stores as needed
        if (storeRef.current?.actions?.navigation?.resetNavigation) {
          storeRef.current.actions.navigation.resetNavigation();
        }

        if (storeRef.current?.actions?.validation?.resetValidation) {
          storeRef.current.actions.validation.resetValidation();
        }

        if (storeRef.current?.actions?.flight?.clearFlights) {
          storeRef.current.actions.flight.clearFlights();
        }

        console.log("All stores reset");
      } catch (error) {
        console.error("Error resetting stores:", error);
      }

      // Navigate to homepage
      navigateToPhase(ValidationPhase.INITIAL_ASSESSMENT);
    } catch (error) {
      console.error("Error in handleContinue:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add logging before render
  console.log("=== Render ===");
  console.log("Current rejection reasons:", finalTranslatedReasons);
  console.log("Has error:", Boolean(finalTranslatedReasons.error));
  console.log("Number of reasons:", Object.keys(finalTranslatedReasons).length);

  if (!mounted) {
    console.log("Component not mounted yet, showing loading spinner");
    // Show a simple loading indicator instead of null
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f5f7fa]">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Add log here to confirm mounted state before rendering full content
  console.log(`Rendering full page content, mounted: ${mounted}`);

  return (
    <PhaseGuard phase={8} skipStoreUpdates={true}>
      <div className="min-h-screen bg-[#f5f7fa] flex flex-col">
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="mt-4 sm:mt-8 mb-8">
            <SpeechBubble
              message={
                translationsObject?.phases?.claimRejected?.speechBubble ||
                "Unfortunately it didn't work this time!"
              }
            />
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                {translationsObject?.phases?.claimRejected?.reasons?.title ||
                  "Reasons for Rejection"}
              </h2>
              {finalTranslatedReasons.error ? (
                <div className="text-red-600 mb-4 p-4 bg-red-50 rounded-lg">
                  <p className="font-medium">
                    {translationsObject?.errors?.general || "Error"}
                  </p>
                  <p className="mt-1">{finalTranslatedReasons.error}</p>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 mb-4">
                    {translationsObject?.phases?.claimRejected?.reasons
                      ?.description ||
                      "Your claim has been rejected for the following reasons:"}
                  </p>
                  <ul className="list-disc pl-5 text-gray-600 space-y-2 mb-6">
                    <li>
                      {translationsObject?.phases?.claimRejected?.reasons?.items
                        ?.extraordinaryCircumstances ||
                        "Extraordinary circumstances (e.g., weather, political instability)"}
                    </li>
                    <li>
                      {translationsObject?.phases?.claimRejected?.reasons?.items
                        ?.shortDelay || "The delay was less than 3 hours"}
                    </li>
                    <li>
                      {translationsObject?.phases?.claimRejected?.reasons?.items
                        ?.nonEUFlight ||
                        "The flight was not covered by EU 261/2004 regulation"}
                    </li>
                    <li>
                      {translationsObject?.phases?.claimRejected?.reasons?.items
                        ?.timeLimitExceeded ||
                        "The time limit for filing a claim has been exceeded"}
                    </li>
                  </ul>
                  <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-100">
                    <h3 className="text-lg font-medium text-red-800 mb-4">
                      {translationsObject?.phases?.claimRejected?.reasonsBox
                        ?.title || "Specific reasons for your case:"}
                    </h3>
                    {Object.entries(finalTranslatedReasons).map(
                      ([key, reason]) => {
                        console.log("Rendering final reason:", { key, reason });
                        return (
                          <div
                            key={key}
                            className="text-red-700 mb-4 last:mb-0"
                          >
                            <div className="bg-white p-4 rounded border border-red-100">
                              <p className="whitespace-pre-wrap text-red-600">
                                {reason}
                              </p>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                {translationsObject?.phases?.claimRejected?.nextSteps?.title ||
                  "What can I do now?"}
              </h2>
              <div className="mt-6">
                <ul className="list-disc pl-5 text-gray-600 space-y-2">
                  <li>
                    {translationsObject?.phases?.claimRejected?.nextSteps?.items
                      ?.checkOtherFlights ||
                      "Did you know that you can claim compensation for flight problems up to 3 years back? Check another flight now."}
                  </li>
                  <li>
                    {translationsObject?.phases?.claimRejected?.nextSteps?.items
                      ?.contactInsurance ||
                      "Check if your travel insurance covers this situation"}
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
              <ContinueButton
                onClick={handleContinue}
                disabled={isLoading}
                isLoading={isLoading}
                text={
                  translationsObject?.phases?.claimRejected?.navigation
                    ?.startNew || "Check Another Flight"
                }
              />
            </div>
          </div>
        </main>
      </div>
    </PhaseGuard>
  );
}
