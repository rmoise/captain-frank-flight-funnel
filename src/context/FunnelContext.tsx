'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

type FunnelPhase = 'claim-details' | 'documentation' | 'review' | 'complete';

interface FunnelState {
  currentPhase: FunnelPhase;
  isCurrentPhaseComplete: boolean;
}

type FunnelAction =
  | { type: 'NEXT_PHASE' }
  | { type: 'SET_PHASE'; payload: FunnelPhase }
  | { type: 'COMPLETE_CURRENT_PHASE' }
  | { type: 'RESET_PHASE_COMPLETION' };

const initialState: FunnelState = {
  currentPhase: 'claim-details',
  isCurrentPhaseComplete: false,
};

const funnelReducer = (state: FunnelState, action: FunnelAction): FunnelState => {
  switch (action.type) {
    case 'NEXT_PHASE':
      const phases: FunnelPhase[] = ['claim-details', 'documentation', 'review', 'complete'];
      const currentIndex = phases.indexOf(state.currentPhase);
      return {
        currentPhase: phases[currentIndex + 1] || state.currentPhase,
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