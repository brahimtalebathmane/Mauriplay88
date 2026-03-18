/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#050505',
        card: '#0a0a0a',
        cardHover: '#0f0f0f',
        border: 'rgba(255,255,255,0.08)',
        borderStrong: 'rgba(255,255,255,0.12)',
      },
      spacing: {
        'page-x': '1rem',
        'page-y': '1.5rem',
        'section': '2rem',
        'content-top': '6rem',
        'content-bottom': '6rem',
        'nav-bottom': '5rem',
      },
      maxWidth: {
        'content-narrow': '36rem',
        'content': '42rem',
        'content-wide': '56rem',
        'content-max': '72rem',
      },
      borderRadius: {
        'card': '1.25rem',
        'card-lg': '1.5rem',
        'btn': '0.75rem',
        'input': '0.75rem',
      },
      fontSize: {
        'page-title': ['1.75rem', { lineHeight: '2rem' }],
        'section-title': ['1.25rem', { lineHeight: '1.5rem' }],
        'body': ['1rem', { lineHeight: '1.5rem' }],
        'caption': ['0.875rem', { lineHeight: '1.25rem' }],
        'small': ['0.75rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0,0,0,0.25)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
};
