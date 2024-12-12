'use client';

import { useFunnel } from '@/context/FunnelContext';

export const ContinueButton = () => {
  const { state, dispatch } = useFunnel();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => dispatch({ type: 'NEXT_PHASE' })}
          disabled={!state.isCurrentPhaseComplete}
          className={`
            w-full md:w-auto px-8 py-3 rounded-lg transition-colors
            ${state.isCurrentPhaseComplete
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Continue to Next Phase
        </button>
      </div>
    </div>
  );
};