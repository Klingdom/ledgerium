'use client';

import { requestAnalyticsConsentPrompt } from '@/lib/analytics-consent';

/** Footer control that reopens the analytics consent banner (row #394). */
export function AnalyticsPreferencesLink(): JSX.Element {
  return (
    <button
      type="button"
      onClick={requestAnalyticsConsentPrompt}
      className="text-xs text-[var(--content-secondary)] underline underline-offset-2 hover:text-[var(--content-primary)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      Analytics preferences
    </button>
  );
}
