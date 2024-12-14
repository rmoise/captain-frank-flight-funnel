import React from 'react';
import { Badge } from './Badge';

interface BadgeProps {
  label: string;
  variant: 'step1' | 'step2' | 'step3' | 'step4';
}

interface HeadlineProps {
  text: string;
  isFirst?: boolean;
  step: 'step1' | 'step2' | 'step3' | 'step4';
}

export const Headline: React.FC<HeadlineProps> = ({ text, isFirst = false, step }) => {
  return (
    <div className="flex items-center gap-4">
      <Badge label={`Step ${step.slice(-1)}`} variant={step} />
      <h2 className={`text-2xl font-bold ${isFirst ? 'text-gray-900' : 'text-gray-700'}`}>
        {text}
      </h2>
    </div>
  );
};