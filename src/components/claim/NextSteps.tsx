'use client';

import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

export function NextSteps() {
  const steps = [
    {
      title: 'Bestätigungs-E-Mail',
      description:
        'Du erhältst in Kürze eine E-Mail mit der Bestätigung deiner Anspruchsanmeldung.',
    },
    {
      title: 'Prüfung deines Anspruchs',
      description:
        'Wir prüfen deinen Anspruch und kontaktieren die Fluggesellschaft.',
    },
    {
      title: 'Bearbeitung',
      description:
        'Die Bearbeitung kann einige Wochen in Anspruch nehmen. Wir halten dich per E-Mail auf dem Laufenden.',
    },
    {
      title: 'Auszahlung',
      description:
        'Nach erfolgreicher Prüfung erhältst du die Entschädigung auf das angegebene Konto.',
    },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Nächste Schritte</h3>
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-6 w-6 text-primary-500" />
            </div>
            <div>
              <h4 className="text-base font-medium text-gray-900">
                {step.title}
              </h4>
              <p className="mt-1 text-sm text-gray-500">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
