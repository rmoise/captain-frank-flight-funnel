import { accordionConfig } from './accordion';

export const qaWizardConfig = {
  padding: {
    wrapper: accordionConfig.padding.content,
    content: 'px-4 py-4',
  },
  spacing: {
    questionGap: 'space-y-6',
    optionGap: 'space-y-8 mb-32 sm:mb-6',
    navigationWrapper: 'flex justify-between mt-32 sm:mt-6',
    button:
      'mt-8 text-[#F54538] hover:bg-[#FEF2F2] px-6 py-3 rounded-lg transition-colors font-medium',
    buttonBase: 'px-6 py-3 rounded-lg transition-colors',
    buttonPreviousEnabled: 'text-[#F54538] hover:bg-[#FEF2F2]',
    buttonPreviousDisabled: 'text-gray-400 cursor-not-allowed',
    buttonNextEnabled: 'bg-[#F54538] text-white hover:bg-[#E03F33]',
    buttonNextDisabled: 'bg-gray-200 text-gray-400 cursor-not-allowed',
  },
  question: {
    wrapper: 'mb-6',
    title: 'text-xl font-semibold text-gray-900 mb-8',
    description: 'text-sm text-gray-500',
  },
  option: {
    base: 'relative flex items-center p-4 cursor-pointer focus:outline-none',
    checked: 'bg-[#FEF2F2] border-[#F54538]',
    unchecked: 'bg-white border-gray-200 hover:bg-gray-50',
    content: 'flex-grow',
    textWrapper: 'flex flex-col',
    label: 'text-base font-medium text-gray-900',
    description: 'text-sm text-gray-500 mt-1',
    radioBase: 'flex h-5 items-center',
    radioChecked: 'text-[#F54538]',
    radioUnchecked: 'text-gray-400',
    radioInner: 'h-4 w-4 rounded-full border-2 border-current',
  },
  progress: {
    wrapper: 'mt-8',
    text: 'text-sm text-gray-500 mb-2',
    bar: {
      wrapper: 'w-full h-2 bg-gray-200 rounded-full overflow-hidden',
      inner: 'h-full bg-[#F54538] transition-all duration-300 ease-out',
    },
  },
  colors: {
    primary: '#F54538',
    background: {
      selected: '#FEF2F2',
      hover: '#F9FAFB',
    },
  },
  typography: {
    question: 'text-xl font-semibold text-gray-900',
    option: 'text-base text-gray-700',
    helper: 'text-sm text-gray-500',
    title: 'text-2xl font-bold text-gray-900',
  },
  success: {
    icon: {
      wrapper: 'flex justify-center items-center mb-6',
      emoji: 'w-16 h-16 flex items-center justify-center text-[64px]',
      check: 'w-16 h-16 text-green-500',
    },
    message: {
      wrapper: 'w-full max-w-2xl mx-auto text-center space-y-2',
      title: 'text-2xl font-bold text-gray-900',
      subtitle: 'text-sm text-gray-500',
    },
  },
};
