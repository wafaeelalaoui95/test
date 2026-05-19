/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'bg-lavender-50', 'bg-lavender-100', 'bg-lavender-200', 'text-lavender-500', 'text-lavender-600', 'text-lavender-700',
    'bg-butter-50', 'bg-butter-100', 'bg-butter-200', 'text-butter-500', 'text-butter-600', 'text-butter-700',
    'bg-mint-50', 'bg-mint-100', 'bg-mint-200', 'text-mint-500', 'text-mint-600', 'text-mint-700',
    'bg-sky-50', 'bg-sky-100', 'bg-sky-200', 'text-sky-500', 'text-sky-600', 'text-sky-700',
    'bg-blush-50', 'bg-blush-100', 'bg-blush-200', 'text-blush-500', 'text-blush-600', 'text-blush-700',
  ],
  theme: {
    extend: {
      colors: {
        cream: { 50: '#FBF8F2', 100: '#F5EFE3', 200: '#EDE3CF', 300: '#E1D2B0' },
        lavender: {
          50: '#F4F1FF', 100: '#E8E2FF', 200: '#D2C6FF', 300: '#B6A1FF',
          400: '#967AF6', 500: '#7458E8', 600: '#5B41C9', 700: '#48309F',
        },
        butter: {
          50: '#FFFAEA', 100: '#FFF1C2', 200: '#FFE38A', 300: '#FFD24F',
          400: '#F5BE25', 500: '#D69E0C', 600: '#A87B05',
        },
        sky:   { 50: '#EEF6FB', 100: '#DAEAF3', 200: '#B2D2E5', 300: '#82B7D3', 400: '#5294BC', 500: '#3477A0' },
        mint:  { 50: '#EEF9F2', 100: '#D8EFE0', 200: '#ACDDBE', 300: '#7CC79A', 400: '#4FAE7A', 500: '#33935F' },
        blush: { 50: '#FCF1EF', 100: '#FADCD7', 200: '#F4B8AE', 300: '#EB8E81', 400: '#D9685A', 500: '#B84A3E' },
        ink: {
          50:  '#F1EDE7',
          100: '#E2DACE',
          200: '#C7BCAB',
          300: '#8B8074',
          400: '#5A5145',
          500: '#2C2620',
          600: '#181410',
        },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        arabic: ['"Noto Naskh Arabic"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs':   ['0.8125rem', { lineHeight: '1.25rem', letterSpacing: '0.005em' }],
        'sm':   ['0.9375rem', { lineHeight: '1.5rem',  letterSpacing: '0' }],
        'base': ['1rem',      { lineHeight: '1.6rem',  letterSpacing: '0' }],
        'lg':   ['1.125rem',  { lineHeight: '1.7rem',  letterSpacing: '-0.005em' }],
        'xl':   ['1.25rem',   { lineHeight: '1.8rem',  letterSpacing: '-0.01em' }],
        '2xl':  ['1.5rem',    { lineHeight: '2rem',    letterSpacing: '-0.015em' }],
        '3xl':  ['1.875rem',  { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        '4xl':  ['2.375rem',  { lineHeight: '2.75rem', letterSpacing: '-0.025em' }],
        '5xl':  ['3rem',      { lineHeight: '3.25rem', letterSpacing: '-0.03em' }],
        '6xl':  ['3.75rem',   { lineHeight: '3.9rem',  letterSpacing: '-0.035em' }],
        '7xl':  ['4.5rem',    { lineHeight: '4.6rem',  letterSpacing: '-0.04em' }],
      },
      borderRadius: { '4xl': '2rem', '5xl': '2.5rem' },
      boxShadow: {
        soft: '0 1px 2px rgba(42, 36, 29, 0.04), 0 6px 24px -12px rgba(42, 36, 29, 0.08)',
        card: '0 1px 2px rgba(42, 36, 29, 0.04), 0 2px 8px -3px rgba(42, 36, 29, 0.06)',
        float: '0 4px 16px -6px rgba(42, 36, 29, 0.10), 0 12px 40px -16px rgba(42, 36, 29, 0.12)',
      },
      maxWidth: {
        'editorial': '68ch',
        'measure': '58ch',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'fade-up': 'fadeUp 0.6s ease-out',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
      },
    },
  },
  plugins: [],
};
