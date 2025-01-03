import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '@/lib/state/store';
import { useEffect } from 'react';

const PHASE_PATHS = {
  1: '/phases/initial-assessment',
  2: '/phases/compensation-estimate',
  3: '/phases/flight-details',
  4: '/phases/trip-experience',
  5: '/phases/agreement',
  success: '/phases/claim-success',
  rejected: '/phases/claim-rejected',
  submitted: '/phases/claim-submitted',
} as const;

const PATH_TO_PHASE: { [key: string]: number | string } = {
  '/phases/initial-assessment': 1,
  '/phases/compensation-estimate': 2,
  '/phases/flight-details': 3,
  '/phases/trip-experience': 4,
  '/phases/agreement': 5,
  '/phases/claim-success': 'success',
  '/phases/claim-rejected': 'rejected',
  '/phases/claim-submitted': 'submitted',
};

export type PhaseType = keyof typeof PHASE_PATHS;

export function useNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentPhase, completedPhases, setCurrentPhase, validationState } =
    useStore();

  // Sync URL with phase
  useEffect(() => {
    if (!pathname) return;
    const phase = PATH_TO_PHASE[pathname];
    if (phase && typeof phase === 'number' && phase !== currentPhase) {
      setCurrentPhase(phase);
    }
  }, [pathname, currentPhase, setCurrentPhase]);

  // Prevent accessing future phases without completing previous ones
  useEffect(() => {
    if (!pathname) return;
    const phase = PATH_TO_PHASE[pathname];
    if (phase && typeof phase === 'number') {
      // Check if all previous phases are completed
      const previousPhases = Array.from({ length: phase - 1 }, (_, i) => i + 1);
      const canAccessPhase = previousPhases.every((p) =>
        completedPhases.includes(p)
      );

      if (!canAccessPhase) {
        // Redirect to the last completed phase or phase 1
        const lastCompletedPhase = Math.max(0, ...completedPhases);
        const redirectPhase = lastCompletedPhase || 1;
        router.replace(PHASE_PATHS[redirectPhase as keyof typeof PHASE_PATHS]);
      }
    }
  }, [pathname, completedPhases, router]);

  return {
    currentPhase,
    completedPhases,
    validationState,
  };
}
