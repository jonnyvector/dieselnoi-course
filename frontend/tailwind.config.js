/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#D6B84A',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
        purple: {
          DEFAULT: '#5f4891',
          light: '#7a5fb8',
          dark: '#4a376e',
        },
        gold: {
          DEFAULT: '#D6B84A',
          light: '#e5cc6f',
          dark: '#b89a3a',
        },
        light: {
          bg: '#faf9f7',
        },
        dark: {
          bg: '#1a1a1a',
          card: '#222222',
          button: '#5f4891',
          heading: '#D6B84A',
        },
      },
      fontFamily: {
        'heading': ['"Master of Reality"', 'sans-serif'],
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(95, 72, 145, 0.3)',
        'glow-purple-sm': '0 0 10px rgba(95, 72, 145, 0.2)',
        'glow-gold': '0 0 20px rgba(214, 184, 74, 0.3)',
        'glow-gold-sm': '0 0 10px rgba(214, 184, 74, 0.2)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
      },
      // Standardized transition durations
      transitionDuration: {
        'base': '150ms',
        'expand': '200ms',
        'slow': '300ms',
      },
      // Standardized timing functions
      transitionTimingFunction: {
        'base': 'cubic-bezier(0.4, 0, 0.2, 1)', // ease-out
        'expand': 'cubic-bezier(0.4, 0, 0.2, 1)', // ease-in-out
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [
    // Custom transition utilities
    function({ addUtilities }) {
      addUtilities({
        '.transition-base': {
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
        },
        '.transition-expand': {
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        },
        '.transition-fade': {
          transition: 'opacity 150ms ease-in',
        },
        '.transition-slow': {
          transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        },
      })
    },
  ],
}
