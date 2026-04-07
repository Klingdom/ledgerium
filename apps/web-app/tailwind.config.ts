import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9dffd',
          300: '#7cc5fc',
          400: '#36a7f8',
          500: '#0c8de9',
          600: '#006fc7',
          700: '#0059a1',
          800: '#054b85',
          900: '#0a3f6e',
        },
      },
      fontSize: {
        /** Design system type scale — 4px increments from 11px base */
        'ds-xs': ['0.6875rem', { lineHeight: '1rem' }],      /* 11px / 16px */
        'ds-sm': ['0.8125rem', { lineHeight: '1.25rem' }],   /* 13px / 20px */
        'ds-base': ['0.875rem', { lineHeight: '1.375rem' }], /* 14px / 22px */
        'ds-lg': ['1rem', { lineHeight: '1.5rem' }],         /* 16px / 24px */
        'ds-xl': ['1.125rem', { lineHeight: '1.625rem' }],   /* 18px / 26px */
        'ds-2xl': ['1.375rem', { lineHeight: '1.75rem' }],   /* 22px / 28px */
      },
      spacing: {
        /** Design system spacing — 4px base unit */
        'ds-1': '0.25rem',  /* 4px */
        'ds-2': '0.5rem',   /* 8px */
        'ds-3': '0.75rem',  /* 12px */
        'ds-4': '1rem',     /* 16px */
        'ds-5': '1.25rem',  /* 20px */
        'ds-6': '1.5rem',   /* 24px */
        'ds-8': '2rem',     /* 32px */
        'ds-10': '2.5rem',  /* 40px */
        'ds-12': '3rem',    /* 48px */
      },
      maxWidth: {
        'ds-content': '48rem', /* 768px — optimal reading width */
      },
      borderRadius: {
        'ds-sm': '0.375rem', /* 6px — badges, tags */
        'ds-md': '0.5rem',   /* 8px — cards, inputs */
        'ds-lg': '0.75rem',  /* 12px — containers */
      },
    },
  },
  plugins: [],
};
export default config;
