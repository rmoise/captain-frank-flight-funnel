import React from 'react';

interface EyebrowProps {
  text: string;
}

export const Eyebrow: React.FC<EyebrowProps> = ({ text }) => {
  return (
    <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
      {text}
    </div>
  );
};
