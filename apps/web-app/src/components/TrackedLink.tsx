'use client';

/**
 * TrackedLink — a Next.js Link wrapper that fires a PostHog analytics
 * event on click before navigating.
 *
 * Use this in server-component marketing pages where you cannot attach
 * onClick handlers directly to <Link> elements.
 *
 * Usage:
 *   <TrackedLink
 *     href="/signup"
 *     event="cta_clicked"
 *     properties={{ location: 'homepage_hero', destination: '/signup' }}
 *     className="btn-primary ..."
 *   >
 *     Get Started Free
 *   </TrackedLink>
 */

import Link from 'next/link';
import { track } from '@/lib/analytics';
import type { AnalyticsEvent } from '@/lib/analytics';

type TrackableEvent = Extract<AnalyticsEvent, { event: string }>;

interface TrackedLinkProps extends Omit<React.ComponentPropsWithoutRef<typeof Link>, 'onClick'> {
  /** analytics.ts event name */
  event: TrackableEvent['event'];
  /** Additional properties merged into the track call */
  properties?: Record<string, unknown>;
}

export function TrackedLink({
  event: eventName,
  properties,
  children,
  ...linkProps
}: TrackedLinkProps) {
  function handleClick() {
    try {
      track({ event: eventName, ...(properties ?? {}) } as AnalyticsEvent);
    } catch {
      // Analytics must never break navigation
    }
  }

  return (
    <Link {...linkProps} onClick={handleClick}>
      {children}
    </Link>
  );
}
