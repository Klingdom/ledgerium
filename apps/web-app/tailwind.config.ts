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
    },
  },
  plugins: [],
};
export default config;
