'use client';

import React from 'react';

interface BadgeProps {
  text: string;
  variant?: 'step1' | 'step2' | 'step3' | 'step4' | 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  step1: {
    bg: 'bg-[#ebfdf2]',
    text: 'text-[#027947]',
  },
  step2: {
    bg: 'bg-[#fff4eb]',
    text: 'text-[#c05717]',
  },
  step3: {
    bg: 'bg-[#ebf3fd]',
    text: 'text-[#0254c0]',
  },
  step4: {
    bg: 'bg-[#f7ebfd]',
    text: 'text-[#7502c0]',
  },
  default: {
    bg: 'bg-gray-100',
    text: 'text-gray-800'
  },
  success: {
    bg: 'bg-green-100',
    text: 'text-green-800'
  },
  warning: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800'
  },
  error: {
    bg: 'bg-red-100',
    text: 'text-red-800'
  }
};

const sizes = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-base'
};

export function Badge({ text, variant = 'default', size = 'md' }: BadgeProps) {
  // Fallback to default if variant doesn't exist
  const variantStyles = variants[variant] || variants.default;
  const sizeStyles = sizes[size];

  return (
    <div className="h-[22px] mix-blend-multiply justify-start items-start inline-flex">
      <div className={`px-2 py-0.5 ${variantStyles.bg} rounded-2xl justify-center items-center flex`}>
        <div className={`text-center ${variantStyles.text} text-xs font-medium font-['Heebo'] leading-[18px]`}>
          {text}
        </div>
      </div>
    </div>
  );
}