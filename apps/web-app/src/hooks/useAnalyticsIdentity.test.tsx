// @vitest-environment jsdom
/**
 * Row #355 - analytics identity follows the session. Real analytics slot, real
 * account cache; only `useSession` and the PostHog wrapper are controlled.
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

(globalThis as unknown as { React: typeof React }).React = React;

type SessionState = { status: 'loading' | 'authenticated' | 'unauthenticated'; data: { user: { id?: string; email?: string } } | null };
let sessionState: SessionState = { status: 'unauthenticated', data: null };
vi.mock('next-auth/react', () => ({ useSession: () => sessionState }));

const ph = vi.hoisted(() => ({
  enabled: true,
  identifyUser: vi.fn(),
  resetUser: vi.fn(),
}));
vi.mock('@/lib/posthog', () => ({
  isPostHogEnabled: () => ph.enabled,
  identifyUser: ph.identifyUser,
  resetUser: ph.resetUser,
  captureEvent: vi.fn(),
}));

import { useAnalyticsIdentity, IDENTIFIED_USER_KEY } from './useAnalyticsIdentity';
import { setUserPlanForAnalytics } from '@/lib/analytics';
import { setAnalyticsConsent } from '@/lib/analytics-consent';
import { act } from '@testing-library/react';
import * as accountModule from './useAccount';

const win = window as unknown as { __ledgerium_userPlan?: unknown };

function Sync() {
  useAnalyticsIdentity();
  return null;
}
const authed = (id: string): SessionState => ({ status: 'authenticated', data: { user: { id, email: `${id}@x.test` } } });
const anon: SessionState = { status: 'unauthenticated', data: null };

let clearSpy: { mockClear(): unknown; mockRestore(): unknown; mock: unknown; (...a: never[]): unknown };
beforeEach(() => {
  sessionState = anon;
  ph.enabled = true;
  ph.identifyUser.mockReset();
  ph.resetUser.mockReset();
  window.localStorage.clear();
  delete win.__ledgerium_userPlan;
  clearSpy = vi.spyOn(accountModule, "clearAccountCache") as unknown as typeof clearSpy;
});
afterEach(() => {
  cleanup();
  clearSpy.mockRestore();
});

describe('useAnalyticsIdentity', () => {
  it('(a) expiry: authenticated -> unauthenticated clears slot and cache and resets PostHog', () => {
    sessionState = authed('A');
    const { rerender } = render(<Sync />);
    expect(ph.identifyUser).toHaveBeenCalledWith('A');
    setUserPlanForAnalytics('team');
    clearSpy.mockClear();

    sessionState = anon;
    rerender(<Sync />);
    expect(win.__ledgerium_userPlan).toBeNull();
    expect(clearSpy as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1);
    expect(ph.resetUser).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(IDENTIFIED_USER_KEY)).toBeNull();
  });

  it('(b) user switch A -> B clears, resets and re-identifies with B', () => {
    sessionState = authed('A');
    const { rerender } = render(<Sync />);
    setUserPlanForAnalytics('team');
    clearSpy.mockClear();
    ph.identifyUser.mockClear();

    sessionState = authed('B');
    rerender(<Sync />);
    expect(win.__ledgerium_userPlan).toBeNull();
    expect(clearSpy as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1);
    expect(ph.resetUser).toHaveBeenCalledTimes(1);
    expect(ph.identifyUser).toHaveBeenCalledTimes(1);
    expect(ph.identifyUser).toHaveBeenCalledWith('B');
  });

  it('(c) same user re-rendering does nothing', () => {
    sessionState = authed('A');
    const { rerender } = render(<Sync />);
    setUserPlanForAnalytics('team');
    clearSpy.mockClear();
    ph.identifyUser.mockClear();

    sessionState = authed('A');
    rerender(<Sync />);
    rerender(<Sync />);
    expect(win.__ledgerium_userPlan).toBe('team');
    expect(clearSpy as unknown as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
    expect(ph.resetUser).not.toHaveBeenCalled();
    expect(ph.identifyUser).not.toHaveBeenCalled();
  });

  it('(d) PostHog dormant: no throw, nothing identified or reset, user-scoped state still cleared', () => {
    ph.enabled = false;
    sessionState = authed('A');
    const { rerender } = render(<Sync />);
    setUserPlanForAnalytics('team');
    sessionState = anon;
    expect(() => rerender(<Sync />)).not.toThrow();
    expect(ph.identifyUser).not.toHaveBeenCalled();
    expect(ph.resetUser).not.toHaveBeenCalled();
    expect(win.__ledgerium_userPlan).toBeNull();
    expect(window.localStorage.getItem(IDENTIFIED_USER_KEY)).toBeNull();
  });

  it('identifies by user id with no properties - the email appears in no call argument', () => {
    sessionState = authed('A');
    render(<Sync />);
    expect(ph.identifyUser).toHaveBeenCalledTimes(1);
    const args = ph.identifyUser.mock.calls[0]!;
    expect(args).toEqual(['A']);
    expect(JSON.stringify(args)).not.toContain('@');
  });

  it('a throwing PostHog wrapper cannot break the app', () => {
    ph.resetUser.mockImplementation(() => { throw new Error('boom'); });
    sessionState = authed('A');
    const { rerender } = render(<Sync />);
    sessionState = anon;
    expect(() => rerender(<Sync />)).not.toThrow();
  });

  it('loading and anonymous first load never reset PostHog (would mint an anonymous id per page)', () => {
    sessionState = { status: 'loading', data: null };
    const { rerender } = render(<Sync />);
    sessionState = anon;
    rerender(<Sync />);
    expect(ph.resetUser).not.toHaveBeenCalled();
  });

  it('full reload while expired resets an identity persisted by an earlier page', () => {
    window.localStorage.setItem(IDENTIFIED_USER_KEY, 'A');
    sessionState = anon;
    render(<Sync />);
    expect(ph.resetUser).toHaveBeenCalledTimes(1);
  });

  it('full reload as a different user than the persisted identity resets then identifies', () => {
    window.localStorage.setItem(IDENTIFIED_USER_KEY, 'A');
    sessionState = authed('B');
    render(<Sync />);
    expect(ph.resetUser).toHaveBeenCalledTimes(1);
    expect(ph.identifyUser).toHaveBeenCalledWith('B');
    expect(window.localStorage.getItem(IDENTIFIED_USER_KEY)).toBe('B');
  });

  it('loading with a stored identity never resets and keeps the stored id (guard, MR-076)', () => {
    window.localStorage.setItem(IDENTIFIED_USER_KEY, 'A');
    sessionState = { status: 'loading', data: null };
    render(<Sync />);
    expect(ph.resetUser).not.toHaveBeenCalled();
    expect(ph.identifyUser).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(IDENTIFIED_USER_KEY)).toBe('A');
  });

  it('identify while PostHog is dormant leaves the stored key empty (guard, MR-076)', () => {
    ph.enabled = false;
    sessionState = authed('A');
    render(<Sync />);
    expect(ph.identifyUser).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(IDENTIFIED_USER_KEY)).toBeNull();
  });

  it('#391: signed in on essential, consent becomes full -> exactly one identify, by id only', () => {
    ph.enabled = false; // PostHog starts only on full consent
    setAnalyticsConsent('essential');
    sessionState = authed('A');
    render(<Sync />);
    expect(ph.identifyUser).not.toHaveBeenCalled();

    ph.enabled = true; // PostHogProvider initialises it on the same change
    act(() => setAnalyticsConsent('full'));
    expect(ph.identifyUser).toHaveBeenCalledTimes(1);
    expect(ph.identifyUser).toHaveBeenCalledWith('A');
    expect(window.localStorage.getItem(IDENTIFIED_USER_KEY)).toBe('A');

    act(() => setAnalyticsConsent('full')); // no further change, no further identify
    expect(ph.identifyUser).toHaveBeenCalledTimes(1);
  });

  it('withdrawal forgets the stored identity; a later grant identifies again', () => {
    setAnalyticsConsent('full');
    sessionState = authed('A');
    render(<Sync />);
    expect(ph.identifyUser).toHaveBeenCalledTimes(1);

    act(() => setAnalyticsConsent('essential'));
    expect(window.localStorage.getItem(IDENTIFIED_USER_KEY)).toBeNull();
    expect(ph.identifyUser).toHaveBeenCalledTimes(1); // never identifies while not full

    act(() => setAnalyticsConsent('full'));
    expect(ph.identifyUser).toHaveBeenCalledTimes(2);
    expect(window.localStorage.getItem(IDENTIFIED_USER_KEY)).toBe('A');
  });

  it('wiring: mounted in AuthProvider (covers public pages); login/signup no longer identify by email', () => {
    const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
    expect(read('../components/AuthProvider.tsx')).toMatch(/<AnalyticsIdentitySync \/>/);
    expect(read('../app/(public)/login/LoginPageClient.tsx')).not.toMatch(/identifyAnalyticsUser/);
    expect(read('../app/(public)/signup/SignupPageClient.tsx')).not.toMatch(/identifyAnalyticsUser/);
  });
});
