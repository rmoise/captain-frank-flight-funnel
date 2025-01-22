import type { Question, QuestionType } from '@/types/experience';
import type { Answer } from '@/types/wizard';
import { Translations } from '@/translations/types';

export const getWizardQuestions = (t: Translations): Question[] => {
  return [
    {
      id: 'issue_type',
      text: t.wizard.questions.issueType.text,
      type: 'radio' as QuestionType,
      options: [
        {
          id: 'delay',
          label: t.wizard.questions.issueType.options.delay,
          value: 'delay',
        },
        {
          id: 'cancel',
          label: t.wizard.questions.issueType.options.cancel,
          value: 'cancel',
        },
        {
          id: 'missed',
          label: t.wizard.questions.issueType.options.missed,
          value: 'missed',
        },
        {
          id: 'other',
          label: t.wizard.questions.issueType.options.other,
          value: 'other',
          externalLink:
            'https://www.captain-frank.com/de/ueberuns#UeberUns_Form',
          openInNewTab: true,
        },
      ],
    },
    {
      id: 'delay_duration',
      text: t.wizard.questions.delayDuration.text,
      type: 'radio' as QuestionType,
      options: [
        {
          id: 'less_than_2',
          label: t.wizard.questions.delayDuration.options.lessThan2,
          value: 'less_than_2',
        },
        {
          id: 'between_2_and_3',
          label: t.wizard.questions.delayDuration.options.between2And3,
          value: 'between_2_and_3',
        },
        {
          id: 'more_than_3',
          label: t.wizard.questions.delayDuration.options.moreThan3,
          value: 'more_than_3',
          showConfetti: true,
        },
      ],
      showIf: (answers: Answer[]) =>
        answers.find((a) => a.questionId === 'issue_type')?.value === 'delay',
    },
    {
      id: 'cancellation_notice',
      text: t.wizard.questions.cancellationNotice.text,
      type: 'radio' as QuestionType,
      options: [
        {
          id: 'not_at_all',
          label: t.wizard.questions.cancellationNotice.options.notAtAll,
          value: 'not_at_all',
          showConfetti: true,
        },
        {
          id: '0_7_days',
          label: t.wizard.questions.cancellationNotice.options.zeroToSeven,
          value: '0_7_days',
          showConfetti: true,
        },
        {
          id: '8_14_days',
          label: t.wizard.questions.cancellationNotice.options.eightToFourteen,
          value: '8_14_days',
          showCheck: true,
        },
        {
          id: 'more_than_14',
          label: t.wizard.questions.cancellationNotice.options.moreThanFourteen,
          value: 'more_than_14',
          showCheck: true,
        },
      ],
      showIf: (answers: Answer[]) =>
        answers.find((a) => a.questionId === 'issue_type')?.value === 'cancel',
    },
    {
      id: 'missed_costs',
      text: t.wizard.questions.missedCosts.text,
      type: 'radio' as QuestionType,
      options: [
        {
          id: 'yes',
          label: t.wizard.questions.missedCosts.options.yes,
          value: 'yes',
        },
        {
          id: 'no',
          label: t.wizard.questions.missedCosts.options.no,
          value: 'no',
          showCheck: true,
        },
      ],
      showIf: (answers: Answer[]) =>
        answers.find((a) => a.questionId === 'issue_type')?.value === 'missed',
    },
    {
      id: 'missed_costs_amount',
      text: t.wizard.questions.missedCostsAmount.text,
      type: 'money' as QuestionType,
      showIf: (answers: Answer[]) =>
        answers.find((a) => a.questionId === 'issue_type')?.value ===
          'missed' &&
        answers.find((a) => a.questionId === 'missed_costs')?.value === 'yes',
    },
    {
      id: 'alternative_flight_airline_expense',
      text: t.wizard.questions.alternativeFlightAirline.text,
      type: 'radio' as QuestionType,
      options: [
        {
          id: 'yes',
          label: t.wizard.questions.alternativeFlightAirline.options.yes,
          value: 'yes',
        },
        {
          id: 'no',
          label: t.wizard.questions.alternativeFlightAirline.options.no,
          value: 'no',
        },
      ],
      showIf: (answers: Answer[]) =>
        answers.find((a) => a.questionId === 'issue_type')?.value === 'cancel',
    },
    {
      id: 'alternative_flight_own_expense',
      text: t.wizard.questions.alternativeFlightOwn.text,
      type: 'radio' as QuestionType,
      options: [
        {
          id: 'yes',
          label: t.wizard.questions.alternativeFlightOwn.options.yes,
          value: 'yes',
        },
        {
          id: 'no',
          label: t.wizard.questions.alternativeFlightOwn.options.no,
          value: 'no',
        },
      ],
      showIf: (answers: Answer[]) =>
        answers.find((a) => a.questionId === 'issue_type')?.value ===
          'cancel' &&
        answers.find(
          (a) => a.questionId === 'alternative_flight_airline_expense'
        )?.value === 'no',
    },
    {
      id: 'refund_status',
      text: t.wizard.questions.refundStatus.text,
      type: 'radio' as QuestionType,
      options: [
        {
          id: 'yes',
          label: t.wizard.questions.refundStatus.options.yes,
          value: 'yes',
        },
        {
          id: 'no',
          label: t.wizard.questions.refundStatus.options.no,
          value: 'no',
        },
      ],
      showIf: (answers: Answer[]) =>
        answers.find((a) => a.questionId === 'issue_type')?.value === 'cancel',
    },
  ];
};
