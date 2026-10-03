'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { track } from '@/lib/analytics';
import { derivePricingPageContext } from '@/lib/pricing-attribution';

/**
 * Emits `pricing_page_viewed` exactly once per mount (row #116 P1, MR-067).
 * Renders nothing.
 *
 * isLoggedIn comes from `useSession()` (SessionProvider already wraps the
 * public pages and PricingCards/UpgradeButton read it too), so no extra
 * request. The event is emitted when the session status RESOLVES, not at
 * first paint, because `loading` would otherwise be reported as logged-out.
 * Nothing is queued or dropped: it fires as soon as status is known.
 *
 * Once-per-view: React strict mode re-runs the effect on the same instance
 * with refs preserved, so the ref guard holds; a genuine remount (navigating
 * back to /pricing) is a new view and fires again.
 */
export function PricingPageTracker(): null {
  const { status } = useSession();
  const firedRef = useRef(false);

  useEffect(() => {
    if (status === 'loading' || firedRef.current) return;
    firedRef.current = true;
    const ctx = derivePricingPageContext(window.location.search, document.referrer);
    track({
      event: 'pricing_page_viewed',
      referrerHost: ctx.referrerHost,
      utmSource: ctx.utmSource,
      utmMedium: ctx.utmMedium,
      utmCampaign: ctx.utmCampaign,
      isLoggedIn: status === 'authenticated',
      returnedFromCheckout: ctx.returnedFromCheckout,
      checkoutTier: ctx.checkoutTier,
      checkoutInterval: ctx.checkoutInterval,
    });
  }, [status]);

  return null;
}
