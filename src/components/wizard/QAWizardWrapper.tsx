import React, { useEffect } from 'react';
import { QAWizard } from './QAWizard';
import type { Question } from '@/types/experience';
import type { Answer } from '@/types/wizard';
import type { Flight } from '@/types/store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { ValidationStateSteps } from '@/lib/state/store';

interface QAWizardWrapperProps {
  questions: Question[];
  onComplete: (answers: Answer[]) => void;
  onInteract?: () => void;
  initialAnswers?: Answer[];
  phase?: number;
  stepNumber?: ValidationStateSteps;
  selectedFlight?: Flight | null;
}

export const QAWizardWrapper: React.FC<QAWizardWrapperProps> = (props) => {
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    // Simulate loading state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100); // Reduced loading time for better UX

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <LoadingSpinner />
      </div>
    );
  }

  // Always render QAWizard with provided props
  return (
    <QAWizard
      questions={props.questions}
      onComplete={props.onComplete}
      selectedFlight={props.selectedFlight}
      initialAnswers={props.initialAnswers}
      phase={props.phase}
    />
  );
};
