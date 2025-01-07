'use client';

import React from 'react';
import { useStore } from '@/lib/state/store';
import { PhaseGuard } from '@/components/shared/PhaseGuard';
import { QAWizardWrapper } from '@/components/wizard/QAWizardWrapper';
import type { ValidationStateSteps } from '@/lib/state/store';
import type { Answer } from '@/types/wizard';

export default function InitialAssessmentPage() {
  const { selectedFlight } = useStore();

  const handleComplete = (answers: Answer[]) => {
    // Handle wizard completion
    console.log('Wizard completed with answers:', answers);
  };

  return (
    <PhaseGuard phase={1}>
      <QAWizardWrapper
        questions={[]}
        onComplete={handleComplete}
        phase={1}
        stepNumber={1 as ValidationStateSteps}
        selectedFlight={selectedFlight}
      />
    </PhaseGuard>
  );
}
