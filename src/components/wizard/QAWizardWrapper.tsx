import React from 'react';
import { QAWizard } from '@/components/wizard/QAWizard';
import type { Question } from '@/types/experience';
import type { Answer } from '@/types/wizard';
import type { Flight } from '@/types/store';

interface QAWizardWrapperProps {
  questions: Question[];
  onComplete: (answers: Answer[]) => void;
  onInteract?: () => void;
  initialAnswers?: Answer[];
  phase?: number;
  stepNumber?: number;
  selectedFlight?: Flight | Flight[] | null;
}

export const QAWizardWrapper: React.FC<QAWizardWrapperProps> = (props) => {
  console.log('=== QAWizardWrapper Render ===', {
    hasQuestions: !!props.questions,
    questionsLength: props.questions?.length,
    initialAnswers: props.initialAnswers,
    phase: props.phase,
    stepNumber: props.stepNumber,
    selectedFlight: props.selectedFlight,
  });

  // Don't render if no questions
  if (!props.questions || !Array.isArray(props.questions)) {
    console.warn('QAWizardWrapper: questions prop is not an array');
    return null;
  }

  if (props.questions.length === 0) {
    console.warn('QAWizardWrapper: questions array is empty');
    return null;
  }

  return (
    <div className="w-full">
      <QAWizard {...props} />
    </div>
  );
};
