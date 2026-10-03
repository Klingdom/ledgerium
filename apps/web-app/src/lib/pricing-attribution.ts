/**
 * Row #116 P1 (MR-067) — pure derivation of the `pricing_page_viewed` fields
 * from the page URL's query string and document.referrer. No I/O, no globals:
 * callers pass the raw strings so this is deterministic and unit-testable.
 *
 * PII rules enforced here (not left to callers):
 *  - referrer -> hostname only (lowercased); null when absent/unparseable.
 *    Path, query and fragment are never read past URL parsing.
 *  - utm_* -> trimmed; DROPPED ENTIRELY (null) when the value contains '@'
 *    (an email-looking value is never logged, not even truncated); otherwise
 *    capped at UTM_MAX_LENGTH characters.
 *  - tier / interval from the checkout cancel_url are echoed only if they are
 *    members of the closed enums; anything else is null.
 */
import type { PricingTierId, PricingBillingInterval } from '@/lib/analytics';

export const UTM_MAX_LENGTH = 64;

const TIER_IDS: readonly PricingTierId[] = ['free', 'starter', 'solo', 'team', 'growth', 'enterprise'];
const INTERVALS: readonly PricingBillingInterval[] = ['monthly', 'annual'];

export interface PricingPageContext {
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  returnedFromCheckout: boolean;
  checkoutTier: PricingTierId | null;
  checkoutInterval: PricingBillingInterval | null;
}

export function sanitizeUtm(raw: string | null): string | null {
  if (raw === null) return null;
  const v = raw.trim();
  if (v === '' || v.includes('@')) return null;
  return v.slice(0, UTM_MAX_LENGTH);
}

export function referrerHostOf(referrer: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    return host === '' ? null : host;
  } catch {
    return null;
  }
}

export function derivePricingPageContext(search: string, referrer: string): PricingPageContext {
  const params = new URLSearchParams(search);
  const tier = params.get('tier');
  const interval = params.get('interval');
  return {
    referrerHost: referrerHostOf(referrer),
    utmSource: sanitizeUtm(params.get('utm_source')),
    utmMedium: sanitizeUtm(params.get('utm_medium')),
    utmCampaign: sanitizeUtm(params.get('utm_campaign')),
    returnedFromCheckout: params.get('billing') === 'canceled',
    checkoutTier: TIER_IDS.find((t) => t === tier) ?? null,
    checkoutInterval: INTERVALS.find((i) => i === interval) ?? null,
  };
}
