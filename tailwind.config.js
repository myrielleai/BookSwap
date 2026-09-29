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
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d', // Primary Forest Emerald
          800: '#166534', // Dark Forest Emerald
          900: '#14532d',
          950: '#052e16',
        },
        book: {
          50: '#faf6ee',  // Light Cream container
          100: '#f4f1ea', // Parchment page background
          200: '#e8e2d5', // Muted paper accent
          300: '#d8cdb8',
          500: '#a38a68',
          700: '#633d23', // Deep Leather Brown
          900: '#382011',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}

