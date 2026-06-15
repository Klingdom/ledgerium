'use client';

import { useEffect, useState } from 'react';

const CONSENT_KEY = 'ledgerium_analytics_consent';

type ConsentValue = 'full' | 'essential';

/**
 * AnalyticsConsent — a non-intrusive bottom banner that collects the user's
 * analytics consent preference and persists it to localStorage.
 *
 * Renders nothing if consent has already been recorded in a previous session.
 * Slides up from the bottom on mount via a CSS transition.
 */
export function AnalyticsConsent(): JSX.Element | null {
  // null = unknown (before hydration), string = already set, undefined = not set
  const [consent, setConsent] = useState<ConsentValue | null | undefined>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === 'full' || stored === 'essential') {
      setConsent(stored);
      return;
    }

    setConsent(undefined);
    // Slight delay so the slide-up animation is noticeable
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  function accept(value: ConsentValue): void {
    localStorage.setItem(CONSENT_KEY, value);
    setConsent(value);
    setVisible(false);
  }

  // Already consented or unknown (SSR) — render nothing
  if (consent !== undefined) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Analytics consent"
      data-consent-banner
      className={[
        'fixed bottom-0 left-0 right-0 z-50 no-print',
        'transition-transform duration-300 ease-out',
        visible ? 'translate-y-0' : 'translate-y-full',
      ].join(' ')}
    >
      <div className="mx-auto max-w-4xl mb-4 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-ds-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-5 py-4 shadow-lg">
          <p className="text-ds-sm text-[var(--content-secondary)]">
            We use analytics to improve Ledgerium.{' '}
            <span className="text-[var(--content-primary)] font-medium">
              No workflow content is tracked.
            </span>
          </p>

          <div className="flex items-center gap-ds-2 flex-shrink-0">
            <button
              onClick={() => accept('essential')}
              className="rounded-ds-md border border-[var(--border-default)] bg-[var(--surface-secondary)] px-ds-3 py-1.5 text-ds-sm font-medium text-[var(--content-secondary)] hover:bg-[var(--surface-tertiary)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Essential Only
            </button>

            <button
              onClick={() => accept('full')}
              className="rounded-ds-md bg-brand-600 px-ds-3 py-1.5 text-ds-sm font-semibold text-white hover:bg-brand-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Returns the current analytics consent value from localStorage.
 * Safe to call during SSR — returns null when window is unavailable.
 */
export function getAnalyticsConsent(): ConsentValue | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(CONSENT_KEY);
  if (stored === 'full' || stored === 'essential') return stored;
  return null;
}
