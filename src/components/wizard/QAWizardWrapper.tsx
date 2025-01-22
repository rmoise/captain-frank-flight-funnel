import React, { useEffect } from 'react';
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
  const { wizardAnswers } = useStore();
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    // Simulate loading state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <LoadingSpinner />
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
  if (wizardAnswers?.length > 0) {
    // Filter answers to only include those for the current QA
    const currentQAType = props.questions[0]?.id || '';
    const relevantAnswers = wizardAnswers.filter((a: Answer) =>
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
