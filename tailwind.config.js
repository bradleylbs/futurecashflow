// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './styles/**/*.{css}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand & accents
        'brand-blue': '#3594F7',
        'brand-blue-hover': '#1E7BE5',
        'brand-blue-soft': '#B4C5D6',
        'accent-red': '#FF4D4F',
        'accent-green': '#27AE60',
        'accent-yellow': '#F2C94C',

        // Semantic tokens used by components
        primary: '#3594F7',
        'primary-foreground': '#FEFEFE',
        foreground: '#050505',

        // Neutrals
        white: '#FEFEFE',
        black: '#000000',
        charcoal: '#161B22',
        darkgray: '#2D2D2D',
        mediumgray: '#727272',
        lightgray: '#B8B6B4',
        softgrayblue: '#B4C5D6',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '0.2' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'blink-1': 'blink 1.5s infinite',
        'blink-2': 'blink 1.5s 0.3s infinite',
      },
    },
  },
  plugins: [],
}
