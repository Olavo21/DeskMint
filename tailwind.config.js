/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // DeskMint brand — teal/mint
        mint: {
          50:  '#f0fdf9',
          100: '#ccfbef',
          200: '#99f6df',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        // Surface palette — sage-mint, slightly dark, not too heavy
        dark: {
          50:  '#0f172a', // near-black text
          100: '#1e293b', // very dark text
          200: '#334155', // dark text
          300: '#475569', // medium text
          400: '#64748b', // secondary text
          500: '#94a3b8', // muted / placeholder text
          600: '#c9d4cf', // borders & dividers
          700: '#edf1ee', // input / inner surface
          800: '#f8faf9', // card surface
          900: '#dfe8e3', // page background
          950: '#d3dfd9', // pressed / hover state
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui'],
      },
    },
  },
  plugins: [],
}
