'use client';

import { QAWizard } from '@/components/wizard/QAWizard';
import type { Answer } from '@/types/wizard';
import { useAppDispatch } from '@/store/hooks';
import { setWizardAnswers, completeStep, setProgress } from '@/store/bookingSlice';
import { wizardQuestions } from '@/constants/wizardQuestions';
import { useEffect } from 'react';

export default function BookingPage() {
  const dispatch = useAppDispatch();

  // Update progress as user scrolls through the page
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      const progress = Math.min(
        100,
        (scrollPosition / (docHeight - windowHeight)) * 100
      );

      dispatch(setProgress(progress));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [dispatch]);

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