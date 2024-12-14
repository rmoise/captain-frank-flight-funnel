'use client';

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setStep,
  setSelectedFlight,
  setWizardAnswers,
  setPersonalDetails,
  completeStep,
} from '@/store/slices/bookingSlice';
import FlightSelector from '@/components/booking/FlightSelector';
import { QAWizard } from '@/components/wizard/QAWizard';
import { useSteps } from '@/context/StepsContext';
import ProgressTracker from '@/components/booking/ProgressTracker';
import WelcomeSection from '@/components/booking/WelcomeSection';
import { wizardQuestions } from '@/constants/wizardQuestions';
import { Navbar } from '@/components/Navbar';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { PersonalDetailsForm } from '@/components/forms/PersonalDetailsForm';
import { ConsentCheckbox } from '@/components/ConsentCheckbox';
import { AccordionCard } from '@/components/shared/AccordionCard';

export default function Home() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((state) => state.booking);
  const {
    currentStep,
    selectedFlight,
    wizardAnswers,
    completedSteps,
    personalDetails,
  } = state;
  const { registerStep } = useSteps();
  const [interactedSteps, setInteractedSteps] = useState<number[]>([]);

  const handleStepInteraction = (stepId: number) => {
    setInteractedSteps(prev => Array.from(new Set([...prev, stepId])));
  };

  // Define steps configuration
  const STEPS = [
    {
      id: 1,
      name: 'FlightSelector',
      title: 'Tell us about your flight',
      component: FlightSelector,
      props: {
        onSelect: (flight: any) => {
          dispatch(setSelectedFlight(flight));
          dispatch(completeStep(1));
        },
        onInteract: () => handleStepInteraction(1),
      },
      getSummary: (state: any) => state.selectedFlight ?
        `${state.selectedFlight.flightNumber} • ${state.selectedFlight.departureCity} → ${state.selectedFlight.arrivalCity}` : '',
    },
    {
      id: 2,
      name: 'QAWizard',
      title: 'What happened with your flight?',
      component: QAWizard,
      props: {
        questions: wizardQuestions,
        onComplete: (answers: any) => {
          dispatch(setWizardAnswers(answers));
          dispatch(completeStep(2));
        },
        onInteract: () => handleStepInteraction(2),
      },
      getSummary: (state: any) => state.wizardAnswers?.length ?
        `${state.wizardAnswers.length} questions answered` : '',
    },
    {
      id: 3,
      name: 'PersonalDetails',
      title: 'Personal Details',
      component: PersonalDetailsForm,
      props: {
        onComplete: (details: any) => {
          dispatch(setPersonalDetails(details));
          dispatch(completeStep(3));
        },
        onInteract: () => handleStepInteraction(3),
      },
      getSummary: (state: any) => state.personalDetails ?
        `${state.personalDetails.firstName} ${state.personalDetails.lastName} • ${state.personalDetails.email}` : '',
      shouldStayOpen: true,
    },
  ] as const;

  const canContinue = () => {
    const allStepsCompleted =
      !!selectedFlight && !!wizardAnswers?.length && !!personalDetails;
    return allStepsCompleted;
  };

  const handleStepChange = () => {
    if (!canContinue()) return;
    dispatch(setStep(currentStep + 1));
  };

  const handleBack = () => {
    dispatch(setStep(currentStep - 1));
  };

  // Register steps on mount
  useEffect(() => {
    STEPS.forEach((step) => {
      registerStep(step.name, step.id);
    });
  }, [registerStep]);

  // Define phases and their corresponding steps
  const PHASES = [
    { id: 1, name: 'Initial Details', steps: [1] },
    { id: 2, name: 'Flight Details', steps: [2] },
    { id: 3, name: 'Personal Info', steps: [3] },
    { id: 4, name: 'Documentation', steps: [] },
    { id: 5, name: 'Review', steps: [] },
    { id: 6, name: 'Complete', steps: [] },
  ];

  // Calculate current phase based on current step
  const getCurrentPhase = () => {
    for (let i = 0; i < PHASES.length; i++) {
      const phase = PHASES[i];
      if (phase.steps.includes(currentStep)) {
        return i + 1;
      }
    }
    return 1; // Default to first phase
  };

  // Calculate completed phases based on completed steps
  const getCompletedPhases = () => {
    const currentPhase = getCurrentPhase();
    return Array.from({ length: currentPhase - 1 }, (_, i) => i + 1);
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />
      <WelcomeSection />

      <PhaseNavigation
        currentPhase={getCurrentPhase()}
        completedPhases={getCompletedPhases()}
      />

      <div className="max-w-5xl mx-auto px-4 py-4">
        <ProgressTracker currentStep={currentStep} />
      </div>

      <main className="max-w-3xl mx-auto px-4 pt-4 pb-8">
        <div className="space-y-4">
          {/* Captain Frank Avatar with Speech Bubble */}
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14">
                <img
                  src="https://ik.imagekit.io/0adjo0tl4/Group%2079.svg?updatedAt=1733655584679"
                  alt="Captain Frank"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-gray-900 font-bold text-lg">
                  Captain Frank
                </span>
                <span className="text-gray-500 text-sm">
                  Your Flight Compensation Expert
                </span>
              </div>
            </div>

            {/* Speech Bubble */}
            <div className="relative max-w-[500px] ml-[68px]">
              <div className="bg-gradient-to-b from-white to-[#e8e8e8] rounded-[20px] p-4 shadow border">
                <div className="text-[#464646] text-[15px] font-normal font-['Heebo'] leading-[21px]">
                  Hi, my name is Captain Frank and I&apos;m dealing with your
                  flight disaster. So that I can give you a free initial
                  assessment of your possible claim, please answer three
                  questions.
                </div>
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div className="h-4"></div>

          {/* Step Cards */}
          {STEPS.map((step) => {
            const StepComponent = step.component;
            const hasInteracted = interactedSteps.includes(step.id);
            const isCompleted = completedSteps.includes(step.id);

            return (
              <AccordionCard
                key={step.id}
                className={step.id === 1 ? '-mt-2' : 'mt-6'}
                isCompleted={isCompleted}
                isActive={currentStep === step.id}
                title={step.title}
                eyebrow={`Step ${step.id}`}
                summary={step.getSummary(state)}
                shouldStayOpen={step.shouldStayOpen}
                hasInteracted={hasInteracted}
              >
                <div className="[&>section]:!p-0 [&>section]:!pb-0 [&>section]:!m-0">
                  <StepComponent {...step.props} />
                </div>
              </AccordionCard>
            );
          })}

          {/* Consent Checkboxes */}
          <div className="space-y-4 mt-6">
            <ConsentCheckbox
              text="I agree to the"
              linkText="Terms and Conditions"
              link="/terms"
              required={true}
            />
            <ConsentCheckbox
              text="I agree to the"
              linkText="Privacy Policy"
              link="/privacy"
              required={true}
            />
            <ConsentCheckbox
              text="I agree to receive marketing communications about"
              linkText="Captain Frank's services"
              link="/services"
            />
          </div>

          {/* Navigation */}
          <div className="flex justify-end items-center gap-4">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`w-[160px] px-12 py-4 rounded-lg transition-colors ${
                currentStep === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-[#F54538] hover:bg-[#F54538]/10'
              }`}
            >
              Back
            </button>
            <button
              onClick={handleStepChange}
              disabled={!canContinue()}
              className={`w-[160px] px-12 py-4 rounded-lg transition-colors ${
                canContinue()
                  ? 'bg-[#F54538] hover:bg-[#E03F33] text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="text-sm text-gray-500">
            {new Date().getFullYear()} Captain Frank. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
