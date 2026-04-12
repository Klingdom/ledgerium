'use client';

/**
 * PostHog Provider — initializes PostHog on client-side mount.
 * Wrap your app layout with this component to enable analytics.
 *
 * No-op if NEXT_PUBLIC_POSTHOG_KEY is not set in environment.
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initPostHog, captureEvent } from '@/lib/posthog';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Initialize PostHog on mount
  useEffect(() => {
    initPostHog();
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (pathname) {
      captureEvent('$pageview', { path: pathname });
    }
  }, [pathname]);

  return <>{children}</>;
}
