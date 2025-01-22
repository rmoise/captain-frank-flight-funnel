import type { Flight } from '@/types/store';

export interface AlternativeOption {
  type: 'airline' | 'self';
  description: string;
}

export const getAlternativeOptions = (): AlternativeOption[] => {
  return [
    {
      type: 'airline',
      description: 'Alternative flight provided by airline',
    },
    {
      type: 'self',
      description: 'Self-booked alternative flight',
    },
  ];
};

export const getRejectionReason = (code: string): string => {
  const reasons: Record<string, string> = {
    extraordinaryCircumstances: 'Extraordinary circumstances',
    shortDelay: 'Delay was too short',
    nonEUFlight: 'Flight not covered by EU regulations',
    timeLimitExceeded: 'Time limit exceeded',
  };

  return reasons[code] || 'Unknown reason';
};

export const getFlightIssueDetails = (flight: Flight) => {
  return {
    issueType: flight.issueType || 'unknown',
    description: flight.issueDescription || '',
    severity: flight.issueSeverity || 'low',
  };
};
