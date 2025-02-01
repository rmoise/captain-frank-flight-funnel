import type { Question } from '@/types/experience';
import type { Answer } from '@/types/wizard';

export const experienceQuestions: Question[] = [
  {
    id: 'travel_status',
    text: 'Bitte wähle aus, was passiert ist:',
    type: 'radio',
    options: [
      {
        id: 'none',
        value: 'none',
        label: 'Ich bin überhaupt nicht gereist',
        showConfetti: true,
      },
      {
        id: 'self',
        value: 'self',
        label: 'Ich bin die Flüge geflogen, die ich gebucht hatte',
      },
      {
        id: 'provided',
        value: 'provided',
        label: 'Ich bin anders gereist, auf Kosten der Fluggesellschaft',
        showConfetti: true,
      },
    ],
  },
  {
    id: 'alternative_transport',
    text: 'Wie bist du alternativ gereist?',
    type: 'radio',
    options: [
      {
        id: 'train',
        value: 'train',
        label: 'Mit der Bahn',
      },
      {
        id: 'bus',
        value: 'bus',
        label: 'Mit dem Bus',
      },
      {
        id: 'other_flight',
        value: 'other_flight',
        label: 'Mit einem anderen Flug',
      },
    ],
    showIf: (answers: Answer[]) =>
      answers.find((a) => a.questionId === 'travel_status')?.value ===
      'provided',
  },
  {
    id: 'expenses',
    text: 'Hattest du zusätzliche Kosten?',
    type: 'radio',
    options: [
      {
        id: 'yes',
        value: 'yes',
        label: 'Ja',
      },
      {
        id: 'no',
        value: 'no',
        label: 'Nein',
      },
    ],
  },
];
