import { useRouter, usePathname } from "next/navigation";
import useStore from "@/store";
import { useEffect } from "react";
import { ValidationPhase } from "@/types/shared/validation";

const PHASE_PATHS = {
  1: "/phases/initial-assessment",
  2: "/phases/compensation-estimate",
  3: "/phases/flight-details",
  4: "/phases/trip-experience",
  5: "/phases/claim-success",
  "claim-rejected": "/phases/claim-rejected",
  6: "/phases/agreement",
  7: "/phases/claim-submitted",
} as const;

export const PATH_TO_PHASE: { [key: string]: number } = {
  "/phases/initial-assessment": 1,
  "/phases/compensation-estimate": 2,
  "/phases/flight-details": 3,
  "/phases/trip-experience": 4,
  "/phases/claim-success": 5,
  "/phases/claim-rejected": 5,
  "/phases/agreement": 6,
  "/phases/claim-submitted": 7,
};

export type PhaseType = keyof typeof PHASE_PATHS;

export function useNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { navigation, actions } = useStore();
  const { currentPhase, completedPhases } = navigation;

  // Sync URL with phase
  useEffect(() => {
    if (!pathname) return;

    // Extract the base path without language prefix
    const basePath = pathname.replace(/^\/de/, "");
    const phaseNumber = PATH_TO_PHASE[basePath] || PATH_TO_PHASE[pathname];

    if (phaseNumber && typeof phaseNumber === "number") {
      // Convert phase number to ValidationPhase enum
      const phase = Object.values(ValidationPhase)[phaseNumber - 1];
      if (phase && phase !== currentPhase) {
        actions.navigation.setCurrentPhase(phase);
      }
    }
  }, [pathname, currentPhase, actions.navigation]);

  // Prevent accessing future phases without completing previous ones
  useEffect(() => {
    if (!pathname) return;

    // Extract the base path without language prefix
    const basePath = pathname.replace(/^\/de/, "");
    const phaseNumber = PATH_TO_PHASE[basePath] || PATH_TO_PHASE[pathname];

    if (phaseNumber && typeof phaseNumber === "number") {
      // Check if all previous phases are completed
      const previousPhases = Array.from(
        { length: phaseNumber - 1 },
        (_, i) => i + 1
      );
      const canAccessPhase = previousPhases.every((p) => {
        const phase = Object.values(ValidationPhase)[p - 1];
        return completedPhases.includes(phase);
      });

      if (!canAccessPhase) {
        // Redirect to the last completed phase or phase 1
        const lastCompletedPhaseIndex = Math.max(
          0,
          ...completedPhases.map((phase) =>
            Object.values(ValidationPhase).indexOf(phase)
          )
        );
        const redirectPhaseNumber = lastCompletedPhaseIndex + 1 || 1;
        const isGermanRoute = pathname.startsWith("/de/");
        const langPrefix = isGermanRoute ? "/de" : "";
        const baseUrl =
          PHASE_PATHS[redirectPhaseNumber as keyof typeof PHASE_PATHS];
        router.replace(`${langPrefix}${baseUrl}`);
      }
    }
  }, [pathname, completedPhases, router]);

  return {
    currentPhase,
    completedPhases,
    validationState: useStore((state) => state.validation),
  };
}
