import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    environment: 'node',
    globals: false,
    passWithNoTests: true,
    // #293: Prisma's native engine (loaded for real by ~13 suites via @/db) crashes
    // (napi finalizer / heap corruption, exit 127/139) under worker_threads. Child
    // processes isolate it; the exit code must mean only "a test failed".
    pool: 'forks',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    conditions: ['source', 'import', 'module', 'default'],
  },
});
