import React from 'react';
import { ProgressStep } from './flightAssistant/types';

interface ProgressBarProps {
  steps: ProgressStep[];
  progress: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  steps,
  progress,
}) => {
  return (
    <div className="flex flex-col self-center pt-4 pb-4 mt-11 max-w-full bg-white rounded-lg shadow-sm w-[644px] max-md:mt-10">
      <div className="flex flex-col pb-5 w-full max-md:max-w-full">
        <div className="flex flex-col ml-6 max-w-full font-bold text-center w-[105px] max-md:ml-2.5">
          <div className="gap-2.5 self-start text-xs tracking-wide leading-4 text-neutral-400">
            Your progress
          </div>
          <div className="flex gap-1.5 justify-between items-center w-full text-base leading-7 whitespace-nowrap text-zinc-700">
            <div className="self-stretch my-auto">{progress}%</div>
            <div className="self-stretch my-auto">complete</div>
          </div>
        </div>
        <div className="flex relative flex-col px-6 py-1.5 mt-2.5 w-full max-md:px-5 max-md:max-w-full">
          <div className="flex z-0 max-w-full rounded-[64px] w-[600px]">
            <div
              className="flex z-10 shrink-0 -mr-44 max-w-full h-3 bg-green-200 rounded-[64px]"
              style={{ width: `${progress}%` }}
            />
            <div className="flex shrink-0 max-w-full h-3 bg-zinc-100 rounded-[64px] w-[388px]" />
          </div>
          <div className="flex absolute -right-1.5 z-0 flex-wrap gap-10 h-12 bottom-[-26px] w-[650px]">
            {steps.map((step) => (
              <div
                key={step.id}
                className="flex flex-col flex-1 items-center min-h-[48px]"
              >
                <div
                  className={`flex justify-center items-center px-0.5 w-5 h-5 ${
                    step.isComplete
                      ? 'bg-green-500'
                      : 'bg-white border border-solid border-stone-300'
                  } min-h-[20px] rounded-[64px] ${
                    step.isActive ? 'shadow-[0px_4px_4px_rgba(0,0,0,0.1)]' : ''
                  }`}
                >
                  {step.isComplete && (
                    <img
                      loading="lazy"
                      src="https://cdn.builder.io/api/v1/image/assets/15e77c7c76c740da9eda9e882a44a213/b175e6d455123a5743bd519f7e458e518d61da92883f09d87d5e17e2549d6e38?apiKey=15e77c7c76c740da9eda9e882a44a213&"
                      alt="Completed step indicator"
                      className="object-contain flex-1 shrink w-full aspect-square basis-0"
                    />
                  )}
                </div>
                <div className="text-xs font-medium tracking-wide leading-relaxed text-center text-neutral-500">
                  {step.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
