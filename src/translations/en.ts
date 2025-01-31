import type { Translations } from './types';

export const en: Translations = {
  lang: 'en',
  common: {
    next: 'Next',
    back: 'Back',
    submit: 'Submit',
    cancel: 'Cancel',
    continue: 'Continue',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    dateFormat: 'DD.MM.YYYY',
    enterAmount: 'Enter amount',
    noResults: 'No results found',
    required: 'Required field',
    enterMinChars: 'Please enter at least 3 characters',
  },
  salutation: {
    label: 'Salutation',
    mr: 'Mr.',
    mrs: 'Mrs./Ms.',
  },
  welcome: {
    greeting: 'Hi there',
    introduction: "I'm here to help with",
    purpose: 'Flight Issues',
    chatWith: 'Chat with',
    captainAlt: 'Captain Frank',
  },
  qa: {
    title: 'Frequently Asked Questions',
    description:
      'Find answers to common questions about flight compensation claims',
    questions: {
      flightIssue: 'What types of flight issues are eligible for compensation?',
      delayDuration:
        'How long does my flight need to be delayed to claim compensation?',
      compensation: 'How much compensation can I receive?',
      documentation: 'What documents do I need to make a claim?',
      process: 'How does the claims process work?',
      timeline: 'How long does it take to receive compensation?',
      requirements: 'What are the requirements for filing a claim?',
      success: 'What are my chances of success?',
    },
    answers: {
      flightIssue:
        'You may be eligible for compensation if your flight was cancelled, delayed for more than 3 hours, or if you were denied boarding due to overbooking.',
      delayDuration:
        'For EU flights, delays of 3 hours or more at your final destination may qualify for compensation. The exact duration can vary based on your specific circumstances.',
      compensation:
        'Compensation amounts typically range from €250 to €600, depending on the flight distance and the nature of the disruption.',
      documentation:
        "You'll need your booking confirmation, boarding passes (if available), and any communication from the airline about the disruption.",
      process:
        'Our process is simple: we gather your flight details, verify your claim, handle all communication with the airline, and secure your compensation.',
      timeline:
        'While simple cases may be resolved in a few weeks, complex cases can take several months. We work to process claims as quickly as possible.',
      requirements:
        'Your flight must either depart from the EU or be operated by an EU carrier flying to the EU, and the delay must not be due to extraordinary circumstances.',
      success:
        'Success rates vary depending on the specific circumstances of your case. We only proceed with claims that have a good chance of success.',
    },
  },
  wizard: {
    questions: {
      issueType: {
        text: 'What type of problem did you have?',
        options: {
          delay: 'Delayed flight',
          cancel: 'Cancelled flight',
          missed: 'Missed connecting flight',
          other: 'Other problem',
        },
      },
      delayDuration: {
        text: 'How long was your flight delayed?',
        options: {
          lessThan2: 'Less than 2 hours',
          between2And3: '2-3 hours',
          moreThan3: 'More than 3 hours',
        },
      },
      cancellationNotice: {
        text: 'When were you informed about the cancellation?',
        options: {
          notAtAll: 'Not at all',
          zeroToSeven: '0-7 days',
          eightToFourteen: '8-14 days',
          moreThanFourteen: 'More than 14 days',
        },
      },
      missedCosts: {
        text: 'Did you have any annoying additional costs (e.g. hotel, taxi, food)?',
        options: {
          yes: 'Yes',
          no: 'No',
        },
      },
      missedCostsAmount: {
        text: "Tell me roughly how much you spent. We'll handle the paperwork at the end.",
      },
      alternativeFlightAirline: {
        text: 'Did the airline book you an alternative flight?',
        options: {
          yes: 'Yes',
          no: 'No',
        },
      },
      alternativeFlightOwn: {
        text: 'Did you book your alternative flight at your own expense?',
        options: {
          yes: 'Yes',
          no: 'No',
        },
      },
      refundStatus: {
        text: 'Were your ticket costs refunded?',
        options: {
          yes: 'Yes',
          no: 'No',
        },
      },
    },
    success: {
      title: 'Success!',
      processing: 'We are processing your information...',
      backToQuestions: 'Back to questions',
      goodChance: 'Yay! You have a good chance of compensation.',
      answersSaved: 'Your answers have been saved.',
    },
    navigation: {
      back: 'Back',
      next: 'Next',
    },
  },
  phases: {
    initialAssessment: {
      title: 'Initial Assessment',
      description: "Let's assess your flight claim",
      flightDetails: 'Flight Details',
      bookingNumber: 'Booking Number',
      whatHappened: 'What happened with your flight?',
      personalDetails: {
        title: 'Personal Details',
        subtitle:
          'Please provide your contact details so we can keep you updated about your claim.',
      },
      termsAndConditions: {
        title: 'Terms and Conditions',
        subtitle: 'Please review and accept the terms to proceed.',
        terms: 'I have read and accept the Terms and Conditions.',
        privacy: 'I have read and accept the Privacy Policy.',
        marketing:
          'I agree that Captain Frank can send me advertisements about services, promotions, and satisfaction surveys via email. Captain Frank processes my personal data for this purpose (see Privacy Policy). I can revoke this consent at any time.',
        marketingDetails:
          'Stay updated about our latest services and travel tips. You can unsubscribe at any time.',
      },
      summary: {
        questionsAnswered: '{count} questions answered',
        termsAccepted: 'Terms and Privacy Policy accepted',
        directFlight: 'Direct flight from {from} to {to}',
        multiSegment: 'Flight with {count} segment{s}: {segments}',
      },
      welcomeMessage:
        "Hi, I'm Captain Frank. I'll help you find out if you're entitled to compensation for your flight interruption. Let's get started!",
      continueButton: 'Continue to Compensation Estimate',
      step: 'Step {number}',
      counter: {
        single: 'Question {current} of {total}',
        multiple: 'Questions {current} of {total}',
      },
    },
    tripExperience: {
      title: 'Trip Experience',
      description: 'Tell us about your trip experience',
      speechBubble:
        "Let's gather some details about your trip experience. This will help us better understand your situation.",
      steps: {
        travelStatus: {
          title: 'What happened to your flight?',
          eyebrow: 'Step 1',
          summary: 'Your travel status has been recorded',
          questions: {
            travelStatus: {
              title: 'Please select what happened:',
              options: {
                none: 'I did not travel at all',
                self: 'I took the flights I had booked',
                provided:
                  'I traveled differently, at the expense of the airline',
                alternativeOwn: 'I traveled differently, at my own expense',
              },
            },
            refundStatus: {
              title: 'Were your ticket costs refunded?',
              options: {
                yes: 'Yes',
                no: 'No',
              },
            },
            ticketCost: {
              title: 'How much did you pay for your ticket?',
            },
            alternativeFlightAirlineExpense: {
              title:
                'Please search for the alternative flight provided by the airline.',
              label: 'Alternative Flight',
            },
            alternativeFlightOwnExpense: {
              title:
                'Did you book your alternative flight at your own expense?',
            },
            tripCosts: {
              title: 'Please enter the costs you spent on your trip.',
            },
          },
          validation: {
            required: 'Please select your travel status',
          },
        },
        informedDate: {
          title: 'When were you informed?',
          eyebrow: 'Step 2',
          summary: 'Your informed date has been recorded',
          questions: {
            informedDate: {
              title: 'On what date were you first informed by the airline?',
              options: {
                onDeparture: 'On the day of departure',
                specificDate: 'On a specific date',
              },
            },
            specificInformedDate: {
              title: 'On what date were you first informed by the airline?',
              label: 'Flight Date',
            },
          },
          validation: {
            required: 'Please select when you were informed',
            future: 'The date cannot be in the future',
            past: 'The date must be in the past',
          },
        },
      },
      summary: {
        travelStatus: {
          traveled: 'Traveled',
          notTraveled: 'Did not travel',
          informedDate: 'Informed on {date}',
        },
      },
      navigation: {
        back: 'Back',
        continue: 'Check Claim',
      },
    },
    agreement: {
      title: 'Agreement',
      description: 'Review and sign the agreement',
      terms: 'Terms and Conditions',
      privacy: 'Privacy Policy',
      signature: 'Signature',
      message:
        'I, {salutation} {firstName} {lastName}, residing at {address}, {zipCode} {city}, {country}, hereby assign my claims for compensation from the flight connection with PNR/booking number {bookingNumber} from {departure}{connection} to {arrival} on {date} to Captain Frank GmbH.\n\nCaptain Frank GmbH accepts the declaration of assignment.',
      step: 'Step {number}',
      digitalSignature: {
        title: 'Digital Signature',
        subtitle: 'Please sign to confirm your agreement.',
        summary: 'Sign the agreement to proceed',
        clearSignature: 'Clear signature',
      },
      termsAndConditions: {
        title: 'Terms and Conditions',
        subtitle: 'Please review and accept the terms to proceed.',
        summary: 'Accept the terms and conditions',
        terms: 'I have read and accept the Terms and Conditions.',
        privacy: 'I have read and accept the Privacy Policy.',
        marketing:
          'I agree that Captain Frank may send me advertising about services, promotions, and satisfaction surveys by email. Captain Frank processes my personal data for this purpose (see Privacy Policy). I can revoke this consent at any time.',
        marketingDetails:
          'Stay up to date with our latest services and travel tips. You can unsubscribe at any time.',
      },
      submit: 'Submit Claim',
      navigation: {
        back: 'Back',
      },
    },
    names: {
      initialAssessment: 'Initial Assessment',
      summary: 'Summary',
      flightDetails: 'Flight Details',
      tripExperience: 'Trip Experience',
      claimStatus: 'Claim Status',
      agreement: 'Agreement',
      claimSuccess: 'Claim Success',
    },
    compensationEstimate: {
      title: 'Compensation Estimate',
      description:
        'There is a good chance that you are entitled to compensation! Let me help you. Completely risk-free: I only receive a success fee of 30% (incl. VAT) if I am successful.',
      flightSummary: {
        title: 'Flight Summary',
        passenger: 'Passenger',
        from: 'From',
        to: 'To',
        flight: 'Flight',
        noFlightDetails: 'No flight details available',
      },
      estimatedCompensation: {
        title: 'Estimated Compensation',
        calculating: 'Calculating compensation...',
        disclaimer:
          'The final amount will be determined after we review your complete case details.',
      },
      nextSteps: {
        title: 'Next Steps',
        step1: {
          title: 'Provide Flight Details',
          description:
            'Help us understand what happened with your flight by providing more details about your journey.',
        },
        step2: {
          title: 'Case Review',
          description:
            'We review your case details and assess your eligibility for compensation.',
        },
        step3: {
          title: 'Submit Claim',
          description:
            'Once everything is confirmed, we submit your claim and handle all communication with the airline.',
        },
      },
      navigation: {
        back: 'Back',
        continue: 'Continue to Flight Details',
      },
    },
    claimSuccess: {
      title: 'Claim Success',
      description:
        'The final amount will be determined after reviewing your complete case details.',
      speechBubble:
        'Congratulations! Now that you have completed your case, we can calculate your potential claim (minus 30% success fee).',
      nextSteps: {
        title: 'Next Steps',
        description: "Here's what happens next:",
        steps: {
          review: {
            title: 'Complete your personal details',
            description: 'Complete your personal details',
          },
          airline: {
            title: 'Sign the assignment declaration',
            description:
              'Sign the assignment declaration (costs only incurred upon success)',
          },
          updates: {
            title: 'Receive updates',
            description:
              'You will receive regular updates about your claim status',
          },
        },
      },
      summary: {
        title: 'Claim Summary',
        flightDetails: 'Flight Details',
        estimatedCompensation: 'Estimated Compensation',
        reference: 'Claim Reference',
        status: 'Status',
        submitted: 'Submitted',
      },
      navigation: {
        back: 'Back',
        viewStatus: 'Continue to Agreement',
      },
    },
    claimSubmitted: {
      title: 'Claim Submitted',
      thankYou: 'Thank you, {firstName}!',
      description:
        'Your claim has been successfully submitted. We will review your case and get back to you as soon as possible.',
      emailConfirmation:
        'You will receive a confirmation email at {email} with your claim details.',
      support:
        "If you have any questions or would like to provide additional information, please don't hesitate to contact our support team.",
      nextSteps: {
        title: 'Next Steps',
        review: 'We will review your claim within 2-3 business days',
        contact:
          'Our team will contact you if we need any additional information',
        updates: 'You will receive updates about your claim status via email',
      },
    },
    claimRejected: {
      title: 'Claim Rejected',
      description:
        'Unfortunately, your claim does not qualify for compensation.',
      speechBubble: "Unfortunately it didn't work this time!",
      reasons: {
        title: 'Why was your compensation claim rejected?',
        description:
          'According to EU Air Passenger Rights Regulation (EC 261/2004), compensation is only available in specific cases:',
        items: {
          extraordinaryCircumstances: 'Flight delays of more than 3 hours',
          shortDelay: 'Flight cancellations with less than 14 days notice',
          nonEUFlight: 'Denied boarding due to overbooking',
          timeLimitExceeded:
            "Missed connecting flights due to the airline's fault",
        },
      },
      reasonsBox: {
        title: 'Rejection Reasons',
      },
      nextSteps: {
        title: 'What can I do now?',
        description: '',
        items: {
          contactAirline: 'Contact the airline directly for more information',
          checkOtherFlights:
            'Did you know that you can claim compensation for flight problems up to 3 years back? Check another flight now.',
          seekAdvice: 'Seek advice from a consumer protection organization',
          contactInsurance:
            'If you have travel insurance, contact your insurance company to check if they can compensate you.',
        },
      },
      navigation: {
        back: 'Back',
        startNew: 'Check Another Flight',
      },
    },
    flightDetails: {
      title: 'Flight Details',
      description: 'Please provide additional details about your flight',
      steps: {
        flightSelection: {
          title: 'Choose your flight',
          eyebrow: 'Step 1',
          summary: {
            singleFlight: '{airline} {flightNumber} • {departure} → {arrival}',
            multiSegment: '{count} flights: {segments}',
          },
        },
        bookingNumber: {
          title: 'Enter your booking number',
          eyebrow: 'Step 2',
          placeholder: 'Enter your booking number',
          label: 'Booking number',
          validation: {
            required: 'Please enter your booking number',
            format:
              'Your booking number should be at least 6 characters long and contain only letters and numbers',
          },
        },
      },
      navigation: {
        back: 'Back',
        continue: 'Continue to Trip Experience',
      },
      speechBubble: 'Please provide additional details about your flight.',
    },
  },
  flightSelector: {
    types: {
      direct: 'Direct Flight',
      multi: 'Multi-Stop',
    },
    labels: {
      from: 'From',
      to: 'To',
      searchFlights: 'Search Flights',
      addFlight: 'Add another flight',
      departureDate: 'Departure Date',
      flightNotFound: 'Flight not found?',
      availableFlights: 'Available Flights',
      selectPreferred: 'Select your preferred flight',
      searchByFlightNumber: 'Search by flight number',
      searching: 'Searching for flights...',
      noFlightsFound: 'No flights found',
      noMatchingFlights: 'No matching flights',
      tryAdjusting: 'Try adjusting your search terms',
      noFlightsFoundCriteria:
        "We couldn't find any flights matching your criteria.",
      flightsFound:
        '{count} {count, plural, one {Flight} other {Flights}} found',
    },
    errors: {
      noValidConnecting:
        'No valid connecting flights found. Please try a different date or route.',
      noFlightsRoute: 'No flights found for the selected route and date.',
      departureMismatch:
        "Departure city ({city1}) must match previous flight's arrival city ({city2})",
      departBeforeArrival:
        'Next flight cannot depart before previous flight arrives',
      minConnectionTime: 'Connection time must be at least 30 minutes',
      maxConnectionTime: 'Connection time must be less than 48 hours',
      connectionTime: 'Connection time: {hours}h {minutes}m',
    },
    table: {
      flight: 'Flight',
      date: 'Date',
      departure: 'Departure',
      arrival: 'Arrival',
      duration: 'Duration',
    },
  },
  personalDetails: {
    title: 'Personal Details',
    salutation: 'Title',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    postalCode: 'Postal Code',
    city: 'City',
    country: 'Country',
  },
  validation: {
    required: 'This field is required',
    invalidDate: 'Invalid date',
    invalidBookingNumber: 'Invalid booking number',
    invalidSignature: 'Invalid signature',
  },
  errors: {
    general: 'Something went wrong',
    noValidConnecting:
      'No valid connecting flights found. Please try a different date or route.',
    noFlightsRoute: 'No flights found for the selected route and date.',
    departureMismatch:
      "Departure city ({city1}) must match previous flight's arrival city ({city2})",
    departBeforeArrival:
      'Next flight cannot depart before previous flight arrives',
    minConnectionTime: 'Connection time must be at least 30 minutes',
    maxConnectionTime: 'Connection time must be less than 48 hours',
    connectionTime: 'Connection time: {hours}h {minutes}m',
  },
};
