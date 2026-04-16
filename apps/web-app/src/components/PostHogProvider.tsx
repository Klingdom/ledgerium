'use client';

/**
 * PostHog Provider — initializes PostHog on client-side mount.
 * Wrap your app layout with this component to enable analytics.
 *
 * No-op if NEXT_PUBLIC_POSTHOG_KEY is not set in environment.
 *
 * PostHog is only initialized when the user has given 'full' consent.
 * The AnalyticsConsent banner is rendered as a sibling when consent
 * has not yet been recorded.
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { initPostHog, captureEvent } from '@/lib/posthog';
import { AnalyticsConsent, getAnalyticsConsent } from '@/components/shared/AnalyticsConsent';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [consentKnown, setConsentKnown] = useState(false);

  // Gate PostHog initialization on 'full' consent.
  // Re-evaluated once on mount when localStorage is accessible.
  useEffect(() => {
    const consent = getAnalyticsConsent();
    if (consent === 'full') {
      initPostHog();
    }
    setConsentKnown(true);
  }, []);

  // Track page views on route change — only when PostHog is active.
  useEffect(() => {
    if (pathname && consentKnown && getAnalyticsConsent() === 'full') {
      captureEvent('$pageview', { path: pathname });
    }
  }, [pathname, consentKnown]);

  return (
    <>
      {children}
      <AnalyticsConsent />
    </>
  );
}
