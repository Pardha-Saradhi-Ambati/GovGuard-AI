/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          navy: '#0b1329',       // Deep background
          slate: '#1c2541',      // Panels and cards
          blue: '#3a506b',       // Secondary / borders
          accent: '#00b4d8',     // Interactive highlights
          gold: '#e0a96d',       // Alert warning/headers
          crimson: '#e63946',    // High risk alerts
          emerald: '#06d6a0',    // Approved/low risk
          goldLight: '#f5eadc',  // Subtle backgrounds
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
