import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'packages/*/src/**/*.test.ts',
      'apps/*/src/**/*.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
    ],
    environment: 'node',
    globals: false,
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: [
        'packages/*/src/**/*.ts',
        'apps/*/src/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/index.ts',
        '**/node_modules/**',
        '**/dist/**',
      ],
      thresholds: {
        // Enforced per-package via individual configs; root config is aggregate
        lines: 70,
      },
    },
  },
  resolve: {
    conditions: ['source', 'import', 'module', 'default'],
  },
})
