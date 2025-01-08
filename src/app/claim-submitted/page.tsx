'use client';

import React, { useEffect, useCallback } from 'react';
import { useStore } from '@/lib/state/store';

export default function ClaimSubmittedPage() {
  const personalDetails = useStore((state) => state.personalDetails);
  const hideLoading = useStore((state) => state.hideLoading);

  const handleHideLoading = useCallback(() => {
    hideLoading();
  }, [hideLoading]);

  useEffect(() => {
    handleHideLoading();
  }, [handleHideLoading]);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Antrag eingereicht</h1>
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-green-700 mb-4">
          Vielen Dank, {personalDetails?.firstName}!
        </h2>
        <p className="text-gray-700 mb-4">
          Dein Antrag wurde erfolgreich eingereicht. Wir werden deinen Fall
          prüfen und uns schnellstmöglich bei dir melden.
        </p>
        <p className="text-gray-700 mb-4">
          Du erhältst eine Bestätigungs-E-Mail an {personalDetails?.email} mit
          deinen Antragsdetails.
        </p>
        <p className="text-gray-700">
          Wenn du Fragen hast oder zusätzliche Informationen bereitstellen
          möchtest, zögere bitte nicht, unser Support-Team zu kontaktieren.
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Nächste Schritte</h3>
        <ul className="list-disc list-inside text-gray-700 space-y-2">
          <li>Wir prüfen deinen Antrag innerhalb von 2-3 Werktagen</li>
          <li>
            Unser Team wird sich bei dir melden, falls wir zusätzliche
            Informationen benötigen
          </li>
          <li>Du erhältst Updates zum Status deines Antrags per E-Mail</li>
        </ul>
      </div>
    </div>
  );
}
