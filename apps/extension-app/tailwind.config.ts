import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        base: '#f9fafb',
        card: '#ffffff',
        'card-border': '#e5e7eb',
        'accent-blue': '#2563eb',
        'accent-glow': 'rgba(37, 99, 235, 0.10)',
        'text-primary': '#111827',
        'text-secondary': '#6b7280',
        'text-muted': '#9ca3af',
      },
      boxShadow: {
        'glow-blue': '0 0 12px rgba(37, 99, 235, 0.15)',
      },
    },
  },
  plugins: [],
} satisfies Config
