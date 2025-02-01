export interface FlightSelectorTranslations {
  types: {
    direct: string;
    multi: string;
  };
  labels: {
    from: string;
    to: string;
    searchFlights: string;
    addFlight: string;
    departureDate: string;
    flightNotFound: string;
    availableFlights: string;
    selectPreferred: string;
    searchByFlightNumber: string;
    searching: string;
    noFlightsFound: string;
    noMatchingFlights: string;
    tryAdjusting: string;
    noFlightsFoundCriteria: string;
    flightsFound: string;
  };
  flightNotListed: {
    button: string;
    title: string;
    description: string;
    form: {
      firstName: string;
      lastName: string;
      email: string;
      description: string;
      submit: string;
      submitting: string;
      success: string;
      characterCount: string;
    };
  };
  errors: {
    noValidConnecting: string;
    noFlightsRoute: string;
    departureMismatch: string;
    departBeforeArrival: string;
    minConnectionTime: string;
    maxConnectionTime: string;
    connectionTime: string;
  };
  table: {
    flight: string;
    date: string;
    departure: string;
    arrival: string;
    duration: string;
  };
}

export interface TripExperienceTranslations {
  title: string;
  description: string;
  speechBubble: string;
  steps: {
    travelStatus: {
      title: string;
      eyebrow: string;
      summary: string;
      questions: {
        travelStatus: {
          title: string;
          options: {
            none: string;
            self: string;
            provided: string;
            alternativeOwn: string;
          };
        };
        refundStatus: {
          title: string;
          options: {
            yes: string;
            no: string;
          };
        };
        ticketCost: {
          title: string;
        };
        alternativeFlightAirlineExpense: {
          title: string;
          label: string;
        };
        alternativeFlightOwnExpense: {
          title: string;
        };
        tripCosts: {
          title: string;
        };
      };
      validation: {
        required: string;
      };
    };
    informedDate: {
      title: string;
      eyebrow: string;
      summary: string;
      questions: {
        informedDate: {
          title: string;
          options: {
            onDeparture: string;
            specificDate: string;
          };
        };
        specificInformedDate: {
          title: string;
          label: string;
        };
      };
      validation: {
        required: string;
        future: string;
        past: string;
      };
    };
  };
  summary: {
    travelStatus: {
      traveled: string;
      notTraveled: string;
      informedDate: string;
    };
  };
  navigation: {
    back: string;
    continue: string;
  };
}

export interface ValidationTranslations {
  required: string;
  invalidDate: string;
  invalidBookingNumber: string;
  invalidSignature: string;
}

export interface Translations {
  lang: 'en' | 'de';
  common: {
    next: string;
    back: string;
    submit: string;
    cancel: string;
    continue: string;
    loading: string;
    error: string;
    success: string;
    dateFormat: string;
    enterAmount: string;
    noResults: string;
    required: string;
    enterMinChars: string;
  };
  share: {
    title: string;
    description: string;
    copy: string;
  };
  salutation: {
    label: string;
    mr: string;
    mrs: string;
  };
  welcome: {
    greeting: string;
    introduction: string;
    purpose: string;
    chatWith: string;
    captainAlt: string;
  };
  qa: {
    title: string;
    description: string;
    questions: {
      flightIssue: string;
      delayDuration: string;
      compensation: string;
      documentation: string;
      process: string;
      timeline: string;
      requirements: string;
      success: string;
    };
    answers: {
      flightIssue: string;
      delayDuration: string;
      compensation: string;
      documentation: string;
      process: string;
      timeline: string;
      requirements: string;
      success: string;
    };
  };
  wizard: {
    questions: {
      issueType: {
        text: string;
        options: {
          delay: string;
          cancel: string;
          missed: string;
          other: string;
        };
      };
      delayDuration: {
        text: string;
        options: {
          lessThan2: string;
          between2And3: string;
          moreThan3: string;
        };
      };
      cancellationNotice: {
        text: string;
        options: {
          notAtAll: string;
          zeroToSeven: string;
          eightToFourteen: string;
          moreThanFourteen: string;
        };
      };
      missedCosts: {
        text: string;
        options: {
          yes: string;
          no: string;
        };
      };
      missedCostsAmount: {
        text: string;
      };
      alternativeFlightAirline: {
        text: string;
        options: {
          yes: string;
          no: string;
        };
      };
      alternativeFlightOwn: {
        text: string;
        options: {
          yes: string;
          no: string;
        };
      };
      refundStatus: {
        text: string;
        options: {
          yes: string;
          no: string;
        };
      };
    };
    success: {
      title: string;
      processing: string;
      backToQuestions: string;
      goodChance: string;
      answersSaved: string;
    };
    navigation: {
      back: string;
      next: string;
    };
  };
  phases: {
    initialAssessment: {
      title: string;
      description: string;
      flightDetails: string;
      bookingNumber: string;
      whatHappened: string;
      personalDetails: {
        title: string;
        subtitle: string;
      };
      termsAndConditions: {
        title: string;
        subtitle: string;
        terms: string;
        privacy: string;
        marketing: string;
        marketingDetails: string;
      };
      summary: {
        questionsAnswered: string;
        termsAccepted: string;
        directFlight: string;
        multiSegment: string;
      };
      welcomeMessage: string;
      continueButton: string;
      step: string;
      counter: {
        single: string;
        multiple: string;
      };
    };
    tripExperience: TripExperienceTranslations;
    agreement: {
      title: string;
      description: string;
      terms: string;
      privacy: string;
      signature: string;
      message: string;
      step: string;
      digitalSignature: {
        title: string;
        subtitle: string;
        summary: string;
        clearSignature: string;
      };
      termsAndConditions: {
        title: string;
        subtitle: string;
        summary: string;
        terms: string;
        privacy: string;
        marketing: string;
        marketingDetails: string;
      };
      submit: string;
      navigation: {
        back: string;
      };
    };
    names: {
      initialAssessment: string;
      summary: string;
      flightDetails: string;
      tripExperience: string;
      claimStatus: string;
      agreement: string;
      claimSuccess: string;
      claimSubmitted: string;
    };
    compensationEstimate: {
      title: string;
      description: string;
      flightSummary: {
        title: string;
        passenger: string;
        from: string;
        to: string;
        flight: string;
        noFlightDetails: string;
      };
      estimatedCompensation: {
        title: string;
        calculating: string;
        disclaimer: string;
      };
      nextSteps: {
        title: string;
        step1: {
          title: string;
          description: string;
        };
        step2: {
          title: string;
          description: string;
        };
        step3: {
          title: string;
          description: string;
        };
      };
      navigation: {
        back: string;
        continue: string;
      };
    };
    claimSuccess: {
      title: string;
      description: string;
      speechBubble: string;
      nextSteps: {
        title: string;
        description: string;
        steps: {
          review: {
            title: string;
            description: string;
          };
          airline: {
            title: string;
            description: string;
          };
          updates: {
            title: string;
            description: string;
          };
        };
      };
      summary: {
        title: string;
        flightDetails: string;
        estimatedCompensation: string;
        reference: string;
        status: string;
        submitted: string;
      };
      navigation: {
        back: string;
        viewStatus: string;
      };
    };
    claimSubmitted: {
      title: string;
      thankYou: string;
      description: string;
      emailConfirmation: string;
      support: string;
      nextSteps: {
        title: string;
        review: string;
        contact: string;
        updates: string;
      };
    };
    claimRejected: {
      title: string;
      description: string;
      speechBubble: string;
      reasons: {
        title: string;
        description: string;
        items: {
          extraordinaryCircumstances: string;
          shortDelay: string;
          nonEUFlight: string;
          timeLimitExceeded: string;
        };
      };
      reasonsBox: {
        title: string;
      };
      nextSteps: {
        title: string;
        description: string;
        items: {
          contactAirline: string;
          checkOtherFlights: string;
          seekAdvice: string;
          contactInsurance: string;
        };
      };
      navigation: {
        back: string;
        startNew: string;
      };
    };
    flightDetails: {
      title: string;
      description: string;
      steps: {
        flightSelection: {
          title: string;
          eyebrow: string;
          summary: {
            singleFlight: string;
            multiSegment: string;
          };
        };
        bookingNumber: {
          title: string;
          eyebrow: string;
          placeholder: string;
          label: string;
          validation: {
            required: string;
            format: string;
          };
        };
      };
      navigation: {
        back: string;
        continue: string;
      };
      speechBubble: string;
    };
    documentUpload: {
      title: string;
      description: string;
      speechBubble: string;
      bookingConfirmation: {
        title: string;
        description: string;
      };
      cancellationNotification: {
        title: string;
        description: string;
      };
      sharing: {
        title: string;
        description: string;
        copy: string;
      };
      upload: string;
      remove: string;
      errors: {
        noBookingConfirmation: string;
        uploadFailed: string;
      };
      navigation: {
        back: string;
        continue: string;
        checkAnotherFlight: string;
      };
      submit: string;
    };
  };
  flightSelector: FlightSelectorTranslations;
  personalDetails: PersonalDetailsTranslations;
  validation: ValidationTranslations;
  errors: {
    general: string;
    [key: string]: string;
  };
}

export interface PersonalDetailsTranslations {
  title: string;
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
}
