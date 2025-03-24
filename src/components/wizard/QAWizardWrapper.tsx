import React, { useEffect, useRef, useState } from "react";
import QAWizard from "./QAWizard";
import type { Question } from "@/types/experience";
import type { Answer } from "@/types/wizard";
import type { Flight } from "@/types/store";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { ValidationStep } from "@/lib/state/types";

interface QAWizardWrapperProps {
  questions: Question[];
  onComplete: (answers: Answer[]) => void;
  onInteract?: () => void;
  initialAnswers?: Answer[];
  phase?: number;
  stepNumber?: ValidationStep;
  selectedFlight?: Flight | null;
  selectedFlights?: Flight[];
}

// Define component with named export
export const QAWizardWrapper: React.FC<QAWizardWrapperProps> = (props) => {
  const [isLoading, setIsLoading] = React.useState(true);
  // Add ref to track if interaction has been fired
  const interactionFiredRef = useRef(false);
  // Add ref to track if onComplete for localStorage has been called
  const localStorageCompleteFiredRef = useRef(false);
  const [effectiveAnswers, setEffectiveAnswers] = useState<Answer[]>(
    props.initialAnswers || []
  );

  // Additional effect to check localStorage for answers if none provided through props
  useEffect(() => {
    // Only check localStorage if no initialAnswers provided and we haven't already processed localStorage
    if (
      (!props.initialAnswers || props.initialAnswers.length === 0) &&
      typeof window !== "undefined" &&
      !localStorageCompleteFiredRef.current
    ) {
      try {
        console.log("QAWizardWrapper: Checking localStorage for answers");

        // Check if we're using data from a shared link
        const isFromSharedLink =
          localStorage.getItem("_dataFromSharedLink") === "true" ||
          localStorage.getItem("_sharedFlightData") === "true";

        // Check multiple possible localStorage keys for answers in order of specificity
        const potentialSources = [
          `wizardAnswers_${props.phase}`,
          `phase${props.phase}_wizardAnswers`,
          "wizardAnswers",
          "wizardAnswers_1",
          "wizardState",
        ];

        // If we're using data from a shared link, also check these specific shared data sources
        if (isFromSharedLink) {
          potentialSources.unshift(
            "sharedWizardAnswers",
            "shared_wizardAnswers",
            "_sharedWizardAnswers"
          );

          // Also check URL parameters for shared flight data
          try {
            if (typeof window !== "undefined") {
              const urlParams = new URLSearchParams(window.location.search);
              const sharedFlightParam = urlParams.get("shared_flight");

              if (sharedFlightParam) {
                console.log(
                  "QAWizardWrapper: Found shared_flight param in URL"
                );
                const decodedData = decodeURIComponent(sharedFlightParam);
                const parsedData = JSON.parse(decodedData);

                if (
                  parsedData.wizardAnswers &&
                  parsedData.wizardAnswers.length > 0
                ) {
                  console.log(
                    "QAWizardWrapper: Found wizard answers in shared_flight param:",
                    parsedData.wizardAnswers
                  );

                  // Use these answers directly
                  setEffectiveAnswers(parsedData.wizardAnswers);

                  // Also save to localStorage for future reference
                  localStorage.setItem(
                    "wizardAnswers",
                    JSON.stringify(parsedData.wizardAnswers)
                  );
                  localStorage.setItem(
                    `wizardAnswers_${props.phase || 1}`,
                    JSON.stringify(parsedData.wizardAnswers)
                  );

                  // Call onComplete and onInteract
                  if (
                    props.onComplete &&
                    !localStorageCompleteFiredRef.current
                  ) {
                    localStorageCompleteFiredRef.current = true;
                    props.onComplete(parsedData.wizardAnswers);
                  }

                  if (props.onInteract && !interactionFiredRef.current) {
                    interactionFiredRef.current = true;
                    props.onInteract();
                  }

                  // No need to check other sources
                  return;
                }
              }
            }
          } catch (error) {
            console.error(
              "QAWizardWrapper: Error parsing shared_flight param:",
              error
            );
          }
        }

        let storedAnswers: string | null = null;
        let sourceUsed = "";

        // Try each potential source until we find valid answers
        for (const source of potentialSources) {
          const data = localStorage.getItem(source);
          if (data) {
            console.log(`QAWizardWrapper: Found answers in ${source}`);
            storedAnswers = data;
            sourceUsed = source;
            break;
          }
        }

        // If we found answers in localStorage, use them
        if (storedAnswers) {
          let answersArray: Answer[] = [];
          try {
            const parsedData = JSON.parse(storedAnswers);
            // Handle different formats
            if (Array.isArray(parsedData)) {
              answersArray = parsedData;
            } else if (
              parsedData.answers &&
              Array.isArray(parsedData.answers)
            ) {
              answersArray = parsedData.answers;
            } else if (typeof parsedData === "object") {
              // Try to extract any array properties that might contain answers
              Object.values(parsedData).forEach((value) => {
                if (
                  Array.isArray(value) &&
                  value.length > 0 &&
                  value[0]?.questionId
                ) {
                  answersArray = value;
                }
              });
            }
          } catch (error) {
            console.error(
              "QAWizardWrapper: Error parsing stored answers:",
              error
            );
          }

          if (answersArray.length > 0) {
            console.log("QAWizardWrapper: Using answers from localStorage:", {
              source: sourceUsed,
              answerCount: answersArray.length,
              firstAnswer: answersArray[0],
            });
            setEffectiveAnswers(answersArray);

            // If onComplete is provided, call it with the loaded answers
            // Mark as fired so we don't trigger again
            if (props.onComplete && !localStorageCompleteFiredRef.current) {
              localStorageCompleteFiredRef.current = true;
              props.onComplete(answersArray);
            }

            // If this is from a shared link or we found answers, make sure the onInteract callback is called
            if (props.onInteract && !interactionFiredRef.current) {
              interactionFiredRef.current = true;
              props.onInteract();
            }
          }
        } else if (isFromSharedLink) {
          // Special handling if we came from a shared link but found no answers
          console.log(
            "QAWizardWrapper: No answers found but using shared link"
          );

          // Make sure the onInteract callback is fired
          if (props.onInteract && !interactionFiredRef.current) {
            interactionFiredRef.current = true;
            props.onInteract();
          }
        }
      } catch (error) {
        console.error("Error reading wizard answers from localStorage:", error);
      }
    }
  }, [props.initialAnswers, props.onComplete, props.onInteract, props.phase]);

  // Show loading spinner during initialization
  useEffect(() => {
    // Simulate loading for smoother transitions
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle interaction separately
  const handleInteract = () => {
    if (props.onInteract && !interactionFiredRef.current) {
      interactionFiredRef.current = true;
      props.onInteract();
    }
  };

  // If still loading, show loading spinner
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <QAWizard
      questions={props.questions}
      initialAnswers={effectiveAnswers}
      onComplete={(answers) => {
        if (props.onComplete) {
          props.onComplete(answers);
          handleInteract(); // Also trigger interaction when completing
        }
      }}
      selectedFlight={props.selectedFlight}
      phase={props.phase}
    />
  );
};

// Export default for backwards compatibility
export default QAWizardWrapper;
