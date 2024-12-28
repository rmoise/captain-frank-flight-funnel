import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Heebo', 'system-ui', 'sans-serif'],
        heebo: ['Heebo', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#EBF5FF',
          100: '#E1EFFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        secondary: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
        },
        success: {
          50: '#F0FDF4',
          500: '#22C55E',
        },
        error: {
          50: '#FEF2F2',
          500: '#EF4444',
        },
        brand: {
          red: '#F54538',
          green: '#08d259',
          'green-light': '#c7efd7',
          gray: {
            text: '#464646',
            muted: '#8d8d8d',
            step: '#6f6f6f',
            bg: '#f1f1f1',
          },
        },
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-in-out forwards',
        'slide-up-1': 'slideIn 0.6s ease-out forwards',
        'slide-up-2': 'slideIn 0.6s ease-out 0.2s forwards',
        'slide-up-3': 'slideIn 0.6s ease-out 0.4s forwards',
        'slide-up-4': 'slideIn 0.6s ease-out 0.6s forwards',
      },
      transitionProperty: {
        height: 'height',
        spacing: 'margin, padding',
      },
    },
  },
  plugins: [forms],
};

export default config;
