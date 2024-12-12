import React from 'react';
import { Badge } from './Badge';

interface HeadlineProps {
  text: string;
  isFirst?: boolean;
  step?: 'step1' | 'step2' | 'step3' | 'step4';
}

export const Headline: React.FC<HeadlineProps> = ({ text, isFirst = false, step = 'step1' }) => {
  return (
    <div className={`flex flex-col items-center gap-2 ${isFirst ? 'pt-8 lg:pt-24' : ''} mb-6 lg:mb-12`}>
      <Badge label={`Step ${step.charAt(4)}`} variant={step} />
      <div className={`text-[#4b626d] text-[28px] lg:text-4xl font-medium font-['Heebo'] leading-[33.60px] lg:leading-[56.80px] text-center`}>
        {text}
      </div>
    </div>
  );
}; 