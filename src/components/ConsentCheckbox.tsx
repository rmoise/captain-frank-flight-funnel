import React from 'react';
import { ConsentItem } from '@/types';

interface ConsentCheckboxProps {
  item: ConsentItem;
}

export const ConsentCheckbox: React.FC<ConsentCheckboxProps> = ({ item }) => {
  return (
    <div className="flex flex-wrap gap-4 justify-center items-center p-4 w-full text-sm leading-5 text-black bg-white rounded-lg border border-gray-200 border-solid max-md:max-w-full">
      <div className="flex shrink-0 self-stretch my-auto w-4 h-4 bg-white rounded-lg border border-solid border-zinc-300" />
      <div className="flex flex-1 shrink gap-4 items-start self-stretch my-auto basis-0 min-w-[240px] max-md:max-w-full">
        <div className="flex-1 shrink w-full underline decoration-auto decoration-solid min-w-[240px] underline-offset-auto max-md:max-w-full">
          <span className="text-xs font-medium leading-6 text-black">
            {item.text}{' '}
          </span>
          <a
            href={item.link}
            className="text-xs font-medium leading-6 text-black underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {item.linkText}
          </a>
          <span className="text-xs font-medium leading-6 text-black">
            {' '}
            and agree to them.
          </span>
        </div>
      </div>
    </div>
  );
};
