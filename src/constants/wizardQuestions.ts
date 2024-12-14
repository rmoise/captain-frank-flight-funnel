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
      { id: 'denied', label: 'Denied Boarding', value: 'denied' },
      { id: 'other', label: 'Other Issue', value: 'other' },
    ],
  },
  {
    id: 'delay_duration',
    text: 'What type of issue did you experience?',
    type: 'radio',
    options: [
      { id: 'less2', label: 'Less than 2 hours', value: '<2' },
      { id: '2to3', label: '2-3 hours', value: '2-3' },
      { id: 'more3', label: 'More than 3 hours', value: '>3' },
    ],
    showIf: (answers: Answer[]) =>
      answers.find(a => a.questionId === 'issue_type')?.value === 'delay',
  },
  {
    id: 'cancellation_notice',
    text: 'When were you informed about the cancellation?',
    type: 'radio',
    options: [
      { id: 'at_airport', label: 'At the airport', value: 'none' },
      { id: 'same_day', label: 'Same day', value: '0' },
      { id: '1_7_days', label: '1-7 days before', value: '1-7' },
      { id: '8_14_days', label: '8-14 days before', value: '8-14' },
      { id: 'over_14_days', label: 'More than 14 days before', value: '>14' },
    ],
    showIf: (answers: Answer[]) =>
      answers.find(a => a.questionId === 'issue_type')?.value === 'cancel',
  },
  {
    id: 'missed_reason',
    text: 'Why did you miss your connecting flight?',
    type: 'radio',
    options: [
      { id: 'delay', label: 'Previous flight was delayed', value: 'prev_delay' },
      { id: 'cancel', label: 'Previous flight was canceled', value: 'prev_cancel' },
      { id: 'short_connection', label: 'Connection time was too short', value: 'short_time' },
      { id: 'other', label: 'Other reason', value: 'other' },
    ],
    showIf: (answers: Answer[]) =>
      answers.find(a => a.questionId === 'issue_type')?.value === 'missed',
  },
  {
    id: 'denied_reason',
    text: 'Why were you denied boarding?',
    type: 'radio',
    options: [
      { id: 'overbook', label: 'Flight was overbooked', value: 'overbook' },
      { id: 'documents', label: 'Documentation issues', value: 'docs' },
      { id: 'security', label: 'Security reasons', value: 'security' },
      { id: 'other', label: 'Other reason', value: 'other' },
    ],
    showIf: (answers: Answer[]) =>
      answers.find(a => a.questionId === 'issue_type')?.value === 'denied',
  },
  {
    id: 'additional_costs',
    text: 'Did you incur any additional costs due to this issue?',
    type: 'radio',
    options: [
      { id: 'costs_yes', label: 'Yes', value: 'yes' },
      { id: 'costs_no', label: 'No', value: 'no' },
    ],
  },
  {
    id: 'cost_amount',
    text: 'What was the total amount of additional costs?',
    type: 'number',
    placeholder: 'Enter amount in euros',
    min: 0,
    showIf: (answers: Answer[]) =>
      answers.find(a => a.questionId === 'additional_costs')?.value === 'yes',
  },
];