import React, { useState, useEffect } from 'react';
import { ExperienceCard } from './ExperienceCard';
import { useBookingContext } from '@/context/BookingContext';
import { useSteps } from '@/context/StepsContext';
import type { Question, Answer } from '@/types/experience';

interface ExperienceSelectionProps {
  selectedOption?: string;
  onSelect: (optionId: string) => void;
}

interface FlightOption {
  id: string;
  title: string;
  question: string;
  icon: string;
  options: Array<{
    id: string;
    label: string;
  }>;
}

const flightOptions: FlightOption[] = [
  {
    id: 'delayed',
    title: 'Delayed Flight',
    question: 'How delayed was your flight?',
    icon: 'https://ik.imagekit.io/0adjo0tl4/Group.svg?updatedAt=1733670413341',
    options: [
      { id: 'delayed_3plus', label: 'More than 3 hours' },
      { id: 'delayed_less3', label: 'Less than 3 hours' },
    ],
  },
  {
    id: 'canceled',
    title: 'Canceled Flight',
    question: 'How was your flight canceled?',
    icon: 'https://ik.imagekit.io/0adjo0tl4/Group.svg?updatedAt=1733670413341',
    options: [
      { id: 'canceled_airline', label: 'By the airline' },
      { id: 'canceled_weather', label: 'Due to weather' },
    ],
  },
  {
    id: 'overbooked',
    title: 'Overbooked Flight',
    question: 'Were you denied boarding?',
    icon: 'https://ik.imagekit.io/0adjo0tl4/Group.svg?updatedAt=1733670413341',
    options: [
      { id: 'overbooked_yes', label: 'Yes' },
      { id: 'overbooked_no', label: 'No' },
    ],
  },
  {
    id: 'missed',
    title: 'Missed Connection',
    question: 'Did you miss your connecting flight?',
    icon: 'https://ik.imagekit.io/0adjo0tl4/Group.svg?updatedAt=1733670413341',
    options: [
      { id: 'missed_yes', label: 'Yes' },
      { id: 'missed_no', label: 'No' },
    ],
  },
];

const delayQuestions: Question[] = [
  {
    id: 'delay_duration',
    text: 'How delayed was your flight?',
    type: 'radio',
    options: [
      { id: 'less3', label: 'Less than 3 hours', value: '<3' },
      { id: 'more3', label: 'More than 3 hours', value: '>3' },
    ],
  },
];

const cancelQuestions: Question[] = [
  {
    id: 'cancellation_notice',
    text: 'When were you informed about the flight change before your departure?',
    type: 'radio',
    options: [
      { id: 'not_informed', label: 'Not at all', value: 'none' },
      { id: '0_7', label: '0-7 days', value: '0-7' },
      { id: '8_14', label: '8-14 days', value: '8-14' },
      { id: 'over_14', label: 'Over 14 days', value: '>14' },
    ],
  },
];

const missedQuestions: Question[] = [
  {
    id: 'additional_costs',
    text: 'Did you have additional costs (e.g. hotel, taxi, food costs)?',
    type: 'radio',
    options: [
      { id: 'costs_yes', label: 'Yes', value: 'yes' },
      { id: 'costs_no', label: 'No', value: 'no' },
    ],
  },
  {
    id: 'cost_amount',
    text: 'Let me know approximately how much you spent. We\'ll do the paperwork at the end.',
    type: 'number',
    showIf: (answers: Answer[]) =>
      answers.find(a => a.questionId === 'additional_costs')?.value === 'yes',
    placeholder: 'Enter amount in euros',
    min: 0,
  },
];

const getQuestionsForOption = (optionId: string) => {
  switch (optionId.split('_')[0]) {
    case 'delayed':
      return delayQuestions;
    case 'canceled':
      return cancelQuestions;
    case 'missed':
      return missedQuestions;
    default:
      return [];
  }
};

export default function ExperienceSelection({
  selectedOption,
  onSelect,
}: ExperienceSelectionProps) {
  const { state, dispatch } = useBookingContext();
  const { registerStep, unregisterStep } = useSteps();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [focusedCard, setFocusedCard] = useState<string | null>(null);

  useEffect(() => {
    registerStep('ExperienceSelection', 2);
    return () => unregisterStep('ExperienceSelection');
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.experience-card')) {
        setExpandedCard(null);
        if (!selectedOption) {
          setFocusedCard(null);
        } else {
          setFocusedCard(selectedOption.split('_')[0]);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption]);

  useEffect(() => {
    if (selectedOption) {
      dispatch({ type: 'SET_EXPERIENCE', payload: selectedOption });
    }
  }, [selectedOption, dispatch]);

  useEffect(() => {
    if (state.experienceType && !selectedOption) {
      onSelect(state.experienceType);
    }
  }, [state.experienceType, selectedOption, onSelect]);

  const handleCardToggle = (cardId: string) => {
    if (expandedCard !== cardId) {
      setExpandedCard(cardId);
      setFocusedCard(cardId);
    }
  };

  const handleOptionSelect = (optionId: string) => {
    onSelect(optionId);
    const cardId = optionId.split('_')[0];
    setFocusedCard(cardId);
  };

  console.log('ExperienceSelection:', {
    selectedOption,
    experienceType: state.experienceType
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pb-16 lg:pb-24">
      <div className="w-full max-w-[1211px] mx-auto flex flex-col gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-6 lg:gap-x-[33px]">
          {flightOptions.map((option) => (
            <ExperienceCard
              key={option.id}
              title={option.title}
              question={option.question}
              icon={option.icon}
              options={option.options}
              selectedOption={selectedOption}
              onOptionSelect={handleOptionSelect}
              isExpanded={expandedCard === option.id}
              onToggle={() => handleCardToggle(option.id)}
              isFocused={focusedCard === option.id}
              anyCardSelected={!!expandedCard || (!!selectedOption && selectedOption !== '')}
              questions={getQuestionsForOption(option.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
