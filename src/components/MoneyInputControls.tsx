import React, { RefObject } from 'react';

interface MoneyInputControlsProps {
  value: string;
  onChange: (value: string) => void;
  containerRef?: RefObject<HTMLDivElement>;
}

export const MoneyInputControls: React.FC<MoneyInputControlsProps> = ({
  value,
  onChange,
  containerRef,
}) => {
  const handleButtonClick = (action: 'increment' | 'decrement' | 'clear') => {
    console.log('=== MoneyInputControls handleButtonClick ===', {
      action,
      currentValue: value,
    });

    switch (action) {
      case 'increment':
        console.log('Sending increment signal');
        onChange('+');
        break;
      case 'decrement':
        console.log('Sending decrement signal');
        onChange('-');
        break;
      case 'clear':
        console.log('Sending clear signal');
        onChange('');
        break;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent the button from stealing focus
    e.preventDefault();
  };

  return (
    <div
      className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2"
      ref={containerRef || null}
    >
      {value && (
        <button
          type="button"
          onClick={() => handleButtonClick('clear')}
          onMouseDown={handleMouseDown}
          className="p-1 bg-white"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 2L10 10M2 10L10 2"
              stroke="#909090"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => handleButtonClick('increment')}
          onMouseDown={handleMouseDown}
          className="p-1 hover:bg-gray-100 rounded cursor-pointer bg-white"
        >
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 5L5 1L9 5"
              stroke="#909090"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => handleButtonClick('decrement')}
          onMouseDown={handleMouseDown}
          className="p-1 hover:bg-gray-100 rounded cursor-pointer bg-white"
        >
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 1L5 5L9 1"
              stroke="#909090"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
