'use client';

import { useAppSelector } from '@/store/hooks';
import ClientLayout from '@/components/layouts/ClientLayout';
import { SpeechBubble } from '@/components/SpeechBubble';
import { Headline } from '@/components/Headline';

export default function BookingSummary() {
  const bookingData = useAppSelector((state) => state.booking);

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          <Headline
            text="Booking Summary"
            isFirst={true}
            step="step1"
          />
          <div className="mt-4">
            <SpeechBubble message="Here's a summary of your booking details" />
          </div>

          <div className="mt-8">
            <Headline
              text="Additional Information"
              step="step2"
            />
            <div className="mt-4">
              <SpeechBubble message="Please review all the details carefully" />
            </div>
          </div>

          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(bookingData, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}