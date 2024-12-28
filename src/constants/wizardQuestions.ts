import type { Question } from '@/types/experience';
import type { Answer } from '@/types/wizard';

export const wizardQuestions: Question[] = [
  {
    id: 'issue_type',
    text: 'What type of issue did you experience?',
    type: 'radio',
    options: [
      { id: 'delay', label: 'Delayed Flight', value: 'delay' },
      { id: 'cancel', label: 'Canceled Flight', value: 'cancel' },
      { id: 'missed', label: 'Missed Connection', value: 'missed' },
      {
        id: 'other',
        label: 'Other Issue',
        value: 'other',
        externalLink: 'https://www.captain-frank.com/de/ueberuns#UeberUns_Form',
        openInNewTab: true,
      },
    ],
  },
  {
    id: 'delay_duration',
    text: 'How long was your flight delayed?',
    type: 'radio',
    options: [
      { id: 'less2', label: 'Less than 2 hours', value: '<2' },
      { id: '2to3', label: '2-3 hours', value: '2-3' },
      {
        id: 'more3',
        label: 'More than 3 hours',
        value: '>3',
        showConfetti: true,
      },
    ],
    showIf: (answers: Answer[]) =>
      answers.find((a) => a.questionId === 'issue_type')?.value === 'delay',
  },
  {
    id: 'cancellation_notice',
    text: 'When were you informed about the cancellation?',
    type: 'radio',
    options: [
      {
        id: 'not_at_all',
        label: 'Not at all',
        value: 'none',
        showConfetti: true,
      },
      { id: '0_7_days', label: '0-7 days', value: '0-7', showConfetti: true },
      { id: '8_14_days', label: '8-14 days', value: '8-14', showCheck: true },
      {
        id: 'over_14_days',
        label: 'Over 14 days',
        value: '>14',
        showCheck: true,
      },
    ],
    showIf: (answers: Answer[]) =>
      answers.find((a) => a.questionId === 'issue_type')?.value === 'cancel',
  },
  {
    id: 'missed_costs',
    text: 'Did you have annoying additional costs (e.g. hotel, taxi, food costs)?',
    type: 'radio',
    options: [
      { id: 'yes', label: 'Yes', value: 'yes' },
      { id: 'no', label: 'No', value: 'no', showCheck: true },
    ],
    showIf: (answers: Answer[]) =>
      answers.find((a) => a.questionId === 'issue_type')?.value === 'missed',
  },
  {
    id: 'missed_costs_amount',
    text: "Let me know approximately how much you spent. We'll do the paperwork at the end.",
    type: 'money',
    showIf: (answers: Answer[]) =>
      answers.find((a) => a.questionId === 'issue_type')?.value === 'missed' &&
      answers.find((a) => a.questionId === 'missed_costs')?.value === 'yes',
  },
];
