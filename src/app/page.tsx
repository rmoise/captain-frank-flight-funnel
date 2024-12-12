'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import ClientLayout from '@/components/layouts/ClientLayout';
import { Footer } from '@/components/Footer';
import { socialLinks } from '@/data/socialLinks';
import WelcomeSection from '@/components/booking/WelcomeSection';
import { SpeechBubble } from '@/components/SpeechBubble';
import { Headline } from '@/components/Headline';
import FlightSelector from '@/components/booking/FlightSelector';
import { AnimatedSection } from '@/components/AnimatedSection';
import ProgressTracker from '@/components/booking/ProgressTracker';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  setStep,
  completeStep,
  markStepIncomplete,
  setProgress,
  setSelectedFlight,
  setWizardAnswers
} from '@/store/bookingSlice';
import { QAWizard } from '@/components/wizard/QAWizard';
import type { Answer } from '@/types/wizard';
import { useSteps } from '@/context/StepsContext';
import { debounce } from '@/utils/debounce';
import { useRouter } from 'next/navigation';
import type { Flight } from '@/types';

const wizardQuestions = [
  {
    id: 'issue_type',
    text: 'What type of issue did you experience?',
    type: 'radio' as const,
    options: [
      { id: 'delay', label: 'Delayed Flight', value: 'delay' },
      { id: 'cancel', label: 'Canceled Flight', value: 'cancel' },
      { id: 'missed', label: 'Missed Flight', value: 'missed' },
      {
        id: 'other',
        label: 'Other Concern',
        value: 'other',
        externalLink: 'https://example.com',
      },
    ],
  },
  {
    id: 'delay_duration',
    text: 'How delayed was your flight?',
    type: 'radio' as const,
    showIf: (answers: Answer[]) =>
      answers.find((a) => a.questionId === 'issue_type')?.value === 'delay',
    options: [
      { id: 'less3', label: 'Less than 3 hours', value: '<3' },
      { id: 'more3', label: 'More than 3 hours', value: '>3' },
    ],
  },
  {
    id: 'cancellation_notice',
    text: 'When were you informed about the flight change before your departure?',
    type: 'radio' as const,
    showIf: (answers: Answer[]) =>
      answers.find((a) => a.questionId === 'issue_type')?.value === 'cancel',
    options: [
      { id: 'not_informed', label: 'Not at all', value: 'none' },
      { id: '0_7', label: '0-7 days', value: '0-7' },
      { id: '8_14', label: '8-14 days', value: '8-14' },
      { id: 'over_14', label: 'Over 14 days', value: '>14' },
    ],
  },
  {
    id: 'additional_costs',
    text: 'Did you have additional costs (e.g. hotel, taxi, food costs)?',
    type: 'radio' as const,
    showIf: (answers: Answer[]) =>
      answers.find((a) => a.questionId === 'issue_type')?.value === 'missed',
    options: [
      { id: 'costs_yes', label: 'Yes', value: 'yes' },
      { id: 'costs_no', label: 'No', value: 'no' },
    ],
  },
  {
    id: 'cost_amount',
    text: "Let me know approximately how much you spent. We'll do the paperwork at the end.",
    type: 'number' as const,
    showIf: (answers: Answer[]) => {
      const isMissed =
        answers.find((a) => a.questionId === 'issue_type')?.value === 'missed';
      const hasCosts =
        answers.find((a) => a.questionId === 'additional_costs')?.value ===
        'yes';
      return isMissed && hasCosts;
    },
    placeholder: 'Enter amount',
    min: 0,
  },
];

export default function Home() {
  const dispatch = useAppDispatch();
  const { currentStep, completedSteps, progress } = useAppSelector(
    (state) => state.booking
  );
  const { registerStep } = useSteps();
  const footerRef = useRef<HTMLDivElement>(null);
  const trackerRef = useRef<HTMLDivElement>(null);
  const lastStepRef = useRef(currentStep);
  const router = useRouter();

  // Automatically register steps based on data-step attributes
  useEffect(() => {
    const sections = document.querySelectorAll('[data-step]');
    const stepMap = new Map([
      ['1', 'FlightSelector'],
      ['2', 'QAWizard'],
      ['3', 'FinalStep'],
    ]);

    sections.forEach((section) => {
      const step = section.getAttribute('data-step');
      if (step && stepMap.has(step)) {
        registerStep(stepMap.get(step)!, parseInt(step));
      }
    });
  }, [registerStep]);

  useEffect(() => {
    const handleScroll = () => {
      if (!footerRef.current || !trackerRef.current) return;

      const windowHeight = window.innerHeight;
      const scrollPosition = window.scrollY;
      const viewportMid = scrollPosition + (windowHeight / 2);
      const documentHeight = document.documentElement.scrollHeight;

      // Update tracker position
      const footerRect = footerRef.current.getBoundingClientRect();
      if (footerRect.top < windowHeight) {
        trackerRef.current.style.position = 'absolute';
        trackerRef.current.style.bottom = 'auto';
        trackerRef.current.style.top = `${
          documentHeight - footerRect.height - trackerRef.current.getBoundingClientRect().height - 20
        }px`;
      } else {
        trackerRef.current.style.position = 'fixed';
        trackerRef.current.style.bottom = '0';
        trackerRef.current.style.top = 'auto';
      }

      // Find current step and check completion states
      const sections = document.querySelectorAll('[data-step]');
      let newStep = lastStepRef.current;
      let hasIncompleteSteps = false;
      let totalProgress = 0;

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const sectionTop = rect.top + window.scrollY;
        const sectionBottom = sectionTop + rect.height;
        const step = parseInt(section.getAttribute('data-step') || '1');

        // Calculate progress based on viewport position
        if (viewportMid > sectionTop) {
          const progress = Math.min(1, (viewportMid - sectionTop) / rect.height);
          totalProgress = ((step - 1) + progress) / (sections.length - 1);
        }

        // Check if we've passed any incomplete required steps
        if (viewportMid > sectionBottom) {
          if (step <= 2 && !completedSteps.includes(step)) {
            dispatch(markStepIncomplete(step));
            hasIncompleteSteps = true;
          }
        }

        // Update current step
        if (sectionTop <= viewportMid && sectionBottom >= viewportMid) {
          if (hasIncompleteSteps) {
            // If there are incomplete steps, stay at the first incomplete step
            const firstIncomplete = Array.from(sections)
              .find(s => {
                const stepNum = parseInt(s.getAttribute('data-step') || '1');
                return stepNum <= 2 && !completedSteps.includes(stepNum);
              });
            if (firstIncomplete) {
              newStep = parseInt(firstIncomplete.getAttribute('data-step') || '1');
            }
          } else {
            newStep = step;
          }
        }
      });

      // Update step if changed
      if (newStep !== lastStepRef.current) {
        lastStepRef.current = newStep;
        dispatch(setStep(newStep));
      }

      // Update progress in Redux
      dispatch(setProgress(Math.min(1, totalProgress) * 100));
    };

    // Use RAF for smoother updates
    let rafId: number;
    const smoothScroll = () => {
      rafId = requestAnimationFrame(() => {
        handleScroll();
        smoothScroll();
      });
    };

    smoothScroll();
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [dispatch, completedSteps]);

  const handleWizardComplete = (answers: Answer[]) => {
    dispatch(setWizardAnswers(answers));
    dispatch(completeStep(2));
  };

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gray-50 flex flex-col relative">
        <WelcomeSection />

        <div className="w-full max-w-7xl mx-auto px-4 flex-grow">
          <div data-step="1">
            <AnimatedSection delay={2} direction="right">
              <Headline
                text="Tell us about your travel plans"
                isFirst={true}
                step="step1"
              />
              <div>
                <SpeechBubble message="How was your original trip planned?" />
              </div>
              <div className="mt-8">
                <FlightSelector
                  onViewModeChange={() => {}}
                  onNotListedClick={() => {}}
                  onSelect={(flight: Flight) => {
                    dispatch(setSelectedFlight(flight));
                    dispatch(completeStep(1));
                    dispatch(setStep(2));
                  }}
                />
              </div>
            </AnimatedSection>
          </div>

          <div data-step="2">
            <AnimatedSection delay={3} direction="left">
              <div className="w-full max-w-7xl mx-auto px-4">
                <Headline
                  text="Share your experience with us"
                  isFirst={false}
                  step="step2"
                />
                <div>
                  <SpeechBubble message="Please provide more details about your experience" />
                </div>
                <div className="mt-8">
                  <QAWizard
                    questions={wizardQuestions}
                    onComplete={handleWizardComplete}
                    illustration="/images/qa-illustration.svg"
                  />
                </div>
              </div>
            </AnimatedSection>
          </div>

          <div data-step="3">
            <AnimatedSection delay={4} direction="right">
              <div className="w-full max-w-7xl mx-auto px-4">
                <Headline
                  text="Final Step"
                  isFirst={false}
                  step="step3"
                />
                <div>
                  <SpeechBubble message="This is step 3 for testing the progress tracker" />
                </div>
                <div className="mt-8 h-[500px] flex items-center justify-center bg-gray-100 rounded-lg">
                  <p className="text-xl text-gray-600">Step 3 Content</p>
                </div>
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => {
                      dispatch(completeStep(3));
                      // Store any necessary state in localStorage or your state management solution
                      localStorage.setItem('bookingProgress', JSON.stringify({ currentStep, completedSteps, progress }));
                      // Navigate to the next phase
                      router.push('/booking/summary');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
                  >
                    Continue to Summary
                  </button>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>

        <div className="pb-32"></div>

        <footer ref={footerRef}>
          <Footer socialLinks={socialLinks} />
        </footer>

        <div
          ref={trackerRef}
          className="fixed bottom-0 left-0 right-0 w-full bg-transparent pointer-events-none transition-all duration-500 ease-in-out will-change-transform"
          style={{ zIndex: 10 }}
        >
          <div className="container mx-auto pointer-events-auto">
            <ProgressTracker
              currentStep={currentStep}
              progress={progress}
            />
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
