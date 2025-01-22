import { useRouter } from 'next/navigation';

interface NavigateToPhaseOptions {
  force?: boolean;
  lang?: string;
}

export const navigateToPhase = (
  phase: number,
  router: ReturnType<typeof useRouter>,
  options: NavigateToPhaseOptions = {}
) => {
  const { force = false, lang } = options;

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

  // Get the current URL path to determine language if not provided
  const currentPath = window.location.pathname;
  const isGermanRoute =
    lang === 'de' || (!lang && currentPath.startsWith('/de/'));
  const langPrefix = isGermanRoute ? '/de' : '';
  const fullRoute = `${langPrefix}${route}`;

  if (force) {
    router.push(fullRoute);
  } else {
    router.replace(fullRoute);
  }
};
