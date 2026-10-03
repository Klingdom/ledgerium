'use client';

import { useAnalyticsIdentity } from '@/hooks/useAnalyticsIdentity';

/** Renders nothing; keeps analytics identity in step with the session (row #355). */
export function AnalyticsIdentitySync(): null {
  useAnalyticsIdentity();
  return null;
}
