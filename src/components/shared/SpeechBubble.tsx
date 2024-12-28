import React from 'react';

interface SpeechBubbleProps {
  message: string;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({ message }) => {
  return (
    <div className="relative bg-white rounded-lg shadow-sm p-6">
      <div className="absolute -top-2 left-8 w-4 h-4 bg-white transform rotate-45" />
      <p className="text-gray-800">{message}</p>
    </div>
  );
};
