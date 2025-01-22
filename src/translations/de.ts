import type { Translations } from './types';

export const de: Translations = {
  lang: 'de',
  common: {
    next: 'Weiter',
    back: 'Zurück',
    submit: 'Absenden',
    cancel: 'Abbrechen',
    continue: 'Fortfahren',
    loading: 'Lädt...',
    error: 'Fehler',
    success: 'Erfolg',
    dateFormat: 'TT.MM.JJJJ',
    enterAmount: 'Betrag eingeben',
    noResults: 'Keine Ergebnisse gefunden',
    required: 'Pflichtfeld',
    enterMinChars: 'Bitte geben Sie mindestens 3 Zeichen ein',
  },
  salutation: {
    label: 'Anrede',
    mr: 'Herr',
    mrs: 'Frau',
  },
  welcome: {
    greeting: 'Hallo',
    introduction: 'ich bin hier, um dir bei',
    purpose: 'Flugproblemen zu helfen',
    chatWith: 'Chatte mit',
    captainAlt: 'Captain Frank',
  },
  qa: {
    title: 'Häufig gestellte Fragen',
    description:
      'Finden Sie Antworten auf häufige Fragen zu Flugentschädigungsansprüchen',
    questions: {
      flightIssue:
        'Welche Arten von Flugproblemen berechtigen zu einer Entschädigung?',
      delayDuration:
        'Wie lange muss mein Flug verspätet sein, um eine Entschädigung zu beantragen?',
      compensation: 'Wie viel Entschädigung kann ich erhalten?',
      documentation: 'Welche Dokumente benötige ich für einen Antrag?',
      process: 'Wie funktioniert der Antragsprozess?',
      timeline: 'Wie lange dauert es, bis ich eine Entschädigung erhalte?',
      requirements:
        'Welche Voraussetzungen gibt es für die Einreichung eines Antrags?',
      success: 'Wie sind meine Erfolgschancen?',
    },
    answers: {
      flightIssue:
        'Sie haben möglicherweise Anspruch auf Entschädigung, wenn Ihr Flug annulliert wurde, sich um mehr als 3 Stunden verspätet hat oder wenn Ihnen das Boarding aufgrund von Überbuchung verweigert wurde.',
      delayDuration:
        'Bei EU-Flügen können Verspätungen von 3 Stunden oder mehr am Endziel zu einer Entschädigung berechtigen. Die genaue Dauer kann je nach Ihren spezifischen Umständen variieren.',
      compensation:
        'Die Entschädigungsbeträge liegen typischerweise zwischen 250€ und 600€, abhängig von der Flugdistanz und der Art der Störung.',
      documentation:
        'Sie benötigen Ihre Buchungsbestätigung, Bordkarten (falls verfügbar) und jegliche Kommunikation mit der Fluggesellschaft über die Störung.',
      process:
        'Unser Prozess ist einfach: Wir sammeln Ihre Flugdaten, überprüfen Ihren Anspruch, übernehmen die gesamte Kommunikation mit der Fluggesellschaft und sichern Ihre Entschädigung.',
      timeline:
        'Während einfache Fälle innerhalb weniger Wochen gelöst werden können, können komplexe Fälle mehrere Monate dauern. Wir arbeiten daran, Ansprüche so schnell wie möglich zu bearbeiten.',
      requirements:
        'Ihr Flug muss entweder von der EU starten oder von einer EU-Fluggesellschaft in die EU durchgeführt werden, und die Verspätung darf nicht auf außergewöhnliche Umstände zurückzuführen sein.',
      success:
        'Die Erfolgsquoten variieren je nach den spezifischen Umständen Ihres Falls. Wir bearbeiten nur Ansprüche, die gute Erfolgsaussichten haben.',
    },
  },
  wizard: {
    questions: {
      issueType: {
        text: 'Welche Art von Problem hattest du?',
        options: {
          delay: 'Verspäteter Flug',
          cancel: 'Abgesagter Flug',
          missed: 'Anschlussflug verpasst',
          other: 'Anderes Problem',
        },
      },
      delayDuration: {
        text: 'Wie lange war dein Flug verspätet?',
        options: {
          lessThan2: 'Weniger als 2 Stunden',
          between2And3: '2-3 Stunden',
          moreThan3: 'Mehr als 3 Stunden',
        },
      },
      cancellationNotice: {
        text: 'Wann wurdest du über die Annullierung informiert?',
        options: {
          notAtAll: 'Gar nicht',
          zeroToSeven: '0-7 Tage',
          eightToFourteen: '8-14 Tage',
          moreThanFourteen: 'Mehr als 14 Tage',
        },
      },
      missedCosts: {
        text: 'Hattest du lästige zusätzliche Kosten (z. B. Hotel, Taxi, Essen)?',
        options: {
          yes: 'Ja',
          no: 'Nein',
        },
      },
      missedCostsAmount: {
        text: 'Sag mir ungefähr, wie viel du ausgegeben hast. Wir erledigen den Papierkram am Ende.',
      },
      alternativeFlightAirline: {
        text: 'Hat dir die Airline einen alternativen Flug gebucht?',
        options: {
          yes: 'Ja',
          no: 'Nein',
        },
      },
      alternativeFlightOwn: {
        text: 'Hast du deinen alternativen Flug auf deine eigenen Kosten gebucht?',
        options: {
          yes: 'Ja',
          no: 'Nein',
        },
      },
      refundStatus: {
        text: 'Wurden deine Ticket Kosten erstattet?',
        options: {
          yes: 'Ja',
          no: 'Nein',
        },
      },
    },
    success: {
      title: 'Erfolg!',
      processing: 'Wir verarbeiten deine Informationen...',
      backToQuestions: 'Zurück zu den Fragen',
      goodChance: 'Super! Du hast gute Chancen auf eine Entschädigung.',
      answersSaved: 'Deine Antworten wurden gespeichert.',
    },
    navigation: {
      back: 'Zurück',
      next: 'Weiter',
    },
  },
  phases: {
    initialAssessment: {
      title: 'Erzähle uns von deinem Flug',
      description: 'Lassen Sie uns Ihren Flugschaden bewerten',
      flightDetails: 'Ihre Flugdaten',
      bookingNumber: 'Buchungsnummer',
      whatHappened: 'Was ist mit deinem Flug passiert?',
      personalDetails: {
        title: 'Persönliche Angaben',
        subtitle:
          'Bitte gib uns deine Kontaktdaten, damit wir dich über deinen Anspruch auf dem Laufenden halten können.',
      },
      termsAndConditions: {
        title: 'Allgemeine Geschäftsbedingungen',
        subtitle:
          'Bitte überprüfe und akzeptiere die Bedingungen, um fortzufahren.',
        terms:
          'Ich habe die Allgemeinen Geschäftsbedingungen gelesen und akzeptiere sie.',
        privacy:
          'Ich habe die Datenschutzerklärung gelesen und akzeptiere sie.',
        marketing:
          'Ich stimme zu, dass Captain Frank mir Werbung zu Dienstleistungen, Aktionen und Zufriedenheitsumfragen per E-Mail sendet. Captain Frank verarbeitet meine persönlichen Daten zu diesem Zweck (siehe Datenschutzerklärung). Ich kann diese Einwilligung jederzeit widerrufen.',
        marketingDetails:
          'Bleibe über unsere neuesten Dienstleistungen und Reisetipps auf dem Laufenden. Du kannst dich jederzeit abmelden.',
      },
      summary: {
        questionsAnswered: '{count} Fragen beantwortet',
        termsAccepted: 'Bedingungen und Datenschutzerklärung akzeptiert',
        directFlight: 'Direktflug von {from} nach {to}',
        multiSegment: 'Flug mit {count} Segment{s}: {segments}',
      },
      welcomeMessage:
        "Hi, ich bin Captain Frank. Ich helfe dir herauszufinden, ob du Anspruch auf eine Entschädigung für deine Flugunterbrechung hast. Los geht's!",
      continueButton: 'Zur Ersteinschätzung',
      step: 'Schritt {number}',
      counter: {
        single: 'Frage {current} von {total}',
        multiple: 'Fragen {current} von {total}',
      },
    },
    tripExperience: {
      title: 'Reiseerlebnis',
      description: 'Erzählen Sie uns von Ihrer Reiseerfahrung',
      speechBubble:
        'Lass uns über deine Reiseerfahrung sprechen. Das hilft uns zu verstehen, was passiert ist und wie wir dir helfen können.',
      steps: {
        travelStatus: {
          title: 'Was ist mit deinem Flug passiert?',
          eyebrow: 'Schritt 1',
          summary: 'Ihr Reisestatus wurde erfasst',
          questions: {
            travelStatus: {
              title: 'Bitte wähle aus, was passiert ist:',
              options: {
                none: 'Ich bin überhaupt nicht gereist',
                self: 'Ich bin die Flüge geflogen, die ich gebucht hatte',
                provided:
                  'Ich bin anders gereist, auf Kosten der Fluggesellschaft',
                alternativeOwn: 'Ich bin anders gereist, auf eigene Kosten',
              },
            },
            refundStatus: {
              title: 'Wurden deine Ticket Kosten erstattet?',
              options: {
                yes: 'Ja',
                no: 'Nein',
              },
            },
            ticketCost: {
              title: 'Wie viel hast du für dein Ticket bezahlt?',
            },
            alternativeFlightAirlineExpense: {
              title:
                'Bitte suche nach dem alternativen Flug, der von der Fluggesellschaft bereitgestellt wurde.',
              label: 'Alternative Flight',
            },
            alternativeFlightOwnExpense: {
              title:
                'Hast du deinen alternativen Flug auf deine eigenen Kosten gebucht?',
            },
            tripCosts: {
              title:
                'Bitte gib die Kosten an, die du für deine Reise ausgegeben hast.',
            },
          },
          validation: {
            required: 'Bitte wählen Sie Ihren Reisestatus aus',
          },
        },
        informedDate: {
          title: 'Wann wurdest du informiert?',
          eyebrow: 'Schritt 2',
          summary: 'Ihr Informationsdatum wurde erfasst',
          questions: {
            informedDate: {
              title:
                'An welchem Datum wurdest du erstmals von der Fluggesellschaft informiert?',
              options: {
                onDeparture: 'Am Abflugtag',
                specificDate: 'An einem bestimmten Datum',
              },
            },
            specificInformedDate: {
              title:
                'An welchem Datum wurdest du erstmals von der Fluggesellschaft informiert?',
              label: 'Flugdatum',
            },
          },
          validation: {
            required: 'Bitte wählen Sie aus, wann Sie informiert wurden',
            future: 'Das Datum kann nicht in der Zukunft liegen',
            past: 'Das Datum muss in der Vergangenheit liegen',
          },
        },
      },
      summary: {
        travelStatus: {
          traveled: 'Gereist',
          notTraveled: 'Nicht gereist',
          informedDate: 'Informiert am {date}',
        },
      },
      navigation: {
        back: 'Zurück',
        continue: 'Anspruch prüfen',
      },
    },
    agreement: {
      title: 'Vereinbarung',
      description: 'Bitte überprüfen und akzeptieren Sie die Vereinbarung',
      terms: 'Allgemeine Geschäftsbedingungen',
      privacy: 'Datenschutzerklärung',
      signature: 'Unterschrift',
      message:
        'Ich, {salutation} {firstName} {lastName}, wohnhaft in der {address}, {postalCode} {city}, {country}, trete hiermit meine Ansprüche auf Entschädigung aus der Flugverbindung mit PNR/Buchungsnummer {bookingNumber} von {departure}{connection} nach {arrival} am {date} an die Captain Frank GmbH ab.\n\nDie Captain Frank GmbH nimmt die Abtretungserklärung an.',
      step: 'Schritt {number}',
      digitalSignature: {
        title: 'Digitale Unterschrift',
        subtitle: 'Bitte unterschreibe, um deine Zustimmung zu bestätigen.',
        summary: 'Unterschreibe die Vereinbarung, um fortzufahren',
        clearSignature: 'Unterschrift löschen',
      },
      termsAndConditions: {
        title: 'Allgemeine Geschäftsbedingungen',
        subtitle:
          'Bitte überprüfe und akzeptiere die Bedingungen, um fortzufahren.',
        summary: 'Akzeptiere die Allgemeinen Geschäftsbedingungen',
        terms:
          'Ich habe die Allgemeinen Geschäftsbedingungen gelesen und akzeptiere sie.',
        privacy:
          'Ich habe die Datenschutzerklärung gelesen und akzeptiere sie.',
        marketing:
          'Ich stimme zu, dass Captain Frank mir Werbung zu Dienstleistungen, Aktionen und Zufriedenheitsumfragen per E-Mail sendet. Captain Frank verarbeitet meine persönlichen Daten zu diesem Zweck (siehe Datenschutzerklärung). Ich kann diese Einwilligung jederzeit widerrufen.',
        marketingDetails:
          'Bleibe über unsere neuesten Dienstleistungen und Reisetipps auf dem Laufenden. Du kannst dich jederzeit abmelden.',
      },
      submit: 'Jetzt Anspruch auf Entschädigung einreichen',
      navigation: {
        back: 'Zurück',
      },
    },
    names: {
      initialAssessment: 'Erzähle uns von deinem Flug',
      summary: 'Zusammenfassung',
      flightDetails: 'Flugdetails',
      tripExperience: 'Reiseerlebnis',
      claimStatus: 'Antragsstatus',
      agreement: 'Vereinbarung',
    },
    compensationEstimate: {
      title: 'Entschädigungsschätzung',
      description: 'Überprüfen Sie Ihre geschätzte Entschädigung',
      flightSummary: {
        title: 'Flugzusammenfassung',
        passenger: 'Passagier',
        from: 'Von',
        to: 'Nach',
        flight: 'Flug',
        noFlightDetails: 'Keine Flugdetails verfügbar',
      },
      estimatedCompensation: {
        title: 'Geschätzte Entschädigung',
        calculating: 'Entschädigung wird berechnet...',
        disclaimer:
          'Der endgültige Betrag wird festgelegt, nachdem wir deine vollständigen Falldetails überprüft haben.',
      },
      nextSteps: {
        title: 'Nächste Schritte',
        step1: {
          title: 'Flugdetails angeben',
          description:
            'Hilf uns zu verstehen, was mit deinem Flug passiert ist, indem du uns mehr Details zu deiner Reise gibst.',
        },
        step2: {
          title: 'Fall überprüfen',
          description:
            'Wir überprüfen die Details deines Falls und bewerten deine Anspruchsberechtigung auf Entschädigung.',
        },
        step3: {
          title: 'Anspruch einreichen',
          description:
            'Sobald alles bestätigt ist, reichen wir deinen Anspruch ein und übernehmen die gesamte Kommunikation mit der Fluggesellschaft.',
        },
      },
      navigation: {
        back: 'Zurück',
        continue: 'Weiter',
      },
    },
    claimSuccess: {
      title: 'Anspruch erfolgreich',
      description:
        'Der endgültige Betrag wird nach Überprüfung deiner vollständigen Falldetails festgelegt.',
      speechBubble:
        'Glückwunsch! Jetzt, da du deinen Fall abgeschlossen hast, können wir deinen potenziellen Anspruch berechnen (abzüglich 30 % Erfolgsprovision).',
      nextSteps: {
        title: 'Nächste Schritte',
        description: 'Das passiert als Nächstes:',
        steps: {
          review: {
            title: 'Vervollständige deine persönlichen Angaben',
            description: 'Vervollständige deine persönlichen Angaben',
          },
          airline: {
            title: 'Unterschreibe die Abtretungserklärung',
            description:
              'Unterschreibe die Abtretungserklärung (Kosten erfolgen nur bei Erfolg)',
          },
          updates: {
            title: 'Erhalte Updates',
            description:
              'Du erhältst regelmäßige Updates zum Status deines Antrags',
          },
        },
      },
      summary: {
        title: 'Anspruchszusammenfassung',
        flightDetails: 'Flugdetails',
        estimatedCompensation: 'Geschätzte Entschädigung',
        reference: 'Anspruchsreferenz',
        status: 'Status',
        submitted: 'Eingereicht',
      },
      navigation: {
        back: 'Zurück',
        viewStatus: 'Anspruchsstatus anzeigen',
      },
    },
    claimRejected: {
      title: 'Antrag abgelehnt',
      description: 'Leider wurde dein Antrag auf Entschädigung abgelehnt.',
      speechBubble: 'Leider hat es diesmal nicht geklappt!',
      reasons: {
        title: 'Warum wurde dein Anspruch auf Entschädigung abgelehnt?',
        description:
          'Gemäß der EU-Fluggastrechteverordnung (EG 261/2004) gibt es nur in bestimmten Fällen Anspruch auf Entschädigung:',
        items: {
          extraordinaryCircumstances: 'Flugverspätungen von mehr als 3 Stunden',
          shortDelay:
            'Flugstreichungen mit weniger als 14 Tagen Vorankündigung',
          nonEUFlight: 'Nichtbeförderung wegen Überbuchung',
          timeLimitExceeded:
            'Verpasste Anschlussflüge aufgrund des Verschuldens der Fluggesellschaft',
        },
      },
      reasonsBox: {
        title: 'Ablehnungsgründe',
      },
      nextSteps: {
        title: 'Was kann ich jetzt tun?',
        description: '',
        items: {
          contactAirline: 'Kontaktiere die Fluggesellschaft direkt',
          checkOtherFlights:
            'Wusstest du, dass man bis zu 3 Jahre rückwirkend Anspruch auf Entschädigung bei Flugproblemen hat? Prüfe jetzt einen anderen Flug.',
          seekAdvice: 'Hole dir rechtlichen Rat ein',
          contactInsurance:
            'Falls du eine hast, dann kontaktiere deine Reiseversicherungsunternehmen um zu prüfen, ob sie dich entschädigen können.',
        },
      },
      navigation: {
        back: 'Zurück zur Startseite',
        startNew: 'Einen anderen Flug prüfen',
      },
    },
    flightDetails: {
      title: 'Ihre Flugdaten',
      description: 'Geben Sie zusätzliche Details zu Ihrem Flug an',
      steps: {
        flightSelection: {
          title: 'Wähle deinen Flug',
          eyebrow: 'Schritt 1',
          summary: {
            singleFlight: '{airline} {flightNumber} • {departure} → {arrival}',
            multiSegment: '{count} Flüge: {segments}',
          },
        },
        bookingNumber: {
          title: 'Gib deine Buchungsnummer ein',
          eyebrow: 'Schritt 2',
          placeholder: 'Buchungsnummer',
          label: 'Buchungsnummer',
          validation: {
            required: 'Bitte geben Sie Ihre Buchungsnummer ein',
            format:
              'Dein PNR (Passenger Name Record) ist ein 6- oder 13-stelliger Code, der auf deiner Buchungsbestätigung oder deinem E-Ticket zu finden ist.',
          },
        },
      },
      navigation: {
        back: 'Zurück',
        continue: 'Weiter',
      },
      speechBubble: 'Bitte gib uns zusätzliche Details zu deinem Flug.',
    },
    claimSubmitted: {
      title: 'Antrag eingereicht',
      thankYou: 'Vielen Dank, {firstName}!',
      description:
        'Dein Antrag wurde erfolgreich eingereicht. Wir werden deinen Fall prüfen und uns schnellstmöglich bei dir melden.',
      emailConfirmation:
        'Du erhältst eine Bestätigungs-E-Mail an {email} mit deinen Antragsdetails.',
      support:
        'Wenn du Fragen hast oder zusätzliche Informationen bereitstellen möchtest, zögere bitte nicht, unser Support-Team zu kontaktieren.',
      nextSteps: {
        title: 'Nächste Schritte',
        review: 'Wir prüfen deinen Antrag innerhalb von 2-3 Werktagen',
        contact:
          'Unser Team wird sich bei dir melden, falls wir zusätzliche Informationen benötigen',
        updates: 'Du erhältst Updates zum Status deines Antrags per E-Mail',
      },
    },
  },
  flightSelector: {
    types: {
      direct: 'Direktflug',
      multi: 'Multi-Stopp',
    },
    labels: {
      from: 'Von',
      to: 'Nach',
      searchFlights: 'Flüge suchen',
      addFlight: 'Einen weiteren Flug hinzufügen',
      departureDate: 'Flugdatum',
      flightNotFound: 'Flug nicht gefunden?',
      availableFlights: 'Verfügbare Flüge',
      selectPreferred: 'Wählen Sie Ihren bevorzugten Flug',
      searchByFlightNumber: 'Nach Flugnummer suchen',
      searching: 'Suche nach Flügen...',
      noFlightsFound: 'Keine Flüge gefunden',
      noMatchingFlights: 'Keine passenden Flüge',
      tryAdjusting: 'Versuchen Sie, Ihre Suchkriterien anzupassen',
      noFlightsFoundCriteria:
        'Wir konnten keine Flüge finden, die Ihren Kriterien entsprechen.',
      flightsFound:
        '{count} {count, plural, one {Flug} other {Flüge}} gefunden',
    },
    errors: {
      noValidConnecting:
        'Keine gültigen Anschlussflüge gefunden. Bitte versuchen Sie ein anderes Datum oder eine andere Route.',
      noFlightsRoute:
        'Keine Flüge für die ausgewählte Route und das Datum gefunden.',
      departureMismatch:
        'Abflugstadt ({city1}) muss mit der Ankunftsstadt des vorherigen Fluges ({city2}) übereinstimmen',
      departBeforeArrival:
        'Der nächste Flug kann nicht vor der Ankunft des vorherigen Fluges abfliegen',
      minConnectionTime: 'Die Umsteigezeit muss mindestens 30 Minuten betragen',
      maxConnectionTime: 'Die Umsteigezeit darf maximal 48 Stunden betragen',
      connectionTime: 'Umsteigezeit: {hours}h {minutes}m',
    },
    table: {
      flight: 'Flug',
      date: 'Datum',
      departure: 'Abflug',
      arrival: 'Ankunft',
      duration: 'Dauer',
    },
  },
  validation: {
    required: 'Dieses Feld ist erforderlich',
    invalidDate: 'Ungültiges Datum',
    invalidBookingNumber: 'Ungültige Buchungsnummer',
    invalidSignature: 'Bitte geben Sie Ihre Unterschrift an',
  },
  errors: {
    general: 'Etwas ist schief gelaufen',
    network: 'Netzwerkfehler',
    invalidInput: 'Ungültige Eingabe',
  },
  personalDetails: {
    title: 'Persönliche Daten',
    firstName: 'Vorname',
    lastName: 'Nachname',
    email: 'E-Mail',
    phone: 'Telefon',
    address: 'Adresse',
    postalCode: 'Postleitzahl',
    city: 'Stadt',
    country: 'Land',
    salutation: 'Anrede',
  },
};
