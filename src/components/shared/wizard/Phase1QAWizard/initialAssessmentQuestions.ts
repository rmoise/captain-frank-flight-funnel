import type { Question, QuestionType, Answer } from "@/types/shared/wizard";
import { Translations } from "@/translations/types";

export const getInitialAssessmentQuestions = (t: Translations): Question[] => {
  return [
    {
      id: "issue_type",
      text: t.wizard.questions.issueType.text,
      type: "radio" as QuestionType,
      options: [
        {
          id: "delay",
          label: t.wizard.questions.issueType.options.delay,
          value: "delay",
        },
        {
          id: "cancel",
          label: t.wizard.questions.issueType.options.cancel,
          value: "cancel",
        },
        {
          id: "missed",
          label: t.wizard.questions.issueType.options.missed,
          value: "missed",
        },
        {
          id: "other",
          label: t.wizard.questions.issueType.options.other,
          value: "other",
          externalLink:
            "https://www.captain-frank.com/de/ueberuns#UeberUns_Form",
          openInNewTab: true,
        },
      ],
    },
    {
      id: "delay_duration",
      text: t.wizard.questions.delayDuration.text,
      type: "radio" as QuestionType,
      options: [
        {
          id: "less_than_2",
          label: t.wizard.questions.delayDuration.options.lessThan2,
          value: "less_than_2",
        },
        {
          id: "between_2_and_3",
          label: t.wizard.questions.delayDuration.options.between2And3,
          value: "between_2_and_3",
        },
        {
          id: "more_than_3",
          label: t.wizard.questions.delayDuration.options.moreThan3,
          value: "more_than_3",
          showConfetti: true,
        },
      ],
      showIf: (answers) => answers["issue_type"]?.value === "delay",
    },
    {
      id: "cancellationNotice",
      text: t.wizard.questions.cancellationNotice.text,
      type: "radio" as QuestionType,
      options: [
        {
          id: "not_at_all",
          label: t.wizard.questions.cancellationNotice.options.notAtAll,
          value: "not_at_all",
        },
        {
          id: "zero_to_seven",
          label: t.wizard.questions.cancellationNotice.options.zeroToSeven,
          value: "zero_to_seven",
        },
        {
          id: "eight_to_fourteen",
          label: t.wizard.questions.cancellationNotice.options.eightToFourteen,
          value: "eight_to_fourteen",
        },
        {
          id: "more_than_fourteen",
          label: t.wizard.questions.cancellationNotice.options.moreThanFourteen,
          value: "more_than_fourteen",
          showConfetti: true,
        },
      ],
      showIf: (answers) => answers["issue_type"]?.value === "cancel",
    },
    {
      id: "missedCosts",
      text: t.wizard.questions.missedCosts.text,
      type: "radio" as QuestionType,
      options: [
        {
          id: "yes",
          label: t.wizard.questions.missedCosts.options.yes,
          value: "yes",
        },
        {
          id: "no",
          label: t.wizard.questions.missedCosts.options.no,
          value: "no",
          showConfetti: true,
        },
      ],
      showIf: (answers) => answers["issue_type"]?.value === "missed",
    },
    {
      id: "missedCostsAmount",
      text: t.wizard.questions.missedCostsAmount.text,
      type: "money" as QuestionType,
      placeholder: "0.00",
      showIf: (answers) => 
        answers["issue_type"]?.value === "missed" && 
        answers["missedCosts"]?.value === "yes",
    },
  ];
};
