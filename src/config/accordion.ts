interface HeaderTitleConfig {
  wrapper: string;
  eyebrow: string;
  text: string;
  summary: string;
}

interface HeaderStatusIconConfig {
  wrapper: string;
  base: string;
  completed: string;
  interacted: string;
  default: string;
}

interface HeaderStatusConfig {
  wrapper: string;
  summary: string;
  icon: HeaderStatusIconConfig;
}

interface HeaderConfig {
  base: string;
  active: string;
  inactive: string;
  title: HeaderTitleConfig;
  status: HeaderStatusConfig;
}

interface StylingConfig {
  base: string;
  active: string;
  inactive: string;
}

interface PaddingConfig {
  content: string;
  wrapper: string;
}

interface SpacingConfig {
  questionGap: string;
  optionGap: string;
  navigationWrapper: string;
  buttonBase: string;
  buttonPreviousEnabled: string;
  buttonPreviousDisabled: string;
  buttonNextEnabled: string;
  buttonNextDisabled: string;
}

interface SuccessIconConfig {
  wrapper: string;
  emoji: string;
  check: string;
}

interface SuccessMessageConfig {
  wrapper: string;
  title: string;
  subtitle: string;
}

interface SuccessConfig {
  icon: SuccessIconConfig;
  message: SuccessMessageConfig;
}

interface BorderConfig {
  default: string;
  focus: string;
}

interface ColorsConfig {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  border: BorderConfig;
}

interface FlightSelectorSearchConfig {
  input: string;
  button: string;
}

interface FlightSelectorButtonConfig {
  base: string;
  active: string;
  inactive: string;
}

interface FlightSelectorViewToggleConfig {
  wrapper: string;
  button: FlightSelectorButtonConfig;
}

interface FlightCardWrapperConfig {
  list: string;
  card: string;
}

interface FlightCardIconConfig {
  wrapper: string;
  large: string;
}

interface FlightCardConfig {
  wrapper: FlightCardWrapperConfig;
  icon: FlightCardIconConfig;
}

interface FlightSelectorConfig {
  search: FlightSelectorSearchConfig;
  viewToggle: FlightSelectorViewToggleConfig;
  flightCard: FlightCardConfig;
}

interface TimingConfig {
  phaseTransition: number;
  stepTransition: number;
}

interface PagePaddingConfig {
  x: string;
  top: string;
  bottom: string;
}

interface PageConfig {
  background: string;
  maxWidth: string;
  padding: PagePaddingConfig;
}

interface LayoutConfig {
  page: PageConfig;
}

interface AccordionConfig {
  isOpenByDefault: boolean;
  padding: PaddingConfig;
  styling: StylingConfig;
  header: HeaderConfig;
  spacing: SpacingConfig;
  typography: {
    question: string;
  };
  success: SuccessConfig;
  colors: ColorsConfig;
  flightSelector: FlightSelectorConfig;
  timing: TimingConfig;
  layout: LayoutConfig;
}

export const accordionConfig: AccordionConfig = {
  // Accordion specific styling
  isOpenByDefault: true,
  padding: {
    content: 'overflow-visible px-0 pb-4',
    wrapper: '-mt-2',
  },
  styling: {
    base: 'bg-white rounded-lg',
    active: 'shadow-lg ring-1 ring-black/5 -translate-y-1 bg-white',
    inactive: 'shadow-none translate-y-0 bg-transparent',
  },
  header: {
    base: 'w-full flex items-start justify-between cursor-pointer text-left p-4 transition-all duration-300',
    active: 'bg-white',
    inactive: 'bg-transparent',
    title: {
      wrapper: 'flex-1',
      eyebrow: 'text-sm text-gray-500 mb-1',
      text: 'text-2xl font-semibold text-gray-900',
      summary: 'text-sm text-gray-500 mt-2',
    },
    status: {
      wrapper: 'flex items-center gap-4 pt-1',
      summary: 'text-sm text-gray-600',
      icon: {
        wrapper: 'flex items-center gap-2',
        base: 'w-6 h-6',
        completed: 'text-green-500',
        interacted: 'text-[#F54538]',
        default: 'text-gray-400',
      },
    },
  },

  // Question/Answer styling
  spacing: {
    questionGap: 'space-y-6',
    optionGap: 'space-y-4',
    navigationWrapper: 'flex justify-between mt-6',
    buttonBase: 'px-4 py-2 rounded-lg transition-colors',
    buttonPreviousEnabled: 'text-gray-600 hover:bg-gray-100',
    buttonPreviousDisabled: 'text-gray-400 cursor-not-allowed',
    buttonNextEnabled: 'bg-[#F54538] text-white hover:bg-[#E03F33]',
    buttonNextDisabled: 'bg-gray-200 text-gray-400 cursor-not-allowed',
  },
  typography: {
    question: 'text-lg font-medium text-gray-900',
  },
  success: {
    icon: {
      wrapper: 'flex justify-center',
      emoji: 'text-6xl',
      check: 'w-16 h-16 text-green-500',
    },
    message: {
      wrapper: 'text-center mt-4',
      title: 'text-2xl font-semibold text-gray-900',
      subtitle: 'text-gray-500 mt-2',
    },
  },

  // Colors
  colors: {
    primary: '#F54538',
    primaryHover: '#E03F33',
    primaryLight: '#FEF2F2',
    border: {
      default: '#D1D5DB',
      focus: '#F54538',
    },
  },

  // Flight selector specific
  flightSelector: {
    search: {
      input:
        'w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:border-[#F54538] focus:ring-1 focus:ring-[#F54538] outline-none bg-gray-50 hover:bg-white transition-colors',
      button:
        'w-full h-12 bg-[#F54538] text-white px-4 rounded-lg font-medium hover:bg-[#E03F33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm',
    },
    viewToggle: {
      wrapper: 'flex items-center space-x-2 bg-gray-100 p-1 rounded-lg',
      button: {
        base: 'p-2 rounded-lg transition-colors',
        active: 'bg-white text-[#F54538] shadow-sm',
        inactive: 'text-gray-500 hover:text-gray-700',
      },
    },
    flightCard: {
      wrapper: {
        list: 'px-4 py-3 hover:bg-gray-50 border-b border-gray-200 last:border-b-0',
        card: 'p-6 bg-white border border-gray-200 rounded-2xl hover:border-[#F54538] hover:shadow-md',
      },
      icon: {
        wrapper:
          'w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center',
        large: 'w-10 h-10',
      },
    },
  },

  // Layout and timing
  timing: {
    phaseTransition: 1000,
    stepTransition: 500,
  },
  layout: {
    page: {
      background: 'bg-[#f5f7fa]',
      maxWidth: 'max-w-3xl',
      padding: {
        x: 'px-4',
        top: 'pt-8',
        bottom: 'pb-24',
      },
    },
  },
};
