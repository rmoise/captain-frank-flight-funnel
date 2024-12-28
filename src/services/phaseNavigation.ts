import { useRouter } from 'next/navigation';

interface NavigateToPhaseOptions {
  force?: boolean;
}

export const navigateToPhase = (
  phase: number,
  router: ReturnType<typeof useRouter>,
  options: NavigateToPhaseOptions = {}
) => {
  const { force = false } = options;

  // Map phase numbers to their corresponding routes
  const phaseRoutes: Record<number, string> = {
    1: '/phases/initial-assessment',
    2: '/phases/compensation-estimate',
    3: '/phases/flight-details',
    4: '/phases/trip-experience',
    5: '/phases/claim-success',
    6: '/phases/agreement',
  };

  const route = phaseRoutes[phase];
  if (!route) {
    console.error(`Invalid phase number: ${phase}`);
    return;
  }

  if (force) {
    router.push(route);
  } else {
    router.replace(route);
  }
};
