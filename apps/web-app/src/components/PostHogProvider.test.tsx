// @vitest-environment jsdom
/** #394 - the provider follows consent changes without a reload. */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

const ph = vi.hoisted(() => ({
  initPostHog: vi.fn(),
  optInPostHog: vi.fn(),
  optOutPostHog: vi.fn(),
  captureEvent: vi.fn(),
}));
vi.mock('@/lib/posthog', () => ph);
vi.mock('next/navigation', () => ({ usePathname: () => '/pricing', useSearchParams: () => new URLSearchParams() }));
vi.mock('@/components/UTMCapture', () => ({ UTMCapture: () => null }));

import { PostHogProvider } from './PostHogProvider';
import { setAnalyticsConsent } from '@/lib/analytics-consent';

beforeEach(() => {
  window.localStorage.clear();
  Object.values(ph).forEach((f) => f.mockClear());
});
afterEach(cleanup);

describe('PostHogProvider consent wiring', () => {
  it('no choice yet: nothing initialised, nothing captured', () => {
    render(<PostHogProvider>x</PostHogProvider>);
    expect(ph.initPostHog).not.toHaveBeenCalled();
    expect(ph.captureEvent).not.toHaveBeenCalled();
  });

  it('accept after mount initialises immediately and sends the current page view', () => {
    render(<PostHogProvider>x</PostHogProvider>);
    act(() => setAnalyticsConsent('full'));
    expect(ph.initPostHog).toHaveBeenCalledTimes(1);
    expect(ph.captureEvent).toHaveBeenCalledWith('$pageview', { path: '/pricing' });
  });

  it('withdraw opts out and sends no further page view', () => {
    setAnalyticsConsent('full');
    render(<PostHogProvider>x</PostHogProvider>);
    ph.captureEvent.mockClear();
    act(() => setAnalyticsConsent('essential'));
    expect(ph.optOutPostHog).toHaveBeenCalledTimes(1);
    expect(ph.captureEvent).not.toHaveBeenCalled();
  });

  it('a change in another tab is applied (storage event)', () => {
    render(<PostHogProvider>x</PostHogProvider>);
    act(() => {
      window.localStorage.setItem('ledgerium_analytics_consent', 'full');
      window.dispatchEvent(new StorageEvent('storage', { key: 'ledgerium_analytics_consent', newValue: 'full' }));
    });
    expect(ph.initPostHog).toHaveBeenCalledTimes(1);
  });
});
