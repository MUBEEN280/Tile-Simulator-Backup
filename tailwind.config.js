/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
         maxWidth: {
        '8xl': '90vw',  // 1440px
        '9xl': '95vw', // 1600px
      },
    },
  },
  plugins: [],
} 