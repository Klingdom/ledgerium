import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: [
      'packages/*/src/**/*.test.ts',
      'apps/*/src/**/*.test.ts',
    ],
    // .test.tsx files (React component tests) require app-level vitest config
    // with `@` alias resolution and jsdom environment — run them via the package's
    // own test script (e.g. `pnpm --filter web-app test`). Workspace-level count
    // here does NOT include app component tests; see IMPROVEMENT_BACKLOG follow-up
    // #53 for vitest-workspaces migration.
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
    // Web-app uses `@/` path alias for `apps/web-app/src/`. Workspace-root
    // pnpm test picks up apps/*/src/**/*.test.ts (per include glob above), so
    // the alias must be resolvable here too — otherwise CI fails with
    // "Failed to load url @/lib/plans". Only web-app uses this alias;
    // extension-app and packages do not, so there's no collision.
    alias: {
      '@': path.resolve(__dirname, 'apps/web-app/src'),
    },
    conditions: ['source', 'import', 'module', 'default'],
  },
})
