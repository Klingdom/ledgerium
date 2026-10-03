// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

import { AnalyticsPreferencesCard } from './AnalyticsPreferencesCard';
import { getAnalyticsConsent, setAnalyticsConsent } from '@/lib/analytics-consent';

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe('AnalyticsPreferencesCard (#394)', () => {
  it('shows the current choice and switches it', () => {
    render(<AnalyticsPreferencesCard />);
    expect(screen.getByTestId('analytics-current-choice').textContent).toContain('Not chosen yet');

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(getAnalyticsConsent()).toBe('full');
    expect(screen.getByTestId('analytics-current-choice').textContent).toContain('Accept');
    expect(screen.getByRole('button', { name: 'Accept' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Decline PostHog' }));
    expect(getAnalyticsConsent()).toBe('essential');
    expect(screen.getByTestId('analytics-current-choice').textContent).toContain('Decline PostHog');
  });

  it('follows a change made elsewhere (banner / other tab)', () => {
    render(<AnalyticsPreferencesCard />);
    React.act?.(() => setAnalyticsConsent('full'));
    expect(screen.getByTestId('analytics-current-choice').textContent).toContain('Accept');
  });
});
