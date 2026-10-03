/** Row #375 — unit tests of the PostHog before_send privacy hook. */
import { describe, it, expect } from 'vitest';
import type { CaptureResult } from 'posthog-js';
import { sanitizePostHogEvent, stripQueryAndFragment } from './posthog-privacy';

const evt = (properties: Record<string, unknown>, extra: Partial<CaptureResult> = {}): CaptureResult => ({
  uuid: 'u', event: '$pageview', properties, ...extra,
});

describe('sanitizePostHogEvent (#375)', () => {
  it('drops at-sign utm values (plain and nested-encoded), keeps clean ones', () => {
    const out = sanitizePostHogEvent(evt({
      utm_source: 'newsletter',
      utm_term: 'john@example.com',
      utm_content: 'jane%2540corp.com',
      utm_campaign: 'a%40b.co',
    }));
    expect(out!.properties).toEqual({ utm_source: 'newsletter' });
  });

  it('strips query and fragment from $current_url', () => {
    const out = sanitizePostHogEvent(evt({
      $current_url: 'https://app.test/pricing?utm_source=newsletter&utm_term=john%40example.com#frag',
    }));
    expect(out!.properties!.$current_url).toBe('https://app.test/pricing');
  });

  it('strips query from $referrer and $initial_referrer, and from other URL-valued/URL-keyed props', () => {
    const out = sanitizePostHogEvent(evt({
      $referrer: 'https://other.example/search?q=me%40x.com',
      $initial_referrer: 'https://other.example/a?e=x@y.z',
      $initial_current_url: 'https://app.test/?utm_term=a@b.c',
      $session_entry_url: 'https://app.test/p?x=1',
      custom_link: 'https://app.test/x?mail=a@b.c',
      $pathname: '/pricing',
      $referring_domain: 'other.example',
    }));
    expect(out!.properties).toEqual({
      $referrer: 'https://other.example/search',
      $initial_referrer: 'https://other.example/a',
      $initial_current_url: 'https://app.test/',
      $session_entry_url: 'https://app.test/p',
      custom_link: 'https://app.test/x',
      $pathname: '/pricing',
      $referring_domain: 'other.example',
    });
  });

  it('leaves $direct referrer and unrelated props untouched', () => {
    const out = sanitizePostHogEvent(evt({ $referrer: '$direct', path: '/pricing', n: 3 }));
    expect(out!.properties).toEqual({ $referrer: '$direct', path: '/pricing', n: 3 });
  });

  it('sanitizes $initial_utm_*, $session_entry_utm_* and utm_* in $set / $set_once', () => {
    const out = sanitizePostHogEvent(evt({
      $session_entry_utm_term: 'john@example.com',
      $session_entry_utm_source: 'news',
    }, {
      $set: { utm_term: 'john@example.com', plan: 'free' },
      $set_once: {
        $initial_utm_term: 'john@example.com',
        $initial_utm_content: 'jane%2540corp.com',
        $initial_utm_source: 'newsletter',
        $initial_current_url: 'https://app.test/pricing?utm_term=john%40example.com',
        $initial_referrer: 'https://o.example/?e=a@b.c',
      },
    }));
    expect(out!.properties).toEqual({ $session_entry_utm_source: 'news' });
    expect(out!.$set).toEqual({ plan: 'free' });
    expect(out!.$set_once).toEqual({
      $initial_utm_source: 'newsletter',
      $initial_current_url: 'https://app.test/pricing',
      $initial_referrer: 'https://o.example/',
    });
  });

  it('does not mutate its input, handles null and missing bags', () => {
    const input = evt({ utm_term: 'a@b.c', $current_url: 'https://x.test/?q=1' });
    const snapshot = JSON.stringify(input);
    sanitizePostHogEvent(input);
    expect(JSON.stringify(input)).toBe(snapshot);
    expect(sanitizePostHogEvent(null)).toBeNull();
    expect(sanitizePostHogEvent({ uuid: 'u', event: 'e', properties: {} })).toEqual({ uuid: 'u', event: 'e', properties: {} });
  });

  it('stripQueryAndFragment handles fragment-only and no-suffix strings', () => {
    expect(stripQueryAndFragment('https://a.test/p#x@y.z')).toBe('https://a.test/p');
    expect(stripQueryAndFragment('https://a.test/p')).toBe('https://a.test/p');
  });
});
