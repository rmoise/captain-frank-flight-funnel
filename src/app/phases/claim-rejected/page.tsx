'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SpeechBubble } from '@/components/SpeechBubble';
import { BackButton } from '@/components/shared/BackButton';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { pushToDataLayer } from '@/utils/gtm';

export default function ClaimRejectedPage() {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [rejectionReasons, setRejectionReasons] = React.useState<
    Record<string, string>
  >({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    pushToDataLayer({ step_position: 4.1 });
  }, []);

  React.useEffect(() => {
    setMounted(true);
    // Get rejection reasons from URL parameters
    const searchParams = new URLSearchParams(window.location.search);
    const reasonsParam = searchParams.get('reasons');
    if (reasonsParam) {
      try {
        const reasons = JSON.parse(decodeURIComponent(reasonsParam));
        // Get rejection reasons directly from the response structure
        const rejectionReasons =
          reasons?.data?.rejection_reasons || reasons?.rejection_reasons || {};
        setRejectionReasons(rejectionReasons);
      } catch (error) {
        setRejectionReasons({ error: 'Failed to parse rejection reasons' });
      }
    }
  }, []);

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      router.push('/');
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
        <div className="mt-4 sm:mt-8 mb-8">
          <SpeechBubble message="Leider hat es diesmal nicht geklappt!" />
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">
              Warum wurde dein Anspruch auf Entschädigung abgelehnt
            </h2>
            {rejectionReasons.error ? (
              <div className="text-red-600 mb-4 p-4 bg-red-50 rounded-lg">
                <p className="font-medium">Error Processing Claim</p>
                <p className="mt-1">{rejectionReasons.error}</p>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  Gemäß der EU-Fluggastrechteverordnung (EG 261/2004) gibt es
                  nur in bestimmten Fällen Anspruch auf Entschädigung:
                </p>
                <ul className="list-disc pl-5 text-gray-600 space-y-2 mb-6">
                  <li>Flugverspätungen von mehr als 3 Stunden</li>
                  <li>
                    Flugstreichungen mit weniger als 14 Tagen Vorankündigung
                  </li>
                  <li>Nichtbeförderung wegen Überbuchung</li>
                  <li>
                    Verpasste Anschlussflüge aufgrund des Verschuldens der
                    Fluggesellschaft
                  </li>
                </ul>
                <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-100">
                  <h3 className="text-lg font-medium text-red-800 mb-4">
                    Ablehnungsgründe
                  </h3>
                  {Object.entries(rejectionReasons).map(([key, reason]) => (
                    <div key={key} className="text-red-700 mb-4 last:mb-0">
                      <div className="bg-white p-4 rounded border border-red-100">
                        <p className="whitespace-pre-wrap text-red-600">
                          {reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">
              Was kannst du als nächstes tun?
            </h2>
            <div className="text-left space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F54538] text-white flex items-center justify-center text-sm">
                  1
                </div>
                <p className="text-gray-700">
                  Wusstest du, dass man bis zu 3 Jahre rückwirkend Anspruch auf
                  Entschädigung bei Flugproblemen hat? Prüfe jetzt einen anderen
                  Flug.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F54538] text-white flex items-center justify-center text-sm">
                  2
                </div>
                <p className="text-gray-700">
                  Falls du eine hast, dann kontaktiere deine
                  Reiseversicherungsunternehmen um zu prüfen, ob sie dich
                  entschädigen können.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
            <BackButton
              onClick={() => router.push('/phases/trip-experience')}
            />
            <ContinueButton
              onClick={handleContinue}
              isLoading={isLoading}
              text="Einen anderen Flug prüfen"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
