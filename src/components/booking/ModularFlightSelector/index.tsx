import React, { useCallback, useEffect } from 'react';
import { useStore } from '@/lib/state/store';
import { usePhase4Store } from '@/lib/state/phase4Store';
import { useFlightStore } from '@/lib/state/flightStore';
import { useTranslation } from '@/hooks/useTranslation';
import { FlightTypeSelector } from '@/components/shared/FlightTypeSelector';
import { FlightSegments } from './FlightSegments';
import { useFlightValidation } from '@/hooks/useFlightValidation';
import type { FlightSelectorProps } from './types';
import type { Translations } from '@/translations/types';
import { useAccordion } from '@/components/shared/AccordionContext';

type FlightType = 'direct' | 'multi';

const DEFAULT_TRANSLATIONS = {
  direct: 'Direct Flight',
  multi: 'Multiple Flights',
};

const getFlightTypes = (translations: Translations | null) => {
  const flightTypes =
    translations?.flightSelector?.types || DEFAULT_TRANSLATIONS;
  return [
    { id: 'direct' as const, label: flightTypes.direct },
    { id: 'multi' as const, label: flightTypes.multi },
  ] as const;
};

export const ModularFlightSelector: React.FC<FlightSelectorProps> = ({
  showFlightSearch,
  showFlightDetails,
  currentPhase,
  disabled,
  stepNumber,
  setValidationState,
  onSelect,
  onInteract = () => {},
}) => {
  const mainStore = useStore();
  const phase4Store = usePhase4Store();
  const flightStore = useFlightStore();
  const { t } = useTranslation();
  const { autoTransition } = useAccordion();

  // Get current segments and type from the appropriate store
  const segments =
    currentPhase === 4
      ? phase4Store?.flightSegments
      : mainStore?.flightSegments || [];
  const selectedType =
    currentPhase === 4
      ? phase4Store?.selectedType
      : mainStore?.selectedType || 'direct';

  // Use our new validation hook
  const { validate } = useFlightValidation({
    selectedType,
    segments,
    phase: currentPhase,
    stepNumber,
    setValidationState,
    validateOnMount: true,
  });

  // Effect to handle auto-transition when validation state changes
  useEffect(() => {
    if (mainStore?.validationState?.stepValidation?.[1] && stepNumber === 1) {
      setTimeout(() => {
        autoTransition('2', true);
      }, 100);
    }
  }, [mainStore?.validationState?.stepValidation, stepNumber, autoTransition]);

  // Initialize flight segments if not set
  useEffect(() => {
    if (
      currentPhase !== 4 &&
      !mainStore?.flightSegments?.length &&
      mainStore?.initializeStore
    ) {
      mainStore.initializeStore();
    } else if (currentPhase === 4 && !phase4Store?.flightSegments?.length) {
      phase4Store.batchUpdate({
        selectedFlight: null,
        selectedFlights: [],
        fromLocation: null,
        toLocation: null,
        flightSegments: [
          {
            fromLocation: null,
            toLocation: null,
            selectedFlight: null,
            date: null,
          },
        ],
        selectedType: 'direct',
      });
    }
  }, [mainStore, phase4Store, currentPhase]);

  const handleFlightTypeChange = useCallback(
    (type: FlightType) => {
      // Initialize segments based on type
      const newSegments =
        type === 'direct'
          ? [
              {
                fromLocation: null,
                toLocation: null,
                selectedFlight: null,
                date: null,
              },
            ]
          : [
              {
                fromLocation: null,
                toLocation: null,
                selectedFlight: null,
                date: null,
              },
              {
                fromLocation: null,
                toLocation: null,
                selectedFlight: null,
                date: null,
              },
            ];

      // Clear all stores in a synchronized way
      if (currentPhase === 4) {
        // First update phase4Store
        phase4Store.batchUpdate({
          selectedFlight: null,
          selectedFlights: [],
          fromLocation: null,
          toLocation: null,
          flightSegments: newSegments,
          selectedType: type,
          _lastUpdate: Date.now(),
        });
      } else {
        if (!mainStore?.batchUpdateWizardState) return;

        // First update mainStore
        mainStore.batchUpdateWizardState({
          selectedType: type,
          flightSegments: newSegments,
          selectedFlight: null,
          selectedFlights: [],
          _lastUpdate: Date.now(),
        });
      }

      // Then update flightStore to ensure synchronization
      flightStore.setSelectedFlights([]);

      // Update localStorage to reflect the type change
      if (typeof window !== 'undefined') {
        const currentPhaseStr = localStorage.getItem('currentPhase');
        if (currentPhaseStr) {
          const phaseKey = `phase${currentPhaseStr}FlightData`;
          const existingData = localStorage.getItem(phaseKey);
          const phaseData = existingData ? JSON.parse(existingData) : {};

          localStorage.setItem(
            phaseKey,
            JSON.stringify({
              ...phaseData,
              selectedType: type,
              flightSegments: newSegments,
              selectedFlights: [],
              timestamp: Date.now(),
            })
          );
        }
      }

      // Trigger validation
      validate();

      // Notify parent
      onInteract();
    },
    [currentPhase, mainStore, phase4Store, flightStore, validate, onInteract]
  );

  // Early return if stores are not initialized
  if (currentPhase === 4 && !phase4Store) return null;
  if (currentPhase !== 4 && !mainStore?.batchUpdateWizardState) return null;

  // Get translations and types
  const types = getFlightTypes(t as Translations | null);

  return (
    <div className="space-y-8">
      <FlightTypeSelector
        types={types}
        selectedType={selectedType}
        onTypeSelect={handleFlightTypeChange}
        disabled={disabled}
      />
      <FlightSegments
        showFlightSearch={showFlightSearch}
        showFlightDetails={showFlightDetails}
        currentPhase={currentPhase}
        disabled={disabled}
        stepNumber={stepNumber}
        setValidationState={setValidationState}
        onSelect={onSelect}
        onInteract={onInteract}
      />
    </div>
  );
};
