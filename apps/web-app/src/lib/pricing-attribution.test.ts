/**
 * Row #116 P1 — pure derivation of pricing_page_viewed fields. The PII rules
 * (hostname-only referrer, '@'-bearing UTM dropped, UTM capped, closed enums)
 * live in lib/pricing-attribution.ts and are asserted here directly.
 */
import { describe, it, expect } from 'vitest';
import { derivePricingPageContext, referrerHostOf, sanitizeUtm, UTM_MAX_LENGTH } from './pricing-attribution';

describe('referrerHostOf', () => {
  it('returns the hostname only, never path/query/fragment', () => {
    expect(referrerHostOf('https://News.Example.com/a/b?token=secret&email=a@b.co#frag')).toBe('news.example.com');
  });
  it('drops userinfo and port', () => {
    expect(referrerHostOf('https://user:pw@example.com:8443/x')).toBe('example.com');
  });
  it('is null for empty or unparseable referrers', () => {
    expect(referrerHostOf('')).toBeNull();
    expect(referrerHostOf('not a url')).toBeNull();
  });
});

describe('sanitizeUtm', () => {
  it('trims and passes ordinary values through', () => {
    expect(sanitizeUtm('  newsletter ')).toBe('newsletter');
  });
  it('caps length', () => {
    expect(sanitizeUtm('x'.repeat(500))).toHaveLength(UTM_MAX_LENGTH);
  });
  it('drops any value containing @ entirely (does not truncate it)', () => {
    expect(sanitizeUtm('jane.doe@example.com')).toBeNull();
    expect(sanitizeUtm('campaign-' + 'a'.repeat(100) + '@x.co')).toBeNull();
  });
  it('is null for null and blank', () => {
    expect(sanitizeUtm(null)).toBeNull();
    expect(sanitizeUtm('   ')).toBeNull();
  });
});

describe('derivePricingPageContext', () => {
  it('reads UTMs and a clean page with no checkout return', () => {
    const c = derivePricingPageContext('?utm_source=hn&utm_medium=post&utm_campaign=launch', 'https://news.ycombinator.com/item?id=1');
    expect(c).toEqual({
      referrerHost: 'news.ycombinator.com',
      utmSource: 'hn',
      utmMedium: 'post',
      utmCampaign: 'launch',
      returnedFromCheckout: false,
      checkoutTier: null,
      checkoutInterval: null,
    });
  });
  it('detects the checkout cancel return and echoes validated tier/interval', () => {
    const c = derivePricingPageContext('?billing=canceled&tier=solo&interval=annual', '');
    expect(c.returnedFromCheckout).toBe(true);
    expect(c.checkoutTier).toBe('solo');
    expect(c.checkoutInterval).toBe('annual');
  });
  it('returnedFromCheckout is true for a legacy cancel URL without tier/interval', () => {
    const c = derivePricingPageContext('?billing=canceled', '');
    expect(c.returnedFromCheckout).toBe(true);
    expect(c.checkoutTier).toBeNull();
  });
  it('rejects unknown tier/interval values', () => {
    const c = derivePricingPageContext('?billing=canceled&tier=%3Cscript%3E&interval=weekly', '');
    expect(c.checkoutTier).toBeNull();
    expect(c.checkoutInterval).toBeNull();
  });
  it('does not treat other billing values as a return', () => {
    expect(derivePricingPageContext('?billing=success', '').returnedFromCheckout).toBe(false);
  });
  it('drops an email-like UTM given percent-encoded (%40)', () => {
    expect(derivePricingPageContext('?utm_source=a%40b.co', '').utmSource).toBeNull();
  });
});
