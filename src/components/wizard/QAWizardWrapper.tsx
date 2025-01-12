import React, { useEffect, useState } from 'react';
import { QAWizard } from './QAWizard';
import type { Question } from '@/types/experience';
import type { Answer } from '@/types/wizard';
import type { Flight } from '@/types/store';
import { useStore } from '@/lib/state/store';
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
  const [isInitializing, setIsInitializing] = useState(true);
  // Error state is kept for error handling pattern across the application
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const [error, setError] = useState<string | null>(null);

  const { wizardAnswers: answers } = useStore();

  // Initialize component state
  useEffect(() => {
    setIsInitializing(false);
  }, []);

  // Show loading state
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoadingSpinner />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
        <div className="text-red-500 mb-4">
          <svg
            className="w-12 h-12 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{error}</h3>
        <p className="text-sm text-gray-500">Please try refreshing the page</p>
      </div>
    );
  }

  // Always use the provided initialAnswers if they exist
  if (props.initialAnswers && props.initialAnswers.length > 0) {
    return (
      <QAWizard
        questions={props.questions}
        onComplete={props.onComplete}
        selectedFlight={props.selectedFlight}
        initialAnswers={props.initialAnswers}
      />
    );
  }

  // If no initialAnswers provided, check store answers
  if (answers?.length > 0) {
    // Filter answers to only include those for the current QA
    const currentQAType = props.questions[0]?.id || '';
    const relevantAnswers = answers.filter((a) =>
      a.questionId?.includes(currentQAType.split('_')[0])
    );

    if (relevantAnswers.length > 0) {
      return (
        <QAWizard
          questions={props.questions}
          onComplete={props.onComplete}
          selectedFlight={props.selectedFlight}
          initialAnswers={relevantAnswers}
        />
      );
    }
  }

  // If no valid answers found, start fresh
  return (
    <QAWizard
      questions={props.questions}
      onComplete={props.onComplete}
      selectedFlight={props.selectedFlight}
    />
  );
};
