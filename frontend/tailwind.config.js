/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        globe: {
          bg: '#0a0e17',
          ocean: '#0d1421',
          land: '#1e3a5f',
          highlight: '#3b82f6',
        },
      },
    },
  },
  plugins: [],
};
