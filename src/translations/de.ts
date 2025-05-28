import type { Translations } from "./types";

export const de: Translations = {
  lang: "de",
  common: {
    next: "Weiter",
    back: "Zurück",
    submit: "Absenden",
    cancel: "Abbrechen",
    continue: "Fortfahren",
    loading: "Laden...",
    error: "Fehler",
    success: "Erfolg",
    dateFormat: "DD.MM.YYYY",
    enterAmount: "Betrag eingeben",
    noResults: "Keine Ergebnisse gefunden",
    required: "Erforderlich",
    enterMinChars: "Mindestens 3 Zeichen eingeben",
    finish: "Fertig",
  },
  share: {
    title: "Anspruch teilen",
    description:
      "Teilen Sie diesen Link mit Mitreisenden, damit auch sie ihre Entschädigung beantragen können.",
    copy: "Link kopieren",
    share: "Mit Mitreisenden teilen",
    copied: "Link kopiert!",
    explanation:
      "Wenn jemand diesen Link verwendet, wird sein Antragsformular mit den Flugdaten vorausgefüllt, aber er muss seine eigenen persönlichen Daten angeben.",
  },
  salutation: {
    label: "Anrede",
    mr: "Herr",
    mrs: "Frau",
  },
  welcome: {
    greeting: "Hallo",
    introduction: "ich bin hier, um dir bei",
    purpose: "Flugproblemen zu helfen",
    chatWith: "Chatte mit",
    captainAlt: "Captain Frank",
  },
  qa: {
    title: "Häufig gestellte Fragen",
    description:
      "Finden Sie Antworten auf häufige Fragen zu Flugentschädigungsansprüchen",
    questions: {
      flightIssue:
        "Welche Arten von Flugproblemen berechtigen zu einer Entschädigung?",
      delayDuration:
        "Wie lange muss mein Flug verspätet sein, um eine Entschädigung zu beantragen?",
      compensation: "Wie viel Entschädigung kann ich erhalten?",
      documentation: "Welche Dokumente benötige ich für einen Antrag?",
      process: "Wie funktioniert der Antragsprozess?",
      timeline: "Wie lange dauert es, bis ich eine Entschädigung erhalte?",
      requirements:
        "Welche Voraussetzungen gibt es für die Einreichung eines Antrags?",
      success: "Wie sind meine Erfolgschancen?",
    },
    answers: {
      flightIssue:
        "Sie haben möglicherweise Anspruch auf Entschädigung, wenn Ihr Flug annulliert wurde, sich um mehr als 3 Stunden verspätet hat oder wenn Ihnen das Boarding aufgrund von Überbuchung verweigert wurde.",
      delayDuration:
        "Bei EU-Flügen können Verspätungen von 3 Stunden oder mehr am Endziel zu einer Entschädigung berechtigen. Die genaue Dauer kann je nach Ihren spezifischen Umständen variieren.",
      compensation:
        "Die Entschädigungsbeträge liegen typischerweise zwischen 250€ und 600€, abhängig von der Flugdistanz und der Art der Störung.",
      documentation:
        "Sie benötigen Ihre Buchungsbestätigung, Bordkarten (falls verfügbar) und jegliche Kommunikation mit der Fluggesellschaft über die Störung.",
      process:
        "Unser Prozess ist einfach: Wir sammeln Ihre Flugdaten, überprüfen Ihren Anspruch, übernehmen die gesamte Kommunikation mit der Fluggesellschaft und sichern Ihre Entschädigung.",
      timeline:
        "Während einfache Fälle innerhalb weniger Wochen gelöst werden können, können komplexe Fälle mehrere Monate dauern. Wir arbeiten daran, Ansprüche so schnell wie möglich zu bearbeiten.",
      requirements:
        "Ihr Flug muss entweder von der EU starten oder von einer EU-Fluggesellschaft in die EU durchgeführt werden, und die Verspätung darf nicht auf außergewöhnliche Umstände zurückzuführen sein.",
      success:
        "Die Erfolgsquoten variieren je nach den spezifischen Umständen Ihres Falls. Wir bearbeiten nur Ansprüche, die gute Erfolgsaussichten haben.",
    },
  },
  wizard: {
    questions: {
      issueType: {
        text: "Welche Art von Problem hattest du?",
        options: {
          delay: "Verspäteter Flug",
          cancel: "Abgesagter Flug",
          missed: "Anschlussflug verpasst",
          other: "Anderes Problem",
        },
      },
      delayDuration: {
        text: "Wie lange war dein Flug verspätet?",
        options: {
          lessThan2: "Weniger als 2 Stunden",
          between2And3: "2-3 Stunden",
          moreThan3: "Mehr als 3 Stunden",
        },
      },
      cancellationNotice: {
        text: "Wann wurdest du über die Annullierung informiert?",
        options: {
          notAtAll: "Gar nicht",
          zeroToSeven: "0-7 Tage",
          eightToFourteen: "8-14 Tage",
          moreThanFourteen: "Mehr als 14 Tage",
        },
      },
      missedCosts: {
        text: "Hattest du lästige zusätzliche Kosten (z. B. Hotel, Taxi, Essen)?",
        options: {
          yes: "Ja",
          no: "Nein",
        },
      },
      missedCostsAmount: {
        text: "Sag mir ungefähr, wie viel du ausgegeben hast. Wir erledigen den Papierkram am Ende.",
      },
      alternativeFlightAirline: {
        text: "Hat dir die Airline einen alternativen Flug gebucht?",
        options: {
          yes: "Ja",
          no: "Nein",
        },
      },
      alternativeFlightOwn: {
        text: "Hast du deinen alternativen Flug auf deine eigenen Kosten gebucht?",
        options: {
          yes: "Ja",
          no: "Nein",
        },
      },
      refundStatus: {
        text: "Wurden deine Ticket Kosten erstattet?",
        options: {
          yes: "Ja",
          no: "Nein",
        },
      },
    },
    success: {
      title: "Erfolg!",
      processing: "Wir verarbeiten deine Informationen...",
      backToQuestions: "Zurück zu den Fragen",
      goodChance: "Super! Du hast gute Chancen auf eine Entschädigung.",
      answersSaved: "Deine Antworten wurden gespeichert.",
    },
    navigation: {
      back: "Zurück",
      next: "Weiter",
    },
  },
  phases: {
    unauthorized: {
      title: "Seite nicht zugänglich",
      message:
        "Bitte schließen Sie die vorherigen Schritte ab, bevor Sie auf diese Seite zugreifen.",
      titles: {
        1: "Ersteinschätzung nicht zugänglich",
        2: "Entschädigungsschätzung nicht zugänglich",
        3: "Flugdetails nicht zugänglich",
        4: "Reiseerlebnis nicht zugänglich",
        5: "Antragsstatusseite nicht zugänglich",
        6: "Vereinbarungsseite nicht zugänglich",
        7: "Antragsübermittlung nicht verfügbar",
        8: "Antragsablehnungsseite nicht zugänglich",
      },
      messages: {
        1: "Bitte starten Sie Ihren Antrag von Anfang an.",
        2: "Bitte schließen Sie die Ersteinschätzung ab, bevor Sie auf die Entschädigungsschätzung zugreifen.",
        3: "Bitte schließen Sie die Entschädigungsschätzung ab, bevor Sie auf die Flugdetails zugreifen.",
        4: "Bitte schließen Sie die Flugdetails ab, bevor Sie auf das Reiseerlebnis zugreifen.",
        5: "Bitte schließen Sie das Reiseerlebnis ab, bevor Sie auf die Antragsstatusseite zugreifen.",
        "5_1":
          "Ihr Anspruch wurde akzeptiert. Bitte fahren Sie mit der Erfolgsseite fort.",
        "5_2":
          "Ihr Anspruch wurde abgelehnt. Bitte fahren Sie mit der Ablehnungsseite fort.",
        "5_3":
          "Bitte schließen Sie zuerst die Reiseerfahrungsseite ab, um Ihren Anspruchsstatus zu bestimmen.",
        6: "Bitte schließen Sie den Anspruchsstatus ab, bevor Sie auf die Vereinbarungsseite zugreifen.",
        7: "Bitte schließen Sie die Vereinbarung ab, bevor Sie Ihre Anspruchseinreichung einsehen.",
        8: "Bitte schließen Sie die vorherigen Schritte ab, bevor Sie auf die Antragsablehnungsseite zugreifen.",
      },
      backText: {
        1: "Zurück zur Ersteinschätzung",
        2: "Zurück zur Entschädigungsschätzung",
        3: "Zurück zu den Flugdetails",
        4: "Zurück zur Reiseerfahrung",
        5: "Zurück zum Anspruchsstatus",
        "5_1": "Zur Erfolgsseite",
        "5_2": "Zur Ablehnungsseite",
        "5_3": "Zur Reiseerfahrung",
        6: "Zurück zur Vereinbarung",
        7: "Zurück zur Anspruchseinreichung",
        8: "Zurück zum vorherigen Schritt",
      },
    },
    initialAssessment: {
      title: "Erzähle uns von deinem Flug",
      description: "Lass uns deinen Flugschaden bewerten",
      flightDetails: "Flugdaten",
      bookingNumber: "Buchungsnummer",
      whatHappened: "Was ist mit deinem Flug passiert?",
      whatHappenedSubtitle:
        'Hattest du einen Anschlussflug? Dann gebe bitte deine Flüge unter "Multi-Stopp" ein.',
      flightDetailsDescription:
        "Hattest du einen Flug? Gib bitte deine Flugdaten an",
      wizard: {
        title: "Was ist mit deinem Flug passiert?",
        description:
          "Bitte beantworten Sie einige Fragen zu Ihrer Flugerfahrung",
        successMessage: "Antworten erfolgreich gespeichert!",
      },
      personalDetails: {
        title: "Persönliche Angaben",
        description: "Geben Sie Ihre Kontaktinformationen ein",
      },
      consent: {
        title: "Allgemeine Geschäftsbedingungen",
        description:
          "Bitte überprüfe und akzeptiere die Bedingungen, um fortzufahren.",
        terms: "Ich akzeptiere die Geschäftsbedingungen",
        privacy: "Ich akzeptiere die Datenschutzerklärung",
        marketing: "Ich möchte Marketing-Mitteilungen erhalten",
        marketingDetails: "Sie können sich jederzeit abmelden",
      },
      termsAndConditions: {
        title: "Allgemeine Geschäftsbedingungen",
        subtitle:
          "Bitte überprüfe und akzeptiere die Bedingungen, um fortzufahren.",
        description:
          "Bitte überprüfe die folgenden Bedingungen und bestätige deine Zustimmung.",
        summary: "Zusammenfassung der Bedingungen",
        terms:
          "Ich habe die Allgemeinen Geschäftsbedingungen gelesen und akzeptiere sie.",
        privacy:
          "Ich habe die Datenschutzerklärung gelesen und akzeptiere sie.",
        marketing:
          "Ich stimme zu, dass Captain Frank mir Werbung zu Dienstleistungen, Aktionen und Zufriedenheitsumfragen per E-Mail sendet. Captain Frank verarbeitet meine persönlichen Daten zu diesem Zweck (siehe Datenschutzerklärung). Ich kann diese Einwilligung jederzeit widerrufen.",
        marketingDetails:
          "Bleibe über unsere neuesten Dienstleistungen und Reisetipps auf dem Laufenden. Du kannst dich jederzeit abmelden.",
      },
      summary: {
        directFlight: "Flug von {from} nach {to}",
        questionsAnswered: "Fragen beantwortet",
        termsAccepted: "Bedingungen akzeptiert",
      },
      welcomeMessage:
        "Hi, ich bin Captain Frank. Ich helfe dir herauszufinden, ob du Anspruch auf eine Entschädigung für deine Flugunterbrechung hast. Los geht's!",
      continueButton: "Weiter",
      stepProgress: "Schritt {current} von {total}",
      step: "Schritt",
      counter: {
        single: "Frage {current} von {total}",
        multiple: "Fragen {current} von {total}",
      },
      navigation: {
        title: "Navigation",
        description: "Navigiere durch die Bewertung",
        back: "Zurück",
        continue: "Weiter",
      },
      steps: {
        flightDetails: {
          title: "Flugdaten",
          description: "Gib deine Flugdaten ein",
        },
        questionnaire: {
          title: "Fragebogen",
          description: "Beantworte einige Fragen",
        },
        personalDetails: {
          title: "Persönliche Angaben",
          description: "Gib deine Kontaktdaten ein",
        },
        termsAndConditions: {
          title: "Allgemeine Geschäftsbedingungen",
          description: "Überprüfe und akzeptiere die Bedingungen",
        },
      },
    },
    tripExperience: {
      title: "Reiseerlebnis",
      description: "Erzählen Sie uns von Ihrer Reiseerfahrung",
      speechBubble:
        "Lass uns über deine Reiseerfahrung sprechen. Das hilft uns zu verstehen, was passiert ist und wie wir dir helfen können.",
      steps: {
        travelStatus: {
          title: "Wie ist deine tatsächliche Reise verlaufen?",
          eyebrow: "Schritt 1",
          summary: "Ihr Reisestatus wurde erfasst",
          questions: {
            travelStatus: {
              title: "Bitte wähle aus, was passiert ist:",
              options: {
                none: "Ich bin überhaupt nicht gereist",
                self: "Ich bin die Flüge geflogen, die ich gebucht hatte",
                provided:
                  "Ich bin anders gereist, auf Kosten der Fluggesellschaft",
                alternativeOwn: "Ich bin anders gereist, auf eigene Kosten",
              },
            },
            refundStatus: {
              title: "Wurden deine Ticket Kosten erstattet?",
              options: {
                yes: "Ja",
                no: "Nein",
              },
            },
            ticketCost: {
              title:
                "Bitte gib die Kosten an, die du für deine Reise ausgegeben hast.",
            },
            alternativeFlightAirlineExpense: {
              title:
                "Bitte gebe all deine Flüge an, die du tatsächlich geflogen bist",
              label: "Alternative Flight",
            },
            alternativeFlightOwnExpense: {
              title:
                "Hast du deinen alternativen Flug auf deine eigenen Kosten gebucht?",
            },
            tripCosts: {
              title:
                "Bitte gib die Kosten an, die du für deine Reise ausgegeben hast.",
            },
          },
          validation: {
            required: "Bitte wählen Sie Ihren Reisestatus aus",
          },
        },
        informedDate: {
          title: "Wann wurdest du informiert?",
          eyebrow: "Schritt 2",
          summary: "Ihr Informationsdatum wurde erfasst",
          questions: {
            informedDate: {
              title:
                "An welchem Datum wurdest du erstmals von der Fluggesellschaft informiert?",
              options: {
                onDeparture: "Am Abflugtag",
                specificDate: "An einem bestimmten Datum",
              },
            },
            specificInformedDate: {
              title:
                "An welchem Datum wurdest du erstmals von der Fluggesellschaft informiert?",
              label: "Flugdatum",
            },
          },
          validation: {
            required: "Bitte wählen Sie aus, wann Sie informiert wurden",
            future: "Das Datum kann nicht in der Zukunft liegen",
            past: "Das Datum muss in der Vergangenheit liegen",
          },
        },
      },
      summary: {
        travelStatus: {
          traveled: "Gereist",
          notTraveled: "Nicht gereist",
          informedDate: "Informiert am {date}",
        },
      },
      navigation: {
        back: "Zurück",
        continue: "Anspruch prüfen",
      },
    },
    agreement: {
      title: "Vereinbarung",
      description: "Bitte überprüfen und akzeptieren Sie die Vereinbarung",
      terms: "Allgemeine Geschäftsbedingungen",
      privacy: "Datenschutzerklärung",
      signature: "Unterschrift",
      message:
        "Ich, {salutation} {firstName} {lastName}, wohnhaft in der {address}, {postalCode} {city}, {country}, trete hiermit meine Ansprüche auf Entschädigung aus der Flugverbindung mit PNR/Buchungsnummer {bookingNumber} von {departure}{connection} nach {arrival} am {date} an die Captain Frank GmbH ab.\n\nDie Captain Frank GmbH nimmt die Abtretungserklärung an.",
      step: "Schritt {number}",
      digitalSignature: {
        title: "Digitale Unterschrift",
        subtitle: "Bitte unterschreibe, um deine Zustimmung zu bestätigen.",
        summary: "Unterschreibe die Vereinbarung, um fortzufahren",
        clearSignature: "Unterschrift löschen",
        validation: {
          required: "Bitte unterschreibe das Dokument",
        },
      },
      termsAndConditions: {
        title: "Allgemeine Geschäftsbedingungen",
        subtitle:
          "Bitte überprüfe und akzeptiere die Bedingungen, um fortzufahren.",
        summary: "Zusammenfassung der Bedingungen",
        terms:
          "Ich habe die Allgemeinen Geschäftsbedingungen gelesen und akzeptiere sie.",
        privacy:
          "Ich habe die Datenschutzerklärung gelesen und akzeptiere sie.",
        marketing:
          "Ich stimme zu, dass Captain Frank mir Werbung zu Dienstleistungen, Aktionen und Zufriedenheitsumfragen per E-Mail sendet. Captain Frank verarbeitet meine persönlichen Daten zu diesem Zweck (siehe Datenschutzerklärung). Ich kann diese Einwilligung jederzeit widerrufen.",
        marketingDetails:
          "Bleibe über unsere neuesten Dienstleistungen und Reisetipps auf dem Laufenden. Du kannst dich jederzeit abmelden.",
      },
      submit: "Jetzt Anspruch auf Entschädigung einreichen",
      navigation: {
        back: "Zurück",
      },
    },
    names: {
      initialAssessment: "Erste Einschätzung",
      summary: "Entschädigungsschätzung",
      flightDetails: "Flugdetails",
      tripExperience: "Reiseerfahrung",
      claimStatus: "Antragsstatus",
      agreement: "Vereinbarung",
      claimSuccess: "Antrag erfolgreich",
      claimSubmitted: "Antrag eingereicht",
    },
    compensationEstimate: {
      title: "Entschädigungsschätzung",
      description:
        "Es gibt eine gute Chance, dass du Anspruch auf eine Entschädigung hast! Lass mich dir helfen. Komplett risikofrei: Ich erhalte nur eine Erfolgsprovision von 30% (inkl. MwSt.), wenn ich erfolgreich bin.",
      flightSummary: {
        title: "Flugzusammenfassung",
        passenger: "Passagier",
        from: "Von",
        to: "Nach",
        flight: "Flug",
        noFlightDetails: "Keine Flugdetails verfügbar",
      },
      estimatedCompensation: {
        title: "Geschätzte Entschädigung",
        calculating: "Entschädigung wird berechnet...",
        disclaimer:
          "Der endgültige Betrag wird festgelegt, nachdem wir deine vollständigen Falldetails überprüft haben.",
        errorMessage:
          "Wir haben Schwierigkeiten, den genauen Betrag zu berechnen. Dies ist eine Schätzung.",
        estimate: "(Schätzung)",
      },
      nextSteps: {
        title: "Nächste Schritte",
        step1: {
          title: "Flugdetails angeben",
          description:
            "Hilf uns zu verstehen, was mit deinem Flug passiert ist, indem du uns mehr Details zu deiner Reise gibst.",
        },
        step2: {
          title: "Fall überprüfen",
          description:
            "Wir überprüfen die Details deines Falls und bewerten deine Anspruchsberechtigung auf Entschädigung.",
        },
        step3: {
          title: "Anspruch einreichen",
          description:
            "Sobald alles bestätigt ist, reichen wir deinen Anspruch ein und übernehmen die gesamte Kommunikation mit der Fluggesellschaft.",
        },
      },
      navigation: {
        back: "Zurück",
        continue: "Weiter",
      },
    },
    claimSuccess: {
      title: "Anspruch erfolgreich",
      description:
        "Der endgültige Betrag wird nach Überprüfung deiner vollständigen Falldetails festgelegt.",
      speechBubble:
        "Glückwunsch! Jetzt, da du deinen Fall abgeschlossen hast, können wir deinen potenziellen Anspruch berechnen (abzüglich 30 % Erfolgsprovision).",
      nextSteps: {
        title: "Nächste Schritte",
        description: "Das passiert als Nächstes:",
        steps: {
          review: {
            title: "Vervollständige deine persönlichen Angaben",
            description: "Vervollständige deine persönlichen Angaben",
          },
          airline: {
            title: "Unterschreibe die Abtretungserklärung",
            description:
              "Unterschreibe die Abtretungserklärung (Kosten erfolgen nur bei Erfolg)",
          },
          updates: {
            title: "Erhalte Updates",
            description:
              "Du erhältst regelmäßige Updates zum Status deines Antrags",
          },
        },
      },
      summary: {
        title: "Anspruchszusammenfassung",
        flightDetails: "Flugdetails",
        estimatedCompensation: "Geschätzte Entschädigung",
        reference: "Anspruchsreferenz",
        status: "Status",
        submitted: "Eingereicht",
      },
      navigation: {
        back: "Zurück",
        viewStatus: "Weiter zur Vereinbarung",
      },
      accessDenied: {
        title: "Ihr Anspruch wurde anerkannt",
        message:
          "Ihr Anspruch wurde anerkannt. Sie können nicht auf die Ablehnungsseite zugreifen, da Ihr Anspruch erfolgreich war.",
        back: "Zurück zur Anspruchsbestätigung",
      },
    },
    claimRejected: {
      title: "Antrag abgelehnt",
      description: "Leider wurde dein Antrag auf Entschädigung abgelehnt.",
      speechBubble: "Leider hat es diesmal nicht geklappt!",
      reasons: {
        title: "Warum wurde dein Anspruch auf Entschädigung abgelehnt?",
        description:
          "Gemäß der EU-Fluggastrechteverordnung (EG 261/2004) gibt es nur in bestimmten Fällen Anspruch auf Entschädigung:",
        items: {
          extraordinaryCircumstances: "Flugverspätungen von mehr als 3 Stunden",
          shortDelay:
            "Flugstreichungen mit weniger als 14 Tagen Vorankündigung",
          nonEUFlight: "Nichtbeförderung wegen Überbuchung",
          timeLimitExceeded:
            "Verpasste Anschlussflüge aufgrund des Verschuldens der Fluggesellschaft",
        },
      },
      reasonsBox: {
        title: "Ablehnungsgründe",
      },
      nextSteps: {
        title: "Was kann ich jetzt tun?",
        description: "",
        items: {
          contactAirline: "Kontaktiere die Fluggesellschaft direkt",
          checkOtherFlights:
            "Wusstest du, dass man bis zu 3 Jahre rückwirkend Anspruch auf Entschädigung bei Flugproblemen hat? Prüfe jetzt einen anderen Flug.",
          seekAdvice: "Hole dir rechtlichen Rat ein",
          contactInsurance:
            "Prüfe, ob deine Reiseversicherung diese Situation abdeckt",
        },
      },
      navigation: {
        back: "Zurück",
        startNew: "Einen anderen Flug prüfen",
      },
      accessDenied: {
        title: "Ihr Anspruch wurde abgelehnt",
        message:
          "Ihr Anspruch wurde abgelehnt. Sie können nicht auf die Erfolgsseite zugreifen, da Ihr Anspruch abgelehnt wurde.",
        back: "Zurück zur Ablehnungsseite",
      },
    },
    flightDetails: {
      title: "Ihre Flugdaten",
      description:
        "Bitte gebe nun das jeweilige Datum zu deinem Flug an, damit wir die Flugnummer pro Flug ermitteln können. Weiter unten siehst du dann eine Auflistung deiner gewählten Flüge.",
      steps: {
        flightSelection: {
          title: "Wähle deinen Flug",
          eyebrow: "Schritt 1",
          summary: {
            singleFlight: "{airline} {flightNumber} • {departure} → {arrival}",
            multiSegment: "{count} Flüge: {segments}",
          },
        },
        bookingNumber: {
          title: "Gib deine Buchungsnummer ein",
          eyebrow: "Schritt 2",
          placeholder: "Buchungsnummer",
          label: "Buchungsnummer",
          validation: {
            required: "Bitte geben Sie Ihre Buchungsnummer ein",
            format:
              "Dein PNR (Passenger Name Record) ist ein 6- oder 13-stelliger Code, der auf deiner Buchungsbestätigung oder deinem E-Ticket zu finden ist.",
          },
        },
      },
      navigation: {
        back: "Zurück",
        continue: "Weiter",
      },
      speechBubble: "Bitte gib uns zusätzliche Details zu deinem Flug.",
    },
    claimSubmitted: {
      title: "Antrag eingereicht!",
      thankYou: "Vielen Dank, {firstName}!",
      description:
        "Dein Antrag wurde erfolgreich eingereicht. Wenn du bereits Dokumente zur Hand hast, kannst du sie jetzt optional hochladen. Du kannst den Anspruch auch mit deinen Mitreisenden teilen.",
      emailConfirmation:
        "Du erhältst eine Bestätigungs-E-Mail an {email} mit deinen Antragsdetails.",
      support:
        "Wenn du Fragen hast oder zusätzliche Informationen bereitstellen möchtest, zögere bitte nicht, unser Support-Team zu kontaktieren.",
      nextSteps: {
        title: "Nächste Schritte",
        review: "Wir prüfen deinen Antrag innerhalb von 2-3 Werktagen",
        contact:
          "Unser Team wird sich bei dir melden, falls wir zusätzliche Informationen benötigen",
        updates: "Du erhältst Updates zum Status deines Antrags per E-Mail",
      },
      navigation: {
        title: "Möchten Sie von vorne beginnen?",
        description:
          "Wenn Sie eine Forderung für einen anderen Flug einreichen oder komplett neu beginnen müssen, können Sie alles zurücksetzen und einen neuen Forderungsprozess starten.",
        confirmMessage:
          "Sind Sie sicher, dass Sie von vorne beginnen möchten? Dies wird alle Ihre aktuellen Forderungsdaten löschen und kann nicht rückgängig gemacht werden.",
        restart: "Neuen Antrag starten",
      },
    },
    documentUpload: {
      title: "Dokumente hochladen",
      description:
        "Bitte laden Sie die erforderlichen Unterlagen zur Unterstützung Ihres Antrags hoch.",
      speechBubble:
        "Bitte laden Sie Ihre Buchungsbestätigung und eventuelle Benachrichtigungen der Fluggesellschaft über die Flugannullierung hoch.",
      bookingConfirmation: {
        title: "Buchungsbestätigung",
        description:
          "Laden Sie Ihre Buchungsbestätigung oder E-Ticket hoch (optional)",
      },
      cancellationNotification: {
        title: "Stornierungsbenachrichtigung",
        description:
          "Laden Sie eventuelle Benachrichtigungen der Fluggesellschaft über die Flugannullierung hoch (optional)",
      },
      sharing: {
        title: "Anspruch teilen",
        description:
          "Teilen Sie diesen Link mit Mitreisenden, damit auch sie ihre Entschädigung beantragen können.",
        copy: "Link kopieren",
      },
      upload: "Datei hochladen",
      submit: "Absenden",
      remove: "Datei entfernen",
      errors: {
        noBookingConfirmation: "Bitte laden Sie Ihre Buchungsbestätigung hoch",
        uploadFailed:
          "Dokumente konnten nicht hochgeladen werden. Bitte versuchen Sie es erneut.",
      },
      navigation: {
        back: "Zurück",
        continue: "Weiter",
        checkAnotherFlight: "Weiteren Flug prüfen",
      },
    },
  },
  flightSelector: {
    types: {
      direct: "Direktflug",
      multi: "Multi-Stopp",
    },
    labels: {
      from: "Von",
      to: "Nach",
      searchFlights: "Flüge suchen",
      addFlight: "Einen weiteren Flug hinzufügen",
      departureDate: "Flugdatum",
      flightNotFound: "Flug nicht gefunden?",
      availableFlights: "Verfügbare Flüge",
      selectPreferred: "Wählen Sie Ihren bevorzugten Flug",
      searchByFlightNumber: "Nach Flugnummer suchen",
      searching: "Suche nach Flügen...",
      noFlightsFound: "Keine Flüge gefunden",
      noMatchingFlights: "Keine passenden Flüge",
      tryAdjusting: "Versuchen Sie, Ihre Suchkriterien anzupassen",
      noFlightsFoundCriteria:
        "Wir konnten keine Flüge finden, die Ihren Kriterien entsprechen.",
      flightsFound:
        "{count} {count, plural, one {Flug} other {Flüge}} gefunden",
    },
    flightNotListed: {
      button: "Flug nicht aufgeführt?",
      title: "Flug nicht aufgeführt?",
      description:
        "Überprüfen Sie Ihre Suchdetails (Abflug, Ziel und Datum). Falls der Flug immer noch fehlt, teilen Sie uns dies unten mit. Wir fügen ihn hinzu, benachrichtigen Sie per E-Mail und Sie können Ihre Anfrage fortsetzen.",
      form: {
        firstName: "Vorname",
        lastName: "Nachname",
        email: "E-Mail",
        description: "",
        descriptionPlaceholder:
          "Bitte gib Details zu deinem Flug an (z.B. Fluggesellschaft, Flugnummer, Route, Datum)",
        submit: "Absenden",
        submitting: "Wird gesendet...",
        success:
          "Vielen Dank! Wir haben Ihre Flugdaten erhalten und werden uns in Kürze bei Ihnen melden.",
        characterCount: "{count} / {max} Zeichen",
      },
    },
    errors: {
      noValidConnecting:
        "Keine gültigen Anschlussflüge gefunden. Bitte versuchen Sie ein anderes Datum oder eine andere Route.",
      noFlightsRoute:
        "Keine Flüge für die ausgewählte Route und das Datum gefunden.",
      departureMismatch:
        "Abflugstadt ({city1}) muss mit der Ankunftsstadt des vorherigen Fluges ({city2}) übereinstimmen",
      departBeforeArrival:
        "Der nächste Flug kann nicht vor der Ankunft des vorherigen Fluges abfliegen",
      minConnectionTime: "Die Umsteigezeit muss mindestens 30 Minuten betragen",
      maxConnectionTime: "Die Umsteigezeit darf maximal 48 Stunden betragen",
      connectionTime: "Umsteigezeit: {hours}h {minutes}m",
    },
    table: {
      flight: "Flug",
      date: "Datum",
      departure: "Abflug",
      arrival: "Ankunft",
      duration: "Dauer",
    },
  },
  validation: {
    required: "Pflichtfeld",
    invalidDate: "Ungültiges Datum",
    invalidBookingNumber: "Ungültige Buchungsnummer",
    invalidSignature: "Ungültige Unterschrift",
    dateFormat:
      "Bitte geben Sie ein Datum im Format TT.MM.JJ oder TT.MM.JJJJ ein",
    incompleteDateFormat:
      "Bitte vervollständigen Sie das Datum im Format TT.MM.JJ oder TT.MM.JJJJ",
  },
  errors: {
    general: "Etwas ist schief gelaufen",
    network: "Netzwerkfehler",
    invalidInput: "Ungültige Eingabe",
  },
  personalDetails: {
    title: "Persönliche Angaben",
    firstName: "Vorname",
    lastName: "Nachname",
    email: "E-Mail",
    phone: "Telefon",
    address: "Adresse",
    postalCode: "Postleitzahl",
    city: "Stadt",
    country: "Land",
    salutation: "Anrede",
  },
};
