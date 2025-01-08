import type { Question } from '@/types/experience';
import type { Answer } from '@/types/wizard';

export const wizardQuestions: Question[] = [
  {
    id: 'issue_type',
    text: 'Welche Art von Problem hattest du?',
    type: 'radio',
    options: [
      { id: 'delay', label: 'Verspäteter Flug', value: 'delay' },
      { id: 'cancel', label: 'Abgesagter Flug', value: 'cancel' },
      { id: 'missed', label: 'Anschlussflug verpasst', value: 'missed' },
      {
        id: 'other',
        label: 'Anderes Problem',
        value: 'other',
        externalLink: 'https://www.captain-frank.com/de/ueberuns#UeberUns_Form',
        openInNewTab: true,
      },
    ],
  },
  {
    id: 'delay_duration',
    text: 'Wie lange war dein Flug verspätet?',
    type: 'radio',
    options: [
      { id: 'less2', label: 'Weniger als 2 Stunden', value: '<2' },
      { id: '2to3', label: '2-3 Stunden', value: '2-3' },
      {
        id: 'more3',
        label: 'Mehr als 3 Stunden',
        value: '>3',
        showConfetti: true,
      },
    ],
    showIf: (answers: Answer[]) =>
      answers.find((a) => a.questionId === 'issue_type')?.value === 'delay',
  },
  {
    id: 'cancellation_notice',
    text: 'Wann wurdest du über die Annullierung informiert?',
    type: 'radio',
    options: [
      {
        id: 'not_at_all',
        label: 'Gar nicht',
        value: 'none',
        showConfetti: true,
      },
      { id: '0_7_days', label: '0-7 Tage', value: '0-7', showConfetti: true },
      { id: '8_14_days', label: '8-14 Tage', value: '8-14', showCheck: true },
      {
        id: 'over_14_days',
        label: 'Mehr als 14 Tage',
        value: '>14',
        showCheck: true,
      },
    ],
    showIf: (answers: Answer[]) =>
      answers.find((a) => a.questionId === 'issue_type')?.value === 'cancel',
  },
  {
    id: 'missed_costs',
    text: 'Hattest du lästige zusätzliche Kosten (z. B. Hotel, Taxi, Essen)?',
    type: 'radio',
    options: [
      { id: 'yes', label: 'Ja', value: 'yes' },
      { id: 'no', label: 'Nein', value: 'no', showCheck: true },
    ],
    showIf: (answers: Answer[]) =>
      answers.find((a) => a.questionId === 'issue_type')?.value === 'missed',
  },
  {
    id: 'missed_costs_amount',
    text: 'Sag mir ungefähr, wie viel du ausgegeben hast. Wir erledigen den Papierkram am Ende.',
    type: 'money',
    showIf: (answers: Answer[]) =>
      answers.find((a) => a.questionId === 'issue_type')?.value === 'missed' &&
      answers.find((a) => a.questionId === 'missed_costs')?.value === 'yes',
  },
  {
    id: 'alternative_flight_airline_expense',
    text: 'Hat dir die Airline einen alternativen Flug gebucht?',
    type: 'radio',
    options: [
      { id: 'yes', label: 'Ja', value: 'yes' },
      { id: 'no', label: 'Nein', value: 'no' },
    ],
    showIf: (answers: Answer[]) =>
      answers.find((a) => a.questionId === 'issue_type')?.value === 'cancel',
  },
  {
    id: 'alternative_flight_own_expense',
    text: 'Hast du deinen alternativen Flug auf deine eigenen Kosten gebucht?',
    type: 'radio',
    options: [
      { id: 'yes', label: 'Ja', value: 'yes' },
      { id: 'no', label: 'Nein', value: 'no' },
    ],
    showIf: (answers: Answer[]) =>
      answers.find((a) => a.questionId === 'issue_type')?.value === 'cancel' &&
      answers.find((a) => a.questionId === 'alternative_flight_airline_expense')
        ?.value === 'no',
  },
  {
    id: 'refund_status',
    text: 'Wurden deine Ticket Kosten erstattet?',
    type: 'radio',
    options: [
      { id: 'yes', label: 'Ja', value: 'yes' },
      { id: 'no', label: 'Nein', value: 'no' },
    ],
    showIf: (answers: Answer[]) =>
      answers.find((a) => a.questionId === 'issue_type')?.value === 'cancel',
  },
];
