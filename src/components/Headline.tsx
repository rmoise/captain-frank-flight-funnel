import React from 'react';
import type { BadgeProps } from '@/types/components';

interface HeadlineProps {
  text: string;
  isFirst?: boolean;
  step: 'step1' | 'step2' | 'step3' | 'step4';
}

export const Headline: React.FC<HeadlineProps> = ({ text, isFirst = false, step }) => {
  return (
    <div className="flex items-center gap-4">
      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${step}-100 text-${step}-800`}>
        Step {step.slice(-1)}
      </div>
      <h2 className={`text-2xl font-bold ${isFirst ? 'text-gray-900' : 'text-gray-700'}`}>
        {text}
      </h2>
    </div>
  );
};