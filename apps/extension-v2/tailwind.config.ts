import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        base: '#0a0e14',
        card: '#111827',
        'card-border': '#1f2937',
        'accent-green': '#10b981',
        'accent-glow': 'rgba(16, 185, 129, 0.15)',
        'text-primary': '#f9fafb',
        'text-secondary': '#9ca3af',
        'text-muted': '#4b5563',
      },
      boxShadow: {
        'glow-green': '0 0 12px rgba(16, 185, 129, 0.25)',
      },
    },
  },
  plugins: [],
} satisfies Config
