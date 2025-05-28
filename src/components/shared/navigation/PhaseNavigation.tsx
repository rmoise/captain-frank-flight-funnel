"use client";

import React, { useState } from "react";
import { PHASES, Phase, PHASE_TO_URL } from "@/types/shared/phases";
import styles from "./PhaseNavigation.module.css";
import { useStore } from "@/hooks/useStore";
import { getLanguageAwareUrl } from "@/utils/url";
import { PATH_TO_PHASE } from "@/hooks/useNavigation";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { ValidationPhase } from "@/types/shared/validation";
import type { Translations } from "@/translations/types";

interface PhaseState extends Phase {
  accessible: boolean;
}

interface PhaseNavigationProps {
  phase: ValidationPhase;
  translations: {
    title: string;
    description: string;
    back?: string;
    continue?: string;
  };
}

export function PhaseNavigation({ phase, translations }: PhaseNavigationProps) {
  return (
    <div className="mt-8 mb-12">
      {/* Client-side navigation component only, no text */}
      <PhaseNavigationClient phase={phase} />
    </div>
  );
}

// Define the client component with React.memo to prevent unnecessary rerenders
const PhaseNavigationClientComponent = ({
  phase,
}: {
  phase: ValidationPhase;
}) => {
  const [hoveredPhase, setHoveredPhase] = useState<ValidationPhase | null>(
    null
  );
  const pathname = usePathname();

  // Get translations at the top level
  const { t, lang } = useTranslation();

  // Use only what's needed from the store
  const navigation = useStore((state) => state.navigation);
  const validation = useStore((state) => state.validation);
  const phasesCompletedViaContinue = navigation.completedPhases;
  const completedSteps = validation.stepCompleted || {};

  const router = useRouter();

  // Use props if provided, otherwise fallback to computed value from pathname
  const currentPhaseValue = React.useMemo(
    () =>
      phase ??
      (pathname
        ? pathname.includes("/phases/claim-success") ||
          pathname.includes("/phases/claim-rejected")
          ? ValidationPhase.CLAIM_SUCCESS
          : PATH_TO_PHASE[pathname]
          ? Object.values(ValidationPhase)[PATH_TO_PHASE[pathname] - 1]
          : ValidationPhase.INITIAL_ASSESSMENT
        : ValidationPhase.INITIAL_ASSESSMENT),
    [pathname, phase]
  );

  // Use props if provided, otherwise fallback to store value
  const completedPhases = navigation.completedPhases;

  const isPhaseAccessible = React.useCallback(
    (phase: ValidationPhase) => {
      // For phase 5, ALWAYS require phase 4 to be completed AND both steps in phase 4 to be completed
      // This check needs to be first to ensure it's enforced regardless of other conditions
      if (phase === ValidationPhase.CLAIM_SUCCESS) {
        const phase4Completed = completedPhases.includes(
          ValidationPhase.TRIP_EXPERIENCE
        );
        const phase4StepsCompleted =
          completedSteps[ValidationPhase.TRIP_EXPERIENCE] &&
          completedSteps[ValidationPhase.CLAIM_SUCCESS];
        const phase4CompletedViaContinue = phasesCompletedViaContinue.includes(
          ValidationPhase.TRIP_EXPERIENCE
        );
        return (
          phase4Completed &&
          phase4StepsCompleted &&
          validation.stepValidation[ValidationPhase.TRIP_EXPERIENCE] &&
          validation.stepValidation[ValidationPhase.CLAIM_SUCCESS] &&
          phase4CompletedViaContinue
        );
      }

      // Get the highest completed phase
      const highestCompletedPhase = Math.max(
        ...completedPhases.map((p) =>
          Object.values(ValidationPhase).indexOf(p)
        ),
        Object.values(ValidationPhase).indexOf(currentPhaseValue)
      );

      // Allow access to current phase
      if (phase === currentPhaseValue) {
        return true;
      }

      // Allow access to any phase up to the highest completed phase, as long as previous phases were completed via continue
      const phaseIndex = Object.values(ValidationPhase).indexOf(phase);
      if (phaseIndex <= highestCompletedPhase) {
        // For phase 2 and above, check if previous phase was completed via continue
        if (phaseIndex >= 2) {
          const previousPhase = Object.values(ValidationPhase)[phaseIndex - 1];
          return phasesCompletedViaContinue.includes(previousPhase);
        }
        return true;
      }

      return false;
    },
    // Stabilize dependencies by extracting primitive values
    // This helps prevent infinite loops
    [
      currentPhaseValue,
      // Use specific required values instead of entire objects
      JSON.stringify(completedSteps),
      completedPhases.join(","),
      JSON.stringify(validation.stepValidation),
      phasesCompletedViaContinue.join(","),
    ]
  );

  const getBarClassName = React.useCallback(
    (phase: ValidationPhase, accessible: boolean) => {
      const classes: string[] = [];

      // Base class based on phase state
      const phaseIndex = Object.values(ValidationPhase).indexOf(phase);
      const currentIndex =
        Object.values(ValidationPhase).indexOf(currentPhaseValue);

      if (phaseIndex < currentIndex) {
        classes.push(styles.completed);
      } else if (phase === currentPhaseValue) {
        classes.push(styles.active);
      } else {
        classes.push(styles.inactive);
        if (accessible) {
          classes.push(styles.accessible);
        }
      }

      // Add highlight class for hover effect
      if (
        hoveredPhase !== null &&
        accessible &&
        Object.values(ValidationPhase).indexOf(phase) <=
          Object.values(ValidationPhase).indexOf(hoveredPhase)
      ) {
        classes.push(styles.highlight);
      }

      return classes.join(" ");
    },
    [currentPhaseValue, hoveredPhase]
  );

  const getPhaseLabel = React.useCallback(
    (phase: ValidationPhase) => {
      // Define main phases in order (same as in phaseStates)
      const mainPhases = [
        ValidationPhase.INITIAL_ASSESSMENT,
        ValidationPhase.COMPENSATION_ESTIMATE,
        ValidationPhase.FLIGHT_DETAILS,
        ValidationPhase.TRIP_EXPERIENCE,
        ValidationPhase.CLAIM_SUCCESS,
        ValidationPhase.AGREEMENT,
        ValidationPhase.CLAIM_SUBMITTED,
      ];

      // Get the index from the main phases array
      const phaseIndex = mainPhases.findIndex((p) => p === phase) + 1;

      // If phase is not in main phases, return default
      if (phaseIndex === 0) {
        return `Phase ${phase}`;
      }

      // Map phase index to phase name key
      const phaseKeys = {
        1: "initialAssessment", // INITIAL_ASSESSMENT
        2: "summary", // COMPENSATION_ESTIMATE
        3: "flightDetails", // FLIGHT_DETAILS
        4: "tripExperience", // TRIP_EXPERIENCE
        5: "claimSuccess", // CLAIM_SUCCESS
        6: "agreement", // AGREEMENT
        7: "claimSubmitted", // CLAIM_SUBMITTED
      } as const;

      const phaseKey = phaseKeys[phaseIndex as keyof typeof phaseKeys];
      return phaseKey ? t(`phases.names.${phaseKey}`) : `Phase ${phase}`;
    },
    [t]
  );

  const handlePhaseClick = React.useCallback(
    (phase: ValidationPhase, accessible: boolean) => {
      if (accessible) {
        const url = PHASE_TO_URL[phase];
        if (url) {
          router.push(getLanguageAwareUrl(url, lang));
        }
      }
    },
    [router, lang]
  );

  // Pre-calculate phase accessibility to avoid recalculation in render
  const phaseStates = React.useMemo(
    () => {
      // Only use the main navigation phases (1-7) and filter out utility phases
      const mainPhases = [
        ValidationPhase.INITIAL_ASSESSMENT,
        ValidationPhase.COMPENSATION_ESTIMATE,
        ValidationPhase.FLIGHT_DETAILS,
        ValidationPhase.TRIP_EXPERIENCE,
        ValidationPhase.CLAIM_SUCCESS,
        ValidationPhase.AGREEMENT,
        ValidationPhase.CLAIM_SUBMITTED,
      ];

      return mainPhases.map((phase, index) => {
        return {
          id: index + 1,
          name: getPhaseLabel(phase),
          steps: [],
          accessible: isPhaseAccessible(phase),
          phase, // Store the actual phase value for reference
        } as PhaseState & { phase: ValidationPhase };
      });
    },
    [getPhaseLabel, isPhaseAccessible] // Only depend on stable callbacks
  );

  const handleMouseEnter = React.useCallback(
    (phase: ValidationPhase, accessible: boolean) => {
      if (accessible) {
        setHoveredPhase(phase);
      }
    },
    []
  );

  const handleMouseLeave = React.useCallback(() => {
    setHoveredPhase(null);
  }, []);

  return (
    <div className="w-full py-4 mt-8">
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex gap-2">
          {phaseStates.length > 0 ? (
            phaseStates.map(
              (phaseState: PhaseState & { phase: ValidationPhase }) => {
                return (
                  <div
                    key={phaseState.id}
                    className={`flex-1 relative group ${
                      phaseState.accessible
                        ? "cursor-pointer"
                        : "cursor-not-allowed"
                    }`}
                    onClick={() =>
                      handlePhaseClick(phaseState.phase, phaseState.accessible)
                    }
                    onMouseEnter={() =>
                      handleMouseEnter(phaseState.phase, phaseState.accessible)
                    }
                    onMouseLeave={handleMouseLeave}
                  >
                    <div
                      className={getBarClassName(
                        phaseState.phase,
                        phaseState.accessible
                      )}
                    />
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap text-xs text-gray-600">
                      {phaseState.name}
                    </div>
                  </div>
                );
              }
            )
          ) : (
            // Fallback if no phases available
            <div className="w-full h-2 bg-gray-200"></div>
          )}
        </div>
      </div>
    </div>
  );
};

PhaseNavigationClientComponent.displayName = "PhaseNavigationClient";

export const PhaseNavigationClient = React.memo(PhaseNavigationClientComponent);
