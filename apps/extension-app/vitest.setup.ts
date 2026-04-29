// vitest.setup.ts — extension-app test harness bootstrap (iter-042)
//
// Registers @testing-library/jest-dom matchers (toBeInTheDocument,
// toHaveTextContent, etc.) on the vitest `expect` object so all
// *.test.tsx component tests can use them without per-file imports.
import '@testing-library/jest-dom/vitest'
