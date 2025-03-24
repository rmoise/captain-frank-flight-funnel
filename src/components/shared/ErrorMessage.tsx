import React from 'react';

interface ErrorMessageProps {
  title: string;
  message: string;
  buttonText: string;
  onButtonClick: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title,
  message,
  buttonText,
  onButtonClick,
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-[#FEF2F2] rounded-lg border border-[#F54538] text-center">
      <h1 className="text-2xl font-bold text-[#F54538] mb-6">{title}</h1>
      <p className="text-[#991B1B] mb-8">{message}</p>
      <div className="flex justify-center">
        <button
          onClick={onButtonClick}
          className="bg-[#F54538] text-white py-3 px-8 rounded hover:bg-[#E03F33] transition-colors"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};
