'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { PHASES } from '@/constants/phases';

interface FunnelState {
  currentPhase: number;
  isCurrentPhaseComplete: boolean;
}

type FunnelAction =
  | { type: 'NEXT_PHASE' }
  | { type: 'SET_PHASE'; payload: number }
  | { type: 'COMPLETE_CURRENT_PHASE' }
  | { type: 'RESET_PHASE_COMPLETION' };

const initialState: FunnelState = {
  currentPhase: 1,
  isCurrentPhaseComplete: false,
};

const funnelReducer = (state: FunnelState, action: FunnelAction): FunnelState => {
  switch (action.type) {
    case 'NEXT_PHASE':
      const nextPhase = state.currentPhase + 1;
      return {
        currentPhase: nextPhase <= PHASES.length ? nextPhase : state.currentPhase,
        isCurrentPhaseComplete: false, // Reset completion for new phase
      };
    case 'SET_PHASE':
      return {
        ...state,
        currentPhase: action.payload,
        isCurrentPhaseComplete: false,
      };
    case 'COMPLETE_CURRENT_PHASE':
      return {
        ...state,
        isCurrentPhaseComplete: true,
      };
    case 'RESET_PHASE_COMPLETION':
      return {
        ...state,
        isCurrentPhaseComplete: false,
      };
    default:
      return state;
  }
};

const FunnelContext = createContext<{
  state: FunnelState;
  dispatch: React.Dispatch<FunnelAction>;
} | null>(null);

export const FunnelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(funnelReducer, initialState);

  return (
    <FunnelContext.Provider value={{ state, dispatch }}>
      {children}
    </FunnelContext.Provider>
  );
};

export const useFunnel = () => {
  const context = useContext(FunnelContext);
  if (!context) {
    throw new Error('useFunnel must be used within a FunnelProvider');
  }
  return context;
};