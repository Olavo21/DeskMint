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
        // Light-theme surface palette (was dark navy — now mint/white)
        dark: {
          50:  '#0f172a', // near-black text  (replaces text-white on light bg)
          100: '#1e293b', // very dark text
          200: '#334155', // dark text
          300: '#475569', // medium text
          400: '#64748b', // secondary text
          500: '#94a3b8', // muted / placeholder text
          600: '#d1fae5', // borders & dividers  (was dark separator)
          700: '#f0fdf9', // input / inner surface (was dark input bg)
          800: '#ffffff', // card surface         (was dark card bg)
          900: '#f0fdf9', // page background      (was darkest bg)
          950: '#e6fdf7', // pressed / hover state
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui'],
      },
    },
  },
  plugins: [],
}
