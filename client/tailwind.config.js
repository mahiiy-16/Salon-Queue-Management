/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        salon: {
          bg: '#FAF7F2',
          card: '#FFFFFF',
          primary: '#4A3428',
          'primary-hover': '#38261D',
          secondary: '#A58B78',
          accent: '#D8C3A5',
          'accent-light': '#F4EDE3',
          text: '#33251F',
          muted: '#7C6A5F',
          border: '#E8E1D7',
          'border-light': '#F3ECE3',
        }
      }
    },
  },
  plugins: [],
}
