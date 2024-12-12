import React from 'react';
import { FlightOption } from '@/types';

interface FlightOptionCardProps {
  option: FlightOption;
}

export const FlightOptionCard: React.FC<FlightOptionCardProps> = ({
  option,
}) => {
  return (
    <div className="w-[90%] max-w-[589px] h-[169px] relative">
      <div className="w-full h-[169px] left-0 top-0 absolute">
        <div className="w-full h-[169px] left-0 top-0 absolute bg-[#eceef1] rounded-[10px] border" />
        <div className="left-[16px] top-[61px] absolute text-[#121212] text-xl font-bold font-['Heebo']">
          {option.title}
        </div>
        <div className="w-[161.23px] h-[87.16px] absolute right-4 lg:right-auto lg:left-[407px] top-[54px]">
          <img
            loading="lazy"
            src={option.icon}
            alt={`${option.title} illustration`}
            className="w-full h-full object-contain"
          />
        </div>
      </div>
      <div className="w-7 h-[29px] left-[1px] top-[16px] absolute rounded-tl-[9px] rounded-br-[5px]" />
      <div className="w-4 h-4 left-[8px] top-[8px] absolute bg-white rounded-lg border border-[#d5d6da]" />
    </div>
  );
};
