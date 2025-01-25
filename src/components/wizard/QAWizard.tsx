'use client';

declare global {
  interface Window {
    __wizardSuccessTimeout?: NodeJS.Timeout;
  }
}

import React, { useMemo } from 'react';
import { Answer } from '../../types/wizard';
import { Question } from '../../types/experience';
import type { Flight } from '../../types/store';
import Phase1QAWizard from './Phase1QAWizard';
import Phase4QAWizard from './Phase4QAWizard';

interface QAWizardProps {
  questions: Question[];
  onComplete?: (answers: Answer[]) => void;
  initialAnswers?: Answer[];
  selectedFlight?: Flight | null;
  phase?: number;
  wizardType?: 'travel_status' | 'informed_date';
}

export const QAWizard: React.FC<QAWizardProps> = ({
  questions = [],
  onComplete,
  initialAnswers = [],
  selectedFlight,
  phase = 1,
  wizardType: passedWizardType,
}) => {
  // Determine wizard type based on first question ID
  const wizardType = useMemo(() => {
    // If wizardType is passed, use it
    if (passedWizardType) {
      console.log('Using passed wizard type:', passedWizardType);
      return passedWizardType;
    }

    const firstQuestionId = questions[0]?.id;
    if (!firstQuestionId) return 'default';

    // Check if this is the initial assessment wizard
    if (firstQuestionId.startsWith('issue_')) {
      return 'issue';
    }

    // Check for specific question IDs to determine type
    if (
      firstQuestionId === 'informed_date' ||
      firstQuestionId === 'specific_informed_date'
    ) {
      return 'informed_date';
    }
    if (
      firstQuestionId === 'travel_status' ||
      firstQuestionId === 'refund_status' ||
      firstQuestionId === 'ticket_cost'
    ) {
      return 'travel_status';
    }

    // Default to the first part of the ID
    const type = firstQuestionId.split('_')[0];
    return type === 'travel' ? 'travel_status' : type;
  }, [questions, passedWizardType]);

  // For phase 1, use the dedicated Phase1QAWizard
  if (phase === 1) {
    return (
      <Phase1QAWizard
        questions={questions}
        onComplete={onComplete}
        initialAnswers={initialAnswers}
      />
    );
  }

  // For phase 4, use the dedicated Phase4QAWizard
  if (phase === 4) {
    return (
      <Phase4QAWizard
        questions={questions}
        onComplete={onComplete}
        initialAnswers={initialAnswers}
        selectedFlight={selectedFlight}
        wizardType={
          (wizardType as 'travel_status' | 'informed_date') || 'travel_status'
        }
      />
    );
  }

  // For other phases, show placeholder
  return (
    <div className="flex items-center justify-center min-h-[300px] text-center">
      <p className="text-gray-500">Phase {phase} wizard not implemented yet</p>
    </div>
  );
};

export default QAWizard;
