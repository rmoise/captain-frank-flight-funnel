import React from 'react';

interface SpeechBubbleProps {
  message: string;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({ message }) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 mb-12">
      <div className="w-[280px] lg:w-[400px] h-auto min-h-[53px] flex items-center gap-3">
        {/* Avatar Circle with Bubble Tail */}
        <div className="w-8 h-[45.50px] relative shrink-0">
          <img
            src="https://ik.imagekit.io/0adjo0tl4/Group%2079.svg?updatedAt=1733655584679"
            alt="Captain Frank Avatar"
            className="w-10 h-10 -left-1 top-[4.50px] absolute"
          />
          <div className="w-8 h-[45.50px] left-0 top-0 absolute">
            <div className="origin-top-left rotate-180 w-[194.50px] h-[259.33px] left-[83.50px] top-[5.50px] absolute">
              <div className="origin-top-left rotate-180 w-[17.58px] h-[20.20px] left-[-55.81px] top-[47.71px] absolute">
                <div className="w-[6.62px] h-2 left-[-11.85px] top-[6.12px] absolute"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Message Bubble */}
        <div className="px-[18px] py-4 bg-gradient-to-b from-white to-[#e8e8e8] rounded-[20px] shadow border flex-col justify-start items-start gap-2.5 inline-flex">
          <div className="self-stretch text-[#464646] text-[15px] font-normal font-['Heebo'] leading-[21px] lg:whitespace-nowrap">
            {message}
          </div>
        </div>
      </div>
    </div>
  );
};
