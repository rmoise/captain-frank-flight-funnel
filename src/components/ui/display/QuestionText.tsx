import React from 'react';

interface QuestionTextProps {
  text: string;
  className?: string;
}

export const QuestionText: React.FC<QuestionTextProps> = ({
  text,
  className = '',
}) => {
  return (
    <h3 className={`text-xl font-medium text-gray-900 ${className}`}>
      {text}
    </h3>
  );
};