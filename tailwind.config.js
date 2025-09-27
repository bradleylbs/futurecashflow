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
        white: '#fefefe',
        primary: '#3594f7',
        error: '#6c0e0e',
        black: '#050505',
        nearblack: '#161616',
        darkgray: '#2d2d2d',
        charcoal: '#3d3d3d',
        mediumgray: '#727272',
        lightgray: '#b8b6b4',
        softgrayblue: '#b4c5d6',
        // Semantic aliases
        'bg-primary': '#3594f7',
        'text-primary': '#3594f7',
        'bg-error': '#6c0e0e',
        'text-error': '#6c0e0e',
        'bg-surface': '#161616',
        'bg-surface-alt': '#2d2d2d',
        'border-default': '#3d3d3d',
        'bg-muted': '#b8b6b4',
        'text-muted': '#b8b6b4',
        'text-soft': '#b4c5d6',
        'text-dark': '#161616',
        'text-on-primary': '#fefefe',
        'bg-black': '#050505',
        'text-white': '#fefefe',
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
