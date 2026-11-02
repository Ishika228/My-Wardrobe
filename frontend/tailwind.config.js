/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#6366f1',
          violet: '#8b5cf6',
          pink: '#d49da9',
          gold: '#c5a059'
        }
      }
    },
  },
  plugins: [],
}
