'use client';

import { QAWizard } from '@/components/wizard/QAWizard';
import type { Answer } from '@/types/wizard';
import { useAppDispatch } from '@/store/hooks';
import { setWizardAnswers, completeStep } from '@/store/bookingSlice';
import { wizardQuestions } from '@/constants/wizardQuestions';
import { useEffect } from 'react';
import { useFunnel } from '@/context/FunnelContext';

export default function BookingPage() {
  const dispatch = useAppDispatch();
  const { state } = useFunnel();

  // Update progress as user scrolls through the page
  useEffect(() => {
    const handleScroll = () => {
      const { currentPhase } = state;
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      const phaseProgress = Math.min(
        100,
        (scrollPosition / (docHeight - windowHeight)) * 100
      );

      dispatch({
        type: 'UPDATE_PHASE_PROGRESS',
        payload: {
          phase: currentPhase,
          progress: phaseProgress
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [dispatch, state.currentPhase]);

  const handleComplete = (answers: Answer[]) => {
    dispatch(setWizardAnswers(answers));
    dispatch(completeStep(2));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <QAWizard
          questions={wizardQuestions}
          onComplete={handleComplete}
          illustration="/images/qa-illustration.svg"
        />
      </div>
    </div>
  );
}