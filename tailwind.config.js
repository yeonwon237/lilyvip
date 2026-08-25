/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lily: {
          50: '#FDF8FA',
          100: '#FCEEF4',
          200: '#F9DCE8',
          300: '#F4BED5',
          400: '#EB94BA',
          500: '#DD6B9A',
          600: '#C74A7C',
          700: '#A93561',
          800: '#8C2E52',
          900: '#752A47',
        },
        cream: {
          50: '#FDFCF9',
          100: '#FAF7F0',
          200: '#F4EFE2',
          300: '#ECE3D0',
          400: '#DFD2B7',
          500: '#C8B693',
          600: '#B09B74',
          700: '#8C7A58',
          800: '#706248',
          900: '#5C513D',
        },
        lavender: {
          50: '#FAF8FD',
          100: '#F4EEFB',
          200: '#E9DCF7',
          300: '#D8C1F0',
          400: '#BD9AE4',
          500: '#A070D6',
          600: '#8551BF',
          700: '#6E3FA1',
          800: '#5B3584',
          900: '#4D2E6D',
        },
        ink: {
          50: '#F6F5F4',
          100: '#EAE8E5',
          200: '#D5D1CB',
          300: '#B8B1A8',
          400: '#948B80',
          500: '#776D61',
          600: '#5E554B',
          700: '#4A433A',
          800: '#342F29',
          900: '#1F1C18',
          950: '#141210',
        }
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Literata"', '"Merriweather"', '"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
        'card': '0 4px 20px -2px rgba(28, 25, 23, 0.05), 0 2px 6px -1px rgba(28, 25, 23, 0.03)',
        'float': '0 12px 36px -4px rgba(28, 25, 23, 0.08), 0 4px 12px -2px rgba(28, 25, 23, 0.04)',
        'modal': '0 24px 48px -12px rgba(28, 25, 23, 0.18)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
}
