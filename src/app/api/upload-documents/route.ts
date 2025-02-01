import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const bookingConfirmation = formData.get('bookingConfirmation') as File;
    const cancellationNotification = formData.get(
      'cancellationNotification'
    ) as File;
    const claimId = formData.get('claimId') as string;

    if (!bookingConfirmation) {
      return NextResponse.json(
        { error: 'Booking confirmation is required' },
        { status: 400 }
      );
    }

    if (!claimId) {
      return NextResponse.json(
        { error: 'Claim ID is required' },
        { status: 400 }
      );
    }

    // TODO: Implement actual file upload to storage service
    // For now, we'll just simulate a successful upload
    console.log('Uploading documents for claim:', claimId);
    console.log('Booking confirmation:', bookingConfirmation.name);
    if (cancellationNotification) {
      console.log('Cancellation notification:', cancellationNotification.name);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error uploading documents:', error);
    return NextResponse.json(
      { error: 'Failed to upload documents' },
      { status: 500 }
    );
  }
}
