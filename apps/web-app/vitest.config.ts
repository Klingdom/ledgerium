import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    environment: 'node',
    globals: false,
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    conditions: ['source', 'import', 'module', 'default'],
  },
});
