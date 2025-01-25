import type { Flight } from '@/types/store';

interface CompensationResult {
  amount: number;
  currency: string;
  reason: string;
}

export const calculateCompensation = (
  flights: Flight | Flight[]
): CompensationResult => {
  const flightArray = Array.isArray(flights) ? flights : [flights];
  const firstFlight = flightArray[0];

  return {
    amount: 0, // Will be set by API
    currency: 'EUR',
    reason: getCompensationReason(firstFlight),
  };
};

const getCompensationReason = (flight: Flight): string => {
  return flight.issueType === 'delay'
    ? 'Flight delay compensation under EU261'
    : 'Flight cancellation compensation under EU261';
};

export const getNextSteps = (): Array<{
  title: string;
  description: string;
}> => {
  return [
    {
      title: 'Submit Claim',
      description: 'Submit your claim to the airline',
    },
    {
      title: 'Wait for Response',
      description: 'The airline will review your claim',
    },
    {
      title: 'Receive Compensation',
      description: 'If approved, you will receive your compensation',
    },
  ];
};
