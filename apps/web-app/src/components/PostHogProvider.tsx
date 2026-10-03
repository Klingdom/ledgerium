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
 *
 * Also mounts UTMCapture (inside a Suspense boundary) to record
 * first-touch UTM parameters from the landing URL.
 */

import { Suspense, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initPostHog, captureEvent, optInPostHog, optOutPostHog } from '@/lib/posthog';
import { AnalyticsConsent } from '@/components/shared/AnalyticsConsent';
import { getAnalyticsConsent, subscribeAnalyticsConsent, useAnalyticsConsent } from '@/lib/analytics-consent';
import { UTMCapture } from '@/components/UTMCapture';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // null until hydrated / not chosen; re-renders on change (this tab or another).
  const consent = useAnalyticsConsent();

  // Follow the consent choice without a reload (row #394).
  //  full      -> initialise (once) and resume if a withdrawal stopped it earlier
  //  essential -> stop capturing and forget the identity (no-op if never initialised)
  // Applied from the store listener itself (synchronously at change time), not from
  // a React effect, so PostHog is already up before useAnalyticsIdentity's effect
  // re-runs on the same change (it is mounted ahead of this provider).
  useEffect(() => {
    const apply = () => {
      const current = getAnalyticsConsent();
      if (current === 'full') {
        initPostHog();
        optInPostHog();
      } else if (current === 'essential') {
        optOutPostHog();
      }
    };
    apply();
    return subscribeAnalyticsConsent(apply);
  }, []);

  // Track page views on route change, and once when consent is granted so the
  // current page is not lost — only when PostHog is active. Declared after the
  // effect above so initialisation has run first.
  useEffect(() => {
    if (pathname && consent === 'full') {
      captureEvent('$pageview', { path: pathname });
    }
  }, [pathname, consent]);

  return (
    <>
      {children}
      {/* UTMCapture uses useSearchParams — must be inside Suspense */}
      <Suspense fallback={null}>
        <UTMCapture />
      </Suspense>
      <AnalyticsConsent />
    </>
  );
}
