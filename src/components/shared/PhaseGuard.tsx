import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import LoadingSpinner from './LoadingSpinner';

interface PhaseGuardProps {
  children: React.ReactNode;
  requiredPhase: number;
  requiredPreviousPhases?: number[];
}

export default function PhaseGuard({ children, requiredPhase, requiredPreviousPhases = [] }: PhaseGuardProps) {
  const router = useRouter();
  const { currentPhase, completedPhases, selectedFlight, wizardAnswers, personalDetails } = useAppSelector(
    (state) => state.booking
  );
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    // Basic requirements check
    if (!selectedFlight || !wizardAnswers.length || !personalDetails) {
      router.push('/');
      return;
    }

    // Check if user is trying to skip phases
    if (requiredPhase > currentPhase && !completedPhases.includes(requiredPhase - 1)) {
      router.push('/phases/initial-assessment');
      return;
    }

    // Check if all required previous phases are completed
    const missingPhases = requiredPreviousPhases.filter(phase => !completedPhases.includes(phase));
    if (missingPhases.length > 0) {
      router.push(`/phases/${getPhaseRoute(missingPhases[0])}`);
      return;
    }

    setIsLoading(false);
  }, [currentPhase, completedPhases, selectedFlight, wizardAnswers, personalDetails, requiredPhase, requiredPreviousPhases, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return <>{children}</>;
}

function getPhaseRoute(phase: number): string {
  const phaseRoutes: Record<number, string> = {
    1: 'initial-assessment',
    2: 'compensation-estimate',
    3: 'flight-details',
    4: 'trip-experience',
    5: 'claim-eligibility',
    6: 'agreement'
  };
  return phaseRoutes[phase] || 'initial-assessment';
}