'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';

type ScreenSize = 'mobile' | 'tablet' | 'desktop';

interface GreetingMessage {
  text: string;
  emoji?: string;
  highlight?: boolean;
}

export const WelcomeSection = () => {
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');

  const checkScreenSize = useCallback(() => {
    const width = window.innerWidth;
    if (width <= 768) {
      setScreenSize('mobile');
    } else if (width <= 1024) {
      setScreenSize('tablet');
    } else {
      setScreenSize('desktop');
    }
  }, []);

  useEffect(() => {
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [checkScreenSize]);

  const greetingMessages: GreetingMessage[] = [
    { text: 'Hallo', emoji: '👋' },
    { text: 'ich bin hier, um dir bei', highlight: true },
    { text: 'Flugproblemen zu helfen' },
  ];

  return (
    <div className="w-full relative overflow-hidden">
      {screenSize === 'mobile' || screenSize === 'tablet' ? (
        <svg
          className="absolute top-0 left-0 w-full h-[317px]"
          viewBox="0 0 100 317"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M100 0H0V257H0.0151V306.692C0.779 307.212 1.595 307.85 2.493 308.551C9.511 314.036 21.485 323.393 52.08 310.515C79.684 298.894 95.182 305.673 100.015 310.515V257H100V0Z"
            fill="#F54538"
          />
        </svg>
      ) : (
        <svg
          className="absolute top-0 left-0 w-full h-[400px]"
          viewBox="0 0 1440 400"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M1440 0H0V170V206V352.077C9.77661 353.636 20.2249 355.55 31.7104 357.654C121.543 374.107 274.824 402.18 666.427 363.544C1019.76 328.683 1378.65 349.018 1440.5 363.544V170H1440V0Z"
            fill="#F54538"
          />
        </svg>
      )}

      <div className="w-full h-[317px] lg:h-[400px] flex items-center relative z-10">
        <div className="w-full max-w-7xl mx-auto flex flex-col justify-start items-start gap-6 lg:gap-3 px-4 lg:px-8 lg:-mt-12">
          <div
            className={`flex flex-col w-full ${
              screenSize === 'tablet' ? '-mt-8' : ''
            }`}
          >
            <div className="flex flex-col w-full">
              <div className="w-full flex items-center mb-0 lg:mb-4">
                <div className="w-[124px] h-[120px] relative z-20">
                  <Image
                    src="https://ik.imagekit.io/0adjo0tl4/Mask%20group.svg"
                    alt="Captain Frank"
                    fill
                    priority
                    className="lg:scale-[1.25] object-contain origin-left"
                  />
                </div>
                <div className="flex flex-col ml-4 lg:ml-14 z-10">
                  <div className="text-white text-sm lg:text-lg font-normal leading-tight lg:leading-normal">
                    Chatte mit
                  </div>
                  <div className="text-white text-[28px] sm:text-[34px] lg:text-[41.93px] font-semibold leading-[34px] sm:leading-[40.80px] lg:leading-[50.31px]">
                    Captain
                    {screenSize === 'mobile' ? (
                      ' '
                    ) : (
                      <br className="lg:hidden" />
                    )}
                    &nbsp;Frank
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col md:flex-col gap-1 md:gap-2 md:mt-2 w-full overflow-hidden">
              <div className="flex flex-col md:flex-row items-start gap-2 w-full overflow-hidden">
                <div className="flex flex-wrap items-center shrink-0">
                  <div className="opacity-70 text-white text-[34px] lg:text-[41.93px] font-semibold font-heebo leading-[40.80px] lg:leading-[50.31px] break-words">
                    {greetingMessages[0].text}
                  </div>
                  <div className="text-[#f8f8f8] text-[34px] lg:text-[41.93px] font-normal font-inter leading-[40.80px] lg:leading-[50.31px] ml-2">
                    {greetingMessages[0].emoji}
                  </div>
                </div>
                <div className="w-full overflow-hidden">
                  <span className="text-[#fcc7c3] text-[34px] lg:text-[41.93px] font-semibold font-heebo leading-[40.80px] lg:leading-[50.31px] break-all">
                    {greetingMessages[1].text}
                  </span>
                </div>
              </div>
              <div className="w-full">
                <span className="text-white text-[34px] lg:text-[41.93px] font-semibold font-heebo leading-[40.80px] lg:leading-[50.31px] break-words block">
                  {greetingMessages[2].text}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
