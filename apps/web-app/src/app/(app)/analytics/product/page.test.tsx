/**
 * ProductAnalyticsPage — client gate is the allowlist, not session.user.isAdmin (row #276).
 * The gate lives in a useEffect (redirect to /dashboard). Effects do not run under
 * renderToString, so useEffect is captured and run right after the render for this test.
 * The data APIs enforce the same predicate server-side; this gate is UX only.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

// The vitest JSX transform is classic; the page has no React import.
(globalThis as unknown as { React: typeof React }).React = React;

const { useSessionMock, replaceMock, effects } = vi.hoisted(() => ({
  effects: [] as Array<() => void>,
  useSessionMock: vi.fn(),
  replaceMock: vi.fn(),
}));
vi.mock('react', async (orig) => {
  const actual = await orig<typeof import('react')>();
  return { ...actual, default: actual, useEffect: (fn: () => void) => { effects.push(fn); } };
});
vi.mock('next-auth/react', () => ({ useSession: () => useSessionMock() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock, push: vi.fn() }) }));
vi.mock('next/link', () => ({ default: (p: { children?: React.ReactNode }) => React.createElement('a', null, p.children) }));

describe('ProductAnalyticsPage admin gate', () => {
  beforeEach(() => {
    useSessionMock.mockReset();
    replaceMock.mockReset();
    effects.length = 0;
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  });

  it('redirects an isAdmin:true session that is NOT on the allowlist', async () => {
    useSessionMock.mockReturnValue({
      status: 'authenticated',
      data: { user: { id: 'u', email: 'user@example.com', isAdmin: true } },
    });
    const { default: Page } = await import('./page');
    renderToString(React.createElement(Page));
    effects.forEach((fn) => fn());
    expect(replaceMock).toHaveBeenCalledWith('/dashboard');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not redirect and loads data for an allowlisted user', async () => {
    useSessionMock.mockReturnValue({
      status: 'authenticated',
      data: { user: { id: 'a', email: 'phil@mediafier.ai' } },
    });
    const { default: Page } = await import('./page');
    renderToString(React.createElement(Page));
    effects.forEach((fn) => fn());
    expect(replaceMock).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalled();
  });
});
