import type { Translations } from "./types";

export const en: Translations = {
  lang: "en",
  common: {
    next: "Next",
    back: "Back",
    submit: "Submit",
    cancel: "Cancel",
    continue: "Continue",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    dateFormat: "DD/MM/YYYY",
    enterAmount: "Enter amount",
    noResults: "No results found",
    required: "Required",
    enterMinChars: "Enter at least 3 characters",
    finish: "Finish",
  },
  salutation: {
    label: "Salutation",
    mr: "Mr.",
    mrs: "Mrs./Ms.",
  },
  welcome: {
    greeting: "Hi there",
    introduction: "I'm here to help with",
    purpose: "Flight Issues",
    chatWith: "Chat with",
    captainAlt: "Captain Frank",
  },
  qa: {
    title: "Frequently Asked Questions",
    description:
      "Find answers to common questions about flight compensation claims",
    questions: {
      flightIssue: "What types of flight issues are eligible for compensation?",
      delayDuration:
        "How long does my flight need to be delayed to claim compensation?",
      compensation: "How much compensation can I receive?",
      documentation: "What documents do I need to make a claim?",
      process: "How does the claims process work?",
      timeline: "How long does it take to receive compensation?",
      requirements: "What are the requirements for filing a claim?",
      success: "What are my chances of success?",
    },
    answers: {
      flightIssue:
        "You may be eligible for compensation if your flight was cancelled, delayed for more than 3 hours, or if you were denied boarding due to overbooking.",
      delayDuration:
        "For EU flights, delays of 3 hours or more at your final destination may qualify for compensation. The exact duration can vary based on your specific circumstances.",
      compensation:
        "Compensation amounts typically range from €250 to €600, depending on the flight distance and the nature of the disruption.",
      documentation:
        "You'll need your booking confirmation, boarding passes (if available), and any communication from the airline about the disruption.",
      process:
        "Our process is simple: we gather your flight details, verify your claim, handle all communication with the airline, and secure your compensation.",
      timeline:
        "While simple cases may be resolved in a few weeks, complex cases can take several months. We work to process claims as quickly as possible.",
      requirements:
        "Your flight must either depart from the EU or be operated by an EU carrier flying to the EU, and the delay must not be due to extraordinary circumstances.",
      success:
        "Success rates vary depending on the specific circumstances of your case. We only proceed with claims that have a good chance of success.",
    },
  },
  wizard: {
    questions: {
      issueType: {
        text: "What type of problem did you have?",
        options: {
          delay: "Delayed flight",
          cancel: "Cancelled flight",
          missed: "Missed connecting flight",
          other: "Other problem",
        },
      },
      delayDuration: {
        text: "How long was your flight delayed?",
        options: {
          lessThan2: "Less than 2 hours",
          between2And3: "2-3 hours",
          moreThan3: "More than 3 hours",
        },
      },
      cancellationNotice: {
        text: "When were you informed about the cancellation?",
        options: {
          notAtAll: "Not at all",
          zeroToSeven: "0-7 days",
          eightToFourteen: "8-14 days",
          moreThanFourteen: "More than 14 days",
        },
      },
      missedCosts: {
        text: "Did you have any annoying additional costs (e.g. hotel, taxi, food)?",
        options: {
          yes: "Yes",
          no: "No",
        },
      },
      missedCostsAmount: {
        text: "Tell me roughly how much you spent. We'll handle the paperwork at the end.",
      },
      alternativeFlightAirline: {
        text: "Did the airline book you an alternative flight?",
        options: {
          yes: "Yes",
          no: "No",
        },
      },
      alternativeFlightOwn: {
        text: "Did you book your alternative flight at your own expense?",
        options: {
          yes: "Yes",
          no: "No",
        },
      },
      refundStatus: {
        text: "Were your ticket costs refunded?",
        options: {
          yes: "Yes",
          no: "No",
        },
      },
    },
    success: {
      title: "Success!",
      processing: "We are processing your information...",
      backToQuestions: "Back to questions",
      goodChance: "Yay! You have a good chance of compensation.",
      answersSaved: "Your answers have been saved.",
    },
    navigation: {
      back: "Back",
      next: "Next",
    },
  },
  phases: {
    unauthorized: {
      title: "Page Not Accessible",
      message: "Please complete the previous steps before accessing this page.",
      titles: {
        1: "Initial Assessment Not Accessible",
        2: "Compensation Estimate Not Accessible",
        3: "Flight Details Not Accessible",
        4: "Trip Experience Not Accessible",
        5: "Claim Status Page Not Accessible",
        6: "Agreement Page Not Accessible",
        7: "Claim Submission Not Available",
        8: "Claim Rejection Page Not Accessible",
      },
      messages: {
        1: "Please start your claim from the beginning.",
        2: "Please complete the initial assessment before accessing the compensation estimate.",
        3: "Please complete the compensation estimate before accessing flight details.",
        4: "Please complete the flight details before accessing trip experience.",
        5: "Please complete the trip experience before accessing the claim status page.",
        "5_1":
          "Your claim has been accepted. Please proceed to the claim success page.",
        "5_2":
          "Your claim has been rejected. Please proceed to the claim rejected page.",
        "5_3":
          "Please complete the trip experience page first to determine your claim status.",
        6: "Please complete the claim status step before accessing the agreement page.",
        7: "Please complete the agreement step before viewing your claim submission.",
        8: "Please complete the previous steps before accessing the claim rejection page.",
      },
      backText: {
        1: "Return to Initial Assessment",
        2: "Return to Compensation Estimate",
        3: "Return to Flight Details",
        4: "Return to Trip Experience",
        5: "Return to Claim Status",
        "5_1": "Go to Claim Success Page",
        "5_2": "Go to Claim Rejected Page",
        "5_3": "Go to Trip Experience",
        6: "Return to Agreement",
        7: "Return to Claim Submission",
        8: "Return to Previous Step",
      },
    },
    initialAssessment: {
      title: "Tell us about your flight",
      description: "Let's assess your flight disruption claim",
      flightDetails: "Flight Details",
      bookingNumber: "Booking Number",
      whatHappened: "What happened with your flight?",
      whatHappenedSubtitle:
        'Did you have a connecting flight? Then please enter your flights under "Multi-Stop".',
      flightDetailsDescription:
        'Did you have a connecting flight? Then please enter your flights under "Multi-Stop".',
      step: "Step",
      wizard: {
        title: "What happened with your flight?",
        description:
          "Please answer a few questions about your flight experience",
        successMessage: "Answers saved successfully!",
      },
      personalDetails: {
        title: "Personal Details",
        description: "Enter your contact information",
      },
      consent: {
        title: "General Terms & Conditions",
        description: "Please review and accept the terms to proceed.",
        terms: "I accept the terms and conditions",
        privacy: "I accept the privacy policy",
        marketing: "I would like to receive marketing communications",
        marketingDetails: "You can unsubscribe at any time",
      },
      continueButton: "Continue",
      stepProgress: "Step {current} of {total}",
      steps: {
        flightDetails: {
          title: "Flight Details",
          description: "Enter your flight information",
        },
        questionnaire: {
          title: "Questionnaire",
          description: "Answer some questions",
        },
        personalDetails: {
          title: "Personal Details",
          description: "Enter your contact details",
        },
        termsAndConditions: {
          title: "Terms & Conditions",
          description: "Review and accept terms",
        },
      },
      navigation: {
        title: "Navigation",
        description: "Navigate through the assessment",
        back: "Back",
        continue: "Continue",
      },
      summary: {
        directFlight: "Direct flight from {from} to {to}",
        questionsAnswered: "{count} questions answered",
        termsAccepted: "Terms and Privacy Policy accepted",
      },
      termsAndConditions: {
        title: "Terms & Conditions",
        subtitle: "Please review and accept the terms to proceed.",
        description:
          "Please review the following terms and conditions and confirm your acceptance.",
        summary: "Summary of Terms",
        terms: "I have read and accept the General Terms and Conditions.",
        privacy: "I have read and accept the Privacy Policy.",
        marketing:
          "I agree that Captain Frank may send me advertising regarding services, promotions and satisfaction surveys by e-mail. Captain Frank processes my personal data for this purpose (see Privacy Policy). I can revoke this consent at any time.",
        marketingDetails:
          "Stay updated on our latest services and travel tips. You can unsubscribe at any time.",
      },
      counter: {
        single: "Question {current} of {total}",
        multiple: "Questions {current} of {total}",
      },
      welcomeMessage:
        "Hi, I'm Captain Frank. I'll help you find out if you're entitled to compensation for your flight interruption. Let's get started!",
    },
    tripExperience: {
      title: "Trip Experience",
      description: "Tell us about your trip experience",
      speechBubble:
        "Let's gather some details about your trip experience. This will help us better understand your situation.",
      steps: {
        travelStatus: {
          title: "How did your actual journey go?",
          eyebrow: "Step 1",
          summary: "Your travel status has been recorded",
          questions: {
            travelStatus: {
              title: "Please select what happened:",
              options: {
                none: "I did not travel at all",
                self: "I took the flights I had booked",
                provided:
                  "I traveled differently, at the expense of the airline",
                alternativeOwn: "I traveled differently, at my own expense",
              },
            },
            refundStatus: {
              title: "Were your ticket costs refunded?",
              options: {
                yes: "Yes",
                no: "No",
              },
            },
            ticketCost: {
              title: "Please tell us the costs you incurred for your trip.",
            },
            alternativeFlightAirlineExpense: {
              title: "Please enter all the flights you actually flew",
              label: "Alternative Flight",
            },
            alternativeFlightOwnExpense: {
              title:
                "Did you book your alternative flight at your own expense?",
            },
            tripCosts: {
              title: "Please enter the costs you spent on your trip.",
            },
          },
          validation: {
            required: "Please select your travel status",
          },
        },
        informedDate: {
          title: "When were you informed?",
          eyebrow: "Step 2",
          summary: "Your informed date has been recorded",
          questions: {
            informedDate: {
              title: "On what date were you first informed by the airline?",
              options: {
                onDeparture: "On the day of departure",
                specificDate: "On a specific date",
              },
            },
            specificInformedDate: {
              title: "On what date were you first informed by the airline?",
              label: "Flight Date",
            },
          },
          validation: {
            required: "Please select when you were informed",
            future: "The date cannot be in the future",
            past: "The date must be in the past",
          },
        },
      },
      summary: {
        travelStatus: {
          traveled: "Traveled",
          notTraveled: "Did not travel",
          informedDate: "Informed on {date}",
        },
      },
      navigation: {
        back: "Back",
        continue: "Check Claim",
      },
    },
    agreement: {
      title: "Agreement",
      description: "Please review and sign the agreement",
      terms: "Terms and Conditions",
      privacy: "Privacy Policy",
      signature: "Signature",
      message:
        "I, {salutation} {firstName} {lastName}, residing at {address}, {postalCode} {city}, {country}, hereby assign my claims for compensation from the flight connection with PNR/booking number {bookingNumber} from {departure}{connection} to {arrival} on {date} to Captain Frank GmbH.\n\nCaptain Frank GmbH accepts the assignment declaration.",
      step: "Step {number}",
      digitalSignature: {
        title: "Digital Signature",
        subtitle: "Please sign to confirm your agreement.",
        summary: "Sign the agreement to proceed",
        clearSignature: "Clear signature",
        validation: {
          required: "Please provide your signature",
        },
      },
      termsAndConditions: {
        title: "Terms and Conditions",
        subtitle: "Please review and accept the terms to proceed.",
        summary: "Accept the terms and conditions",
        terms: "I have read and accept the Terms and Conditions.",
        privacy: "I have read and accept the Privacy Policy.",
        marketing:
          "I agree that Captain Frank may send me advertising about services, promotions, and satisfaction surveys by email. Captain Frank processes my personal data for this purpose (see Privacy Policy). I can revoke this consent at any time.",
        marketingDetails:
          "Stay up to date with our latest services and travel tips. You can unsubscribe at any time.",
      },
      submit: "Submit Claim",
      navigation: {
        back: "Back",
      },
    },
    names: {
      initialAssessment: "Initial Assessment",
      summary: "Compensation Estimate",
      flightDetails: "Flight Details",
      tripExperience: "Trip Experience",
      claimStatus: "Claim Status",
      agreement: "Agreement",
      claimSuccess: "Claim Success",
      claimSubmitted: "Claim Submitted",
    },
    compensationEstimate: {
      title: "Compensation Estimate",
      description:
        "There is a good chance that you are entitled to compensation! Let me help you. Completely risk-free: I only receive a success fee of 30% (incl. VAT) if I am successful.",
      flightSummary: {
        title: "Flight Summary",
        passenger: "Passenger",
        from: "From",
        to: "To",
        flight: "Flight",
        noFlightDetails: "No flight details available",
      },
      estimatedCompensation: {
        title: "Estimated Compensation",
        calculating: "Calculating compensation...",
        disclaimer:
          "The final amount will be determined after we verify your complete case details.",
        errorMessage:
          "We're having trouble calculating the exact amount. This is an estimate.",
        estimate: "(Estimate)",
      },
      nextSteps: {
        title: "Next Steps",
        step1: {
          title: "Provide Flight Details",
          description:
            "Help us understand what happened with your flight by providing more details about your journey.",
        },
        step2: {
          title: "Case Review",
          description:
            "We review your case details and assess your eligibility for compensation.",
        },
        step3: {
          title: "Submit Claim",
          description:
            "Once everything is confirmed, we submit your claim and handle all communication with the airline.",
        },
      },
      navigation: {
        back: "Back",
        continue: "Continue to Flight Details",
      },
    },
    claimSuccess: {
      title: "Claim Success",
      description:
        "The final amount will be determined after reviewing your complete case details.",
      speechBubble:
        "Congratulations! Now that you have completed your case, we can calculate your potential claim (minus 30% success fee).",
      nextSteps: {
        title: "Next Steps",
        description: "Here's what happens next:",
        steps: {
          review: {
            title: "Complete your personal details",
            description: "Complete your personal details",
          },
          airline: {
            title: "Sign the assignment declaration",
            description:
              "Sign the assignment declaration (costs only incurred upon success)",
          },
          updates: {
            title: "Receive updates",
            description:
              "You will receive regular updates about your claim status",
          },
        },
      },
      summary: {
        title: "Claim Summary",
        flightDetails: "Flight Details",
        estimatedCompensation: "Estimated Compensation",
        reference: "Claim Reference",
        status: "Status",
        submitted: "Submitted",
      },
      navigation: {
        back: "Back",
        viewStatus: "Continue to Agreement",
      },
      accessDenied: {
        title: "Your Claim Was Successful",
        message:
          "Your claim has been successfully processed. You cannot access the claim rejected page because your claim was successful.",
        back: "Return to Claim Success",
      },
    },
    claimSubmitted: {
      title: "Claim Submitted!",
      thankYou: "Thank you, {firstName}!",
      description:
        "Your claim has been successfully submitted. If you have any documents ready, you can optionally provide them now. You can also share the claim with any fellow passengers.",
      emailConfirmation:
        "You will receive a confirmation email at {email} with your claim details.",
      support:
        "If you have any questions or would like to provide additional information, please don't hesitate to contact our support team.",
      nextSteps: {
        title: "Next Steps",
        review: "We will review your claim within 2-3 business days",
        contact:
          "Our team will contact you if we need any additional information",
        updates: "You will receive updates about your claim status via email",
      },
      navigation: {
        title: "Need to Start Over?",
        description:
          "If you need to submit a claim for a different flight or start completely fresh, you can reset everything and begin a new claim process.",
        confirmMessage:
          "Are you sure you want to start over? This will clear all your current claim data and cannot be undone.",
        restart: "Start New Claim",
      },
    },
    claimRejected: {
      title: "Claim Rejected",
      description:
        "Unfortunately, your claim does not qualify for compensation.",
      speechBubble: "Unfortunately it didn't work this time!",
      reasons: {
        title: "Why was your compensation claim rejected?",
        description:
          "According to EU Air Passenger Rights Regulation (EC 261/2004), compensation is only available in specific cases:",
        items: {
          extraordinaryCircumstances: "Flight delays of more than 3 hours",
          shortDelay: "Flight cancellations with less than 14 days notice",
          nonEUFlight: "Denied boarding due to overbooking",
          timeLimitExceeded:
            "Missed connecting flights due to the airline's fault",
        },
      },
      reasonsBox: {
        title: "Rejection Reasons",
      },
      nextSteps: {
        title: "What can I do now?",
        description: "",
        items: {
          contactAirline: "Contact the airline directly for more information",
          checkOtherFlights:
            "Did you know that you can claim compensation for flight problems up to 3 years back? Check another flight now.",
          seekAdvice: "Seek advice from a consumer protection organization",
          contactInsurance:
            "Check if your travel insurance covers this situation",
        },
      },
      navigation: {
        back: "Back",
        startNew: "Check Another Flight",
      },
      accessDenied: {
        title: "Your Claim Was Rejected",
        message:
          "Your claim has been rejected. You cannot access the success page as your claim was rejected.",
        back: "Return to Claim Rejected",
      },
    },
    flightDetails: {
      title: "Your Flight Details",
      description:
        "Please enter the date for your flight so we can determine the flight number for each flight. Below you will see a list of your selected flights.",
      steps: {
        flightSelection: {
          title: "Choose your flight",
          eyebrow: "Step 1",
          summary: {
            singleFlight: "{airline} {flightNumber} • {departure} → {arrival}",
            multiSegment: "{count} flights: {segments}",
          },
        },
        bookingNumber: {
          title: "Enter your booking number",
          eyebrow: "Step 2",
          placeholder: "Enter your booking number",
          label: "Booking number",
          validation: {
            required: "Please enter your booking number",
            format:
              "Your booking number should contain only letters and numbers",
          },
        },
      },
      navigation: {
        back: "Back",
        continue: "Continue to Trip Experience",
      },
      speechBubble: "Please provide additional details about your flight.",
    },
    documentUpload: {
      title: "Upload Documents",
      description:
        "Please provide the necessary documentation to support your claim.",
      speechBubble:
        "Please upload your booking confirmation and any notification from the airline regarding the flight cancellation.",
      bookingConfirmation: {
        title: "Booking Confirmation",
        description: "Upload your booking confirmation or e-ticket (optional)",
      },
      cancellationNotification: {
        title: "Cancellation Notification",
        description:
          "Upload any notification from the airline about the flight cancellation (optional)",
      },
      sharing: {
        title: "Share Your Claim",
        description:
          "Share this link with fellow passengers to help them claim their compensation too.",
        copy: "Copy Link",
      },
      upload: "Upload File",
      submit: "Submit",
      remove: "Remove File",
      errors: {
        noBookingConfirmation: "Please upload your booking confirmation",
        uploadFailed: "Failed to upload documents. Please try again.",
      },
      navigation: {
        back: "Back",
        continue: "Continue",
        checkAnotherFlight: "Check Another Flight",
      },
    },
  },
  flightSelector: {
    types: {
      direct: "Direct Flight",
      multi: "Multi-Stop",
    },
    labels: {
      from: "From",
      to: "To",
      searchFlights: "Search Flights",
      addFlight: "Add another flight",
      departureDate: "Departure Date",
      flightNotFound: "Flight not found?",
      availableFlights: "Available Flights",
      selectPreferred: "Select your preferred flight",
      searchByFlightNumber: "Search by flight number",
      searching: "Searching for flights...",
      noFlightsFound: "No flights found",
      noMatchingFlights: "No matching flights",
      tryAdjusting: "Try adjusting your search terms",
      noFlightsFoundCriteria:
        "We couldn't find any flights matching your criteria.",
      flightsFound:
        "{count} {count, plural, one {Flight} other {Flights}} found",
    },
    flightNotListed: {
      button: "Flight Not Listed?",
      title: "Flight Not Listed?",
      description:
        "Check your search details (departure, destination, and date). If it's still missing, let us know below. We'll add it, notify you by email, and you can continue your request.",
      form: {
        firstName: "First Name",
        lastName: "Last Name",
        email: "Email",
        description: "",
        descriptionPlaceholder:
          "Please provide details about your flight (e.g., airline, flight number, route, date)",
        submit: "Submit",
        submitting: "Submitting...",
        success:
          "Thank you! We have received your flight details and will contact you soon.",
        characterCount: "{count} / {max} characters",
      },
    },
    errors: {
      noValidConnecting:
        "No valid connecting flights found. Please try a different date or route.",
      noFlightsRoute: "No flights found for the selected route and date.",
      departureMismatch:
        "Departure city ({city1}) must match previous flight's arrival city ({city2})",
      departBeforeArrival:
        "Next flight cannot depart before previous flight arrives",
      minConnectionTime: "Connection time must be at least 30 minutes",
      maxConnectionTime: "Connection time must be less than 48 hours",
      connectionTime: "Connection time: {hours}h {minutes}m",
    },
    table: {
      flight: "Flight",
      date: "Date",
      departure: "Departure",
      arrival: "Arrival",
      duration: "Duration",
    },
  },
  personalDetails: {
    title: "Personal Details",
    salutation: "Title",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    phone: "Phone",
    address: "Address",
    postalCode: "Postal Code",
    city: "City",
    country: "Country",
  },
  validation: {
    required: "Required field",
    invalidDate: "Invalid date",
    invalidBookingNumber: "Invalid booking number",
    invalidSignature: "Invalid signature",
    dateFormat: "Please enter a date in the format DD.MM.YY or DD.MM.YYYY",
    incompleteDateFormat:
      "Please complete the date in the format DD.MM.YY or DD.MM.YYYY",
  },
  errors: {
    general: "Something went wrong",
    noValidConnecting:
      "No valid connecting flights found. Please try a different date or route.",
    noFlightsRoute: "No flights found for the selected route and date.",
    departureMismatch:
      "Departure city ({city1}) must match previous flight's arrival city ({city2})",
    departBeforeArrival:
      "Next flight cannot depart before previous flight arrives",
    minConnectionTime: "Connection time must be at least 30 minutes",
    maxConnectionTime: "Connection time must be less than 48 hours",
    connectionTime: "Connection time: {hours}h {minutes}m",
  },
  share: {
    title: "Share Claim",
    description:
      "Share this link with fellow passengers so they can claim their compensation too.",
    copy: "Copy Link",
    share: "Share with Fellow Passengers",
    copied: "Link copied!",
    explanation:
      "When someone uses this link, their claim form will be pre-populated with the flight details, but they'll need to provide their own personal information.",
  },
};
