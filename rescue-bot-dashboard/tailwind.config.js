/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#fefae0', // Background
        primary: '#e9edc9', // Primary
        secondary: '#faedcd', // Secondary
        cta: '#ccd5ae', // CTA / Positive
        text: '#4a5d23', // Text
        danger: '#d4a373', // Alert
      },
      fontFamily: {
        sans: ['"Fira Sans"', 'sans-serif'],
        mono: ['"Fira Code"', 'monospace'],
      },
    },
  },
  plugins: [],
}

