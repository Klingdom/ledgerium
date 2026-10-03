'use client';

import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { setAnalyticsConsent, useAnalyticsConsent } from '@/lib/analytics-consent';

const CHOICE_LABEL = { full: 'Accept', essential: 'Decline PostHog' } as const;

/** Account-page control to change the analytics choice (row #394). */
export function AnalyticsPreferencesCard(): JSX.Element {
  const consent = useAnalyticsConsent();
  const btn = (value: 'essential' | 'full') => (
    <button
      type="button"
      aria-pressed={consent === value}
      onClick={() => setAnalyticsConsent(value)}
      className={[
        'rounded-ds-md px-ds-3 py-1.5 text-ds-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        consent === value
          ? 'bg-brand-700 text-white'
          : 'border border-[var(--border-default)] bg-[var(--surface-secondary)] text-[var(--content-secondary)] hover:bg-[var(--surface-elevated)]',
      ].join(' ')}
    >
      {CHOICE_LABEL[value]}
    </button>
  );
  return (
    <div className="card px-ds-5 py-ds-5" data-testid="analytics-preferences-card">
      <div className="flex items-center gap-ds-3 mb-ds-4">
        <BarChart3 className="h-5 w-5 text-[var(--content-tertiary)]" />
        <h2 className="text-ds-base font-semibold text-[var(--content-primary)]">Analytics preferences</h2>
      </div>
      <p className="text-ds-sm text-[var(--content-secondary)]">
        PostHog product analytics runs in this browser only if you choose Accept. Our own basic usage analytics are not affected by this choice. The choice is stored in this browser.{' '}
        <Link href="/privacy#analytics" className="underline underline-offset-2">What is sent</Link>
      </p>
      <p className="mt-ds-3 text-ds-sm text-[var(--content-primary)]" data-testid="analytics-current-choice">
        Current choice: {consent ? CHOICE_LABEL[consent] : 'Not chosen yet'}
      </p>
      <div className="mt-ds-3 flex items-center gap-ds-2">
        {btn('essential')}
        {btn('full')}
      </div>
    </div>
  );
}
