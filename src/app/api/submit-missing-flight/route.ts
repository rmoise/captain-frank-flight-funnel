import { NextResponse } from 'next/server';
import type { FlightNotListedData } from '@/components/booking/FlightNotListedForm';

export async function POST(request: Request) {
  try {
    const data: FlightNotListedData = await request.json();

    // Validate required fields
    if (
      !data.salutation ||
      !data.firstName ||
      !data.lastName ||
      !data.email ||
      !data.description
    ) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // TODO: Add your email service integration here
    // For example, using SendGrid, Mailgun, or AWS SES
    // await sendEmail({
    //   to: 'support@example.com',
    //   subject: 'Missing Flight Report',
    //   body: `
    //     New missing flight report:
    //     Salutation: ${data.salutation}
    //     Name: ${data.firstName} ${data.lastName}
    //     Email: ${data.email}
    //     Description: ${data.description}
    //   `
    // });

    // For now, just log the data
    console.log('Missing flight report received:', data);

    return NextResponse.json(
      { message: 'Flight report submitted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing missing flight submission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
