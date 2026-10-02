// @vitest-environment jsdom
/**
 * Backlog #283 — error boundaries show no error internals; production serves no
 * public source maps.
 */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { createRequire } from 'module';
import RouteError from './error';
import GlobalError from './global-error';

// Source files rely on the automatic JSX runtime under Next; vitest uses classic.
(globalThis as unknown as { React: typeof React }).React = React;

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

afterEach(cleanup);

function leakyError(): Error & { digest?: string } {
  const e = new Error('SECRET-MESSAGE customer title Q3 payroll') as Error & { digest?: string };
  e.name = 'LeakyDistinctiveError';
  e.stack = 'LeakyDistinctiveError: SECRET-STACK at /src/components/Secret.tsx:42';
  e.digest = 'digest-abc123';
  return e;
}

const SUITES: Array<[string, React.ComponentType<{ error: Error & { digest?: string }; reset: () => void }>]> = [
  ['app/error.tsx', RouteError],
  ['app/global-error.tsx', GlobalError],
];

describe.each(SUITES)('%s', (_name, Boundary) => {
  it('never renders the error name, message or stack', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<Boundary error={leakyError()} reset={() => {}} />);
    const text = container.ownerDocument.documentElement.textContent ?? '';
    expect(text).not.toContain('SECRET-MESSAGE');
    expect(text).not.toContain('SECRET-STACK');
    expect(text).not.toContain('LeakyDistinctiveError');
    expect(text).not.toContain('Secret.tsx');
  });

  it('shows the digest as a support reference and a working retry button', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reset = vi.fn();
    render(<Boundary error={leakyError()} reset={reset} />);
    expect(screen.getByText(/digest-abc123/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});

describe('production source maps', () => {
  it('productionBrowserSourceMaps is not true by default', () => {
    const require_ = createRequire(import.meta.url);
    const cfgPath = require_.resolve('../../next.config.js');
    delete require_.cache[cfgPath];
    const saved = process.env.LEDGERIUM_SOURCE_MAPS;
    delete process.env.LEDGERIUM_SOURCE_MAPS;
    try {
      expect(require_(cfgPath).productionBrowserSourceMaps).not.toBe(true);
    } finally {
      if (saved !== undefined) process.env.LEDGERIUM_SOURCE_MAPS = saved;
      delete require_.cache[cfgPath];
    }
  });
});
