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
        dark: {
          bg: '#272727',
          button: '#5f4891',
          heading: '#D6B84A',
        },
      },
      fontFamily: {
        'heading': ['"Master of Reality"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
