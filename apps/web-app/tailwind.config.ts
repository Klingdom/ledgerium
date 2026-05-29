import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        // Semantic surface colors — switch via CSS vars
        surface: {
          primary: 'var(--surface-primary)',
          secondary: 'var(--surface-secondary)',
          elevated: 'var(--surface-elevated)',
          // Semantic backgrounds (EXPORT_TEMPLATE_REVIEW_001 §3 / Iter B):
          success: 'var(--surface-success)',
          warning: 'var(--surface-warning)',
          danger: 'var(--surface-danger)',
          info: 'var(--surface-info)',
          'accent-muted': 'var(--surface-accent-muted)',
        },
        content: {
          primary: 'var(--content-primary)',
          secondary: 'var(--content-secondary)',
          tertiary: 'var(--content-tertiary)',
          // Semantic foreground tokens — pair with the matching surface above.
          // Each pair hits WCAG AA contrast ≥4.5:1 in both themes.
          'on-success': 'var(--content-on-success)',
          'on-warning': 'var(--content-on-warning)',
          'on-danger': 'var(--content-on-danger)',
          'on-info': 'var(--content-on-info)',
          'on-accent-muted': 'var(--content-on-accent-muted)',
        },
        border: {
          DEFAULT: 'var(--border-default)',
          subtle: 'var(--border-subtle)',
          success: 'var(--border-success)',
          warning: 'var(--border-warning)',
          danger: 'var(--border-danger)',
          info: 'var(--border-info)',
          'accent-muted': 'var(--border-accent-muted)',
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
