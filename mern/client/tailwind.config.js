/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Outfit's geometric, slightly rounded forms echo the logo's lettering.
        display: ['Outfit', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // Built out from #904A20, sampled from the Focus Prints LLP wordmark.
        brand: {
          50: '#fbf6f2',
          100: '#f5e8dc',
          200: '#e9cdb4',
          300: '#daab86',
          400: '#c8895c',
          500: '#b0693a',
          600: '#904a20',
          700: '#763c1b',
          800: '#5d3018',
          900: '#4a2716',
          950: '#2a1710',
        },
        // Warm neutral ramp — cooler greys fight the copper.
        sand: {
          50: '#faf8f5',
          100: '#f4f0ea',
          200: '#e8e1d7',
          300: '#d6cabb',
          400: '#b8a894',
          500: '#9a8874',
          600: '#7d6d5c',
          700: '#63564a',
          800: '#4a4038',
          900: '#332c26',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(42, 23, 16, 0.05), 0 1px 3px rgba(42, 23, 16, 0.04)',
        raised: '0 4px 12px -2px rgba(42, 23, 16, 0.10), 0 2px 6px -2px rgba(42, 23, 16, 0.06)',
        panel: '0 24px 48px -24px rgba(42, 23, 16, 0.45)',
        sidebar: '2px 0 16px -8px rgba(42, 23, 16, 0.25)',
      },
      keyframes: {
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'slide-in-left': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'pop-in': {
          from: { opacity: 0, transform: 'translateY(6px) scale(0.98)' },
          to: { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        'rise-in': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-in-left': 'slide-in-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
        'pop-in': 'pop-in 0.25s ease-out',
        'rise-in': 'rise-in 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};
