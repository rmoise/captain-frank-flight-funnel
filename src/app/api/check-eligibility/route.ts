import { NextResponse } from 'next/server';

interface Answer {
  questionId: string;
  value: string;
}

export async function POST(request: Request) {
  try {
    const { answers, flightDetails } = await request.json();

    // Get all relevant answers
    const delayDuration = answers.find(
      (a: Answer) => a.questionId === 'delay_duration'
    );
    const cancellationNotice = answers.find(
      (a: Answer) => a.questionId === 'cancellation_notice'
    );
    const whatHappened = answers.find(
      (a: Answer) => a.questionId === 'what_happened'
    );
    const informedDate = answers.find(
      (a: Answer) => a.questionId === 'informed_date'
    );

    // Check eligibility based on what happened
    let isEligible = false;
    let compensationAmount = 0;

    // Get compensation amount from API if we have flight details
    if (flightDetails) {
      try {
        const response = await fetch(
          `/api/calculatecompensationbyfromiatatoiata?from_iata=${flightDetails.departure}&to_iata=${flightDetails.arrival}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          compensationAmount = data.amount;
        }
      } catch (error) {
        console.error('Error fetching compensation amount:', error);
      }
    }

    switch (whatHappened?.value) {
      case 'delayed':
        // Flight delay over 3 hours
        isEligible = delayDuration?.value === '>3';
        if (!isEligible) compensationAmount = 0;
        break;

      case 'cancelled':
        // Flight cancelled with less than 14 days notice
        isEligible =
          cancellationNotice?.value === 'none' ||
          cancellationNotice?.value === '0-7';
        if (!isEligible) compensationAmount = 0;

        // If cancelled with 7-14 days notice, compensation is reduced by 50%
        if (isEligible && cancellationNotice?.value === '7-14') {
          compensationAmount = Math.floor(compensationAmount * 0.5);
        }
        break;

      case 'overbooked':
        // Overbooked flights are eligible for full compensation
        isEligible = true;
        break;

      case 'missed-connection':
        // Missed connection due to delay of first flight
        isEligible = delayDuration?.value === '>3';
        if (!isEligible) compensationAmount = 0;
        break;

      default:
        isEligible = false;
        compensationAmount = 0;
    }

    // Additional checks based on informed date
    if (isEligible && informedDate?.value) {
      // If specific date was chosen, check if it's within the last 3 years
      if (informedDate.value !== 'on_departure') {
        const informedDateObj = new Date(informedDate.value);
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

        if (informedDateObj < threeYearsAgo) {
          isEligible = false;
          compensationAmount = 0;
        }
      }
    }

    return NextResponse.json({
      isEligible,
      compensationAmount,
      message: isEligible
        ? 'Your claim is eligible for compensation.'
        : 'Your claim does not meet the eligibility criteria.',
    });
  } catch (error) {
    console.error('Error checking eligibility:', error);
    return NextResponse.json(
      { error: 'Failed to check eligibility' },
      { status: 500 }
    );
  }
}
