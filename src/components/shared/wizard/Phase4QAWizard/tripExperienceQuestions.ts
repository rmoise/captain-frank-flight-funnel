// The types are defined in @/types/shared/wizard.ts
// Since the import resolution seems to have issues, we're using type inference
// from the imported modules in the parent components

// Import the Question type
import type { Question } from "@/types/shared/wizard";
import { useTranslations } from "next-intl";

// Helper function to get translations in non-React context
const getTranslations = () => {
  try {
    return {
      tripCostsTitle:
        "Bitte gib die Kosten an, die du für deine Reise ausgegeben hast.",
    };
  } catch (error) {
    console.error("Failed to get translations:", error);
    return {
      tripCostsTitle:
        "Bitte gib die Kosten an, die du für deine Reise ausgegeben hast.",
    };
  }
};

const translations = getTranslations();

// Helper function to create questions with proper translation structure
// This will be consumed by components that have access to the t() function
export const createTripExperienceQuestions = (
  t: (key: string) => string
): Question[] => [
  {
    id: "travel_status",
    text: t(
      "phases.tripExperience.steps.travelStatus.questions.travelStatus.title"
    ),
    type: "radio",
    options: [
      {
        id: "none",
        value: "none",
        label: t(
          "phases.tripExperience.steps.travelStatus.questions.travelStatus.options.none"
        ),
        showConfetti: true,
      },
      {
        id: "self",
        value: "self",
        label: t(
          "phases.tripExperience.steps.travelStatus.questions.travelStatus.options.self"
        ),
      },
      {
        id: "provided",
        value: "provided",
        label: t(
          "phases.tripExperience.steps.travelStatus.questions.travelStatus.options.provided"
        ),
        showConfetti: true,
      },
      {
        id: "took_alternative_own",
        value: "took_alternative_own",
        label: t(
          "phases.tripExperience.steps.travelStatus.questions.travelStatus.options.alternativeOwn"
        ),
      },
    ],
  },
  {
    id: "ticket_refund_status",
    text: t(
      "phases.tripExperience.steps.travelStatus.questions.refundStatus.title"
    ),
    type: "radio",
    showIf: (answers) => answers["travel_status"]?.value === "none",
    options: [
      {
        id: "refund_yes",
        value: "yes",
        label: t(
          "phases.tripExperience.steps.travelStatus.questions.refundStatus.options.yes"
        ),
      },
      {
        id: "refund_no",
        value: "no",
        label: t(
          "phases.tripExperience.steps.travelStatus.questions.refundStatus.options.no"
        ),
      },
    ],
  },
  {
    id: "ticket_cost_after_no_refund",
    text: t(
      "phases.tripExperience.steps.travelStatus.questions.ticketCost.title"
    ),
    translationKey:
      "phases.tripExperience.steps.travelStatus.questions.ticketCost.title",
    type: "money",
    required: true,
    showIf: (answers) =>
      answers["travel_status"]?.value === "none" &&
      answers["ticket_refund_status"]?.value === "no",
  },
  {
    id: "actual_flights_provided",
    text: t(
      "phases.tripExperience.steps.travelStatus.questions.alternativeFlightAirlineExpense.title"
    ),
    type: "flight_selector",
    showIf: (answers) => answers["travel_status"]?.value === "provided",
  },
  {
    id: "actual_flights_alternative_own",
    text: t(
      "phases.tripExperience.steps.travelStatus.questions.alternativeFlightAirlineExpense.title"
    ),
    type: "flight_selector",
    showIf: (answers) =>
      answers["travel_status"]?.value === "took_alternative_own",
  },
  {
    id: "ticket_cost",
    text: t(
      "phases.tripExperience.steps.travelStatus.questions.tripCosts.title"
    ),
    translationKey:
      "phases.tripExperience.steps.travelStatus.questions.tripCosts.title",
    type: "money",
    required: true,
    showIf: (answers) => {
      try {
        // First check if travel status is correct
        const travelStatus = answers["travel_status"]?.value;
        if (travelStatus !== "took_alternative_own") {
          return false;
        }

        // Next check if we have valid flight data
        const flightAnswerStr =
          answers["actual_flights_alternative_own"]?.value;

        // If we don't have any flight answer, hide the cost question
        if (!flightAnswerStr) {
          return false;
        }

        // Handle different formats of the flight answer
        try {
          // Only try to parse as JSON if it's a string
          if (typeof flightAnswerStr === "string") {
            // Special case for non-empty strings that aren't JSON
            if (
              flightAnswerStr &&
              !flightAnswerStr.startsWith("{") &&
              !flightAnswerStr.startsWith("[")
            ) {
              return true;
            }

            const flightData = JSON.parse(flightAnswerStr);

            // Check if it has valid flight data
            if (
              flightData &&
              (flightData.count > 0 ||
                (flightData.flights && flightData.flights.length > 0) ||
                flightData.valid === true)
            ) {
              return true;
            }

            return false;
          } else if (
            typeof flightAnswerStr === "boolean" &&
            flightAnswerStr === true
          ) {
            // Handle boolean true value
            return true;
          } else if (
            Array.isArray(flightAnswerStr) &&
            flightAnswerStr.length > 0
          ) {
            // Handle array with items
            return true;
          } else if (
            typeof flightAnswerStr === "object" &&
            flightAnswerStr !== null
          ) {
            // Handle non-null object
            return true;
          }

          return false;
        } catch (e) {
          // If not JSON or parsing failed, but we have a string value
          if (
            typeof flightAnswerStr === "string" &&
            flightAnswerStr.trim() !== "" &&
            flightAnswerStr !== "[]"
          ) {
            return true;
          }

          return false;
        }
      } catch (e) {
        console.error(
          "[tripExperienceQuestions] Error in ticket_cost showIf:",
          e
        );
        return false;
      }
    },
  },
];

// Legacy export with fallback (will be replaced when components are updated)
export const tripExperienceQuestions: Question[] = [
  {
    id: "travel_status",
    text: "phases.tripExperience.steps.travelStatus.questions.travelStatus.title",
    type: "radio",
    options: [
      {
        id: "none",
        value: "none",
        label:
          "phases.tripExperience.steps.travelStatus.questions.travelStatus.options.none",
        showConfetti: true,
      },
      {
        id: "self",
        value: "self",
        label:
          "phases.tripExperience.steps.travelStatus.questions.travelStatus.options.self",
      },
      {
        id: "provided",
        value: "provided",
        label:
          "phases.tripExperience.steps.travelStatus.questions.travelStatus.options.provided",
        showConfetti: true,
      },
      {
        id: "took_alternative_own",
        value: "took_alternative_own",
        label:
          "phases.tripExperience.steps.travelStatus.questions.travelStatus.options.alternativeOwn",
      },
    ],
  },
  {
    id: "ticket_refund_status",
    text: "phases.tripExperience.steps.travelStatus.questions.refundStatus.title",
    type: "radio",
    showIf: (answers) => answers["travel_status"]?.value === "none",
    options: [
      {
        id: "refund_yes",
        value: "yes",
        label:
          "phases.tripExperience.steps.travelStatus.questions.refundStatus.options.yes",
      },
      {
        id: "refund_no",
        value: "no",
        label:
          "phases.tripExperience.steps.travelStatus.questions.refundStatus.options.no",
      },
    ],
  },
  {
    id: "ticket_cost_after_no_refund",
    text: "phases.tripExperience.steps.travelStatus.questions.ticketCost.title",
    translationKey:
      "phases.tripExperience.steps.travelStatus.questions.ticketCost.title",
    type: "money",
    required: true,
    showIf: (answers) =>
      answers["travel_status"]?.value === "none" &&
      answers["ticket_refund_status"]?.value === "no",
  },
  {
    id: "actual_flights_provided",
    text: "phases.tripExperience.steps.travelStatus.questions.alternativeFlightAirlineExpense.title",
    type: "flight_selector",
    showIf: (answers) => answers["travel_status"]?.value === "provided",
  },
  {
    id: "actual_flights_alternative_own",
    text: "phases.tripExperience.steps.travelStatus.questions.alternativeFlightAirlineExpense.title",
    type: "flight_selector",
    showIf: (answers) =>
      answers["travel_status"]?.value === "took_alternative_own",
  },
  {
    id: "ticket_cost",
    text: "phases.tripExperience.steps.travelStatus.questions.tripCosts.title",
    translationKey:
      "phases.tripExperience.steps.travelStatus.questions.tripCosts.title",
    type: "money",
    required: true,
    showIf: (answers) => {
      try {
        // First check if travel status is correct
        const travelStatus = answers["travel_status"]?.value;
        if (travelStatus !== "took_alternative_own") {
          return false;
        }

        // Next check if we have valid flight data
        const flightAnswerStr =
          answers["actual_flights_alternative_own"]?.value;

        // If we don't have any flight answer, hide the cost question
        if (!flightAnswerStr) {
          return false;
        }

        // Handle different formats of the flight answer
        try {
          // Only try to parse as JSON if it's a string
          if (typeof flightAnswerStr === "string") {
            // Special case for non-empty strings that aren't JSON
            if (
              flightAnswerStr &&
              !flightAnswerStr.startsWith("{") &&
              !flightAnswerStr.startsWith("[")
            ) {
              return true;
            }

            const flightData = JSON.parse(flightAnswerStr);

            // Check if it has valid flight data
            if (
              flightData &&
              (flightData.count > 0 ||
                (flightData.flights && flightData.flights.length > 0) ||
                flightData.valid === true)
            ) {
              return true;
            }

            return false;
          } else if (
            typeof flightAnswerStr === "boolean" &&
            flightAnswerStr === true
          ) {
            // Handle boolean true value
            return true;
          } else if (
            Array.isArray(flightAnswerStr) &&
            flightAnswerStr.length > 0
          ) {
            // Handle array with items
            return true;
          } else if (
            typeof flightAnswerStr === "object" &&
            flightAnswerStr !== null
          ) {
            // Handle non-null object
            return true;
          }

          return false;
        } catch (e) {
          // If not JSON or parsing failed, but we have a string value
          if (
            typeof flightAnswerStr === "string" &&
            flightAnswerStr.trim() !== "" &&
            flightAnswerStr !== "[]"
          ) {
            return true;
          }

          return false;
        }
      } catch (e) {
        console.error(
          "[tripExperienceQuestions] Error in ticket_cost showIf:",
          e
        );
        return false;
      }
    },
  },
];
