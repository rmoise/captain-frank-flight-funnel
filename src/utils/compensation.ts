import type { Flight } from '@/types/store';

interface CompensationResult {
  amount: number;
  currency: string;
  reason: string;
}

export const calculateCompensation = (flight: Flight): CompensationResult => {
  const baseAmount = getBaseCompensationAmount(flight);

  return {
    amount: baseAmount,
    currency: 'EUR',
    reason: getCompensationReason(flight),
  };
};

const getBaseCompensationAmount = (flight: Flight): number => {
  const distance = flight.distance || 0;

  if (distance <= 1500) return 250;
  if (distance <= 3500) return 400;
  return 600;
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
