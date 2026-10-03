// @vitest-environment jsdom
/**
 * Row #116 P1 — PricingPageTracker emits pricing_page_viewed once per view.
 * `track` is spied (payload assertions); session status is the only mocked
 * input. userPlan is track()'s job and is deliberately not asserted here.
 */
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

const trackMock = vi.fn();
vi.mock('@/lib/analytics', () => ({ track: (p: unknown) => trackMock(p) }));

let sessionStatus: 'loading' | 'authenticated' | 'unauthenticated' = 'unauthenticated';
vi.mock('next-auth/react', () => ({ useSession: () => ({ status: sessionStatus, data: null }) }));

import { PricingPageTracker } from './PricingPageTracker';

function setLocation(search: string, referrer: string): void {
  window.history.replaceState({}, '', `/pricing${search}`);
  Object.defineProperty(document, 'referrer', { value: referrer, configurable: true });
}

beforeEach(() => {
  trackMock.mockClear();
  sessionStatus = 'unauthenticated';
  setLocation('', '');
});
afterEach(cleanup);

describe('PricingPageTracker', () => {
  it('emits one event with host-only referrer and capped UTMs; email-like UTM dropped', () => {
    setLocation(
      `?utm_source=${'s'.repeat(200)}&utm_medium=jane%40example.com&utm_campaign=spring`,
      'https://www.google.com/search?q=private+query',
    );
    render(<PricingPageTracker />);
    expect(trackMock).toHaveBeenCalledTimes(1);
    const e = trackMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(e.event).toBe('pricing_page_viewed');
    expect(e.referrerHost).toBe('www.google.com');
    expect(e.utmSource).toBe('s'.repeat(64));
    expect(e.utmMedium).toBeNull();
    expect(e.utmCampaign).toBe('spring');
    expect(e.returnedFromCheckout).toBe(false);
    expect(JSON.stringify(e)).not.toContain('@');
    expect(JSON.stringify(e)).not.toContain('private');
  });

  it('reports returnedFromCheckout and validated tier/interval from cancel_url params', () => {
    setLocation('?billing=canceled&tier=starter&interval=monthly', '');
    render(<PricingPageTracker />);
    const e = trackMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(e.returnedFromCheckout).toBe(true);
    expect(e.checkoutTier).toBe('starter');
    expect(e.checkoutInterval).toBe('monthly');
    expect(e.referrerHost).toBeNull();
  });

  it('isLoggedIn is true when authenticated', () => {
    sessionStatus = 'authenticated';
    render(<PricingPageTracker />);
    expect((trackMock.mock.calls[0]![0] as Record<string, unknown>).isLoggedIn).toBe(true);
  });

  it('isLoggedIn is false when unauthenticated', () => {
    render(<PricingPageTracker />);
    expect((trackMock.mock.calls[0]![0] as Record<string, unknown>).isLoggedIn).toBe(false);
  });

  it('waits for the session to resolve instead of reporting loading as logged-out, then fires once', () => {
    sessionStatus = 'loading';
    const { rerender } = render(<PricingPageTracker />);
    expect(trackMock).not.toHaveBeenCalled();
    sessionStatus = 'authenticated';
    rerender(<PricingPageTracker />);
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect((trackMock.mock.calls[0]![0] as Record<string, unknown>).isLoggedIn).toBe(true);
    rerender(<PricingPageTracker />);
    expect(trackMock).toHaveBeenCalledTimes(1);
  });

  it('strict-mode double effect still emits exactly one event', () => {
    render(
      <React.StrictMode>
        <PricingPageTracker />
      </React.StrictMode>,
    );
    expect(trackMock).toHaveBeenCalledTimes(1);
  });

  it('a genuine remount is a new view and emits again', () => {
    const first = render(<PricingPageTracker />);
    first.unmount();
    render(<PricingPageTracker />);
    expect(trackMock).toHaveBeenCalledTimes(2);
  });
});
