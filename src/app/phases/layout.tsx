'use client';

import { Navbar } from '@/components/Navbar';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { WelcomeSection } from '@/components/booking/WelcomeSection';
import { useAppSelector } from '@/store/hooks';

export default function PhasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { selectedFlight, wizardAnswers, personalDetails } = useAppSelector(
    (state) => state.booking
  );

  const canContinue = () => {
    const allStepsCompleted =
      !!selectedFlight &&
      !!wizardAnswers?.length &&
      !!personalDetails?.firstName &&
      !!personalDetails?.lastName &&
      !!personalDetails?.email;
    return allStepsCompleted;
  };

  // Calculate completed phases
  const getCompletedPhases = () => {
    return canContinue() ? [1] : [];
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />
      <WelcomeSection />
      <PhaseNavigation
        currentPhase={1}
        completedPhases={getCompletedPhases()}
      />
      {children}
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