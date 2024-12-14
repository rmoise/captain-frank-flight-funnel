import React from 'react';

interface SpeechBubbleProps {
  message: string;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({ message }) => {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 mb-12">
      <div className="w-full h-auto min-h-[53px] flex items-end gap-3">
        {/* Avatar Circle with Bubble Tail */}
        <div className="w-12 h-[60px] relative shrink-0 mb-2">
          <img
            src="https://ik.imagekit.io/0adjo0tl4/Group%2079.svg?updatedAt=1733655584679"
            alt="Captain Frank Avatar"
            className="w-14 h-14 -left-1 top-[4.50px] absolute"
          />
        </div>

        {/* Message Bubble */}
        <div className="flex-1 px-8 py-12 bg-gradient-to-b from-white to-[#e8e8e8] rounded-[20px] shadow border">
          <div className="text-[#464646] text-lg font-normal font-['Heebo'] leading-[28px] max-w-[90%] mx-auto">
            {message}
          </div>
        </div>
      </div>
    </div>
  );
};
