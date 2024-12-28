import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentPhase } from '@/store/slices/progressSlice';
import { AccordionCard } from './shared/AccordionCard';
import type { RootState } from '@/store';

interface QAWizardProps {
  steps: {
    title: string;
    subtitle?: string;
    content: React.ReactNode;
    summary?: string;
  }[];
}

export const QAWizard: React.FC<QAWizardProps> = ({ steps }) => {
  const dispatch = useDispatch();
  const currentStep = useSelector(
    (state: RootState) => state.progress.currentPhase
  );
  const completedSteps = useSelector(
    (state: RootState) => state.progress.completedSteps
  );

  useEffect(() => {
    if (currentStep === 0) {
      dispatch(setCurrentPhase(1));
    }
  }, [currentStep, dispatch]);

  return (
    <div className="space-y-4">
      {steps.map((step, stepNumber) => {
        const isActive = currentStep === stepNumber + 1;
        const isComplete = completedSteps.includes(stepNumber + 1);

        return (
          <AccordionCard
            key={step.title}
            title={step.title}
            eyebrow={`Step ${stepNumber + 1}`}
            summary={step.summary}
            isCompleted={isComplete}
            hasInteracted={false}
            shouldStayOpen={isActive && !isComplete}
            isOpenByDefault={isActive}
          >
            {step.content}
          </AccordionCard>
        );
      })}
    </div>
  );
};
