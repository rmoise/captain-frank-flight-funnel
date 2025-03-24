'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SpeechBubble } from '@/components/SpeechBubble';
import { BackButton } from '@/components/shared/BackButton';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { pushToDataLayer } from '@/utils/gtm';
import { useTranslation } from '@/hooks/useTranslation';
import useStore from '@/lib/state/store';
import { PhaseGuard } from '@/components/shared/PhaseGuard';

// Map API reason codes to translation keys
const REASON_MAP: Record<string, string> = {
  extraordinary_circumstances: 'extraordinaryCircumstances',
  short_delay: 'shortDelay',
  non_eu_flight: 'nonEUFlight',
  time_limit: 'timeLimitExceeded',
  has_prerequisites: 'shortDelay', // Map to short delay since it's about not meeting the 3h requirement
};

// Translations for specific API responses
const API_TRANSLATIONS: Record<string, Record<string, string>> = {
  has_prerequisites: {
    de: 'Nach unseren Informationen sind die Voraussetzungen für eine Entschädigung nicht gegeben (Ziel nicht erreicht oder Verspätung >3h).',
    en: 'According to our information, the requirements for compensation are not met (destination not reached or delay >3h).',
  },
};

// Store rejection reasons in memory to persist across language switches
let storedRejectionReasons: Record<string, string> | null = null;

// Default rejection reasons for development/testing
const DEFAULT_REJECTION_REASONS = {
  has_prerequisites:
    'Nach unseren Informationen sind die Voraussetzungen für eine Entschädigung nicht gegeben (Ziel nicht erreicht oder Verspätung >3h).',
};

export default function ClaimRejectedPage() {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const resetStore = useStore((state) => state.resetStore);
  const [mounted, setMounted] = React.useState(false);
  const [rejectionReasons, setRejectionReasons] = React.useState<
    Record<string, string>
  >({});
  const [isLoading, setIsLoading] = useState(false);

  // Try to get reasons from localStorage on mount
  useEffect(() => {
    console.log('=== Component Mount Effect ===');

    // First try to get from URL
    const searchParams = new URLSearchParams(window.location.search);
    const reasonsParam = searchParams.get('reasons');
    console.log('URL reasons param:', reasonsParam);

    if (reasonsParam) {
      try {
        const reasons = JSON.parse(decodeURIComponent(reasonsParam));
        console.log('Found reasons in URL:', reasons);
        const apiReasons = reasons?.rejection_reasons || {};
        localStorage.setItem('rejectionReasons', JSON.stringify(apiReasons));
        storedRejectionReasons = apiReasons;
      } catch (error) {
        console.error('Error parsing URL reasons:', error);
      }
    }

    // Then try localStorage if we don't have URL reasons
    if (!storedRejectionReasons) {
      const storedReasons = localStorage.getItem('rejectionReasons');
      if (storedReasons) {
        try {
          storedRejectionReasons = JSON.parse(storedReasons);
          console.log(
            'Loaded reasons from localStorage:',
            storedRejectionReasons
          );
        } catch (error) {
          console.error('Error parsing stored reasons:', error);
        }
      }
    }

    // If we still don't have reasons, use defaults
    if (
      !storedRejectionReasons ||
      Object.keys(storedRejectionReasons).length === 0
    ) {
      console.log('Using default reasons');
      storedRejectionReasons = DEFAULT_REJECTION_REASONS;
      localStorage.setItem(
        'rejectionReasons',
        JSON.stringify(DEFAULT_REJECTION_REASONS)
      );
    }

    pushToDataLayer({ step_position: 4.1 });
  }, []);

  const getTranslatedReason = React.useCallback(
    (key: string, originalValue: string): string => {
      console.log('=== getTranslatedReason called ===');
      console.log('Input:', { key, originalValue, lang });

      // Check if we have a specific translation for this API response
      if (API_TRANSLATIONS[key]?.[lang]) {
        console.log('Found API translation:', API_TRANSLATIONS[key][lang]);
        return API_TRANSLATIONS[key][lang];
      }

      // Check if we have a mapping to our translation keys
      const translationKey = REASON_MAP[key];
      if (translationKey) {
        console.log('Found translation key mapping:', translationKey);
        const translatedValue =
          t.phases.claimRejected.reasons.items[
            translationKey as keyof typeof t.phases.claimRejected.reasons.items
          ];
        console.log('Translation value:', translatedValue);
        return translatedValue;
      }

      console.log('No translation found, using original value:', originalValue);
      return originalValue;
    },
    [lang, t]
  );

  // Translation effect
  React.useEffect(() => {
    console.log('=== Translation Effect ===');
    console.log('Current language:', lang);
    console.log('Stored reasons:', storedRejectionReasons);

    setMounted(true);

    if (!storedRejectionReasons) {
      console.log('No stored reasons found');
      return;
    }

    // Translate the stored reasons
    const translatedReasons: Record<string, string> = {};
    Object.entries(storedRejectionReasons).forEach(([key, value]) => {
      console.log('Translating reason:', { key, value });
      translatedReasons[key] = getTranslatedReason(key, String(value));
      console.log('Translated to:', translatedReasons[key]);
    });

    // If no reasons were found after translation, use a default reason
    if (Object.keys(translatedReasons).length === 0) {
      translatedReasons.default =
        t.phases.claimRejected.reasons.items.shortDelay;
    }

    console.log('Setting final translated reasons:', translatedReasons);
    setRejectionReasons(translatedReasons);
  }, [lang, t, getTranslatedReason]);

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      // Clear all stored data
      localStorage.clear();
      sessionStorage.clear();
      storedRejectionReasons = null;
      setRejectionReasons({});

      // Reset the Zustand store
      resetStore();

      // Redirect to initial assessment to start fresh funnel
      router.push(`/${lang}/phases/initial-assessment`);
    } catch (error) {
      console.error('Error navigating:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add logging before render
  console.log('=== Render ===');
  console.log('Current rejection reasons:', rejectionReasons);
  console.log('Has error:', Boolean(rejectionReasons.error));
  console.log('Number of reasons:', Object.keys(rejectionReasons).length);

  if (!mounted) {
    console.log('Component not mounted yet');
    return null;
  }

  return (
    <PhaseGuard phase={8}>
      <div className="min-h-screen bg-[#f5f7fa] flex flex-col">
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="mt-4 sm:mt-8 mb-8">
            <SpeechBubble message={t.phases.claimRejected.speechBubble} />
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t.phases.claimRejected.reasons.title}
              </h2>
              {rejectionReasons.error ? (
                <div className="text-red-600 mb-4 p-4 bg-red-50 rounded-lg">
                  <p className="font-medium">{t.common.error}</p>
                  <p className="mt-1">{rejectionReasons.error}</p>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 mb-4">
                    {t.phases.claimRejected.reasons.description}
                  </p>
                  <ul className="list-disc pl-5 text-gray-600 space-y-2 mb-6">
                    <li>
                      {
                        t.phases.claimRejected.reasons.items
                          .extraordinaryCircumstances
                      }
                    </li>
                    <li>{t.phases.claimRejected.reasons.items.shortDelay}</li>
                    <li>{t.phases.claimRejected.reasons.items.nonEUFlight}</li>
                    <li>
                      {t.phases.claimRejected.reasons.items.timeLimitExceeded}
                    </li>
                  </ul>
                  <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-100">
                    <h3 className="text-lg font-medium text-red-800 mb-4">
                      {t.phases.claimRejected.reasonsBox.title}
                    </h3>
                    {Object.entries(rejectionReasons).map(([key, reason]) => {
                      console.log('Rendering reason:', { key, reason });
                      return (
                        <div key={key} className="text-red-700 mb-4 last:mb-0">
                          <div className="bg-white p-4 rounded border border-red-100">
                            <p className="whitespace-pre-wrap text-red-600">
                              {reason}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t.phases.claimRejected.nextSteps.title}
              </h2>
              <div className="text-left space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F54538] text-white flex items-center justify-center text-sm">
                    1
                  </div>
                  <p className="text-gray-700">
                    {t.phases.claimRejected.nextSteps.items.checkOtherFlights}
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F54538] text-white flex items-center justify-center text-sm">
                    2
                  </div>
                  <p className="text-gray-700">
                    {t.phases.claimRejected.nextSteps.items.contactInsurance}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
              <BackButton
                onClick={() => {
                  // Make sure we save the phase 4 completion status before navigating back
                  try {
                    // Mark phase 4 as explicitly completed in localStorage
                    localStorage.setItem('phase4_explicitlyCompleted', 'true');

                    // Get store instance
                    const store = useStore.getState();

                    // Ensure phase 4 is included in completed phases
                    const completedPhases = store.completedPhases || [];
                    if (!completedPhases.includes(4)) {
                      completedPhases.push(4);
                      localStorage.setItem('completedPhases', JSON.stringify(completedPhases));
                    }

                    // Ensure phase 4 is included in phasesCompletedViaContinue
                    const phasesCompletedViaContinue = store.phasesCompletedViaContinue || [];
                    if (!phasesCompletedViaContinue.includes(4)) {
                      phasesCompletedViaContinue.push(4);
                      localStorage.setItem('phasesCompletedViaContinue', JSON.stringify(phasesCompletedViaContinue));
                    }

                    console.log('=== Claim Rejected - Back to Trip Experience ===', {
                      completedPhases,
                      phasesCompletedViaContinue,
                      timestamp: new Date().toISOString()
                    });

                    // Update store state
                    useStore.setState({
                      currentPhase: 4,
                      _isClaimRejected: false,
                      _preventPhaseChange: false,
                      completedPhases: completedPhases,
                      phasesCompletedViaContinue: phasesCompletedViaContinue
                    });
                  } catch (e) {
                    console.error('Error saving phase completion state', e);
                  }

                  router.push(`/${lang}/phases/trip-experience`);
                }}
              />
              <ContinueButton
                onClick={handleContinue}
                isLoading={isLoading}
                text={t.phases.claimRejected.navigation.startNew}
              />
            </div>
          </div>
        </main>
      </div>
    </PhaseGuard>
  );
}
