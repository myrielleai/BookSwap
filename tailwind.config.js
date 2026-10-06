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
        },
        // Tan/caramel leather tones for the skeuomorphic landing page
        leather: {
          50: '#faf5ec',
          100: '#f3e7d3',
          200: '#e6d0ac',
          300: '#d6b483',
          400: '#c49a62',
          500: '#b07f45',
          600: '#956536',
          700: '#7a502b',
          800: '#5f3e23',
          900: '#4a301c',
        },
        // Subtle moss green — paper comes from trees
        moss: {
          50: '#f2f6ef',
          100: '#e2ecdd',
          200: '#c6d9bf',
          300: '#a0c095',
          400: '#7aa46f',
          500: '#5c8b52',
          600: '#497242',
          700: '#3b5d36',
          800: '#304b2c',
          900: '#263c24',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        condensed: ['Oswald', 'Impact', 'sans-serif'],
        hand: ['Caveat', 'cursive'],
      }
    },
  },
  plugins: [],
}

