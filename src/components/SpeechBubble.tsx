'use client';

import React from 'react';
import Image from 'next/image';

interface SpeechBubbleProps {
  message: string;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({ message }) => {
  const paragraphs = message.split('\n').filter((p) => p.trim() !== '');

  return (
    <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 mb-8 sm:mb-12 overflow-x-hidden">
      <div className="w-full h-auto min-h-[53px] flex items-end gap-2 sm:gap-3">
        {/* Avatar Circle with Bubble Tail */}
        <div className="w-10 sm:w-12 h-[50px] sm:h-[60px] relative shrink-0 mb-2">
          <Image
            src="https://ik.imagekit.io/0adjo0tl4/Group%2079.svg"
            alt="Captain Frank Avatar"
            width={56}
            height={56}
            priority
            className="w-10 sm:w-14 h-10 sm:h-14 -left-1 top-[4.50px] absolute"
          />
        </div>

        {/* Message Bubble */}
        <div className="flex-1 px-3 sm:px-8 py-4 sm:py-12 bg-gradient-to-b from-white to-[#e8e8e8] rounded-[20px] shadow border">
          <div className="text-[#464646] text-base sm:text-lg font-normal font-heebo leading-[24px] sm:leading-[28px] w-full sm:max-w-[90%] mx-auto space-y-6">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
