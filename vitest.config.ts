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
        // Chrome extension content scripts — require browser DOM + chrome APIs; covered by E2E
        'apps/*/src/content/**',
        // Chrome extension UI — React components requiring browser render; covered by E2E
        'apps/*/src/sidepanel/**',
        'apps/*/src/viewer/**',
        'apps/*/src/popup/**',
        // Chrome extension background files that are thin chrome API wrappers (index, uploader, injection-manager)
        'apps/*/src/background/index.ts',
        'apps/*/src/background/uploader.ts',
        'apps/*/src/background/injection-manager.ts',
        // Next.js app routes and pages — require server + DB; covered by integration tests
        'apps/web-app/src/app/**',
        // Next.js middleware — requires Next.js server runtime
        'apps/web-app/src/middleware.ts',
        // Web-app lib — auth, analytics, API clients, DB clients depend on external services
        'apps/web-app/src/lib/**',
        // Web-app DB client — requires live PostgreSQL
        'apps/web-app/src/db/**',
        // React component files (hooks and React-specific modules)
        'apps/web-app/src/components/**/*.tsx',
        'apps/web-app/src/components/**/hooks/**',
        // Build config files
        'apps/*/tailwind.config.ts',
        'apps/*/vite.config.ts',
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
