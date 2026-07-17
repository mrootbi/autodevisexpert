/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        trust: {
          50: '#eff4ff',
          100: '#dbe6fe',
          200: '#bfd2fe',
          300: '#93b4fd',
          400: '#608cfa',
          500: '#3b66f6',
          600: '#2548eb',
          700: '#1E3A8A',
          800: '#1e3278',
          900: '#1e2e66',
          950: '#172041',
        },
        action: {
          green: '#16a34a',
          greenDark: '#15803d',
          red: '#dc2626',
          redDark: '#b91c1c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(30,58,138,0.06), 0 8px 24px -8px rgba(30,58,138,0.12)',
        cardHover: '0 4px 12px rgba(30,58,138,0.10), 0 16px 40px -8px rgba(30,58,138,0.20)',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseRing: { '0%': { boxShadow: '0 0 0 0 rgba(22,163,74,0.4)' }, '70%': { boxShadow: '0 0 0 12px rgba(22,163,74,0)' }, '100%': { boxShadow: '0 0 0 0 rgba(22,163,74,0)' } },
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease-out both',
        slideUp: 'slideUp 0.5s ease-out both',
        pulseRing: 'pulseRing 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
};
